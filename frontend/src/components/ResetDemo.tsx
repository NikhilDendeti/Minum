import { useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { Spinner } from "./ui";

/** Presenter control: reseeds the demo data, clears offers and conversations, and returns to Home. */
export default function ResetDemo({ className = "btn-quiet text-[13px] text-muted underline" }: { className?: string }) {
  const { reset, offline, t } = useMunim();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await reset();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={() => void run()} disabled={busy || offline} className={className}>
      {busy && <Spinner />}
      {busy ? t.resetting : t.resetDemo}
    </button>
  );
}
