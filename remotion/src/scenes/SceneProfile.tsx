import { AbsoluteFill } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { Chip, UiCard } from "../components/UiCard";

export const SceneProfile: React.FC = () => {
  const row1 = ["Local coffee shop", "Pre‑revenue", "2 founders"];
  const row2 = ["Industry · Food & Beverage", "Stage · MVP", "Goal · First 100 customers"];
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center", alignItems: "center" }}>
      <Reveal delay={4}>
        <div style={{ fontFamily: interFamily, fontSize: 30, letterSpacing: 6, color: colors.primary, fontWeight: 600, marginBottom: 28 }}>
          STEP 02
        </div>
      </Reveal>
      <Reveal delay={10} accent>
        <h1 style={{ fontFamily: interFamily, fontWeight: 700, fontSize: 88, color: colors.text, letterSpacing: -2, margin: 0, textAlign: "center" }}>
          Tell us about <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary, fontWeight: 400 }}>your business</span>
        </h1>
      </Reveal>

      <Reveal delay={26} style={{ marginTop: 60, width: 1400 }}>
        <UiCard style={{ padding: 48 }}>
          <div style={{ fontFamily: interFamily, fontSize: 26, color: colors.textMuted, letterSpacing: 1, marginBottom: 20 }}>
            YOUR CONTEXT
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {row1.map((t, i) => (
              <Reveal key={t} delay={30 + i * 8}>
                <Chip>{t}</Chip>
              </Reveal>
            ))}
          </div>
          <div style={{ height: 32 }} />
          <div style={{ fontFamily: interFamily, fontSize: 26, color: colors.textMuted, letterSpacing: 1, marginBottom: 20 }}>
            OBJECTIVE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {row2.map((t, i) => (
              <Reveal key={t} delay={56 + i * 8}>
                <Chip tone="primary">{t}</Chip>
              </Reveal>
            ))}
          </div>
        </UiCard>
      </Reveal>
    </AbsoluteFill>
  );
};
