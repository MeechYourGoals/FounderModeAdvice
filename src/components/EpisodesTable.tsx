import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ExternalLink, TrendingUp, MoreVertical, Eye, Bookmark, Download, Copy,
  Youtube, Headphones, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown,
  FolderPlus, Folder, ChevronLeft, ChevronRight, Filter, Search,
  Tag, LayoutList, Plus
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportModal } from "@/components/ExportModal";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { LibraryEmptyState } from "@/components/LibraryEmptyState";
import { getLibraryPrefs, setLibraryPrefs } from "@/lib/libraryPrefs";

interface Episode {
  id: string;
  title: string;
  release_date: string | null;
  url: string;
  founder_names: string | null;
  analysis_status: string;
  company_id: string | null;
  created_at: string | null;
  companies?: {
    name: string;
    founding_year: number | null;
    current_stage: string | null;
    valuation: string | null;
    industry: string | null;
  } | null;
  lessons?: {
    lesson_tags?: {
        tags?: {
            name: string;
        } | null;
    }[];
  }[];
}

interface EpisodeFolder {
  id: string;
  name: string;
  color: string;
}

interface EpisodesTableProps {
  onSelectEpisode: (id: string) => void;
}

type SortColumn = "title" | "company" | "founder" | "stage" | "industry" | "created_at" | "release_date" | "tag_count";
type SortDirection = "asc" | "desc";
type ViewMode = "chronological" | "tag" | "folder";

const PAGE_SIZE = 15;

export const EpisodesTable = ({ onSelectEpisode }: EpisodesTableProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportId, setSelectedExportId] = useState<string | undefined>();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Sorting (defaults come from persisted Library preferences)
  const [sortColumn, setSortColumn] = useState<SortColumn>(() => getLibraryPrefs().sortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => getLibraryPrefs().sortDirection);

  // Free-text search across title / founder / company
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [founderFilter, setFounderFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Folders
  const [folders, setFolders] = useState<EpisodeFolder[]>([]);
  const [folderAssignments, setFolderAssignments] = useState<Record<string, string[]>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [bulkFolderNames, setBulkFolderNames] = useState<string[]>([""]);
  const [folderPendingDelete, setFolderPendingDelete] = useState<EpisodeFolder | null>(null);
  const [deleteMoveTarget, setDeleteMoveTarget] = useState<string>("none");

  // Tags & view mode
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(() => getLibraryPrefs().viewMode);


  // Initialize filters & view from URL
  useEffect(() => {
    const founder = searchParams.get("founder");
    if (founder) { setFounderFilter(founder); setShowFilters(true); }
    const tagsParam = searchParams.get("tags");
    if (tagsParam) setSelectedTags(new Set(tagsParam.split(",").filter(Boolean)));
    const viewParam = searchParams.get("view");
    if (viewParam === "tag" || viewParam === "folder" || viewParam === "chronological") {
      setViewMode(viewParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseIndustries = (industryString: string | null | undefined): string[] => {
    if (!industryString) return [];
    return [...new Set(industryString.split(/[,\/]/).map(i => i.trim()).filter(Boolean))];
  };

  const getEpisodeTags = (ep: Episode): string[] => {
    const names = new Set<string>();
    ep.lessons?.forEach(l => l.lesson_tags?.forEach(lt => {
      const n = lt.tags?.name?.trim();
      if (n) names.add(n);
    }));
    return Array.from(names);
  };

  const toggleIndustryFilter = (industry: string) => {
    triggerHapticFeedback('light');
    setSelectedIndustries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(industry)) newSet.delete(industry);
      else newSet.add(industry);
      return newSet;
    });
    setCurrentPage(1);
  };

  const toggleTag = (name: string) => {
    triggerHapticFeedback('light');
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      setSearchParams(p => {
        if (next.size === 0) p.delete("tags");
        else p.set("tags", Array.from(next).join(","));
        return p;
      });
      return next;
    });
    setCurrentPage(1);
  };

  const changeViewMode = (mode: ViewMode) => {
    triggerHapticFeedback('light');
    setViewMode(mode);
    setSearchParams(p => {
      if (mode === "chronological") p.delete("view");
      else p.set("view", mode);
      return p;
    });
  };

  // Derive unique options
  const uniqueFounders = useMemo(() => {
    const s = new Set<string>();
    allEpisodes.forEach(ep => ep.founder_names?.split(',').forEach(n => s.add(n.trim())));
    return Array.from(s).sort();
  }, [allEpisodes]);

  const uniqueCompanies = useMemo(() => {
    const s = new Set<string>();
    allEpisodes.forEach(ep => ep.companies?.name && s.add(ep.companies.name));
    return Array.from(s).sort();
  }, [allEpisodes]);

  const uniqueYears = useMemo(() => {
    const s = new Set<string>();
    allEpisodes.forEach(ep => ep.release_date && s.add(ep.release_date.slice(0, 4)));
    return Array.from(s).sort().reverse();
  }, [allEpisodes]);

  // Unique tags with counts, sorted by frequency desc
  const uniqueTags = useMemo(() => {
    const counts = new Map<string, number>();
    allEpisodes.forEach(ep => {
      getEpisodeTags(ep).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allEpisodes]);

  // Filter → Sort → Paginate
  const filteredEpisodes = useMemo(() => {
    let result = allEpisodes;

    // Industry Filter
    if (selectedIndustries.size > 0) {
      result = result.filter(ep => {
        const industries = parseIndustries(ep.companies?.industry);
        return industries.some(ind => selectedIndustries.has(ind));
      });
    }

    // Folder Filter
    if (selectedFolderId) {
      const episodeIdsInFolder = Object.entries(folderAssignments)
        .filter(([, folderIds]) => folderIds.includes(selectedFolderId))
        .map(([epId]) => epId);
      result = result.filter(ep => episodeIdsInFolder.includes(ep.id));
    }

    // Tag Filter (OR semantics, case-insensitive)
    if (selectedTags.size > 0) {
      const lower = new Set(Array.from(selectedTags).map(t => t.toLowerCase()));
      result = result.filter(ep => getEpisodeTags(ep).some(t => lower.has(t.toLowerCase())));
    }

    // New Filters
    if (founderFilter && founderFilter !== "all") {
        result = result.filter(ep => ep.founder_names?.includes(founderFilter));
    }
    if (companyFilter && companyFilter !== "all") {
        result = result.filter(ep => ep.companies?.name === companyFilter);
    }
    if (yearFilter && yearFilter !== "all") {
        result = result.filter(ep => ep.release_date?.startsWith(yearFilter));
    }

    // Free-text search across title, founder(s), and company
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(ep =>
        ep.title?.toLowerCase().includes(q) ||
        ep.founder_names?.toLowerCase().includes(q) ||
        ep.companies?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allEpisodes, selectedIndustries, selectedTags, selectedFolderId, folderAssignments, founderFilter, companyFilter, yearFilter, search]);

  const sortedEpisodes = useMemo(() => {
    const sorted = [...filteredEpisodes];
    sorted.sort((a, b) => {
      if (sortColumn === "tag_count") {
        const av = getEpisodeTags(a).length;
        const bv = getEpisodeTags(b).length;
        return sortDirection === "asc" ? av - bv : bv - av;
      }
      let aVal = "";
      let bVal = "";
      switch (sortColumn) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "company": aVal = a.companies?.name || ""; bVal = b.companies?.name || ""; break;
        case "founder": aVal = a.founder_names || ""; bVal = b.founder_names || ""; break;
        case "stage": aVal = a.companies?.current_stage || ""; bVal = b.companies?.current_stage || ""; break;
        case "industry": aVal = a.companies?.industry || ""; bVal = b.companies?.industry || ""; break;
        case "release_date": aVal = a.release_date || a.created_at || ""; bVal = b.release_date || b.created_at || ""; break;
        case "created_at": aVal = a.created_at || ""; bVal = b.created_at || ""; break;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredEpisodes, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedEpisodes.length / PAGE_SIZE));
  const paginatedEpisodes = sortedEpisodes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (col: SortColumn) => {
    triggerHapticFeedback('light');
    if (sortColumn === col) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const fetchEpisodes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllEpisodes([]);
        return;
      }

      // Admins see every episode; everyone else only sees what they analyzed.
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      let query = supabase
        .from("episodes")
        .select(`
            id, title, release_date, url, founder_names, analysis_status, company_id, created_at,
            companies (name, founding_year, current_stage, valuation, industry),
            lessons (
                lesson_tags (
                    tags (name)
                )
            )
        `)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("analyzed_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAllEpisodes(data || []);
    } catch (error) {
      console.error("Error fetching episodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: foldersData } = await supabase
      .from("episode_folders")
      .select("id, name, color")
      .eq("user_id", user.id);

    if (foldersData) setFolders(foldersData as any);

    const { data: assignments } = await supabase
      .from("episode_folder_assignments")
      .select("episode_id, folder_id")
      .eq("user_id", user.id);

    if (assignments) {
      const map: Record<string, string[]> = {};
      (assignments as any[]).forEach((a: any) => {
        if (!map[a.episode_id]) map[a.episode_id] = [];
        map[a.episode_id].push(a.folder_id);
      });
      setFolderAssignments(map);
    }
  };

  const handleCreateFolders = async () => {
    const names = Array.from(
      new Set(
        bulkFolderNames
          .map(n => n.trim())
          .filter(n => n.length > 0)
      )
    );
    if (names.length === 0) return;
    triggerHapticFeedback('medium');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("episode_folders")
      .insert(names.map(name => ({ user_id: user.id, name })) as any);

    if (error) {
      toast({ title: "Could not create folders", description: error.message, variant: "destructive" });
      return;
    }
    setBulkFolderNames([""]);
    setNewFolderName("");
    fetchFolders();
    toast({ title: names.length === 1 ? "Folder created" : `Created ${names.length} folders` });
  };

  const handleDeleteFolder = async (folderId: string) => {
    triggerHapticFeedback('medium');
    const { error } = await supabase
      .from("episode_folders")
      .delete()
      .eq("id", folderId);
    if (!error) {
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      fetchFolders();
      toast({ title: "Folder deleted" });
    }
  };

  const handleAssignFolder = async (episodeId: string, folderId: string) => {
    triggerHapticFeedback('light');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = folderAssignments[episodeId] || [];
    if (existing.includes(folderId)) {
      await supabase
        .from("episode_folder_assignments")
        .delete()
        .eq("episode_id", episodeId)
        .eq("folder_id", folderId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("episode_folder_assignments")
        .insert({ user_id: user.id, episode_id: episodeId, folder_id: folderId } as any);
    }
    fetchFolders();
  };

  const handleDelete = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback('medium');
    if (!confirm("Delete this episode analysis? This will also remove all associated lessons, callouts, and personalized insights.")) return;
    triggerHapticFeedback('heavy');

    const previous = allEpisodes;
    setAllEpisodes(prev => prev.filter(ep => ep.id !== episodeId));

    try {
      const { data, error } = await supabase.from("episodes").delete().eq("id", episodeId).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Delete not permitted or episode not found");
      toast({ title: "Analysis deleted", description: "Episode and all associated data have been removed." });
    } catch (error) {
      console.error("Error deleting episode:", error);
      setAllEpisodes(previous);
      toast({ title: "Delete failed", description: "Could not delete the episode. Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchEpisodes();
    fetchFolders();
    const handleEpisodeAnalyzed = () => { fetchEpisodes(); };
    const handleHomeReset = () => {
      setSelectedTags(new Set());
      setSelectedIndustries(new Set());
      setSelectedFolderId(null);
      setFounderFilter("all");
      setCompanyFilter("all");
      setYearFilter("all");
      setViewMode("chronological");
      setCurrentPage(1);
      setSearchParams({});
    };
    window.addEventListener("episodeAnalyzed", handleEpisodeAnalyzed);
    window.addEventListener("homeReset", handleHomeReset);
    return () => {
      window.removeEventListener("episodeAnalyzed", handleEpisodeAnalyzed);
      window.removeEventListener("homeReset", handleHomeReset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setCurrentPage(1); }, [selectedFolderId, founderFilter, companyFilter, yearFilter, selectedTags, viewMode, search]);

  // Remember the user's sort + view choices as their default next time.
  useEffect(() => {
    setLibraryPrefs({ sortColumn, sortDirection, viewMode });
  }, [sortColumn, sortDirection, viewMode]);

  if (loading) {
    return <Card className="p-6 sm:p-8"><div className="text-center text-muted-foreground">Loading episodes...</div></Card>;
  }

  const getPlatformIcon = (url: string) => url.includes("youtube.com") || url.includes("youtu.be") ? <Youtube className="w-4 h-4" /> : <Headphones className="w-4 h-4" />;
  const getPlatformLabel = (url: string) => url.includes("youtube.com") || url.includes("youtu.be") ? "Watch Now" : "Listen Now";

  const handleExport = (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExportId(episodeId);
    setExportModalOpen(true);
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback('light');
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  if (allEpisodes.length === 0) {
    return <LibraryEmptyState />;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, sortedEpisodes.length);

  // Mobile card view for each episode
  const MobileEpisodeCard = ({ episode }: { episode: Episode }) => {
    const episodeFolders = (folderAssignments[episode.id] || [])
      .map(fId => folders.find(f => f.id === fId))
      .filter(Boolean);

    return (
      <div
        className="p-4 min-h-[72px] border-b border-border last:border-b-0 active:bg-primary/5 transition-colors cursor-pointer touch-manipulation"
        onClick={() => onSelectEpisode(episode.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSelectEpisode(episode.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2 mb-1">{episode.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {episode.companies?.name && <span>{episode.companies.name}</span>}
              {episode.founder_names && <span>{episode.founder_names}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {episode.companies?.current_stage && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {episode.companies.current_stage}
                </Badge>
              )}
              {getEpisodeTags(episode).slice(0, 4).map(tagName => (
                <Badge
                  key={tagName}
                  variant={selectedTags.has(tagName) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] px-1.5 py-0 flex items-center gap-0.5"
                  onClick={(e) => { e.stopPropagation(); toggleTag(tagName); }}
                >
                  <Tag className="w-2.5 h-2.5" />{tagName}
                </Badge>
              ))}
              {episodeFolders.map(f => (
                <span key={f!.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: f!.color }}>
                  {f!.name}
                </span>
              ))}
              {episode.created_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(episode.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <BookmarkButton episodeId={episode.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(episode.url, "_blank"); }}>
                  {getPlatformIcon(episode.url)}
                  <span className="ml-2">{getPlatformLabel(episode.url)}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectEpisode(episode.id); }}>
                  <Eye className="w-4 h-4" /><span className="ml-2">View Details</span>
                </DropdownMenuItem>
                {folders.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                      <Folder className="w-4 h-4" /><span className="ml-2">Move to Folder</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {folders.map(folder => {
                        const isAssigned = (folderAssignments[episode.id] || []).includes(folder.id);
                        return (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={(e) => { e.stopPropagation(); handleAssignFolder(episode.id, folder.id); }}
                          >
                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
                            {folder.name}
                            {isAssigned && <span className="ml-auto text-primary">✓</span>}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => handleExport(episode.id, e)}>
                  <Download className="w-4 h-4" /><span className="ml-2">Export Episode</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleCopyLink(episode.url, e)}>
                  <Copy className="w-4 h-4" /><span className="ml-2">Copy Link</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => handleDelete(episode.id, e)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4" /><span className="ml-2">Delete Analysis</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  const clearFilters = () => {
      setFounderFilter("all");
      setCompanyFilter("all");
      setYearFilter("all");
      setSelectedIndustries(new Set());
      setSelectedTags(new Set());
      setSearchParams({});
  };

  return (
    <>
      <Card className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <div className="glass p-4 sm:p-6 border-b space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <span className="truncate">Analyzed Episodes</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {selectedIndustries.size > 0 || selectedFolderId || founderFilter !== "all"
                  ? `${filteredEpisodes.length} of ${allEpisodes.length} episodes`
                  : `${allEpisodes.length} episode${allEpisodes.length !== 1 ? "s" : ""} in database`}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="text-xs sm:text-sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setManageFoldersOpen(true)}>
                <FolderPlus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Folders</span>
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => { setSelectedExportId(undefined); setExportModalOpen(true); }}>
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export All</span>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, speaker, or company..."
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 animate-in slide-in-from-top-2">
              <Select value={founderFilter} onValueChange={(val) => {setFounderFilter(val); setSearchParams(prev => { if(val==="all") prev.delete("founder"); else prev.set("founder", val); return prev; })}}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Speaker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Speakers</SelectItem>
                  {uniqueFounders.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* View mode toggle */}
        <div className="px-4 sm:px-6 py-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto scroll-touch">
          <span className="text-xs text-muted-foreground whitespace-nowrap">View:</span>
          <Badge variant={viewMode === "chronological" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap text-[10px] flex items-center gap-1" onClick={() => changeViewMode("chronological")}>
            <LayoutList className="w-3 h-3" />Chronological
          </Badge>
          <Badge variant={viewMode === "tag" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap text-[10px] flex items-center gap-1" onClick={() => changeViewMode("tag")}>
            <Tag className="w-3 h-3" />By Tag
          </Badge>
          <Badge variant={viewMode === "folder" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap text-[10px] flex items-center gap-1" onClick={() => changeViewMode("folder")}>
            <Folder className="w-3 h-3" />By Folder
          </Badge>
        </div>

        {/* Tag filter chip bar */}
        {uniqueTags.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b bg-muted/10 flex items-center gap-2 overflow-x-auto scroll-touch">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {uniqueTags.slice(0, 24).map(([name, count]) => (
              <Badge
                key={name}
                variant={selectedTags.has(name) ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap text-[10px]"
                onClick={() => toggleTag(name)}
              >
                {name}<span className="ml-1 opacity-60">{count}</span>
              </Badge>
            ))}
            {selectedTags.size > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setSelectedTags(new Set()); setSearchParams(p => { p.delete("tags"); return p; }); }}>
                Clear tags
              </Button>
            )}
          </div>
        )}

        {/* Sort controls for mobile */}
        {isMobile && (
          <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-2 overflow-x-auto scroll-touch">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Sort:</span>
            {(["created_at", "release_date", "title", "company", "founder", "tag_count"] as SortColumn[]).map(col => (
              <Badge
                key={col}
                variant={sortColumn === col ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap text-[10px]"
                onClick={() => handleSort(col)}
              >
                {col === "created_at" ? "Added" : col === "release_date" ? "Date" : col === "tag_count" ? "Tags" : col === "founder" ? "Speaker" : col.charAt(0).toUpperCase() + col.slice(1)}
                {sortColumn === col && (sortDirection === "asc" ? " ↑" : " ↓")}
              </Badge>
            ))}
          </div>
        )}

        {/* Folder filter bar */}
        {folders.length > 0 && (
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b bg-muted/10 flex items-center gap-2 overflow-x-auto scroll-touch">
            <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Badge
              variant={selectedFolderId === null ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedFolderId(null)}
            >
              All
            </Badge>
            {folders.map(folder => (
              <Badge
                key={folder.id}
                variant={selectedFolderId === folder.id ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                style={selectedFolderId === folder.id ? { backgroundColor: folder.color, borderColor: folder.color } : {}}
                onClick={() => setSelectedFolderId(folder.id === selectedFolderId ? null : folder.id)}
              >
                {folder.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Active industry filters */}
        {selectedIndustries.size > 0 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground">Filters:</span>
                {Array.from(selectedIndustries).map(industry => (
                  <Badge key={industry} variant="default" className="cursor-pointer text-xs" onClick={() => toggleIndustryFilter(industry)}>
                    {industry}<X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedIndustries(new Set())}>
                Show All ({allEpisodes.length})
              </Button>
            </div>
          </div>
        )}

        {/* Mobile: Card list / Desktop: Table / Grouped views */}
        {viewMode === "tag" ? (
          <div>
            {(selectedTags.size > 0
              ? uniqueTags.filter(([n]) => selectedTags.has(n))
              : uniqueTags
            ).map(([tagName]) => {
              const eps = filteredEpisodes.filter(ep => getEpisodeTags(ep).some(t => t.toLowerCase() === tagName.toLowerCase()));
              if (eps.length === 0) return null;
              return (
                <div key={tagName}>
                  <div className="px-4 sm:px-6 py-2 bg-muted/30 border-b flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{tagName}</span>
                    <Badge variant="outline" className="text-[10px]">{eps.length}</Badge>
                  </div>
                  {eps.map(ep => <MobileEpisodeCard key={ep.id} episode={ep} />)}
                </div>
              );
            })}
            {uniqueTags.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No tags yet. Analyze an episode to start tagging.</div>
            )}
          </div>
        ) : viewMode === "folder" ? (
          <div>
            {[
              ...folders.map(f => ({ id: f.id as string | null, name: f.name, color: f.color as string | undefined })),
              { id: null as string | null, name: "Unfiled", color: undefined as string | undefined },
            ].map(folder => {
              const eps = filteredEpisodes.filter(ep => {
                const assigned = folderAssignments[ep.id] || [];
                return folder.id ? assigned.includes(folder.id) : assigned.length === 0;
              });
              if (eps.length === 0) return null;
              return (
                <div key={folder.id || "unfiled"}>
                  <div className="px-4 sm:px-6 py-2 bg-muted/30 border-b flex items-center gap-2">
                    <Folder className="w-4 h-4" style={folder.color ? { color: folder.color } : undefined} />
                    <span className="font-semibold text-sm">{folder.name}</span>
                    <Badge variant="outline" className="text-[10px]">{eps.length}</Badge>
                  </div>
                  {eps.map(ep => <MobileEpisodeCard key={ep.id} episode={ep} />)}
                </div>
              );
            })}
          </div>
        ) : isMobile ? (
          <div>
            {paginatedEpisodes.map((episode) => (
              <MobileEpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("title")}>
                    <span className="flex items-center">Episode<SortIcon col="title" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("company")}>
                    <span className="flex items-center">Company<SortIcon col="company" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("founder")}>
                    <span className="flex items-center">Speaker(s)<SortIcon col="founder" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("stage")}>
                    <span className="flex items-center">Stage<SortIcon col="stage" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("industry")}>
                    <span className="flex items-center">Industry<SortIcon col="industry" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                    <span className="flex items-center">Date Added<SortIcon col="created_at" /></span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEpisodes.map((episode) => {
                  const episodeFolders = (folderAssignments[episode.id] || [])
                    .map(fId => folders.find(f => f.id === fId))
                    .filter(Boolean);

                  return (
                    <TableRow
                      key={episode.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => onSelectEpisode(episode.id)}
                    >
                      <TableCell className="font-medium max-w-md">
                        <div className="space-y-1">
                          <div className="line-clamp-2">{episode.title}</div>
                          <div className="flex gap-1 flex-wrap">
                            {getEpisodeTags(episode).slice(0, 5).map(tagName => (
                              <Badge
                                key={tagName}
                                variant={selectedTags.has(tagName) ? "default" : "outline"}
                                className="cursor-pointer text-[10px] px-1.5 py-0 flex items-center gap-0.5"
                                onClick={(e) => { e.stopPropagation(); toggleTag(tagName); }}
                              >
                                <Tag className="w-2.5 h-2.5" />{tagName}
                              </Badge>
                            ))}
                            {episodeFolders.map(f => (
                              <span key={f!.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: f!.color }}>
                                {f!.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{episode.companies?.name || "-"}</TableCell>
                      <TableCell>{episode.founder_names || "-"}</TableCell>
                      <TableCell>
                        {episode.companies?.current_stage ? <Badge variant="secondary">{episode.companies.current_stage}</Badge> : "-"}
                      </TableCell>
                      <TableCell>
                        {episode.companies?.industry ? (
                          <div className="flex flex-wrap gap-1">
                            {parseIndustries(episode.companies.industry).map(industry => (
                              <Badge
                                key={industry}
                                variant={selectedIndustries.has(industry) ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary/80 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleIndustryFilter(industry); }}
                              >
                                {industry}
                              </Badge>
                            ))}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {episode.created_at ? new Date(episode.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <BookmarkButton episodeId={episode.id} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(episode.url, "_blank"); }}>
                                {getPlatformIcon(episode.url)}
                                <span className="ml-2">{getPlatformLabel(episode.url)}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectEpisode(episode.id); }}>
                                <Eye className="w-4 h-4" /><span className="ml-2">View Details</span>
                              </DropdownMenuItem>
                              {folders.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                                    <Folder className="w-4 h-4" /><span className="ml-2">Move to Folder</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {folders.map(folder => {
                                      const isAssigned = (folderAssignments[episode.id] || []).includes(folder.id);
                                      return (
                                        <DropdownMenuItem
                                          key={folder.id}
                                          onClick={(e) => { e.stopPropagation(); handleAssignFolder(episode.id, folder.id); }}
                                        >
                                          <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
                                          {folder.name}
                                          {isAssigned && <span className="ml-auto text-primary">✓</span>}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => handleExport(episode.id, e)}>
                                <Download className="w-4 h-4" /><span className="ml-2">Export Episode</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleCopyLink(episode.url, e)}>
                                <Copy className="w-4 h-4" /><span className="ml-2">Copy Link</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => handleDelete(episode.id, e)} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4" /><span className="ml-2">Delete Analysis</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* No results (filters/search exclude everything) */}
        {filteredEpisodes.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No videos match your search or filters.
            <Button variant="link" size="sm" onClick={() => { setSearch(""); clearFilters(); }}>
              Clear
            </Button>
          </div>
        )}

        {/* Pagination */}
        {viewMode === "chronological" && sortedEpisodes.length > PAGE_SIZE && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex items-center justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {startIdx}–{endIdx} of {sortedEpisodes.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {!isMobile && Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-xs">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0 text-xs"
                      onClick={() => setCurrentPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
              {isMobile && (
                <span className="text-xs text-muted-foreground px-2">
                  {currentPage}/{totalPages}
                </span>
              )}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Manage Folders Dialog */}
      <Dialog open={manageFoldersOpen} onOpenChange={setManageFoldersOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Manage Folders</DialogTitle>
            <DialogDescription>Create folders to organize your episodes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {bulkFolderNames.map((name, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="New folder name..."
                    value={name}
                    autoFocus={idx === bulkFolderNames.length - 1}
                    onChange={(e) => {
                      const next = [...bulkFolderNames];
                      next[idx] = e.target.value;
                      setBulkFolderNames(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setBulkFolderNames([...bulkFolderNames, ""]);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setBulkFolderNames([...bulkFolderNames, ""])}
                    title="Add another folder"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  {bulkFolderNames.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setBulkFolderNames(bulkFolderNames.filter((_, i) => i !== idx))
                      }
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                className="w-full"
                onClick={handleCreateFolders}
                disabled={!bulkFolderNames.some(n => n.trim())}
              >
                {bulkFolderNames.filter(n => n.trim()).length > 1
                  ? `Create ${bulkFolderNames.filter(n => n.trim()).length} folders`
                  : "Create folder"}
              </Button>
            </div>
            {folders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No folders yet</p>
            ) : (
              <div className="space-y-2">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: folder.color }} />
                      <span className="text-sm">{folder.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteFolder(folder.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExportModal episodeId={selectedExportId} open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </>
  );
};
