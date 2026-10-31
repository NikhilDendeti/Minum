// Press-and-hold recording: 16 kHz mono Opus in WebM, hard-capped.
// Sarvam's file API takes 30 s at most and a clip ends a little after its timer, so the mic stops at 29.5 s
// while the screen shows a 30 s limit. A clip over 30 s would fall back to a slower, less accurate transcriber.
export const ASK_LIMIT_S = 30;
export const MAX_ASK_MS = 29_500;
export const MAX_DECIDE_MS = 4_000;

export class Recorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timer: number | undefined;
  private done: Promise<Blob> | null = null;

  /** Starts recording; `onLimit` fires if the time cap stops it before stop() is called. */
  async start(maxMs: number, onLimit?: () => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.done = new Promise<Blob>((resolve) => {
      this.recorder!.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: this.recorder?.mimeType || "audio/webm" }));
      };
    });
    this.recorder.start();
    this.timer = window.setTimeout(() => {
      onLimit?.();
      this.recorder?.state === "recording" && this.recorder.stop();
    }, maxMs);
  }

  async stop(): Promise<Blob> {
    window.clearTimeout(this.timer);
    if (this.recorder?.state === "recording") this.recorder.stop();
    return this.done ?? new Blob([]);
  }

  cancel() {
    window.clearTimeout(this.timer);
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
