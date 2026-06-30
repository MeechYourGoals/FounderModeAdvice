import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BookmarkFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  } | null;
  onSave: (data: {
    name: string;
    description: string;
    color: string;
  }) => Promise<void>;
}

const colorOptions = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
];

export const BookmarkFolderDialog = ({
  open,
  onOpenChange,
  folder,
  onSave,
}: BookmarkFolderDialogProps) => {
  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const [color, setColor] = useState(folder?.color || "#3b82f6");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), color });
      onOpenChange(false);
      setName("");
      setDescription("");
      setColor("#3b82f6");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {folder ? "Edit Folder" : "Create New Folder"}
          </DialogTitle>
          <DialogDescription>
            {folder 
              ? "Update your folder details" 
              : "Create a new folder to organize your bookmarks"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name *</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Product Ideas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-description">Description</Label>
            <Textarea
              id="folder-description"
              placeholder="Optional description for this folder"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === option.value 
                      ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: option.value }}
                  onClick={() => setColor(option.value)}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1">
              {loading ? "Saving..." : folder ? "Update" : "Create"} Folder
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
