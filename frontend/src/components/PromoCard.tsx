import { useState } from "react";
import { useMunim } from "../hooks/useMunim";
import type { Offer } from "../types";
import SimulatedTag from "./SimulatedTag";

/** Drafted promo in the merchant's language. Approve / Edit / Reject by tap; nothing is sent until Approve. */
export default function PromoCard({ offer }: { offer: Offer }) {
  const { decide, offers, t } = useMunim();
  const live = offers[offer.id] ?? offer;
  const [edited, setEdited] = useState<string | null>(null); // the merchant's own wording; otherwise the draft in the current language
  const text = edited ?? live.payload.text_local;
  const setText = setEdited;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const answer = async (decision: "approve" | "reject") => {
    setBusy(true);
    try {
      await decide(live.id, decision, "tap");
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {live.payload.discount_pct}% · {live.payload.valid_days} {t.days} · {live.payload.reach} {t.customers}
      </p>
      {editing && live.status === "proposed" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-paytm"
        />
      ) : (
        <p className="mt-2 rounded-lg bg-sky-50 p-3 text-sm leading-relaxed text-navy">{text}</p>
      )}
      {live.status === "proposed" ? (
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => answer("approve")} className="flex-1 rounded-xl bg-paytm py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {t.approve}
          </button>
          <button onClick={() => setEditing((e) => !e)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-ink">
            {editing ? t.save : t.edit}
          </button>
          <button disabled={busy} onClick={() => answer("reject")} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-ink disabled:opacity-60">
            {t.reject}
          </button>
        </div>
      ) : (
        <p className={`mt-3 flex items-center gap-2 font-semibold ${live.status === "rejected" ? "text-slate-500" : "text-emerald-700"}`}>
          {live.status === "rejected" ? "✕ " + t.rejected : "✓ " + t.sent} <SimulatedTag />
        </p>
      )}
    </section>
  );
}
