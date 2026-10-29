import { useMunim } from "../hooks/useMunim";
import type { Tab } from "../types";

const icon: Record<Tab, JSX.Element> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  ask: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  cash: (
    <>
      <path d="M3 17l5-5 4 4 8-9" />
      <path d="M15 7h5v5" />
    </>
  ),
  grow: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M17 8h4M19 6v4" />
    </>
  ),
};

/** Same tabs in two places: "bottom" on small screens, "top" on large ones (CSS decides which one shows). */
export default function TabBar({ placement }: { placement: "top" | "bottom" }) {
  const { tab, setTab, t } = useMunim();
  const tabs: Tab[] = ["home", "ask", "cash", "grow"];
  const wrapper =
    placement === "bottom" ? "flex border-t border-slate-200 bg-white lg:hidden" : "hidden border-b border-slate-200 bg-white lg:flex";
  return (
    <nav className={wrapper} aria-label={`Main (${placement})`}>
      {tabs.map((id) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-medium lg:flex-row lg:py-3 lg:text-sm ${
              placement === "bottom" ? "flex-col" : ""
            } ${active ? "text-paytm lg:border-b-2 lg:border-paytm" : "text-slate-400"}`}
            aria-current={active ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 lg:h-5 lg:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {icon[id]}
            </svg>
            {t[id]}
          </button>
        );
      })}
    </nav>
  );
}
