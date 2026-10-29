import { useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { inr } from "../lib/i18n";
import type { Offer } from "../types";
import SimulatedTag from "./SimulatedTag";

/** Pre-approved credit offer: amount, tenure, the rule behind it, Approve / Not now. */
export default function OfferCard({ offer }: { offer: Offer }) {
  const { decide, offers, t } = useMunim();
  const [busy, setBusy] = useState(false);
  const live = offers[offer.id] ?? offer;
  const p = live.payload;

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
    <section className="rounded-2xl bg-navy p-4 text-white shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-200">{t.preApproved}</p>
      <p className="mt-1 text-3xl font-bold">{inr(p.amount)}</p>
      <p className="text-sm text-sky-100">
        {p.tenure_days} {t.days}
      </p>
      <p className="mt-1 text-[11px] text-sky-200/80">
        {t.basis}: {p.basis}
      </p>
      {live.status === "proposed" ? (
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => answer("approve")} className="flex-1 rounded-xl bg-paytm py-2.5 font-semibold text-white disabled:opacity-60">
            {busy ? "…" : t.approve}
          </button>
          <button disabled={busy} onClick={() => answer("reject")} className="flex-1 rounded-xl border border-sky-200/40 py-2.5 font-medium text-sky-100 disabled:opacity-60">
            {t.notNow}
          </button>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 font-semibold text-emerald-300">
          ✓ {live.status === "approved" ? t.approved : t.rejected} <SimulatedTag />
        </p>
      )}
    </section>
  );
}
