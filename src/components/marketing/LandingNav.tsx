import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";
import {
  m,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useLandingScrollRef,
  SPRING_SOFT,
  EASE_IOS,
} from "@/components/marketing/motion";

const NAV_LINKS = [
  { label: "Product", target: "product" },
  { label: "Use cases", target: "use-cases" },
  { label: "Pricing", target: "pricing" },
  { label: "Demo", target: "demo" },
] as const;

interface LandingNavProps {
  onNavigate: (id: string) => void;
  /** Primary acquisition CTA — lands on the Sign Up tab. */
  onAuth: () => void;
  /** Returning-user entry — lands on the Sign In tab. Falls back to onAuth. */
  onSignIn?: () => void;
  onHome: () => void;
}

/**
 * Centered floating glass capsule nav. Detached from the top edge, it drops
 * in on mount and condenses (tighter padding, deeper shadow, more opaque)
 * once the page scrolls. The capsule is the landing page's single persistent
 * backdrop-filter surface — keep it that way for Safari's sake.
 */
export const LandingNav = ({ onNavigate, onAuth, onSignIn, onHome }: LandingNavProps) => {
  const [condensed, setCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const container = useLandingScrollRef() ?? undefined;
  const { scrollY } = useScroll({ container });

  useMotionValueEvent(scrollY, "change", (v) => setCondensed(v > 24));

  const go = (id: string) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center pointer-events-none px-3"
      style={{ paddingTop: "calc(var(--safe-area-top) + 12px)" }}
    >
      <div className="pointer-events-auto w-full sm:w-auto max-w-[calc(100vw-24px)]">
        <m.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRING_SOFT}
        >
          <m.div
            className="nav-capsule rounded-full flex items-center gap-1 sm:gap-1.5"
            animate={{
              paddingTop: condensed ? 6 : 10,
              paddingBottom: condensed ? 6 : 10,
              paddingLeft: condensed ? 14 : 18,
              paddingRight: condensed ? 8 : 10,
              boxShadow: condensed
                ? "inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 18px 50px -16px hsl(0 0% 0% / 0.65)"
                : "inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 12px 40px -18px hsl(0 0% 0% / 0.5)",
            }}
            transition={SPRING_SOFT}
          >
            {/* Mobile: menu trigger on the left keeps the logo visually centered */}
            <button
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 hover:text-foreground"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              onClick={onHome}
              className="flex items-center px-1 sm:px-2 hover:opacity-80 transition-opacity mx-auto md:mx-0"
              aria-label="Founder Mode Advice — home"
            >
              <m.div animate={{ scale: condensed ? 0.9 : 1 }} transition={SPRING_SOFT}>
                <BrandLogo className="h-8 w-auto" />
              </m.div>
            </button>

            <div className="hidden md:block h-5 w-px bg-border/70 mx-1" aria-hidden />

            {NAV_LINKS.map((link) => (
              <Button
                key={link.target}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-full text-foreground/70 hover:text-foreground link-sweep"
                onClick={() => go(link.target)}
              >
                {link.label}
              </Button>
            ))}

            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex rounded-full"
              onClick={onSignIn ?? onAuth}
            >
              Sign In
            </Button>

            <m.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_SOFT}>
              <Button size="sm" className="rounded-full px-4 h-9 sm:h-8" onClick={onAuth}>
                <span className="md:hidden">Start free</span>
                <span className="hidden md:inline">Analyze a source</span>
                <ArrowRight className="ml-1.5 h-4 w-4 hidden md:inline-block" />
              </Button>
            </m.div>
          </m.div>

          {/* Mobile dropdown panel */}
          <AnimatePresence>
            {menuOpen && (
              <m.div
                className="md:hidden nav-capsule mt-2 rounded-3xl overflow-hidden origin-top"
                initial={{ opacity: 0, scaleY: 0.85, y: -8 }}
                animate={{ opacity: 1, scaleY: 1, y: 0 }}
                exit={{ opacity: 0, scaleY: 0.9, y: -6, transition: { duration: 0.18, ease: EASE_IOS } }}
                transition={SPRING_SOFT}
              >
                <div className="flex flex-col p-2">
                  {NAV_LINKS.map((link) => (
                    <button
                      key={link.target}
                      className="flex min-h-11 items-center justify-between rounded-2xl px-4 text-left text-[15px] font-medium text-foreground/85 hover:bg-muted/60 active:bg-muted"
                      onClick={() => go(link.target)}
                    >
                      {link.label}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  <div className="mt-1 flex items-center justify-between rounded-2xl px-4 min-h-11">
                    <button
                      className="text-[15px] font-medium text-foreground/85"
                      onClick={() => {
                        setMenuOpen(false);
                        (onSignIn ?? onAuth)();
                      }}
                    >
                      Sign In
                    </button>
                    <ThemeToggle />
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </div>
    </div>
  );
};
