import BalanceChart from "../components/BalanceChart";
import ObligationList from "../components/ObligationList";
import OfferCard from "../components/OfferCard";
import Spinner from "../components/Spinner";
import VoiceApprove from "../components/VoiceApprove";
import { useMunim } from "../hooks/useMunim";
import { inr, shortDate } from "../lib/i18n";

export default function CashFlow() {
  const { forecast, forecastState, offers, t } = useMunim();

  if (!forecast) {
    return <div className="p-4">{forecastState === "error" ? <p className="text-red-600">{t.errorGeneric}</p> : <Spinner label={t.loading} />}</div>;
  }
  const gap = forecast.gap;
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-navy">{t.cashForecast}</h2>
        {gap ? (
          <p className="mt-1 text-sm font-medium text-red-600">
            {t.gapDay}: {shortDate(gap.first_negative_date)} · {inr(gap.min_balance)}
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-emerald-700">{t.noGap}</p>
        )}
        <BalanceChart forecast={forecast} />
      </section>
      {forecast.offer && <OfferCard offer={forecast.offer} />}
      {forecast.offer && (offers[forecast.offer.id] ?? forecast.offer).status === "proposed" && <VoiceApprove offerId={forecast.offer.id} />}
      <ObligationList obligations={forecast.obligations} />
    </div>
  );
}
