import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ExternalLink, TrendingUp, MoreVertical, Eye, Bookmark, Download, Copy,
  Headphones, FileText, File, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown,
  FolderPlus, Folder, ChevronLeft, ChevronRight, Filter, Search,
  Tag, LayoutList, Plus, Share2, Video, Newspaper, Image
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
import { FolderShareDialog } from "@/components/FolderShareDialog";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { triggerHapticFeedback } from "@/lib/capacitor";
import { LibraryEmptyState } from "@/components/LibraryEmptyState";
import { getLibraryPrefs, setLibraryPrefs } from "@/lib/libraryPrefs";
import { getAnalysisProfileLabel, isUniversalAnalysis } from "@/lib/analysisProfile";
import {
  getAnalysisSourceActionLabel,
  getAnalysisSourceKind,
  getAnalysisSourceLabel,
  isUploadedDocumentUrl,
  type AnalysisSourceKind,
} from "@/lib/analysisSource";
import { folderNameFromTag } from "@/lib/folderTagRules";
import { signalLibraryRefreshDone } from "@/lib/libraryRefresh";
import { TagPill } from "@/components/library/TagPill";
import { SwipeToDelete } from "@/components/library/SwipeToDelete";
import { SourceThumbnail } from "@/components/SourceThumbnail";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { hasAutoFolderRules } from "@/types/subscription";
import { createSmartFolderFromTag, SmartFolderError } from "@/services/folderTagRules";

const MAX_VISIBLE_TAGS = 3;

interface Episode {
  id: string;
  title: string;
  release_date: string | null;
  url: string;
  founder_names: string | null;
  analyzed_profile_id?: string | null;
  analyzed_profile_name_snapshot?: string | null;
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
  user_startup_profiles?: {
    company_name: string | null;
  } | null;
  lessons?: {
    lesson_tags?: {
        tags?: {
            name: string;
        } | null;
    }[];
  }[];
  precalculatedTags?: string[];
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

const SORT_LABELS: Record<SortColumn, string> = {
  title: "Title",
  company: "Company",
  founder: "Speaker",
  stage: "Stage",
  industry: "Industry",
  created_at: "Added",
  release_date: "Date",
  tag_count: "Tags",
};

const PAGE_SIZE = 15;

const SOURCE_ICONS: Record<AnalysisSourceKind, typeof Video> = {
  video: Video,
  article: Newspaper,
  podcast: Headphones,
  pdf: FileText,
  screenshot: Image,
  document: File,
};

function AnalysisSourceChip({ url }: { url: string }) {
  const kind = getAnalysisSourceKind(url);
  const Icon = SOURCE_ICONS[kind];
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
      <Icon className="w-2.5 h-2.5" />
      {getAnalysisSourceLabel(kind)}
    </Badge>
  );
}

export const EpisodesTable = ({ onSelectEpisode }: EpisodesTableProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportId, setSelectedExportId] = useState<string | undefined>();
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [smartFolderTag, setSmartFolderTag] = useState<string | null>(null);
  const [creatingSmartFolder, setCreatingSmartFolder] = useState(false);
  const [autoFolderUpgradeOpen, setAutoFolderUpgradeOpen] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();
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
  const [bulkFolderNames, setBulkFolderNames] = useState<string[]>([""]);
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [folderPendingDelete, setFolderPendingDelete] = useState<EpisodeFolder | null>(null);
  const [shareFolder, setShareFolder] = useState<EpisodeFolder | null>(null);
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
    return [...new Set(industryString.split(/[,/]/).map(i => i.trim()).filter(Boolean))];
  };

  const getEpisodeTags = (ep: Episode): string[] => {
    if (ep.precalculatedTags) return ep.precalculatedTags;
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

  // Consolidated derive unique options and metadata mapping in a single pass
  const { uniqueFounders, uniqueCompanies, uniqueYears, uniqueTags, foldersMap } = useMemo(() => {
    const founderSet = new Set<string>();
    const companySet = new Set<string>();
    const yearSet = new Set<string>();
    const tagCounts = new Map<string, number>();
    const fMap = new Map<string, EpisodeFolder>();

    allEpisodes.forEach(ep => {
      // Founders
      ep.founder_names?.split(',').forEach(n => {
        const trimmed = n.trim();
        if (trimmed) founderSet.add(trimmed);
      });

      // Companies
      if (ep.companies?.name) companySet.add(ep.companies.name);

      // Years
      if (ep.release_date) yearSet.add(ep.release_date.slice(0, 4));

      // Tags
      getEpisodeTags(ep).forEach(t => {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      });
    });

    folders.forEach(f => fMap.set(f.id, f));

    return {
      uniqueFounders: Array.from(founderSet).sort(),
      uniqueCompanies: Array.from(companySet).sort(),
      uniqueYears: Array.from(yearSet).sort().reverse(),
      uniqueTags: Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      foldersMap: fMap
    };
  }, [allEpisodes, folders]);

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
            analyzed_profile_id, analyzed_profile_name_snapshot,
            user_startup_profiles!episodes_analyzed_profile_id_fkey (company_name),
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

      // Pre-calculate tags for performance during filtering and rendering
      const episodesWithTags = (data || []).map((ep: Episode) => {
        const names = new Set<string>();
        ep.lessons?.forEach((l) => l.lesson_tags?.forEach((lt) => {
          const n = lt.tags?.name?.trim();
          if (n) names.add(n);
        }));
        return {
          ...ep,
          precalculatedTags: Array.from(names)
        };
      });

      setAllEpisodes(episodesWithTags);
    } catch (error) {
      console.error("Error fetching episodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: foldersData, error: foldersError } = await supabase
      .from("episode_folders")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (foldersError) throw foldersError;
    setFolders((foldersData || []) as EpisodeFolder[]);

    const { data: assignments, error: assignmentsError } = await supabase
      .from("episode_folder_assignments")
      .select("episode_id, folder_id")
      .eq("user_id", user.id);

    if (assignmentsError) throw assignmentsError;

    const map: Record<string, string[]> = {};
    ((assignments || []) as { episode_id: string; folder_id: string }[]).forEach((a) => {
      if (!map[a.episode_id]) map[a.episode_id] = [];
      map[a.episode_id].push(a.folder_id);
    });
    setFolderAssignments(map);
  };

  const handleCreateFolders = async () => {
    if (creatingFolders) return;

    const existingNames = new Set(folders.map(folder => folder.name.trim().toLowerCase()));
    const names = Array.from(
      new Set(
        bulkFolderNames
          .map(n => n.trim())
          .filter(n => n.length > 0)
      )
    ).filter(name => !existingNames.has(name.toLowerCase()));

    if (names.length === 0) {
      toast({ title: "Folder already exists", description: "Enter a new folder name to create." });
      return;
    }

    triggerHapticFeedback('medium');
    setCreatingFolders(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in to create folders.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("episode_folders")
        .insert(names.map(name => ({ user_id: user.id, name })))
        .select("id, name, color")
        .order("name", { ascending: true });

      if (error) throw error;

      const createdFolders = (data || []) as EpisodeFolder[];
      if (createdFolders.length > 0) {
        setFolders(prev => {
          const byId = new Map(prev.map(folder => [folder.id, folder]));
          createdFolders.forEach(folder => byId.set(folder.id, folder));
          return Array.from(byId.values());
        });
      }

      setBulkFolderNames([""]);
      await fetchFolders();
      toast({ title: names.length === 1 ? "Folder created" : `Created ${names.length} folders` });
    } catch (error) {
      const err = error as { message?: string };
      toast({ title: "Could not create folders", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setCreatingFolders(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, moveToFolderId?: string) => {
    triggerHapticFeedback('medium');
    const { data: { user } } = await supabase.auth.getUser();

    if (moveToFolderId && user) {
      // Find episodes assigned to the folder being deleted, then assign to target
      const affectedEpisodeIds = Object.entries(folderAssignments)
        .filter(([, ids]) => ids.includes(folderId))
        .map(([episodeId]) => episodeId);

      const rows = affectedEpisodeIds
        .filter((episodeId) => !(folderAssignments[episodeId] || []).includes(moveToFolderId))
        .map((episodeId) => ({ user_id: user.id, episode_id: episodeId, folder_id: moveToFolderId }));

      if (rows.length > 0) {
        const { error: moveError } = await supabase
          .from("episode_folder_assignments")
          .insert(rows);
        if (moveError) {
          toast({ title: "Couldn't move episodes", description: moveError.message, variant: "destructive" });
          return;
        }
      }
    }

    const { error } = await supabase
      .from("episode_folders")
      .delete()
      .eq("id", folderId);
    if (!error) {
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      try {
        await fetchFolders();
      } catch (refreshError) {
        console.error("Error refreshing folders after delete:", refreshError);
      }
      toast({ title: "Folder deleted" });
    } else {
      toast({ title: "Couldn't delete folder", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignFolder = async (episodeId: string, folderId: string) => {
    triggerHapticFeedback('light');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = folderAssignments[episodeId] || [];
      if (existing.includes(folderId)) {
        const { error } = await supabase
          .from("episode_folder_assignments")
          .delete()
          .eq("episode_id", episodeId)
          .eq("folder_id", folderId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("episode_folder_assignments")
          .insert({ user_id: user.id, episode_id: episodeId, folder_id: folderId });
        if (error) throw error;
      }
      await fetchFolders();
    } catch (error) {
      const err = error as { message?: string };
      toast({ title: "Couldn't update folder", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  // Two-step delete: the menu action arms the styled AlertDialog (native
  // window.confirm looks broken inside WebView wrappers), confirm performs
  // the optimistic delete.
  const requestDelete = (episodeId: string) => {
    triggerHapticFeedback('medium');
    setDeleteCandidateId(episodeId);
  };

  const handleDelete = (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestDelete(episodeId);
  };

  const requestSmartFolder = (tagName: string) => {
    triggerHapticFeedback('medium');
    if (subscription && hasAutoFolderRules(subscription.tier)) {
      setSmartFolderTag(tagName);
      return;
    }
    setAutoFolderUpgradeOpen(true);
  };

  const confirmSmartFolder = async () => {
    const tagName = smartFolderTag;
    if (!tagName || creatingSmartFolder) return;
    setCreatingSmartFolder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in to create smart folders.", variant: "destructive" });
        return;
      }
      const matchingEpisodeIds = allEpisodes
        .filter((episode) => getEpisodeTags(episode).some((tag) => tag.toLowerCase() === tagName.toLowerCase()))
        .map((episode) => episode.id);
      const result = await createSmartFolderFromTag({
        userId: user.id,
        tagName,
        matchingEpisodeIds,
        existingFolders: folders,
      });
      await fetchFolders();
      setSmartFolderTag(null);
      toast({
        title: `Filing into ${result.folderName}`,
        description: result.assigned === 1
          ? "1 matching analysis was filed. New ones tagged this way will follow."
          : `${result.assigned} matching analyses were filed. New ones tagged this way will follow.`,
      });
    } catch (error) {
      const message = error instanceof SmartFolderError ? error.message : "Please try again.";
      toast({ title: "Could not create smart folder", description: message, variant: "destructive" });
    } finally {
      setCreatingSmartFolder(false);
    }
  };

  const confirmDeleteEpisode = async () => {
    const episodeId = deleteCandidateId;
    setDeleteCandidateId(null);
    if (!episodeId) return;
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
    fetchFolders().catch((error) => {
      console.error("Error fetching folders:", error);
      toast({ title: "Could not load folders", description: "Folder data may be temporarily out of date.", variant: "destructive" });
    });
    const handleEpisodeAnalyzed = () => { fetchEpisodes(); };
    // Pull-to-refresh on the home screen re-syncs both episodes and folders.
    const handleLibraryRefresh = async () => {
      try {
        await Promise.all([
          fetchEpisodes(),
          fetchFolders().catch(() => undefined),
        ]);
      } finally {
        signalLibraryRefreshDone();
      }
    };
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
    window.addEventListener("libraryRefresh", handleLibraryRefresh);
    window.addEventListener("homeReset", handleHomeReset);
    return () => {
      window.removeEventListener("episodeAnalyzed", handleEpisodeAnalyzed);
      window.removeEventListener("libraryRefresh", handleLibraryRefresh);
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
    return (
      <Card className="p-4 sm:p-6 shadow-card border-primary/10" role="status" aria-live="polite" aria-label="Loading your analyzed sources">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-[70vw]" />
          </div>
          <Skeleton className="hidden sm:block h-10 w-32 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/70 p-4 bg-card/60">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getPlatformIcon = (url: string) => {
    const Icon = SOURCE_ICONS[getAnalysisSourceKind(url)];
    return <Icon className="w-4 h-4" />;
  };
  const getPlatformLabel = (url: string) =>
    getAnalysisSourceActionLabel(getAnalysisSourceKind(url));
  // Open the source (or, for uploaded documents which have no navigable URL, open details).
  const openSource = (episode: Episode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUploadedDocumentUrl(episode.url)) {
      onSelectEpisode(episode.id);
    } else {
      window.open(episode.url, "_blank");
    }
  };

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

  // Mobile card view for each episode. `index` drives the staggered entrance
  // (see .stagger-item in index.css); items past the cap animate together.
  const MobileEpisodeCard = ({ episode, index = 0 }: { episode: Episode; index?: number }) => {
    const episodeFolders = (folderAssignments[episode.id] || [])
      .map(fId => foldersMap.get(fId))
      .filter(Boolean);

    const tags = getEpisodeTags(episode);
    const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
    const extraTagCount = tags.length - visibleTags.length;

    return (
      <div className="px-3 py-1.5">
      <SwipeToDelete onDelete={() => requestDelete(episode.id)}>
      <div
        style={{ "--stagger-i": index } as React.CSSProperties}
        className="stagger-item cv-row group rounded-2xl border border-border bg-card px-4 py-4 min-h-[72px] transition-all hover:bg-primary/[0.03] active:bg-primary/5 active:scale-[0.995] cursor-pointer touch-manipulation"
        onClick={() => onSelectEpisode(episode.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSelectEpisode(episode.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <SourceThumbnail
            url={episode.url}
            className="mt-0.5 h-12 w-[4.75rem] rounded-lg"
            showPlayBadge
          />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="font-medium text-[15px] leading-snug line-clamp-2">{episode.title}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AnalysisSourceChip url={episode.url} />
              {episode.created_at && (
                <span className="text-caption-1 text-foreground-tertiary">
                  {new Date(episode.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            <p className="truncate text-caption-1 text-foreground-tertiary">
              {getAnalysisProfileLabel(episode)}
              {episode.companies?.name ? ` · ${episode.companies.name}` : ""}
              {episode.founder_names ? ` · ${episode.founder_names}` : ""}
            </p>
            {(visibleTags.length > 0 || episodeFolders.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {visibleTags.map(tagName => (
                  <TagPill
                    key={tagName}
                    name={tagName}
                    selected={selectedTags.has(tagName)}
                    onSelect={() => toggleTag(tagName)}
                    onSmartFolder={requestSmartFolder}
                  />
                ))}
                {extraTagCount > 0 && (
                  <span className="text-xs text-muted-foreground">+{extraTagCount}</span>
                )}
                {episodeFolders.map(f => (
                  <span
                    key={f!.id}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: f!.color || undefined }}
                  >
                    {f!.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <BookmarkButton episodeId={episode.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={(e) => e.stopPropagation()} aria-label="More">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => openSource(episode, e)}>
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
      </SwipeToDelete>
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
              <h2 className="text-title-3 sm:text-title-2 flex items-center gap-2.5">
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="truncate">Your playbook</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {selectedIndustries.size > 0 || selectedFolderId || founderFilter !== "all"
                  ? `${filteredEpisodes.length} of ${allEpisodes.length} memos`
                  : `${allEpisodes.length} memo${allEpisodes.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant={showFilters ? "secondary" : "ghost"} size="icon" className="h-10 w-10" onClick={() => setShowFilters(!showFilters)} aria-label="Filters">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setManageFoldersOpen(true)} aria-label="Folders">
                <FolderPlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setSelectedExportId(undefined); setExportModalOpen(true); }} aria-label={selectedFolderId ? "Export folder" : "Export all"}>
                <Download className="w-4 h-4" />
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

        {/* View + sort on one row so chrome does not eat the list. */}
        <div className="px-4 sm:px-6 py-2.5 border-b flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scroll-touch">
            <Badge variant={viewMode === "chronological" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap min-h-9 px-3 text-xs flex items-center gap-1" onClick={() => changeViewMode("chronological")}>
              <LayoutList className="w-3.5 h-3.5" />Chronological
            </Badge>
            <Badge variant={viewMode === "tag" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap min-h-9 px-3 text-xs flex items-center gap-1" onClick={() => changeViewMode("tag")}>
              <Tag className="w-3.5 h-3.5" />By Tag
            </Badge>
            <Badge variant={viewMode === "folder" ? "default" : "outline"} className="cursor-pointer whitespace-nowrap min-h-9 px-3 text-xs flex items-center gap-1" onClick={() => changeViewMode("folder")}>
              <Folder className="w-3.5 h-3.5" />By Folder
            </Badge>
          </div>
          {isMobile && (
            <Select value={sortColumn} onValueChange={(val) => handleSort(val as SortColumn)}>
              <SelectTrigger className="h-9 w-[7.5rem] shrink-0 text-xs" aria-label="Sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {(["created_at", "release_date", "title", "company", "founder", "tag_count"] as SortColumn[]).map((col) => (
                  <SelectItem key={col} value={col}>
                    {SORT_LABELS[col]}{sortColumn === col ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tag filter chip bar */}
        {uniqueTags.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto scroll-touch">
            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {uniqueTags.slice(0, 24).map(([name, count]) => (
              <Badge
                key={name}
                variant={selectedTags.has(name) ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap min-h-9 px-3 text-xs"
                onClick={() => toggleTag(name)}
              >
                {name}<span className="ml-1 opacity-60">{count}</span>
              </Badge>
            ))}
            {selectedTags.size > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-xs px-3" onClick={() => { setSelectedTags(new Set()); setSearchParams(p => { p.delete("tags"); return p; }); }}>
                Clear tags
              </Button>
            )}
          </div>
        )}

        {/* Folder filter bar */}
        {folders.length > 0 && (
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b bg-muted/10 flex items-center gap-2 overflow-x-auto scroll-touch">
            <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Badge
              variant={selectedFolderId === null ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap min-h-9 px-3"
              onClick={() => setSelectedFolderId(null)}
            >
              All
            </Badge>
            {folders.map(folder => (
              <Badge
                key={folder.id}
                variant={selectedFolderId === folder.id ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap min-h-9 px-3"
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
                  {eps.map((ep, i) => <MobileEpisodeCard key={ep.id} episode={ep} index={i} />)}
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
                  {eps.map((ep, i) => <MobileEpisodeCard key={ep.id} episode={ep} index={i} />)}
                </div>
              );
            })}
          </div>
        ) : isMobile ? (
          <div>
            {paginatedEpisodes.map((episode, i) => (
              <MobileEpisodeCard key={episode.id} episode={episode} index={i} />
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
                    .map(fId => foldersMap.get(fId))
                    .filter(Boolean);

                  return (
                    <TableRow
                      key={episode.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => onSelectEpisode(episode.id)}
                    >
                      <TableCell className="font-medium max-w-md">
                        <div className="flex items-start gap-3">
                          <SourceThumbnail
                            url={episode.url}
                            className="mt-0.5 h-11 w-[4.4rem] rounded-lg"
                            showPlayBadge
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                          <div className="line-clamp-2">{episode.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <AnalysisSourceChip url={episode.url} />
                          <Badge variant={isUniversalAnalysis(episode) ? "outline" : "secondary"} className="text-[10px]">
                            {getAnalysisProfileLabel(episode)}
                          </Badge>
                        </div>
                          <div className="flex gap-1 flex-wrap">
                            {getEpisodeTags(episode).slice(0, MAX_VISIBLE_TAGS).map(tagName => (
                              <TagPill
                                key={tagName}
                                name={tagName}
                                selected={selectedTags.has(tagName)}
                                onSelect={() => toggleTag(tagName)}
                                onSmartFolder={requestSmartFolder}
                              />
                            ))}
                            {getEpisodeTags(episode).length > MAX_VISIBLE_TAGS && (
                              <span className="text-xs text-muted-foreground">+{getEpisodeTags(episode).length - MAX_VISIBLE_TAGS}</span>
                            )}
                            {episodeFolders.map(f => (
                              <span
                                key={f!.id}
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                                style={{ backgroundColor: f!.color || undefined }}
                              >
                                {f!.name}
                              </span>
                            ))}
                          </div>
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
            No sources match your search or filters.
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
            <DialogDescription>
              Organize your analyses into folders — then share any folder with a teammate or advisor.
            </DialogDescription>
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
                disabled={creatingFolders || !bulkFolderNames.some(n => n.trim())}
              >
                {creatingFolders
                  ? "Creating..."
                  : bulkFolderNames.filter(n => n.trim()).length > 1
                    ? `Create ${bulkFolderNames.filter(n => n.trim()).length} folders`
                    : "Create folder"}
              </Button>
            </div>
            {folders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                <Folder className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">No folders yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add a name above, then create your first folder.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                      <span className="text-sm truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Share ${folder.name}`}
                        title="Invite collaborators"
                        onClick={() => setShareFolder(folder)}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${folder.name}`}
                        onClick={() => {
                          setDeleteMoveTarget("none");
                          setFolderPendingDelete(folder);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!folderPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setFolderPendingDelete(null);
            setDeleteMoveTarget("none");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{folderPendingDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!folderPendingDelete) return null;
                const count = Object.values(folderAssignments).filter((ids) =>
                  ids.includes(folderPendingDelete.id)
                ).length;
                if (count === 0) return "No episodes are assigned to this folder. Your episodes are not deleted.";
                return `${count} ${count === 1 ? "episode is" : "episodes are"} assigned to this folder. Your episodes are not deleted — choose what happens to their folder assignment below.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {folderPendingDelete &&
            Object.values(folderAssignments).some((ids) => ids.includes(folderPendingDelete.id)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Move episodes to</label>
                <Select value={deleteMoveTarget} onValueChange={setDeleteMoveTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Leave unassigned</SelectItem>
                    {folders
                      .filter((f) => f.id !== folderPendingDelete.id)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!folderPendingDelete) return;
                await handleDeleteFolder(
                  folderPendingDelete.id,
                  deleteMoveTarget === "none" ? undefined : deleteMoveTarget
                );
                setFolderPendingDelete(null);
                setDeleteMoveTarget("none");
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteCandidateId}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidateId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the analysis along with all of its lessons,
              callouts, and personalized insights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteEpisode}
            >
              Delete analysis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportModal
        episodeId={selectedExportId}
        episodeIds={!selectedExportId && selectedFolderId
          ? Object.entries(folderAssignments)
              .filter(([, ids]) => ids.includes(selectedFolderId))
              .map(([epId]) => epId)
          : undefined}
        scopeLabel={selectedFolderId ? foldersMap.get(selectedFolderId)?.name : undefined}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />

      <FolderShareDialog
        folderId={shareFolder?.id ?? null}
        folderName={shareFolder?.name ?? ""}
        open={!!shareFolder}
        onOpenChange={(open) => { if (!open) setShareFolder(null); }}
      />

      <AlertDialog
        open={!!smartFolderTag}
        onOpenChange={(open) => {
          if (!open && !creatingSmartFolder) setSmartFolderTag(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Create a {smartFolderTag ? folderNameFromTag(smartFolderTag) : "tag"} folder?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We’ll file every analysis already tagged “{smartFolderTag}”, and any new
              video, article, or upload that gets that tag will go into this folder
              automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingSmartFolder}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSmartFolder} disabled={creatingSmartFolder}>
              {creatingSmartFolder ? "Creating…" : "Create smart folder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={autoFolderUpgradeOpen} onOpenChange={setAutoFolderUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smart folders</DialogTitle>
            <DialogDescription>
              Free and C-Suite accounts file analyses by hand. The Boardroom turns a tag into a living folder.
            </DialogDescription>
          </DialogHeader>
          <UpgradePrompt
            feature="autoFolder"
            message="Long-press any tag to create a folder, file every matching analysis, and auto-file new ones going forward."
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
