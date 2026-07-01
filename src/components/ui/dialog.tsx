import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Responsive dialog: on phones every Dialog in the app presents as a native
 * iOS page sheet (vaul drawer) — slides up, drags to dismiss with real
 * spring physics, and scales the screen behind it. On sm+ it stays a
 * classic centered dialog. All subcomponents branch on the same media
 * query so the Radix/vaul context always matches.
 */
const PHONE_QUERY = "(max-width: 639px)";

function useIsPhone() {
  const [isPhone, setIsPhone] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches,
  );
  React.useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}

type DialogRootProps = React.ComponentProps<typeof DialogPrimitive.Root>;

const Dialog = (props: DialogRootProps) => {
  const isPhone = useIsPhone();
  if (isPhone) {
    return <DrawerPrimitive.Root shouldScaleBackground {...props} />;
  }
  return <DialogPrimitive.Root {...props} />;
};
Dialog.displayName = "Dialog";

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Trigger : DialogPrimitive.Trigger;
  return <Comp {...props} ref={ref} />;
});
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal = (props: React.ComponentProps<typeof DialogPrimitive.Portal>) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Portal : DialogPrimitive.Portal;
  return <Comp {...props} />;
};
DialogPortal.displayName = "DialogPortal";

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props, ref) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Close : DialogPrimitive.Close;
  return <Comp {...props} ref={ref} />;
});
DialogClose.displayName = "DialogClose";

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Overlay : DialogPrimitive.Overlay;
  return (
    <Comp
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <DrawerPrimitive.Portal>
        {/* Dim only — the scale-back of the screen behind already reads as
            depth, and native iOS page sheets never blur the background. */}
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          ref={ref}
          className={cn(
            "glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-3rem)] flex-col rounded-t-3xl p-6 pb-[calc(1.5rem+var(--safe-area-bottom))] shadow-glass outline-none",
            className,
          )}
          {...props}
        >
          <div className="sheet-grabber -mt-3 mb-3 shrink-0" aria-hidden />
          <div className="grid gap-4 overflow-y-auto overscroll-contain">{children}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    );
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "glass-strong fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl p-6 shadow-glass duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-all hover:bg-muted/60 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Title : DialogPrimitive.Title;
  return <Comp ref={ref} className={cn("text-title-3", className)} {...props} />;
});
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const isPhone = useIsPhone();
  const Comp = isPhone ? DrawerPrimitive.Description : DialogPrimitive.Description;
  return <Comp ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
});
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
