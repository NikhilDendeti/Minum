import { useState } from "react";
import { useAudio } from "../hooks/useAudio";
import { useMunim } from "../hooks/useMunim";
import * as audio from "../lib/audio";
import type { Briefing } from "../types";
import { Disclosure, Icon, Notice } from "./ui";

/** "Hear today's briefing": Soundbox chime (simulated), then the spoken briefing, with the transcript always on screen. */
export default function BriefingPlayer({ briefing }: { briefing: Briefing }) {
  const { t } = useMunim();
  const clip = useAudio(briefing.audio_url);
  const [textOpen, setTextOpen] = useState(!briefing.audio_url); // the transcript is open when there is no audio to listen to
  const chime = clip.chiming;

  const start = async () => {
    setTextOpen(true); // subtitles appear as soon as the briefing starts
    if (briefing.audio_url) await audio.playWithChime(briefing.audio_url);
  };
  const stop = () => audio.stopAll();

  const playing = clip.status === "playing";
  const paused = clip.status === "paused";
  const busy = chime || playing || paused;
  const primary = chime
    ? { label: t.playingChime, icon: "play" as const, run: () => undefined, disabled: true }
    : playing
      ? { label: t.pause, icon: "pause" as const, run: clip.pause, disabled: false }
      : paused
        ? { label: t.resume, icon: "play" as const, run: clip.resume, disabled: false }
        : clip.status === "ended"
          ? { label: t.hearAgain, icon: "replay" as const, run: () => void start(), disabled: false }
          : { label: t.hearBriefing, icon: "play" as const, run: () => void start(), disabled: false };
  const progress = clip.duration > 0 ? Math.min(100, (clip.time / clip.duration) * 100) : 0;

  return (
    <div className="space-y-3">
      {briefing.audio_url ? (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={primary.run} disabled={primary.disabled} aria-describedby="briefing-note">
            <Icon name={primary.icon} className="h-5 w-5" />
            {primary.label}
          </button>
          {busy && (
            <button className="btn-secondary" onClick={stop}>
              <Icon name="stop" className="h-4 w-4" />
              {t.stop}
            </button>
          )}
          <span className="sr-only" role="status">
            {chime ? t.playingChime : playing ? t.playing : ""}
          </span>
        </div>
      ) : (
        <Notice tone="info">{t.briefingNoAudio}</Notice>
      )}
      {briefing.audio_url && (
        <p id="briefing-note" className="meta">
          {t.chimeNote}
        </p>
      )}
      {(playing || paused) && clip.duration > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={t.briefingProgress}>
          <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div>
        <button className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]" aria-expanded={textOpen} aria-controls="briefing-text" onClick={() => setTextOpen((o) => !o)}>
          <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${textOpen ? "rotate-180" : ""}`} />
          {textOpen ? t.hideTranscript : t.showTranscript}
        </button>
        <Disclosure open={textOpen} id="briefing-text">
          <div className="rounded-ctl bg-canvas p-3 sm:p-4">
            <h3 className="meta mb-1 font-medium">{t.munimSays}</h3>
            <p className="text-[15px] leading-relaxed">{briefing.text_local}</p>
          </div>
        </Disclosure>
      </div>
      {clip.status === "error" && (
        <Notice tone="risk" live title={t.audioFailed}>
          {t.audioFailedBody}{" "}
          <button className="font-semibold underline" onClick={() => void start()}>
            {t.tryAgain}
          </button>
        </Notice>
      )}
    </div>
  );
}
