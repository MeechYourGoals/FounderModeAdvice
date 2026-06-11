import { AbsoluteFill } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { BrandMark } from "../components/BrandMark";

export const SceneClose: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      <Reveal delay={4} accent>
        <BrandMark size={56} />
      </Reveal>
      <Reveal delay={20} accent>
        <h1 style={{
          fontFamily: interFamily, fontWeight: 700, fontSize: 104, color: colors.text,
          letterSpacing: -3, margin: "48px 0 0 0", textAlign: "center", lineHeight: 1.05,
        }}>
          Build your boardroom.
        </h1>
      </Reveal>
      <Reveal delay={36} accent>
        <h2 style={{
          fontFamily: frauncesFamily, fontStyle: "italic", fontWeight: 400,
          color: colors.primary, fontSize: 104, letterSpacing: -2, margin: "8px 0 0 0", textAlign: "center", lineHeight: 1.05,
        }}>
          Instill their insights.
        </h2>
      </Reveal>
      <Reveal delay={56}>
        <p style={{ fontFamily: interFamily, color: colors.textMuted, fontSize: 32, marginTop: 40, letterSpacing: 1 }}>
          foundermodeadvice.com
        </p>
      </Reveal>
    </AbsoluteFill>
  );
};
