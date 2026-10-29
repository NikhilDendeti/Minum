import AlertCard from "../components/AlertCard";
import EarningsCard from "../components/EarningsCard";
import MunimSaysCard from "../components/MunimSaysCard";
import SoundboxDevice from "../components/SoundboxDevice";
import Spinner from "../components/Spinner";
import { useMunim } from "../hooks/useMunim";

export default function Home() {
  const { briefing, briefingState, t } = useMunim();

  if (!briefing) {
    return <div className="p-4">{briefingState === "error" ? <p className="text-red-600">{t.errorGeneric}</p> : <Spinner label={t.loading} />}</div>;
  }
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <EarningsCard kpis={briefing.kpis} />
      <MunimSaysCard briefing={briefing} />
      {briefing.alerts.map((a) => (
        <AlertCard key={a.type} alert={a} />
      ))}
      <div className="pt-2 lg:hidden">
        <SoundboxDevice />
      </div>
    </div>
  );
}
