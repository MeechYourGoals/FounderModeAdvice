import { AbsoluteFill } from "remotion";
import { colors, frauncesFamily, interFamily } from "../theme";
import { Reveal } from "../components/Reveal";
import { BrandMark } from "../components/BrandMark";

export const SceneHook: React.FC = () => {
  const baseTitle: React.CSSProperties = {
    fontFamily: interFamily,
    fontWeight: 700,
    color: colors.text,
    fontSize: 110,
    lineHeight: 1.04,
    letterSpacing: -3,
  };
  return (
    <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
      <Reveal delay={6}>
        <div style={{
          fontFamily: interFamily, fontSize: 30, letterSpacing: 6,
          color: colors.primary, fontWeight: 600, marginBottom: 36,
        }}>
          FOUNDER MODE ADVICE
        </div>
      </Reveal>
      <Reveal delay={12} accent>
        <div style={baseTitle}>You don't need a</div>
      </Reveal>
      <Reveal delay={26} accent>
        <div style={baseTitle}>
          boardroom <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary, fontWeight: 400 }}>of advisors —</span>
        </div>
      </Reveal>
      <Reveal delay={46} accent>
        <div style={{ ...baseTitle, color: colors.textMuted, fontSize: 92, marginTop: 16 }}>
          to <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.text }}>learn like you have one.</span>
        </div>
      </Reveal>
      <div style={{ position: "absolute", left: 120, bottom: 96 }}>
        <Reveal delay={70}>
          <BrandMark size={36} />
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
