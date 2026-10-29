import { useEffect, useState } from "react";
import * as audio from "../lib/audio";
import { useMunim } from "../hooks/useMunim";

/** Play/stop button for one clip. All clips share a single <audio> element (lib/audio.ts). */
export default function AudioPlayer({ url, label, onDark = false }: { url: string | null | undefined; label?: string; onDark?: boolean }) {
  const { t } = useMunim();
  const [mine, setMine] = useState(false);
  useEffect(
    () =>
      audio.subscribe((playing) => {
        setMine(playing && audio.currentUrl() === url);
      }),
    [url],
  );
  if (!url) return null;
  return (
    <button
      onClick={() => (mine ? audio.stop() : void audio.playUrl(url))}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        onDark ? "bg-white/15 text-white hover:bg-white/25" : "bg-paytm/10 text-navy"
      }`}
      aria-label={mine ? t.stop : t.play}
    >
      <span aria-hidden>{mine ? "■" : "▶"}</span>
      {label ?? (mine ? t.stop : t.play)}
    </button>
  );
}
