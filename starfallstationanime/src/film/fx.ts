import { Ctx, W, H, rng, hash, noise, lerp, clamp, makeCanvas } from './util';

// ---------- light ----------
export function glow(c: Ctx, x: number, y: number, r: number, rgb: string, a = 1, op: GlobalCompositeOperation = 'lighter') {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.3, `rgba(${rgb},${a * 0.38})`);
  g.addColorStop(0.65, `rgba(${rgb},${a * 0.09})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.save();
  c.globalCompositeOperation = op;
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

// anamorphic horizontal streak
export function streak(c: Ctx, x: number, y: number, len: number, thick: number, rgb: string, a = 1) {
  c.save();
  c.translate(x, y);
  c.scale(len / thick, 1);
  glow(c, 0, 0, thick, rgb, a);
  c.restore();
}

export function sparkle4(c: Ctx, x: number, y: number, r: number, rot: number, rgb: string, a = 1) {
  if (r <= 0.2 || a <= 0) return;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(${rgb},${a})`;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 === 0 ? r : r * 0.14;
    const an = (i / 8) * Math.PI * 2;
    c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
  }
  c.closePath();
  c.fill();
  c.restore();
}

// The hero object: the fallen star
export function heroStar(c: Ctx, x: number, y: number, r: number, t: number, power = 1) {
  const pulse = 0.88 + 0.12 * Math.sin(t * 3.1);
  glow(c, x, y, r * 7 * pulse, '255,190,120', 0.35 * power);
  glow(c, x, y, r * 3.2, '255,225,170', 0.6 * power);
  streak(c, x, y, r * 11, r * 0.55, '255,235,200', 0.55 * power);
  sparkle4(c, x, y, r * 2.6 * pulse, t * 0.35, '255,244,222', 0.95 * power);
  sparkle4(c, x, y, r * 1.7, t * 0.35 + Math.PI / 4, '255,214,160', 0.7 * power);
  glow(c, x, y, r * 1.1, '255,255,255', 1 * power);
}

// ---------- sky + water ----------
export function skyRect(img: HTMLImageElement, horizonY: number, zoom: number, panX: number) {
  const pw = W * zoom;
  const ph = (pw * img.height) / img.width;
  return { px: (W - pw) / 2 + panX, py: horizonY - ph, pw, ph };
}

export function drawSky(c: Ctx, img: HTMLImageElement, horizonY: number, zoom = 1.12, panX = 0) {
  const r = skyRect(img, horizonY, zoom, panX);
  if (r.py > 0) c.drawImage(img, 0, 0, img.width, 3, r.px, -2, r.pw, r.py + 4);
  c.drawImage(img, r.px, r.py, r.pw, r.ph);
}

export interface WaterOpts {
  zoom: number;
  panX: number;
  tint: string; // 'r,g,b'
  tintTop?: number;
  tintBot?: number;
  amp?: number;
  calm?: number; // 0..1 scale ripple
}

export function drawWater(c: Ctx, img: HTMLImageElement, hy: number, t: number, o: WaterOpts) {
  const r = skyRect(img, hy, o.zoom, o.panX);
  const wh = H - hy + 8;
  const amp = (o.amp ?? 7) * (o.calm ?? 1);
  const step = 2;
  const iw = img.width;
  const ih = img.height;
  for (let dy = 0; dy < wh; dy += step) {
    const p = dy / wh;
    const k = 0.92; // slight compression so reflected sky reads deeper
    const srcDist = dy * k;
    const row = ih - (srcDist / r.ph) * ih;
    const sh = (step * k) / r.ph * ih;
    if (row - sh < 0) break;
    const off =
      (Math.sin(dy * 0.045 + t * 1.2) + 0.5 * Math.sin(dy * 0.13 - t * 0.9) + 0.5 * noise(dy * 0.03 + t * 0.5)) *
      amp *
      (0.1 + p * 0.9);
    c.drawImage(img, 0, row - sh, iw, sh, r.px + off, hy + dy, r.pw, step + 0.8);
  }
  // water body tint: clear near horizon, deeper in the foreground
  const g = c.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, `rgba(${o.tint},${o.tintTop ?? 0.08})`);
  g.addColorStop(0.35, `rgba(${o.tint},${(o.tintTop ?? 0.08) + 0.2})`);
  g.addColorStop(1, `rgba(${o.tint},${o.tintBot ?? 0.62})`);
  c.fillStyle = g;
  c.fillRect(0, hy, W, H - hy);
}

// Draw a flipped copy of whatever fn draws; mirror axis is baseY.
export function reflect(c: Ctx, baseY: number, fn: () => void, alpha = 0.4) {
  c.save();
  c.beginPath();
  c.rect(0, baseY, W, H - baseY);
  c.clip();
  c.globalAlpha *= alpha;
  c.translate(0, baseY);
  c.scale(1, -1);
  c.translate(0, -baseY);
  fn();
  c.restore();
}

// broken ripple bands that interrupt reflections (water-coloured)
export function rippleBands(c: Ctx, y0: number, t: number, rgb: string, a = 0.5, seed = 1) {
  c.save();
  c.fillStyle = `rgba(${rgb},${a * 0.4})`;
  for (let y = y0; y < H; y += 6) {
    const p = (y - y0) / (H - y0);
    for (let k = 0; k < 3; k++) {
      const h1 = hash(y * 0.37 + k * 11.1 + seed);
      const speed = (6 + 30 * p) * (h1 - 0.5);
      const len = (80 + 520 * hash(y + k * 5.5 + seed)) * (0.5 + p);
      const x = (((hash(y * 1.7 + k + seed) * (W + 600) + t * speed) % (W + 600)) + (W + 600)) % (W + 600) - 300;
      c.fillRect(x, y, len, 1 + 1.6 * p * hash(y * 3.1 + k));
    }
  }
  c.restore();
}

// shimmering highlights on the water
export function shimmer(c: Ctx, y0: number, t: number, rgb: string, density = 1, seed = 3) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const n = Math.floor(110 * density);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = r() * W;
    const py = y0 + Math.pow(r(), 1.4) * (H - y0);
    const p = (py - y0) / (H - y0);
    const tw = Math.max(0, Math.sin(t * (1.3 + r() * 2.2) + r() * 40));
    const len = (10 + 60 * r()) * (0.4 + p);
    c.fillStyle = `rgba(${rgb},${0.55 * tw * (0.3 + p * 0.7)})`;
    c.fillRect(px, py, len, 1 + p * 1.8);
  }
  c.restore();
}

// column of light on water under a source at x: soft glow + twinkling dashes
export function lightColumn(c: Ctx, x: number, y0: number, rgb: string, a: number, t: number, spread = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const R = 120 * spread;
  c.save();
  c.translate(x, y0);
  c.scale(1, (H - y0) / R);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, `rgba(${rgb},${a * 0.55})`);
  g.addColorStop(0.5, `rgba(${rgb},${a * 0.16})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(-R, 0, R * 2, R);
  c.restore();
  const rr = rng(7);
  for (let i = 0; i < 150; i++) {
    const p = Math.pow(rr(), 1.2);
    const y = y0 + p * (H - y0);
    const env = lerp(6, 150, p) * spread;
    const xo = (rr() * 2 - 1) * env * 0.9;
    const len = lerp(10, 90, p) * (0.5 + rr());
    const tw = Math.max(0, Math.sin(t * (1 + rr() * 2) + rr() * 30));
    c.fillStyle = `rgba(${rgb},${a * (1 - p * 0.5) * tw})`;
    c.fillRect(x + xo - len / 2, y, len, 1 + p * 2.2);
  }
  c.restore();
}

// ---------- clouds ----------
export function makeCloud(seed: number, w: number, h: number, lit: string, mid: string, shade: string) {
  const cv = makeCanvas(w, h);
  const c = cv.getContext('2d')!;
  const r = rng(seed);
  const blobs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 50; i++) {
    const u = r();
    const x = w * (0.1 + 0.8 * u);
    const dome = Math.pow(Math.sin(u * Math.PI), 0.8);
    const rad = h * (0.07 + 0.13 * r()) * (0.5 + 0.8 * dome);
    const y = h * 0.8 - dome * h * 0.5 * Math.pow(r(), 0.7) - rad * 0.1;
    blobs.push({ x, y, r: rad });
  }
  blobs.sort((a, b) => a.y - b.y);
  for (const b of blobs) {
    c.save();
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = shade;
    c.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    c.fillStyle = mid;
    c.beginPath();
    c.arc(b.x + b.r * 0.16, b.y - b.r * 0.2, b.r * 0.92, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = lit;
    c.beginPath();
    c.arc(b.x + b.r * 0.3, b.y - b.r * 0.36, b.r * 0.62, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.globalCompositeOperation = 'destination-out';
  const f = c.createLinearGradient(0, h * 0.66, 0, h * 0.95);
  f.addColorStop(0, 'rgba(0,0,0,0)');
  f.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = f;
  c.fillRect(0, 0, w, h);
  return cv;
}

export function drawBirds(c: Ctx, t: number, x0: number, y0: number, speed: number, n: number, size: number, col: string, seed = 5) {
  const r = rng(seed);
  c.save();
  c.strokeStyle = col;
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ox = (r() - 0.2) * 260 * (1 + i * 0.12);
    const oy = (r() - 0.5) * 90;
    const bx = ((x0 - t * speed + ox + 4000) % 2600) - 300;
    const by = y0 + oy + Math.sin(t * 0.8 + i) * 6;
    const ph = Math.floor(t * 12 + i * 2.3);
    const flap = Math.sin(ph * 1.7) * 0.9;
    const s = size * (0.7 + r() * 0.6);
    c.lineWidth = Math.max(1, s * 0.12);
    c.beginPath();
    c.moveTo(bx - s, by + flap * s * 0.5);
    c.quadraticCurveTo(bx - s * 0.4, by - s * 0.4 - flap * s * 0.3, bx, by);
    c.quadraticCurveTo(bx + s * 0.4, by - s * 0.4 - flap * s * 0.3, bx + s, by + flap * s * 0.5);
    c.stroke();
  }
  c.restore();
}

// drifting motes of light
export function motes(c: Ctx, t: number, region: [number, number, number, number], n: number, rgb: string, seed = 9, rise = 14, size = 2.2) {
  const [x0, y0, x1, y1] = region;
  const r = rng(seed);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = lerp(x0, x1, r());
    const by0 = lerp(y0, y1, r());
    const sp = rise * (0.5 + r());
    const span = y1 - y0;
    const y = y1 - ((((by0 - y0) + t * sp) % span) + span) % span;
    const x = bx + Math.sin(t * (0.4 + r()) + r() * 9) * 18 + noise(i + t * 0.3) * 10;
    const life = (y1 - y) / span;
    const a = Math.sin(life * Math.PI) * (0.4 + 0.6 * Math.abs(Math.sin(t * (1 + r() * 2) + i)));
    const s = size * (0.5 + r());
    glow(c, x, y, s * 4, rgb, 0.35 * a);
    c.fillStyle = `rgba(255,255,255,${0.9 * a})`;
    c.fillRect(x - s / 2, y - s / 2, s, s);
  }
  c.restore();
}

export function vignetteRect(c: Ctx, a = 0.5) {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

export function vgrad(c: Ctx, y0: number, y1: number, stops: [number, string][], x = 0, w = W, op: GlobalCompositeOperation = 'source-over') {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.save();
  c.globalCompositeOperation = op;
  c.fillStyle = g;
  c.fillRect(x, y0, w, y1 - y0);
  c.restore();
}

export const lim = clamp;
