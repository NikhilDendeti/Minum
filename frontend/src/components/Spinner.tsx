import { useEffect, useState } from "react";
import { useMunim } from "../hooks/useMunim";

const CAP_MS = 6000;

/** Spinner that, after 6 s, stops pretending and shows `partial` (or a "taking longer" note). */
export default function Spinner({ label, partial }: { label?: string; partial?: string }) {
  const { t } = useMunim();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), CAP_MS);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-paytm border-t-transparent" />
      <span>{slow ? partial ?? t.slowNote : label ?? t.thinking}</span>
    </div>
  );
}
