import { useRef } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMontage } from "@/components/marketing/HeroMontage";
import {
  m,
  useScroll,
  useTransform,
  useLandingScrollRef,
  SPRING_POP,
  EASE_IOS,
} from "@/components/marketing/motion";

/** One headline line whose words rise out of an overflow mask in cascade. */
const CascadeLine = ({
  text,
  baseDelay,
  className,
  wordClassName,
}: {
  text: string;
  baseDelay: number;
  className?: string;
  wordClassName?: string;
}) => (
  <span className={className}>
    {text.split(" ").map((word, i) => (
      <span key={`${word}-${i}`} className="mask-line">
        <m.span
          className={wordClassName ? `inline-block ${wordClassName}` : "inline-block"}
          initial={{ y: "112%" }}
          animate={{ y: "0%" }}
          transition={{ duration: 0.65, ease: EASE_IOS, delay: baseDelay + i * 0.05 }}
        >
          {word}
        </m.span>
        {i < text.split(" ").length - 1 ? " " : null}
      </span>
    ))}
  </span>
);

interface LandingHeroProps {
  onPrimary: () => void;
  onSecondary: () => void;
}

/**
 * Cinematic centered hero: word-cascade headline, then the auto-playing
 * insight montage. Copy parallax-fades as the visitor scrolls on (content
 * exits slightly faster than the montage for depth).
 */
export const LandingHero = ({ onPrimary, onSecondary }: LandingHeroProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const container = useLandingScrollRef() ?? undefined;
  const { scrollYProgress } = useScroll({
    container,
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 0.55], [0, -48]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const montageY = useTransform(scrollYProgress, [0, 0.55], [0, -16]);

  return (
    <section
      ref={sectionRef}
      className="hero-field relative overflow-hidden"
      style={{ paddingTop: "calc(var(--safe-area-top) + 128px)" }}
    >
      <div aria-hidden className="hero-glow absolute inset-0" />

      <div className="relative mx-auto max-w-5xl px-4 pb-16 sm:pb-24 text-center">
        <m.div style={{ y: copyY, opacity: copyOpacity }}>
          <m.p
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_IOS }}
          >
            Your private founder boardroom
          </m.p>

          <h1 className="mx-auto max-w-3xl text-[2.4rem] leading-[1.06] tracking-[-0.03em] sm:text-6xl md:text-[4.2rem] font-semibold text-foreground">
            <CascadeLine text="Build Your Boardroom" baseDelay={0.12} className="block" />
            <CascadeLine
              text="Then Instill Their Insights"
              baseDelay={0.38}
              className="block mt-1.5"
              wordClassName="font-display italic font-medium text-gradient pr-[0.06em]"
            />
          </h1>

          <m.p
            className="mx-auto mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_IOS, delay: 0.75 }}
          >
            Paste almost any public link — an article, post, newsletter, video, or podcast. Get the
            wisdom of your chosen experts — risks, actions, and answers tailored to your company, role, and situation.
          </m.p>

          <m.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING_POP, delay: 0.9 }}
          >
            <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={SPRING_POP}>
              <Button size="lg" className="rounded-full px-7 h-12 text-[15px]" onClick={onPrimary}>
                Analyze a source
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </m.div>
            <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={SPRING_POP}>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full px-6 h-12 text-[15px] text-foreground/80"
                onClick={onSecondary}
              >
                <Play className="mr-2 h-4 w-4" />
                Watch the demo
              </Button>
            </m.div>
          </m.div>
        </m.div>

        <m.div className="mt-14 sm:mt-16" style={{ y: montageY }}>
          <m.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_IOS, delay: 1.05 }}
          >
            <HeroMontage />
          </m.div>
        </m.div>
      </div>
    </section>
  );
};
