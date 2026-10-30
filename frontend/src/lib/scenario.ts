import type { Forecast } from "../types";

export interface ScenarioDay {
  date: string;
  /** Projected balance with no credit taken. */
  base: number;
  /** The same projection with the credit offer added; null when there is no offer to compare. */
  credit: number | null;
  /** The day the credit lands: the day before the first shortfall. Earlier days of the two lines are the same. */
  creditFrom: string | null;
}

export interface Lowest {
  date: string;
  balance: number;
}

/**
 * Both lines come from the one forecast the server computed. The server adds an approved credit on day 1 and every later
 * balance is a running total, so "without credit" is the shown balance minus what was applied. "With credit" is that
 * baseline plus the offer amount, but only from the day the money would land (the day before the first shortfall, or the
 * first day if there is none); before that the two lines are the same, because nothing has been disbursed yet.
 */
export function scenarioDays(f: Forecast, offerAmount: number | null): ScenarioDay[] {
  const base = f.days.map((d) => d.balance - f.credit_applied);
  const firstShort = base.findIndex((v) => v < 0);
  const from = Math.max(0, firstShort - 1);
  const creditFrom = offerAmount ? f.days[from]?.date ?? null : null;
  return f.days.map((d, i) => ({
    date: d.date,
    base: base[i],
    credit: offerAmount ? base[i] + (i >= from ? offerAmount : 0) : null,
    creditFrom,
  }));
}

export function lowest(days: ScenarioDay[], key: "base" | "credit"): Lowest | null {
  let low: Lowest | null = null;
  for (const d of days) {
    const v = d[key];
    if (v === null) return null;
    if (!low || v < low.balance) low = { date: d.date, balance: v };
  }
  return low;
}

export function firstBelowZero(days: ScenarioDay[], key: "base" | "credit"): ScenarioDay | null {
  return days.find((d) => (d[key] ?? 0) < 0) ?? null;
}
