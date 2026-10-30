import type { Forecast } from "../types";

export interface ScenarioDay {
  date: string;
  /** Projected balance with no credit taken. */
  base: number;
  /** The same projection with the credit offer added; null when there is no offer to compare. */
  credit: number | null;
}

export interface Lowest {
  date: string;
  balance: number;
}

/**
 * Both lines come from the one forecast the server computed. The server adds an approved credit on day 1 and every later
 * balance is a running total, so "without credit" is the shown balance minus what was applied, and "with credit" is that
 * same baseline plus the offer amount. Nothing else is assumed.
 */
export function scenarioDays(f: Forecast, offerAmount: number | null): ScenarioDay[] {
  return f.days.map((d) => {
    const base = d.balance - f.credit_applied;
    return { date: d.date, base, credit: offerAmount ? base + offerAmount : null };
  });
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
