import { useEffect, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ResetDemo from "../components/ResetDemo";
import Toast from "../components/Toast";
import { Wordmark } from "../components/Shell";
import { Icon, Notice, Spinner } from "../components/ui";
import { useMunim } from "../hooks/useMunim";
import { ApiError } from "../lib/api";
import { fmt } from "../lib/i18n";

const RESEND_SECONDS = 30;
const validPhone = (digits: string) => /^[6-9]\d{9}$/.test(digits);

/** Mobile number + one-time code. In demo mode the code is shown on screen and the demo merchants sign in with one tap. */
export default function Login() {
  const { t, requestOtp, login, loginDemo, demoAccounts, offline } = useMunim();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [busy, setBusy] = useState<"" | "sending" | "signing">("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const digits = phone.replace(/\D/g, "").slice(-10);
  const phoneError = touched && !validPhone(digits) ? t.phoneInvalid : "";

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const message = (e: unknown) =>
    e instanceof ApiError ? (e.code === "network" ? t.errorOffline : e.messageLocal ?? e.message) : t.errorGeneric;

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    if (!validPhone(digits) || busy) return;
    setError("");
    setBusy("sending");
    try {
      setDevOtp(await requestOtp(digits));
      setStep("code");
      setOtp("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6 || busy) return;
    setError("");
    setBusy("signing");
    try {
      await login(digits, otp);
    } catch (err) {
      setError(message(err));
      setOtp("");
      setBusy("");
    }
  };

  const demo = async (p: string) => {
    if (busy) return;
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6 sm:py-12">
      <button className="btn-quiet -ml-3 w-fit" onClick={() => (window.location.hash = "/")}>
        <Icon name="chevron" className="h-4 w-4 rotate-90" />
        {t.lpBack}
      </button>
      <header className="flex items-center justify-between gap-3">
        <Wordmark />
        <LanguageSwitcher variant="select" />
      </header>

      <div>
        <h1 className="page-title">{t.loginTitle}</h1>
        <p className="mt-2 text-[15px] text-muted">{t.loginSub}</p>
      </div>

      {offline && <Notice tone="warn" live>{t.errorOffline}</Notice>}

      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-3" noValidate>
          {demoAccounts.length > 0 && <Notice tone="info">{t.loginDemoOnly}</Notice>}
          <label className="block text-[15px] font-medium" htmlFor="phone">
            {t.phoneLabel}
          </label>
          <div className={`flex items-stretch overflow-hidden rounded-ctl border bg-surface focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--focus)] ${phoneError ? "border-risk-fg" : "border-line-strong"}`}>
            <span className="num flex items-center border-r border-line bg-canvas px-3 text-[16px] text-muted" aria-hidden>
              +91
            </span>
            <input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => phone && setTouched(true)}
              placeholder="98765 00001"
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? "phone-err" : "phone-help"}
              className="num min-h-[48px] min-w-0 flex-1 bg-transparent px-3 text-[18px] tracking-wide outline-none placeholder:text-muted"
            />
          </div>
          {phoneError ? (
            <p id="phone-err" role="alert" className="text-[14px] text-risk-fg">
              {phoneError}
            </p>
          ) : (
            <p id="phone-help" className="meta">
              {t.phoneHelp}
            </p>
          )}
          <button type="submit" disabled={busy !== "" || offline} className="btn-primary w-full">
            {busy === "sending" && <Spinner />}
            {busy === "sending" ? t.sending : t.getCode}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block text-[15px] font-medium" htmlFor="otp">
            {t.codeLabel} · <span className="num">+91 {digits}</span>
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            aria-describedby={error ? "login-err" : undefined}
            aria-invalid={!!error}
            className="field num text-center text-[26px] tracking-[0.5em]"
          />
          {devOtp && (
            <Notice tone="info">
              {t.demoCode}: <span className="num font-semibold">{devOtp}</span>. {t.demoCodeNote}
            </Notice>
          )}
          <button type="submit" disabled={otp.length < 6 || busy !== "" || offline} className="btn-primary w-full">
            {busy === "signing" && <Spinner />}
            {busy === "signing" ? t.signingIn : t.verify}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="btn-quiet"
            >
              {t.changeNumber}
            </button>
            <button type="button" onClick={() => void sendCode()} disabled={cooldown > 0 || busy !== ""} className="btn-quiet">
              {cooldown > 0 ? fmt(t.resendIn, { s: cooldown }) : t.resendCode}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p id="login-err" role="alert" className="flex items-start gap-2 rounded-ctl border border-risk-line bg-risk-bg px-3 py-2 text-[14px] text-risk-fg">
          <Icon name="warn" className="mt-0.5 h-4 w-4" />
          {error}
        </p>
      )}

      {demoAccounts.length > 0 && (
        <section aria-labelledby="demo-h" className="space-y-3 border-t border-line pt-6">
          <div>
            <h2 id="demo-h" className="section-title">
              {t.demoMerchants}
            </h2>
            <p className="meta mt-1">{t.demoMerchantsNote}</p>
          </div>
          <ul className="space-y-2">
            {demoAccounts.map((a) => (
              <li key={a.phone}>
                <button
                  onClick={() => void demo(a.phone)}
                  disabled={busy !== "" || offline}
                  className="card flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy">{a.name}</span>
                    <span className="meta block">{a.city}</span>
                  </span>
                  <span className="num meta shrink-0">{a.phone}</span>
                </button>
              </li>
            ))}
          </ul>
          <ResetDemo className="btn-quiet -ml-3 min-h-[44px] text-[14px] underline" />
        </section>
      )}
      <Toast />
    </div>
  );
}
