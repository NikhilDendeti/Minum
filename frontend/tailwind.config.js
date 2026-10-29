/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paytm: "#00BAF2",
        navy: "#002E6E",
        surface: "#FBFCFE",
        ink: "#3D4A5C",
      },
      fontFamily: { sans: ["Inter", "DM Sans", "Noto Sans Telugu", "Noto Sans Devanagari", "system-ui", "sans-serif"] },
      keyframes: {
        ring: { "0%": { transform: "scale(1)", opacity: "0.6" }, "100%": { transform: "scale(1.9)", opacity: "0" } },
      },
      animation: { ring: "ring 1.1s ease-out infinite" },
    },
  },
  plugins: [],
};
