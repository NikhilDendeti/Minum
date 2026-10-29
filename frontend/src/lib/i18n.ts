import en from "../locales/en-IN.json";

// Every language is one JSON file in src/locales (the server's list in /api/me decides which are offered).
// English is the source and the fallback for any missing key. Telugu and Hindi wording should be reviewed
// by a native speaker before the pitch. Developer labels (SQL panel header) stay English.
const files = import.meta.glob<Record<string, string>>("../locales/*.json", { eager: true, import: "default" });

export type Strings = typeof en;
export const DEFAULT_LANG = "en-IN";

const catalogs: Record<string, Strings> = {};
for (const [path, strings] of Object.entries(files)) {
  const code = path.split("/").pop()!.replace(".json", "");
  catalogs[code] = { ...en, ...(strings as Partial<Strings>) };
}

export const stringsFor = (lang: string): Strings => catalogs[lang] ?? catalogs[DEFAULT_LANG];

export const inr = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
