import { useState, useEffect } from "react";
import { Heart, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { triggerHapticFeedback } from "@/lib/capacitor";

interface BookmarkButtonProps {
  episodeId: string;
  variant?: "default" | "ghost";
  size?: "default" | "sm" | "icon";
  showFolderMenu?: boolean;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

export const BookmarkButton = ({ 
  episodeId, 
  variant = "ghost", 
  size = "icon",
  showFolderMenu = true 
}: BookmarkButtonProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();
  const { canCreateBookmark, refreshSubscription } = useSubscription();

  useEffect(() => {
    fetchFolders();
    checkBookmarkStatus();
  }, [episodeId]);

  const fetchFolders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('bookmark_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setFolders(data || []);
  };

  const checkBookmarkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('bookmarked_episodes')
      .select('folder_id')
      .eq('episode_id', episodeId)
      .eq('user_id', user.id);
    
    const folderIds = new Set(data?.map(b => b.folder_id).filter(Boolean) as string[]);
    setSelectedFolderIds(folderIds);
    setIsBookmarked(folderIds.size > 0);
  };

  const getOrCreateDefaultFolder = async (userId: string) => {
    let { data: defaultFolder } = await supabase
      .from('bookmark_folders')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Default')
      .maybeSingle();
    
    if (!defaultFolder) {
      const { data } = await supabase
        .from('bookmark_folders')
        .insert({ user_id: userId, name: 'Default', color: '#3b82f6' })
        .select('id')
        .single();
      defaultFolder = data;
      fetchFolders();
    }
    
    return defaultFolder;
  };

  const quickBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (popoverOpen) return; // Don't quick bookmark if menu is open
    triggerHapticFeedback("light");

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to bookmark episodes" });
        return;
      }

      if (isBookmarked) {
        // Remove all bookmarks
        await supabase
          .from('bookmarked_episodes')
          .delete()
          .eq('episode_id', episodeId)
          .eq('user_id', user.id);

        setIsBookmarked(false);
        setSelectedFolderIds(new Set());
        toast({ title: "Bookmark removed" });
        await refreshSubscription();
      } else {
        // Check bookmark limit
        const bookmarkCheck = canCreateBookmark();
        if (!bookmarkCheck.allowed) {
          toast({
            title: "Bookmark Limit Reached",
            description: bookmarkCheck.message || "Upgrade to save more bookmarks.",
            variant: "destructive",
          });
          return;
        }

        // Add to Default folder
        const defaultFolder = await getOrCreateDefaultFolder(user.id);

        await supabase
          .from('bookmarked_episodes')
          .insert({
            episode_id: episodeId,
            user_id: user.id,
            folder_id: defaultFolder!.id
          });

        setIsBookmarked(true);
        setSelectedFolderIds(new Set([defaultFolder!.id]));
        triggerHapticFeedback("success");
        toast({ title: "Saved to Default folder" });
        await refreshSubscription();
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update bookmark", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = async (folderId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newSet = new Set(selectedFolderIds);

      if (selectedFolderIds.has(folderId)) {
        await supabase
          .from('bookmarked_episodes')
          .delete()
          .eq('episode_id', episodeId)
          .eq('folder_id', folderId)
          .eq('user_id', user.id);
        newSet.delete(folderId);
      } else {
        await supabase
          .from('bookmarked_episodes')
          .insert({ 
            episode_id: episodeId, 
            user_id: user.id,
            folder_id: folderId 
          });
        newSet.add(folderId);
      }

      setSelectedFolderIds(newSet);
      setIsBookmarked(newSet.size > 0);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update folder", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookmark_folders')
        .insert({ 
          user_id: user.id, 
          name: newFolderName.trim(), 
          color: '#3b82f6' 
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFolders([data, ...folders]);
        await toggleFolder(data.id);
        toast({ title: `Created "${newFolderName}" folder` });
        setNewFolderName("");
        setIsCreatingFolder(false);
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create folder", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showFolderMenu) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={quickBookmark}
        disabled={loading}
        className={cn(isBookmarked && "text-primary")}
      >
        <Heart className={cn("w-4 h-4", isBookmarked && "fill-current")} />
      </Button>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={quickBookmark}
          disabled={loading}
          className={cn(isBookmarked && "text-primary")}
          onContextMenu={(e) => {
            e.preventDefault();
            setPopoverOpen(true);
          }}
        >
          <Heart className={cn("w-4 h-4", isBookmarked && "fill-current")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="font-medium text-sm">Save to folders</div>
          
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`folder-${folder.id}`}
                    checked={selectedFolderIds.has(folder.id)}
                    onCheckedChange={() => toggleFolder(folder.id)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={`folder-${folder.id}`}
                    className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: folder.color }}
                    />
                    {folder.name}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {isCreatingFolder ? (
            <div className="space-y-2 pt-2 border-t">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createFolder} className="flex-1">
                  Create
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
