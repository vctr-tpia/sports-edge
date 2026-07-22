import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface1: "var(--surface-1)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        surface4: "var(--surface-4)",
        borderSubtle: "var(--border-subtle)",
        borderStrong: "var(--border-strong)",
        ink: "var(--text-primary)",
        inkSecondary: "var(--text-secondary)",
        inkMuted: "var(--text-muted)",
        brand: "var(--brand-primary)",
        brandSoft: "var(--brand-primary-soft)",
        court: "var(--positive)",
        clay: "#c4744c",
        hard: "#4d82d8",
        grass: "#4a9c63",
        sand: "#111720",
        warning: "var(--warning)",
        danger: "var(--danger)",
        neutral: "var(--neutral)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
      },
      borderRadius: {
        panel: "20px",
        hero: "24px",
      },
    },
  },
  plugins: [],
};

export default config;
