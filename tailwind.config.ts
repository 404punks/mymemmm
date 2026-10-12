import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--bg)",
        panel: "var(--panel)",
        line: "var(--line)",
        ivory: "var(--ivory)",
        muted: "var(--muted)",
        gold: "var(--gold)",
        fog: "var(--fog)",
        rose: "var(--rose)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-serif", "Georgia"],
      },
      maxWidth: { page: "1120px" },
    },
  },
  plugins: [],
};

export default config;
