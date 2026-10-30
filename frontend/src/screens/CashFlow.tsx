import { useId, useState } from "react";
import ForecastChart from "../components/ForecastChart";
import { CreditDialog } from "../components/OfferDialogs";
import { Disclosure, EmptyState, Icon, Notice, PageHeading, SimulatedTag, Skeleton, StatusLabel } from "../components/ui";
import { useMunim } from "../hooks/useMunim";
import { fmt, inr, shortDate, timeOfDay } from "../lib/i18n";
import { firstBelowZero, lowest, scenarioDays } from "../lib/scenario";

type Scenario = "base" | "credit";

function Segmented({ value, onChange, options, label }: { value: Scenario; onChange: (v: Scenario) => void; options: { id: Scenario; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-ctl border border-line-strong p-0.5 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-[44px] flex-1 rounded-[8px] px-3 text-[14px] font-medium transition-colors duration-150 sm:flex-none ${
            value === o.id ? "bg-brand text-white" : "text-ink hover:bg-canvas"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function CashFlow() {
  const { forecast, forecastState, offers, stale, syncedAt, lang, offline, retry, t } = useMunim();
  const [scenario, setScenario] = useState<Scenario>("base");
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [assumptions, setAssumptions] = useState(false);
  const assumptionsId = useId();

  if (!forecast) {
    return forecastState === "error" ? (
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
      <div className="space-y-5" role="status" aria-label={t.loading}>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const offer = forecast.offer ? offers[forecast.offer.id] ?? forecast.offer : null;
  const amount = offer ? Number(offer.payload.amount) : null;
  const approved = offer?.status === "approved";
  const declined = offer?.status === "rejected";
  const proposed = offer?.status === "proposed";
  const days = scenarioDays(forecast, amount);
  const key: Scenario = approved ? "credit" : scenario === "credit" && proposed ? "credit" : "base";
  const showCredit = key === "credit";
  const low = lowest(days, key);
  const first = firstBelowZero(days, key);
  const creditLow = lowest(days, "credit");
  const creditHolds = !!amount && !firstBelowZero(days, "credit");
  const driver = forecast.obligations.length ? forecast.obligations.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;
  const stamp = syncedAt.forecast ? timeOfDay(syncedAt.forecast, lang) : null;

  // plain-language headline for the chosen scenario
  const headline = first
    ? fmt(showCredit ? t.cashShortEvenWithCredit : t.cashMayRunShort, { date: shortDate(first.date, lang) })
    : showCredit
      ? t.cashOkWithCredit
      : t.noGap;
  const detail = first
    ? fmt(t.lowestLine, { amount: inr(low!.balance), date: shortDate(low!.date, lang) }) +
      (driver && !showCredit ? " " + fmt(t.mainReason, { label: driver.label, amount: inr(driver.amount), due: shortDate(driver.due_on, lang) }) : "")
    : low
      ? fmt(t.lowestAboveZero, { amount: inr(low.balance), date: shortDate(low.date, lang) })
      : "";
  const summary = `${headline} ${detail} ${t.forecastNotGuarantee}`;

  return (
    <div className="space-y-5">
      <PageHeading title={t.cashTitle} sub={fmt(t.cashSub, { date: shortDate(forecast.as_of, lang) })} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <section aria-labelledby="fc-h" className="card order-1 p-4 sm:p-6">
            {stale("forecast") && (
              <div className="mb-4">
                <Notice tone="warn" live title={t.staleForecastTitle}>
                  {stamp ? fmt(t.staleForecastBody, { time: stamp }) : t.staleForecastNoTime}
                </Notice>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="fc-h" className="section-title">
                {t.next14}
              </h2>
              <StatusLabel tone="forecast">{showCredit && !approved ? t.hypothetical : t.forecast}</StatusLabel>
            </div>

            <p className={`mt-3 text-[20px] font-semibold leading-snug sm:text-[22px] ${first ? "text-navy" : "text-ok-fg"}`}>{headline}</p>
            <p className="mt-1 text-[15px]">{detail}</p>
            {approved && <p className="meta mt-1">{t.scenarioApprovedNote}</p>}
            {showCredit && !approved && <p className="meta mt-1">{t.scenarioHypotheticalNote}</p>}

            {proposed && (
              <div className="mt-4">
                <Segmented
                  label={t.scenarioLabel}
                  value={scenario}
                  onChange={setScenario}
                  options={[
                    { id: "base", label: t.withoutCredit },
                    { id: "credit", label: fmt(t.withCredit, { amount: inr(amount!) }) },
                  ]}
                />
              </div>
            )}

            <div className="mt-5">
              {forecast.days.length ? <ForecastChart days={days} showCredit={showCredit} creditAccepted={approved} summary={summary} /> : <EmptyState title={t.noForecastData}>{t.noForecastBody}</EmptyState>}
            </div>

            <p className="meta mt-3">{t.forecastNotGuarantee}</p>
            <button className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]" aria-expanded={assumptions} aria-controls={assumptionsId} onClick={() => setAssumptions((o) => !o)}>
              <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${assumptions ? "rotate-180" : ""}`} />
              {t.howForecastWorks}
            </button>
            <Disclosure open={assumptions} id={assumptionsId}>
              <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink">
                <li>{t.assumeSales}</li>
                <li>{t.assumeCosts}</li>
                <li>{t.assumePayments}</li>
                <li>{t.assumeCredit}</li>
              </ul>
            </Disclosure>
          </section>

          <section aria-labelledby="ob-h" className="order-3 space-y-2">
            <h2 id="ob-h" className="section-title">
              {t.obligations}
            </h2>
            {forecast.obligations.length === 0 ? (
              <p className="card p-4 text-muted">{t.noObligations}</p>
            ) : (
              <ul className="card divide-y divide-line">
                {forecast.obligations.map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block break-words">{o.label}</span>
                      <span className="meta">{fmt(t.dueOn, { date: shortDate(o.due_on, lang) })}</span>
                    </span>
                    <span className="num shrink-0 font-semibold">{inr(o.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-labelledby="offer-h" className="card order-2 p-4 sm:p-5 lg:sticky lg:top-6">
          <h2 id="offer-h" className="section-title">
            {t.creditOffer}
          </h2>
          {!offer ? (
            <p className="mt-2 text-[15px] text-muted">{t.noOffer}</p>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {proposed && <StatusLabel tone="warn">{t.awaitingDecision}</StatusLabel>}
                {approved && (
                  <>
                    <StatusLabel tone="ok">{t.statusApproved}</StatusLabel>
                    <SimulatedTag />
                  </>
                )}
                {declined && <StatusLabel tone="neutral">{t.statusDeclined}</StatusLabel>}
              </div>
              <div>
                <p className="num text-[32px] font-semibold leading-none text-navy">{inr(amount!)}</p>
                <p className="meta mt-1">{fmt(t.creditFor, { n: Number(offer.payload.tenure_days) })}</p>
              </div>
              {offer.payload.gap_date ? <p className="text-[14px]">{fmt(t.creditWhy, { date: shortDate(String(offer.payload.gap_date), lang) })}</p> : null}
              {creditHolds && creditLow && !declined && (
                <p className="text-[14px]">{fmt(t.creditEffect, { amount: inr(creditLow.balance), date: shortDate(creditLow.date, lang) })}</p>
              )}
              <dl className="divide-y divide-line rounded-ctl border border-line text-[14px]">
                <div className="px-3 py-2">
                  <dt className="meta">{t.howAmountSet}</dt>
                  <dd lang="en">{String(offer.payload.basis ?? "")}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="meta">{t.interestFees}</dt>
                  <dd className="text-muted">{t.notProvided}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="meta">{t.repayment}</dt>
                  <dd className="text-muted">{t.notProvided}</dd>
                </div>
              </dl>
              {proposed ? (
                <>
                  <p className="meta">{t.decisionIsYours}</p>
                  <div className="flex flex-col gap-2">
                    <button className="btn-primary w-full" onClick={() => setDialog("approve")} disabled={offline || stale("forecast")}>
                      {t.reviewAccept}
                    </button>
                    <button className="btn-secondary w-full" onClick={() => setDialog("reject")} disabled={offline || stale("forecast")}>
                      {t.notNow}
                    </button>
                  </div>
                  {(offline || stale("forecast")) && <p className="meta">{t.actionOffline}</p>}
                </>
              ) : approved ? (
                <p className="meta">{t.creditSimNote}</p>
              ) : (
                <p className="meta">{t.creditDeclinedNote}</p>
              )}
            </div>
          )}
        </aside>
      </div>

      {dialog && offer && <CreditDialog offer={offer} decision={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
