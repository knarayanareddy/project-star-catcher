import { rng, KNOCKS, E, pw } from "./util";

const SR = 24000;
const DUR = 300;
const BAR = (4 * 60) / 72; // 72 bpm
const BEAT = 60 / 72;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Chord = { b: number; n: number[] };
const CH: Record<string, Chord> = {
  Dm: { b: 38, n: [62, 65, 69, 72] },
  Bb: { b: 34, n: [58, 62, 65, 69] },
  F: { b: 41, n: [60, 65, 69, 72] },
  C: { b: 36, n: [60, 64, 67, 71] },
  Gm: { b: 43, n: [58, 62, 67, 70] },
  A: { b: 33, n: [61, 64, 69, 73] },
  D: { b: 38, n: [62, 66, 69, 74] },
};
const seq = (...names: string[]) => names.map((n) => CH[n]);

/** Render the complete 5-minute soundtrack offline. Deterministic: seeded RNG, no clock. */
export async function renderScore(): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, SR * DUR, SR);
  const R = rng(20240611);

  /* ------------------------------------------------------------- graph */
  const master = ctx.createGain();
  master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.3;
  master.connect(comp);
  comp.connect(ctx.destination);

  const impulse = (() => {
    const len = Math.floor(SR * 2.3);
    const b = ctx.createBuffer(2, len, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = rng(500 + ch);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
    }
    return b;
  })();
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  wet.connect(conv);
  conv.connect(master);
  const bus = (vol: number, send: number) => {
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(master);
    const s = ctx.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(wet);
    return g;
  };
  const musicBus = bus(0.9, 0.45);
  const pianoBus = bus(1.0, 0.6);
  const ambBus = bus(0.8, 0.22);
  const sfxBus = bus(1.0, 0.35);

  const noiseBuf = (() => {
    const b = ctx.createBuffer(1, SR * 8, SR);
    const d = b.getChannelData(0);
    const r = rng(99);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    return b;
  })();
  const pianoWave = ctx.createPeriodicWave(new Float32Array(8), new Float32Array([0, 1, 0.45, 0.28, 0.14, 0.08, 0.05, 0.03]));

  /* ------------------------------------------------------------- helpers */
  const auto = (p: AudioParam, pts: [number, number][]) => {
    p.setValueAtTime(pts[0][1], 0);
    for (const [t, v] of pts) p.linearRampToValueAtTime(v, Math.max(t, 0.001));
  };

  const noise = (t: number, dur: number, o: { type?: BiquadFilterType; f0: number; f1?: number; q?: number; vel: number; att?: number; dest?: AudioNode }) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const att = Math.min(o.att ?? 0.01, dur * 0.95);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vel, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(o.dest ?? sfxBus);
    s.start(t, (t * 7.31) % 4.5);
    s.stop(t + dur + 0.05);
  };

  const tone = (t: number, dur: number, o: { type?: OscillatorType; f0: number; f1?: number; vel: number; att?: number; dest?: AudioNode; lp?: number }) => {
    const os = ctx.createOscillator();
    os.type = o.type ?? "sine";
    os.frequency.setValueAtTime(o.f0, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ctx.createGain();
    const att = Math.min(o.att ?? 0.005, dur * 0.9);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vel, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = os;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lp;
      os.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.dest ?? sfxBus);
    os.start(t);
    os.stop(t + dur + 0.05);
  };

  const pluck = (t: number, midi: number, dur: number, vel: number, dest: AudioNode = pianoBus) => {
    const f = mtof(midi);
    const os = ctx.createOscillator();
    os.setPeriodicWave(pianoWave);
    os.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(2200, f * 2.5), t + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(lp);
    lp.connect(g);
    g.connect(dest);
    os.start(t);
    os.stop(t + dur + 0.05);
  };

  const bell = (t: number, midi: number, dur: number, vel: number) => {
    const f = mtof(midi);
    const c = ctx.createOscillator();
    const m = ctx.createOscillator();
    const mg = ctx.createGain();
    c.frequency.value = f;
    m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.4, t);
    mg.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
    m.connect(mg);
    mg.connect(c.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    c.connect(g);
    g.connect(musicBus);
    c.start(t);
    m.start(t);
    c.stop(t + dur + 0.05);
    m.stop(t + dur + 0.05);
  };

  const pad = (t: number, dur: number, midis: number[], vel: number, o: { att?: number; rel?: number; cut?: number; dest?: AudioNode } = {}) => {
    const att = o.att ?? 1.5;
    const rel = o.rel ?? 1.8;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime((o.cut ?? 900) * 0.5, t);
    lp.frequency.linearRampToValueAtTime(o.cut ?? 900, t + att + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.6, t + att);
    g.gain.setValueAtTime(vel * 0.6, Math.max(t + att, t + dur - rel * 0.2));
    g.gain.linearRampToValueAtTime(0, t + dur + rel);
    lp.connect(g);
    g.connect(o.dest ?? musicBus);
    for (const m of midis) {
      for (const d of [-7, 7]) {
        const os = ctx.createOscillator();
        os.type = "sawtooth";
        os.frequency.value = mtof(m);
        os.detune.value = d;
        os.connect(lp);
        os.start(t);
        os.stop(t + dur + rel + 0.05);
      }
    }
  };

  const taiko = (t: number, vel: number, low = 1) => {
    tone(t, 0.9, { f0: 100 * low, f1: 42 * low, vel: vel * 0.9, att: 0.003, dest: sfxBus });
    noise(t, 0.12, { type: "lowpass", f0: 700, vel: vel * 0.5, dest: sfxBus });
  };
  const boom = (t: number, vel: number) => tone(t, 2.6, { f0: 62, f1: 28, vel, att: 0.01, dest: sfxBus });
  const tom = (t: number, vel: number) => tone(t, 0.25, { f0: 230, f1: 120, vel, att: 0.002, dest: sfxBus });
  const tick = (t: number, vel: number) => noise(t, 0.04, { type: "highpass", f0: 6500, vel, dest: sfxBus });
  const thump = (t: number, vel: number) => {
    tone(t, 0.22, { f0: 64, f1: 36, vel, att: 0.004, dest: sfxBus, lp: 160 });
    tone(t + 0.27, 0.2, { f0: 58, f1: 34, vel: vel * 0.7, att: 0.004, dest: sfxBus, lp: 160 });
  };
  const step = (t: number, vel = 0.05) => noise(t, 0.09, { type: "lowpass", f0: 500, vel, dest: sfxBus });
  const whoosh = (t: number, vel = 0.2, dur = 0.9) => noise(t - dur * 0.5, dur, { f0: 300, f1: 5000, q: 0.8, vel, att: dur * 0.5, dest: sfxBus });
  const rev = (t: number, dur: number, vel: number) => noise(t - dur, dur, { f0: 400, f1: 5000, q: 0.9, vel, att: dur * 0.93, dest: sfxBus });
  const knock = (t: number, vel: number) => {
    const os = ctx.createOscillator();
    os.type = "triangle";
    os.frequency.setValueAtTime(520, t);
    os.frequency.exponentialRampToValueAtTime(190, t + 0.06);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900 + vel * 2800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * vel + 0.08, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    os.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    os.start(t);
    os.stop(t + 0.2);
    noise(t, 0.05, { f0: 1500, q: 3, vel: 0.2 * vel + 0.03, dest: sfxBus });
  };

  const arp = (t0: number, t1: number, sq: Chord[], st: number, pat: number[], vel: number, oct = 0, dest: AudioNode = pianoBus) => {
    let i = 0;
    for (let t = t0; t < t1 - 1e-6; t += st, i++) {
      const ch = sq[Math.floor((t - t0 + 1e-6) / BAR) % sq.length];
      pluck(t, ch.n[pat[i % pat.length]] + oct, 1.7, vel * (i % 4 === 0 ? 1.18 : 1) * (0.9 + 0.2 * R()), dest);
    }
  };
  const bassBars = (t0: number, t1: number, sq: Chord[], vel: number) => {
    for (let t = t0, i = 0; t < t1 - 1e-6; t += BAR, i++) {
      const ch = sq[i % sq.length];
      tone(t, BAR * 0.98, { type: "triangle", f0: mtof(ch.b), vel, att: 0.03, dest: musicBus, lp: 380 });
    }
  };
  const padBars = (t0: number, t1: number, sq: Chord[], vel: number, o: { att?: number; cut?: number } = {}) => {
    for (let t = t0, i = 0; t < t1 - 1e-6; t += BAR, i++) pad(t, BAR + 0.5, sq[i % sq.length].n.map((m) => m - 12 + (i % 2 ? 0 : 0)), vel, { att: o.att ?? 1.4, cut: o.cut ?? 800 });
  };
  const melody = (notes: [number, number, number][], vel: number, bellVel = 0) => {
    for (const [t, m, d] of notes) {
      pluck(t, m, d + 1, vel);
      if (bellVel) bell(t, m + 12, d + 1.5, bellVel);
    }
  };

  /* ------------------------------------------------------------- ambience beds */
  const loopNoise = (type: BiquadFilterType, f: number, q: number, pts: [number, number][], dest: AudioNode = ambBus, f2?: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    let node: AudioNode = fl;
    s.connect(fl);
    if (f2) {
      const fl2 = ctx.createBiquadFilter();
      fl2.type = "lowpass";
      fl2.frequency.value = f2;
      fl.connect(fl2);
      node = fl2;
    }
    const g = ctx.createGain();
    auto(g.gain, pts);
    node.connect(g);
    g.connect(dest);
    s.start(0);
    s.stop(DUR);
  };
  const buzz = (f: number, lfoHz: number, pts: [number, number][]) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const gate = ctx.createGain();
    gate.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    const lg = ctx.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(gate.gain);
    const lvl = ctx.createGain();
    auto(lvl.gain, pts);
    o.connect(gate);
    gate.connect(lvl);
    lvl.connect(ambBus);
    o.start(0);
    lfo.start(0);
    o.stop(DUR);
    lfo.stop(DUR);
  };

  // day: jungle air + insects (ducks to nothing during THE SILENCE)
  const day: [number, number][] = [
    [0, 0], [3, 0.55], [46, 0.55], [50, 0.16], [68, 0.55], [90, 0.6], [107.6, 0.6], [108.4, 0], [133.5, 0], [135, 0.95],
    [139, 0.8], [146, 0], [258, 0], [260, 0.4], [270, 0.35], [286, 0.1], [289, 0],
  ];
  loopNoise("bandpass", 3200, 0.5, day.map(([t, v]) => [t, v * 0.045]));
  loopNoise("lowpass", 700, 0.4, day.map(([t, v]) => [t, v * 0.05]));
  buzz(4300, 27, day.map(([t, v]) => [t, v * 0.012]));
  buzz(5200, 19, day.map(([t, v]) => [t, v * 0.009]));
  buzz(3600, 33, day.map(([t, v]) => [t, v * 0.008]));
  // river
  loopNoise("lowpass", 380, 0.7, [[12, 0], [16, 0.12], [42, 0.1], [48, 0], [68, 0.05], [80, 0.05], [84, 0.22], [98, 0.22], [102, 0.04], [104, 0]], ambBus, 700);
  // rain
  const rainPts: [number, number][] = [[0, 0], [143, 0], [147, 0.25], [156, 0.5], [160, 0.5], [166, 0.9], [172, 0.8], [176, 0.45], [182, 0.12], [185, 0]];
  loopNoise("highpass", 1400, 0.4, rainPts.map(([t, v]) => [t, v * 0.09]), ambBus, 9000);
  loopNoise("lowpass", 500, 0.5, rainPts.map(([t, v]) => [t, v * 0.08]));
  // storm rumble (the ground)
  loopNoise("lowpass", 90, 0.8, [[0, 0], [146, 0], [152, 0.2], [160, 0.5], [168, 0.7], [172, 0.15], [178, 0]], sfxBus);
  // night crickets
  const night: [number, number][] = [[0, 0], [181, 0], [186, 0.4], [192, 0.25], [205, 0.22], [207, 0.5], [260, 0.5], [262, 0.3], [288, 0.18], [291, 0]];
  buzz(4700, 13, night.map(([t, v]) => [t, v * 0.012]));
  buzz(5100, 11, night.map(([t, v]) => [t, v * 0.01]));
  buzz(5600, 16, night.map(([t, v]) => [t, v * 0.008]));
  loopNoise("lowpass", 900, 0.3, night.map(([t, v]) => [t, v * 0.02]));
  // fire
  loopNoise("bandpass", 700, 0.6, [[0, 0], [261, 0], [264, 0.4], [286, 0.4], [289, 0]].map(([t, v]) => [t, v * 0.04] as [number, number]));
  for (let t = 262; t < 289; t += 0.05 + R() * 0.35) noise(t, 0.03 + R() * 0.04, { type: "highpass", f0: 2500 + R() * 3000, vel: 0.04 + R() * 0.09, dest: ambBus });
  // dread drone for THE SILENCE
  {
    const lvl = ctx.createGain();
    auto(lvl.gain, [[0, 0], [107.8, 0], [111, 0.14], [126, 0.22], [129.5, 0.22], [129.7, 0]]);
    for (const f of [36.7, 55, 73.4]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(lvl);
      o.start(0);
      o.stop(DUR);
    }
    lvl.connect(sfxBus);
    // ringing in the ears during the eye close-up
    tone(111.9, 4.8, { f0: 4300, vel: 0.012, att: 1.2, dest: sfxBus });
  }

  // birds (only when the forest is talking)
  const birdWin: [number, number, number][] = [[3, 106, 1.5], [133.8, 142, 1.1], [259, 272, 3.0]];
  for (const [a, b, gap] of birdWin) {
    for (let t = a + R() * 1.2; t < b; t += (0.5 + R() * 1.5) * gap) {
      const n = 2 + Math.floor(R() * 4);
      const f0 = 2200 + R() * 2400;
      const dir = R() < 0.5 ? 1 : -1;
      const pan = R() * 2 - 1;
      for (let i = 0; i < n; i++) {
        const tt = t + i * (0.11 + R() * 0.06);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f0, tt);
        o.frequency.linearRampToValueAtTime(f0 * (1 + dir * (0.18 + R() * 0.25)), tt + 0.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, tt);
        g.gain.linearRampToValueAtTime(0.02 + R() * 0.03, tt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.11);
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        o.connect(g);
        g.connect(p);
        p.connect(ambBus);
        o.start(tt);
        o.stop(tt + 0.14);
      }
    }
  }
  // night frogs
  for (let t = 184; t < 258; t += 2 + R() * 4) {
    const f = 300 + R() * 160;
    for (let i = 0; i < 3; i++) tone(t + i * 0.22, 0.14, { type: "square", f0: f, f1: f * 0.8, vel: 0.012, dest: ambBus, lp: 900 });
  }

  /* ------------------------------------------------------------- footsteps */
  for (const [a, b] of [[68.5, 80], [96.3, 100], [246, 256.4]]) for (let t = a; t < b; t += 1 / 1.8) step(t, 0.05 + R() * 0.02);

  /* ------------------------------------------------------------- the knocks (leitmotif) */
  const kv = [0.12, 0.16, 0.22, 0.3, 0.55, 0.7, 0.8, 0.95];
  KNOCKS.forEach((k, i) => [0, 0.45, 0.9].forEach((o) => knock(k + o, kv[i])));
  [0, 0.45, 0.9].forEach((o) => knock(279.9 + o, 1));
  knock(289.0, 1);
  [294.0, 294.45, 294.9].forEach((t) => knock(t, 0.3));

  /* ------------------------------------------------------------- 0 · LOG 001 */
  tone(0.5, 13.5, { f0: 73.4, vel: 0.05, att: 3, dest: musicBus });
  for (let t = 2; t < 13.6; t += 1.0) thump(t, 0.3);

  /* ------------------------------------------------------------- 1 · SANDBAR → RAPIDS → EYE */
  pad(15, 12.5, [50, 57, 62], 0.07, { att: 3.5, cut: 700 });
  melody([[16, 74, 2], [17.8, 72, 1.5], [19.5, 69, 2], [21.6, 72, 1.5], [23, 74, 2]], 0.14);
  // rapids crash 24.4 → 27.4
  rev(24.4, 0.9, 0.35);
  noise(24.4, 3.0, { type: "bandpass", f0: 900, f1: 500, q: 0.3, vel: 0.5, att: 0.05 });
  boom(24.4, 0.9); taiko(24.4, 1); taiko(24.95, 0.8); taiko(25.5, 1, 0.9); boom(25.5, 0.7);
  noise(25.5, 1.8, { type: "highpass", f0: 1500, vel: 0.35, att: 0.02 });
  rev(27.4, 0.5, 0.25);
  noise(28.2, 1.4, { f0: 1100, q: 1.2, vel: 0.1, att: 0.7 }); // the gasp
  // eye + portrait
  padBars(28, 42, seq("Dm", "Bb", "F", "C"), 0.1, { att: 2.2, cut: 900 });
  bassBars(28, 42, seq("Dm", "Bb", "F", "C"), 0.1);
  melody([[30, 74, 3], [33.4, 72, 2], [35.5, 69, 2], [36.8, 72, 1.5], [38.3, 74, 2], [39.6, 77, 2.4]], 0.2);
  thump(31, 0.2); thump(36, 0.15);

  /* ------------------------------------------------------------- 2 · TITLE */
  rev(43.0, 1.0, 0.3);
  boom(43.0, 1.0); taiko(43.0, 1);
  pad(43, 7.5, [50, 57, 62, 65], 0.16, { att: 0.6, cut: 1400 });
  pad(46.4, 4.5, [46, 53, 58, 62], 0.14, { att: 0.5, cut: 1400 });
  melody([[43.2, 74, 1.6], [44.8, 69, 0.8], [45.6, 72, 0.8], [46.4, 74, 1.2], [47.6, 77, 1.4], [49.0, 76, 0.7]], 0.26, 0.05);
  bell(44.6, 86, 3, 0.06);

  /* ------------------------------------------------------------- 3 · INVENTORY */
  const invSeq = seq("Dm", "Bb", "F", "C");
  arp(50, 68, invSeq, BEAT / 2, [0, 2, 1, 3, 2, 1, 3, 2], 0.12);
  bassBars(50, 68, invSeq, 0.1);
  padBars(53.3, 68, invSeq, 0.05, { att: 1.5 });
  for (let t = 50.4; t < 68; t += BEAT) tick(t + BEAT / 2, 0.04);
  [60.6, 61.4].forEach((t) => tone(t, 0.22, { type: "square", f0: 180, f1: 90, vel: 0.05, dest: sfxBus, lp: 600 })); // stamps
  tom(60.6, 0.4); tom(61.4, 0.3);

  /* ------------------------------------------------------------- 4 · MAZE */
  whoosh(68.1, 0.2); taiko(68.3, 0.6);
  for (let t = 70; t < 80.2; t += BEAT) tom(t, 0.14);
  arp(72, 80.2, seq("Dm", "Dm", "Bb", "C"), BEAT / 2, [0, 1, 2, 1, 3, 2, 1, 0], 0.1);
  bassBars(70, 80.2, seq("Dm", "Dm", "Bb", "C"), 0.08);
  // the mark
  taiko(80.2, 0.6); boom(80.2, 0.6);
  pad(80.2, 6.5, [50, 51, 57, 62], 0.07, { att: 1.8, cut: 700 });
  for (let t = 86.4, i = 0; t < 96; t += BEAT * 2, i++) bell(t, [86, 81, 77, 81][i % 4], 3.5, 0.045);
  pad(86.4, 10, [50, 57, 60, 64], 0.05, { att: 2.5, cut: 650 });
  bell(90.8, 81, 3.5, 0.1); bell(91.25, 86, 3.5, 0.08); bell(91.7, 90, 4, 0.06);
  rev(96.0, 0.9, 0.25); taiko(96.0, 0.7);
  arp(96, 100, seq("Bb", "F", "C", "Dm"), BEAT / 2, [0, 1, 2, 3, 2, 1, 2, 3], 0.13);
  bassBars(96, 100, seq("Bb", "F", "C", "Dm"), 0.1);
  pad(96, 5, [58, 62, 65, 69], 0.1, { att: 1.0, cut: 1100 });

  /* ------------------------------------------------------------- 5 · SILENCE */
  whoosh(100.1, 0.18); taiko(100.3, 0.5);
  pad(100.6, 8, [38, 45, 50], 0.06, { att: 3, cut: 500 });
  pluck(104, 62, 4, 0.1); pluck(106.2, 57, 4, 0.09);
  rev(108.0, 1.2, 0.3);
  boom(108.0, 1.2); noise(108.0, 1.6, { type: "lowpass", f0: 1200, f1: 200, vel: 0.35 });
  for (let t = 109.5; t < 116.4; t += 0.95) thump(t, 0.34);
  // jaguar scene heartbeat: matches the on-screen pulse phase  phi = 1.15u + 0.035u^2
  for (let n = 0; n < 40; n++) {
    const u = (-1.15 + Math.sqrt(1.3225 + 0.14 * n)) / 0.07;
    if (u > 10.9) break;
    thump(116.4 + u, 0.42 + n * 0.012);
  }
  for (let t = 118; t < 129; t += 1.15) for (let i = 0; i < 4; i++) tone(t + i * 0.17, 0.12, { type: "sawtooth", f0: 78, f1: 58, vel: 0.2, att: 0.01, dest: sfxBus, lp: 260 });
  pad(124, 5.6, [50, 51, 57, 63], 0.14, { att: 4.5, cut: 1800 });
  tone(124, 5.6, { type: "sine", f0: 600, f1: 1400, vel: 0.02, att: 5, dest: sfxBus });
  rev(129.6, 0.5, 0.3);
  taiko(129.6, 1.3); taiko(129.66, 0.9, 0.8); boom(129.6, 1.0);
  noise(129.6, 0.9, { type: "lowpass", f0: 5000, f1: 300, vel: 0.9, att: 0.005 });
  noise(129.75, 0.35, { type: "highpass", f0: 2500, vel: 0.5, att: 0.003 });
  noise(133.0, 1.6, { f0: 800, q: 1.0, vel: 0.14, att: 0.3 }); // the exhale
  pad(133.2, 8, [50, 57, 62, 64, 69], 0.12, { att: 1.6, cut: 1000 });
  melody([[133.8, 62, 3], [135.2, 65, 3], [136.6, 69, 3], [138.2, 72, 3]], 0.15);

  /* ------------------------------------------------------------- 6 · FLOOD */
  whoosh(140.1, 0.2); taiko(140.3, 0.5);
  pad(141, 11, [38, 45, 50, 53], 0.06, { att: 4, cut: 600 });
  for (let t = 150; t < 160; t += 0.5) tick(t, 0.035 + (t - 150) * 0.003);
  {
    const notes = [50, 53, 57, 53];
    for (let t = 150, i = 0; t < 160; t += 0.25, i++) pluck(t, notes[i % 4] - 12 + 12, 0.5, 0.07);
  }
  for (let t = 155; t < 160; t += 0.5) tom(t, 0.1 + (t - 155) * 0.03);
  // storm drive
  const stormSeq: Chord[] = [CH.Dm, CH.Dm, CH.Bb, CH.Bb, CH.Gm, CH.Gm, CH.A, CH.A, CH.Dm, CH.Bb, CH.Gm, CH.A];
  for (let t = 160, i = 0; t < 172; t += 0.5, i++) {
    taiko(t, i % 2 === 0 ? 0.6 : 0.4);
    if (t >= 164) taiko(t + 0.25, 0.26, 1.2);
    const ch = stormSeq[Math.floor((t - 160) / 2)];
    tone(t, 0.24, { type: "sawtooth", f0: mtof(ch.b), vel: 0.1, att: 0.01, dest: musicBus, lp: 340 });
    tone(t + 0.25, 0.24, { type: "sawtooth", f0: mtof(ch.b + (i % 4 === 3 ? 7 : 12)), vel: 0.07, att: 0.01, dest: musicBus, lp: 420 });
  }
  for (let t = 160, i = 0; t < 172; t += 2, i++) pad(t, 2.1, stormSeq[i].n, 0.1 + i * 0.01, { att: 0.35, cut: 2400 });
  [161.2, 162.4, 162.72, 165.1, 168.3].forEach((t) => {
    noise(t, 0.2, { type: "highpass", f0: 2200, vel: 0.5, att: 0.002 });
    noise(t + 0.05, 3.4, { type: "lowpass", f0: 220, f1: 50, vel: 0.9, att: 0.05 });
    boom(t + 0.05, 0.4);
  });
  rev(168.4, 0.4, 0.25);
  taiko(168.4, 1); taiko(168.9, 0.8); taiko(169.4, 0.9); boom(168.4, 0.8);
  noise(168.0, 4, { type: "highpass", f0: 5000, vel: 0.14, att: 3.4 });
  taiko(171.9, 0.7); boom(171.9, 0.6);
  // after the storm
  pad(172, 8.5, [50, 57, 62, 65], 0.08, { att: 2, cut: 800 });
  arp(172.4, 180, seq("Dm", "Bb", "F"), BEAT, [0, 1, 2, 3, 2, 1], 0.12);
  thump(176, 0.2);

  /* ------------------------------------------------------------- 7 · DARK */
  whoosh(180.1, 0.18); boom(180.3, 0.5);
  tone(181, 10, { f0: 73.4, vel: 0.05, att: 3, dest: musicBus });
  for (let t = 184; t < 190; t += 1.0) thump(t, 0.12);
  [188.0, 188.5, 189.2, 189.4, 189.9, 190.1].forEach((t) => tick(t, 0.2));
  tick(190.4, 0.3); tone(190.4, 0.3, { f0: 220, f1: 50, vel: 0.28, att: 0.004, dest: sfxBus });
  // flashback: warm music-box piano
  const fbSeq = seq("F", "Bb", "Gm", "C");
  pad(191, 14.5, [53, 57, 60, 65], 0.09, { att: 2.5, cut: 800 });
  arp(191.2, 205.2, fbSeq, BEAT / 2, [0, 1, 2, 3, 2, 1, 2, 0], 0.12, 0);
  bassBars(191.2, 205.2, fbSeq, 0.08);
  [195, 198.3, 201.7].forEach((t, i) => bell(t, [81, 77, 84][i], 3.5, 0.06));
  // ignition
  rev(206, 1.2, 0.2);
  [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86].forEach((m, i) => bell(206 + i * 0.45, m, 3.5, 0.07));
  padBars(206, 226, seq("Bb", "F", "C", "Dm", "Bb", "F"), 0.13, { att: 3, cut: 1200 });
  bassBars(206, 226, seq("Bb", "F", "C", "Dm", "Bb", "F"), 0.09);
  melody([[214, 74, 2], [216.2, 72, 1.5], [217.8, 69, 1.5], [219.2, 72, 1.5], [221.2, 74, 2], [223.4, 77, 3]], 0.18, 0.04);

  /* ------------------------------------------------------------- 8 · THE KNOCKING */
  for (let t = 226.5; t < 232; t += BEAT) tone(t, 0.5, { f0: 73.4, vel: 0.1, att: 0.01, dest: musicBus, lp: 200 });
  pad(226, 7, [50, 57, 60], 0.06, { att: 2.5, cut: 600 });
  // tape rewind 234.2 → 237.8, forward 238.6 → 243.6
  tone(234.2, 3.6, { type: "sawtooth", f0: 3200, f1: 260, vel: 0.05, att: 0.3, dest: sfxBus, lp: 3000 });
  noise(234.2, 3.6, { f0: 4000, f1: 500, q: 1.5, vel: 0.12, att: 0.3 });
  tone(238.6, 5, { type: "sawtooth", f0: 240, f1: 2800, vel: 0.045, att: 0.4, dest: sfxBus, lp: 3000 });
  noise(238.6, 5, { f0: 500, f1: 4000, q: 1.5, vel: 0.1, att: 0.4 });
  KNOCKS.slice(0, 5).forEach((ks, i) => {
    // time when the on-screen playhead crosses this knock
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (E.inOutCubic(mid) < ks / 233) lo = mid;
      else hi = mid;
    }
    const t = 238.6 + lo * 5;
    bell(t, [74, 77, 81, 84, 86][i], 2.5, 0.09);
    tick(t, 0.2);
  });
  pad(244, 2.5, [50, 57, 62], 0.06, { att: 1.0 });
  // the chase
  const chase = seq("Dm", "Bb", "F", "A");
  arp(245.6, 256.6, chase, BEAT / 4, [0, 2, 1, 3, 2, 1, 3, 2], 0.1);
  bassBars(245.6, 256.6, chase, 0.12);
  padBars(245.6, 256.6, chase, 0.09, { att: 0.8, cut: 1600 });
  for (let t = 245.6; t < 256.6; t += BEAT) taiko(t, 0.3);
  for (let t = 245.6; t < 256.6; t += BEAT / 4) tick(t, 0.025);
  // dawn
  rev(256.6, 0.8, 0.25);
  pad(256.6, 6, [50, 57, 62, 66, 69, 74], 0.22, { att: 0.8, cut: 2600 });
  bassBars(256.6, 262, seq("D"), 0.12);
  melody([[256.8, 74, 1.6], [258.4, 69, 0.8], [259.2, 73, 0.8], [260, 74, 1.4], [261.4, 78, 1.4]], 0.26, 0.06);
  bell(256.6, 86, 4, 0.08);

  /* ------------------------------------------------------------- 9 · CLEARING */
  padBars(262, 279, seq("Dm", "Dm", "Bb", "A", "Dm"), 0.08, { att: 2.2, cut: 700 });
  for (let t = 263, i = 0; t < 277; t += BEAT * 2, i++) bell(t, [86, 81, 77, 81][i % 4], 3.5, 0.05);
  for (let t = 272, i = 0; t < 278.3; t += 0.85 - i * 0.012, i++) thump(t, 0.2 + i * 0.012);
  rev(278.4, 0.4, 0.25);
  taiko(278.4, 1.1); boom(278.4, 0.9); noise(278.4, 0.5, { type: "highpass", f0: 2000, vel: 0.5, att: 0.003 });
  pad(279, 9, [50, 57, 61, 64], 0.14, { att: 4, cut: 1500 });
  tone(279, 9, { f0: 36.7, vel: 0.1, att: 3, dest: musicBus });
  for (let t = 279.2, i = 0; t < 288.2; t += 0.62 - i * 0.012, i++) thump(t, 0.34);
  bell(283.0, 88, 5, 0.05); bell(283.4, 92, 5, 0.04);
  // recorder power-down
  tone(284, 1.4, { f0: 1500, f1: 70, vel: 0.07, att: 0.01, dest: sfxBus });
  tick(284, 0.3);
  // silence, one last knock (scheduled above @289), then the end card
  pad(290.4, 7, [50, 57, 62, 65, 69], 0.1, { att: 0.8, cut: 900 });
  [50, 57, 62, 65, 69].forEach((m, i) => pluck(290.6 + i * 0.07, m, 6, 0.18));
  melody([[291.8, 74, 2], [293.4, 69, 2], [295.2, 74, 3]], 0.16, 0.04);

  /* ------------------------------------------------------------- render + master */
  const buf = await ctx.startRendering();
  // fades + loudness normalisation (soft limiter keeps taiko peaks civil)
  const chans = [buf.getChannelData(0), buf.getChannelData(1)];
  let sum = 0;
  let cnt = 0;
  for (const d of chans) for (let i = 0; i < d.length; i += 7) { sum += d[i] * d[i]; cnt++; }
  const rms = Math.sqrt(sum / cnt) || 0.01;
  const gain = 0.1 / rms;
  for (const d of chans) {
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const fade = t < 0.05 ? t / 0.05 : t > DUR - 1.2 ? Math.max(0, (DUR - t) / 1.2) : 1;
      d[i] = Math.tanh(d[i] * gain) * 0.92 * fade;
    }
  }
  void pw;
  return buf;
}

export function audioBufferToWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels;
  const len = buf.length * ch * 2;
  const out = new DataView(new ArrayBuffer(44 + len));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  out.setUint32(4, 36 + len, true);
  w(8, "WAVEfmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  w(36, "data");
  out.setUint32(40, len, true);
  let o = 44;
  const data = [...Array(ch).keys()].map((i) => buf.getChannelData(i));
  for (let i = 0; i < buf.length; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  return new Blob([out], { type: "audio/wav" });
}
