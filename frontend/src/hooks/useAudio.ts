import { useSyncExternalStore } from "react";
import * as audio from "../lib/audio";

/** Playback state for one clip. Other clips playing means this one is idle. */
export function useAudio(url: string | null | undefined) {
  const snap = useSyncExternalStore(audio.subscribe, audio.getSnapshot);
  const mine = !!url && snap.url === url;
  const status: audio.AudioStatus = mine ? snap.status : "idle";
  return {
    status,
    time: mine ? snap.time : 0,
    duration: mine ? snap.duration : 0,
    play: () => url && void audio.playUrl(url),
    pause: audio.pause,
    resume: audio.resume,
    stop: audio.stop,
    chiming: snap.chiming,
  };
}
