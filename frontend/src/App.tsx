import LanguageSwitcher from "./components/LanguageSwitcher";
import SoundboxDevice from "./components/SoundboxDevice";
import Spinner from "./components/Spinner";
import TabBar from "./components/TabBar";
import { useMunim } from "./hooks/useMunim";
import Ask from "./screens/Ask";
import CashFlow from "./screens/CashFlow";
import Grow from "./screens/Grow";
import Home from "./screens/Home";
import Login from "./screens/Login";

const screens = { home: Home, ask: Ask, cash: CashFlow, grow: Grow };
const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";

/** Responsive layout: tabs at the bottom on small screens, at the top on large ones, Soundbox in a side column. */
export default function App() {
  const { authState, user, logout, t, tab, toast, reset } = useMunim();
  const Screen = screens[tab];
  const signedIn = authState === "authed" && user;

  return (
    <div className="flex h-full flex-col bg-surface lg:bg-[#e9eef5]">
      <header className="flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white">
        <div className="min-w-0">
          <span className="text-base font-bold tracking-wide">Munim</span>
          <span className="ml-2 hidden text-xs opacity-70 sm:inline">Paytm for Business (prototype)</span>
        </div>
        {signedIn && (
          <div className="flex items-center gap-3">
            <span className="hidden truncate text-sm opacity-90 sm:block">{user.name}</span>
            <LanguageSwitcher dark />
            <button onClick={() => void logout()} className="rounded-md border border-white/30 px-2 py-1 text-xs hover:bg-white/10">
              {t.logout}
            </button>
          </div>
        )}
      </header>

      {authState === "checking" && (
        <div className="p-6">
          <Spinner label={t.loading} />
        </div>
      )}
      {authState === "anon" && <Login />}

      {signedIn && (
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 gap-8 lg:p-6">
          <section className="flex min-h-0 flex-1 flex-col bg-surface lg:overflow-hidden lg:rounded-2xl lg:shadow-lg lg:ring-1 lg:ring-slate-200">
            <TabBar placement="top" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Screen />
              {toast && (
                <div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-900/90 px-3 py-2 text-center text-sm text-white shadow-lg">
                  {toast}
                </div>
              )}
            </div>
            <TabBar placement="bottom" />
          </section>

          <aside className="hidden w-64 shrink-0 pt-6 lg:block">
            <SoundboxDevice />
          </aside>
        </div>
      )}

      {signedIn && demoMode && (
        <button onClick={() => void reset()} className="fixed bottom-14 right-2 rounded bg-slate-800/70 px-2 py-1 text-[10px] text-white lg:bottom-2">
          reset demo
        </button>
      )}
    </div>
  );
}
