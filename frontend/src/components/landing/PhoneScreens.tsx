import type { ReactNode } from "react";
import { useMunim } from "../../hooks/useMunim";
import { fmt, inr, shortDate, weekdayName } from "../../lib/i18n";
import { DEMO } from "../../lib/landingData";
import { Icon } from "../ui";
import ForecastDraw from "./ForecastDraw";

/** A phone-shaped frame for the product screens. Purely illustrative, so it is hidden from assistive tech. */
export function Phone({ children, className = "", tall = false }: { children: ReactNode; className?: string; tall?: boolean }) {
  return (
    <div aria-hidden className={`mx-auto w-[286px] rounded-[36px] border-[9px] border-forest bg-canvas shadow-xl ${className}`}>
      <div className={`relative overflow-hidden rounded-[27px] bg-canvas ${tall ? "h-[540px]" : "min-h-[360px]"}`}>
        <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-line" />
        <div className="relative h-full px-3.5 pb-4 pt-7 text-[13px] leading-snug">{children}</div>
      </div>
    </div>
  );
}

function MiniCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[10px] border border-line bg-surface p-3 ${className}`}>{children}</div>;
}

export function HomeMini() {
  const { t, lang } = useMunim();
  const k = DEMO.kpis;
  const wd = weekdayName("2026-11-11", lang);
  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-forest">{t.greetEvening}</p>
      <MiniCard>
        <p className="text-muted">{t.yesterdaySales}</p>
        <p className="num mt-1 text-[28px] font-semibold leading-none text-forest">{inr(k.yesterday)}</p>
        <p className="mt-2 text-[12px]">
          <span className="mr-1 rounded-full border border-warn-line bg-warn-bg px-1.5 py-0.5 font-semibold text-warn-fg">▼ {Math.abs(k.delta_pct)}%</span>
          {fmt(t.compareDown, { amount: inr(k.baseline - k.yesterday), pct: Math.abs(k.delta_pct), weekday: wd, baseline: inr(k.baseline) })}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-brand px-3 py-2 font-semibold text-white">
          <Icon name="play" className="h-3.5 w-3.5" />
          {t.hearBriefing}
        </p>
      </MiniCard>
      <MiniCard className="border-l-4 border-l-warn-fg">
        <p className="font-semibold text-forest">{fmt(t.cashMayRunShort, { date: shortDate(DEMO.forecast.gap.date, lang) })}</p>
        <p className="mt-1 text-[12px]">{fmt(t.creditAvailable, { amount: inr(DEMO.forecast.offer.amount) })}</p>
      </MiniCard>
    </div>
  );
}

export function AskMini() {
  const { t, lang } = useMunim();
  const a = DEMO.ask[lang as keyof typeof DEMO.ask] ?? DEMO.ask["en-IN"];
  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-forest">{t.askTitle}</p>
      <div>
        <p className="text-muted">{t.youAsked}</p>
        <p className="font-medium">{a.q}</p>
      </div>
      <MiniCard>
        <p className="text-[14px] font-medium leading-relaxed">{a.a}</p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-[8px] border border-line-strong px-2.5 py-1.5 text-[12px] font-semibold">
          <Icon name="play" className="h-3 w-3" />
          {t.listen}
        </p>
        <p className="mt-3 border-t border-line pt-2 text-muted">{fmt(t.evidenceMany, { n: DEMO.evidence.rows.length })}</p>
        <p className="font-medium text-brand">{t.viewEvidence}</p>
      </MiniCard>
    </div>
  );
}

export function CashMini({ play }: { play: boolean }) {
  const { t, lang } = useMunim();
  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-forest">{t.cashTitle}</p>
      <MiniCard>
        <p className="font-semibold text-forest">{fmt(t.cashMayRunShort, { date: shortDate(DEMO.forecast.gap.date, lang) })}</p>
        <div className="-mx-1 mt-2">
          <ForecastDraw play={play} compact />
        </div>
        <p className="text-muted">{t.forecastNotGuarantee}</p>
      </MiniCard>
      <MiniCard>
        <p className="text-muted">{t.creditOffer}</p>
        <p className="num text-[22px] font-semibold text-forest">{inr(DEMO.forecast.offer.amount)}</p>
      </MiniCard>
    </div>
  );
}

export function GrowMini() {
  const { t, lang } = useMunim();
  const promo = DEMO.promo[lang as keyof typeof DEMO.promo] ?? DEMO.promo["en-IN"];
  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-forest">{t.growTitle}</p>
      <MiniCard>
        <p className="text-muted">{t.segment}</p>
        <p className="num text-[30px] font-semibold leading-none text-forest">{DEMO.growth.count}</p>
      </MiniCard>
      <MiniCard>
        <p className="mb-1 text-muted">{t.previewTitle}</p>
        <p className="rounded-[8px] border border-line bg-canvas p-2 text-[12.5px]">{promo}</p>
        <p className="mt-3 rounded-[8px] bg-brand px-3 py-2 text-center font-semibold text-white">{t.approveSend}</p>
      </MiniCard>
    </div>
  );
}
