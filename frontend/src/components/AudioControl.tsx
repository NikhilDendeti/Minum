import { useAudio } from "../hooks/useAudio";
import { useMunim } from "../hooks/useMunim";
import { Icon } from "./ui";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Listen / pause / resume / stop / listen again for one spoken answer. Every state has a text label. */
export default function AudioControl({ url }: { url: string | null | undefined }) {
  const { t } = useMunim();
  const clip = useAudio(url);

  if (!url) return <p className="meta">{t.noAudio}</p>;

  const first = (() => {
    switch (clip.status) {
      case "playing":
        return { icon: "pause" as const, label: t.pause, run: clip.pause };
      case "paused":
        return { icon: "play" as const, label: t.resume, run: clip.resume };
      case "ended":
        return { icon: "replay" as const, label: t.listenAgain, run: clip.play };
      case "error":
        return { icon: "replay" as const, label: t.tryAgain, run: clip.play };
      default:
        return { icon: "play" as const, label: t.listen, run: clip.play };
    }
  })();
  const active = clip.status === "playing" || clip.status === "paused";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-secondary min-h-[44px] py-1.5 text-[14px]" onClick={first.run}>
        <Icon name={first.icon} className="h-4 w-4" />
        {first.label}
      </button>
      {active && (
        <button className="btn-quiet min-h-[44px] py-1.5 text-[14px]" onClick={clip.stop}>
          <Icon name="stop" className="h-4 w-4" />
          {t.stop}
        </button>
      )}
      {active && clip.duration > 0 && (
        <span className="meta num" aria-hidden>
          {mmss(clip.time)} / {mmss(clip.duration)}
        </span>
      )}
      {clip.status === "error" && <span className="text-[13px] text-risk-fg">{t.audioFailed}</span>}
      <span className="sr-only" role="status">
        {clip.status === "playing" ? t.playing : ""}
      </span>
    </div>
  );
}
