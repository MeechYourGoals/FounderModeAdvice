import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const t = frame / 900;
  const orbX = 50 + Math.sin(t * Math.PI * 2) * 18;
  const orbY = 45 + Math.cos(t * Math.PI * 1.4) * 14;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, ${colors.bg1} 0%, ${colors.bg0} 65%)` }}>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: `${orbX}%`,
            top: `${orbY}%`,
            width: 900,
            height: 900,
            transform: "translate(-50%,-50%)",
            background: `radial-gradient(circle, ${colors.primaryGlow} 0%, rgba(0,0,0,0) 60%)`,
            filter: "blur(40px)",
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            opacity: 0.5,
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ProgressRail = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, frame / 900);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryDeep})`,
          boxShadow: `0 0 24px ${colors.primaryGlow}`,
        }}
      />
    </div>
  );
};
