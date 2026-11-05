/** lub-dub pulse (0..~1.6) from a beat table */
export function pulseAt(beats: number[], t: number): number {
  if (!beats.length || t < beats[0]) return 0;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (beats[m] <= t) lo = m;
    else hi = m - 1;
  }
  const since = t - beats[lo];
  const next = beats[lo + 1] ?? beats[lo] + 1.5;
  const period = Math.min(2, next - beats[lo]);
  const a = Math.exp(-Math.pow(since / 0.085, 2));
  const b = 0.62 * Math.exp(-Math.pow((since - Math.min(0.26, period * 0.3)) / 0.09, 2));
  return a + b;
}

/** hard-cut keyframes: holds each value until the next time */
export function step<T>(t: number, pts: [number, T][]): T {
  let v = pts[0][1];
  for (const [pt, pv] of pts) if (t >= pt) v = pv;
  return v;
}

/** local progress inside a shot, 0..1 */
export const prog = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** ease helpers */
export const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
export const easeIn = (x: number) => Math.pow(Math.min(1, Math.max(0, x)), 2.2);
