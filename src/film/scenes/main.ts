import { RGB, TAU, V2, clamp, env, heart, kf, kfl, lerp, mix3, rgba, smooth } from "../util";
import { tickPulse } from "../util";
import { PALS, glow, mixPal, palAt } from "../look";
import { PostParams } from "../post";
import { MechPose, idlePose, mechAnchors, walkPose } from "../mech";
import { MantaOpts } from "../manta";
import { BASE4, H, SPIRE_H, SPIRE_X, WorldState, drawWorld, horizonY, makeWorld, toSky } from "../world";
import { AMBER, COLD, GOLD, RED, drawBaby, drawMeteors, drawNet, drawTitle, mechBase, risingLights, shake } from "./common";
import { chapterAt } from "../timeline";

type Bits = Pick<MechPose, "feet" | "hands" | "bob" | "lean">;
const blend = (a: Bits, b: Bits, w: number): Bits => ({
  feet: [
    [lerp(a.feet[0][0], b.feet[0][0], w), lerp(a.feet[0][1], b.feet[0][1], w)],
    [lerp(a.feet[1][0], b.feet[1][0], w), lerp(a.feet[1][1], b.feet[1][1], w)],
  ],
  hands: [
    [lerp(a.hands[0][0], b.hands[0][0], w), lerp(a.hands[0][1], b.hands[0][1], w)],
    [lerp(a.hands[1][0], b.hands[1][0], w), lerp(a.hands[1][1], b.hands[1][1], w)],
  ],
  bob: lerp(a.bob ?? 0, b.bob ?? 0, w),
  lean: lerp(a.lean ?? 0, b.lean ?? 0, w),
});

function climbBits(phi: number): Bits {
  const s = Math.sin(phi);
  const f = Math.sin(phi + 1.3);
  return {
    feet: [[-42, -46 - 38 * f], [42, -46 + 38 * f]],
    hands: [[-74, -332 - 58 * s], [74, -332 + 58 * s]],
    bob: Math.sin(phi * 2) * 3,
    lean: 0,
  };
}

function setCam(ws: WorldState, fx: number, fy: number, zoom: number, tilt: number) {
  ws.cam.x = fx - 640;
  ws.cam.y = 360 - fy;
  ws.cam.zoom = zoom;
  ws.cam.tilt = tilt;
}

const spike = (t: number, ts: number, w = 0.12) => Math.exp(-Math.pow((t - ts) / w, 2));

/** the landed star, sitting in the water; the beacon over it */
function landingFx(ctx: CanvasRenderingContext2D, ws: WorldState, t: number, opts: { orb: number; beacon: number }) {
  const lx = 330, ly = BASE4 - 14;
  const hb = heart(t);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (opts.beacon > 0.01) {
    const w = 18 + 8 * hb;
    const g = ctx.createLinearGradient(0, ly, 0, -1400);
    g.addColorStop(0, rgba([220, 245, 255], 0.75 * opts.beacon));
    g.addColorStop(0.5, rgba([140, 210, 255], 0.2 * opts.beacon));
    g.addColorStop(1, rgba([140, 210, 255], 0));
    ctx.fillStyle = g;
    ctx.fillRect(lx - w, -1400, w * 2, ly + 1400);
    ctx.fillStyle = rgba([255, 255, 255], 0.5 * opts.beacon);
    ctx.fillRect(lx - 3, -1400, 6, ly + 1400);
  }
  if (opts.orb > 0.01) {
    glow(ctx, lx, ly, 120 + 50 * hb, [150, 225, 255], 0.8 * opts.orb);
    glow(ctx, lx, ly, 40 + 14 * hb, [255, 255, 255], opts.orb);
    for (let k = 0; k < 4; k++) {
      const u = (t * 0.4 + k / 4) % 1;
      ctx.strokeStyle = rgba(ws.pal.accent, 0.5 * (1 - u) * opts.orb);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 2, 30 + u * 190, 4 + u * 28, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// =====================================================================
export function sceneWorld(ctx: CanvasRenderingContext2D, t: number, post: PostParams) {
  const pal0 = palAt(t);
  const ws = makeWorld(t, pal0);
  const ch = chapterAt(t).n;
  const hb = heart(t);
  let shk = 0;
  let overlay: ((c: CanvasRenderingContext2D) => void) | null = null;

  // ---------------------------------------------------------------- 1
  if (ch === 1) {
    const dist = 300 * smooth(11, 23.5, t);
    const mx = 540 + dist;
    const w = smooth(11, 12.2, t) * (1 - smooth(22.6, 23.6, t));
    const bits = blend(idlePose(t), walkPose(-Math.PI / 2 + (dist * Math.PI) / 108, 1), w);
    const lookUp = smooth(24, 28, t);
    const mech: MechPose = {
      ...mechBase(t, ws.pal, mx, BASE4), ...bits,
      lamp: kf(t, [[0, 0], [1.4, 0], [3.2, 0.9]]),
      glow: kf(t, [[0, 0], [2, 0], [5, 0.6]]),
      gaze: [0.25 * lookUp, -1 * lookUp], tilt: -0.1 * lookUp, heart: 0.6 + 0.3 * hb,
    };
    ws.mech = mech;
    ws.wake = 0.4 + 0.6 * w;
    ws.stars = smooth(2, 8, t);
    ws.eyes = kf(t, [[0, 0], [24, 0], [28, 0.04], [34, 0.12]]);
    ws.conste = smooth(18, 30, t) * 0.6;
    ws.moon = { x: 800, y: kf(t, [[0, 300], [34, 300]]), r: 120, alpha: 1, eye: 0, dil: 0.5 };
    ws.lantern.reveal = kf(t, [[0, 0], [2.3, 0], [24, 1.25]]);
    ws.lantern.breath = kf(t, [[0, 0], [15, 0], [24, 0.45], [33, 1]]);
    ws.lantern.lean = smooth(22, 32, t);
    ws.lantern.tx = 640; ws.lantern.ty = -500;
    ws.plankton = 0.6;
    const fx = kf(t, [[0, 465], [9, 545], [18, 690], [34, 880]]);
    const fy = kf(t, [[0, 245], [9, 380], [34, 366]]);
    setCam(ws, fx, fy, kf(t, [[0, 2.6], [10, 1.5], [20, 1.1], [34, 1.03]]), kf(t, [[0, 0], [26, 0], [32, 80]]));
    post.exposure = kf(t, [[0, 0], [1.2, 0], [3, 0.3], [9, 0.82], [14, 1]]);
    post.ripple = 0.9;
    post.glitch = spike(t, 33.2, 0.08) * 0.8;
    overlay = (c) => drawTitle(c, t, 26.5, 34, ws.pal);
  }

  // ---------------------------------------------------------------- 2
  if (ch === 2) {
    const turned = t >= 61;
    const mx = 840;
    const lookUp = smooth(34, 37, t) * (1 - smooth(51, 53, t));
    const lens = mix3(AMBER, RED, smooth(58, 60, t));
    const mech: MechPose = {
      ...mechBase(t, ws.pal, mx, BASE4, 0.85, turned ? -1 : 1),
      lens, glow: lerp(0.6, 1, smooth(58, 60, t)), gaze: [0.2 * lookUp, -lookUp], tilt: -0.1 * lookUp,
      lamp: 0.8, iris: lerp(0.5, 0.25, smooth(58, 60, t)), heart: 0.6 + 0.3 * hb,
    };
    ws.mech = mech;
    ws.wake = 0.6;
    ws.moon = { x: 800, y: kf(t, [[34, 300], [66, 168]]), r: kf(t, [[34, 120], [66, 94]]), alpha: 1, eye: 0, dil: 0.5 };
    ws.eyes = kf(t, [[34, 0.12], [40, 0.12], [46, 0.45], [50, 1]]);
    ws.conste = 0.6;
    ws.starsOut = kf(t, [[50, 0], [51.5, 1]]);
    ws.cracks = kf(t, [[40.9, 0], [41.1, 0.18], [43, 0.35], [46.5, 1]]);
    ws.aurora = kf(t, [[40, 0], [46, 0.8], [52, 0]]);
    ws.reflEyes = kf(t, [[44, 0], [50, 1], [52, 0]]);
    ws.lantern.breath = 1; ws.lantern.lean = 1;
    ws.lantern.level = t > 50 && t < 52 ? 0.6 + 0.4 * Math.sin(t * 30) ** 2 : 1;
    ws.plankton = kf(t, [[34, 0.6], [62, 0.6], [63, 1.6]]);
    const fx = kf(t, [[34, 880], [44, 740], [52, 600], [60, 600]]);
    setCam(ws, fx, 366, kf(t, [[34, 1.03], [44, 0.86], [50, 0.86], [58, 1.0]]), kf(t, [[34, 80], [44, 340], [50, 340], [55, 20], [58, 0]]));
    shk = 1.4 * spike(t, 41, 0.3) + 2 * spike(t, 44.6, 0.3) + 5 * spike(t, 62, 0.4) + 2;
    post.ripple = 0.9;
    post.glitch = Math.max(spike(t, 41, 0.1), spike(t, 43.2, 0.08), spike(t, 44.6, 0.12), spike(t, 46.2, 0.1), spike(t, 62, 0.14)) * 0.85;
    post.flash = 0.8 * spike(t, 62, 0.35) + 0.5 * spike(t, 41.05, 0.07);
    post.zoomBlur = 0.12 * spike(t, 62, 0.25);
    post.hue = 0.12 * Math.sin(t * 0.9) * smooth(38, 46, t);
    // the falling star
    const e = Math.pow(clamp((t - 52) / 10), 1.7);
    const pos = (u: number): V2 => {
      const k = Math.pow(clamp(u), 1.0);
      return [lerp(520, 330, k) + Math.sin(k * 9) * 14 * (1 - k), lerp(-700, BASE4 - 14, k)];
    };
    ws.behindMech = (c) => {
      if (t >= 52 && t < 62) {
        const sp = pos(e);
        c.save();
        c.globalCompositeOperation = "lighter";
        for (let i = 0; i < 34; i++) {
          const tt = Math.pow(clamp((t - i * 0.075 - 52) / 10), 1.7);
          const p = pos(tt);
          const f = 1 - i / 34;
          glow(c, p[0], p[1], 6 + 34 * f * (1 + 0.3 * hb), [170, 225, 255], 0.5 * f * f);
        }
        glow(c, sp[0], sp[1], 70 + 26 * hb, [190, 235, 255], 0.9);
        glow(c, sp[0], sp[1], 22 + 7 * hb, [255, 255, 255], 1);
        c.restore();
      }
      if (t >= 62) landingFx(c, ws, t, { orb: 1, beacon: kf(t, [[62, 1], [66, 0.7]]) * smooth(62, 62.2, t) });
    };
    overlay = (c) => drawMeteors(c, t, 40.4, 52);
  }

  // ---------------------------------------------------------------- 3
  if (ch === 3) {
    const dist = 320 * smooth(66, 74.5, t);
    const mx = 840 - dist;
    const w = smooth(66, 67.2, t) * (1 - smooth(73.4, 74.6, t));
    let bits = blend(idlePose(t), walkPose(-Math.PI / 2 + (dist * Math.PI) / 108, 1), w);
    // casting
    const wind = smooth(74.6, 77.2, t);
    const thr = smooth(77.2, 78.1, t);
    const haul = smooth(88.2, 92.6, t);
    const castHand: V2 = thr < 1 ? [lerp(lerp(104, 36, wind), 262, thr), lerp(lerp(-98, -392, wind), -250, thr)] : [lerp(262, 150, haul), lerp(-250, -190, haul)];
    const cast: Bits = {
      feet: bits.feet,
      hands: [[-96, -170 + (1 - wind) * 70], castHand],
      bob: 0,
      lean: lerp(lerp(0, -0.14, wind), 0.2, thr) * (1 - haul * 0.6),
    };
    const castW = smooth(74.4, 75.2, t);
    bits = blend(bits, cast, castW);
    const mech: MechPose = {
      ...mechBase(t, ws.pal, mx, BASE4, 0.85, -1), ...bits,
      lens: mix3(RED, AMBER, smooth(84, 88, t)), glow: 0.9, iris: 0.4, grip: [0.4, 0.9],
      gaze: [0.5, 0.2], heart: 0.7 + 0.3 * hb,
    };
    ws.mech = mech;
    ws.wake = 0.7;
    ws.moon = { x: 800, y: 168, r: 94, alpha: 1, eye: 0, dil: 0.5 };
    ws.lantern.breath = 1; ws.lantern.lean = 1;
    ws.eyes = 0; ws.starsOut = 0.0; ws.conste = 0.4;
    ws.plankton = kf(t, [[66, 1.6], [84, 1.8], [90, 1.0]]);
    const anc = mechAnchors(mech);
    // camera
    const fx = kf(t, [[66, 690], [74, 520], [88, 470], [93, 440]]);
    const fy = kf(t, [[66, 400], [78, 360], [88, 340], [93, 300]]);
    setCam(ws, fx, fy, kf(t, [[66, 1.15], [76, 1.0], [84, 0.92], [88, 1.2], [93, 2.3]]), 0);
    post.ripple = 0.9;
    post.flash = 0.35 * spike(t, 83.6, 0.2) + 0.25 * spike(t, 78, 0.1);
    shk = 2 * spike(t, 83.6, 0.3);
    const target: V2 = [330, BASE4 - 22];
    const spread = clamp((t - 78) / 5.4);
    const cinch = smooth(84, 87.6, t);
    const haulC: V2 = [lerp(target[0], anc.handR[0] + 20, haul), lerp(target[1], anc.handR[1] + 26, haul)];
    ws.frontMech = (c) => {
      // the star waits in the water until the net lands
      if (t < 83.6) landingFx(c, ws, t, { orb: 1, beacon: t < 78 ? 0.7 : 0.7 * (1 - smooth(81, 83.5, t)) });
      if (t >= 77.4) {
        const net = drawNet(c, {
          ox: anc.handR[0], oy: anc.handR[1], cx: haulC[0], cy: haulC[1], R: 210, spread, cinch, t, col: [170, 235, 255],
          flat: 0.3, alpha: 1,
        });
        if (t >= 83.5) {
          const sz = lerp(26, 60, haul);
          const ap = smooth(83.5, 85.5, t);
          drawBaby(c, { x: net.cx, y: net.cy - 4, size: sz, t, pal: ws.pal, glow: 1, eyes: smooth(84.5, 90, t), alpha: ap, look: [-0.4, 0.2] });
        }
        if (t >= 83.5 && t < 85) {
          glow(c, haulC[0], haulC[1], 220, [255, 255, 255], 1 - smooth(83.5, 85, t));
        }
      }
    };
  }

  // ---------------------------------------------------------------- 4
  if (ch === 4) {
    const lookUp = smooth(118, 126, t);
    const bits = idlePose(t);
    const pose: Bits = { ...bits, hands: [[-100, -96 + Math.sin(t) * 2], [128, -206]], lean: -0.02 * lookUp };
    const mech: MechPose = {
      ...mechBase(t, ws.pal, 560, BASE4, 0.85, 1), ...pose,
      glow: lerp(0.55, 0.4, lookUp), iris: lerp(0.5, 0.85, lookUp), gaze: [0.1 * lookUp, -lookUp], tilt: -0.12 * lookUp,
      lamp: lerp(0.8, 0.3, smooth(106, 118, t)), heart: 0.55 + 0.3 * hb, grip: [0.4, 0.1],
    };
    ws.mech = mech;
    ws.wake = 0.3;
    const dim = 1 - smooth(106, 118, t);
    ws.starsOut = kf(t, [[104, 0], [104.6, 0], [117, 1]]);
    ws.lantern.off = kf(t, [[104, 0], [106, 0], [117.5, 1.1]]);
    ws.lantern.breath = 0;
    ws.lantern.level = 1;
    ws.lantern.rise = kf(t, [[134, 0], [150, 1.25]]);
    ws.lantern.tx = 640; ws.lantern.ty = -600;
    ws.figures = kf(t, [[118, 0], [126, 1]]);
    ws.plankton = 0.35 * dim + 0.1;
    ws.moon = { x: 800, y: 168, r: 94, alpha: 1, eye: kf(t, [[116, 0], [128, 1]]), dil: kf(t, [[120, 0.1], [141, 0.95]]) };
    ws.fog = 0.5;
    const mo = smooth(124, 130, t);
    const sz = kf(t, [[124, 26], [130, 120], [137, 380], [144, 840]]);
    const mother: MantaOpts = {
      x: kf(t, [[124, 800], [144, 640]]), y: kf(t, [[124, 168], [140, 180], [144, 90]]), size: sz, rot: 0, t,
      flap: t * 0.9, amp: 0.8, alpha: mo, glow: kf(t, [[130, 0.1], [144, 0.5]]), eyes: smooth(131, 142, t), maw: kf(t, [[138, 0], [144, 0.7]]),
      map: smooth(134, 141, t) * 0.8, heartStar: 0, skin: [28, 44, 68], skinDark: [5, 9, 20], light: ws.pal.lit, look: [0, 0.6], tail: true,
    };
    if (t > 124) ws.mother = mother;
    ws.beams = kf(t, [[138, 0], [144, 1]]);
    ws.rain = kf(t, [[134, 0], [144, 1]]);
    setCam(ws, 600, 366, kf(t, [[104, 1.0], [144, 0.8]]), kf(t, [[104, 0], [122, 30], [132, 140], [144, 300]]));
    shk = kf(t, [[104, 0], [138, 0.2], [144, 3]]);
    post.ripple = 0.25;
    post.exposure = lerp(1, 0.9, dim);
    post.vig = 0.95;
    post.chroma = 0.3 + 0.5 * smooth(134, 144, t);
    const anc = mechAnchors(mech);
    ws.frontMech = (c) => {
      drawBaby(c, { x: anc.handR[0] + 2, y: anc.handR[1] - 32 + Math.sin(t * 1.4) * 2, size: 34, t, pal: ws.pal, glow: 0.9 - 0.35 * mo, weak: 0.3, eyes: 1, look: [0, -0.8], rot: 0.05 });
    };
  }

  // ---------------------------------------------------------------- 5
  if (ch === 5) {
    const mx = 560 + 450 * smooth(152, 183, t);
    const w = smooth(152, 154, t) * (1 - smooth(181, 183.5, t));
    const dist = (mx - 560);
    const stumble = 1 - smooth(147, 152, t);
    let bits = blend(idlePose(t), walkPose(-Math.PI / 2 + (dist * Math.PI) / 108, 1), w);
    bits = { ...bits, hands: [bits.hands[0], [lerp(bits.hands[1][0], 128, stumble), lerp(bits.hands[1][1], -206, stumble)]], lean: (bits.lean ?? 0) - 0.14 * stumble };
    const mech: MechPose = {
      ...mechBase(t, ws.pal, mx, BASE4, 0.85, 1), ...bits,
      glow: 0.5, iris: 0.9, gaze: [0.1, -1], tilt: -0.1 * stumble, lamp: 0.2, heart: 0.5 + 0.4 * hb, grip: [0.4, 0.2],
    };
    ws.mech = mech;
    ws.wake = 0.8;
    ws.starsOut = 1;
    ws.lantern.off = 1.1;
    ws.lantern.rise = 1.3;
    ws.lantern.tx = 640; ws.lantern.ty = -600;
    ws.figures = kf(t, [[144, 1], [160, 0.3]]);
    ws.plankton = 0.2;
    ws.moon = { x: 800, y: 168, r: 94, alpha: 1, eye: 1, dil: 0.95 };
    ws.collapse = t - 146;
    ws.mother = {
      x: kf(t, [[144, 640], [152, 420], [162, 780], [176, 600]]), y: kf(t, [[144, 90], [152, 150], [165, 60], [176, 100]]), size: 880,
      rot: kf(t, [[144, 0], [152, -0.2], [162, 0.22], [176, 0.0]]), t, flap: t * 2.1, amp: 1.5, alpha: 1, glow: 0.6, eyes: 1,
      maw: 0.55 + 0.3 * Math.sin(t * 1.3), map: 0.85, heartStar: 0, skin: [40, 18, 30], skinDark: [10, 3, 8], light: ws.pal.lit, look: [0, 0.7],
    };
    ws.beams = kf(t, [[144, 1], [160, 0.6], [176, 0.9]]);
    ws.rain = 0.8;
    ws.fog = 0.5;
    setCam(ws, 620 + 0.0 * mx, 366, kf(t, [[144, 0.8], [156, 0.95], [184, 1.05]]), kf(t, [[144, 300], [156, 190], [176, 90], [184, 60]]));
    shk = kf(t, [[144, 3], [150, 11], [156, 6], [184, 3]]) + 10 * spike(t, 151.5, 0.4);
    // the fold: Inception
    post.fold = kf(t, [[149.5, 0], [153, 0.1], [163, 1.25], [170, 2.2], [177, 2.2], [184, 3.05]]);
    post.roll = kf(t, [[154, 0], [168, 0.45], [184, 1.7]]) + Math.sin(t * 0.8) * 0.03;
    post.horizon = 0.58;
    post.kaleido = t > 178 ? kf(t, [[178, 3], [182, 6], [184, 14]]) : 0;
    post.kRot = t * 0.4;
    post.swirl = kf(t, [[176, 0], [184, 1.4]]);
    post.glitch = spike(t, 151.5, 0.12) * 0.9 + spike(t, 157, 0.08) * 0.5 + spike(t, 180.2, 0.1) * 0.7;
    post.flash = 0.9 * spike(t, 151.5, 0.1) + smooth(183.3, 184, t);
    post.hue = kf(t, [[178, 0], [184, 1.2]]);
    post.ripple = 0.5;
    post.chroma = 0.7;
  }

  // ---------------------------------------------------------------- 6
  if (ch === 6) {
    const climb = kfl(t, [[184, 70], [188, 380], [196, 1500], [205, 3100], [207.6, 3290], [212, 3290]]);
    const phi = climb * 0.026;
    const top = smooth(206.3, 208.4, t);
    const bits = blend(climbBits(phi), idlePose(t), top);
    const strobe = tickPulse(t);
    ws.pal = mixPal(pal0, PALS.day, 0.42 * strobe);
    const lookUp = smooth(205, 210, t);
    const mech: MechPose = {
      ...mechBase(t, ws.pal, SPIRE_X, BASE4 - climb, 0.85, 1), ...bits,
      glow: 0.55 + 0.4 * strobe, iris: 0.4, gaze: [0, -0.8 * lookUp], tilt: -0.1 * lookUp, lamp: 0.5 + 0.4 * strobe,
      heart: 0.6 + 0.3 * hb + 0.4 * strobe, grip: [1, 1],
    };
    ws.mech = mech;
    ws.starsOut = 1;
    ws.lantern.off = 1.2; ws.lantern.level = 0;
    ws.runes = 1;
    ws.wave = kf(t, [[184, 0.15], [200, 0.8], [212, 1]]);
    ws.cloud = kf(t, [[188, 0], [196, 1]]);
    ws.moon = { x: 800, y: 168, r: 94, alpha: 0.9, eye: 1, dil: 0.95 };
    ws.plankton = 0;
    ws.fog = 0.2;
    ws.ash = 0.5;
    const camY = climb;
    setCam(ws, SPIRE_X + 20, 360, kf(t, [[184, 1.0], [196, 0.92], [207, 1.1]]), kf(t, [[184, 0], [196, -50], [208, 40], [212, 60]]));
    ws.cam.y = camY;
    shk = 1.6 + 1.2 * strobe;
    post.ripple = 0.4;
    post.chroma = 0.4 + 0.8 * strobe;
    post.flash = (1 - smooth(184, 184.8, t)) * 0.9 + smooth(211.3, 212, t);
    post.bloom = 1 + 0.5 * strobe;
    const anc = mechAnchors(mech);
    ws.frontMech = (c) => {
      drawBaby(c, { x: anc.lens[0] + 96, y: anc.lens[1] + 24 + Math.sin(t * 1.7) * 3, size: 30, t, pal: ws.pal, glow: 0.9, weak: 0.35, eyes: 1, look: [-0.6, 0.1] });
    };
  }

  // ---------------------------------------------------------------- 8
  if (ch === 8) {
    const climbTop = SPIRE_H;
    const bits = idlePose(t);
    const reach = smooth(256, 258, t) * (1 - smooth(266.5, 268.5, t));
    const hands: [V2, V2] = [
      [lerp(bits.hands[0][0], -40, smooth(262.5, 264.5, t) * (1 - smooth(266, 268, t))), lerp(bits.hands[0][1], -226, smooth(262.5, 264.5, t) * (1 - smooth(266, 268, t)))],
      [lerp(bits.hands[1][0], 130, reach + (1 - reach) * smooth(252, 253.5, t) * (t < 256 ? 1 : 0)), lerp(bits.hands[1][1], -204, reach + (1 - reach) * smooth(252, 253.5, t) * (t < 256 ? 1 : 0))],
    ];
    const chestO = kf(t, [[256.5, 0], [260, 1]]);
    const heartB = t < 263 ? kf(t, [[252, 0.8], [260, 1.35], [263, 1.5]]) : 0;
    const bow = smooth(268, 278, t);
    const mech: MechPose = {
      ...mechBase(t, ws.pal, SPIRE_X, BASE4 - climbTop - 2, 0.85, 1), ...bits, hands,
      lean: (bits.lean ?? 0) + 0.12 * bow + 0.05 * smooth(256, 260, t),
      chest: chestO, heart: heartB, hollow: t > 263.1,
      glow: kf(t, [[252, 0.7], [263, 0.85], [268, 0.12], [272, 0.04], [280, 0]]), iris: 0.35,
      lamp: kf(t, [[252, 0.8], [264, 0.5], [270, 0]]), tilt: 0.45 * bow - 0.1 * (1 - bow) * smooth(252, 256, t),
      gaze: [0.2, 0.2], lens: AMBER, grip: [0.4, 0.1],
    };
    ws.mech = mech;
    ws.starsOut = kf(t, [[266, 1], [275, 0]]);
    ws.lantern.off = 1.2; ws.lantern.level = 0;
    ws.runes = kf(t, [[252, 1], [272, 0.2]]);
    ws.wave = kf(t, [[252, 1], [272, 0.1], [279, 0]]);
    ws.cloud = kf(t, [[252, 0.8], [279, 0.3]]);
    ws.moon = { x: 800, y: 168, r: 94, alpha: 0.9, eye: kf(t, [[252, 1], [270, 0]]), dil: 0.5 };
    ws.fog = 0.2;
    ws.plankton = 0;
    ws.cam.y = SPIRE_H - 10;
    ws.cam.x = SPIRE_X - 640;
    ws.cam.zoom = kf(t, [[252, 1.45], [262, 1.9], [270, 1.45], [276, 1.0], [280, 0.9]]);
    ws.cam.tilt = kf(t, [[252, 20], [262, 36], [268, 60], [275, 330], [280, 180]]);
    ws.cam.x += 0;
    shk = 0.8 + 3 * spike(t, 267.2, 0.4);
    ws.mother = {
      x: 700, y: kf(t, [[252, -150], [268, -170], [280, -430]]), size: kf(t, [[252, 520], [280, 400]]), rot: 0, t,
      flap: t * 0.7, amp: 0.5, alpha: 1, glow: kf(t, [[252, 0.4], [276, 0.8]]), eyes: kf(t, [[252, 1], [270, 0.35], [278, 0]]),
      maw: 0, map: 1, heartStar: kf(t, [[272, 0], [277.4, 1]]), skin: [58, 50, 84], skinDark: [14, 10, 32], light: GOLD, look: [0, 0.8],
    };
    ws.beams = kf(t, [[252, 0.4], [262, 0.2], [270, 0]]);
    ws.ash = 0.4;
    const anc = mechAnchors(mech);
    const sizeB = 38;
    const babyBase: V2 = [anc.handR[0] + 2, anc.handR[1] - 30];
    const lift = 54 * Math.pow(Math.sin(clamp((t - 254.2) / 2.4) * Math.PI), 0.8) * (t < 257 ? 1 : 0);
    const e = smooth(269, 277.2, t);
    const tgt: V2 = [ws.mother.x, ws.mother.y + 0.01 * ws.mother.size];
    const sBase = toSky(ws, babyBase);
    const babyPos: V2 = [lerp(sBase[0], tgt[0], e) + Math.sin(e * 9) * 30 * e * (1 - e), lerp(sBase[1] - lift, tgt[1], Math.pow(e, 1.15))];
    const weak = kf(t, [[252, 0.85], [267, 0.85], [268.6, 0]]);
    ws.skyFx = (c) => {
      const sz = lerp(sizeB, 24, e) * (t > 268.6 ? 1.0 + 0.5 * smooth(268.6, 271, t) : 1);
      const a = 1 - smooth(276.6, 277.6, t);
      drawBaby(c, { x: babyPos[0], y: babyPos[1], size: sz, t, pal: ws.pal, col: t > 267.5 ? GOLD : undefined, glow: t > 268 ? 1.4 : 0.9, weak, eyes: 1, alpha: a, look: [0, -0.5] });
      if (t > 276.8) glow(c, tgt[0], tgt[1], 300 * (1 - smooth(277, 280, t)) + 20, GOLD, 1 * (1 - smooth(278.5, 280, t)));
    };
    // the heart leaves the chest
    ws.frontMech = (c) => {
      if (t >= 262.8 && t < 267.6) {
        const k = smooth(262.8, 267.2, t);
        const a: V2 = [anc.chest[0], anc.chest[1]];
        const b: V2 = babyBase;
        const p: V2 = [lerp(a[0], b[0], k) + Math.sin(k * Math.PI) * -40, lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 50];
        const s = 1 + 0.2 * hb;
        glow(c, p[0], p[1], 90 * s, AMBER, 0.9);
        glow(c, p[0], p[1], 30 * s, [255, 255, 255], 1);
      }
    };
    overlay = (c) => risingLights(c, t, kf(t, [[264, 0], [273, 1], [280, 0.7]]), GOLD, 0.3);
    post.flash = 0.35 * spike(t, 267.6, 0.25) + 0.5 * spike(t, 277.2, 0.3);
    post.bloom = 0.6;
    post.ripple = 0.2;
  }

  // ---------------------------------------------------------------- 9
  if (ch === 9) {
    const ignite = smooth(295.4, 295.55, t);
    const fz = kf(t, [[280, 0.95], [292, 1.15], [300, 1.9]]);
    const fy = kf(t, [[280, 410], [292, 380], [300, 290]]);
    setCam(ws, 640, fy, fz, 0);
    const mech: MechPose = {
      ...mechBase(t, ws.pal, 640, BASE4, 1.0, 1), ...idlePose(t),
      lens: mix3([180, 190, 255], COLD, ignite), glow: ignite * (0.9 + 0.1 * Math.sin(t * 20)), iris: lerp(0.5, 0.2, ignite),
      gaze: [0, 0], tilt: -0.1 * smooth(293, 295, t), lamp: 0, hollow: true, heart: 0, chest: 1,
    };
    ws.mech = mech;
    ws.wake = 0.2 + 0.8 * ignite;
    ws.starsOut = 0;
    ws.stars = 0.85;
    ws.moon = { x: 800, y: 168, r: 94, alpha: 0.75, eye: 0, dil: 0.5 };
    ws.lantern.off = 1.2; ws.lantern.level = 0;
    const blink = 1 - env(t, 295.3, 295.45, 295.6, 295.95);
    ws.reflEyes = kf(t, [[281, 0], [292.5, 1]]) * blink;
    ws.plankton = kf(t, [[280, 0.3], [291, 0], [295.4, 2]]) * (t > 295.3 ? 1 : 1);
    ws.fog = 0.6;
    shk = 0.5 + 6 * spike(t, 295.42, 0.25);
    post.ripple = 1.0;
    post.flash = 0.9 * spike(t, 295.45, 0.3);
    post.glitch = 0.9 * spike(t, 295.45, 0.12);
    post.chroma = 0.35 + 1.0 * spike(t, 295.45, 0.4);
    post.exposure = (1 - smooth(299.1, 300, t)) * smooth(280, 281.4, t);
    post.vig = 1.05;
    overlay = (c) => {
      if (t < 296) return;
      const k = t - 296;
      c.save();
      const bandG = c.createLinearGradient(0, 520, 0, 672);
      bandG.addColorStop(0, "rgba(0,0,6,0)");
      bandG.addColorStop(1, `rgba(0,0,6,${0.75 * smooth(0, 1, k)})`);
      c.fillStyle = bandG;
      c.fillRect(0, 520, 1280, 152);
      c.textBaseline = "middle";
      c.fillStyle = rgba(mix3(ws.pal.moon, [255, 255, 255], 0.5));
      c.font = `300 52px "Cormorant Garamond", Georgia, serif`;
      c.globalAlpha = smooth(0, 1.2, k);
      const txt = "TO BE CONTINUED";
      const widths = [...txt].map((ch) => c.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + 22 * (txt.length - 1);
      let x = 640 - total / 2;
      [...txt].forEach((ch2, i) => {
        c.fillText(ch2, x + (k < 0.5 ? (Math.random() - 0.5) * 4 : 0), 596);
        x += widths[i] + 22;
      });
      c.font = `400 19px "Cormorant Garamond", Georgia, serif`;
      c.globalAlpha = smooth(1.6, 2.8, k) * 0.85;
      const sub = "EPISODE II  ·  THE LONG DESCENT";
      const w2 = [...sub].map((ch2) => c.measureText(ch2).width);
      const t2 = w2.reduce((a, b) => a + b, 0) + 9 * (sub.length - 1);
      let x2 = 640 - t2 / 2;
      [...sub].forEach((ch2, i) => {
        c.fillText(ch2, x2, 644);
        x2 += w2[i] + 9;
      });
      c.restore();
    };
  }

  // ------------------------------------------------------------ finish
  const sh = shake(t, shk);
  ws.cam.x += sh[0];
  ws.cam.y += sh[1];
  post.horizon = horizonY(ws) / H;
  if (post.fold === 0) post.foldY = post.horizon;
  else post.foldY = 0.6;
  drawWorld(ctx, ws);
  if (overlay) overlay(ctx);
  void ({} as RGB);
}
