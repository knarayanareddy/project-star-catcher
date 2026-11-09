import { AudioEngine } from "./audio";
import { Stage } from "./stage";
import { SCENES, TOTAL, sceneAt, type Scene } from "../story/script";
import { EVENTS } from "../story/timeline";

export const IDLE_T = 3.6;

export class Director {
  t = 0;
  playing = false;
  idle = true;
  ended = false;
  audio = new AudioEngine();
  private prev = 0;
  private raf = 0;
  private last = 0;
  private uiAcc = 0;
  private frames = 0;
  private acc = 0;
  private cardSeen = new Set<string>();
  onUpdate: (t: number, playing: boolean, idle: boolean, ended: boolean) => void = () => {};

  constructor(public stage: Stage) {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) {
      this.prev = this.t;
      this.t = Math.min(TOTAL, this.t + dt);
      this.fire(this.prev, this.t);
      if (this.t >= TOTAL) {
        this.playing = false;
        this.ended = true;
        this.audio.cancelSpeech();
        this.audio.suspend();
      }
    }
    this.stage.render(this.idle ? IDLE_T : this.t, dt);
    if (this.playing && !document.hidden && this.stage.perf < 2) {
      this.frames++;
      if (this.frames > 90) {
        this.acc += dt;
        if (this.frames % 90 === 0) {
          if (this.acc / 90 > 0.045) this.stage.degrade();
          this.acc = 0;
        }
      }
    }
    this.uiAcc += dt;
    if (this.uiAcc > 0.066) {
      this.uiAcc = 0;
      this.onUpdate(this.t, this.playing, this.idle, this.ended);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private fire(a: number, b: number) {
    for (const ev of EVENTS) {
      if (ev.time <= a || ev.time > b) continue;
      if (ev.kind === "scene") this.applyScene(ev.scene);
      else if (ev.kind === "line" && ev.line) this.audio.speak(ev.line, ev.rate ?? 1);
      else if (ev.kind === "sfx" && ev.sfx) this.audio.sfx(ev.sfx);
    }
    for (const s of SCENES)
      for (const c of s.cards ?? []) {
        const at = s.start + c.at;
        const key = `${s.n}:${c.at}`;
        if (c.kind === "title" && at > a && at <= b && !this.cardSeen.has(key)) {
          this.audio.setCue("hype");
          this.cardSeen.add(key);
        }
      }
  }

  private applyScene(s: Scene) {
    this.audio.setCue(s.cue);
    this.audio.setAmb(s.amb);
  }

  begin() {
    this.audio.init();
    this.idle = false;
    this.ended = false;
    this.t = 0;
    this.prev = 0;
    this.cardSeen.clear();
    this.audio.resume();
    this.applyScene(SCENES[0]);
    this.playing = true;
  }

  play() {
    if (this.idle || this.ended) return this.begin();
    this.audio.init();
    this.audio.resume();
    this.playing = true;
  }

  pause() {
    this.playing = false;
    this.audio.suspend();
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  seek(t: number) {
    t = Math.max(0, Math.min(TOTAL - 0.05, t));
    this.idle = false;
    this.ended = false;
    this.audio.cancelSpeech();
    this.t = t;
    this.prev = t;
    this.cardSeen.clear();
    if (this.audio.ctx) {
      this.applyScene(sceneAt(t));
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.audio.dispose();
  }
}
