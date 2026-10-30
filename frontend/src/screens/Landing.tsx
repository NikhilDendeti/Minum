import { useEffect, useRef, useState, type ReactNode } from "react";
import AudioControl from "../components/AudioControl";
import { Sql } from "../components/Evidence";
import ForecastDraw from "../components/landing/ForecastDraw";
import { CountUp, Reveal, useInView, useTyped } from "../components/landing/motion";
import { AskMini, CashMini, GrowMini, HomeMini, Phone } from "../components/landing/PhoneScreens";
import LanguageSwitcher from "../components/LanguageSwitcher";
import IndiaFlag from "../components/IndiaFlag";
import { Wordmark } from "../components/Shell";
import { Disclosure, Icon } from "../components/ui";
import { useMunim } from "../hooks/useMunim";
import { fmt, inr, shortDate } from "../lib/i18n";
import { DEMO } from "../lib/landingData";
import { CHART } from "../lib/theme";

const goDemo = () => {
  window.location.hash = "/login";
  window.scrollTo({ top: 0 });
};
const scrollToId = (id: string) => {
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
};

function Section({ id, children, tone = "plain" }: { id?: string; children: ReactNode; tone?: "plain" | "soft" }) {
  return (
    <section id={id} className={`scroll-mt-16 py-12 sm:py-24 ${tone === "soft" ? "bg-panel" : ""}`}>
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-10">{children}</div>
    </section>
  );
}

function Heading({ title, sub, center = false }: { title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-navy sm:text-[34px]">{title}</h2>
      {sub && <p className="mt-3 text-[16px] text-muted sm:text-[17px]">{sub}</p>}
    </Reveal>
  );
}

// --- header: transparent at the top, a hairline once you scroll; a thin bar shows how far down you are -------------------
function Header() {
  const { t } = useMunim();
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      setScrolled(window.scrollY > 40);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-200 ${scrolled ? "border-b border-line bg-surface" : "border-b border-transparent bg-canvas"}`}>
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex" aria-label={t.mainNav}>
          <button className="btn-quiet min-h-[40px] text-[14px] text-ink" onClick={() => scrollToId("how")}>
            {t.lpNavHow}
          </button>
          <button className="btn-quiet min-h-[40px] text-[14px] text-ink" onClick={() => scrollToId("trust")}>
            {t.lpNavTrust}
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden w-[210px] sm:block">
            <LanguageSwitcher />
          </div>
          <div className="sm:hidden">
            <LanguageSwitcher variant="select" />
          </div>
          <button className="btn-primary hidden min-h-[40px] py-1.5 text-[14px] md:inline-flex" onClick={goDemo}>
            {t.lpTryDemo}
          </button>
        </div>
      </div>
      <div
        ref={bar}
        className="absolute inset-x-0 bottom-[-1px] h-0.5 origin-left bg-accent"
        style={{ transform: "scaleX(var(--p, 0))" }}
        aria-hidden
      />
    </header>
  );
}

// --- hero ------------------------------------------------------------------------------------------------------------
function Hero() {
  const { t } = useMunim();
  const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });
  return (
    <section className="overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16">
      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:px-10">
        <div>
          <p className="hero-line text-[14px] font-medium text-accent-ink" style={d(0)}>
            {t.lpEyebrow}
          </p>
          <h1 className="hero-line mt-3 text-[38px] font-semibold leading-[1.1] tracking-tight text-navy sm:text-[52px]" style={d(100)}>
            {t.lpHeroTitle}
          </h1>
          <p className="hero-line mt-5 max-w-xl text-[17px] text-muted sm:text-[18px]" style={d(220)}>
            {t.lpHeroSub}
          </p>
          <div className="hero-line mt-8 flex flex-wrap gap-3" style={d(340)}>
            <button className="btn-primary ripple-once relative min-h-[52px] px-6 text-[16px]" onClick={goDemo}>
              {t.lpTryDemo}
            </button>
            <button className="btn-secondary min-h-[52px] px-6 text-[16px]" onClick={() => scrollToId("how")}>
              {t.lpSeeHow}
            </button>
          </div>
          <p className="hero-line meta mt-5" style={d(440)}>
            {t.lpHeroNote}
          </p>
        </div>
        <div className="hero-line rounded-[40px] bg-panel px-4 py-10 sm:px-10" style={d(300)}>
          <Phone className="lg:rotate-[1.5deg]">
            <HomeMini />
          </Phone>
        </div>
      </div>
    </section>
  );
}

// --- the problem -----------------------------------------------------------------------------------------------------
function Problem() {
  const { t } = useMunim();
  const items = [
    [t.lpQ1, t.lpQ1a],
    [t.lpQ2, t.lpQ2a],
    [t.lpQ3, t.lpQ3a],
  ];
  return (
    <Section tone="soft">
      <Heading title={t.lpProblemTitle} sub={t.lpProblemSub} />
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {items.map(([q, a], i) => (
          <Reveal as="li" key={q} delay={i * 120} className="relative border-l-2 border-brand pl-5">
            <p className="text-[20px] font-semibold leading-snug text-navy">{q}</p>
            <p className="mt-2 text-[15px] text-muted">{a}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

// --- how it works: a phone stays put while the four steps scroll past -----------------------------------------------
function HowItWorks() {
  const { t } = useMunim();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const steps = [
    { title: t.lpStep1T, body: t.lpStep1B },
    { title: t.lpStep2T, body: t.lpStep2B },
    { title: t.lpStep3T, body: t.lpStep3B },
    { title: t.lpStep4T, body: t.lpStep4B },
  ];
  const screen = (i: number) => (i === 0 ? <HomeMini /> : i === 1 ? <AskMini /> : i === 2 ? <CashMini play /> : <GrowMini />);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Section id="how">
      <Heading title={t.lpHowTitle} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
        <div className="relative">
          <div className="absolute bottom-0 left-[15px] top-0 hidden w-px bg-line lg:block" aria-hidden>
            <div className="w-full origin-top bg-brand transition-transform duration-500 ease-out" style={{ height: "100%", transform: `scaleY(${(active + 1) / steps.length})` }} />
          </div>
          <ol className="space-y-12 lg:space-y-0">
            {steps.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => (stepRefs.current[i] = el)}
                data-i={i}
                className="relative flex flex-col justify-center gap-6 lg:min-h-[68vh] lg:pl-14"
              >
                <span
                  className={`absolute left-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border text-[14px] font-semibold transition-colors duration-300 lg:flex ${
                    active >= i ? "border-brand bg-brand text-brand-on" : "border-line-strong bg-surface text-muted"
                  }`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className={`transition-opacity duration-500 ${active === i ? "lg:opacity-100" : "lg:opacity-40"}`}>
                  <h3 className="text-[26px] font-semibold text-navy">
                    <span className="mr-2 text-navy lg:hidden">{i + 1}.</span>
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-md text-[16px] text-muted">{s.body}</p>
                </div>
                <div className="lg:hidden">
                  <Phone>{screen(i)}</Phone>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <Phone tall>
              <div className="relative h-full">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${active === i ? "opacity-100" : "opacity-0"}`}>
                    {i === 0 ? <HomeMini /> : i === 1 ? <AskMini /> : i === 2 ? <CashMini play={active >= 2} /> : <GrowMini />}
                  </div>
                ))}
              </div>
            </Phone>
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- ask: a real question types itself, the answer arrives, the real SQL opens ------------------------------------------
function AskDemo() {
  const { t, lang } = useMunim();
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const a = DEMO.ask[lang as keyof typeof DEMO.ask] ?? DEMO.ask["en-IN"];
  const { shown, done } = useTyped(a.q, seen);
  const [showSql, setShowSql] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setShowSql(true), 1100);
    return () => window.clearTimeout(id);
  }, [done]);
  const rows = DEMO.evidence.rows;
  return (
    <Section tone="soft">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Heading title={t.lpAskTitle} sub={t.lpAskSub} />
        <div ref={ref} className="card overflow-hidden p-4 shadow-md sm:p-6">
          <p className="meta">{t.youAsked}</p>
          <p className="min-h-[28px] text-[18px] font-medium" aria-live="off">
            {shown}
            {!done && <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-ink" aria-hidden />}
          </p>
          <div className={`mt-4 transition-all duration-500 ${done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            <div className="rounded-ctl bg-canvas p-4">
              <p className="text-[17px] font-medium leading-relaxed">{a.a}</p>
            </div>
            <p className="meta mt-3">{fmt(t.evidenceMany, { n: rows.length })}</p>
            <p className="mt-1 flex items-center gap-1 text-[14px] font-medium text-navy">
              <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${showSql ? "rotate-180" : ""}`} />
              {showSql ? t.hideEvidence : t.viewEvidence}
            </p>
            <Disclosure open={showSql}>
              <div className="space-y-3 pt-3">
                <Sql sql={DEMO.evidence.sql} />
                <div className="overflow-x-auto rounded-ctl border border-line">
                  <table className="w-full border-collapse text-[13px]">
                    <thead className="bg-canvas">
                      <tr>
                        {["day", "earned", "txns"].map((c) => (
                          <th key={c} className="px-3 py-2 text-left font-semibold" lang="en">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.day} className="border-t border-line">
                          <td className="num px-3 py-1.5 font-mono">{r.day}</td>
                          <td className="num px-3 py-1.5 font-mono">{r.earned}</td>
                          <td className="num px-3 py-1.5 font-mono">{r.txns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Disclosure>
          </div>
        </div>
      </div>
      <p className="meta mt-4 lg:text-right">{t.lpAskNote}</p>
    </Section>
  );
}

// --- cash: the demo forecast draws itself --------------------------------------------------------------------------------
function CashDemo() {
  const { t, lang } = useMunim();
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  const gap = DEMO.forecast.gap;
  const offer = DEMO.forecast.offer.amount;
  const facts = [
    [t.lpFactFirst, shortDate(gap.date, lang)],
    [t.lpFactLowest, inr(gap.min)],
    [t.lpFactCredit, inr(gap.min + offer)],
  ];
  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div ref={ref} className="card order-2 p-4 shadow-md sm:p-6 lg:order-1">
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <li className="flex items-center gap-2">
              <svg width="28" height="10" aria-hidden>
                <line x1="1" y1="5" x2="27" y2="5" stroke={CHART.base} strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round" />
              </svg>
              {t.legendBase}
            </li>
            <li className="flex items-center gap-2">
              <svg width="28" height="10" aria-hidden>
                <line x1="1" y1="5" x2="27" y2="5" stroke={CHART.credit} strokeWidth="3" strokeDasharray="1 6" strokeLinecap="round" />
              </svg>
              {t.legendCredit}
            </li>
          </ul>
          <ForecastDraw play={seen} />
          <p className="meta mt-2">{t.lpCashNote}</p>
        </div>
        <div className="order-1 lg:order-2">
          <Heading title={t.lpCashTitle} sub={t.lpCashSub} />
          <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-surface">
            {facts.map(([k, v], i) => (
              <Reveal key={k} delay={i * 100} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className="num text-[18px] font-semibold text-navy">{v}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

// --- grow: the real count rises, the message previews ----------------------------------------------------------------------
function GrowDemo() {
  const { t, lang, user } = useMunim();
  const promo = DEMO.promo[lang as keyof typeof DEMO.promo] ?? DEMO.promo["en-IN"];
  return (
    <Section tone="soft">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <Heading title={t.lpGrowTitle} sub={t.lpGrowSub} />
          <Reveal delay={150} className="mt-8">
            <p className="text-[64px] font-semibold leading-none tracking-tight text-navy sm:text-[80px]">
              <CountUp to={DEMO.growth.count} format={(n) => String(n)} />
            </p>
            <p className="mt-1 text-[16px]">{t.segment}</p>
            <p className="meta mt-1">{t.ruleText}</p>
          </Reveal>
        </div>
        <Reveal delay={100} className="card p-4 shadow-md sm:p-6">
          <p className="meta">{t.previewTitle}</p>
          <div className="mt-2 rounded-ctl border border-line bg-canvas p-4">
            <p className="text-[13px] font-semibold text-muted">{user?.name ?? "Lakshmi Kirana"}</p>
            <p className="mt-1 text-[16px] leading-relaxed" lang={lang}>
              {promo}
            </p>
          </div>
          <div aria-hidden className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl bg-brand px-4 text-[15px] font-semibold text-brand-on">
              <Icon name="send" className="h-4 w-4" />
              {t.approveSend}
            </span>
            <span className="inline-flex min-h-[44px] items-center gap-2 rounded-ctl border border-line-strong px-4 text-[15px] font-semibold">{t.edit}</span>
            <span className="inline-flex min-h-[44px] items-center rounded-ctl border border-risk-line px-4 text-[15px] font-semibold text-risk-fg">{t.reject}</span>
          </div>
          <p className="meta mt-3">{t.lpGrowControl}</p>
        </Reveal>
      </div>
    </Section>
  );
}

// --- trust -------------------------------------------------------------------------------------------------------------------
function Trust() {
  const { t } = useMunim();
  const items = [
    [t.lpTrust1T, t.lpTrust1B],
    [t.lpTrust2T, t.lpTrust2B],
    [t.lpTrust3T, t.lpTrust3B],
  ];
  return (
    <Section id="trust">
      <Heading title={t.lpTrustTitle} />
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {items.map(([title, body], i) => (
          <TrustItem key={title} title={title} body={body} delay={i * 130} />
        ))}
      </ul>
    </Section>
  );
}

function TrustItem({ title, body, delay }: { title: string; body: string; delay: number }) {
  const [ref, seen] = useInView<HTMLLIElement>(0.3);
  return (
    <li ref={ref} className={`card reveal p-5 ${seen ? "is-in" : ""}`} style={{ ["--d" as string]: `${delay}ms` }}>
      <span className={`check-draw flex h-9 w-9 items-center justify-center rounded-full bg-ok-bg text-ok-fg ${seen ? "is-in" : ""}`} style={{ ["--d" as string]: `${delay + 250}ms` }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h3 className="mt-4 text-[18px] font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 text-[15px] text-muted">{body}</p>
    </li>
  );
}

// --- voice and languages: the real briefing clips ------------------------------------------------------------------------------
function Voice() {
  const { t, lang } = useMunim();
  const clips = [
    { code: "en-IN", name: "English", native: "English" },
    { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
    { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  ];
  return (
    <Section tone="soft">
      <Heading title={t.lpVoiceTitle} sub={t.lpVoiceSub} />
      <ul className="mt-10 grid gap-5 lg:grid-cols-3">
        {clips.map((c, i) => (
          <Reveal as="li" key={c.code} delay={i * 120} className={`card flex flex-col gap-3 p-5 ${c.code === lang ? "border-brand" : ""}`}>
            <p className="text-[18px] font-semibold text-navy" lang={c.code}>
              {c.native}
            </p>
            <p className="flex-1 text-[15px] leading-relaxed" lang={c.code}>
              {DEMO.briefing[c.code as keyof typeof DEMO.briefing]}
            </p>
            <AudioControl url={`/audio/briefing-${c.code}.wav`} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

// --- real vs simulated ----------------------------------------------------------------------------------------------------------
function RealVsSimulated() {
  const { t } = useMunim();
  const real = [t.lpReal1, t.lpReal2, t.lpReal3, t.lpReal4, t.lpReal5];
  const sim = [t.lpSim1, t.lpSim2, t.lpSim3];
  return (
    <Section>
      <Heading title={t.lpRealTitle} />
      <div className="mt-10 grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <Reveal className="card p-5">
          <h3 className="text-[17px] font-semibold text-ok-fg">{t.lpRealHead}</h3>
          <ul className="mt-3 space-y-2.5">
            {real.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-[15px]">
                <Icon name="check" className="mt-0.5 h-4 w-4 text-ok-fg" />
                {r}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className="card p-5">
          <h3 className="text-[17px] font-semibold text-warn-fg">{t.lpSimHead}</h3>
          <ul className="mt-3 space-y-2.5">
            {sim.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-[15px]">
                <Icon name="flask" className="mt-0.5 h-4 w-4 text-warn-fg" />
                {r}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

// --- the five planted stories ---------------------------------------------------------------------------------------------------
function Story() {
  const { t } = useMunim();
  const stories = [t.lpStory1, t.lpStory2, t.lpStory3, t.lpStory4, t.lpStory5];
  return (
    <Section tone="soft">
      <Heading title={t.lpStoryTitle} />
      <ol className="relative mt-10 max-w-2xl space-y-6 border-l border-line-strong pl-8">
        {stories.map((s, i) => (
          <Reveal as="li" key={s} delay={i * 90} className="relative">
            <span className="absolute -left-[45px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-brand bg-surface text-[13px] font-semibold text-navy" aria-hidden>
              {i + 1}
            </span>
            <p className="text-[16px]">{s}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

// --- under the hood ------------------------------------------------------------------------------------------------------------------
function Tech() {
  const { t } = useMunim();
  const nodes = [
    ["React app", "Responsive, voice and text"],
    ["Django REST API", "Sessions, one merchant per login"],
    ["LangGraph agents", "Router → insights | cashflow | growth → approval gate"],
    ["PostgreSQL", "SELECT-only role, row-level security"],
  ];
  return (
    <Section>
      <Heading title={t.lpTechTitle} sub={t.lpTechSub} />
      <ol className="mt-10 grid gap-3 md:grid-cols-4" lang="en">
        {nodes.map(([n, d], i) => (
          <Reveal as="li" key={n} delay={i * 110} className="card relative p-4">
            <p className="font-semibold text-navy">{n}</p>
            <p className="mt-1 text-[14px] text-muted">{d}</p>
            {i < nodes.length - 1 && (
              <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 text-muted md:-right-3.5 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2 md:translate-x-0" aria-hidden>
                <Icon name="chevron" className="h-5 w-5 md:-rotate-90" />
              </span>
            )}
          </Reveal>
        ))}
      </ol>
      <Reveal delay={200} className="mt-5 flex flex-wrap gap-2 text-[14px]">
        {["Sarvam speech in and out", "GPT-4o for free-form questions", "Pre-recorded fallback clips"].map((x) => (
          <span key={x} className="rounded-full border border-line bg-surface px-3 py-1" lang="en">
            {x}
          </span>
        ))}
      </Reveal>
    </Section>
  );
}

function FinalCta() {
  const { t } = useMunim();
  return (
    <section className="bg-brand py-16 text-brand-on sm:py-24">
      <div className="mx-auto max-w-[1120px] px-4 text-center sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-[28px] font-semibold leading-tight tracking-tight sm:text-[38px]">{t.lpCtaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-brand-on">{t.lpCtaSub}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button className="btn min-h-[52px] bg-white px-6 text-[16px] text-brand-on hover:bg-canvas" onClick={goDemo}>
              {t.lpTryDemo}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter() {
  const { t } = useMunim();
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Wordmark onDark />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary min-h-[44px] py-1.5 text-[14px]" onClick={goDemo}>
              {t.lpTryDemo}
            </button>
          </div>
        </div>

        <p className="mt-8 flex items-start gap-3 text-[22px] font-semibold leading-snug sm:text-[26px]">
          <IndiaFlag className="mt-1.5 h-[22px] w-[33px] sm:h-6 sm:w-9" label={t.lpFlagLabel} />
          {t.lpMadeFor}
        </p>

        <ul className="mt-6 flex flex-col gap-2 border-t border-white/20 pt-6 text-[14px] text-white/85 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
          {[
            <span key="c" className="inline-flex items-center gap-2">
              <IndiaFlag className="h-3.5 w-[21px]" />
              {t.lpCrafted}
            </span>,
            <span key="t">{t.lpTeam}</span>,
            <span key="l">
              <span lang="en">English</span> · <span lang="hi">हिन्दी</span> · <span lang="te">తెలుగు</span>
            </span>,
          ].map((item, i) => (
            <li key={i} className="sm:[&:not(:first-child)]:before:mr-3 sm:[&:not(:first-child)]:before:content-['·']">
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-4 max-w-3xl text-[13px] text-white/75">{t.lpDisclaimer}</p>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <AskDemo />
        <CashDemo />
        <GrowDemo />
        <Trust />
        <Voice />
        <RealVsSimulated />
        <Story />
        <Tech />
      </main>
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
