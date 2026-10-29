import { useMunim } from "../hooks/useMunim";
import { inr } from "../lib/i18n";
import type { Growth } from "../types";

export default function SegmentCard({ segment }: { segment: Growth["segment"] }) {
  const { t } = useMunim();
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.segment}</p>
      <p className="mt-1 text-4xl font-bold text-navy">
        {segment.count} <span className="text-base font-medium text-slate-500">{t.customers}</span>
      </p>
      <p className="mt-1 text-sm text-ink">{t.ruleText}</p>
      <p className="mt-1 text-xs text-slate-500">
        {t.avgSpend}: ~{inr(segment.avg_monthly_spend)}
      </p>
    </section>
  );
}
