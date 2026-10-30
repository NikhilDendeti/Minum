/** @type {import('tailwindcss').Config} */
// Design tokens. The values live as CSS variables in src/index.css so there is one place to change them.
const v = (name) => `var(--${name})`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: v("navy"), soft: v("navy-soft") }, // the deck navy: sidebar, headings on light
        brand: { DEFAULT: v("brand"), on: v("on-brand"), hover: v("brand-hover"), tint: v("brand-tint") }, // the one primary action colour
        accent: { DEFAULT: v("accent"), ink: v("accent-ink") }, // the deck cyan
        canvas: v("canvas"),
        panel: v("panel"),
        surface: v("surface"),
        ink: v("ink"),
        muted: v("muted"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        ok: { fg: v("ok-fg"), bg: v("ok-bg"), line: v("ok-line") }, // done / success
        warn: { fg: v("warn-fg"), bg: v("warn-bg"), line: v("warn-line") }, // needs attention / waiting for you
        risk: { fg: v("risk-fg"), bg: v("risk-bg"), line: v("risk-line") }, // errors and cash risk
        fc: { fg: v("fc-fg"), bg: v("fc-bg"), line: v("fc-line") }, // forecast / hypothetical scenario
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Telugu", "Noto Sans Devanagari", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px", ctl: "10px" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        sheet: { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "none" } },
        rec: { "0%": { transform: "scale(1)", opacity: "0.45" }, "100%": { transform: "scale(1.6)", opacity: "0" } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        rise: "rise 180ms ease-out both",
        fade: "fade 150ms ease-out both",
        sheet: "sheet 200ms ease-out both",
        rec: "rec 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
