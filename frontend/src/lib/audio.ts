// One <audio> element reused for every clip, so autoplay is unlocked by the first click and stays unlocked.
// The module is a tiny external store: components read it through hooks/useAudio.
export type AudioStatus = "idle" | "playing" | "paused" | "ended" | "error";
export interface AudioSnapshot {
  url: string | null;
  status: AudioStatus;
  time: number;
  duration: number;
}

let el: HTMLAudioElement | null = null;
let snap: AudioSnapshot = { url: null, status: "idle", time: 0, duration: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<AudioSnapshot>) {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
}

function element() {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    el.addEventListener("play", () => set({ status: "playing" }));
    el.addEventListener("pause", () => {
      // "pause" also fires right before "ended"; keep the ended state in that case
      if (el && !el.ended && snap.status !== "idle") set({ status: "paused" });
    });
    el.addEventListener("ended", () => set({ status: "ended", time: 0 }));
    el.addEventListener("error", () => set({ status: "error" }));
    el.addEventListener("loadedmetadata", () => set({ duration: Number.isFinite(el!.duration) ? el!.duration : 0 }));
    el.addEventListener("timeupdate", () => set({ time: el!.currentTime }));
  }
  return el;
}

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export const getSnapshot = () => snap;

/** Plays a clip and resolves when it ends or fails. Never rejects: audio is a bonus, the text is always on screen. */
export function playUrl(url: string): Promise<void> {
  const audio = element();
  audio.pause();
  audio.src = url;
  set({ url, status: "paused", time: 0, duration: 0 });
  return new Promise((resolve) => {
    const done = () => {
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      resolve();
    };
    // a pause by the user is not the end: only resolve for ended/error
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    audio.play().catch((e: DOMException) => {
      // autoplay blocked: leave the clip ready so the play button works; anything else is a real failure
      set({ status: e?.name === "NotAllowedError" ? "paused" : "error" });
      done();
    });
  });
}

export function pause() {
  if (el && !el.paused) el.pause();
}

export function resume() {
  if (el && snap.url && el.paused) void el.play().catch(() => set({ status: "error" }));
}

export function stop() {
  if (el) {
    el.pause();
    el.currentTime = 0;
  }
  set({ url: null, status: "idle", time: 0, duration: 0 });
}

/** Short two-note Soundbox-style chime made with WebAudio (no asset needed). */
export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const start = ctx.currentTime;
      [[880, 0], [1318.5, 0.28]].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start + offset);
        osc.stop(start + offset + 0.65);
      });
      setTimeout(() => {
        ctx.close().catch(() => undefined);
        resolve();
      }, 900);
    } catch {
      resolve();
    }
  });
}
