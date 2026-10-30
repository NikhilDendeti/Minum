import { Suspense, lazy, useEffect, useState } from "react";
import Shell from "./components/Shell";
import { Skeleton } from "./components/ui";
import { useMunim } from "./hooks/useMunim";
import Ask from "./screens/Ask";
import Grow from "./screens/Grow";
import Home from "./screens/Home";
import Landing from "./screens/Landing";
import Login from "./screens/Login";

// the cash screen carries the charting library, so it loads on demand and the landing page stays light
const CashFlow = lazy(() => import("./screens/CashFlow"));
const screens = { home: Home, ask: Ask, cash: CashFlow, grow: Grow };
const titleKey = { home: "navHome", ask: "navAsk", cash: "navCash", grow: "navGrow" } as const;

const SIGN_IN = "#/login";
const useHash = () => {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
};

export default function App() {
  const { authState, user, tab, t } = useMunim();
  const hash = useHash();
  const Screen = screens[tab];

  // signed-out visitors see the landing page; "Try the demo" opens the sign-in screen
  useEffect(() => {
    if (authState === "authed" && window.location.hash === SIGN_IN) window.location.hash = "/home";
  }, [authState]);
  // a meaningful title per screen helps screen readers and browser history
  useEffect(() => {
    document.title = authState === "authed" ? `${t[titleKey[tab]]} · Munim` : t.lpHeroTitle + " · Munim";
  }, [authState, tab, t]);

  if (authState === "checking") {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6" role="status" aria-label={t.loading}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (authState === "anon" || !user) return hash === SIGN_IN ? <Login /> : <Landing />;
  return (
    <Shell>
      <div key={tab} className="page-enter">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Screen />
        </Suspense>
      </div>
    </Shell>
  );
}
