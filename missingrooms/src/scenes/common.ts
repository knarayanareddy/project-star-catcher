import { CAST, drawBackFigure, poses, type Pose, C, Ctx, circle, fillRR, line, mono, poly, txt, wallpaper, flower, lightPool } from "../engine/draw";
import { BEAT_LEN, H, W, clamp, easeInOut, lerp } from "../engine/util";
import { cuesFor, EPISODES } from "../story/episodes";
import type { EpisodeSound, SoundCue } from "../engine/audio";

export const YF = 612; // floor line in elevation shots
export const CREASE = 1480; // world-x of the compression crease
export const HATCH_X = 1388;

export interface Hud {
  rec: boolean;
  /** survey recorder subject line (null = hide) */
  subject?: string | null;
  /** story clock in minutes after Thursday 00:00 */
  clock: number;
  showPurge: boolean;
  /** hide the HUD (when the picture is the recorder itself) */
  hidden?: boolean;
}

export interface EpisodeScene {
  id: "ep1" | "ep2";
  render: (ctx: Ctx, t: number, fx: import("../engine/post").FX) => void;
  sound: EpisodeSound;
  /** episode-time of hard cuts, where the red correction line wipes the frame */
  cuts: number[];
  hud: (t: number) => Hud;
}

export const beatOf = (t: number) => {
  const b = Math.min(4, Math.floor(t / BEAT_LEN));
  return { b, lt: t - b * BEAT_LEN, endCard: t >= BEAT_LEN * 5 };
};

/** local-time start of a narration sentence inside a beat */
export function cueTimes(epIndex: number, beat: number) {
  const cs = cuesFor(EPISODES[epIndex], beat);
  return (i: number) => (cs[Math.min(i, cs.length - 1)] ?? cs[cs.length - 1]).start;
}

export function fillBG(ctx: Ctx, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** Zoom/pan the next draw calls around a focal point. */
export function camera(ctx: Ctx, cx: number, cy: number, z: number, fn: () => void, dx = 0, dy = 0) {
  if (z >= 1) {
    cx = clamp(cx, W / (2 * z), W - W / (2 * z));
    cy = clamp(cy, H / (2 * z), H - H / (2 * z));
  }
  ctx.save();
  ctx.translate(W / 2 + dx, H / 2 + dy);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

export const shot = (lt: number, bounds: number[]) => {
  let i = 0;
  for (let k = 0; k < bounds.length; k++) if (lt >= bounds[k]) i = k;
  return i;
};

/**
 * A plan sheet of Level 2. `gap` animates Room 2-07 between REV C (1: the sewing room exists between laundry
 * and stairs) and REV D (0: laundry touches stairs, a red dotted ghost remains).
 */
export function planSheet(ctx: Ctx, x: number, y: number, w: number, h: number, o: { gap?: number; rev?: string; stamp?: number; ghost?: number } = {}) {
  const gap = o.gap ?? 0;
  ctx.save();
  ctx.translate(x, y);
  fillRR(ctx, 8, 10, w, h, 3, "rgba(10,5,20,0.28)");
  fillRR(ctx, 0, 0, w, h, 3, "#f4efe0", "rgba(30,22,40,0.6)", 1.4);
  for (let gx = 20; gx < w; gx += 20) line(ctx, gx, 0, gx, h, "rgba(60,90,140,0.12)", 1);
  for (let gy = 20; gy < h; gy += 20) line(ctx, 0, gy, w, gy, "rgba(60,90,140,0.12)", 1);
  const F = "Courier New, monospace";
  txt(ctx, "CALDER COURT · LEVEL 2", w * 0.05, h * 0.1, { size: Math.max(9, w * 0.034), font: F, weight: 800 });
  txt(ctx, `HOUSING DEPT · APPROVED PLAN · ${o.rev ?? "REV D"}`, w * 0.05, h * 0.165, { size: Math.max(7, w * 0.021), font: F, color: C.inkSoft });
  const cy = h * 0.5;
  const rh = h * 0.3;
  const rooms: [string, number, string][] = [
    ["2-04", 0.14, "#e7dcc0"],
    ["2-05", 0.14, "#e7dcc0"],
    ["LAUNDRY", 0.2, "#d3dfd9"],
  ];
  let cx = w * 0.05;
  const draw = (lbl: string, ww: number, col: string) => {
    fillRR(ctx, cx, cy - rh, ww - 5, rh, 1, col, C.ink, 1.4);
    txt(ctx, lbl, cx + (ww - 5) / 2, cy - rh / 2 + 4, { size: Math.max(8, w * 0.026), font: F, align: "center", weight: 800 });
    cx += ww;
  };
  rooms.forEach(([l, ww, c]) => draw(l, ww * w, c));
  const sew = 0.17 * w * gap;
  if (sew > 3) {
    ctx.save();
    ctx.globalAlpha = clamp(gap * 1.5);
    fillRR(ctx, cx, cy - rh, sew - 5, rh, 1, "#f1d9b0", C.ink, 1.4);
    if (sew > 40) txt(ctx, "2-07", cx + (sew - 5) / 2, cy - rh / 2 - 4, { size: Math.max(8, w * 0.024), font: F, align: "center", weight: 800 });
    if (sew > 70) txt(ctx, "SEWING", cx + (sew - 5) / 2, cy - rh / 2 + 16, { size: Math.max(6, w * 0.017), font: F, align: "center", color: C.inkSoft });
    ctx.restore();
  }
  // ghost: where the room was
  const ghost = o.ghost ?? 0;
  if (ghost > 0) {
    ctx.save();
    ctx.globalAlpha = ghost;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(cx + 1, cy - rh, 0.17 * w - 7, rh);
    ctx.setLineDash([]);
    txt(ctx, "2-07 ?", cx + (0.17 * w) / 2, cy - rh / 2 + 5, { size: Math.max(8, w * 0.026), font: F, align: "center", weight: 800, color: C.red });
    ctx.restore();
  }
  cx += sew;
  draw("STAIRS", 0.2 * w, "#cfc9d6");
  line(ctx, w * 0.05, cy + 10, w * 0.95, cy + 10, C.ink, 2.2);
  txt(ctx, "CORRIDOR", w * 0.5, cy + 34, { size: Math.max(7, w * 0.02), font: F, align: "center", color: C.inkSoft });
  line(ctx, 0, h * 0.78, w, h * 0.78, C.ink, 1.3);
  txt(ctx, "SURVEYED / APPROVED", w * 0.05, h * 0.855, { size: Math.max(7, w * 0.02), font: F, color: C.inkSoft });
  ctx.save();
  ctx.font = `${Math.max(14, w * 0.06)}px "Brush Script MT","Segoe Script",cursive`;
  ctx.fillStyle = "#25306a";
  ctx.fillText("O. Voss", w * 0.05, h * 0.955);
  ctx.restore();
  const st = o.stamp ?? 0;
  if (st > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(st);
    ctx.translate(w * 0.78, h * 0.88);
    ctx.rotate(-0.12);
    ctx.strokeStyle = C.redDk;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-w * 0.14, -h * 0.07, w * 0.28, h * 0.14);
    txt(ctx, "APPROVED", 0, h * 0.02, { size: Math.max(9, w * 0.044), font: F, weight: 800, color: C.redDk, align: "center" });
    ctx.restore();
  }
  ctx.restore();
}

/** Elevation of Level 2's corridor wall. Camera scroll sx; everything drawn in screen space. */
export function wallElevation(
  ctx: Ctx,
  sx: number,
  o: {
    t: number;
    hatch?: number; // 0 closed .. 1 open
    pulse?: number; // 0..1 breathing of the far side
    dust?: boolean;
    showStairs?: boolean;
  },
) {
  const cx = CREASE - sx;
  const ox = 40 - sx; // pattern lattice anchored so a flower sits exactly on the crease
  const wpH = YF - 150;
  // ceiling & back
  const g = ctx.createLinearGradient(0, 0, 0, YF);
  g.addColorStop(0, "#cbbf9f");
  g.addColorStop(0.2, C.cream);
  g.addColorStop(1, "#d9cdb0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // wallpaper — two panels sharing one lattice; right side is shifted 9px (compressed)
  wallpaper(ctx, 0, 0, cx - 1, wpH, ox, 0, "#b9bf9f", 1);
  wallpaper(ctx, cx + 2, 0, W - cx, wpH, ox, 9, "#b9bf9f", 1);
  // sweep of tone to read as wallpaper under light
  const lg = ctx.createLinearGradient(0, 0, 0, wpH);
  lg.addColorStop(0, "rgba(40,30,20,0.28)");
  lg.addColorStop(0.35, "rgba(40,30,20,0)");
  lg.addColorStop(1, "rgba(40,30,20,0.12)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, wpH);

  // dado panelling
  ctx.fillStyle = "#6d7a68";
  ctx.fillRect(0, wpH, W, 150);
  ctx.fillStyle = "#86937f";
  ctx.fillRect(0, wpH, W, 8);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, wpH + 8, W, 4);
  for (let px = Math.floor((-sx - 200) / 130) * 130 + (-sx % 130); px < W + 130; px += 130) {
    fillRR(ctx, px + 12, wpH + 26, 106, 96, 3, "#657261", "rgba(0,0,0,0.22)", 1.5);
    fillRR(ctx, px + 18, wpH + 32, 94, 84, 2, "rgba(255,255,255,0.05)");
  }
  // right side dado shift
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx + 2, wpH - 20, W, 200);
  ctx.clip();
  ctx.translate(0, 9);
  ctx.fillStyle = "#6d7a68";
  ctx.fillRect(cx, wpH, W, 150);
  ctx.fillStyle = "#86937f";
  ctx.fillRect(cx, wpH, W, 8);
  for (let px = cx + 20; px < W + 130; px += 130) fillRR(ctx, px, wpH + 26, 106, 96, 3, "#657261", "rgba(0,0,0,0.22)", 1.5);
  ctx.restore();

  // doors
  const doors: { x: number; label: string; laundry?: boolean }[] = [
    { x: 330, label: "2-04" },
    { x: 700, label: "2-05" },
    { x: 1150, label: "2-06", laundry: true },
  ];
  for (const d of doors) {
    const x = d.x - sx;
    if (x < -220 || x > W + 50) continue;
    const dw = 150;
    const dt = 224;
    // frame
    fillRR(ctx, x - 12, dt - 12, dw + 24, YF - dt + 12, 3, "#4d3a2b", "rgba(0,0,0,0.5)", 1.5);
    fillRR(ctx, x, dt, dw, YF - dt, 2, d.laundry ? "#8aa19c" : "#9b6b45", "rgba(0,0,0,0.5)", 1.5);
    fillRR(ctx, x + 16, dt + 26, dw - 32, 130, 2, "rgba(255,255,255,0.08)", "rgba(0,0,0,0.25)", 1.5);
    fillRR(ctx, x + 16, dt + 176, dw - 32, 160, 2, "rgba(255,255,255,0.06)", "rgba(0,0,0,0.25)", 1.5);
    circle(ctx, x + dw - 20, dt + 200, 7, C.gold, "rgba(0,0,0,0.5)", 1);
    fillRR(ctx, x + dw / 2 - 30, dt - 54, 60, 28, 3, C.gold, "rgba(0,0,0,0.5)", 1.2);
    mono(ctx, d.label, x + dw / 2, dt - 33, { size: 17, weight: 800, color: "#3a2c14", align: "center" });
    if (d.laundry) {
      fillRR(ctx, x + 30, dt + 52, dw - 60, 40, 2, "#f1ede0", "rgba(0,0,0,0.4)", 1.2);
      mono(ctx, "LAUNDRY", x + dw / 2, dt + 78, { size: 15, weight: 800, align: "center" });
    }
  }

  // maintenance hatch beside the crease
  {
    const hx = HATCH_X - sx;
    const hy = 392;
    drawHatch(ctx, hx, hy, 76, 118, o.hatch ?? 0, o.pulse ?? 0, o.t);
  }

  // the crease
  {
    // brass plate sheared in two
    const px = cx - 38;
    const py = 330;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py - 4, 38, 60);
    ctx.clip();
    fillRR(ctx, px, py, 76, 44, 3, C.gold, "rgba(0,0,0,0.5)", 1.2);
    mono(ctx, "2-07", px + 38, py + 30, { size: 24, weight: 800, color: "#3a2c14", align: "center" });
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx + 2, py - 4, 38, 70);
    ctx.clip();
    ctx.translate(0, 9);
    fillRR(ctx, px, py, 76, 44, 3, C.gold, "rgba(0,0,0,0.5)", 1.2);
    mono(ctx, "2-07", px + 38, py + 30, { size: 24, weight: 800, color: "#3a2c14", align: "center" });
    ctx.restore();
    // shading across the crease
    const sg = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
    sg.addColorStop(0, "rgba(30,15,45,0)");
    sg.addColorStop(0.48, "rgba(30,15,45,0.35)");
    sg.addColorStop(0.5, "rgba(10,0,20,0.85)");
    sg.addColorStop(0.52, "rgba(30,15,45,0.3)");
    sg.addColorStop(1, "rgba(30,15,45,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 18, 0, 36, YF + 20);
    // faint violet leak of the stored room
    const pl = o.pulse ?? 0;
    if (pl > 0) {
      const vg = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
      vg.addColorStop(0, "rgba(120,80,190,0)");
      vg.addColorStop(0.5, `rgba(140,100,220,${0.28 * pl})`);
      vg.addColorStop(1, "rgba(120,80,190,0)");
      ctx.fillStyle = vg;
      ctx.fillRect(cx - 40, 0, 80, YF);
    }
  }

  // stairwell, immediately after the crease
  if (o.showStairs !== false) {
    const sxs = 1585 - sx;
    if (sxs < W + 10) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sxs, 0, W - sxs + 400, H);
      ctx.clip();
      ctx.fillStyle = "#3a3146";
      ctx.fillRect(sxs, 0, 700, YF + 4);
      const sg2 = ctx.createLinearGradient(sxs, 0, sxs + 500, 0);
      sg2.addColorStop(0, "rgba(255,230,170,0.0)");
      sg2.addColorStop(1, "rgba(255,230,170,0.16)");
      ctx.fillStyle = sg2;
      ctx.fillRect(sxs, 0, 700, YF);
      // steps climbing right
      const base = sxs + 70;
      for (let i = 0; i < 9; i++) {
        const sx2 = base + i * 62;
        const sy2 = YF - i * 40;
        poly(ctx, [[sx2, sy2], [sx2 + 62, sy2], [sx2 + 62, YF + 4], [sx2, YF + 4]], i % 2 ? "#4b4158" : "#4f455d", "rgba(0,0,0,0.4)", 1.3);
        line(ctx, sx2, sy2, sx2 + 62, sy2, "#8a7f99", 3);
      }
      line(ctx, base, YF - 150, base + 9 * 62, YF - 150 - 9 * 40, "#c9a24d", 5);
      for (let i = 0; i < 9; i++) line(ctx, base + i * 62 + 10, YF - 150 - i * 40, base + i * 62 + 10, YF - i * 40, "#a58a46", 3);
      mono(ctx, "STAIRS ▲", sxs + 130, 150, { size: 20, weight: 800, color: "#d9c9a2" });
      lightPool(ctx, sxs + 360, 40, 330, 0.28, "255,230,170");
      ctx.restore();
      fillRR(ctx, sxs - 14, 0, 14, YF, 0, "#4d3a2b");
    }
  }

  // floor: patterned carpet runner
  ctx.fillStyle = "#4d3a4c";
  ctx.fillRect(0, YF, W, H - YF);
  ctx.fillStyle = "#3b2c3b";
  ctx.fillRect(0, YF, W, 10);
  for (let k = -2; k < 24; k++) {
    const px = k * 120 - (sx % 120);
    ctx.fillStyle = k % 2 ? "rgba(210,170,120,0.1)" : "rgba(0,0,0,0.12)";
    poly(ctx, [[px, YF + 10], [px + 70, YF + 10], [px + 54, H], [px - 20, H]], undefined);
    ctx.fillRect(px, YF + 10, 60, H - YF);
  }
  for (const y of [YF + 52, YF + 88]) line(ctx, 0, y, W, y, "rgba(210,170,120,0.35)", 3);
  // floor discontinuity at crease
  line(ctx, cx, YF, cx, H, "rgba(0,0,0,0.65)", 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx + 2, YF + 6, W, H);
  ctx.clip();
  ctx.fillStyle = "#4d3a4c";
  ctx.fillRect(cx, YF + 6, W, H);
  for (const y of [YF + 61, YF + 97]) line(ctx, cx, y, W, y, "rgba(210,170,120,0.35)", 3);
  ctx.restore();
  // baseboard
  ctx.fillStyle = "#cfc3a4";
  ctx.fillRect(0, YF - 8, cx, 10);
  ctx.fillRect(cx + 2, YF - 2, W, 10);

  // ceiling lights
  for (let k = -1; k < 6; k++) {
    const lx = 200 + k * 520 - sx;
    lightPool(ctx, lx, 0, 330, 0.22 + (k === 2 ? 0.04 * Math.sin(o.t * 37) * Math.sin(o.t * 5) : 0), "255,240,200");
  }
  if (o.dust) {
    // white dust, falling sideways near the compressed seam
    for (let i = 0; i < 46; i++) {
      const r1 = Math.sin(i * 12.9898) * 43758.5453;
      const f1 = r1 - Math.floor(r1);
      const r2 = Math.sin(i * 78.233) * 12543.123;
      const f2 = r2 - Math.floor(r2);
      const px = cx - 220 + ((f1 * 440 + o.t * (14 + f2 * 30)) % 440);
      const py = 80 + f2 * (YF - 140);
      const near = 1 - Math.min(1, Math.abs(px - cx) / 230);
      ctx.fillStyle = `rgba(255,252,240,${0.7 * near})`;
      ctx.fillRect(px, py + Math.sin(o.t * 1.4 + i) * 4, 3.4, 1.4);
    }
  }
}

export function drawHatch(ctx: Ctx, x: number, y: number, w: number, h: number, open: number, _pulse: number, t: number) {
  // frame & opening
  fillRR(ctx, x - 6, y - 6, w + 12, h + 12, 3, "#58606b", "rgba(0,0,0,0.55)", 1.5);
  ctx.fillStyle = "#120a1e";
  ctx.fillRect(x, y, w, h);
  if (open > 0.02) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "rgba(140,100,220,0.25)");
    g.addColorStop(1, "rgba(80,50,140,0.1)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // faint duct lines
    for (let i = 0; i < 6; i++) line(ctx, x + 4, y + 14 + i * (h / 6), x + w - 4, y + 10 + i * (h / 6) + Math.sin(t + i) * 2, "rgba(150,110,230,0.2)", 2);
  }
  // door swings on the left hinge: width scales by cos
  const ang = easeInOut(open) * 1.9;
  const cw = Math.cos(ang);
  const dw = w * Math.abs(cw);
  const back = cw < 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 90, y - 30, w + 180, h + 60);
  ctx.clip();
  const dx = x; // hinge
  ctx.fillStyle = back ? "#d8d2c0" : "#8c95a1";
  const sk = Math.sin(ang) * 10;
  poly(ctx, [[dx, y], [dx + (back ? -dw : dw), y - sk], [dx + (back ? -dw : dw), y + h + sk], [dx, y + h]], back ? "#e0dac6" : "#8c95a1", "rgba(0,0,0,0.6)", 1.6);
  if (!back) {
    // screw heads + slot handle
    for (const [sx2, sy2] of [[0.15, 0.1], [0.85, 0.1], [0.15, 0.9], [0.85, 0.9]] as const) circle(ctx, dx + dw * sx2, y + h * sy2, 3, "#c5ccd4", "rgba(0,0,0,0.5)", 1);
    fillRR(ctx, dx + dw * 0.64, y + h * 0.46, dw * 0.22, 10, 3, "#2a2e36");
    mono(ctx, "SVC", dx + dw / 2, y + 28, { size: 12, weight: 800, color: "#e2e6ea", align: "center" });
  }
  ctx.restore();
}

/** the paper-model corridor in one-point perspective, unfolding from a flat net. */
export function paperCorridor(ctx: Ctx, p: number, camZ: number, t: number) {
  const vx = 640;
  const vy = 318;
  const f = 640;
  const Zb = 11.5;
  const near = camZ + 0.55;
  const wallX = 0.8;
  const yFloor = 1.45;
  const yCeil = -1.05;
  const P = (X: number, Y: number, Z: number): [number, number] => [vx + (X * f) / (Z - camZ), vy + (Y * f) / (Z - camZ)];
  const bl = P(-wallX, yFloor, Zb);
  const br = P(wallX, yFloor, Zb);
  const tl = P(-wallX, yCeil, Zb);
  const tr = P(wallX, yCeil, Zb);
  const e = easeInOut(p);
  const mix = (a: [number, number], b: [number, number]): [number, number] => [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];

  // desk behind the paper model
  const bgc = ctx.createLinearGradient(0, 0, 0, H);
  bgc.addColorStop(0, "#1b1226");
  bgc.addColorStop(1, "#2a1c36");
  ctx.fillStyle = bgc;
  ctx.fillRect(0, 0, W, H);
  // desk lines
  for (let i = 0; i < 8; i++) line(ctx, 0, 90 + i * 90, W, 90 + i * 90, "rgba(255,255,255,0.025)", 2);

  // flat-net positions (flaps lie around the back wall, each 250px deep)
  const D = 235;
  // final near positions
  const fl = P(-wallX, yFloor, near);
  const fr2 = P(wallX, yFloor, near);
  const cl = P(-wallX, yCeil, near);
  const cr = P(wallX, yCeil, near);

  const shadeFold = (c: string, k: number) => (k < 1 ? c : c);
  void shadeFold;
  // floor flap
  const floor: [number, number][] = [
    bl,
    br,
    mix([br[0], br[1] + D], fr2),
    mix([bl[0], bl[1] + D], fl),
  ];
  const ceil: [number, number][] = [
    tl,
    tr,
    mix([tr[0], tr[1] - D], cr),
    mix([tl[0], tl[1] - D], cl),
  ];
  const left: [number, number][] = [
    tl,
    bl,
    mix([bl[0] - D, bl[1]], fl),
    mix([tl[0] - D, tl[1]], cl),
  ];
  const right: [number, number][] = [
    tr,
    br,
    mix([br[0] + D, br[1]], fr2),
    mix([tr[0] + D, tr[1]], cr),
  ];

  const fold = Math.sin(Math.PI * p); // darkness while mid-fold
  const paper = (pts: [number, number][], col: string) => {
    poly(ctx, pts, col, "rgba(30,20,40,0.55)", 2);
    ctx.fillStyle = `rgba(20,10,30,${0.22 * fold})`;
    poly(ctx, pts, `rgba(20,10,30,${0.22 * fold})`);
  };
  paper(floor, "#6e5a56");
  paper(ceil, "#d7ccb0");
  paper(left, "#e1d6b8");
  paper(right, "#dbcfaf");
  // back wall
  fillRR(ctx, tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], 1, "#cfc4a6", "rgba(30,20,40,0.55)", 2);

  if (p > 0.9) {
    const a = (p - 0.9) / 0.1;
    ctx.save();
    ctx.globalAlpha = a;
    // floor boards, ceiling lights and wall dado
    for (let z = near + 0.2; z < Zb; z += 0.7) {
      const [ax, ay] = P(-wallX, yFloor, z);
      const [bx] = P(wallX, yFloor, z);
      line(ctx, ax, ay, bx, ay, "rgba(0,0,0,0.25)", 1.4);
    }
    for (let z = 2 + (Math.floor(camZ / 2.4) * 2.4); z < Zb; z += 2.4) {
      const l1 = P(-0.28, yCeil, z);
      const l2 = P(0.28, yCeil, z + 0.7);
      poly(ctx, [[l1[0], l1[1]], [l2[0] - (l2[0] - l1[0]) * 0.0, l1[1]], [l2[0], l2[1]], [l1[0], l2[1]]], "rgba(255,248,210,0.9)");
    }
    // dado
    const d1 = P(-wallX, 0.62, near + 0.5);
    const d2 = P(-wallX, 0.62, Zb);
    line(ctx, d1[0], d1[1], d2[0], d2[1], "rgba(90,105,86,0.8)", 4);
    const d3 = P(wallX, 0.62, near + 0.5);
    const d4 = P(wallX, 0.62, Zb);
    line(ctx, d3[0], d3[1], d4[0], d4[1], "rgba(90,105,86,0.8)", 4);
    // doors on the left wall
    for (const z0 of [3.2, 5.6, 8.0]) {
      const a1 = P(-wallX, yFloor, z0);
      const a2 = P(-wallX, yFloor, z0 + 0.9);
      const a3 = P(-wallX, -0.62, z0 + 0.9);
      const a4 = P(-wallX, -0.62, z0);
      if (z0 > camZ + 0.8) poly(ctx, [a1, a2, a3, a4], "#8f6a49", "rgba(0,0,0,0.5)", 1.5);
    }
    // right wall board
    {
      const z0 = 3.5;
      const a1 = P(wallX, 0.3, z0);
      const a2 = P(wallX, 0.3, z0 + 1.3);
      const a3 = P(wallX, -0.45, z0 + 1.3);
      const a4 = P(wallX, -0.45, z0);
      if (z0 > camZ + 0.7) poly(ctx, [a1, a2, a3, a4], "#2f3b3a", "rgba(0,0,0,0.6)", 1.5);
    }
    // stairs glow at the far end
    const glow = ctx.createRadialGradient(vx, vy + 14, 0, vx, vy + 14, 80);
    glow.addColorStop(0, "rgba(255,225,150,0.75)");
    glow.addColorStop(1, "rgba(255,225,150,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(vx - 90, vy - 80, 180, 190);
    // fog toward the end
    const fog = ctx.createRadialGradient(vx, vy, 10, vx, vy, 420);
    fog.addColorStop(0, "rgba(200,185,215,0.32)");
    fog.addColorStop(1, "rgba(200,185,215,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // crease lines while flat
  if (p < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.setLineDash([8, 6]);
    for (const [a, b] of [[tl, bl], [tr, br], [tl, tr], [bl, br]] as const) line(ctx, a[0], a[1], b[0], b[1], "rgba(210,50,40,0.8)", 2);
    ctx.setLineDash([]);
    ctx.restore();
  }
  // flicker on one tube
  void t;
}

/** The back-turned silhouette used where a rigged profile figure would break perspective. */
export function backFigure(ctx: Ctx, x: number, y: number, h: number, ph: number, col = "#3b3547", recorder = false) {
  void col;
  drawBackFigure(ctx, x, y, h, ph, CAST.orrin, { recorder });
}

/** geometry of the digits on the occupancy board, shared by drawing and the pen-hand targets */
export function boardGeom(x: number, y: number, w: number, h: number) {
  const dw = w * 0.17;
  const dh = h * 0.42;
  return { dx0: x + w * 0.08, dw, dh, dy: y + h * 0.34, gap: w * 0.07 };
}

/** Occupancy board used in episode 1. */
export function occupancyBoard(ctx: Ctx, x: number, y: number, w: number, h: number, o: { strike: number; write: number; stamp: number }) {
  fillRR(ctx, x + 8, y + 10, w, h, 8, "rgba(10,5,20,0.3)");
  fillRR(ctx, x, y, w, h, 8, "#2b3836", "#161e1d", 3);
  fillRR(ctx, x + 10, y + 10, w - 20, h - 20, 4, "#33433f", "rgba(0,0,0,0.4)", 1.5);
  mono(ctx, "CALDER COURT · BLOCK 14", x + w / 2, y + h * 0.17, { size: h * 0.066, weight: 800, color: "#d6dccf", align: "center", spacing: 1 });
  mono(ctx, "OCCUPIED UNITS", x + w / 2, y + h * 0.28, { size: h * 0.052, color: "#a7b4a8", align: "center", spacing: 2 });
  const g = boardGeom(x, y, w, h);
  ["8", "1"].forEach((d, i) => {
    const dx = g.dx0 + i * (g.dw + g.gap * 0.5);
    fillRR(ctx, dx, g.dy, g.dw, g.dh, 4, "#141a19", "#000", 2);
    mono(ctx, d, dx + g.dw / 2, g.dy + g.dh * 0.8, { size: g.dh * 0.92, weight: 800, color: "#f0ead2", align: "center" });
    line(ctx, dx, g.dy + g.dh / 2, dx + g.dw, g.dy + g.dh / 2, "rgba(0,0,0,0.75)", 2);
  });
  const endX = g.dx0 + g.dw * 2 + g.gap * 0.5;
  if (o.strike > 0) {
    const p = clamp(o.strike);
    ctx.save();
    ctx.strokeStyle = C.red;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, h * 0.05);
    ctx.beginPath();
    ctx.moveTo(g.dx0 - 6, g.dy + g.dh * 0.92);
    ctx.lineTo(g.dx0 - 6 + (endX - g.dx0 + 12) * p, g.dy + g.dh * 0.92 - g.dh * 0.84 * p);
    ctx.stroke();
    ctx.restore();
  }
  if (o.write > 0) {
    const p = clamp(o.write);
    const wx = endX + g.gap;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx - 4, g.dy - 20, g.dw * 2.1 * p, g.dh + 40);
    ctx.clip();
    ctx.font = `800 ${g.dh * 0.95}px "Brush Script MT", "Segoe Script", cursive`;
    ctx.fillStyle = C.red;
    ctx.fillText("78", wx, g.dy + g.dh * 0.84);
    ctx.restore();
  }
  mono(ctx, "VARIANCE ±2 · BEYOND THAT: PERSON REQUIRED", x + w / 2, y + h * 0.93, { size: h * 0.04, color: "#8f9f93", align: "center" });
  circle(ctx, x + w - 22, y + 22, 5, C.green, "#0b3a22", 1.5);
  if (o.stamp > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(o.stamp * 3);
    const sc = 1 + (1 - clamp(o.stamp * 3)) * 0.6;
    ctx.translate(x + w * 0.52, y + h * 0.8);
    ctx.scale(sc, sc);
    ctx.rotate(-0.07);
    ctx.font = `800 ${h * 0.085}px "Courier New", monospace`;
    ctx.strokeStyle = C.redDk;
    ctx.lineWidth = 2;
    const tw = ctx.measureText("CORRECTED").width + 14;
    ctx.strokeRect(-tw / 2, -h * 0.07, tw, h * 0.1);
    ctx.fillStyle = C.redDk;
    ctx.textAlign = "center";
    ctx.fillText("CORRECTED", 0, 0);
    ctx.restore();
  }
}

/** A close-up hand holding a pen, entering from the lower left. Tip at (tx, ty). */
export function penHand(ctx: Ctx, tx: number, ty: number, s = 1, color = "#e6bd98", sleeve = "#c9bf9d") {
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(s, s);
  // forearm + cuff
  const ink = "rgba(30,22,40,0.75)";
  poly(ctx, [[-120, 70], [-90, 40], [-640, 520], [-760, 480]], sleeve, ink, 2.5);
  poly(ctx, [[-110, 74], [-84, 44], [-170, 120], [-196, 150]], "#f6f1e3", ink, 2);
  // hand
  ctx.beginPath();
  ctx.moveTo(-100, 68);
  ctx.bezierCurveTo(-120, 10, -70, -14, -34, 6);
  ctx.bezierCurveTo(-10, 18, -30, 56, -60, 80);
  ctx.bezierCurveTo(-80, 96, -100, 94, -100, 68);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // pen
  line(ctx, 0, 0, -86, 62, "#2f2b3a", 12);
  line(ctx, 0, 0, -26, 19, "#c5ccd4", 8);
  line(ctx, -2, -1, 4, -3, C.red, 5);
  // fingers over the pen
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(-44, 22, 38, 13, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-62, 52, 24, 11, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** LIVE LARGER poster: the display family in an impossibly spacious home. */
export function familyPoster(ctx: Ctx, x: number, y: number, w: number, h: number, t: number) {
  fillRR(ctx, x + 8, y + 10, w, h, 4, "rgba(10,5,20,0.28)");
  fillRR(ctx, x, y, w, h, 4, "#f7efe0", "#7a6a52", 4);
  const ix = x + 14;
  const iy = y + 14;
  const iw = w - 28;
  const ih = h * 0.72;
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, "#bfe0f0");
  g.addColorStop(1, "#f2ead0");
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  // vast room: huge windows, pale floor
  ctx.fillStyle = "#e9dfc2";
  ctx.fillRect(ix, iy + ih * 0.72, iw, ih * 0.28);
  for (let i = 0; i < 4; i++) {
    const wx = ix + 16 + i * (iw / 4);
    ctx.fillStyle = "#d6eef7";
    ctx.fillRect(wx, iy + 14, iw / 4 - 28, ih * 0.58);
    line(ctx, wx + (iw / 4 - 28) / 2, iy + 14, wx + (iw / 4 - 28) / 2, iy + 14 + ih * 0.58, "#fff", 3);
    line(ctx, wx, iy + 14 + ih * 0.3, wx + iw / 4 - 28, iy + 14 + ih * 0.3, "#fff", 3);
  }
  // floor rug & sofa
  ctx.fillStyle = "#e09a7c";
  ctx.beginPath();
  ctx.ellipse(ix + iw * 0.5, iy + ih * 0.86, iw * 0.32, ih * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  fillRR(ctx, ix + iw * 0.12, iy + ih * 0.58, iw * 0.3, ih * 0.16, 10, "#7da0a8", "rgba(0,0,0,0.3)", 1.5);
  // the display family — smooth, delighted, hollow
  const fam: [number, number, string, string][] = [
    [0.52, 0.5, "#e9a74a", "#f1c9a0"],
    [0.62, 0.5, "#6fa3b3", "#e7bd96"],
    [0.71, 0.58, "#e7788d", "#f0cfaa"],
    [0.8, 0.64, "#8fbf72", "#e9c7a4"],
  ];
  fam.forEach(([fx, fh, col, skin], i) => {
    const px = ix + iw * fx;
    const pb = iy + ih * 0.88;
    const hh = ih * (0.42 - i * 0.05);
    fillRR(ctx, px - hh * 0.14, pb - hh * 0.62, hh * 0.28, hh * 0.62, hh * 0.08, col);
    circle(ctx, px, pb - hh * 0.72, hh * 0.13, skin);
    // huge identical smiles
    ctx.strokeStyle = "#8b4a3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, pb - hh * 0.7, hh * 0.07, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    circle(ctx, px - hh * 0.04, pb - hh * 0.75, 1.8, "#3a2a2a");
    circle(ctx, px + hh * 0.04, pb - hh * 0.75, 1.8, "#3a2a2a");
    void fh;
  });
  flower(ctx, ix + iw * 0.18, iy + ih * 0.5, 8, "#d86a5a", "#f6dd7c");
  txt(ctx, "LIVE LARGER", x + w / 2, y + h * 0.9, { size: h * 0.075, weight: 800, align: "center", color: "#3a3052", spacing: 3 });
  txt(ctx, "Calder Court Residences · now leasing", x + w / 2, y + h * 0.96, { size: h * 0.034, align: "center", color: "#8a7a62" });
  void t;
}

export function sound(cues: SoundCue[]) {
  return cues.slice().sort((a, b) => a.t - b.t);
}

/**
 * Turn a horizontal slide into a real walk cycle: if the figure's world-x changes between x0 and x1 (over dt seconds)
 * its legs, hips and lean are replaced by a walk pose whose stride is locked to the ground speed (no foot sliding).
 * Hand targets set after this call still win, so characters can walk while holding things.
 */
export function applyWalk(pose: Pose, x0: number, x1: number, dt: number, h: number, facing: 1 | -1, amp = 1) {
  const vel = (x1 - x0) / dt;
  if (Math.abs(vel) < 14) return false;
  const mid = (x0 + x1) / 2;
  const w = poses.walk((facing * mid) / (4 * 0.13 * amp * h), amp);
  pose.hip = w.hip;
  pose.lean = w.lean * (vel * facing > 0 ? 1 : 0.4);
  pose.tilt = w.tilt;
  pose.footF = w.footF;
  pose.footB = w.footB;
  pose.handF = w.handF;
  pose.handB = w.handB;
  return true;
}
