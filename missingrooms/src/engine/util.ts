export const W = 1280;
export const H = 720;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x: number) => Math.pow(clamp(x), 2.2);
export const easeInOut = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** progress of t inside [a,b], 0..1 */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** 0 → 1 → 0 pulse inside [a,b] */
export const bump = (t: number, a: number, b: number) => Math.sin(Math.PI * prog(t, a, b));

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic hash noise in -1..1 for wobble */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export const BEAT_LEN = 45;
export const BEAT_COUNT = 5;
export const END_CARD = 15;
export const EP_LEN = BEAT_LEN * BEAT_COUNT + END_CARD; // 240s = 4:00

export interface Cue {
  text: string;
  /** seconds from beat start */
  start: number;
  end: number;
}

export function splitSentences(text: string): string[] {
  const out = text.match(/[^.!?]+[.!?]+(?:["”')\]]+)?|[^.!?]+$/g) ?? [text];
  return out.map((s) => s.trim()).filter(Boolean);
}

const LEAD = 1.7; // silence at the head of every beat so the picture can speak first
const WPS = 2.15; // conservative words-per-second used for caption timing
const PAUSE = 0.55;

/**
 * Caption/narration cue times for one 45s beat. Speech never fills the whole window:
 * the remaining time belongs to picture and sound.
 */
export function computeCues(vo: string): Cue[] {
  const sents = splitSentences(vo);
  const words = sents.map((s) => s.split(/\s+/).length);
  let total = 0;
  const durs = words.map((w) => {
    const d = w / WPS + 0.15;
    total += d + PAUSE;
    return d;
  });
  const budget = BEAT_LEN - LEAD - 1.2;
  const k = total > budget ? budget / total : 1;
  const cues: Cue[] = [];
  let t = LEAD;
  sents.forEach((s, i) => {
    const d = durs[i] * k;
    cues.push({ text: s, start: t, end: t + d });
    t += d + PAUSE * k;
  });
  return cues;
}

/** Returns a canvas-friendly font string */
export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const MONO = '"SF Mono", "Courier New", Courier, monospace';
export const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

export const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");
export function mmss(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
