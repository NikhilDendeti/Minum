import type { AskResponse, Briefing, DecideResponse, DemoAccount, Forecast, Growth, Lang, Me, Suggestion } from "../types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public messageLocal?: string,
    public status = 0,
  ) {
    super(message);
  }
}

export const UNAUTHENTICATED_EVENT = "munim:unauthenticated";

const csrfToken = () => document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (method !== "GET") headers.set("X-CSRFToken", csrfToken());
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError("network", "Cannot reach the Munim server.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    const error = new ApiError(e?.code ?? "server_error", e?.message ?? res.statusText, e?.message_local, res.status);
    if (res.status === 401 && !path.startsWith("/api/auth/")) window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
    throw error;
  }
  return body as T;
}

const post = (body?: BodyInit | object) =>
  body instanceof FormData
    ? ({ method: "POST", body } as RequestInit)
    : ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) } as RequestInit);

export const api = {
  // --- auth ---
  demoAccounts: () => request<DemoAccount[]>("/api/auth/demo-accounts"),
  requestOtp: (phone: string) => request<{ sent: boolean; dev_otp?: string }>("/api/auth/request-otp", post({ phone })),
  verify: (phone: string, otp: string) => request<Me>("/api/auth/verify", post({ phone, otp })),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", post()),
  me: () => request<Me>("/api/me"),
  setLanguage: (language: Lang) =>
    request<Me>("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }) }),
  // --- app ---
  briefing: (lang?: Lang) => request<Briefing>(`/api/briefing${lang ? `?language=${lang}` : ""}`),
  ask: (form: FormData) => request<AskResponse>("/api/ask", post(form)),
  forecast: () => request<Forecast>("/api/forecast"),
  growth: () => request<Growth>("/api/growth"),
  decide: (id: number, decision: "approve" | "reject", via: "tap" | "voice") =>
    request<DecideResponse>(`/api/offers/${id}/decide`, post({ decision, via })),
  decideByVoice: (id: number, audio: Blob) => {
    const form = new FormData();
    form.append("audio", audio, "decision.webm");
    form.append("via", "voice");
    return request<DecideResponse>(`/api/offers/${id}/decide`, post(form));
  },
  suggestions: (lang: Lang) => request<Suggestion[]>(`/api/suggestions?language=${lang}`),
  reset: () => request<{ seeded: boolean; seconds: number }>("/api/reset", post()),
};
