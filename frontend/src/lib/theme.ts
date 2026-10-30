// Colours that SVG and chart libraries need as literal values. They mirror the CSS variables in index.css.
export const CHART = {
  base: "#002868", // forecast without credit (navy, dashed)
  credit: "#0086b8", // hypothetical credit scenario (cyan, dotted; darkened so thin lines pass 3:1 on white)
  risk: "#9b2c2c",
  grid: "#dce5ee",
  axis: "#b7c3d1",
  text: "#566277",
  cursor: "#7f8ca1",
} as const;
