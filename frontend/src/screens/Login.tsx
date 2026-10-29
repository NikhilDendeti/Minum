import { useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useMunim } from "../hooks/useMunim";
import { ApiError } from "../lib/api";

/** Mobile number + one-time code. In demo mode the code is shown on screen and demo accounts sign in with one tap. */
export default function Login() {
  const { t, requestOtp, login, loginDemo, demoAccounts } = useMunim();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [busy, setBusy] = useState<"" | "sending" | "signing">("");
  const [error, setError] = useState("");

  const message = (e: unknown) => (e instanceof ApiError ? e.messageLocal ?? e.message : t.errorGeneric);
  const digits = phone.replace(/\D/g, "");

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy("sending");
    try {
      setDevOtp(await requestOtp(digits));
      setStep("code");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy("signing");
    try {
      await login(digits, otp);
    } catch (err) {
      setError(message(err));
      setBusy("");
    }
  };

  const demo = async (p: string) => {
    setError("");
    setBusy("signing");
    try {
      await loginDemo(p);
    } catch (err) {
      setError(message(err));
      setBusy("");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">{t.loginTitle}</h1>
        <LanguageSwitcher />
      </div>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-sm font-medium text-ink" htmlFor="phone">
            {t.phoneLabel}
          </label>
          <input
            id="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 00001"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-wide outline-none focus:border-paytm"
          />
          <button
            type="submit"
            disabled={digits.length < 10 || busy !== ""}
            className="w-full rounded-xl bg-paytm py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy === "sending" ? t.sending : t.getCode}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block text-sm font-medium text-ink" htmlFor="otp">
            {t.codeLabel} · +91 {digits}
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-paytm"
          />
          {devOtp && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t.demoCode}: <span className="font-mono font-semibold">{devOtp}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={otp.length < 6 || busy !== ""}
            className="w-full rounded-xl bg-paytm py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy === "signing" ? t.signingIn : t.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-slate-500 underline"
          >
            {t.changeNumber}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {demoAccounts.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.demoAccounts}</p>
          {demoAccounts.map((a) => (
            <button
              key={a.phone}
              onClick={() => void demo(a.phone)}
              disabled={busy !== ""}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm active:bg-sky-50 disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold text-navy">{a.name}</span>
                <span className="block text-xs text-slate-500">{a.city}</span>
              </span>
              <span className="text-xs text-slate-400">{a.phone}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
