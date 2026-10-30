import { useMunim } from "../hooks/useMunim";
import { fmt, inr } from "../lib/i18n";
import type { Offer } from "../types";
import ConfirmDialog, { SummaryList } from "./ConfirmDialog";
import { Notice } from "./ui";

export const channelLabel = (channel: unknown, t: ReturnType<typeof useMunim>["t"]) => (channel === "paytm_app_notification" ? t.channelPaytm : String(channel ?? "—"));

/** Message as it will appear to a customer: a notification card, not a chat bubble. */
export function MessagePreview({ text, merchant }: { text: string; merchant: string }) {
  const { t } = useMunim();
  return (
    <div className="rounded-card border border-line bg-canvas p-3">
      <p className="meta mb-1.5">{t.previewTitle}</p>
      <div className="rounded-ctl border border-line bg-surface p-3 shadow-sm">
        <p className="text-[13px] font-semibold text-muted">{merchant}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export function CreditDialog({ offer, decision, onClose }: { offer: Offer; decision: "approve" | "reject"; onClose: () => void }) {
  const { t } = useMunim();
  const p = offer.payload;
  const approve = decision === "approve";
  return (
    <ConfirmDialog
      offer={offer}
      decision={decision}
      title={approve ? t.creditConfirmTitle : t.creditDeclineTitle}
      confirmLabel={approve ? t.creditConfirmBtn : t.creditDeclineBtn}
      approvedTitle={t.statusApproved}
      successNote={t.creditSimNote}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-[15px]">{approve ? t.creditConfirmIntro : t.creditDeclineIntro}</p>
        <SummaryList
          rows={[
            { label: t.amount, value: <span className="num font-semibold">{inr(Number(p.amount))}</span> },
            { label: t.term, value: fmt(t.daysN, { n: Number(p.tenure_days) }) },
            { label: t.interestFees, value: <span className="text-muted">{t.notProvided}</span> },
            { label: t.repayment, value: <span className="text-muted">{t.notProvided}</span> },
          ]}
        />
        <Notice tone="info">{t.demoActionNote}</Notice>
      </div>
    </ConfirmDialog>
  );
}

export function CampaignDialog({
  offer,
  decision,
  message,
  edited,
  onClose,
}: {
  offer: Offer;
  decision: "approve" | "reject";
  message: string;
  edited: boolean;
  onClose: () => void;
}) {
  const { t, user } = useMunim();
  const p = offer.payload;
  const approve = decision === "approve";
  return (
    <ConfirmDialog
      offer={offer}
      decision={decision}
      message={approve && edited ? message : undefined}
      title={approve ? t.campaignConfirmTitle : t.campaignRejectTitle}
      confirmLabel={approve ? t.campaignConfirmBtn : t.campaignRejectBtn}
      approvedTitle={t.statusSent}
      successNote={t.campaignSimNote}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-[15px]">{approve ? t.campaignConfirmIntro : t.campaignRejectIntro}</p>
        {approve && <MessagePreview text={message} merchant={user?.name ?? ""} />}
        <SummaryList
          rows={[
            { label: t.audience, value: fmt(t.audienceLine, { n: Number(p.reach) }) },
            { label: t.channel, value: channelLabel(p.channel, t) },
            { label: t.incentive, value: fmt(t.offerLine, { pct: Number(p.discount_pct), days: Number(p.valid_days) }) },
          ]}
        />
        {approve && <Notice tone="info">{t.demoActionNote}</Notice>}
      </div>
    </ConfirmDialog>
  );
}
