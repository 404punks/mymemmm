import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090f",
          900: "#0c1018",
          800: "#121826",
          700: "#1a2233",
          600: "#243044",
        },
        paper: {
          DEFAULT: "#e7edf4",
          dim: "#93a0b3",
          faint: "#66758a",
        },
        cyan: {
          DEFAULT: "#3ee0ff",
          dim: "#149eb8",
        },
        violet: {
          DEFAULT: "#8d7cff",
          dim: "#5c4ec4",
        },
        danger: "#ff6d7d",
        ok: "#3ddc97",
        warn: "#f0c14a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(62,224,255,0.18), 0 12px 40px rgba(0,0,0,0.35)",
      },
      maxWidth: {
        page: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
