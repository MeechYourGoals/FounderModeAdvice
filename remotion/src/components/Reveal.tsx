import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Reveal: React.FC<React.PropsWithChildren<{ delay?: number; y?: number; accent?: boolean; style?: React.CSSProperties }>> = ({
  children,
  delay = 0,
  y = 16,
  accent = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: accent ? { damping: 12, stiffness: 140 } : { damping: 18, stiffness: 180 },
  });
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ty = interpolate(s, [0, 1], [y, 0]);
  const scale = accent ? interpolate(s, [0, 1], [0.96, 1]) : 1;
  return (
    <div style={{ opacity, transform: `translateY(${ty}px) scale(${scale})`, ...style }}>{children}</div>
  );
};
