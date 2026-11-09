import { W, H, clamp, lerp, hash, E, prog, twos, pw, battery } from "../engine/util";
import {
  cover, blurred, mist, shafts, motes, glints, birds, flash, vignette, black, mono, typeText, speedLines, rec, batteryIcon,
  glow, F, mk, desat, type C2, type Assets,
} from "../engine/fx";
import { animeEye, blink } from "../engine/eye";
import type { Scene, Cap } from "./types";

/* ======================================================================= 0 · LOG 001 */
const S0caps: Cap[] = [
  [2.4, 6.2, "LOG 001. Day one. Or what's left of it."],
  [6.6, 10.4, "For the record: I'm alive. I'm cold. And the river took everything."],
  [10.8, 13.6, "…Everything except the one thing I never let go of."],
];
const speech = (t: number, caps: Cap[]) => {
  for (const [a, b] of caps) {
    if (t > a && t < b) {
      const k = clamp(Math.min(t - a, b - t) / 0.3);
      return k * (0.4 + 0.6 * Math.abs(Math.sin(t * 9.1) * Math.sin(t * 4.3 + 1)));
    }
  }
  return 0;
};

function drawLog(c: C2, t: number, g: number) {
  c.fillStyle = "#000";
  c.fillRect(0, 0, W, H);
  const k = clamp(t / 2.2);
  const cy = H / 2 + 30;
  const gr = c.createRadialGradient(W / 2, cy, 0, W / 2, cy, 760);
  gr.addColorStop(0, `rgba(20,80,66,${0.3 * k})`);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  // heartbeat rings
  for (let j = 0; j < 3; j++) {
    const ph = (t * 0.8 + j / 3) % 1;
    c.strokeStyle = `rgba(110,255,215,${(1 - ph) * 0.2 * k})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(W / 2, cy, 60 + ph * 560, 0, Math.PI * 2);
    c.stroke();
  }
  // voice waveform
  const env = speech(t, S0caps);
  const N = 150;
  const bw = 6;
  const gap = 5;
  const x0 = W / 2 - (N * (bw + gap)) / 2;
  const f = Math.floor(t * 24);
  for (let i = 0; i < N; i++) {
    const u = (i / (N - 1)) * 2 - 1;
    const win = Math.pow(Math.cos((u * Math.PI) / 2), 1.5);
    const n = hash(i * 3.17 + f * 1.31);
    const h = 3 + (env * 200 + 8 * k) * win * (0.2 + 0.8 * n);
    c.fillStyle = `rgba(140,255,225,${0.35 + 0.6 * win})`;
    c.fillRect(x0 + i * (bw + gap), cy - h / 2, bw, h);
  }
  typeText(c, "LOG 001", W / 2, cy - 220, 0.9, t, { font: `64px ${F.title}`, color: "#ff9158", per: 0.09, sp: 14, align: "center", rise: 10 });
  mono(c, "FIELD RECORDER · PARABOLIC MIC · 32 kHz", W / 2, cy - 180, 16, "#7fd9c0", "center", 5, E.outCubic(prog(t, 1.6, 2.6)) * 0.8);
  rec(c, g, k);
  vignette(c, 0.6);
}

/* ======================================================================= 1 · SANDBAR */
const S1caps: Cap[] = [
  [0.9, 5.0, "Alive. Cold. Alone. In that order."],
  [5.5, 10.0, "The Amazon doesn't care that I had a boat, a team, and a plan."],
  [14.3, 18.6, "Breathe. Count. Listen."],
  [21.8, 25.6, "Rule one of fieldwork: when everything goes wrong… stop. And listen."],
  [26.0, 27.9, "The jungle's about to tell me where I am."],
];

function riverShot(c: C2, t: number, A: Assets) {
  const k = E.inOutSine(prog(t, 0, 10.4));
  const cam = cover(c, A.river_dawn, {
    z: lerp(1.0, 1.95, k),
    fx: lerp(0.5, 0.385, k),
    fy: lerp(0.5, 0.86, k),
    ox: Math.sin(t * 0.6) * 5,
    oy: Math.cos(t * 0.5) * 4,
  });
  const [sx, sy] = cam.map(0.63, 0.3);
  shafts(c, t, { ox: sx, oy: sy, ang: Math.PI * 0.5, spread: 1.7, n: 10, alpha: 0.2, len: 1700, seed: 11 });
  glints(c, t, 4, 70, cam.map, 0.3, 0.98, 0.6, 0.78, 12);
  mist(c, t, 2, { alpha: 0.16, y0: 0.45, y1: 0.8, n: 9, speed: 18, size: 640 });
  birds(c, t, 9, 7, { y0: 0.08, y1: 0.35, speed: 70, size: 24 });
  motes(c, t, 3, 26, { size: 6, alpha: 0.5, vx: 8, vy: -4 });
  // her recorder: a slow "listening" pulse ring
  const [rx, ry] = cam.map(0.535, 0.9);
  for (let j = 0; j < 2; j++) {
    const ph = ((t * 0.5 + j / 2) % 1);
    c.strokeStyle = `rgba(120,255,220,${(1 - ph) * 0.45 * E.outCubic(prog(t, 4, 7))})`;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(rx, ry, 20 + ph * 120, 8 + ph * 40, 0, 0, Math.PI * 2);
    c.stroke();
  }
  vignette(c, 0.4);
}

function rapids(c: C2, u: number) {
  const f = Math.floor(u * 12);
  const j = (k: number) => hash(f * 7.7 + k) - 0.5;
  if (u < 0.6) {
    c.fillStyle = "#fff";
    c.fillRect(0, 0, W, H);
    speedLines(c, u, W / 2, H / 2, { color: "#000", inner: 90 + u * 300, seed: 2 });
    return;
  }
  if (u < 1.6) {
    c.fillStyle = "#06080b";
    c.fillRect(0, 0, W, H);
    c.save();
    c.strokeStyle = "#fff";
    c.lineCap = "round";
    for (let i = 0; i < 34; i++) {
      const y = hash(i * 3.7) * H;
      const len = 300 + hash(i * 5.1) * 700;
      const x = ((hash(i * 9.9) * (W + len) + u * 2800 * (0.5 + hash(i))) % (W + len)) - len;
      c.lineWidth = 2 + hash(i * 1.3) * 7;
      c.globalAlpha = 0.35 + hash(i * 2.2) * 0.65;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + len, y - len * 0.42);
      c.stroke();
    }
    c.restore();
    // canoe
    c.save();
    c.translate(W * 0.5 + j(1) * 16, H * 0.56 + j(2) * 16);
    c.rotate(-0.12 - (u - 0.6) * 0.5 + j(3) * 0.03);
    c.scale(2.4, 2.4);
    c.fillStyle = "#ff6a2a";
    c.strokeStyle = "#000";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-170, -14);
    c.quadraticCurveTo(-60, 62, 60, 62);
    c.quadraticCurveTo(150, 56, 205, -34);
    c.lineTo(150, -10);
    c.lineTo(-120, -8);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#101010";
    c.beginPath();
    c.arc(-20, -52, 15, 0, Math.PI * 2);
    c.fill();
    c.fillRect(-34, -38, 30, 34);
    c.restore();
    // spray
    c.fillStyle = "#fff";
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 1.9) * Math.PI;
      const sp = 300 + hash(i * 2.7) * 900;
      const t2 = (u - 0.6) * (0.4 + hash(i * 4.1));
      const x = W * 0.5 + Math.cos(a + Math.PI) * sp * t2 * 0.9;
      const y = H * 0.56 - Math.sin(a) * sp * t2 + 900 * t2 * t2;
      c.globalAlpha = clamp(1 - t2 * 1.4);
      c.beginPath();
      c.arc(x, y, 3 + hash(i * 8.1) * 9, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    mono(c, "T-MINUS 06:12:00", 70, 80, 22, "#ffd9c4", "left", 6);
    return;
  }
  c.fillStyle = "#fff";
  c.fillRect(0, 0, W, H);
  speedLines(c, u, W / 2, H / 2, { color: "rgba(0,0,0,0.85)", inner: 420, seed: 8, n: 90 });
  c.save();
  c.font = `800 620px ${F.serif}`;
  c.textAlign = "center";
  c.fillStyle = "#050505";
  c.fillText("激流", W / 2 + j(3) * 14, H / 2 + 215 + j(4) * 14);
  c.restore();
  mono(c, "THE RAPIDS", W / 2, H - 70, 24, "#111", "center", 16);
}

function eyeShot(c: C2, lt: number, A: Assets) {
  let op = lt < 0.7 ? 0.03 : 0.03 + 0.88 * E.outCubic(prog(lt, 0.7, 3.8));
  if (lt > 3.8) op = 0.91 * blink(lt, 4.7) * blink(lt, 6.1);
  op *= 1 - E.inCubic(prog(lt, 6.7, 7.5));
  const w = lerp(1100, 1240, prog(lt, 0, 7.6));
  animeEye(c, {
    cx: W / 2 + Math.sin(lt * 0.4) * 14,
    cy: H / 2 + 40,
    w,
    open: op,
    t: lt,
    lookX: -0.25 + Math.sin(lt * 0.5) * 0.2,
    lookY: -0.2,
    pupil: lerp(0.62, 0.38, E.inOutSine(prog(lt, 0.7, 4.2))),
    reflect: (g, r) => {
      g.globalAlpha = 0.6;
      g.drawImage(A.river_dawn, -r * 1.5, -r * 0.95, r * 3, r * 1.3);
      glow(g, r * 0.1, -r * 0.25, r * 0.7, "255,230,170", 0.6);
    },
  });
  // golden dawn light across the skin
  c.save();
  c.globalCompositeOperation = "soft-light";
  const gr = c.createLinearGradient(W, 0, 0, H);
  gr.addColorStop(0, "rgba(255,200,120,0.65)");
  gr.addColorStop(0.6, "rgba(255,200,120,0)");
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  c.restore();
  motes(c, lt, 5, 20, { size: 7, alpha: 0.5 });
  vignette(c, 0.55);
  flash(c, 1 - prog(lt, 0, 0.6));
}

function portraitShot(c: C2, lt: number, A: Assets) {
  const k = E.inOutSine(prog(lt, 0, 6.8));
  const cam = { z: lerp(1.28, 1.1, k), fx: lerp(0.62, 0.65, k), fy: lerp(0.4, 0.44, k), ox: Math.sin(lt * 0.5) * 6 };
  cover(c, A.portrait, cam);
  const bl = 1 - E.outCubic(prog(lt, 0.3, 2.2));
  if (bl > 0.01) blurred(c, (g) => cover(g, A.portrait, cam), 9, bl);
  motes(c, lt, 12, 40, { size: 9, alpha: 0.55, vx: 6, vy: -5 });
  mist(c, lt, 5, { alpha: 0.07, y0: 0.2, y1: 0.7, n: 5, speed: 8, size: 600 });
  vignette(c, 0.45);
  black(c, 1 - prog(lt, 0, 0.7));
}

export const sceneLog: Scene = {
  id: "log", label: "Log 001", start: 0, dur: 14, caps: S0caps, fout: 0,
  draw: (c, t, g) => drawLog(c, t, g),
};

export const sceneSandbar: Scene = {
  id: "sandbar", label: "The Sandbar", start: 14, dur: 28, xf: 2.2, fout: 0.6, bloom: 0.34, caps: S1caps,
  draw: (c, t, g, A) => {
    if (t < 10.4) riverShot(c, t, A);
    else if (t < 13.4) rapids(c, t - 10.4);
    else if (t < 21.2) eyeShot(c, t - 13.4, A);
    else portraitShot(c, t - 21.2, A);
    if (t < 10.4 || t > 21.2) rec(c, g, 0.7);
  },
};

/* ======================================================================= 2 · TITLE */
let titleTmp: HTMLCanvasElement | null = null;
let titleHalo: HTMLCanvasElement | null = null;
function drawTitle(c: C2, t: number, A: Assets) {
  const k = E.outQuint(prog(t, 0, 6.5));
  cover(c, A.canopy, { z: lerp(1.7, 1.0, k), fx: 0.5, fy: lerp(0.95, 0.4, k) });
  c.fillStyle = "rgba(0,10,8,0.5)";
  c.fillRect(0, 0, W, H);
  shafts(c, t, { ox: W * 0.55, oy: -80, ang: Math.PI * 0.5, spread: 1.3, n: 9, alpha: 0.18, len: 1400, seed: 21 });
  motes(c, t, 31, 50, { size: 8, alpha: 0.7 });
  vignette(c, 0.55);

  if (!titleTmp) titleTmp = mk(W, H);
  const tx = titleTmp.getContext("2d")!;
  tx.setTransform(1, 0, 0, 1, 0, 0);
  tx.clearRect(0, 0, W, H);
  tx.font = `250px ${F.title}`;
  tx.textBaseline = "alphabetic";
  const text = "LOST ON EARTH";
  const sp = 16;
  const widths = [...text].map((ch) => tx.measureText(ch).width + sp);
  const total = widths.reduce((a, b) => a + b, 0) - sp;
  let x = W / 2 - total / 2;
  [...text].forEach((ch, i) => {
    const a = E.outExpo(prog(t, 1.0 + i * 0.065, 1.0 + i * 0.065 + 0.95));
    tx.globalAlpha = a;
    tx.fillStyle = "#fff6e6";
    tx.fillText(ch, x, H / 2 + 60 + (1 - a) * 46);
    x += widths[i];
  });
  tx.globalAlpha = 1;
  tx.globalCompositeOperation = "source-atop";
  const bx = lerp(-400, W + 400, E.inOutCubic(prog(t, 2.6, 4.8)));
  const bg = tx.createLinearGradient(bx - 220, 0, bx + 220, 0);
  bg.addColorStop(0, "rgba(255,160,70,0)");
  bg.addColorStop(0.5, "rgba(255,170,80,0.95)");
  bg.addColorStop(1, "rgba(255,160,70,0)");
  tx.fillStyle = bg;
  tx.fillRect(0, 0, W, H);
  tx.globalCompositeOperation = "source-over";
  // soft halo from a tiny downsample (cheap, stable) then the crisp letters
  if (!titleHalo) titleHalo = mk(240, 103);
  const hx = titleHalo.getContext("2d")!;
  hx.clearRect(0, 0, 240, 103);
  hx.drawImage(titleTmp, 0, 0, 240, 103);
  c.save();
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = 0.75;
  c.imageSmoothingQuality = "high";
  c.drawImage(titleHalo, 0, 0, W, H);
  c.restore();
  c.drawImage(titleTmp, 0, 0);

  // orange rule
  const rk = E.outExpo(prog(t, 2.4, 3.4));
  c.fillStyle = "#ff7a2f";
  c.fillRect(W / 2 - 520 * rk, H / 2 + 98, 1040 * rk, 4);
  c.save();
  c.globalAlpha = E.outCubic(prog(t, 3.2, 4.2));
  c.font = `500 40px ${F.serif}`;
  c.textAlign = "center";
  c.fillStyle = "#ffe9cf";
  c.fillText("ロスト・オン・アース", W / 2, H / 2 + 165);
  c.restore();
  mono(c, "EPISODE 01  —  THE GREEN SILENCE", W / 2, H / 2 + 215, 22, "#ffbe8a", "center", 10, E.outCubic(prog(t, 4.0, 5.0)));
}

export const sceneTitle: Scene = {
  id: "title", label: "Title", start: 42, dur: 8, fin: 0.5, fout: 0.9, bloom: 0.3, caps: [],
  draw: (c, t, _g, A) => drawTitle(c, t, A),
};

/* ======================================================================= 3 · INVENTORY */
const S3caps: Cap[] = [
  [0.9, 4.6, "Five items. One recorder. Zero maps."],
  [5.0, 9.6, "People say you die out here from thirst, or hunger, or fear. Fieldwork taught me different."],
  [10.0, 13.6, "You die from bad decisions."],
  [14.0, 17.8, "So: make one good one. Follow the water. Every river ends where people live."],
];

const rr = (c: C2, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 5) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.stroke();
  }
};

function icon(c: C2, kind: number, t: number) {
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  const ink = "#15110d";
  if (kind === 0) {
    rr(c, -42, -76, 84, 150, 14, "#f2c230", ink);
    c.strokeStyle = ink;
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(-26, -60 + i * 8);
      c.lineTo(26, -60 + i * 8);
      c.stroke();
    }
    rr(c, -28, -8, 56, 34, 5, "#1f3b30", ink, 3);
    mono(c, "11%", 0, 17, 18, "#9fffcf", "center", 1);
    c.fillStyle = Math.floor(t * 1.2) % 2 === 0 ? "#ff3b30" : "#7a1a14";
    c.beginPath();
    c.arc(24, -30, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2b2b2b";
    c.beginPath();
    c.arc(-16, 52, 10, 0, Math.PI * 2);
    c.arc(16, 52, 10, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#8a6b2a";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-30, -76);
    c.quadraticCurveTo(-60, -110, 0, -110);
    c.quadraticCurveTo(60, -110, 30, -76);
    c.stroke();
  } else if (kind === 1) {
    c.rotate(-0.55);
    rr(c, -86, -15, 92, 30, 10, "#3a2a1c", ink);
    c.beginPath();
    c.moveTo(4, -15);
    c.lineTo(86, -4);
    c.lineTo(94, 15);
    c.lineTo(4, 15);
    c.closePath();
    c.fillStyle = "#cfd6da";
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = ink;
    c.beginPath();
    c.arc(-6, 0, 5, 0, Math.PI * 2);
    c.fill();
  } else if (kind === 2) {
    c.strokeStyle = "#222";
    c.lineWidth = 12;
    c.beginPath();
    c.arc(0, 18, 76, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
    rr(c, -36, -34, 72, 54, 12, "#4a5156", ink);
    c.fillStyle = "#cfe9ff";
    c.beginPath();
    c.arc(0, -6, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -6, 18, 0, Math.PI * 2);
    c.moveTo(-10, -20);
    c.lineTo(2, -4);
    c.lineTo(-4, 8);
    c.moveTo(2, -4);
    c.lineTo(14, -8);
    c.stroke();
  } else if (kind === 3) {
    rr(c, -76, -28, 152, 58, 6, "#d65a2b", ink);
    c.fillStyle = "#f4e8d4";
    c.fillRect(-52, -14, 104, 28);
    c.beginPath();
    c.moveTo(-76, -28);
    for (let i = 0; i < 9; i++) c.lineTo(-76 + 19 * (i + 0.5), -36 + (i % 2) * 8);
    c.lineTo(76, -28);
    c.fillStyle = "#d65a2b";
    c.fill();
    mono(c, "ENERGY", 0, 6, 17, "#2a1a10", "center", 3);
  } else {
    rr(c, -34, -64, 68, 128, 12, "#2f353a", ink);
    c.fillStyle = "#2f353a";
    c.fillRect(22, -96, 10, 36);
    rr(c, -24, -52, 48, 34, 4, "#13222a", ink, 3);
    c.strokeStyle = "rgba(255,255,255,0.7)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-18, -50);
    c.lineTo(-2, -36);
    c.lineTo(-10, -22);
    c.moveTo(-2, -36);
    c.lineTo(16, -30);
    c.stroke();
    c.fillStyle = "#8b949a";
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.arc(-16 + (i % 3) * 16, 0 + Math.floor(i / 3) * 18, 5, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

const ITEMS = [
  { name: "RECORDER", s: ["Parabolic mic. The log.", "Battery: 11%."], hot: true },
  { name: "FOLDING KNIFE", s: ["Dull. Still a knife."], hot: false },
  { name: "HEADLAMP", s: ["Cracked lens.", "One good bulb."], hot: false },
  { name: "ENERGY BAR", s: ["Just one.", "Half melted."], hot: false },
  { name: "SAT PHONE", s: ["No signal.", "Never had one."], hot: false },
];

function drawInventory(c: C2, t: number, g: number, A: Assets) {
  blurred(c, (gg) => cover(gg, A.canopy, { z: 1.12, fx: 0.5, fy: 0.5 }), 12, 1, "inv");
  c.fillStyle = "rgba(3,14,12,0.7)";
  c.fillRect(0, 0, W, H);
  mist(c, t, 14, { alpha: 0.07, n: 6, y0: 0.2, y1: 0.9, speed: 10 });
  motes(c, t, 44, 30, { size: 6, alpha: 0.4 });

  const hk = E.outExpo(prog(t, 0.2, 1.2));
  c.save();
  c.globalAlpha = hk;
  c.font = `110px ${F.title}`;
  c.fillStyle = "#fff4e2";
  c.fillText("INVENTORY", 90, 150);
  c.fillStyle = "#ff7a2f";
  c.fillRect(90, 172, 480 * hk, 4);
  c.restore();
  mono(c, "05 ITEMS  ·  01 PERSON  ·  00 MAPS", W - 90, 150, 20, "#9fe8d2", "right", 4, hk);

  const cw = 330, ch = 340, gap = 24;
  const x0 = (W - (5 * cw + 4 * gap)) / 2;
  const y0 = 215;
  ITEMS.forEach((it, i) => {
    const k = E.outQuint(prog(t, 1.4 + i * 0.45, 2.4 + i * 0.45));
    if (k <= 0) return;
    c.save();
    c.translate(x0 + i * (cw + gap), y0 + (1 - k) * 50);
    c.globalAlpha = k;
    rr(c, 0, 0, cw, ch, 10, "rgba(8,26,22,0.78)", "rgba(190,255,235,0.2)", 1.5);
    if (it.hot) {
      glow(c, cw / 2, ch / 2, 280, "255,140,60", 0.16);
      rr(c, 0, 0, cw, ch, 10, undefined, "rgba(255,150,70,0.9)", 2.5);
    }
    // corner brackets
    c.strokeStyle = "#ff7a2f";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 26); c.lineTo(0, 0); c.lineTo(26, 0);
    c.moveTo(cw - 26, ch); c.lineTo(cw, ch); c.lineTo(cw, ch - 26);
    c.stroke();
    mono(c, `0${i + 1}`, 20, 38, 18, "#ff9a5c", "left", 4);
    c.save();
    c.translate(cw / 2, 150);
    c.scale(1.15, 1.15);
    icon(c, i, t);
    c.restore();
    c.font = `46px ${F.title}`;
    c.fillStyle = "#fff4e2";
    c.textAlign = "center";
    c.fillText(it.name, cw / 2, ch - 82);
    it.s.forEach((l, li) => mono(c, l, cw / 2, ch - 50 + li * 24, 15, "#a9d9ca", "center", 1));
    // stamp
    if (i === 4) {
      const sk = E.outExpo(prog(t, 10.6, 11.0));
      if (sk > 0) {
        c.save();
        c.translate(cw / 2, 150);
        c.rotate(-0.28);
        const s = lerp(2.4, 1, sk);
        c.scale(s, s);
        c.globalAlpha = sk;
        c.strokeStyle = "#ff3b30";
        c.lineWidth = 6;
        c.strokeRect(-110, -34, 220, 68);
        c.font = `58px ${F.title}`;
        c.fillStyle = "#ff3b30";
        c.textAlign = "center";
        c.fillText("USELESS", 0, 20);
        c.restore();
      }
    }
    if (i === 1) {
      const sk = E.outExpo(prog(t, 11.4, 11.8));
      if (sk > 0) {
        c.save();
        c.translate(cw / 2, 150);
        c.rotate(-0.28);
        c.scale(lerp(2.4, 1, sk), lerp(2.4, 1, sk));
        c.globalAlpha = sk;
        c.strokeStyle = "#ffb14a";
        c.lineWidth = 5;
        c.strokeRect(-70, -28, 140, 56);
        c.font = `46px ${F.title}`;
        c.fillStyle = "#ffb14a";
        c.textAlign = "center";
        c.fillText("DULL", 0, 16);
        c.restore();
      }
    }
    c.restore();
  });

  // final line
  typeText(c, "NEAREST HUMAN:  UNKNOWN", 90, 640, 13.8, t, { font: `500 30px ${F.mono}`, color: "#ffdcc0", per: 0.04, sp: 3, rise: 8 });
  typeText(c, "HEADING:  DOWNSTREAM", 90, 684, 15.0, t, { font: `500 30px ${F.mono}`, color: "#8fffd6", per: 0.04, sp: 3, rise: 8 });

  rec(c, g, 0.9);
  batteryIcon(c, W - 190, 52, battery(g), 0.95);
  vignette(c, 0.5);
  void twos;
  void pw;
}

export const sceneInventory: Scene = {
  id: "inventory", label: "Inventory", start: 50, dur: 18, fin: 0.6, fout: 0.5, caps: S3caps,
  draw: (c, t, g, A) => {
    drawInventory(c, t, g, A);
    desat(c, 0.1);
  },
};
