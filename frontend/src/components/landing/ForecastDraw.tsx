import { useId } from "react";
import { useMunim } from "../../hooks/useMunim";
import { inrCompact, shortDate } from "../../lib/i18n";
import { DEMO } from "../../lib/landingData";

const W = 600;
const H = 280;
const L = 52;
const R = 14;
const T = 18;
const B = 30;
const MIN = -20000;
const MAX = 65000;
const BASE = "#173f35";
const CREDIT = "#1b7f8c";
const RISK = "#9b2c2c";

/**
 * The real 14-day demo forecast, drawn left to right when `play` turns true: the baseline first, then the zero line and
 * the shortfall marker, then the credit scenario. Values are the captured demo data; with reduced motion all of it is
 * simply visible. Decorative detail is aria-hidden; the caption around it carries the meaning.
 */
export default function ForecastDraw({ play, compact = false }: { play: boolean; compact?: boolean }) {
  const { lang, t } = useMunim();
  const uid = useId().replace(/:/g, "");
  const days = DEMO.forecast.days;
  const n = days.length;
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - (v - MIN) / (MAX - MIN)) * (H - T - B);
  const amount = DEMO.forecast.offer.amount;
  const base = days.map((d, i) => `${x(i)},${y(d.balance)}`).join(" ");
  const credit = days.map((d, i) => `${x(i)},${y(d.balance + amount)}`).join(" ");
  const gapIdx = days.findIndex((d) => d.date === DEMO.forecast.gap.date);
  const ticks = [0, 30000, 60000];
  const labelIdx = [0, gapIdx, n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full ${play ? "is-in" : ""}`} style={{ height: "auto" }} aria-hidden focusable="false">
      <defs>
        <clipPath id={`${uid}-a`}>
          <rect className="fc-reveal" style={{ ["--fc-delay" as string]: "0s" }} x="0" y="0" width={W} height={H} />
        </clipPath>
        <clipPath id={`${uid}-b`}>
          <rect className="fc-reveal" style={{ ["--fc-delay" as string]: "2.1s" }} x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>

      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e3e8e2" />
          {v !== 0 && (
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={compact ? 13 : 12} fill="#5f6963">
              {inrCompact(v)}
            </text>
          )}
        </g>
      ))}
      <rect x={x(gapIdx)} y={T} width={W - R - x(gapIdx)} height={H - T - B} fill={RISK} fillOpacity="0.06" className="fc-fade" style={{ ["--fc-delay" as string]: "1.2s" }} />
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke={RISK} strokeWidth="1.6" className="fc-fade" style={{ ["--fc-delay" as string]: "0.9s" }} />
      <text x={L - 8} y={y(0) + 4} textAnchor="end" fontSize={compact ? 13 : 12} fill={RISK} fontWeight="600">
        ₹0
      </text>

      <polyline points={base} fill="none" stroke={BASE} strokeWidth="2.6" strokeDasharray="7 5" strokeLinejoin="round" clipPath={`url(#${uid}-a)`} />
      <polyline points={credit} fill="none" stroke={CREDIT} strokeWidth="3.2" strokeDasharray="1 6" strokeLinecap="round" clipPath={`url(#${uid}-b)`} />

      <line x1={x(gapIdx)} x2={x(gapIdx)} y1={T} y2={H - B} stroke={RISK} strokeDasharray="2 3" className="fc-fade" style={{ ["--fc-delay" as string]: "1.3s" }} />
      <text x={x(gapIdx) + 6} y={T + 12} fontSize={compact ? 13 : 12} fontWeight="600" fill={RISK} className="fc-fade" style={{ ["--fc-delay" as string]: "1.4s" }}>
        {t.shortfallOn} {shortDate(DEMO.forecast.gap.date, lang)}
      </text>
      <circle cx={x(gapIdx)} cy={y(days[gapIdx].balance)} r="6.5" fill={RISK} stroke="#fff" strokeWidth="2" className="fc-pop" style={{ ["--fc-delay" as string]: "1.5s" }} />

      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={compact ? 13 : 12} fill="#5f6963">
          {shortDate(days[i].date, lang)}
        </text>
      ))}
    </svg>
  );
}
