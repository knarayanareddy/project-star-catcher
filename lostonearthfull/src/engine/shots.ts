import { W, H, E, lerp, prog, hash, noise1, mod } from "./util";
import * as X from "./fx";
import { cover, blurred, glow, mk, type C2, type Assets, type CamOut, type Cam } from "./fx";
import type { Scene, Cap } from "../scenes/types";

/* =====================================================================================
   SHOT LANGUAGE
   A scene is a list of shots. A shot = painted plate + camera move + living-plate sway +
   an FX stack anchored to plate coordinates (u,v) so effects stay glued to the painting
   while the virtual camera moves.  Everything is a pure function of time.
   ===================================================================================== */

export type Fx = (c: C2, t: number, co: CamOut, A: Assets, k: number) => void;
export interface Sway {
  u0: number; v0: number; u1: number; v1: number;
  amp: number; freq?: number; phase?: number;
  /** which edge stays pinned */
  anchor?: "bottom" | "top" | "none";
}
export interface Shot {
  at: number;
  dur: number;
  plate: string;
  from: Cam;
  to?: Cam;
  ease?: (x: number) => number;
  /** handheld drift amplitude, px */
  hh?: number;
  /** times (shot-local) of camera punches (knocks, impacts) */
  punch?: number[];
  sway?: Sway[];
  fx?: Fx[];
  /** rack focus: [startBlurAlpha, seconds] — plate starts soft and pulls sharp */
  rack?: [number, number];
  /** defocus at the end: [t0, t1, maxAlpha] */
  defocus?: [number, number, number];
  in?: "cut" | "dissolve" | "dip" | "flash" | "whip";
  inDur?: number;
  over?: (c: C2, t: number, g: number, A: Assets, co: CamOut, k: number) => void;
}

const lerpN = (a: number | undefined, b: number | undefined, d: number, e: number) => lerp(a ?? d, b ?? a ?? d, e);

function swayRegion(c: C2, img: HTMLImageElement, co: CamOut, s: Sway, t: number) {
  const [x0, y0] = co.map(s.u0, s.v0);
  const [x1, y1] = co.map(s.u1, s.v1);
  if (y1 < -20 || y0 > H + 20 || x1 < 0 || x0 > W) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sx = s.u0 * iw, sw = (s.u1 - s.u0) * iw;
  const sy0 = s.v0 * ih, shh = (s.v1 - s.v0) * ih;
  const n = Math.max(4, Math.round((y1 - y0) / 5));
  const dh = (y1 - y0) / n, sh = shh / n;
  const fr = s.freq ?? 0.9, ph = s.phase ?? 0, an = s.anchor ?? "bottom";
  for (let i = 0; i < n; i++) {
    const dy = y0 + i * dh;
    if (dy > H || dy + dh < 0) continue;
    const p = (i + 0.5) / n;
    const env = Math.min(1, p / 0.1, (1 - p) / 0.1);
    const w = an === "bottom" ? 1 - p : an === "top" ? p : 1;
    const dx = s.amp * env * w * (Math.sin(fr * t * 2 + p * 5 + ph) + 0.45 * Math.sin(fr * t * 4.7 + p * 11 + ph * 2));
    c.drawImage(img, sx, sy0 + i * sh, sw, sh + 0.8, x0 + dx, dy, x1 - x0, dh + 1);
  }
}

export function camAt(s: Shot, t: number): Cam {
  const k = prog(t, 0, s.dur);
  const e = (s.ease ?? E.inOutSine)(k);
  const f = s.from, o = s.to ?? s.from;
  let z = lerpN(f.z, o.z, 1, e);
  let ox = lerpN(f.ox, o.ox, 0, e);
  let oy = lerpN(f.oy, o.oy, 0, e);
  if (s.hh) {
    ox += (noise1(t * 0.9 + 3.3) - 0.5) * 2 * s.hh + (noise1(t * 2.7 + 9) - 0.5) * s.hh * 0.5;
    oy += (noise1(t * 0.8 + 11.1) - 0.5) * 2 * s.hh + (noise1(t * 2.3 + 5) - 0.5) * s.hh * 0.5;
  }
  if (s.punch) for (const p of s.punch) if (t > p) z *= 1 + 0.035 * Math.exp(-(t - p) * 9);
  return { z, fx: lerpN(f.fx, o.fx, 0.5, e), fy: lerpN(f.fy, o.fy, 0.5, e), ox, oy, rot: lerpN(f.rot, o.rot, 0, e) || undefined };
}

export function paintShot(c: C2, s: Shot, t: number, g: number, A: Assets): CamOut {
  const img = A[s.plate];
  const cam = camAt(s, t);
  const co = cover(c, img, cam);
  if (s.sway) for (const sw of s.sway) swayRegion(c, img, co, sw, t);
  let bl = 0;
  if (s.rack) bl = s.rack[0] * (1 - E.outCubic(prog(t, 0, s.rack[1])));
  if (s.defocus) bl = Math.max(bl, s.defocus[2] * E.inOutSine(prog(t, s.defocus[0], s.defocus[1])));
  if (bl > 0.01) blurred(c, (gg) => cover(gg, img, cam), 9, bl);
  const k = prog(t, 0, s.dur);
  if (s.fx) for (const f of s.fx) f(c, t, co, A, k);
  if (s.over) s.over(c, t, g, A, co, k);
  return co;
}

let layerA: HTMLCanvasElement | null = null;

export function drawShots(c: C2, shots: Shot[], lt: number, g: number, A: Assets) {
  let idx = 0;
  for (let i = 0; i < shots.length; i++) if (lt >= shots[i].at) idx = i;
  const s = shots[idx];
  const t = lt - s.at;
  const inD = s.inDur ?? (s.in === "dissolve" ? 0.7 : s.in === "dip" ? 0.6 : s.in === "flash" ? 0.4 : s.in === "whip" ? 0.34 : 0);
  if (idx > 0 && s.in && s.in !== "cut" && t < inD) {
    const prev = shots[idx - 1];
    const q = t / inD;
    if (s.in === "dissolve") {
      paintShot(c, prev, prev.dur + t, g, A);
      layerA ??= mk(W, H);
      const lc = layerA.getContext("2d")!;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalAlpha = 1;
      lc.clearRect(0, 0, W, H);
      paintShot(lc, s, t, g, A);
      c.globalAlpha = E.inOutSine(q);
      c.drawImage(layerA, 0, 0);
      c.globalAlpha = 1;
      return;
    }
    if (s.in === "whip") {
      layerA ??= mk(W, H);
      const lc = layerA.getContext("2d")!;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalAlpha = 1;
      lc.clearRect(0, 0, W, H);
      const e = E.inOutCubic(q);
      lc.save();
      if (q < 0.5) {
        lc.translate(-e * W * 0.9, 0);
        paintShot(lc, prev, prev.dur + t, g, A);
      } else {
        lc.translate((1 - e) * W * 0.9, 0);
        paintShot(lc, s, t, g, A);
      }
      lc.restore();
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
      const sp = Math.sin(Math.PI * q) * 46;
      for (let j = -3; j <= 3; j++) {
        c.globalAlpha = j === 0 ? 0.4 : 0.2;
        c.drawImage(layerA, j * sp * (q < 0.5 ? -1 : 1) * 0.5, 0);
      }
      c.globalAlpha = 1;
      return;
    }
  }
  paintShot(c, s, t, g, A);
  if (idx > 0 && s.in === "dip" && t < inD) X.black(c, 1 - E.outCubic(prog(t, 0, inD)));
  if (idx > 0 && s.in === "flash" && t < inD) X.flash(c, 1 - prog(t, 0, inD));
}

export interface SceneMeta {
  id: string;
  label: string;
  start: number;
  dur: number;
  fin?: number;
  fout?: number;
  xf?: number;
  bloom?: number;
  caps: Cap[];
  ca?: (lt: number) => number;
}

export function shotScene(m: SceneMeta, shots: Shot[], over?: (c: C2, t: number, g: number, A: Assets) => void): Scene {
  return {
    ...m,
    draw: (c, t, g, A) => {
      drawShots(c, shots, t, g, A);
      over?.(c, t, g, A);
    },
  };
}

/* =====================================================================================
   FX FACTORIES (all anchored to plate uv)
   ===================================================================================== */
type O = Record<string, number | string | undefined>;

export const FX = {
  shafts: (u: number, v: number, o: { ang?: number; spread?: number; n?: number; alpha?: number; rgb?: string; len?: number; seed?: number } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      X.shafts(c, t, { ox: x, oy: y, ...o });
    },
  mist: (o: Parameters<typeof X.mist>[3] & { seed?: number } = {}): Fx => (c, t) => X.mist(c, t, o.seed ?? 2, o),
  motes: (n: number, o: Parameters<typeof X.motes>[4] & { seed?: number } = {}): Fx => (c, t) => X.motes(c, t, o.seed ?? 3, n, o),
  flies: (n: number, o: Parameters<typeof X.fireflies>[4] & { seed?: number } = {}): Fx => (c, t) => X.fireflies(c, t, o.seed ?? 7, n, o),
  rain: (n: number, o: Parameters<typeof X.rain>[4] & { seed?: number } = {}): Fx => (c, t) => X.rain(c, t, o.seed ?? 4, n, o),
  leaves: (n: number, rgb = "20,60,30", speed = 420, seed = 5): Fx => (c, t) => X.leaves(c, t, seed, n, rgb, speed),
  birds: (n: number, o: Parameters<typeof X.birds>[4] & { seed?: number } = {}): Fx => (c, t) => X.birds(c, t, o.seed ?? 9, n, o),
  ferns: (o: Parameters<typeof X.ferns>[3] & { seed?: number } = {}): Fx => (c, t) => X.ferns(c, t, o.seed ?? 6, o),
  glints: (u0: number, u1: number, v0: number, v1: number, n = 40, size = 10, seed = 4): Fx =>
    (c, t, co) => X.glints(c, t, seed, n, co.map, u0, u1, v0, v1, size),
  vig: (s = 0.4, rgb = "0,0,0", inner = 0.35): Fx => (c) => X.vignette(c, s, rgb, inner),
  wash: (color: string, mode: GlobalCompositeOperation = "multiply"): Fx => (c) => X.tint(c, color, mode),
  desat: (a: number): Fx => (c) => X.desat(c, a),
  flash: (times: number[], decay = 6, rgb = "255,255,255", peak = 1): Fx => (c, t) => {
    let a = 0;
    for (const f of times) if (t >= f) a = Math.max(a, peak * Math.exp(-(t - f) * decay));
    X.flash(c, a, rgb);
  },
  /** warm firelight: flickering pool of additive light + soft bounce */
  fire: (u: number, v: number, o: { r?: number; a?: number; seed?: number; rgb?: string } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      const r = (o.r ?? 520) * co.s;
      const fl = 0.78 + 0.22 * noise1(t * 9 + (o.seed ?? 1)) + 0.1 * Math.sin(t * 23);
      c.save();
      c.globalCompositeOperation = "lighter";
      glow(c, x, y - r * 0.05, r, o.rgb ?? "255,120,40", (o.a ?? 0.38) * fl);
      glow(c, x, y, r * 0.35, "255,190,90", (o.a ?? 0.38) * 0.9 * fl);
      glow(c, x, y + r * 0.05, r * 1.4, "255,90,30", (o.a ?? 0.38) * 0.2 * fl);
      c.restore();
    },
  embers: (u: number, v: number, n = 26, o: { seed?: number; spread?: number; rise?: number } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      const sd = o.seed ?? 8;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const life = 3 + hash(sd + i) * 3;
        const ph = mod(t / life + hash(sd + i * 2.3), 1);
        const rise = (o.rise ?? 520) * co.s;
        const px = x + (hash(sd + i * 5.1) - 0.5) * 70 * co.s + Math.sin(ph * 9 + i) * (o.spread ?? 60) * ph * co.s;
        const py = y - ph * rise * (0.5 + hash(sd + i * 3.7));
        const a = Math.sin(Math.PI * ph) * (0.5 + 0.5 * Math.sin(t * 14 + i * 3));
        c.globalAlpha = Math.max(0, a);
        const r = (3 + hash(sd + i * 7) * 5) * (1 - ph * 0.6);
        c.drawImage(X.glowSprite("255,150,60"), px - r * 2, py - r * 2, r * 4, r * 4);
      }
      c.restore();
    },
  ripples: (u: number, v: number, o: { n?: number; r?: number; period?: number; a?: number; rgb?: string; squash?: number } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      const n = o.n ?? 3;
      c.save();
      c.lineWidth = 2.2;
      for (let j = 0; j < n; j++) {
        const ph = mod(t / (o.period ?? 3) + j / n, 1);
        c.strokeStyle = `rgba(${o.rgb ?? "230,245,255"},${(1 - ph) * (o.a ?? 0.35)})`;
        c.beginPath();
        c.ellipse(x, y, (o.r ?? 120) * co.s * ph + 4, (o.r ?? 120) * co.s * ph * (o.squash ?? 0.28) + 2, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    },
  /** sound made visible: concentric rings that leave a point at given times */
  pulse: (u: number, v: number, times: number[], o: { r?: number; life?: number; rgb?: string; w?: number; squash?: number; a?: number } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      const life = o.life ?? 2.2;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const t0 of times) {
        const q = (t - t0) / life;
        if (q < 0 || q > 1) continue;
        for (let j = 0; j < 3; j++) {
          const qq = q - j * 0.08;
          if (qq < 0) continue;
          const r = E.outCubic(qq) * (o.r ?? 900) * co.s;
          c.strokeStyle = `rgba(${o.rgb ?? "255,200,130"},${(1 - qq) * (o.a ?? 0.7) * (1 - j * 0.3)})`;
          c.lineWidth = (o.w ?? 4) * (1 - qq * 0.7);
          c.beginPath();
          c.ellipse(x, y, r, r * (o.squash ?? 0.55), 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
      c.restore();
    },
  lightning: (times: number[], o: { u?: number; v?: number; seed?: number; rgb?: string } = {}): Fx =>
    (c, t, co) => {
      let a = 0;
      let st = -1;
      for (const f of times) {
        const d = t - f;
        if (d >= 0 && d < 0.9) {
          const v = Math.max(d < 0.1 ? 1 : 0, 0.6 * Math.exp(-d * 9) * (0.6 + 0.4 * Math.sin(d * 70)));
          if (v > a) { a = v; st = f; }
        }
      }
      if (a <= 0.01) return;
      if (o.u !== undefined && t - st < 0.22) {
        const [bx, by] = co.map(o.u, o.v ?? 0.1);
        c.save();
        c.globalCompositeOperation = "lighter";
        c.strokeStyle = `rgba(230,225,255,${a})`;
        c.lineCap = "round";
        for (const [w, al] of [[10, 0.25], [3, 1]]) {
          c.lineWidth = w;
          c.globalAlpha = al * a;
          c.beginPath();
          let x = bx, y = by;
          c.moveTo(x, y);
          for (let i = 0; i < 12; i++) {
            x += (hash(st * 7 + i * 3.1) - 0.5) * 90;
            y += 38 + hash(st * 3 + i) * 34;
            c.lineTo(x, y);
          }
          c.stroke();
        }
        c.restore();
      }
      X.flash(c, a * 0.5, o.rgb ?? "200,200,255");
    },
  /** big out-of-focus foreground bokeh discs (depth cue) */
  bokeh: (n = 14, o: { rgb?: string; a?: number; seed?: number; size?: number; vx?: number } = {}): Fx =>
    (c, t) => {
      const sd = o.seed ?? 12;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const k = 0.5 + hash(sd + i);
        const x = mod(hash(sd + i * 2.1) * W + t * (o.vx ?? 12) * k, W + 300) - 150;
        const y = hash(sd + i * 3.9) * H + Math.sin(t * 0.4 + i) * 20;
        const r = (o.size ?? 60) * (0.5 + hash(sd + i * 5));
        c.globalAlpha = (o.a ?? 0.1) * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2));
        c.drawImage(X.glowSprite(o.rgb ?? "255,230,170"), x - r, y - r, r * 2, r * 2);
      }
      c.restore();
    },
  /** anamorphic lens flare on a plate point */
  flare: (u: number, v: number, o: { a?: number; rgb?: string; len?: number } = {}): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      if (x < -300 || x > W + 300) return;
      const a = (o.a ?? 0.5) * (0.85 + 0.15 * Math.sin(t * 1.3));
      c.save();
      c.globalCompositeOperation = "lighter";
      const L = (o.len ?? 900) * co.s;
      c.globalAlpha = a * 0.8;
      c.drawImage(X.glowSprite(o.rgb ?? "255,225,170"), x - L * 0.7, y - 16 * co.s - 6, L * 1.4, 32 * co.s + 12);
      c.globalAlpha = 1;
      glow(c, x, y, 160 * co.s, o.rgb ?? "255,225,170", a * 0.9);
      glow(c, x + (W / 2 - x) * 0.5, y + (H / 2 - y) * 0.5, 50 * co.s, "255,160,90", a * 0.25);
      c.restore();
    },
  /** soft local light (lantern, screen glow, eye shine) */
  lamp: (u: number, v: number, r: number, rgb: string, a: number, flick = 0): Fx =>
    (c, t, co) => {
      const [x, y] = co.map(u, v);
      c.save();
      c.globalCompositeOperation = "lighter";
      glow(c, x, y, r * co.s, rgb, a * (1 - flick + flick * (0.6 + 0.4 * noise1(t * 7 + u * 40))));
      c.restore();
    },
  /** soft ground fog band */
  fog: (y: number, h: number, a: number, rgb = "210,235,235", speed = 12): Fx =>
    (c, t) => {
      c.save();
      const gr = c.createLinearGradient(0, y * H - h * H, 0, y * H + h * H);
      gr.addColorStop(0, `rgba(${rgb},0)`);
      gr.addColorStop(0.5, `rgba(${rgb},${a})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = gr;
      c.fillRect(0, 0, W, H);
      c.restore();
      X.mist(c, t, 41, { rgb, alpha: a * 0.7, y0: y - h * 0.4, y1: y + h * 0.4, n: 7, speed, size: 700 });
    },
  /** a travelling heartbeat-like pulse that darkens the frame edge */
  heart: (bpm: number, a = 0.3): Fx =>
    (c, t) => {
      const ph = mod(t * bpm / 60, 1);
      const b = Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.pow((ph - 0.28) * 9, 2));
      X.vignette(c, a * b + 0.15, "20,0,0", 0.3);
    },
  /** letterboxed glitchy flicker: for memory/radio moments */
  scan: (a = 0.07): Fx =>
    (c, t) => {
      const f = Math.floor(t * 24);
      c.save();
      c.fillStyle = `rgba(0,0,0,${a})`;
      for (let y = (f % 3); y < H; y += 3) c.fillRect(0, y, W, 1);
      c.restore();
    },
};

export const wait = (_o?: O) => undefined;
