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
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        navy: "var(--navy)",
        gold: "var(--gold)",
        "gold-dark": "var(--gold-dark)",
        cta: "var(--cta)",
        "cta-hover": "var(--cta-hover)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Newsreader", "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)",
        subtle: "0 1px 3px rgba(15, 23, 42, 0.06)",
        card: "0 4px 16px rgba(15, 23, 42, 0.05)",
      },
      borderRadius: {
        panel: "14px",
        card: "14px",
        field: "10px",
      },
      maxWidth: {
        page: "1200px",
        setup: "1040px",
      },
    },
  },
  plugins: [],
};
export default config;
