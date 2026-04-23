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
        "neon-strong": "0 0 0 1px rgba(0,255,136,.5), 0 0 40px rgba(0,255,136,.15)",
        glass: "0 8px 32px rgba(0,0,0,.4)",
      },
      animation: {
        "fade-up": "fade-up 400ms ease-out both",
        "fade-in": "fade-in 500ms ease-out both",
        "slide-in": "slide-in 400ms ease-out both",
        pulsegrid: "pulsegrid 6s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulsegrid: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.8" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
