// Shared constants + pure helpers. Every frame of the film is a pure function of time t.
export const W = 1920;
export const H = 804; // 2.39:1 cinemascope
export const FPS = 24;
export const DURATION = 120;

export type Ctx = CanvasRenderingContext2D;

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (a: number, b: number, t: number) => {
  const x = prog(t, a, b);
  return x * x * (3 - 2 * x);
};
// easings (easings.net values)
export const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // in-out cubic
export const eioq = (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2); // in-out quart
export const eis = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2; // in-out sine
export const eoc = (x: number) => 1 - Math.pow(1 - x, 3); // out cubic
export const eoq = (x: number) => 1 - Math.pow(1 - x, 5); // out quint
export const eoe = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)); // out expo
export const eiq = (x: number) => x * x * x; // in cubic

// seeded RNG (never Math.random)
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
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
// smooth 1D value noise in [-1,1]
export function noise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}

export function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}
export function rgbs(a: string) {
  const A = hexToRgb(a);
  return `${A[0]},${A[1]},${A[2]}`;
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// anime "on twos": quantise time to 12 fps for hand-animated elements
export const twos = (t: number) => Math.floor(t * 12) / 12;
