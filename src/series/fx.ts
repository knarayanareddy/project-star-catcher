import { RGB, TAU, clamp, hash, lerp, mix3, noise, rgba, smooth } from "../film/util";
import { PALS, Pal, glow } from "../film/look";
import { drawEye } from "../film/manta";
import { spaced } from "../film/scenes/common";

export const W = 1280;
export const H = 720;

// ------------------------------------------------------------------ palettes
const P = (o: Partial<Pal>): Pal => ({ ...PALS.calm, ...o });
export const SPAL: Record<string, Pal> = {
  deep: P({
    skyTop: [0, 4, 12], skyMid: [4, 22, 40], skyLow: [18, 70, 84], sea: [4, 20, 34], seaLow: [0, 4, 10],
    lit: [120, 210, 220], shade: [2, 8, 16], haze: [10, 44, 58], lamp: [255, 176, 80], moon: [190, 230, 240], accent: [130, 255, 240],
  }),
  spring: P({
    skyTop: [10, 14, 44], skyMid: [48, 44, 98], skyLow: [196, 130, 160], sea: [30, 56, 96], seaLow: [8, 14, 36],
    lit: [255, 200, 220], shade: [20, 16, 44], haze: [150, 100, 150], lamp: [255, 190, 150], moon: [255, 236, 240], accent: [255, 150, 200],
  }),
  summer: P({
    skyTop: [14, 40, 110], skyMid: [56, 112, 180], skyLow: [226, 178, 120], sea: [24, 96, 136], seaLow: [6, 30, 60],
    lit: [236, 222, 190], shade: [28, 44, 84], haze: [170, 150, 140], lamp: [255, 216, 140], moon: [255, 255, 236], accent: [255, 240, 170],
  }),
  autumn: P({
    skyTop: [24, 6, 16], skyMid: [96, 30, 30], skyLow: [236, 120, 50], sea: [60, 26, 36], seaLow: [18, 6, 12],
    lit: [255, 170, 100], shade: [30, 10, 16], haze: [170, 70, 50], lamp: [255, 170, 70], moon: [255, 210, 160], accent: [255, 140, 60],
  }),
  winter: P({
    skyTop: [6, 14, 36], skyMid: [24, 50, 90], skyLow: [150, 196, 230], sea: [60, 100, 140], seaLow: [14, 28, 50],
    lit: [226, 244, 255], shade: [14, 24, 48], haze: [150, 190, 226], lamp: [210, 240, 255], moon: [240, 250, 255], accent: [190, 240, 255],
  }),
  vision: P({
    skyTop: [0, 0, 0], skyMid: [10, 4, 30], skyLow: [60, 40, 110], sea: [8, 6, 30], seaLow: [0, 0, 6],
    lit: [200, 190, 255], shade: [4, 2, 16], haze: [50, 30, 100], lamp: [255, 255, 255], moon: [255, 255, 255], accent: [190, 170, 255],
  }),
  cosmos: P({
    skyTop: [2, 2, 18], skyMid: [20, 14, 70], skyLow: [110, 70, 170], sea: [12, 12, 60], seaLow: [2, 2, 18],
    lit: [200, 190, 255], shade: [6, 4, 28], haze: [70, 50, 140], lamp: [255, 216, 150], moon: [240, 236, 255], accent: [160, 230, 255],
  }),
  dawn: P({
    skyTop: [30, 40, 110], skyMid: [190, 120, 150], skyLow: [255, 214, 150], sea: [70, 90, 150], seaLow: [20, 28, 70],
    lit: [255, 236, 200], shade: [40, 36, 86], haze: [240, 180, 170], lamp: [255, 214, 130], moon: [255, 250, 240], accent: [255, 230, 170],
  }),
};

// -------------------------------------------------------------------- misc
export const spike = (t: number, ts: number, w = 0.12) => Math.exp(-Math.pow((t - ts) / w, 2));
export const rampStep = (t: number, ts: number) => (t >= ts ? 1 : 0);
export const fractf = (x: number) => x - Math.floor(x);

export function withCam(ctx: CanvasRenderingContext2D, cx: number, cy: number, zoom: number, roll: number, fn: () => void) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(roll);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

/** darkness with a hole of light */
export function darkness(ctx: CanvasRenderingContext2D, a: number, lights: { x: number; y: number; r: number }[] = []) {
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  // draw darkness into an offscreen mask-ish by painting with radial gradient of the primary light
  if (lights.length) {
    const l = lights[0];
    const g = ctx.createRadialGradient(l.x, l.y, l.r * 0.15, l.x, l.y, l.r);
    g.addColorStop(0, `rgba(0,2,8,${a * 0.15})`);
    g.addColorStop(1, `rgba(0,2,8,${a})`);
    ctx.fillStyle = g;
  } else ctx.fillStyle = `rgba(0,2,8,${a})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- the deep
export function deepGradient(ctx: CanvasRenderingContext2D, depth: number, tint: RGB = [0, 0, 0]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const top = mix3([20, 96, 120], tint, clamp(depth * 1.1));
  const mid = mix3([8, 52, 82], tint, clamp(depth * 1.05));
  const low = mix3([2, 18, 36], tint, clamp(depth * 0.95));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(top));
  g.addColorStop(0.5, rgba(mid));
  g.addColorStop(1, rgba(low));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** mirror ceiling: what you see above the surface from below */
export function drawSurface(
  ctx: CanvasRenderingContext2D, t: number, y: number,
  sky?: (c: CanvasRenderingContext2D, y: number) => void, glowK = 1,
) {
  if (y < -80) return;
  const yy = Math.min(y, H + 40);
  if (sky) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, Math.max(0, yy));
    ctx.clip();
    sky(ctx, yy);
    ctx.restore();
  }
  // the shimmering mirror line
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0, yy, 0, yy + 190);
  g.addColorStop(0, `rgba(190,245,255,${0.55 * glowK})`);
  g.addColorStop(1, "rgba(60,160,200,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, yy);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, yy + Math.sin(x * 0.02 + t * 1.4) * 5 + Math.sin(x * 0.07 - t * 2.3) * 2.5);
  ctx.lineTo(W, yy + 190);
  ctx.lineTo(0, yy + 190);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.9 * glowK})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const wy = yy + Math.sin(x * 0.02 + t * 1.4) * 5 + Math.sin(x * 0.07 - t * 2.3) * 2.5;
    x ? ctx.lineTo(x, wy) : ctx.moveTo(x, wy);
  }
  ctx.stroke();
  ctx.restore();
}

export function godRays(ctx: CanvasRenderingContext2D, t: number, k: number, top = 0, col: RGB = [150, 235, 255]) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 11; i++) {
    const x0 = hash(i * 5.3) * 1500 - 120 + Math.sin(t * 0.3 + i) * 40;
    const w = 40 + hash(i + 2) * 120;
    const slant = 260 + hash(i + 9) * 160;
    const g = ctx.createLinearGradient(x0, top, x0 + slant * 0.5, top + 620);
    const a = k * (0.07 + hash(i + 4) * 0.09) * (0.65 + 0.35 * Math.sin(t * 0.8 + i * 2));
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0 + w, top);
    ctx.lineTo(x0 + w + slant, top + 780);
    ctx.lineTo(x0 + slant * 0.55, top + 780);
    ctx.fill();
  }
  ctx.restore();
}

/** marine snow with parallax; camera in px */
export function marineSnow(ctx: CanvasRenderingContext2D, t: number, camX: number, camY: number, k = 1, col: RGB = [200, 240, 255], n = 130) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const f = 0.35 + hash(i * 1.7) * 1.5;
    const bx = hash(i * 3.1) * (W + 300);
    const by = hash(i * 5.9) * (H + 300);
    const x = ((((bx - camX * f + Math.sin(t * 0.4 + i) * 12) % (W + 300)) + (W + 300)) % (W + 300)) - 150;
    const y = ((((by - camY * f - t * (4 + f * 5)) % (H + 300)) + (H + 300)) % (H + 300)) - 150;
    const r = 0.8 + f * 1.1;
    ctx.fillStyle = rgba(col, k * (0.12 + 0.28 * hash(i + 8)) * (0.6 + 0.4 * Math.sin(t * 2 + i)));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** the drowned pillars' roots, in parallax layers. */
export function drawRoots(
  ctx: CanvasRenderingContext2D, _t: number, camX: number, camY: number,
  o: { layers?: number; dark?: number; col?: RGB; lit?: RGB; litA?: number; spacing?: number },
) {
  const layers = o.layers ?? 4;
  const col = o.col ?? [6, 26, 40];
  const lit = o.lit ?? [90, 170, 190];
  for (let l = 0; l < layers; l++) {
    const p = 0.22 + l * (0.78 / Math.max(1, layers - 1));
    const sp = (o.spacing ?? 360) * (0.5 + p * 0.7);
    const i0 = Math.floor((camX * p - 800) / sp);
    const i1 = Math.ceil((camX * p + 800) / sp);
    const d = (o.dark ?? 0) * (1 - p * 0.55) + (1 - p) * 0.35;
    const c = mix3(col, [0, 2, 6], clamp(d));
    for (let i = i0; i <= i1; i++) {
      if (hash(i * 3.3 + l * 17) < 0.28) continue;
      const wx = i * sp + (hash(i + l * 9) - 0.5) * sp * 0.6;
      const sx = wx - camX * p + W / 2;
      const w = (70 + hash(i * 7 + l) * 90) * (0.45 + p * 0.9);
      const g = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
      g.addColorStop(0, rgba(mix3(c, lit, 0.0)));
      g.addColorStop(0.35, rgba(mix3(c, lit, (o.litA ?? 0.08) * p)));
      g.addColorStop(1, rgba(mix3(c, [0, 0, 4], 0.5)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.5, -10);
      for (let y = 0; y <= H + 40; y += 60) {
        ctx.lineTo(sx - w * (0.5 + 0.12 * noise(i * 3.1 + y * 0.01 + l)) - y * 0.04, y);
      }
      for (let y = H + 40; y >= 0; y -= 60) {
        ctx.lineTo(sx + w * (0.5 + 0.12 * noise(i * 5.1 + y * 0.012 + l)) + y * 0.04, y);
      }
      ctx.closePath();
      ctx.fill();
      // strata bands scroll with depth: sense of falling
      ctx.fillStyle = rgba(lit, 0.05 * p);
      const bandSp = 140;
      const off = ((camY * p) % bandSp + bandSp) % bandSp;
      for (let y = -off; y < H; y += bandSp) ctx.fillRect(sx - w * 0.5, y + hash(i + y) * 20, w, 3);
    }
  }
}

/** noisy ridge silhouettes along the sea floor. floorY is screen-y of the ridge base */
export function drawSeabed(ctx: CanvasRenderingContext2D, camX: number, floorY: number, o: { par?: number; amp?: number; col?: RGB; seed?: number; rim?: RGB; rimA?: number }) {
  const par = o.par ?? 1;
  const amp = o.amp ?? 60;
  const seed = o.seed ?? 0;
  ctx.fillStyle = rgba(o.col ?? [3, 12, 18]);
  ctx.beginPath();
  ctx.moveTo(-10, H + 20);
  const pts: [number, number][] = [];
  for (let x = -20; x <= W + 20; x += 20) {
    const wx = (x + camX * par) * 0.006 + seed;
    const y = floorY - amp * (0.5 + 0.5 * noise(wx)) - amp * 0.35 * noise(wx * 3.1 + 7);
    pts.push([x, y]);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 20, H + 20);
  ctx.fill();
  if (o.rim) {
    ctx.strokeStyle = rgba(o.rim, o.rimA ?? 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- creatures
export function drawLantern(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number,
  o: { col?: RGB; a?: number; ph?: number; eyes?: number; lit?: number; tilt?: number; look?: [number, number] } = {},
) {
  const col = o.col ?? [255, 176, 70];
  const lit = o.lit ?? 1;
  const a = o.a ?? 1;
  const ph = o.ph ?? 0;
  const fl = (0.82 + 0.18 * Math.sin(t * 7 + ph * 3)) * lit;
  glow(ctx, x, y, s * 3.6, col, 0.55 * fl * a);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((o.tilt ?? 0) + Math.sin(t * 1.3 + ph) * 0.07);
  ctx.globalAlpha = a;
  const w = s * 0.62;
  const h = s * 0.86;
  // cap + base
  ctx.fillStyle = "rgba(20,10,10,0.9)";
  ctx.fillRect(-w * 0.45, -h - 2 * (s / 20), w * 0.9, 4 * (s / 20) + 1);
  ctx.fillRect(-w * 0.45, h - 2 * (s / 20), w * 0.9, 4 * (s / 20) + 1);
  // paper body
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s);
  g.addColorStop(0, rgba(mix3(col, [255, 255, 255], 0.75 * fl)));
  g.addColorStop(0.5, rgba(mix3(col, [40, 10, 10], 1 - fl * 0.9)));
  g.addColorStop(1, rgba(mix3(col, [20, 4, 4], 0.7)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, -h);
  ctx.bezierCurveTo(-w * 1.25, -h * 0.45, -w * 1.25, h * 0.45, -w * 0.45, h);
  ctx.lineTo(w * 0.45, h);
  ctx.bezierCurveTo(w * 1.25, h * 0.45, w * 1.25, -h * 0.45, w * 0.45, -h);
  ctx.closePath();
  ctx.fill();
  // ribs
  ctx.strokeStyle = `rgba(60,16,8,${0.5 * fl})`;
  ctx.lineWidth = Math.max(0.6, s / 28);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, (i * h) / 2.6);
    ctx.quadraticCurveTo(0, (i * h) / 2.6 + h * 0.08, w * 0.45, (i * h) / 2.6);
    ctx.stroke();
  }
  // tassel
  ctx.strokeStyle = rgba(col, 0.8 * a);
  ctx.beginPath();
  ctx.moveTo(0, h + 2);
  ctx.lineTo(Math.sin(t * 2 + ph) * 2, h + s * 0.45);
  ctx.stroke();
  // eyes
  if ((o.eyes ?? 0) > 0.02) {
    const lk = o.look ?? [0, 0];
    drawEye(ctx, -w * 0.32, -h * 0.05, s * 0.2, o.eyes!, [255, 240, 200], lk, 0.2, 1);
    drawEye(ctx, w * 0.32, -h * 0.05, s * 0.2, o.eyes!, [255, 240, 200], lk, 0.2, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export interface HunterO {
  x: number; y: number; s: number; t: number; flip?: number; rot?: number;
  open?: number; lure?: RGB; alpha?: number; seed?: number; eye?: number;
}
/** an abyssal angler. facing +x when flip=1 */
export function drawHunter(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, opts: Partial<HunterO> = {}) {
  const o: HunterO = { x, y, s, t, ...opts };
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  const lure = o.lure ?? [140, 255, 235];
  const open = o.open ?? 0.3;
  const sd = o.seed ?? 0;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(o.s * (o.flip ?? 1), o.s);
  ctx.globalAlpha = a;
  const sway = Math.sin(o.t * 2 + sd) * 0.05;
  // tail
  ctx.fillStyle = "rgba(3,8,16,1)";
  ctx.beginPath();
  ctx.moveTo(-0.8, 0);
  ctx.quadraticCurveTo(-1.35, -0.4 + sway * 3, -1.9, -0.55 + sway * 5);
  ctx.quadraticCurveTo(-1.55, 0.02, -1.9, 0.6 + sway * 5);
  ctx.quadraticCurveTo(-1.3, 0.4 + sway * 3, -0.8, 0.2);
  ctx.fill();
  // lower jaw (hinged)
  ctx.save();
  ctx.translate(-0.15, 0.18);
  ctx.rotate(open * 0.6);
  ctx.fillStyle = "rgba(2,5,10,1)";
  ctx.beginPath();
  ctx.moveTo(-0.5, 0);
  ctx.quadraticCurveTo(0.2, 0.62, 1.15, 0.08);
  ctx.lineTo(1.12, -0.02);
  ctx.lineTo(-0.5, -0.05);
  ctx.fill();
  ctx.fillStyle = rgba(mix3(lure, [255, 255, 255], 0.6), 0.95 * a);
  for (let i = 0; i < 7; i++) {
    const x = 0.1 + i * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, 0.0);
    ctx.lineTo(x + 0.045, -0.15 - hash(i + sd) * 0.05);
    ctx.lineTo(x + 0.09, 0.0);
    ctx.fill();
  }
  ctx.restore();
  // maw interior
  if (open > 0.05) {
    const mg = ctx.createRadialGradient(0.6, 0.15, 0, 0.6, 0.15, 0.7);
    mg.addColorStop(0, rgba(mix3(lure, [255, 255, 255], 0.2), 0.7 * open));
    mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(0.55, 0.16, 0.55, 0.22 * open + 0.02, 0.1, 0, TAU);
    ctx.fill();
  }
  // skull / upper body
  const bg = ctx.createRadialGradient(0.2, -0.35, 0.05, 0, 0, 1.1);
  bg.addColorStop(0, rgba(mix3([12, 28, 40], lure, 0.18)));
  bg.addColorStop(1, "rgba(2,5,10,1)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-0.9, 0.05);
  ctx.bezierCurveTo(-0.8, -0.75, 0.3, -0.85, 1.15, -0.02);
  ctx.lineTo(0.1, 0.16);
  ctx.bezierCurveTo(-0.3, 0.28, -0.7, 0.3, -0.9, 0.05);
  ctx.fill();
  // upper teeth
  ctx.fillStyle = rgba(mix3(lure, [255, 255, 255], 0.6), 0.95 * a);
  for (let i = 0; i < 8; i++) {
    const x = 0.05 + i * 0.14;
    ctx.beginPath();
    ctx.moveTo(x, 0.1 - i * 0.012);
    ctx.lineTo(x + 0.045, 0.26 + hash(i * 2 + sd) * 0.06);
    ctx.lineTo(x + 0.09, 0.1 - i * 0.012);
    ctx.fill();
  }
  // stalk + lure
  const lx = 1.0 + Math.sin(o.t * 1.6 + sd) * 0.08;
  const ly = -1.05 + Math.sin(o.t * 2.1 + sd) * 0.06;
  ctx.strokeStyle = "rgba(4,10,18,1)";
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(0.1, -0.62);
  ctx.quadraticCurveTo(0.45, -1.4, lx, ly);
  ctx.stroke();
  // eye
  drawEye(ctx, 0.52, -0.3, 0.1, o.eye ?? 1, mix3(lure, [255, 255, 255], 0.3), [0.2, 0], 0.1, 1);
  glow(ctx, lx, ly, 0.5, lure, 0.85 * a * (0.7 + 0.3 * Math.sin(o.t * 5 + sd)));
  glow(ctx, lx, ly, 0.13, [255, 255, 255], a);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ props
export function drawSlab(
  ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number, t: number,
  o: { alpha?: number; rim?: RGB; rimA?: number; refl?: number; sheen?: number } = {},
) {
  const a = o.alpha ?? 1;
  const rim = o.rim ?? [190, 210, 255];
  ctx.save();
  ctx.globalAlpha = a;
  // reflection
  if ((o.refl ?? 0) > 0) {
    ctx.save();
    ctx.translate(0, baseY * 2);
    ctx.scale(1, -1);
    const rg = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, `rgba(0,0,0,${0.7 * o.refl!})`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - w / 2, baseY - h * 0.7, w, h * 0.7);
    ctx.restore();
  }
  // body: pure black, slightly perspective
  ctx.fillStyle = "#000";
  ctx.fillRect(x - w / 2, baseY - h, w, h);
  // faint polished sheen sweeping
  const sh = o.sheen ?? 0.1;
  const sx = ((t * 0.12) % 1.6) - 0.3;
  const g = ctx.createLinearGradient(x - w / 2 + w * sx, baseY - h, x - w / 2 + w * (sx + 0.25), baseY);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, `rgba(180,200,255,${sh})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, baseY - h, w, h);
  // rim light, hairline
  ctx.strokeStyle = rgba(rim, o.rimA ?? 0.5);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x - w / 2 + 0.5, baseY - h + 0.5, w - 1, h - 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** inside the old machine. an empty seat, a console, and the top */
export function drawTop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, wob = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(t * 3.1) * wob * 0.35);
  const g = ctx.createLinearGradient(-30, 0, 30, 0);
  g.addColorStop(0, "#5a5f78");
  g.addColorStop(0.45, "#d8dcf2");
  g.addColorStop(1, "#30344a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-30, -26);
  ctx.lineTo(30, -26);
  ctx.lineTo(0, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9aa0c0";
  ctx.beginPath();
  ctx.ellipse(0, -26, 30, 8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e9ecff";
  ctx.fillRect(-3, -56, 6, 30);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const ph = t * 24 + i * 1.6;
    const xx = Math.cos(ph) * 18;
    if (Math.sin(ph) > 0) {
      ctx.beginPath();
      ctx.moveTo(xx, -20 + i * 5);
      ctx.lineTo(xx * 0.8, -14 + i * 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawCockpit(
  ctx: CanvasRenderingContext2D, t: number,
  o: { win: (c: CanvasRenderingContext2D) => void; pilot: number; heart: number; topWob: number; glowCol?: RGB; seatLamp?: RGB },
) {
  const gc = o.glowCol ?? [255, 176, 70];
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, W, H);
  // porthole
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(640, 270, 330, 205, 0, 0, TAU);
  ctx.clip();
  o.win(ctx);
  ctx.restore();
  ctx.strokeStyle = "rgba(90,96,130,0.9)";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.ellipse(640, 270, 338, 212, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,24,40,1)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(640, 270, 348, 222, 0, 0, TAU);
  ctx.stroke();
  // rivets
  for (let i = 0; i < 28; i++) {
    const an = (i / 28) * TAU;
    ctx.fillStyle = "rgba(150,156,190,0.8)";
    ctx.beginPath();
    ctx.arc(640 + Math.cos(an) * 357, 270 + Math.sin(an) * 231, 2.6, 0, TAU);
    ctx.fill();
  }
  // console
  const cg = ctx.createLinearGradient(0, 520, 0, H);
  cg.addColorStop(0, "#161a2c");
  cg.addColorStop(1, "#05060c");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.quadraticCurveTo(640, 480, W, 560);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  // dials pulse with the heart
  for (let i = 0; i < 5; i++) {
    const x = 330 + i * 80;
    const y = 590 + Math.abs(i - 2) * 6;
    ctx.fillStyle = "#07080f";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,128,170,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    const an = -2.2 + (0.3 + 0.6 * hash(i * 3.3)) * 3.4 * (0.6 + 0.4 * o.heart);
    ctx.strokeStyle = rgba(gc, 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(an) * 18, y + Math.sin(an) * 18);
    ctx.stroke();
    glow(ctx, x, y, 34, gc, 0.12 + 0.2 * o.heart);
  }
  // the top, on its little mount
  ctx.fillStyle = "#0c0e1a";
  ctx.beginPath();
  ctx.ellipse(920, 590, 70, 14, 0, 0, TAU);
  ctx.fill();
  drawTop(ctx, 920, 548, 1.0, t, o.topWob);
  // the seat
  ctx.fillStyle = "#0b0d18";
  ctx.beginPath();
  ctx.moveTo(210, H);
  ctx.quadraticCurveTo(200, 470, 290, 440);
  ctx.quadraticCurveTo(380, 440, 400, 520);
  ctx.lineTo(430, H);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,96,130,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // the pilot
  if (o.pilot > 0.01) {
    const c = o.seatLamp ?? gc;
    const px = 305, py = 500 + Math.sin(t * 1.4) * 3 - o.pilot * 0;
    glow(ctx, px, py, 160 * o.pilot, c, 0.5 * o.pilot * (0.8 + 0.2 * Math.sin(t * 6)));
    drawLantern(ctx, px, py, 28 * Math.min(1, o.pilot * 1.4), t, { col: c, a: o.pilot, eyes: 1, look: [0.6, -0.4] });
  }
}

export function speedLines(ctx: CanvasRenderingContext2D, t: number, k: number, ang = 0, col: RGB = [200, 240, 255], cx = W / 2, cy = H / 2) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    const a = ang + (hash(i * 2.1) - 0.5) * 0.35;
    const r0 = 180 + ((hash(i * 4.7) * 900 + t * (900 + hash(i) * 900)) % 1000);
    const len = 80 + hash(i + 3) * 220;
    const ox = (hash(i * 9.1) - 0.5) * 1200;
    const oy = (hash(i * 6.3) - 0.5) * 720;
    const x = cx + ox + Math.cos(a) * r0 * 0.0;
    const y = cy + oy;
    const dx = Math.cos(a), dy = Math.sin(a);
    const px = x - dx * (r0 - 600);
    const py = y - dy * (r0 - 600);
    ctx.strokeStyle = rgba(col, k * (0.1 + hash(i + 1) * 0.3));
    ctx.lineWidth = 1 + hash(i + 6) * 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - dx * len, py - dy * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: RGB, a: number, lw = 2, sy = 1) {
  if (a <= 0.01 || Math.abs(r) <= 0.01) return;
  const rx = Math.max(0.1, Math.abs(r));
  const ry = Math.max(0.1, Math.abs(r * sy));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function starfield(ctx: CanvasRenderingContext2D, t: number, k: number, o: { n?: number; seed?: number; ox?: number; oy?: number; twinkle?: number; col?: RGB; maxY?: number } = {}) {
  if (k <= 0.01) return;
  const n = o.n ?? 160;
  const s = o.seed ?? 0;
  const col = o.col ?? [235, 240, 255];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const x = (hash(i * 3.7 + s) * (W + 200) + (o.ox ?? 0) + (W + 200) * 10) % (W + 200) - 100;
    const y = hash(i * 7.9 + s) * (o.maxY ?? H);
    const tw = 0.6 + 0.4 * Math.sin(t * (1 + hash(i) * 3) + i) * (o.twinkle ?? 1);
    const r = 0.6 + hash(i + 5) * 1.4;
    ctx.fillStyle = rgba(col, k * (0.3 + 0.7 * hash(i + 2)) * tw);
    ctx.fillRect(x + (o.oy ?? 0) * 0, y, r, r);
    if (hash(i + 11) > 0.93) glow(ctx, x, y, 7, col, 0.5 * k * tw);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ type
export function drawEpTitle(ctx: CanvasRenderingContext2D, t: number, t0: number, t1: number, pal: Pal, roman: string, title: string, y = 150) {
  if (t < t0 || t > t1) return;
  const k = t - t0;
  const out = 1 - smooth(t1 - 1.0, t1, t);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = `300 84px "Cormorant Garamond", "Iowan Old Style", Georgia, serif`;
  const jit = t > t1 - 0.8 ? (hash(Math.floor(t * 24)) - 0.5) * 10 : 0;
  for (const [dx, col, comp] of [
    [-3, "rgba(255,60,90,0.55)", "lighter"],
    [3, "rgba(60,200,255,0.55)", "lighter"],
    [0, rgba(mix3(pal.moon, [255, 255, 255], 0.5), 1), "source-over"],
  ] as [number, string, GlobalCompositeOperation][]) {
    ctx.globalCompositeOperation = comp;
    ctx.fillStyle = col;
    spaced(ctx, "STAR CATCHER", 640 + dx + jit, y, 22, (i) => smooth(i * 0.07, i * 0.07 + 0.9, k) * out * (dx === 0 ? 1 : 0.6 * (1 - smooth(1.0, 2.2, k) * 0.7)));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.font = `400 21px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = rgba(pal.lit, 1);
  ctx.globalAlpha = smooth(1.2, 2.2, k) * out * 0.9;
  spaced(ctx, `EPISODE ${roman}  ·  ${title.toUpperCase()}`, 640, y + 90, 9);
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgba(pal.moon, 1);
  ctx.globalAlpha = smooth(0.8, 2.2, k) * out * 0.5;
  const hw = 220 * smooth(0.8, 2.4, k);
  ctx.fillRect(640 - hw, y + 55, hw * 2, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** a bold chapter / location chip in the corner */
export function chip(ctx: CanvasRenderingContext2D, t: number, t0: number, t1: number, big: string, small = "", col: RGB = [255, 255, 255], x = 84, y = 596) {
  if (t < t0 || t > t1) return;
  const a = smooth(t0, t0 + 0.35, t) * (1 - smooth(t1 - 0.5, t1, t));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = rgba(col, 0.9);
  ctx.fillRect(x - 14, y - 38, 2, small ? 62 : 44);
  ctx.font = `300 40px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = rgba(mix3(col, [255, 255, 255], 0.5), 1);
  ctx.fillText(big, x + (1 - smooth(t0, t0 + 0.5, t)) * -24, y);
  if (small) {
    ctx.font = `400 13px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = rgba(col, 0.75);
    ctx.fillText(small.toUpperCase().split("").join(" "), x, y + 20);
  }
  ctx.restore();
}

export function hudLine(ctx: CanvasRenderingContext2D, text: string, a: number, x = 70, y = 640, col: RGB = [150, 255, 235]) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `500 14px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.fillStyle = rgba(col, 0.95);
  ctx.shadowColor = rgba(col, 0.8);
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** end-of-episode card */
export function drawToBeContinued(ctx: CanvasRenderingContext2D, t: number, t0: number, pal: Pal, label: string, sub: string) {
  if (t < t0) return;
  const k = t - t0;
  ctx.save();
  const bandG = ctx.createLinearGradient(0, 520, 0, 672);
  bandG.addColorStop(0, "rgba(0,0,6,0)");
  bandG.addColorStop(1, `rgba(0,0,6,${0.75 * smooth(0, 1, k)})`);
  ctx.fillStyle = bandG;
  ctx.fillRect(0, 520, W, 152);
  ctx.textBaseline = "middle";
  ctx.fillStyle = rgba(mix3(pal.moon, [255, 255, 255], 0.5));
  ctx.font = `300 52px "Cormorant Garamond", Georgia, serif`;
  ctx.globalAlpha = smooth(0, 1.2, k);
  const sx = k < 0.5 ? (Math.random() - 0.5) * 4 : 0;
  spaced(ctx, label, 640 + sx, 596, 22);
  ctx.font = `400 19px "Cormorant Garamond", Georgia, serif`;
  ctx.globalAlpha = smooth(1.2, 2.4, k) * 0.85;
  spaced(ctx, sub, 640, 644, 9);
  ctx.restore();
  ctx.globalAlpha = 1;
}

export const mixc = mix3;
export { lerp, clamp };
