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
        ink: "#0b1220",
        court: "#8bd450",
        clay: "#b85b36",
        hard: "#2374ab",
        grass: "#2f7d4d",
        sand: "#f4efe6",
      },
      boxShadow: {
        card: "0 18px 60px rgba(11, 18, 32, 0.12)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(11, 18, 32, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 18, 32, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
