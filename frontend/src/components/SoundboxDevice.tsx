import { useState } from "react";
import { useMunim } from "../hooks/useMunim";

/** Simulated Soundbox: chime, then the cached briefing. The first click in the demo also unlocks browser audio. */
export default function SoundboxDevice() {
  const { playBriefing, briefing } = useMunim();
  const [playing, setPlaying] = useState(false);

  const press = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      await playBriefing(true);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3" title="Simulated Soundbox">
      <div className="w-56 rounded-[28px] border-4 border-slate-300 bg-gradient-to-b from-white to-slate-100 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          <span>Paytm</span>
          <span className={`h-2.5 w-2.5 rounded-full ${playing ? "animate-pulse bg-emerald-400" : "bg-slate-300"}`} aria-label={playing ? "playing" : "idle"} />
        </div>
        <div
          className="mb-5 h-24 rounded-2xl"
          style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1.4px, transparent 1.6px)", backgroundSize: "9px 9px", backgroundColor: "#e2e8f0" }}
          aria-hidden
        />
        <button
          onClick={press}
          disabled={!briefing}
          className="mx-auto block h-14 w-14 rounded-full bg-paytm text-xs font-bold text-white shadow-lg ring-4 ring-paytm/20 active:scale-95 disabled:opacity-50"
          aria-label="Play morning briefing on the simulated Soundbox"
        >
          ▶
        </button>
      </div>
      <p className="text-xs text-slate-500">Simulated Soundbox · tap to hear today's briefing</p>
    </div>
  );
}
