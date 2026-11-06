import {
  C,
  CAST,
  Ctx,
  Pose,
  V2,
  circle,
  clipboard,
  clothTape,
  corrCircle,
  corrLine,
  drawFigure,
  fillRR,
  line,
  mono,
  poly,
  poses,
  rr,
  txt,
  lightPool,
  wallpaper,
  shadowEllipse,
} from "../engine/draw";
import { H, W, bump, clamp, easeInOut, easeOut, lerp, prog, smooth } from "../engine/util";
import type { FX } from "../engine/post";
import { backFigure, camera, cueTimes } from "./common";
import { finger } from "./ep1";

export const FY = 642;
export const CT2 = [0, 1, 2, 3, 4].map((b) => cueTimes(1, b));

export const hl =
  (x: number, h: number, f: number) =>
  (wx: number, wy: number): V2 => [((wx - x) / h) * f, (wy - FY) / h];

export const att = (ctx: Ctx, x: number, h: number, f: 1 | -1, pose: Pose) => drawFigure(ctx, x, FY, h * 0.97, f, CAST.attendant, pose);
export const orr = (ctx: Ctx, x: number, h: number, f: 1 | -1, pose: Pose) => drawFigure(ctx, x, FY, h, f, CAST.orrin, pose);

/** ground-floor service office backdrop */
export function officeBG(ctx: Ctx, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, 620);
  g.addColorStop(0, "#d6cba9");
  g.addColorStop(1, "#e7dec4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // wall panelling
  ctx.fillStyle = "#6f7d6a";
  ctx.fillRect(0, 470, W, 160);
  ctx.fillStyle = "#8a977f";
  ctx.fillRect(0, 470, W, 8);
  for (let x = 20; x < W; x += 150) fillRR(ctx, x, 498, 118, 106, 3, "#667360", "rgba(0,0,0,0.22)", 1.5);
  // sign
  fillRR(ctx, 70, 120, 300, 100, 4, "#f4efe0", "#7a6a52", 4);
  txt(ctx, "HOUSING DEPARTMENT", 220, 156, { size: 17, weight: 700, align: "center", color: C.ink, spacing: 3 });
  txt(ctx, "Efficiency is Fairness.", 220, 192, { size: 24, align: "center", color: C.red });
  // floor linoleum
  ctx.fillStyle = "#b9ae93";
  ctx.fillRect(0, 622, W, H - 622);
  for (let i = 0; i < 10; i++) {
    const y = 622 + i * 14;
    for (let x = ((i % 2) * 60) - 60; x < W; x += 120) {
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(x, y, 60, 14);
    }
  }
  ctx.fillStyle = "#cfc6aa";
  ctx.fillRect(0, 614, W, 10);
  for (const lx of [260, 760, 1160]) lightPool(ctx, lx, 0, 360, 0.22 + (lx === 760 ? 0.02 * Math.sin(t * 29) : 0), "255,240,200");
}

/** the big green occupancy display */
export function display(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, chip = -1, tint = 0) {
  fillRR(ctx, x + 10, y + 12, w, h, 12, "rgba(10,5,20,0.3)");
  fillRR(ctx, x, y, w, h, 12, "#1b1f22", "#0b0d0f", 4);
  const sg = ctx.createLinearGradient(x, y, x, y + h);
  sg.addColorStop(0, "#1d6a3f");
  sg.addColorStop(1, "#11452b");
  fillRR(ctx, x + 14, y + 14, w - 28, h - 28, 6, sg);
  txt(ctx, "CALDER COURT · BLOCK 14", x + 38, y + 56, { size: 18, font: "Courier New, monospace", weight: 700, color: "#9be3b6", spacing: 2 });
  txt(ctx, "OCCUPANCY", x + 38, y + 86, { size: 16, font: "Courier New, monospace", color: "#7cc79a", spacing: 4 });
  txt(ctx, "78", x + w * 0.34, y + h * 0.7, { size: h * 0.46, font: "Courier New, monospace", weight: 900, color: "#e5ffe9", align: "center" });
  ctx.save();
  ctx.strokeStyle = "#e5ffe9";
  ctx.lineWidth = h * 0.05;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.64, y + h * 0.4);
  ctx.lineTo(x + w * 0.7, y + h * 0.48);
  ctx.lineTo(x + w * 0.82, y + h * 0.28);
  ctx.stroke();
  ctx.restore();
  txt(ctx, "COMPLIANT", x + w * 0.73, y + h * 0.62, { size: 24, font: "Courier New, monospace", weight: 800, color: "#e5ffe9", align: "center", spacing: 3 });
  // chips: what green could mean
  const chips = ["SAFE", "COMPLETE", "PAID", "COMPLIANT", "NOT OUR DEPT."];
  let cx = x + 34;
  chips.forEach((c, i) => {
    const cw = c.length * 11 + 22;
    const on = i === chip;
    fillRR(ctx, cx, y + h - 70, cw, 30, 15, on ? "#e5ffe9" : "rgba(229,255,233,0.12)", "rgba(229,255,233,0.4)", 1.5);
    txt(ctx, c, cx + cw / 2, y + h - 49, { size: 13, font: "Courier New, monospace", weight: 800, color: on ? "#10432a" : "#9be3b6", align: "center", spacing: 1 });
    cx += cw + 10;
  });
  if (tint > 0) {
    ctx.fillStyle = `rgba(255,255,255,${tint * 0.1})`;
    ctx.fillRect(x + 14, y + 14, w - 28, h - 28);
  }
  void t;
}

/** wall-mounted counter with a clean cloth */
function counter(ctx: Ctx, x: number, y: number, w: number) {
  fillRR(ctx, x, y, w, 20, 3, "#c8b88f", "rgba(30,22,40,0.6)", 2);
  fillRR(ctx, x + 10, y + 20, w - 20, 618 - y - 20, 2, "#8c7a56", "rgba(30,22,40,0.5)", 2);
  fillRR(ctx, x + 26, y - 5, 150, 8, 2, "#fbfaf5", "rgba(30,22,40,0.4)", 1);
}

/** tablet insert, full-screen: pages of the Attendant's compliance software */
export function tabletInsert(ctx: Ctx, lt: number, page: "penalty" | "review" | "gap" | "fault", p: number, extra = 0) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2a2034");
  g.addColorStop(1, "#150e1e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 120, 820, 0.14, "255,240,210");
  const x = 190;
  const y = 70;
  const w = 900;
  const h = 580;
  fillRR(ctx, x + 14, y + 18, w, h, 34, "rgba(0,0,0,0.5)");
  fillRR(ctx, x, y, w, h, 34, "#d7dade", "#0e0b14", 5);
  fillRR(ctx, x + 22, y + 22, w - 44, h - 44, 18, "#f4f6f4", "#9ca3a8", 2);
  const sx = x + 52;
  mono(ctx, "COMPLIANCE ATTENDANT · UNIT 4417 · C. HOLLIS", sx, y + 72, { size: 15, color: "#6a7078", spacing: 1 });
  line(ctx, sx, y + 88, x + w - 52, y + 88, "#c9ced2", 2);
  const F = "Courier New, monospace";
  if (page === "penalty") {
    txt(ctx, "PURGE CANCELLATION", sx, y + 170, { size: 54, font: F, weight: 900, color: "#25292e" });
    txt(ctx, "PENALTY", sx, y + 232, { size: 40, font: F, weight: 700, color: C.redDk, spacing: 6 });
    const a = prog(lt, 10.7, 11.4);
    ctx.save();
    ctx.globalAlpha = a;
    txt(ctx, "¤ 4,812,000", sx, y + 346, { size: 104, font: F, weight: 900, color: "#25292e" });
    ctx.restore();
    mono(ctx, "Applicable to any cancellation within 12 h of scheduled purge.", sx, y + 400, { size: 18, color: "#6a7078" });
    fillRR(ctx, sx, y + 450, 36, 36, 6, "#fff", "#25292e", 3);
    mono(ctx, "I accept responsibility for the above sum.", sx + 54, y + 477, { size: 22, color: "#25292e" });
  } else if (page === "review") {
    txt(ctx, "EMERGENCY REVIEW", sx, y + 170, { size: 54, font: F, weight: 900, color: "#25292e" });
    txt(ctx, "SLOT", sx, y + 232, { size: 40, font: F, weight: 700, color: "#3d6a4c", spacing: 6 });
    txt(ctx, "08:00", sx, y + 372, { size: 170, font: F, weight: 900, color: "#25292e" });
    mono(ctx, "CONFIRMED · Friday · Room 3, Annex B", sx, y + 420, { size: 22, color: "#3d6a4c" });
    mono(ctx, "Attendance: one (1) person, in person.", sx, y + 456, { size: 18, color: "#6a7078" });
  } else if (page === "gap") {
    txt(ctx, "TONIGHT", sx, y + 150, { size: 40, font: F, weight: 800, color: "#25292e", spacing: 6 });
    // timeline 22:00 → 10:00
    const tx0 = sx + 10;
    const tx1 = x + w - 70;
    const ty = y + 300;
    line(ctx, tx0, ty, tx1, ty, "#25292e", 5);
    const at = (hh: number) => lerp(tx0, tx1, (hh - 0) / 4); // 05:00..09:00
    for (let hh = 0; hh <= 4; hh++) {
      line(ctx, at(hh), ty - 10, at(hh), ty + 10, "#25292e", 3);
      mono(ctx, `0${5 + hh}:00`, at(hh), ty + 40, { size: 17, color: "#6a7078", align: "center" });
    }
    // purge at 06:00, review at 08:00
    const px = at(1);
    const rx = at(3);
    line(ctx, px, ty - 120, px, ty + 6, C.redDk, 6);
    txt(ctx, "PURGE", px, ty - 134, { size: 30, font: F, weight: 900, color: C.redDk, align: "center", spacing: 4 });
    mono(ctx, "06:00", px, ty - 170, { size: 24, weight: 800, color: C.redDk, align: "center" });
    line(ctx, rx, ty - 120, rx, ty + 6, "#3d6a4c", 6);
    txt(ctx, "REVIEW", rx, ty - 134, { size: 30, font: F, weight: 900, color: "#3d6a4c", align: "center", spacing: 4 });
    mono(ctx, "08:00", rx, ty - 170, { size: 24, weight: 800, color: "#3d6a4c", align: "center" });
    // Orrin's red correction line between them
    corrLine(ctx, px + 6, ty + 90, rx - 6, ty + 90, prog(lt, 16.6, 17.8), 7);
    if (p > 0.55) {
      ctx.save();
      ctx.globalAlpha = clamp((p - 0.55) * 3);
      txt(ctx, "2 h 00", (px + rx) / 2, ty + 150, { size: 54, font: '"Brush Script MT","Segoe Script",cursive', weight: 700, color: C.red, align: "center" });
      ctx.restore();
    }
  } else {
    txt(ctx, "EQUIPMENT FAULT REPORT", sx, y + 150, { size: 44, font: F, weight: 900, color: "#25292e" });
    mono(ctx, "LOCATION     Calder Court · L2 · cavity wall", sx, y + 214, { size: 21, color: "#25292e" });
    mono(ctx, "DESCRIPTION  Intermittent tensile movement of fabric", sx, y + 250, { size: 21, color: "#25292e" });
    mono(ctx, "             measuring device within wall cavity.", sx, y + 280, { size: 21, color: "#25292e" });
    mono(ctx, "RECOMMEND    No action. Log and close.", sx, y + 330, { size: 21, color: "#25292e" });
    fillRR(ctx, sx, y + 392, 44, 44, 7, "#fff", "#25292e", 3);
    const ticked = extra > 0;
    if (ticked) {
      ctx.save();
      ctx.strokeStyle = "#1f7a46";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx + 8, y + 416);
      ctx.lineTo(sx + 20, y + 428 - 0);
      ctx.lineTo(sx + 38, y + 400);
      ctx.stroke();
      ctx.restore();
    }
    mono(ctx, "LOG AS: EQUIPMENT FAULT (CODE 7)", sx + 66, y + 422, { size: 26, weight: 900, color: "#25292e" });
    if (extra > 0.4) {
      ctx.save();
      ctx.translate(x + w - 220, y + h - 120);
      ctx.rotate(-0.1);
      ctx.strokeStyle = "#1f7a46";
      ctx.lineWidth = 4;
      ctx.strokeRect(-100, -30, 200, 60);
      txt(ctx, "LOGGED", 0, 12, { size: 34, font: F, weight: 900, color: "#1f7a46", align: "center", spacing: 3 });
      ctx.restore();
    }
  }
}

/* ---------- BEAT 1: the green number ---------- */

export function beat1(ctx: Ctx, lt: number, fx: FX) {
  void CT2;
  if (lt >= 10.5 && lt < 18.5) {
    const page = lt < 13.2 ? "penalty" : lt < 15.9 ? "review" : "gap";
    tabletInsert(ctx, lt, page, prog(lt, 17.2, 18.4));
    // a gloved finger taps
    const tapAt = [10.6, 13.3, 16.0];
    const k = Math.max(...tapAt.map((tt) => bump(lt, tt - 0.2, tt + 0.35)));
    ctx.save();
    finger(ctx, 880 + (page === "penalty" ? 0 : 20), 540 - k * 36, Math.PI * 0.27, 280, 58, "#f3f1ea", "#f7f6f1");
    ctx.restore();
    return;
  }
  if (lt >= 24 && lt < 31) {
    tabletInsert(ctx, lt, "fault", 0, lt > 25.0 ? clamp((lt - 25.0) * 2) : 0);
    const k = bump(lt, 24.7, 25.4);
    ctx.save();
    finger(ctx, 930, 600 - k * 40, Math.PI * 0.27, 300, 58, "#f3f1ea", "#f7f6f1");
    ctx.restore();
    return;
  }
  // wide: office, display, the two of them
  const push = lerp(1.0, 1.12, prog(lt, 0, 45));
  camera(ctx, 640, 380, push, () => {
    officeBG(ctx, lt);
    counter(ctx, 960, 540, 300);
    const chipIdx = lt > 5.7 && lt < 12 ? Math.floor((lt - 5.7) / 1.25) % 5 : -1;
    display(ctx, 440, 110, 440, 300, lt, chipIdx, lt > 18.5 ? 1 : 0);
    const h = 330;
    // Orrin
    const ox = 290;
    const op = poses.stand(Math.sin(lt * 1.7));
    const L = hl(ox, h, 1);
    const layingTape = prog(lt, 18.6, 20.4);
    op.handF = layingTape > 0 && layingTape < 1 ? L(ox + 120 + layingTape * 50, FY - h * 0.6 - layingTape * 40) : L(ox + 40, FY - h * 0.58);
    op.handB = L(ox + 10, FY - h * 0.45);
    if (layingTape > 0 && layingTape < 1) op.lean = 0.12;
    const oj = orr(ctx, ox, h, 1, op);
    if (!(lt > 18.4 && lt < 24)) clipboard(ctx, oj.handF[0] + 10, oj.handF[1] - 4, 44, 58, 0.15);
    // the Attendant
    const goTo = easeInOut(prog(lt, 20.6, 21.6));
    const back = easeInOut(prog(lt, 22.6, 24.0));
    let ax = 1000;
    if (lt > 20.6) ax = lerp(1000, 780, goTo);
    if (lt > 22.6) ax = lerp(780, 1030, back);
    const af: 1 | -1 = lt > 22.2 && lt < 25 ? 1 : -1;
    const ap = poses.stand(Math.sin(lt * 1.4));
    const AL = hl(ax, h * 0.97, af);
    let tapeA: V2 = [520, 300];
    let tapeB: V2 = [800, 262];
    const lift = easeInOut(prog(lt, 21.4, 22.9));
    if (lt >= 18.6 && lt < 20.4) {
      const k = layingTape;
      tapeA = [lerp(oj.handF[0] + 10, 520, easeOut(k)), lerp(oj.handF[1], 300, easeOut(k))];
      tapeB = [lerp(oj.handF[0] + 60, 800, easeOut(k)), lerp(oj.handF[1] - 20, 262, easeOut(k))];
    } else if (lt >= 20.4) {
      const lf = lift;
      tapeA = [lerp(520, 1008, lf), lerp(300, 540, lf)];
      tapeB = [lerp(800, 1146, lf), lerp(262, 534, lf)];
    }
    const tapeHand: V2 = [lerp(660, 1076, lift), lerp(281, 534, lift) - Math.sin(lift * Math.PI) * 60];
    if (lt >= 20.4 && lt < 24.5) {
      ap.handF = AL(lt < 21.4 ? tapeHand[0] - 40 : tapeHand[0], tapeHand[1]);
      ap.lean = 0.1;
    } else {
      // holding the tablet toward Orrin
      ap.handF = AL(ax - af * 52, FY - h * 0.62);
      ap.handB = AL(ax, FY - h * 0.45);
    }
    // draw the loose tape on the display or on the cloth
    if (lt >= 18.6 && lt < 100) {
      const tw = lt > 22.9 ? 20 : 24;
      const sag = lt > 22.9 ? 6 : 0;
      const wob = lt > 19.8 && lt < 22 ? Math.sin(lt * 26) * 2.2 : 0;
      clothTape(ctx, tapeA[0], tapeA[1] + wob, tapeB[0], tapeB[1] - wob, { width: tw, sag, showFirstInch: false, scroll: 5 });
    }
    att(ctx, ax, h, af, ap);
    // the white cloth + tablet
    if (!(lt >= 20.4 && lt < 24.5)) {
      const ah = hl(ax, h * 0.97, af);
      void ah;
      const jx = ax - af * 52;
      void jx;
    }
    // tablet in hand when idle
    if (!(lt >= 20.4 && lt < 24.5)) {
      const tx = ax - af * 56;
      ctx.save();
      ctx.translate(tx, FY - h * 0.62 - 8);
      ctx.rotate(-0.15 * af);
      fillRR(ctx, -32, -22, 64, 44, 3, "#d7dade", "rgba(30,22,40,0.8)", 1.5);
      fillRR(ctx, -27, -17, 54, 34, 2, "#47c07a");
      ctx.restore();
    }
  });
  fx.tint = [60, 140, 90, lt > 5.7 && lt < 12 ? 0.04 : 0];
}

/* ---------- BEAT 2: three folded frames ---------- */

const ROOMS = {
  A: { wall: "#c8d3c2", floor: "#6a5646" },
  B: { wall: "#e3c9a0", floor: "#7a6350" },
  C: { wall: "#d9b9c0", floor: "#6c5a50" },
};

type RoomKey = keyof typeof ROOMS;

interface Person {
  x: number;
  y: number;
  h: number;
  col: string;
  at: number;
}

const FRAME_PEOPLE: Record<RoomKey, Person[]> = {
  A: [
    { x: 150, y: 470, h: 330, col: "#3e4650", at: 17.2 },
    { x: 470, y: 470, h: 280, col: "#8fb3b0", at: 18.4 },
    { x: 700, y: 470, h: 310, col: "#b8bfc9", at: 19.4 },
  ],
  B: [
    { x: 240, y: 470, h: 330, col: "#365a8a", at: 20.2 },
    { x: 480, y: 470, h: 290, col: "#a33f55", at: 20.9 },
    { x: 700, y: 470, h: 170, col: "#e6b84a", at: 21.8 },
  ],
  C: [
    { x: 220, y: 470, h: 280, col: "#3f9b99", at: 22.5 },
    { x: 560, y: 470, h: 270, col: "#6e6a62", at: 23.0 },
    { x: 760, y: 470, h: 300, col: "#2f3f7a", at: 24.3 },
  ],
};

/** The interior of a stored room in its natural 900×520 frame, then squeezed by the caller. */
function drawRoom(ctx: Ctx, k: RoomKey, t: number) {
  const R = ROOMS[k];
  ctx.fillStyle = R.wall;
  ctx.fillRect(0, 0, 900, 520);
  wallpaper(ctx, 0, 0, 900, 440, 40, 10, R.wall, 1.1);
  ctx.fillStyle = R.floor;
  ctx.fillRect(0, 440, 900, 80);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0, 436, 900, 8);
  // window light: a thin bright line once compressed
  fillRR(ctx, 360, 60, 190, 200, 4, "#fff4c2", "rgba(0,0,0,0.3)", 3);
  line(ctx, 455, 60, 455, 260, "rgba(0,0,0,0.25)", 4);
  if (k === "A") {
    // linen shelves, cart, coat hook, lunch tin, headphones
    for (let i = 0; i < 4; i++) {
      fillRR(ctx, 640, 90 + i * 85, 240, 12, 2, "#8a6a3a");
      for (let j = 0; j < 4; j++) fillRR(ctx, 650 + j * 58, 56 + i * 85, 50, 36, 3, i % 2 ? "#f2efe4" : "#d9e4e8", "rgba(0,0,0,0.3)", 2);
    }
    fillRR(ctx, 60, 300, 160, 140, 8, "#9aa4ad", "rgba(0,0,0,0.4)", 3);
    fillRR(ctx, 300, 330, 220, 12, 2, "#6a4a2a");
    line(ctx, 310, 340, 310, 440, "#6a4a2a", 10);
    line(ctx, 510, 340, 510, 440, "#6a4a2a", 10);
    // coat on a hook
    line(ctx, 90, 120, 90, 150, "#555", 8);
    poly(ctx, [[40, 150], [140, 150], [160, 380], [20, 380]], "#3e4650", "rgba(0,0,0,0.5)", 3);
    for (let i = 0; i < 5; i++) circle(ctx, 90, 180 + i * 34, 6, C.gold);
    // lunch tin
    fillRR(ctx, 380, 296, 80, 36, 6, "#c8452f", "rgba(0,0,0,0.5)", 3);
    line(ctx, 380, 312, 460, 312, "#f1d9a0", 5);
    // headphones on cart handle
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(190, 298, 26, Math.PI, 0);
    ctx.stroke();
    circle(ctx, 164, 304, 12, "#35353c");
    circle(ctx, 216, 304, 12, "#35353c");
  } else if (k === "B") {
    fillRR(ctx, 330, 330, 260, 16, 3, "#8a5a32");
    line(ctx, 350, 346, 350, 440, "#8a5a32", 12);
    line(ctx, 570, 346, 570, 440, "#8a5a32", 12);
    // kettle
    fillRR(ctx, 420, 282, 70, 50, 14, "#c5ccd4", "rgba(0,0,0,0.4)", 3);
    // child's shoe on the floor
    ctx.fillStyle = "#c9442f";
    ctx.beginPath();
    ctx.ellipse(250, 480, 48, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
    fillRR(ctx, 214, 450, 36, 28, 10, "#c9442f", "rgba(0,0,0,0.6)", 3);
    // work cap on a hook and a headset on the table
    line(ctx, 110, 140, 110, 165, "#555", 8);
    ctx.fillStyle = "#4f6a8e";
    ctx.beginPath();
    ctx.ellipse(110, 190, 54, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(540, 322, 22, Math.PI, 0);
    ctx.stroke();
    // school bag
    fillRR(ctx, 760, 360, 90, 80, 12, "#e6b84a", "rgba(0,0,0,0.5)", 3);
  } else {
    // sewing machine, dress form, garments, cane, medical bag, pincushion
    fillRR(ctx, 300, 330, 300, 16, 3, "#7a5a3a");
    line(ctx, 330, 346, 330, 440, "#7a5a3a", 12);
    line(ctx, 570, 346, 570, 440, "#7a5a3a", 12);
    fillRR(ctx, 380, 270, 140, 60, 8, "#2a2e36", "rgba(0,0,0,0.5)", 3);
    line(ctx, 500, 270, 500, 240, "#2a2e36", 10);
    // dress form
    poly(ctx, [[760, 150], [830, 150], [850, 330], [740, 330]], "#d8cfb8", "rgba(0,0,0,0.5)", 3);
    line(ctx, 795, 330, 795, 440, "#444", 8);
    // hanging garments
    line(ctx, 40, 90, 260, 90, "#444", 6);
    for (let i = 0; i < 4; i++) poly(ctx, [[60 + i * 52, 96], [100 + i * 52, 96], [108 + i * 52, 300], [54 + i * 52, 300]], ["#7a8ca8", "#c9a24d", "#a9472f", "#4a6a5a"][i], "rgba(0,0,0,0.4)", 2);
    // cane
    line(ctx, 650, 440, 690, 290, "#5c3b22", 12);
    ctx.strokeStyle = "#5c3b22";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(668, 290, 20, Math.PI, Math.PI * 2.2);
    ctx.stroke();
    // medical bag
    fillRR(ctx, 120, 400, 110, 70, 10, "#5a4a3a", "rgba(0,0,0,0.5)", 3);
    fillRR(ctx, 150, 380, 50, 26, 8, "rgba(0,0,0,0)", "#333", 5);
    // pincushion with yellow thread
    circle(ctx, 445, 322, 22, "#c8452f", "rgba(0,0,0,0.5)", 3);
    circle(ctx, 500, 320, 12, C.yellow, "rgba(0,0,0,0.5)", 2);
  }
  // people
  for (const p of FRAME_PEOPLE[k]) {
    const mv = bump(t, p.at - 0.5, p.at + 0.7);
    const dx = 46 * mv + Math.sin(t * 1.3 + p.x) * 3;
    ctx.fillStyle = "rgba(10,5,20,0.25)";
    ctx.beginPath();
    ctx.ellipse(p.x + dx, p.y + 12, p.h * 0.22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    rr(ctx, p.x + dx - p.h * 0.14, p.y - p.h * 0.62, p.h * 0.28, p.h * 0.62, p.h * 0.07);
    ctx.fillStyle = p.col;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
    circle(ctx, p.x + dx, p.y - p.h * 0.72, p.h * 0.1, "#d9a784", "rgba(0,0,0,0.5)", 3);
  }
}

interface Frame {
  k: RoomKey;
  X: number;
  Z: number;
  objs: [string, number, number][]; // label, room-x, room-y
}

const FRAMES: Frame[] = [
  { k: "C", X: -0.45, Z: 7.2, objs: [] },
  { k: "B", X: 0.35, Z: 5.0, objs: [["child's shoe", 250, 470]] },
  { k: "A", X: -1.0, Z: 3.2, objs: [["coat", 90, 260], ["lunch tin", 420, 314]] },
];

export function beat2(ctx: Ctx, lt: number, fx: FX) {
  if (lt < 7.0) {
    keyShot(ctx, lt);
    return;
  }
  const open = easeInOut(prog(lt, 7.2, 9.4));
  const cam = prog(lt, 9, 45) * 0.9;
  const vx = 700;
  const vy = 300;
  const f = 700;
  const P = (X: number, Y: number, Z: number): V2 => [vx + (X * f) / (Z - cam), vy + (Y * f) / (Z - cam)];
  // shaft
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#150b24");
  g.addColorStop(1, "#2a1a42");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const Zb = 16;
  const wl = 2.6;
  const yc = -1.7;
  const yf = 1.4;
  const near = cam + 0.4;
  const bl = P(-wl, yf, Zb);
  const br = P(wl, yf, Zb);
  const tl = P(-wl, yc, Zb);
  const tr = P(wl, yc, Zb);
  poly(ctx, [tl, tr, P(wl, yc, near), P(-wl, yc, near)], "#241636");
  poly(ctx, [bl, br, P(wl, yf, near), P(-wl, yf, near)], "#2d2142");
  poly(ctx, [tl, bl, P(-wl, yf, near), P(-wl, yc, near)], "#331f4d");
  poly(ctx, [tr, br, P(wl, yf, near), P(wl, yc, near)], "#2b1a42");
  fillRR(ctx, tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], 0, "#3b2a58");
  // far glow
  const fg = ctx.createRadialGradient(vx, vy + 10, 0, vx, vy + 10, 160);
  fg.addColorStop(0, "rgba(190,150,255,0.55)");
  fg.addColorStop(1, "rgba(190,150,255,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(vx - 170, vy - 150, 340, 340);
  // floor grating & wall ribs
  for (let z = near + 0.3; z < Zb; z += 0.9) {
    const a = P(-wl, yf, z);
    const b = P(wl, yf, z);
    line(ctx, a[0], a[1], b[0], b[1], "rgba(180,150,230,0.12)", 1.5);
    const c = P(-wl, yc, z);
    line(ctx, a[0], a[1], c[0], c[1], "rgba(180,150,230,0.12)", 2);
    const d = P(wl, yc, z);
    const e = P(wl, yf, z);
    line(ctx, d[0], d[1], e[0], e[1], "rgba(180,150,230,0.12)", 2);
  }
  // frames, far to near
  FRAMES.forEach((fr, idx) => {
    drawFrame(ctx, fr, P, lt, idx, cam);
  });
  // ducts from the ceiling into all three
  FRAMES.forEach((fr, idx) => {
    const top = P(fr.X, -1.1, fr.Z);
    const ceil = P(fr.X + (idx - 1) * 0.35, yc, fr.Z + 0.2);
    const pulse = Math.max(0, Math.sin((Math.PI * 2 * (lt + idx * 0.37)) / (1.2 + idx * 0.07)));
    ctx.strokeStyle = "#5b4b75";
    ctx.lineWidth = 11 * (3 / (fr.Z - cam)) + 3;
    ctx.beginPath();
    ctx.moveTo(ceil[0], ceil[1]);
    ctx.quadraticCurveTo(ceil[0], (ceil[1] + top[1]) / 2, top[0], top[1]);
    ctx.stroke();
    ctx.strokeStyle = `rgba(190,160,255,${0.15 + 0.4 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  // dust that falls sideways near compressed frames
  for (let i = 0; i < 70; i++) {
    const sp = 12 + ((i * 29) % 26);
    const x = ((i * 193 + lt * sp) % 1300) - 10;
    const y = 80 + ((i * 71) % 520);
    ctx.fillStyle = "rgba(255,252,240,0.5)";
    ctx.fillRect(x, y + Math.sin(lt + i) * 5, 3, 1.3);
  }
  // Orrin from behind, small in the corner, recorder raised
  backFigure(ctx, 130, 760, 440, lt * 0.0);
  ctx.save();
  fillRR(ctx, 190, 466, 18, 38, 3, "#2b2733", "rgba(0,0,0,0.8)", 1.4);
  circle(ctx, 199, 474, 3, C.red);
  ctx.restore();
  // hatch panels sliding open
  if (open < 1) {
    const pw = (W / 2) * (1 - open);
    ctx.fillStyle = "#59616c";
    ctx.fillRect(0, 0, pw, H);
    ctx.fillRect(W - pw, 0, pw, H);
    line(ctx, pw, 0, pw, H, "#c5ccd4", 6);
    line(ctx, W - pw, 0, W - pw, H, "#c5ccd4", 6);
    const lg = ctx.createLinearGradient(pw, 0, pw + 120, 0);
    lg.addColorStop(0, "rgba(160,120,240,0.55)");
    lg.addColorStop(1, "rgba(160,120,240,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(pw, 0, 120, H);
    mono(ctx, "INSPECTION", pw / 2, 60, { size: 22, weight: 900, color: "#dfe4e8", align: "center", spacing: 4 });
  }
  // the one expensive distortion shot
  const reveal = bump(lt, 7.2, 14);
  fx.distort = 0.2 + 0.55 * reveal;
  fx.fx = 640;
  fx.fy = 330;
  fx.fr = 340;
  fx.tint = [90, 50, 150, 0.12];
  fx.shake = open < 1 ? 3 : 0;
  // tallies
  const marks = FRAME_PEOPLE.A.concat(FRAME_PEOPLE.B, FRAME_PEOPLE.C);
  const tx0 = 300;
  const ty = 650;
  const n = marks.filter((m) => lt >= m.at).length;
  if (lt > 16.5) {
    ctx.save();
    ctx.globalAlpha = clamp((lt - 16.5) * 1.2);
    mono(ctx, "MOVEMENT", 70, ty - 6, { size: 14, color: "#cbb8e8", spacing: 3 });
    marks.forEach((m, i) => {
      if (lt < m.at) return;
      const p = prog(lt, m.at, m.at + 0.35);
      const gx = tx0 + i * 34 + Math.floor(i / 3) * 20;
      const col = i === 8 ? C.yellow : C.red;
      line(ctx, gx, ty - 28, gx + 4, ty - 28 + 40 * p, col, 5);
    });
    if (n >= 9 && lt > 24.3) {
      // yellow thread underlines the ninth
      const p = prog(lt, 24.8, 26.2);
      corrLine(ctx, tx0 + 8 * 34 + 40 - 24, ty + 22, tx0 + 8 * 34 + 40 - 24 + 40 * p, ty + 22, 1, 4, C.yellow);
    }
    ctx.restore();
  }
  // red circles + handwritten tags
  const marksObj: [string, number, number, number][] = [];
  const tagT = [11.6, 13.3, 15.0];
  const items: [Frame, number, string][] = [
    [FRAMES[2], 0, "coat"],
    [FRAMES[2], 1, "lunch tin"],
    [FRAMES[1], 0, "child's shoe"],
  ];
  items.forEach(([fr, oi, label], i) => {
    const a = prog(lt, tagT[i], tagT[i] + 0.9);
    if (a <= 0) return;
    const s = 1 / (1 - 0);
    void s;
    const [lx, rx, ry] = fr.objs[oi];
    const q = faceMap(fr, P);
    const px = q.x + (rx / 900) * q.w;
    const py = q.y + (ry / 520) * q.h;
    corrCircle(ctx, px, py, 26, a, 3.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 30px "Brush Script MT","Segoe Script",cursive`;
    ctx.fillStyle = C.red;
    ctx.textAlign = i === 2 ? "left" : "right";
    ctx.fillText(label, i === 2 ? px + 40 : px - 40, py - 30 + (i === 1 ? 62 : 0));
    ctx.restore();
    void lx;
  });
  void marksObj;
}

function faceMap(fr: Frame, P: (X: number, Y: number, Z: number) => V2) {
  const a = P(fr.X - 0.31, -1.1, fr.Z);
  const b = P(fr.X + 0.31, 1.4, fr.Z);
  return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] };
}

function drawFrame(ctx: Ctx, fr: Frame, P: (X: number, Y: number, Z: number) => V2, lt: number, idx: number, cam: number) {
  const q = faceMap(fr, P);
  // side faces toward the vanishing point: pleated slab
  const depth = 1.7;
  const sideX = fr.X > -0.1 ? fr.X - 0.31 : fr.X + 0.31;
  const s1 = P(sideX, -1.1, fr.Z);
  const s2 = P(sideX, 1.4, fr.Z);
  const s3 = P(sideX, 1.4, fr.Z + depth);
  const s4 = P(sideX, -1.1, fr.Z + depth);
  poly(ctx, [s1, s2, s3, s4], "#4a3568", "rgba(10,5,20,0.7)", 2);
  for (let i = 1; i < 9; i++) {
    const z = fr.Z + (depth * i) / 9;
    const a = P(sideX, -1.1, z);
    const b = P(sideX, 1.4, z);
    line(ctx, a[0], a[1], b[0], b[1], i % 2 ? "rgba(20,10,35,0.5)" : "rgba(190,160,240,0.18)", 2);
  }
  // glow behind (room light leaking from the thin window)
  const gl = ctx.createRadialGradient(q.x + q.w / 2, q.y + q.h * 0.45, 4, q.x + q.w / 2, q.y + q.h * 0.45, q.h * 0.7);
  gl.addColorStop(0, "rgba(255,220,150,0.3)");
  gl.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(q.x - q.h * 0.7, q.y - 40, q.h * 1.4 + q.w, q.h + 80);
  // frame housing
  fillRR(ctx, q.x - 8, q.y - 10, q.w + 16, q.h + 20, 4, "#6a5a82", "rgba(10,5,20,0.8)", 3);
  // squeezed room: drawRoom into the face with a strong horizontal squeeze
  ctx.save();
  ctx.beginPath();
  ctx.rect(q.x, q.y, q.w, q.h);
  ctx.clip();
  ctx.translate(q.x, q.y);
  ctx.scale(q.w / 900, q.h / 520);
  drawRoom(ctx, fr.k, lt);
  ctx.restore();
  // vertical sheen to read as compressed glass
  const sh = ctx.createLinearGradient(q.x, 0, q.x + q.w, 0);
  sh.addColorStop(0, "rgba(255,255,255,0.18)");
  sh.addColorStop(0.5, "rgba(255,255,255,0)");
  sh.addColorStop(1, "rgba(30,10,60,0.3)");
  ctx.fillStyle = sh;
  ctx.fillRect(q.x, q.y, q.w, q.h);
  // label
  const lbl = ["F-3", "F-2", "F-1"][idx];
  mono(ctx, lbl, q.x + q.w / 2, q.y - 22, { size: 14 + 14 / (fr.Z - cam), weight: 900, color: "#cbb8e8", align: "center", spacing: 2 });
  shadowEllipse(ctx, q.x + q.w / 2, q.y + q.h + 6, q.w * 1.1, 8, 0.4);
}

function keyShot(ctx: Ctx, lt: number) {
  // brass survey key in the inspection hatch lock; limited authority, not the transfer control
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#4b525c");
  g.addColorStop(1, "#6b7480");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) line(ctx, 0, i * 12 + 3, W, i * 12 + 3 + Math.sin(i) * 2, "rgba(255,255,255,0.045)", 1.5);
  // hatch plate
  fillRR(ctx, 330, 80, 620, 560, 14, "#7d8691", "rgba(0,0,0,0.6)", 5);
  for (const [x, y] of [[360, 110], [920, 110], [360, 610], [920, 610]]) circle(ctx, x, y, 12, "#c5ccd4", "rgba(0,0,0,0.6)", 2);
  mono(ctx, "INSPECTION", 640, 190, { size: 54, weight: 900, color: "#2a2e36", align: "center", spacing: 8 });
  mono(ctx, "SURVEY KEY — GRADE 4 — INSPECT ONLY", 640, 236, { size: 20, color: "#2a2e36", align: "center", spacing: 2 });
  // lock
  const lx = 640;
  const ly = 400;
  circle(ctx, lx, ly, 96, "#5a626d", "rgba(0,0,0,0.7)", 5);
  circle(ctx, lx, ly, 70, "#2d333b", "rgba(0,0,0,0.7)", 4);
  const turn = easeInOut(prog(lt, 3.6, 5.2));
  const ins = easeOut(prog(lt, 0.7, 2.6));
  // keyway
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(turn * (Math.PI / 2) * 0.9);
  fillRR(ctx, -7, -30, 14, 60, 4, "#0b0d10");
  ctx.restore();
  // brass key with three notches
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(turn * (Math.PI / 2) * 0.9);
  const kx = lerp(560, 0, ins);
  fillRR(ctx, kx - 0, -9, 150, 18, 4, C.gold, "rgba(60,40,10,0.9)", 2);
  for (let i = 0; i < 3; i++) fillRR(ctx, kx + 60 + i * 28, 4, 14, 8 + i * 3, 1, "#2d333b");
  // bow
  circle(ctx, kx + 170, 0, 36, C.gold, "rgba(60,40,10,0.9)", 3);
  circle(ctx, kx + 170, 0, 14, "#4b525c");
  ctx.restore();
  // fingers on the bow
  const bx = lx + lerp(560, 0, ins) + 170;
  ctx.save();
  ctx.translate(0, 0);
  void bx;
  ctx.restore();
  // hand from the right
  const hx = lx + lerp(560, 0, ins) * Math.cos(turn * 1.4) + 190;
  finger(ctx, Math.min(1120, hx + 70), ly + 60 + Math.sin(turn * 1.4) * 80, Math.PI * 0.95 + 0.0, 300, 76);
  if (lt > 5.2) {
    // a small shut indicator lamp: inspect granted, transfer denied
    circle(ctx, 800, 330, 12, C.green, "rgba(0,0,0,0.6)", 2);
    circle(ctx, 800, 380, 12, "#5a1f1c", "rgba(0,0,0,0.6)", 2);
    mono(ctx, "INSPECT", 830, 336, { size: 14, color: "#2a2e36" });
    mono(ctx, "TRANSFER — AUTH", 830, 386, { size: 14, color: "#2a2e36" });
  }
}

void smooth;
void CAST;
void rr;
