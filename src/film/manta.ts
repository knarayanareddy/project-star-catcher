import { RGB, TAU, V2, clamp, hash, smooth, mix3, rgba } from "./util";
import { glow } from "./look";

/**
 * The sky-beasts. Seen from below (belly view). The mother's belly carries a star map;
 * look closely: the lit figure on it is the old Star Catcher himself. (Series hook.)
 */
export const MAP_PTS: V2[] = [
  [0, -0.17], [-0.085, -0.095], [0.085, -0.095], // 0 hat apex, 1 hat L, 2 hat R
  [0, -0.075], // 3 head
  [-0.1, -0.025], [0.1, -0.025], // 4,5 shoulders
  [-0.17, 0.06], [0.17, -0.1], // 6 hand L, 7 hand R (raised, casting)
  [0, 0.01], // 8 CHEST: the missing star
  [0, 0.1], // 9 hip
  [-0.06, 0.19], [0.06, 0.19], // 10,11 knees
  [-0.085, 0.28], [0.085, 0.28], // 12,13 feet
  [-0.11, -0.12], [-0.13, -0.175], // 14 pole, 15 lamp
];
export const MAP_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 2], [3, 0], [3, 4], [3, 5], [4, 6], [5, 7], [4, 8], [5, 8],
  [8, 9], [9, 10], [9, 11], [10, 12], [11, 13], [4, 14], [14, 15],
];
const FAR_STARS: V2[] = Array.from({ length: 26 }, (_, i) => [
  (hash(i * 3.1) - 0.5) * 1.5,
  (hash(i * 7.7) - 0.5) * 0.7 + 0.02,
]);

export interface MantaOpts {
  x: number;
  y: number;
  size: number; // half wingspan, px
  rot?: number;
  t: number;
  flap?: number; // phase
  amp?: number; // flap amplitude 0..1
  alpha?: number;
  glow?: number; // belly light
  eyes?: number; // 0..1 how many eyes have opened
  maw?: number;
  map?: number; // constellation visible
  heartStar?: number; // the missing star
  skin: RGB;
  skinDark: RGB;
  light: RGB;
  look?: V2;
  blinkSeed?: number;
  tail?: boolean;
}

function bez(p0: V2, p1: V2, p2: V2, p3: V2, u: number): V2 {
  const a = 1 - u;
  return [
    a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0],
    a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1],
  ];
}

export function drawEye(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, open: number,
  light: RGB, look: V2 = [0, 0], pupil = 0.14, alpha = 1,
) {
  if (open <= 0.02 || r <= 0) return;
  const h = r * 0.78 * open;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(0, -h * 1.9, r, 0);
  ctx.quadraticCurveTo(0, h * 1.9, -r, 0);
  ctx.closePath();
  ctx.fillStyle = rgba(mix3(light, [255, 255, 255], 0.7), 1);
  ctx.fill();
  ctx.clip();
  const ix = look[0] * r * 0.3;
  const iy = look[1] * h * 0.3;
  const ir = ctx.createRadialGradient(ix, iy, 0, ix, iy, r * 0.62);
  ir.addColorStop(0, "rgba(0,0,0,1)");
  ir.addColorStop(0.35, "rgba(0,0,0,1)");
  ir.addColorStop(0.4, rgba(light, 1));
  ir.addColorStop(1, rgba(mix3(light, [0, 0, 20], 0.7), 1));
  ctx.fillStyle = ir;
  ctx.beginPath();
  ctx.arc(ix, iy, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(ix, iy, Math.max(r * 0.05, r * pupil * 0.5), r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawManta(ctx: CanvasRenderingContext2D, o: MantaOpts) {
  const S = o.size;
  const a = o.alpha ?? 1;
  if (a <= 0 || S < 2) return;
  const flapPh = o.flap ?? o.t * 1.2;
  const fl = Math.sin(flapPh) * 0.16 * (o.amp ?? 1);
  const gl = o.glow ?? 0.3;

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rot ?? 0);
  ctx.scale(S, S);
  ctx.globalAlpha = a;

  // tail
  if (o.tail !== false) {
    ctx.beginPath();
    ctx.moveTo(0, 0.38);
    const sw = Math.sin(o.t * 0.8) * 0.12;
    ctx.bezierCurveTo(sw, 0.7, -sw, 1.0, sw * 1.4, 1.5);
    ctx.lineWidth = 0.022;
    ctx.strokeStyle = rgba(o.skinDark, 0.95);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // body
  const P = (x: number, y: number): V2 => [x, y];
  const head = P(0, -0.32);
  const leC1 = P(0.32, -0.4 + fl * 0.3), leC2 = P(0.72, -0.3 + fl * 0.8), tip = P(1.0, 0.02 + fl);
  const teC1 = P(0.78, 0.1 + fl * 0.8), teC2 = P(0.42, 0.1 + fl * 0.3), teEnd = P(0.07, 0.36);
  ctx.beginPath();
  ctx.moveTo(head[0], head[1]);
  ctx.bezierCurveTo(leC1[0], leC1[1], leC2[0], leC2[1], tip[0], tip[1]);
  ctx.bezierCurveTo(teC1[0], teC1[1], teC2[0], teC2[1], teEnd[0], teEnd[1]);
  ctx.lineTo(0, 0.41);
  ctx.lineTo(-teEnd[0], teEnd[1]);
  ctx.bezierCurveTo(-teC2[0], teC2[1], -teC1[0], teC1[1], -tip[0], tip[1]);
  ctx.bezierCurveTo(-leC2[0], leC2[1], -leC1[0], leC1[1], head[0], head[1]);
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -0.05, 0.02, 0, 0, 1.05);
  g.addColorStop(0, rgba(mix3(o.skin, o.light, 0.18 + gl * 0.35), 1));
  g.addColorStop(0.45, rgba(o.skin, 1));
  g.addColorStop(1, rgba(o.skinDark, 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.006;
  ctx.strokeStyle = rgba(o.light, 0.25 + gl * 0.5);
  ctx.stroke();

  // clip to body for belly detail
  ctx.save();
  ctx.clip();
  // ribs
  ctx.lineWidth = 0.004;
  ctx.strokeStyle = rgba(o.skinDark, 0.5);
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 9; i++) {
      const u = 0.18 + i * 0.09;
      const pt = bez(head, leC1, leC2, tip, u);
      ctx.beginPath();
      ctx.moveTo(s * 0.06, 0.02 + i * 0.012);
      ctx.quadraticCurveTo(s * pt[0] * 0.5, pt[1] * 0.3 + 0.1, s * pt[0], pt[1]);
      ctx.stroke();
    }
  }
  // gills
  ctx.lineWidth = 0.007;
  ctx.strokeStyle = rgba(o.skinDark, 0.9);
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.15, 0.1 + i * 0.045);
      ctx.quadraticCurveTo(s * 0.2, 0.115 + i * 0.045, s * 0.255, 0.1 + i * 0.045 - 0.005);
      ctx.stroke();
    }
  }
  ctx.restore();

  // maw (concentric, rotating: the horror)
  const maw = o.maw ?? 0;
  if (maw > 0.01) {
    ctx.save();
    ctx.translate(0, -0.2);
    ctx.fillStyle = "#02030a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.16 * maw, 0.085 * maw, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(o.light, 0.55);
    ctx.lineWidth = 0.003;
    for (let k = 1; k <= 5; k++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.16 * maw * (k / 5.5), 0.085 * maw * (k / 5.5), 0, 0, TAU);
      ctx.stroke();
    }
    for (let k = 0; k < 28; k++) {
      const an = (k / 28) * TAU + o.t * 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(an) * 0.16 * maw, Math.sin(an) * 0.085 * maw);
      ctx.lineTo(Math.cos(an) * 0.075 * maw, Math.sin(an) * 0.04 * maw);
      ctx.stroke();
    }
    ctx.restore();
  }

  // belly map
  const map = o.map ?? 0;
  if (map > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(o.light, 0.6 * map * a);
    ctx.lineWidth = Math.max(0.0025, 1.1 / S);
    for (const [i, j] of MAP_EDGES) {
      if (i === 8 || j === 8) {
        if ((o.heartStar ?? 0) < 0.05) continue;
        ctx.strokeStyle = rgba(o.light, 0.8 * map * (o.heartStar ?? 0));
      } else ctx.strokeStyle = rgba(o.light, 0.6 * map);
      ctx.beginPath();
      ctx.moveTo(MAP_PTS[i][0], MAP_PTS[i][1]);
      ctx.lineTo(MAP_PTS[j][0], MAP_PTS[j][1]);
      ctx.stroke();
    }
    const dot = 0.014;
    MAP_PTS.forEach((p, i) => {
      const tw = 0.7 + 0.3 * Math.sin(o.t * 2 + i * 1.7);
      if (i === 8) {
        const hs = o.heartStar ?? 0;
        glow(ctx, p[0], p[1], dot * 8 * (0.3 + hs), o.light, map * (0.25 + hs));
        return;
      }
      glow(ctx, p[0], p[1], dot * 3.2, o.light, map * tw);
    });
    FAR_STARS.forEach((p, i) => glow(ctx, p[0], p[1], dot * 1.7, o.light, map * 0.5 * (0.5 + 0.5 * Math.sin(o.t * 1.3 + i))));
    ctx.globalCompositeOperation = "source-over";
  }

  // eyes along the leading edge + head
  const eyes = o.eyes ?? 0;
  if (eyes > 0.01) {
    const N = 12;
    const look = o.look ?? [0, 0];
    const eyeList: { p: V2; r: number }[] = [];
    for (let s = -1; s <= 1; s += 2) {
      eyeList.push({ p: [s * 0.13, -0.235], r: 0.052 });
      [0.28, 0.4, 0.52, 0.64, 0.76].forEach((u, i) => {
        const pt = bez(head, leC1, leC2, tip, u);
        eyeList.push({ p: [s * pt[0] * 0.93, pt[1] + 0.045], r: 0.04 - i * 0.003 });
      });
    }
    eyeList.forEach((e, i) => {
      const k = (i % 6) / 6 + (e.p[0] < 0 ? 0.04 : 0);
      let op = smooth(k * 0.7, k * 0.7 + 0.3, eyes);
      const bl = Math.sin(o.t * (0.6 + hash(i + (o.blinkSeed ?? 0)) * 0.5) + i * 4.1);
      if (bl > 0.985) op *= 0.1;
      glow(ctx, e.p[0], e.p[1], e.r * 3.2, o.light, 0.5 * op * clamp(eyes * 1.2));
      drawEye(ctx, e.p[0], e.p[1], e.r, op, o.light, look, 0.12, 1);
    });
    void N;
  }

  // underlight bloom
  if (gl > 0.02) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    const bg = ctx.createRadialGradient(0, 0.02, 0, 0, 0.02, 0.65);
    bg.addColorStop(0, rgba(o.light, (S > 100 ? 0.1 : 0.28) * gl));
    bg.addColorStop(1, rgba(o.light, 0));
    ctx.fillStyle = bg;
    ctx.fillRect(-1.1, -0.7, 2.2, 1.4);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}
