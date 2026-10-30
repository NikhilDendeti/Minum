import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, REACHABLE_EVENT, UNAUTHENTICATED_EVENT, api } from "../lib/api";
import * as audio from "../lib/audio";
import { DEFAULT_LANG, stringsFor, type Strings } from "../lib/i18n";
import type { AskResponse, Briefing, DecideResponse, DemoAccount, Forecast, Growth, Lang, Me, Offer, Suggestion, Tab, Turn } from "../types";

type Load = "loading" | "ready" | "error";
type Auth = "checking" | "anon" | "authed";
type Resource = "briefing" | "forecast" | "growth";

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
  // connection: "offline" means the browser is offline or the last request could not reach the server
  offline: boolean;
  syncedAt: Partial<Record<Resource, number>>; // when each data set was last loaded successfully (ms)
  stale: (r: Resource) => boolean; // shown data is older than the last attempt to refresh it
  retry: () => Promise<void>;
  // app
  tab: Tab;
  setTab: (tab: Tab) => void;
  briefing: Briefing | null;
  briefingState: Load;
  thread: Turn[];
  asking: boolean;
  unsent: string | null; // a typed question that got no answer; the ask box takes it back (see AskBox)
  takeUnsent: () => void;
  forecast: Forecast | null;
  forecastState: Load;
  growth: Growth | null;
  growthState: Load;
  offers: Record<number, Offer>;
  suggestions: Suggestion[];
  toast: string | null;
  ask: (input: Blob | string) => Promise<boolean>; // true when an answer came back
  retryTurn: (id: string) => Promise<void>;
  decide: (
    offerId: number,
    decision: "approve" | "reject",
    via: "tap" | "voice",
    opts?: { voice?: Blob; message?: string },
  ) => Promise<DecideResponse>;
  showToast: (text: string, ms?: number) => void;
  reset: () => Promise<void>;
}

const Ctx = createContext<Munim | null>(null);

export function useMunim() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMunim must be used inside <MunimProvider>");
  return ctx;
}

const TABS: Tab[] = ["home", "ask", "cash", "grow"];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace(/^#\/?/, "") as Tab;
  return TABS.includes(h) ? h : "home";
};

// One store decides the language everywhere: localStorage. The sidebar radio, the phone select and every screen read the
// same value; the server's copy (which words the briefing and offers) is brought in line with it, never the other way round
// except at sign-in, where the merchant's own language is adopted.
const LANG_KEY = "munim_lang";
const storedLang = (): Lang | null => {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null; // storage can be unavailable
  }
};
const storeLang = (code: Lang) => {
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    /* storage can be unavailable */
  }
};
const initialLang = (): Lang => {
  const stored = storedLang();
  if (stored) return stored;
  const nav = navigator.language?.slice(0, 2);
  return nav === "hi" ? "hi-IN" : nav === "te" ? "te-IN" : DEFAULT_LANG;
};

export function MunimProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Auth>("checking");
  const [user, setUser] = useState<Me | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [lang, setLangState] = useState<Lang>(initialLang);
  const langRef = useRef(lang);
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingState, setBriefingState] = useState<Load>("loading");
  const [thread, setThread] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [unsent, setUnsent] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastState, setForecastState] = useState<Load>("loading");
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [growthState, setGrowthState] = useState<Load>("loading");
  const [offers, setOffers] = useState<Record<number, Offer>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [reachable, setReachable] = useState(true);
  const [syncedAt, setSyncedAt] = useState<Partial<Record<Resource, number>>>({});
  const [failed, setFailed] = useState<Record<Resource, boolean>>({ briefing: false, forecast: false, growth: false });
  const toastTimer = useRef<number>();
  const askingRef = useRef(false);

  const authed = authState === "authed" && user !== null;
  const t = stringsFor(lang);
  const adoptLang = useCallback((code: Lang) => {
    langRef.current = code;
    storeLang(code);
    setLangState(code);
  }, []);
  /** Make the server's copy of the language match the one the screen shows. */
  const syncServerLang = useCallback(async (me: Me): Promise<Me> => {
    const want = langRef.current;
    if (me.language === want || !me.languages.some((l) => l.code === want)) return me;
    try {
      return await api.setLanguage(want);
    } catch {
      return me;
    }
  }, []);
  const offline = !browserOnline || !reachable;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // --- connection -----------------------------------------------------------------------------------------------
  useEffect(() => {
    const on = () => (setBrowserOnline(true), setReachable(true)); // optimistic: the next request settles it again
    const off = () => setBrowserOnline(false);
    const reach = (e: Event) => setReachable((e as CustomEvent<boolean>).detail);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(REACHABLE_EVENT, reach);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(REACHABLE_EVENT, reach);
    };
  }, []);

  // --- navigation: the hash keeps the browser's back button and reloads on the same screen ----------------------
  const setTab = useCallback((next: Tab) => {
    if (window.location.hash !== `#/${next}`) window.location.hash = `/${next}`;
    setTabState(next);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const showToast = useCallback((text: string, ms = 5000) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const errorText = useCallback(
    (e: unknown) =>
      e instanceof ApiError
        ? e.code === "network"
          ? stringsFor(lang).errorOffline
          : e.code === "timeout"
            ? stringsFor(lang).errorTimeout
            : e.messageLocal ?? e.message
        : stringsFor(lang).errorGeneric,
    [lang],
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
    setSyncedAt({});
    setFailed({ briefing: false, forecast: false, growth: false });
    setBriefingState("loading");
    setForecastState("loading");
    setGrowthState("loading");
    setTab("home");
  }, [setTab]);

  // --- auth -----------------------------------------------------------------------------------------------------
  useEffect(() => {
    api
      .me()
      .then(async (me) => {
        const synced = storedLang() ? await syncServerLang(me) : me; // a saved choice wins; a first visit takes the merchant's language
        adoptLang(synced.language);
        setUser(synced);
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
    adoptLang(me.language); // signing in as a merchant shows that merchant's own language
    setUser(me);
    setAuthState("authed");
  }, [adoptLang]);

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

  const mark = useCallback((r: Resource, ok: boolean) => {
    setFailed((f) => (f[r] === !ok ? f : { ...f, [r]: !ok }));
    if (ok) setSyncedAt((s) => ({ ...s, [r]: Date.now() }));
  }, []);

  // Each loader keeps the data already on screen when a refresh fails (it is then marked stale, never silently current).
  const loadBriefing = useCallback(async () => {
    try {
      setBriefing(await api.briefing());
      setBriefingState("ready");
      mark("briefing", true);
    } catch (e) {
      setBriefingState((s) => (s === "ready" ? s : "error"));
      mark("briefing", false);
      if (!(e instanceof ApiError && e.code === "network")) showToast(errorText(e));
    }
  }, [errorText, mark, showToast]);

  const loadForecast = useCallback(async () => {
    try {
      const f = await api.forecast();
      setForecast(f);
      upsert(f.offer);
      setForecastState("ready");
      mark("forecast", true);
    } catch (e) {
      setForecastState((s) => (s === "ready" ? s : "error"));
      mark("forecast", false);
      if (!(e instanceof ApiError && e.code === "network")) showToast(errorText(e));
    }
  }, [errorText, mark, showToast, upsert]);

  const loadGrowth = useCallback(async () => {
    try {
      const g = await api.growth();
      setGrowth(g);
      upsert(g.offer);
      upsert(g.stock);
      setGrowthState("ready");
      mark("growth", true);
    } catch (e) {
      setGrowthState((s) => (s === "ready" ? s : "error"));
      mark("growth", false);
      if (!(e instanceof ApiError && e.code === "network")) showToast(errorText(e));
    }
  }, [errorText, mark, showToast, upsert]);

  const refreshAll = useCallback(
    () => Promise.all([loadBriefing(), loadForecast(), loadGrowth()]).then(() => undefined),
    [loadBriefing, loadForecast, loadGrowth],
  );

  const userId = user?.id;
  useEffect(() => {
    if (authed) void refreshAll();
  }, [authed, userId]); // eslint-disable-line react-hooks/exhaustive-deps -- load once per signed-in merchant

  useEffect(() => {
    if (authed) api.suggestions(lang).then(setSuggestions).catch(() => undefined);
  }, [authed, userId, lang]);

  // opening a screen refreshes what it shows
  useEffect(() => {
    if (!authed) return;
    if (tab === "cash") void loadForecast();
    if (tab === "grow") void loadGrowth();
    if (tab === "home") void Promise.all([loadBriefing(), loadForecast(), loadGrowth()]);
  }, [authed, tab]); // eslint-disable-line react-hooks/exhaustive-deps -- only on navigation

  // coming back online refreshes everything that was shown stale
  const wasOffline = useRef(false);
  useEffect(() => {
    if (offline) wasOffline.current = true;
    else if (wasOffline.current && authed) {
      wasOffline.current = false;
      void refreshAll();
    }
  }, [offline, authed, refreshAll]);

  const retry = useCallback(async () => {
    setReachable(true); // optimistic: the next request settles it again
    await refreshAll();
  }, [refreshAll]);

  const stale = useCallback((r: Resource) => offline || failed[r], [failed, offline]);

  // --- language -------------------------------------------------------------------------------------------------
  const setLanguage = useCallback(
    async (next: Lang) => {
      if (next === langRef.current) return;
      adoptLang(next);
      if (!authed) return;
      try {
        const me = await api.setLanguage(next);
        setUser(me);
        audio.stop();
        setOffers({}); // offers and the briefing are worded per language: refetch what is on screen
        await refreshAll();
      } catch (e) {
        showToast(errorText(e));
      }
    },
    [adoptLang, authed, errorText, refreshAll, showToast],
  );

  // --- ask / decide ---------------------------------------------------------------------------------------------
  const runTurn = useCallback(
    async (id: string, input: Blob | string): Promise<boolean> => {
      if (askingRef.current) return false; // one question at a time: no accidental double submit
      askingRef.current = true;
      setAsking(true);
      setThread((prev) => prev.map((x) => (x.id === id ? { ...x, pending: true, error: undefined } : x)));
      const form = new FormData();
      if (typeof input === "string") form.append("text", input);
      else form.append("audio", input, "speech.webm");
      try {
        let res: AskResponse;
        try {
          res = await api.ask(form);
        } catch (e) {
          if (!(e instanceof ApiError && e.code === "network")) throw e;
          res = await api.ask(form); // one retry on a dropped connection only
        }
        setThread((prev) => prev.map((x) => (x.id === id ? { ...x, transcript: res.transcript, pending: false, response: res } : x)));
        upsert(res.proposal);
        if (res.intent === "approval") void Promise.all([loadForecast(), loadGrowth()]);
        if (res.audio_url) void audio.playUrl(res.audio_url);
        return true;
      } catch (e) {
        setThread((prev) => prev.map((x) => (x.id === id ? { ...x, pending: false, error: errorText(e) } : x)));
        if (typeof input === "string") setUnsent(input);
        return false;
      } finally {
        askingRef.current = false;
        setAsking(false);
      }
    },
    [errorText, loadForecast, loadGrowth, upsert],
  );

  const ask = useCallback(
    async (input: Blob | string): Promise<boolean> => {
      if (askingRef.current) return false;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setThread((prev) => [...prev, { id, input, transcript: typeof input === "string" ? input : "", pending: true }]);
      setTab("ask");
      return runTurn(id, input);
    },
    [runTurn, setTab],
  );

  const takeUnsent = useCallback(() => setUnsent(null), []);

  const retryTurn = useCallback(
    async (id: string) => {
      const turn = thread.find((x) => x.id === id);
      if (turn) await runTurn(id, turn.input);
    },
    [runTurn, thread],
  );

  const decide = useCallback(
    async (offerId: number, decision: "approve" | "reject", via: "tap" | "voice", opts: { voice?: Blob; message?: string } = {}) => {
      const res = opts.voice
        ? await api.decideByVoice(offerId, opts.voice, opts.message)
        : await api.decide(offerId, decision, via, opts.message);
      setOffers((prev) => (prev[offerId] ? { ...prev, [offerId]: { ...prev[offerId], status: res.status, decided_via: res.decided_via } } : prev));
      if (res.audio_url) void audio.playUrl(res.audio_url);
      await Promise.all([loadForecast(), loadGrowth()]);
      return res;
    },
    [loadForecast, loadGrowth],
  );

  const reset = useCallback(async () => {
    try {
      await api.reset();
      audio.stop();
      if (authed) {
        setUser(await syncServerLang(await api.me())); // the reset restores the seeded language; the screen's choice wins
        setThread([]);
        setOffers({});
        setForecast(null);
        setGrowth(null);
        await refreshAll();
        setTab("home");
      } else {
        setDemoAccounts(await api.demoAccounts());
      }
      showToast(stringsFor(lang).resetDone, 2000);
    } catch (e) {
      showToast(e instanceof ApiError && e.code !== "network" ? stringsFor(lang).resetFailed : errorText(e));
    }
  }, [authed, errorText, lang, refreshAll, setTab, showToast, syncServerLang]);

  const value = useMemo<Munim>(
    () => ({
      authState, user, demoAccounts, requestOtp, login, loginDemo, logout, lang, t, setLanguage,
      offline, syncedAt, stale, retry,
      tab, setTab, briefing, briefingState, thread, asking, unsent, takeUnsent, forecast, forecastState, growth, growthState,
      offers, suggestions, toast, ask, retryTurn, decide, showToast, reset,
    }),
    [authState, user, demoAccounts, requestOtp, login, loginDemo, logout, lang, t, setLanguage, offline, syncedAt, stale, retry,
      tab, setTab, briefing, briefingState, thread, asking, unsent, takeUnsent, forecast, forecastState, growth, growthState, offers, suggestions,
      toast, ask, retryTurn, decide, showToast, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
