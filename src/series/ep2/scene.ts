import { RGB, TAU, clamp, hash, kf, lerp, mix3, noise, rgba, smooth } from "../../film/util";
import { glow } from "../../film/look";
import { PostParams } from "../../film/post";
import { MechPose, drawMech, idlePose, mechAnchors, walkPose } from "../../film/mech";
import { BASE4, WorldState, drawWorld, horizonY, makeWorld } from "../../film/world";
import { PALS } from "../../film/look";
import { AMBER, COLD, GOLD, drawNet, mechBase, shake } from "../../film/scenes/common";
import { drawEye } from "../../film/manta";
import {
  H, W, SPAL, chip, darkness, deepGradient, drawCockpit, drawEpTitle, drawHunter, drawLantern, drawRoots, drawSeabed,
  drawSlab, drawSurface, drawToBeContinued, godRays, hudLine, marineSnow, ring, spike, speedLines, starfield, withCam,
} from "../fx";
import { easeOut, prog, pulseAt, step } from "../beat";
import { BEATS2 } from "./beats";

const hb = (t: number) => pulseAt(BEATS2, t);
const DEEP = SPAL.deep;
type Post = PostParams;

// ----------------------------------------------------------------- helpers
function mp(t: number, over: Partial<MechPose>): MechPose {
  return {
    x: 0, y: 0, s: 1, ...idlePose(t), lens: COLD, glow: 0.8, t, pal: DEEP, iris: 0.4, lamp: 0, heart: 0, hollow: true, chest: 1, ...over,
  } as MechPose;
}

/** draw the mech about its body centre */
function mechC(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, rot: number, pose: MechPose) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  drawMech(ctx, { ...pose, x: 0, y: 200 * s, s });
  ctx.restore();
}

function setCam(ws: WorldState, fx: number, fy: number, zoom: number, tilt: number) {
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

/** the true sky as seen through the mirror ceiling: violet, starry, and full of eyes */
function trueSky(t: number, eyes: number, stars = 1, slab = 0) {
  return (c: CanvasRenderingContext2D, y: number) => {
    const g = c.createLinearGradient(0, 0, 0, y);
    g.addColorStop(0, "rgb(2,4,18)");
    g.addColorStop(1, "rgb(44,40,100)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, y);
    starfield(c, t, stars, { n: 190, maxY: Math.max(10, y), seed: 4 });
    for (let i = 0; i < 16; i++) {
      const ex = 90 + hash(i * 2.9) * 1100;
      const ey = y * (0.12 + hash(i * 4.3) * 0.8);
      const blink = 1 - Math.pow(Math.max(0, Math.sin(t * 0.7 + i * 2.1)), 40);
      drawEye(c, ex, ey, 16 + hash(i) * 22, eyes * blink, [190, 230, 255], [Math.sin(t * 0.4 + i) * 0.6, 0.4], 0.14, 0.9);
    }
    if (slab > 0.01) {
      // the black rectangle swallowing the stars
      const w = 110 * slab, h = 250 * slab;
      drawSlab(c, 640, y + 2, w, h, t, { alpha: 1, rimA: 0.8 });
      for (let k = 0; k < 3; k++) ring(c, 640, y - h * 0.5, 80 + ((t * 120 + k * 120) % 360), [190, 210, 255], 0.35 * (1 - ((t * 120 + k * 120) % 360) / 360) * slab, 2, 1.6);
    }
  };
}

/** the common underwater look */
function water(
  ctx: CanvasRenderingContext2D, t: number,
  o: { depth: number; camX: number; camY: number; surfY?: number | null; sky?: (c: CanvasRenderingContext2D, y: number) => void; rays?: number; roots?: number; snow?: number; layers?: number },
) {
  deepGradient(ctx, o.depth);
  if ((o.roots ?? 1) > 0) drawRoots(ctx, t, o.camX, o.camY, { layers: o.layers ?? 4, dark: o.depth, litA: 0.1 * (o.roots ?? 1) });
  if (o.surfY != null) drawSurface(ctx, t, o.surfY, o.sky, 1 - o.depth * 0.5);
  godRays(ctx, t, o.rays ?? clamp(1 - o.depth * 1.6) * 1.2, o.surfY != null ? Math.max(-200, o.surfY - 20) : -40);
  marineSnow(ctx, t, o.camX, o.camY, o.snow ?? 1, [200, 240, 255], 120);
}

/** sonar light-reveal: dark everywhere except a travelling ring */
function sonarDark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  const R = Math.max(40, r + 30);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  const s1 = clamp((r - 190) / R);
  const s2 = clamp((r - 40) / R);
  g.addColorStop(0, `rgba(0,2,8,${a * 0.78})`);
  g.addColorStop(s1, `rgba(0,2,8,${a * 0.85})`);
  g.addColorStop(Math.max(s1 + 0.001, s2), "rgba(0,2,8,0.02)");
  g.addColorStop(Math.min(1, Math.max(s2 + 0.002, 0.999)), `rgba(0,2,8,${a})`);
  g.addColorStop(1, `rgba(0,2,8,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

const depthM = (y: number) => Math.max(0, Math.round(y / 6));
const pad4 = (n: number) => String(n).padStart(4, "0");

// ======================================================= 0–16  WAKE (shore)
function shoreWorld(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const pal = PALS.drown;
  const ws = makeWorld(t, pal);
  const ignite = smooth(0.45, 0.6, t);
  const walk = smooth(7.2, 8.2, t) * (1 - smooth(11.2, 12, t));
  const dist = kf(t, [[7.2, 0], [11.6, 330], [16, 330]]);
  const phase = -Math.PI / 2 + (dist * Math.PI) / 108;
  const w = walk;
  const idle = idlePose(t);
  const wp = walkPose(phase, 1);
  const mix = <T extends [number, number]>(a: T, b: T, k: number): T => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] as T;
  const looking = smooth(11.4, 12.4, t);
  const reach = smooth(12.8, 14.6, t);
  const bits = {
    feet: [mix(idle.feet[0], wp.feet[0], w), mix(idle.feet[1], wp.feet[1], w)] as MechPose["feet"],
    hands: [
      mix(mix(idle.hands[0], wp.hands[0], w), [-60, -110], reach * 0.6),
      mix(mix(idle.hands[1], wp.hands[1], w), [150, -34], reach),
    ] as MechPose["hands"],
    bob: lerp(idle.bob ?? 0, wp.bob ?? 0, w),
    lean: lerp(idle.lean ?? 0, wp.lean ?? 0, w) + 0.1 * reach,
  };
  const mx = 640 + dist;
  const mech: MechPose = {
    ...mechBase(t, pal, mx, BASE4, 1.0, 1), ...bits,
    lens: mix3([150, 160, 240], COLD, ignite), glow: ignite * (0.85 + 0.15 * Math.sin(t * 20)), iris: lerp(0.5, 0.2, ignite),
    gaze: [0.2 * looking, 0.9 * looking], tilt: 0.28 * looking, lamp: 0, hollow: true, heart: 0, chest: 1,
  };
  ws.mech = mech;
  ws.wake = 0.2 + 0.8 * ignite;
  ws.starsOut = 0;
  ws.stars = 0.85;
  ws.moon = { x: 800, y: 168, r: 94, alpha: 0.75, eye: smooth(9, 12, t) * 0.7, dil: 0.5 };
  ws.lantern.off = 1.2; ws.lantern.level = 0;
  const blink = 1 - Math.pow(Math.max(0, Math.sin(t * 1.3)), 30) * 0.9;
  ws.reflEyes = kf(t, [[0, 1], [10, 1], [14, 1]]) * blink;
  ws.plankton = kf(t, [[0, 2], [2, 0.5], [12, 1.4]]);
  ws.fog = 0.6;
  // camera: from a tight lens close-up, pull back fast, then track
  const lensY = BASE4 - 300;
  const fx = t < 7.4 ? kf(t, [[0, 640], [4.5, 640], [7.4, 700]]) : mx + 90 * w;
  const fy = kf(t, [[0, lensY], [3.2, lensY + 30], [7, 380], [11, 400], [12.5, 470], [16, 500]]);
  const zoom = kf(t, [[0, 3.4], [2.4, 3.0], [3.4, 1.5], [7.4, 1.1], [12, 1.4], [13.6, 2.0], [14.9, 2.9]]);
  setCam(ws, fx, fy, zoom, 0);
  // the reflection reaches back: rings on the water
  ws.behindMech = (c) => {
    if (t < 12.6) return;
    const hy = mechAnchors(mech).handR;
    for (let k = 0; k < 4; k++) {
      const u = (((t - 12.8) * 0.9 + k / 4) % 1 + 1) % 1;
      const rx = Math.max(0.1, 20 + u * 120);
      const ry = Math.max(0.1, 3 + u * 16);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.strokeStyle = rgba([150, 230, 255], 0.55 * (1 - u) * smooth(12.6, 13.4, t));
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(hy[0], BASE4 + 4, rx, ry, 0, 0, TAU);
      c.stroke();
      c.restore();
    }
    glow(c, hy[0], BASE4 + 10, 60 + 80 * reach, [160, 235, 255], 0.5 * reach);
  };
  post.exposure = smooth(0, 0.35, t) * (1 - smooth(15.2, 15.5, t));
  post.ripple = 1;
  post.vig = 1.0;
  post.flash = 0.45 * spike(t, 0.52, 0.15) + 0.55 * spike(t, 15.35, 0.16);
  post.glitch = Math.max(spike(t, 0.52, 0.12), spike(t, 14.9, 0.2), spike(t, 15.3, 0.12)) * 0.9;
  post.chroma = 0.35 + 1.2 * spike(t, 0.52, 0.4) + 0.8 * spike(t, 15.3, 0.4);
  post.zoomBlur = 0.1 * spike(t, 3.0, 0.5) + 0.25 * spike(t, 15.3, 0.3);
  finishWorld(ctx, ws, post, 0.4 + 5 * spike(t, 0.52, 0.25) + 3 * spike(t, 15.3, 0.3));
  chip(ctx, t, 4.2, 7, "Day One, Below", "after the last heartbeat", [150, 235, 255]);
}

// ================================================== 16–30  PLUNGE (the surface)
function scenePlunge(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const my = kf(t, [[16, -420], [18.2, 0], [20.5, 240], [24, 700], [30, 1900]]);
  const cut = step(t, [[16, 0], [22.4, 1]]);
  // cut 0: camera below, looking up at the mirror as he falls through. cut 1: side, he's falling fast
  const camY = cut === 0 ? kf(t, [[16, 80], [18.2, 120], [21, 260]]) + 20 : my - 40;
  const surfY = H / 2 + (0 - camY);
  water(ctx, t, {
    depth: clamp(my / 2600), camX: 0, camY, surfY: cut === 0 ? surfY : surfY, sky: trueSky(t, 1, 1),
    rays: kf(t, [[16, 1.3], [24, 0.7], [30, 0.2]]), snow: 1.3,
  });
  const lens = COLD;
  const sinkRot = cut === 0 ? kf(t, [[16, 0.2], [18.2, 0.05], [22, -0.1]]) : 0.18 * Math.sin(t * 0.8) + 0.08;
  const sy = cut === 0 ? H / 2 + (my - camY) : H / 2 + 40;
  const s = cut === 0 ? 0.62 : 0.5;
  const pose = mp(t, {
    feet: [[-26, 34 + 12 * Math.sin(t * 5)], [26, 24 - 10 * Math.sin(t * 5)]],
    hands: [[-84, -300 + 8 * Math.sin(t * 4)], [84, -308 - 8 * Math.sin(t * 4)]],
    bob: 0, lean: -0.06, lens, glow: 1, iris: 0.2, tilt: -0.2, gaze: [0, -1],
  });
  // bubbles streaming from the plunge
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 70; i++) {
    const u = ((t * (0.8 + hash(i) * 0.6) + hash(i * 3.3) * 5) % 2.2) / 2.2;
    const bx = 640 + (hash(i * 7.7) - 0.5) * 220 * (0.3 + u);
    const by = sy - 40 - u * 520 * (1 + (cut === 1 ? 0.6 : 0)) * (1 - 0.3 * u);
    const rr = 2 + hash(i + 1) * 7;
    ctx.strokeStyle = `rgba(200,245,255,${0.55 * (1 - u)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, rr, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  mechC(ctx, 640, sy, s, sinkRot, pose);
  glow(ctx, 640, sy - 40, 220, lens, 0.35);
  // the splash: shards of mirror
  if (t > 18 && t < 21 && cut === 0) {
    const u = (t - 18.0) / 3;
    const y0 = surfY;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 90; i++) {
      const an = -Math.PI / 2 + (hash(i * 2.3) - 0.5) * 2.6;
      const sp = 200 + hash(i * 5.1) * 700;
      const x = 640 + Math.cos(an) * sp * u * (0.6 + u) * 0.8;
      const y = y0 + Math.sin(an) * sp * u * 0.6 + 460 * u * u * (hash(i) > 0.5 ? 1 : 0.2);
      ctx.fillStyle = `rgba(210,250,255,${0.8 * (1 - u)})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hash(i * 9.1) * TAU + u * 4);
      ctx.fillRect(-3 - hash(i) * 8, -1, 6 + hash(i + 3) * 18, 2);
      ctx.restore();
    }
    ctx.restore();
    ring(ctx, 640, y0, 40 + u * 900, [210, 250, 255], 0.8 * (1 - u), 3, 0.14);
    ring(ctx, 640, y0, 20 + u * 560, [210, 250, 255], 0.6 * (1 - u), 2, 0.12);
  }
  hudLine(ctx, `DEPTH ${pad4(depthM(my))} M    LENS 0.93    HEART —`, smooth(22, 23, t) * (1 - smooth(29, 30, t)));
  drawEpTitle(ctx, t, 18.4, 27.8, SPAL.deep, "II", "The Long Descent", 190);
  post.flash = 0.55 * spike(t, 18.2, 0.12) + 0.7 * spike(t, 22.4, 0.06);
  post.zoomBlur = 0.18 * spike(t, 18.2, 0.35) + 0.12 * smooth(24, 30, t);
  post.glitch = Math.max(spike(t, 18.2, 0.1), spike(t, 22.4, 0.1)) * 0.8;
  post.ripple = 0;
  post.chroma = 0.5 + 0.8 * spike(t, 18.2, 0.4);
  const k = shake(t, 3 * spike(t, 18.2, 0.5) + 1.5 * smooth(24, 30, t));
  ctx.translate(k[0], k[1]);
}

// ================================================= 30–40  FREE-FALL (the roots)
function sceneFall(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const y = kf(t, [[30, 1900], [40, 3600]]);
  const orbit = kf(t, [[30, -0.5], [35, 0.2], [40, 0.9]]);
  water(ctx, t, { depth: clamp(y / 3000, 0, 0.95), camX: Math.sin(orbit) * 120, camY: y, rays: 0.05, snow: 1.8, layers: 5 });
  // dead lantern ropes drifting past
  for (let i = 0; i < 14; i++) {
    const p = 0.9 + hash(i) * 0.6;
    const sx = 140 + hash(i * 3.1) * 1000 + Math.sin(orbit * 2) * 90 * p;
    const sy2 = ((hash(i * 6.7) * 1400 + y * p) % 1400) - 340;
    ctx.strokeStyle = "rgba(40,70,80,0.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx - 160, sy2 - 20);
    ctx.quadraticCurveTo(sx, sy2 + 60, sx + 160, sy2 - 20);
    ctx.stroke();
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      drawLantern(ctx, lerp(sx - 160, sx + 160, u), sy2 + Math.sin(u * Math.PI) * 44 - 6, 9 * p, t, { col: [120, 150, 160], a: 0.55, lit: 0.12, ph: i + k });
    }
  }
  // the mech, tumbling slowly in speed ramp
  const rot = kf(t, [[30, -0.5], [34, 0.1], [37, 0.5], [40, 0.2]]);
  const s = kf(t, [[30, 0.5], [34, 0.8], [40, 1.05]]);
  const pose = mp(t, {
    feet: [[-30, 30 + 8 * Math.sin(t * 3)], [34, 8]],
    hands: [[-96, -250 + 16 * Math.sin(t * 2)], [100, -290]],
    lean: 0.1, lens: COLD, glow: 1, iris: 0.2, tilt: 0.1, gaze: [0.2, 0.8],
  });
  glow(ctx, 640, 360, 260, COLD, 0.25);
  mechC(ctx, 640 + Math.sin(orbit * 2) * 40, 360 + Math.sin(t * 1.1) * 14, s, rot, pose);
  speedLines(ctx, t, 0.5 * (1 - smooth(37, 40, t)), -Math.PI / 2, [150, 220, 255]);
  hudLine(ctx, `DEPTH ${pad4(depthM(y))} M    PRESSURE ${Math.round(y / 40)} ATM    HEART —`, 1);
  chip(ctx, t, 33, 37.5, "Nobody is steering", "", [150, 235, 255]);
  post.zoomBlur = 0.1;
  post.chroma = 0.7;
  post.vig = 1.0;
}

// ===================================================== 40–46  COCKPIT (empty)
function sceneCockpit(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 40;
  const y = 3600 + k * 160;
  const pilot = smooth(43.4, 45.2, t);
  drawCockpit(ctx, t, {
    win: (c) => {
      deepGradient(c, 0.9);
      marineSnow(c, t, 0, y, 1.6, [200, 240, 255], 90);
    },
    pilot, heart: pulseAt(BEATS2, t) * 0.5 + pilot * 0.4, topWob: 0.1 + 0.8 * smooth(42, 46, t),
  });
  const sh = shake(t, 1.6);
  ctx.translate(sh[0], sh[1]);
  chip(ctx, t, 40.4, 43.2, "Pilot", "none registered", [255, 190, 110], 84, 140);
  chip(ctx, t, 44.4, 46, "Pilot", "found", [255, 190, 110], 84, 140);
  post.zoomBlur = 0.04 * spike(t, 44, 0.3);
  post.flash = 0.35 * spike(t, 43.6, 0.12);
  post.glitch = 0.5 * spike(t, 43.6, 0.1);
  post.vig = 1.1;
}

// ===================================================== 46–56  SEABED (sonar)
function sceneSeabed(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const floor = 520;
  const land = 47.4;
  const my = t < land ? kf(t, [[46, -260], [land, floor]]) : floor;
  const camX = 0;
  water(ctx, t, { depth: 0.97, camX, camY: 4200, rays: 0, roots: 1, snow: 0.8, layers: 4 });
  drawSeabed(ctx, camX, floor + 50, { par: 0.5, amp: 90, col: [3, 12, 20], seed: 3, rim: [90, 170, 190], rimA: 0.2 });
  drawSeabed(ctx, camX, floor + 80, { par: 1, amp: 40, col: [2, 8, 14], seed: 11, rim: [120, 200, 210], rimA: 0.28 });
  // hidden watchers on the walls, revealed only by sonar
  for (let i = 0; i < 9; i++) {
    const ex = 90 + hash(i * 4.1) * 1100;
    const ey = 80 + hash(i * 6.2) * 330;
    const pr = (((t - 49.2) * 560) - Math.hypot(ex - 640, ey - floor)) / 160;
    const vis = clamp(pr, 0, 1) * (1 - clamp((pr - 2.2) / 2));
    drawEye(ctx, ex, ey, 14 + hash(i) * 12, vis > 0.1 ? 1 : 0, [150, 255, 235], [-0.2, 0.3], 0.1, vis * 0.9);
  }
  // mech: lands, kneels
  const kneel = smooth(land, land + 0.5, t) * (1 - smooth(54.4, 55.6, t));
  const impact = spike(t, land + 0.02, 0.12);
  const up = smooth(54.4, 55.8, t);
  const pose = mp(t, {
    feet: [[-52, 0], [62, 0]],
    hands: [[-84, lerp(-40, -90, up)], [90, lerp(-24, -90, up)]],
    bob: lerp(70, 0, up) * kneel + 8 * impact, lean: 0.25 * kneel, lens: COLD, glow: 0.9, iris: 0.25,
    tilt: 0.3 * kneel, gaze: [0.2, 0.7 * kneel],
  });
  const s = 0.8;
  const mxx = 640;
  const myy = t < land ? my : floor;
  glow(ctx, mxx, myy - 200 * s, 300, COLD, 0.2);
  drawMech(ctx, { ...pose, x: mxx, y: myy, s });
  // silt cloud on impact
  if (t > land && t < land + 3.2) {
    const u = (t - land) / 3.2;
    ctx.save();
    for (let i = 0; i < 40; i++) {
      const an = Math.PI + hash(i * 3.3) * Math.PI;
      const d = (60 + hash(i) * 330) * easeOut(u);
      const x = mxx + Math.cos(an) * d * 1.6;
      const y = floor - 8 + Math.sin(an) * d * 0.28 - u * 40 * hash(i + 4);
      glow(ctx, x, y, 40 + hash(i + 7) * 60, [60, 100, 110], 0.18 * (1 - u));
    }
    ctx.restore();
  }
  // sonar pings
  const pings = [49.2, 51.6, 53.8];
  let dark = 0.92;
  let any = false;
  for (const tp of pings) {
    const u = t - tp;
    if (u >= 0 && u < 2.4) {
      any = true;
      const r = u * 560;
      ring(ctx, mxx, floor - 120, r, [150, 255, 235], 0.8 * (1 - u / 2.4), 2.5, 0.55);
      sonarDark(ctx, mxx, floor - 120, r, dark * smooth(0, 0.1, u));
    }
  }
  if (!any) darkness(ctx, dark, [{ x: mxx, y: floor - 160, r: 260 }]);
  glow(ctx, mxx, myy - 262 * s, 110, COLD, 0.55);
  hudLine(ctx, `SONAR   RANGE ${Math.round(clamp(t - 49) * 480)} M    CONTACTS ${t < 49.2 ? 0 : t < 51.6 ? 3 : t < 53.8 ? 9 : 26}`, smooth(48.6, 49.2, t));
  post.flash = 0.8 * impact;
  post.glitch = 0.7 * impact;
  post.zoomBlur = 0.2 * impact;
  post.vig = 1.15;
  const sh = shake(t, 9 * impact);
  ctx.translate(sh[0], sh[1]);
}

// ===================================== 56–68  THE RIVER OF LANTERNS (wide pan)
const RIVER = 190;
function riverPos(i: number, t: number): [number, number, number] {
  const s = i / RIVER;
  const u = (s * 2.6 + t * 0.09) % 2.6; // along the path
  const x = u * 760 - 520;
  const wob = 1 + (hash(i * 3.1) - 0.5) * 0.9;
  const y = 360 + Math.sin(u * 2.4 + 0.6) * 150 + Math.sin(u * 7 + i) * 24 * wob + (hash(i * 7.3) - 0.5) * 120;
  return [x, y, u];
}
function sceneRiver(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const camX = kf(t, [[56, -200], [68, 760]]);
  water(ctx, t, { depth: 0.9, camX, camY: 4300, rays: 0, roots: 1, snow: 1.2, layers: 5 });
  drawSeabed(ctx, camX, 700, { par: 0.8, amp: 130, col: [3, 10, 18], seed: 5, rim: [200, 150, 90], rimA: 0.12 });
  const reveal = smooth(56, 60.5, t);
  // the lanterns: a single glowing river through the canyon
  for (let i = 0; i < RIVER; i++) {
    const [wx, wy, u] = riverPos(i, t - 56 + 8);
    const near = hash(i * 1.9);
    const par = 0.55 + near * 0.9;
    const x = wx - camX * par * 0.5 + 400 * (par - 1) + 80;
    const sz = 3.5 + near * 15;
    const lit = reveal * smooth(0.0, 0.4, u) * (1 - smooth(2.3, 2.6, u));
    if (lit < 0.02) continue;
    const sy = wy + (1 - par) * 30;
    if (sz < 8) glow(ctx, x, sy, sz * 3, [255, 176, 70], 0.8 * lit);
    else drawLantern(ctx, x, sy, sz, t, { a: lit, ph: i, lit: 1 });
  }
  glow(ctx, 640, 380, 720, [255, 160, 60], 0.08 * reveal);
  darkness(ctx, 0.28 * (1 - reveal));
  // the lone mech watching from the cliff
  const pose = mp(t, { ...idlePose(t), lens: COLD, glow: 0.8, iris: 0.3, gaze: [0.5, 0], hollow: true, chest: 1 });
  const mxs = 230 - camX * 0.3 * 0;
  drawMech(ctx, { ...pose, x: mxs, y: 676, s: 0.8, flip: 1 });
  drawSeabed(ctx, camX, 720, { par: 1.3, amp: 80, col: [1, 5, 10], seed: 21 });
  chip(ctx, t, 59, 64, "The Lost Lanterns", "a village's worth, still burning", [255, 190, 110]);
  post.chroma = 0.5;
  post.vig = 1.0;
  post.bloom = 1.2;
  post.zoomBlur = 0.03;
}

// ============================ 68–82  THEY GATHER  (eyes, pilot joins, flinch)
function sceneGather(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 68;
  const flinch = spike(t, 79.2, 0.16);
  water(ctx, t, { depth: 0.95, camX: 0, camY: 4400, rays: 0, roots: 0.6, snow: 1.2 });
  drawSeabed(ctx, 0, 720, { par: 0.4, amp: 120, col: [3, 10, 18], seed: 9, rim: [200, 150, 90], rimA: 0.14 });
  const stand = smooth(68, 72, t);
  const mxs = 640;
  const cz = kf(t, [[68, 1.7], [74, 1.15], [79, 1.0], [82, 1.3]]);
  withCam(ctx, 640, 420, cz, 0.04 * Math.sin(t * 0.4), () => {
    // a ring of lanterns, orbiting, more and more
    const N = Math.floor(8 + 60 * smooth(68, 76, t));
    for (let i = 0; i < N; i++) {
      const an = (i / N) * TAU * 3 + t * (0.25 + hash(i) * 0.3) * (i % 2 ? 1 : -1);
      const rad = 140 + hash(i * 2.2) * 420 + 40 * Math.sin(t + i);
      const x = mxs + Math.cos(an) * rad * 1.15;
      const y = 380 + Math.sin(an) * rad * 0.52 - stand * 20;
      const depth = Math.sin(an);
      const sz = 12 + (depth + 1) * 12 + hash(i + 3) * 6;
      const eyesO = smooth(70 + hash(i) * 5, 72 + hash(i) * 5, t);
      const lookA = t > 76 ? 0 : 1;
      const jit = flinch * 18 * (hash(i + t * 0) - 0.5);
      drawLantern(ctx, x + jit, y, sz, t, {
        a: (0.5 + 0.5 * (depth + 1) / 2) * (1 - 0.6 * flinch), ph: i, eyes: eyesO,
        look: t > 76 ? [-1, 0.2] : [(mxs - x) / 400 * lookA, (380 - y) / 200 * lookA],
      });
    }
    // the mech standing, lanterns' light on it
    const pose = mp(t, {
      feet: [[-46, 0], [46, 0]],
      hands: [[lerp(-84, -104, stand), lerp(-40, -98, stand)], [lerp(90, 104, stand), lerp(-24, -98, stand)]],
      bob: lerp(60, 0, stand), lean: lerp(0.22, 0, stand), lens: COLD, glow: 0.9, iris: 0.3, tilt: lerp(0.25, 0, stand),
      gaze: [Math.sin(t * 0.6) * 0.3, lerp(0.7, 0, stand)], hollow: true, chest: 1,
    });
    drawMech(ctx, { ...pose, x: mxs, y: 600, s: 1.0 });
    // the pilot lantern leaves the cockpit, floats up, joins
    const pu = smooth(73, 77, t);
    const a0 = mechAnchors({ ...pose, x: mxs, y: 600, s: 1.0 });
    const px = lerp(a0.lens[0], mxs + 20, pu) + Math.sin(t * 2) * 8 * pu;
    const py = lerp(a0.lens[1], 250, pu) + Math.sin(t * 1.7) * 6 * pu;
    drawLantern(ctx, px, py, 24 + 10 * pu, t, { a: pu, eyes: 1, look: [0.8, 0.2], ph: 1.2 });
  });
  darkness(ctx, 0.25 + 0.5 * flinch);
  hudLine(ctx, `CONTACTS ${Math.floor(26 + 160 * smooth(68, 78, t))}    ALL FRIENDLY`, smooth(69, 70, t) * (1 - smooth(78, 79, t)));
  hudLine(ctx, "CONTACT  ———  UNKNOWN  ———  CLOSING", smooth(79.4, 79.8, t), 70, 640, [255, 120, 110]);
  post.flash = 0.25 * flinch;
  post.glitch = 0.4 * flinch + 0.2 * spike(t, 73.1, 0.1);
  post.vig = 1.05;
  post.bloom = 1.1;
  const sh = shake(t, 4 * flinch);
  ctx.translate(sh[0], sh[1]);
  void k;
}

// ============================================== 82–90  EYES IN THE DARK (hunters)
function sceneEyes(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 82;
  water(ctx, t, { depth: 1, camX: 0, camY: 4500, rays: 0, roots: 0.3, snow: 0.8 });
  darkness(ctx, 0.5);
  // pairs of eyes opening along the canyon, faster and faster
  const n = Math.floor(2 + 30 * Math.pow(clamp(k / 6), 1.6));
  for (let i = 0; i < n; i++) {
    const at = 82 + Math.pow(i / 32, 0.62) * 6;
    const open = smooth(at, at + 0.25, t);
    const ex = 60 + hash(i * 2.7) * 1160;
    const ey = 80 + hash(i * 5.3) * 500;
    const r = 8 + hash(i * 1.3) * 22;
    const col: RGB = hash(i) > 0.5 ? [140, 255, 235] : [255, 120, 110];
    glow(ctx, ex, ey, r * 5, col, 0.25 * open);
    drawEye(ctx, ex - r * 1.3, ey, r, open, col, [Math.sin(t + i) * 0.5, 0.2], 0.1, 0.95);
    drawEye(ctx, ex + r * 1.3, ey, r, open, col, [Math.sin(t + i) * 0.5, 0.2], 0.1, 0.95);
  }
  // the lantern stream, trembling in the foreground
  for (let i = 0; i < 40; i++) {
    const [wx, wy] = riverPos(i * 4, t);
    drawLantern(ctx, wx * 0.8 + 140, wy + 90, 8 + hash(i) * 6, t, { a: 0.7, ph: i, lit: 0.8 });
  }
  // something very large passes overhead
  const u = prog(t, 86, 90);
  if (u > 0 && u < 1) {
    drawHunter(ctx, lerp(1900, -700, u), 130 + Math.sin(u * 6) * 20, 330, t, { flip: -1, open: 0.55, seed: 2, lure: [140, 255, 235] });
    darkness(ctx, 0.2 * Math.sin(u * Math.PI));
  }
  hudLine(ctx, `PROXIMITY  ${pad4(Math.round(lerp(900, 40, smooth(82, 90, t))))} M`, 1, 70, 640, [255, 120, 110]);
  post.vig = 1.1;
  post.glitch = 0.6 * spike(t, 86.2, 0.2) + 0.3 * spike(t, 82.1, 0.1);
  post.chroma = 0.6;
  post.flash = 0.3 * spike(t, 86.1, 0.1);
  const sh = shake(t, 1 + 6 * Math.sin(Math.max(0, u) * Math.PI));
  ctx.translate(sh[0], sh[1]);
}

// =================================================== 90–106  THE CHASE
function sceneChase(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 90;
  const speed = 780 + 180 * smooth(96, 104, t);
  const camX = k * speed;
  const floor = 560;
  water(ctx, t, { depth: 0.95, camX: camX * 0.3, camY: 4500, rays: 0, roots: 1, snow: 1.6, layers: 5 });
  drawSeabed(ctx, camX, floor + 90, { par: 0.45, amp: 140, col: [3, 12, 20], seed: 2, rim: [90, 170, 190], rimA: 0.18 });
  // jump arcs
  const jt = prog(t, 98.2, 99.8);
  const jy = jt > 0 && jt < 1 ? -190 * Math.sin(jt * Math.PI) : 0;
  const cx = 330;
  // lanterns streaming with him
  for (let i = 0; i < 90; i++) {
    const lag = hash(i * 3.3);
    const x = cx + 120 + ((hash(i * 7.1) * 1300 + k * 120 * (0.6 + lag)) % 1500) - 200 + Math.sin(t * 3 + i) * 12;
    const y = 160 + hash(i * 2.9) * 380 + Math.sin(t * 2 + i * 1.7) * 26 - (x - cx) * 0.02;
    drawLantern(ctx, x, y, 7 + hash(i) * 11, t, { a: 0.85, ph: i, tilt: -0.5, lit: 1 });
  }
  // hunters in pursuit, weaving
  for (let h = 0; h < 3; h++) {
    const gap = [200, 520, 820][h] - 120 * smooth(100, 105.5, t) * (h === 0 ? 1 : 0);
    const hx = cx - gap + Math.sin(t * 2.3 + h * 2) * 60 + (h === 0 ? 90 * spike(t, 94.8, 0.5) + 130 * spike(t, 101.2, 0.4) : 0);
    const hy = 330 + Math.sin(t * 1.9 + h * 1.3) * 120 + h * 30;
    drawHunter(ctx, hx, hy, 175 - h * 20, t, { flip: 1, open: 0.5 + 0.5 * Math.max(0, Math.sin(t * 6 + h)), seed: h * 5, lure: h === 1 ? [255, 130, 110] : [140, 255, 235], rot: -0.08 });
  }
  // the runner
  const phase = t * 15.5;
  const wp = walkPose(phase, 1);
  const pose = mp(t, {
    ...wp,
    feet: jt > 0 && jt < 1 ? [[-60, -40], [70, -16]] : (wp.feet.map((f) => [f[0] * 1.5, f[1] * 1.6]) as MechPose["feet"]),
    hands: jt > 0 && jt < 1 ? [[-110, -290], [120, -260]] : [[wp.hands[0][0] * 1.4, wp.hands[0][1]], [wp.hands[1][0] * 1.4, wp.hands[1][1]]],
    lean: 0.28, lens: COLD, glow: 1, iris: 0.18, gaze: [0.5, 0], hollow: true, chest: 1,
  });
  glow(ctx, cx, floor + jy - 230, 280, COLD, 0.22);
  drawMech(ctx, { ...pose, x: cx, y: floor + jy, s: 0.82, flip: 1 });
  drawSeabed(ctx, camX, floor + 120, { par: 1, amp: 60, col: [2, 7, 12], seed: 7, rim: [150, 220, 230], rimA: 0.3 });
  // dust streaks off his heels
  glow(ctx, cx - 60, floor + 10, 60 + 30 * Math.abs(Math.sin(phase)), [120, 160, 170], 0.25);
  drawSeabed(ctx, camX, 740, { par: 1.9, amp: 70, col: [0, 3, 6], seed: 33 });
  speedLines(ctx, t, 0.55, Math.PI, [160, 230, 255]);
  // an arch collapses at the end
  hudLine(ctx, `PACE  ${Math.round(speed / 5)} M/S     LANTERNS ${Math.floor(184 - 3 * smooth(98, 106, t))}`, 1, 70, 640, [255, 190, 110]);
  chip(ctx, t, 90.3, 93.5, "Run", "", [255, 190, 110], 84, 140);
  post.chroma = 0.9;
  post.zoomBlur = 0.02 + 0.07 * spike(t, 98.2, 0.4) + 0.08 * spike(t, 101.2, 0.3);
  post.roll = 0.025 * Math.sin(t * 1.1);
  post.glitch = 0.35 * spike(t, 94.8, 0.1) + 0.5 * spike(t, 101.2, 0.1);
  post.vig = 1.0;
  post.flash = 0.2 * spike(t, 99.8, 0.08) + 0.3 * spike(t, 101.2, 0.08);
  const sh = shake(t, 3 + 5 * spike(t, 99.85, 0.2) + 5 * spike(t, 101.2, 0.2));
  ctx.translate(sh[0], sh[1]);
}

// ===================================================== 106–118  THE NET
function sceneNet(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  // slow motion across the strike
  const lt = t < 110.2 ? t : t < 113.8 ? 110.2 + (t - 110.2) * 0.22 : t - 2.8 * 0.78;
  const k = lt - 106;
  const floor = 580;
  const cinch = smooth(110.9, 114.2, lt);
  const spread = smooth(108.3, 110.4, lt);
  const burst = smooth(114.1, 114.4, lt);
  water(ctx, t, { depth: 0.95, camX: 40, camY: 4500, rays: 0, roots: 0.8, snow: 0.9 });
  drawSeabed(ctx, 0, floor + 110, { par: 0.3, amp: 100, col: [3, 12, 20], seed: 4, rim: [90, 170, 190], rimA: 0.16 });
  const cz = kf(t, [[106, 1.0], [109, 1.25], [111, 1.5], [113.8, 1.7], [117, 1.2]]);
  const camx = kf(t, [[106, 640], [111, 560], [114, 520]]);
  withCam(ctx, camx, 400, cz, 0.03 * Math.sin(lt * 0.7), () => {
    // mech turns and stands his ground, facing left (the hunters)
    const turn = smooth(106, 107.4, lt);
    const throwK = smooth(108.2, 109.2, lt) * (1 - smooth(109.7, 110.6, lt) * 0.0);
    const pose = mp(t, {
      feet: [[-64, 0], [58, 0]],
      hands: [[lerp(-104, -170, throwK), lerp(-98, -300, throwK)], [lerp(104, 90, turn), lerp(-98, -120, turn)]],
      bob: 0, lean: -0.12 * turn + 0.2 * throwK, lens: COLD, glow: 1, iris: 0.2,
      gaze: [-0.6, 0], hollow: true, chest: 1, grip: [0.9, 0.4],
    });
    const mxs = 780, flip = -1;
    drawMech(ctx, { ...pose, x: mxs, y: floor, s: 0.9, flip });
    const an = mechAnchors({ ...pose, x: mxs, y: floor, s: 0.9, flip });
    // the lead hunter charges, hits the net, is wrapped
    const hu = prog(lt, 106.6, 110.7);
    const hx = lerp(-300, 330, easeOut(hu * 0.9 + 0.1)) + (1 - burst) * Math.sin(lt * 30) * 8 * smooth(110.7, 111, lt);
    const hy = 360 + Math.sin(lt * 2) * 14;
    const hs = 200 * (1 - cinch * 0.45);
    if (burst < 1) {
      drawHunter(ctx, hx, hy, hs, t, { flip: 1, open: 0.9 * (1 - cinch), seed: 1, lure: [140, 255, 235], alpha: 1 - burst, rot: 0.1 * cinch });
    }
    // two more circle back, afraid
    for (let h = 0; h < 2; h++) {
      const u = prog(lt, 108 + h * 0.5, 111 + h * 0.5);
      const a = u * (1 - smooth(111.5, 113.5, lt));
      drawHunter(ctx, -200 + 160 * u - h * 200 + (1 - u) * -300, 220 + h * 220, 130, t, { flip: 1, open: 0.7, seed: 4 + h, lure: [255, 130, 110], alpha: 0.9 * a });
    }
    // the net
    if (spread > 0.002) {
      const target = { x: hx + 60, y: hy };
      drawNet(ctx, { ox: an.handL[0], oy: an.handL[1], cx: lerp(an.handL[0], target.x, 1), cy: lerp(an.handL[1], target.y, 1), R: 250, spread, cinch, t, col: [170, 255, 240], flat: 0.9, alpha: 1 - burst });
    }
    // the freed star
    if (burst > 0) {
      const u = lt - 114.1;
      glow(ctx, hx + 40, hy - u * 90, 260 * (1 - clamp(u / 3)) + 120, [255, 255, 255], 0.9 * burst);
      glow(ctx, hx + 40, hy - u * 90, 440, [160, 220, 255], 0.5 * (1 - clamp(u / 5)));
      for (let i = 0; i < 40; i++) {
        const an2 = hash(i * 3) * TAU;
        const d = 30 + u * (180 + hash(i + 2) * 420);
        glow(ctx, hx + 40 + Math.cos(an2) * d, hy - u * 90 + Math.sin(an2) * d * 0.7, 6 + hash(i) * 8, [220, 245, 255], 0.9 * (1 - clamp(u / 2.8)));
      }
    }
  });
  hudLine(ctx, "THE LANTERNS ARE LOOKING AT YOU", smooth(108, 108.4, lt) * (1 - smooth(110, 110.4, lt)), 70, 640, [255, 190, 110]);
  post.flash = 0.7 * spike(t, 110.55, 0.06) + 0.9 * spike(t, 113.85, 0.18);
  post.glitch = 0.6 * spike(t, 110.55, 0.08);
  post.zoomBlur = 0.2 * spike(t, 110.55, 0.2) + 0.25 * spike(t, 113.85, 0.3);
  post.chroma = 0.6 + 1.0 * spike(t, 110.55, 0.2) + 1.2 * spike(t, 113.85, 0.3);
  post.vig = 1.05;
  const sh = shake(t, 2 + 8 * spike(t, 110.55, 0.15) + 10 * spike(t, 113.85, 0.2));
  ctx.translate(sh[0], sh[1]);
  void k;
}

// ================================================ 118–128  THEY WERE STARS
function sceneStars(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 118;
  const camY = 4500 - k * 80 - 50 * k * k * 0.25;
  water(ctx, t, { depth: 0.9 - 0.2 * smooth(118, 126, t), camX: 0, camY, rays: 0.2 * smooth(120, 127, t), roots: 1, snow: 1.0, layers: 5 });
  // freed hunters rise as stars, lighting the canyon walls
  for (let i = 0; i < 9; i++) {
    const delay = i * 0.35;
    const u = Math.max(0, t - 118 - delay);
    const x = 140 + hash(i * 3.3) * 1000 + Math.sin(u * 0.9 + i) * 36;
    const y = 780 - u * (110 + hash(i) * 70) - Math.pow(u, 2) * 14;
    const a = smooth(0, 0.5, u) * (1 - smooth(8.5, 10, u));
    glow(ctx, x, y, 320, [160, 220, 255], 0.28 * a);
    glow(ctx, x, y, 90 + 12 * Math.sin(u * 5 + i), [255, 255, 255], 0.95 * a);
    // trailing motes
    for (let j = 0; j < 8; j++) glow(ctx, x + Math.sin(j * 2.1 + i) * 16, y + j * 26 + 14, 8 - j * 0.7, [200, 235, 255], 0.5 * a * (1 - j / 8));
    ring(ctx, x, y, 40 + u * 60, [220, 245, 255], 0.5 * a * (1 - clamp(u / 4)), 1.5, 1);
  }
  // the lanterns celebrate: they spin around the rising stars
  for (let i = 0; i < 60; i++) {
    const an = hash(i) * TAU + t * (0.5 + hash(i + 1));
    const x = 640 + Math.cos(an) * (260 + hash(i * 2) * 420);
    const y = 360 + Math.sin(an) * (120 + hash(i * 5) * 220) - k * 8;
    drawLantern(ctx, x, y, 9 + hash(i + 3) * 8, t, { a: 0.9, ph: i, eyes: 1, look: [0, -1] });
  }
  chip(ctx, t, 119, 124.5, "They were never monsters", "they were stars, caged", [200, 235, 255]);
  hudLine(ctx, `HEART —   ·   ONE BEAT, FAR OFF, ABOVE`, smooth(123, 124, t), 70, 640, [200, 235, 255]);
  post.bloom = 1.3;
  post.chroma = 0.5;
  post.flash = 0.25 * smooth(118, 118.3, t) * (1 - smooth(118.3, 119.5, t));
}

// =============================================== 128–142  THE DROWNED VILLAGE
interface DLantern { x: number; y: number; order: number; sx: number; sy: number; s: number; ph: number }
interface DPillar { x: number; w: number; h: number; houses: { fy: number; w: number; h: number; ox: number }[] }
const VILLAGE = (() => {
  const pillars: DPillar[] = [];
  const lanterns: DLantern[] = [];
  const xs = [-1500, -1100, -760, -420, -120, 200, 520, 880, 1250, 1600];
  xs.forEach((x, i) => {
    const h = 380 + hash(i * 3.3) * 340;
    pillars.push({
      x, w: 70 + hash(i) * 40, h,
      houses: [
        { fy: 0.35 + hash(i + 5) * 0.4, w: 46 + hash(i + 2) * 18, h: 34, ox: (hash(i + 9) - 0.5) * 30 },
        ...(hash(i + 20) > 0.5 ? [{ fy: 0.78, w: 38, h: 28, ox: -10 }] : []),
      ],
    });
  });
  for (let i = 0; i < pillars.length - 1; i++) {
    const a = pillars[i], b = pillars[i + 1];
    const ya = 560 - a.h * 0.7, yb = 560 - b.h * 0.7;
    const n = 6;
    for (let k = 1; k < n; k++) {
      const u = k / n;
      const x = lerp(a.x, b.x, u);
      const y = lerp(ya, yb, u) + Math.sin(Math.PI * u) * 46;
      const order = clamp(Math.hypot(x - 20, (y - 380) * 0.5) / 1500);
      lanterns.push({
        x, y, order, sx: x + (hash(i * 13 + k) - 0.5) * 2600, sy: y + 900 + hash(i * 17 + k) * 800, s: 12 + hash(i + k) * 5, ph: i * 9 + k,
      });
    }
  }
  return { pillars, lanterns };
})();

function drawVillage(ctx: CanvasRenderingContext2D, _t: number, camX: number, par: number, dim: number, reveal: number) {
  const base = 560;
  VILLAGE.pillars.forEach((p) => {
    const x = p.x - camX * (par - 1);
    const g = ctx.createLinearGradient(x - p.w, 0, x + p.w, 0);
    g.addColorStop(0, `rgba(${16 * dim},${40 * dim},${58 * dim},1)`);
    g.addColorStop(0.4, `rgba(${34 * dim},${78 * dim},${96 * dim},1)`);
    g.addColorStop(1, `rgba(${4 * dim},${10 * dim},${16 * dim},1)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - p.w * 0.58, base + 60);
    ctx.lineTo(x - p.w * 0.38, base - p.h);
    ctx.lineTo(x + p.w * 0.38, base - p.h - 10);
    ctx.lineTo(x + p.w * 0.58, base + 60);
    ctx.fill();
    p.houses.forEach((h, hi) => {
      const hy = base - p.h * h.fy;
      const hx = x + h.ox;
      ctx.fillStyle = `rgba(${10 * dim},${22 * dim},${34 * dim},1)`;
      ctx.fillRect(hx - h.w / 2, hy - h.h, h.w, h.h);
      ctx.beginPath();
      ctx.moveTo(hx - h.w / 2 - 6, hy - h.h);
      ctx.lineTo(hx, hy - h.h - 22);
      ctx.lineTo(hx + h.w / 2 + 6, hy - h.h);
      ctx.fill();
      const wl = smooth(0.2 + hi * 0.1, 0.8, reveal) * dim;
      if (wl > 0.02) {
        ctx.fillStyle = `rgba(255,190,100,${0.9 * wl})`;
        ctx.fillRect(hx - 5, hy - h.h * 0.7, 9, 10);
        glow(ctx, hx, hy - h.h * 0.65, 38, [255, 176, 70], 0.4 * wl);
      }
    });
  });
}

function sceneVillage(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 128;
  const camX = kf(t, [[128, -700], [142, 120]]);
  const camY = kf(t, [[128, 560], [142, 330]]);
  deepGradient(ctx, 0.92 - 0.25 * smooth(130, 141, t), [4, 6, 18]);
  godRays(ctx, t, 0.1 + 0.3 * smooth(134, 142, t), -40, [255, 190, 120]);
  const reveal = smooth(128.5, 140, t);
  withCam(ctx, 640, 360 + (camY - 360) * 0.0, 1.0 - 0.1 * smooth(128, 142, t), 0, () => {
    ctx.translate(-camX * 0.0, (360 - camY) * 0.0 + (camY - 360) * -0.35);
    ctx.translate(-camX * 0.25, 0);
    drawVillage(ctx, t, camX, 1, 1.0, reveal);
    // seabed
    ctx.fillStyle = "rgba(2,6,10,1)";
    ctx.fillRect(-400, 620, 2400, 400);
  });
  // lanterns fly in from the dark and light their ropes one by one
  withCam(ctx, 640, 360, 1.0 - 0.1 * smooth(128, 142, t), 0, () => {
    ctx.translate((camX) * -0.25, (camY - 360) * -0.35);
    for (const L of VILLAGE.lanterns) {
      const u = easeOut(clamp((t - 128.2 - L.order * 6.5) / 2.6));
      const x = lerp(L.sx, L.x, u) + Math.sin(L.ph + t * 3) * 30 * (1 - u);
      const y = lerp(L.sy, L.y, u) - Math.sin(u * Math.PI) * 140;
      const lit = smooth(0.85, 1, u) * (0.75 + 0.25 * Math.sin(t * 6 + L.ph));
      drawLantern(ctx, x, y, L.s, t, { a: smooth(0, 0.15, u), lit: 0.25 + 0.75 * lit, ph: L.ph, eyes: 1 - smooth(0.9, 1, u), look: [0, -0.3] });
    }
    // the mech, in the square
    const pose = mp(t, { ...idlePose(t), lens: COLD, glow: 0.8, iris: 0.3, gaze: [0, -0.2], hollow: true, chest: 1 });
    drawMech(ctx, { ...pose, x: 120, y: 612, s: 0.9 });
  });
  void k;
  chip(ctx, t, 132, 138.5, "The Drowned Village", "every rope, every lantern, where they were left", [255, 190, 110]);
  post.bloom = 1.1 + 0.4 * reveal;
  post.chroma = 0.4;
  post.vig = 0.95;
}

// ============================================ 142–152  THE NEW HEART
function sceneHeart(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 142;
  deepGradient(ctx, 0.7, [18, 8, 10]);
  godRays(ctx, t, 0.35, -40, [255, 190, 120]);
  const fz = kf(t, [[142, 1.5], [146, 2.4], [148.2, 3.0], [151, 1.4]]);
  const fy = kf(t, [[142, 400], [146, 340], [148.2, 330], [151, 400]]);
  withCam(ctx, 640, fy, fz, 0.02 * Math.sin(t), () => {
    // the village behind, warm and bokeh'd
    for (let i = 0; i < 50; i++) {
      drawLantern(ctx, 100 + hash(i * 3) * 1100, 80 + hash(i * 7) * 560, 8 + hash(i + 2) * 14, t, { a: 0.55, ph: i, lit: 1 });
    }
    const closed = smooth(147.6, 149.2, t);
    const placed = smooth(145.6, 147.7, t);
    const lensWarm = smooth(148.4, 150, t);
    const pose = mp(t, {
      ...idlePose(t), lens: mix3(COLD, AMBER, lensWarm), glow: 0.8 + 0.2 * lensWarm, iris: lerp(0.2, 0.55, lensWarm),
      gaze: [0, -0.2 * lensWarm], hollow: placed < 0.5, heart: placed * (0.7 + 0.5 * hb(t)), chest: 1 - closed, lamp: lensWarm * 0.8,
      pal: SPAL.deep,
    });
    const ms = 1.0;
    drawMech(ctx, { ...pose, x: 640, y: 640, s: ms });
    const an = mechAnchors({ ...pose, x: 640, y: 640, s: ms });
    // the pilot lantern descends from the head into the chest
    const u = smooth(143, 145.8, t);
    const px = lerp(an.lens[0] + 70, an.chest[0], u) + Math.sin(u * 6) * 20 * (1 - u);
    const py = lerp(an.lens[1] - 150, an.chest[1], easeOut(u));
    if (placed < 0.5) drawLantern(ctx, px, py, 26 - 6 * u, t, { a: 1 - placed * 1.6, eyes: 1 - u * 0.8, look: [0, 1], ph: 1.2 });
    glow(ctx, an.chest[0], an.chest[1], 160 * (0.4 + placed) * (1 + 0.3 * hb(t)), [255, 176, 70], 0.7 * placed);
    glow(ctx, an.lens[0], an.lens[1], 90 * lensWarm + 10, AMBER, 0.8 * lensWarm);
    // shock rings on each beat
    for (let b = 0; b < 3; b++) {
      const bt = BEATS2.find((x) => x >= 142.6 + b * 1.15);
      if (bt !== undefined && t > bt) ring(ctx, an.chest[0], an.chest[1], (t - bt) * 360, [255, 200, 120], 0.5 * (1 - clamp((t - bt) / 1.4)), 2, 1);
    }
  });
  hudLine(ctx, "PILOT  ———  INTEGRATED", smooth(147.8, 148.6, t), 70, 640, [255, 200, 120]);
  post.flash = 0.45 * spike(t, 145.9, 0.1) + 0.5 * spike(t, 149.1, 0.12);
  post.glitch = 0.5 * spike(t, 145.9, 0.08);
  post.bloom = 1.2;
  post.chroma = 0.4 + 0.8 * spike(t, 145.9, 0.3);
  post.vig = 1.0;
  void k;
}

// ================================================ 152–162  THE SURGE (ascent)
function sceneSurge(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 152;
  const up = Math.pow(k / 10, 2.1) * 4200 + k * 260;
  const y = 4500 - up;
  water(ctx, t, { depth: clamp(0.95 - up / 4600, 0.1, 1), camX: 0, camY: y, rays: smooth(154, 162, t) * 0.8, roots: 1, snow: 2.0, layers: 5 });
  // a column of lights climbing, then everyone
  for (let i = 0; i < 200; i++) {
    const sp = 0.7 + hash(i * 1.7) * 1.1;
    const x = 640 + (hash(i * 3.3) - 0.5) * (260 + 900 * smooth(152, 160, t) * hash(i + 1));
    const yy = ((((hash(i * 7.1) * 2200 - k * 700 * sp) % 2000) + 2000) % 2000) - 400;
    const sz = 7 + hash(i + 2) * 14;
    drawLantern(ctx, x, yy, sz, t, { a: 0.95, ph: i, eyes: 1, look: [0, -1], lit: 1.1 });
  }
  // the mech below shrinking, watching them go
  const my = 360 + up * 0.25;
  const pose = mp(t, { ...idlePose(t), lens: AMBER, glow: 1, iris: 0.55, gaze: [0, -1], tilt: -0.2, hollow: false, heart: 0.7 + 0.5 * hb(t), chest: 0, lamp: 0.8 });
  drawMech(ctx, { ...pose, x: 640, y: my + 330, s: Math.max(0.1, 0.9 - up / 5000) });
  speedLines(ctx, t, 0.9, -Math.PI / 2, [255, 214, 150]);
  hudLine(ctx, `DEPTH ${pad4(depthM(y))} M ↑    HEART ♥ 62`, 1, 70, 640, [255, 214, 150]);
  chip(ctx, t, 152.4, 156.5, "Home", "", [255, 214, 150], 84, 140);
  post.zoomBlur = 0.1 + 0.18 * smooth(152, 160, t);
  post.chroma = 0.9;
  post.bloom = 1.3;
  post.flash = 0.2 * smooth(160, 162, t);
}

// ======================================== 162–180  ABOVE (the mirror, the slab)
function sceneAbove(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  const k = t - 162;
  const surfY = kf(t, [[162, -420], [165.5, 190], [180, 400]]);
  const slab = smooth(168.5, 172, t);
  const stars = smooth(163, 168, t);
  water(ctx, t, { depth: 0.3, camX: 0, camY: 0, surfY, sky: trueSky(t, 1 - 0.8 * smooth(165, 168, t), 1, slab), rays: 1.0, roots: 0.4, snow: 1.0, layers: 3 });
  // lanterns pass through the mirror and become stars
  for (let i = 0; i < 110; i++) {
    const delay = hash(i * 2.1) * 3.2;
    const u = clamp((t - 162 - delay) / 5);
    const x = 140 + hash(i * 3.3) * 1000 + Math.sin(t * 0.9 + i) * 18;
    const y = lerp(H + 120, surfY - 90 - hash(i) * 240, easeOut(u));
    const above = y < surfY;
    const a = above ? Math.max(0.4, 1 - (surfY - y) / 600) : 1;
    if (above) glow(ctx, x, y, 12, [235, 242, 255], 0.9 * a);
    else drawLantern(ctx, x, y, 7 + hash(i + 2) * 9, t, { a: 0.9, ph: i, lit: 1.1 });
  }
  glow(ctx, 640, surfY, 700, [190, 240, 255], 0.12 * stars);
  // the mech at the bottom, small, looking up. his light is steady now
  const pose = mp(t, { ...idlePose(t), lens: AMBER, glow: 0.9, iris: 0.5, gaze: [0, -1], tilt: -0.28 * smooth(167, 170, t), hollow: false, heart: 0.7 + 0.5 * hb(t), chest: 0, lamp: 0.7 });
  drawMech(ctx, { ...pose, x: 640, y: 700, s: 0.62 });
  glow(ctx, 640, 700 - 262 * 0.62, 90, AMBER, 0.6);
  // slab hum
  const hum = spike(t, 172.2, 0.2) + spike(t, 174.4, 0.2);
  post.flash = 0.18 * hum;
  post.glitch = 0.5 * Math.max(spike(t, 169.5, 0.12), spike(t, 172.2, 0.1));
  post.chroma = 0.5 + 0.8 * hum;
  post.vig = 1.05;
  post.exposure = 1 - smooth(178.6, 180, t);
  const sh = shake(t, 0.6 + 4 * hum);
  ctx.translate(sh[0], sh[1]);
  chip(ctx, t, 163, 167.5, "Above", "what was released has gone home", [255, 214, 150]);
  drawToBeContinued(ctx, t, 174.2, SPAL.deep, "TO BE CONTINUED", "EPISODE III  ·  MONOLITH SEASON");
  void k;
}

// ===================================================================== film
export function renderEp2(ctx: CanvasRenderingContext2D, t: number, post: Post) {
  ctx.save();
  try {
    if (t < 16) shoreWorld(ctx, t, post);
    else if (t < 30) scenePlunge(ctx, t, post);
    else if (t < 40) sceneFall(ctx, t, post);
    else if (t < 46) sceneCockpit(ctx, t, post);
    else if (t < 56) sceneSeabed(ctx, t, post);
    else if (t < 68) sceneRiver(ctx, t, post);
    else if (t < 82) sceneGather(ctx, t, post);
    else if (t < 90) sceneEyes(ctx, t, post);
    else if (t < 106) sceneChase(ctx, t, post);
    else if (t < 118) sceneNet(ctx, t, post);
    else if (t < 128) sceneStars(ctx, t, post);
    else if (t < 142) sceneVillage(ctx, t, post);
    else if (t < 152) sceneHeart(ctx, t, post);
    else if (t < 162) sceneSurge(ctx, t, post);
    else sceneAbove(ctx, t, post);
  } finally {
    ctx.restore();
  }
  void noise;
  void GOLD;
  void drawSlab;
  void starfield;
}
