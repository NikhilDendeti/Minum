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

/** Fills {name} placeholders: fmt(t.dueOn, { date: "19 Nov" }). */
export const fmt = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));

/** Indian digit grouping (1,00,000) with the sign in front of the rupee symbol. */
export const inr = (n: number) => {
  const rounded = Math.round(n);
  return (rounded < 0 ? "\u2212" : "") + "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(rounded));
};

/** Compact amounts for chart axes: ₹45k, ₹1.2L. */
export const inrCompact = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "\u2212" : "";
  if (a >= 100000) return `${sign}₹${+(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${sign}₹${+(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(a)}`;
};

// Dates arrive as ISO "YYYY-MM-DD" meaning a calendar day; build them at local noon so no timezone shifts the day.
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);
const dtf = (lang: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang, opts);

export const shortDate = (iso: string, lang = DEFAULT_LANG) => dtf(lang, { day: "numeric", month: "short" }).format(day(iso));
export const longDate = (iso: string, lang = DEFAULT_LANG) =>
  dtf(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(day(iso));
export const weekdayName = (iso: string, lang = DEFAULT_LANG) => dtf(lang, { weekday: "long" }).format(day(iso));
export const addDays = (iso: string, n: number) => {
  const d = day(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const timeOfDay = (ms: number, lang = DEFAULT_LANG) => dtf(lang, { hour: "numeric", minute: "2-digit" }).format(new Date(ms));

export const greetingKey = (hour = new Date().getHours()): "greetMorning" | "greetAfternoon" | "greetEvening" =>
  hour < 12 ? "greetMorning" : hour < 17 ? "greetAfternoon" : "greetEvening";

/** The credit offer's "how the amount is set" line, worded in the UI language. `basis` is the English fallback. */
export const creditBasis = (payload: Record<string, any>, t: Strings) => {
  const parsed = /^(\d+) x .*Rs ([\d,]+)\)?$/.exec(String(payload.basis ?? "")); // offers made before the numbers were stored
  const multiple = Number(payload.multiple ?? parsed?.[1]);
  const daily = Number(payload.avg_daily_net ?? parsed?.[2]?.replace(/,/g, ""));
  return multiple && daily ? fmt(t.creditBasis, { n: multiple, amount: inr(daily) }) : String(payload.basis ?? "");
};

/** Obligation names come from the data in English ("Shop rent", "Supplier payment - Sri Balaji Traders"); the generic part is translated. */
export const obligationLabel = (label: string, t: Strings) => {
  if (label === "Shop rent") return t.obShopRent;
  if (label === "Electricity bill") return t.obElectricity;
  const supplier = /^Supplier payment - (.+)$/.exec(label);
  return supplier ? fmt(t.obSupplier, { name: supplier[1] }) : label;
};
