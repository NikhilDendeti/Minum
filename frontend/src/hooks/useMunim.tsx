import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, UNAUTHENTICATED_EVENT, api } from "../lib/api";
import * as audio from "../lib/audio";
import { DEFAULT_LANG, stringsFor, type Strings } from "../lib/i18n";
import type { AskResponse, Briefing, DecideResponse, DemoAccount, Forecast, Growth, Lang, Me, Offer, Suggestion, Tab, Turn } from "../types";

type Load = "loading" | "ready" | "error";
type Auth = "checking" | "anon" | "authed";

interface Munim {
  // auth
  authState: Auth;
  user: Me | null;
  demoAccounts: DemoAccount[];
  requestOtp: (phone: string) => Promise<string | undefined>;
  login: (phone: string, otp: string) => Promise<void>;
  loginDemo: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  // language
  lang: Lang;
  t: Strings;
  setLanguage: (lang: Lang) => Promise<void>;
  // app
  tab: Tab;
  setTab: (tab: Tab) => void;
  briefing: Briefing | null;
  briefingState: Load;
  thread: Turn[];
  asking: boolean;
  forecast: Forecast | null;
  forecastState: Load;
  growth: Growth | null;
  growthState: Load;
  offers: Record<number, Offer>;
  audioState: "idle" | "playing";
  suggestions: Suggestion[];
  toast: string | null;
  error: string | null;
  ask: (input: Blob | string) => Promise<void>;
  decide: (offerId: number, decision: "approve" | "reject", via: "tap" | "voice", voice?: Blob) => Promise<DecideResponse>;
  playBriefing: (withChime?: boolean) => Promise<void>;
  loadForecast: () => Promise<void>;
  loadGrowth: () => Promise<void>;
  showToast: (text: string) => void;
  reset: () => Promise<void>;
}

const Ctx = createContext<Munim | null>(null);

export function useMunim() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMunim must be used inside <MunimProvider>");
  return ctx;
}

const LANG_KEY = "munim_lang";
const savedLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
  } catch {
    /* storage can be unavailable */
  }
  const nav = navigator.language?.slice(0, 2);
  return nav === "hi" ? "hi-IN" : nav === "te" ? "te-IN" : DEFAULT_LANG;
};

export function MunimProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Auth>("checking");
  const [user, setUser] = useState<Me | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loginLang, setLoginLang] = useState<Lang>(savedLang);
  const [tab, setTab] = useState<Tab>("home");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingState, setBriefingState] = useState<Load>("loading");
  const [thread, setThread] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastState, setForecastState] = useState<Load>("loading");
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [growthState, setGrowthState] = useState<Load>("loading");
  const [offers, setOffers] = useState<Record<number, Offer>>({});
  const [audioState, setAudioState] = useState<"idle" | "playing">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const authed = authState === "authed" && user !== null;
  const lang: Lang = user?.language ?? loginLang;
  const t = stringsFor(lang);

  useEffect(() => audio.subscribe((playing) => setAudioState(playing ? "playing" : "idle")), []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      const text = e instanceof ApiError ? e.messageLocal ?? e.message : stringsFor(lang).errorGeneric;
      setError(text);
      showToast(text);
    },
    [lang, showToast],
  );

  const clearSession = useCallback(() => {
    audio.stop();
    setUser(null);
    setBriefing(null);
    setThread([]);
    setOffers({});
    setForecast(null);
    setGrowth(null);
    setSuggestions([]);
    setBriefingState("loading");
    setForecastState("loading");
    setGrowthState("loading");
    setTab("home");
  }, []);

  // --- auth -----------------------------------------------------------------------------------------------------
  useEffect(() => {
    api
      .me()
      .then((me) => {
        setUser(me);
        setAuthState("authed");
      })
      .catch(() => {
        setAuthState("anon");
        api.demoAccounts().then(setDemoAccounts).catch(() => undefined);
      });
  }, []);

  useEffect(() => {
    const onLoggedOut = () => {
      clearSession();
      setAuthState("anon");
      api.demoAccounts().then(setDemoAccounts).catch(() => undefined);
    };
    window.addEventListener(UNAUTHENTICATED_EVENT, onLoggedOut);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onLoggedOut);
  }, [clearSession]);

  const requestOtp = useCallback(async (phone: string) => (await api.requestOtp(phone)).dev_otp, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const me = await api.verify(phone, otp);
    setUser(me);
    setAuthState("authed");
  }, []);

  const loginDemo = useCallback(
    async (phone: string) => {
      const code = await requestOtp(phone);
      if (!code) throw new ApiError("invalid_otp", "Demo codes are not enabled.");
      await login(phone, code);
    },
    [login, requestOtp],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearSession();
      setAuthState("anon");
      api.demoAccounts().then(setDemoAccounts).catch(() => undefined);
    }
  }, [clearSession]);

  // --- data -----------------------------------------------------------------------------------------------------
  const upsert = useCallback((offer: Offer | null | undefined) => {
    if (offer) setOffers((prev) => ({ ...prev, [offer.id]: offer }));
  }, []);

  const loadBriefing = useCallback(async () => {
    setBriefingState("loading");
    try {
      setBriefing(await api.briefing());
      setBriefingState("ready");
    } catch (e) {
      setBriefingState("error");
      fail(e);
    }
  }, [fail]);

  const loadForecast = useCallback(async () => {
    try {
      const f = await api.forecast();
      setForecast(f);
      upsert(f.offer);
      setForecastState("ready");
    } catch (e) {
      setForecastState((s) => (s === "ready" ? s : "error"));
      fail(e);
    }
  }, [fail, upsert]);

  const loadGrowth = useCallback(async () => {
    try {
      const g = await api.growth();
      setGrowth(g);
      upsert(g.offer);
      setGrowthState("ready");
    } catch (e) {
      setGrowthState((s) => (s === "ready" ? s : "error"));
      fail(e);
    }
  }, [fail, upsert]);

  const userId = user?.id;
  useEffect(() => {
    if (authed) void loadBriefing();
  }, [authed, userId, loadBriefing]);

  useEffect(() => {
    if (authed) api.suggestions(lang).then(setSuggestions).catch(() => undefined);
  }, [authed, userId, lang]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "cash") void loadForecast();
    if (tab === "grow") void loadGrowth();
    if (tab === "home") void api.briefing().then(setBriefing).catch(() => undefined); // keeps alerts fresh
  }, [authed, tab, loadForecast, loadGrowth]);

  // --- language -------------------------------------------------------------------------------------------------
  const setLanguage = useCallback(
    async (next: Lang) => {
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {
        /* storage can be unavailable */
      }
      setLoginLang(next);
      if (!authed) return;
      try {
        const me = await api.setLanguage(next);
        setUser(me);
        audio.stop();
        // offers and the briefing are worded per language: refetch what is on screen
        setOffers({});
        await Promise.all([loadBriefing(), forecast ? loadForecast() : undefined, growth ? loadGrowth() : undefined]);
      } catch (e) {
        fail(e);
      }
    },
    [authed, fail, forecast, growth, loadBriefing, loadForecast, loadGrowth],
  );

  // --- ask / decide ---------------------------------------------------------------------------------------------
  const ask = useCallback(
    async (input: Blob | string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setThread((prev) => [...prev, { id, transcript: typeof input === "string" ? input : "…", pending: true }]);
      setAsking(true);
      const form = new FormData();
      if (typeof input === "string") form.append("text", input);
      else form.append("audio", input, "speech.webm");
      let res: AskResponse | undefined;
      try {
        try {
          res = await api.ask(form);
        } catch (e) {
          if (!(e instanceof ApiError && e.code === "network")) throw e;
          res = await api.ask(form); // one retry on a dropped connection only
        }
        setThread((prev) => prev.map((x) => (x.id === id ? { ...x, transcript: res!.transcript, pending: false, response: res } : x)));
        upsert(res.proposal);
        if (res.intent === "approval") void Promise.all([loadForecast(), loadGrowth()]);
        if (res.audio_url) void audio.playUrl(res.audio_url);
      } catch (e) {
        const text = e instanceof ApiError ? e.messageLocal ?? e.message : stringsFor(lang).errorGeneric;
        setThread((prev) => prev.map((x) => (x.id === id ? { ...x, pending: false, error: text } : x)));
        fail(e);
      } finally {
        setAsking(false);
      }
    },
    [fail, lang, loadForecast, loadGrowth, upsert],
  );

  const decide = useCallback(
    async (offerId: number, decision: "approve" | "reject", via: "tap" | "voice", voice?: Blob) => {
      try {
        const res = voice ? await api.decideByVoice(offerId, voice) : await api.decide(offerId, decision, via);
        setOffers((prev) => (prev[offerId] ? { ...prev, [offerId]: { ...prev[offerId], status: res.status, decided_via: res.decided_via } } : prev));
        if (res.audio_url) void audio.playUrl(res.audio_url);
        const type = offers[offerId]?.type;
        if (type === "credit") await loadForecast();
        else if (type === "promo") await loadGrowth();
        else await Promise.all([loadForecast(), loadGrowth()]);
        return res;
      } catch (e) {
        fail(e);
        throw e;
      }
    },
    [fail, loadForecast, loadGrowth, offers],
  );

  const playBriefing = useCallback(
    async (withChime = false) => {
      if (!briefing) return;
      if (withChime) await audio.playChime();
      if (briefing.audio_url) await audio.playUrl(briefing.audio_url);
    },
    [briefing],
  );

  const reset = useCallback(async () => {
    try {
      await api.reset();
      audio.stop();
      setUser(await api.me()); // the reset restores each merchant's seeded language
      setThread([]);
      setOffers({});
      setForecast(null);
      setGrowth(null);
      await loadBriefing();
      setTab("home");
    } catch (e) {
      fail(e);
    }
  }, [fail, loadBriefing]);

  const value = useMemo<Munim>(
    () => ({
      authState, user, demoAccounts, requestOtp, login, loginDemo, logout, lang, t, setLanguage,
      tab, setTab, briefing, briefingState, thread, asking, forecast, forecastState, growth, growthState,
      offers, audioState, suggestions, toast, error, ask, decide, playBriefing, loadForecast, loadGrowth, showToast, reset,
    }),
    [authState, user, demoAccounts, requestOtp, login, loginDemo, logout, lang, t, setLanguage, tab, briefing, briefingState,
      thread, asking, forecast, forecastState, growth, growthState, offers, audioState, suggestions, toast, error, ask, decide,
      playBriefing, loadForecast, loadGrowth, showToast, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
