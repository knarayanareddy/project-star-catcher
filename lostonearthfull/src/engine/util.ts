// Core math + determinism helpers. Nothing here reads the clock or Math.random.
export const W = 1920;
export const H = 820; // 2.34:1 cinemascope frame
export const DURATION = 300; // seconds
export const FPS = 60;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** animation "on twos" – hold each drawing for 2 frames at 24fps = 12 fps */
export const twos = (t: number, fps = 12) => Math.floor(t * fps) / fps;

// Easing (easings.net)
export const E = {
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  outSine: (x: number) => Math.sin((x * Math.PI) / 2),
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inCubic: (x: number) => x * x * x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQuart: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outQuint: (x: number) => 1 - Math.pow(1 - x, 5),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};

/** deterministic float in [0,1) from any number */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

/** seeded generator (mulberry32) */
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

export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** piecewise-linear lookup */
export function pw(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return pts[pts.length - 1][1];
}

export const tc = (g: number) => {
  const s = Math.floor(g);
  const m = Math.floor(s / 60);
  return `00:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** The recording's battery — a slow clock that drains across the episode */
export const battery = (g: number) =>
  pw(g, [
    [0, 12],
    [50, 11],
    [100, 8],
    [140, 6],
    [180, 4],
    [226, 2.5],
    [284, 0],
  ]);

/** Moments the unseen stranger knocks three times (seconds, global). Also scheduled in the score. */
export const KNOCKS = [22, 88, 142, 190, 232, 248, 256, 277];
