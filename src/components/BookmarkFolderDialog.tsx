import { useEffect, useState } from "react";
import { Check, Folder as FolderIcon } from "lucide-react";
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
import { triggerHapticFeedback } from "@/lib/capacitor";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  // The dialog stays mounted between opens, so re-seed the form from the
  // folder being edited (or reset for "create") every time it opens.
  useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? "");
    setDescription(folder?.description ?? "");
    setColor(folder?.color ?? "#3b82f6");
  }, [open, folder]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), color });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {folder ? "Edit Folder" : "New Folder"}
          </DialogTitle>
          <DialogDescription>
            {folder
              ? "Update your folder details"
              : "Create a folder to organize your bookmarks"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Live preview of the folder glyph, mirroring the list row */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <FolderIcon className="h-5 w-5" fill="currentColor" fillOpacity={0.3} />
            </span>
            <span className="text-subhead font-medium truncate">
              {name.trim() || "Folder name"}
            </span>
          </div>

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
            <div className="flex gap-2.5 flex-wrap">
              {colorOptions.map((option) => {
                const selected = color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-ios-spring active:scale-90 ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: option.value,
                      ...(selected ? { ["--tw-ring-color" as string]: option.value } : {}),
                    }}
                    onClick={() => {
                      triggerHapticFeedback("light");
                      setColor(option.value);
                    }}
                    aria-label={option.name}
                    aria-pressed={selected}
                    title={option.name}
                  >
                    {selected && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1 min-h-11">
              {loading ? "Saving..." : folder ? "Update" : "Create"} Folder
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
