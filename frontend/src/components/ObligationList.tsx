import { useMunim } from "../hooks/useMunim";
import { inr, shortDate } from "../lib/i18n";
import type { Forecast } from "../types";

export default function ObligationList({ obligations }: { obligations: Forecast["obligations"] }) {
  const { t } = useMunim();
  if (!obligations.length) return null;
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.obligations}</h3>
      <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
        {obligations.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            <span className="text-xs text-slate-500">
              {t.due} {shortDate(o.due_on)}
            </span>
            <span className="font-semibold text-navy">{inr(o.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
