import { RGB, TAU, V2, clamp, hash, heart, kf, lerp, mix3, rgba, scale3, smooth } from "../util";
import { Pal, glow } from "../look";
import { PostParams } from "../post";
import { MechPose, drawLensCU, drawMech, idlePose } from "../mech";
import { drawEye, drawManta } from "../manta";
import { AMBER, GOLD, RED, drawBaby } from "./common";

const W = 1280, H = 720;

// ============================================================ 2001: the lens
export function sceneLens(ctx: CanvasRenderingContext2D, t: number, pal: Pal, post: PostParams) {
  const k = clamp((t - 56) / 5);
  const bg = ctx.createRadialGradient(640, 360, 40, 640, 360, 820);
  bg.addColorStop(0, "#161723");
  bg.addColorStop(1, "#010103");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(120,140,180,0.06)";
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 48 + 10);
    ctx.lineTo(W, i * 48 + 10);
    ctx.stroke();
  }
  const color = mix3(AMBER, RED, smooth(58, 59.6, t));
  const R = lerp(205, 300, k * k);
  drawLensCU(ctx, 640, 356, R, {
    color, glow: lerp(0.45, 1, smooth(58, 60, t)), pal, t,
    dil: kf(t, [[56, 0.45], [59, 0.18], [60.6, 0.4]]),
    refl: (c, r) => {
      // the falling star, and a thin row of village lanterns, mirrored in the glass
      const u = smooth(56, 61, t);
      const sx = lerp(r * 0.55, -r * 0.08, u), sy = lerp(-r * 0.75, r * 0.02, u * u);
      c.globalCompositeOperation = "lighter";
      const g = c.createLinearGradient(sx, sy, sx + r * 0.5, sy - r * 0.9);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(180,220,255,0)");
      c.strokeStyle = g;
      c.lineWidth = r * 0.03;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + r * 0.5, sy - r * 0.9);
      c.stroke();
      glow(c, sx, sy, r * 0.16 * (1 + 0.3 * heart(t)), [220, 240, 255], 0.9);
      for (let i = 0; i < 22; i++) {
        const lx = -r * 0.7 + (i / 21) * r * 1.4;
        const ly = r * 0.5 + Math.sin(i * 0.9) * r * 0.04 - Math.abs(lx) * 0.18;
        glow(c, lx, ly, r * 0.04, AMBER, 0.55);
      }
      c.globalCompositeOperation = "source-over";
    },
  });
  post.chroma = 0.7;
  post.bloom = 1.25;
  post.vig = 1.1;
  post.wobble = 0.2;
}

// ===================================================== E.T.: the touching finger
export function sceneTouch(ctx: CanvasRenderingContext2D, t: number, pal: Pal, post: PostParams) {
  const u = t - 93;
  const hb = heart(t);
  const bg = ctx.createRadialGradient(760, 340, 20, 760, 340, 900);
  bg.addColorStop(0, rgba(mix3(pal.sea, pal.accent, 0.18)));
  bg.addColorStop(1, "#010208");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // bokeh: the village, out of focus
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const x = (hash(i * 3.1) * 1500 - 100 + Math.sin(t * 0.2 + i) * 20) % 1400;
    const y = hash(i * 7.7) * 760;
    const r = 26 + hash(i + 4) * 70;
    glow(ctx, x, y, r, pal.lamp, (0.1 + 0.16 * hb) * (0.5 + hash(i + 2)));
  }
  ctx.globalCompositeOperation = "source-over";

  const bx = 900, by = 350, size = 215 + Math.sin(t * 1.1) * 5;
  const approach = smooth(93, 97, t);
  const tipx = lerp(300, 590, approach);
  const tipy = 356 + Math.sin(t * 2) * 2;
  const contact = smooth(97, 97.35, t);
  const camLook = smooth(98.6, 100.2, t);
  const look: V2 = [lerp(-0.9, 0, camLook), lerp(0.05, 0, camLook)];

  drawBaby(ctx, {
    x: bx, y: by, size, t, pal, glow: 0.7 + 0.5 * contact, eyes: smooth(93.4, 96.8, t), look,
    col: mix3(pal.accent, GOLD, contact * 0.7), rot: -0.06, map: 0.4 * contact,
  });
  // the third eye
  const te = smooth(100.5, 102.2, t);
  if (te > 0.01) {
    glow(ctx, bx, by + 6, size * 0.5, [255, 255, 255], 0.5 * te);
    drawEye(ctx, bx, by + 10, size * 0.2, te, [255, 255, 255], [0, 0], 0.1, 1);
  }

  // tendril
  const reach = smooth(94.3, 97, t);
  const S: V2 = [bx - size * 0.52, by - 4];
  const E: V2 = [tipx + 30, tipy];
  const c1: V2 = [bx - size * 1.1, by - 70], c2: V2 = [tipx + 140, tipy + 60];
  const bz = (uu: number): V2 => {
    const a = 1 - uu;
    return [
      a * a * a * S[0] + 3 * a * a * uu * c1[0] + 3 * a * uu * uu * c2[0] + uu * uu * uu * E[0],
      a * a * a * S[1] + 3 * a * a * uu * c1[1] + 3 * a * uu * uu * c2[1] + uu * uu * uu * E[1],
    ];
  };
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const [w, a] of [[16, 0.12], [7, 0.3], [2.4, 0.95]] as [number, number][]) {
    ctx.strokeStyle = rgba(mix3(pal.accent, GOLD, contact), a);
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const p = bz((i / 40) * reach);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  const tp = bz(reach);
  glow(ctx, tp[0], tp[1], 26, [255, 255, 255], 0.9);
  ctx.restore();

  // the finger (the old machine's hand)
  ctx.save();
  ctx.translate(tipx, tipy);
  const base = mix3([50, 60, 86], pal.haze, 0.2);
  const fg = ctx.createLinearGradient(0, -120, 0, 120);
  fg.addColorStop(0, rgba(mix3(base, pal.lit, 0.55)));
  fg.addColorStop(0.35, rgba(base));
  fg.addColorStop(1, rgba(scale3(base, 0.25)));
  const finger = () => {
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.bezierCurveTo(-120, -34, -300, -56, -800, -140);
    ctx.lineTo(-800, 140);
    ctx.bezierCurveTo(-300, 56, -120, 34, 0, 17);
    ctx.quadraticCurveTo(26, 0, 0, -17);
    ctx.closePath();
  };
  finger();
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(4,6,12,0.9)";
  ctx.stroke();
  ctx.save();
  finger();
  ctx.clip();
  for (const x of [-95, -230, -390, -590]) {
    ctx.fillStyle = "rgba(4,6,12,0.8)";
    ctx.fillRect(x, -200, 7, 400);
    ctx.fillStyle = rgba(pal.lit, 0.25);
    ctx.fillRect(x - 3, -200, 2, 400);
    for (const yy of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.arc(x - 18, yy * (20 + -x * 0.14), 3, 0, TAU);
      ctx.fillStyle = rgba(pal.lit, 0.35);
      ctx.fill();
    }
  }
  // light runs up the arm after contact
  if (contact > 0) {
    ctx.globalCompositeOperation = "lighter";
    const px = -((u - 4.0) * 360) % 900;
    const lg = ctx.createLinearGradient(px - 160, 0, px + 160, 0);
    lg.addColorStop(0, "rgba(255,200,120,0)");
    lg.addColorStop(0.5, `rgba(255,220,150,${0.5 * contact})`);
    lg.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(-900, -160, 900, 320);
    glow(ctx, -10, 0, 80, GOLD, 0.8 * contact);
  }
  ctx.restore();
  ctx.restore();

  // contact burst
  if (u > 4) {
    const cx = tipx + 28;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, cx, tipy, 140 + 40 * hb, [255, 240, 200], contact * 0.9);
    for (let k = 0; k < 3; k++) {
      const r = Math.max(0, t - 97 - k * 0.35) * 280;
      ctx.strokeStyle = rgba(GOLD, 0.45 * (1 - clamp(r / 800)));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, tipy, r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  post.flash = 0.5 * Math.exp(-Math.max(0, t - 97) * 3.2) * (t > 97 ? 1 : 0);
  post.glitch = t > 97 && t < 97.4 ? 0.6 : t > 100.5 && t < 101 ? 0.35 : 0;
  post.chroma = 0.5;
  post.bloom = 1.2;
  post.exposure = 1 - smooth(103.2, 104, t);
}

// ===================================================== Inception: the totem
function drawTop(ctx: CanvasRenderingContext2D, t: number, tilt: number, pal: Pal, mirror: boolean) {
  ctx.save();
  ctx.rotate(tilt);
  if (mirror) ctx.scale(1, -1);
  const ph = t * 31;
  const topY = -92;
  // body
  const bg = ctx.createLinearGradient(-56, 0, 56, 0);
  bg.addColorStop(0, "#d8dce8");
  bg.addColorStop(0.45, "#7c8294");
  bg.addColorStop(1, "#1b1d28");
  ctx.beginPath();
  ctx.moveTo(-56, topY);
  ctx.bezierCurveTo(-52, topY + 40, -16, -18, 0, 0);
  ctx.bezierCurveTo(16, -18, 52, topY + 40, 56, topY);
  ctx.ellipse(0, topY, 56, 13, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  // spin bands
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const a = ph + (i / 9) * TAU;
    const c = Math.cos(a);
    if (c < 0) continue;
    const x = Math.sin(a) * 56;
    ctx.strokeStyle = i % 2 ? "rgba(255,170,70,0.55)" : "rgba(10,12,20,0.55)";
    ctx.lineWidth = 3 + c * 2;
    ctx.beginPath();
    ctx.moveTo(x, topY + 8);
    ctx.quadraticCurveTo(x * 0.7, topY * 0.4, 0, 0);
    ctx.stroke();
  }
  ctx.restore();
  // disc top & stem
  ctx.beginPath();
  ctx.ellipse(0, topY, 56, 13, 0, 0, TAU);
  ctx.fillStyle = "#c9cede";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, topY, 20, 4.5, 0, 0, TAU);
  ctx.fillStyle = "#6c7184";
  ctx.fill();
  ctx.fillStyle = "#aab0c4";
  ctx.fillRect(-4, topY - 38, 8, 36);
  ctx.beginPath();
  ctx.arc(0, topY - 40, 7, 0, TAU);
  ctx.fillStyle = "#e7eaf4";
  ctx.fill();
  void pal;
  ctx.restore();
}

export function sceneCockpit(ctx: CanvasRenderingContext2D, t: number, pal: Pal, post: PostParams) {
  const u = t - 168;
  const hb = heart(t);
  ctx.fillStyle = "#040307";
  ctx.fillRect(0, 0, W, H);
  // the window: the world, folding and spinning outside
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(150, 60);
  ctx.lineTo(1130, 60);
  ctx.lineTo(1200, 250);
  ctx.lineTo(80, 250);
  ctx.closePath();
  ctx.clip();
  ctx.translate(640, 190);
  ctx.rotate(Math.sin(t * 0.7) * 0.35 + u * 0.22);
  const sk = ctx.createLinearGradient(0, -400, 0, 400);
  sk.addColorStop(0, "#2a0510");
  sk.addColorStop(0.5, "#b0384a");
  sk.addColorStop(0.5001, "#10121f");
  sk.addColorStop(1, "#02030a");
  ctx.fillStyle = sk;
  ctx.fillRect(-1200, -600, 2400, 1200);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 60; i++) {
    const x = ((hash(i * 3.1) * 2400 - 1200 + u * 120 * (0.3 + hash(i))) % 2400);
    const y = (hash(i * 7.3) - 0.5) * 700;
    glow(ctx, x < -1200 ? x + 2400 : x, y, 6 + hash(i) * 10, [255, 220, 220], 0.5);
  }
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  // window frame
  ctx.strokeStyle = "#0b0a10";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(150, 60);
  ctx.lineTo(1130, 60);
  ctx.lineTo(1200, 250);
  ctx.lineTo(80, 250);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#0b0a10";
  ctx.fillRect(630, 60, 20, 190);

  // dashboard
  const dg = ctx.createLinearGradient(0, 300, 0, 720);
  dg.addColorStop(0, "#14121a");
  dg.addColorStop(1, "#060509");
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.lineTo(0, 400);
  ctx.quadraticCurveTo(640, 330, 1280, 400);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();
  glow(ctx, 640, 520, 520, [255, 150, 60], 0.35);
  // gauges
  for (let i = 0; i < 6; i++) {
    const gx = i < 3 ? 120 + i * 112 : 830 + (i - 3) * 112;
    const gy = 470 - Math.abs((i % 3) - 1) * -14 + (i < 3 ? (2 - i) * 6 : i * 4 - 8);
    ctx.beginPath();
    ctx.arc(gx, gy, 46, 0, TAU);
    ctx.fillStyle = "#050509";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#252734";
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,170,70,0.5)";
    ctx.lineWidth = 1;
    for (let k = 0; k < 11; k++) {
      const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(a) * 34, gy + Math.sin(a) * 34);
      ctx.lineTo(gx + Math.cos(a) * 40, gy + Math.sin(a) * 40);
      ctx.stroke();
    }
    const na = i === 2 ? u * 4 : Math.PI * 0.75 + (0.5 + 0.5 * Math.sin(t * (0.6 + i * 0.37) + i)) * Math.PI * 1.5;
    ctx.strokeStyle = i === 2 ? "#ff6040" : "#ffb35a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.cos(na) * 34, gy + Math.sin(na) * 34);
    ctx.stroke();
    glow(ctx, gx, gy, 62, [255, 150, 60], 0.18);
  }
  // heart lamp through bars, right side
  glow(ctx, 1150, 610, 150 + 20 * hb, pal.lamp, 0.8);
  ctx.strokeStyle = "#08070b";
  ctx.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(1100 + i * 25, 560);
    ctx.lineTo(1100 + i * 25, 700);
    ctx.stroke();
  }

  // the plate and the top
  const px = 640, py = 566;
  const pg = ctx.createLinearGradient(px - 150, 0, px + 150, 0);
  pg.addColorStop(0, "#2a2c3a");
  pg.addColorStop(0.4, "#7b7f94");
  pg.addColorStop(1, "#1a1b24");
  ctx.beginPath();
  ctx.ellipse(px, py + 6, 150, 30, 0, 0, TAU);
  ctx.fillStyle = "#07070a";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px, py, 146, 28, 0, 0, TAU);
  ctx.fillStyle = pg;
  ctx.fill();
  const wob = 0.012 + 0.07 * smooth(169, 176.8, t);
  const tilt = wob * Math.sin(t * 3.1);
  ctx.save();
  ctx.translate(px, py - 4);
  ctx.globalAlpha = 0.22;
  drawTop(ctx, t, tilt, pal, true);
  ctx.restore();
  ctx.save();
  ctx.translate(px, py - 4);
  drawTop(ctx, t, tilt, pal, false);
  ctx.restore();

  // a very old hand, resting beside it
  ctx.save();
  ctx.translate(310, 600);
  ctx.rotate(-0.12);
  const skin = "#3a2a28";
  ctx.fillStyle = "#0d0b12";
  ctx.beginPath();
  ctx.moveTo(-340, 140);
  ctx.lineTo(-340, 30);
  ctx.lineTo(-60, -22);
  ctx.lineTo(-60, 90);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(40, 10, 108, 46, 0.05, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = skin;
    ctx.lineCap = "round";
    ctx.lineWidth = 21 - i * 2;
    ctx.beginPath();
    ctx.moveTo(110, -14 + i * 17);
    ctx.quadraticCurveTo(160 + i * 6, -22 + i * 18, 196 + i * 8 - Math.abs(i - 1.5) * 8, -8 + i * 20 + Math.sin(t * 1.4 + i) * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,170,80,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(40, 10, 108, 46, 0.05, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = "rgba(10,6,6,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(-10 + i * 18, -10 + (i % 3) * 8);
    ctx.lineTo(8 + i * 18, 2 + (i % 3) * 8);
    ctx.stroke();
  }
  ctx.restore();

  post.bloom = 1.3;
  post.vig = 1.15;
  post.tint = [1.06, 0.97, 0.9];
  post.chroma = 0.45;
  post.wobble = 0.25;
  post.grain = 0.1;
  post.exposure = smooth(168, 168.5, t) * (1 - smooth(176.75, 177, t));
}

// ===================================================== Interstellar: Gargantua
const GSTARS = Array.from({ length: 320 }, (_, i) => ({ x: hash(i * 1.7) * W, y: hash(i * 3.9) * H, r: 0.5 + Math.pow(hash(i + 5), 3) * 1.8 }));

export function sceneGargantua(ctx: CanvasRenderingContext2D, t: number, pal: Pal, post: PostParams) {
  const k = clamp((t - 212) / 10);
  const fall = smooth(219, 222, t);
  const R = lerp(64, 128, k) + fall * fall * 700;
  const cx = 640, cy = 300;
  ctx.fillStyle = "#010103";
  ctx.fillRect(0, 0, W, H);
  // lensed stars
  for (const s of GSTARS) {
    const vx = s.x - cx, vy = s.y - cy;
    const d = Math.hypot(vx, vy) + 0.001;
    const sc = 1 + (R * R * 2.1) / (d * d + R * R * 0.4);
    const x = cx + vx * sc, y = cy + vy * sc;
    if (Math.hypot(x - cx, y - cy) < R * 1.05 || x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    glow(ctx, x, y, 2 + s.r * 2.6, [220, 230, 255], 0.5 + 0.4 * Math.sin(t * 1.3 + s.x));
  }
  glow(ctx, cx, cy, R * 5, [255, 150, 70], 0.28);
  const tilt = -0.07;
  const ring = (back: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const u = i / 45;
      const rx = R * (1.35 + u * 3.6);
      const ry = rx * 0.13;
      const c: RGB = u < 0.35 ? mix3([255, 248, 230], [255, 190, 100], u / 0.35) : mix3([255, 190, 100], [150, 52, 20], (u - 0.35) / 0.65);
      const g = ctx.createLinearGradient(-rx, 0, rx, 0);
      g.addColorStop(0, rgba(c, 0.95 - u * 0.4));
      g.addColorStop(0.5, rgba(c, 0.35));
      g.addColorStop(1, rgba(c, 0.12));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.2 + u * 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, back ? Math.PI : 0, back ? TAU : Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  };
  ring(true);
  // lensed image of the far side of the disk, wrapping over and under the hole
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 18; i++) {
    const u = i / 17;
    ctx.strokeStyle = rgba(mix3([255, 245, 220], [255, 150, 70], u), 0.5 * (1 - u));
    ctx.lineWidth = 3 - u * 2;
    const rx = Math.max(0.1, R * (1.04 + u * 0.55));
    const ry = Math.max(0.1, rx * (1 + u * 0.05));
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = "#000";
  ctx.fill();
  ring(false);
  glow(ctx, cx, cy, R * 1.18, [255, 235, 200], 0.4);

  // gate, platform and the tiny machine
  const stone = "#020205";
  ctx.fillStyle = stone;
  ctx.fillRect(0, 668, W, 60);
  ctx.fillRect(524, 440, 17, 232);
  ctx.fillRect(739, 440, 17, 232);
  ctx.beginPath();
  ctx.moveTo(480, 452);
  ctx.quadraticCurveTo(640, 410, 800, 452);
  ctx.lineTo(790, 434);
  ctx.quadraticCurveTo(640, 388, 490, 434);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(520, 470, 240, 8);
  const pose: MechPose = {
    x: 640, y: 668, s: 0.27, ...idlePose(t), lens: AMBER, glow: 0.9, t, pal: { ...pal, lit: [255, 180, 120], haze: [30, 20, 20] },
    lamp: 1, heart: 0.8 + 0.3 * heart(t), gaze: [0, -1],
  };
  drawMech(ctx, pose);
  drawBaby(ctx, { x: 676, y: 560 + Math.sin(t) * 4, size: 16, t, pal, glow: 0.8 });

  post.swirl = 0.15 + 0.9 * k * k + fall * 2;
  post.chroma = 0.5;
  post.bloom = 1.5;
  post.zoomBlur = fall * 0.28;
  post.zoomC = [0.5, 0.42];
  post.flash = smooth(221.1, 222, t);
  post.exposure = smooth(212, 214, t);
}

// ===================================================== 2001: the Star Gate
export function sceneStargate(ctx: CanvasRenderingContext2D, t: number, _pal: Pal, post: PostParams) {
  const u = t - 222;
  const k = clamp(u / 9);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(640, 345);
  ctx.rotate(Math.sin(t * 0.21) * 0.18 + u * 0.035);
  ctx.globalCompositeOperation = "lighter";
  const N = 72;
  const spd = 0.2 + 0.32 * k;
  for (let i = 0; i < N; i++) {
    const z = (i / N + t * spd) % 1;
    const s = Math.exp(lerp(-6.4, 1.5, z));
    const hw = s * 720, hh = s * 405;
    const alpha = smooth(0.06, 0.3, z) * (1 - smooth(0.9, 1, z));
    const hue = (i * 9 + t * 60) % 360;
    ctx.strokeStyle = `hsla(${hue},95%,58%,${alpha * 0.85})`;
    ctx.lineWidth = 0.7 + s * 5;
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.fillStyle = `hsla(${(hue + 40) % 360},90%,50%,${alpha * 0.045})`;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    if (hash(i * 7.7) < 0.13 && hw < 1100) {
      const er = Math.min(150, hw * 0.13 + 4);
      drawEye(ctx, 0, -hh * 0.9, er, alpha, [255, 255, 255], [0, 0.6], 0.14, alpha);
      drawEye(ctx, hw * 0.92, 0, er * 0.8, alpha * 0.8, [190, 230, 255], [-0.6, 0], 0.14, alpha);
    }
  }
  // corner rays
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const g = ctx.createLinearGradient(0, 0, dx * 1400, dy * 800);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dx * 1400, dy * 800);
    ctx.stroke();
  }
  glow(ctx, 0, 0, 140, [255, 240, 220], 0.14);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";

  // the Mother passes overhead
  const mk = smooth(225.5, 231, t);
  if (mk > 0 && mk < 1.001) {
    drawManta(ctx, {
      x: 640, y: lerp(430, 280, mk), size: lerp(70, 1350, mk * mk), t, flap: t * 1.4, amp: 1,
      alpha: 0.95 * smooth(0, 0.1, mk), glow: 0.1, eyes: smooth(0.2, 0.7, mk), map: smooth(0.4, 0.9, mk),
      skin: [4, 4, 10], skinDark: [0, 0, 3], light: [210, 240, 255], maw: 0, tail: false,
    });
  }
  post.kaleido = t > 223.5 ? kf(t, [[223.5, 4], [228, 6], [231, 8]]) : 0;
  post.kRot = t * 0.12;
  post.hue = t * 0.35;
  post.chroma = 0.9;
  post.zoomBlur = 0.12 + 0.1 * k;
  post.bloom = 0.7;
  post.flash = (1 - smooth(222, 223.2, t)) * 0.9;
}

// ===================================================== the lantern galaxy
export function sceneGalaxy(ctx: CanvasRenderingContext2D, t: number, pal: Pal, post: PostParams) {
  const k = clamp((t - 231) / 7);
  const z = Math.exp(k * 7.2);
  const bg = ctx.createRadialGradient(640, 345, 10, 640, 345, 800);
  bg.addColorStop(0, "#1a0f1c");
  bg.addColorStop(1, "#010104");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(640, 345);
  ctx.globalCompositeOperation = "lighter";
  const rotBase = t * 0.12;
  for (let i = 0; i < 1500; i++) {
    const rr = Math.pow(hash(i * 1.37), 0.75) * 540;
    const arm = (i % 2) * Math.PI;
    const th = rr * 0.0105 + arm + (hash(i + 3) - 0.5) * 0.55 + rotBase * (1.4 - rr / 540);
    const x = Math.cos(th) * rr * z, y = Math.sin(th) * rr * 0.82 * z;
    if (Math.abs(x) > 760 || Math.abs(y) > 440) continue;
    const c = mix3(pal.lamp, [140, 175, 255], clamp(rr / 560));
    const r = (3 + hash(i + 8) * 7) * (1 + Math.min(z, 80) * 0.05);
    glow(ctx, x, y, r, c, 0.55 + 0.35 * Math.sin(t * 2 + i));
  }
  // dust
  for (let i = 0; i < 40; i++) {
    const rr = hash(i * 5.1) * 480;
    const th = rr * 0.0105 + (i % 2) * Math.PI + rotBase * (1.4 - rr / 540);
    glow(ctx, Math.cos(th) * rr * z, Math.sin(th) * rr * 0.82 * z, 70 * (1 + Math.min(z, 40) * 0.2), mix3(pal.accent, [255, 120, 200], hash(i)), 0.06);
  }
  // the one that matters
  glow(ctx, 0, 0, 22 * z, [255, 190, 100], 0.9);
  glow(ctx, 0, 0, 9 * z, [255, 255, 255], 0.9);
  ctx.restore();
  post.swirl = 0.5 + k * 0.6;
  post.chroma = 0.7;
  post.bloom = 1.5;
  post.kaleido = 0;
  post.zoomBlur = 0.05 + k * 0.1;
  post.flash = smooth(236.6, 238, t);
}

// ===================================================== 2001: the white room
export function sceneWhiteRoom(ctx: CanvasRenderingContext2D, t: number, _pal: Pal, post: PostParams) {
  const c = kf(t, [[238, 0], [244, 0.55], [249, 1.15], [250.5, 3.2], [252, 9.6]]);
  const VX = 640, VY = 322, FY = 250, CY = 300, HW = 620;
  const P = (x: number, y: number, d: number): V2 => [VX + x / d, VY + y / d];
  const D = (z: number) => z - c;
  const ZB = 27;

  ctx.fillStyle = "#98a9c6";
  ctx.fillRect(0, 0, W, H);
  const bwd = D(ZB);
  const bwTL = P(-HW, -CY, bwd), bwBR = P(HW, FY, bwd);
  ctx.fillStyle = "#b6c8e2";
  ctx.fillRect(bwTL[0], bwTL[1], bwBR[0] - bwTL[0], bwBR[1] - bwTL[1]);

  // ceiling
  const near = 0.32;
  const cp = [P(-HW, -CY, near), P(HW, -CY, near), P(HW, -CY, bwd), P(-HW, -CY, bwd)];
  const cg = ctx.createLinearGradient(0, 0, 0, VY);
  cg.addColorStop(0, "#e6eef9");
  cg.addColorStop(1, "#b4c3dd");
  ctx.fillStyle = cg;
  ctx.beginPath();
  cp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.fill();
  // walls
  for (const s of [-1, 1]) {
    const wp = [P(s * HW, -CY, near), P(s * HW, -CY, bwd), P(s * HW, FY, bwd), P(s * HW, FY, near)];
    const wg = ctx.createLinearGradient(wp[0][0], 0, wp[1][0], 0);
    wg.addColorStop(0, "#8c9fc4");
    wg.addColorStop(1, "#c9d8ee");
    ctx.fillStyle = wg;
    ctx.beginPath();
    wp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.fill();
  }
  // floor tiles
  for (let j = 0; j < 34; j++) {
    const d0 = D(1 + j * 0.8), d1 = D(1 + (j + 1) * 0.8);
    if (d1 < near) continue;
    const dd0 = Math.max(near, d0);
    for (let i = 0; i < 8; i++) {
      const x0 = -HW + i * 155, x1 = x0 + 155;
      const a = P(x0, FY, dd0), b = P(x1, FY, dd0), cc = P(x1, FY, d1), d = P(x0, FY, d1);
      const par = (i + j) % 2;
      const fade = clamp(1 - d1 / 26);
      ctx.fillStyle = par ? rgba(mix3([205, 218, 240], [150, 168, 204], 1 - fade)) : rgba(mix3([96, 114, 156], [140, 158, 196], 1 - fade));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(cc[0], cc[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.fill();
    }
  }
  // pilasters
  ctx.lineWidth = 2;
  for (let j = 0; j < 34; j++) {
    const d = D(1 + j * 1.6);
    if (d < near) continue;
    for (const s of [-1, 1]) {
      const a = P(s * HW, -CY, d), b = P(s * HW, FY, d);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,80,120,0.35)";
      ctx.beginPath();
      ctx.moveTo(a[0] + s * 3, a[1]);
      ctx.lineTo(b[0] + s * 3, b[1]);
      ctx.stroke();
    }
  }
  glow(ctx, 640, 120, 700, [255, 255, 255], 0.06);

  const obj = (z: number) => D(z);
  // monolith
  const mh = 520 * smooth(249, 251.6, t);
  const dm = obj(15);
  if (mh > 2 && dm > 0.08) {
    const w = 118;
    const sh = ctx.createLinearGradient(0, P(0, FY, dm)[1], 0, P(0, FY, dm - 4)[1]);
    sh.addColorStop(0, "rgba(10,14,30,0.55)");
    sh.addColorStop(1, "rgba(10,14,30,0)");
    ctx.fillStyle = sh;
    const s0 = P(-w, FY, dm), s1 = P(w, FY, dm), s2 = P(w * 2.6, FY, Math.max(0.1, dm - 5)), s3 = P(-w * 2.6, FY, Math.max(0.1, dm - 5));
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.lineTo(s1[0], s1[1]);
    ctx.lineTo(s2[0], s2[1]);
    ctx.lineTo(s3[0], s3[1]);
    ctx.fill();
    const tl = P(-w, FY - mh, dm), br = P(w, FY, dm);
    const mg = ctx.createLinearGradient(tl[0], 0, br[0], 0);
    mg.addColorStop(0, "#07070d");
    mg.addColorStop(0.5, "#000");
    mg.addColorStop(1, "#05050a");
    ctx.fillStyle = mg;
    ctx.fillRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]);
    ctx.strokeStyle = "rgba(180,200,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]);
    // a map of stars reflected in its face
    ctx.save();
    ctx.beginPath();
    ctx.rect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]);
    ctx.clip();
    const bw = br[0] - tl[0], bh = br[1] - tl[1];
    for (let i = 0; i < 70; i++) {
      glow(ctx, tl[0] + hash(i * 1.9) * bw, tl[1] + hash(i * 4.3) * bh, 2 + hash(i) * 3, [210, 225, 255], 0.35 + 0.5 * Math.sin(t * 1.5 + i) ** 2);
    }
    ctx.restore();
  }

  // table, chair, the old man
  const dt = obj(3.9);
  const dman = obj(3.1);
  const manA = 1 - smooth(246.3, 248.4, t);
  const stage = t < 243 ? 0 : 1;
  if (dt > 0.3) {
    const e = P(0, FY - 118, dt);
    const cloth = ctx.createLinearGradient(0, e[1], 0, P(0, FY, dt)[1]);
    cloth.addColorStop(0, "#f4f8ff");
    cloth.addColorStop(1, "#aebbd6");
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(e[0] - 175 / dt, e[1]);
    ctx.lineTo(e[0] + 175 / dt, e[1]);
    ctx.lineTo(e[0] + 210 / dt, P(0, FY, dt)[1]);
    ctx.lineTo(e[0] - 210 / dt, P(0, FY, dt)[1]);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(e[0], e[1], Math.max(0.1, 175 / Math.max(0.001, dt)), Math.max(0.1, 44 / Math.max(0.001, dt)), 0, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    // hat comes to rest on the table
    if (t > 248.3) {
      const hp = P(-90, FY - 124, dt);
      ctx.fillStyle = "#6d6350";
      ctx.beginPath();
      ctx.moveTo(hp[0], hp[1] - 52 / dt);
      ctx.quadraticCurveTo(hp[0] - 40 / dt, hp[1] - 22 / dt, hp[0] - 90 / dt, hp[1] - 2 / dt);
      ctx.quadraticCurveTo(hp[0], hp[1] + 12 / dt, hp[0] + 90 / dt, hp[1] - 2 / dt);
      ctx.quadraticCurveTo(hp[0] + 40 / dt, hp[1] - 22 / dt, hp[0], hp[1] - 52 / dt);
      ctx.fill();
    }
    // lantern
    const rise = Math.max(0, t - 249.2);
    const lp = P(60, FY - 124 - 40 - rise * rise * 70, dt);
    const lh = 46 / dt, lw = 30 / dt;
    glow(ctx, lp[0], lp[1], 230 / dt, [255, 170, 70], 0.8 * (1 - smooth(251, 252, t)));
    if (rise < 0.01) {
      ctx.fillStyle = "#3a1a10";
      ctx.fillRect(lp[0] - lw / 2, lp[1] - lh / 2, lw, lh);
      ctx.fillStyle = "rgba(255,200,110,0.95)";
      ctx.fillRect(lp[0] - lw / 2 + 2, lp[1] - lh / 2 + 2, lw - 4, lh - 4);
    } else {
      // the flame leaves its lantern and becomes a star
      ctx.fillStyle = "#3a1a10";
      ctx.fillRect(lp[0] - lw / 2, P(60, FY - 124 - 40, dt)[1] - lh / 2, lw, lh);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      const sr = 70 / dt;
      ctx.beginPath();
      ctx.moveTo(lp[0] - sr, lp[1]);
      ctx.lineTo(lp[0] + sr, lp[1]);
      ctx.moveTo(lp[0], lp[1] - sr * 1.4);
      ctx.lineTo(lp[0], lp[1] + sr * 1.4);
      ctx.stroke();
      glow(ctx, lp[0], lp[1], 90 / dt, [255, 255, 255], 0.9);
      ctx.restore();
    }
  }
  if (dman > 0.3 && manA > 0.01) {
    const bow = stage ? 26 : 0;
    const sc = stage ? 0.9 : 1;
    const q = (x: number, y: number): V2 => P(x * sc + (y < FY - 200 ? bow * 0.6 : 0), FY - y * sc + (y > 200 ? bow * 0.5 : 0), dman);
    const bodyCol = stage ? "#4a4a56" : "#14121b";
    ctx.globalAlpha = manA;
    // chair
    const c0 = P(-78, FY - 96, dman), c1 = P(78, FY - 270, dman);
    ctx.fillStyle = "#8a7e6a";
    ctx.fillRect(c0[0], c1[1], c1[0] - c0[0], c0[1] - c1[1]);
    ctx.fillStyle = "#6b6150";
    ctx.fillRect(c0[0], c0[1], c1[0] - c0[0], 18 / dman);
    // torso
    const t0 = q(-62, 96), t1 = q(62, 96), t2 = q(78, 250), t3 = q(-78, 250);
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.moveTo(t0[0], t0[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.lineTo(t2[0], t2[1]);
    ctx.quadraticCurveTo((t2[0] + t3[0]) / 2, t2[1] - 22 / dman, t3[0], t3[1]);
    ctx.closePath();
    ctx.fill();
    const hd = q(0, 300);
    ctx.beginPath();
    ctx.arc(hd[0], hd[1], 35 / dman, 0, TAU);
    ctx.fill();
    // hat
    const hat = stage ? "#7a7568" : "#3b3326";
    const a = q(0, 392), l = q(-96, 322), r = q(96, 322), m = q(0, 308);
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo((a[0] + l[0]) / 2 - 10 / dman, (a[1] + l[1]) / 2, l[0], l[1]);
    ctx.quadraticCurveTo(m[0], m[1] + 12 / dman, r[0], r[1]);
    ctx.quadraticCurveTo((a[0] + r[0]) / 2 + 10 / dman, (a[1] + r[1]) / 2, a[0], a[1]);
    ctx.fill();
    ctx.globalAlpha = 1;
    // dust leaving him
    if (t > 245.4) {
      const du = t - 245.4;
      const lp = P(60, FY - 164, dt);
      for (let i = 0; i < 160; i++) {
        const bx = (hash(i * 1.3) - 0.5) * 150, by = 60 + hash(i * 2.7) * 330;
        const p = q(bx, by);
        const tt = clamp(du / 3 - hash(i + 9) * 0.5, 0, 1);
        const x = lerp(p[0], lp[0], tt * tt) + Math.sin(du * 2 + i) * 14 * tt;
        const y = lerp(p[1], lp[1] - 40, tt) - tt * 30;
        ctx.fillStyle = `rgba(40,36,44,${0.8 * (1 - tt) * smooth(0, 0.3, du)})`;
        ctx.fillRect(x, y, 2.4, 2.4);
      }
    }
  }
  post.bloom = 0.22;
  post.chroma = 0.35;
  post.sat = 0.75;
  post.vig = 0.55;
  post.grain = 0.1;
  post.tint = [0.97, 1, 1.04];
  post.exposure = smooth(238, 238.8, t) * (1 - smooth(251.5, 252, t));
  post.flash = (1 - smooth(238, 239, t)) * 0.9;
}
