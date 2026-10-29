import { useMunim } from "../hooks/useMunim";
import type { LanguageOption } from "../types";

// Offered before login too, so the list is built in; after login the server's list (user.languages) wins.
const FALLBACK: LanguageOption[] = [
  { code: "en-IN", name: "English", native: "English" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
];

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLanguage, user, t } = useMunim();
  const options = user?.languages ?? FALLBACK;
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="sr-only">{t.language}</span>
      <select
        value={lang}
        onChange={(e) => void setLanguage(e.target.value)}
        aria-label={t.language}
        className={`rounded-md border px-2 py-1 text-xs outline-none ${
          dark ? "border-white/30 bg-navy text-white" : "border-slate-300 bg-white text-ink"
        }`}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.native}
          </option>
        ))}
      </select>
    </label>
  );
}
