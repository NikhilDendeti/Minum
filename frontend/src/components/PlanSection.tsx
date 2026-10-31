import { useEffect, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { api } from "../lib/api";
import { fmt, inr, shortDate, weekdayName } from "../lib/i18n";
import type { Lang, PlanExpansion, PlanStock } from "../types";
import { Notice, SimulatedTag, Skeleton } from "./ui";

/**
 * Two planning cards under the Grow screen: what to stock for the next 3 days, and where a second shop could do well.
 * Both come from read-only endpoints that are off unless the server turns them on, so this renders nothing otherwise.
 * Every figure is labelled simulated: the product list, festival uplift and spend map are assumptions.
 */
export default function PlanSection() {
  const { lang } = useMunim();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    api
      .planStatus()
      .then((r) => live && setEnabled(r.enabled))
      .catch(() => live && setEnabled(false));
    return () => {
      live = false;
    };
  }, []);
  if (!enabled) return null;
  return (
    <div className="space-y-5">
      <StockPlanCard lang={lang} />
      <ExpansionCard lang={lang} />
    </div>
  );
}

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    let live = true;
    setState((s) => ({ data: s.data, error: false }));
    load()
      .then((data) => live && setState({ data, error: false }))
      .catch(() => live && setState((s) => ({ data: s.data, error: true })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function CardShell({ id, title, sub, children }: { id: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        <SimulatedTag />
      </div>
      <p className="meta mt-1">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Loading() {
  const { t } = useMunim();
  return (
    <div role="status" aria-label={t.planLoading}>
      <Skeleton className="h-40" />
    </div>
  );
}

// --- stock for the next 3 days ------------------------------------------------------------------------------------
function StockPlanCard({ lang }: { lang: Lang }) {
  const { t } = useMunim();
  const [category, setCategory] = useState<string | null>(null);
  const { data, error } = useLoad<PlanStock>(() => api.planStock(lang, category), [lang, category]);

  return (
    <CardShell id="plan-stock-h" title={t.planStockTitle} sub={t.planStockSub}>
      {!data ? (
        error ? <Notice tone="risk">{t.planLoadFailed}</Notice> : <Loading />
      ) : (
        <>
          <label className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-medium">{t.planShopType}</span>
            <select
              className="min-h-[44px] rounded-ctl border border-line-strong bg-surface px-3 text-[15px]"
              value={data.category ?? category ?? ""}
              onChange={(e) => setCategory(e.target.value)}
            >
              {data.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {!data.available || !data.days || !data.items ? (
            <div className="mt-4">
              <Notice tone="info">{t.planUnavailable}</Notice>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[460px] border-collapse text-[14px]">
                  <caption className="sr-only">{t.planStockTitle}</caption>
                  <thead>
                    <tr className="border-b border-line text-left align-bottom">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {t.planItem}
                      </th>
                      {data.days.map((d) => (
                        <th key={d.date} scope="col" className="px-2 py-2 text-right font-medium">
                          <div>{weekdayName(d.date, lang)}</div>
                          <div className="meta font-normal">{shortDate(d.date, lang)}</div>
                          <div className="meta font-normal">{fmt(t.planVsUsual, { pct: (d.vs_typical_pct > 0 ? "+" : "") + d.vs_typical_pct })}</div>
                          {d.events.map((e) => (
                            <div key={e.id} className="mt-0.5 text-[12px] font-medium text-warn-fg">
                              {e.name}
                            </div>
                          ))}
                        </th>
                      ))}
                      <th scope="col" className="py-2 pl-2 text-right font-medium">
                        {t.planTotal}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it) => (
                      <tr key={it.sku} className="border-b border-line last:border-0">
                        <th scope="row" className="py-2 pr-3 text-left font-normal">
                          {it.name} <span className="meta">({it.unit_label})</span>
                        </th>
                        {it.per_day.map((n, i) => {
                          const why = it.reasons.find((r) => r.day === i);
                          return (
                            <td key={i} className="num px-2 py-2 text-right">
                              {why ? (
                                <span className="font-semibold text-warn-fg" title={fmt(t.planBoostTip, { event: why.event, pct: why.pct })}>
                                  {n} <span aria-label={fmt(t.planBoostTip, { event: why.event, pct: why.pct })}>↑</span>
                                </span>
                              ) : (
                                n
                              )}
                            </td>
                          );
                        })}
                        <td className="num py-2 pl-2 text-right font-semibold">{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="meta mt-2">{t.planBoostLegend}</p>
              {data.upcoming && data.upcoming.length > 0 && (
                <ul className="mt-3 space-y-1 text-[14px]">
                  {data.upcoming.map((u) => (
                    <li key={u.id}>{fmt(t.planUpcoming, { event: u.name, date: shortDate(u.date, lang), days: u.days_away, items: u.items.join(", ") })}</li>
                  ))}
                </ul>
              )}
              <p className="meta mt-3">
                {t.planAssumption} {data.note}
              </p>
            </>
          )}
        </>
      )}
    </CardShell>
  );
}

// --- where a second shop could do well ---------------------------------------------------------------------------
const distance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

function ExpansionCard({ lang }: { lang: Lang }) {
  const { t } = useMunim();
  const { data, error } = useLoad<PlanExpansion>(() => api.planExpansion(lang), [lang]);
  const title = t.planMapTitle;

  if (data && !data.available) return null;
  return (
    <CardShell id="plan-map-h" title={title} sub={data ? fmt(t.planMapSub, { category: data.category_label ?? "" }) : ""}>
      {!data || !data.cells || !data.top || !data.grid ? (
        error ? <Notice tone="risk">{t.planLoadFailed}</Notice> : <Loading />
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start">
          <div
            role="img"
            aria-label={t.planMapAlt}
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${data.grid}, minmax(0, 1fr))` }}
          >
            {(() => {
              const max = Math.max(...data.cells.filter((c) => !c.you).map((c) => c.score), 1);
              return data.cells.map((c) => (
                <div
                  key={`${c.row}-${c.col}`}
                  className={`flex aspect-square items-center justify-center rounded text-[12px] font-semibold ${c.you ? "border-2 border-navy bg-surface text-navy" : "text-navy"}`}
                  style={c.you ? undefined : { backgroundColor: `color-mix(in srgb, var(--brand) ${Math.round(8 + 55 * (c.score / max))}%, transparent)` }}
                >
                  {c.you ? t.planYou : c.rank > 0 ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white">{c.rank}</span> : null}
                </div>
              ));
            })()}
          </div>

          <div>
            <p className="meta">{fmt(t.planYourSales, { amount: inr(data.monthly_sales ?? 0) })}</p>
            <ol className="mt-3 space-y-3">
              {data.top.map((a) => (
                <li key={a.rank} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white" aria-hidden>
                    {a.rank}
                  </span>
                  <div>
                    <p className="font-medium">
                      <span className="sr-only">{fmt(t.planRank, { n: a.rank })}. </span>
                      {fmt(t.planAreaLine, { distance: distance(a.distance_m), direction: a.direction })}
                    </p>
                    <p className="meta">{fmt(t.planAreaSpend, { amount: inr(a.spend), category: data.category_label ?? "", shops: a.shops })}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="meta mt-4">{data.note}</p>
          </div>
        </div>
      )}
    </CardShell>
  );
}
