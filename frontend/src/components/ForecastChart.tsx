import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMunim } from "../hooks/useMunim";
import { inr, inrCompact, shortDate } from "../lib/i18n";
import type { ScenarioDay } from "../lib/scenario";
import { Disclosure, Icon } from "./ui";

const BASE = "#173f35"; // forecast without credit
const CREDIT = "#1b7f8c"; // hypothetical credit scenario
const RISK = "#9b2c2c";

function Swatch({ dash, color }: { dash: string; color: string }) {
  return (
    <svg width="28" height="10" aria-hidden className="shrink-0">
      <line x1="1" y1="5" x2="27" y2="5" stroke={color} strokeWidth="3" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

/**
 * 14-day projected balance. Every line here is a forecast (the API returns no actuals series), so each is dashed and
 * labelled; the zero line and the first day below zero are marked in words as well as colour.
 */
export default function ForecastChart({
  days,
  showCredit,
  creditAccepted,
  summary,
}: {
  days: ScenarioDay[];
  showCredit: boolean;
  creditAccepted: boolean;
  summary: string;
}) {
  const { t, lang } = useMunim();
  const [table, setTable] = useState(false);
  const data = days.map((d) => ({ ...d, label: shortDate(d.date, lang) }));
  const below = data.filter((d) => d.base < 0);
  const gap = below[0];
  const lowBase = below.length ? below.reduce((a, b) => (b.base < a.base ? b : a)) : null;

  return (
    <figure className="m-0">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink">
        <li className="flex items-center gap-2">
          <Swatch dash="7 5" color={BASE} />
          {t.legendBase}
        </li>
        {showCredit && (
          <li className="flex items-center gap-2">
            <Swatch dash="1 6" color={CREDIT} />
            {creditAccepted ? t.legendCreditApproved : t.legendCredit}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Swatch dash="0" color={RISK} />
          {t.legendZero}
        </li>
      </ul>

      <div className="h-[260px] w-full sm:h-[320px]" role="img" aria-label={summary}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#e3e8e2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5f6963" }} tickLine={false} axisLine={{ stroke: "#c9d1ca" }} minTickGap={18} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 12, fill: "#5f6963" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => inrCompact(v)}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "#8a958e", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-ctl border border-line bg-surface p-3 text-[13px] shadow-md">
                    <p className="mb-1 font-semibold text-ink">{String(label)}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="num flex items-center justify-between gap-4" style={{ color: p.dataKey === "credit" ? CREDIT : BASE }}>
                        <span>{p.dataKey === "credit" ? t.tipCredit : t.tipBase}</span>
                        <span className="font-semibold">{inr(Number(p.value))}</span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {gap && lowBase && <ReferenceArea x1={gap.label} x2={data[data.length - 1].label} fill={RISK} fillOpacity={0.06} ifOverflow="extendDomain" />}
            <ReferenceLine y={0} stroke={RISK} strokeWidth={1.5} ifOverflow="extendDomain" />
            <Line type="monotone" dataKey="base" stroke={BASE} strokeWidth={2.5} strokeDasharray="7 5" dot={false} activeDot={{ r: 5 }} animationDuration={250} />
            {showCredit && (
              <Line type="monotone" dataKey="credit" stroke={CREDIT} strokeWidth={3} strokeDasharray="1 6" strokeLinecap="round" dot={false} activeDot={{ r: 5 }} animationDuration={250} />
            )}
            {gap && (
              <ReferenceLine
                x={gap.label}
                stroke={RISK}
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
                label={{ value: `${t.shortfallOn} ${gap.label}`, position: "insideTopRight", fill: RISK, fontSize: 12, fontWeight: 600 }}
              />
            )}
            {gap && <ReferenceDot x={gap.label} y={gap.base} r={6} fill={RISK} stroke="#fff" strokeWidth={2} ifOverflow="extendDomain" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-2">
        <button className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]" aria-expanded={table} onClick={() => setTable((o) => !o)}>
          <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${table ? "rotate-180" : ""}`} />
          {table ? t.hideTable : t.viewTable}
        </button>
        <Disclosure open={table}>
          <div className="overflow-x-auto rounded-ctl border border-line" tabIndex={0} role="region" aria-label={t.viewTable}>
            <table className="w-full border-collapse text-[14px]">
              <thead className="bg-canvas">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    {t.date}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {t.tipBase}
                  </th>
                  {showCredit && (
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {t.tipCredit}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.date} className="border-t border-line">
                    <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">
                      {d.label}
                    </th>
                    <td className={`num px-3 py-1.5 text-right ${d.base < 0 ? "font-semibold text-risk-fg" : ""}`}>
                      {inr(d.base)}
                      {d.base < 0 && <span className="ml-1 text-[12px]">({t.belowZero})</span>}
                    </td>
                    {showCredit && d.credit !== null && (
                      <td className={`num px-3 py-1.5 text-right ${d.credit < 0 ? "font-semibold text-risk-fg" : ""}`}>
                        {inr(d.credit)}
                        {d.credit < 0 && <span className="ml-1 text-[12px]">({t.belowZero})</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      </figcaption>
    </figure>
  );
}
