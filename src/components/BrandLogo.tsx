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
 */
export const BrandLogo = ({ className = "h-9 w-auto", alt = "Founder Mode Advice" }: BrandLogoProps) => {
  return (
    <>
      <img src={lightLogo.url} alt={alt} className={`${className} block dark:hidden`} />
      <img src={darkLogo.url} alt={alt} className={`${className} hidden dark:block`} />
    </>
  );
};
