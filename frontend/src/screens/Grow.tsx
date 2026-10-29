import PromoCard from "../components/PromoCard";
import SegmentCard from "../components/SegmentCard";
import Spinner from "../components/Spinner";
import VoiceApprove from "../components/VoiceApprove";
import { useMunim } from "../hooks/useMunim";

export default function Grow() {
  const { growth, growthState, offers, t } = useMunim();

  if (!growth) {
    return <div className="p-4">{growthState === "error" ? <p className="text-red-600">{t.errorGeneric}</p> : <Spinner label={t.loading} />}</div>;
  }
  const offer = growth.offer ? offers[growth.offer.id] ?? growth.offer : null;
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <SegmentCard segment={growth.segment} />
      {offer && <PromoCard offer={offer} />}
      {offer?.status === "proposed" && <VoiceApprove offerId={offer.id} />}
    </div>
  );
}
