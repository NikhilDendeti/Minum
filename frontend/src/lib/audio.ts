// One <audio> element reused for every clip, so autoplay is unlocked by the first click and stays unlocked.
type Listener = (playing: boolean) => void;

let el: HTMLAudioElement | null = null;
let current: string | null = null;
const listeners = new Set<Listener>();

function element() {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    const emit = () => listeners.forEach((l) => l(!!el && !el.paused && !el.ended));
    el.addEventListener("play", emit);
    el.addEventListener("pause", emit);
    el.addEventListener("ended", emit);
    el.addEventListener("error", emit);
  }
  return el;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function currentUrl() {
  return current;
}

/** Plays a clip and resolves when it ends (or fails). Never rejects: audio is a bonus, text is the fallback. */
export function playUrl(url: string): Promise<void> {
  const audio = element();
  audio.pause();
  current = url;
  audio.src = url;
  return new Promise((resolve) => {
    const done = () => {
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      resolve();
    };
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    audio.play().catch(done);
  });
}

export function stop() {
  const audio = element();
  audio.pause();
  audio.currentTime = 0;
  current = null;
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
