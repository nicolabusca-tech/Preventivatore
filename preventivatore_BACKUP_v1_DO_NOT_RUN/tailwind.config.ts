import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          orange: "#FF6A00",
          "orange-dark": "#E55F00",
          "orange-light": "#FF8530",
          black: "#1A1A1A",
          dark: "#212121",
          charcoal: "#2B2B2B",
          muted: "#706E65",
          beige: "#FAF8F4",
          "beige-warm": "#F5F1E8",
          border: "#E5DFD0",
          green: "#2D7A4F",
          red: "#C73E3A",
          amber: "#B07800",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
