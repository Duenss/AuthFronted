import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:          "#020c18",
        surface:             "#06111e",
        "surface-2":         "#071929",
        "surface-3":         "#0a2035",
        border:              "#0f2a42",
        muted:               "#2a5070",
        "muted-foreground":  "#4a8ab0",
        primary:             "#0095ff",
        "primary-hover":     "#007de0",
        "primary-light":     "#38b6ff",
        electric:            "#0095ff",
        "electric-bright":   "#00c3ff",
        success:             "#22c55e",
        warning:             "#f59e0b",
        danger:              "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card:               "0 1px 3px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.4)",
        "blue-glow":        "0 0 30px rgba(0,149,255,.35)",
        "blue-glow-sm":     "0 0 14px rgba(0,149,255,.25)",
        "electric-glow":    "0 0 20px rgba(0,149,255,.5), 0 0 60px rgba(0,149,255,.2)",
        "electric-glow-sm": "0 0 10px rgba(0,149,255,.4), 0 0 25px rgba(0,149,255,.15)",
        "electric-ring":    "0 0 0 3px rgba(0,149,255,.25)",
      },
      animation: {
        "glow-pulse":    "glowPulse 2.5s ease-in-out infinite",
        "glow-pulse-sm": "glowPulseSm 2.5s ease-in-out infinite",
        "fadein-up":     "fadeInUp .45s cubic-bezier(.22,1,.36,1) both",
        "border-glow":   "borderGlow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
