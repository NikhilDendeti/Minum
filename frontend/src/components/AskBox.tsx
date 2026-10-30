import { useEffect, useRef, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { MAX_ASK_MS, Recorder } from "../lib/recorder";
import { Icon, Notice, Spinner } from "./ui";

const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Phase = "idle" | "starting" | "recording";

/**
 * The one place a merchant asks something: tap the mic and speak, or type. Idle -> recording -> processing (the
 * provider's `asking`) -> answer. Every step has a visible state, the text path is always there, and a second
 * question cannot be sent while one is being answered.
 */
export default function AskBox({ placeholder }: { placeholder?: string }) {
  const { ask, asking, offline, t } = useMunim();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [problem, setProblem] = useState<"denied" | "empty" | null>(null);
  const rec = useRef<Recorder | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const finishRef = useRef<(send: boolean) => Promise<void>>();

  const blocked = asking || offline;

  const finish = async (send: boolean) => {
    const recorder = rec.current;
    if (!recorder) return;
    rec.current = null;
    setPhase("idle");
    if (!send) {
      recorder.cancel();
      return;
    }
    const blob = await recorder.stop();
    if (blob.size > 1500) void ask(blob);
    else setProblem("empty"); // a tap that captured nothing
  };
  finishRef.current = finish;

  const start = async () => {
    if (blocked || phase !== "idle") return;
    setProblem(null);
    setPhase("starting");
    const recorder = new Recorder();
    try {
      await recorder.start(MAX_ASK_MS, () => void finishRef.current?.(true));
    } catch {
      setPhase("idle");
      setProblem("denied");
      input.current?.focus(); // the text path is offered straight away
      return;
    }
    rec.current = recorder;
    setSeconds(0);
    setPhase("recording");
  };

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => () => rec.current?.cancel(), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || blocked) return;
    setText("");
    setProblem(null);
    void ask(q);
  };

  return (
    <section aria-label={t.askLabel} className="card p-3 sm:p-4">
      {phase === "recording" ? (
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label={t.listening}>
          <span className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-risk-bg text-risk-fg">
            <span className="absolute inset-0 animate-rec rounded-full bg-risk-line" aria-hidden />
            <Icon name="mic" className="relative h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink" role="status">
              {t.listening}
            </p>
            <p className="meta num">
              {clock(seconds)} / {clock(MAX_ASK_MS / 1000)}
            </p>
          </div>
          <button className="btn-secondary" onClick={() => void finish(false)}>
            {t.cancel}
          </button>
          <button className="btn-primary" onClick={() => void finish(true)} data-autofocus>
            <Icon name="send" className="h-4 w-4" />
            {t.sendQuestion}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex items-center gap-2">
          {canRecord && (
            <button
              type="button"
              onClick={() => void start()}
              disabled={blocked || phase === "starting"}
              aria-label={t.tapToSpeak}
              title={t.tapToSpeak}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "starting" ? <Spinner className="h-5 w-5" /> : <Icon name="mic" className="h-6 w-6" />}
            </button>
          )}
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t.askLabel}</span>
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder ?? t.askPlaceholder}
              enterKeyHint="send"
              autoComplete="off"
              maxLength={300}
              className="field"
            />
          </label>
          <button type="submit" disabled={blocked || !text.trim()} aria-label={t.send} className="btn-primary min-w-[48px] px-3">
            <Icon name="send" className="h-5 w-5" />
          </button>
        </form>
      )}

      <div className="mt-2 min-h-[20px]" aria-live="polite">
        {asking ? (
          <p className="meta flex items-center gap-2">
            <Spinner /> {t.thinking}
          </p>
        ) : offline ? (
          <p className="meta">{t.askOffline}</p>
        ) : problem === "denied" ? (
          <Notice tone="warn" title={t.micDeniedTitle}>
            {t.micDenied}
          </Notice>
        ) : problem === "empty" ? (
          <p className="meta">{t.micEmpty}</p>
        ) : !canRecord ? (
          <p className="meta">{t.micUnsupported}</p>
        ) : phase === "idle" ? (
          <p className="meta">{t.askHint}</p>
        ) : null}
      </div>
    </section>
  );
}

/** Questions the backend can answer from the data; tapping one asks it. */
export function Suggestions({ limit }: { limit?: number }) {
  const { suggestions, ask, asking, offline, t } = useMunim();
  const list = limit ? suggestions.slice(0, limit) : suggestions;
  if (!list.length) return null;
  return (
    <div>
      <p className="meta mb-2">{t.tryAsking}</p>
      <ul className="flex flex-wrap gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => void ask(s.text)}
              disabled={asking || offline}
              className="min-h-[44px] rounded-ctl border border-line bg-surface px-3 py-2 text-left text-[14px] text-ink transition-colors duration-150 hover:border-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50"
            >
              {s.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
