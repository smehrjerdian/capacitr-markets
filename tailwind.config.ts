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
        sage: "#D1D7C4",
        cream: "#F5F5DC",
        orange: "#FF4500",
        forest: "#002B1B",
        lime: "#A2FF00",
        beige: "#D6CFC1",
        "forest-light": "#1a4a35",
        "sage-dark": "#b8bfa8",
      },
      fontFamily: {
        grotesk: ["var(--font-space-grotesk)", "Arial", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        body: ["Arial", "sans-serif"],
      },
      boxShadow: {
        "brutal": "4px 4px 0px 0px #002B1B",
        "brutal-sm": "2px 2px 0px 0px #002B1B",
        "brutal-orange": "4px 4px 0px 0px #FF4500",
        "brutal-lime": "4px 4px 0px 0px #A2FF00",
      },
      borderRadius: {
        "sharp": "2px",
      },
    },
  },
  plugins: [],
};
export default config;
