import { rng } from "./util";

/* =====================================================================================
   SCORE KIT — everything is synthesised offline from oscillators + seeded noise.
   Deterministic: same seed → same waveform. No samples, no clock.
   ===================================================================================== */

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export type Pts = [number, number][];
export type Chord = { b: number; n: number[] };

export function makeKit(dur: number, bpm: number, seed: number, SR = 24000) {
  const ctx = new OfflineAudioContext(2, Math.floor(SR * dur), SR);
  const R = rng(seed);
  const BEAT = 60 / bpm;
  const BAR = BEAT * 4;

  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  master.connect(comp);
  comp.connect(ctx.destination);

  const impulse = (len: number, decay: number, sd: number) => {
    const n = Math.floor(SR * len);
    const b = ctx.createBuffer(2, n, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = rng(sd + ch);
      for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1);
    }
    return b;
  };
  const conv = ctx.createConvolver();
  conv.buffer = impulse(2.4, 2.6, 500);
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  wet.connect(conv);
  conv.connect(master);
  // long, dark canopy echo for distant sounds
  const conv2 = ctx.createConvolver();
  conv2.buffer = impulse(4.2, 2.0, 900);
  const wet2 = ctx.createGain();
  wet2.gain.value = 1;
  wet2.connect(conv2);
  conv2.connect(master);

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
  const fluteBus = bus(0.85, 0.7);
  // far bus: lowpassed + almost entirely reverb
  const farBus = (() => {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1500;
    g.connect(lp);
    const dry = ctx.createGain(); dry.gain.value = 0.35;
    lp.connect(dry); dry.connect(master);
    const s = ctx.createGain(); s.gain.value = 1.4;
    lp.connect(s); s.connect(wet2);
    return g;
  })();

  const noiseBuf = (() => {
    const b = ctx.createBuffer(1, SR * 8, SR);
    const d = b.getChannelData(0);
    const r = rng(seed + 99);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    return b;
  })();
  const pianoWave = ctx.createPeriodicWave(new Float32Array(8), new Float32Array([0, 1, 0.45, 0.28, 0.14, 0.08, 0.05, 0.03]));
  const fluteWave = ctx.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.18, 0.07, 0.03, 0.01]));

  const auto = (p: AudioParam, pts: Pts) => {
    p.setValueAtTime(pts[0][1], 0);
    for (const [t, v] of pts) p.linearRampToValueAtTime(v, Math.max(t, 0.001));
  };

  type NO = { type?: BiquadFilterType; f0: number; f1?: number; q?: number; vel: number; att?: number; dest?: AudioNode };
  const noise = (t: number, d: number, o: NO) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const att = Math.min(o.att ?? 0.01, d * 0.95);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vel, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(o.dest ?? sfxBus);
    s.start(t, (t * 7.31) % 4.5);
    s.stop(t + d + 0.05);
  };

  type TO = { type?: OscillatorType; f0: number; f1?: number; vel: number; att?: number; dest?: AudioNode; lp?: number };
  const tone = (t: number, d: number, o: TO) => {
    const os = ctx.createOscillator();
    os.type = o.type ?? "sine";
    os.frequency.setValueAtTime(o.f0, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    const g = ctx.createGain();
    const att = Math.min(o.att ?? 0.005, d * 0.9);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vel, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let node: AudioNode = os;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = o.lp;
      os.connect(f); node = f;
    }
    node.connect(g); g.connect(o.dest ?? sfxBus);
    os.start(t); os.stop(t + d + 0.05);
  };

  const pluck = (t: number, midi: number, d: number, vel: number, dest: AudioNode = pianoBus) => {
    const f = mtof(midi);
    const os = ctx.createOscillator();
    os.setPeriodicWave(pianoWave);
    os.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(2200, f * 2.5), t + d * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(lp); lp.connect(g); g.connect(dest);
    os.start(t); os.stop(t + d + 0.05);
  };

  const bell = (t: number, midi: number, d: number, vel: number) => {
    const f = mtof(midi);
    const c = ctx.createOscillator(); const m = ctx.createOscillator(); const mg = ctx.createGain();
    c.frequency.value = f; m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.4, t);
    mg.gain.exponentialRampToValueAtTime(1, t + d * 0.6);
    m.connect(mg); mg.connect(c.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    c.connect(g); g.connect(musicBus);
    c.start(t); m.start(t); c.stop(t + d + 0.05); m.stop(t + d + 0.05);
  };

  /** breathy bamboo flute (quena): delayed vibrato, noise breath, soft attack */
  const flute = (t: number, midi: number, d: number, vel: number, o: { slide?: number; vib?: number } = {}) => {
    const f = mtof(midi);
    const os = ctx.createOscillator();
    os.setPeriodicWave(fluteWave);
    if (o.slide) {
      os.frequency.setValueAtTime(mtof(midi + o.slide), t);
      os.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    } else os.frequency.value = f;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.012 * (o.vib ?? 1), t + Math.min(d * 0.7, 0.7));
    lfo.connect(lg); lg.connect(os.frequency);
    const g = ctx.createGain();
    const att = Math.min(0.09, d * 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + att);
    g.gain.setValueAtTime(vel * 0.9, t + Math.max(att, d - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
    os.connect(g); g.connect(fluteBus);
    os.start(t); lfo.start(t); os.stop(t + d + 0.3); lfo.stop(t + d + 0.3);
    noise(t, d + 0.1, { type: "bandpass", f0: f * 2, q: 3, vel: vel * 0.28, att: att, dest: fluteBus });
  };

  /** vowel choir pad (formants) */
  const choir = (t: number, d: number, midis: number[], vel: number, vowel: "a" | "o" | "u" = "o") => {
    const F: Record<string, [number, number]> = { a: [800, 1150], o: [450, 800], u: [320, 800] };
    const [f1, f2] = F[vowel];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + Math.min(2.2, d * 0.4));
    g.gain.setValueAtTime(vel, t + d);
    g.gain.linearRampToValueAtTime(0, t + d + 2.2);
    g.connect(musicBus);
    for (const fq of [f1, f2]) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = 5;
      const gg = ctx.createGain(); gg.gain.value = fq === f1 ? 1 : 0.6;
      bp.connect(gg); gg.connect(g);
      for (const m of midis) for (const dt of [-9, 0, 9]) {
        const os = ctx.createOscillator();
        os.type = "sawtooth"; os.frequency.value = mtof(m); os.detune.value = dt;
        os.connect(bp); os.start(t); os.stop(t + d + 2.3);
      }
    }
  };

  const pad = (t: number, d: number, midis: number[], vel: number, o: { att?: number; rel?: number; cut?: number; dest?: AudioNode } = {}) => {
    const att = o.att ?? 1.5, rel = o.rel ?? 1.8;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime((o.cut ?? 900) * 0.5, t);
    lp.frequency.linearRampToValueAtTime(o.cut ?? 900, t + att + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.6, t + att);
    g.gain.setValueAtTime(vel * 0.6, Math.max(t + att, t + d - rel * 0.2));
    g.gain.linearRampToValueAtTime(0, t + d + rel);
    lp.connect(g); g.connect(o.dest ?? musicBus);
    for (const m of midis) for (const dt of [-7, 7]) {
      const os = ctx.createOscillator();
      os.type = "sawtooth"; os.frequency.value = mtof(m); os.detune.value = dt;
      os.connect(lp); os.start(t); os.stop(t + d + rel + 0.05);
    }
  };

  const taiko = (t: number, vel: number, low = 1) => {
    tone(t, 0.9, { f0: 100 * low, f1: 42 * low, vel: vel * 0.9, att: 0.003 });
    noise(t, 0.12, { type: "lowpass", f0: 700, vel: vel * 0.5 });
  };
  const boom = (t: number, vel: number) => tone(t, 2.6, { f0: 62, f1: 28, vel, att: 0.01 });
  const thump = (t: number, vel: number) => {
    tone(t, 0.22, { f0: 64, f1: 36, vel, att: 0.004, lp: 160 });
    tone(t + 0.27, 0.2, { f0: 58, f1: 34, vel: vel * 0.7, att: 0.004, lp: 160 });
  };
  const tick = (t: number, vel: number) => noise(t, 0.04, { type: "highpass", f0: 6500, vel });
  const step = (t: number, vel = 0.05) => noise(t, 0.09, { type: "lowpass", f0: 500, vel });
  const splash = (t: number, vel = 0.06) => noise(t, 0.22, { type: "bandpass", f0: 1800, f1: 600, q: 0.7, vel });
  const whoosh = (t: number, vel = 0.2, d = 0.9) => noise(t - d * 0.5, d, { f0: 300, f1: 5000, q: 0.8, vel, att: d * 0.5 });
  const rev = (t: number, d: number, vel: number) => noise(t - d, d, { f0: 400, f1: 5000, q: 0.9, vel, att: d * 0.93 });
  const riser = (t0: number, t1: number, vel: number) => {
    noise(t0, t1 - t0, { f0: 200, f1: 7000, q: 1.2, vel, att: (t1 - t0) * 0.97 });
    tone(t0, t1 - t0, { type: "sawtooth", f0: 110, f1: 880, vel: vel * 0.35, att: (t1 - t0) * 0.97, lp: 2400 });
  };

  /** hollow-log knock — the series' signature sound. pitch scales the whole voice. */
  const tok = (t: number, vel: number, pitch = 1, dest: AudioNode = sfxBus) => {
    const os = ctx.createOscillator();
    os.type = "triangle";
    os.frequency.setValueAtTime(520 * pitch, t);
    os.frequency.exponentialRampToValueAtTime(190 * pitch, t + 0.06);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 900 + vel * 2800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5 * vel + 0.08, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    os.connect(lp); lp.connect(g); g.connect(dest);
    os.start(t); os.stop(t + 0.2);
    noise(t, 0.05, { f0: 1500 * pitch, q: 3, vel: 0.2 * vel + 0.03, dest });
    tone(t, 0.55, { f0: 210 * pitch, f1: 180 * pitch, vel: vel * 0.16, att: 0.004, dest });
  };
  const tokFar = (t: number, vel: number, pitch = 1) => tok(t, vel, pitch * 0.92, farBus);
  const knock3 = (t: number, vel = 0.8, gap = 0.34) => { for (let i = 0; i < 3; i++) tok(t + i * gap, vel * (0.9 + i * 0.06)); };

  const arp = (t0: number, t1: number, sq: Chord[], st: number, pat: number[], vel: number, oct = 0, dest: AudioNode = pianoBus) => {
    let i = 0;
    for (let t = t0; t < t1 - 1e-6; t += st, i++) {
      const ch = sq[Math.floor((t - t0 + 1e-6) / BAR) % sq.length];
      pluck(t, ch.n[pat[i % pat.length]] + oct, 1.7, vel * (i % 4 === 0 ? 1.18 : 1) * (0.9 + 0.2 * R()), dest);
    }
  };
  const bassBars = (t0: number, t1: number, sq: Chord[], vel: number) => {
    for (let t = t0, i = 0; t < t1 - 1e-6; t += BAR, i++) tone(t, BAR * 0.98, { type: "triangle", f0: mtof(sq[i % sq.length].b), vel, att: 0.03, dest: musicBus, lp: 380 });
  };
  const padBars = (t0: number, t1: number, sq: Chord[], vel: number, o: { att?: number; cut?: number } = {}) => {
    for (let t = t0, i = 0; t < t1 - 1e-6; t += BAR, i++) pad(t, BAR + 0.5, sq[i % sq.length].n.map((m) => m - 12), vel, { att: o.att ?? 1.4, cut: o.cut ?? 800 });
  };
  const melody = (notes: [number, number, number][], vel: number, bellVel = 0) => {
    for (const [t, m, d] of notes) {
      pluck(t, m, d + 1, vel);
      if (bellVel) bell(t, m + 12, d + 1.5, bellVel);
    }
  };
  const fluteLine = (notes: [number, number, number][], vel: number) => notes.forEach(([t, m, d], i) => flute(t, m, d, vel, { slide: i % 3 === 0 ? -2 : 0 }));

  /* ------------------------------------------------------------- beds */
  const loopNoise = (type: BiquadFilterType, f: number, q: number, pts: Pts, dest: AudioNode = ambBus, f2?: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    let node: AudioNode = fl;
    s.connect(fl);
    if (f2) {
      const fl2 = ctx.createBiquadFilter();
      fl2.type = "lowpass"; fl2.frequency.value = f2;
      fl.connect(fl2); node = fl2;
    }
    const g = ctx.createGain();
    auto(g.gain, pts);
    node.connect(g); g.connect(dest);
    s.start(0); s.stop(dur);
  };
  const buzz = (f: number, lfoHz: number, pts: Pts) => {
    const o = ctx.createOscillator(); o.frequency.value = f;
    const gate = ctx.createGain(); gate.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = lfoHz;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(gate.gain);
    const lvl = ctx.createGain(); auto(lvl.gain, pts);
    o.connect(gate); gate.connect(lvl); lvl.connect(ambBus);
    o.start(0); lfo.start(0); o.stop(dur); lfo.stop(dur);
  };
  const scale = (pts: Pts, k: number): Pts => pts.map(([t, v]) => [t, v * k]);
  const dayBed = (pts: Pts) => {
    loopNoise("bandpass", 3200, 0.5, scale(pts, 0.045));
    loopNoise("lowpass", 700, 0.4, scale(pts, 0.05));
    buzz(4300, 27, scale(pts, 0.012)); buzz(5200, 19, scale(pts, 0.009)); buzz(3600, 33, scale(pts, 0.008));
  };
  const nightBed = (pts: Pts) => {
    buzz(4700, 13, scale(pts, 0.012)); buzz(5100, 11, scale(pts, 0.01)); buzz(5600, 16, scale(pts, 0.008));
    loopNoise("lowpass", 900, 0.3, scale(pts, 0.02));
  };
  const riverBed = (pts: Pts) => loopNoise("lowpass", 380, 0.7, scale(pts, 1), ambBus, 700);
  const rainBed = (pts: Pts) => {
    loopNoise("highpass", 1400, 0.4, scale(pts, 0.09), ambBus, 9000);
    loopNoise("lowpass", 500, 0.5, scale(pts, 0.08));
  };
  const windBed = (pts: Pts) => loopNoise("bandpass", 420, 0.6, scale(pts, 0.05), ambBus, 900);
  const fireBed = (a: number, b: number, vel = 0.4) => {
    loopNoise("bandpass", 700, 0.6, [[0, 0], [a, 0], [a + 2, vel * 0.04], [b, vel * 0.04], [b + 2, 0]]);
    for (let t = a; t < b; t += 0.05 + R() * 0.35) noise(t, 0.03 + R() * 0.04, { type: "highpass", f0: 2500 + R() * 3000, vel: (0.04 + R() * 0.09) * vel * 2.2, dest: ambBus });
  };
  const thunder = (t: number, vel = 0.5, d = 4) => {
    noise(t, d, { type: "lowpass", f0: 260, f1: 60, q: 0.6, vel, att: 0.08 });
    tone(t, d * 0.8, { f0: 55, f1: 28, vel: vel * 0.7, att: 0.15 });
  };
  const heli = (t0: number, t1: number, pts: Pts) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "bandpass"; lp.frequency.value = 160; lp.Q.value = 0.8;
    const gate = ctx.createGain(); gate.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 11.5;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(gate.gain);
    const lvl = ctx.createGain(); auto(lvl.gain, pts);
    s.connect(lp); lp.connect(gate); gate.connect(lvl); lvl.connect(sfxBus);
    s.start(t0); lfo.start(t0); s.stop(t1); lfo.stop(t1);
    tone(t0, t1 - t0, { type: "sawtooth", f0: 78, vel: 0.0001, att: 0.1 });
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 74;
    const og = ctx.createGain(); auto(og.gain, scale(pts, 0.1));
    const of = ctx.createBiquadFilter(); of.type = "lowpass"; of.frequency.value = 300;
    o.connect(of); of.connect(og); og.connect(sfxBus); o.start(t0); o.stop(t1);
  };
  const birdcall = (t: number, f: number, n = 3) => { for (let i = 0; i < n; i++) tone(t + i * 0.13, 0.11, { f0: f * (1 + 0.1 * i), f1: f * (1.5 + 0.05 * i), vel: 0.035, att: 0.01, dest: ambBus }); };
  const frog = (t: number, f = 520) => { for (let i = 0; i < 3; i++) tone(t + i * 0.09, 0.07, { type: "square", f0: f, f1: f * 0.7, vel: 0.012, att: 0.005, dest: ambBus, lp: 1400 }); };

  return {
    ctx, R, dur, BAR, BEAT, mtof, auto, noise, tone, pluck, bell, flute, fluteLine, choir, pad, taiko, boom, thump, tick, step, splash, whoosh, rev, riser,
    tok, tokFar, knock3, arp, bassBars, padBars, melody, loopNoise, buzz, dayBed, nightBed, riverBed, rainBed, windBed, fireBed, thunder, heli, birdcall, frog,
    buses: { musicBus, pianoBus, ambBus, sfxBus, fluteBus, farBus },
  };
}
export type Kit = ReturnType<typeof makeKit>;

export async function renderScore(dur: number, bpm: number, seed: number, compose: (k: Kit) => void): Promise<AudioBuffer> {
  const k = makeKit(dur, bpm, seed);
  compose(k);
  return k.ctx.startRendering();
}
