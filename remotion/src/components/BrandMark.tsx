import { colors, frauncesFamily, interFamily } from "../theme";

export const BrandMark: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDeep})`,
        boxShadow: `0 0 30px ${colors.primaryGlow}`,
        display: "grid",
        placeItems: "center",
        color: "#04130B",
        fontFamily: interFamily,
        fontWeight: 800,
        fontSize: size * 0.5,
        letterSpacing: -1,
      }}
    >
      F
    </div>
    <span style={{ fontFamily: interFamily, fontSize: size * 0.55, color: colors.text, letterSpacing: 1.5, fontWeight: 600 }}>
      FOUNDER MODE <span style={{ fontFamily: frauncesFamily, fontStyle: "italic", color: colors.primary }}>advice</span>
    </span>
  </div>
);
