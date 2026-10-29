import { useMunim } from "../hooks/useMunim";
import type { Alert } from "../types";

/** One alert from the briefing; tapping it jumps to the screen that deals with it. */
export default function AlertCard({ alert }: { alert: Alert }) {
  const { setTab, ask, t } = useMunim();
  const isCash = alert.type === "cash_gap";
  const go = () => {
    if (isCash) {
      setTab("cash");
    } else {
      setTab("ask");
      void ask(t.settlementQ);
    }
  };
  return (
    <button onClick={go} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm shadow-sm ${isCash ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <span className="text-lg" aria-hidden>
        {isCash ? "⚠️" : "ℹ️"}
      </span>
      <span className="flex-1 text-ink">{alert.text_local}</span>
      <span className="text-slate-400" aria-hidden>
        ›
      </span>
    </button>
  );
}
