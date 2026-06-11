import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { UiCard } from "../components/UiCard";
import { Typewriter } from "../components/Typewriter";

export const ScenePaste: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const press = spring({ frame: frame - 110, fps, config: { damping: 10, stiffness: 220 } });
  const btnScale = interpolate(press, [0, 0.5, 1], [1, 0.94, 1]);
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center", alignItems: "center" }}>
      <Reveal delay={4}>
        <div style={{ fontFamily: interFamily, fontSize: 30, letterSpacing: 6, color: colors.primary, fontWeight: 600, marginBottom: 28 }}>
          STEP 01
        </div>
      </Reveal>
      <Reveal delay={10} accent>
        <h1 style={{ fontFamily: interFamily, fontWeight: 700, fontSize: 88, color: colors.text, letterSpacing: -2, margin: 0, textAlign: "center" }}>
          Paste any <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary, fontWeight: 400 }}>YouTube</span> link
        </h1>
      </Reveal>

      <Reveal delay={28} style={{ marginTop: 60, width: 1280 }}>
        <UiCard glow style={{ padding: 40 }}>
          <div style={{ fontFamily: interFamily, fontSize: 26, color: colors.textMuted, marginBottom: 18, letterSpacing: 1 }}>
            VIDEO URL
          </div>
          <div style={{
            border: `1px solid ${colors.border}`, borderRadius: 16,
            background: "rgba(0,0,0,0.35)", padding: "28px 32px",
            fontFamily: interFamily, fontSize: 40, color: colors.text,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          }}>
            <Typewriter
              text="https://youtube.com/watch?v=neighborhood-ops"
              startFrame={40}
              charsPerFrame={1.2}
              style={{ fontVariantLigatures: "none" }}
            />
          </div>

          <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              transform: `scale(${btnScale})`,
              padding: "22px 40px", borderRadius: 999,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDeep})`,
              color: "#04130B", fontFamily: interFamily, fontWeight: 700, fontSize: 32,
              boxShadow: `0 18px 50px ${colors.primaryGlow}`,
              display: "inline-flex", alignItems: "center", gap: 14,
            }}>
              Analyze video →
            </div>
          </div>
        </UiCard>
      </Reveal>
    </AbsoluteFill>
  );
};
