import { useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { fmt, inr } from "../lib/i18n";
import type { Offer } from "../types";
import { StockDialog } from "./OfferDialogs";
import { Notice, SimulatedTag, StatusLabel } from "./ui";

/**
 * A restock reminder before a busier-than-usual day. It is about timing only: this system has no item or stock levels,
 * so it never says what to order. The merchant sets or skips it through the same confirmation as every other action.
 */
export default function StockReminder({ offer: initial, locked }: { offer: Offer; locked: boolean }) {
  const { offers, t } = useMunim();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const offer = offers[initial.id] ?? initial;
  const p = offer.payload;
  const proposed = offer.status === "proposed";

  return (
    <section aria-labelledby="stock-h" className="card p-4 sm:p-6 lg:col-start-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stock-h" className="section-title">
          {t.stockTitle}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {proposed ? (
            <StatusLabel tone="warn">{t.awaitingApproval}</StatusLabel>
          ) : offer.status === "rejected" ? (
            <StatusLabel tone="neutral">{t.statusDeclined}</StatusLabel>
          ) : (
            <>
              <StatusLabel tone="ok">{t.stockStatusSet}</StatusLabel>
              <SimulatedTag />
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[16px]">{String(p.text_local ?? "")}</p>
      <dl className="mt-4 divide-y divide-line rounded-ctl border border-line text-[15px]">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
          <dt className="meta">{t.stockExpected}</dt>
          <dd className="num font-semibold">{inr(Number(p.expected_sales))}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
          <dt className="meta">{t.stockTypical}</dt>
          <dd className="num">{inr(Number(p.typical_sales))}</dd>
        </div>
      </dl>
      <p className="meta mt-3">{t.stockBasis}</p>
      <p className="meta">{t.stockNoItems}</p>
      {proposed && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="btn-primary" onClick={() => setDialog("approve")} disabled={locked}>
            {t.stockReview}
          </button>
          <button className="btn-secondary" onClick={() => setDialog("reject")} disabled={locked}>
            {t.notNow}
          </button>
        </div>
      )}
      {!proposed && offer.status !== "rejected" && (
        <div className="mt-4">
          <Notice tone="ok" title={t.stockStatusSet}>
            {t.stockSimNote}
          </Notice>
        </div>
      )}
      {dialog && <StockDialog offer={offer} decision={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
