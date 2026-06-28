import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FavoriteKind } from "@/hooks/useFavorites";

export interface Pin {
  kind: FavoriteKind;
  value: string;
  display_name: string;
}

interface Props {
  pins: Pin[];
  onRemove: (p: Pin) => void;
  onClear: () => void;
  onSaveCollection: () => void;
  canSave: boolean;
}

const KIND_LABEL: Record<FavoriteKind, string> = {
  channel: "Channel",
  founder: "Founder",
  topic: "Topic",
};

export const PinChips = ({ pins, onRemove, onClear, onSaveCollection, canSave }: Props) => {
  if (pins.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {pins.length === 1 ? "Filtering by" : `Intersection of ${pins.length} pins`}:
      </span>
      {pins.map((p) => (
        <span
          key={`${p.kind}:${p.value}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          <span className="text-[10px] uppercase tracking-wide opacity-80">
            {KIND_LABEL[p.kind]}
          </span>
          <span className="font-medium">{p.display_name}</span>
          <button
            onClick={() => onRemove(p)}
            className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
            aria-label={`Remove ${p.display_name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear all
      </Button>
      {canSave && pins.length >= 2 && (
        <Button variant="outline" size="sm" onClick={onSaveCollection} className="ml-auto">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save as collection
        </Button>
      )}
    </div>
  );
};
