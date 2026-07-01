import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          /* Text hierarchy ramp: secondary (body copy that supports),
             tertiary (metadata/timestamps), quaternary (placeholders). */
          secondary: "hsl(var(--foreground-secondary))",
          tertiary: "hsl(var(--foreground-tertiary))",
          quaternary: "hsl(var(--foreground-quaternary))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        /* Rare brand accent (favorites, logo wordmark) — see --brand-red */
        "brand-red": "hsl(var(--brand-red))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "SF Pro Display",
          "SF Pro Text",
          "BlinkMacSystemFont",
          "system-ui",
          "Inter",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      /* Apple HIG type scale (Dynamic Type "Large" defaults). Weight is baked
         in so headers read native without stacking font-* utilities. */
      fontSize: {
        "large-title": ["2.125rem", { lineHeight: "2.5625rem", letterSpacing: "-0.026em", fontWeight: "700" }],
        "title-1": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.022em", fontWeight: "700" }],
        "title-2": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        "title-3": ["1.25rem", { lineHeight: "1.5625rem", letterSpacing: "-0.017em", fontWeight: "600" }],
        headline: ["1.0625rem", { lineHeight: "1.375rem", letterSpacing: "-0.014em", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.375rem", letterSpacing: "-0.014em" }],
        callout: ["1rem", { lineHeight: "1.3125rem", letterSpacing: "-0.012em" }],
        subhead: ["0.9375rem", { lineHeight: "1.25rem", letterSpacing: "-0.01em" }],
        footnote: ["0.8125rem", { lineHeight: "1.125rem", letterSpacing: "-0.005em" }],
        "caption-1": ["0.75rem", { lineHeight: "1rem" }],
        "caption-2": ["0.6875rem", { lineHeight: "0.8125rem", letterSpacing: "0.006em" }],
      },
      transitionTimingFunction: {
        /* Apple's UIKit sheet/navigation curve — fast start, long soft landing */
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
        /* Gentle overshoot for playful icon/badge pops */
        "ios-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        elegant: "var(--shadow-elegant)",
        glass: "var(--shadow-glass)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "screen-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "tab-pop": {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        "drill-in": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "screen-in": "screen-in 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        "tab-pop": "tab-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "drill-in": "drill-in 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
