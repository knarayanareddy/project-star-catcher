import { RGB, TAU, V2, clamp, hash, heart, lerp, mix3, rgba, rng, scale3, smooth } from "./util";
import { Pal, glow, glowSprite } from "./look";
import { MechPose, drawMech } from "./mech";
import { MantaOpts, drawManta, drawEye } from "./manta";

export const W = 1280;
export const H = 720;
export const HZ = 418;
export const BASE4 = HZ + 120;
export const SPIRE_X = 1010;
export const SPIRE_H = 3300;

// ------------------------------------------------------------------ state
export interface WorldState {
  t: number;
  pal: Pal;
  cam: { x: number; y: number; zoom: number; tilt: number };
  stars: number;
  starsOut: number;
  eyes: number;
  conste: number;
  cracks: number;
  aurora: number;
  moon: { x: number; y: number; r: number; alpha: number; eye: number; dil: number };
  reflEyes: number;
  plankton: number;
  wave: number;
  cloud: number;
  lantern: { level: number; reveal: number; breath: number; off: number; rise: number; lean: number; tx: number; ty: number };
  figures: number;
  collapse: number;
  mother: MantaOpts | null;
  beams: number;
  mech: MechPose | null;
  wake: number;
  ash: number;
  rain: number;
  runes: number;
  fog: number;
  behindMech?: (ctx: CanvasRenderingContext2D) => void;
  frontMech?: (ctx: CanvasRenderingContext2D) => void;
  skyFx?: (ctx: CanvasRenderingContext2D) => void;
}

export function makeWorld(t: number, pal: Pal): WorldState {
  return {
    t, pal,
    cam: { x: 0, y: 0, zoom: 1, tilt: 0 },
    stars: 1, starsOut: 0, eyes: 0, conste: 0, cracks: 0, aurora: 0,
    moon: { x: 880, y: 150, r: 92, alpha: 1, eye: 0, dil: 0.5 },
    reflEyes: 0, plankton: 0.6, wave: 0, cloud: 0,
    lantern: { level: 1, reveal: 1, breath: 0, off: 0, rise: 0, lean: 0, tx: 640, ty: -200 },
    figures: 0, collapse: -1, mother: null, beams: 0, mech: null, wake: 0, ash: 0, rain: 0, runes: 0, fog: 0.3,
  };
}

// ------------------------------------------------------------ static world
interface House { fy: number; ox: number; w: number; h: number; wins: number[]; ph: number; two: boolean }
interface Pillar {
  x: number; w: number; h: number; path: Path2D; houses: House[];
  strata: { y: number; dy: number; a: number }[];
  fall: number; dir: number; delay: number; spire?: boolean;
  runes?: { y: number; x: number; k: number }[];
}
interface Lantern { x: number; y: number; ph: number; order: number; hsh: number; sz: number }
interface Rope { a: V2; b: V2; sag: number }
interface Layer { par: number; sc: number; haze: number; base: number; pillars: Pillar[]; lanterns: Lantern[]; ropes: Rope[]; fg: boolean }

function buildPillar(r: () => number, x: number, w: number, h: number, sc: number, detail = 44): Pillar {
  const n = Math.max(6, Math.round(h / detail));
  const Lp: V2[] = [], Rp: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const half = (w / 2) * (1.14 - 0.34 * u);
    Lp.push([-half + (r() - 0.5) * w * 0.08, -h * u]);
    Rp.push([half + (r() - 0.5) * w * 0.08, -h * u]);
  }
  const path = new Path2D();
  path.moveTo(Lp[0][0] - w * 0.06, 6);
  Lp.forEach((p) => path.lineTo(p[0], p[1]));
  path.lineTo(Lp[n][0] * 0.6, -h - r() * 14 * sc);
  path.lineTo(Rp[n][0] * 0.3, -h - r() * 20 * sc);
  path.lineTo(Rp[n][0], -h);
  for (let i = n; i >= 0; i--) path.lineTo(Rp[i][0], Rp[i][1]);
  path.lineTo(Rp[0][0] + w * 0.06, 6);
  path.closePath();
  const houses: House[] = [];
  const nh = h > 300 * sc ? 1 + Math.floor(r() * 3) : Math.floor(r() * 2);
  for (let i = 0; i < nh; i++) {
    const hw = (26 + r() * 16) * sc;
    houses.push({
      fy: 0.2 + r() * 0.62, ox: (r() - 0.5) * w * 0.35, w: hw, h: hw * (0.6 + r() * 0.2),
      wins: [0.3, 0.7].filter(() => r() > 0.2), ph: r() * 10, two: r() > 0.6,
    });
  }
  const strata = Array.from({ length: Math.round(h / 26) }, () => ({ y: -r() * h, dy: (r() - 0.5) * 8, a: 0.05 + r() * 0.12 }));
  return { x, w, h, path, houses, strata, fall: 0, dir: r() > 0.5 ? 1 : -1, delay: r() * 2.2 };
}

const LSPEC = [
  { par: 0.1, sc: 0.28, haze: 0.8, gap: [90, 170], xr: [-1000, 2200] },
  { par: 0.22, sc: 0.42, haze: 0.6, gap: [120, 230], xr: [-1200, 2400] },
  { par: 0.4, sc: 0.6, haze: 0.42, gap: [200, 360], xr: [-1500, 2700] },
  { par: 0.65, sc: 0.8, haze: 0.24, gap: [330, 560], xr: [-1900, 3100] },
  { par: 1.0, sc: 1.0, haze: 0.07, gap: [0, 0], xr: [0, 0] },
  { par: 1.5, sc: 1.2, haze: 0, gap: [1300, 1900], xr: [-2800, 4300] },
];

function buildLayers(): Layer[] {
  const r = rng(7);
  const layers: Layer[] = [];
  LSPEC.forEach((s, li) => {
    const base = HZ + 120 * s.par;
    const pillars: Pillar[] = [];
    if (li === 4) {
      const xs = [-1900, -1450, -1000, -620, -240, 150, 1380, 1800, 2250, 2700];
      xs.forEach((x) => pillars.push(buildPillar(r, x, (62 + r() * 40) * s.sc, (340 + r() * 380) * s.sc, s.sc)));
      const sp = buildPillar(r, SPIRE_X, 150, SPIRE_H, 1, 38);
      sp.spire = true;
      sp.houses = [
        { fy: 0.012, ox: -10, w: 36, h: 24, wins: [0.35, 0.7], ph: 1, two: true },
        { fy: 0.05, ox: 18, w: 30, h: 20, wins: [0.5], ph: 2, two: false },
        { fy: 0.11, ox: -20, w: 28, h: 19, wins: [0.5], ph: 4, two: false },
      ];
      sp.runes = Array.from({ length: 22 }, (_, i) => ({ y: -(240 + i * 138), x: (r() - 0.5) * 70, k: Math.floor(r() * 4) }));
      sp.strata = Array.from({ length: 160 }, () => ({ y: -r() * SPIRE_H, dy: (r() - 0.5) * 8, a: 0.05 + r() * 0.12 }));
      pillars.push(sp);
      pillars.sort((a, b) => a.x - b.x);
    } else {
      let x = s.xr[0];
      while (x < s.xr[1]) {
        const w = (40 + r() * 40) * s.sc * (li === 5 ? 1.1 : 1);
        const h = (300 + r() * 480) * s.sc * (li === 5 ? 1.8 : 1);
        pillars.push(buildPillar(r, x, w, h, s.sc, li < 2 ? 70 : 44));
        x += s.gap[0] + r() * (s.gap[1] - s.gap[0]);
      }
    }
    const fg = li === 5;
    if (li === 3 || li === 4) pillars.forEach((p) => { if (!p.spire && Math.abs(p.x - 640) < 1500) p.fall = 1; });
    // ropes + lanterns
    const ropes: Rope[] = [];
    const lanterns: Lantern[] = [];
    for (let i = 0; i < pillars.length - 1; i++) {
      const a = pillars[i], b = pillars[i + 1];
      const gap = b.x - a.x;
      if (gap > 980 * s.sc || (fg && r() > 0.5)) continue;
      const ya = base - a.h * (0.3 + r() * 0.35);
      const yb = base - b.h * (0.3 + r() * 0.35);
      const A: V2 = [a.x + a.w * 0.4, ya], B: V2 = [b.x - b.w * 0.4, yb];
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const sag = len * (0.07 + r() * 0.07);
      ropes.push({ a: A, b: B, sag });
      const n = Math.max(2, Math.round(len / (30 * s.sc)));
      for (let k = 1; k < n; k++) {
        const u = k / n;
        const x = lerp(A[0], B[0], u);
        const y = lerp(A[1], B[1], u) + Math.sin(Math.PI * u) * sag + 6 * s.sc;
        const order = clamp(Math.hypot(x - 560, (y - 380) * 0.6) / 1700);
        lanterns.push({ x, y, ph: r() * 10, order, hsh: r(), sz: (0.8 + r() * 0.5) * s.sc });
      }
    }
    // lanterns hanging by houses
    pillars.forEach((p) => {
      p.houses.forEach((h) => {
        if (r() > 0.55) {
          const x = p.x + h.ox + h.w * 0.62;
          const y = base - p.h * h.fy - h.h * 0.55;
          lanterns.push({ x, y, ph: r() * 10, order: clamp(Math.hypot(x - 560, (y - 380) * 0.6) / 1700), hsh: r(), sz: s.sc });
        }
      });
    });
    layers.push({ par: s.par, sc: s.sc, haze: s.haze, base, pillars, lanterns, ropes, fg });
  });
  return layers;
}
const LAYERS = buildLayers();
/** times (s) at which toppled pillars hit the water, for the score */
export const IMPACTS: number[] = [3, 4]
  .flatMap((li) => LAYERS[li].pillars.filter((p) => p.fall && Math.abs(p.x - 640) < 800).map((p) => 146 + p.delay + 3.1))
  .sort((a, b) => a - b);

// stars
interface Star { x: number; y: number; r: number; ph: number; ord: number; ord2: number }
const STARS: Star[] = (() => {
  const r = rng(99);
  return Array.from({ length: 460 }, () => ({
    x: -500 + r() * 2300, y: -1000 + Math.pow(r(), 0.8) * 1400, r: 0.5 + Math.pow(r(), 3) * 2, ph: r() * 10, ord: r(), ord2: r(),
  }));
})();
const CONST: number[][] = (() => {
  const bright = STARS.map((s, i) => ({ s, i })).filter((o) => o.s.r > 1.1 && o.s.y > -380 && o.s.y < 330);
  const r = rng(5);
  const out: number[][] = [];
  const used = new Set<number>();
  for (let c = 0; c < 14 && bright.length > 6; c++) {
    const a = bright[Math.floor(r() * bright.length)];
    if (used.has(a.i)) continue;
    const near = bright
      .filter((o) => o.i !== a.i && !used.has(o.i))
      .map((o) => ({ o, d: Math.hypot(o.s.x - a.s.x, o.s.y - a.s.y) }))
      .filter((o) => o.d < 220)
      .sort((x, y) => x.d - y.d)
      .slice(0, 4 + Math.floor(r() * 2));
    if (near.length < 3) continue;
    const chain = [a.i, ...near.map((n) => n.o.i)];
    chain.forEach((i) => used.add(i));
    out.push(chain);
  }
  return out;
})();
const CRATERS = Array.from({ length: 22 }, (_, i) => ({ a: hash(i) * TAU, d: Math.sqrt(hash(i + 50)) * 0.8, r: 0.04 + hash(i + 90) * 0.13 }));
const CRACKS: V2[][] = (() => {
  const r = rng(31);
  const lines: V2[][] = [];
  const branch = (x: number, y: number, a: number, len: number, depth: number) => {
    const pts: V2[] = [[x, y]];
    const n = Math.round(len / 28);
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 28;
      y += Math.sin(a) * 28;
      pts.push([x, y]);
      if (depth < 3 && r() > 0.8) branch(x, y, a + (r() - 0.5) * 1.8, len * 0.5, depth + 1);
    }
    lines.push(pts);
  };
  for (let i = 0; i < 9; i++) branch(720, -60, (i / 9) * TAU + r() * 0.3, 500 + r() * 400, 0);
  return lines;
})();
const SEA_GLINTS = Array.from({ length: 130 }, (_, i) => ({ u: hash(i * 1.3), v: hash(i * 2.9), w: 8 + hash(i + 3) * 34, ph: hash(i + 7) * 10 }));
const PLANK = Array.from({ length: 160 }, (_, i) => ({ x: -600 + hash(i * 4.1) * 2500, y: hash(i * 8.3), r: 1.5 + hash(i + 2) * 3.5, ph: hash(i + 1) * 10 }));
const CLOUDS = Array.from({ length: 70 }, (_, i) => ({ x: -800 + hash(i * 5.3) * 3200, y: -300 - hash(i * 2.2) * 2900, r: 120 + hash(i + 8) * 260, a: 0.4 + hash(i + 4) * 0.6 }));
const PUFF = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,0.5)");
  gr.addColorStop(0.5, "rgba(255,255,255,0.18)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return c;
})();

// -------------------------------------------------------------- helpers
function camera(ctx: CanvasRenderingContext2D, ws: WorldState, par: number, parY = par) {
  const c = ws.cam;
  ctx.translate(W / 2, H / 2);
  ctx.scale(c.zoom, c.zoom);
  ctx.translate(-W / 2 - c.x * par, -H / 2 + c.y * parY + c.tilt);
}

function drawSky(ctx: CanvasRenderingContext2D, ws: WorldState) {
  const { pal, t } = ws;
  ctx.save();
  camera(ctx, ws, 0.04, 0.08);
  const sg = ctx.createLinearGradient(0, -1600, 0, HZ);
  sg.addColorStop(0, rgba(pal.skyTop));
  sg.addColorStop(0.55, rgba(pal.skyMid));
  sg.addColorStop(1, rgba(pal.skyLow));
  ctx.fillStyle = sg;
  ctx.fillRect(-3000, -5000, 8000, 5000 + HZ + 2);
  // sea
  const seaTop = mix3(pal.sea, pal.skyLow, 0.45);
  const wg = ctx.createLinearGradient(0, HZ, 0, HZ + 460);
  wg.addColorStop(0, rgba(seaTop));
  wg.addColorStop(0.25, rgba(pal.sea));
  wg.addColorStop(1, rgba(pal.seaLow));
  ctx.fillStyle = wg;
  ctx.fillRect(-3000, HZ, 8000, 3000);

  // aurora
  if (ws.aurora > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 3; k++) {
      const by = 40 + k * 60 - 100;
      const col = mix3(pal.accent, pal.lit, k / 3);
      const ag = ctx.createLinearGradient(0, by - 80, 0, by + 200);
      ag.addColorStop(0, rgba(col, 0));
      ag.addColorStop(0.35, rgba(col, 0.2 * ws.aurora));
      ag.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = ag;
      ctx.beginPath();
      for (let x = -300; x <= 1600; x += 40) {
        const y = by + Math.sin(x * 0.004 + t * 0.25 + k * 2) * 60 + Math.sin(x * 0.011 - t * 0.4 + k) * 24;
        x === -300 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let x = 1600; x >= -300; x -= 40) {
        const y = by + 150 + Math.sin(x * 0.006 - t * 0.3 + k) * 50;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // stars
  const starCol: RGB = mix3([210, 220, 255], pal.lit, 0.3);
  if (ws.stars > 0.01) {
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i];
      const out = smooth(s.ord, s.ord + 0.06, ws.starsOut);
      if (out >= 1) continue;
      const tw = 0.65 + 0.35 * Math.sin(t * (1.2 + s.ph * 0.2) + s.ph * 5);
      const a = ws.stars * (1 - out) * tw;
      if (ws.eyes > 0.01 && s.ord2 < ws.eyes && s.r > 0.55) {
        const er = 4 + s.r * 5;
        const bl = Math.sin(t * (0.5 + (s.ph % 1) * 0.6) + s.ph * 3);
        const open = bl > 0.97 ? 0.1 : smooth(s.ord2, s.ord2 + 0.1, ws.eyes);
        glow(ctx, s.x, s.y, er * 3, starCol, 0.35 * a * open);
        drawEye(ctx, s.x, s.y, er, open, starCol, [(640 - s.x) / 900, (520 - s.y) / 600], 0.2, clamp(a * 1.3));
      } else {
        glow(ctx, s.x, s.y, 2 + s.r * 3.5, starCol, a * (0.45 + s.r * 0.3));
      }
    }
    if (ws.conste > 0.01) {
      ctx.strokeStyle = rgba(pal.lit, 0.22 * ws.conste);
      ctx.lineWidth = 1;
      for (const ch of CONST) {
        ctx.beginPath();
        ch.forEach((i, k) => (k ? ctx.lineTo(STARS[i].x, STARS[i].y) : ctx.moveTo(STARS[i].x, STARS[i].y)));
        ctx.stroke();
      }
    }
  }

  // cracks
  if (ws.cracks > 0.005) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    for (let pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass === 0 ? 7 : 1.6;
      ctx.strokeStyle = pass === 0 ? rgba(pal.accent, 0.12 * ws.cracks) : rgba([255, 255, 255], 0.9 * ws.cracks);
      for (const l of CRACKS) {
        const n = Math.max(2, Math.floor(l.length * clamp(ws.cracks * 1.3)));
        ctx.beginPath();
        for (let i = 0; i < n; i++) i ? ctx.lineTo(l[i][0], l[i][1]) : ctx.moveTo(l[i][0], l[i][1]);
        ctx.stroke();
      }
    }
    glow(ctx, 720, -60, 240 * ws.cracks, pal.accent, 0.5 * ws.cracks);
    ctx.globalCompositeOperation = "source-over";
  }

  // moon
  const m = ws.moon;
  if (m.alpha > 0.01) {
    glow(ctx, m.x, m.y, m.r * 4.2, pal.moon, 0.32 * m.alpha);
    glow(ctx, m.x, m.y, m.r * 2, pal.moon, 0.35 * m.alpha);
    ctx.save();
    ctx.globalAlpha = m.alpha;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, TAU);
    const mg = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
    mg.addColorStop(0, rgba(mix3(pal.moon, [255, 255, 255], 0.6)));
    mg.addColorStop(0.7, rgba(pal.moon));
    mg.addColorStop(1, rgba(scale3(pal.moon, 0.72)));
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.clip();
    for (const c of CRATERS) {
      const cx = m.x + Math.cos(c.a) * c.d * m.r;
      const cy = m.y + Math.sin(c.a) * c.d * m.r;
      ctx.beginPath();
      ctx.arc(cx, cy, c.r * m.r, 0, TAU);
      ctx.fillStyle = rgba(scale3(pal.moon, 0.62), 0.16);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + c.r * m.r * 0.15, cy + c.r * m.r * 0.15, c.r * m.r * 0.85, 0, TAU);
      ctx.fillStyle = rgba(mix3(pal.moon, [255, 255, 255], 0.5), 0.12);
      ctx.fill();
    }
    if (m.eye > 0.01) {
      // the moon opens its eye
      const hh = m.r * 0.92 * smooth(0, 1, m.eye);
      ctx.beginPath();
      ctx.moveTo(m.x - m.r * 1.05, m.y);
      ctx.quadraticCurveTo(m.x, m.y - hh * 2, m.x + m.r * 1.05, m.y);
      ctx.quadraticCurveTo(m.x, m.y + hh * 2, m.x - m.r * 1.05, m.y);
      ctx.closePath();
      ctx.fillStyle = "#05060e";
      ctx.fill();
      ctx.save();
      ctx.clip();
      const ir = m.r * 0.78;
      const g2 = ctx.createRadialGradient(m.x, m.y, ir * 0.1, m.x, m.y, ir);
      g2.addColorStop(0, rgba(mix3(pal.accent, [255, 255, 255], 0.7)));
      g2.addColorStop(0.35, rgba(pal.accent));
      g2.addColorStop(1, rgba(scale3(pal.accent, 0.15)));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, ir, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba([255, 255, 255], 0.18);
      ctx.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(a) * ir * 0.35, m.y + Math.sin(a) * ir * 0.35);
        ctx.lineTo(m.x + Math.cos(a) * ir, m.y + Math.sin(a) * ir);
        ctx.stroke();
      }
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, Math.max(1.5, Math.abs(ir * 0.16 * (1 - m.dil * 0.7))), Math.max(0.1, Math.abs(ir * 0.9)), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // mother (sky plane)
  if (ws.mother) drawManta(ctx, ws.mother);
  if (ws.skyFx) ws.skyFx(ctx);

  // wave wall
  if (ws.wave > 0.005) {
    const top = (x: number) => HZ - ws.wave * 330 * (0.88 + 0.12 * Math.sin(x * 0.006 + t * 0.3) + 0.05 * Math.sin(x * 0.02 - t * 0.5));
    const wg2 = ctx.createLinearGradient(0, HZ - 340 * ws.wave, 0, HZ + 20);
    wg2.addColorStop(0, rgba(mix3(pal.skyLow, pal.lit, 0.4)));
    wg2.addColorStop(0.08, rgba(mix3(pal.sea, pal.lit, 0.2)));
    wg2.addColorStop(1, rgba(scale3(pal.seaLow, 0.8)));
    ctx.fillStyle = wg2;
    ctx.beginPath();
    ctx.moveTo(-700, HZ + 30);
    for (let x = -700; x <= 2000; x += 20) ctx.lineTo(x, top(x));
    ctx.lineTo(2000, HZ + 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    for (let x = -700; x <= 2000; x += 20) x === -700 ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x));
    ctx.strokeStyle = rgba(pal.moon, 0.7);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = rgba(pal.lit, 0.07);
    ctx.lineWidth = 2;
    for (let x = -700; x < 2000; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, top(x) + 8);
      ctx.lineTo(x + Math.sin(x) * 6, HZ);
      ctx.stroke();
    }
  }
  ctx.restore();

  // moon path on the sea
  ctx.save();
  camera(ctx, ws, 0.6, 0.1);
  if (m.alpha > 0.05) {
    ctx.globalCompositeOperation = "lighter";
    for (const g of SEA_GLINTS) {
      const y = HZ + 6 + Math.pow(g.v, 1.6) * 300;
      const spread = 30 + (y - HZ) * 0.5;
      const x = m.x * 0.7 + 640 * 0.3 + (g.u - 0.5) * spread * 2 + Math.sin(t * 0.6 + g.ph) * 8;
      const a = (0.25 + 0.5 * Math.sin(t * 1.3 + g.ph * 3) ** 2) * m.alpha * (1 - (y - HZ) / 420);
      ctx.fillStyle = rgba(pal.moon, a * 0.7);
      ctx.fillRect(x - g.w / 2, y, g.w * (0.5 + (y - HZ) / 200), 1.6 + (y - HZ) / 140);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // the drowned sky: the sea reflects what is really up there
  if (ws.reflEyes > 0.01) {
    const col = mix3(pal.lit, [255, 255, 255], 0.5);
    for (let i = 0; i < 210; i++) {
      const v = hash(i * 2.9);
      const y = HZ + 10 + Math.pow(v, 1.5) * 360;
      const x = -500 + hash(i * 1.7) * 2200;
      const r = 5 + (y - HZ) * 0.14;
      const open = smooth(v * 0.55, v * 0.55 + 0.4, ws.reflEyes);
      if (open < 0.02) continue;
      const bl = Math.sin(t * (0.4 + hash(i) * 0.4) + i * 3.3) > 0.985 ? 0.15 : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.62);
      glow(ctx, 0, 0, r * 2.6, col, 0.35 * open);
      drawEye(ctx, 0, 0, r, open * bl, col, [0, -1], 0.16, 0.95);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function toSky(ws: WorldState, p: V2): V2 {
  return [p[0] + ws.cam.x * (0.04 - 1), p[1] + ws.cam.y * (1 - 0.08)];
}

function lanternOn(L: Lantern, ws: WorldState) {
  const lv = ws.lantern;
  const on = smooth(L.order - 0.05, L.order + 0.0001, lv.reveal);
  const dead = smooth(L.hsh, L.hsh + 0.06, lv.off);
  const fl = 0.8 + 0.2 * Math.sin(ws.t * (5 + L.hsh * 5) + L.ph) * Math.sin(ws.t * 2.3 + L.ph * 2);
  const pulse = 0.25 + 0.95 * heart(ws.t);
  let a = on * (1 - dead) * lerp(fl, pulse, lv.breath) * lv.level;
  const ri = clamp(lv.rise * 1.55 - L.hsh * 0.55);
  let dx = 0, dy = 0;
  if (ri > 0) {
    a = Math.max(a, 1.05 * ri * (0.6 + 0.4 * Math.sin(ws.t * 3 + L.ph)));
    dy = -ri * ri * 3400 * (0.55 + L.hsh * 0.9);
    dx = Math.sin(ws.t * 0.8 + L.ph) * ri * 60 + (lv.tx - L.x) * ri * ri * 0.45;
  }
  return { a, dx, dy };
}

function drawHouse(ctx: CanvasRenderingContext2D, ws: WorldState, hs: House, y: number, sc: number, layerHaze: number, pi: number) {
  const { pal } = ws;
  const body = mix3(scale3(pal.shade, 0.55), pal.skyLow, layerHaze * 0.8);
  const roof = mix3(scale3(pal.shade, 0.35), pal.skyLow, layerHaze * 0.8);
  const x = hs.ox;
  ctx.fillStyle = rgba(roof);
  ctx.fillRect(x - hs.w * 0.8, y, hs.w * 1.6, 4 * sc + 1);
  ctx.fillStyle = rgba(body);
  ctx.fillRect(x - hs.w / 2, y - hs.h, hs.w, hs.h);
  const tier = (cx: number, by: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.85, by + 1.5 * sc);
    ctx.quadraticCurveTo(cx - w * 0.3, by - 1 * sc, cx, by - h * 0.85);
    ctx.quadraticCurveTo(cx + w * 0.3, by - 1 * sc, cx + w * 0.85, by + 1.5 * sc);
    ctx.closePath();
    ctx.fillStyle = rgba(roof);
    ctx.fill();
  };
  tier(x, y - hs.h, hs.w, hs.h * 0.9);
  if (hs.two) {
    ctx.fillStyle = rgba(body);
    ctx.fillRect(x - hs.w * 0.25, y - hs.h * 2.1, hs.w * 0.5, hs.h * 0.9);
    tier(x, y - hs.h * 2.1, hs.w * 0.6, hs.h * 0.6);
  }
  const lv = ws.lantern;
  hs.wins.forEach((u, wi) => {
    const wx = x - hs.w / 2 + hs.w * u;
    const wy = y - hs.h * 0.7;
    const L = { x: 0, y: 0, ph: hs.ph + wi, order: clamp(Math.hypot(ws.cam.x * 0 + wx + pi * 40 - 560, 0) / 1700), hsh: hash(hs.ph * 7 + wi), sz: 1 };
    const st = lanternOn({ ...L, order: 0.2 + hash(hs.ph + wi) * 0.6 }, ws);
    const a = Math.max(st.a * 0.95 * (lv.level > 0 ? 1 : 0), ws.figures * 0.9);
    const ww = hs.w * 0.2, wh = hs.h * 0.34;
    const cold = ws.figures > 0.2 ? mix3(pal.lamp, [190, 235, 255], clamp(ws.figures)) : pal.lamp;
    ctx.fillStyle = rgba(mix3(scale3(cold, 0.18), cold, clamp(a)), 1);
    ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    if (ws.figures > 0 && hash(hs.ph * 3 + wi) < ws.figures && sc > 0.5) {
      ctx.fillStyle = "#05050a";
      ctx.beginPath();
      ctx.arc(wx, wy - wh * 0.12, ww * 0.22, 0, TAU);
      ctx.fill();
      ctx.fillRect(wx - ww * 0.2, wy - wh * 0.02, ww * 0.4, wh * 0.52);
    }
    glow(ctx, wx, wy, hs.w * 0.9, cold, a * 0.65);
  });
}

function drawPillar(ctx: CanvasRenderingContext2D, ws: WorldState, L: Layer, p: Pillar, pi: number) {
  const { pal } = ws;
  const litC = mix3(mix3(pal.shade, pal.lit, 0.3), pal.skyLow, L.haze * 0.9);
  const midC = mix3(mix3(pal.shade, pal.haze, 0.3), pal.skyLow, L.haze);
  const darkC = mix3(scale3(pal.shade, L.fg ? 0.45 : 1), pal.skyLow, L.haze);
  const g = ctx.createLinearGradient(-p.w / 2, 0, p.w / 2, 0);
  g.addColorStop(0, rgba(litC));
  g.addColorStop(0.4, rgba(midC));
  g.addColorStop(1, rgba(darkC));
  ctx.fillStyle = g;
  ctx.fill(p.path);
  if (L.sc >= 0.75 && !L.fg) {
    ctx.save();
    ctx.clip(p.path);
    ctx.lineWidth = 1.2;
    for (const s of p.strata) {
      ctx.strokeStyle = `rgba(0,0,0,${s.a})`;
      ctx.beginPath();
      ctx.moveTo(-p.w, s.y);
      ctx.lineTo(p.w, s.y + s.dy);
      ctx.stroke();
    }
    ctx.restore();
  }
  // mist at the base
  const fg = ctx.createLinearGradient(0, 0, 0, -Math.min(p.h, 520 * L.sc));
  fg.addColorStop(0, rgba(pal.skyLow, 0.45 * ws.fog + L.haze * 0.2));
  fg.addColorStop(1, rgba(pal.skyLow, 0));
  ctx.fillStyle = fg;
  ctx.fill(p.path);
  if (!L.fg) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(pal.lit, 0.35 * (1 - L.haze));
    ctx.stroke(p.path);
  }
  if (L.sc >= 0.38) p.houses.forEach((h) => drawHouse(ctx, ws, h, -p.h * h.fy, L.sc, L.haze, pi));
}

function drawSpireExtras(ctx: CanvasRenderingContext2D, ws: WorldState, p: Pillar) {
  const { pal, t } = ws;
  if (ws.runes > 0.01 && p.runes) {
    ctx.globalCompositeOperation = "lighter";
    p.runes.forEach((r, i) => {
      const pulse = 0.25 + 0.75 * heart(t - i * 0.11);
      const a = ws.runes * pulse;
      glow(ctx, r.x, r.y, 46, pal.accent, a * 0.45);
      ctx.strokeStyle = rgba(mix3(pal.accent, [255, 255, 255], 0.5), a);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 9, 0, TAU);
      ctx.moveTo(r.x - 15, r.y);
      ctx.lineTo(r.x + 15, r.y);
      if (r.k % 2) { ctx.moveTo(r.x, r.y - 15); ctx.lineTo(r.x, r.y + 15); }
      else { ctx.moveTo(r.x - 8, r.y - 13); ctx.lineTo(r.x + 8, r.y + 13); }
      if (r.k > 1) { ctx.moveTo(r.x + 9, r.y - 9); ctx.lineTo(r.x + 18, r.y - 18); }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
  }
  // summit: the stone gate
  const top = -p.h;
  const stone = mix3(scale3(pal.shade, 0.7), pal.lit, 0.18);
  ctx.fillStyle = rgba(stone);
  ctx.fillRect(-110, top - 8, 220, 14);
  ctx.fillStyle = rgba(scale3(stone, 0.8));
  ctx.fillRect(-78, top - 200, 18, 194);
  ctx.fillRect(60, top - 200, 18, 194);
  ctx.beginPath();
  ctx.moveTo(-130, top - 196);
  ctx.quadraticCurveTo(0, top - 232, 130, top - 196);
  ctx.lineTo(120, top - 214);
  ctx.quadraticCurveTo(0, top - 252, -120, top - 214);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-90, top - 176, 180, 10);
  ctx.strokeStyle = rgba(pal.lit, 0.4);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-78, top - 200, 18, 194);
}

function drawLayer(ctx: CanvasRenderingContext2D, ws: WorldState, L: Layer) {
  const { pal, t } = ws;
  const c = ws.cam;
  ctx.save();
  camera(ctx, ws, L.par);
  const cx = W / 2 + c.x * L.par;
  const half = W / 2 / c.zoom + 260;
  const vis = L.pillars.filter((p) => Math.abs(p.x - cx) < half + p.w + (p.fall ? p.h * 0.6 : 0));
  const refl = mix3(scale3(pal.shade, 0.8), pal.sea, 0.55);
  const collapseT = ws.collapse;

  const pose = (p: Pillar) => {
    if (!p.fall || collapseT < 0) return { ang: 0, sink: 0, local: -1 };
    const local = collapseT - p.delay;
    const k = clamp(local / 3.6);
    return { ang: p.dir * 1.52 * Math.pow(k, 2.3), sink: smooth(4.5, 9, local) * p.h * 0.25, local };
  };

  // reflections
  ctx.globalAlpha = 0.5 * (1 - L.haze * 0.4);
  for (const p of vis) {
    const ps = pose(p);
    ctx.save();
    ctx.translate(p.x, L.base);
    ctx.scale(1, -1);
    ctx.rotate(ps.ang);
    ctx.fillStyle = rgba(refl);
    ctx.fill(p.path);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // lantern reflections
  const lanterns = L.lanterns;
  for (const l of lanterns) {
    if (Math.abs(l.x - cx) > half + 400) continue;
    const st = lanternOn(l, ws);
    if (st.a < 0.05 || st.dy < -200) continue;
    const ry = 2 * L.base - l.y;
    glow(ctx, l.x + st.dx, ry, 16 * l.sz * (0.7 + st.a * 0.6), pal.lamp, st.a * 0.55, 2.8);
  }
  // veil
  const vh = 700 * L.sc;
  const vg = ctx.createLinearGradient(0, L.base, 0, L.base + vh);
  const veil = mix3(pal.sea, pal.seaLow, 0.35);
  vg.addColorStop(0, rgba(veil, 0.05));
  vg.addColorStop(0.5, rgba(veil, 0.55));
  vg.addColorStop(1, rgba(veil, 0.9));
  ctx.fillStyle = vg;
  ctx.fillRect(cx - half - 400, L.base, half * 2 + 800, vh);

  // pillars
  vis.forEach((p, i) => {
    const ps = pose(p);
    ctx.save();
    ctx.translate(p.x, L.base + ps.sink);
    ctx.rotate(ps.ang);
    drawPillar(ctx, ws, L, p, i);
    if (p.spire) drawSpireExtras(ctx, ws, p);
    ctx.restore();
    // splash + debris when a fallen pillar hits the water
    if (ps.local > 3.1) {
      const tau = ps.local - 3.1;
      const hx = p.x + p.dir * p.h * 0.85;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(pal.lit, 0.5 * (1 - clamp(tau / 4)));
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const span = tau - k * 0.35;
        if (span <= 0) continue;
        const rr = Math.max(0.1, span * 260 * L.sc);
        ctx.beginPath();
        ctx.ellipse(hx, L.base, rr, Math.max(0.1, rr * 0.16), 0, 0, TAU);
        ctx.stroke();
      }
      for (let k = 0; k < 46; k++) {
        const hv = hash(k * 3.3 + p.x);
        const vx = (hv - 0.5) * 520 * L.sc;
        const vy = -(260 + hash(k + p.x) * 620) * L.sc;
        const x = hx + vx * tau * 0.5 + p.dir * 40 * tau;
        const y = L.base + vy * tau + 540 * L.sc * tau * tau * 0.5 * 1.8;
        if (y > L.base + 4) continue;
        ctx.fillStyle = rgba(mix3(pal.lit, [255, 255, 255], 0.5), 0.8 * (1 - clamp(tau / 3.2)));
        ctx.fillRect(x, y, 3 * L.sc + 1, 7 * L.sc + 1);
      }
      ctx.globalCompositeOperation = "source-over";
    }
  });

  // ropes & lanterns
  ctx.strokeStyle = rgba(scale3(pal.shade, 0.5), 0.85 * (1 - L.haze * 0.6));
  ctx.lineWidth = Math.max(0.6, 1.6 * L.sc);
  for (const r of L.ropes) {
    if (Math.abs(r.a[0] - cx) > half + 1100 && Math.abs(r.b[0] - cx) > half + 1100) continue;
    ctx.beginPath();
    ctx.moveTo(r.a[0], r.a[1]);
    ctx.quadraticCurveTo((r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2 + r.sag * 2, r.b[0], r.b[1]);
    ctx.stroke();
  }
  const lean = ws.lantern.lean;
  for (const l of lanterns) {
    if (Math.abs(l.x - cx) > half + 400 && ws.lantern.rise < 0.01) continue;
    const st = lanternOn(l, ws);
    if (st.a < 0.02) {
      if (L.sc > 0.55) {
        ctx.fillStyle = rgba(scale3(pal.shade, 0.7), 0.9);
        ctx.fillRect(l.x - 3 * l.sz, l.y - 4 * l.sz, 6 * l.sz, 8 * l.sz);
      }
      continue;
    }
    const x = l.x + st.dx, y = l.y + st.dy;
    if (L.sc > 0.55) {
      ctx.fillStyle = rgba(mix3(pal.lamp, [60, 20, 10], 0.5 - st.a * 0.4), 0.95);
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.1, 4 * Math.abs(l.sz)), Math.max(0.1, 5.5 * Math.abs(l.sz)), 0, 0, TAU);
      ctx.fill();
      if (lean > 0.01) {
        const tx = ws.lantern.tx - x, ty = ws.lantern.ty - y;
        const an = Math.atan2(ty, tx);
        ctx.strokeStyle = rgba(mix3(pal.lamp, [255, 255, 255], 0.5), 0.8 * st.a);
        ctx.lineWidth = 1.6 * l.sz;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y - 3 * l.sz);
        ctx.lineTo(x + Math.cos(an) * 9 * l.sz * lean, y - 3 * l.sz + Math.sin(an) * 9 * l.sz * lean);
        ctx.stroke();
      }
    }
    glow(ctx, x, y, 17 * l.sz * (0.55 + st.a * 0.75), pal.lamp, st.a * 0.9);
  }
  void t;
  ctx.restore();
}

function drawPlankton(ctx: CanvasRenderingContext2D, ws: WorldState) {
  if (ws.plankton < 0.01) return;
  const { pal, t } = ws;
  ctx.save();
  camera(ctx, ws, 0.7, 0.2);
  const hb = heart(t);
  for (const p of PLANK) {
    const y = HZ + 14 + Math.pow(p.y, 1.5) * 330;
    const dep = (y - HZ) / 330;
    const a = ws.plankton * (0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + p.ph), 2)) * (0.5 + 0.7 * hb);
    glow(ctx, p.x + Math.sin(t * 0.3 + p.ph) * 16, y, p.r * (1 + dep * 2.2), pal.accent, a, 0.35);
  }
  ctx.restore();
}

function drawBeams(ctx: CanvasRenderingContext2D, ws: WorldState) {
  if (ws.beams < 0.01 || !ws.mother) return;
  const m = ws.mother;
  const { pal, t } = ws;
  ctx.save();
  camera(ctx, ws, 0.04, 0.08);
  ctx.globalCompositeOperation = "lighter";
  const n = 9;
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n - 0.5;
    const sx = m.x + u * m.size * 1.1;
    const sy = m.y + m.size * 0.12;
    const sway = Math.sin(t * 0.5 + k * 1.7) * 60;
    const ex = sx + u * 360 + sway;
    const len = 1000 * ws.beams;
    const wTop = 6 + m.size * 0.03;
    const wBot = 50 + 80 * Math.abs(Math.sin(k * 2.1 + 1));
    const g = ctx.createLinearGradient(sx, sy, ex, sy + len);
    g.addColorStop(0, rgba(pal.lit, 0.0));
    g.addColorStop(0.12, rgba(pal.lit, 0.3 * ws.beams));
    g.addColorStop(1, rgba(pal.lit, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - wTop, sy);
    ctx.lineTo(sx + wTop, sy);
    ctx.lineTo(ex + wBot, sy + len);
    ctx.lineTo(ex - wBot, sy + len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawClouds(ctx: CanvasRenderingContext2D, ws: WorldState, par: number, k: number) {
  if (ws.cloud < 0.01) return;
  ctx.save();
  camera(ctx, ws, par * 0.5, par);
  const col = mix3(ws.pal.skyLow, ws.pal.lit, 0.35);
  const sp = glowSprite(col);
  void sp;
  for (const c of CLOUDS) {
    const x = c.x + ws.t * 6 * (c.a - 0.2);
    ctx.globalAlpha = ws.cloud * c.a * k;
    ctx.drawImage(PUFF, x - c.r, c.y - c.r * 0.5, c.r * 2, c.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMechPlane(ctx: CanvasRenderingContext2D, ws: WorldState) {
  const L4 = LAYERS[4];
  ctx.save();
  camera(ctx, ws, 1.0);
  if (ws.behindMech) {
    try {
      ws.behindMech(ctx);
    } catch (e) {
      console.error("behindMech error:", e);
    }
  }
  const m = ws.mech;
  if (m) {
    const stand = m.y > BASE4 - 140;
    if (stand) {
      // reflection
      ctx.save();
      ctx.translate(0, BASE4);
      ctx.scale(1, -1);
      ctx.translate(0, -BASE4);
      drawMech(ctx, { ...m, alpha: (m.alpha ?? 1) * 0.34 });
      ctx.restore();
      const veil = mix3(ws.pal.sea, ws.pal.seaLow, 0.35);
      const vg = ctx.createLinearGradient(0, BASE4, 0, BASE4 + 280);
      vg.addColorStop(0, rgba(veil, 0.0));
      vg.addColorStop(1, rgba(veil, 0.85));
      ctx.fillStyle = vg;
      ctx.fillRect(m.x - 320, BASE4, 640, 280);
      // wake rings
      if (ws.wake > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        for (const fx of [-46, 46]) {
          for (let k = 0; k < 4; k++) {
            const u = (((ws.t * 0.35 + k / 4 + (fx > 0 ? 0.13 : 0)) % 1) + 1) % 1;
            const rr = Math.max(0.1, 20 + u * 110 * Math.abs(m.s));
            ctx.strokeStyle = rgba(ws.pal.lit, 0.4 * (1 - u) * ws.wake);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(m.x + fx * m.s * (m.flip ?? 1), BASE4 + 3, rr, Math.max(0.1, rr * 0.14), 0, 0, TAU);
            ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    drawMech(ctx, m);
    if (stand) {
      // submerge the boots
      const sea = mix3(ws.pal.sea, ws.pal.skyLow, 0.1);
      const sg = ctx.createLinearGradient(0, BASE4 - 11, 0, BASE4 + 6);
      sg.addColorStop(0, rgba(sea, 0));
      sg.addColorStop(0.5, rgba(sea, 0.8));
      sg.addColorStop(1, rgba(sea, 0.9));
      ctx.fillStyle = sg;
      ctx.fillRect(m.x - 140 * m.s, BASE4 - 11, 280 * m.s, 18);
      ctx.strokeStyle = rgba(ws.pal.lit, 0.35);
      ctx.lineWidth = 1.5;
      for (const fx of [-46, 46]) {
        ctx.beginPath();
        ctx.ellipse(m.x + fx * m.s * (m.flip ?? 1), BASE4 - 4, Math.max(0.1, 34 * Math.abs(m.s)), 5, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }
  if (ws.frontMech) {
    try {
      ws.frontMech(ctx);
    } catch (e) {
      console.error("frontMech error:", e);
    }
  }
  ctx.restore();
  void L4;
}

function particles(ctx: CanvasRenderingContext2D, ws: WorldState) {
  const { t, pal } = ws;
  if (ws.ash > 0.01) {
    ctx.fillStyle = rgba(pal.lit, 0.5 * ws.ash);
    for (let i = 0; i < 110; i++) {
      const sp = 6 + hash(i) * 16;
      const x = (hash(i * 2.3) * W + Math.sin(t * 0.4 + i) * 30) % W;
      const y = (hash(i * 5.1) * H + t * sp) % H;
      const r = 0.6 + hash(i + 3) * 1.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  if (ws.rain > 0.01) {
    ctx.strokeStyle = rgba(mix3(pal.lit, [255, 255, 255], 0.4), 0.45 * ws.rain);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 130; i++) {
      const sp = 160 + hash(i) * 260;
      const x = hash(i * 2.3) * W;
      const y = (((hash(i * 5.1) * H - t * sp) % H) + H) % H;
      const l = 8 + hash(i + 3) * 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + l);
      ctx.stroke();
    }
  }
}

export function horizonY(ws: WorldState) {
  const c = ws.cam;
  return H / 2 + (HZ - H / 2 + c.y * 0.08 + c.tilt) * c.zoom;
}

export function drawWorld(ctx: CanvasRenderingContext2D, ws: WorldState) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  drawSky(ctx, ws);
  drawLayer(ctx, ws, LAYERS[0]);
  drawLayer(ctx, ws, LAYERS[1]);
  drawClouds(ctx, ws, 0.5, 0.8);
  drawLayer(ctx, ws, LAYERS[2]);
  drawLayer(ctx, ws, LAYERS[3]);
  drawBeams(ctx, ws);
  drawPlankton(ctx, ws);
  drawLayer(ctx, ws, LAYERS[4]);
  drawMechPlane(ctx, ws);
  drawClouds(ctx, ws, 1.25, 0.55);
  drawLayer(ctx, ws, LAYERS[5]);
  particles(ctx, ws);
}
