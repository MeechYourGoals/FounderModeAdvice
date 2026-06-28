import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites, type FavoriteKind } from "@/hooks/useFavorites";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FavoriteStarProps {
  kind: FavoriteKind;
  displayName: string;
  /** Compact icon-only button for table rows. */
  size?: "sm" | "icon";
  className?: string;
}

const isPaid = (tier?: string) => tier === "seed" || tier === "series_z";

export const FavoriteStar = ({ kind, displayName, size = "icon", className }: FavoriteStarProps) => {
  const { isFavorite, toggle } = useFavorites();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const active = isFavorite(kind, displayName);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isPaid(subscription?.tier)) {
      toast({
        title: "Favorites is a Pro feature",
        description: "Pin founders, channels, and topics to filter your library in one tap.",
        action: (
          <Button size="sm" onClick={() => navigate("/account")}>
            Upgrade
          </Button>
        ) as any,
      });
      return;
    }
    void toggle(kind, displayName);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Unfavorite ${displayName}` : `Favorite ${displayName}`}
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <Star
        className={cn("h-4 w-4 transition-colors", active ? "fill-primary text-primary" : "text-muted-foreground")}
      />
    </Button>
  );
};
