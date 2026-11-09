import { W, H, clamp, lerp, hash, E, prog, mod } from "./util";

export type C2 = CanvasRenderingContext2D;
export type Img = HTMLImageElement | HTMLCanvasElement;
export type Assets = Record<string, HTMLImageElement>;

export const F = {
  cap: '"Zen Kaku Gothic New","Noto Sans JP","Hiragino Sans",sans-serif',
  mono: '"Space Mono","SF Mono",ui-monospace,monospace',
  title: '"Bebas Neue","Oswald",Impact,sans-serif',
  serif: '"Shippori Mincho","Noto Serif JP","Hiragino Mincho ProN",serif',
};

export function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const spacing = (c: C2, px: number) => {
  const anyC = c as unknown as { letterSpacing?: string };
  if ("letterSpacing" in c) anyC.letterSpacing = `${px}px`;
};

/* ------------------------------------------------------------------ camera */
export interface Cam {
  z?: number;
  fx?: number;
  fy?: number;
  ox?: number;
  oy?: number;
  rot?: number;
}
export interface CamOut {
  map: (u: number, v: number) => [number, number];
  s: number;
}

/** Cover-fit an image with a virtual camera: zoom z, focus point (fx,fy) in image uv. */
export function cover(c: C2, img: Img, o: Cam = {}): CamOut {
  const iw = (img as HTMLImageElement).naturalWidth || img.width;
  const ih = (img as HTMLImageElement).naturalHeight || img.height;
  const z = o.z ?? 1;
  const s = Math.max(W / iw, H / ih) * z;
  const dw = iw * s;
  const dh = ih * s;
  const fx = o.fx ?? 0.5;
  const fy = o.fy ?? 0.5;
  let x = W / 2 + (o.ox ?? 0) - fx * dw;
  let y = H / 2 + (o.oy ?? 0) - fy * dh;
  if (!o.rot) {
    x = clamp(x, W - dw, 0);
    y = clamp(y, H - dh, 0);
  }
  c.save();
  if (o.rot) {
    c.translate(W / 2, H / 2);
    c.rotate(o.rot);
    c.translate(-W / 2, -H / 2);
  }
  c.drawImage(img, x, y, dw, dh);
  c.restore();
  return { map: (u, v) => [x + u * dw, y + v * dh], s };
}

const blurTmp = new Map<number, HTMLCanvasElement>();
/** Draw a scene fn heavily downsampled then upscaled → cheap, stable gaussian-ish blur (focus pulls, rack focus) */
const blurKeyed = new Map<string, HTMLCanvasElement>();
export function blurred(c: C2, fn: (g: C2) => void, k = 10, alpha = 1, key?: string) {
  let t = key ? blurKeyed.get(key) : blurTmp.get(k);
  const fresh = !t;
  if (!t) {
    t = mk(Math.ceil(W / k), Math.ceil(H / k));
    if (key) blurKeyed.set(key, t);
    else blurTmp.set(k, t);
  }
  // a keyed blur is a static plate: render once, reuse every frame
  if (!key || fresh) {
    const g = t.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, t.width, t.height);
    g.scale(1 / k, 1 / k);
    fn(g);
  }
  c.save();
  c.globalAlpha = alpha;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(t, 0, 0, W, H);
  c.restore();
}

/* ------------------------------------------------------------------ light */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(rgb: string) {
  let s = glowCache.get(rgb);
  if (!s) {
    s = mk(128, 128);
    const g = s.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.3, `rgba(${rgb},0.55)`);
    gr.addColorStop(0.65, `rgba(${rgb},0.12)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    glowCache.set(rgb, s);
  }
  return s;
}

export function glow(c: C2, x: number, y: number, r: number, rgb: string, a: number) {
  c.globalAlpha = a;
  c.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1;
}

export function mist(
  c: C2,
  t: number,
  seed: number,
  o: { rgb?: string; alpha?: number; y0?: number; y1?: number; n?: number; speed?: number; size?: number } = {}
) {
  const { rgb = "225,240,235", alpha = 0.12, y0 = 0.5, y1 = 0.95, n = 10, speed = 14, size = 520 } = o;
  c.save();
  for (let i = 0; i < n; i++) {
    const rx = size * (0.6 + hash(seed + i * 1.3));
    const ry = rx * 0.3;
    const span = W + 2 * rx;
    const x = mod(hash(seed + i * 2.1) * span + t * speed * (0.5 + hash(seed + i * 3.3)), span) - rx;
    const y = (y0 + (y1 - y0) * hash(seed + i * 4.7)) * H + Math.sin(t * 0.2 + i) * 14;
    c.globalAlpha = alpha * (0.65 + 0.35 * Math.sin(t * 0.3 + i * 2));
    c.drawImage(glowSprite(rgb), x - rx, y - ry, rx * 2, ry * 2);
  }
  c.restore();
}

export function shafts(
  c: C2,
  t: number,
  o: { ox: number; oy: number; ang?: number; spread?: number; n?: number; alpha?: number; rgb?: string; len?: number; seed?: number }
) {
  const { ox, oy, ang = Math.PI / 2, spread = 1.2, n = 8, alpha = 0.14, rgb = "255,225,160", len = 1500, seed = 3 } = o;
  c.save();
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i++) {
    const a = ang + (hash(seed + i * 1.9) - 0.5) * spread;
    const w = 28 + hash(seed + i * 5.3) * 110;
    const fl = 0.55 + 0.45 * Math.sin(t * (0.25 + hash(seed + i) * 0.4) + i * 2.3);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const gr = c.createLinearGradient(ox, oy, ox + dx * len, oy + dy * len);
    gr.addColorStop(0, `rgba(${rgb},${alpha * fl})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(ox - dy * 4, oy + dx * 4);
    c.lineTo(ox + dy * 4, oy - dx * 4);
    c.lineTo(ox + dx * len + dy * w, oy + dy * len - dx * w);
    c.lineTo(ox + dx * len - dy * w, oy + dy * len + dx * w);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/* ------------------------------------------------------------------ particles */
export function motes(
  c: C2,
  t: number,
  seed: number,
  n: number,
  o: { rgb?: string; size?: number; alpha?: number; vx?: number; vy?: number; y0?: number; y1?: number; tw?: number } = {}
) {
  const { rgb = "255,240,200", size = 5, alpha = 0.7, vx = 10, vy = -6, y0 = 0, y1 = 1, tw = 1 } = o;
  c.save();
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const k = 0.4 + hash(seed + i * 2.2);
    const x = mod(hash(seed + i * 1.7) * W + t * vx * k + Math.sin(t * 0.6 * k + i) * 24, W);
    const y = mod((y0 + (y1 - y0) * hash(seed + i * 3.1)) * H + t * vy * k, H);
    const r = size * (0.5 + hash(seed + i * 4.9));
    const a = alpha * (0.45 + 0.55 * Math.sin(t * tw * (0.8 + hash(seed + i * 6.1)) + i * 1.7));
    c.globalAlpha = Math.max(0, a);
    c.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}

export function fireflies(
  c: C2,
  t: number,
  seed: number,
  n: number,
  o: { rgb?: string; size?: number; alpha?: number; y0?: number; y1?: number } = {}
) {
  const { rgb = "200,255,120", size = 14, alpha = 1, y0 = 0.2, y1 = 0.95 } = o;
  c.save();
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const bx = hash(seed + i * 1.7) * W;
    const by = (y0 + (y1 - y0) * hash(seed + i * 2.9)) * H;
    const x = bx + Math.sin(t * 0.35 + i * 1.3) * 90 + Math.sin(t * 0.8 + i) * 22;
    const y = by + Math.cos(t * 0.3 + i * 2.1) * 60 + Math.sin(t * 0.9 + i * 3) * 14;
    const ph = t * (0.5 + hash(seed + i) * 0.7) + i * 9;
    const blink = Math.pow(Math.max(0, Math.sin(ph)), 3);
    const r = size * (0.6 + hash(seed + i * 5.1) * 0.8);
    c.globalAlpha = alpha * (0.12 + 0.88 * blink);
    c.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = alpha * blink;
    c.drawImage(glowSprite("255,255,230"), x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6);
  }
  c.restore();
}

export function rain(
  c: C2,
  t: number,
  seed: number,
  n: number,
  o: { len?: number; slant?: number; alpha?: number; speed?: number; rgb?: string; width?: number } = {}
) {
  const { len = 70, slant = 0.22, alpha = 0.35, speed = 2600, rgb = "205,225,245", width = 1.5 } = o;
  c.save();
  c.strokeStyle = `rgba(${rgb},${alpha})`;
  c.lineWidth = width;
  c.lineCap = "round";
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = hash(i * 3.1 + seed) * (W + 600) - 100;
    const sp = speed * (0.75 + 0.5 * hash(i * 9.3 + seed));
    const y = mod(hash(i * 5.7 + seed) * (H + len * 2) + t * sp, H + len * 2) - len;
    const x = x0 - y * slant;
    const l = len * (0.6 + hash(i * 1.9 + seed) * 0.8);
    c.moveTo(x, y);
    c.lineTo(x - l * slant, y + l);
  }
  c.stroke();
  c.restore();
}

export function leaves(c: C2, t: number, seed: number, n: number, rgb = "20,60,30", speed = 420) {
  c.save();
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.5 + hash(seed + i * 1.3));
    const x = mod(hash(seed + i * 2.7) * (W + 400) + t * sp, W + 400) - 200;
    const y = hash(seed + i * 4.1) * H + Math.sin(t * 2 + i * 3) * 70;
    const a = t * (2 + hash(seed + i) * 3) + i;
    c.fillStyle = `rgba(${rgb},0.85)`;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.scale(1, 0.38 + 0.62 * Math.abs(Math.sin(a * 0.7)));
    c.beginPath();
    c.ellipse(0, 0, 11 + hash(seed + i * 7) * 12, 5 + hash(seed + i * 8) * 3, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.restore();
}

export function glints(c: C2, t: number, seed: number, n: number, map: (u: number, v: number) => [number, number], u0: number, u1: number, v0: number, v1: number, size = 10) {
  c.save();
  c.globalCompositeOperation = "lighter";
  c.strokeStyle = "rgba(255,245,215,0.9)";
  c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const [x, y] = map(lerp(u0, u1, hash(seed + i * 1.3)), lerp(v0, v1, hash(seed + i * 2.9)));
    const a = Math.pow(Math.max(0, Math.sin(t * (1.2 + hash(seed + i) * 1.6) + i * 5.3)), 6);
    if (a < 0.02) continue;
    const s = size * (0.4 + hash(seed + i * 3.3)) * (0.6 + a * 0.6);
    c.globalAlpha = a;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(x - s, y);
    c.lineTo(x + s, y);
    c.moveTo(x, y - s * 1.6);
    c.lineTo(x, y + s * 1.6);
    c.stroke();
    c.drawImage(glowSprite("255,240,200"), x - s * 1.2, y - s * 1.2, s * 2.4, s * 2.4);
  }
  c.restore();
}

export function birds(c: C2, t: number, seed: number, n: number, o: { y0?: number; y1?: number; speed?: number; size?: number; rgb?: string; dir?: number } = {}) {
  const { y0 = 0.1, y1 = 0.4, speed = 90, size = 22, rgb = "10,25,25", dir = 1 } = o;
  c.save();
  c.strokeStyle = `rgba(${rgb},0.9)`;
  c.lineWidth = 2.6;
  c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const k = 0.7 + hash(seed + i) * 0.6;
    const x = dir > 0 ? mod(hash(seed + i * 1.9) * (W + 300) + t * speed * k, W + 300) - 150 : W + 150 - mod(hash(seed + i * 1.9) * (W + 300) + t * speed * k, W + 300);
    const y = (y0 + (y1 - y0) * hash(seed + i * 2.3)) * H + Math.sin(t * 0.8 + i) * 20 - (x / W) * 40;
    const fl = Math.sin(t * (7 + hash(seed + i) * 3) + i * 2) * 0.9;
    const s = size * (0.6 + hash(seed + i * 3) * 0.7);
    c.beginPath();
    c.moveTo(x - s, y - fl * s * 0.8);
    c.quadraticCurveTo(x - s * 0.4, y - s * 0.1 - fl * s * 0.2, x, y);
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.1 - fl * s * 0.2, x + s, y - fl * s * 0.8);
    c.stroke();
  }
  c.restore();
}

/* ------------------------------------------------------------------ foreground ferns */
function frond(c: C2, bx: number, by: number, ang: number, L: number, t: number, ph: number, sway: number, ca: string, cb: string) {
  const a = ang + Math.sin(t * 0.9 + ph) * 0.04 * sway + Math.sin(t * 2.3 + ph * 2) * 0.012 * sway;
  const curl = Math.cos(a) >= 0 ? 0.7 : -0.7;
  const p0 = [bx, by];
  const p1 = [bx + Math.cos(a) * L * 0.55, by + Math.sin(a) * L * 0.55];
  const p2 = [bx + Math.cos(a + curl * 0.6) * L, by + Math.sin(a + curl * 0.6) * L];
  const N = 15;
  const pa = new Path2D();
  const pb = new Path2D();
  for (let k = 1; k <= N; k++) {
    const u = k / N;
    const x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0];
    const y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1];
    const tx = 2 * (1 - u) * (p1[0] - p0[0]) + 2 * u * (p2[0] - p1[0]);
    const ty = 2 * (1 - u) * (p1[1] - p0[1]) + 2 * u * (p2[1] - p1[1]);
    const ta = Math.atan2(ty, tx);
    const len = L * 0.27 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.75) + L * 0.02;
    const wd = L * 0.032 * (1 - u * 0.5);
    for (const side of [-1, 1]) {
      const la = ta + side * (1.05 - 0.4 * u);
      const tipx = x + Math.cos(la) * len;
      const tipy = y + Math.sin(la) * len;
      const path = side < 0 ? pa : pb;
      path.moveTo(x - Math.sin(la) * wd, y + Math.cos(la) * wd);
      path.lineTo(tipx, tipy);
      path.lineTo(x + Math.sin(la) * wd, y - Math.cos(la) * wd);
      path.closePath();
    }
  }
  c.fillStyle = ca;
  c.fill(pa);
  c.fillStyle = cb;
  c.fill(pb);
}

export function ferns(
  c: C2,
  t: number,
  seed: number,
  o: { n?: number; dark?: string; rim?: string; sway?: number; scale?: number; edge?: "sides" | "all" | "left" | "right"; grow?: number } = {}
) {
  const { n = 9, dark = "rgba(4,18,12,0.96)", rim = "rgba(30,90,60,0.9)", sway = 1, scale = 1, edge = "sides", grow = 0 } = o;
  c.save();
  for (let i = 0; i < n; i++) {
    let x: number;
    const r = hash(seed + i * 1.3);
    const q = hash(seed + i * 2.9);
    if (edge === "all") x = r * W;
    else if (edge === "left") x = q * W * 0.3;
    else if (edge === "right") x = W - q * W * 0.3;
    else x = r < 0.5 ? q * W * 0.3 : W - q * W * 0.3;
    const lean = (x < W / 2 ? -1 : 1) * (0.1 + hash(seed + i * 5.5) * 0.65);
    const ang = -Math.PI / 2 + lean;
    const L = (260 + hash(seed + i * 7.7) * 360) * scale * (1 + grow);
    frond(c, x, H + 30, ang, L, t, i * 1.7, sway, dark, rim);
  }
  c.restore();
}

/* ------------------------------------------------------------------ grading overlays */
export function flash(c: C2, a: number, rgb = "255,255,255") {
  if (a <= 0.003) return;
  c.save();
  c.fillStyle = `rgba(${rgb},${clamp(a)})`;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function desat(c: C2, amt: number) {
  if (amt <= 0.005) return;
  c.save();
  c.globalCompositeOperation = "saturation";
  c.fillStyle = `rgba(128,128,128,${clamp(amt)})`;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function tint(c: C2, color: string, mode: GlobalCompositeOperation = "multiply") {
  c.save();
  c.globalCompositeOperation = mode;
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function vignette(c: C2, strength = 0.5, rgb = "0,0,0", inner = 0.35) {
  if (strength <= 0.003) return;
  c.save();
  const gr = c.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, W * 0.62);
  gr.addColorStop(0, `rgba(${rgb},0)`);
  gr.addColorStop(1, `rgba(${rgb},${clamp(strength)})`);
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function black(c: C2, a: number) {
  if (a <= 0.002) return;
  c.save();
  c.fillStyle = `rgba(0,0,0,${clamp(a)})`;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/* ------------------------------------------------------------------ typography */
export function wrapText(c: C2, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (c.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function caption(c: C2, text: string, a: number, o: { size?: number; y?: number; color?: string } = {}) {
  if (a <= 0.01) return;
  const size = o.size ?? 38;
  c.save();
  spacing(c, 0.5);
  c.font = `500 ${size}px ${F.cap}`;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  const lines = wrapText(c, text, W * 0.74);
  const lh = size * 1.3;
  const base = (o.y ?? H - 62) - (lines.length - 1) * lh;
  // soft gradient scrim for legibility
  const scrim = c.createLinearGradient(0, H - 230, 0, H);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, `rgba(0,0,0,${0.45 * a})`);
  c.fillStyle = scrim;
  c.fillRect(0, H - 230, W, 230);
  c.globalAlpha = a;
  c.lineJoin = "round";
  c.lineWidth = 8;
  c.strokeStyle = "rgba(0,0,0,0.78)";
  c.fillStyle = o.color ?? "#fff8ec";
  lines.forEach((l, i) => {
    const y = base + i * lh + (1 - a) * 8;
    c.strokeText(l, W / 2, y);
    c.fillText(l, W / 2, y);
  });
  c.restore();
}

export function mono(c: C2, text: string, x: number, y: number, size = 20, color = "#e8fff6", align: CanvasTextAlign = "left", sp = 3, alpha = 1) {
  c.save();
  spacing(c, sp);
  c.font = `400 ${size}px ${F.mono}`;
  c.textAlign = align;
  c.fillStyle = color;
  c.globalAlpha = alpha;
  c.fillText(text, x, y);
  c.restore();
}

/** letter-by-letter reveal, each rising 8-12px on ease-out-expo (one frame apart feel) */
export function typeText(
  c: C2,
  text: string,
  x: number,
  y: number,
  t0: number,
  t: number,
  o: { font: string; color: string; per?: number; rise?: number; sp?: number; align?: CanvasTextAlign; dur?: number }
) {
  const { font, color, per = 0.035, rise = 12, sp = 0, align = "left", dur = 0.55 } = o;
  c.save();
  spacing(c, 0);
  c.font = font;
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
  const widths = [...text].map((ch) => c.measureText(ch).width + sp);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  c.fillStyle = color;
  [...text].forEach((ch, i) => {
    const k = E.outExpo(prog(t, t0 + i * per, t0 + i * per + dur));
    if (k > 0) {
      c.globalAlpha = k;
      c.fillText(ch, cx, y + (1 - k) * rise);
    }
    cx += widths[i];
  });
  c.restore();
}

export function chapterCard(c: C2, lt: number, num: string, title: string, jp: string, dur = 3.6) {
  if (lt < 0 || lt > dur) return;
  const inK = E.outExpo(prog(lt, 0, 0.7));
  const outK = E.inOutCubic(prog(lt, dur - 0.7, dur));
  const x = lerp(-W, 0, inK) + outK * W * 0.9;
  c.save();
  c.translate(x, 0);
  const y0 = H * 0.5 - 130;
  const hh = 250;
  // slanted dark band
  c.fillStyle = "rgba(4,10,9,0.82)";
  c.beginPath();
  c.moveTo(0, y0);
  c.lineTo(1250, y0);
  c.lineTo(1170, y0 + hh);
  c.lineTo(0, y0 + hh);
  c.closePath();
  c.fill();
  c.fillStyle = "#ff7a2f";
  c.beginPath();
  c.moveTo(1250, y0);
  c.lineTo(1270, y0);
  c.lineTo(1190, y0 + hh);
  c.lineTo(1170, y0 + hh);
  c.closePath();
  c.fill();
  c.restore();
  c.save();
  c.translate(x, 0);
  mono(c, num, 120, y0 + 62, 24, "#ff9a5c", "left", 8);
  typeText(c, title, 116, y0 + 168, 0.25, lt, { font: `130px ${F.title}`, color: "#fff7ea", per: 0.03, rise: 14, sp: 4 });
  c.font = `500 28px ${F.serif}`;
  c.fillStyle = "rgba(255,240,220,0.7)";
  c.globalAlpha = E.outCubic(prog(lt, 0.8, 1.4));
  c.fillText(jp, 124, y0 + 222);
  c.restore();
}

export function speedLines(
  c: C2,
  t: number,
  cx: number,
  cy: number,
  o: { n?: number; inner?: number; color?: string; seed?: number; fps?: number } = {}
) {
  const { n = 110, inner = 180, color = "#000", seed = 5, fps = 12 } = o;
  const f = Math.floor(t * fps);
  c.save();
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i * 1.7 + f * 0.31) * Math.PI * 2;
    const wd = 0.004 + hash(seed + i * 3.3 + f * 0.7) * 0.02;
    const r0 = inner * (0.7 + hash(seed + i * 5.1 + f) * 0.9);
    const r1 = 2400;
    c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    c.lineTo(cx + Math.cos(a - wd) * r1, cy + Math.sin(a - wd) * r1);
    c.lineTo(cx + Math.cos(a + wd) * r1, cy + Math.sin(a + wd) * r1);
    c.closePath();
  }
  c.fill();
  c.restore();
}

/* ------------------------------------------------------------------ HUD pieces */
export function rec(c: C2, g: number, a = 1, extra = "") {
  const on = Math.floor(g) % 2 === 0;
  c.save();
  c.globalAlpha = a;
  if (on) {
    c.fillStyle = "#ff3b30";
    c.beginPath();
    c.arc(74, 66, 9, 0, Math.PI * 2);
    c.fill();
    glow(c, 74, 66, 28, "255,60,50", 0.5 * a);
  }
  c.restore();
  const s = Math.floor(g);
  const m = Math.floor(s / 60);
  mono(c, `REC  00:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}${extra}`, 98, 73, 20, "#f4fff9", "left", 3, a * 0.9);
}

export function batteryIcon(c: C2, x: number, y: number, pct: number, a = 1) {
  const low = pct < 5;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = low ? "#ff5a4a" : "#d8fff0";
  c.lineWidth = 2.5;
  c.strokeRect(x, y, 46, 22);
  c.fillStyle = c.strokeStyle;
  c.fillRect(x + 47, y + 6, 4, 10);
  const blink = low && Math.floor(performance_free_blink(pct)) % 2 === 0;
  if (!blink) c.fillRect(x + 4, y + 4, Math.max(2, (pct / 100) * 38 * 4), 14);
  c.restore();
  mono(c, `${String(Math.round(pct)).padStart(2, "0")}%`, x + 64, y + 19, 20, low ? "#ff8a7a" : "#e8fff6", "left", 2, a);
}
// deterministic helper (no clock): blink phase derived from battery value granularity
function performance_free_blink(p: number) {
  return Math.floor(p * 1000) % 2;
}

export function ring(c: C2, x: number, y: number, r: number, a: number, rgb = "150,255,225", w = 3) {
  if (a <= 0.01) return;
  c.save();
  c.strokeStyle = `rgba(${rgb},${a})`;
  c.lineWidth = w;
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** procedural bark texture for macro / close-up shots */
export function bark(c: C2, t: number, seed: number, o: { ox?: number; oy?: number; dark?: number; wet?: number } = {}) {
  const { ox = 0, oy = 0, dark = 0, wet = 0.4 } = o;
  const g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#2b1d12");
  g.addColorStop(0.5, "#4a3320");
  g.addColorStop(1, "#24170e");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.save();
  for (let x = -20; x < W + 20; x += 7) {
    const n = hash(seed + Math.floor((x + ox) / 7) * 1.3);
    const wob = Math.sin((x + ox) * 0.011 + seed) * 40;
    const w = 3 + n * 8;
    c.fillStyle = `rgba(${15 + n * 40},${9 + n * 26},${5 + n * 14},${0.5 + n * 0.4})`;
    c.beginPath();
    c.moveTo(x, 0);
    for (let y = 0; y <= H; y += 90) c.lineTo(x + Math.sin((y + oy) * 0.006 + x * 0.05) * 9 + wob * (y / H) * 0.3, y);
    c.lineTo(x + w, H);
    c.lineTo(x + w, 0);
    c.closePath();
    c.fill();
  }
  // cracks / ridges
  c.strokeStyle = "rgba(0,0,0,0.5)";
  c.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const x = hash(seed + i * 4.1) * W;
    c.beginPath();
    c.moveTo(x, -10);
    for (let y = 0; y <= H + 40; y += 60) c.lineTo(x + Math.sin(y * 0.01 + i) * 30, y);
    c.stroke();
  }
  // highlights (wet sheen)
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 18; i++) {
    const x = hash(seed + i * 7.7) * W;
    const gr = c.createLinearGradient(x, 0, x + 40, 0);
    gr.addColorStop(0, "rgba(160,190,150,0)");
    gr.addColorStop(0.5, `rgba(190,215,170,${0.09 * wet * 2.5})`);
    gr.addColorStop(1, "rgba(160,190,150,0)");
    c.fillStyle = gr;
    c.fillRect(x, 0, 40, H);
  }
  // moss glow
  for (let i = 0; i < 7; i++) {
    glow(c, hash(seed + i * 9.1) * W, hash(seed + i * 3.3) * H, 260 + hash(seed + i) * 200, "70,130,50", 0.2);
  }
  c.restore();
  if (dark > 0) black(c, dark);
  void t;
}

export { E, prog };
