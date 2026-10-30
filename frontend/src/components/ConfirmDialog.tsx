import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMunim } from "../hooks/useMunim";
import { ApiError } from "../lib/api";
import { MAX_DECIDE_MS, Recorder } from "../lib/recorder";
import type { DecideResponse, Offer } from "../types";
import { Dialog, Icon, Notice, SimulatedTag, Spinner } from "./ui";

export function SummaryList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line rounded-ctl border border-line">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="meta shrink-0">{r.label}</dt>
          <dd className="min-w-0 text-[15px] text-ink sm:text-right">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type Stage = "review" | "pending" | "done" | "failed";

/** Optional spoken answer. "Yes" is only ever offered next to the exact action being approved. */
function VoiceAnswer({ disabled, onAudio }: { disabled: boolean; onAudio: (blob: Blob) => void }) {
  const { t, showToast } = useMunim();
  const [listening, setListening] = useState(false);
  const [left, setLeft] = useState(MAX_DECIDE_MS / 1000);
  const rec = useRef<Recorder | null>(null);

  useEffect(() => {
    if (!listening) return;
    setLeft(MAX_DECIDE_MS / 1000);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [listening]);
  useEffect(() => () => rec.current?.cancel(), []);

  const send = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setListening(false);
    onAudio(await r.stop());
  };
  const listen = async () => {
    const r = new Recorder();
    try {
      await r.start(MAX_DECIDE_MS, () => void send());
    } catch {
      showToast(t.micDenied);
      return;
    }
    rec.current = r;
    setListening(true);
  };

  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  return (
    <div className="mt-4 rounded-ctl border border-dashed border-line-strong p-3">
      <button className="btn-secondary w-full sm:w-auto" onClick={() => (listening ? void send() : void listen())} disabled={disabled}>
        <Icon name="mic" className="h-4 w-4" />
        {listening ? `${t.listening} ${left}s · ${t.send}` : t.answerByVoice}
      </button>
      <p className="meta mt-2">{t.sayYesNo}</p>
    </div>
  );
}

/**
 * The single place a consequential action is approved or declined. It always shows what will happen, needs a
 * deliberate press (or a spoken yes next to the same summary), and reports pending / success / failure honestly.
 */
export default function ConfirmDialog({
  offer,
  decision,
  title,
  confirmLabel,
  approvedTitle,
  message,
  children,
  successNote,
  onClose,
}: {
  offer: Offer;
  decision: "approve" | "reject";
  title: string;
  confirmLabel: string;
  approvedTitle: string; // heading once it went through: "Approved" for credit, "Sent (simulated)" for an offer
  message?: string;
  children: ReactNode;
  successNote: string;
  onClose: () => void;
}) {
  const { decide, offline, t } = useMunim();
  const [stage, setStage] = useState<Stage>("review");
  const [result, setResult] = useState<DecideResponse | null>(null);
  const [error, setError] = useState("");
  const [heard, setHeard] = useState("");
  const submitting = useRef(false);

  const run = async (voice?: Blob) => {
    if (submitting.current) return; // a double tap must not send twice
    submitting.current = true;
    setStage("pending");
    setError("");
    try {
      const res = await decide(offer.id, decision, voice ? "voice" : "tap", { voice, message });
      setResult(res);
      setHeard(res.transcript && voice ? res.transcript : "");
      setStage("done");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.code === "undecided"
            ? t.voiceUndecided
            : e.code === "network"
              ? t.errorOffline
              : e.messageLocal ?? e.message
          : t.errorGeneric,
      );
      setStage("failed");
    } finally {
      submitting.current = false;
    }
  };

  const approved = result ? result.status === "approved" || result.status === "sent" : false;
  const busy = stage === "pending";

  return (
    <Dialog
      title={stage === "done" ? (approved ? approvedTitle : t.doneDeclined) : title}
      onClose={onClose}
      busy={busy}
      footer={
        stage === "done" ? (
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onClose} data-autofocus>
              {t.done}
            </button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={onClose} disabled={busy}>
              {t.cancel}
            </button>
            <button className={decision === "approve" ? "btn-primary" : "btn-danger"} onClick={() => void run()} disabled={busy || offline}>
              {busy && <Spinner />}
              {busy ? t.working : confirmLabel}
            </button>
          </div>
        )
      }
    >
      {stage === "done" && result ? (
        <div className="space-y-3" role="status">
          {approved && (
            <div className="flex items-start gap-2">
              <SimulatedTag />
              <p className="meta">{successNote}</p>
            </div>
          )}
          <p className="text-[15px]">{result.confirmation_local}</p>
          {heard && (
            <p className="meta">
              {t.heard}: “{heard}”
            </p>
          )}
        </div>
      ) : (
        <>
          {children}
          {decision === "approve" && <VoiceAnswer disabled={busy || offline} onAudio={(b) => void run(b)} />}
          {offline && (
            <div className="mt-4">
              <Notice tone="warn">{t.actionOffline}</Notice>
            </div>
          )}
          {stage === "failed" && (
            <div className="mt-4">
              <Notice tone="risk" live title={t.actionFailed}>
                {error}
              </Notice>
            </div>
          )}
          {busy && (
            <p className="meta mt-4 flex items-center gap-2" role="status">
              <Spinner /> {t.working}
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}
