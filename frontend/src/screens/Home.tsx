import AskBox, { Suggestions } from "../components/AskBox";
import BriefingPlayer from "../components/BriefingPlayer";
import Soundbox from "../components/Soundbox";
import { EmptyState, Icon, PageHeading, SimulatedTag, Skeleton, StatusLabel } from "../components/ui";
import { useMunim } from "../hooks/useMunim";
import { addDays, fmt, greetingKey, inr, longDate, shortDate, timeOfDay, weekdayName } from "../lib/i18n";

function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72" />
      <Skeleton className="h-24" />
    </div>
  );
}

export default function Home() {
  const { briefing, briefingState, forecast, growth, offers, stale, syncedAt, user, lang, setTab, ask, asking, offline, retry, t } = useMunim();

  if (!briefing) {
    return briefingState === "error" ? (
      <EmptyState
        title={t.loadFailedTitle}
        action={
          <button className="btn-primary" onClick={() => void retry()}>
            {t.retry}
          </button>
        }
      >
        {offline ? t.errorOffline : t.errorGeneric}
      </EmptyState>
    ) : (
      <Loading />
    );
  }

  const k = briefing.kpis;
  const diff = Math.round(k.yesterday - k.baseline);
  const dir = Math.abs(k.delta_pct) < 0.5 ? "flat" : k.delta_pct < 0 ? "down" : "up";
  const yesterdayIso = addDays(briefing.date, -1);
  const weekday = weekdayName(yesterdayIso, lang);
  const compare = fmt(dir === "down" ? t.compareDown : dir === "up" ? t.compareUp : t.compareFlat, {
    amount: inr(Math.abs(diff)),
    pct: Math.abs(Math.round(k.delta_pct)),
    weekday,
    baseline: inr(k.baseline),
  });

  // the shortfall the obligations cause by themselves: an approved credit hides it from forecast.gap, never from here
  const gap = forecast ? forecast.base_gap ?? forecast.gap : null;
  const settlement = briefing.alerts.find((a) => a.type === "settlement_short");
  const credit = forecast?.offer ? offers[forecast.offer.id] ?? forecast.offer : null;
  const creditOffer = credit && credit.status === "proposed" ? credit : null;
  const creditApproved = credit && credit.status === "approved" ? credit : null;
  const promo = growth?.offer ? offers[growth.offer.id] ?? growth.offer : null;
  const promoSent = promo && (promo.status === "sent" || promo.status === "approved") ? promo : null;

  return (
    <div className="space-y-5">
      <PageHeading
        title={t[greetingKey()]}
        sub={
          <>
            {user?.name} · {user?.city}
            <br />
            {longDate(briefing.date, lang)}
          </>
        }
        aside={<StatusLabel tone="neutral" icon="flask">{t.demoData}</StatusLabel>}
      />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* yesterday + spoken briefing */}
          <section aria-labelledby="sales-h" className="card order-1 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="sales-h" className="text-[15px] font-medium text-muted">
                  {t.yesterdaySales}
                </h2>
                <p className="meta">{shortDate(yesterdayIso, lang)} · {weekday}</p>
              </div>
              {stale("briefing") && (
                <StatusLabel tone="warn">
                  {syncedAt.briefing ? fmt(t.lastUpdated, { time: timeOfDay(syncedAt.briefing, lang) }) : t.notRefreshed}
                </StatusLabel>
              )}
            </div>
            <p className="num mt-2 text-[34px] font-semibold leading-none tracking-tight text-navy sm:text-[40px]">{inr(k.yesterday)}</p>
            <p className="mt-3 flex items-start gap-2 text-[15px]">
              <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-semibold ${dir === "down" ? "border-warn-line bg-warn-bg text-warn-fg" : dir === "up" ? "border-ok-line bg-ok-bg text-ok-fg" : "border-line bg-canvas text-muted"}`}>
                <span aria-hidden>{dir === "down" ? "▼" : dir === "up" ? "▲" : "●"}</span>
                <span className="num">{Math.abs(Math.round(k.delta_pct))}%</span>
              </span>
              <span>{compare}</span>
            </p>
            <p className="meta mt-1">{t.salesDefinition}</p>
            {k.repeat_share_pct > 0 && <p className="meta mt-1">{fmt(t.repeatShareLine, { pct: k.repeat_share_pct })}</p>}

            <div className="mt-5 border-t border-line pt-5">
              <BriefingPlayer briefing={briefing} />
            </div>
          </section>

          <div className="order-3 space-y-4">
            <AskBox />
            <Suggestions limit={3} />
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* the one thing that needs attention */}
          <section aria-labelledby="attn-h" className="order-2 space-y-3">
            <h2 id="attn-h" className="section-title">
              {t.needsAttention}
            </h2>
            {gap ? (
              creditApproved ? (
                <div className="card border-l-4 border-l-ok-fg p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusLabel tone="ok">{t.statusApproved}</StatusLabel>
                    <SimulatedTag />
                  </div>
                  <p className="mt-2 text-[17px] font-semibold leading-snug text-navy">
                    {fmt(t.cashCoveredByCredit, { date: shortDate(gap.first_negative_date, lang), amount: inr(Number(creditApproved.payload.amount)) })}
                  </p>
                  <p className="meta mt-2">
                    {fmt(t.forecastAsOf, { date: shortDate(forecast!.as_of, lang) })}
                    {stale("forecast") && ` · ${t.mayBeOutOfDate}`}
                  </p>
                  <button className="btn-secondary mt-3 w-full sm:w-auto" onClick={() => setTab("cash")}>
                    {t.seeForecast}
                  </button>
                </div>
              ) : (
              <div className="card border-l-4 border-l-warn-fg p-4">
                <StatusLabel tone="forecast">{t.forecast}</StatusLabel>
                <p className="mt-2 text-[17px] font-semibold leading-snug text-navy">{fmt(t.cashMayRunShort, { date: shortDate(gap.first_negative_date, lang) })}</p>
                <p className="mt-1.5 text-[14px]">
                  {gap.driver
                    ? fmt(t.cashWhy, { shortfall: inr(gap.shortfall), label: gap.driver.label, amount: inr(gap.driver.amount), due: shortDate(gap.driver.due_on, lang) })
                    : fmt(t.cashWhyNoDriver, { shortfall: inr(gap.shortfall) })}
                </p>
                {creditOffer && <p className="mt-1.5 text-[14px]">{fmt(t.creditAvailable, { amount: inr(Number(creditOffer.payload.amount)) })}</p>}
                <p className="meta mt-2">
                  {fmt(t.forecastAsOf, { date: shortDate(forecast!.as_of, lang) })}
                  {stale("forecast") && ` · ${t.mayBeOutOfDate}`}
                </p>
                <button className="btn-primary mt-3 w-full sm:w-auto" onClick={() => setTab("cash")}>
                  {t.seeForecast}
                </button>
              </div>
              )
            ) : forecast ? (
              <div className="card p-4">
                <StatusLabel tone="ok">{t.allClear}</StatusLabel>
                <p className="mt-2 text-[15px]">{t.noGap}</p>
                <p className="meta mt-1">{fmt(t.forecastAsOf, { date: shortDate(forecast.as_of, lang) })}</p>
              </div>
            ) : (
              <Skeleton className="h-32" />
            )}
            {settlement && (
              <div className="card p-4">
                <StatusLabel tone="warn" icon="info">
                  {t.settlement}
                </StatusLabel>
                <p className="mt-2 text-[14px]">{settlement.text_local}</p>
                <button className="btn-secondary mt-3" onClick={() => void ask(t.settlementQ)} disabled={asking || offline}>
                  {t.askWhy}
                </button>
              </div>
            )}
          </section>

          {k.lapsed_regulars > 0 && (
            <section aria-labelledby="grow-h" className="card order-4 p-4">
              <h2 id="grow-h" className="section-title">
                {t.growthInsightTitle}
              </h2>
              {promoSent ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusLabel tone="ok">{t.statusSent}</StatusLabel>
                  </div>
                  <p className="mt-2 text-[14px]">{fmt(t.growthSentBody, { n: Number(promoSent.payload.reach ?? k.lapsed_regulars) })}</p>
                </>
              ) : (
                <>
                  <p className="num mt-2 text-[28px] font-semibold leading-none text-navy">{k.lapsed_regulars}</p>
                  <p className="mt-1 text-[14px]">{t.growthInsightBody}</p>
                </>
              )}
              <button className="btn-secondary mt-3 w-full sm:w-auto" onClick={() => setTab("grow")}>
                {promoSent ? t.view : t.reviewOffer}
                <Icon name="chevron" className="h-4 w-4 -rotate-90" />
              </button>
            </section>
          )}
          <div className="order-5">
            <Soundbox briefing={briefing} />
          </div>
        </div>
      </div>
    </div>
  );
}
