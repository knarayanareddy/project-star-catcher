import { W, H, clamp, lerp, hash, E, prog, twos, battery } from "../engine/util";
import {
  cover, blurred, mist, shafts, motes, fireflies, birds, rain, leaves, ferns, flash, desat, tint, vignette, black, mono, rec, batteryIcon,
  speedLines, chapterCard, glow, ring, bark, F, type C2, type Assets,
} from "../engine/fx";
import { animeEye, blink } from "../engine/eye";
import type { Scene, Cap } from "./types";

const dip = (c: C2, t: number, at: number, d = 0.35) => black(c, 1 - prog(t, at, at + d));

/* ======================================================================= 4 · THE MAZE */
const S4caps: Cap[] = [
  [4.0, 8.4, "Hour four. The path ahead looked exactly like the path behind."],
  [12.9, 16.0, "That's my mark."],
  [16.3, 18.1, "Third time. I've been walking in circles."],
  [18.9, 22.3, "The jungle isn't noise. It's layers."],
  [22.7, 27.5, "Insects. Birds. Frogs. And under all of it… the low, steady hush of moving water."],
  [28.5, 31.8, "Downstream. Follow the hush."],
];

function walk(c: C2, t: number, A: Assets, z0: number, z1: number, u: number, seed: number) {
  const bob = Math.sin(twos(t, 12) * Math.PI * 2 * 1.8) * 5;
  const cam = cover(c, A.walk_back, {
    z: lerp(z0, z1, E.inOutSine(u)),
    fx: lerp(0.7, 0.66, u),
    fy: lerp(0.64, 0.58, u),
    oy: bob,
    ox: Math.sin(t * 0.45) * 14,
  });
  const [sx, sy] = cam.map(0.58, 0.02);
  shafts(c, t, { ox: sx, oy: sy, ang: Math.PI * 0.55, spread: 1.0, n: 8, alpha: 0.16, len: 1500, seed });
  mist(c, t, seed + 2, { alpha: 0.1, y0: 0.5, y1: 0.9, n: 7, speed: 12 });
  motes(c, t, seed + 4, 40, { size: 7, alpha: 0.6, vx: 7, vy: -5 });
  ferns(c, t, seed + 6, { n: 8, scale: 1.05, grow: u * 0.3, sway: 1.1 });
  vignette(c, 0.4);
}

const BIRDS = Array.from({ length: 26 }, (_, i) => ({
  t: 6 + i * 1.0 + hash(i * 3.3) * 0.7,
  f0: 0.45 + hash(i * 7.1) * 0.35,
  d: 0.3 + hash(i * 2.2) * 0.25,
  s: (hash(i * 5.5) - 0.5) * 0.25,
}));
const RAMP: string[] = Array.from({ length: 48 }, (_, i) => {
  const v = i / 47;
  const stops: [number, number[]][] = [
    [0, [3, 14, 20]],
    [0.3, [8, 80, 104]],
    [0.58, [40, 200, 190]],
    [0.8, [245, 220, 120]],
    [1, [255, 255, 255]],
  ];
  for (let s = 1; s < stops.length; s++) {
    if (v <= stops[s][0]) {
      const [a, ca] = stops[s - 1];
      const [b, cb] = stops[s];
      const k = (v - a) / (b - a);
      return `rgb(${Math.round(lerp(ca[0], cb[0], k))},${Math.round(lerp(ca[1], cb[1], k))},${Math.round(lerp(ca[2], cb[2], k))})`;
    }
  }
  return "#fff";
});

function intensity(r: number, R: number, tt: number, lt: number): number {
  const f = r / (R - 1);
  let v = 0.1 + 0.07 * hash(r * 1.7 + Math.floor(tt * 20) * 0.37) + 0.05 * Math.sin(f * 9 + tt * 0.8);
  if (f > 0.72) v += 0.3 + 0.28 * hash(r * 3.1 + Math.floor(tt * 40) * 0.77) * (0.6 + 0.4 * Math.sin(tt * 1.3 + r));
  if (f > 0.2 && f < 0.42) v += (Math.sin(tt * 7 + r * 0.3) > 0.4 ? 0.42 : 0.06) * (0.7 + 0.3 * hash(Math.floor(tt * 14) + r));
  for (const b of BIRDS) {
    const dt = tt - b.t;
    if (dt > 0 && dt < b.d) {
      const c0 = b.f0 + (dt / b.d) * b.s * 2;
      const dd = (f - c0) / 0.04;
      v += 0.95 * Math.exp(-dd * dd);
    }
  }
  if (f < 0.1) v += (0.18 + 0.08 * hash(r * 2.3 + Math.floor(tt * 10))) * (lt > 22.7 ? 2.2 : 1);
  for (const kt of [20.0, 20.45, 20.9]) if (Math.abs(tt - kt) < 0.045 && f < 0.92) v += 0.5;
  return clamp(v);
}

function barkShot(c: C2, u: number) {
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(1 + u * 0.03, 1 + u * 0.03);
  c.translate(-W / 2, -H / 2);
  bark(c, u, 7, { ox: u * 4 });
  const marks: [number, number, number][] = [
    [640, 360, 0.5],
    [980, 430, 1.4],
    [1320, 350, 2.4],
  ];
  c.lineCap = "round";
  marks.forEach(([x, y, t0], i) => {
    const a = prog(u, t0, t0 + 0.5);
    const b = prog(u, t0 + 0.45, t0 + 0.95);
    const s = 74;
    const draw = (col: string, w: number, off: number) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x - s + off, y - s + off);
      c.lineTo(x - s + off + 2 * s * a, y - s + off + 2 * s * a);
      c.stroke();
      if (b > 0) {
        c.beginPath();
        c.moveTo(x + s + off, y - s + off);
        c.lineTo(x + s + off - 2 * s * b, y - s + off + 2 * s * b);
        c.stroke();
      }
    };
    if (a > 0) {
      draw("rgba(0,0,0,0.55)", 22, 4);
      draw(i === 2 ? "#fff0c0" : "#e2c58c", 13, 0);
    }
  });
  // the third mark pulses red when she realises
  const pr = prog(u, 3.6, 4.4);
  if (pr > 0) {
    c.strokeStyle = `rgba(255,70,50,${0.9 * pr * (0.6 + 0.4 * Math.sin(u * 14))})`;
    c.lineWidth = 3;
    c.strokeRect(520, 220, 940, 330);
  }
  c.restore();
  const hk = E.outExpo(prog(u, 3.3, 3.9));
  mono(c, `MARKS ON THIS TREE: 3`, 120, 140, 26, "#ffdcc0", "left", 5, hk);
  mono(c, `LOOP 03`, 120, 200, 56, "#ff5a40", "left", 10, hk);
  vignette(c, 0.7);
}

function listenShot(c: C2, t: number, lt: number, A: Assets) {
  blurred(c, (g) => cover(g, A.canopy, { z: 1.15, fx: 0.5, fy: 0.5 }), 14, 1, "listen");
  c.fillStyle = "rgba(2,10,10,0.82)";
  c.fillRect(0, 0, W, H);
  motes(c, t, 77, 24, { size: 6, alpha: 0.35 });

  const kIn = E.outExpo(prog(lt, 0.1, 0.9));
  const px = 330, py = 180, pw = 1200, ph = 420;
  const C = 80, R = 28;
  const cw = pw / C, rh = ph / R;
  c.save();
  c.globalAlpha = kIn;
  c.fillStyle = "rgba(0,0,0,0.5)";
  c.fillRect(px - 10, py - 10, pw + 20, ph + 20);
  for (let i = 0; i < C; i++) {
    const tt = t - (C - 1 - i) * 0.125;
    for (let r = 0; r < R; r++) {
      const v = intensity(r, R, tt, lt);
      if (v < 0.05) continue;
      c.fillStyle = RAMP[Math.round(v * 47)];
      c.fillRect(px + i * cw, py + ph - (r + 1) * rh, cw + 0.6, rh + 0.6);
    }
  }
  c.strokeStyle = "rgba(160,255,230,0.25)";
  c.lineWidth = 1.5;
  c.strokeRect(px - 10, py - 10, pw + 20, ph + 20);
  c.restore();

  // header
  c.save();
  c.globalAlpha = kIn;
  c.font = `84px ${F.title}`;
  c.fillStyle = "#f6fff9";
  c.fillText("LISTENING", px - 10, 130);
  c.restore();
  mono(c, "LIVE SPECTROGRAM · 20 Hz – 12 kHz", px + 420, 124, 16, "#7fd9c0", "left", 4, kIn);

  // band legend
  const L: [string, number, number][] = [
    ["INSECTS  4–9 kHz", 0.86, 1.2],
    ["BIRDS  1–4 kHz", 0.56, 1.7],
    ["FROGS  300–900 Hz", 0.31, 2.2],
    ["RIVER  40–120 Hz", 0.05, 4.2],
  ];
  L.forEach(([s, f, t0], i) => {
    const a = E.outCubic(prog(lt, t0, t0 + 0.6));
    mono(c, s, px - 28, py + ph - f * ph + 6, 15, i === 3 ? "#ffd27a" : "#9fe8d2", "right", 2, a);
  });

  // river highlight
  const hk = E.outExpo(prog(lt, 4.3, 5.1));
  if (hk > 0) {
    const pulse = 0.65 + 0.35 * Math.sin(lt * 5);
    c.save();
    c.strokeStyle = `rgba(255,190,90,${hk * pulse})`;
    c.lineWidth = 4;
    c.shadowColor = "rgba(255,170,60,0.9)";
    c.shadowBlur = 24;
    c.strokeRect(px - 4, py + ph - rh * 3.6, pw + 8, rh * 3.6 + 4);
    c.restore();
    mono(c, "▲ CONSTANT. DIRECTIONAL. WATER.", px, py + ph + 42, 18, "#ffd27a", "left", 4, hk);
  }

  // compass
  const cx = 1700, cy = 390, cr = 118;
  const ck = E.outExpo(prog(lt, 4.4, 5.2));
  if (ck > 0) {
    c.save();
    c.globalAlpha = ck;
    c.strokeStyle = "rgba(190,255,235,0.5)";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, cr, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const l = i % 9 === 0 ? 16 : 7;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * (cr - l), cy + Math.sin(a) * (cr - l));
      c.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
      c.stroke();
    }
    mono(c, "N", cx, cy - cr - 14, 18, "#e8fff6", "center", 0);
    const u = Math.max(0, lt - 5.0);
    const ang = (25 * Math.PI) / 180 + 2.6 * Math.exp(-2.4 * u) * Math.cos(8 * u);
    c.save();
    c.translate(cx, cy);
    c.rotate(ang);
    c.fillStyle = "#ff9a3c";
    c.beginPath();
    c.moveTo(0, -cr + 14);
    c.lineTo(11, 8);
    c.lineTo(-11, 8);
    c.closePath();
    c.fill();
    c.fillStyle = "#cfe9e0";
    c.beginPath();
    c.moveTo(0, cr - 24);
    c.lineTo(8, 8);
    c.lineTo(-8, 8);
    c.closePath();
    c.fill();
    c.restore();
    mono(c, "BEARING 025°", cx, cy + cr + 40, 18, "#ffd27a", "center", 3);
    mono(c, "≈ 1.2 km", cx, cy + cr + 68, 16, "#9fe8d2", "center", 3);
    c.restore();
  }
  // "listening" pulse rings
  for (let j = 0; j < 3; j++) {
    const ph2 = (lt * 0.45 + j / 3) % 1;
    ring(c, 190, 390, 20 + ph2 * 110, (1 - ph2) * 0.5 * kIn, "140,255,225", 2);
  }
  mono(c, "EARS", 190, 396, 16, "#bfffe9", "center", 4, kIn);
  vignette(c, 0.6);
}

export const sceneMaze: Scene = {
  id: "maze", label: "Trial 01 · The Maze", start: 68, dur: 32, fin: 0.7, fout: 0.4, caps: S4caps,
  draw: (c, t, g, A) => {
    if (t < 12.2) {
      walk(c, t, A, 1.2, 1.7, prog(t, 0, 12.2), 3);
      chapterCard(c, t, "TRIAL 01", "THE MAZE", "第一の試練 ― 迷宮");
    } else if (t < 18.4) {
      barkShot(c, t - 12.2);
      flash(c, 1 - prog(t, 12.2, 12.5), "255,255,255");
    } else if (t < 28.0) {
      listenShot(c, t, t - 18.4, A);
    } else {
      walk(c, t, A, 1.35, 1.55, prog(t, 28, 32), 9);
      // wipe ring
      const k = prog(t, 28, 29.2);
      ring(c, W / 2, H / 2, E.outExpo(k) * 1500, (1 - k) * 0.9, "200,255,235", 6);
      flash(c, (1 - prog(t, 28, 28.5)) * 0.5, "200,255,235");
    }
    if (t > 4 && !(t > 12.2 && t < 28)) rec(c, g, 0.7);
    if (t > 28 || t < 12.2) batteryIcon(c, W - 190, 52, battery(g), 0.8);
  },
};

/* ======================================================================= 5 · THE SILENCE */
const S5caps: Cap[] = [
  [4.0, 7.9, "Noon, day one. The forest was loud. Wonderfully, stupidly loud."],
  [9.9, 13.0, "Everything stopped. All at once."],
  [13.4, 16.2, "Silence isn't empty. Silence is a sentence."],
  [16.9, 20.8, "Every bird, every insect, every frog… just stopped talking. Which means something out here is listening."],
  [21.2, 24.4, "Don't run. Run, and you're prey."],
  [24.9, 27.3, "Stay… and you're a question."],
  [33.2, 36.8, "It walked past. Right past me. Like I was a tree."],
  [37.2, 39.8, "I'd been holding my breath for two minutes. The forest breathed back."],
];

const speed5 = (u: number) => (u < 8 ? 1 : u < 9.5 ? 1 - E.outCubic((u - 8) / 1.5) * 0.98 : u < 32.4 ? 0.02 : u < 36 ? lerp(0.02, 1, E.inOutSine((u - 32.4) / 3.6)) : 1);
function warp5(t: number) {
  let a = 0;
  const step = 0.05;
  for (let u = 0; u < t; u += step) a += speed5(u) * step;
  return a;
}

function eyeSilence(c: C2, lt: number, t: number) {
  const op = 0.95 * blink(lt, 2.4, 0.3);
  animeEye(c, {
    cx: W / 2,
    cy: H / 2 + 20,
    w: lerp(1150, 1260, prog(lt, 0, 4.4)),
    open: op,
    t,
    lookX: 0.1,
    lookY: 0,
    pupil: lerp(0.5, 0.17, E.outCubic(prog(lt, 0, 1.2))),
    tremor: 1,
    skin: ["#c99478", "#8f5a46"],
    reflect: (g, r) => {
      const a = E.inOutSine(prog(lt, 1.2, 3.2));
      g.globalAlpha = 0.25;
      glow(g, 0, -r * 0.1, r * 1.2, "120,170,120", 0.4);
      for (const s of [-1, 1]) {
        glow(g, r * 0.42 + s * r * 0.1, r * 0.1, r * 0.22, "255,170,40", a);
        glow(g, r * 0.42 + s * r * 0.1, r * 0.1, r * 0.08, "255,240,160", a);
      }
    },
  });
  tint(c, "rgba(150,175,200,1)", "multiply");
  vignette(c, 0.7);
}

function jaguarShot(c: C2, lt: number, t: number, A: Assets) {
  const k = E.inOutCubic(prog(lt, 0, 10.6));
  const u = lt;
  const phi = 1.15 * u + 0.035 * u * u;
  const fr = phi - Math.floor(phi);
  const pulse = Math.pow(Math.max(0, 1 - fr * 3.2), 2) + 0.5 * Math.pow(Math.max(0, 1 - Math.abs(fr - 0.22) * 9), 2);
  cover(c, A.jaguar, {
    z: lerp(1.14, 2.5, k) * (1 + 0.016 * pulse),
    fx: lerp(0.5, 0.69, k),
    fy: lerp(0.5, 0.49, k),
    rot: lerp(0, -0.04, k),
    ox: Math.sin(t * 0.7) * 5,
  });
  desat(c, 0.55);
  tint(c, "rgba(170,190,200,1)", "multiply");
  motes(c, warp5(t), 61, 30, { size: 6, alpha: 0.4, vx: 6, vy: -3 });
  ferns(c, warp5(t), 41, { n: 7, sway: 0.4, scale: 1.1, grow: k * 0.2 });
  vignette(c, 0.55 + 0.25 * k + 0.05 * pulse, "0,0,0", 0.28);
  if (lt > 6) {
    // red pulse on the heartbeat
    flash(c, 0.1 * pulse * prog(lt, 6, 10), "180,20,10");
  }
}

function eyesInBlack(c: C2, lt: number) {
  c.fillStyle = "#000";
  c.fillRect(0, 0, W, H);
  const k = E.inCubic(prog(lt, 0, 2.6));
  const sep = lerp(46, 230, k);
  const r = lerp(8, 34, k);
  const bl = blink(lt, 1.2, 0.18);
  const a = E.outCubic(prog(lt, 0, 0.6));
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const s of [-1, 1]) {
    const x = W / 2 + s * sep;
    const y = H / 2 - 20 - k * 20;
    glow(c, x, y, r * 5, "255,150,30", 0.25 * a);
    c.fillStyle = `rgba(255,${190 + 40 * bl},60,${a})`;
    c.beginPath();
    c.ellipse(x, y, r * 1.6, r * 0.8 * bl + 0.5, s * -0.12, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  for (const s of [-1, 1]) {
    const x = W / 2 + s * sep;
    const y = H / 2 - 20 - k * 20;
    c.fillStyle = "#000";
    c.beginPath();
    c.ellipse(x, y, r * 0.28, r * 0.75 * bl + 0.3, 0, 0, Math.PI * 2);
    c.fill();
  }
}

function impact(c: C2, ut: number, A: Assets) {
  const f = Math.floor(ut * 24);
  if (f < 3) {
    const white = f % 2 === 1;
    c.fillStyle = white ? "#fff" : "#000";
    c.fillRect(0, 0, W, H);
    speedLines(c, ut, W / 2, H / 2, { color: white ? "#000" : "#fff", inner: 70 + f * 90, seed: 4 + f, fps: 24, n: 130 });
    if (f >= 1) {
      c.save();
      c.strokeStyle = white ? "#000" : "#fff";
      c.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        c.lineWidth = 34 - i * 6;
        c.beginPath();
        c.moveTo(560 + i * 170, -40);
        c.quadraticCurveTo(700 + i * 190, H * 0.5, 980 + i * 190 + f * 40, H + 40);
        c.stroke();
      }
      c.restore();
    }
  } else if (f < 8) {
    cover(c, A.jaguar, { z: 2.9 + (f - 3) * 0.08, fx: 0.69, fy: 0.49 });
    if (f % 2 === 1) {
      c.save();
      c.globalCompositeOperation = "difference";
      c.fillStyle = "#fff";
      c.fillRect(0, 0, W, H);
      c.restore();
    }
    speedLines(c, ut, W / 2, H / 2, { color: "rgba(255,255,255,0.8)", inner: 380, seed: 12, fps: 24, n: 70 });
  } else {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
  }
}

function afterShot(c: C2, lt: number, t: number, A: Assets) {
  const w = warp5(t);
  cover(c, A.canopy, { z: 1.28, fx: 0.38, fy: 0.72, ox: Math.sin(t * 0.3) * 8 });
  const [sx, sy] = [W * 0.6, -60];
  shafts(c, w, { ox: sx, oy: sy, ang: Math.PI * 0.52, spread: 1.0, n: 8, alpha: 0.2 * E.outCubic(prog(lt, 2, 6)), len: 1500, seed: 8 });
  motes(c, w, 71, 50, { size: 7, alpha: 0.7, vx: 10, vy: -6 });
  mist(c, w, 3, { alpha: 0.09, n: 6, speed: 12 });
  // one frond shaking where it passed, then settling
  const shake = Math.exp(-lt * 0.9) * 1.8;
  ferns(c, t, 15, { n: 7, sway: 1 + shake * 6, scale: 1.1, edge: "left" });
  ferns(c, t, 17, { n: 5, sway: 0.8, scale: 1.0, edge: "right" });
  desat(c, lerp(0.85, 0, E.inOutSine(prog(lt, 0.3, 3.6))));
  vignette(c, 0.45);
}

export const sceneSilence: Scene = {
  id: "silence", label: "Trial 02 · The Silence", start: 100, dur: 40, fin: 0.5, fout: 0.5, caps: S5caps,
  draw: (c, t, g, A) => {
    if (t < 12) {
      const w = warp5(t);
      const cam = cover(c, A.canopy, { z: lerp(1.05, 1.25, prog(t, 0, 12)), fx: 0.5, fy: lerp(0.62, 0.4, E.inOutSine(prog(t, 0, 12))) });
      const [sx, sy] = cam.map(0.5, 0.02);
      shafts(c, w, { ox: sx, oy: sy, ang: Math.PI * 0.5, spread: 1.4, n: 9, alpha: 0.2, len: 1500, seed: 6 });
      motes(c, w, 70, 60, { size: 7, alpha: 0.75, vx: 10, vy: -6 });
      mist(c, w, 2, { alpha: 0.08, n: 6 });
      birds(c, w, 4, 5, { y0: 0.1, y1: 0.3, speed: 80, size: 18 });
      ferns(c, w, 19, { n: 7, sway: 1.0 });
      // shockwave when the sound stops
      const sk = prog(t, 8, 9.4);
      if (sk > 0 && sk < 1) {
        ring(c, W / 2, H / 2, E.outExpo(sk) * 1700, (1 - sk) * 0.8, "220,255,240", 8);
        flash(c, (1 - sk) * 0.25, "200,230,220");
      }
      desat(c, E.inOutSine(prog(t, 8, 9.6)) * 0.85);
      vignette(c, 0.4 + 0.3 * prog(t, 8, 10));
      chapterCard(c, t, "TRIAL 02", "THE SILENCE", "第二の試練 ― 静寂");
    } else if (t < 16.4) {
      eyeSilence(c, t - 12, t);
      dip(c, t, 12, 0.25);
    } else if (t < 27.0) {
      jaguarShot(c, t - 16.4, t, A);
      dip(c, t, 16.4, 0.25);
    } else if (t < 29.6) {
      eyesInBlack(c, t - 27.0);
    } else if (t < 32.4) {
      impact(c, t - 29.6, A);
    } else {
      afterShot(c, t - 32.4, t, A);
    }

    // flat-lined spectrum HUD while the forest is silent
    if (t > 8.6 && t < 31) {
      const a = E.outCubic(prog(t, 8.6, 9.8)) * (1 - prog(t, 29.5, 29.7));
      const x0 = 80, y0 = 700, w0 = 420;
      c.save();
      c.globalAlpha = a * 0.85;
      c.strokeStyle = "#ff6a5a";
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x <= w0; x += 4) {
        const sp = x / w0;
        const blip = Math.exp(-Math.pow((((t * 1.3 + sp * 2) % 1.6) - 0.3) * 8, 2)) * (t > 14 ? 5 : 1.5);
        const y = y0 + Math.sin(sp * 60 + t * 3) * 0.7 + blip * Math.sin(x * 0.9) * (t > 16 ? 1 : 0.4);
        if (x === 0) c.moveTo(x0, y);
        else c.lineTo(x0 + x, y);
      }
      c.stroke();
      c.restore();
      mono(c, "SPECTRUM: FLAT", x0, y0 - 24, 16, "#ff9a8a", "left", 4, a);
      mono(c, "AMBIENT 0 dB", x0, y0 + 30, 14, "#ff9a8a", "left", 3, a * 0.7);
    }
    if (t > 4 && !(t > 27 && t < 32.4)) rec(c, g, 0.6);
  },
};

/* ======================================================================= 6 · THE FLOOD */
const S6caps: Cap[] = [
  [4.0, 7.8, "By mid-afternoon the air went thick. Heavy. Wrong."],
  [10.5, 14.8, "Ants. Thousands of them. Carrying their eggs — and every one heading up."],
  [15.2, 19.6, "Animals don't predict storms. They listen to the ground. And the ground had started to rumble."],
  [20.5, 24.2, "A flash flood doesn't come down the river. It comes from the mountains. Hours away."],
  [24.6, 27.8, "By the time you see it, it's already here."],
  [32.9, 36.0, "Hold on. Hold on. Hold on."],
  [36.4, 39.7, "Three trials down. Battery, six percent. Still no one coming."],
];

const BOLTS = [1.2, 2.4, 2.72, 5.1, 8.3];
const lightning = (lt: number) => {
  let a = 0;
  for (const b of BOLTS) if (lt >= b) a = Math.max(a, Math.exp(-(lt - b) * 7) * (0.75 + 0.25 * Math.sin((lt - b) * 70)));
  return a;
};

function stormSky(c: C2, t: number, A: Assets) {
  const k = prog(t, 0, 10);
  const sh = k * 5;
  cover(c, A.canopy, { z: 1.12, fx: 0.5 + Math.sin(t * 0.3) * 0.02, fy: 0.55, ox: Math.sin(t * 17) * sh, oy: Math.cos(t * 13) * sh });
  tint(c, `rgba(${lerp(255, 85, k)},${lerp(255, 110, k)},${lerp(255, 150, k)},1)`, "multiply");
  desat(c, k * 0.5);
  leaves(c, t, 5, Math.round(10 + k * 24), "12,40,22", 300 + k * 600);
  if (t > 5) rain(c, t, 7, Math.round(prog(t, 5, 10) * 300), { alpha: 0.28, len: 60 });
  mist(c, t, 9, { alpha: 0.1, n: 7, speed: 40 });
  ferns(c, t, 29, { n: 8, sway: 1 + k * 3.2, scale: 1.1 });
  vignette(c, 0.5 + k * 0.2);
}

function antShot(c: C2, lt: number) {
  bark(c, lt, 3, { wet: 1 });
  // out-of-focus bokeh
  c.save();
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 12; i++) glow(c, hash(i * 3.3) * W, hash(i * 7.1) * H, 120 + hash(i) * 120, "80,120,80", 0.1);
  c.restore();
  const px = (y: number) => W * 0.52 + Math.sin(y * 0.011 + 1) * 90 + (y - H / 2) * 0.08;
  // trail
  c.save();
  c.strokeStyle = "rgba(0,0,0,0.35)";
  c.lineWidth = 80;
  c.lineCap = "round";
  c.beginPath();
  for (let y = -20; y <= H + 20; y += 20) (y === -20 ? c.moveTo(px(y), y) : c.lineTo(px(y), y));
  c.stroke();
  c.strokeStyle = "rgba(210,190,140,0.12)";
  c.lineWidth = 6;
  c.stroke();
  c.restore();
  const N = 30;
  for (let i = 0; i < N; i++) {
    const u = (i / N + lt * 0.07 + hash(i) * 0.012) % 1;
    const y = H + 80 - u * (H + 160);
    const x = px(y) + (hash(i * 5.3) - 0.5) * 230;
    const dy = 1;
    const dx = (px(y - 1) - px(y + 1)) / 2;
    const ang = Math.atan2(-dy, dx) + Math.PI / 2;
    const ph = lt * 14 + i * 2;
    c.save();
    c.translate(x, y);
    c.rotate(ang + (hash(i * 3.9) - 0.5) * 0.25);
    c.scale(2.1, 2.1);
    c.strokeStyle = "#0d0705";
    c.lineWidth = 2.6;
    c.lineCap = "round";
    for (let l = 0; l < 3; l++) {
      const yy = -6 + l * 9;
      const sw = Math.sin(ph + l * 2.1) * 5;
      c.beginPath();
      c.moveTo(-3, yy);
      c.lineTo(-17, yy + sw - 4);
      c.moveTo(3, yy);
      c.lineTo(17, yy - sw - 4);
      c.stroke();
    }
    c.fillStyle = "#1c100b";
    c.beginPath();
    c.ellipse(0, 18, 11, 16, 0, 0, Math.PI * 2);
    c.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
    c.ellipse(0, -14, 8, 7.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,200,150,0.35)";
    c.beginPath();
    c.ellipse(-3, 14, 3, 7, 0, 0, Math.PI * 2);
    c.fill();
    if (i % 3 !== 0) {
      c.fillStyle = "#f6efe2";
      c.beginPath();
      c.ellipse(0, -30, 9, 13, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.beginPath();
      c.ellipse(3, -28, 5, 9, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  rain(c, lt, 3, 260, { alpha: 0.35, len: 90, width: 2.4, speed: 3200 });
  // rumble: whole frame trembles slightly harder over time (drawn as a faint jitter overlay)
  vignette(c, 0.75, "0,0,0", 0.25);
  tint(c, "rgba(130,150,170,1)", "multiply");
}

function floodShot(c: C2, lt: number, A: Assets) {
  const lf = lightning(lt);
  const sh = 3 + lf * 8 + prog(lt, 4, 11) * 4;
  cover(c, A.storm, { z: lerp(1.08, 1.22, prog(lt, 0, 12)), fx: lerp(0.45, 0.58, prog(lt, 0, 12)), fy: 0.55, ox: Math.sin(lt * 33) * sh, oy: Math.cos(lt * 27) * sh });
  tint(c, "rgba(150,170,205,1)", "multiply");
  if (lf > 0.02) tint(c, `rgba(120,150,255,${lf * 0.55})`, "screen");
  desat(c, 0.15);
  leaves(c, lt, 15, 24, "20,40,30", 900);
  // rising brown water
  const level = lerp(0, 330, E.inQuad(prog(lt, 1.5, 11.5)));
  if (level > 2) {
    const top = H - level;
    c.save();
    const wg = c.createLinearGradient(0, top, 0, H);
    wg.addColorStop(0, "rgba(64,46,30,0.94)");
    wg.addColorStop(1, "rgba(22,15,10,0.99)");
    c.fillStyle = wg;
    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) c.lineTo(x, top + Math.sin(x * 0.011 + lt * 2.6) * 9 + Math.sin(x * 0.027 - lt * 4) * 5);
    c.lineTo(W, H);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(235,225,200,0.55)";
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const y = top + Math.sin(x * 0.011 + lt * 2.6) * 9 + Math.sin(x * 0.027 - lt * 4) * 5;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    // debris riding the current
    for (let i = 0; i < 14; i++) {
      const x = ((hash(i * 4.4) * W + lt * (260 + hash(i) * 180)) % (W + 200)) - 100;
      const y = top + 16 + hash(i * 9.1) * Math.min(level - 20, 160);
      c.fillStyle = i % 3 === 0 ? "#2b4a22" : "#3a2616";
      c.save();
      c.translate(x, y);
      c.rotate(lt * 1.3 + i);
      c.fillRect(-26 - hash(i) * 30, -4, 52 + hash(i) * 60, 8);
      c.restore();
    }
    c.restore();
  }
  rain(c, lt, 21, 700, { alpha: 0.34, len: 110, width: 1.8, speed: 3000, slant: 0.28 });
  rain(c, lt, 33, 260, { alpha: 0.5, len: 180, width: 2.8, speed: 3800, slant: 0.28 });
  flash(c, lf * 0.7, "225,238,255");
  vignette(c, 0.55);
  // UP. NOW.
  const u = prog(lt, 8.4, 11.6);
  if (u > 0 && u < 1) {
    const k = E.outExpo(prog(lt, 8.4, 8.8));
    c.save();
    c.translate(W / 2 + Math.sin(lt * 60) * 4, H / 2 - 40 + Math.cos(lt * 52) * 4);
    c.scale(lerp(1.3, 1, k), lerp(1.3, 1, k));
    c.globalAlpha = k * (1 - E.inCubic(prog(lt, 10.9, 11.6)));
    c.font = `330px ${F.title}`;
    c.textAlign = "center";
    c.lineWidth = 14;
    c.strokeStyle = "rgba(0,0,0,0.8)";
    c.strokeText("UP. NOW.", 0, 120);
    c.fillStyle = "#fff6e0";
    c.fillText("UP. NOW.", 0, 120);
    c.restore();
  }
}

function soakedPortrait(c: C2, lt: number, g: number, A: Assets) {
  const k = E.inOutSine(prog(lt, 0, 8));
  cover(c, A.portrait, { z: lerp(1.25, 1.1, k), fx: lerp(0.64, 0.62, k), fy: lerp(0.4, 0.43, k) });
  tint(c, "rgba(150,170,195,1)", "multiply");
  desat(c, 0.25);
  const lf = Math.exp(-(lt - 1.4) * 6) * (lt > 1.4 ? 1 : 0);
  flash(c, lf * 0.35, "220,235,255");
  rain(c, lt, 12, 420, { alpha: 0.3, len: 90, width: 1.6, speed: 2800 * lerp(1, 0.5, k) });
  // droplets sliding on the lens
  for (let i = 0; i < 9; i++) {
    const x = hash(i * 7.7) * W;
    const y = ((hash(i * 3.3) * H + lt * (14 + hash(i) * 30)) % (H + 80)) - 40;
    c.save();
    c.fillStyle = "rgba(220,240,255,0.22)";
    c.beginPath();
    c.ellipse(x, y, 7 + hash(i * 2) * 7, 11 + hash(i * 5) * 9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.beginPath();
    c.arc(x - 2, y - 3, 2.4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  vignette(c, 0.5);
  rec(c, g, 0.8);
  batteryIcon(c, W - 190, 52, battery(g), 0.9);
}

export const sceneFlood: Scene = {
  id: "flood", label: "Trial 03 · The Flood", start: 140, dur: 40, fin: 0.5, fout: 0.5, caps: S6caps,
  draw: (c, t, g, A) => {
    if (t < 10) {
      stormSky(c, t, A);
      chapterCard(c, t, "TRIAL 03", "THE FLOOD", "第三の試練 ― 洪水");
    } else if (t < 20) {
      antShot(c, t - 10);
      dip(c, t, 10, 0.3);
    } else if (t < 32) {
      floodShot(c, t - 20, A);
      flash(c, 1 - prog(t, 20, 20.35), "255,255,255");
    } else {
      soakedPortrait(c, t - 32, g, A);
      dip(c, t, 32, 0.4);
    }
    if (t > 4 && t < 32 && !(t > 10 && t < 20)) rec(c, g, 0.6);
  },
};

void fireflies;
