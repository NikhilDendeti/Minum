import { useEffect, useRef, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { ApiError } from "../lib/api";
import { MAX_DECIDE_MS, Recorder } from "../lib/recorder";

/** Listens for 4 seconds, posts the audio to /decide, shows the word the server heard. "avunu" approves, "kaadu" rejects. */
export default function VoiceApprove({ offerId }: { offerId: number }) {
  const { decide, t, showToast } = useMunim();
  const [state, setState] = useState<"idle" | "listening" | "sending">("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const [retry, setRetry] = useState(false);
  const [left, setLeft] = useState(MAX_DECIDE_MS / 1000);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    if (state !== "listening") return;
    setLeft(MAX_DECIDE_MS / 1000);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const listen = async () => {
    if (state !== "idle") return;
    setHeard(null);
    setRetry(false);
    const rec = new Recorder();
    recorder.current = rec;
    try {
      setState("listening");
      await rec.start(MAX_DECIDE_MS, () => void send());
    } catch {
      setState("idle");
      showToast(t.micDenied);
    }
  };

  const send = async () => {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    setState("sending");
    const blob = await rec.stop();
    try {
      const res = await decide(offerId, "approve", "voice", blob);
      setHeard(res.transcript);
    } catch (e) {
      if (e instanceof ApiError && e.code === "undecided") setRetry(true);
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-paytm/60 bg-sky-50 p-3 text-center">
      <button
        onClick={() => (state === "listening" ? void send() : void listen())}
        disabled={state === "sending"}
        className={`relative mx-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white ${state === "listening" ? "bg-red-500" : "bg-navy"} disabled:opacity-60`}
      >
        {state === "listening" && <span className="absolute inset-0 animate-ring rounded-full bg-red-400" />}
        <span className="relative">🎙 {state === "listening" ? `${t.listening} ${left}s` : t.voiceApprove}</span>
      </button>
      <p className="mt-2 text-xs text-slate-500">{t.sayYes}</p>
      {heard && (
        <p className="mt-1 text-sm text-navy">
          {t.heard}: “{heard}”
        </p>
      )}
      {retry && <p className="mt-1 text-sm text-red-600">{t.tryAgain}</p>}
    </div>
  );
}
