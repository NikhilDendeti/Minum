import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr, shortDate } from "../lib/i18n";
import type { Forecast } from "../types";

/** 14-day projected balance: zero line, red where it dips below zero, gap days shaded. */
export default function BalanceChart({ forecast }: { forecast: Forecast }) {
  const data = forecast.days.map((d) => ({
    label: shortDate(d.date),
    date: d.date,
    balance: d.balance,
    positive: Math.max(d.balance, 0),
    negative: Math.min(d.balance, 0),
  }));
  const negatives = data.filter((d) => d.balance < 0);
  const first = negatives[0]?.label;
  const last = negatives[negatives.length - 1]?.label;

  return (
    <div className="h-52 w-full" role="img" aria-label="14 day cash balance forecast">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v: number) => inr(v)} labelFormatter={(l) => String(l)} />
          {first && <ReferenceArea x1={first} x2={last} fill="#ef4444" fillOpacity={0.1} />}
          <ReferenceLine y={0} stroke="#002E6E" strokeWidth={1.5} />
          <Area type="monotone" dataKey="positive" stroke="#00BAF2" fill="#00BAF2" fillOpacity={0.25} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} strokeWidth={2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
