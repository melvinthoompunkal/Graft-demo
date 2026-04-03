/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "primary-fixed-dim": "#00e479",
        "surface-dim": "#131313",
        "surface-container": "#201f1f",
        "outline-variant": "#3b4b3d",
        "primary-container": "#00ff88",
        "on-background": "#e5e2e1",
        "surface-container-low": "#1c1b1b",
        background: "#131313",
        "on-surface": "#e5e2e1",
        "surface-bright": "#3a3939",
        "on-surface-variant": "#b9cbb9",
        "secondary-container": "#027038",
        outline: "#849585",
        secondary: "#7eda96",
        "surface-variant": "#353534",
        surface: "#131313",
        "on-primary-fixed-variant": "#005228",
        "surface-container-highest": "#353534",
        "surface-container-high": "#2a2a2a",
        "surface-container-lowest": "#0e0e0e",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,255,136,.28), 0 0 24px rgba(0,255,136,.09)",
      },
      animation: {
        "fade-up": "fade-up 360ms ease-out both",
        pulsegrid: "pulsegrid 6s linear infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulsegrid: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};
