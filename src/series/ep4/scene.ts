import { RGB, TAU, clamp, hash, kf, lerp, mix3, noise, rgba, smooth } from "../../film/util";
import { PALS, glow, mixPal } from "../../film/look";
import { PostParams } from "../../film/post";
import { MechPose, drawMech, idlePose, mechAnchors, walkPose } from "../../film/mech";
import { BASE4, SPIRE_H, SPIRE_X, WorldState, drawWorld, horizonY, makeWorld } from "../../film/world";
import { AMBER, GOLD, drawBaby, drawNet, mechBase, risingLights, shake } from "../../film/scenes/common";
import { MAP_EDGES, MAP_PTS, drawEye } from "../../film/manta";
import { H, W, SPAL, chip, drawCockpit, drawEpTitle, drawToBeContinued, hudLine, marineSnow, ring, spike, speedLines, starfield, withCam } from "../fx";
import { easeOut, prog, pulseAt, step } from "../beat";
import { CHILD, CHILD_EDGES } from "../ep3/scene";
import { BEATS4 } from "./beats";

type Post = PostParams;
type V2 = [number, number];
const hb = (t: number) => pulseAt(BEATS4, t);
const BROOD: RGB[] = [[160, 230, 255], [255, 190, 150], [200, 170, 255], [160, 255, 210], [255, 220, 140], [255, 160, 210]];

// ----------------------------------------------------------------- helpers
function liveMech(t: number, pal: WorldState["pal"], x: number, y: number, s: number, flip: number, over: Partial<MechPose> = {}): MechPose {
  return { ...mechBase(t, pal, x, y, s, flip), hollow: false, chest: 0, heart: 0.8 + 0.5 * hb(t), lamp: 0.8, lens: AMBER, glow: 0.95, iris: 0.5, ...over };
}
function setCam(ws: WorldState, fx: number, fy: number, zoom: number, tilt = 0) {
  ws.cam.x = fx - 640;
  ws.cam.y = 360 - fy;
  ws.cam.zoom = zoom;
  ws.cam.tilt = tilt;
}
function finishWorld(ctx: CanvasRenderingContext2D, ws: WorldState, post: Post, shk: number) {
  const sh = shake(ws.t, shk);
  ws.cam.x += sh[0];
  ws.cam.y += sh[1];
  post.horizon = horizonY(ws) / H;
  post.foldY = post.horizon;
  drawWorld(ctx, ws);
}

/** a small member of the brood: just a glowing V with a heart */
function mini(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, t: number, col: RGB, a = 1) {
  const fl = Math.sin(t * 6 + x * 0.01) * 0.35;
  glow(ctx, x, y, s * 3.2, col, 0.5 * a);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = a;
  ctx.fillStyle = rgba(mix3(col, [20, 20, 60], 0.55), 1);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.8, -s * (0.5 - fl), s * 1.4, s * (0.1 + fl), s * 1.7, s * (0.2 + fl * 1.4));
  ctx.bezierCurveTo(s * 0.9, s * 0.35, s * 0.3, s * 0.4, 0, s * 0.7);
  ctx.bezierCurveTo(-s * 0.3, s * 0.4, -s * 0.9, s * 0.35, -s * 1.7, s * (0.2 + fl * 1.4));
  ctx.bezierCurveTo(-s * 1.4, s * (0.1 + fl), -s * 0.8, -s * (0.5 - fl), 0, -s * 0.5);
  ctx.fill();
  ctx.strokeStyle = rgba(col, 0.8);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  glow(ctx, x, y + s * 0.05, s * 0.5, [255, 255, 255], 0.8 * a);
  ctx.globalAlpha = 1;
}

/** the sky is a painted lid. these are its guards */
function sentry(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, a = 1, fire = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4 + Math.sin(t * 0.8 + x) * 0.15);
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, "rgb(60,48,120)");
  g.addColorStop(1, "rgb(14,10,40)");
  ctx.fillStyle = g;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.strokeStyle = "rgba(190,170,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = "rgba(230,230,255,0.8)";
  for (let i = 0; i < 9; i++) ctx.fillRect((hash(i * 3 + x) - 0.5) * s * 1.7, (hash(i * 7 + x) - 0.5) * s * 1.7, 2, 2);
  ctx.rotate(-Math.PI / 4);
  drawEye(ctx, 0, 0, s * 0.62, 1, [255, 90, 110], [Math.sin(t + x) * 0.6, 0.3], 0.1, 1);
  ctx.restore();
  glow(ctx, x, y, s * 2.2 + fire * s * 2, [255, 90, 120], (0.25 + fire * 0.6) * a);
}
function beam(ctx: CanvasRenderingContext2D, a: V2, b: V2, k: number, col: RGB = [255, 90, 120]) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(col, 0.35 * k);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = rgba([255, 255, 255], 0.9 * k);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** the real sky behind the lid: a calm cosmic ocean of watching eyes */
function trueSky(ctx: CanvasRenderingContext2D, t: number, k = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgb(8,6,40)");
  g.addColorStop(0.55, "rgb(52,34,110)");
  g.addColorStop(1, "rgb(236,170,140)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, t, k, { n: 260, seed: 21, maxY: 600 });
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const gg = ctx.createLinearGradient(0, 120 + i * 90, W, 220 + i * 70);
    gg.addColorStop(0, "rgba(120,80,255,0)");
    gg.addColorStop(0.5, `rgba(${150 + i * 25},${110 + i * 15},255,${0.12 * k})`);
    gg.addColorStop(1, "rgba(120,80,255,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(0, 150 + i * 80);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 150 + i * 80 + Math.sin(x * 0.006 + t * 0.2 + i) * 50 + noise(x * 0.004 + i) * 40);
    for (let x = W; x >= 0; x -= 40) ctx.lineTo(x, 230 + i * 80 + Math.sin(x * 0.005 + t * 0.25 + i) * 40);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const blink = 1 - Math.pow(Math.max(0, Math.sin(t * 0.4 + i * 1.9)), 60);
    drawEye(ctx, 80 + hash(i * 2.3) * 1120, 60 + hash(i * 4.1) * 380, 36 + hash(i) * 40, k * blink, [255, 214, 150], [Math.sin(t * 0.3 + i), 0.5], 0.14, 0.55 * k);
  }
}

// ===================================================== 0–30  RETURN
function sceneReturn(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const pal = SPAL.cosmos;
  const cut = step(t, [[0, 0], [7, 1], [15, 2], [23, 3]]);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "rgb(2,2,14)");
  bg.addColorStop(0.7, "rgb(28,20,80)");
  bg.addColorStop(1, "rgb(110,70,150)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, t, 1, { n: 230, seed: 3, ox: t * 3 });
  // clouds far below
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) glow(ctx, ((hash(i * 3) * 1600 - t * 10 * (0.4 + hash(i)) + 1600) % 1600) - 150, 640 + hash(i * 7) * 120, 240 + hash(i) * 140, [120, 90, 190], 0.2);
  ctx.restore();
  const mxs = 640;
  // act 0: the huge eye from Ep. III closing, pulling back to reveal the summit
  if (cut === 0) {
    const R = lerp(470, 90, smooth(0, 6.6, t));
    glow(ctx, 640, 340, 600, [255, 220, 170], 0.5);
    drawEye(ctx, 640, 340, R, 1 - smooth(5.2, 6.6, t), [255, 214, 150], [0, 0.3], 0.1, 1);
    chip(ctx, t, 1.5, 5.5, "She heard", "", [255, 214, 150]);
  }
  const zoom = step(t, [[0, 1.0], [7, 1.35], [15, 0.95], [23, 1.15]]);
  const shk = shake(t, 0.6 + 4 * spike(t, 7, 0.4) + 6 * spike(t, 14.9, 0.3) + 5 * spike(t, 22.6, 0.4));
  withCam(ctx, 640 + shk[0], 400 + shk[1], zoom * (1 + 0.05 * smooth(7, 15, t)), 0.03 * Math.sin(t * 0.5), () => {
    // the slab's summit: a black plinth at the top of the sky
    if (cut >= 1) {
      ctx.fillStyle = "#000";
      ctx.fillRect(mxs - 150, 560, 300, 400);
      ctx.strokeStyle = "rgba(190,210,255,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(mxs - 150, 560, 300, 400);
      glow(ctx, mxs, 560, 340, [190, 210, 255], 0.3);
      const bits = idlePose(t);
      const m = liveMech(t, pal, mxs - 40, 560, 0.62, 1, { ...bits, gaze: [0.3, -1], tilt: -0.22 });
      drawMech(ctx, m);
      glow(ctx, mxs - 40, 560 - 262 * 0.62, 70, AMBER, 0.5);
    }
    // 7–15: a comet with a body. the baby, grown, arrives in a streak
    if (cut === 1) {
      const u = prog(t, 7.2, 14.8);
      const x = lerp(-300, 1200, easeOut(u * 0.9 + 0.1)), y = lerp(-100, 300, u) + Math.sin(u * 7) * 40;
      for (let i = 0; i < 20; i++) glow(ctx, x - i * 38, y - i * 20 + Math.sin(i + t * 5) * 6, 70 - i * 3, [190, 220, 255], 0.5 * (1 - i / 20));
      drawBaby(ctx, { x, y, size: lerp(120, 260, u), t, pal, glow: 0.38, eyes: 1, rot: 0.4 - 0.4 * u, look: [0.4, 0.3] });
    }
    // 15–30: it lands before him. and it is not alone
    if (cut >= 2) {
      const land = smooth(15, 21, t);
      const bx = lerp(1200, 880, easeOut(land)), by = lerp(260, 330, land) + Math.sin(t * 1.5) * 12;
      drawBaby(ctx, { x: bx, y: by, size: 270, t, pal, glow: 0.38, eyes: 1, rot: -0.06 + 0.04 * Math.sin(t), look: [-0.6, 0.3], map: 0.6 });
      // the brood arrives from every side
      const n = Math.floor(6 + 36 * smooth(17, 29, t));
      for (let i = 0; i < n; i++) {
        const u = smooth(15 + hash(i) * 6, 22 + hash(i) * 6, t);
        const an = hash(i * 3.3) * TAU + t * 0.1 * (0.5 + hash(i));
        const ex = 640 + Math.cos(an) * (500 + 400 * (1 - u)) + Math.sin(t * 0.8 + i) * 30;
        const ey = 280 + Math.sin(an) * (260 + 200 * (1 - u)) - 60 + Math.cos(t * 0.9 + i) * 20;
        mini(ctx, lerp(1500, ex, u), lerp(-300, ey, u), 10 + hash(i + 2) * 22, an + Math.PI / 2, t, BROOD[i % BROOD.length], u);
      }
    }
  });
  speedLines(ctx, t, 0.5 * (smooth(7, 8, t) * (1 - smooth(13, 15, t))), -0.4, [190, 220, 255]);
  post.flash = 0.7 * spike(t, 7, 0.1) + 0.5 * spike(t, 14.9, 0.1) + 0.5 * spike(t, 22.6, 0.12);
  post.glitch = Math.max(spike(t, 7, 0.1), spike(t, 14.9, 0.1), spike(t, 22.6, 0.1)) * 0.8;
  post.chroma = 0.6;
  post.bloom = 0.8;
  post.zoomBlur = 0.2 * spike(t, 7.1, 0.3) + 0.15 * spike(t, 14.9, 0.3);
  post.exposure = smooth(0, 0.6, t);
  drawEpTitle(ctx, t, 22.6, 29.4, pal, "IV", "The Star Child", 150);
  chip(ctx, t, 8, 13.5, "Return", "grown, and fast", [190, 220, 255]);
  hudLine(ctx, "CONTACTS ———  1 … 7 … 31 … 190", smooth(17, 18, t) * (1 - smooth(28, 29, t)), 70, 640, [190, 220, 255]);
}

// ===================================================== 30–75  THE BROOD
function sceneBrood(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const pal = SPAL.cosmos;
  const k = t - 30;
  const cut = step(t, [[30, 0], [37, 1], [45, 2], [52, 1], [59, 3], [67, 0]]);
  // rushing sky
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "rgb(4,3,22)");
  bg.addColorStop(1, "rgb(70,40,120)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, t, 1, { n: 200, seed: 17, ox: -t * 120 });
  marineSnow(ctx, t, t * 500, 0, 0.5, [190, 200, 255], 60);
  const shk = shake(t, 3 + 3 * spike(t, 59.4, 0.3));
  const cams: Record<number, [number, number, number, number]> = {
    0: [640, 360, 1.0, 0.1 * Math.sin(t * 0.7)],
    1: [560, 330, 1.35, -0.18 + 0.05 * Math.sin(t)],
    2: [640, 360, 1.9, 0.0],
    3: [700, 420, 0.9, 0.35],
  };
  const c = cams[cut];
  withCam(ctx, c[0] + shk[0], c[1] + shk[1], c[2], c[3], () => {
    // the sentries: the painted lid's guards, in formation, then breaking
    const NS = 9;
    const sp: V2[] = [];
    for (let i = 0; i < NS; i++) {
      const alive = 1 - smooth(60 + i * 0.9, 61.2 + i * 0.9, t) * (t > 60 ? 1 : 0);
      const x = 160 + hash(i * 2.9) * 980 + Math.sin(t * 0.8 + i) * 50;
      const y = 80 + hash(i * 4.7) * 150 + Math.sin(t * 1.1 + i * 2) * 26;
      sp.push([x, y]);
      if (alive > 0.02) sentry(ctx, x, y, 32 - hash(i) * 6, t, alive, spike((t * 1.7 + hash(i) * 3) % 3, 0.2, 0.2));
    }
    // the hero: the Star Child, banking, with the Catcher on its back
    const hx = 520 + Math.sin(t * 0.9) * 150 + 90 * Math.sin(t * 2.2);
    const hy = 430 + Math.cos(t * 0.7) * 90;
    const bank = Math.cos(t * 0.9) * 0.25;
    drawBaby(ctx, { x: hx, y: hy, size: 250, t, pal, glow: 0.38, eyes: 1, rot: bank, look: [0.4, -0.5], map: 0.5 });
    const mechPose = liveMech(t, pal, hx + Math.sin(bank) * 20 - 20, hy - 62, 0.2, 1, { ...idlePose(t), gaze: [0.6, -0.4], lean: 0.2 });
    drawMech(ctx, mechPose);
    // the brood swarms and fights
    for (let i = 0; i < 26; i++) {
      const an = t * (0.6 + hash(i) * 0.7) + hash(i * 3.1) * TAU;
      const x = 640 + Math.cos(an) * (240 + hash(i * 2) * 420);
      const y = 300 + Math.sin(an * 1.3) * (120 + hash(i * 5) * 200);
      mini(ctx, x, y, 8 + hash(i + 4) * 16, Math.cos(an) * 0.6, t, BROOD[i % BROOD.length]);
      // each one is a target, and a shot
      const tgt = sp[i % NS];
      const phase = (t * 0.9 + hash(i * 9)) % 3;
      if (phase < 0.25 && t < 61) beam(ctx, [tgt[0], tgt[1]], [x, y], 1 - phase * 3);
      const ph2 = (t * 0.8 + hash(i * 11)) % 2.4;
      if (ph2 < 0.2 && t < 62) beam(ctx, [x, y], [tgt[0], tgt[1]], 1 - ph2 * 5, [170, 230, 255]);
    }
    // shards of broken lid fall; the Catcher's net gathers them
    if (t > 36) {
      for (let i = 0; i < 40; i++) {
        const st = 36 + hash(i * 3) * 24;
        const u = (t - st) / 4;
        if (u < 0 || u > 1.2) continue;
        const sx = sp[i % NS][0] + (hash(i) - 0.5) * 120 + u * 90 * (hash(i + 2) - 0.5);
        const sy = sp[i % NS][1] + u * 700;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(sx, sy);
        ctx.rotate(u * 6 + i);
        ctx.fillStyle = `rgba(210,200,255,${0.7 * (1 - u / 1.2)})`;
        ctx.fillRect(-10, -3, 20, 6);
        ctx.restore();
      }
    }
    if (t > 40 && t < 58) {
      const m = mechAnchors(mechPose);
      const net = Math.sin(prog(t, 40, 58) * Math.PI);
      drawNet(ctx, { ox: m.handL[0], oy: m.handL[1], cx: m.handL[0] + 140, cy: m.handL[1] - 150 + Math.sin(t * 2) * 20, R: 80, spread: net, cinch: smooth(0.7, 1, net) * 0, t, col: [190, 230, 255], flat: 0.6, alpha: 0.9 });
    }
  });
  speedLines(ctx, t, 0.55, Math.PI, [200, 190, 255]);
  const cutF = [30, 37, 45, 52, 59, 67].reduce((m, x) => Math.max(m, spike(t, x, 0.06)), 0);
  post.flash = 0.35 * cutF + 0.5 * spike(t, 61.2, 0.15);
  post.glitch = 0.5 * cutF;
  post.chroma = 0.8 + cutF;
  post.zoomBlur = 0.04 + 0.18 * cutF;
  post.bloom = 0.7;
  chip(ctx, t, 31, 36, "The Brood", "the stars the hunters were", [190, 220, 255]);
  chip(ctx, t, 46, 51, "Guards of the lid", "painted sky, real teeth", [255, 120, 150]);
  hudLine(ctx, `LID INTEGRITY ${String(Math.round(100 - 100 * smooth(36, 66, t))).padStart(3, "0")} %`, 1, 70, 640, [255, 130, 160]);
  void k;
}

// ========================================= 75–115  THE SKY STOPS PRETENDING
function sceneLid(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 75;
  trueSky(ctx, t, smooth(78, 92, t));
  // the lid: a grid of painted tiles that flip away from the centre outward
  const cols = 18, rows = 10, tw = W / cols + 1, th = H / rows + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = Math.hypot(c - cols / 2 + 0.5, (r - rows / 2 + 0.5) * 1.5);
      const start = 77 + d * 1.35 + hash(r * 31 + c) * 0.8;
      const u = clamp((t - start) / 1.6);
      if (u >= 1) continue;
      const x = c * tw, y = r * th;
      ctx.save();
      ctx.translate(x + tw / 2, y + th / 2 + u * u * 520);
      ctx.rotate(u * (hash(c + r * 7) - 0.5) * 3);
      ctx.scale(Math.cos(u * 1.2), 1);
      ctx.fillStyle = `rgb(${28 + hash(c * 3 + r) * 20},${20 + hash(r) * 14},${70 + hash(c) * 30})`;
      ctx.fillRect(-tw / 2, -th / 2, tw, th);
      ctx.fillStyle = "rgba(220,220,255,0.7)";
      for (let i = 0; i < 2; i++) ctx.fillRect((hash(c * 5 + r * 13 + i) - 0.5) * tw, (hash(c * 11 + r * 3 + i) - 0.5) * th, 1.6, 1.6);
      ctx.strokeStyle = `rgba(200,190,255,${0.3 + 0.6 * u})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(-tw / 2, -th / 2, tw, th);
      ctx.restore();
    }
  }
  // the brood pours through the opening, lit by the real sky
  for (let i = 0; i < 34; i++) {
    const u = smooth(82 + hash(i) * 6, 92 + hash(i) * 6, t);
    const x = 640 + Math.cos(hash(i * 3) * TAU + t * 0.2) * (140 + hash(i + 1) * 520) * u;
    const y = 300 + Math.sin(hash(i * 3) * TAU + t * 0.25) * (90 + hash(i + 2) * 200) * u;
    mini(ctx, x, y, 8 + hash(i + 4) * 20, 0.2 * Math.sin(t + i), t, BROOD[i % BROOD.length], u);
  }
  drawBaby(ctx, { x: 640, y: 440 + Math.sin(t) * 10, size: 230 * smooth(80, 90, t), t, pal: SPAL.cosmos, glow: 0.38, eyes: 1, look: [0, -0.5], alpha: smooth(80, 86, t) });
  // the turn: the world rolls over, and the sea is above us
  const flip = smooth(100, 112, t);
  post.roll = Math.PI * flip;
  post.kaleido = flip > 0.01 && flip < 0.98 ? 8 * Math.sin(flip * Math.PI) : 0;
  post.kRot = t * 0.3;
  post.chroma = 0.7 + 0.5 * spike(t, 106, 1);
  post.flash = 0.8 * spike(t, 77.1, 0.12) + 0.4 * spike(t, 100.5, 0.2) + 0.5 * spike(t, 112, 0.15);
  post.glitch = 0.5 * spike(t, 77.1, 0.1);
  post.zoomBlur = 0.15 * spike(t, 77.1, 0.4);
  post.bloom = 0.8;
  post.vig = 0.85;
  const sh = shake(t, 1 + 6 * spike(t, 77.5, 0.5) + 4 * spike(t, 106, 1.5));
  ctx.translate(sh[0], sh[1]);
  chip(ctx, t, 78, 84, "The sky stops pretending", "", [255, 214, 150]);
  chip(ctx, t, 101, 108, "It was never above", "", [255, 214, 150]);
  void k;
}

// ===================================================== 115–160  THE GIFT
function sceneGift(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 115;
  const pal = SPAL.cosmos;
  const HZy = 410;
  // upper: the true sky. lower: its reflection in the still sea
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, HZy);
  ctx.clip();
  trueSky(ctx, t, 1);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HZy, W, H - HZy);
  ctx.clip();
  ctx.translate(0, HZy * 2);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.6;
  trueSky(ctx, t, 1);
  ctx.restore();
  ctx.fillStyle = "rgba(10,6,40,0.35)";
  ctx.fillRect(0, HZy, W, H - HZy);
  ctx.fillStyle = "rgba(255,230,200,0.5)";
  ctx.fillRect(0, HZy - 1, W, 2);
  const cut = step(t, [[115, 0], [126, 1], [136, 2], [147, 3], [153, 4]]);
  const zoom = [1.0, 1.0, 1.0, 1.5, 0.95][cut];
  const fx = [640, 780, 640, 340, 640][cut];
  const fy = [380, 330, 380, 360, 300][cut];
  withCam(ctx, fx, fy, zoom + 0.03 * Math.sin(t * 0.4) + (cut === 1 ? 0.5 * smooth(126, 136, t) : 0), 0, () => {
    const mx = 330, my = 520;
    const baby: V2 = [900, 300];
    const wide = cut <= 0;
    // the child: huge, grown, quiet
    drawBaby(ctx, { x: baby[0], y: baby[1] + Math.sin(t * 0.8) * 14, size: 330, t, pal, glow: 0.38, eyes: 1, look: [-0.8, 0.3], map: 1 });
    // its chest opens
    const open = smooth(128, 133, t) * (1 - smooth(147, 150, t));
    glow(ctx, baby[0], baby[1] + 40, 50 + 90 * open * (1 + 0.15 * hb(t)), [255, 240, 200], 0.75 * open);
    // the mech: a lantern heart, a missing star
    const reach = smooth(138, 146, t);
    const pose = liveMech(t, pal, mx, my, 0.9, 1, {
      ...idlePose(t), hands: [[-104, -98], [lerp(104, 150, reach), lerp(-98, -250, reach)]], gaze: [1, -0.2], chest: step(t, [[0, 0], [136, 1], [150.4, 0]]),
      heart: 0.8 + 0.5 * hb(t), lens: AMBER, glow: 0.9 + 0.3 * smooth(150, 152, t),
    });
    drawMech(ctx, pose);
    const an = mechAnchors(pose);
    // the star travels, slowly, over the water
    const fu = smooth(134, 150, t);
    if (t > 133 && t < 150.4) {
      const sx = lerp(baby[0] - 60, an.chest[0], fu);
      const sy = lerp(baby[1] + 40, an.chest[1], fu) - Math.sin(fu * Math.PI) * 170;
      for (let i = 0; i < 24; i++) {
        const uu = clamp(fu - i * 0.012);
        const tx = lerp(baby[0] - 60, an.chest[0], uu), ty = lerp(baby[1] + 40, an.chest[1], uu) - Math.sin(uu * Math.PI) * 170;
        glow(ctx, tx + Math.sin(i + t * 4) * 6, ty, 14 - i * 0.5, GOLD, 0.5 * (1 - i / 24));
      }
      glow(ctx, sx, sy, 80, [255, 220, 150], 0.8);
      glow(ctx, sx, sy, 38, [255, 255, 255], 1);
      // the sea beneath carries its light
      glow(ctx, sx, HZy + (HZy - sy) * 0.35, 60, GOLD, 0.35);
    }
    const lock = smooth(150, 151.2, t);
    glow(ctx, an.chest[0], an.chest[1], 100 * lock * (1 + 0.3 * hb(t)), [255, 240, 200], 0.6 * lock);
    glow(ctx, an.lens[0], an.lens[1], 60 * smooth(150.8, 153, t), [255, 244, 220], 0.7 * smooth(150.8, 153, t));
    ring(ctx, an.chest[0], an.chest[1], (t - 150.6) * 520, [255, 230, 170], 0.7 * (1 - clamp((t - 150.6) / 2)) * (t > 150.6 ? 1 : 0), 3, 0.9);
    void wide;
  });
  // the full constellation across the sky: three hearts, one beat
  const cons = smooth(153, 158, t);
  if (cons > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const S = 760;
    const P = (p: V2): V2 => [640 + p[0] * S, 190 + p[1] * S];
    const edge = (a: V2, b: V2, col: RGB, i: number) => {
      const u = clamp(cons * 24 - i);
      ctx.strokeStyle = rgba(col, 0.55 * u);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u));
      ctx.stroke();
    };
    MAP_EDGES.forEach(([a, b], i) => edge(P(MAP_PTS[a]), P(MAP_PTS[b]), GOLD, i));
    CHILD_EDGES.forEach(([a, b], i) => edge(P(CHILD[a]), P(CHILD[b]), [170, 230, 255], 17 + i));
    edge(P(CHILD[3]), P(MAP_PTS[6]), [255, 255, 255], 23);
    MAP_PTS.forEach((p, i) => glow(ctx, P(p)[0], P(p)[1], i === 8 ? 54 * (0.8 + 0.3 * hb(t)) : 20, i === 8 ? [255, 246, 220] : GOLD, cons));
    CHILD.forEach((p, i) => glow(ctx, P(p)[0], P(p)[1], i === 7 ? 46 * (0.8 + 0.3 * hb(t)) : 18, i === 7 ? [255, 255, 255] : [170, 230, 255], cons));
    ctx.restore();
  }
  post.ripple = 1;
  post.horizon = HZy / H;
  post.bloom = 0.9;
  post.chroma = 0.4;
  post.flash = 0.5 * spike(t, 150.6, 0.12) + 0.2 * spike(t, 115.1, 0.1) + 0.2 * spike(t, 128, 0.15);
  post.vig = 0.9;
  chip(ctx, t, 116, 123, "Still water", "the sea above, the sea below", [255, 214, 150]);
  chip(ctx, t, 139, 146, "The star he gave away", "returned, by the one who carried it", [255, 214, 150]);
  hudLine(ctx, "HEART ♥ 52    HEART ♥ 52    SYNC", smooth(150.8, 152, t), 70, 640, [255, 224, 160]);
  void k;
}

// ===================================================== 160–195  HOME
function sceneHome(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 160;
  const palA = mixPal(SPAL.cosmos, SPAL.dawn, smooth(160, 178, t));
  const pal = mixPal(palA, PALS.day, 0.2 * smooth(184, 196, t));
  const ws = makeWorld(t, pal);
  ws.lantern.reveal = kf(t, [[160, 0], [172, 1.25]]);
  ws.lantern.level = 1;
  ws.lantern.breath = 0.35;
  ws.lantern.off = 0;
  ws.lantern.lean = 0;
  ws.stars = 1 - smooth(176, 190, t);
  ws.eyes = 0;
  ws.moon = { x: 260, y: 150, r: 80, alpha: 0.6 * (1 - smooth(172, 184, t)), eye: 0, dil: 0.5 };
  ws.plankton = 0.8 * (1 - smooth(178, 190, t));
  ws.fog = 0.2;
  ws.wake = 0.4;
  const top = step(t, [[160, 0], [171.5, 1]]);
  const climb = top === 1;
  if (!climb) {
    const mx = 400 + k * 42;
    const wp = walkPose(-Math.PI / 2 + (k * 42 * Math.PI) / 108, 1);
    ws.mech = liveMech(t, pal, mx, BASE4, 0.9, 1, { ...wp, gaze: [0.2, -0.5] });
    setCam(ws, mx + 120, 400, kf(t, [[160, 1.5], [171, 1.05]]), 0);
    ws.frontMech = (c) => {
      drawBaby(c, { x: mx + 260 + Math.sin(t) * 40, y: BASE4 - 360 + Math.cos(t * 1.3) * 30, size: 84, t, pal, glow: 1, eyes: 1, rot: 0.1 });
      for (let i = 0; i < 12; i++) mini(c, mx + 100 + (i - 6) * 70 + Math.sin(t + i) * 20, BASE4 - 520 - hash(i) * 200, 10 + hash(i) * 8, 0.1, t, BROOD[i % 6]);
    };
  } else {
    // the top of the spire, where it began (Ep. I, 4:20)
    ws.mech = liveMech(t, pal, SPIRE_X, BASE4 - SPIRE_H - 2, 0.85, 1, { ...idlePose(t), gaze: [0.4, -0.2], lean: 0.02 });
    ws.cam.y = SPIRE_H - 10;
    ws.cam.x = SPIRE_X - 640 - 80 * smooth(171.5, 195, t);
    ws.cam.zoom = kf(t, [[171.5, 1.6], [180, 1.3], [195, 0.8]]);
    ws.cam.tilt = kf(t, [[171.5, 10], [195, 60]]);
    ws.mother = {
      x: 640, y: -260, size: 460, rot: 0, t, flap: t * 0.5, amp: 0.4, alpha: 1, glow: 0.25, eyes: 0, maw: 0, map: 1, heartStar: 1,
      skin: [58, 50, 84], skinDark: [14, 10, 32], light: GOLD, look: [0, 0.8],
    };
    ws.frontMech = (c) => {
      drawBaby(c, { x: SPIRE_X - 110, y: BASE4 - SPIRE_H - 140 + Math.sin(t * 1.2) * 14, size: 70 + 40 * smooth(176, 190, t), t, pal, glow: 1, eyes: 1, rot: -0.1, look: [0.8, 0] });
    };
  }
  post.exposure = smooth(160, 161, t) * (1 - 0.18 * smooth(172, 182, t));
  post.ripple = 0.8;
  post.bloom = 0.55;
  post.flash = 0.7 * spike(t, 171.5, 0.12);
  post.glitch = 0.5 * spike(t, 171.5, 0.08);
  post.chroma = 0.35;
  finishWorld(ctx, ws, post, 0.4 + 2 * spike(t, 171.5, 0.3));
  risingLights(ctx, t, 0.35 * smooth(162, 170, t), [255, 214, 150], 0.3);
  chip(ctx, t, 161, 167, "Home", "every rope, every lantern, breathing together", [255, 214, 150]);
  chip(ctx, t, 173, 180, "A catcher doesn't capture", "he cradles", [255, 214, 150]);
  chip(ctx, t, 186, 193, "Morning", "", [255, 236, 190]);
  void k;
}

// ===================================================== 195–210  THE TOP
function sceneTop(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 195;
  if (t >= 205.2) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const u = t - 205.2;
    const tickA = [0.0, 1.4].map((d) => spike(u, d + 1.6, 0.2));
    glow(ctx, 640, 360, 80 * (tickA[0] + tickA[1]) + 4, [255, 214, 150], 0.4 * (tickA[0] + tickA[1]));
    drawToBeContinued(ctx, t, 207.4, SPAL.dawn, "THE END", "STAR CATCHER  ·  A SERIES IN CODE");
    return;
  }
  drawCockpit(ctx, t, {
    win: (c) => {
      const g = c.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, "rgb(70,110,190)");
      g.addColorStop(0.6, "rgb(250,200,160)");
      g.addColorStop(1, "rgb(255,236,190)");
      c.fillStyle = g;
      c.fillRect(0, 0, W, 540);
      glow(c, 880, 330, 260, [255, 240, 200], 0.9);
      // the village at dawn, a row of small spires, lantern-strung
      c.fillStyle = "rgba(40,36,80,0.9)";
      for (let i = 0; i < 12; i++) {
        const x = 330 + i * 56, h = 60 + hash(i * 3) * 120;
        c.beginPath();
        c.moveTo(x - 14, 440);
        c.lineTo(x - 6, 440 - h);
        c.lineTo(x + 6, 440 - h);
        c.lineTo(x + 14, 440);
        c.fill();
        glow(c, x, 440 - h * 0.6, 14, [255, 190, 100], 0.7);
      }
      c.fillStyle = "rgba(90,130,190,0.7)";
      c.fillRect(330, 440, 700, 130);
    },
    pilot: 1, heart: hb(t) * 0.6, topWob: kf(t, [[195, 0], [199, 0.15], [202, 0.7], [204, 1.2], [205.2, 1.5]]),
  });
  // a slow push toward the top
  const zz = kf(t, [[195, 1], [205, 1.6]]);
  void zz;
  glow(ctx, 920, 520, 130 * smooth(199, 205, t), [255, 244, 220], 0.35 * smooth(199, 205, t));
  chip(ctx, t, 196, 201, "Is it still spinning?", "", [255, 244, 220], 84, 140);
  post.flash = 0.8 * spike(t, 205.1, 0.05);
  post.zoomBlur = 0.06 * smooth(202, 205.2, t);
  post.vig = 1.0;
  post.chroma = 0.3 + 0.8 * smooth(203, 205.2, t);
  void k;
}

// ===================================================================== film
export function renderEp4(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  ctx.save();
  if (t < 30) sceneReturn(ctx, t, post);
  else if (t < 75) sceneBrood(ctx, t, post);
  else if (t < 115) sceneLid(ctx, t, post);
  else if (t < 160) sceneGift(ctx, t, post);
  else if (t < 195) sceneHome(ctx, t, post);
  else sceneTop(ctx, t, post);
  ctx.restore();
}
