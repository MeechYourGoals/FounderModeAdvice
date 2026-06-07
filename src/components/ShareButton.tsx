import { Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shareNative, type ShareInput } from "@/services/nativeShare";

interface ShareButtonProps extends Omit<ButtonProps, "onClick"> {
  share: ShareInput;
  label?: string;
  iconOnly?: boolean;
}

/**
 * Renders the iOS/Android share sheet (or copies to clipboard on desktop)
 * for a piece of content. Counts as a "native feature" for App Review.
 */
export const ShareButton = ({
  share,
  label = "Share",
  iconOnly = false,
  size = "sm",
  variant = "ghost",
  ...rest
}: ShareButtonProps) => {
  const { toast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await shareNative(share);
    if (!result.ok) {
      if (result.reason === "cancelled") return;
      toast({
        title: "Couldn't share",
        description: "Sharing isn't available on this device.",
        variant: "destructive",
      });
      return;
    }
    if (result.transport === "clipboard") {
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      aria-label={label}
      {...rest}
    >
      <Share2 className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-1"} />
      {!iconOnly && label}
    </Button>
  );
};
