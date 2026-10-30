export type Lang = string; // a code from the server's language registry: "en-IN", "hi-IN", "te-IN", ...
export type Tab = "home" | "ask" | "cash" | "grow";

export interface LanguageOption {
  code: Lang;
  name: string;
  native: string;
}

export interface Me {
  id: number;
  name: string;
  category: string;
  city: string;
  language: Lang;
  phone: string;
  languages: LanguageOption[];
}

export interface DemoAccount {
  phone: string;
  name: string;
  city: string;
  language: Lang;
}

export interface Offer {
  id: number;
  type: "credit" | "promo" | "stock";
  status: "proposed" | "approved" | "rejected" | "sent";
  // credit: amount, tenure_days, basis, text_local   promo: discount_pct, valid_days, text_local, text_en, reach
  payload: Record<string, any>;
  decided_at?: string | null;
  decided_via?: string | null;
}

export interface Alert {
  type: "settlement_short" | "cash_gap";
  offer_id: number | null;
  text_local: string;
}

export interface Briefing {
  date: string;
  language: Lang;
  text_local: string;
  text_en: string;
  audio_url: string | null;
  kpis: {
    yesterday: number;
    baseline: number;
    delta_pct: number;
    slow_window: string;
    repeat_share_pct: number;
    lapsed_regulars: number;
  };
  alerts: Alert[];
}

export interface Evidence {
  sql: string;
  rows: Record<string, unknown>[];
  tool: string | null;
}

export interface AskResponse {
  conversation_id: number;
  transcript: string;
  language: Lang;
  intent: string;
  agent: string;
  answer_local: string;
  answer_en: string;
  audio_url: string | null;
  evidence: Evidence;
  proposal: Offer | null;
  latency_ms: { stt: number; agent: number; tts: number };
}

export interface Turn {
  id: string;
  transcript: string;
  input: Blob | string; // kept so a failed question can be retried
  pending: boolean;
  error?: string;
  response?: AskResponse;
}

export interface ForecastDay {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface ForecastGap {
  first_negative_date: string;
  min_balance: number;
  shortfall: number;
  driver: { label: string; amount: number; due_on: string } | null;
}

export interface Forecast {
  as_of: string;
  days: ForecastDay[];
  gap: ForecastGap | null; // with any approved credit applied
  base_gap: ForecastGap | null; // without credit: what the obligations cause on their own
  obligations: { id: number; label: string; amount: number; due_on: string }[];
  credit_applied: number;
  offer: Offer | null;
}

export interface Growth {
  segment: { name: string; rule: string; count: number; avg_monthly_spend: number };
  offer: Offer | null;
  stock: Offer | null; // restock reminder: timing only, the data has no item or stock levels
}

export interface DecideResponse {
  id: number;
  status: Offer["status"];
  decided_at: string;
  decided_via: string | null;
  confirmation_local: string;
  confirmation_en: string;
  audio_url: string | null;
  simulated: boolean;
  transcript: string;
}

export interface Suggestion {
  id: string;
  text: string;
}
