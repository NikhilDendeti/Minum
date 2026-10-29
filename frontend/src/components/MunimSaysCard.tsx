import { useMunim } from "../hooks/useMunim";
import type { Briefing } from "../types";
import AudioPlayer from "./AudioPlayer";

/** The spoken briefing, shown as text too (subtitles for the room). */
export default function MunimSaysCard({ briefing }: { briefing: Briefing }) {
  const { t } = useMunim();
  return (
    <section className="rounded-2xl bg-navy p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">{t.munimSays}</p>
        <AudioPlayer url={briefing.audio_url} onDark />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed">{briefing.text_local}</p>
    </section>
  );
}
