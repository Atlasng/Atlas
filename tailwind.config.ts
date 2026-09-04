import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ice: "#F3F7FC",
        paper: "#FFFFFF",
        navy: "#0B1E3D",
        "navy-soft": "#4A5C78",
        blue: "#1E56C6",
        "blue-light": "#4F86E8",
        "blue-dark": "#123B8F",
        line: "#DCE6F5",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-plex)", "sans-serif"],
      },
      maxWidth: {
        content: "1400px",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
