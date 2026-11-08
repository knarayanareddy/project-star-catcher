import { RGB, TAU, clamp, hash, kf, lerp, mix3, noise, rgba, smooth } from "../../film/util";
import { glow } from "../../film/look";
import { PostParams } from "../../film/post";
import { MechPose, drawMech, idlePose, mechAnchors, walkPose } from "../../film/mech";
import { BASE4, HZ, WorldState, drawWorld, horizonY, makeWorld } from "../../film/world";
import { AMBER, GOLD, drawBaby, drawMeteors, mechBase, risingLights, shake } from "../../film/scenes/common";
import { MAP_EDGES, MAP_PTS, drawEye } from "../../film/manta";
import { H, W, SPAL, chip, drawEpTitle, drawSlab, drawToBeContinued, hudLine, marineSnow, ring, spike, speedLines, starfield, withCam } from "../fx";
import { easeOut, prog, pulseAt } from "../beat";
import { BEATS3 } from "./beats";

type Post = PostParams;
const hb = (t: number) => pulseAt(BEATS3, t);
type V2 = [number, number];

// ----------------------------------------------------------------- helpers
function setCam(ws: WorldState, fx: number, fy: number, zoom: number, tilt = 0) {
  ws.cam.x = fx - 640;
  ws.cam.y = 360 - fy;
  ws.cam.zoom = zoom;
  ws.cam.tilt = tilt;
}
function finish(ctx: CanvasRenderingContext2D, ws: WorldState, post: Post, shk: number) {
  const sh = shake(ws.t, shk);
  ws.cam.x += sh[0];
  ws.cam.y += sh[1];
  post.horizon = horizonY(ws) / H;
  post.foldY = post.horizon;
  drawWorld(ctx, ws);
}
function alive(t: number, ws: WorldState, x: number, y: number, s: number, flip: number, over: Partial<MechPose> = {}): MechPose {
  return {
    ...mechBase(t, ws.pal, x, y, s, flip), hollow: false, chest: 0, heart: 0.7 + 0.5 * hb(t), lamp: 0.8, lens: AMBER, glow: 0.9, iris: 0.5, ...over,
  };
}
const SEAS = [
  { n: "Spring", note: "the lanterns bloom back", pal: "spring", t0: 28 },
  { n: "Summer", note: "a sun that gives no heat", pal: "summer", t0: 40 },
  { n: "Autumn", note: "the stars fall like leaves", pal: "autumn", t0: 52 },
  { n: "Winter", note: "the sea holds perfectly still", pal: "winter", t0: 64 },
];

/** the slab, standing on water at distance, with hum rings on the sea */
function slabWorld(c: CanvasRenderingContext2D, x: number, baseY: number, h: number, t: number, hum = 1) {
  if (h < 3) return;
  for (let k = 0; k < 4; k++) {
    const u = (((t * 0.5 + k / 4) % 1) + 1) % 1;
    const rx = Math.max(0.1, h * 0.3 + u * h * 2.4);
    const ry = Math.max(0.1, rx * 0.07);
    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = rgba([180, 200, 255], 0.35 * (1 - u) * hum);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, baseY + 2, rx, ry, 0, 0, TAU);
    c.stroke();
    c.restore();
  }
  drawSlab(c, x, baseY, h * (4 / 9), h, t, { refl: 1, rimA: 0.75, sheen: 0.12 });
}

// ===================================================== 0–17  THE SLAB RISES
function sceneRise(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const ws = makeWorld(t, SPAL.deep);
  ws.pal = { ...SPAL.deep, skyLow: [30, 40, 100], skyMid: [10, 12, 44] };
  const rise = smooth(1.0, 7.5, t);
  ws.lantern.level = 0;
  ws.moon = { x: 420, y: 150, r: 86, alpha: 1, eye: smooth(3, 8, t) * 0.5, dil: 0.5 };
  ws.eyes = kf(t, [[0, 0.2], [8, 0.5]]);
  ws.reflEyes = 0.8;
  ws.stars = 1;
  ws.plankton = 1.2;
  ws.fog = 0.5;
  const camY = kf(t, [[0, 440], [7, 400], [10, 400]]);
  setCam(ws, 640, camY, kf(t, [[0, 1.5], [7.4, 1.0], [9, 1.0]]), 0);
  const phase = t < 9;
  const mx = 300;
  // act 2 (9+): the mech rises out of the water beneath a bloom of lantern-light
  const out = smooth(9.5, 14, t);
  const mechY = BASE4 + (1 - easeOut(out)) * 220;
  if (!phase) {
    const bits = idlePose(t);
    ws.mech = alive(t, ws, mx, mechY, 0.9, 1, { ...bits, alpha: smooth(9.4, 11, t), gaze: [0.8, -0.1], tilt: -0.05 });
    ws.wake = 0.8 * out;
  }
  setCam(ws, t < 9 ? 640 : lerp(640, 700, smooth(9, 16, t)), t < 9 ? camY : 400, t < 9 ? kf(t, [[0, 1.5], [7.4, 1.0]]) : kf(t, [[9, 1.5], [12, 1.15], [17, 1.0]]), 0);
  const hum = spike(t, 4.0, 0.3) + spike(t, 6.2, 0.3);
  ws.behindMech = (c) => {
    const h = 640 * rise;
    slabWorld(c, 980, HZ + 6, h, t, smooth(1.5, 4, t));
    // water pours off it
    if (rise < 0.98 && rise > 0.02) {
      c.save();
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 40; i++) {
        const x = 980 + (hash(i * 2) - 0.5) * h * 0.44;
        const y = HZ + 6 - h * (0.2 + 0.8 * hash(i * 3)) + ((t * 220 * (0.7 + hash(i))) % (h * 0.6));
        c.fillStyle = "rgba(180,220,255,0.35)";
        c.fillRect(x, y, 1.5, 14 + hash(i) * 22);
      }
      c.restore();
    }
  };
  ws.skyFx = (c) => {
    // stars switch off in a perfect rectangle behind the slab
    void c;
  };
  post.exposure = smooth(0, 0.8, t);
  post.ripple = 1;
  post.glitch = Math.max(spike(t, 1.2, 0.1), spike(t, 4.0, 0.1), spike(t, 6.2, 0.1), spike(t, 9.4, 0.12)) * 0.8;
  post.flash = 0.5 * Math.max(spike(t, 4.0, 0.1), spike(t, 6.2, 0.1)) + 0.7 * spike(t, 9.45, 0.12);
  post.chroma = 0.4 + hum;
  post.vig = 1.0;
  finish(ctx, ws, post, 1 + 4 * hum + 3 * smooth(1, 4, t) * (1 - smooth(6, 8, t)));
  risingLights(ctx, t, smooth(10, 14, t) * (1 - smooth(15, 17, t)) * 0.7, AMBER, 0.2);
  chip(ctx, t, 2.2, 6.6, "It Rises", "from the reflected sky", [190, 210, 255]);
  chip(ctx, t, 11, 15.5, "Awake", "a new heart, an old body", [255, 190, 110]);
  hudLine(ctx, "HEART ♥ 44    SLAB ———  4 : 9 : 1", smooth(11, 12, t), 70, 640, [190, 210, 255]);
}

// ======================================== 17–28  TITLE + THE HUM + SKY EYES
function sceneTitle(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const ws = makeWorld(t, SPAL.deep);
  ws.pal = { ...SPAL.deep, skyLow: [40, 50, 120], skyMid: [12, 14, 52] };
  ws.lantern.level = 0;
  ws.moon = { x: 420, y: 150, r: 86, alpha: 1, eye: smooth(17, 24, t), dil: 0.5 };
  ws.eyes = kf(t, [[17, 0.5], [22, 1]]);
  ws.conste = kf(t, [[17, 0.2], [26, 0.9]]);
  ws.reflEyes = 1;
  const k = t - 17;
  const mx = 560 + 90 * smooth(17, 28, t);
  const wp = walkPose(-Math.PI / 2 + (k * 55 * Math.PI) / 108, 1);
  ws.mech = alive(t, ws, mx, BASE4, 0.9, 1, { ...wp, gaze: [0.5, -0.3] });
  ws.wake = 0.8;
  setCam(ws, mx + 110, kf(t, [[17, 400], [28, 360]]), kf(t, [[17, 0.95], [22, 1.1], [28, 1.0]]), kf(t, [[17, 0], [22, 60], [28, 0]]));
  ws.behindMech = (c) => slabWorld(c, mx + 560, HZ + 14, 640 + 20 * Math.sin(t * 3), t, 1);
  post.ripple = 1;
  post.chroma = 0.6;
  post.glitch = 0.4 * spike(t, 22.6, 0.1);
  post.flash = 0.35 * spike(t, 22.6, 0.12);
  finish(ctx, ws, post, 0.6 + 2 * spike(t, 22.6, 0.3));
  drawEpTitle(ctx, t, 18.2, 26.6, ws.pal, "III", "Monolith Season", 170);
}

// ================================================== 28–76  FOUR SEASONS
function sceneSeasons(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const si = Math.min(3, Math.floor((t - 28) / 12));
  const S = SEAS[si];
  const k = t - S.t0; // 0..12
  const pal = SPAL[S.pal];
  const ws = makeWorld(t, pal);
  const prg = (t - 28) / 48; // overall approach
  ws.lantern.level = si === 3 ? 0.55 : 1;
  ws.lantern.reveal = si === 0 ? kf(t, [[28, 0], [38, 1.25]]) : 1.25;
  ws.lantern.breath = 0;
  ws.stars = si === 1 ? 0 : si === 2 ? 0.4 : 1;
  ws.moon = { x: 380, y: 150, r: 86, alpha: si === 1 ? 0 : 1, eye: 0, dil: 0.5 };
  ws.plankton = si === 3 ? 0 : 0.8;
  ws.aurora = si === 3 ? smooth(S.t0, S.t0 + 3, t) : 0;
  ws.eyes = 0.15;
  ws.conste = 0.5;
  ws.fog = si === 3 ? 0.5 : 0.25;
  // walking toward the slab; two angles per season
  const angle = k < 6 ? 0 : 1;
  const mx = 300 + (t - 28) * 38;
  const wp = walkPose(-Math.PI / 2 + ((t - 28) * 38 * Math.PI) / 108, 1);
  ws.mech = alive(t, ws, mx, BASE4, 0.9, 1, { ...wp, gaze: [0.5, -0.1] });
  ws.wake = si === 3 ? 0 : 0.8;
  const camFx = angle === 0 ? mx + 170 : mx + 250;
  const camFy = angle === 0 ? 400 : 420;
  const camZ = angle === 0 ? kf(k, [[0, 0.95], [6, 1.1]]) : kf(k, [[6, 1.2], [12, 1.45]]);
  setCam(ws, camFx, camFy, camZ, angle === 0 ? 20 : -10);
  const slabX = mx + lerp(640, 360, prg);
  const slabH = lerp(420, 900, prg);
  ws.behindMech = (c) => {
    slabWorld(c, slabX, BASE4 - 24 + (1 - prg) * -60, slabH, t, 1);
    if (si === 1) {
      // the sun that is not a sun
      const ang = k / 12;
      const sx = lerp(mx - 400, mx + 900, ang), sy = 130 + Math.sin(ang * Math.PI) * -240 + 190;
      glow(c, sx, sy, 420, [255, 240, 200], 0.3);
      glow(c, sx, sy, 90, [255, 255, 255], 0.9);
    }
  };
  // season FX (screen-space)
  post.ripple = si === 3 ? 0 : 1;
  post.wobble = si === 1 ? 1.4 : 0;
  post.sat = si === 3 ? 0.8 : 1.15;
  post.chroma = 0.35;
  post.bloom = si === 1 ? 0.8 : 0.9;
  post.exposure = si === 1 ? 0.8 : 1;
  const flashT = Math.max(spike(t, S.t0 + 0.05, 0.09), 0);
  post.flash = 0.8 * flashT;
  post.glitch = flashT * 0.8;
  post.zoomBlur = 0.2 * flashT;
  finish(ctx, ws, post, 0.5 + 6 * flashT);
  if (si === 0) {
    // blossom / petal drift + lantern bloom
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 90; i++) {
      const x = ((hash(i * 3.1) * 1500 + k * 90 * (0.5 + hash(i)) + t * 12) % 1500) - 110;
      const y = ((hash(i * 7.7) * 900 + k * 70 * (0.5 + hash(i + 3))) % 800) - 60;
      ctx.fillStyle = `rgba(255,${150 + hash(i) * 70},${190 + hash(i + 2) * 50},${0.4 + 0.4 * hash(i + 4)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + hash(i) * 5, 3, t + i, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    risingLights(ctx, t, 0.7, [255, 190, 150], 0.3);
  } else if (si === 1) {
    // heat shimmer streaks + time-lapse light sweep
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sweep = (k / 12) * (W + 600) - 300;
    const g = ctx.createLinearGradient(sweep - 160, 0, sweep + 160, 0);
    g.addColorStop(0, "rgba(255,240,200,0)");
    g.addColorStop(0.5, "rgba(255,240,200,0.05)");
    g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (si === 2) {
    drawMeteors(ctx, t, 52, 64);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 70; i++) {
      const x = ((hash(i * 3.3) * 1400 - k * 60 + 1400) % 1400) - 60 + Math.sin(t * 2 + i) * 30;
      const y = ((hash(i * 5.7) * 900 + k * 180 * (0.5 + hash(i))) % 800) - 40;
      ctx.fillStyle = `rgba(255,${100 + hash(i) * 90},40,0.75)`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2 + i);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(6, 0, 0, 8);
      ctx.quadraticCurveTo(-6, 0, 0, -7);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else {
    marineSnow(ctx, t, t * 60, t * -40, 1.3, [235, 248, 255], 160);
    // frost cracks spreading across the frozen sea
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 440, W, 280);
    ctx.clip();
    ctx.strokeStyle = `rgba(230,248,255,${0.4 * smooth(S.t0, S.t0 + 4, t)})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      let x = hash(i * 3) * W, y = 440 + hash(i * 5) * 260;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const len = Math.floor(14 * smooth(S.t0, S.t0 + 6, t));
      for (let j = 0; j < len; j++) {
        x += (noise(i * 9 + j * 0.6) * 60);
        y += noise(i * 4 + j * 0.9 + 20) * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // season chip
  chip(ctx, t, S.t0 + 0.3, S.t0 + 4.8, S.n, S.note, mix3(pal.lit, [255, 255, 255], 0.2));
  hudLine(ctx, `YEAR ${String(si * 3 + Math.floor(k / 4) + 1).padStart(2, "0")}    SLAB ${String(Math.round(lerp(940, 80, prg))).padStart(4, "0")} M`, 0.9, 70, 640, [190, 210, 255]);
}

// ============================================ 76–86  THE MOTHER DESCENDS
function sceneMother(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const ws = makeWorld(t, SPAL.deep);
  ws.pal = { ...SPAL.cosmos };
  const k = t - 76;
  ws.lantern.level = 0;
  ws.stars = 1;
  ws.starsOut = 0;
  ws.eyes = 0.9;
  ws.moon = { x: 380, y: 150, r: 86, alpha: 0.8, eye: 1, dil: 0.5 };
  ws.mother = {
    x: 640, y: kf(t, [[76, -700], [86, -190]]), size: kf(t, [[76, 380], [86, 560]]), rot: 0, t, flap: t * 0.8, amp: 0.6, alpha: 1,
    glow: 0.5 + 0.4 * smooth(80, 86, t), eyes: 0.7, maw: 0, map: smooth(79, 83, t), heartStar: 1,
    skin: [58, 50, 84], skinDark: [14, 10, 32], light: GOLD, look: [0, 0.8],
  };
  ws.beams = smooth(78, 84, t) * 0.7;
  setCam(ws, 640, kf(t, [[76, 220], [86, 330]]), kf(t, [[76, 1.0], [86, 0.9]]), kf(t, [[76, 150], [86, 20]]));
  ws.mech = alive(t, ws, 340, BASE4, 0.8, 1, { ...idlePose(t), gaze: [0.4, -1], tilt: -0.2 });
  ws.behindMech = (c) => slabWorld(c, 960, HZ + 14, 700, t, 1);
  post.chroma = 0.6;
  post.vig = 1.0;
  post.flash = 0.2 * spike(t, 81, 0.2);
  finish(ctx, ws, post, 1 + 2 * smooth(80, 86, t));
  chip(ctx, t, 77, 82.5, "Mother", "she came to read it too", [255, 214, 150]);
  void k;
}

// ================================================ 86–112  THE SECOND FIGURE
// the child, drawn in the same units as the Star Catcher's portrait
export const CHILD: V2[] = [
  [-0.275, -0.012], [-0.275, 0.025], [-0.275, 0.115], // 0 head 1 shoulder 2 hip
  [-0.205, 0.06], [-0.335, 0.075], // 3 reaching hand, 4 free hand
  [-0.3, 0.205], [-0.245, 0.205], // 5,6 feet
  [-0.275, 0.05], // 7 chest star
];
export const CHILD_EDGES: [number, number][] = [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [2, 6]];

function sceneBelly(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 86;
  const S = 1180;
  const cam = { x: lerp(60, -90, smooth(86, 112, t)), y: lerp(-30, 10, smooth(86, 112, t)) };
  const zoom = kf(t, [[86, 1.0], [96, 1.15], [104, 1.35], [112, 1.5]]);
  // skin
  const g = ctx.createRadialGradient(640, 360, 40, 640, 360, 900);
  g.addColorStop(0, "rgb(34,28,60)");
  g.addColorStop(0.6, "rgb(14,10,32)");
  g.addColorStop(1, "rgb(2,2,10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // veins / skin lines
  ctx.save();
  ctx.strokeStyle = "rgba(120,110,190,0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 40) {
      const y = 40 + i * 28 + Math.sin(x * 0.006 + i * 0.7 + t * 0.2) * 30 + noise(x * 0.01 + i) * 24;
      x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  starfield(ctx, t, 0.3, { n: 90, seed: 12 });
  withCam(ctx, 640 - cam.x * 0.6, 380 - cam.y * 0.6, zoom, 0.04 * Math.sin(t * 0.3), () => {
    const P = (p: V2): V2 => [640 + p[0] * S, 380 + p[1] * S];
    // the Star Catcher's portrait (known from Ep. I)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const draw = smooth(86, 90, t);
    MAP_EDGES.forEach(([a, b], i) => {
      const A = P(MAP_PTS[a]), B = P(MAP_PTS[b]);
      const u = clamp(draw * MAP_EDGES.length - i);
      ctx.strokeStyle = rgba(GOLD, 0.35 * u);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(lerp(A[0], B[0], u), lerp(A[1], B[1], u));
      ctx.stroke();
    });
    MAP_PTS.forEach((p, i) => {
      const [x, y] = P(p);
      const a = smooth(86 + i * 0.1, 87.5 + i * 0.1, t) * (0.6 + 0.4 * Math.sin(t * 2 + i));
      glow(ctx, x, y, i === 8 ? 54 : 26, i === 8 ? [255, 240, 200] : GOLD, a);
    });
    // the second figure draws itself, star by star, each with a bell
    const cStart = 94;
    const total = CHILD_EDGES.length;
    const cp = smooth(cStart, cStart + 8, t);
    const handL = P(MAP_PTS[6]);
    CHILD_EDGES.forEach(([a, b], i) => {
      const A = P(CHILD[a]), B = P(CHILD[b]);
      const u = clamp(cp * (total + 1) - i);
      ctx.strokeStyle = rgba([180, 230, 255], 0.55 * u);
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(lerp(A[0], B[0], u), lerp(A[1], B[1], u));
      ctx.stroke();
    });
    // the hand-hold: a thread between the two figures
    const hold = clamp(cp * (total + 1) - total);
    const ch = P(CHILD[3]);
    ctx.strokeStyle = rgba([255, 255, 255], 0.9 * hold);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ch[0], ch[1]);
    ctx.lineTo(lerp(ch[0], handL[0], hold), lerp(ch[1], handL[1], hold));
    ctx.stroke();
    CHILD.forEach((p, i) => {
      const [x, y] = P(p);
      const a = smooth(cStart + i * 0.9, cStart + i * 0.9 + 0.6, t) * (0.7 + 0.3 * Math.sin(t * 3 + i));
      glow(ctx, x, y, i === 7 ? 70 : 30, i === 7 ? [255, 255, 255] : [160, 220, 255], a);
      if (a > 0.05) ring(ctx, x, y, 14 + ((t - cStart - i * 0.9) % 2) * 30, [180, 230, 255], 0.5 * (1 - ((t - cStart - i * 0.9) % 2) / 2) * a, 1.5);
    });
    // the Catcher's chest star answers the child's
    glow(ctx, P(MAP_PTS[8])[0], P(MAP_PTS[8])[1], 90 * (0.7 + 0.3 * hb(t)), [255, 246, 220], 0.9 * smooth(100, 103, t));
    ctx.restore();
    // the baby flies through and settles into the child's place
    const bu = smooth(104, 111, t);
    if (t > 103) {
      const home = P(CHILD[7]);
      const bx = lerp(1700, home[0], easeOut(bu));
      const by = lerp(-200, home[1] - 10, easeOut(bu)) + Math.sin(bu * 8) * 40 * (1 - bu);
      drawBaby(ctx, { x: bx, y: by, size: lerp(120, 66, bu), t, pal: SPAL.cosmos, glow: 1.1, eyes: 1, rot: lerp(0.9, 0, bu), look: [-0.5, 0] });
    }
  });
  hudLine(ctx, "CONSTELLATION  ·  FIGURES 1", smooth(88, 89, t) * (1 - smooth(94, 94.4, t)), 70, 640, [255, 214, 150]);
  hudLine(ctx, "CONSTELLATION  ·  FIGURES 2   ·   SMALLER", smooth(94.6, 95.4, t), 70, 640, [160, 220, 255]);
  chip(ctx, t, 96.5, 102, "The second figure", "this one is a child", [180, 230, 255]);
  post.bloom = 1.3;
  post.chroma = 0.5;
  post.vig = 1.0;
  post.flash = 0.3 * spike(t, 100.8, 0.1) + 0.25 * spike(t, 103.2, 0.1);
  post.hue = 0.05 * Math.sin(t * 0.6);
  void k;
}

// ================================================= 112–124  THE REFLECTION
function sceneFace(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 112;
  const ws = makeWorld(t, SPAL.deep);
  ws.pal = { ...SPAL.deep, skyLow: [40, 50, 120] };
  ws.lantern.level = 0;
  ws.stars = 0.8;
  ws.eyes = 0.6;
  ws.moon = { x: 300, y: 130, r: 80, alpha: 1, eye: 0.3, dil: 0.5 };
  const mx = 560;
  const reach = smooth(116, 122, t);
  const bits = idlePose(t);
  const hands: [V2, V2] = [bits.hands[0], [lerp(bits.hands[1][0], 190, reach), lerp(bits.hands[1][1], -250, reach)]];
  ws.mech = alive(t, ws, mx, BASE4, 1.0, 1, { ...bits, hands, lean: 0.1 * reach, gaze: [0.8, 0] });
  ws.wake = 0.6;
  const zoom = kf(t, [[112, 0.9], [116, 1.3], [122, 2.2], [124, 2.5]]);
  setCam(ws, kf(t, [[112, 760], [124, 820]]), kf(t, [[112, 330], [124, 270]]), zoom, 0);
  const slabX = 960;
  ws.behindMech = (c) => {
    slabWorld(c, slabX, BASE4 - 18, 900, t, 1);
    // the slab's polished face shows a distorted mech, then something that isn't him
    const w = 900 * 4 / 9;
    c.save();
    c.beginPath();
    c.rect(slabX - w / 2, BASE4 - 18 - 900, w, 900);
    c.clip();
    c.globalAlpha = 0.5;
    c.translate(slabX, 0);
    c.scale(-1 * (1.3 + 0.1 * Math.sin(t)), 1.3);
    drawMech(c, { ...ws.mech!, x: -30, y: (BASE4 - 18 - 150) / 1.3 + 40, s: 0.9, flip: 1, alpha: 0.7 * (1 - smooth(120, 123, t)) });
    c.restore();
    glow(c, slabX - w / 2 + 10, BASE4 - 330, 160, [190, 210, 255], 0.5 * reach);
  };
  post.vig = 1.1;
  post.chroma = 0.5 + 0.8 * spike(t, 122.4, 0.4);
  post.flash = 0.4 * spike(t, 122.4, 0.1);
  post.glitch = 0.6 * spike(t, 122.4, 0.12);
  finish(ctx, ws, post, 0.5);
  chip(ctx, t, 113, 118, "Contact", "", [190, 210, 255]);
  void k;
}

// ============================================= 124–140  VISION TUNNEL
function drawVisionItem(ctx: CanvasRenderingContext2D, t: number, a: number, which: number) {
  const cx = 640, cy = 360;
  ctx.save();
  ctx.globalAlpha = a;
  if (which === 0) {
    // a star, falling, crying
    const u = prog(t, 124.3, 128);
    const x = lerp(1000, 330, u), y = lerp(80, 560, u);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gr = ctx.createLinearGradient(x, y, x + 400, y - 330);
    gr.addColorStop(0, "rgba(255,255,255,0.9)");
    gr.addColorStop(1, "rgba(120,170,255,0)");
    ctx.strokeStyle = gr;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 400, y - 330);
    ctx.stroke();
    ctx.restore();
    glow(ctx, x, y, 140, [220, 240, 255], 1);
    drawEye(ctx, x, y, 22, 1, [200, 230, 255], [0, 0.5], 0.14, 0.95);
  } else if (which === 1) {
    // the Catcher built from stars
    ctx.globalCompositeOperation = "lighter";
    const S = 900;
    MAP_EDGES.forEach(([i, j]) => {
      ctx.strokeStyle = rgba(GOLD, 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + MAP_PTS[i][0] * S, cy + MAP_PTS[i][1] * S);
      ctx.lineTo(cx + MAP_PTS[j][0] * S, cy + MAP_PTS[j][1] * S);
      ctx.stroke();
    });
    MAP_PTS.forEach((p, i) => glow(ctx, cx + p[0] * S, cy + p[1] * S, i === 8 ? 10 + 70 * smooth(129.5, 131, t) : 24, i === 8 ? [255, 255, 255] : GOLD, i === 8 ? smooth(129.5, 131, t) : 0.9));
  } else if (which === 2) {
    drawBaby(ctx, { x: cx, y: cy, size: 190 + 10 * Math.sin(t * 3), t, pal: SPAL.vision, glow: 1.2, eyes: 1, map: 1 });
  } else {
    // the heart, and the rectangle around it
    ctx.globalCompositeOperation = "lighter";
    const hv = 0.6 + 0.6 * hb(t);
    glow(ctx, cx, cy, 240 * hv, AMBER, 0.9);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const an = (i / 16) * TAU - Math.PI / 2;
      const r = (i % 2 ? 24 : 60) * (0.8 + 0.3 * hv);
      i ? ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r) : ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,244,214,0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(190,210,255,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 120, cy - 270, 240, 540);
  }
  ctx.restore();
}

function sceneVision(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  ctx.fillStyle = "#02010a";
  ctx.fillRect(0, 0, W, H);
  // a tunnel of rings rushing at the viewer
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const speed = 0.3 + 0.2 * smooth(124, 140, t);
  for (let i = 0; i < 34; i++) {
    const u = (((i / 34 + t * speed) % 1) + 1) % 1;
    const r = Math.max(0.1, Math.pow(u, 2.4) * 1000);
    const hue = (i * 0.07 + t * 0.1) % 1;
    const col: RGB = [150 + 100 * Math.sin(hue * TAU), 150 + 100 * Math.sin(hue * TAU + 2.1), 220];
    ctx.strokeStyle = rgba(col, 0.5 * Math.sin(u * Math.PI));
    ctx.lineWidth = 1 + u * 7;
    ctx.beginPath();
    ctx.ellipse(640, 360, Math.max(0.1, r * 1.4), Math.max(0.1, r * 0.8), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  speedLines(ctx, t, 0.9, 0, [200, 190, 255], 640, 360);
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * TAU + t * 0.2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(210,200,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(640 + Math.cos(an) * 80, 360 + Math.sin(an) * 50);
    ctx.lineTo(640 + Math.cos(an) * 1000, 360 + Math.sin(an) * 700);
    ctx.stroke();
    ctx.restore();
  }
  glow(ctx, 640, 360, 300, [200, 190, 255], 0.5);
  // the visions: one every 4 seconds, each arriving on a hard cut
  for (let v = 0; v < 4; v++) {
    const a0 = 124.3 + v * 3.9;
    const a = smooth(a0, a0 + 0.2, t) * (1 - smooth(a0 + 3.2, a0 + 3.8, t));
    if (a > 0.01) drawVisionItem(ctx, t, a, v);
  }
  const kc = [124.3, 128.2, 132.1, 136.0].reduce((m, c) => Math.max(m, spike(t, c + 0.15, 0.3)), 0);
  post.kaleido = kc > 0.3 ? 6 : 0;
  post.kRot = t * 0.15;
  post.swirl = 0.5 * Math.sin(t * 0.7);
  post.zoomBlur = 0.12;
  post.chroma = 1.0;
  post.hue = 0.2 * Math.sin(t * 0.5);
  const cut = [124.3, 128.2, 132.1, 136.0].reduce((m, c) => Math.max(m, spike(t, c, 0.08)), 0);
  post.flash = 0.55 * cut + 0.8 * spike(t, 124.05, 0.1);
  post.glitch = 0.7 * cut;
  chip(ctx, t, 125, 129, "He remembers", "", [200, 190, 255]);
  chip(ctx, t, 133, 138, "Or is told", "", [200, 190, 255]);
}

// ============================================== 140–150  THE DOOR
function sceneDoor(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 140;
  const ws = makeWorld(t, SPAL.cosmos);
  ws.lantern.level = 0;
  ws.stars = 1;
  ws.eyes = 0.8;
  ws.moon = { x: 300, y: 130, r: 80, alpha: 1, eye: 0.5, dil: 0.5 };
  const mx = 560;
  ws.mech = alive(t, ws, mx, BASE4, 1.0, 1, { ...idlePose(t), gaze: [1, -0.3], tilt: -0.05 });
  ws.wake = 0.4;
  ws.beams = 0.3;
  const open = smooth(142, 146, t);
  setCam(ws, 780, 340, kf(t, [[140, 1.5], [146, 1.05], [150, 0.95]]), 0);
  ws.behindMech = (c) => {
    const x = 960, base = BASE4 - 18, h = 900, w = 400;
    // doorway of white light splitting the face
    const g = c.createLinearGradient(x, base - h, x, base);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(190,210,255,1)");
    drawSlab(c, x - open * 90, base, w / 2 - 6 + 0, h, t, { rimA: 0.9 });
    drawSlab(c, x + w / 2 + open * 90, base, w / 2 - 6, h, t, { rimA: 0.9 });
    c.save();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = g;
    c.globalAlpha = open;
    c.fillRect(x - 6 - open * 70, base - h, 12 + open * 140, h);
    c.restore();
    glow(c, x + 100, base - 400, 900 * open, [230, 235, 255], 0.9 * open);
    // god rays out of the door toward the mech
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `rgba(220,230,255,${0.07 * open})`;
      c.beginPath();
      c.moveTo(x + 100, base - 360);
      c.lineTo(x - 900, base - 560 + i * 120);
      c.lineTo(x - 900, base - 520 + i * 120);
      c.fill();
    }
    c.restore();
  };
  post.exposure = 1 + 0.2 * open;
  post.bloom = 1.3;
  post.chroma = 0.6;
  post.flash = 0.3 * spike(t, 142.2, 0.2);
  post.glitch = 0.4 * spike(t, 142.2, 0.1);
  post.zoomBlur = 0.1 * spike(t, 142.2, 0.3);
  finish(ctx, ws, post, 1 + 3 * open * (1 - open));
  // the sea is pulled upward into the door
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 80; i++) {
    const u = ((hash(i * 3) + t * 0.5 * (0.5 + hash(i))) % 1);
    const x = lerp(hash(i * 5) * W, 820, u);
    const y = lerp(HZ + 150 + hash(i) * 120, 360, u);
    glow(ctx, x, y, 8 * (1 - u) + 2, [200, 225, 255], 0.5 * open * (1 - u));
  }
  ctx.restore();
  chip(ctx, t, 143, 148, "It opens", "", [220, 230, 255]);
  void k;
}

// ================================================ 150–168  THE RISE (action)
function sceneRiseUp(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 150;
  const ws = makeWorld(t, SPAL.cosmos);
  const hgt = Math.pow(k / 18, 1.7) * 3300 + k * 120;
  ws.pal = SPAL.cosmos;
  ws.lantern.level = 0;
  ws.stars = 1;
  ws.starsOut = 0;
  ws.eyes = 0.6 + 0.4 * smooth(154, 166, t);
  ws.cloud = smooth(152, 160, t) * 0.8;
  ws.moon = { x: 380, y: 130, r: 80, alpha: 1, eye: 0.6, dil: 0.5 };
  ws.wake = 0.3;
  const run = k > 8; // he starts to run once the climb is violent
  const wp = walkPose(t * 16, 1);
  ws.mech = alive(t, ws, 640, BASE4 - hgt, 0.85, 1, run ? { ...wp, lean: 0.12, gaze: [0, -1] } : { ...idlePose(t), gaze: [0, -1] });
  ws.cam.x = 0;
  ws.cam.y = hgt - 10;
  ws.cam.zoom = kf(t, [[150, 1.3], [158, 1.0], [168, 0.85]]);
  ws.cam.tilt = kf(t, [[150, 30], [160, 90], [168, 40]]);
  ws.behindMech = (c) => {
    // the slab is a column of night beneath his feet
    const w = 250;
    c.fillStyle = "#000";
    c.fillRect(640 - w / 2, BASE4 - hgt, w, hgt + 4000);
    c.strokeStyle = "rgba(190,210,255,0.7)";
    c.lineWidth = 2;
    c.strokeRect(640 - w / 2, BASE4 - hgt, w, hgt + 4000);
    glow(c, 640, BASE4 - hgt, 360, [190, 210, 255], 0.35);
  };
  const sh = 3 + 5 * smooth(152, 166, t);
  post.zoomBlur = 0.04 + 0.1 * smooth(150, 164, t);
  post.chroma = 0.8;
  post.bloom = 1.2;
  post.flash = 0.9 * spike(t, 150.1, 0.15);
  post.glitch = 0.5 * spike(t, 150.1, 0.1);
  finish(ctx, ws, post, sh);
  speedLines(ctx, t, 0.9 * smooth(150, 156, t), Math.PI / 2, [190, 210, 255]);
  // the lanterns come with him
  risingLights(ctx, t, 0.8, [255, 200, 130], 0.3);
  chip(ctx, t, 151, 155, "Up", "", [190, 210, 255], 84, 140);
  hudLine(ctx, `ALT ${String(Math.round(hgt * 0.4)).padStart(5, "0")} M    HEART ♥ ${Math.round(70 + 50 * smooth(150, 166, t))}`, 1, 70, 640, [255, 214, 150]);
  void mechAnchors;
}

// ======================================== 168–180  THE EYE IN THE DOOR
function sceneEye(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 168;
  ctx.fillStyle = "#020208";
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, t, 1, { n: 220, seed: 7 });
  const grow = smooth(168, 176, t);
  // the doorway: a vertical bar of white that the eye fills
  const dw = 120 + 360 * grow;
  const g = ctx.createLinearGradient(640 - dw, 0, 640 + dw, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, `rgba(255,255,255,${0.9 * grow})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(640 - dw, 0, dw * 2, H);
  glow(ctx, 640, 360, 500 + 300 * grow, [190, 200, 255], 0.6 * grow);
  // a huge eye opens in the light, and in its iris: a belly map, and a small figure holding a hand
  const open = smooth(170, 174, t);
  const R = lerp(60, 420, easeOut(grow));
  drawEye(ctx, 640, 360, R, open, [255, 214, 150], [0, 0.0], 0.1, 1);
  // silhouette of the mech below, tiny
  const pose = { ...idlePose(t), x: 640, y: 690, s: 0.5, lens: AMBER, glow: 0.9, t, pal: SPAL.cosmos, hollow: false, heart: 0.7 + 0.5 * hb(t), chest: 0, lamp: 0.8, iris: 0.5, gaze: [0, -1] as V2, tilt: -0.3 } as MechPose;
  drawMech(ctx, pose);
  // grown shadow of a manta passes across the eye
  const fly = prog(t, 172.5, 177);
  if (fly > 0 && fly < 1) drawBaby(ctx, { x: lerp(1400, -200, fly), y: 300 + Math.sin(fly * 5) * 40, size: 120 + 160 * Math.sin(fly * Math.PI), t, pal: SPAL.cosmos, glow: 1, eyes: 1, rot: 0.2, alpha: 0.9 });
  post.bloom = 1.4;
  post.chroma = 0.5 + 0.6 * spike(t, 172, 0.5);
  post.flash = 0.4 * spike(t, 170, 0.15) + 0.3 * spike(t, 174, 0.15);
  post.exposure = 1 - smooth(178.6, 180, t);
  const sh = shake(t, 1 + 3 * spike(t, 174, 0.4));
  ctx.translate(sh[0], sh[1]);
  chip(ctx, t, 168.4, 172.5, "Someone is coming back", "", [255, 214, 150], 84, 140);
  drawToBeContinued(ctx, t, 175.2, SPAL.cosmos, "TO BE CONTINUED", "EPISODE IV  ·  THE STAR CHILD");
  void k;
}

// ===================================================================== film
export function renderEp3(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  ctx.save();
  try {
    if (t < 17) sceneRise(ctx, t, post);
    else if (t < 28) sceneTitle(ctx, t, post);
    else if (t < 76) sceneSeasons(ctx, t, post);
    else if (t < 86) sceneMother(ctx, t, post);
    else if (t < 112) sceneBelly(ctx, t, post);
    else if (t < 124) sceneFace(ctx, t, post);
    else if (t < 140) sceneVision(ctx, t, post);
    else if (t < 150) sceneDoor(ctx, t, post);
    else if (t < 168) sceneRiseUp(ctx, t, post);
    else sceneEye(ctx, t, post);
  } finally {
    ctx.restore();
  }
}
