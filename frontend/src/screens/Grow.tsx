import { useState } from "react";
import { CampaignDialog, MessagePreview, channelLabel } from "../components/OfferDialogs";
import { EmptyState, Icon, Notice, PageHeading, SimulatedTag, Skeleton, StatusLabel } from "../components/ui";
import { useMunim } from "../hooks/useMunim";
import { fmt, inr } from "../lib/i18n";

const MAX_CHARS = 300;

export default function Grow() {
  const { growth, growthState, offers, offline, stale, lang, user, retry, t } = useMunim();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [editing, setEditing] = useState(false);
  // the merchant's own wording; it belongs to the language it was written in, so it is dropped if the language changes
  const [draft, setDraft] = useState<{ lang: string; text: string } | null>(null);

  if (!growth) {
    return growthState === "error" ? (
      <EmptyState
        title={t.loadFailedTitle}
        action={
          <button className="btn-primary" onClick={() => void retry()}>
            {t.retry}
          </button>
        }
      >
        {offline ? t.errorOffline : t.errorGeneric}
      </EmptyState>
    ) : (
      <div className="space-y-5" role="status" aria-label={t.loading}>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const seg = growth.segment;
  const offer = growth.offer ? offers[growth.offer.id] ?? growth.offer : null;
  const original = String(offer?.payload.text_local ?? "");
  const text = draft && draft.lang === lang ? draft.text : original;
  const edited = text.trim() !== original.trim();
  const p = offer?.payload ?? {};
  const proposed = offer?.status === "proposed";
  const sent = offer?.status === "sent" || offer?.status === "approved";
  const rejected = offer?.status === "rejected";
  const locked = offline || stale("growth");

  const status = sent ? (
    <>
      <StatusLabel tone="ok">{t.statusSent}</StatusLabel>
      <SimulatedTag />
    </>
  ) : rejected ? (
    <StatusLabel tone="neutral">{t.statusRejected}</StatusLabel>
  ) : editing ? (
    <StatusLabel tone="neutral" icon="edit">
      {t.statusDraft}
    </StatusLabel>
  ) : edited ? (
    <StatusLabel tone="warn">{t.statusEdited}</StatusLabel>
  ) : (
    <StatusLabel tone="warn">{t.awaitingApproval}</StatusLabel>
  );

  return (
    <div className="space-y-5">
      <PageHeading title={t.growTitle} sub={t.growSub} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section aria-labelledby="seg-h" className="card p-4 sm:p-5 lg:sticky lg:top-6">
          <h2 id="seg-h" className="text-[15px] font-medium text-muted">
            {t.segment}
          </h2>
          <p className="num mt-2 text-[44px] font-semibold leading-none text-forest">{seg.count}</p>
          <p className="mt-1 text-[15px]">{t.customers}</p>
          <p className="mt-3 text-[14px]">{t.ruleText}</p>
          {seg.avg_monthly_spend > 0 && (
            <p className="meta mt-2">
              {fmt(t.avgSpendLine, { amount: inr(seg.avg_monthly_spend) })}
            </p>
          )}
          <p className="meta mt-2">{t.privacyNote}</p>
        </section>

        {!offer ? (
          <EmptyState title={t.noCampaignTitle}>{seg.count === 0 ? t.noCampaignNone : t.noCampaignBody}</EmptyState>
        ) : (
          <section aria-labelledby="camp-h" className="card p-4 sm:p-6">
            {locked && !sent && !rejected && (
              <div className="mb-4">
                <Notice tone="warn" live>
                  {t.actionOffline}
                </Notice>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="camp-h" className="section-title">
                {t.proposedOffer}
              </h2>
              <div className="flex flex-wrap items-center gap-2">{status}</div>
            </div>

            <dl className="mt-4 divide-y divide-line text-[15px]">
              <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                <dt className="meta w-32 shrink-0">{t.goal}</dt>
                <dd>{t.goalValue}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="meta shrink-0">{t.audience}</dt>
                <dd className="text-right">{fmt(t.audienceLine, { n: Number(p.reach) })}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="meta shrink-0">{t.incentive}</dt>
                <dd className="text-right">{fmt(t.offerLine, { pct: Number(p.discount_pct), days: Number(p.valid_days) })}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="meta shrink-0">{t.channel}</dt>
                <dd className="text-right">{channelLabel(p.channel, t)}</dd>
              </div>
              <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                <dt className="meta w-32 shrink-0">{t.expectedAction}</dt>
                <dd>{fmt(t.expectedActionValue, { days: Number(p.valid_days) })}</dd>
              </div>
            </dl>

            <div className="mt-4">
              {editing && proposed ? (
                <div>
                  <label htmlFor="msg" className="text-[15px] font-medium">
                    {t.messageLabel}
                  </label>
                  <textarea
                    id="msg"
                    value={text}
                    onChange={(e) => setDraft({ lang, text: e.target.value })}
                    rows={4}
                    maxLength={MAX_CHARS}
                    className="field mt-1.5"
                    data-autofocus
                  />
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="meta">{t.editNote}</p>
                    <p className={`meta num ${text.length >= MAX_CHARS ? "text-risk-fg" : ""}`}>
                      {text.length}/{MAX_CHARS}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => setEditing(false)} disabled={!text.trim()}>
                      {t.saveWording}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setDraft(null);
                        setEditing(false);
                      }}
                    >
                      {t.discardChanges}
                    </button>
                  </div>
                </div>
              ) : (
                <MessagePreview text={text} merchant={user?.name ?? ""} />
              )}
            </div>

            {proposed && !editing && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button className="btn-primary w-full sm:w-auto" onClick={() => setDialog("approve")} disabled={locked || !text.trim()}>
                  <Icon name="send" className="h-4 w-4" />
                  {t.approveSend}
                </button>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 sm:flex-none" onClick={() => setEditing(true)} disabled={locked}>
                    <Icon name="edit" className="h-4 w-4" />
                    {t.edit}
                  </button>
                  <button className="btn-danger flex-1 sm:flex-none" onClick={() => setDialog("reject")} disabled={locked}>
                    {t.reject}
                  </button>
                </div>
              </div>
            )}
            {sent && (
              <div className="mt-5">
                <Notice tone="ok" title={t.campaignSentTitle}>
                  {t.campaignSimNote}
                </Notice>
              </div>
            )}
            {rejected && (
              <div className="mt-5">
                <Notice tone="info" title={t.campaignRejectedTitle}>
                  {t.campaignRejectedBody}
                </Notice>
              </div>
            )}
          </section>
        )}
      </div>

      {dialog && offer && (
        <CampaignDialog
          offer={offer}
          decision={dialog}
          message={text.trim()}
          edited={edited}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
