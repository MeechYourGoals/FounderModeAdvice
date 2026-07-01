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
 * The PNGs are runtime-hosted assets, so if one fails to load (offline first
 * paint, CDN hiccup) we fall back to a typeset wordmark instead of a
 * broken-image glyph. Failure is tracked per variant — browsers fetch both
 * images regardless of theme, and a failure of the hidden one must not
 * replace the visible one.
 */
export const BrandLogo = ({ className = "h-9 w-auto", alt = "Founder Mode Advice" }: BrandLogoProps) => {
  const [lightFailed, setLightFailed] = useState(false);
  const [darkFailed, setDarkFailed] = useState(false);

  const wordmark = (visibility: string) => (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        "items-center gap-1.5 whitespace-nowrap font-bold tracking-tight leading-none",
        visibility,
        className,
      )}
    >
      <span className="text-foreground">Founder Mode</span>
      <span className="text-brand-red">Advice</span>
    </span>
  );

  return (
    <>
      {lightFailed ? (
        wordmark("inline-flex dark:hidden")
      ) : (
        <img
          src={lightLogo.url}
          alt={alt}
          className={`${className} block dark:hidden`}
          draggable={false}
          onError={() => setLightFailed(true)}
        />
      )}
      {darkFailed ? (
        wordmark("hidden dark:inline-flex")
      ) : (
        <img
          src={darkLogo.url}
          alt={alt}
          className={`${className} hidden dark:block`}
          draggable={false}
          onError={() => setDarkFailed(true)}
        />
      )}
    </>
  );
};
