import type { AmbId, CueId, Line, Scene, Sfx, Speaker } from "../story/script";

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface CueCfg {
  root: number;
  scale: number[];
  bpm: number;
  drone: number;
  pad: number;
  pluck: number;
  kick?: boolean;
  hat?: boolean;
  arp?: boolean;
  glitch?: number;
  motif?: number[];
  octave?: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYG = [0, 1, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 7, 9];
const WHOLE = [0, 2, 4, 6, 8, 10];

const CUES: Record<CueId, CueCfg> = {
  none: { root: 40, scale: MINOR, bpm: 60, drone: 0, pad: 0, pluck: 0 },
  tense: { root: 38, scale: PHRYG, bpm: 66, drone: 0.9, pad: 0.15, pluck: 0.1, glitch: 10, octave: 1 },
  weird: { root: 43, scale: WHOLE, bpm: 92, drone: 0.5, pad: 0.35, pluck: 0.35, kick: false, hat: true, glitch: 8, octave: 1 },
  hype: { root: 45, scale: MINOR, bpm: 140, drone: 0.4, pad: 0.2, pluck: 0.5, kick: true, hat: true, arp: true },
  sad: { root: 50, scale: MINOR, bpm: 68, drone: 0.15, pad: 0.45, pluck: 0, motif: [4, -1, 2, -1, 3, 2, 0, -1, 4, -1, 5, -1, 4, 3, 2, -1], octave: 1 },
  void: { root: 52, scale: WHOLE, bpm: 74, drone: 0.1, pad: 0.7, pluck: 0.4, octave: 2 },
  court: { root: 36, scale: PHRYG, bpm: 58, drone: 1, pad: 0.5, pluck: 0.1, kick: true, octave: 0 },
  dawn: { root: 55, scale: MAJOR, bpm: 72, drone: 0.15, pad: 0.55, pluck: 0.25, motif: [0, -1, 2, -1, 4, 2, -1, -1, 3, -1, 2, -1, 0, -1, -1, -1], octave: 1 },
  chaos: { root: 41, scale: PHRYG, bpm: 128, drone: 0.4, pad: 0.1, pluck: 0.2, kick: true, hat: true, arp: true, glitch: 3 },
};

const VOICE_PREF: Record<Speaker, { pitch: number; rate: number; male: boolean; names: RegExp }> = {
  NARRATOR: { pitch: 0.55, rate: 0.95, male: true, names: /Daniel|Google UK English Male|Alex|Arthur|Fred|Microsoft (George|Ryan)|Male/i },
  GERALD: { pitch: 1.05, rate: 1.0, male: true, names: /Google US English|Aaron|Guy|David|Mark|Tom|Fred|Male/i },
  DOLORES: { pitch: 1.12, rate: 0.98, male: false, names: /Samantha|Karen|Google UK English Female|Zira|Moira|Tessa|Female/i },
  MANAGEMENT: { pitch: 0.1, rate: 0.82, male: true, names: /Fred|Alex|Daniel|Google UK English Male|Male/i },
  MOM: { pitch: 1.4, rate: 1.04, male: false, names: /Samantha|Victoria|Karen|Google US English|Zira|Female/i },
};

export function estDur(text: string) {
  return text.split(/\s+/).length / 2.45 + 0.4;
}

/** The time window + rate each line should be performed with so it fits before the next one. */
export function lineTiming(scene: Scene, i: number) {
  const ln = scene.lines[i];
  const next = scene.lines[i + 1]?.at ?? scene.dur;
  const win = Math.max(1.2, next - ln.at - 0.15);
  const natural = estDur(ln.text);
  const rate = Math.min(1.5, Math.max(0.82, natural / win));
  return { dur: Math.min(win, natural / rate), rate };
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  musicOn = true;
  voiceOn = true;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private revSend!: GainNode;
  private noise!: AudioBuffer;
  private amb: Record<AmbId, GainNode> = {} as never;
  private cue: CueId = "none";
  private timer = 0;
  private nextStep = 0;
  private step = 0;
  private nextGlitch = 0;
  private droneNodes: { o: OscillatorNode[]; g: GainNode; f: BiquadFilterNode } | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private walk = 2;

  init() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.7;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    // reverb IR
    const len = ctx.sampleRate * 3;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0.5;
    this.revSend.connect(this.reverb);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.6;
    this.reverb.connect(revOut).connect(this.master);

    // noise buffer
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this.buildAmbience();
    this.nextStep = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), 60);

    if ("speechSynthesis" in window) {
      const load = () => (this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)));
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  private buildAmbience() {
    const ctx = this.ctx!;
    const mk = (): GainNode => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      return g;
    };
    const noiseSrc = (): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.start();
      return s;
    };
    // rain
    const rain = mk();
    const rs = noiseSrc();
    const rhp = ctx.createBiquadFilter();
    rhp.type = "highpass";
    rhp.frequency.value = 2500;
    const rg = ctx.createGain();
    rg.gain.value = 0.18;
    rs.connect(rhp).connect(rg).connect(rain);
    // hum
    const hum = mk();
    for (const [f, t, v] of [[60, "sine", 0.1], [120, "sawtooth", 0.015], [180, "sine", 0.03], [7600, "sine", 0.002]] as [number, OscillatorType, number][]) {
      const o = ctx.createOscillator();
      o.type = t;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = v;
      o.connect(g).connect(hum);
      o.start();
    }
    // wind
    const wind = mk();
    const ws = noiseSrc();
    const wbp = ctx.createBiquadFilter();
    wbp.type = "bandpass";
    wbp.frequency.value = 450;
    wbp.Q.value = 0.8;
    const wl = ctx.createOscillator();
    wl.frequency.value = 0.13;
    const wlg = ctx.createGain();
    wlg.gain.value = 250;
    wl.connect(wlg).connect(wbp.frequency);
    wl.start();
    const wg = ctx.createGain();
    wg.gain.value = 0.28;
    ws.connect(wbp).connect(wg).connect(wind);
    // void shimmer
    const voidG = mk();
    for (const [f, v] of [[880, 0.012], [1320.5, 0.01], [1760, 0.006], [220, 0.03]] as [number, number][]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = v;
      const l = ctx.createOscillator();
      l.frequency.value = 0.1 + Math.random() * 0.2;
      const lg = ctx.createGain();
      lg.gain.value = v * 0.8;
      l.connect(lg).connect(g.gain);
      l.start();
      o.connect(g).connect(voidG);
      o.start();
    }
    this.amb = { rain, hum, wind, void: voidG, none: mk() };
  }

  setAmb(a: AmbId) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    (Object.keys(this.amb) as AmbId[]).forEach((k) => {
      this.amb[k].gain.cancelScheduledValues(t);
      this.amb[k].gain.setTargetAtTime(k === a && k !== "none" ? 1 : 0, t, 0.8);
    });
  }

  setCue(c: CueId) {
    if (!this.ctx) return;
    this.cue = c;
    this.step = 0;
    this.nextStep = this.ctx.currentTime + 0.05;
    this.nextGlitch = this.ctx.currentTime + 4;
    this.rebuildDrone();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.1);
  }
  setVoice(on: boolean) {
    this.voiceOn = on;
    if (!on) this.cancelSpeech();
  }

  suspend() {
    this.ctx?.suspend();
    if ("speechSynthesis" in window) speechSynthesis.pause();
  }
  resume() {
    this.ctx?.resume();
    if ("speechSynthesis" in window) speechSynthesis.resume();
  }

  private rebuildDrone() {
    const ctx = this.ctx!;
    const cfg = CUES[this.cue];
    const t = ctx.currentTime;
    if (this.droneNodes) {
      const old = this.droneNodes;
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setTargetAtTime(0, t, 0.4);
      setTimeout(() => old.o.forEach((o) => o.stop()), 2500);
    }
    if (cfg.drone <= 0) {
      this.droneNodes = null;
      return;
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.07 * cfg.drone, t, 1.2);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg).connect(f.frequency);
    lfo.start();
    const os: OscillatorNode[] = [lfo];
    for (const [off, det, type] of [[0, -8, "sawtooth"], [0, 8, "sawtooth"], [-12, 0, "sine"], [7, 3, "triangle"]] as [number, number, OscillatorType][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(cfg.root + off);
      o.detune.value = det;
      o.connect(f);
      o.start();
      os.push(o);
    }
    f.connect(g);
    g.connect(this.musicBus);
    g.connect(this.revSend);
    this.droneNodes = { o: os, g, f };
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.cue === "none") return;
    const cfg = CUES[this.cue];
    const stepDur = 60 / cfg.bpm / 4;
    while (this.nextStep < ctx.currentTime + 0.25) {
      this.playStep(cfg, this.step, this.nextStep);
      this.step++;
      this.nextStep += stepDur;
    }
    if (cfg.glitch && ctx.currentTime > this.nextGlitch) {
      this.glitch(ctx.currentTime + 0.05, 0.1);
      this.nextGlitch = ctx.currentTime + cfg.glitch * (0.8 + Math.random() * 0.4);
    }
  }

  private deg(cfg: CueCfg, d: number, oct = 0) {
    const n = cfg.scale.length;
    const o = Math.floor(d / n);
    const i = ((d % n) + n) % n;
    return cfg.root + cfg.scale[i] + 12 * (o + oct + (cfg.octave ?? 0));
  }

  private playStep(cfg: CueCfg, s: number, t: number) {
    if (cfg.kick && s % 4 === 0) this.kick(t, this.cue === "court" ? 0.9 : 0.6);
    if (cfg.kick && this.cue === "court" && s % 16 === 8) this.kick(t, 0.5);
    if (cfg.hat && s % 2 === 1) this.hat(t, 0.05);
    if (cfg.arp) this.tone(mtof(this.deg(cfg, (s * 3) % 7 + (s % 8 > 3 ? 2 : 0), 1)), t, 0.14, "sawtooth", 0.025, 1400);
    if (cfg.motif) {
      if (s % 2 === 0) {
        const d = cfg.motif[(s / 2) % cfg.motif.length];
        if (d >= 0) this.piano(mtof(this.deg(cfg, d, 0)), t, 0.2);
      }
      if (s % 32 === 0) this.piano(mtof(cfg.root - 12), t, 0.25);
    }
    if (cfg.pluck > 0 && s % 2 === 0 && Math.random() < cfg.pluck * 0.4) {
      this.walk = Math.max(-3, Math.min(10, this.walk + Math.floor(Math.random() * 5) - 2));
      this.piano(mtof(this.deg(cfg, this.walk, 1)), t, 0.07 + Math.random() * 0.05);
    }
    if (cfg.pad > 0 && s % 64 === 0) {
      for (const d of [0, 2, 4]) this.padNote(mtof(this.deg(cfg, d + (s % 128 ? 1 : 0), 0)), t, (60 / cfg.bpm) * 16, 0.05 * cfg.pad);
    }
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(f: number, t: number, dur: number, type: OscillatorType, vol: number, lp = 3000, rev = 0.3) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = lp;
    this.env(g, t, 0.005, vol, dur);
    o.connect(fl).connect(g);
    g.connect(this.musicBus);
    const s = ctx.createGain();
    s.gain.value = rev;
    g.connect(s).connect(this.revSend);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  private piano(f: number, t: number, vol: number) {
    const ctx = this.ctx!;
    for (const [mul, v, type] of [[1, 1, "triangle"], [2, 0.35, "sine"], [3.01, 0.12, "sine"]] as [number, number, OscillatorType][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      this.env(g, t, 0.006, vol * v, 2.4 / mul);
      o.connect(g);
      g.connect(this.musicBus);
      const s = ctx.createGain();
      s.gain.value = 0.55;
      g.connect(s).connect(this.revSend);
      o.start(t);
      o.stop(t + 2.6);
    }
  }

  private padNote(f: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.musicBus);
      const s = ctx.createGain();
      s.gain.value = 0.8;
      g.connect(s).connect(this.revSend);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g = ctx.createGain();
    this.env(g, t, 0.002, vol * 0.5, 0.5);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.6);
  }

  private hat(t: number, vol: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    this.env(g, t, 0.001, vol, 0.05);
    s.connect(hp).connect(g).connect(this.musicBus);
    s.start(t, Math.random());
    s.stop(t + 0.1);
  }

  private glitch(t: number, vol: number) {
    const ctx = this.ctx!;
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 200 + Math.random() * 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.3, t + i * 0.035);
      g.gain.setValueAtTime(0, t + i * 0.035 + 0.025);
      o.connect(g).connect(this.sfxBus);
      o.start(t + i * 0.035);
      o.stop(t + i * 0.035 + 0.03);
    }
  }

  private noiseBurst(t: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1?: number, q = 1) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    this.env(g, t, Math.min(0.05, dur * 0.2), vol, dur);
    s.connect(fl).connect(g).connect(this.sfxBus);
    g.connect(this.revSend);
    s.start(t, Math.random());
    s.stop(t + dur + 0.2);
  }

  private sweep(t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine", rev = 0.2) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.01, vol, dur);
    o.connect(g).connect(this.sfxBus);
    const s = ctx.createGain();
    s.gain.value = rev;
    g.connect(s).connect(this.revSend);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  sfx(name: Sfx["name"]) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.02;
    switch (name) {
      case "buzz":
        for (let i = 0; i < 4; i++) {
          this.tone(95, t + i * 0.22, 0.14, "square", 0.08, 600, 0.05);
          this.noiseBurst(t + i * 0.22, 0.12, 0.06, "lowpass", 400);
        }
        break;
      case "boom":
        this.sweep(t, 90, 22, 2.4, 0.9, "sine", 0.5);
        this.noiseBurst(t, 1.2, 0.5, "lowpass", 2000, 90);
        break;
      case "whoosh":
        this.noiseBurst(t, 1.4, 0.35, "bandpass", 200, 4000, 2);
        break;
      case "ding":
        this.tone(1318.5, t, 1.6, "sine", 0.12, 8000, 0.6);
        this.tone(2637, t, 0.8, "sine", 0.04, 8000, 0.6);
        break;
      case "chime":
        this.tone(1760, t, 2.8, "sine", 0.07, 9000, 0.9);
        this.tone(2349, t + 0.12, 2.4, "sine", 0.05, 9000, 0.9);
        this.tone(2960, t + 0.25, 2.0, "sine", 0.03, 9000, 0.9);
        break;
      case "heart":
        this.sweep(t, 70, 40, 0.25, 0.9);
        this.sweep(t + 0.26, 62, 36, 0.3, 0.7);
        break;
      case "glitch":
        this.glitch(t, 0.35);
        this.noiseBurst(t, 0.3, 0.2, "highpass", 3000);
        break;
      case "stamp":
        this.sweep(t, 160, 45, 0.35, 0.9);
        this.noiseBurst(t, 0.12, 0.5, "lowpass", 1800);
        break;
      case "sting":
        for (const f of [220, 233, 330, 349]) this.tone(f, t, 1.8, "sawtooth", 0.05, 2200, 0.8);
        this.sweep(t, 80, 40, 1.4, 0.4);
        break;
      case "drop":
        this.sweep(t, 140, 28, 3, 0.85, "sine", 0.6);
        break;
      case "screech":
        this.sweep(t, 1900, 380, 1.1, 0.12, "sawtooth", 0.4);
        this.noiseBurst(t, 1.0, 0.25, "bandpass", 2600, 900, 3);
        break;
      case "sigh":
        this.noiseBurst(t, 1.6, 0.18, "bandpass", 1600, 400, 1.2);
        break;
    }
  }

  // ------------------------------------------------------------ voice
  private pick(sp: Speaker) {
    const pref = VOICE_PREF[sp];
    const v = this.voices.find((x) => pref.names.test(x.name));
    return v ?? this.voices.find((x) => x.localService) ?? this.voices[0];
  }

  cancelSpeech() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  speak(line: Line, rate: number) {
    if (!this.voiceOn || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(line.text.replace(/\.\.\./g, "…"));
    const pref = VOICE_PREF[line.speaker];
    const v = this.pick(line.speaker);
    if (v) u.voice = v;
    u.pitch = pref.pitch;
    u.rate = Math.min(2, Math.max(0.5, rate * pref.rate));
    u.volume = line.speaker === "MANAGEMENT" ? 1 : 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  dispose() {
    window.clearInterval(this.timer);
    this.cancelSpeech();
    this.ctx?.close();
    this.ctx = null;
  }
}
