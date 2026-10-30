import { useMunim } from "../hooks/useMunim";

/** One short message at the bottom of the screen (signed in or not). `inShell` leaves room for the desktop sidebar. */
export default function Toast({ inShell = false }: { inShell?: boolean }) {
  const { toast } = useMunim();
  return (
    <div
      aria-live="polite"
      role="status"
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 ${inShell ? "bottom-[72px] lg:bottom-6 lg:left-[232px]" : "bottom-6"}`}
    >
      {toast && <p className="pointer-events-auto max-w-md animate-rise rounded-ctl bg-navy px-4 py-2.5 text-center text-[14px] text-white shadow-lg">{toast}</p>}
    </div>
  );
}
