import { Post, defaultFX } from "./post";
import { Sound } from "./audio";
import { C, circle, corrLine, fillRR, mono, txt, setFigureClock } from "./draw";
import { BEAT_LEN, EP_LEN, H, W, clamp, easeOut, pad, prog } from "./util";
import { EPISODES, cuesFor, type EpisodeData } from "../story/episodes";
import type { EpisodeScene } from "../scenes/common";
import { ep1Scene } from "../scenes/ep1";
import { ep2Scene } from "../scenes/ep2";

export const SCENES: Record<string, EpisodeScene> = { ep1: ep1Scene, ep2: ep2Scene };

export interface Settings {
  narration: boolean;
  sound: boolean;
}

export class Player {
  scene: HTMLCanvasElement;
  sctx: CanvasRenderingContext2D;
  /** the scene is drawn flat here, then passed through the "camera operator" onto `scene` */
  raw: HTMLCanvasElement;
  rctx: CanvasRenderingContext2D;
  post: Post;
  ep: EpisodeData;
  sc: EpisodeScene;
  t = 0;
  playing = false;
  private raf = 0;
  private last = 0;
  private sound: Sound | null = null;
  private spoken = new Set<string>();
  voice: SpeechSynthesisVoice | null = null;
  settings: Settings = { narration: true, sound: true };
  onTick: (t: number) => void = () => {};
  onState: (p: boolean) => void = () => {};

  constructor(public out: HTMLCanvasElement, ep: EpisodeData) {
    this.scene = document.createElement("canvas");
    this.scene.width = W;
    this.scene.height = H;
    this.sctx = this.scene.getContext("2d", { alpha: false })!;
    this.raw = document.createElement("canvas");
    this.raw.width = W;
    this.raw.height = H;
    this.rctx = this.raw.getContext("2d", { alpha: false })!;
    this.post = new Post(out, this.scene);
    this.ep = ep;
    this.sc = SCENES[ep.id];
    this.pickVoice();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => this.pickVoice();
  }

  private pickVoice() {
    if (typeof speechSynthesis === "undefined") return;
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const pref = [/daniel/i, /google uk english male/i, /\bguy\b/i, /ryan/i, /david/i, /alex/i, /fred/i, /male/i, /george/i, /arthur/i];
    for (const p of pref) {
      const v = vs.find((x) => p.test(x.name));
      if (v) {
        this.voice = v;
        return;
      }
    }
    this.voice = vs[0] ?? null;
  }

  setEpisode(ep: EpisodeData) {
    this.pause();
    this.ep = ep;
    this.sc = SCENES[ep.id];
    this.sound?.dispose();
    this.sound = null;
    this.t = 0;
    this.seek(0.0);
  }

  /** Virtual camera operator: handheld drift, slow breathing push, and a punch-in on every hard cut. */
  private camera(t: number) {
    let punch = 0;
    let kick = 0;
    for (const cut of this.sc.cuts) {
      const d = t - cut;
      if (d >= 0 && d < 0.9) {
        punch = Math.max(punch, (1 - easeOut(d / 0.9)) * 0.085);
        kick = Math.max(kick, (1 - d / 0.45 > 0 ? 1 - d / 0.45 : 0) * 9);
      }
    }
    const z = 1.034 + 0.016 * Math.sin(t * 0.33) + punch;
    const dx = 7 * Math.sin(t * 0.9) + 4 * Math.sin(t * 2.3 + 1) + kick * Math.sin(t * 61);
    const dy = 5 * Math.sin(t * 1.1 + 2) + 3 * Math.sin(t * 2.9) + kick * Math.cos(t * 47);
    const rot = 0.0028 * Math.sin(t * 0.7) + kick * 0.0009 * Math.sin(t * 33);
    return { z, dx, dy, rot };
  }

  render(t: number) {
    const fx = defaultFX();
    setFigureClock(t);
    this.rctx.fillStyle = "#000";
    this.rctx.fillRect(0, 0, W, H);
    try {
      this.sc.render(this.rctx, t, fx);
    } catch (e) {
      console.error(e);
    }
    const cam = this.camera(t);
    const g = this.sctx;
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2 + cam.dx, H / 2 + cam.dy);
    g.rotate(cam.rot);
    g.scale(cam.z, cam.z);
    g.translate(-W / 2, -H / 2);
    g.drawImage(this.raw, 0, 0);
    g.restore();
    this.post.render(fx, t, (c) => this.overlay(c, t));
  }

  private overlay(c: CanvasRenderingContext2D, t: number) {
    // red correction-line wipes at hard cuts
    for (const cut of this.sc.cuts) {
      const d = t - cut;
      if (d > -0.05 && d < 0.32) {
        const u = clamp((d + 0.05) / 0.37);
        const x = easeOut(u) * (W + 40) - 20;
        c.save();
        c.fillStyle = `rgba(239,229,205,${0.3 * (1 - u)})`;
        c.fillRect(0, 0, x, H);
        c.restore();
        corrLine(c, x, -10, x - 14, H + 10, 1, 5, C.red, 7);
      }
    }
    const hud = this.sc.hud(t);
    if (!hud.hidden && t < EP_LEN - 15) {
      // recorder HUD
      c.save();
      c.globalAlpha = 0.92;
      const blink = hud.rec ? Math.sin(t * 5) > -0.2 : false;
      fillRR(c, 28, 24, 330, 54, 6, "rgba(18,10,28,0.55)");
      circle(c, 52, 51, 7, hud.rec ? (blink ? C.red : "#7a2a24") : "#4a3a40");
      mono(c, hud.rec ? "REC" : "■ STOP", 70, 56, { size: 15, weight: 800, color: "#f1e9d6", spacing: 2 });
      const mins = hud.clock;
      const day = mins >= 24 * 60 ? "FRI" : "THU";
      const mm = Math.floor(mins % (24 * 60));
      mono(c, `${day} ${pad(mm / 60)}:${pad(mm % 60)}`, 130, 56, { size: 15, color: "#f1e9d6", spacing: 2 });
      const remain = Math.max(0, 30 * 60 - mins);
      mono(c, `PURGE T-${pad(remain / 60)}:${pad(remain % 60)}`, 232, 56, { size: 14, weight: 700, color: "#ff8a7a", spacing: 1 });
      if (hud.subject) {
        fillRR(c, 28, 84, 330, 30, 5, "rgba(18,10,28,0.55)");
        mono(c, `SUBJECT: ${hud.subject}`, 42, 105, { size: 14, weight: 800, color: "#d5ffdf", spacing: 2 });
      }
      c.restore();
    }
    // episode title card
    if (t < 5.4) {
      const a = prog(t, 0.2, 1.0) * (1 - prog(t, 4.2, 5.2));
      if (a > 0) {
        c.save();
        c.globalAlpha = a;
        c.fillStyle = "rgba(14,7,22,0.42)";
        c.fillRect(0, 250, W, 190);
        mono(c, `THE DEPARTMENT OF MISSING ROOMS · EPISODE ${this.ep.number}`, W / 2, 304, { size: 16, color: "#e6d8f2", align: "center", spacing: 5 });
        txt(c, this.ep.title, W / 2, 368, { size: 56, weight: 700, color: C.creamLt, align: "center", spacing: 1 });
        corrLine(c, W / 2 - 250, 392, W / 2 + 250, 388, prog(t, 1.0, 2.4), 4);
        mono(c, this.ep.clockLabel.toUpperCase(), W / 2, 424, { size: 14, color: "#cdbfe0", align: "center", spacing: 3 });
        c.restore();
      }
    }
  }

  /* ---------- transport ---------- */

  async play() {
    if (this.playing) return;
    if (this.t >= EP_LEN - 0.05) this.t = 0;
    this.playing = true;
    this.onState(true);
    if (!this.sound) this.sound = new Sound();
    await this.sound.resume();
    this.sound.setVolume(this.settings.sound ? 0.9 : 0);
    this.sound.start(this.sc.sound, this.t);
    this.resetSpeech(this.t);
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.playing) return;
      this.t += (now - this.last) / 1000;
      this.last = now;
      if (this.t >= EP_LEN) {
        this.t = EP_LEN - 0.001;
        this.render(this.t);
        this.onTick(this.t);
        this.pause();
        return;
      }
      this.speak(this.t);
      this.render(this.t);
      this.onTick(this.t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    const was = this.playing;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.sound?.stop();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (was) this.onState(false);
  }

  seek(t: number) {
    this.t = clamp(t, 0, EP_LEN - 0.001);
    this.render(this.t);
    this.onTick(this.t);
    if (this.playing) {
      this.sound?.start(this.sc.sound, this.t);
      this.resetSpeech(this.t);
    }
  }

  setSettings(s: Partial<Settings>) {
    Object.assign(this.settings, s);
    if (s.sound !== undefined) this.sound?.setVolume(this.settings.sound ? 0.9 : 0);
    if (s.narration === false && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  private resetSpeech(t: number) {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.spoken.clear();
    // anything that started before now is considered said
    for (let b = 0; b < 5; b++) {
      cuesFor(this.ep, b).forEach((c, i) => {
        if (b * BEAT_LEN + c.start < t - 0.1) this.spoken.add(`${b}:${i}`);
      });
    }
  }

  private speak(t: number) {
    if (!this.settings.narration || typeof speechSynthesis === "undefined") return;
    const b = Math.min(4, Math.floor(t / BEAT_LEN));
    if (t >= BEAT_LEN * 5) return;
    const cues = cuesFor(this.ep, b);
    cues.forEach((c, i) => {
      const key = `${b}:${i}`;
      if (this.spoken.has(key)) return;
      if (t >= b * BEAT_LEN + c.start) {
        this.spoken.add(key);
        const u = new SpeechSynthesisUtterance(c.text);
        if (this.voice) u.voice = this.voice;
        u.rate = 0.94;
        u.pitch = 0.82;
        u.volume = 1;
        speechSynthesis.speak(u);
      }
    });
  }

  destroy() {
    this.pause();
    this.sound?.dispose();
    this.sound = null;
  }
}

export const episodeById = (id: string) => EPISODES.find((e) => e.id === id)!;
