import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  // Mobile: the bottom edge belongs to the tab bar, so toasts drop from the
  // top (safe-area offsets live in index.css). Desktop keeps bottom-right.
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? "top-center" : "bottom-right"}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover/85 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:rounded-2xl group-[.toaster]:shadow-glass",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
