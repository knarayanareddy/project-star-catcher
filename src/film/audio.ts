import { BEATS, TICKS, hash, kf, lerp, DURATION } from "./util";
import { IMPACTS } from "./world";

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const D5 = 74;

type Fire = (s: Score, at: number) => void;
interface Cue { t: number; fire: Fire }

// ---------------------------------------------------------------- mix curves
const droneLevel = (t: number) =>
  kf(t, [[0, 0], [2.5, 0], [10, 0.25], [34, 0.35], [40, 0.5], [51.5, 0.55], [52.2, 0.08], [56, 0.3], [66, 0.3], [103.8, 0.12], [104.4, 0.03], [116, 0.05], [130, 0.4],
    [144, 0.75], [150, 0.9], [176.8, 0.8], [177, 0.2], [183.7, 0.8], [184, 0.0], [186, 0.3], [211.8, 0.5], [212, 0.2], [221.5, 0.7], [222, 0.0], [238, 0.1], [252, 0.12], [258, 0.28], [279, 0.2], [292, 0.1], [300, 0.04]]);
const tension = (t: number) =>
  kf(t, [[0, 0.05], [34, 0.2], [41, 0.5], [52, 0.3], [62, 0.6], [66, 0.1], [104, 0.05], [130, 0.4], [144, 0.8], [150, 1], [184, 1], [186, 0.3], [200, 0.5], [212, 0.8], [222, 0.5], [238, 0.2], [252, 0.1], [260, 0.2], [280, 0.4], [292, 0.1], [300, 0]]);
const choirLevel = (t: number) =>
  kf(t, [[0, 0], [104, 0], [124, 0], [132, 0.18], [143, 0.5], [150, 0.6], [176, 0.5], [184, 0], [212, 0], [214, 0.3], [221.8, 0.5], [222.2, 0.12], [236, 0.25], [238, 0], [252, 0], [256, 0.25], [268, 0.5], [277, 0.55], [280, 0.25], [290, 0.0], [296, 0.18], [300, 0]]);
const clusterLevel = (t: number) => kf(t, [[0, 0], [238, 0], [244, 0.25], [249, 0.55], [251.8, 0.8], [252.2, 0]]);
const seaLevel = (t: number) =>
  kf(t, [[0, 0], [3, 0.16], [28, 0.2], [40, 0.12], [51.5, 0.05], [52.2, 0], [61.9, 0], [62.4, 0.2], [100, 0.18], [104, 0.1], [110, 0], [134, 0], [140, 0.1], [150, 0.22], [176.8, 0.1], [184, 0.04], [200, 0.28], [211.6, 0.42], [212, 0], [238, 0.02], [252, 0.0], [258, 0.1], [280, 0.15], [300, 0.1]]);
const seaCut = (t: number) => kf(t, [[0, 500], [150, 900], [184, 400], [211, 2200], [300, 600]]);
const heartVol = (t: number) =>
  kf(t, [[0, 0], [1.6, 0], [3, 0.5], [100, 0.55], [104, 0.65], [110, 0.85], [144, 0.95], [150, 0.8], [168, 0.4], [177, 0.8], [184, 0.6], [212, 0.45], [222, 0.18], [238, 0.12], [252, 0.7], [280, 0.7], [292, 0.5], [300, 0.5]]);
const shepLevel = (t: number) => kf(t, [[0, 0], [150.5, 0], [153, 0.3], [167, 0.35], [168, 0], [177, 0], [178, 0.3], [183.7, 0.5], [184, 0], [222, 0], [224, 0.4], [236, 0.45], [237.9, 0], [238, 0]]);
const shepRate = (t: number) => kf(t, [[150, -0.05], [183, -0.3], [222, 0.12], [236, 0.4]]);
const subFreq = (t: number) => kf(t, [[0, 36.7], [104, 36.7], [112, 27.5], [144, 27.5], [150, 36.7], [252, 36.7], [280, 32.7]]);
const subBoost = (t: number) => kf(t, [[0, 0], [104, 0], [128, 0.5], [143, 1], [144.5, 0.4], [300, 0.2]]);
const topHum = (t: number) => kf(t, [[0, 0], [167.8, 0], [168.5, 0.12], [176.8, 0.2], [177, 0]]);
const breath = (t: number) => kf(t, [[0, 0], [56, 0], [57, 0.06], [61, 0.08], [61.6, 0]]);

// choir chords as semitone offsets from D3
const CHORDS: [number, number[]][] = [
  [0, [0, 7, 12, 15, 19]],
  [104, [0, 1, 7, 12, 13]],
  [132, [-2, 5, 10, 14, 17]],
  [144, [-5, 0, 3, 7, 10]],
  [160, [-7, -2, 3, 7, 10]],
  [172, [-2, 1, 6, 13, 18]],
  [214, [0, 7, 12, 14, 19]],
  [222, [0, 5, 12, 17, 19]],
  [252, [0, 7, 12, 16, 19]],
  [270, [0, 4, 7, 12, 16]],
  [280, [0, 3, 6, 12, 15]],
  [296, [-2, 5, 10, 13, 17]],
];
const chordAt = (t: number) => {
  let c = CHORDS[0][1];
  for (const [ct, ch] of CHORDS) if (t >= ct) c = ch;
  return c;
};

// ------------------------------------------------------------------- Score
export class Score {
  ctx: AudioContext;
  bus: GainNode;
  rev: GainNode;
  master: GainNode;
  off = 0;
  idx = 0;
  bidx = 0;
  tidx = 0;
  cues: Cue[] = buildCues();
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
  clusterGain: GainNode;
  shepOsc: OscillatorNode[] = [];
  shepGain: GainNode[] = [];
  shepPhase = 0;
  seaGain: GainNode;
  seaFilt: BiquadFilterNode;
  topOsc: OscillatorNode;
  topGain: GainNode;
  breathGain: GainNode;
  lastT = 0;
  dead = false;

  constructor(ctx: AudioContext, outs: AudioNode[]) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(comp);
    outs.forEach((o) => comp.connect(o));
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    // reverb
    const len = Math.floor(ctx.sampleRate * 4.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.7);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.rev = ctx.createGain();
    this.rev.gain.value = 1;
    this.rev.connect(conv);
    const rg = ctx.createGain();
    rg.gain.value = 0.55;
    conv.connect(rg);
    rg.connect(this.master);
    // noise
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
    const cin = ctx.createGain();
    cin.gain.value = 1;
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
    // cluster
    this.clusterGain = ctx.createGain();
    this.clusterGain.gain.value = 0;
    const cf = ctx.createBiquadFilter();
    cf.type = "lowpass";
    cf.frequency.value = 1100;
    cf.connect(this.clusterGain);
    this.route(this.clusterGain, 0.6);
    for (let i = 0; i < 10; i++) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 146.83 * Math.pow(2, (i * 0.55) / 12) * (i % 3 === 2 ? 2 : 1);
      o.detune.value = (hash(i) - 0.5) * 20;
      const g = ctx.createGain();
      g.gain.value = 0.07;
      o.connect(g);
      g.connect(cf);
      o.start();
      this.nodes.push(o);
    }
    // shepard
    const sbus = ctx.createGain();
    sbus.gain.value = 1;
    this.route(sbus, 0.4);
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 30 * Math.pow(2, i);
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(sbus);
      o.start();
      this.shepOsc.push(o);
      this.shepGain.push(g);
      this.nodes.push(o);
    }
    // sea
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
    // wobbling top (cockpit)
    this.topOsc = ctx.createOscillator();
    this.topOsc.type = "triangle";
    this.topOsc.frequency.value = 196;
    this.topGain = ctx.createGain();
    this.topGain.gain.value = 0;
    this.topOsc.connect(this.topGain);
    this.route(this.topGain, 0.3);
    this.topOsc.start();
    this.nodes.push(this.topOsc);
    // breathing lens
    const bn = ctx.createBufferSource();
    bn.buffer = this.noise;
    bn.loop = true;
    const bf = ctx.createBiquadFilter();
    bf.type = "bandpass";
    bf.frequency.value = 420;
    bf.Q.value = 1.2;
    this.breathGain = ctx.createGain();
    this.breathGain.gain.value = 0;
    bn.connect(bf);
    bf.connect(this.breathGain);
    this.route(this.breathGain, 0.3);
    bn.start();
    this.nodes.push(bn);
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
    this.bidx = BEATS.findIndex((b) => b >= t - 0.001);
    if (this.bidx < 0) this.bidx = BEATS.length;
    this.tidx = TICKS.findIndex((b) => b >= t - 0.001);
    if (this.tidx < 0) this.tidx = TICKS.length;
    this.lastT = t;
    this.update(t, true);
  }

  update(t: number, snap = false) {
    if (this.dead) return;
    const now = this.ctx.currentTime;
    const dt = Math.max(0, t - this.lastT);
    this.lastT = t;
    const tc = snap ? 0.001 : 0.12;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, now, tc);
    const ten = tension(t);
    set(this.droneGain.gain, droneLevel(t) * 0.2);
    set(this.droneFilt.frequency, lerp(90, 2600, ten));
    this.droneOsc.forEach((o, i) => set(o.detune, (i - 1.5) * (6 + ten * 24)));
    set(this.subOsc.frequency, subFreq(t));
    set(this.subGain.gain, (droneLevel(t) * 0.35 + subBoost(t) * 0.3) * 0.9);
    set(this.choirGain.gain, choirLevel(t) * 0.28);
    const ah = kf(t, [[0, 0], [250, 0], [253, 1], [280, 1], [286, 0]]);
    set(this.f1.frequency, lerp(330, 780, ah));
    set(this.f2.frequency, lerp(820, 1200, ah));
    const ch = chordAt(t);
    this.choirOsc.forEach((o, i) => set(o.frequency, 146.83 * Math.pow(2, ch[i] / 12) * (i > 2 ? 1 : 1)));
    set(this.clusterGain.gain, clusterLevel(t) * 0.3);
    set(this.seaGain.gain, seaLevel(t) * 0.5);
    set(this.seaFilt.frequency, seaCut(t));
    set(this.topGain.gain, topHum(t));
    set(this.topOsc.frequency, 196 * (1 + 0.025 * smoothWob(t) * Math.sin(t * 3.1)));
    set(this.breathGain.gain, breath(t) * (0.6 + 0.4 * Math.sin(t * 2.2)));
    // shepard
    this.shepPhase += shepRate(t) * dt;
    const lv = shepLevel(t);
    for (let i = 0; i < 6; i++) {
      const pos = (((i + this.shepPhase) % 6) + 6) % 6;
      set(this.shepOsc[i].frequency, 30 * Math.pow(2, pos));
      set(this.shepGain[i].gain, Math.pow(Math.sin((pos / 6) * Math.PI), 2) * lv * 0.16);
    }
    // events
    const LOOK = 0.25;
    while (this.idx < this.cues.length && this.cues[this.idx].t < t + LOOK) {
      const c = this.cues[this.idx++];
      const at = this.off + c.t;
      if (at > now - 0.05) c.fire(this, Math.max(at, now));
    }
    while (this.bidx < BEATS.length && BEATS[this.bidx] < t + LOOK) {
      const b = BEATS[this.bidx++];
      const at = this.off + b;
      if (at > now - 0.05) this.heartbeat(Math.max(at, now), b);
    }
    while (this.tidx < TICKS.length && TICKS[this.tidx] < t + LOOK) {
      const b = TICKS[this.tidx++];
      const at = this.off + b;
      if (at > now - 0.05) this.tick(Math.max(at, now));
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
    const vol = heartVol(bt);
    if (vol <= 0.01) return;
    const baby = bt > 266.5 && bt < 290;
    const f0 = baby ? 118 : 62;
    for (const [dly, k] of [[0, 1], [0.26, 0.62]] as [number, number][]) {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f0 * (baby ? 1.25 : 1.45), at + dly);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + dly + 0.16);
      const g = this.ctx.createGain();
      this.env(g, at + dly, 0.008, baby ? 0.14 : 0.3, vol * k * (baby ? 0.35 : 0.75));
      o.connect(g);
      this.route(g, 0.12);
      this.src(o, at + dly, 0.5);
      // body click
      const n = this.noiseSrc(at + dly, 0.08);
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = baby ? 600 : 280;
      const ng = this.ctx.createGain();
      this.env(ng, at + dly, 0.004, 0.05, vol * k * 0.3);
      n.connect(lp);
      lp.connect(ng);
      this.route(ng, 0.05);
    }
  }
  tick(at: number) {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 1650;
    const g = this.ctx.createGain();
    this.env(g, at, 0.001, 0.07, 0.22);
    o.connect(g);
    this.route(g, 0.2);
    this.src(o, at, 0.15);
    const n = this.noiseSrc(at, 0.05);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3500;
    const ng = this.ctx.createGain();
    this.env(ng, at, 0.001, 0.025, 0.2);
    n.connect(hp);
    hp.connect(ng);
    this.route(ng, 0.1);
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

const smoothWob = (t: number) => kf(t, [[168, 0.1], [176.8, 1.0]]);

// ---------------------------------------------------------------- cue sheet
function buildCues(): Cue[] {
  const q: Cue[] = [];
  const add = (t: number, fire: Fire) => q.push({ t, fire });
  // lullaby: D minor "Star Child" theme (the motif that returns, warped, through the series)
  const motif = (t0: number, o: { semi?: number[]; step?: number; cents?: number; drop?: number; vel?: number; oct?: number; skip?: number[] } = {}) => {
    const semi = o.semi ?? [0, 3, 7, 5, 3, 2, 0];
    const step = o.step ?? 0.8;
    semi.forEach((s, i) => {
      if (o.skip?.includes(i)) return;
      add(t0 + i * step, (sc, at) => sc.bell(at, D5 + s + (o.oct ?? 0), o.vel ?? 0.22, 3.4, o.cents ?? 0, o.drop ?? 0));
    });
  };
  const MAJ = [0, 4, 7, 5, 4, 2, 0];

  // 1 — the breathing lanterns
  add(2.2, (s, at) => s.bell(at, D5 - 12, 0.3, 4));
  motif(4.2, { vel: 0.16, step: 0.95 });
  motif(14.4, { vel: 0.14, step: 1.05, cents: -8 });
  motif(24.2, { vel: 0.14, step: 1.15, cents: -22, drop: 30, skip: [4] });
  add(27.0, (s, at) => { s.boom(at, 0.5, 3.5); s.riser(at - 2.4, 2.4, 300, 3200, 0.14); });
  add(31.8, (s, at) => s.whisper(at, 2.0, 0.08));
  add(33.15, (s, at) => s.crack(at, 0.35));

  // 2 — starfall
  add(34.2, (s, at) => s.whisper(at, 3.0, 0.07));
  motif(37.5, { vel: 0.16, step: 1.2, cents: -35, drop: 60, skip: [2, 5] });
  [41.0, 43.0, 44.6, 46.2].forEach((t, i) => add(t, (s, at) => s.crack(at, 0.6 - i * 0.05)));
  for (let i = 0; i < 22; i++) {
    const ts = 40.4 + hash(i * 3.7) * 11.6;
    add(ts, (s, at) => s.riser(at, 0.8, 4200, 900, 0.07, true));
  }
  for (let i = 0; i < 26; i++) add(44 + i * 0.28 + hash(i) * 0.2, (s, at) => s.bell(at, 98 + Math.floor(hash(i + 3) * 18), 0.07, 2.2));
  add(48.2, (s, at) => s.riser(at, 3.3, 200, 5000, 0.2));
  add(51.6, (s, at) => s.boom(at, 0.5, 2));
  add(52.3, (s, at) => s.cry(at, 9, 480, 0.12));
  add(56.0, (s, at) => s.tone(at, 1760, 160, 5, 0.05));
  add(58.0, (s, at) => s.braam(at, 0.2, 3));
  add(61.95, (s, at) => { s.boom(at, 1, 3.4); s.crack(at, 0.5); });
  add(63, (s, at) => s.cry(at, 3.2, 700, 0.1));

  // 3 — the net of light
  motif(67, { vel: 0.18, step: 0.9, cents: -6 });
  add(75, (s, at) => s.boom(at, 0.35, 1.6));
  add(76.2, (s, at) => s.boom(at, 0.45, 1.6));
  add(77.1, (s, at) => { s.boom(at, 0.55, 1.8); s.riser(at, 1.2, 600, 6000, 0.2, true); });
  [0, 3, 7, 12, 15, 19, 24].forEach((n, i) => add(83.5 + i * 0.13, (s, at) => s.bell(at, D5 + n, 0.2, 4)));
  add(83.5, (s, at) => s.boom(at, 0.5, 2));
  add(86, (s, at) => s.whisper(at, 4, 0.1));
  motif(88.5, { vel: 0.2, step: 0.9, oct: 0 });
  add(94.5, (s, at) => s.riser(at, 2.6, 250, 4000, 0.18));
  add(97.0, (s, at) => { s.tone(at, 1174, 1170, 6, 0.16); s.bell(at, D5 + 12, 0.3, 6); s.boom(at, 0.5, 2.2); });
  add(98, (s, at) => s.cry(at, 2.6, 900, 0.07));
  motif(98.4, { vel: 0.16, step: 0.55, oct: 12 });
  add(100.5, (s, at) => { s.boom(at, 0.8, 3); s.whisper(at, 3, 0.1); });
  add(102.5, (s, at) => s.bell(at, D5 + 6, 0.2, 3.5)); // the wrong note
  add(103.9, (s, at) => s.boom(at, 0.4, 1));

  // 4 — mother
  add(112, (s, at) => s.bell(at, D5 - 24, 0.3, 6));
  add(119, (s, at) => s.bell(at, D5 - 24 + 1, 0.2, 6));
  add(116, (s, at) => s.riser(at, 12, 80, 1600, 0.18));
  add(128, (s, at) => s.boom(at, 0.45, 4));
  add(130, (s, at) => s.whisper(at, 8, 0.09));
  add(138, (s, at) => s.riser(at, 6, 120, 3000, 0.25));
  add(141, (s, at) => s.tone(at, 55, 40, 4, 0.2, "sawtooth"));
  add(144, (s, at) => { s.boom(at, 1.0, 5); s.braam(at, 0.35, 4); });

  // 5 — the fold
  IMPACTS.slice(0, 7).forEach((ti, i) => add(ti, (s, at) => s.boom(at, 0.55 - i * 0.04, 2.4)));
  add(148, (s, at) => s.riser(at, 3.5, 200, 7000, 0.25));
  add(151.5, (s, at) => { s.braam(at, 0.75, 4.5); s.boom(at, 1, 4); });
  add(152, (s, at) => s.cry(at, 6, 500, 0.08));
  add(168.2, (s, at) => s.boom(at, 0.3, 2));
  for (let i = 0; i < 8; i++) add(170 + i * 0.9, (s, at) => s.bell(at, D5 + [0, 3, 7, 10, 12, 10, 7, 3][i] - 24, 0.12, 3));
  add(177.0, (s, at) => { s.braam(at, 0.8, 3.6); s.boom(at, 0.8, 3); });
  add(178, (s, at) => s.riser(at, 5.6, 200, 9000, 0.35));
  add(183.85, (s, at) => { s.boom(at, 1.0, 1.5); s.crack(at, 0.8); });

  // 6 — Miller's tide: the ostinato under the clock
  const pat = [0, 7, 12, 7, 14, 7, 12, 7];
  for (let i = 0, t = 186; t < 211.6; i++, t += 0.5) {
    const m = D5 - 36 + pat[i % 8] + (t > 200 ? 3 * ((Math.floor((t - 200) / 3)) % 2) : 0);
    add(t, (s, at) => s.organ(at, m, 0.7, 0.05 + 0.06 * Math.min(1, (t - 186) / 22)));
  }
  add(184.8, (s, at) => s.riser(at, 26, 90, 1200, 0.22));
  motif(196, { vel: 0.1, step: 1.4, oct: 12, cents: 12 });
  add(211.6, (s, at) => s.boom(at, 0.7, 2));

  // 7 — the threshold
  add(212, (s, at) => { s.organ(at, D5 - 36, 8, 0.2); s.organ(at, D5 - 29, 8, 0.15); s.organ(at, D5 - 24, 8, 0.12); });
  add(218, (s, at) => { s.organ(at, D5 - 34, 5, 0.2); s.organ(at, D5 - 27, 5, 0.15); s.riser(at, 4, 200, 8000, 0.3); });
  add(222.0, (s, at) => { s.boom(at, 1, 3); s.crack(at, 0.6); });
  for (let i = 0; i < 70; i++) add(224 + i * 0.2, (s, at) => s.bell(at, 96 + Math.floor(hash(i * 1.3) * 22), 0.05, 2.4));
  add(226, (s, at) => s.riser(at, 5, 60, 600, 0.3));
  add(231, (s, at) => s.boom(at, 0.5, 4));
  for (let i = 0; i < 60; i++) add(231 + i * 0.11, (s, at) => s.bell(at, 84 + Math.floor(hash(i * 2.1) * 24), 0.06, 3));
  add(236.4, (s, at) => s.riser(at, 1.6, 400, 9000, 0.3));
  add(238.0, (s, at) => s.boom(at, 0.4, 2));
  motif(239, { vel: 0.18, step: 1.35, cents: -12, drop: 90, oct: -12 });
  add(245.4, (s, at) => s.whisper(at, 3, 0.1));
  add(249.0, (s, at) => { s.braam(at, 0.45, 5); });
  [0, 1, 2, 3].forEach((i) => add(249.4 + i * 0.8, (s, at) => s.organ(at, D5 - 24 + [0, 2, 4, 7][i], 3, 0.12)));
  add(251.9, (s, at) => s.boom(at, 0.8, 1.5));

  // 8 — the lantern heart
  motif(253, { semi: MAJ, vel: 0.2, step: 0.9 });
  add(256.5, (s, at) => s.tone(at, 220, 880, 5, 0.06));
  motif(261, { semi: MAJ, vel: 0.2, step: 0.8, oct: 12 });
  add(263.0, (s, at) => { s.bell(at, D5, 0.35, 7); s.bell(at, D5 + 7, 0.25, 7); });
  add(267.2, (s, at) => { s.boom(at, 0.5, 3); s.cry(at, 3.5, 880, 0.1); });
  [0, 4, 7, 12, 16, 19, 24, 28].forEach((n, i) => add(268.5 + i * 0.35, (s, at) => s.bell(at, D5 + n, 0.18, 4)));
  motif(272.5, { semi: MAJ, vel: 0.22, step: 0.6, oct: 12 });
  add(277.3, (s, at) => { s.boom(at, 0.5, 3.4); s.bell(at, D5 + 24, 0.3, 7); });

  // 9 — the drowned sky
  add(281, (s, at) => s.whisper(at, 6, 0.08));
  add(283, (s, at) => s.tone(at, 70, 55, 8, 0.12, "sawtooth"));
  add(289, (s, at) => s.bell(at, D5 - 12, 0.25, 6, -40, 80));
  add(292.5, (s, at) => s.bell(at, D5 - 11, 0.18, 6, -60, 120));
  add(295.4, (s, at) => {
    s.boom(at, 1.0, 5);
    s.tone(at, 200, 2400, 0.3, 0.15, "sawtooth");
    s.crack(at, 0.5);
    s.braam(at + 0.1, 0.5, 5);
  });
  [0, 3, 7, 5, 3].forEach((n, i) => add(296.6 + i * 0.85, (s, at) => s.bell(at, D5 + n - 12, 0.2, 5, -30 - i * 25, 120)));
  add(299.2, (s, at) => s.boom(at, 0.3, 1.2));
  void DURATION;
  return q.sort((a, b) => a.t - b.t);
}
