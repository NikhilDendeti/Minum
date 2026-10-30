import { useEffect } from "react";
import Shell from "./components/Shell";
import { Skeleton } from "./components/ui";
import { useMunim } from "./hooks/useMunim";
import Ask from "./screens/Ask";
import CashFlow from "./screens/CashFlow";
import Grow from "./screens/Grow";
import Home from "./screens/Home";
import Login from "./screens/Login";

const screens = { home: Home, ask: Ask, cash: CashFlow, grow: Grow };
const titleKey = { home: "navHome", ask: "navAsk", cash: "navCash", grow: "navGrow" } as const;

export default function App() {
  const { authState, user, tab, t } = useMunim();
  const Screen = screens[tab];

  // a meaningful title per screen helps screen readers and browser history
  useEffect(() => {
    document.title = authState === "authed" ? `${t[titleKey[tab]]} · Munim` : "Munim";
  }, [authState, tab, t]);

  if (authState === "checking") {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6" role="status" aria-label={t.loading}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (authState === "anon" || !user) return <Login />;
  return (
    <Shell>
      <div key={tab} className="page-enter">
        <Screen />
      </div>
    </Shell>
  );
}
