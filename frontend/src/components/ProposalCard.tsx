import { useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { inr } from "../lib/i18n";
import type { Offer } from "../types";
import SimulatedTag from "./SimulatedTag";

/** Inline approval card shown under an answer when the agent proposed something. Nothing happens until Approve. */
export default function ProposalCard({ offer: initial }: { offer: Offer }) {
  const { offers, decide, t } = useMunim();
  const [busy, setBusy] = useState(false);
  const offer = offers[initial.id] ?? initial;
  const p = offer.payload;
  const answer = async (decision: "approve" | "reject") => {
    setBusy(true);
    try {
      await decide(offer.id, decision, "tap");
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  };
  const statusLabel = { approved: t.approved, sent: t.sent, rejected: t.rejected, proposed: "" }[offer.status];

  return (
    <div className="mt-2 rounded-xl border border-paytm/40 bg-sky-50 p-3 text-sm">
      <p className="font-semibold text-navy">
        {offer.type === "credit" ? `${inr(p.amount)} · ${p.tenure_days} ${t.days}` : `${p.discount_pct}% · ${p.valid_days} ${t.days}`}
      </p>
      <p className="mt-1 text-ink">{p.text_local}</p>
      {offer.status === "proposed" ? (
        <div className="mt-2 flex gap-2">
          <button disabled={busy} onClick={() => answer("approve")} className="flex-1 rounded-lg bg-paytm py-2 font-semibold text-white disabled:opacity-60">
            {t.approve}
          </button>
          <button disabled={busy} onClick={() => answer("reject")} className="flex-1 rounded-lg border border-slate-300 bg-white py-2 font-medium text-ink disabled:opacity-60">
            {offer.type === "credit" ? t.notNow : t.reject}
          </button>
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-2 font-semibold text-emerald-700">
          ✓ {statusLabel} <SimulatedTag />
        </p>
      )}
    </div>
  );
}
