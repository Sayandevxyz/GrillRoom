import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090C",
        surface: {
          DEFAULT: "#10131B",
          card: "#141822",
          elevated: "#1B202E",
          border: "#252C3D",
        },
        shark: {
          orange: "#FF6600",
          orangeHover: "#FF7B1A",
          gold: "#E5A93C",
          crimson: "#EF4444",
          emerald: "#10B981",
          steel: "#94A3B8",
          dark: "#0C0E14",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cabinet)", "var(--font-syne)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
