import { useMunim } from "../hooks/useMunim";
import { inr } from "../lib/i18n";
import type { Briefing } from "../types";

export default function EarningsCard({ kpis }: { kpis: Briefing["kpis"] }) {
  const { t } = useMunim();
  const down = kpis.delta_pct < 0;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.yesterday}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-4xl font-bold text-navy">{inr(kpis.yesterday)}</p>
        <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${down ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
          {down ? "▼" : "▲"} {Math.abs(kpis.delta_pct).toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {t.vsBaseline}: {inr(kpis.baseline)}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {t.repeatShare}: {kpis.repeat_share_pct}%
      </p>
    </section>
  );
}
