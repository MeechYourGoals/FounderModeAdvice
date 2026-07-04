import { cn } from "@/lib/utils";

export const EditorialKicker = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      "text-[11px] font-semibold uppercase tracking-[0.24em] text-primary eyebrow-rule left",
      className,
    )}
  >
    {children}
  </p>
);
