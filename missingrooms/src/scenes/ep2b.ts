import {
  C,
  CAST,
  Ctx,
  V2,
  circle,
  clothTape,
  corrCircle,
  corrLine,
  fillRR,
  line,
  mono,
  poly,
  poses,
  rr,
  txt,
  lightPool,
  clipboard,
  recorderLamp,
  stamp,
} from "../engine/draw";
import { H, W, bump, clamp, easeInOut, easeOut, lerp, pad, prog, smooth } from "../engine/util";
import type { FX } from "../engine/post";
import { applyWalk, camera } from "./common";
import { finger } from "./ep1";
import { FY, att, hl, officeBG, orr } from "./ep2a";

const SCRIPT = '"Brush Script MT","Segoe Script",cursive';
const F = "Courier New, monospace";

export function purgeStr(t: number) {
  const clock = 23 * 60 + (Math.min(t, 240) / 240) * 80;
  const remain = Math.max(0, 30 * 60 - clock); // minutes
  const hh = Math.floor(remain / 60);
  const mm = Math.floor(remain % 60);
  const ss = 59 - (Math.floor(t) % 60);
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function deskBG(ctx: Ctx, c1 = "#241a30", c2 = "#171020") {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) line(ctx, 0, i * 80 + 20, W, i * 80 + 20, "rgba(255,255,255,0.025)", 2);
  lightPool(ctx, 640, 180, 760, 0.18, "255,235,200");
}

/* ---------- BEAT 3: somewhere to unfold ---------- */

export function beat3(ctx: Ctx, lt: number, fx: FX) {
  if (lt < 10) {
    linkage(ctx, lt);
    fx.distort = 0.12;
    fx.fx = 640;
    fx.fy = 300;
    fx.fr = 260;
    fx.tint = [90, 50, 150, 0.1];
    return;
  }
  if (lt < 18.2) {
    deskBG(ctx);
    const x = 190;
    const y = 90;
    const w = 900;
    const h = 540;
    ctx.save();
    ctx.translate(640, 360);
    ctx.rotate(-0.012);
    ctx.translate(-640, -360);
    // the original plan underneath
    originalPlan(ctx, x, y, w, h);
    // current plan on top, peeling from the bottom-right corner
    const p = easeInOut(prog(lt, 15.0, 17.4)) * 0.62;
    const cx1: V2 = [x + w, y + h - h * p];
    const cx2: V2 = [x + w - w * p, y + h];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(cx1[0], cx1[1]);
    ctx.lineTo(cx2[0], cx2[1]);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.clip();
    marketingPlan(ctx, x, y, w, h, lt);
    ctx.restore();
    if (p > 0.01) {
      // flap folded back, reflection of the corner across the peel line
      const mx = (cx1[0] + cx2[0]) / 2;
      const my = (cx1[1] + cx2[1]) / 2;
      const dx = cx2[0] - cx1[0];
      const dy = cx2[1] - cx1[1];
      const L = Math.hypot(dx, dy);
      const nx = -dy / L;
      const ny = dx / L;
      const corner: V2 = [x + w, y + h];
      const d = (corner[0] - mx) * nx + (corner[1] - my) * ny;
      const rc: V2 = [corner[0] - 2 * d * nx, corner[1] - 2 * d * ny];
      poly(ctx, [cx1, cx2, rc], "#e9d9a8", "rgba(30,22,40,0.7)", 2);
      txt(ctx, "RESIDENCE", (cx1[0] + cx2[0] + rc[0]) / 3, (cx1[1] + cx2[1] + rc[1]) / 3, { size: 22, font: F, weight: 700, color: "rgba(80,60,20,0.5)", align: "center" });
    }
    ctx.restore();
    // a finger lifts the corner
    const fa = smooth(prog(lt, 14.2, 15.0)) * (1 - smooth(prog(lt, 17.6, 18.2)));
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha = fa;
      finger(ctx, lerp(x + w - 30, x + w - w * 0.62 + 20, easeInOut(prog(lt, 15, 17.4))), lerp(y + h - 10, y + h - 10, 0) + 18, Math.PI * 0.12 + 0.9, 320, 56);
      ctx.restore();
    }
    return;
  }
  if (lt < 22.2) {
    deskBG(ctx);
    // title block with his approval signature, 14 months ago
    const x = 160;
    const y = 120;
    const w = 960;
    const h = 480;
    fillRR(ctx, x + 14, y + 18, w, h, 6, "rgba(0,0,0,0.4)");
    fillRR(ctx, x, y, w, h, 6, "#f1ead4", "rgba(30,22,40,0.7)", 3);
    mono(ctx, "DEMONSTRATION RESIDENCE · OVERLAY REV E", x + 50, y + 70, { size: 26, weight: 800, color: "#3d3550" });
    mono(ctx, "Replaces EMERGENCY RECEIVER A / B / C for marketing purposes.", x + 50, y + 110, { size: 18, color: "#6a6474" });
    line(ctx, x + 50, y + 140, x + w - 50, y + 140, "#3d3550", 2);
    mono(ctx, "APPROVED", x + 50, y + 200, { size: 18, color: "#6a6474", spacing: 4 });
    // signature revealed stroke by stroke
    const sp = prog(lt, 18.5, 21.0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 40, y + 190, (w - 340) * sp, 240);
    ctx.clip();
    ctx.font = `700 150px ${SCRIPT}`;
    ctx.fillStyle = "#25306a";
    ctx.fillText("O. Voss", x + 70, y + 340);
    line(ctx, x + 70, y + 366, x + 560, y + 352, "#25306a", 4);
    ctx.restore();
    mono(ctx, "DATE  14 MONTHS PRIOR", x + w - 330, y + 200, { size: 18, color: "#6a6474" });
    mono(ctx, "ID   VOSS, O. — GRADE 4", x + w - 330, y + 232, { size: 18, color: "#6a6474" });
    // his pen is held a little too tight
    corrCircle(ctx, x + 330, y + 290, 230, prog(lt, 20.2, 21.8), 5);
    if (sp < 1) {
      const px = x + 70 + (w - 340) * sp;
      line(ctx, px, y + 300, px + 70, y + 230, "#2f2b3a", 12);
    }
    return;
  }
  // lining the old plan's corners up with the live hardware
  deskBG(ctx, "#2b2138", "#190f24");
  const hx = 190;
  const hy = 110;
  const hw = 900;
  const hh = 500;
  // live hardware plate with rivets in the receiver pattern
  fillRR(ctx, hx, hy, hw, hh, 10, "#6a727e", "rgba(0,0,0,0.6)", 5);
  for (let i = 0; i < 70; i++) line(ctx, hx, hy + i * 7, hx + hw, hy + i * 7 + Math.sin(i) * 2, "rgba(255,255,255,0.05)", 1.5);
  const bays: [number, number][] = [[hx + 70, hy + 90], [hx + 340, hy + 90], [hx + 610, hy + 90]];
  const rivets: V2[] = [];
  bays.forEach(([bx, by]) => {
    for (const [dx, dy] of [[0, 0], [220, 0], [0, 300], [220, 300]]) rivets.push([bx + dx, by + dy]);
  });
  rivets.forEach(([rx, ry]) => {
    circle(ctx, rx, ry, 15, "#9aa3ae", "rgba(0,0,0,0.7)", 3);
    circle(ctx, rx - 3, ry - 3, 5, "rgba(255,255,255,0.5)");
  });
  // translucent old plan slides until corners match
  const k = easeInOut(prog(lt, 24.0, 33.0));
  const ox = lerp(160, 0, k);
  const oy = lerp(-90, 0, k);
  const rot = lerp(-0.07, 0, k);
  ctx.save();
  ctx.translate(hx + hw / 2 + ox, hy + hh / 2 + oy);
  ctx.rotate(rot);
  ctx.translate(-hw / 2, -hh / 2);
  ctx.globalAlpha = 0.82;
  fillRR(ctx, -24, -24, hw + 48, hh + 48, 6, "rgba(235,228,205,0.35)", "rgba(240,235,215,0.9)", 3);
  bays.forEach(([bx, by], i) => {
    const px = bx - hx;
    const py = by - hy;
    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 4;
    ctx.strokeRect(px, py, 220, 300);
    ctx.setLineDash([]);
    for (const [dx, dy] of [[0, 0], [220, 0], [0, 300], [220, 300]]) circle(ctx, px + dx, py + dy, 22, undefined, C.red, 3);
    txt(ctx, `EMERGENCY RECEIVER ${"ABC"[i]}`, px + 110, py + 160, { size: 20, font: F, weight: 800, color: "#f6e9c8", align: "center" });
  });
  ctx.restore();
  // fit
  const fit = prog(lt, 32.2, 33.4);
  if (fit > 0) {
    ctx.save();
    ctx.globalAlpha = fit;
    rivets.forEach(([rx, ry]) => corrCircle(ctx, rx, ry, 26, 1, 4, "#7be0a0"));
    ctx.restore();
    txt(ctx, "rivet to rivet.", 640, 668, { size: 54, font: SCRIPT, color: "#f1e4c0", align: "center" });
  }
  if (lt > 36) {
    // the wrong pen, held too tight
    ctx.fillStyle = `rgba(14,6,24,${clamp((lt - 36) / 1.2) * 0.9})`;
    ctx.fillRect(0, 0, W, H);
    const a = clamp((lt - 36.6) / 1.0);
    ctx.save();
    ctx.globalAlpha = a;
    const shake = Math.sin(lt * 31) * 1.2;
    ctx.translate(700 + shake, 330);
    ctx.scale(1.7, 1.7);
    // pen + knuckles gripping hard
    line(ctx, 0, 0, -86, 62, "#2f2b3a", 12);
    line(ctx, 0, 0, -26, 19, "#c5ccd4", 8);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    // reuse the hand shape with whitened knuckles
    ctx.translate(700 + shake, 330);
    ctx.scale(1.7, 1.7);
    ctx.beginPath();
    ctx.ellipse(-44, 22, 38, 13, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#efd1bb";
    ctx.fill();
    ctx.strokeStyle = "rgba(30,22,40,0.75)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-62, 52, 24, 11, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  fx.tint = [60, 40, 90, 0.05];
}

function originalPlan(ctx: Ctx, x: number, y: number, w: number, h: number) {
  fillRR(ctx, x + 12, y + 16, w, h, 4, "rgba(0,0,0,0.4)");
  fillRR(ctx, x, y, w, h, 4, "#e6dcc0", "rgba(30,22,40,0.7)", 3);
  for (let gx = 30; gx < w; gx += 30) line(ctx, x + gx, y, x + gx, y + h, "rgba(60,90,140,0.12)", 1);
  for (let gy = 30; gy < h; gy += 30) line(ctx, x, y + gy, x + w, y + gy, "rgba(60,90,140,0.12)", 1);
  mono(ctx, "CALDER COURT · GROUND · ORIGINAL APPROVED PLAN", x + 36, y + 50, { size: 20, weight: 800, color: "#3d3550" });
  [0, 1, 2].forEach((i) => {
    const bx = x + 70 + i * 270;
    const by = y + 100;
    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, 220, 300);
    ctx.setLineDash([]);
    fillRR(ctx, bx + 6, by + 6, 208, 288, 2, "rgba(210,58,42,0.08)");
    mono(ctx, "EMERGENCY", bx + 110, by + 140, { size: 22, weight: 800, color: C.redDk, align: "center" });
    mono(ctx, `RECEIVER ${"ABC"[i]}`, bx + 110, by + 172, { size: 22, weight: 800, color: C.redDk, align: "center" });
    mono(ctx, "38.4 m³ · KEEP CLEAR", bx + 110, by + 214, { size: 14, color: "#6a5a54", align: "center" });
  });
  mono(ctx, "SURVEYED · APPROVED", x + 36, y + h - 40, { size: 14, color: "#6a6474", spacing: 2 });
}

function marketingPlan(ctx: Ctx, x: number, y: number, w: number, h: number, lt: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#f7edcf");
  g.addColorStop(1, "#ecdcae");
  fillRR(ctx, x, y, w, h, 4, g, "rgba(30,22,40,0.7)", 3);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 16, y + 16, w - 32, h - 32);
  txt(ctx, "THE DEMONSTRATION RESIDENCE", x + w / 2, y + 90, { size: 33, weight: 700, color: "#5a4420", align: "center", spacing: 2 });
  txt(ctx, "Live Larger.", x + w / 2, y + 132, { size: 28, color: "#8a6a2a", align: "center" });
  const labels = ["LIVING", "DINING", "BEDROOM"];
  [0, 1, 2].forEach((i) => {
    const bx = x + 70 + i * 270;
    const by = y + 170;
    fillRR(ctx, bx, by, 220, 290, 6, "#fdf6e0", C.gold, 3);
    txt(ctx, labels[i], bx + 110, by + 40, { size: 18, font: F, weight: 800, color: "#8a6a2a", align: "center", spacing: 3 });
    if (i === 0) {
      fillRR(ctx, bx + 24, by + 90, 170, 56, 10, "#d9c394");
      fillRR(ctx, bx + 70, by + 170, 80, 50, 8, "#e9d9a8");
    } else if (i === 1) {
      fillRR(ctx, bx + 40, by + 100, 140, 90, 12, "#d9c394");
      for (let k = 0; k < 3; k++) circle(ctx, bx + 70 + k * 40, by + 82, 11, "#e9d9a8");
      for (let k = 0; k < 3; k++) circle(ctx, bx + 70 + k * 40, by + 208, 11, "#e9d9a8");
      circle(ctx, bx + 110, by + 145, 20, "#c88a5a");
    } else {
      fillRR(ctx, bx + 30, by + 90, 120, 150, 8, "#d9c394");
      fillRR(ctx, bx + 36, by + 96, 108, 60, 6, "#fffaf0");
    }
  });
  mono(ctx, "Mood board · not to scale · imagery indicative", x + 36, y + h - 28, { size: 13, color: "#8a6a2a" });
  void lt;
}

/** the linkage: brass push-rods from three folded frames to three receiving bays */
function linkage(ctx: Ctx, lt: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#150b24");
  g.addColorStop(1, "#2a1a42");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) line(ctx, i * 90, 0, i * 90, H, "rgba(190,160,240,0.05)", 2);
  // rail
  fillRR(ctx, 80, 118, 1120, 20, 4, "#6a5a82", "rgba(0,0,0,0.7)", 3);
  // floor with bay markings
  ctx.fillStyle = "#2e2244";
  ctx.fillRect(0, 580, W, 140);
  line(ctx, 0, 580, W, 580, "#7d6aa0", 4);
  const fxs = [230, 560, 900];
  const bxs = [340, 640, 960];
  const sw = bump(lt, 0, 10);
  void sw;
  fxs.forEach((x0, i) => {
    // frame slab
    fillRR(ctx, x0 - 50, 138, 100, 270, 6, "#4a3a66", "rgba(0,0,0,0.8)", 4);
    for (let k = 0; k < 11; k++) line(ctx, x0 - 46 + k * 9, 144, x0 - 46 + k * 9, 400, k % 2 ? "rgba(255,230,170,0.25)" : "rgba(20,10,40,0.5)", 3);
    mono(ctx, ["F-1", "F-2", "F-3"][i], x0, 436, { size: 20, weight: 900, color: "#cbb8e8", align: "center" });
    // rod to the bay, creaking like a pendulum
    const bx = bxs[i];
    const wobble = Math.sin(lt * 1.9 + i) * 3;
    const a: V2 = [x0, 408];
    const b: V2 = [bx + wobble, 556];
    line(ctx, a[0], a[1], b[0], b[1], "#8a6a2a", 20);
    line(ctx, a[0], a[1], b[0], b[1], C.gold, 12);
    line(ctx, a[0] - 3, a[1], b[0] - 3, b[1], "rgba(255,255,255,0.35)", 3);
    circle(ctx, a[0], a[1], 15, "#c5ccd4", "rgba(0,0,0,0.7)", 3);
    circle(ctx, b[0], b[1], 15, "#c5ccd4", "rgba(0,0,0,0.7)", 3);
    // painted arrows along the rod
    for (let k = 0; k < 4; k++) {
      const f = 0.2 + k * 0.2 + ((lt * 0.12 + i * 0.1) % 0.2);
      if (f > 0.92) continue;
      const px = lerp(a[0], b[0], f);
      const py = lerp(a[1], b[1], f);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      poly(ctx, [[10, 0], [-6, -9], [-6, 9]], "#fff1b0", "rgba(60,40,10,0.7)", 1.5);
      ctx.restore();
    }
    // empty receiving bay on the floor
    ctx.setLineDash([12, 9]);
    ctx.strokeStyle = prog(lt, 4 + i * 1.2, 5 + i * 1.2) > 0 ? C.red : "rgba(255,255,255,0.3)";
    ctx.lineWidth = 4;
    ctx.strokeRect(bx - 110, 590, 220, 110);
    ctx.setLineDash([]);
    mono(ctx, `RECEIVER ${"ABC"[i]}`, bx, 650, { size: 22, weight: 800, color: "rgba(255,230,200,0.75)", align: "center", spacing: 2 });
    mono(ctx, "EMPTY", bx, 680, { size: 15, color: "rgba(255,230,200,0.5)", align: "center", spacing: 3 });
  });
  // flashlight cone from Orrin, sweeping
  const sweep = Math.sin(lt * 0.55) * 0.18;
  ctx.save();
  ctx.translate(40, 560);
  ctx.rotate(-0.55 + sweep + prog(lt, 0, 10) * 0.35);
  const cg = ctx.createLinearGradient(0, 0, 1200, 0);
  cg.addColorStop(0, "rgba(255,246,210,0.38)");
  cg.addColorStop(1, "rgba(255,246,210,0)");
  ctx.fillStyle = cg;
  poly(ctx, [[0, 0], [1300, -240], [1300, 240]], cg as unknown as string);
  ctx.restore();
  // Orrin's note
  const na = prog(lt, 6.6, 8.2);
  if (na > 0) {
    ctx.save();
    ctx.globalAlpha = na;
    txt(ctx, "needs somewhere to unfold →", 130, 520, { size: 44, font: SCRIPT, color: C.red });
    ctx.restore();
  }
}

/* ---------- BEAT 4: a life-shaped suite ---------- */

export function beat4(ctx: Ctx, lt: number, fx: FX) {
  if (lt < 7.5) {
    gildedPlate(ctx, lt);
    return;
  }
  if (lt < 10.8) {
    floorTemplates(ctx, lt);
    return;
  }
  if (lt < 15.0) {
    fruitBowl(ctx, lt);
    return;
  }
  if (lt < 18.2) {
    bookShot(ctx, lt);
    return;
  }
  dollhouse(ctx, lt, fx);
}

function gildedPlate(ctx: Ctx, lt: number) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#d9cdab");
  g.addColorStop(1, "#bfb18a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the wall behind the plate carries the original stencil
  const fall = easeIn2(prog(lt, 4.6, 6.2));
  fillRR(ctx, 200, 130, 880, 440, 6, "#7b8089", "rgba(0,0,0,0.5)", 4);
  mono(ctx, "EMERGENCY", 640, 300, { size: 92, weight: 900, color: C.red, align: "center", spacing: 6 });
  mono(ctx, "RECEIVER B", 640, 396, { size: 92, weight: 900, color: C.red, align: "center", spacing: 6 });
  mono(ctx, "VOLUME 38.4 m³ · KEEP CLEAR AT ALL TIMES", 640, 470, { size: 24, color: "#f0e0c8", align: "center", spacing: 2 });
  // the gilt cover
  ctx.save();
  ctx.translate(0, fall * 700);
  ctx.rotate(fall * 0.15);
  fillRR(ctx, 230, 160, 820, 380, 10, C.gold, "#7a5a1c", 5);
  fillRR(ctx, 250, 180, 780, 340, 6, "#dcb862", "#a9852f", 3);
  txt(ctx, "THE DEMONSTRATION RESIDENCE", 640, 300, { size: 36, weight: 700, color: "#4a3510", align: "center", spacing: 3 });
  txt(ctx, "LIVE LARGER", 640, 372, { size: 64, weight: 800, color: "#4a3510", align: "center", spacing: 10 });
  const sc: V2[] = [[262, 192], [1018, 192], [262, 508], [1018, 508]];
  sc.forEach(([x, y], i) => {
    const out = prog(lt, 1.0 + i * 0.5, 2.2 + i * 0.5);
    if (out < 1) {
      circle(ctx, x, y, 14 - out * 3, "#c5ccd4", "#4a3510", 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(out * 6.28 * 2);
      line(ctx, -9, 0, 9, 0, "#4a3510", 3);
      ctx.restore();
    }
  });
  ctx.restore();
  // screws that have dropped bounce on the floor
  for (let i = 0; i < 4; i++) {
    const t0 = 2.2 + i * 0.5 + 0.8;
    const d = lt - (t0 - 0.8);
    if (d > 0) {
      const bounce = Math.abs(Math.sin(Math.min(d, 2) * 7)) * 22 * Math.exp(-d * 1.8);
      const sy = Math.min(660, 160 + d * d * 600) - bounce;
      circle(ctx, 360 + i * 150, Math.min(sy, 668 - bounce), 11, "#c5ccd4", "#4a3510", 2);
    }
  }
  // screwdriver
  const k = Math.min(3, Math.floor(prog(lt, 0.9, 3.0) * 4));
  const sx = 262 + (k % 2) * 756;
  const sy = 192 + Math.floor(k / 2) * 316;
  if (lt > 0.7 && lt < 3.6) {
    ctx.save();
    ctx.translate(sx - 20, sy - 20);
    ctx.rotate(-0.6);
    fillRR(ctx, -260, -16, 200, 32, 14, "#d9622b", "#3a1a0a", 3);
    line(ctx, -60, 0, 14, 0, "#c5ccd4", 7);
    ctx.restore();
    finger(ctx, sx - 270, sy - 110, Math.PI * 1.2, 260, 74);
  }
}
const easeIn2 = (x: number) => clamp(x) * clamp(x);

function floorTemplates(ctx: Ctx, lt: number) {
  deskBG(ctx, "#2a2030", "#171020");
  const x = 90;
  const y = 120;
  const w = 1100;
  const h = 460;
  fillRR(ctx, x, y, w, h, 6, "#efe6cc", "rgba(30,22,40,0.7)", 3);
  for (let gx = 30; gx < w; gx += 30) line(ctx, x + gx, y, x + gx, y + h, "rgba(60,90,140,0.1)", 1);
  mono(ctx, "DEMONSTRATION RESIDENCE · TOP-DOWN · STAGING FURNITURE INCLUDED", x + 30, y + 40, { size: 17, weight: 800, color: "#3d3550" });
  const rooms: [string, number, number][] = [["LIVING", 31, 3.0], ["DINING", 24, 3.6], ["BEDROOM", 19, 4.2]];
  rooms.forEach(([nm, n, blk], i) => {
    const bx = x + 40 + i * 350;
    const by = y + 80;
    fillRR(ctx, bx, by, 310, 340, 4, "#fbf5e2", "rgba(30,22,40,0.7)", 3);
    mono(ctx, nm, bx + 155, by + 28, { size: 16, weight: 800, color: "#8a6a2a", align: "center", spacing: 3 });
    // staging furniture glyphs
    const r = (k: number) => ((Math.sin(k * 12.9898 + i * 7) * 43758.5) % 1 + 1) % 1;
    for (let k = 0; k < Math.min(n, 16); k++) {
      const fx2 = bx + 24 + r(k) * 250;
      const fy2 = by + 56 + r(k + 40) * 250;
      fillRR(ctx, fx2, fy2, 22 + r(k + 80) * 24, 14 + r(k + 120) * 22, 3, ["#d9c394", "#c9a56e", "#a9b8a0", "#e9b6a0"][k % 4], "rgba(30,22,40,0.4)", 1);
    }
    // violet acetate template slides in
    const sl = easeOut(prog(lt, blk + 4.0 + 0 - 4.0 + 0 + 3.4 - 3.4, blk + 0.7 + 4.0 - 4.0 + 0));
    void sl;
    const tt = easeOut(prog(lt - 7.5, 0.1 + i * 0.7, 0.9 + i * 0.7));
    const ty = lerp(-300, 0, tt);
    ctx.save();
    ctx.globalAlpha = tt > 0 ? 0.9 : 0;
    fillRR(ctx, bx - 8, by + ty - 8, 326, 356, 6, "rgba(120,80,200,0.32)", "rgba(190,160,255,0.95)", 4);
    mono(ctx, `FRAME F-${i + 1}`, bx + 155, by + ty + 330, { size: 15, weight: 800, color: "#e5d8ff", align: "center" });
    ctx.restore();
    // blocked
    const bl = prog(lt - 7.5, 1.0 + i * 0.6, 1.4 + i * 0.6);
    if (bl > 0) {
      ctx.save();
      ctx.globalAlpha = bl * (0.7 + 0.3 * Math.sin(lt * 9 + i));
      fillRR(ctx, bx + 30, by + 120, 250, 92, 6, "rgba(210,58,42,0.9)");
      mono(ctx, "BLOCKED", bx + 155, by + 158, { size: 28, weight: 900, color: "#fff", align: "center", spacing: 3 });
      mono(ctx, `${n} ITEMS`, bx + 155, by + 192, { size: 24, weight: 800, color: "#ffe3dc", align: "center" });
      ctx.restore();
    }
  });
}

function fruitBowl(ctx: Ctx, lt: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#efe4c6");
  g.addColorStop(1, "#d6c7a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 0, 760, 0.3, "255,244,214");
  // dining table
  fillRR(ctx, -40, 520, 1360, 40, 6, "#8a5d3a", "rgba(0,0,0,0.5)", 3);
  fillRR(ctx, -40, 560, 1360, 200, 0, "#6e4a2e");
  // bowl
  const bx = 640;
  const by = 520;
  ctx.fillStyle = "rgba(30,15,40,0.28)";
  ctx.beginPath();
  ctx.ellipse(bx, by + 16, 360, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // fruit
  const fruit: [number, number, number, string][] = [
    [-120, -88, 70, "#e3c36a"],
    [-30, -120, 74, "#c9b552"],
    [90, -96, 70, "#d98a5a"],
    [-190, -50, 60, "#a8c05a"],
    [180, -48, 62, "#cd5a4a"],
    [10, -64, 66, "#8fb35a"],
  ];
  fruit.forEach(([dx, dy, r, col], i) => {
    const px = bx + dx;
    const py = by + dy;
    const pear = i < 3;
    ctx.beginPath();
    if (pear) {
      ctx.ellipse(px, py + r * 0.15, r * 0.7, r * 0.82, 0, 0, Math.PI * 2);
      ctx.ellipse(px, py - r * 0.55, r * 0.42, r * 0.5, 0, 0, Math.PI * 2);
    } else ctx.arc(px, py, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = "rgba(60,40,20,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
    // too-perfect sheen
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(px - r * 0.22, py - r * 0.05, r * 0.12, r * 0.28, 0.3, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, px, py - r * (pear ? 0.95 : 0.55), px + 6, py - r * (pear ? 1.15 : 0.7), "#4a3a20", 5);
  });
  fillRR(ctx, bx - 280, by - 40, 560, 54, 24, "#f4f0e6", "rgba(60,40,20,0.6)", 4);
  fillRR(ctx, bx - 190, by + 8, 380, 20, 8, "#e5ddc9", "rgba(60,40,20,0.5)", 3);
  // a knuckle taps the middle pear
  const tapT = [12.2, 12.7];
  const k = Math.max(...tapT.map((t) => bump(lt, t - 0.12, t + 0.2)));
  finger(ctx, bx - 24 + 250 - k * 150, by - 190 - 40 + 30, Math.PI * 0.12 + Math.PI * 0.95, 300, 70);
  // tap ring
  const rg = Math.max(...tapT.map((t) => prog(lt, t, t + 0.5)));
  if (rg > 0 && rg < 1) corrCircle(ctx, bx - 30, by - 120, 70 + rg * 90, 1, 3, `rgba(210,58,42,${1 - rg})`);
  const ta = prog(lt, 13.2, 14.2);
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta;
    txt(ctx, "hollow. plaster.", 220, 330, { size: 58, font: SCRIPT, color: C.red });
    corrLine(ctx, 400, 346, 560, 420, ta, 4);
    ctx.restore();
  }
}

function bookShot(ctx: Ctx, lt: number) {
  ctx.fillStyle = "#cdbf98";
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 0, 760, 0.25, "255,244,214");
  fillRR(ctx, 120, 450, 1040, 26, 4, "#8a5d3a", "rgba(0,0,0,0.5)", 3);
  const cols = ["#7a3a3a", "#3a5a7a", "#4a6a4a", "#8a6a2a", "#5a4a7a", "#a85a3a", "#3a3a4a", "#6a8a8a"];
  for (let i = 0; i < 12; i++) {
    const bh = 220 + ((i * 37) % 60);
    const bw = 62 + ((i * 17) % 30);
    const bx = 140 + i * 86;
    if (i === 6) continue;
    fillRR(ctx, bx, 450 - bh, bw, bh, 3, cols[i % cols.length], "rgba(0,0,0,0.6)", 3);
    line(ctx, bx + 10, 450 - bh + 36, bx + bw - 10, 450 - bh + 36, C.gold, 3);
    line(ctx, bx + 10, 450 - bh + 46, bx + bw - 10, 450 - bh + 46, C.gold, 3);
  }
  // the pulled book, tilted and opened as far as it goes (not at all)
  const p = easeOut(prog(lt, 15.4, 16.2));
  ctx.save();
  ctx.translate(lerp(656, 700, p), lerp(260, 300, p));
  ctx.rotate(lerp(0, -0.35, p));
  const bw = 520;
  const bh = 340;
  fillRR(ctx, -bw / 2, -bh / 2, bw, bh, 10, "#7a3a3a", "rgba(0,0,0,0.7)", 4);
  fillRR(ctx, -bw / 2 + 30, -bh / 2 + 24, bw - 60, bh - 48, 4, "#8d4a4a", C.gold, 4);
  txt(ctx, "WORLD ATLAS", 0, -20, { size: 56, weight: 800, color: C.gold, align: "center", spacing: 6 });
  txt(ctx, "Vol. IV", 0, 40, { size: 32, color: C.gold, align: "center" });
  // fore-edge: painted stripes, no pages
  const fe = prog(lt, 16.4, 17.2);
  if (fe > 0) {
    ctx.globalAlpha = fe;
    fillRR(ctx, -bw / 2, bh / 2 - 6, bw, 52, 4, "#f1ead4", "rgba(0,0,0,0.7)", 3);
    for (let i = 0; i < 24; i++) line(ctx, -bw / 2 + 10, bh / 2 + i * 2 + 2, bw / 2 - 10, bh / 2 + i * 2 + 2, "rgba(130,110,80,0.45)", 1.2);
    // a seam of cast resin
    line(ctx, -bw / 2, bh / 2 + 24, bw / 2, bh / 2 + 24, "rgba(210,58,42,0.8)", 3);
  }
  ctx.restore();
  // thumb pries at the cover
  const pr = bump(lt, 16.0, 16.9);
  finger(ctx, 980 - pr * 60, 250 + 40, Math.PI * 1.0 + 0.1, 300, 82);
  const ta = prog(lt, 17.0, 17.8);
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta;
    txt(ctx, "no pages.", 160, 600, { size: 60, font: SCRIPT, color: C.red });
    ctx.restore();
  }
}

function dollhouse(ctx: Ctx, lt: number, fx: FX) {
  // a cutaway of the three-room show apartment, warm and empty of residents
  const z = lerp(1.0, 1.1, prog(lt, 18.2, 45));
  camera(ctx, 640, 380, z, () => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1d38");
    g.addColorStop(1, "#150e1e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const rx = 90;
    const ry = 150;
    const rw = 365;
    const rh = 400;
    const names = ["LIVING", "DINING", "BEDROOM"];
    for (let i = 0; i < 3; i++) {
      const x = rx + i * (rw + 12);
      // room shell
      fillRR(ctx, x, ry, rw, rh, 4, "#f4ead0", "#3a2e24", 6);
      const wg = ctx.createLinearGradient(x, ry, x, ry + rh);
      wg.addColorStop(0, "#fbf3dc");
      wg.addColorStop(1, "#eadbb4");
      ctx.fillStyle = wg;
      ctx.fillRect(x + 8, ry + 8, rw - 16, rh - 16);
      // cornice & floor
      ctx.fillStyle = C.gold;
      ctx.fillRect(x + 8, ry + 8, rw - 16, 14);
      ctx.fillStyle = "#d9c394";
      ctx.fillRect(x + 8, ry + rh - 70, rw - 16, 62);
      lightPool(ctx, x + rw / 2, ry + 20, 260, 0.35, "255,236,190");
      // window
      fillRR(ctx, x + 30, ry + 70, 120, 140, 4, "#cfe9f2", "#8a6a2a", 4);
      line(ctx, x + 90, ry + 70, x + 90, ry + 210, "#fff", 3);
      mono(ctx, names[i], x + rw / 2, ry + 52, { size: 15, weight: 800, color: "#8a6a2a", align: "center", spacing: 3 });
      const fl = ry + rh - 70;
      if (i === 0) {
        fillRR(ctx, x + 150, fl - 80, 190, 80, 18, "#7da0a8", "rgba(0,0,0,0.4)", 3);
        fillRR(ctx, x + 170, fl - 20, 150, 22, 6, "#c9a56e", "rgba(0,0,0,0.4)", 2);
        line(ctx, x + 60, fl, x + 60, fl - 170, "#444", 6);
        circle(ctx, x + 60, fl - 176, 28, "#fff6d6", "#8a6a2a", 3);
        fillRR(ctx, x + 180, ry + 90, 130, 90, 3, "#f6efe0", "#8a6a2a", 4);
        flowerArt(ctx, x + 245, ry + 135);
      } else if (i === 1) {
        fillRR(ctx, x + 70, fl - 76, 230, 16, 4, "#8a5d3a", "rgba(0,0,0,0.5)", 2);
        for (const lx of [88, 276]) line(ctx, x + lx, fl - 60, x + lx, fl, "#8a5d3a", 10);
        for (let k = 0; k < 6; k++) {
          const cx2 = x + 52 + k * 52;
          fillRR(ctx, cx2, fl - (k % 2 ? 54 : 50), 28, 50, 5, "#b9a074", "rgba(0,0,0,0.4)", 2);
        }
        // fruit bowl of plaster pears
        fillRR(ctx, x + 150, fl - 102, 90, 26, 12, "#f4f0e6", "rgba(0,0,0,0.5)", 2);
        for (let k = 0; k < 3; k++) circle(ctx, x + 168 + k * 24, fl - 112, 13, ["#e3c36a", "#c9b552", "#d98a5a"][k], "rgba(0,0,0,0.4)", 2);
        line(ctx, x + 195, ry + 40, x + 195, ry + 120, "#444", 3);
        circle(ctx, x + 195, ry + 128, 26, "#fff6d6", "#8a6a2a", 3);
      } else {
        fillRR(ctx, x + 70, fl - 80, 230, 80, 8, "#fffaf0", "rgba(0,0,0,0.4)", 3);
        fillRR(ctx, x + 70, fl - 104, 230, 28, 8, "#c9d3da", "rgba(0,0,0,0.4)", 3);
        fillRR(ctx, x + 18, fl - 70, 42, 70, 4, "#8a5d3a", "rgba(0,0,0,0.5)", 2);
        fillRR(ctx, x + 310, fl - 70, 42, 70, 4, "#8a5d3a", "rgba(0,0,0,0.5)", 2);
        fillRR(ctx, x + 316, fl - 94, 28, 24, 2, "#7a3a3a");
        fillRR(ctx, x + 250, ry + 70, 90, 140, 3, "#9a8a6a", "rgba(0,0,0,0.5)", 3);
      }
      // violet template hovering, with item count in correction red
      const k = smooth(prog(lt, 20 + i * 1.2, 22 + i * 1.2));
      const hover = Math.sin(lt * 1.2 + i) * 4;
      ctx.save();
      ctx.globalAlpha = k * 0.95;
      ctx.setLineDash([14, 8]);
      ctx.strokeStyle = "rgba(190,160,255,0.95)";
      ctx.lineWidth = 5;
      ctx.strokeRect(x - 4, ry - 4 + hover, rw + 8, rh + 8);
      ctx.setLineDash([]);
      fillRR(ctx, x - 4, ry - 4 + hover, rw + 8, rh + 8, 2, "rgba(120,80,200,0.2)");
      ctx.restore();
      const n = [31, 24, 19][i];
      const ca = prog(lt, 24 + i * 1.3, 25.4 + i * 1.3);
      if (ca > 0) {
        ctx.save();
        ctx.globalAlpha = ca;
        txt(ctx, `${n} items`, x + rw / 2, ry + rh + 64, { size: 60, font: SCRIPT, color: C.red, align: "center" });
        corrLine(ctx, x + 60, ry + rh + 84, x + rw - 60, ry + rh + 78, ca, 4);
        ctx.restore();
      }
    }
    // the three bays under the suite
    const by = ry + rh + 10;
    void by;
    // Orrin, small, standing in the middle room
    const oh = 290;
    const ox = rx + (365 + 12) * 1 + 285;
    const pose = poses.stand(Math.sin(lt * 1.7));
    const L = hl(ox, oh, -1);
    pose.handF = L(ox - 40, FY - 130 - oh * 0.1 + 20);
    void L;
    void pose;
    void orr;
    void att;
    void CAST;
    void ox;
  });
  // closing caption of the page: space was never the problem
  const a = prog(lt, 33, 35) * (1 - prog(lt, 43, 45));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    mono(ctx, "3 BAYS RESERVED · 3 BAYS FURNISHED · 0 RESIDENTS", 640, 664, { size: 17, weight: 800, color: "#dccbf0", align: "center", spacing: 3 });
    ctx.restore();
  }
  fx.tint = [255, 235, 200, 0.03];
}

function flowerArt(ctx: Ctx, x: number, y: number) {
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.fillStyle = "#d86a5a";
    ctx.beginPath();
    ctx.ellipse(0, -16, 8, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  circle(ctx, x, y, 7, "#f6dd7c");
}

/* ---------- BEAT 5: the seal ---------- */

function panel(ctx: Ctx, lt: number, o: { flap: number; seal: number; broken: number; auth: number; clock: string; key?: boolean }) {
  const x = 430;
  const y = 200;
  const w = 290;
  const h = 370;
  fillRR(ctx, x + 10, y + 14, w, h, 8, "rgba(10,5,20,0.3)");
  fillRR(ctx, x, y, w, h, 8, "#8a929c", "#2a2e36", 5);
  fillRR(ctx, x + 12, y + 12, w - 24, h - 24, 4, "#9aa2ac", "rgba(0,0,0,0.3)", 2);
  for (const [sx2, sy2] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]) circle(ctx, x + sx2, y + sy2, 6, "#c5ccd4", "rgba(0,0,0,0.6)", 1.5);
  // header with the purge clock
  fillRR(ctx, x + 24, y + 28, w - 48, 58, 4, "#1a0c0c", "#000", 3);
  ctx.save();
  ctx.shadowColor = "rgba(255,60,40,0.9)";
  ctx.shadowBlur = 14;
  mono(ctx, o.clock, x + w / 2, y + 70, { size: 38, weight: 900, color: "#ff5040", align: "center", spacing: 2 });
  ctx.restore();
  mono(ctx, "PURGE", x + 34, y + 44, { size: 11, color: "#ff8a7a", spacing: 2 });
  mono(ctx, "TRANSFER CONTROL", x + w / 2, y + 112, { size: 15, weight: 900, color: "#2a2e36", align: "center", spacing: 2 });
  mono(ctx, "AUTHORISED OPERATORS ONLY", x + w / 2, y + 132, { size: 11, color: "#2a2e36", align: "center" });
  // inspect flap (left) with gears
  fillRR(ctx, x + 30, y + 160, 84, 70, 4, "#2a2e36");
  if (o.flap > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 30, y + 160, 84, 70);
    ctx.clip();
    for (const [gx, gy, gr, dir] of [[58, 190, 24, 1], [100, 200, 18, -1]] as const) {
      ctx.save();
      ctx.translate(x + gx, y + gy);
      ctx.rotate(lt * 1.2 * dir);
      circle(ctx, 0, 0, gr, C.gold, "#4a3510", 2);
      for (let k = 0; k < 8; k++) {
        ctx.save();
        ctx.rotate((k * Math.PI) / 4);
        fillRR(ctx, gr - 2, -4, 8, 8, 1, C.gold);
        ctx.restore();
      }
      circle(ctx, 0, 0, 5, "#2a2e36");
      ctx.restore();
    }
    ctx.restore();
  }
  // flap door (swings)
  const fw = 84 * (1 - 0.92 * smooth(o.flap));
  fillRR(ctx, x + 30, y + 160, fw, 70, 4, "#7d8791", "#2a2e36", 3);
  if (o.flap < 0.5) {
    circle(ctx, x + 30 + fw - 14, y + 195, 7, "#2a2e36");
    mono(ctx, "INSPECT", x + 30 + fw / 2, y + 180, { size: 10, weight: 800, color: "#2a2e36", align: "center" });
  }
  // transfer keyholes (three slots) and the lever
  for (let i = 0; i < 3; i++) {
    const kx = x + 150 + i * 36;
    fillRR(ctx, kx, y + 160, 24, 36, 5, "#2a2e36");
    circle(ctx, kx + 12, y + 172, 5, "#0b0d10");
    fillRR(ctx, kx + 10, y + 174, 4, 14, 1, "#0b0d10");
    mono(ctx, "ABC"[i], kx + 12, y + 214, { size: 12, weight: 800, color: "#2a2e36", align: "center" });
  }
  circle(ctx, x + 226, y + 300, 11, o.auth > 0 ? C.red : "#5a1f1c", "#2a0a0a", 2);
  mono(ctx, "AUTH", x + 226, y + 330, { size: 10, weight: 800, color: "#2a2e36", align: "center" });
  // the lever, never touched
  fillRR(ctx, x + 60, y + 260, 20, 96, 6, "#3a3f48", "#0b0d10", 3);
  line(ctx, x + 70, y + 270, x + 70, y + 330, "#c5ccd4", 12);
  circle(ctx, x + 70, y + 268, 18, C.red, "#4a1410", 3);
  void o.key;
  // tamper seal across the door gap
  const sealX = x + 20;
  const sealY = y + 238;
  const sealW = w - 40;
  if (o.seal > 0) {
    drawSeal(ctx, sealX, sealY, sealW, o.seal, o.broken, lt);
  }
}

function drawSeal(ctx: Ctx, x: number, y: number, w: number, appear: number, broken: number, lt: number) {
  const h = 36;
  const drawHalf = (x0: number, x1: number, dy: number, rot: number, voidShow: boolean) => {
    ctx.save();
    ctx.translate((x0 + x1) / 2, y + h / 2 + dy);
    ctx.rotate(rot);
    ctx.translate(-(x0 + x1) / 2, -(y + h / 2));
    ctx.beginPath();
    ctx.rect(x0, y - 2, x1 - x0, h + 4);
    ctx.clip();
    fillRR(ctx, x - 6, y, w + 12, h, 3, voidShow ? "#e9e6dc" : "#f6f3ea", "rgba(30,22,40,0.7)", 2);
    if (voidShow) {
      for (let i = 0; i < 18; i++) {
        poly(ctx, [[x + i * 18, y + h], [x + i * 18 + 9, y], [x + i * 18 + 18, y + h]], "rgba(210,58,42,0.35)");
      }
      mono(ctx, "VOID VOID VOID VOID VOID", x + w / 2, y + 24, { size: 17, weight: 900, color: C.redDk, align: "center", spacing: 2 });
    } else {
      mono(ctx, "SEALED · No. 0047-1193", x + 10, y + 16, { size: 12, weight: 800, color: C.redDk });
      for (let i = 0; i < 36; i++) ctx.fillRect(x + 10 + i * 6, y + 22, 1 + (i % 3), 10);
    }
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha = clamp(appear * 2);
  const ex = x + w * clamp(appear) ;
  ctx.beginPath();
  ctx.rect(x - 8, y - 4, (ex - x) + 8, h + 8);
  ctx.clip();
  if (broken <= 0) drawHalf(x - 6, x + w + 6, 0, 0, false);
  else {
    const gap = easeOut(broken) * 70;
    const fall = clamp((lt - 27) / 1.6);
    const mid = x + w * 0.55;
    ctx.globalAlpha *= 1 - fall;
    drawHalf(x - 6, mid, -gap * 0.2 + fall * fall * 260, -gap * 0.004 - fall * 0.3, true);
    drawHalf(mid, x + w + 6, gap * 0.35 + fall * fall * 320, gap * 0.007 + fall * 0.4, true);
  }
  ctx.restore();
  void lt;
}

export function beat5(ctx: Ctx, lt: number, fx: FX, tAbs: number) {
  const clock = purgeStr(tAbs);
  const seal = prog(lt, 11.2, 12.2);
  const broken = prog(lt, 24.2, 25.4);
  // zoomed shots
  let z = 1;
  let cx = 640;
  let cy = 380;
  if (lt >= 14.5 && lt < 21.5) {
    z = lerp(1.0, 1.7, easeInOut(prog(lt, 14.5, 16)));
    cx = 560;
    cy = 400;
  }
  if (lt >= 21.5) {
    z = lerp(1.7, 3.3, easeInOut(prog(lt, 21.5, 23)));
    cx = lerp(560, 575, prog(lt, 21.5, 23));
    cy = lerp(400, 442, prog(lt, 21.5, 23));
  }
  camera(ctx, cx, cy, z, () => {
    officeBG(ctx, lt);
    const flap = lt < 1.6 ? 0 : lt < 7.5 ? easeOut(prog(lt, 1.4, 2.2)) : 1 - easeOut(prog(lt, 9.0, 9.6));
    panel(ctx, lt, { flap, seal, broken, auth: lt > 5.4 ? 1 : 0, clock });
    const h = 330;
    // Orrin
    const ox = 300;
    const op = poses.stand(Math.sin(lt * 1.7));
    const L = hl(ox, h, 1);
    let target: V2 = [ox + 40, FY - h * 0.58];
    if (lt < 2.2) target = [ox + 100 + prog(lt, 0.4, 1.4) * 80, FY - h * 0.62];
    else if (lt < 5.0) target = [ox + 150, FY - h * 0.62 + Math.sin(lt * 3) * 3];
    else if (lt < 8.7) target = [ox + 190 + Math.sin(lt * 34) * 3 * bump(lt, 5.4, 7.6), FY - h * 0.42];
    else if (lt < 15) target = [ox + 40, FY - h * 0.58];
    else if (lt < 21.5) {
      target = [ox + 90, FY - h * 0.82];
    } else target = [ox + 150, FY - h * 0.58];
    op.handF = L(target[0], target[1]);
    op.handB = L(ox + 10, FY - h * 0.42);
    if (lt < 8.7) op.lean = 0.1;
    const oj = orr(ctx, ox, h, 1, op);
    // key in hand
    if (lt < 8.7) {
      line(ctx, oj.handF[0], oj.handF[1], oj.handF[0] + 34, oj.handF[1] - 2, C.gold, 5);
      circle(ctx, oj.handF[0] - 2, oj.handF[1], 7, C.gold, "#4a3510", 1.5);
    }
    if (lt >= 15 && lt < 21.5) {
      // phone raised
      ctx.save();
      ctx.translate(oj.handF[0] + 20, oj.handF[1] - 10);
      fillRR(ctx, -20, -34, 40, 66, 5, "#23202a", "#000", 2);
      fillRR(ctx, -16, -28, 32, 54, 3, "#141018");
      ctx.restore();
    }
    if (lt >= 8.7 && lt < 15) clipboard(ctx, oj.handF[0] + 10, oj.handF[1] + 4, 44, 58, 0.12);
    // the Attendant
    let ax = 1040;
    if (lt >= 8.2) ax = lerp(1040, 790, easeInOut(prog(lt, 8.2, 9.8)));
    const ap = poses.stand(Math.sin(lt * 1.4));
    applyWalk(ap, lt < 8.2 ? 1040 : lerp(1040, 790, easeInOut(prog(lt - 0.05, 8.2, 9.8))), lerp(1040, 790, easeInOut(prog(lt + 0.05, 8.2, 9.8))), 0.1, h * 0.97, -1, 1.0);
    const AL = hl(ax, h * 0.97, -1);
    if (lt >= 9.3 && lt < 11) ap.handF = AL(ax - 70, FY - h * 0.6);
    else if (lt >= 11 && lt < 12.4) {
      ap.handF = AL(ax - 90, FY - h * 0.55);
      ap.lean = 0.1;
    } else if (lt >= 12.4) {
      // hands folded, waiting
      ap.handF = AL(ax - 18, FY - h * 0.5);
      ap.handB = AL(ax - 24, FY - h * 0.5);
    } else {
      ap.handF = AL(ax - 52, FY - h * 0.62);
      ap.handB = AL(ax, FY - h * 0.45);
    }
    att(ctx, ax, h, -1, ap);
    // recorder placed on the panel ledge
    if (lt > 19.4) {
      const k = easeOut(prog(lt, 19.4, 20.2));
      ctx.save();
      ctx.translate(lerp(oj.handF[0], 520, k), lerp(oj.handF[1], 592, k));
      fillRR(ctx, -12, -22, 24, 44, 4, "#2b2733", "#000", 1.6);
      recorderLamp(ctx, 0, -14, lt, true, 3);
      ctx.restore();
    }
    // the lever is never touched. The thumb that breaks the seal:
    if (lt >= 21.8) {
      const px = 480 + prog(lt, 22.0, 24.0) * 150 + (lt > 24.2 ? easeOut(prog(lt, 24.2, 25.2)) * 40 : 0);
      ctx.save();
      ctx.globalAlpha = smooth(prog(lt, 21.8, 22.4)) * (1 - smooth(prog(lt, 27.8, 28.8)));
      finger(ctx, px, 453 + (lt > 24.2 ? 22 : 0) * easeOut(prog(lt, 24.2, 25)), Math.PI * 0.8, 110, 20);
      ctx.restore();
    }
  });
  // photo flashes
  const flashes = [16.0, 18.2, 19.0];
  fx.flash = Math.max(...flashes.map((t) => (lt >= t && lt < t + 0.2 ? 0.85 * (1 - (lt - t) / 0.2) : 0)));
  fx.shake = lt > 24.2 && lt < 24.5 ? 3 : 0;
}

export function endCard2(ctx: Ctx, lt: number, fx: FX, tAbs: number) {
  // broken seal lies beside the live timer
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#241a30");
  g.addColorStop(1, "#120a1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 300, 900, 0.14, "255,200,170");
  // ledge
  fillRR(ctx, 0, 470, W, 250, 0, "#4b525c");
  line(ctx, 0, 470, W, 470, "#8f98a4", 5);
  for (let i = 0; i < 40; i++) line(ctx, 0, 478 + i * 6, W, 478 + i * 6 + Math.sin(i) * 2, "rgba(255,255,255,0.04)", 1.5);
  // live LED timer
  fillRR(ctx, 640, 150, 520, 220, 12, "#1a0c0c", "#000", 6);
  ctx.save();
  ctx.shadowColor = "rgba(255,60,40,0.95)";
  ctx.shadowBlur = 30;
  mono(ctx, purgeStr(tAbs), 900, 300, { size: 108, weight: 900, color: "#ff5040", align: "center", spacing: 4 });
  ctx.restore();
  mono(ctx, "PURGE", 670, 190, { size: 20, color: "#ff8a7a", spacing: 6 });
  // the broken seal: two halves, VOID chevrons showing
  ctx.save();
  ctx.translate(250, 520);
  ctx.rotate(-0.06);
  for (const [dx, dy, rot, wd] of [[0, 0, 0.0, 250], [210, 36, 0.12, 190]] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rot);
    fillRR(ctx, 0, 0, wd, 62, 4, "#e9e6dc", "rgba(30,22,40,0.7)", 3);
    for (let i = 0; i < wd / 24; i++) poly(ctx, [[i * 24, 62], [i * 24 + 12, 0], [i * 24 + 24, 62]], "rgba(210,58,42,0.35)");
    mono(ctx, "VOID VOID VOID", wd / 2, 40, { size: 20, weight: 900, color: C.redDk, align: "center", spacing: 2 });
    ctx.restore();
  }
  ctx.restore();
  mono(ctx, "No. 0047-1193", 270, 640, { size: 16, color: "#dcd0f0", spacing: 2 });
  // recorder lamp, always on
  fillRR(ctx, 460, 560, 34, 70, 6, "#2b2733", "#000", 2);
  recorderLamp(ctx, 477, 578, lt, true, 5);
  fx.vignette = 0.7;
  const a = prog(lt, 3, 4.5) * (1 - prog(lt, 12.2, 13.4));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    mono(ctx, "END OF EPISODE 2", 70, 90, { size: 14, color: "#cdbfe0", spacing: 4 });
    txt(ctx, "Unoccupied, Technically", 70, 126, { size: 30, color: C.creamLt, spacing: 1 });
    mono(ctx, "NEXT · THE DISPLAY FAMILY", W - 70, 126, { size: 14, color: "#cdbfe0", spacing: 3, align: "right" });
    ctx.restore();
  }
  fx.dim = prog(lt, 13.4, 15);
}

void rr;
void stamp;
void clothTape;
void easeOut;
void lerp;
