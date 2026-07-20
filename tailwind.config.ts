import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#1a1a1a",
        "surface-3": "#222222",
        border: "#2a2a2a",
        muted: "#6b7280",
        "muted-foreground": "#9ca3af",
        primary: "#3b82f6",
        "primary-hover": "#2563eb",
        "primary-light": "#60a5fa",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)",
        "blue-glow": "0 0 20px rgba(59,130,246,.3)",
        "blue-glow-sm": "0 0 10px rgba(59,130,246,.2)"
      }
    }
  },
  plugins: []
};

export default config;
