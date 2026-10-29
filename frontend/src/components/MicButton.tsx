import { useRef, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { MAX_ASK_MS, Recorder } from "../lib/recorder";

/** Press and hold to speak; release to send. Recording is capped at 20 s. */
export default function MicButton() {
  const { ask, asking, t, showToast } = useMunim();
  const [recording, setRecording] = useState(false);
  const rec = useRef<Recorder | null>(null);
  const holding = useRef(false);

  const finish = async () => {
    if (!rec.current) return;
    const recorder = rec.current;
    rec.current = null;
    setRecording(false);
    const blob = await recorder.stop();
    if (blob.size > 1500) void ask(blob); // ignore taps that captured nothing
  };

  const begin = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (asking || recording) return;
    holding.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const recorder = new Recorder();
    try {
      await recorder.start(MAX_ASK_MS, () => void finish());
    } catch {
      holding.current = false;
      showToast(t.micDenied);
      return;
    }
    if (!holding.current) {
      recorder.cancel(); // released before the mic opened
      return;
    }
    rec.current = recorder;
    setRecording(true);
  };

  const end = () => {
    holding.current = false;
    void finish();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className="no-select relative flex h-16 w-16 items-center justify-center rounded-full bg-paytm text-white shadow-lg active:scale-95"
        onPointerDown={begin}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label={t.holdToSpeak}
        aria-pressed={recording}
      >
        {recording && <span className="absolute inset-0 animate-ring rounded-full bg-paytm" />}
        <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      <span className="text-[11px] text-slate-500">{recording ? t.listening : t.holdToSpeak}</span>
    </div>
  );
}
