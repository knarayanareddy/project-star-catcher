import { DURATION } from "./util";
import { Post, defaultPost } from "./post";
import { renderFilm } from "./film";
import { Score } from "./audio";

export class Engine {
  scene: HTMLCanvasElement;
  sctx: CanvasRenderingContext2D;
  post: Post;
  actx: AudioContext | null = null;
  recDest: MediaStreamAudioDestinationNode | null = null;
  mix: GainNode | null = null;
  score: Score | null = null;
  t = 0;
  playing = false;
  offset = 0;
  raf = 0;
  timer = 0;
  muted = false;
  onTick: (t: number) => void = () => {};
  onState: (playing: boolean) => void = () => {};
  onEnd: () => void = () => {};
  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  onRecorded: ((blob: Blob, ext: string) => void) | null = null;

  constructor(public out: HTMLCanvasElement) {
    this.scene = document.createElement("canvas");
    this.scene.width = 1280;
    this.scene.height = 720;
    this.sctx = this.scene.getContext("2d", { alpha: false })!;
    out.width = 1920;
    out.height = 1080;
    this.post = new Post(out, this.scene);
  }

  render(t: number) {
    const p = defaultPost();
    renderFilm(this.sctx, t, p);
    this.post.render(p, t);
  }

  private ensureAudio() {
    if (this.actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.actx = new AC();
    this.recDest = this.actx.createMediaStreamDestination();
    this.mix = this.actx.createGain();
    this.mix.gain.value = this.muted ? 0 : 1;
    this.mix.connect(this.actx.destination);
  }

  private startScore(t: number) {
    this.score?.dispose();
    this.score = null;
    if (!this.actx || !this.mix || !this.recDest) return;
    this.score = new Score(this.actx, [this.mix, this.recDest]);
    this.score.start(t);
  }

  async play() {
    this.ensureAudio();
    await this.actx!.resume();
    if (this.t >= DURATION - 0.05) this.t = 0;
    this.offset = this.actx!.currentTime - this.t;
    this.startScore(this.t);
    this.playing = true;
    this.onState(true);
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (this.playing && this.score) this.score.update(this.clock());
    }, 30);
    const loop = () => {
      if (!this.playing) return;
      this.t = this.clock();
      if (this.t >= DURATION) {
        this.t = DURATION - 0.001;
        this.render(this.t);
        this.onTick(DURATION);
        this.finish();
        return;
      }
      this.render(this.t);
      this.onTick(this.t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private clock() {
    return this.actx ? this.actx.currentTime - this.offset : this.t;
  }

  private finish() {
    this.playing = false;
    window.clearInterval(this.timer);
    this.score?.dispose();
    this.score = null;
    this.onState(false);
    if (this.recorder && this.recorder.state !== "inactive") setTimeout(() => this.recorder?.stop(), 400);
    this.onEnd();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.t = this.clock();
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.actx?.suspend();
    this.onState(false);
  }

  /** commit=false: just draw the frame (scrubbing) */
  seek(t: number, commit = true) {
    this.t = Math.max(0, Math.min(DURATION - 0.001, t));
    this.render(this.t);
    this.onTick(this.t);
    if (!commit) {
      if (this.playing) {
        this.score?.dispose();
        this.score = null;
      }
      return;
    }
    if (this.playing && this.actx) {
      this.offset = this.actx.currentTime - this.t;
      this.startScore(this.t);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.mix) this.mix.gain.value = m ? 0 : 1;
  }

  async record(onDone: (blob: Blob, ext: string) => void) {
    this.ensureAudio();
    await this.actx!.resume();
    this.pause();
    const vs = (this.out as any).captureStream(30) as MediaStream;
    const stream = new MediaStream([...vs.getVideoTracks(), ...this.recDest!.stream.getAudioTracks()]);
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const mime = types.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ?? "";
    this.chunks = [];
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 256_000 } : undefined);
    rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    rec.onstop = () => {
      const ext = (rec.mimeType || mime).includes("mp4") ? "mp4" : "webm";
      onDone(new Blob(this.chunks, { type: rec.mimeType || mime || "video/webm" }), ext);
      this.recorder = null;
    };
    this.recorder = rec;
    this.t = 0;
    this.render(0);
    rec.start(500);
    await this.play();
  }

  cancelRecording() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
      this.recorder = null;
    }
  }

  destroy() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.score?.dispose();
    this.actx?.close();
  }
}
