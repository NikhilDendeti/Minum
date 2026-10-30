import { useAudio } from "../hooks/useAudio";
import { useMunim } from "../hooks/useMunim";
import * as audio from "../lib/audio";
import type { Briefing } from "../types";
import { Icon } from "./ui";

/**
 * The counter Soundbox, simulated: one button plays the chime and then the briefing. It shares its playback state with
 * the "Hear today's briefing" button, and it is labelled as a simulation so nobody mistakes it for the hardware.
 */
export default function Soundbox({ briefing }: { briefing: Briefing }) {
  const { t } = useMunim();
  const clip = useAudio(briefing.audio_url);
  const url = briefing.audio_url;
  const playing = clip.status === "playing";
  const paused = clip.status === "paused";
  const busy = clip.chiming || playing || paused;

  const press = () => {
    if (!url) return;
    if (clip.chiming) return;
    if (playing) clip.pause();
    else if (paused) clip.resume();
    else void audio.playWithChime(url);
  };

  return (
    <section aria-labelledby="sb-h" className="card p-4">
      <h2 id="sb-h" className="sr-only">
        {t.soundboxName}
      </h2>
      <div className="mx-auto w-[210px] rounded-[26px] border border-line-strong bg-canvas p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between text-[12px] font-semibold tracking-wide text-muted">
          <span>{t.soundboxName}</span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${busy ? "bg-brand" : "bg-line-strong"}`}
            role="img"
            aria-label={busy ? t.playing : t.soundboxIdle}
          />
        </div>
        <div
          className="mb-4 h-16 rounded-[14px]"
          style={{ backgroundImage: "radial-gradient(circle, #8a958e 1.3px, transparent 1.5px)", backgroundSize: "9px 9px", backgroundColor: "var(--line)" }}
          aria-hidden
        />
        <button
          onClick={press}
          disabled={!url || clip.chiming}
          aria-label={playing ? t.pause : paused ? t.resume : t.hearBriefing}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-md transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name={playing ? "pause" : "play"} className="h-6 w-6" />
        </button>
        {busy && (
          <button className="mx-auto mt-3 flex min-h-[44px] items-center gap-1.5 rounded-ctl px-3 text-[13px] font-medium text-muted hover:bg-line" onClick={() => audio.stopAll()}>
            <Icon name="stop" className="h-3.5 w-3.5" />
            {t.stop}
          </button>
        )}
      </div>
      <p className="meta mt-3 text-center">{url ? t.soundboxHint : t.briefingNoAudio}</p>
    </section>
  );
}
