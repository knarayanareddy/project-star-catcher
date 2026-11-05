import { RGB, TAU, V2, clamp, hash, heart, lerp, mix3, noise, rgba, smooth } from "../util";
import { Pal, glow } from "../look";
import { MechPose, idlePose } from "../mech";
import { drawManta } from "../manta";

export const AMBER: RGB = [255, 168, 58];
export const RED: RGB = [255, 34, 26];
export const GOLD: RGB = [255, 214, 120];
export const COLD: RGB = [205, 228, 255];

export function mechBase(t: number, pal: Pal, x: number, y: number, s = 0.85, flip = 1): MechPose {
  return {
    x, y, s, flip, ...idlePose(t),
    lens: AMBER, glow: 0.6, t, pal, lamp: 0.8, heart: 0.7 + 0.35 * heart(t), iris: 0.5,
  };
}

export function shake(t: number, amp: number): V2 {
  return [noise(t * 19.3) * amp, noise(t * 23.7 + 40) * amp];
}

export function drawBaby(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; size: number; t: number; pal: Pal; glow?: number; eyes?: number; alpha?: number; rot?: number; col?: RGB; weak?: number; look?: V2; map?: number },
) {
  const col = p.col ?? mix3(p.pal.accent, [255, 255, 255], 0.25);
  const weak = p.weak ?? 0;
  const gl = (p.glow ?? 0.8) * (1 - weak * 0.75);
  const a = p.alpha ?? 1;
  glow(ctx, p.x, p.y, p.size * 2.8, col, 0.7 * gl * a);
  drawManta(ctx, {
    x: p.x, y: p.y, size: p.size, rot: p.rot ?? 0, t: p.t,
    flap: p.t * (3.1 - weak * 2.3), amp: 0.95 * (1 - weak * 0.75), alpha: a, glow: gl,
    eyes: p.eyes ?? 1, maw: 0, map: p.map ?? 0, skin: [74, 94, 148], skinDark: [22, 28, 68], light: col,
    look: p.look, blinkSeed: 3,
  });
  glow(ctx, p.x, p.y + p.size * 0.02, p.size * 0.55, [255, 255, 255], (p.size > 100 ? 0.12 : 0.45) * gl * a);
}

export interface NetO {
  ox: number; oy: number; cx: number; cy: number; R: number;
  spread: number; cinch: number; t: number; col: RGB; flat?: number; alpha?: number;
}
export function drawNet(ctx: CanvasRenderingContext2D, o: NetO) {
  const sp = smooth(0, 1, o.spread);
  const cinch = smooth(0, 1, o.cinch);
  const arc = Math.sin(sp * Math.PI) * 120;
  const cx = lerp(o.ox, o.cx, sp);
  const cy = lerp(o.oy, o.cy, sp) - arc * (1 - o.cinch);
  const R = o.R * smooth(0, 0.55, o.spread) * (1 - cinch * 0.82) + 6;
  const flat = lerp(o.flat ?? 0.34, 0.95, cinch);
  const a = (o.alpha ?? 1);
  const N = 22, K = 6;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const pt = (th: number, k: number): V2 => {
    const r = (R * k) / K;
    const wv = 1 + 0.07 * Math.sin(th * 3 + o.t * 2 + k) * (1 - cinch);
    return [cx + Math.cos(th + o.t * 0.15) * r * wv, cy + Math.sin(th + o.t * 0.15) * r * flat * wv];
  };
  // tethers from the hand
  if (o.spread < 0.999 || o.cinch > 0) {
    ctx.strokeStyle = rgba(o.col, 0.35 * a);
    ctx.lineWidth = 1.2;
    for (let j = 0; j < N; j += 2) {
      const p = pt((j / N) * TAU, K);
      ctx.beginPath();
      ctx.moveTo(o.ox, o.oy);
      ctx.quadraticCurveTo(lerp(o.ox, p[0], 0.5), lerp(o.oy, p[1], 0.5) + 28 * (1 - sp * 0.7), p[0], p[1]);
      ctx.stroke();
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? rgba(o.col, 0.16 * a) : rgba(mix3(o.col, [255, 255, 255], 0.6), 0.85 * a);
    ctx.lineWidth = pass === 0 ? 6 : 1.3;
    for (let k = 1; k <= K; k++) {
      ctx.beginPath();
      for (let j = 0; j <= N; j++) {
        const p = pt((j / N) * TAU, k);
        j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    for (let j = 0; j < N; j++) {
      ctx.beginPath();
      for (let k = 0; k <= K; k++) {
        const p = pt((j / N) * TAU, k);
        k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  }
  for (let k = 1; k <= K; k += 1) {
    for (let j = 0; j < N; j += 2) {
      const p = pt(((j + (k % 2)) / N) * TAU, k);
      glow(ctx, p[0], p[1], 5 + (1 - cinch) * 3, o.col, 0.8 * a * (0.5 + 0.5 * Math.sin(o.t * 3 + j + k)));
    }
  }
  glow(ctx, cx, cy, R * 1.2, o.col, 0.35 * a * (0.4 + cinch));
  ctx.restore();
  return { cx, cy, R };
}

export function drawMeteors(ctx: CanvasRenderingContext2D, t: number, t0: number, t1: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < 22; i++) {
    const ts = t0 + hash(i * 3.7) * (t1 - t0);
    const dur = 0.7 + hash(i + 11) * 0.8;
    const u = (t - ts) / dur;
    if (u < 0 || u > 1.15) continue;
    const x0 = 100 + hash(i * 1.9) * 1200;
    const y0 = 20 + hash(i * 2.9) * 150;
    const ang = 0.9 + hash(i + 5) * 0.5;
    const len = 480;
    const hx = x0 + Math.cos(ang) * len * u;
    const hy = y0 + Math.sin(ang) * len * u;
    const tl = 130 + hash(i) * 120;
    const g = ctx.createLinearGradient(hx, hy, hx - Math.cos(ang) * tl, hy - Math.sin(ang) * tl);
    const fade = 1 - smooth(0.85, 1.15, u);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
    g.addColorStop(0.25, `rgba(160,220,255,${0.4 * fade})`);
    g.addColorStop(1, "rgba(120,160,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang) * tl, hy - Math.sin(ang) * tl);
    ctx.stroke();
    glow(ctx, hx, hy, 12, [200, 230, 255], fade);
  }
  ctx.restore();
}

/** letter-spaced centred text */
export function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, alphaFn?: (i: number, n: number) => number) {
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  [...text].forEach((c, i) => {
    if (alphaFn) ctx.globalAlpha = alphaFn(i, text.length);
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.globalAlpha = 1;
}

export function drawTitle(ctx: CanvasRenderingContext2D, t: number, t0: number, t1: number, pal: Pal) {
  if (t < t0 || t > t1) return;
  const k = t - t0;
  const out = 1 - smooth(t1 - 1.2, t1, t);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = `300 84px "Cormorant Garamond", "Iowan Old Style", Georgia, serif`;
  const label = "STAR CATCHER";
  const jit = t > t1 - 0.9 ? (hash(Math.floor(t * 24)) - 0.5) * 10 : 0;
  for (const [dx, col, comp] of [
    [-3, "rgba(255,60,90,0.55)", "lighter"],
    [3, "rgba(60,200,255,0.55)", "lighter"],
    [0, rgba(mix3(pal.moon, [255, 255, 255], 0.5), 1), "source-over"],
  ] as [number, string, GlobalCompositeOperation][]) {
    ctx.globalCompositeOperation = comp;
    ctx.fillStyle = col;
    spaced(ctx, label, 640 + dx + jit, 150, 22, (i, n) => smooth(i * 0.14, i * 0.14 + 1.4, k) * out * (dx === 0 ? 1 : 0.6 * (1 - smooth(1.5, 3, k) * 0.7)) * (i === n ? 1 : 1));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.font = `400 21px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = rgba(pal.lit, 1);
  ctx.globalAlpha = smooth(2.2, 3.6, k) * out * 0.85;
  spaced(ctx, "EPISODE I  ·  THE HOLLOW TIDE", 640, 240, 9);
  ctx.globalAlpha = 1;
  // hairline
  ctx.fillStyle = rgba(pal.moon, 1);
  ctx.globalAlpha = smooth(1.2, 3, k) * out * 0.5;
  const hw = 220 * smooth(1.2, 3.4, k);
  ctx.fillRect(640 - hw, 205, hw * 2, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function risingLights(ctx: CanvasRenderingContext2D, t: number, k: number, col: RGB, topFade = 0.2) {
  if (k <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 190; i++) {
    const sp = 22 + hash(i * 1.3) * 60;
    const x = hash(i * 7.1) * 1280 + Math.sin(t * 0.5 + i) * 26;
    const y = 900 - ((hash(i * 3.3) * 1100 + t * sp) % 1100);
    const fade = smooth(-20, 160, y) * smooth(820, 640, y);
    const r = 5 + hash(i + 9) * 12;
    glow(ctx, x, y, r * (1 + 0.3 * Math.sin(t * 2 + i)), col, k * fade * (0.5 + topFade));
  }
  ctx.restore();
}

export const clamp01 = clamp;
