import { useEffect, useRef, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { fmt, inr } from "../lib/i18n";
import type { Offer, Turn } from "../types";
import AudioControl from "./AudioControl";
import Evidence from "./Evidence";
import { CampaignDialog, CreditDialog } from "./OfferDialogs";
import { Icon, Notice, SimulatedTag, Skeleton, StatusLabel } from "./ui";

/** A proposal Munim made inside an answer. Nothing happens until the merchant reviews and confirms in the dialog. */
function Proposal({ offer: initial }: { offer: Offer }) {
  const { offers, offline, t } = useMunim();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const offer = offers[initial.id] ?? initial;
  const p = offer.payload;
  const credit = offer.type === "credit";
  const headline = credit ? `${inr(Number(p.amount))} · ${fmt(t.daysN, { n: Number(p.tenure_days) })}` : `${p.discount_pct}% · ${fmt(t.daysN, { n: Number(p.valid_days) })} · ${fmt(t.audienceLine, { n: Number(p.reach) })}`;

  return (
    <div className="rounded-card border border-warn-line bg-warn-bg/40 p-3" style={{ backgroundColor: "var(--warn-bg)" }}>
      <div className="flex flex-wrap items-center gap-2">
        {offer.status === "proposed" ? (
          <StatusLabel tone="warn">{t.awaitingApproval}</StatusLabel>
        ) : offer.status === "rejected" ? (
          <StatusLabel tone="neutral">{credit ? t.statusDeclined : t.statusRejected}</StatusLabel>
        ) : (
          <>
            <StatusLabel tone="ok">{credit ? t.statusApproved : t.statusSent}</StatusLabel>
            <SimulatedTag />
          </>
        )}
      </div>
      <p className="num mt-2 font-semibold text-navy">{headline}</p>
      <p className="mt-1 text-[14px]">{String(p.text_local ?? "")}</p>
      {offer.status === "proposed" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setDialog("approve")} disabled={offline}>
            {credit ? t.reviewAccept : t.reviewSend}
          </button>
          <button className="btn-secondary" onClick={() => setDialog("reject")} disabled={offline}>
            {credit ? t.notNow : t.reject}
          </button>
        </div>
      )}
      {dialog && (credit ? (
        <CreditDialog offer={offer} decision={dialog} onClose={() => setDialog(null)} />
      ) : (
        <CampaignDialog offer={offer} decision={dialog} message={String(p.text_local ?? "")} edited={false} onClose={() => setDialog(null)} />
      ))}
    </div>
  );
}

function Thinking() {
  const { t } = useMunim();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div role="status" className="space-y-3">
      <p className="flex items-center gap-2 text-muted">
        <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
          <span className="relative inline-flex h-3 w-3 animate-pulse rounded-full bg-brand" />
        </span>
        {slow ? t.stillWorking : t.checkingData}
      </p>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const { retryTurn, asking, offline, t } = useMunim();
  const res = turn.response;
  return (
    <article className="space-y-2" aria-busy={turn.pending}>
      <div>
        <p className="meta">{t.youAsked}</p>
        <p className="text-[16px] font-medium">{turn.transcript || (turn.pending ? "…" : "")}</p>
      </div>
      <div className="card space-y-4 p-4 sm:p-5">
        {turn.pending && <Thinking />}
        {turn.error && (
          <Notice
            tone="risk"
            live
            title={t.answerFailed}
            action={
              !offline && (
                <button className="btn-secondary min-h-[40px] py-1.5 text-[14px]" onClick={() => void retryTurn(turn.id)} disabled={asking}>
                  <Icon name="replay" className="h-4 w-4" />
                  {t.tryAgain}
                </button>
              )
            }
          >
            {turn.error}
          </Notice>
        )}
        {res && (
          <>
            <div>
              <p className="text-[17px] font-medium leading-relaxed text-ink">{res.answer_local}</p>
              {res.answer_local !== res.answer_en && (
                <p className="meta mt-1.5" lang="en">
                  {t.inEnglish}: {res.answer_en}
                </p>
              )}
            </div>
            <AudioControl url={res.audio_url} />
            {res.proposal && res.intent !== "approval" && <Proposal offer={res.proposal} />}
            {res.intent !== "approval" && (
              <div className="border-t border-line pt-3">
                <Evidence evidence={res.evidence} />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default function ChatThread() {
  const { thread } = useMunim();
  const last = useRef<HTMLDivElement>(null);
  const count = thread.length;
  useEffect(() => {
    if (!count) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    last.current?.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
  }, [count]);

  return (
    <div className="space-y-6" aria-live="polite">
      {thread.map((turn, i) => (
        <div key={turn.id} ref={i === thread.length - 1 ? last : undefined} className="scroll-mt-4 animate-rise">
          <TurnView turn={turn} />
        </div>
      ))}
    </div>
  );
}
