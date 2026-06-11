import { AbsoluteFill } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { UiCard } from "../components/UiCard";

const Card: React.FC<{ label: string; bullets: string[]; delay: number; accent?: string }> = ({ label, bullets, delay, accent }) => (
  <Reveal delay={delay} style={{ flex: 1 }}>
    <UiCard style={{ padding: 36, height: "100%" }}>
      <div style={{
        display: "inline-block", padding: "8px 16px", borderRadius: 999,
        background: "rgba(34,197,94,0.10)", border: `1px solid rgba(34,197,94,0.35)`,
        color: accent ?? colors.primary, fontFamily: interFamily, fontSize: 22, fontWeight: 600, letterSpacing: 2, marginBottom: 22,
      }}>
        {label}
      </div>
      {bullets.map((b, i) => (
        <Reveal key={b} delay={delay + 14 + i * 8} style={{ display: "flex", gap: 16, marginBottom: 18 }}>
          <div style={{
            width: 12, height: 12, borderRadius: 6, background: colors.primary, marginTop: 14, flexShrink: 0,
            boxShadow: `0 0 14px ${colors.primaryGlow}`,
          }} />
          <p style={{ fontFamily: interFamily, color: colors.text, fontSize: 30, lineHeight: 1.35, margin: 0, fontWeight: 500 }}>{b}</p>
        </Reveal>
      ))}
    </UiCard>
  </Reveal>
);

export const SceneInsights: React.FC = () => {
  return (
    <AbsoluteFill style={{ padding: "90px 100px", justifyContent: "center" }}>
      <Reveal delay={4}>
        <div style={{ fontFamily: interFamily, fontSize: 28, letterSpacing: 6, color: colors.primary, fontWeight: 600, marginBottom: 18, textAlign: "center" }}>
          STEP 03 — PERSONALIZED INSIGHTS
        </div>
      </Reveal>
      <Reveal delay={10} accent>
        <h1 style={{ fontFamily: interFamily, fontWeight: 700, fontSize: 76, color: colors.text, letterSpacing: -2, margin: 0, textAlign: "center" }}>
          Mapped to <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary, fontWeight: 400 }}>your</span> business
        </h1>
      </Reveal>

      <div style={{ display: "flex", gap: 28, marginTop: 56, alignItems: "stretch" }}>
        <Card
          label="LESSONS"
          delay={24}
          bullets={[
            "Negotiate rent as a % of revenue, not a flat lease.",
            "Win your first 100 regulars before scaling menu.",
          ]}
        />
        <Card
          label="RISKS"
          delay={36}
          bullets={[
            "Single-supplier dependency on espresso beans.",
            "Loyalty program needs SMS, not app downloads.",
          ]}
        />
        <Card
          label="ACTIONS THIS WEEK"
          delay={48}
          bullets={[
            "Draft a 3-tier wholesale supplier shortlist.",
            "Pilot a $7 morning combo, track repeat visits.",
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
