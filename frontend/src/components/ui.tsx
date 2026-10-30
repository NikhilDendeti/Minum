import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMunim } from "../hooks/useMunim";

// --- icons: one small stroke set so every control looks like it belongs ---------------------------------------------
const PATHS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  cash: (
    <>
      <path d="M3 17l5-5 4 4 8-9" />
      <path d="M15 7h5v5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M17 8h4M19 6v4" />
    </>
  ),
  play: <path d="M7 4l13 8-13 8z" fill="currentColor" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" strokeWidth="3" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v5h5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warn: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  offline: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.5M19 12.5a10 10 0 0 0-5.5-2.9M12 20h.01" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-3-7z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  logout: (
    <>
      <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
    </>
  ),
  trend: <path d="M3 17l4-4 3 3 4-6 3 3 4-5" strokeDasharray="3 3" />, // dashed on purpose: forecast, not fact
  flask: <path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 19l-6-10V3" />,
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

// --- status labels: meaning is in the words and the icon, colour only reinforces it ---------------------------------
export type Tone = "ok" | "warn" | "risk" | "forecast" | "neutral";
const TONE: Record<Tone, { cls: string; icon: IconName }> = {
  ok: { cls: "border-ok-line bg-ok-bg text-ok-fg", icon: "check" },
  warn: { cls: "border-warn-line bg-warn-bg text-warn-fg", icon: "clock" },
  risk: { cls: "border-risk-line bg-risk-bg text-risk-fg", icon: "warn" },
  forecast: { cls: "border-fc-line bg-fc-bg text-fc-fg", icon: "trend" },
  neutral: { cls: "border-line bg-canvas text-muted", icon: "info" },
};

export function StatusLabel({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: IconName }) {
  const s = TONE[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${s.cls}`}>
      <Icon name={icon ?? s.icon} className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** "Demo" marker for every action that does not touch a real system. */
export function SimulatedTag() {
  const { t } = useMunim();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-0.5 text-[13px] font-medium text-muted" title={t.simulatedHint}>
      <Icon name="flask" className="h-3.5 w-3.5" />
      {t.simulated}
    </span>
  );
}

// --- inline notice -------------------------------------------------------------------------------------------------
const NOTICE: Record<Exclude<Tone, "neutral" | "forecast"> | "info", string> = {
  ok: "border-ok-line bg-ok-bg text-ok-fg",
  warn: "border-warn-line bg-warn-bg text-warn-fg",
  risk: "border-risk-line bg-risk-bg text-risk-fg",
  info: "border-line bg-canvas text-ink",
};
export function Notice({
  tone = "info",
  title,
  children,
  action,
  live = false,
}: {
  tone?: keyof typeof NOTICE;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  live?: boolean;
}) {
  const icon: IconName = tone === "ok" ? "check" : tone === "warn" ? "clock" : tone === "risk" ? "warn" : "info";
  return (
    <div role={live ? "alert" : undefined} className={`flex items-start gap-3 rounded-card border p-3 text-[14px] ${NOTICE[tone]}`}>
      <Icon name={icon} className="mt-0.5 h-5 w-5" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-ctl bg-line ${className}`} aria-hidden />;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-6 text-center">
      <p className="section-title">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeading({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="meta mt-1">{sub}</p>}
      </div>
      {aside}
    </header>
  );
}

// --- animated disclosure -------------------------------------------------------------------------------------------
export function Disclosure({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  return (
    <div className="disclosure" data-open={open} id={id} aria-hidden={!open}>
      <div>{open ? children : null}</div>
    </div>
  );
}

// --- dialog: bottom sheet on phones, centred on larger screens; traps focus and closes on Escape --------------------
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Dialog({
  title,
  onClose,
  busy = false,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useMunim();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current!;
    const first = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root).focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return e.preventDefault();
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) (e.preventDefault(), z.focus());
      else if (!e.shiftKey && document.activeElement === z) (e.preventDefault(), a.focus());
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  // in a portal so no animated or transformed ancestor can trap it beneath the navigation
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade bg-forest/50" onClick={() => !busy && onClose()} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-2xl bg-surface shadow-xl outline-none sm:max-w-lg sm:rounded-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 id={titleId} className="section-title">
            {title}
          </h2>
          <button className="btn-quiet -mr-2 min-w-[44px] px-2 text-muted" onClick={onClose} disabled={busy} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
