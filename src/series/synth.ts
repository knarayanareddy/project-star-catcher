import { hash, kf, lerp } from "../film/util";
import type { Scorer } from "./types";

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const D5 = 74;

export type Curve = (t: number) => number;
export type Fire = (s: Synth, at: number) => void;
export interface Cue { t: number; fire: Fire }

/** 16-step patterns: '.' rest, 'x' hit, 'X' accent */
export interface Groove {
  t0: number;
  t1: number;
  bpm: number;
  kick?: string;
  snare?: string;
  hat?: string;
  tom?: string;
  bass?: string;
  bassNote?: number; // midi
  arp?: string;
  arpNotes?: number[]; // midi
  vol?: number;
}

export interface ScoreSpec {
  drone: Curve;
  tension: Curve;
  sub: Curve;
  subFreq: Curve;
  choir: Curve;
  pad: Curve;
  sea: Curve;
  seaCut: Curve;
  heartVol: Curve;
  /** 0 = the mech's heart, 1 = baby's heart, 2 = both in step */
  heartKind: Curve;
  beats: number[];
  chords: [number, number[]][];
  cues: Cue[];
  grooves?: Groove[];
  master?: number;
}

/** heartbeat table from bpm keyframes; `gaps` are silent windows */
export function makeBeats(keys: [number, number][], duration: number, gaps: [number, number][] = [], extra: number[] = []) {
  const out: number[] = [];
  let phase = 0;
  const dt = 0.004;
  for (let t = 0; t < duration; t += dt) {
    const bpm = kf(t, keys);
    const b0 = Math.floor(phase);
    phase += (bpm / 60) * dt;
    if (Math.floor(phase) > b0 && !gaps.some(([a, b]) => t >= a && t < b)) out.push(t);
  }
  return out.concat(extra).sort((a, b) => a - b);
}

export function grooveCues(grooves: Groove[]): Cue[] {
  const q: Cue[] = [];
  for (const g of grooves) {
    const step = 60 / g.bpm / 4;
    const n = Math.floor((g.t1 - g.t0) / step);
    const v = g.vol ?? 1;
    const pat = (s: string | undefined, i: number) => (s ? s[i % s.length] : ".");
    const arpPat = g.arp;
    let ai = 0;
    for (let i = 0; i < n; i++) {
      const t = g.t0 + i * step;
      const k = pat(g.kick, i);
      const sn = pat(g.snare, i);
      const h = pat(g.hat, i);
      const tm = pat(g.tom, i);
      const bs = pat(g.bass, i);
      const ar = pat(arpPat, i);
      // fade in/out inside the groove window
      const edge = Math.min(1, (t - g.t0) / 1.5 + 0.35, (g.t1 - t) / 1.5 + 0.35);
      const vel = v * edge;
      if (k !== ".") q.push({ t, fire: (s, at) => s.kick(at, (k === "X" ? 1 : 0.75) * vel) });
      if (sn !== ".") q.push({ t, fire: (s, at) => s.snare(at, (sn === "X" ? 1 : 0.7) * vel) });
      if (h !== ".") q.push({ t, fire: (s, at) => s.hat(at, (h === "X" ? 1 : 0.55) * vel) });
      if (tm !== ".") q.push({ t, fire: (s, at) => s.tom(at, (tm === "X" ? 1 : 0.7) * vel, 70 + (i % 3) * 14) });
      if (bs !== ".") {
        const note = g.bassNote ?? 38;
        q.push({ t, fire: (s, at) => s.bass(at, note + (bs === "X" ? 0 : 0), step * 1.8, 0.5 * vel) });
      }
      if (ar !== ".") {
        const notes = g.arpNotes ?? [62, 65, 69, 72];
        const nn = notes[ai++ % notes.length];
        q.push({ t, fire: (s, at) => s.pluck(at, nn, 0.12 * vel * (ar === "X" ? 1.4 : 1)) });
      }
    }
  }
  return q.sort((a, b) => a.t - b.t);
}

// ------------------------------------------------------------------- Synth
export class Synth implements Scorer {
  ctx: AudioContext;
  bus: GainNode;
  rev: GainNode;
  master: GainNode;
  off = 0;
  idx = 0;
  bidx = 0;
  cues: Cue[];
  noise: AudioBuffer;
  nodes: AudioScheduledSourceNode[] = [];
  droneOsc: OscillatorNode[] = [];
  droneGain: GainNode;
  droneFilt: BiquadFilterNode;
  subOsc: OscillatorNode;
  subGain: GainNode;
  choirOsc: OscillatorNode[] = [];
  choirGain: GainNode;
  f1: BiquadFilterNode;
  f2: BiquadFilterNode;
  padOsc: OscillatorNode[] = [];
  padGain: GainNode;
  seaGain: GainNode;
  seaFilt: BiquadFilterNode;
  dead = false;

  constructor(ctx: AudioContext, outs: AudioNode[], public spec: ScoreSpec) {
    this.ctx = ctx;
    this.cues = [...spec.cues, ...grooveCues(spec.grooves ?? [])].sort((a, b) => a.t - b.t);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.008;
    comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = spec.master ?? 0.85;
    this.master.connect(comp);
    outs.forEach((o) => comp.connect(o));
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    // reverb
    const len = Math.floor(ctx.sampleRate * 3.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.rev = ctx.createGain();
    this.rev.connect(conv);
    const rg = ctx.createGain();
    rg.gain.value = 0.5;
    conv.connect(rg);
    rg.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // drone
    this.droneFilt = ctx.createBiquadFilter();
    this.droneFilt.type = "lowpass";
    this.droneFilt.Q.value = 3;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneFilt.connect(this.droneGain);
    this.route(this.droneGain, 0.35);
    [1, 1.5, 2, 3].forEach((r, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 36.71 * r;
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.25 / (i + 1);
      o.connect(g);
      g.connect(this.droneFilt);
      o.start();
      this.droneOsc.push(o);
      this.nodes.push(o);
    });
    // sub
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.value = 36.7;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.bus);
    this.subOsc.start();
    this.nodes.push(this.subOsc);
    // choir
    this.choirGain = ctx.createGain();
    this.choirGain.gain.value = 0;
    this.f1 = ctx.createBiquadFilter();
    this.f2 = ctx.createBiquadFilter();
    for (const f of [this.f1, this.f2]) {
      f.type = "bandpass";
      f.Q.value = 5;
    }
    this.f1.frequency.value = 500;
    this.f2.frequency.value = 1000;
    const cin = ctx.createGain();
    cin.connect(this.f1);
    cin.connect(this.f2);
    this.f1.connect(this.choirGain);
    this.f2.connect(this.choirGain);
    this.route(this.choirGain, 0.6);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.1;
    const lg = ctx.createGain();
    lg.gain.value = 9;
    lfo.connect(lg);
    lfo.start();
    this.nodes.push(lfo);
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 146.83;
      o.detune.value = (i - 2) * 4;
      lg.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = 0.2;
      o.connect(g);
      g.connect(cin);
      o.start();
      this.choirOsc.push(o);
      this.nodes.push(o);
    }
    // shimmer pad
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    const pf = ctx.createBiquadFilter();
    pf.type = "lowpass";
    pf.frequency.value = 3200;
    pf.connect(this.padGain);
    this.route(this.padGain, 0.7);
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = 293.66;
      o.detune.value = (i - 2) * 7;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      o.connect(g);
      g.connect(pf);
      o.start();
      this.padOsc.push(o);
      this.nodes.push(o);
    }
    // sea / water
    const ns = ctx.createBufferSource();
    ns.buffer = this.noise;
    ns.loop = true;
    this.seaFilt = ctx.createBiquadFilter();
    this.seaFilt.type = "lowpass";
    this.seaFilt.frequency.value = 500;
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0;
    ns.connect(this.seaFilt);
    this.seaFilt.connect(this.seaGain);
    this.route(this.seaGain, 0.25);
    ns.start();
    this.nodes.push(ns);
  }

  route(n: AudioNode, wet: number) {
    n.connect(this.bus);
    const g = this.ctx.createGain();
    g.gain.value = wet;
    n.connect(g);
    g.connect(this.rev);
  }

  start(t: number) {
    this.off = this.ctx.currentTime - t;
    this.idx = this.cues.findIndex((c) => c.t >= t - 0.001);
    if (this.idx < 0) this.idx = this.cues.length;
    this.bidx = this.spec.beats.findIndex((b) => b >= t - 0.001);
    if (this.bidx < 0) this.bidx = this.spec.beats.length;
    this.update(t, true);
  }

  chordAt(t: number) {
    let c = this.spec.chords[0][1];
    for (const [ct, ch] of this.spec.chords) if (t >= ct) c = ch;
    return c;
  }

  update(t: number, snap = false) {
    if (this.dead) return;
    const sp = this.spec;
    const now = this.ctx.currentTime;
    const tc = snap ? 0.001 : 0.12;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, now, tc);
    const ten = sp.tension(t);
    const dl = sp.drone(t);
    set(this.droneGain.gain, dl * 0.2);
    set(this.droneFilt.frequency, lerp(90, 2600, ten));
    this.droneOsc.forEach((o, i) => set(o.detune, (i - 1.5) * (6 + ten * 24)));
    set(this.subOsc.frequency, sp.subFreq(t));
    set(this.subGain.gain, sp.sub(t) * 0.32);
    set(this.choirGain.gain, sp.choir(t) * 0.28);
    const ch = this.chordAt(t);
    this.choirOsc.forEach((o, i) => set(o.frequency, 146.83 * Math.pow(2, ch[i % ch.length] / 12)));
    this.padOsc.forEach((o, i) => set(o.frequency, 293.66 * Math.pow(2, (ch[i % ch.length] + (i > 2 ? 12 : 0)) / 12)));
    set(this.padGain.gain, sp.pad(t) * 0.2);
    set(this.seaGain.gain, sp.sea(t) * 0.5);
    set(this.seaFilt.frequency, sp.seaCut(t));
    const LOOK = 0.25;
    while (this.idx < this.cues.length && this.cues[this.idx].t < t + LOOK) {
      const c = this.cues[this.idx++];
      const at = this.off + c.t;
      if (at > now - 0.05) c.fire(this, Math.max(at, now));
    }
    while (this.bidx < sp.beats.length && sp.beats[this.bidx] < t + LOOK) {
      const b = sp.beats[this.bidx++];
      const at = this.off + b;
      if (at > now - 0.05) this.heartbeat(Math.max(at, now), b);
    }
  }

  dispose() {
    this.dead = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.04);
    setTimeout(() => {
      this.nodes.forEach((n) => {
        try { n.stop(); } catch { /* already stopped */ }
      });
      try { this.master.disconnect(); } catch { /* noop */ }
    }, 400);
  }

  // ------------------------------------------------------------ voices
  env(g: GainNode, at: number, a: number, d: number, peak: number) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  }
  src(osc: AudioScheduledSourceNode, at: number, dur: number) {
    osc.start(at);
    osc.stop(at + dur);
    this.nodes.push(osc);
    if (this.nodes.length > 400) this.nodes.splice(0, 200);
  }
  noiseSrc(at: number, dur: number) {
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    n.loop = true;
    this.src(n, at, dur);
    return n;
  }

  heartbeat(at: number, bt: number) {
    const vol = this.spec.heartVol(bt);
    if (vol <= 0.01) return;
    const kind = this.spec.heartKind(bt);
    const layers: [number, number][] = kind < 0.5 ? [[62, 0.75]] : kind < 1.5 ? [[118, 0.35]] : [[62, 0.7], [118, 0.3]];
    for (const [f0, amp] of layers) {
      const baby = f0 > 100;
      for (const [dly, k] of [[0, 1], [baby ? 0.2 : 0.26, 0.62]] as [number, number][]) {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(f0 * (baby ? 1.25 : 1.45), at + dly);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + dly + 0.16);
        const g = this.ctx.createGain();
        this.env(g, at + dly, 0.008, baby ? 0.14 : 0.3, vol * k * amp);
        o.connect(g);
        this.route(g, 0.12);
        this.src(o, at + dly, 0.5);
        const n = this.noiseSrc(at + dly, 0.08);
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = baby ? 600 : 280;
        const ng = this.ctx.createGain();
        this.env(ng, at + dly, 0.004, 0.05, vol * k * 0.3 * amp);
        n.connect(lp);
        lp.connect(ng);
        this.route(ng, 0.05);
      }
    }
  }
  bell(at: number, midi: number, vel = 0.3, dur = 3, cents = 0, drop = 0) {
    const f = mtof(midi);
    for (const [r, a] of [[1, 1], [2.76, 0.28], [5.4, 0.1], [8.9, 0.04]] as [number, number][]) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f * r, at);
      o.detune.setValueAtTime(cents, at);
      if (drop) o.detune.linearRampToValueAtTime(cents - drop, at + dur);
      const g = this.ctx.createGain();
      this.env(g, at, 0.003, dur / r, vel * a);
      o.connect(g);
      this.route(g, 0.55);
      this.src(o, at, dur + 0.1);
    }
  }
  boom(at: number, vel = 0.9, len = 2.2) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(95, at);
    o.frequency.exponentialRampToValueAtTime(28, at + len * 0.6);
    const g = this.ctx.createGain();
    this.env(g, at, 0.006, len, vel);
    o.connect(g);
    this.route(g, 0.4);
    this.src(o, at, len + 0.1);
    const n = this.noiseSrc(at, len);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, at);
    lp.frequency.exponentialRampToValueAtTime(90, at + len * 0.7);
    const ng = this.ctx.createGain();
    this.env(ng, at, 0.004, len * 0.7, vel * 0.7);
    n.connect(lp);
    lp.connect(ng);
    this.route(ng, 0.5);
  }
  crack(at: number, vel = 0.5) {
    const n = this.noiseSrc(at, 0.5);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    for (let i = 0; i < 6; i++) {
      g.gain.linearRampToValueAtTime(vel * (1 - i * 0.12) * (i % 2 ? 0.4 : 1), at + i * 0.045 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.01, at + i * 0.045 + 0.04);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    n.connect(hp);
    hp.connect(g);
    this.route(g, 0.35);
    this.boom(at, vel * 0.8, 1.4);
  }
  riser(at: number, dur: number, f0: number, f1: number, vol = 0.3, down = false) {
    const n = this.noiseSrc(at, dur + 0.3);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(f0, at);
    bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    if (down) {
      g.gain.linearRampToValueAtTime(vol, at + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(vol, at + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.25);
    }
    n.connect(bp);
    bp.connect(g);
    this.route(g, 0.4);
  }
  braam(at: number, vel = 0.5, len = 3) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(300, at);
    lp.frequency.exponentialRampToValueAtTime(3200, at + 0.35);
    lp.frequency.exponentialRampToValueAtTime(200, at + len);
    const g = this.ctx.createGain();
    this.env(g, at, 0.05, len, vel);
    lp.connect(g);
    this.route(g, 0.45);
    [1, 1.498, 2, 2.997].forEach((r, i) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(49 * r, at);
      o.frequency.exponentialRampToValueAtTime(49 * r * 0.5, at + len);
      o.detune.value = (i - 1.5) * 9;
      const og = this.ctx.createGain();
      og.gain.value = 0.3 / (i * 0.5 + 1);
      o.connect(og);
      og.connect(lp);
      this.src(o, at, len + 0.1);
    });
  }
  cry(at: number, dur: number, base = 560, vol = 0.14) {
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(base, at);
    o.frequency.linearRampToValueAtTime(base * 1.7, at + dur * 0.55);
    o.frequency.linearRampToValueAtTime(base * 1.25, at + dur);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 6.2;
    const vg = this.ctx.createGain();
    vg.gain.value = 22;
    vib.connect(vg);
    vg.connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + dur * 0.3);
    g.gain.linearRampToValueAtTime(vol * 0.7, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    for (const f of [900, 2600]) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 6;
      o.connect(bp);
      bp.connect(g);
    }
    this.route(g, 0.7);
    this.src(o, at, dur + 0.1);
    this.src(vib, at, dur + 0.1);
  }
  /** a deep whale-song glide */
  song(at: number, dur: number, f0 = 90, f1 = 170, vol = 0.18) {
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.5);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.8, at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    this.route(g, 0.8);
    this.src(o, at, dur + 0.1);
  }
  whisper(at: number, dur: number, vol = 0.1) {
    const n = this.noiseSrc(at, dur + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    for (let t = 0; t < dur; t += 0.07) g.gain.linearRampToValueAtTime(vol * (0.15 + hash(at * 3 + t * 9) * 0.85) * Math.sin((t / dur) * Math.PI), at + t);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
    for (const f of [1700, 3100, 5200]) {
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f * (1 + (hash(at + f) - 0.5) * 0.2);
      bp.Q.value = 4;
      n.connect(bp);
      bp.connect(g);
    }
    this.route(g, 0.7);
  }
  tone(at: number, f0: number, f1: number, dur: number, vol = 0.1, type: OscillatorType = "sine") {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.3, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    this.route(g, 0.5);
    this.src(o, at, dur + 0.1);
  }
  /** sonar ping */
  ping(at: number, midi = 91, vol = 0.18) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(mtof(midi), at);
    const g = this.ctx.createGain();
    this.env(g, at, 0.004, 2.4, vol);
    o.connect(g);
    this.route(g, 0.9);
    this.src(o, at, 2.6);
  }
  kick(at: number, vel = 1) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    const g = this.ctx.createGain();
    this.env(g, at, 0.002, 0.3, 0.7 * vel);
    o.connect(g);
    this.route(g, 0.06);
    this.src(o, at, 0.4);
  }
  snare(at: number, vel = 1) {
    const n = this.noiseSrc(at, 0.3);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    this.env(g, at, 0.002, 0.18, 0.32 * vel);
    n.connect(bp);
    bp.connect(g);
    this.route(g, 0.3);
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, at);
    o.frequency.exponentialRampToValueAtTime(120, at + 0.08);
    const og = this.ctx.createGain();
    this.env(og, at, 0.002, 0.1, 0.25 * vel);
    o.connect(og);
    this.route(og, 0.2);
    this.src(o, at, 0.2);
  }
  hat(at: number, vel = 1) {
    const n = this.noiseSrc(at, 0.1);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    this.env(g, at, 0.001, 0.04, 0.12 * vel);
    n.connect(hp);
    hp.connect(g);
    this.route(g, 0.08);
  }
  tom(at: number, vel = 1, f = 80) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.8, at);
    o.frequency.exponentialRampToValueAtTime(f, at + 0.18);
    const g = this.ctx.createGain();
    this.env(g, at, 0.003, 0.45, 0.6 * vel);
    o.connect(g);
    this.route(g, 0.35);
    this.src(o, at, 0.6);
    const n = this.noiseSrc(at, 0.06);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const ng = this.ctx.createGain();
    this.env(ng, at, 0.002, 0.04, 0.2 * vel);
    n.connect(lp);
    lp.connect(ng);
    this.route(ng, 0.1);
  }
  bass(at: number, midi: number, dur = 0.3, vol = 0.5) {
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = mtof(midi);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(900, at);
    lp.frequency.exponentialRampToValueAtTime(120, at + dur);
    const g = this.ctx.createGain();
    this.env(g, at, 0.005, dur, vol * 0.5);
    o.connect(lp);
    lp.connect(g);
    this.route(g, 0.1);
    this.src(o, at, dur + 0.1);
  }
  pluck(at: number, midi: number, vol = 0.12) {
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = mtof(midi);
    const g = this.ctx.createGain();
    this.env(g, at, 0.002, 0.45, vol);
    o.connect(g);
    this.route(g, 0.4);
    this.src(o, at, 0.55);
  }
  organ(at: number, midi: number, dur: number, vol = 0.1) {
    const f = mtof(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(this.bus);
    this.route(g, 0.4);
    [1, 2, 3, 4].forEach((r, i) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * r;
      const og = this.ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      o.connect(og);
      og.connect(g);
      this.src(o, at, dur + 0.1);
    });
  }
}

/** the lullaby: D-minor music box. major = given, warped = wrong */
export function addMotif(
  q: Cue[],
  t0: number,
  o: { semi?: number[]; step?: number; cents?: number; drop?: number; vel?: number; oct?: number; skip?: number[] } = {},
) {
  const semi = o.semi ?? [0, 3, 7, 5, 3, 2, 0];
  const step = o.step ?? 0.8;
  semi.forEach((s, i) => {
    if (o.skip?.includes(i)) return;
    q.push({ t: t0 + i * step, fire: (sc, at) => sc.bell(at, D5 + s + (o.oct ?? 0), o.vel ?? 0.22, 3.4, o.cents ?? 0, o.drop ?? 0) });
  });
}
export const MAJOR = [0, 4, 7, 5, 4, 2, 0];
