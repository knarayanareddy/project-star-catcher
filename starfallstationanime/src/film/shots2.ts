import { Ctx, W, H, clamp, lerp, prog, smooth, eio, eioq, eoc, rng, noise, hash } from './util';
import { glow, streak, sparkle4, heroStar, vgrad, motes } from './fx';
import { drawGirl, drawTrain, steam } from './characters';
import { ShotFn, Assets } from './assets';
import { nightSky } from './shots1';

function plateCover(c: Ctx, img: HTMLImageElement, zoom: number, offX: number, offY: number) {
  const pw = W * zoom;
  const ph = (pw * img.height) / img.width;
  const x = (W - pw) / 2 + offX;
  if (offY > 0) c.drawImage(img, 0, 0, img.width, 3, x, -2, pw, offY + 4);
  c.drawImage(img, x, offY, pw, ph);
  return { x, y: offY, pw, ph };
}

function skySparkles(c: Ctx, t: number, n: number, y0: number, y1: number, amount: number, seed: number, rgb = '235,240,255') {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = lerp(y0, y1, Math.pow(r(), 0.8));
    const sz = 2 + r() * 4;
    const vis = clamp(amount * 1.6 - r() * 0.6);
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2.5) + r() * 30);
    sparkle4(c, x, y, sz * 1.8, 0, rgb, vis * (0.4 + 0.6 * tw));
  }
}

// ================= SHOT 6 : the climb =================
export const shotClimb: ShotFn = (c, t, d, A) => {
  const p = prog(t, 0, d);
  const th = lerp(0.12, 0.34, eio(p));
  const SPEED = 950;
  const RAIL = 585;
  c.save();
  c.translate(W * 0.5, H * 0.55);
  c.rotate(-th);
  c.translate(-W * 0.5, -H * 0.55);
  const img = A.cloudsea;
  const pw = W * 2.4;
  const ph = (pw * img.height) / img.width;
  const Hy = lerp(330, 700, eio(p));
  const px = (W - pw) / 2 + lerp(300, -300, p);
  const py = Hy - 0.404 * ph;
  c.drawImage(img, 0, 0, img.width, 3, px, py - 600, pw, 602);
  c.drawImage(img, px, py, pw, ph);
  const sunX = px + 0.727 * pw;
  glow(c, sunX, Hy, 900, '255,190,130', 0.55);
  streak(c, sunX, Hy, 2000, 24, '255,215,160', 0.6);

  const cl = A.cloudsPink;
  const drawLayer = (n: number, spd: number, yOff: number, sc: number, alpha: number, spacing: number, seed: number) => {
    c.save();
    c.globalAlpha = alpha;
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const period = n * spacing;
      const x = ((i * spacing - t * SPEED * spd) % period + period) % period - 700 * sc;
      const y = Hy + yOff + (r() - 0.5) * 80 * sc;
      const k = Math.floor(r() * 5);
      c.drawImage(cl[k], x, y - 150 * sc, 760 * sc, 300 * sc);
    }
    c.restore();
  };
  drawLayer(8, 0.16, 20, 0.8, 0.9, 420, 5);
  drawLayer(6, 0.45, 150, 1.3, 0.95, 640, 6);

  // trestle
  c.fillStyle = '#1a1244';
  c.fillRect(-900, RAIL, W + 1800, 14);
  c.fillStyle = 'rgba(255,190,150,0.6)';
  c.fillRect(-900, RAIL, W + 1800, 2);
  for (let i = 0; i < 14; i++) {
    const x = ((i * 260 - t * SPEED) % 3640 + 3640) % 3640 - 900;
    const g = c.createLinearGradient(0, RAIL + 14, 0, RAIL + 560);
    g.addColorStop(0, '#1a1244');
    g.addColorStop(1, 'rgba(26,18,68,0)');
    c.fillStyle = g;
    c.fillRect(x - 9, RAIL + 14, 18, 546);
    c.fillStyle = 'rgba(255,190,150,0.5)';
    c.fillRect(x + 7, RAIL + 14, 2, 300);
  }
  const X = 1450;
  steam(c, t, () => X, { y: RAIL, s: 1.05, dir: 1, drift: -SPEED * 0.95, rise: 60, lit: '#fff0ee', shade: '#b48ac0', life: 2.4, dt: 0.1 });
  drawTrain(c, { x: X, y: RAIL, s: 1.05, dir: 1, dist: t * SPEED, cars: 2, warm: 0.85, rim: '255,175,140', glowWin: 0.9, t, bob: noise(t * 8) * 1.4 });
  // clouds rushing past in front
  drawLayer(4, 1.1, 470, 2.0, 0.96, 1500, 7);
  c.save();
  c.globalAlpha = 0.5;
  for (let i = 0; i < 2; i++) {
    const x = ((i * 3300 - t * SPEED * 1.5 + 800) % 6600 + 6600) % 6600 - 2300;
    c.drawImage(cl[(i * 2 + 1) % 5], x, RAIL - 250, 760 * 2.0, 300 * 2.0);
  }
  c.restore();
  c.restore();
  // stars appear as we rise
  skySparkles(c, t, 90, 0, 420, smooth(d * 0.35, d, t), 61);
  vgrad(c, 0, H, [[0, `rgba(70,30,140,${0.38 * p})`], [1, 'rgba(30,10,60,0.18)']]);
  glow(c, W * 0.9, H * 0.55, 600, '255,190,140', 0.18);
};

// ================= THE RING =================
export const RING = { cx: 1180, cy: 300, rx: 520, ry: 470, tilt: -0.18 };

export function ringPoint(i: number, k = 1) {
  const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
  const lx = RING.rx * k * Math.cos(a);
  const ly = RING.ry * k * Math.sin(a);
  const ct = Math.cos(RING.tilt);
  const st = Math.sin(RING.tilt);
  return [RING.cx + lx * ct - ly * st, RING.cy + lx * st + ly * ct];
}

function drawRing(c: Ctx, t: number, lit: number[], all: number) {
  const { cx, cy, rx, ry, tilt } = RING;
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  glow(c, 0, 0, rx * 1.5, '255,170,150', 0.12 + 0.32 * all);
  // stone band
  const g = c.createLinearGradient(-rx * 0.8, ry * 0.8, rx * 0.8, -ry * 0.8);
  g.addColorStop(0, '#090826');
  g.addColorStop(0.5, '#2b2461');
  g.addColorStop(0.78, '#80567f');
  g.addColorStop(1, '#d9a085');
  c.strokeStyle = g;
  c.lineWidth = 78;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.stroke();
  // edges + engraving
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,230,196,0.55)';
  c.beginPath();
  c.ellipse(0, 0, rx + 39, ry + 39, 0, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = 'rgba(255,230,196,0.35)';
  c.beginPath();
  c.ellipse(0, 0, rx - 39, ry - 39, 0, 0, Math.PI * 2);
  c.stroke();
  c.save();
  c.setLineDash([22, 12]);
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,214,160,0.45)';
  [0, 18, -18].forEach((o) => {
    c.beginPath();
    c.ellipse(0, 0, rx + o, ry + o, 0, 0, Math.PI * 2);
    c.stroke();
  });
  c.restore();
  c.strokeStyle = 'rgba(5,3,25,0.45)';
  c.lineWidth = 2;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    c.beginPath();
    c.moveTo((rx - 39) * Math.cos(a), (ry - 39) * Math.sin(a));
    c.lineTo((rx + 39) * Math.cos(a), (ry + 39) * Math.sin(a));
    c.stroke();
  }
  // light travelling through the band
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const L = lit[i];
    if (L <= 0) continue;
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    c.strokeStyle = `rgba(255,200,130,${0.2 * L})`;
    c.lineWidth = 70;
    c.beginPath();
    c.ellipse(0, 0, rx, ry, 0, a - 0.3, a + 0.3);
    c.stroke();
  }
  // constellation lines
  for (let i = 0; i < 12; i++) {
    const j = (i + 5) % 12;
    const a1 = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const a2 = -Math.PI / 2 + (j / 12) * Math.PI * 2;
    const m = Math.min(lit[i], lit[j]);
    c.strokeStyle = m > 0 ? `rgba(255,222,170,${0.15 + 0.55 * m})` : 'rgba(150,200,255,0.1)';
    c.lineWidth = m > 0 ? 2 : 1.4;
    c.beginPath();
    c.moveTo((rx - 45) * Math.cos(a1), (ry - 45) * Math.sin(a1));
    c.lineTo((rx - 45) * Math.cos(a2), (ry - 45) * Math.sin(a2));
    c.stroke();
  }
  c.restore();
  // sockets
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    const r = i === 0 ? 36 : 26;
    c.fillStyle = '#06041a';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,214,150,0.65)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(x, y, r + 3, 0, Math.PI * 2);
    c.stroke();
    if (i === 0) {
      c.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const aa = (k / 4) * Math.PI * 2 + Math.PI / 4;
        c.beginPath();
        c.moveTo(x + Math.cos(aa) * (r + 5), y + Math.sin(aa) * (r + 5));
        c.lineTo(x + Math.cos(aa) * (r + 22), y + Math.sin(aa) * (r + 22));
        c.stroke();
      }
    }
    const L = lit[i];
    if (L > 0) {
      glow(c, x, y, 150 * L + 30, '255,210,150', 0.9 * L);
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(255,255,240,${L})`);
      rg.addColorStop(1, `rgba(255,200,130,${L * 0.8})`);
      c.fillStyle = rg;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      sparkle4(c, x, y, 70 * L, t * 0.2, '255,244,220', 0.9 * L);
    }
  }
  // orbiting fragments
  for (let k = 0; k < 18; k++) {
    const a = k * 0.36 + t * 0.025 * (1 + (k % 3) * 0.3);
    const f = 1.17 + 0.12 * hash(k * 3.1);
    const x = rx * f * Math.cos(a);
    const y = ry * f * Math.sin(a);
    const sz = 6 + 14 * hash(k + 7);
    c.save();
    c.translate(x, y);
    c.rotate(a * 3 + k);
    c.fillStyle = '#2b2358';
    c.beginPath();
    c.moveTo(-sz, -sz * 0.4);
    c.lineTo(sz * 0.2, -sz);
    c.lineTo(sz, sz * 0.3);
    c.lineTo(-sz * 0.3, sz * 0.8);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,200,170,0.6)';
    c.lineWidth = 1.5;
    c.stroke();
    c.restore();
  }
  c.restore();
}

const DOCK_Y = 720;
function drawDock(c: Ctx, A: Assets, t: number, trainX: number) {
  // track + dock
  c.fillStyle = '#171040';
  c.fillRect(-900, DOCK_Y, 3200, 10);
  c.fillStyle = 'rgba(255,190,150,0.5)';
  c.fillRect(-900, DOCK_Y, 3200, 2);
  for (let x = -900; x < 2300; x += 150) {
    const g = c.createLinearGradient(0, DOCK_Y, 0, DOCK_Y + 360);
    g.addColorStop(0, '#171040');
    g.addColorStop(1, 'rgba(23,16,64,0)');
    c.fillStyle = g;
    c.fillRect(x - 6, DOCK_Y + 10, 12, 350);
  }
  c.fillStyle = '#120c34';
  c.fillRect(640, DOCK_Y - 2, 900, 24);
  c.fillStyle = 'rgba(255,200,150,0.6)';
  c.fillRect(640, DOCK_Y - 2, 900, 2);
  // dock lamps
  [900, 1220, 1500].forEach((x, i) => {
    c.fillStyle = '#120c34';
    c.fillRect(x - 2, DOCK_Y - 70, 4, 70);
    glow(c, x, DOCK_Y - 74, 70, '255,200,130', 0.55 + 0.1 * Math.sin(t * 2 + i));
  });
  void A;
  drawTrain(c, { x: trainX, y: DOCK_Y, s: 0.36, dir: 1, dist: trainX * 2, cars: 2, warm: 0.7, rim: '255,180,150', glowWin: 0.9, t });
}

function cloudBank(c: Ctx, A: Assets, t: number, yBase: number, scale: number, alpha: number, spd: number, seed: number, n = 7) {
  const r = rng(seed);
  c.save();
  c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const period = n * 520 * scale;
    const x = ((i * 520 * scale - t * spd) % period + period) % period - 800 * scale;
    const y = yBase + (r() - 0.5) * 70 * scale;
    c.drawImage(A.cloudsViolet[Math.floor(r() * 5)], x, y - 150 * scale, 760 * scale, 300 * scale);
  }
  c.restore();
}

// ================= SHOT 7 : the arch =================
export const shotArch: ShotFn = (c, t, d, A) => {
  const p = prog(t, 0, d);
  const e = eio(p);
  const z = lerp(1.0, 1.1, e);
  const Fy = lerp(335, 402, e);
  const Fx = 960;
  plateCover(c, A.cloudsea, 2.0, -200, -270 + (402 - Fy) * 0.3 * z);
  vgrad(c, 0, H, [[0, 'rgba(40,20,100,0.25)'], [1, 'rgba(40,20,100,0)']]);
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-Fx, -Fy);
  // the star-loom
  const idle = 0.12 + 0.1 * Math.sin(t * 1.4);
  drawRing(c, t, [idle, ...new Array(11).fill(0)], 0);
  cloudBank(c, A, t, 800, 1.2, 0.9, 22, 8, 8);
  const X = lerp(60, 780, eio(prog(t, 0.5, d - 0.5)));
  drawDock(c, A, t, X);
  steam(c, t, (tt) => lerp(60, 780, eio(prog(tt, 0.5, d - 0.5))), { y: DOCK_Y, s: 0.36, dir: 1, drift: -10, rise: 18, lit: '#ffd9cf', shade: '#9a74b4', life: 3, dt: 0.2 });
  cloudBank(c, A, t, 930, 1.9, 0.95, 34, 9, 5);
  c.restore();
  skySparkles(c, t, 70, 0, 320, smooth(0, 3, t) * 0.8, 71);
  motes(c, t, [0, 0, W, H], 30, '255,215,190', 33, 12, 2.2);
  vgrad(c, 0, H, [[0, 'rgba(20,10,60,0.15)'], [1, 'rgba(20,10,50,0.3)']]);
};

// ================= SHOT 9 : the offering =================
export const shotOffering: ShotFn = (c, t, d, A) => {
  const S = ringPoint(0);
  const camE = eio(prog(t, 4.5, 8.8));
  const back = eioq(prog(t, 9.6, d));
  let z = lerp(1.1, 1.55, camE) + 0.04 * prog(t, 0, 4.5);
  let Fx = lerp(960, S[0], camE);
  let Fy = lerp(402, S[1] + 70, camE);
  z = lerp(z, 0.82, back);
  Fx = lerp(Fx, 1180, back);
  Fy = lerp(Fy, 270, back);
  const shk = 14 * Math.exp(-Math.max(0, t - 8.8) * 5) * (t > 8.8 ? 1 : 0);
  const allLit = smooth(9, 11.5, t);

  plateCover(c, A.cloudsea, 2.0, -200 - (Fx - 960) * 0.15, -270 + (402 - Fy) * 0.3 * z);
  c.save();
  c.translate(W / 2 + noise(t * 40) * shk, H / 2 + noise(t * 40 + 5) * shk);
  c.scale(z, z);
  c.translate(-Fx, -Fy);

  // ring + sockets igniting clockwise
  const lit: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t0 = i === 0 ? 8.7 : 9.0 + (i - 1) * 0.17;
    lit.push(smooth(t0, t0 + 0.35, t) * (0.9 + 0.1 * Math.sin(t * 3 + i)));
  }
  // god rays
  if (allLit > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(RING.cx, RING.cy);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + t * 0.05;
      const w = 0.045;
      const g = c.createLinearGradient(0, 0, Math.cos(a) * 1700, Math.sin(a) * 1700);
      g.addColorStop(0, `rgba(255,214,160,${0.17 * allLit})`);
      g.addColorStop(1, 'rgba(255,214,160,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a - w) * 1700, Math.sin(a - w) * 1700);
      c.lineTo(Math.cos(a + w) * 1700, Math.sin(a + w) * 1700);
      c.fill();
    }
    c.restore();
  }
  drawRing(c, t, lit, allLit);
  cloudBank(c, A, t, 800, 1.2, 0.9, 22, 8, 8);
  drawDock(c, A, t, 780);
  steam(c, t, () => 780, { y: DOCK_Y, s: 0.36, dir: 1, drift: -10, rise: 18, lit: '#ffd9cf', shade: '#9a74b4', life: 3, dt: 0.2 });

  // Mio on the dock
  const holding = t < 3.6;
  const gh = drawGirl(c, {
    x: 880, y: DOCK_Y - 2, s: 0.8, pose: 'stand', dir: 1, t, hold: holding,
    body: '#2a2050', hair: '#1a1238', scarf: '#f0604c', rim: '255,190,140', rimSide: -1, amb: '255,170,170', wind: 0.7,
  });
  // the star
  const P0 = [gh.hx, gh.hy];
  const P1 = [gh.hx + 50, gh.hy - 170];
  const Cc = [gh.hx - 300, (gh.hy - 170 + S[1]) / 2 + 250];
  const pos = (tt: number) => {
    if (tt < 3.5) return [P0[0], P0[1] + Math.sin(tt * 2) * 1.5];
    if (tt < 5) {
      const e = eoc(prog(tt, 3.5, 5));
      return [lerp(P0[0], P1[0], e), lerp(P0[1], P1[1], e) + Math.sin(tt * 3) * 3];
    }
    const u = eio(prog(tt, 5, 8.8));
    const m = 1 - u;
    return [m * m * P1[0] + 2 * m * u * Cc[0] + u * u * S[0], m * m * P1[1] + 2 * m * u * Cc[1] + u * u * S[1]];
  };
  if (t < 8.8) {
    const [sx, sy] = pos(t);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'butt';
    let px = sx;
    let py = sy;
    if (t > 3.5) {
      for (let k = 1; k <= 26; k++) {
        const [x, y] = pos(Math.max(3.5, t - k * 0.035));
        const f = 1 - k / 27;
        c.strokeStyle = `rgba(255,${Math.round(170 + 70 * f)},${Math.round(110 + 100 * f)},${Math.pow(f, 1.3) * 0.75})`;
        c.lineWidth = 10 * f + 1;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(x, y);
        c.stroke();
        px = x;
        py = y;
        if (k % 3 === 0) sparkle4(c, x + noise(k + t * 5) * 14, y + noise(k * 2 + t * 5) * 14, 5 * f, 0, '255,235,200', 0.8 * f);
      }
    }
    c.restore();
    heroStar(c, sx, sy, 9, t, 1);
    glow(c, sx, sy, 380, '255,210,150', 0.28);
  }
  cloudBank(c, A, t, 930, 1.9, 0.95, 34, 9, 5);

  // shock waves + the sky igniting
  if (t > 10.4) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a2 = t - 10.4 - k * 0.3;
      if (a2 <= 0) continue;
      c.strokeStyle = `rgba(255,226,180,${Math.max(0, 1 - a2 / 2.2) * 0.7})`;
      c.lineWidth = 8;
      c.beginPath();
      c.ellipse(RING.cx, RING.cy, a2 * 1100, a2 * 1000, RING.tilt, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }
  const rs = rng(81);
  for (let i = 0; i < 110; i++) {
    const x = lerp(-500, 2500, rs());
    const y = lerp(-700, 520, rs());
    const dist = Math.hypot(x - RING.cx, y - RING.cy);
    const k = smooth(10.4 + dist / 1100, 10.4 + dist / 1100 + 0.7, t);
    const tw = 0.6 + 0.4 * Math.sin(t * (1 + rs() * 3) + i);
    sparkle4(c, x, y, (6 + rs() * 10) * k * tw, 0, '255,236,200', 0.95 * k);
    glow(c, x, y, 40 * k, '255,220,170', 0.25 * k);
  }
  c.restore();

  // docking flash
  if (t > 8.7) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,238,205,${0.9 * Math.exp(-(t - 8.8) * 3.5)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  motes(c, t, [0, 0, W, H], 40, '255,225,190', 52, 18, 2.4);
  vgrad(c, 0, H, [[0, 'rgba(20,10,60,0.12)'], [1, 'rgba(20,10,50,0.22)']]);
};

// ================= SHOT 10 : rebirth (the sky takes them back) =================
export const shotRebirth: ShotFn = (c, t, _d, A) => {
  nightSky(c, 11.5 - t, A, true, smooth(0, 4, t));
  motes(c, t, [0, 0, W, 640], 90, '255,232,190', 91, 60, 2.6);
  vgrad(c, 0, H, [[0, 'rgba(255,200,150,0.05)'], [1, 'rgba(255,200,150,0.0)']]);
};

// ================= SHOT 12 : title =================
export const shotTitle: ShotFn = (c, t, _d, A) => {
  c.fillStyle = '#04061a';
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = 0.5;
  const img = A.night;
  const pw = W * 1.2;
  c.drawImage(img, (W - pw) / 2 - t * 4, 0, pw, (pw * img.height) / img.width);
  c.restore();
  vgrad(c, 0, H, [[0, 'rgba(4,6,26,0.7)'], [0.5, 'rgba(4,6,26,0.45)'], [1, 'rgba(4,6,26,0.85)']]);
  motes(c, t, [0, 0, W, H], 60, '255,225,190', 5, 16, 2.4);
  const title = 'STARFALL STATION';
  c.save();
  c.textBaseline = 'alphabetic';
  c.font = '500 96px "Cormorant Garamond", "Times New Roman", serif';
  const spacing = 20;
  const widths = [...title].map((ch) => c.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let x = (W - total) / 2;
  [...title].forEach((ch, i) => {
    const a = smooth(0.4 + i * 0.07, 0.4 + i * 0.07 + 0.7, t);
    const rise = (1 - eoc(a)) * 10;
    c.fillStyle = `rgba(255,236,208,${a})`;
    c.shadowColor = `rgba(255,190,120,${0.55 * a})`;
    c.shadowBlur = 24;
    c.fillText(ch, x, 452 + rise);
    x += widths[i];
  });
  c.shadowBlur = 0;
  const a2 = smooth(2.0, 2.8, t);
  c.font = '400 36px "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';
  c.textAlign = 'center';
  c.fillStyle = `rgba(255,214,170,${a2 * 0.9})`;
  c.fillText('星 降 る 駅', W / 2, 520);
  const a3 = smooth(2.6, 3.3, t);
  c.font = '500 17px "Cormorant Garamond", serif';
  c.fillStyle = `rgba(210,220,255,${a3 * 0.65})`;
  c.fillText('A  S H O R T  F I L M  M A D E  E N T I R E L Y  F R O M  C O D E', W / 2, 580);
  c.restore();
  // a small star over the title
  const sa = smooth(1.2, 2.4, t);
  heroStar(c, W / 2, 330, 8, t, sa);
};
