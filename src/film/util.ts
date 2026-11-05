export const TAU = Math.PI * 2;
export type RGB = [number, number, number];
export type V2 = [number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lin = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const fract = (x: number) => x - Math.floor(x);
export const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** smooth 1D value noise, ~[-1,1] */
export function noise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
}

/** keyframes with smoothstep easing between keys */
export function kf(t: number, pts: [number, number][]): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (u * u * (3 - 2 * u));
    }
  }
  return pts[pts.length - 1][1];
}
/** keyframes, linear */
export function kfl(t: number, pts: [number, number][]): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
}
/** trapezoid envelope */
export const env = (t: number, a: number, b: number, c: number, d: number) =>
  smooth(a, b, t) * (1 - smooth(c, d, t));

export const mix3 = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const rgba = (c: RGB, a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const scale3 = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// ---------------------------------------------------------------- heartbeat
// The heartbeat is the film's spine: visuals and score read the same beat table.
const BPM_KEYS: [number, number][] = [
  [0, 44],
  [30, 48],
  [66, 58],
  [104, 40],
  [140, 44],
  [150, 86],
  [184, 124],
  [190, 66],
  [212, 54],
  [252, 52],
  [280, 40],
  [292, 30],
];
export const DURATION = 300;

function buildBeats() {
  const beats: number[] = [];
  let phase = 0;
  const dt = 0.004;
  for (let t = 0; t < DURATION; t += dt) {
    const bpm = kf(t, BPM_KEYS);
    const before = Math.floor(phase);
    phase += (bpm / 60) * dt;
    if (Math.floor(phase) > before) beats.push(t);
  }
  // the heart stops... and one last beat returns for the hook
  return beats.filter((b) => b < 286 || b > 400).concat([295.4]);
}
export const BEATS = buildBeats();

export function beatInfo(t: number): { since: number; period: number } {
  let lo = 0;
  let hi = BEATS.length - 1;
  if (t < BEATS[0]) return { since: 99, period: 1.3 };
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (BEATS[m] <= t) lo = m;
    else hi = m - 1;
  }
  const next = BEATS[lo + 1] ?? BEATS[lo] + 1.5;
  return { since: t - BEATS[lo], period: Math.min(2, next - BEATS[lo]) };
}
/** 0..~1 double-thump pulse (lub-dub) */
export function heart(t: number): number {
  const { since, period } = beatInfo(t);
  const a = Math.exp(-Math.pow(since / 0.085, 2));
  const b = 0.62 * Math.exp(-Math.pow((since - Math.min(0.26, period * 0.3)) / 0.09, 2));
  return a + b;
}

/** the ticking clock of the climb: each tick is a year */
export const TICKS: number[] = (() => {
  const a: number[] = [];
  let t = 184.6;
  while (t < 211.6) {
    a.push(t);
    t += lerp(1.05, 0.45, clamp((t - 184) / 27));
  }
  return a;
})();
export const tickPulse = (t: number) => {
  let m = 0;
  for (const k of TICKS) {
    const d = t - k;
    if (d > -0.3 && d < 0.8) m = Math.max(m, Math.exp(-Math.pow(d / 0.16, 2)));
  }
  return m;
};
