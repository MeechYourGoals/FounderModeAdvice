import React from "react";
import { colors } from "../theme";

export const UiCard: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties; glow?: boolean }>> = ({
  children,
  style,
  glow,
}) => (
  <div
    style={{
      background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))`,
      border: `1px solid ${colors.border}`,
      borderRadius: 24,
      backdropFilter: undefined,
      boxShadow: glow
        ? `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px ${colors.border}, 0 0 60px ${colors.primaryGlow}`
        : `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px ${colors.border}`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<React.PropsWithChildren<{ tone?: "default" | "primary"; style?: React.CSSProperties }>> = ({
  children,
  tone = "default",
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 20px",
      borderRadius: 999,
      fontSize: 28,
      fontWeight: 500,
      color: tone === "primary" ? colors.primary : colors.text,
      background: tone === "primary" ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${tone === "primary" ? "rgba(34,197,94,0.35)" : colors.border}`,
      ...style,
    }}
  >
    {children}
  </span>
);
