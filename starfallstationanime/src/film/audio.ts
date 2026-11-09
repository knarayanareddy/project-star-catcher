// The score: synthesised entirely in code, rendered offline, locked to the picture's beat grid.
// 96 BPM -> 1 beat = 0.625 s, 1 bar = 2.5 s. Key: B minor -> D major.
import { DURATION, rng, prog, eoc, clamp } from './util';
import { SKY_STARS } from './shots1';

export const SR = 44100;
const BEAT = 60 / 96;
const BAR = BEAT * 4;
const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// chord tables: Bm, G, D, A
const ARP = [
  [59, 62, 66, 71],
  [55, 59, 62, 67],
  [57, 62, 66, 69],
  [57, 61, 64, 69],
];
const PAD = [
  [50, 54, 59, 62],
  [55, 59, 62, 67],
  [50, 57, 62, 66],
  [52, 57, 61, 64],
];
const ROOT = [35, 31, 38, 33];
const HIT = 92.5; // the star docks: the picture flashes on this frame

const chordAt = (t: number) =>
  t < HIT ? ((Math.floor(t / BAR) % 4) + 4) % 4 : ((Math.floor((t - HIT) / BAR) % 4) + 4) % 4;

// the theme: [beat, midi, beats]
const THEME: [number, number, number][] = [
  [0, 78, 1.5], [1.5, 76, 0.5], [2, 74, 2],
  [4, 74, 1.5], [5.5, 71, 0.5], [6, 74, 1], [7, 79, 1],
  [8, 78, 1.5], [9.5, 74, 0.5], [10, 78, 1], [11, 81, 1],
  [12, 81, 2], [14, 76, 1], [15, 73, 1],
];
const PENT = [74, 76, 78, 81, 83];

export async function renderScore(onProgress?: (p: number) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.floor(SR * DURATION), SR);
  const r = rng(2024);

  // ---------- buses ----------
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -21;
  comp.ratio.value = 4;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(1.9, 2.5);
  master.gain.setValueAtTime(1.9, DURATION - 2.4);
  master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const dry = ctx.createGain();
  dry.connect(master);
  // seeded impulse response
  const irLen = Math.floor(SR * 3.8);
  const ir = ctx.createBuffer(2, irLen, SR);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / irLen, 2.6);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const NOREV = !!(globalThis as unknown as { __NOREV?: boolean }).__NOREV;
  const wetOut = ctx.createGain();
  wetOut.gain.value = 0.85;
  conv.connect(wetOut);
  wetOut.connect(master);
  const wet = ctx.createGain();
  if (!NOREV) wet.connect(conv);
  const send = (n: AudioNode, amt: number) => {
    n.connect(dry);
    const g = ctx.createGain();
    g.gain.value = amt;
    n.connect(g);
    g.connect(wet);
  };

  const nb = ctx.createBuffer(1, SR * 3, SR);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  const noise = (t: number, dur: number) => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    s.start(t, (t * 1.37) % 2, dur + 0.05);
    return s;
  };

  // ---------- instruments ----------
  const _piano = (t: number, f: number, v = 0.22, sd = 0.35) => {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(9000, 1400 + f * 4);
    const dur = 2.8 - Math.min(1.7, f / 1100);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(v * 0.28, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const parts: [number, OscillatorType, number][] = [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]];
    parts.forEach(([m, type, a]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * m;
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
    g.connect(lp);
    send(lp, sd);
  };
  const _pad = (t: number, f: number, dur: number, v = 0.04, bright = 900, att = 1.2, sd = 0.55) => {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bright;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
    [-8, 8].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.7);
    });
    lp.connect(g);
    send(g, sd);
  };
  const _lead = (t: number, f: number, dur: number, v = 0.07, bright = 2600) => {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bright;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.08);
    g.gain.setValueAtTime(v * 0.85, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.value = f * 0.006;
    lfo.connect(lg);
    (['sawtooth', 'triangle'] as OscillatorType[]).forEach((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = i * 6;
      lg.connect(o.frequency);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.5);
    });
    lfo.start(t);
    lfo.stop(t + dur + 0.5);
    lp.connect(g);
    send(g, 0.5);
  };
  const _bell = (t: number, f: number, v = 0.1, sd = 0.7, len = 3) => {
    const parts: [number, number, number][] = [[1, 1, len], [2.76, 0.32, len * 0.45], [5.4, 0.14, len * 0.2], [0.5, 0.25, len * 1.1]];
    const out = ctx.createGain();
    parts.forEach(([m, a, d]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    });
    send(out, sd);
  };
  const _pluck = (t: number, f: number, v = 0.06) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(lp);
    lp.connect(g);
    o.start(t);
    o.stop(t + 0.35);
    send(g, 0.3);
  };
  const _bass = (t: number, f: number, dur: number, v = 0.2) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    (['sine', 'triangle'] as OscillatorType[]).forEach((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i ? 0.35 : 1;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
    send(g, 0.08);
  };
  const _kick = (t: number, v = 0.5) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(135, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.5);
    send(g, 0.05);
  };
  const _snare = (t: number, v = 0.22) => {
    const n = noise(t, 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    n.connect(bp);
    bp.connect(g);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 190;
    const og = ctx.createGain();
    og.gain.setValueAtTime(v * 0.7, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og);
    o.start(t);
    o.stop(t + 0.15);
    send(g, 0.4);
    send(og, 0.2);
  };
  const _hat = (t: number, v = 0.05, open = false) => {
    const d = open ? 0.28 : 0.05;
    const n = noise(t, d);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(hp);
    hp.connect(g);
    send(g, 0.1);
  };
  const _chug = (t: number, v = 0.08) => {
    const n = noise(t, 0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    n.connect(bp);
    bp.connect(g);
    const o = ctx.createOscillator();
    o.frequency.value = 68;
    const og = ctx.createGain();
    og.gain.setValueAtTime(v * 1.3, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og);
    o.start(t);
    o.stop(t + 0.12);
    send(g, 0.25);
    send(og, 0.05);
  };
  const _riser = (t0: number, t1: number, v = 0.12, f0 = 300, f1 = 7000) => {
    const n = noise(t0, t1 - t0);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t1);
    g.gain.linearRampToValueAtTime(0, t1 + 0.04);
    n.connect(bp);
    bp.connect(g);
    send(g, 0.35);
  };
  const _crash = (t: number, v = 0.18, len = 3.2) => {
    const n = noise(t, len);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(hp);
    hp.connect(g);
    send(g, 0.5);
  };
  const _boom = (t: number, v = 0.5, f = 42, len = 4) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 2.4, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    o.start(t);
    o.stop(t + len + 0.1);
    send(g, 0.2);
  };
  const _whistle = (t: number, f = 740, len = 1.4, v = 0.035) => {
    [f, f * 1.26].forEach((ff) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(ff * 0.96, t);
      o.frequency.linearRampToValueAtTime(ff, t + 0.12);
      o.frequency.linearRampToValueAtTime(ff * 0.985, t + len);
      const lf = ctx.createOscillator();
      lf.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = ff * 0.008;
      lf.connect(lg);
      lg.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.07);
      g.gain.setValueAtTime(v, t + len * 0.7);
      g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(g);
      send(g, 0.6);
      o.start(t);
      o.stop(t + len + 0.05);
      lf.start(t);
      lf.stop(t + len + 0.05);
    });
  };

  // ---------- lazy scheduling: only ~3 s of voices exist in the graph at a time ----------
  const events: { t: number; fn: () => void }[] = [];
  const defer = <A extends unknown[]>(fn: (t: number, ...a: A) => void) => (t: number, ...a: A) => {
    events.push({ t, fn: () => fn(t, ...a) });
  };
  const piano = defer(_piano);
  const pad = defer(_pad);
  const lead = defer(_lead);
  const bell = defer(_bell);
  const pluck = defer(_pluck);
  const bass = defer(_bass);
  const kick = defer(_kick);
  const snare = defer(_snare);
  const hat = defer(_hat);
  const chug = defer(_chug);
  const riser = defer(_riser);
  const crash = defer(_crash);
  const boom = defer(_boom);
  const whistle = defer(_whistle);

  // ---------- helpers ----------
  const arp = (t0: number, t1: number, stepBeats: number, v: number, fn: 'piano' | 'pluck', pat = [0, 1, 2, 3, 2, 1, 2, 3]) => {
    const st = BEAT * stepBeats;
    for (let k = Math.ceil(t0 / st); k * st < t1; k++) {
      const t = k * st;
      const ci = chordAt(t);
      const stepInBar = Math.round((t % BAR) / st) % pat.length;
      const note = ARP[ci][pat[stepInBar]];
      const acc = stepInBar === 0 ? 1.2 : stepInBar % 2 === 0 ? 0.9 : 0.7;
      if (fn === 'piano') piano(t, mtof(note), v * acc);
      else pluck(t, mtof(note + 12), v * acc);
    }
  };
  const barStarts = (t0: number, t1: number) => {
    const a: number[] = [];
    for (let t = Math.ceil(t0 / BAR - 1e-6) * BAR; t < Math.min(t1, HIT); t += BAR) a.push(t);
    for (let t = HIT; t < t1; t += BAR) if (t >= t0 - 1e-6) a.push(t);
    if (!a.length || a[0] > t0 + 0.3) a.unshift(t0);
    return a;
  };
  const pads = (t0: number, t1: number, v: number, bright: number, oct = 0) => {
    barStarts(t0, t1).forEach((tt) => {
      const ci = chordAt(tt + 0.01);
      PAD[ci].forEach((n) => pad(tt, mtof(n + oct), BAR - 0.1, v, bright, 1.1));
    });
  };
  const basses = (t0: number, t1: number, v: number, eighth = false) => {
    const st = eighth ? BEAT / 2 : BEAT * 2;
    for (let k = Math.ceil(t0 / st); k * st < t1; k++) {
      const t = k * st;
      bass(t, mtof(ROOT[chordAt(t)] + 12), st * 0.9, v);
    }
  };
  const theme = (t0: number, fn: 'piano' | 'lead' | 'bell', v: number, oct = 0) => {
    THEME.forEach(([b, n, d]) => {
      const t = t0 + b * BEAT;
      const f = mtof(n + oct);
      if (fn === 'piano') piano(t, f, v, 0.5);
      else if (fn === 'lead') lead(t, f, d * BEAT, v);
      else bell(t, f, v, 0.8, 2.4);
    });
  };
  const drums = (t0: number, t1: number, o: { kick?: number; snare?: number; hat?: number; hat16?: boolean }) => {
    for (let k = Math.ceil(t0 / (BEAT / 4) - 1e-6); k * (BEAT / 4) < t1; k++) {
      const t = k * (BEAT / 4);
      const sub = k % 4; // 16th within beat
      const beat = Math.floor(k / 4) % 4;
      if (sub === 0 && o.kick) kick(t, o.kick * (beat === 0 ? 1 : 0.85));
      if (sub === 0 && o.snare && (beat === 1 || beat === 3)) snare(t, o.snare);
      if (o.hat) {
        if (o.hat16 || sub % 2 === 0) hat(t, o.hat * (sub === 2 ? 1 : 0.65), sub === 2 && beat === 3 && o.hat16);
      }
    }
  };

  // ======== SCORE ========
  // ambient bed: wind all film
  {
    const w = noise(0, DURATION);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 0.02;
    lfo.connect(lg);
    lg.connect(g.gain);
    lfo.start(0);
    w.loop = true;
    w.connect(bp);
    bp.connect(g);
    send(g, 0.3);
    // wind swells away as the film opens up (kept low), returns in the quiet ending
  }

  // 0-12: the sky lets go
  pad(0, mtof(38), 13, 0.05, 500, 4, 0.7);
  pad(0.5, mtof(45), 12.5, 0.04, 500, 4.5, 0.7);
  pad(2, mtof(57), 10, 0.025, 800, 4.5, 0.8);
  SKY_STARS.forEach((s, i) => {
    bell(s.rel, mtof(PENT[(i * 3) % 5] + 12), 0.05, 0.9, 2.6);
    bell(s.rel + s.fall, mtof(PENT[(i * 2) % 5]), 0.035, 0.9, 2.2);
  });
  riser(6.8, 11.0, 0.09, 200, 5000);
  boom(11.0, 0.7, 40, 5);
  [62, 66, 69, 74, 78].forEach((n, i) => bell(11.02 + i * 0.05, mtof(n), 0.09, 0.9, 5));
  pad(11, mtof(50), 14, 0.04, 700, 1.0, 0.7);

  // 12-30: the platform; first piano
  arp(12, 30, 1, 0.12, 'piano');
  basses(12, 30, 0.12);
  pads(12.5, 30, 0.018, 700);
  theme(20, 'piano', 0.16, 0);
  bell(24.2, mtof(86), 0.07, 0.9, 4);
  bell(27.5, mtof(81), 0.06, 0.9, 4);

  // 30-42: the train arrives (chug follows the wheels)
  {
    const X = (tt: number) => -40 + 1660 * eoc(prog(tt, 0.4, 11.4));
    let last = 0;
    for (let tt = 0.4; tt < 11.6; tt += 1 / 400) {
      const d = X(tt);
      if (Math.floor(d / 105) > Math.floor(last / 105)) {
        const sp = (X(tt + 0.01) - X(tt)) / 0.01;
        chug(30 + tt, 0.03 + 0.07 * clamp(sp / 480));
      }
      last = d;
    }
    riser(30.6, 36, 0.035, 400, 2400);
  }
  whistle(31.2, 740, 1.5, 0.04);
  whistle(40.6, 700, 1.0, 0.03);
  pads(30, 42, 0.03, 1100);
  basses(30, 42, 0.14);
  theme(30, 'lead', 0.05, 0);
  arp(34, 42, 1, 0.11, 'piano');
  theme(40, 'piano', 0.18, 0);
  theme(40, 'lead', 0.05, 0);

  // 42-68: the run and the climb
  drums(42, 68, { kick: 0.42, hat: 0.05, hat16: false });
  drums(46, 68, { snare: 0.2 });
  arp(42, 68, 0.5, 0.05, 'pluck', [0, 1, 2, 3, 2, 3, 1, 2]);
  basses(42, 68, 0.16, true);
  pads(42, 68, 0.035, 1500);
  theme(50, 'lead', 0.075, 0);
  theme(50, 'bell', 0.05, 12);
  theme(60, 'lead', 0.085, 0);
  theme(60, 'bell', 0.06, 12);
  for (let t = 42; t < 68; t += BEAT / 4) chug(t, 0.012);
  riser(62, 68, 0.1, 300, 8000);
  // snare roll into the cut
  for (let k = 0; k < 16; k++) snare(66 + k * (2 / 16) * (1 - k * 0.015), 0.04 + k * 0.012);
  crash(68, 0.1, 3.5);

  // 68-79: the star-loom (awe): choir-like stacks, no drums
  [50, 57, 62, 66, 69, 74].forEach((n, i) => {
    pad(68, mtof(n), 10.5, 0.03 - i * 0.002, 1300, 3, 0.9);
  });
  pad(68, mtof(26), 11, 0.07, 300, 3, 0.5);
  [74, 78, 81, 85, 83, 86].forEach((n, i) => bell(69.5 + i * 1.7, mtof(n), 0.06, 0.95, 5));
  piano(72.0, mtof(62), 0.16, 0.6);
  piano(74.5, mtof(66), 0.14, 0.6);
  piano(77.0, mtof(69), 0.14, 0.6);
  riser(76, 79, 0.05, 400, 3000);

  // 79-84: the eye
  pads(79.5, 84, 0.02, 800);
  theme(80, 'piano', 0.15, 0);
  bell(81.2, mtof(86), 0.06, 0.9, 4);
  // heartbeat
  for (let t = 82.5; t < 88.5; t += 1.25) {
    kick(t, 0.2);
    kick(t + 0.22, 0.12);
  }

  // 84-96: the offering
  pads(84, 92.5, 0.03, 900);
  basses(84, 92.5, 0.12);
  arp(84, 92.5, 1, 0.1, 'piano');
  riser(86, HIT, 0.16, 250, 9000);
  for (let k = 0; k < 20; k++) {
    const tt = 88.5 + (HIT - 88.5) * (1 - Math.pow(1 - k / 20, 1.6));
    snare(tt, 0.03 + (k / 20) * 0.16);
  }
  // the hit
  crash(HIT, 0.3, 5);
  boom(HIT, 0.9, 38, 5);
  kick(HIT, 0.7);
  [50, 57, 62, 66, 69, 74, 78].forEach((n, i) => {
    pad(HIT, mtof(n - (i === 0 ? 0 : 0)), 3.5, 0.045, 2000, 0.05, 0.8);
  });
  [62, 66, 69, 74, 78, 81].forEach((n, i) => bell(HIT + 0.02 + i * 0.03, mtof(n), 0.12, 0.9, 5));
  // socket cascade: 12 ascending notes (D major) matching the 12 lights
  const SC = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81];
  for (let i = 0; i < 12; i++) {
    const t = i === 0 ? 92.7 : 93.0 + (i - 1) * 0.17;
    bell(t, mtof(SC[i] + 12), 0.09, 0.9, 3.2);
    piano(t, mtof(SC[i]), 0.16, 0.5);
  }
  // full band, chord on Bm
  drums(HIT + BEAT, 96, { kick: 0.55, snare: 0.26, hat: 0.06, hat16: true });
  pads(HIT + 0.01, 96.4, 0.04, 2200);
  basses(HIT, 96, 0.2, true);
  theme(HIT, 'lead', 0.1, 0);
  theme(HIT, 'bell', 0.07, 12);
  arp(HIT, 96, 0.5, 0.13, 'piano');

  // 96-106: rebirth, stars returning
  arp(96, 106, 1, 0.14, 'piano');
  pads(96, 106, 0.035, 1400);
  basses(96, 106, 0.14);
  theme(HIT + 10, 'piano', 0.2, 0);
  theme(HIT + 10, 'bell', 0.06, 12);
  theme(HIT + 10, 'lead', 0.05, 0);
  SKY_STARS.forEach((s, i) => {
    const t = 96 + 11.5 - s.rel;
    if (t > 96 && t < 112) bell(t, mtof(PENT[(i * 2 + 1) % 5] + 12), 0.045, 0.9, 2.6);
  });

  // 106-116: dawn
  pads(106, 114, 0.03, 1100);
  arp(106, 114, 2, 0.1, 'piano');
  basses(106, 114, 0.1);
  theme(HIT + 20, 'piano', 0.17, 0);
  theme(HIT + 20, 'lead', 0.035, 0);
  // final resolution: D add9
  [38, 50, 57, 62, 66, 69, 76].forEach((n, i) => pad(114.5, mtof(n), 4, 0.04 - i * 0.003, 1200, 1.5, 0.9));
  piano(114.5, mtof(62), 0.2, 0.7);
  piano(115.0, mtof(66), 0.16, 0.7);
  piano(115.5, mtof(69), 0.16, 0.7);
  piano(116.0, mtof(76), 0.14, 0.8);

  // 116-120: title
  bell(116.5, mtof(86), 0.1, 0.95, 6);
  bell(117.3, mtof(81), 0.07, 0.95, 6);
  boom(116.3, 0.25, 36, 5);

  const CH = 3;
  const buckets = new Map<number, (() => void)[]>();
  events.forEach((e) => {
    const k = Math.max(0, Math.floor(e.t / CH));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(e.fn);
  });
  buckets.get(0)?.forEach((f) => f());
  const nCh = Math.ceil(DURATION / CH);
  for (let k = 1; k < nCh; k++) {
    void ctx.suspend(k * CH - 0.25).then(() => {
      buckets.get(k)?.forEach((f) => f());
      onProgress?.(k / nCh);
      void ctx.resume();
    });
  }
  const buf = await ctx.startRendering();
  onProgress?.(1);
  // normalise to -1 dBFS peak
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  const k = peak > 0 ? 0.89 / peak : 1;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
  return buf;
}

export function bufferToWav(buf: AudioBuffer): Blob {
  const n = buf.length;
  const ch = buf.numberOfChannels;
  const ab = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(ab);
  const ws = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  ws(0, 'RIFF');
  v.setUint32(4, 36 + n * ch * 2, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  ws(36, 'data');
  v.setUint32(40, n * ch * 2, true);
  let o = 44;
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  return new Blob([ab], { type: 'audio/wav' });
}
