import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, FolderPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookmarkFolderDialog } from "@/components/BookmarkFolderDialog";
import { BookmarkedEpisodeCard } from "@/components/BookmarkedEpisodeCard";
import { StartupProfileDialog } from "@/components/StartupProfileDialog";
import { UpgradePrompt, UsageDisplay } from "@/components/subscription";
import { SpeakerDirectory } from "@/components/SpeakerDirectory";
import { cacheSavedItems, getCachedSavedItems } from "@/lib/offlineCache";
import { cn } from "@/lib/utils";

interface StartupProfile {
  id: string;
  company_name: string;
  company_website: string | null;
  stage: string;
  funding_raised: string | null;
  valuation: string | null;
  employee_count: number | null;
  industry: string | null;
  description: string;
  role: string | null;
  deck_summary: string | null;
}

interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface BookmarkedEpisode {
  id: string;
  episode_id: string;
  folder_id: string | null;
  notes: string | null;
  created_at: string;
  episodes?: {
    title: string;
    founder_names: string | null;
    release_date: string | null;
    platform: string | null;
  };
}

type StageType = "pre_seed" | "seed" | "series_a" | "series_b_plus" | "growth" | "public" | "bootstrapped";

export const ProfileSettings = ({
  onSelectEpisode,
  onCloseRequest,
  view = "profiles",
  condensed
}: {
  onSelectEpisode?: (id: string) => void;
  /** Called when the panel should close (e.g. navigating to a speaker's episodes). */
  onCloseRequest?: () => void;
  view?: "profiles" | "bookmarks" | "subscription";
  condensed?: boolean;
}) => {
  const { toast } = useToast();
  const { subscription, canCreateProfile } = useSubscription();
  const profileLimit = subscription?.limits.profiles.max || 1;
  const [profiles, setProfiles] = useState<StartupProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<StartupProfile | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bookmark state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [bookmarkedEpisodes, setBookmarkedEpisodes] = useState<BookmarkedEpisode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [bookmarkView, setBookmarkView] = useState<"folders" | "speakers">("folders");

  useEffect(() => {
    if (view === "bookmarks") {
      fetchFolders();
    } else {
      fetchProfiles();
    }
  }, [view]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_startup_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (formData: {
    company_name: string;
    company_website: string;
    stage: StageType;
    funding_raised: string;
    valuation: string;
    employee_count: number;
    industry: string;
    description: string;
    role: string;
    deck_summary: string;
  }) => {
    if (!formData.company_name || !formData.stage || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in company name, stage, and description.",
        variant: "destructive",
      });
      return;
    }

    if (!editingProfile) {
      const profileCheck = canCreateProfile();
      if (!profileCheck.allowed) {
        toast({
          title: "Profile Limit Reached",
          description: profileCheck.message || `Upgrade to add more profiles.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingProfile) {
        const { error } = await supabase
          .from("user_startup_profiles")
          .update({
            company_name: formData.company_name,
            company_website: formData.company_website || null,
            stage: formData.stage,
            funding_raised: formData.funding_raised || null,
            valuation: formData.valuation || null,
            employee_count: formData.employee_count || null,
            industry: formData.industry || null,
            description: formData.description,
            role: formData.role || null,
            deck_summary: formData.deck_summary || null,
          })
          .eq("id", editingProfile.id);

        if (error) throw error;
        toast({ title: "Profile updated successfully" });
      } else {
        const { error } = await supabase
          .from("user_startup_profiles")
          .insert([{
            company_name: formData.company_name,
            company_website: formData.company_website || null,
            stage: formData.stage,
            funding_raised: formData.funding_raised || null,
            valuation: formData.valuation || null,
            employee_count: formData.employee_count || null,
            industry: formData.industry || null,
            description: formData.description,
            role: formData.role || null,
            deck_summary: formData.deck_summary || null,
            user_id: user?.id
          }]);

        if (error) throw error;
        toast({ title: "Profile created successfully" });
      }

      setEditingProfile(null);
      fetchProfiles();
      window.dispatchEvent(new Event("profilesChanged"));
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_startup_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Profile deleted successfully" });
      fetchProfiles();
      window.dispatchEvent(new Event("profilesChanged"));
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast({
        title: "Error",
        description: "Failed to delete profile",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (profile: StartupProfile) => {
    setEditingProfile(profile);
    setShowProfileDialog(true);
  };

  // Bookmark management functions
  const fetchFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const fetchBookmarksForFolder = async (folderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If we're offline, hydrate from cache immediately.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await getCachedSavedItems(user.id);
      setBookmarkedEpisodes(
        cached
          .filter((c) => c.folder_id === folderId)
          .map((c) => ({
            id: c.id,
            user_id: c.user_id,
            episode_id: c.episode_id,
            folder_id: c.folder_id,
            notes: c.notes,
            created_at: null,
            episodes: c.episode_title
              ? {
                  title: c.episode_title,
                  founder_names: c.episode_founder_names,
                  release_date: c.episode_release_date,
                  platform: c.episode_platform,
                }
              : undefined,
          })) as never,
      );
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookmarked_episodes')
        .select(`
          *,
          episodes (
            title,
            founder_names,
            release_date,
            platform
          )
        `)
        .eq('user_id', user.id)
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];
      setBookmarkedEpisodes(rows);

      // Write-through to offline cache so the Saved tab stays useful offline.
      await cacheSavedItems(
        user.id,
        rows.map((r: typeof rows[number]) => ({
          id: r.id,
          episode_id: r.episode_id,
          folder_id: r.folder_id,
          notes: r.notes,
          episode_title: r.episodes?.title ?? null,
          episode_founder_names: r.episodes?.founder_names ?? null,
          episode_release_date: r.episodes?.release_date ?? null,
          episode_platform: r.episodes?.platform ?? null,
        })),
      );
    } catch (error) {
      console.error("Error fetching bookmarks, falling back to cache:", error);
      const cached = await getCachedSavedItems(user.id);
      setBookmarkedEpisodes(
        cached
          .filter((c) => c.folder_id === folderId)
          .map((c) => ({
            id: c.id,
            user_id: c.user_id,
            episode_id: c.episode_id,
            folder_id: c.folder_id,
            notes: c.notes,
            created_at: null,
            episodes: c.episode_title
              ? {
                  title: c.episode_title,
                  founder_names: c.episode_founder_names,
                  release_date: c.episode_release_date,
                  platform: c.episode_platform,
                }
              : undefined,
          })) as never,
      );
    }
  };

  const handleSaveFolder = async (data: { name: string; description: string; color: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingFolder) {
        const { error } = await supabase
          .from('bookmark_folders')
          .update({
            name: data.name,
            description: data.description || null,
            color: data.color,
          })
          .eq('id', editingFolder.id);

        if (error) throw error;
        toast({ title: "Folder updated" });
      } else {
        const { error } = await supabase
          .from('bookmark_folders')
          .insert({
            user_id: user.id,
            name: data.name,
            description: data.description || null,
            color: data.color,
          });

        if (error) throw error;
        toast({ title: "Folder created" });
      }

      fetchFolders();
      setEditingFolder(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save folder",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const { data: bookmarks } = await supabase
        .from('bookmarked_episodes')
        .select('id')
        .eq('folder_id', folderId);

      if (bookmarks && bookmarks.length > 0) {
        const confirmed = window.confirm(
          `This folder has ${bookmarks.length} bookmarks. Delete anyway? (Bookmarks will be moved to Default folder)`
        );
        if (!confirmed) return;

        // Move bookmarks to Default folder
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let { data: defaultFolder } = await supabase
          .from('bookmark_folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', 'Default')
          .maybeSingle();

        if (!defaultFolder) {
          const { data } = await supabase
            .from('bookmark_folders')
            .insert({ user_id: user.id, name: 'Default', color: '#3b82f6' })
            .select('id')
            .single();
          defaultFolder = data;
        }

        await supabase
          .from('bookmarked_episodes')
          .update({ folder_id: defaultFolder!.id })
          .eq('folder_id', folderId);
      }

      const { error } = await supabase
        .from('bookmark_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast({ title: "Folder deleted" });
      fetchFolders();
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
        setBookmarkedEpisodes([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('bookmarked_episodes')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      toast({ title: "Bookmark removed" });
      if (selectedFolderId) {
        fetchBookmarksForFolder(selectedFolderId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const profileCheck = canCreateProfile();

  const displayProfileLimit = profileLimit >= 9999 ? "Unlimited" : profileLimit;

  if (view === "profiles") {
    return (
      <div className="space-y-4">
        {!profileCheck.allowed && (
          <UpgradePrompt
            message={profileCheck.message || "Upgrade to add more profiles"}
            feature="profile"
            compact
          />
        )}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {subscription?.limits.profiles.used || profiles.length}/{displayProfileLimit} profiles
          </p>
          <Button
            onClick={() => {
              setEditingProfile(null);
              setShowProfileDialog(true);
            }}
            disabled={!profileCheck.allowed}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Profile
          </Button>
        </div>

        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{profile.company_name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">
                      {profile.stage.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(profile)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-2">{profile.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <StartupProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          profile={editingProfile}
          onSave={handleSaveProfile}
        />
      </div>
    );
  }

  if (view === "bookmarks") {
    return (
      <div className="space-y-4">
        {/* Switch between bookmark folders and the speaker directory */}
        <div className="inline-flex w-full rounded-lg bg-muted p-1 text-sm">
          {(["folders", "speakers"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setBookmarkView(view)}
              className={cn(
                "flex-1 rounded-md py-1.5 font-medium capitalize transition-colors",
                bookmarkView === view
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view}
            </button>
          ))}
        </div>

        {bookmarkView === "speakers" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Browse everyone featured in your analyzed videos. Tap a name to filter your library.
            </p>
            <ScrollArea className={condensed ? "h-[340px]" : "h-[460px]"}>
              <div className="pr-2">
                <SpeakerDirectory variant="list" onNavigate={onCloseRequest} />
              </div>
            </ScrollArea>
          </div>
        ) : (
        <>
        <div className="flex justify-between items-center">
          <h3 className="font-medium">My Folders</h3>
          <Button
            onClick={() => {
              setEditingFolder(null);
              setShowFolderDialog(true);
            }}
            size="sm"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No folders yet. Create one to organize your bookmarks!</p>
          </div>
        ) : (
          <ScrollArea className={condensed ? "h-48" : "h-64"}>
            <div className="space-y-2">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className={`cursor-pointer transition-colors ${
                    selectedFolderId === folder.id ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    fetchBookmarksForFolder(folder.id);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <div>
                          <div className="font-medium">{folder.name}</div>
                          {folder.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {folder.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setShowFolderDialog(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedFolderId && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">
              {folders.find(f => f.id === selectedFolderId)?.name} Episodes
            </h4>
            {bookmarkedEpisodes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No episodes in this folder yet</p>
              </div>
            ) : (
              <ScrollArea className={condensed ? "h-64" : "h-96"}>
                <div className="space-y-3">
                  {bookmarkedEpisodes.map((bookmark) => (
                    <BookmarkedEpisodeCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      folders={folders}
                      onView={() => onSelectEpisode?.(bookmark.episode_id)}
                      onRemove={() => handleRemoveBookmark(bookmark.id)}
                      onUpdate={() => fetchBookmarksForFolder(selectedFolderId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <BookmarkFolderDialog
          open={showFolderDialog}
          onOpenChange={setShowFolderDialog}
          folder={editingFolder}
          onSave={handleSaveFolder}
        />
        </>
        )}
      </div>
    );
  }

  if (view === "subscription") {
    return (
      <div className="space-y-4">
        <UsageDisplay showUpgrade />
      </div>
    );
  }

  return null;
};
