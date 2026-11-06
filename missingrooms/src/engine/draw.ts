import { MONO, SERIF, hash } from "./util";

import { C } from "./palette";
export { C };

type Cv = HTMLCanvasElement;
export function makeCanvas(w: number, h: number): Cv {
  const g = globalThis as unknown as { __makeCanvas?: (w: number, h: number) => Cv };
  if (g.__makeCanvas) return g.__makeCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export type Ctx = CanvasRenderingContext2D;

/* ---------- primitives ---------- */

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r = 6) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string, lw = 1.5) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function poly(ctx: Ctx, pts: [number, number][], fill?: string, stroke?: string, lw = 1.5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 1.5) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw = 2, cap: CanvasLineCap = "round") {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = cap;
  ctx.stroke();
}

export interface TxtOpts {
  size?: number;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  weight?: string | number;
  spacing?: number;
  baseline?: CanvasTextBaseline;
  alpha?: number;
}
export function txt(ctx: Ctx, s: string, x: number, y: number, o: TxtOpts = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 400} ${o.size ?? 16}px ${o.font ?? SERIF}`;
  ctx.fillStyle = o.color ?? C.ink;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = o.baseline ?? "alphabetic";
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${o.spacing ?? 0}px`;
  } catch {
    /* older engines */
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}

export const mono = (ctx: Ctx, s: string, x: number, y: number, o: TxtOpts = {}) => txt(ctx, s, x, y, { font: MONO, ...o });

export function shadowEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(20,10,30,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Hand-drawn red correction line, revealed with progress p (0..1). */
export function corrLine(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, p = 1, w = 4, color = C.red, seed = 3) {
  if (p <= 0) return;
  const n = 14;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = w;
  ctx.beginPath();
  const m = Math.max(1, Math.floor(n * Math.min(1, p)));
  for (let i = 0; i <= m; i++) {
    const f = Math.min(p, i / n);
    const wob = hash(i * 1.7 + seed) * w * 0.6;
    const px = x1 + dx * f + nx * wob;
    const py = y1 + dy * f + ny * wob;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = w * 2.2;
  ctx.stroke();
  ctx.restore();
}

/** red circle drawn progressively */
export function corrCircle(ctx: Ctx, x: number, y: number, r: number, p = 1, w = 3, color = C.red) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  const steps = 40;
  const m = Math.floor(steps * Math.min(1, p) * 1.08);
  for (let i = 0; i <= m; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2;
    const rr2 = r * (1 + 0.05 * Math.sin(i * 0.4 + 1) + (i / steps) * 0.06);
    const px = x + Math.cos(a) * rr2;
    const py = y + Math.sin(a) * rr2 * 0.88;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/* ---------- textures ---------- */

let grainTile: Cv | null = null;
export function paperGrain(): Cv {
  if (grainTile) return grainTile;
  const c = makeCanvas(256, 256);
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let s = 12345;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 24) & 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function flower(ctx: Ctx, cx: number, cy: number, r: number, petal = C.red, heart = C.yellow) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.62, r * 0.34, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = petal;
    ctx.fill();
  }
  circle(ctx, 0, 0, r * 0.28, heart);
  ctx.restore();
}

/**
 * Patterned wallpaper in a clipped rect. The pattern is anchored to `ox`, so two panels can share
 * the same lattice and show one flower bisected by a crease.
 */
export function wallpaper(ctx: Ctx, x: number, y: number, w: number, h: number, ox = 0, oy = 0, base = C.sage, scale = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  const P = 96 * scale;
  const Q = 104 * scale;
  // faint stripes
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let sx = Math.floor((x - ox) / P) * P + ox - P; sx < x + w + P; sx += P) ctx.fillRect(sx + P * 0.46, y, P * 0.08, h);
  for (let row = Math.floor((y - oy) / Q) - 1; oy + row * Q < y + h + Q; row++) {
    const off = row % 2 ? P / 2 : 0;
    for (let col = Math.floor((x - ox - off) / P) - 1; ox + off + col * P < x + w + P; col++) {
      flower(ctx, ox + off + col * P, oy + row * Q, 14 * scale, "#b24a3c", "#f0d27a");
      // leaves
      ctx.fillStyle = C.sageDk;
      ctx.beginPath();
      ctx.ellipse(ox + off + col * P + 22 * scale, oy + row * Q + 30 * scale, 8 * scale, 4 * scale, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export { poses, drawFigure, CAST, HEIGHTS, setFigureClock, getFigureClock, drawBackFigure } from "./figure";
export type { FigureStyle, Pose, Joints, V2 } from "./figure";

/* ---------- props ---------- */

export function clipboard(ctx: Ctx, x: number, y: number, w: number, h: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fillRR(ctx, -w / 2, -h / 2, w, h, 4, "#9c6b3f", C.ink, 1.5);
  fillRR(ctx, -w / 2 + w * 0.08, -h / 2 + h * 0.1, w * 0.84, h * 0.84, 2, C.creamLt, "rgba(30,22,40,0.4)", 1);
  fillRR(ctx, -w * 0.18, -h / 2 - h * 0.03, w * 0.36, h * 0.07, 2, C.steelLt, C.ink, 1.2);
  for (let i = 0; i < 6; i++) line(ctx, -w * 0.34, -h * 0.28 + i * h * 0.1, w * 0.3 - (i % 3) * w * 0.08, -h * 0.28 + i * h * 0.1, "rgba(30,22,40,0.28)", 1.2);
  ctx.restore();
}

/** The cloth measuring tape: cream cloth, black numerals, frayed first inch repaired with yellow thread. */
export function clothTape(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, o: { width?: number; sag?: number; showFirstInch?: boolean; taut?: number; marks?: number; scroll?: number; thread?: boolean } = {}) {
  const wdt = o.width ?? 22;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  const sag = (o.sag ?? 0) * (1 - (o.taut ?? 0));
  const path = (off: number) => {
    ctx.beginPath();
    ctx.moveTo(0, off);
    ctx.quadraticCurveTo(len / 2, off + sag, len, off);
  };
  void path;
  // body (straight when taut)
  ctx.beginPath();
  ctx.moveTo(0, -wdt / 2);
  ctx.quadraticCurveTo(len / 2, -wdt / 2 + sag, len, -wdt / 2);
  ctx.lineTo(len, wdt / 2);
  ctx.quadraticCurveTo(len / 2, wdt / 2 + sag, 0, wdt / 2);
  ctx.closePath();
  ctx.fillStyle = "#efe2b8";
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // ticks + numerals (scroll shifts them along the tape so it can slide through fingers)
  const step = Math.max(14, wdt * 1.4);
  const scroll = o.scroll ?? 0;
  const n = Math.floor(len / step) + 1;
  const base = Math.floor(scroll / step);
  for (let i = 0; i <= n; i++) {
    const px = i * step - (scroll % step);
    if (px < 0 || px > len) continue;
    const f = px / len;
    const sy = sag * 2 * f * (1 - f);
    line(ctx, px, -wdt / 2 + sy, px, -wdt / 2 + sy + wdt * 0.32, C.ink, 1.1, "butt");
    line(ctx, px, wdt / 2 + sy, px, wdt / 2 + sy - wdt * 0.18, C.ink, 1, "butt");
    const num = (((i + base) % 48) + 48) % 48;
    if (num > 0 && wdt >= 14) txt(ctx, String(num), px + 2, sy + wdt * 0.24, { size: wdt * 0.42, font: MONO, weight: 700, color: C.ink });
  }
  if (o.thread) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len / 2, sag, len, 0);
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = Math.max(1.5, wdt * 0.1);
    ctx.stroke();
  }
  // frayed first inch repaired with yellow thread (the missing inch)
  if (o.showFirstInch !== false) {
    ctx.fillStyle = "#d9c892";
    ctx.fillRect(0, -wdt / 2, step * 0.95, wdt);
    ctx.setLineDash([3, 2]);
    for (let i = 0; i < 5; i++) line(ctx, 3 + i * (step * 0.2), -wdt / 2 + 1, 3 + i * (step * 0.2) + 5, wdt / 2 - 1, C.yellow, 2.2, "butt");
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, -wdt / 2);
    ctx.lineTo(-4, -wdt * 0.2);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-5, wdt * 0.25);
    ctx.lineTo(0, wdt / 2);
    ctx.closePath();
    ctx.fillStyle = "#cdbb85";
    ctx.fill();
    line(ctx, 0, -wdt / 2, 0, wdt / 2, C.yellow, 3);
  }
  ctx.restore();
}

export function recorderLamp(ctx: Ctx, x: number, y: number, t: number, on = true, r = 6) {
  const pulse = on ? 0.55 + 0.45 * Math.sin(t * 5) : 0;
  ctx.save();
  if (on) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255,60,40,${0.5 * pulse})`);
    g.addColorStop(1, "rgba(255,60,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  circle(ctx, x, y, r, on ? `rgba(255,${60 + 40 * pulse},${40},1)` : "#4a2020", "#2a1010", 1.2);
  ctx.restore();
}

export function stamp(ctx: Ctx, x: number, y: number, s: string, color = C.red, rot = -0.08, size = 28) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `800 ${size}px ${MONO}`;
  const w = ctx.measureText(s).width + 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -size * 0.8, w, size * 1.35);
  ctx.strokeRect(-w / 2 + 4, -size * 0.8 + 4, w - 8, size * 1.35 - 8);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(s, 0, size * 0.2);
  ctx.restore();
}

/** Light pool from above (ceiling fixture). */
export function lightPool(ctx: Ctx, x: number, y: number, r: number, a = 0.22, col = "255,240,200") {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** White dust that falls sideways near compressed frames. */
export function sidewaysDust(ctx: Ctx, t: number, x: number, y: number, w: number, h: number, dirX = 1, n = 40, a = 0.6) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const sp = 18 + (hash(i * 3.1) + 1) * 26;
    const px = x + ((((hash(i * 7.7) + 1) / 2) * w + t * sp * dirX) % w + w) % w;
    const py = y + ((hash(i * 5.3) + 1) / 2) * h + Math.sin(t * 1.3 + i) * 5;
    const r = 0.8 + (hash(i * 9.1) + 1) * 0.9;
    ctx.fillStyle = `rgba(255,252,240,${a * (0.35 + 0.5 * ((hash(i * 2.2) + 1) / 2))})`;
    ctx.fillRect(px, py, r * 2.4, r * 0.8);
  }
  ctx.restore();
}

export { MONO, SERIF };
