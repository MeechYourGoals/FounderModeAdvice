import { useState } from "react";
import { cn } from "@/lib/utils";
import lightLogo from "@/assets/fma-logo-light.png.asset.json";
import darkLogo from "@/assets/fma-logo-dark.png.asset.json";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Founder Mode Advice brand mark. Renders the dark-navy variant in light mode
 * and the white-stroke variant in dark mode for adequate contrast in both
 * themes (the red "ADVICE" wordmark stays red in both).
 *
 * The PNGs are runtime-hosted assets, so if one ever fails to load (offline
 * first paint, CDN hiccup) we fall back to a typeset wordmark instead of a
 * broken-image glyph — the header keeps its brand, never its bug.
 */
export const BrandLogo = ({ className = "h-9 w-auto", alt = "Founder Mode Advice" }: BrandLogoProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap font-bold tracking-tight leading-none",
          className,
        )}
      >
        <span className="text-foreground">Founder Mode</span>
        <span className="text-brand-red">Advice</span>
      </span>
    );
  }

  return (
    <>
      <img
        src={lightLogo.url}
        alt={alt}
        className={`${className} block dark:hidden`}
        draggable={false}
        onError={() => setFailed(true)}
      />
      <img
        src={darkLogo.url}
        alt={alt}
        className={`${className} hidden dark:block`}
        draggable={false}
        onError={() => setFailed(true)}
      />
    </>
  );
};
