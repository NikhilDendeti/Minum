import type { ReactNode } from "react";
import { useMunim } from "../hooks/useMunim";
import { demoMode } from "../lib/demo";
import { timeOfDay } from "../lib/i18n";
import type { Tab } from "../types";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoMark from "./Logo";
import ResetDemo from "./ResetDemo";
import { Icon, Notice, type IconName } from "./ui";

const NAV: { id: Tab; icon: IconName; short: "home" | "ask" | "cash" | "grow"; long: "navHome" | "navAsk" | "navCash" | "navGrow" }[] = [
  { id: "home", icon: "home", short: "home", long: "navHome" },
  { id: "ask", icon: "mic", short: "ask", long: "navAsk" },
  { id: "cash", icon: "cash", short: "cash", long: "navCash" },
  { id: "grow", icon: "people", short: "grow", long: "navGrow" },
];


export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xl font-semibold tracking-tight ${onDark ? "text-white" : "text-navy"}`} lang="en">
      <LogoMark className="h-7 w-7" />
      Munim
    </span>
  );
}

function ConnectionStatus({ onDark = false }: { onDark?: boolean }) {
  const { offline, t } = useMunim();
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${onDark ? "text-white/80" : "text-muted"}`} role="status">
      <span className={`h-2 w-2 rounded-full ${offline ? "bg-warn-line ring-2 ring-warn-fg" : "bg-[#5fbf8f]"}`} aria-hidden />
      {offline ? t.statusOffline : t.statusLive}
    </span>
  );
}

function SidebarNav() {
  const { tab, setTab, t } = useMunim();
  return (
    <nav aria-label={t.mainNav} className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = tab === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-ctl px-3 text-left text-[15px] font-medium transition-colors duration-150 ${
              active ? "bg-white text-navy shadow-[inset_3px_0_0_var(--accent)]" : "text-white/85 hover:bg-white/10"
            }`}
          >
            <Icon name={n.icon} />
            {t[n.long]}
          </button>
        );
      })}
    </nav>
  );
}

function BottomNav() {
  const { tab, setTab, t } = useMunim();
  return (
    <nav aria-label={t.mainNav} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV.map((n) => {
        const active = tab === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[12px] font-medium ${active ? "text-navy" : "text-muted"}`}
          >
            {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-accent" aria-hidden />}
            <Icon name={n.icon} className="h-6 w-6" />
            <span className="max-w-full truncate">{t[n.short]}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OfflineBanner() {
  const { offline, syncedAt, retry, lang, t } = useMunim();
  if (!offline) return null;
  const last = Math.max(0, ...Object.values(syncedAt).filter((x): x is number => !!x));
  return (
    <div className="mb-5">
      <Notice
        tone="warn"
        live
        title={t.offlineTitle}
        action={
          <button className="btn-secondary min-h-[40px] py-1.5 text-[14px]" onClick={() => void retry()}>
            {t.retry}
          </button>
        }
      >
        {t.offlineBody}
        {last > 0 && <> {t.offlineLast.replace("{time}", timeOfDay(last, lang))}</>}
      </Notice>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout, toast, t } = useMunim();
  if (!user) return null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main"
        onClick={(e) => (e.preventDefault(), document.getElementById("main")?.focus())}
        className="sr-only z-50 rounded-ctl bg-surface px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t.skipToContent}
      </a>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 bg-navy px-4 py-6 text-white lg:flex">
        <div className="px-1">
          <Wordmark onDark />
        </div>
        <div className="rounded-ctl bg-white/10 px-3 py-2.5">
          <p className="font-medium leading-snug">{user.name}</p>
          <p className="text-[13px] text-white/75">{user.city}</p>
          <p className="mt-1.5 text-[12px] text-white/75">{t.demoData}</p>
        </div>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-3">
          <LanguageSwitcher onDark />
          <ConnectionStatus onDark />
          <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-3 text-[13px] text-white/80">
            <span className="num">{user.phone}</span>
            <button onClick={() => void logout()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-ctl px-2 font-medium hover:bg-white/10">
              <Icon name="logout" className="h-4 w-4" />
              {t.logout}
            </button>
          </div>
          {demoMode && <ResetDemo className="inline-flex min-h-[44px] items-center gap-1.5 text-left text-[13px] text-white/70 underline" />}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* phone top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 lg:hidden">
          <div className="min-w-0">
            <Wordmark />
            <div>
              <ConnectionStatus />
            </div>
          </div>
          <LanguageSwitcher variant="select" />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1040px] px-4 pb-28 pt-5 outline-none sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
          <OfflineBanner />
          {children}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[13px] text-muted lg:hidden">
            <span>
              {user.name} · <span className="num">{user.phone}</span>
            </span>
            <button onClick={() => void logout()} className="btn-secondary min-h-[44px] py-1.5 text-[14px]">
              <Icon name="logout" className="h-4 w-4" />
              {t.logout}
            </button>
            {demoMode && <ResetDemo />}
          </footer>
        </main>
      </div>

      <BottomNav />

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-[72px] z-40 flex justify-center px-4 lg:bottom-6 lg:left-[232px]">
        {toast && <p className="pointer-events-auto max-w-md animate-rise rounded-ctl bg-navy px-4 py-2.5 text-center text-[14px] text-white shadow-lg">{toast}</p>}
      </div>
    </div>
  );
}
