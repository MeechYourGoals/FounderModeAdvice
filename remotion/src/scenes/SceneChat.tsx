import { AbsoluteFill } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { UiCard } from "../components/UiCard";
import { Typewriter } from "../components/Typewriter";

export const SceneChat: React.FC = () => {
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center", alignItems: "center" }}>
      <Reveal delay={4}>
        <div style={{ fontFamily: interFamily, fontSize: 28, letterSpacing: 6, color: colors.primary, fontWeight: 600, marginBottom: 24 }}>
          STEP 04
        </div>
      </Reveal>
      <Reveal delay={10} accent>
        <h1 style={{ fontFamily: interFamily, fontWeight: 700, fontSize: 84, color: colors.text, letterSpacing: -2, margin: 0, textAlign: "center" }}>
          Then <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary, fontWeight: 400 }}>ask the video</span> anything
        </h1>
      </Reveal>

      <Reveal delay={24} style={{ marginTop: 56, width: 1400 }}>
        <UiCard glow style={{ padding: 44 }}>
          {/* user bubble */}
          <Reveal delay={32} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
            <div style={{
              maxWidth: 900, padding: "24px 32px", borderRadius: 24,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDeep})`,
              color: "#04130B", fontFamily: interFamily, fontSize: 32, fontWeight: 600, lineHeight: 1.35,
            }}>
              <Typewriter text="How should I price my first 50 customers?" startFrame={44} charsPerFrame={1.3} showCaret={false} />
            </div>
          </Reveal>

          {/* assistant bubble */}
          <Reveal delay={84} style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              maxWidth: 1100, padding: "28px 32px", borderRadius: 24,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${colors.border}`,
              color: colors.text, fontFamily: interFamily, fontSize: 30, lineHeight: 1.45,
            }}>
              <div>
                Start with a single "founder price" combo — keep it simple, free of discounts.
                Use it to learn who comes back twice in a week. Raise prices once 30% repeat.
              </div>
              <div style={{
                marginTop: 18, display: "inline-flex", alignItems: "center", gap: 10,
                padding: "8px 14px", borderRadius: 999, background: "rgba(34,197,94,0.10)",
                border: `1px solid rgba(34,197,94,0.35)`, color: colors.primary,
                fontSize: 22, fontWeight: 600, letterSpacing: 1,
              }}>
                ◷ Sourced from transcript · 03:14
              </div>
            </div>
          </Reveal>
        </UiCard>
      </Reveal>
    </AbsoluteFill>
  );
};
