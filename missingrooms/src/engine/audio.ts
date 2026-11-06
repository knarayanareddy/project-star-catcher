import { rng } from "./util";

export type CueType =
  | "click"
  | "stamp"
  | "tug"
  | "rasp"
  | "step"
  | "knock"
  | "paper"
  | "chirp"
  | "stopclick"
  | "hatch"
  | "tock"
  | "tear"
  | "lock"
  | "shutter"
  | "steelring"
  | "clatter"
  | "chime"
  | "bell"
  | "key"
  | "screws"
  | "slide"
  | "tap"
  | "pen"
  | "swell"
  | "boom"
  | "tick";

export interface SoundCue {
  t: number;
  type: CueType;
  /** 0..1 loudness */
  v?: number;
  /** pitch / parameter */
  f?: number;
  /** duration where relevant */
  d?: number;
}

export interface Levels {
  hum: number;
  drone: number;
  /** adds a major third above the drone: the first warmth in the series */
  warm: number;
  pump: number;
  tone: number;
  music: number;
  /** purge-clock tick level */
  tick: number;
  reverb: number;
}

export interface EpisodeSound {
  cues: SoundCue[];
  levels: (t: number) => Levels;
  /** music progression root offsets (semitones) by 8-second bar index */
  progression: number[];
  seed: number;
  duration: number;
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  ctx: AudioContext;
  master: GainNode;
  private comp: DynamicsCompressorNode;
  private verb: ConvolverNode;
  private verbGain: GainNode;
  private noise: AudioBuffer;
  private hum: GainNode;
  private droneG: GainNode;
  private warmG: GainNode;
  private pumpG: GainNode;
  private toneG: GainNode;
  private musicBus: GainNode;
  private nodes: AudioNode[] = [];
  private timer = 0;
  private ep: EpisodeSound | null = null;
  private t0 = 0;
  private c0 = 0;
  private cueIdx = 0;
  private lastT = 0;
  private lastMusicBar = -1;
  running = false;

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 3.5;
    this.master.connect(this.comp);
    this.comp.connect(c.destination);

    // noise
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // reverb impulse
    const rl = Math.floor(c.sampleRate * 2.6);
    const ir = c.createBuffer(2, rl, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const dd = ir.getChannelData(ch);
      for (let i = 0; i < rl; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2);
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    this.verbGain = c.createGain();
    this.verbGain.gain.value = 0.25;
    this.verb.connect(this.verbGain);
    this.verbGain.connect(this.master);

    // continuous layers
    this.hum = c.createGain();
    this.hum.gain.value = 0;
    this.hum.connect(this.master);
    for (const [f, g] of [
      [100, 0.5],
      [200.6, 0.22],
      [300.9, 0.08],
    ] as const) {
      const o = c.createOscillator();
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(this.hum);
      o.start();
      this.nodes.push(o);
    }

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    this.droneG = c.createGain();
    this.droneG.gain.value = 0;
    lp.connect(this.droneG);
    this.droneG.connect(this.master);
    this.droneG.connect(this.verb);
    for (const [f, dt] of [
      [55, 0],
      [55.35, 0],
      [110.2, -4],
    ] as const) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = dt;
      o.connect(lp);
      o.start();
      this.nodes.push(o);
    }
    this.warmG = c.createGain();
    this.warmG.gain.value = 0;
    const lp2 = c.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = 400;
    lp2.connect(this.warmG);
    this.warmG.connect(this.master);
    this.warmG.connect(this.verb);
    {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = 69.3; // major third over 55
      o.connect(lp2);
      o.start();
      this.nodes.push(o);
      const o2 = c.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 82.4;
      o2.connect(lp2);
      o2.start();
      this.nodes.push(o2);
    }

    // storage air pump: three overlapping pulses, not quite in step
    this.pumpG = c.createGain();
    this.pumpG.gain.value = 0;
    const nz = c.createBufferSource();
    nz.buffer = this.noise;
    nz.loop = true;
    const pf = c.createBiquadFilter();
    pf.type = "lowpass";
    pf.frequency.value = 320;
    nz.connect(pf);
    const pg = c.createGain();
    pg.gain.value = 0;
    pf.connect(pg);
    pg.connect(this.pumpG);
    this.pumpG.connect(this.master);
    nz.start();
    this.nodes.push(nz);
    for (const rate of [1 / 1.2, 1 / 1.27, 1 / 1.14]) {
      const lfo = c.createOscillator();
      lfo.frequency.value = rate;
      const lg = c.createGain();
      lg.gain.value = 0.34;
      lfo.connect(lg);
      lg.connect(pg.gain);
      lfo.start();
      this.nodes.push(lfo);
    }
    pg.gain.value = 0.38;
    const sub = c.createOscillator();
    sub.frequency.value = 48;
    const sg = c.createGain();
    sg.gain.value = 0;
    sub.connect(sg);
    sg.connect(this.pumpG);
    sub.start();
    this.nodes.push(sub);

    this.toneG = c.createGain();
    this.toneG.gain.value = 0;
    this.toneG.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.verb);
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  start(ep: EpisodeSound, t: number) {
    this.stopSched();
    this.ep = ep;
    this.t0 = t;
    this.c0 = this.ctx.currentTime + 0.06;
    this.lastT = t;
    this.cueIdx = ep.cues.findIndex((c) => c.t >= t);
    if (this.cueIdx < 0) this.cueIdx = ep.cues.length;
    this.lastMusicBar = Math.floor(t / 8) - 1;
    this.running = true;
    this.timer = window.setInterval(() => this.pump(), 30);
    this.pump();
  }

  private stopSched() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }

  stop() {
    this.stopSched();
    this.running = false;
    const now = this.ctx.currentTime;
    for (const g of [this.hum, this.droneG, this.warmG, this.pumpG, this.toneG, this.musicBus]) g.gain.setTargetAtTime(0, now, 0.08);
  }

  dispose() {
    this.stop();
    for (const n of this.nodes) {
      try {
        (n as OscillatorNode).stop?.();
      } catch {
        /* already stopped */
      }
    }
    void this.ctx.close();
  }

  private pump() {
    if (!this.ep || !this.running) return;
    const now = this.ctx.currentTime;
    const t = this.t0 + (now - this.c0);
    const L = this.ep.levels(Math.max(0, t));
    const sm = 0.12;
    this.hum.gain.setTargetAtTime(L.hum * 0.018, now, sm);
    this.droneG.gain.setTargetAtTime(L.drone * 0.1, now, sm * 2);
    this.warmG.gain.setTargetAtTime(L.warm * 0.07, now, sm * 3);
    this.pumpG.gain.setTargetAtTime(L.pump * 0.2, now, sm);
    this.musicBus.gain.setTargetAtTime(L.music * 0.5, now, sm);
    this.verbGain.gain.setTargetAtTime(0.1 + L.reverb * 0.6, now, 0.3);

    const ahead = t + 0.3;
    while (this.cueIdx < this.ep.cues.length && this.ep.cues[this.cueIdx].t < ahead) {
      const cue = this.ep.cues[this.cueIdx++];
      const when = this.c0 + (cue.t - this.t0);
      if (when >= now - 0.05) this.fire(cue, Math.max(when, now));
    }
    // clock ticks
    for (let s = Math.ceil(this.lastT); s < ahead; s++) {
      if (s >= t - 0.05 && this.ep.levels(s).tick > 0) {
        this.fire({ t: s, type: "tick", v: this.ep.levels(s).tick }, this.c0 + (s - this.t0));
      }
    }
    this.lastT = Math.max(this.lastT, ahead);
    // music bars
    const bar = Math.floor(ahead / 8);
    while (this.lastMusicBar < bar) {
      this.lastMusicBar++;
      const bt = this.lastMusicBar * 8;
      if (bt + 8 > t) this.bar(this.lastMusicBar, this.c0 + (bt - this.t0), L.warm);
    }
  }

  /* ---------- music: a corrupted municipal lullaby ---------- */
  private bar(i: number, when: number, warm: number) {
    const ep = this.ep!;
    if (i < 0 || i * 8 >= ep.duration) return;
    const now = this.ctx.currentTime;
    const w = Math.max(when, now);
    const r = rng(ep.seed + i * 31);
    const root = 50 + ep.progression[i % ep.progression.length];
    const minor = warm < 0.5;
    const chord = [0, minor ? 3 : 4, 7, minor ? 10 : 11];
    chord.forEach((iv, k) => this.pad(w + (when < now ? 0 : 0), midi(root + iv + (k === 3 ? 12 : 0)), 8, 0.1));
    // a sparse bell motif, 3-4 notes a bar, drifting off the beat like a failing music box
    const scale = minor ? [0, 3, 5, 7, 10, 12, 15] : [0, 4, 5, 7, 11, 12, 16];
    const n = 3 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const off = 0.6 + k * 1.9 + r() * 0.35;
      const note = root + 12 + scale[Math.floor(r() * scale.length)];
      const at = when + off;
      if (at >= now) this.bellNote(at, midi(note), 0.07 + r() * 0.05);
    }
  }

  private pad(when: number, f: number, dur: number, g: number) {
    const c = this.ctx;
    for (const dt of [-6, 5]) {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = dt;
      const gg = c.createGain();
      gg.gain.setValueAtTime(0.0001, when);
      gg.gain.linearRampToValueAtTime(g * 0.5, when + 2.4);
      gg.gain.linearRampToValueAtTime(g * 0.38, when + dur - 1.2);
      gg.gain.linearRampToValueAtTime(0.0001, when + dur + 0.6);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      o.connect(lp);
      lp.connect(gg);
      gg.connect(this.musicBus);
      o.start(when);
      o.stop(when + dur + 0.8);
    }
  }

  private bellNote(when: number, f: number, g: number) {
    const c = this.ctx;
    for (const [m, a, d] of [
      [1, 1, 2.2],
      [2.76, 0.28, 1.1],
      [5.4, 0.1, 0.5],
    ] as const) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f * m;
      const gg = c.createGain();
      gg.gain.setValueAtTime(0.0001, when);
      gg.gain.linearRampToValueAtTime(g * a, when + 0.006);
      gg.gain.exponentialRampToValueAtTime(0.0001, when + d);
      o.connect(gg);
      gg.connect(this.musicBus);
      o.start(when);
      o.stop(when + d + 0.1);
    }
  }

  /* ---------- sfx building blocks ---------- */

  private nb(when: number, dur: number, o: { type?: BiquadFilterType; f?: number; f2?: number; q?: number; g?: number; a?: number; verb?: number }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = o.type ?? "bandpass";
    fl.frequency.setValueAtTime(o.f ?? 2000, when);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, when + dur);
    fl.Q.value = o.q ?? 0.8;
    const g = c.createGain();
    const a = o.a ?? 0.003;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.g ?? 0.3, when + a);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(this.master);
    if (o.verb) {
      const vs = c.createGain();
      vs.gain.value = o.verb;
      g.connect(vs);
      vs.connect(this.verb);
    }
    src.start(when, Math.random() * 1.5);
    src.stop(when + dur + 0.05);
  }

  private tn(when: number, f: number, dur: number, o: { type?: OscillatorType; f2?: number; g?: number; a?: number; verb?: number } = {}) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(f, when);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, when + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.g ?? 0.2, when + (o.a ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.toneG);
    this.toneG.gain.value = 1;
    if (o.verb) {
      const vs = c.createGain();
      vs.gain.value = o.verb;
      g.connect(vs);
      vs.connect(this.verb);
    }
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private fire(cue: SoundCue, w: number) {
    const v = cue.v ?? 1;
    switch (cue.type) {
      case "click":
        this.nb(w, 0.025, { type: "highpass", f: 2400, g: 0.35 * v });
        this.tn(w, 190, 0.05, { g: 0.12 * v });
        break;
      case "stamp":
        this.nb(w, 0.03, { type: "highpass", f: 1800, g: 0.4 * v });
        this.tn(w, 120, 0.18, { f2: 55, g: 0.4 * v });
        this.nb(w + 0.01, 0.12, { type: "lowpass", f: 600, g: 0.25 * v });
        break;
      case "tug": {
        // dry fabric rasp: a cluster of tiny friction bursts
        for (let i = 0; i < 9; i++) this.nb(w + i * 0.026 + Math.random() * 0.01, 0.05, { f: 2400 + Math.random() * 2200, q: 0.6, g: (0.16 + Math.random() * 0.1) * v });
        this.nb(w, 0.28, { type: "bandpass", f: 900, f2: 380, q: 1.2, g: 0.14 * v, verb: 0.15 });
        this.tn(w, 62, 0.22, { f2: 44, g: 0.25 * v });
        break;
      }
      case "rasp": {
        const d = cue.d ?? 0.8;
        const n = Math.floor(d / 0.03);
        for (let i = 0; i < n; i++) this.nb(w + i * 0.03 + Math.random() * 0.012, 0.05, { f: 2800 + Math.random() * 2400, q: 0.5, g: (0.05 + Math.random() * 0.05) * v });
        break;
      }
      case "step":
        this.nb(w, 0.09, { type: "lowpass", f: 520, g: 0.28 * v });
        this.tn(w, 85, 0.1, { f2: 50, g: 0.14 * v });
        this.nb(w + 0.005, 0.03, { type: "highpass", f: 3000, g: 0.05 * v });
        break;
      case "knock":
        this.tn(w, cue.f ?? 150, 0.12, { f2: (cue.f ?? 150) * 0.6, g: 0.3 * v });
        this.nb(w, 0.04, { type: "lowpass", f: 700, g: 0.3 * v });
        break;
      case "paper": {
        const d = cue.d ?? 0.5;
        for (let i = 0; i < Math.floor(d / 0.05); i++) this.nb(w + i * 0.05 + Math.random() * 0.03, 0.07, { f: 3200 + Math.random() * 2000, q: 0.4, g: (0.07 + Math.random() * 0.07) * v });
        break;
      }
      case "chirp":
        this.tn(w, 1180, 0.07, { type: "square", g: 0.05 * v });
        this.tn(w + 0.09, 1760, 0.09, { type: "square", g: 0.05 * v });
        break;
      case "stopclick":
        this.nb(w, 0.02, { type: "highpass", f: 1500, g: 0.3 * v });
        this.tn(w, 240, 0.06, { g: 0.1 * v });
        break;
      case "hatch": {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(cue.f ?? 760, w);
        o.frequency.linearRampToValueAtTime((cue.f ?? 760) * 0.7, w + 0.5);
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1300;
        bp.Q.value = 5;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, w);
        g.gain.linearRampToValueAtTime(0.05 * v, w + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, w + 0.55);
        o.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        o.start(w);
        o.stop(w + 0.6);
        this.tn(w + 0.52, 90, 0.2, { f2: 50, g: 0.3 * v });
        break;
      }
      case "tock":
        this.tn(w, cue.f ?? 310, 0.16, { f2: (cue.f ?? 310) * 0.9, g: 0.34 * v, verb: 0.1 });
        this.nb(w, 0.02, { type: "highpass", f: 2500, g: 0.2 * v });
        break;
      case "tear":
        this.nb(w, cue.d ?? 0.6, { type: "highpass", f: 1400, f2: 4200, q: 0.4, g: 0.32 * v, a: 0.05 });
        for (let i = 0; i < 10; i++) this.nb(w + i * 0.05, 0.03, { type: "bandpass", f: 3500 + Math.random() * 3000, g: 0.14 * v });
        break;
      case "lock":
        this.nb(w, 0.02, { type: "highpass", f: 2000, g: 0.3 * v });
        this.tn(w, 330, 0.04, { type: "square", g: 0.05 * v });
        this.nb(w + 0.09, 0.02, { type: "highpass", f: 2500, g: 0.25 * v });
        this.tn(w + 0.09, 260, 0.05, { type: "square", g: 0.05 * v });
        break;
      case "shutter":
        this.nb(w, 0.02, { type: "highpass", f: 3000, g: 0.4 * v });
        this.nb(w + 0.045, 0.02, { type: "highpass", f: 2500, g: 0.3 * v });
        this.tn(w - 0.3 < this.ctx.currentTime ? w : w - 0.3, 2400, 0.4, { f2: 7600, g: 0.02 * v });
        break;
      case "steelring":
        for (const [f, g, d] of [
          [2350, 0.1, 1.4],
          [3720, 0.06, 1.0],
          [5180, 0.04, 0.7],
        ] as const)
          this.tn(w, f, d, { g: g * v, verb: 0.3 });
        this.nb(w, 0.03, { type: "highpass", f: 3500, g: 0.3 * v });
        break;
      case "clatter": {
        for (let i = 0; i < 8; i++) {
          const dt = i * i * 0.012 + Math.random() * 0.02;
          this.tn(w + dt, 140 + Math.random() * 220, 0.08, { type: "triangle", g: (0.2 - i * 0.015) * v });
          this.nb(w + dt, 0.04, { f: 1800 + Math.random() * 1500, g: 0.12 * v });
        }
        this.nb(w + 0.05, 0.5, { type: "bandpass", f: 3600, q: 0.3, g: 0.08 * v, a: 0.1 });
        break;
      }
      case "chime":
        for (const [m, g] of [
          [1, 0.1],
          [2, 0.05],
          [3, 0.025],
        ] as const)
          this.tn(w, (cue.f ?? 880) * m, 1.6, { g: g * v, verb: 0.25 });
        break;
      case "bell":
        this.bellNote(w, cue.f ?? 587, 0.16 * v);
        break;
      case "key":
        this.nb(w, 0.015, { type: "highpass", f: 3200, g: 0.3 * v });
        this.tn(w, 1900, 0.09, { g: 0.05 * v });
        this.nb(w + 0.08, 0.012, { type: "highpass", f: 3000, g: 0.25 * v });
        this.tn(w + 0.08, 1500, 0.08, { g: 0.05 * v });
        break;
      case "screws":
        for (let i = 0; i < 4; i++) {
          const at = w + i * 0.27;
          for (let b = 0; b < 4; b++) this.tn(at + b * (0.07 - b * 0.012), 3800 + i * 220 - b * 300, 0.05, { g: (0.07 - b * 0.014) * v });
        }
        break;
      case "slide":
        this.nb(w, cue.d ?? 0.5, { type: "bandpass", f: 600, f2: 3200, q: 1.2, g: 0.1 * v, a: 0.12 });
        break;
      case "tap":
        this.nb(w, 0.03, { type: "highpass", f: 2000, g: 0.16 * v });
        this.tn(w, 600, 0.03, { g: 0.04 * v });
        break;
      case "pen":
        this.nb(w, cue.d ?? 0.4, { type: "bandpass", f: 4200, q: 2, g: 0.07 * v, a: 0.03 });
        break;
      case "swell":
        this.tn(w, 38, cue.d ?? 2.4, { g: 0.6 * v, a: (cue.d ?? 2.4) * 0.7, verb: 0.2 });
        this.nb(w, cue.d ?? 2.4, { type: "lowpass", f: 120, f2: 500, g: 0.18 * v, a: (cue.d ?? 2.4) * 0.7 });
        break;
      case "boom":
        this.tn(w, 70, 1.2, { f2: 32, g: 0.7 * v, verb: 0.3 });
        break;
      case "tick":
        this.tn(w, 1450, 0.025, { type: "square", g: 0.025 * v });
        this.nb(w, 0.01, { type: "highpass", f: 4000, g: 0.06 * v });
        break;
    }
  }
}
