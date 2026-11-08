import { Post, defaultPost } from "../film/post";
import type { EpisodeDef, Scorer } from "./types";

export type AudioMode = "suno-master" | "suno-score" | "suno-vo" | "procedural";

export class StreamScorer implements Scorer {
  private audio: HTMLAudioElement;
  private source: MediaElementAudioSourceNode | null = null;
  private isDisposed = false;

  constructor(private ctx: AudioContext, private outs: AudioNode[], src: string) {
    this.audio = new Audio(src);
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";
    try {
      this.source = this.ctx.createMediaElementSource(this.audio);
      for (const out of this.outs) {
        this.source.connect(out);
      }
    } catch {
      // Direct element playback fallback
    }
  }

  start(t: number) {
    if (this.isDisposed) return;
    this.audio.currentTime = Math.max(0, t);
    this.audio.play().catch(() => {});
  }

  pause() {
    if (this.isDisposed) return;
    this.audio.pause();
  }

  update(t: number) {
    if (this.isDisposed) return;
    if (Math.abs(this.audio.currentTime - t) > 0.25) {
      this.audio.currentTime = t;
    }
  }

  dispose() {
    this.isDisposed = true;
    this.audio.pause();
    this.audio.currentTime = 0;
    try {
      this.source?.disconnect();
    } catch {}
  }
}

/** Generic player: any episode is (render(t), score). */
export class SeriesEngine {
  scene: HTMLCanvasElement;
  sctx: CanvasRenderingContext2D;
  post: Post;
  actx: AudioContext | null = null;
  recDest: MediaStreamAudioDestinationNode | null = null;
  mix: GainNode | null = null;
  score: Scorer | null = null;
  ep: EpisodeDef;
  audioMode: AudioMode = "suno-master";
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

  constructor(public out: HTMLCanvasElement, ep: EpisodeDef) {
    this.ep = ep;
    this.scene = document.createElement("canvas");
    this.scene.width = 1280;
    this.scene.height = 720;
    this.sctx = this.scene.getContext("2d", { alpha: false, colorSpace: "srgb" } as any)!;
    out.width = 1920;
    out.height = 1080;
    this.post = new Post(out, this.scene);
  }

  get duration() {
    return this.ep.duration;
  }

  render(t: number) {
    const p = defaultPost();
    this.sctx.save();
    this.sctx.setTransform(1, 0, 0, 1, 0, 0);
    this.sctx.globalCompositeOperation = "source-over";
    this.sctx.globalAlpha = 1;
    this.sctx.filter = "none";
    this.sctx.shadowColor = "transparent";
    this.sctx.shadowBlur = 0;
    try {
      this.ep.render(this.sctx, t, p);
    } catch (e) {
      console.error(`Render error in ${this.ep.id} at t=${t}:`, e);
    } finally {
      this.sctx.restore();
      this.sctx.setTransform(1, 0, 0, 1, 0, 0);
      this.sctx.globalCompositeOperation = "source-over";
      this.sctx.globalAlpha = 1;
      this.sctx.filter = "none";
      this.sctx.shadowColor = "transparent";
      this.sctx.shadowBlur = 0;
    }
    this.post.render(p, t);
  }

  setEpisode(ep: EpisodeDef) {
    this.stopAll();
    this.ep = ep;
    this.t = 0;
    this.seek(ep.posterAt, false);
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

  setAudioMode(mode: AudioMode) {
    this.audioMode = mode;
    if (this.playing) {
      this.startScore(this.t);
    }
  }

  private startScore(t: number) {
    this.score?.dispose();
    this.score = null;
    if (!this.actx || !this.mix || !this.recDest) return;

    if (this.audioMode !== "procedural") {
      const epNum = this.ep.id.replace("ep", "");
      let src = `/audio/${this.ep.id}/suno_episode${epNum}_master.mp3`;
      if (this.audioMode === "suno-score") src = `/audio/${this.ep.id}/suno_score_full.mp3`;
      if (this.audioMode === "suno-vo") src = `/audio/${this.ep.id}/suno_narration_synced.mp3`;
      this.score = new StreamScorer(this.actx, [this.mix, this.recDest], src);
      this.score.start(t);
      return;
    }

    this.score = this.ep.makeScore(this.actx, [this.mix, this.recDest]);
    this.score.start(t);
  }

  async play() {
    this.ensureAudio();
    await this.actx!.resume();
    const D = this.duration;
    if (this.t >= D - 0.05) this.t = 0;
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
      if (this.t >= D) {
        this.t = D - 0.001;
        this.render(this.t);
        this.onTick(D);
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
    this.score?.pause?.();
    this.actx?.suspend();
    this.onState(false);
  }

  private stopAll() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.timer);
    this.score?.dispose();
    this.score = null;
    this.cancelRecording();
    this.onState(false);
  }

  /** commit=false: just draw the frame (scrubbing) */
  seek(t: number, commit = true) {
    this.t = Math.max(0, Math.min(this.duration - 0.001, t));
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
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4;codecs=avc1",
      "video/mp4",
    ];
    const mime = types.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ?? "";
    this.chunks = [];
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 256_000 } : undefined);
    rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    rec.onstop = () => {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
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
    this.stopAll();
    this.actx?.close();
  }
}
