import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, FolderInput } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShareButton } from "@/components/ShareButton";
import { SourceThumbnail } from "@/components/SourceThumbnail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookmarkedEpisodeCardProps {
  bookmark: {
    id: string;
    episode_id: string;
    folder_id: string | null;
    notes: string | null;
    episodes?: {
      title: string;
      founder_names: string | null;
      release_date: string | null;
      platform: string | null;
      url?: string | null;
    };
  };
  folders: Array<{ id: string; name: string; color: string }>;
  onView: () => void;
  onRemove: () => void;
  onUpdate: () => void;
}

export const BookmarkedEpisodeCard = ({ 
  bookmark, 
  folders,
  onView, 
  onRemove,
  onUpdate 
}: BookmarkedEpisodeCardProps) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(bookmark.notes || "");
  const { toast } = useToast();

  const saveNotes = async () => {
    try {
      const { error } = await supabase
        .from('bookmarked_episodes')
        .update({ notes: notes || null })
        .eq('id', bookmark.id);

      if (error) throw error;
      
      toast({ title: "Notes saved" });
      setEditingNotes(false);
      onUpdate();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save notes", 
        variant: "destructive" 
      });
    }
  };

  const moveToFolder = async (newFolderId: string) => {
    try {
      const { error } = await supabase
        .from('bookmarked_episodes')
        .update({ folder_id: newFolderId })
        .eq('id', bookmark.id);

      if (error) throw error;
      
      const folderName = folders.find(f => f.id === newFolderId)?.name;
      toast({ title: `Moved to ${folderName}` });
      onUpdate();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to move bookmark", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {bookmark.episodes?.url && (
              <SourceThumbnail
                url={bookmark.episodes.url}
                className="mt-0.5 h-12 w-[4.75rem] rounded-lg"
                showPlayBadge
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium leading-snug line-clamp-2">
                {bookmark.episodes?.title || "Untitled Episode"}
              </h4>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-1 text-foreground-tertiary">
                {bookmark.episodes?.platform && (
                  <Badge variant="outline" className="rounded-full px-2 py-0 text-caption-2 font-medium">
                    {bookmark.episodes.platform}
                  </Badge>
                )}
                {bookmark.episodes?.founder_names && (
                  <span className="truncate max-w-[50%]">{bookmark.episodes.founder_names}</span>
                )}
                {bookmark.episodes?.release_date && (
                  <span>{new Date(bookmark.episodes.release_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                )}
              </div>
            </div>
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this episode..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotes}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingNotes(false);
                    setNotes(bookmark.notes || "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {bookmark.notes && (
                <p className="text-sm text-muted-foreground italic">
                  "{bookmark.notes}"
                </p>
              )}
            </>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            
            <Select
              value={bookmark.folder_id || ""}
              onValueChange={moveToFolder}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <FolderInput className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Move to..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: folder.color }}
                      />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setEditingNotes(!editingNotes)}
            >
              {editingNotes ? "Cancel" : "Notes"}
            </Button>
            
            <ShareButton
              share={{
                title: bookmark.episodes?.title || "Founder insight",
                text: bookmark.notes
                  ? `"${bookmark.notes}"`
                  : "A founder insight I saved on Founder Mode Advice.",
                url: `https://foundermodeadvice.com/?episode=${bookmark.episode_id}`,
              }}
              iconOnly
            />

            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="ml-auto"
              aria-label="Remove bookmark"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
