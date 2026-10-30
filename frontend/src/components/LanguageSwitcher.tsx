import { useMunim } from "../hooks/useMunim";
import type { LanguageOption } from "../types";

// Offered before login too, so the list is built in; after login the server's list (user.languages) wins.
const FALLBACK: LanguageOption[] = [
  { code: "en-IN", name: "English", native: "English" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
];

/** "segmented" is always visible (sidebar, login); "select" is the compact phone version with a native picker. */
export default function LanguageSwitcher({ variant = "segmented", onDark = false }: { variant?: "segmented" | "select"; onDark?: boolean }) {
  const { lang, setLanguage, user, asking, t } = useMunim();
  const options = user?.languages ?? FALLBACK;

  if (variant === "select") {
    return (
      <label className="relative flex items-center">
        <span className="sr-only">{t.language}</span>
        <select
          value={lang}
          disabled={asking}
          onChange={(e) => void setLanguage(e.target.value)}
          className="min-h-[44px] appearance-none rounded-ctl border border-line-strong bg-surface py-2 pl-3 pr-8 text-[14px] font-medium text-ink"
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.native}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2 h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
    );
  }

  return (
    <div role="radiogroup" aria-label={t.language} className={`flex rounded-ctl border p-0.5 ${onDark ? "border-white/25" : "border-line-strong"}`}>
      {options.map((o) => {
        const active = o.code === lang;
        return (
          <button
            key={o.code}
            role="radio"
            aria-checked={active}
            disabled={asking}
            title={asking ? t.langBusy : undefined}
            onClick={() => void setLanguage(o.code)}
            className={`min-h-[36px] flex-1 rounded-[8px] px-2 text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed ${
              active ? (onDark ? "bg-white text-navy" : "bg-brand text-white") : onDark ? "text-white/85 hover:bg-white/10" : "text-ink hover:bg-canvas"
            }`}
          >
            {o.native}
          </button>
        );
      })}
    </div>
  );
}
