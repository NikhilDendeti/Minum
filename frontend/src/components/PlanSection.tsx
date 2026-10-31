import { useEffect, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { api } from "../lib/api";
import { distanceText, fmt, inr, shortDate, weekdayName } from "../lib/i18n";
import type { Lang, PlanExpansion, PlanStock } from "../types";
import { SummaryList } from "./ConfirmDialog";
import { Dialog, Disclosure, Icon, Notice, SimulatedTag, Skeleton, StatusLabel } from "./ui";

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
    <section aria-labelledby={id} className="card min-w-0 p-4 sm:p-6">
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
function ExpansionCard({ lang }: { lang: Lang }) {
  const { t } = useMunim();
  const { data, error } = useLoad<PlanExpansion>(() => api.planExpansion(lang), [lang]);
  // The request is a demo action: it lives here only and writes nothing to the server.
  const [requested, setRequested] = useState<Record<number, boolean>>({});
  const [asking, setAsking] = useState<number | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  if (data && !data.available) return null;
  const chosen = data?.top?.find((a) => a.rank === asking);
  const as = data?.assumptions;

  return (
    <CardShell id="plan-map-h" title={t.planMapTitle} sub={t.planRankNote}>
      {!data || !data.cells || !data.top || !data.grid ? (
        error ? <Notice tone="risk">{t.planLoadFailed}</Notice> : <Loading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start">
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
              <ol className="mt-3 space-y-4">
                {data.top.map((a) => (
                  <li key={a.rank} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white" aria-hidden>
                      {a.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="sr-only">{fmt(t.planRank, { n: a.rank })}. </span>
                        {fmt(t.planAreaLine, { distance: distanceText(a.distance_m, t), direction: a.direction })}
                      </p>
                      <p className="meta">{fmt(t.planAreaSpend, { amount: inr(a.spend), category: data.category_label ?? "", shops: a.shops })}</p>
                      {a.payback_months != null ? (
                        <p className="mt-1 text-[14px]">
                          {fmt(t.planEstimate, {
                            sales: inr(a.expected_monthly_sales ?? 0),
                            profit: inr(a.expected_monthly_profit ?? 0),
                            months: a.payback_months,
                            setup: inr(a.setup_cost ?? 0),
                          })}
                        </p>
                      ) : a.expected_monthly_sales != null ? (
                        <p className="mt-1 text-[14px] text-risk-fg">{fmt(t.planEstimateLoss, { sales: inr(a.expected_monthly_sales) })}</p>
                      ) : null}
                      {a.can_request ? (
                        requested[a.rank] ? (
                          <div className="mt-2">
                            <StatusLabel tone="ok">{t.planRequested}</StatusLabel>
                          </div>
                        ) : (
                          <button className="btn-secondary mt-2" onClick={() => setAsking(a.rank)}>
                            {t.planRequestCredit}
                          </button>
                        )
                      ) : (
                        <p className="mt-2 text-[14px] font-medium text-risk-fg">{t.planNotRecommended}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {as && (
                <div className="mt-4">
                  <button className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]" aria-expanded={howOpen} aria-controls="plan-how" onClick={() => setHowOpen((o) => !o)}>
                    <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${howOpen ? "rotate-180" : ""}`} />
                    {t.planHow}
                  </button>
                  <Disclosure open={howOpen} id="plan-how">
                    <ul className="space-y-1.5 rounded-ctl bg-canvas p-3 text-[14px]">
                      <li>{fmt(t.planHowSales, { factor: as.new_shop_factor })}</li>
                      <li>
                        {fmt(t.planHowRent, {
                          source: as.rent_source === "own" ? t.planRentOwn : t.planRentAssumed,
                          rent: inr(as.rent),
                          min: inr(as.min_rent ?? 5000),
                        })}
                      </li>
                      <li>{fmt(t.planHowProfit, { margin: Math.round(as.margin * 100) })}</li>
                      <li>{fmt(t.planHowSetup, { months: as.deposit_months, days: as.opening_stock_days, fitout: inr(as.fitout) })}</li>
                      <li>{t.planHowPayback}</li>
                      <li className="meta">{t.planHowNote}</li>
                    </ul>
                  </Disclosure>
                </div>
              )}
              <p className="meta mt-4">{data.note}</p>
            </div>
          </div>

          {chosen && (
            <Dialog
              title={t.planDlgTitle}
              onClose={() => setAsking(null)}
              footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button className="btn-secondary" onClick={() => setAsking(null)}>
                    {t.cancel}
                  </button>
                  <button
                    className="btn-primary"
                    data-autofocus
                    onClick={() => {
                      setRequested((r) => ({ ...r, [chosen.rank]: true }));
                      setAsking(null);
                    }}
                  >
                    {t.planDlgConfirm}
                  </button>
                </div>
              }
            >
              <SummaryList
                rows={[
                  { label: t.planDlgArea, value: fmt(t.planAreaLine, { distance: distanceText(chosen.distance_m, t), direction: chosen.direction }) },
                  { label: t.planDlgSetup, value: inr(chosen.setup_cost ?? 0) },
                  { label: t.planDlgPayback, value: fmt(t.planDlgMonths, { months: chosen.payback_months ?? 0 }) },
                ]}
              />
              <p className="meta mt-3">{t.planDlgNothing}</p>
              <div className="mt-2 flex items-start gap-2">
                <SimulatedTag />
                <p className="meta">{t.planDlgDemo}</p>
              </div>
            </Dialog>
          )}
        </>
      )}
    </CardShell>
  );
}
