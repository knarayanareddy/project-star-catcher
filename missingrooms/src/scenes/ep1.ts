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
  recorderLamp,
  rr,
  stamp,
  txt,
  lightPool,
} from "../engine/draw";
import { H, W, bump, clamp, easeInOut, easeOut, lerp, prog, smooth } from "../engine/util";
import type { FX } from "../engine/post";
import type { EpisodeSound, SoundCue } from "../engine/audio";
import {
  CREASE,
  EpisodeScene,
  HATCH_X,
  YF,
  backFigure,
  beatOf,
  boardGeom,
  camera,
  cueTimes,
  familyPoster,
  occupancyBoard,
  paperCorridor,
  penHand,
  planSheet,
  wallElevation,
  drawHatch,
} from "./common";

const FY = YF + 30; // feet line in elevation shots
const CT = [0, 1, 2, 3, 4].map((b) => cueTimes(0, b));

/* ---------- little helpers ---------- */

const hl =
  (x: number, h: number, f: number) =>
  (wx: number, wy: number): V2 => [((wx - x) / h) * f, (wy - FY) / h];

function headLocal(p: Pose): V2 {
  const sn = Math.sin(p.lean);
  const cs = Math.cos(p.lean);
  const sh: V2 = [p.hip[0] + sn * 0.3, p.hip[1] - cs * 0.3];
  const hs = p.lean + p.tilt;
  return [sh[0] + Math.sin(hs) * 0.118, sh[1] - Math.cos(hs) * 0.118];
}

function blend(a: Pose, b: Pose, k: number): Pose {
  const m = (p: V2, q: V2): V2 => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return {
    hip: m(a.hip, b.hip),
    lean: lerp(a.lean, b.lean, k),
    tilt: lerp(a.tilt, b.tilt, k),
    footB: m(a.footB, b.footB),
    footF: m(a.footF, b.footF),
    handB: m(a.handB, b.handB),
    handF: m(a.handF, b.handF),
    mouth: b.mouth,
    back: b.back,
  };
}

const orrin = (ctx: Ctx, x: number, h: number, f: 1 | -1, pose: Pose) => drawFigure(ctx, x, FY, h, f, CAST.orrin, pose);

function smallSheet(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fillRR(ctx, -w / 2, -h / 2, w, h, 2, "#f4efe0", "rgba(30,22,40,0.7)", 1.2);
  for (let i = 0; i < 5; i++) line(ctx, -w * 0.4, -h * 0.3 + i * h * 0.15, w * 0.35, -h * 0.3 + i * h * 0.15, "rgba(60,90,140,0.4)", 1);
  rr(ctx, -w * 0.3, -h * 0.1, w * 0.2, h * 0.2, 1);
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
}

function tube(ctx: Ctx, x: number, y: number, len: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fillRR(ctx, -len / 2, -9, len, 18, 8, "#9b7a4a", "rgba(30,22,40,0.8)", 1.5);
  fillRR(ctx, len / 2 - 14, -9, 14, 18, 6, "#2f2b3a");
  ctx.restore();
}

export function finger(ctx: Ctx, tx: number, ty: number, ang: number, len = 360, wd = 56, skin = "#e6bd98", cuff = "#c9bf9d") {
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(ang);
  const ink = "rgba(30,22,40,0.75)";
  rr(ctx, 0, -wd / 2, len, wd, wd / 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  fillRR(ctx, 4, -wd * 0.36, wd * 0.5, wd * 0.62, wd * 0.2, "#f2d6bd", ink, 1.5);
  // cuff
  poly(ctx, [[len - 40, -wd * 0.66], [len + 700, -wd * 1.0], [len + 700, wd * 1.0], [len - 40, wd * 0.66]], cuff, ink, 2.5);
  line(ctx, len + 40, -wd * 0.7, len + 40, wd * 0.7, "rgba(30,22,40,0.35)", 2);
  ctx.restore();
}

/** the wall furniture drawn in world coordinates for the entry-corridor shots */
const POSTER = { x: 92, y: 205, w: 170, h: 250 };
const BOARD = { x: 505, y: 335, w: 150, h: 104 };

function corridorProps(ctx: Ctx, sx: number, t: number, st: { strike: number; write: number; stamp: number }) {
  familyPoster(ctx, POSTER.x - sx, POSTER.y, POSTER.w, POSTER.h, t);
  occupancyBoard(ctx, BOARD.x - sx, BOARD.y, BOARD.w, BOARD.h, st);
}

function walkPose(worldX: number, h: number, amp = 1): Pose {
  return poses.walk(worldX / (4 * 0.13 * amp * h), amp);
}

/* ---------- BEAT 1 ---------- */

function beat1(ctx: Ctx, lt: number, fx: FX) {
  const ct = CT[0];
  void ct;
  if (lt < 6.6) {
    const p = prog(lt, 0.4, 4.6);
    const camZ = prog(lt, 0.4, 6.6) * 0.8;
    paperCorridor(ctx, p, camZ, lt);
    if (lt > 4.7) {
      const z = 3.4 + (lt - 4.7) * 0.95;
      const s = 640 / (z - camZ);
      const a = clamp((lt - 4.7) / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      backFigure(ctx, 640 + 0.12 * s, 318 + 1.45 * s, 1.84 * s, (lt - 4.7) * 0.9);
      ctx.restore();
    }
    // a shimmering tube above
    fx.tint = [255, 240, 210, 0.0];
    return;
  }
  const sx = 0;
  const st0 = { strike: 0, write: 0, stamp: 0 };
  if (lt < 9.6) {
    wallElevation(ctx, sx, { t: lt, showStairs: false });
    corridorProps(ctx, sx, lt, st0);
    // Orrin steps in and waits against the wall
    const ox = lerp(40, 330, easeOut(prog(lt, 6.6, 8.4)));
    const moving = lt < 8.4;
    const h = 330;
    const pose = moving ? walkPose(ox, h, 0.9) : poses.stand(Math.sin(lt * 1.7));
    const L = hl(ox, h, 1);
    pose.handF = L(ox + 38, FY - h * 0.55);
    const j = orrin(ctx, ox, h, 1, pose);
    clipboard(ctx, j.handF[0] + 12, j.handF[1] - 4, 44, 58, 0.15);
    // neighbours turn side-on to pass
    const neighbours: [string, number, number][] = [
      ["rill", 1020, 0.84],
      ["neighbor", 1180, 0.95],
    ];
    neighbours.forEach(([who, x0, k], i) => {
      const x = x0 - 330 * (lt - 6.6);
      const hh = h * k;
      const squeeze = 0.62;
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(squeeze, 1);
      const pp = walkPose(-x / squeeze, hh, 0.7);
      pp.lean = 0.12;
      const jj = drawFigure(ctx, 0, FY + 6 + i * 4, hh, -1, CAST[who], pp);
      ctx.restore();
      const hx = x + (jj.handB[0] - 0) * squeeze;
      if (who === "rill") tube(ctx, hx - 20, jj.handB[1] + 40, 120, -1.1);
      else {
        fillRR(ctx, hx - 26, jj.handF[1] - 4, 44, 60, 5, "#c9a56e", "rgba(30,22,40,0.8)", 1.5);
        line(ctx, hx - 20, jj.handF[1] - 10, hx - 10, jj.handF[1] + 2, "#6a8e3a", 5);
      }
    });
    return;
  }
  if (lt < 12.2) {
    // poster close-up: the display family; Orrin looks up
    const z = lerp(2.3, 2.5, prog(lt, 9.6, 12.2));
    camera(ctx, 330, 330, z, () => {
      wallElevation(ctx, sx, { t: lt, showStairs: false });
      corridorProps(ctx, sx, lt, st0);
      const h = 330;
      const ox = 345;
      const pose = poses.stand(Math.sin(lt * 1.7));
      pose.tilt = -0.14;
      const L = hl(ox, h, -1);
      pose.handF = L(ox - 12, FY - h * 0.5);
      const j = orrin(ctx, ox, h, -1, pose);
      clipboard(ctx, j.handF[0] - 4, j.handF[1], 42, 56, -0.1);
    });
    return;
  }
  if (lt < 22.2) {
    // board close-up: red strike, 78, stamp
    const st = { strike: prog(lt, 13.0, 14.4), write: prog(lt, 14.9, 17.3), stamp: prog(lt, 20.6, 21.4) };
    const z = lerp(3.5, 3.75, prog(lt, 12.2, 22.2));
    camera(ctx, BOARD.x + BOARD.w * 0.52, BOARD.y + BOARD.h * 0.5, z, () => {
      wallElevation(ctx, sx, { t: lt, showStairs: false });
      corridorProps(ctx, sx, lt, st);
    });
    // Orrin's pen hand, in screen space
    const g = boardGeom(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
    const toS = (wx: number, wy: number): V2 => [W / 2 + (wx - (BOARD.x + BOARD.w * 0.52)) * z, H / 2 + (wy - (BOARD.y + BOARD.h * 0.5)) * z];
    const endX = g.dx0 + g.dw * 2 + g.gap * 0.5;
    let target: V2;
    if (lt < 13.0) target = toS(g.dx0 - 40, g.dy + g.dh * 1.4);
    else if (lt < 14.7) {
      const p = prog(lt, 13.0, 14.4);
      target = toS(g.dx0 - 6 + (endX - g.dx0 + 12) * p, g.dy + g.dh * 0.92 - g.dh * 0.84 * p);
    } else if (lt < 17.5) {
      const p = prog(lt, 14.9, 17.3);
      target = toS(endX + g.gap + g.dw * 2 * p, g.dy + g.dh * (0.6 + 0.2 * Math.sin(p * 11)));
    } else target = toS(endX + g.gap * 1.2 + g.dw * 2.2, g.dy + g.dh * 1.5);
    // lift the pen at rest
    const lift = lt < 13 || lt > 17.5 ? 28 : 0;
    ctx.save();
    ctx.globalAlpha = lt < 12.8 ? prog(lt, 12.2, 12.8) : lt > 20.6 ? 1 - prog(lt, 20.6, 21.6) : 1;
    penHand(ctx, target[0] - lift, target[1] + lift, 1.15);
    ctx.restore();
    // stamp shudder
    if (lt > 20.6 && lt < 20.9) fx.shake = 5 * (1 - (lt - 20.6) / 0.3);
    return;
  }
  // medium: Orrin with the Survey Recorder, name lower-third
  const full = { strike: 1, write: 1, stamp: 1 };
  const walkT = prog(lt, 40.0, 45.0);
  const ox = 330 + 160 * walkT * walkT * 1.6;
  const zz = lerp(1.95, 1.0, easeInOut(prog(lt, 38.5, 45)));
  const cxm = lerp(380, 640, easeInOut(prog(lt, 38.5, 45)));
  camera(ctx, cxm, 420, zz, () => {
    wallElevation(ctx, sx, { t: lt, showStairs: false });
    corridorProps(ctx, sx, lt, full);
    const h = 330;
    const L = hl(ox, h, 1);
    const moving = lt >= 40;
    const pose = moving ? walkPose(ox, h, 0.9) : poses.stand(Math.sin(lt * 1.7));
    if (!moving) {
      pose.handF = L(ox + 34, FY - h * 0.68);
      pose.handB = L(ox + 4, FY - h * 0.45);
      // looks at the board a moment too long
      pose.tilt = lt > 31 ? 0.05 : 0;
    }
    const j = orrin(ctx, ox, h, 1, pose);
    if (!moving) {
      fillRR(ctx, j.handF[0] - 6, j.handF[1] - 22, 15, 34, 3, "#2b2733", "rgba(0,0,0,0.8)", 1.2);
      recorderLamp(ctx, j.handF[0] + 1.5, j.handF[1] - 15, lt, true, 2.6);
      clipboard(ctx, j.handB[0] + 4, j.handB[1] + 6, 40, 52, 0.25);
    } else clipboard(ctx, j.handF[0] + 10, j.handF[1] - 2, 40, 52, 0.15);
  });
  // lower third
  const a = lt < 25.2 ? prog(lt, 24.7, 25.3) : 1 - prog(lt, 31.6, 32.4);
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    const lx = 64;
    const ly = 560;
    fillRR(ctx, lx, ly, 560, 86, 4, "rgba(24,14,34,0.82)");
    ctx.fillStyle = C.red;
    ctx.fillRect(lx, ly, 6, 86);
    txt(ctx, "ORRIN VOSS", lx + 26, ly + 38, { size: 32, weight: 700, color: C.creamLt, spacing: 2 });
    mono(ctx, "DISTRICT SURVEYOR · GRADE 4 · 27 YEARS", lx + 26, ly + 66, { size: 15, color: "#c9bfa8", spacing: 1 });
    ctx.restore();
  }
}

/* ---------- BEAT 2 ---------- */

function beat2(ctx: Ctx, lt: number, fx: FX) {
  const posFn = (l: number) => 280 + 1040 * easeInOut(prog(l, 0, 11));
  if (lt < 11) {
    const pos = posFn(lt);
    const sx = pos - 430;
    wallElevation(ctx, sx, { t: lt });
    // hand-drawn tally above each door as he counts
    [1150 + 75, 700 + 75, 330 + 75].forEach((dx, i) => {
      if (pos > dx) {
        const n = 3 - i;
        const a = clamp((pos - dx) / 40);
        ctx.save();
        ctx.globalAlpha = a * 0.95;
        ctx.font = `800 54px "Brush Script MT","Segoe Script",cursive`;
        ctx.fillStyle = C.red;
        ctx.textAlign = "center";
        ctx.fillText(String(n), dx - sx, 150);
        ctx.restore();
      }
    });
    const h = 330;
    const vel = (posFn(lt + 0.05) - posFn(lt - 0.05)) / 0.1;
    const walking = vel > 8;
    const pose = walking ? walkPose(pos, h, 0.72) : poses.stand(Math.sin(lt * 1.7));
    const L = hl(430, h, 1);
    pose.handF = L(430 + 38, FY - h * 0.58);
    pose.handB = L(430 + 22, FY - h * 0.5);
    pose.tilt = walking ? -0.04 : 0;
    const j = orrin(ctx, 430, h, 1, pose);
    smallSheet(ctx, (j.handF[0] + j.handB[0]) / 2 + 26, j.handF[1] - 4, 72, 52, -0.1);
    // finger counting
    return;
  }
  if (lt < 16.1) {
    // macro: a flower bisected by the crease, the brass plate cut in two
    const sx2 = 1000;
    const z = lerp(3.0, 3.5, prog(lt, 11, 16.1));
    camera(ctx, CREASE - sx2, 380, z, () => wallElevation(ctx, sx2, { t: lt, pulse: 0.5 }));
    fx.distort = 0.22 * smooth(prog(lt, 11, 12.5));
    fx.fx = W / 2;
    fx.fy = H / 2;
    fx.fr = 260;
    fx.tint = [90, 50, 140, 0.1];
    // his fingertip traces the hairline
    const fa = smooth(prog(lt, 12.6, 14));
    const ty = lerp(260, 560, prog(lt, 13.2, 15.6));
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha = fa;
      finger(ctx, W / 2 - 30, ty, Math.PI * 0.82, 330, 62);
      ctx.restore();
    }
    return;
  }
  if (lt < 21.0) {
    // plan insert: REV C → REV D, ghost of 2-07, his approval
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#241a30");
    g.addColorStop(1, "#171020");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) line(ctx, 0, i * 80 + 20, W, i * 80 + 20, "rgba(255,255,255,0.025)", 2);
    lightPool(ctx, 640, 180, 700, 0.18, "255,235,200");
    const gap = lt < 16.9 ? 1 : 1 - easeInOut(prog(lt, 16.9, 18.7));
    const rev = gap > 0.5 ? "REV C" : "REV D";
    ctx.save();
    ctx.translate(640, 370);
    ctx.rotate(-0.025);
    planSheet(ctx, -450, -265, 900, 530, { gap, rev, ghost: prog(lt, 18.7, 19.5), stamp: prog(lt, 19.9, 20.6) });
    ctx.restore();
    if (lt > 19.9 && lt < 20.2) fx.shake = 4;
    // a finger points at the gap
    const fa = smooth(prog(lt, 16.2, 17.2)) * (1 - smooth(prog(lt, 20.3, 20.9)));
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha = fa;
      finger(ctx, 706, 400, Math.PI * 1.0 - 0.2 + -0.55, 340, 54);
      ctx.restore();
    }
    return;
  }
  // standing in the useful space
  const sx = 1010;
  const kz = lerp(1.15, 1.6, easeInOut(prog(lt, 21, 45)));
  camera(ctx, lerp(560, 600, prog(lt, 21, 45)), 420, kz, () => {
    wallElevation(ctx, sx, { t: lt, pulse: 0.35 });
    ctx.save();
    ctx.translate(-sx, 0);
    const h = 360;
    const x0 = 1330;
    let ox = x0;
    let f: 1 | -1 = 1;
    let pose = poses.stand(Math.sin(lt * 1.7));
    const L0 = hl(x0, h, 1);
    if (lt < 27.4) {
      pose.handF = L0(x0 + 44, FY - h * 0.6);
      pose.handB = L0(x0 + 24, FY - h * 0.5);
    } else if (lt < 30.6) {
      f = -1; // checks behind himself
      const L = hl(x0, h, -1);
      pose.handF = L(x0 - 44, FY - h * 0.6);
      pose.handB = L(x0 - 24, FY - h * 0.5);
      pose.tilt = -0.05;
    } else if (lt < 36) {
      // the plan again
      const L = hl(x0, h, 1);
      pose.handF = L(x0 + 40, FY - h * 0.76);
      pose.handB = L(x0 + 20, FY - h * 0.7);
      pose.tilt = 0.08;
    } else {
      const k = easeInOut(prog(lt, 36, 41));
      ox = lerp(x0, 1424, k);
      const mv = prog(lt, 36, 41) > 0 && prog(lt, 36, 41) < 1;
      pose = mv ? walkPose(ox, h, 0.6) : poses.stand(Math.sin(lt * 1.7));
      const L = hl(ox, h, 1);
      pose.handF = L(ox + 40, FY - h * 0.58);
      pose.handB = L(ox + 20, FY - h * 0.5);
      if (!mv) pose.tilt = 0.06;
    }
    const j = orrin(ctx, ox, h, f, pose);
    if (lt >= 30.6 && lt < 36) smallSheet(ctx, (j.handF[0] + j.handB[0]) / 2 + 26, j.handF[1] - 12, 86, 62, -0.1);
    else if (lt >= 36) smallSheet(ctx, j.handF[0] + 14, j.handF[1] + 8, 56, 40, 0.5);
    else clipboard(ctx, j.handF[0] + 12 * f, j.handF[1] - 2, 42, 56, 0.15 * f);
    // his shadow stretched down the empty corridor when he looks back
    if (lt >= 27.4 && lt < 30.6) {
      ctx.fillStyle = "rgba(20,10,30,0.18)";
      ctx.beginPath();
      ctx.ellipse(x0 - 260, FY + 26, 260, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  fx.distort = 0.1 * smooth(prog(lt, 36, 42));
  fx.fx = 640;
  fx.fy = 360;
}

/* ---------- BEAT 3 ---------- */

function beat3(ctx: Ctx, lt: number, fx: FX) {
  const pumpWave = (t: number) => Math.pow(Math.max(0, Math.sin((Math.PI * 2 * t) / 1.2)), 1.5);
  if (lt < 9) {
    const sx = 1010;
    camera(ctx, 560, 410, 1.2, () => {
      wallElevation(ctx, sx, { t: lt, pulse: 0.3 + 0.4 * pumpWave(lt) });
      ctx.save();
    ctx.translate(-sx, 0);
      const h = 360;
      const x0 = 1252;
      const pose = poses.stand(Math.sin(lt * 1.7));
      pose.lean = 0.05;
      const calls = [1.0, 3.7, 6.3];
      const callK = Math.max(...calls.map((c) => bump(lt, c, c + 1.3)));
      const head = headLocal(pose);
      const L = hl(x0, h, 1);
      // cupped hand to mouth
      pose.handF = [head[0] + 0.075, head[1] + 0.03 - callK * 0.01];
      pose.handB = [0.0, -0.22];
      pose.mouth = clamp(callK * 1.4);
      void L;
      const j = orrin(ctx, x0, h, 1, pose);
      // sound rings stop dead at the crease
      const mx = j.head[0] + 34;
      const my = j.head[1] + 12;
      const cxs = CREASE;
      for (const c of calls) {
        for (let k = 0; k < 3; k++) {
          const r = (lt - c - k * 0.2) * 300;
          if (r <= 6) continue;
          const dist = cxs - mx;
          if (r > dist + 14) continue;
          const a = (1 - clamp(r / dist)) * 0.8 + 0.1;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, cxs, H);
          ctx.clip();
          ctx.strokeStyle = `rgba(255,248,230,${a})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mx, my, r, -0.75, 0.75);
          ctx.stroke();
          ctx.restore();
        }
        // the ring dies on the crease: a short red flare, never an echo
        const arrive = c + (cxs - mx) / 300;
        const fl = bump(lt, arrive, arrive + 0.4);
        if (fl > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(210,58,42,${fl})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cxs - 6, my - 70 * fl);
          ctx.lineTo(cxs - 6, my + 70 * fl);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    });
    return;
  }
  if (lt < 12.5) {
    const sx = 1180;
    camera(ctx, 440, 440, 1.5, () => {
      const open = prog(lt, 9.4, 11.4);
      wallElevation(ctx, sx, { t: lt, hatch: open, pulse: 0.5 + 0.5 * pumpWave(lt) });
      ctx.save();
    ctx.translate(-sx, 0);
      const h = 360;
      const x0 = 1306;
      const pose = poses.stand(Math.sin(lt * 1.7));
      const L = hl(x0, h, 1);
      const hx = HATCH_X - sx + sx; // world
      pose.handF = L(hx - 8 + open * 10, FY - h * 0.63);
      pose.handB = L(x0 + 10, FY - h * 0.4);
      pose.lean = 0.09;
      orrin(ctx, x0, h, 1, pose);
      ctx.restore();
    });
    return;
  }
  if (lt < 24) {
    // reverse of the hatch door: the notice
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1a1223");
    g.addColorStop(1, "#2a1d3a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const zoom = lerp(1, 1.12, prog(lt, 12.5, 24));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    const px = 220;
    const py = 90;
    const pw = 840;
    const ph = 540;
    fillRR(ctx, px + 12, py + 16, pw, ph, 6, "rgba(0,0,0,0.4)");
    fillRR(ctx, px, py, pw, ph, 6, "#d9d4c2", "#3d3a48", 4);
    for (let i = 0; i < 14; i++) for (const sxn of [0.04, 0.96]) circle(ctx, px + pw * sxn, py + 20 + i * 38, 5, "#9ca1a8", "rgba(0,0,0,0.5)", 1);
    // stencil
    const s1 = prog(lt, 12.8, 13.4);
    ctx.save();
    ctx.globalAlpha = s1;
    txt(ctx, "TEMPORARY", px + pw / 2, py + 150, { size: 108, weight: 900, font: "Impact, Haettenschweiler, 'Arial Black', sans-serif", align: "center", color: "#2a2430", spacing: 8 });
    txt(ctx, "STORAGE", px + pw / 2, py + 262, { size: 108, weight: 900, font: "Impact, Haettenschweiler, 'Arial Black', sans-serif", align: "center", color: "#2a2430", spacing: 8 });
    ctx.restore();
    line(ctx, px + 50, py + 296, px + pw - 50, py + 296, "#2a2430", 4);
    mono(ctx, "STORAGE CONNECTION", px + 70, py + 350, { size: 30, weight: 700, color: "#2a2430" });
    mono(ctx, "PURGED  06:00", px + 70, py + 396, { size: 44, weight: 900, color: "#2a2430" });
    mono(ctx, "REF  HD-FLD-0412   ·   DO NOT OBSTRUCT", px + 70, py + 450, { size: 22, color: "#4a4452" });
    mono(ctx, "CONTENTS OF STORED MODULES ARE NOT THE CONCERN OF THIS DEPARTMENT.", px + 70, py + 486, { size: 15, color: "#6a6474" });
    mono(ctx, "Form F-17 · Housing Dept. Folding Authority", px + 70, py + 512, { size: 14, color: "#6a6474" });
    // Orrin circles 06:00 as the narration says it
    const cc = prog(lt, 19.9, 21.2);
    corrCircle(ctx, px + 360, py + 384, 108, cc, 6);
    // sideways dust
    ctx.restore();
    // dust sideways, drifting toward the hole beyond
    for (let i = 0; i < 40; i++) {
      const sp = 20 + ((i * 37) % 30);
      const xx = ((i * 211 + lt * sp) % 1300) - 10;
      const yy = 60 + ((i * 97) % 600) + Math.sin(lt + i) * 6;
      ctx.fillStyle = "rgba(255,252,240,0.55)";
      ctx.fillRect(xx, yy, 3, 1.3);
    }
    // his hand on the door's edge, with the lamp on his wrist (recorder)
    ctx.save();
    ctx.translate(0, 0);
    finger(ctx, px + 46, py + 330, Math.PI, 220, 66);
    ctx.restore();
    return;
  }
  if (lt < 36) {
    // macro: a screw hole breathing, tissue strip as the pump cycles
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#555d68");
    g.addColorStop(1, "#7a8390");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) line(ctx, 0, i * 13 + 4, W, i * 13 + 4 + Math.sin(i) * 3, "rgba(255,255,255,0.05)", 1.5);
    const hx = 800;
    const hy = 370;
    const R = 78;
    // countersink
    circle(ctx, hx, hy, R + 26, "#6a727e", "rgba(0,0,0,0.5)", 3);
    circle(ctx, hx, hy, R + 10, "#4f565f", "rgba(0,0,0,0.35)", 2);
    const hg = ctx.createRadialGradient(hx, hy, 6, hx, hy, R);
    hg.addColorStop(0, "#0c0714");
    hg.addColorStop(0.75, "#1c0f2c");
    hg.addColorStop(1, "#3a2458");
    circle(ctx, hx, hy, R, undefined);
    ctx.beginPath();
    ctx.arc(hx, hy, R, 0, Math.PI * 2);
    ctx.fillStyle = hg;
    ctx.fill();
    // the pump's pulse tints the hole
    const w = pumpWave(lt);
    ctx.fillStyle = `rgba(150,110,230,${0.18 * w})`;
    ctx.beginPath();
    ctx.arc(hx, hy, R, 0, Math.PI * 2);
    ctx.fill();
    // tissue strip taped above the hole
    const ang = -0.1 - 1.15 * w - 0.12 * Math.sin(lt * 30) * w;
    ctx.save();
    ctx.translate(hx - 20, hy - R - 40);
    fillRR(ctx, -26, -14, 52, 22, 3, "#d9cf9f", "rgba(0,0,0,0.4)", 1.5);
    ctx.rotate(Math.PI / 2 + ang);
    ctx.beginPath();
    ctx.moveTo(0, -17);
    const len = 230;
    for (let i = 0; i <= 10; i++) ctx.lineTo((len * i) / 10, -17 + Math.sin(lt * 18 + i) * 4 * w);
    for (let i = 10; i >= 0; i--) ctx.lineTo((len * i) / 10, 17 + Math.sin(lt * 18 + i + 1) * 4 * w);
    ctx.closePath();
    ctx.fillStyle = "rgba(252,250,244,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(60,50,70,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // dust drifts sideways toward the hole, then is pushed away on the exhale
    for (let i = 0; i < 70; i++) {
      const r = (i * 53) % 100;
      const yy = hy - 200 + ((i * 91) % 400);
      const dir = Math.sin((Math.PI * 2 * lt) / 1.2) > 0 ? 1 : -1;
      const xx = hx - 480 + (((i * 173) % 900) + lt * 60 * dir * (0.3 + r / 100) + 9000) % 900;
      ctx.fillStyle = `rgba(255,252,240,${0.35 + r / 250})`;
      ctx.fillRect(xx, yy + Math.sin(lt * 2 + i) * 4, 4 + r / 40, 1.6);
    }
    fx.distort = 0.18;
    fx.fx = hx;
    fx.fy = hy;
    fx.fr = 190;
    fx.tint = [90, 50, 140, 0.1];
    return;
  }
  // his cheek by the hole: the air touches his face
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2a2232");
  g.addColorStop(1, "#4a4358");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6a727e";
  ctx.fillRect(820, 0, 460, H);
  line(ctx, 820, 0, 820, H, "rgba(0,0,0,0.5)", 4);
  const hx = 900;
  const hy = 360;
  circle(ctx, hx, hy, 42, "#0d0716", "rgba(0,0,0,0.6)", 4);
  const k = prog(lt, 36, 45);
  const pose = poses.stand(0);
  pose.lean = 0.07;
  pose.tilt = 0.02;
  const hh = 2300;
  const head = headLocal(pose);
  const fxp = 560 + k * 24;
  const fig = drawFigure(ctx, fxp - head[0] * hh, 380 + 0.0 + -head[1] * hh, hh, 1, CAST.orrin, pose, false);
  void fig;
  // air from the hole touching his face
  const w = pumpWave(lt);
  ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.35 * w})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const y0 = hy - 70 + i * 28;
    ctx.moveTo(hx - 40, y0);
    for (let x = 0; x < 260; x += 20) ctx.lineTo(hx - 40 - x, y0 + Math.sin(x * 0.05 + lt * 6 + i) * 8 * (0.4 + w));
    ctx.stroke();
  }
  // glint across his lens
  const gl = prog(lt, 41, 43.5);
  if (gl > 0 && gl < 1) {
    ctx.save();
    ctx.globalAlpha = Math.sin(gl * Math.PI) * 0.8;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(fxp + 0.0 + 20 + gl * 16, 360 - 12, 6, 34, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  fx.vignette = 0.75;
}

/* ---------- BEAT 4 ---------- */

function beat4(ctx: Ctx, lt: number, fx: FX) {
  if (lt < 9.5) {
    const sx = 1010;
    camera(ctx, 560, 420, 1.35, () => {
      wallElevation(ctx, sx, { t: lt, pulse: 0.35 });
      ctx.save();
    ctx.translate(-sx, 0);
      const h = 360;
      const x0 = 1260;
      const pose = poses.stand(Math.sin(lt * 1.7));
      pose.lean = 0.06;
      const L = hl(x0, h, 1);
      const hxw = x0 + 84;
      const hyw = FY - h * 0.6;
      pose.handF = L(hxw, hyw);
      pose.handB = L(x0 + 10, FY - h * 0.42);
      orrin(ctx, x0, h, 1, pose);
      // steel survey tape: blade runs to the crease and catches
      const ext = easeOut(prog(lt, 0.8, 3.0)) * (1 - easeInOut(prog(lt, 8.0, 8.9)));
      const tipX = hxw + 14 + (CREASE - 3 - (hxw + 14)) * ext;
      const contact = lt > 3.0 && lt < 8.0 ? 1 : 0;
      const push = lt > 5.0 && lt < 6.8 ? Math.sin(prog(lt, 5, 6.8) * Math.PI) : 0;
      const chatter = (lt > 3.0 && lt < 4.2 ? Math.exp(-(lt - 3.0) * 2.4) : 0) + (lt > 5.2 && lt < 6.4 ? Math.exp(-(lt - 5.2) * 3) * 0.7 : 0);
      // case
      fillRR(ctx, hxw - 8, hyw - 18, 38, 34, 8, "#e8bd2e", "rgba(30,22,40,0.85)", 2);
      circle(ctx, hxw + 11, hyw - 1, 7, "#5b626e");
      // blade
      const my = hyw - 8;
      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const x = lerp(hxw + 30, tipX, f);
        const y = my + Math.sin(lt * 80 + f * 8) * 5 * chatter * f - push * 30 * Math.sin(f * Math.PI) * contact;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#b7c0cb";
      ctx.lineWidth = 8;
      ctx.lineCap = "butt";
      ctx.stroke();
      ctx.strokeStyle = "rgba(30,22,40,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // hook bends against the hairline
      if (ext > 0.02) {
        const tipY = my;
        ctx.save();
        ctx.strokeStyle = "#8f98a4";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY - 3);
        ctx.lineTo(tipX + 1, tipY + 16);
        ctx.stroke();
        ctx.restore();
      }
      if (chatter > 0.1) {
        ctx.save();
        ctx.strokeStyle = `rgba(210,58,42,${chatter})`;
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) line(ctx, CREASE + 4, my - 34 + i * 34, CREASE + 4 + 20, my - 34 + i * 34 + i * 12, `rgba(210,58,42,${chatter})`, 3);
        ctx.restore();
      }
      ctx.restore();
    });
    return;
  }
  if (lt < 13.8) {
    // inside pocket: the cloth tape comes out
    ctx.fillStyle = "#b8ae8f";
    ctx.fillRect(0, 0, W, H);
    // jacket cloth weave
    for (let i = 0; i < 90; i++) line(ctx, 0, i * 9, W, i * 9 + 6, "rgba(0,0,0,0.045)", 2);
    // shirt, tie
    poly(ctx, [[0, 0], [430, 0], [200, 420], [0, 520]], "#f1ebda", "rgba(30,22,40,0.6)", 3);
    poly(ctx, [[150, 0], [260, 0], [230, 520], [160, 560]], C.redDk, "rgba(30,22,40,0.6)", 3);
    // lapel
    poly(ctx, [[300, 0], [560, 0], [330, 520], [150, 700], [120, 720], [0, 720], [0, 520], [200, 420]], "#a99f80", "rgba(30,22,40,0.7)", 3);
    // inner pocket slit
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(560, 360);
    ctx.quadraticCurveTo(740, 392, 940, 350);
    ctx.lineTo(940, 420);
    ctx.quadraticCurveTo(740, 450, 560, 420);
    ctx.closePath();
    ctx.fillStyle = "#1d1619";
    ctx.fill();
    ctx.strokeStyle = "rgba(30,22,40,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    // tape unrolls out of the pocket
    const out = easeOut(prog(lt, 10.4, 12.6));
    const tx2 = 700 + out * 520;
    const ty2 = 380 - out * 120;
    if (out > 0.02) {
      clothTape(ctx, 700, 392, tx2, ty2, { width: 54, sag: 24, showFirstInch: true });
    }
    // hand pinching the tape end
    finger(ctx, tx2 + 40, ty2 + 8, Math.PI + 0.35 + 0.0, 300, 50);
    return;
  }
  if (lt < 27.7) {
    // macro of the cloth tape: first inch, yellow thread
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#32243f");
    g.addColorStop(1, "#1d1428");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    lightPool(ctx, 520, 280, 760, 0.2, "255,236,190");
    const dx = lerp(0, -40, prog(lt, 13.8, 27.7));
    ctx.save();
    ctx.translate(dx, 0);
    clothTape(ctx, 90, 360, 1500, 360, { width: 170, sag: 0, showFirstInch: true });
    // stitched word near the middle of the tape
    ctx.save();
    ctx.font = `italic 700 38px "Brush Script MT","Segoe Script",cursive`;
    ctx.fillStyle = C.yellow;
    ctx.fillText("room", 820, 430);
    ctx.setLineDash([8, 6]);
    line(ctx, 820, 442, 900, 442, C.yellow, 3, "butt");
    ctx.restore();
    // the 1 circled in red long ago
    corrCircle(ctx, 346, 372, 54, prog(lt, 15.0, 16.2), 5);
    ctx.restore();
    // "+1" correction note
    const na = prog(lt, 17.0, 18.0) * (1 - prog(lt, 26.6, 27.7));
    if (na > 0) {
      ctx.save();
      ctx.globalAlpha = na;
      ctx.font = `700 54px "Brush Script MT","Segoe Script",cursive`;
      ctx.fillStyle = C.red;
      ctx.fillText("first inch: missing", 130, 188);
      ctx.fillText("add 1 in.", 220, 242);
      corrLine(ctx, 214, 262, 200 + dx, 310, na, 4);
      ctx.restore();
    }
    // his thumb rolls across the repair
    const th = prog(lt, 21.8, 26.2);
    if (th > 0) {
      const tx = lerp(1000, 230, easeInOut(th)) + dx;
      ctx.save();
      ctx.globalAlpha = smooth(prog(lt, 21.8, 22.6)) * (1 - smooth(prog(lt, 26.2, 27)));
      finger(ctx, tx + 100, 330 + 120 + Math.sin(th * 6) * 4, Math.PI * 1.02 + 0.5, 300, 78);
      ctx.restore();
    }
    return;
  }
  // the tape's edge accepted by the seam
  {
    const sx = 1000;
    const z = 3.4;
    camera(ctx, CREASE - sx, 400, z, () => wallElevation(ctx, sx, { t: lt, pulse: 0.8 }));
    fx.distort = 0.26;
    fx.fx = W / 2;
    fx.fy = 400;
    fx.fr = 220;
    fx.tint = [90, 50, 140, 0.12];
    const ent = easeInOut(prog(lt, 31.8, 40));
    const y = 420;
    // hairline widens around the tape
    ctx.save();
    const gw = 4 + 12 * ent;
    ctx.fillStyle = "#07030d";
    poly(ctx, [[W / 2, y - 26], [W / 2 + gw, y - 20], [W / 2 + gw, y + 20], [W / 2, y + 26]], "#07030d");
    ctx.restore();
    const tipX = lerp(520, 640 + 80, ent);
    // outside the seam
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W / 2, H);
    ctx.clip();
    clothTape(ctx, -300, y, tipX, y, { width: 52, sag: 18 * (1 - ent), showFirstInch: false, scroll: 0 });
    // the yellow repair thread glints at the lip
    ctx.restore();
    // beyond the seam the tape is compressed, narrow and violet-lit
    if (tipX > W / 2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(W / 2, 0, W / 2, H);
      ctx.clip();
      ctx.translate(W / 2, 0);
      ctx.scale(0.28, 1);
      ctx.translate(-W / 2, 0);
      clothTape(ctx, W / 2 - 40, y, tipX + 0, y, { width: 52, showFirstInch: true });
      ctx.restore();
      ctx.fillStyle = "rgba(90,50,140,0.35)";
      ctx.fillRect(W / 2, y - 26, 80, 52);
    }
    // fingers pinch the tape
    const fa = 1;
    ctx.save();
    ctx.globalAlpha = fa;
    finger(ctx, 300 + ent * 130, y + 50 + 10, -0.2 - 0.0 + Math.PI, 320, 54);
    ctx.restore();
  }
}

/* ---------- BEAT 5 ---------- */

const TUGS = [4.9, 5.95, 7.0];

function tugEnv(lt: number) {
  let e = 0;
  for (const t of TUGS) if (lt >= t) e = Math.max(e, Math.exp(-(lt - t) * 7));
  return e;
}

function beat5(ctx: Ctx, lt: number, fx: FX) {
  const ct = CT[4];
  if (lt >= 22.9 && lt < 34) {
    recorderInsert(ctx, lt, ct);
    return;
  }
  const sx = 1010;
  const entryXs = CREASE - sx;
  const entryX = CREASE;
  const entryY = 462;
  const e = tugEnv(lt);
  const tugged = TUGS.filter((t) => lt >= t).length;
  const cz = lerp(1.2, 1.0, prog(lt, 4.7, 45));
  const cyy = lerp(430, 470, prog(lt, 8, 12));
  camera(ctx, Math.max(520, 640 / cz + 2), cyy, cz, () => {
    wallElevation(ctx, sx, { t: lt, pulse: 0.9, dust: true });
    ctx.save();
    ctx.translate(-sx, 0);
    const h = 360;
    const x0 = 1232;
    const kneelK = easeInOut(prog(lt, 8.1, 10.4));
    let pose = poses.stand(Math.sin(lt * 1.7));
    pose.lean = 0.06;
    const L = hl(x0, h, 1);
    const handW: V2 = [x0 + 92 + kneelK * 8, FY - h * (0.6 - kneelK * 0.1)];
    pose.handF = L(handW[0], handW[1]);
    pose.handB = L(x0 + 10, FY - h * 0.42);
    if (lt > 5.1 && lt < 6) pose.lean = 0.1;
    const kp = poses.kneel();
    kp.handF = L(x0 + 94, FY - h * 0.46);
    kp.handB = L(x0 + 40, FY - h * 0.3);
    pose = blend(pose, kp, kneelK);
    const j = orrin(ctx, x0 - kneelK * 0, h, 1, pose);
    // clipboard: held, then dropped
    if (lt < 7.7) {
      clipboard(ctx, j.handB[0] + 10, j.handB[1] + 8, 44, 58, 0.2);
    } else {
      const fall = prog(lt, 7.7, 8.3);
      const cy2 = lerp(j.handB[1] + 8, FY + 40, fall * fall);
      const bounce = lt > 8.3 ? Math.exp(-(lt - 8.3) * 9) * Math.abs(Math.sin((lt - 8.3) * 18)) * 18 : 0;
      clipboard(ctx, j.handB[0] + 10 + fall * 30, cy2 - bounce, 44, 58, 0.2 + fall * 1.2);
      // forms scatter
      for (let i = 0; i < 6; i++) {
        const dt = Math.max(0, lt - 8.0 - i * 0.04);
        if (dt <= 0) continue;
        const vx = 60 + i * 38 + (i % 2) * 30;
        const px = j.handB[0] + 40 + vx * Math.min(dt, 1.1);
        const py = lerp(j.handB[1], FY + 34 + (i % 3) * 8, Math.min(1, dt * 1.1)) - Math.sin(Math.min(1, dt * 1.1) * Math.PI) * (40 + i * 6) + Math.sin(dt * 9 + i) * 4 * (1 - Math.min(1, dt));
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(0.4 * i + dt * 2.2 * (i % 2 ? 1 : -1) * (1 - Math.min(1, dt * 0.8)));
        fillRR(ctx, -16, -11, 32, 22, 1, "#f4efe0", "rgba(30,22,40,0.6)", 1);
        line(ctx, -10, -3, 8, -3, "rgba(60,90,140,0.5)", 1);
        line(ctx, -10, 3, 4, 3, "rgba(60,90,140,0.5)", 1);
        ctx.restore();
      }
    }
    // the cloth tape: sliding in on its own, then taut
    const slide = lt < 4.7 ? easeInOut(prog(lt, 0.2, 4.2)) : 1;
    const taut = lt < 4.7 ? 0.35 + 0.15 * slide : clamp(0.55 + 0.45 * e + 0.45 * prog(lt, 8, 12) + 0.3 * (tugged ? 1 : 0), 0, 1);
    const sag = lerp(46, 0, taut);
    const thr = j.handF;
    const len = Math.hypot(entryX - thr[0], entryY - thr[1]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, entryX - 1, H);
    ctx.clip();
    clothTape(ctx, thr[0] + 6, thr[1] + 2, entryX, entryY, { width: 18, sag, showFirstInch: false, scroll: 100000 - lt * (lt < 4.7 ? 130 : 0), thread: taut > 0.88 });
    ctx.restore();
    void len;
    circle(ctx, thr[0] + 2, thr[1] + 2, 8, "#e6bd98", "rgba(30,22,40,0.8)", 1.5);
    // each tug: dust flicked sideways and a red correction pulse at the seam
    for (const t of TUGS) {
      const k = prog(lt, t, t + 0.7);
      if (k > 0 && k < 1) {
        corrCircle(ctx, entryX, entryY, 26 + k * 150, 1, 4 * (1 - k) + 1, `rgba(210,58,42,${1 - k})`);
        for (let i = 0; i < 12; i++) {
          const px = entryX - 8 - k * (60 + i * 14);
          const py = entryY - 40 + i * 8 + Math.sin(i * 3) * 8;
          ctx.fillStyle = `rgba(255,252,240,${(1 - k) * 0.8})`;
          ctx.fillRect(px, py, 6, 1.6);
        }
      }
    }
    ctx.restore();
  });
  // tug shake
  fx.shake = 7 * e;
  fx.distort = 0.12 + 0.2 * e;
  fx.fx = 0.5 * W + (entryXs - Math.max(520, 640 / cz + 2)) * cz;
  fx.fy = H / 2 + (entryY - cyy) * cz;
  fx.fr = 240;
  fx.tint = [90, 50, 140, 0.06];
  fx.flash = 0.1 * e;
}

function recorderInsert(ctx: Ctx, lt: number, ct: (i: number) => number) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#2a2034");
  g.addColorStop(1, "#150e1e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  lightPool(ctx, 640, 200, 800, 0.15, "255,235,200");
  const stopT = 180 - 180 + ct(6) + 0.0;
  const startT = ct(7) + 0.0;
  const typeT = ct(8);
  const recording = lt < stopT || lt >= startT;
  const x = 300;
  const y = 120;
  const w = 680;
  const h = 480;
  fillRR(ctx, x + 12, y + 16, w, h, 40, "rgba(0,0,0,0.45)");
  fillRR(ctx, x, y, w, h, 40, "#34303d", "#0e0b14", 5);
  fillRR(ctx, x + 14, y + 14, w - 28, h - 28, 30, "#403b4b");
  // speaker grille
  for (let i = 0; i < 9; i++) line(ctx, x + 60, y + 330 + i * 12, x + 340, y + 330 + i * 12, "rgba(0,0,0,0.5)", 4);
  // screen
  fillRR(ctx, x + 60, y + 54, w - 120, 210, 10, "#0e140f", "#050805", 4);
  const sg = "#8dd9a3";
  const dim = "rgba(141,217,163,0.5)";
  mono(ctx, "SURVEY RECORDER 07", x + 84, y + 94, { size: 20, color: dim, spacing: 2 });
  if (recording) {
    const blink = Math.sin(lt * 5) > -0.3;
    if (blink) circle(ctx, x + 96, y + 142, 11, C.red);
    mono(ctx, lt >= startT ? "REC  FILE 015" : "REC  FILE 014", x + 122, y + 150, { size: 30, weight: 800, color: sg });
  } else {
    mono(ctx, "■ STOPPED", x + 84, y + 150, { size: 34, weight: 800, color: sg });
  }
  const sub = lt >= startT ? "SUBJECT:" : "CALDER COURT · L2 INSPECTION";
  mono(ctx, sub, x + 84, y + 192, { size: 22, color: sg });
  if (lt >= typeT) {
    const full = "LENNA VOSS";
    const n = Math.min(full.length, Math.floor((lt - typeT) * 6) + 1);
    mono(ctx, full.slice(0, n) + (n < full.length || Math.sin(lt * 8) > 0 ? "█" : ""), x + 84, y + 236, { size: 38, weight: 900, color: "#d5ffdf" });
  } else if (lt >= startT) {
    mono(ctx, "—", x + 84, y + 236, { size: 38, color: sg });
  }
  mono(ctx, `${String(Math.floor(lt + 40)).padStart(2, "0")}:${String(Math.floor((lt * 7) % 60)).padStart(2, "0")}`, x + w - 200, y + 150, { size: 24, color: dim });
  // buttons
  circle(ctx, x + w - 160, y + 360, 38, recording ? C.red : "#7a3a38", "#1a0a0c", 4);
  mono(ctx, "REC", x + w - 160, y + 368, { size: 20, weight: 900, color: "#fff", align: "center" });
  fillRR(ctx, x + w - 290, y + 328, 64, 64, 8, "#4b4757", "#1a1620", 3);
  rr(ctx, x + w - 272, y + 346, 28, 28, 3);
  ctx.fillStyle = "#e3dccb";
  ctx.fill();
  recorderLamp(ctx, x + w - 70, y + 82, lt, recording, 9);
  // thumb presses stop, then rec
  const press = Math.max(bump(lt, stopT - 0.2, stopT + 0.35), bump(lt, startT - 0.35, startT + 0.2));
  const pressStop = bump(lt, stopT - 0.2, stopT + 0.35);
  const px = pressStop > 0.01 || lt < stopT ? x + w - 258 : x + w - 160;
  ctx.save();
  ctx.translate(px + 10, y + 360 + (lt < stopT ? 90 : 90) - press * 56);
  ctx.rotate(-0.3);
  rr(ctx, -34, 0, 68, 260, 32);
  ctx.fillStyle = "#e6bd98";
  ctx.fill();
  ctx.strokeStyle = "rgba(30,22,40,0.75)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/* ---------- END CARD ---------- */

function endCard(ctx: Ctx, lt: number, fx: FX) {
  // hold on the seam and the intact tape, taut with its yellow thread
  const sx = 1000;
  const z = 2.6;
  camera(ctx, CREASE - sx, 400, z, () => wallElevation(ctx, sx, { t: lt, pulse: 0.9, dust: true }));
  const y = 430;
  const e = Math.exp(-Math.max(0, lt) * 0.2);
  ctx.fillStyle = "#07030d";
  poly(ctx, [[W / 2, y - 22], [W / 2 + 10, y - 17], [W / 2 + 10, y + 17], [W / 2, y + 22]], "#07030d");
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W / 2, H);
  ctx.clip();
  clothTape(ctx, -400, y, W / 2, y, { width: 40, sag: 0, showFirstInch: false, scroll: 100000, thread: true });
  ctx.restore();
  // faint tug shimmer in the thread
  line(ctx, 0, y, W / 2, y + Math.sin(lt * 40) * 0.8 * e, `rgba(243,194,47,${0.5})`, 2);
  fx.distort = 0.14 * (1 - prog(lt, 10, 15));
  fx.fx = W / 2;
  fx.fy = y;
  fx.fr = 200;
  fx.tint = [90, 50, 140, 0.1];
  // title for what follows
  const a = prog(lt, 3, 4.5) * (1 - prog(lt, 12.2, 13.4));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    mono(ctx, "END OF EPISODE 1", 70, 640, { size: 14, color: "#cdbfe0", spacing: 4 });
    txt(ctx, "A Minor Discrepancy", 70, 676, { size: 30, color: C.creamLt, spacing: 1 });
    mono(ctx, "NEXT · UNOCCUPIED, TECHNICALLY", W - 70, 676, { size: 14, color: "#cdbfe0", spacing: 3, align: "right" });
    ctx.restore();
  }
  fx.dim = prog(lt, 13.4, 15);
}

/* ---------- render, sound, hud ---------- */

function render(ctx: Ctx, t: number, fx: FX) {
  const { b, lt, endCard: ec } = beatOf(t);
  if (ec) return endCard(ctx, t - 225, fx);
  [beat1, beat2, beat3, beat4, beat5][b](ctx, lt, fx);
  // unused import guards
  void stamp;
}

function stepsFrom(posFn: (t: number) => number, t0: number, t1: number, every: number, v = 0.35): SoundCue[] {
  const out: SoundCue[] = [];
  let last = Math.floor(posFn(t0) / every);
  for (let t = t0; t < t1; t += 0.02) {
    const k = Math.floor(posFn(t) / every);
    if (k !== last) {
      out.push({ t, type: "step", v });
      last = k;
    }
  }
  return out;
}

const B = (b: number) => b * 45;

const cues: SoundCue[] = ([
  // BEAT 1
  ...[0.5, 1.6, 2.7, 3.7].map((t) => ({ t, type: "paper" as const, d: 0.7, v: 0.9 })),
  { t: 4.3, type: "boom", v: 0.25 },
  ...[0, 1, 2, 3, 4].map((k) => ({ t: 4.9 + k * 0.5, type: "step" as const, v: 0.18 })),
  ...[0, 1, 2, 3].map((k) => ({ t: 6.9 + k * 0.5, type: "step" as const, v: 0.3 })),
  ...[0, 1, 2].map((k) => ({ t: 8.0 + k * 0.58, type: "step" as const, v: 0.25 })),
  { t: 9.4, type: "tap", v: 0.4 },
  { t: 13.0, type: "pen", d: 1.4, v: 1 },
  { t: 14.9, type: "pen", d: 2.3, v: 1 },
  { t: 20.6, type: "stamp", v: 1 },
  { t: 22.5, type: "chirp", v: 0.35 },
  ...[0, 1, 2, 3].map((k) => ({ t: 40.2 + k * 0.62, type: "step" as const, v: 0.25 })),
  // BEAT 2
  ...stepsFrom((t) => 280 + 1040 * easeInOut(prog(t, 0, 11)), 0, 10.9, 60, 0.3).map((c) => ({ ...c, t: c.t + B(1) })),
  { t: B(1) + 11.4, type: "swell", d: 4, v: 0.5 },
  { t: B(1) + 13.2, type: "paper", d: 0.4, v: 0.5 },
  { t: B(1) + 16.2, type: "paper", d: 0.7, v: 0.9 },
  { t: B(1) + 17.2, type: "slide", d: 1.5, v: 0.4 },
  { t: B(1) + 19.9, type: "stamp", v: 0.9 },
  { t: B(1) + 27.4, type: "step", v: 0.18 },
  ...[0, 1, 2, 3].map((k) => ({ t: B(1) + 36.2 + k * 0.9, type: "step" as const, v: 0.2 })),
  // BEAT 3 — silence swallows his call, the far side thrums back
  ...[2.4, 5.1, 7.7].map((t) => ({ t: B(2) + t, type: "knock" as const, f: 68, v: 0.35 })),
  { t: B(2) + 9.5, type: "hatch", v: 1, f: 760 },
  { t: B(2) + 12.8, type: "tap", v: 0.5 },
  { t: B(2) + 19.9, type: "pen", d: 1.2, v: 0.7 },
  { t: B(2) + 24.2, type: "swell", d: 3, v: 0.5 },
  // BEAT 4
  { t: B(3) + 1.0, type: "slide", d: 1.6, v: 0.3 },
  { t: B(3) + 3.0, type: "steelring", v: 1 },
  { t: B(3) + 5.4, type: "steelring", v: 0.7 },
  { t: B(3) + 8.1, type: "slide", d: 0.7, v: 0.3 },
  { t: B(3) + 10.4, type: "rasp", d: 1.8, v: 1 },
  { t: B(3) + 13.9, type: "bell", f: 587.3, v: 0.9 },
  { t: B(3) + 15.2, type: "pen", d: 0.7, v: 0.5 },
  { t: B(3) + 21.9, type: "rasp", d: 0.8, v: 0.5 },
  { t: B(3) + 32.2, type: "rasp", d: 6, v: 0.45 },
  { t: B(3) + 33.0, type: "swell", d: 4, v: 0.5 },
  // BEAT 5
  { t: B(4) + 0.3, type: "rasp", d: 4.2, v: 0.8 },
  ...TUGS.map((t) => ({ t: B(4) + t, type: "tug" as const, v: 1 })),
  { t: B(4) + 7.7, type: "clatter", v: 1 },
  { t: B(4) + 8.9, type: "knock", f: 110, v: 0.35 },
  { t: B(4) + 23.1, type: "stopclick", v: 1 },
  { t: B(4) + 25.7, type: "chirp", v: 1 },
  ...Array.from({ length: 10 }, (_, k) => ({ t: B(4) + 28.7 + k * 0.166, type: "tap" as const, v: 0.7 })),
  { t: B(4) + 31.4, type: "bell", f: 739.99, v: 1 },
  { t: B(4) + 33.4, type: "bell", f: 880, v: 0.8 },
  // END CARD
  { t: 226, type: "bell", f: 587.3, v: 0.6 },
  { t: 232, type: "tug", v: 0.3 },
] as SoundCue[]).sort((a, b) => a.t - b.t);

const sound: EpisodeSound = {
  cues,
  duration: 240,
  seed: 1701,
  progression: [0, -2, -4, -5, 0, -2, 3, -5, 0, -2, -4, -5, 0, -2, 3, 5, 0, -2, -4, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  levels: (t) => {
    const near = (a: number, b: number) => prog(t, a, b);
    const warm = near(185, 195) * (t > 225 ? 0.9 : 1);
    return {
      hum: 1 - near(52, 60) * 0.4,
      drone: 0.12 + near(1, 6) * 0.1 + near(52, 60) * 0.3 + near(90, 99) * 0.3 + near(160, 170) * 0.2,
      warm,
      pump: near(98, 104) * 0.45 + near(150, 175) * 0.1 + near(180, 190) * 0.3,
      tone: 1,
      music: 0.3 + near(0, 6) * 0.05 + near(134, 140) * 0.0 + near(190, 200) * 0.15 + (t > 225 ? 0.15 : 0),
      tick: 0,
      reverb: near(11 + 45, 13 + 45) * 0.3 - near(20 + 45, 22 + 45) * 0.3 + near(98, 104) * 0.25,
    };
  },
};

export const ep1Scene: EpisodeScene = {
  id: "ep1",
  render,
  sound,
  cuts: [6.6, 9.6, 12.2, 22.2, 45 + 11, 45 + 16.1, 45 + 21, 90 + 9, 90 + 12.5, 90 + 24, 90 + 36, 135 + 9.5, 135 + 13.8, 135 + 27.7, 180 + 4.7, 180 + 22.9, 180 + 34],
  hud: (t) => {
    const b = beatOf(t);
    const lt = b.lt;
    const rec = !(b.b === 4 && !b.endCard && lt >= CT[4](6) && lt < CT[4](7));
    return {
      rec,
      subject: b.b === 4 && lt >= CT[4](8) ? "LENNA VOSS" : null,
      clock: 22 * 60 + 10 + (Math.min(t, 240) / 240) * 48,
      showPurge: true,
      hidden: b.b === 4 && !b.endCard && lt >= 22.9 && lt < 34,
    };
  },
};

// keep a few helper imports used for tree-shaking clarity
void drawHatch;
void easeOut;
void bump;
void H;
void smooth;
