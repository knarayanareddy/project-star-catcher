import { C } from "./palette";

/* =========================================================================================
 * Figure rig v2 — sculpted, shaded, alive.
 *  - garment-shaped torso (shoulder, chest, waist, flared coat hem that swings with the legs)
 *  - tapered limbs with real hands, cuffs, trousers and shoes
 *  - profile head with brow, nose, lips, jaw, ear, almond eye, proper glasses
 *  - hair / headwear per style, braid + coat + lanyard secondary motion
 *  - idle life: breathing, weight shift, blinking (driven by a global clock)
 * ======================================================================================= */

type Ctx = CanvasRenderingContext2D;
export type V2 = [number, number];

export interface FigureStyle {
  build: number;
  skin: string;
  hair: string;
  hairStyle: "short" | "bun" | "braid" | "crop" | "scarf" | "curly" | "white" | "bald" | "tuft" | "twist";
  top: string;
  topDark: string;
  bottom: string;
  shoes: string;
  /** coat/skirt length below hip, in fractions of height (0 = none) */
  coat?: number;
  glasses?: boolean;
  gloves?: boolean;
  extras?: string[];
  mustache?: boolean;
  /** nose size multiplier */
  nose?: number;
  lashes?: boolean;
  bunLow?: boolean;
  /** head carried forward (stoop) */
  hunch?: number;
  wrinkle?: boolean;
  shortSleeve?: boolean;
  /** extra chest / belly volume */
  bust?: number;
  belly?: number;
  stubble?: boolean;
  eye?: string;
  accent?: string;
}

export interface Pose {
  hip: V2;
  lean: number;
  tilt: number;
  footB: V2;
  footF: V2;
  handB: V2;
  handF: V2;
  mouth?: number;
  back?: boolean;
  elbowB?: number;
  elbowF?: number;
  gaze?: number;
  /** -1 worried/furrowed … +1 raised */
  brow?: number;
  /** -1 frown … +1 smile */
  smile?: number;
}

export interface Joints {
  hip: V2;
  shoulder: V2;
  head: V2;
  handF: V2;
  handB: V2;
  footF: V2;
  footB: V2;
  scale: number;
  facing: number;
  local: (wx: number, wy: number) => V2;
}

/* ---------- global clock (set by the player each frame) ---------- */
const clock = { t: 0 };
export function setFigureClock(t: number) {
  clock.t = t;
}
export const getFigureClock = () => clock.t;

/* ---------- colour + geometry helpers ---------- */
function hex(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const r = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(c);
  if (r) return [+r[1], +r[2], +r[3]];
  return [128, 128, 128];
}
function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const r = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
const shade = (c: string, t: number) => mix(c, "#150d20", t);
const tint = (c: string, t: number) => mix(c, "#fff8ec", t);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function spline(ctx: Ctx, pts: V2[], closed = false, move = true, k = 1) {
  const n = pts.length;
  const g = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  if (move) ctx.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    ctx.bezierCurveTo(
      p1[0] + ((p2[0] - p0[0]) / 6) * k,
      p1[1] + ((p2[1] - p0[1]) / 6) * k,
      p2[0] - ((p3[0] - p1[0]) / 6) * k,
      p2[1] - ((p3[1] - p1[1]) / 6) * k,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
}

function ik(ax: number, ay: number, bx: number, by: number, l1: number, l2: number, dir: number): V2 {
  let dx = bx - ax;
  let dy = by - ay;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.0005;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const min = Math.abs(l1 - l2) + 0.001;
  if (d < min) d = min;
  const a = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = a + dir * Math.acos(cosA);
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

/* ---------- poses ---------- */
export const poses = {
  stand(breath = 0): Pose {
    const t = clock.t;
    const sw = Math.sin(t * 0.85);
    return {
      hip: [sw * 0.006, -0.475 + breath * 0.0035],
      lean: Math.sin(t * 0.63) * 0.011,
      tilt: Math.sin(t * 0.47 + 1) * 0.022,
      footB: [-0.045, 0],
      footF: [0.05, 0],
      handB: [-0.03 + Math.sin(t * 1.05) * 0.01, -0.2 + Math.sin(t * 0.8) * 0.006],
      handF: [0.03 + Math.sin(t * 0.9 + 2) * 0.01, -0.2 + Math.sin(t * 1.1) * 0.006],
    };
  },
  walk(ph: number, amp = 1): Pose {
    const s = 0.13 * amp;
    const f = (p: number): V2 => {
      const q = ((p % 1) + 1) % 1;
      if (q < 0.5) return [s - (q / 0.5) * 2 * s, 0];
      const u = (q - 0.5) / 0.5;
      return [-s + 2 * s * u, -0.085 * amp * Math.sin(Math.PI * u)];
    };
    const a = f(ph);
    const b = f(ph + 0.5);
    const bob = Math.abs(Math.cos(Math.PI * 2 * ph)) * 0.016 * amp;
    const sway = Math.sin(Math.PI * 2 * ph) * 0.006;
    return {
      hip: [sway, -0.435 - bob],
      lean: 0.075,
      tilt: -0.045 + Math.sin(Math.PI * 4 * ph) * 0.012,
      footF: a,
      footB: b,
      handF: [-a[0] * 1.15 + 0.02, -0.21 - Math.max(0, -a[0]) * 0.2 + Math.abs(a[0]) * 0.02],
      handB: [-b[0] * 1.15 - 0.02, -0.21 - Math.max(0, -b[0]) * 0.2 + Math.abs(b[0]) * 0.02],
      elbowF: 1,
      elbowB: 1,
    };
  },
  kneel(): Pose {
    return {
      hip: [-0.03, -0.3],
      lean: 0.14,
      tilt: 0,
      footF: [0.17, 0],
      footB: [-0.24, -0.015],
      handB: [0.06, -0.16],
      handF: [0.2, -0.3],
    };
  },
  crouch(): Pose {
    return {
      hip: [-0.04, -0.28],
      lean: 0.4,
      tilt: -0.1,
      footF: [0.1, 0],
      footB: [-0.08, 0],
      handB: [0.14, -0.1],
      handF: [0.22, -0.16],
    };
  },
};

/* ---------- the figure ---------- */
export function drawFigure(ctx: Ctx, x: number, y: number, h: number, facing: 1 | -1, st: FigureStyle, pose: Pose, shadow = true): Joints {
  const T = clock.t;
  const toW = (p: V2): V2 => [x + facing * p[0] * h, y + p[1] * h];
  const L = (wx: number, wy: number): V2 => [((wx - x) / h) * facing, (wy - y) / h];
  const b = st.build;
  const lw = Math.max(1, h / 150);
  const OL = (c: string) => shade(c, 0.66);
  const extras = st.extras ?? [];

  const hip = pose.hip;
  const sn = Math.sin(pose.lean);
  const cs = Math.cos(pose.lean);
  const shoulder: V2 = [hip[0] + sn * 0.3, hip[1] - cs * 0.3];
  const hs = pose.lean + pose.tilt + (st.hunch ?? 0);
  const head: V2 = [shoulder[0] + Math.sin(hs) * 0.126, shoulder[1] - Math.cos(hs) * 0.126];

  const kneeF = ik(hip[0], hip[1], pose.footF[0], pose.footF[1], 0.235, 0.235, -1);
  const kneeB = ik(hip[0], hip[1], pose.footB[0], pose.footB[1], 0.235, 0.235, -1);
  const shB: V2 = [shoulder[0] - 0.012, shoulder[1] + 0.014];
  const shF: V2 = [shoulder[0] + 0.014, shoulder[1] + 0.014];
  const elbB = ik(shB[0], shB[1], pose.handB[0], pose.handB[1], 0.16, 0.15, pose.elbowB ?? 1);
  const elbF = ik(shF[0], shF[1], pose.handF[0], pose.handF[1], 0.16, 0.15, pose.elbowF ?? 1);
  const clampHand = (s: V2, hnd: V2): V2 => {
    const dx = hnd[0] - s[0];
    const dy = hnd[1] - s[1];
    const d = Math.hypot(dx, dy);
    const m = 0.309;
    return d > m ? [s[0] + (dx / d) * m, s[1] + (dy / d) * m] : hnd;
  };
  const hB = clampHand(shB, pose.handB);
  const hF = clampHand(shF, pose.handF);

  if (shadow) {
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, 0.14);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.24);
    g.addColorStop(0, "rgba(20,10,30,0.4)");
    g.addColorStop(1, "rgba(20,10,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ----- limbs ----- */
  const seg = (a: V2, c: V2, w: number, col: string) => {
    const A = toW(a);
    const B = toW(c);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = OL(col);
    ctx.lineWidth = w * h + lw * 2.2;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.stroke();
  };
  const segFill = (a: V2, c: V2, w: number, col: string) => {
    const A = toW(a);
    const B = toW(c);
    ctx.lineCap = "round";
    ctx.strokeStyle = col;
    ctx.lineWidth = w * h;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = w * h * 0.32;
    ctx.beginPath();
    ctx.moveTo(A[0] + facing * w * h * 0.12, A[1] - w * h * 0.12);
    ctx.lineTo(B[0] + facing * w * h * 0.12, B[1] - w * h * 0.12);
    ctx.stroke();
  };
  const limb = (a: V2, m: V2, e: V2, w1: number, w2: number, col1: string, col2: string) => {
    seg(a, m, w1, col1);
    seg(m, e, w2, col2);
    segFill(a, m, w1, col1);
    segFill(m, e, w2, col2);
    const M = toW(m);
    ctx.fillStyle = "rgba(20,10,30,0.10)";
    ctx.beginPath();
    ctx.arc(M[0], M[1], w2 * h * 0.3, 0, Math.PI * 2);
    ctx.fill();
  };

  const hand = (elbow: V2, p: V2, sleeveCol: string) => {
    const E = toW(elbow);
    const P = toW(p);
    const ang = Math.atan2(P[1] - E[1], P[0] - E[0]);
    const glove = st.gloves;
    const col = glove ? "#f4f2ea" : st.skin;
    const r = h * 0.0215;
    ctx.save();
    ctx.translate(P[0], P[1]);
    ctx.rotate(ang);
    if (!st.shortSleeve || glove) {
      ctx.fillStyle = glove ? "#dfe3e6" : tint(sleeveCol, 0.14);
      ctx.strokeStyle = OL(sleeveCol);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.roundRect(-r * 1.55, -r * 0.95, r * 0.9, r * 1.9, r * 0.25);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = OL(col);
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.ellipse(r * 0.35, r * 0.78, r * 0.62, r * 0.32, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.45, 0, r * 1.45, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = glove ? "rgba(60,60,70,0.3)" : "rgba(80,40,30,0.32)";
    ctx.lineWidth = lw * 0.7;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 0.9, i * r * 0.36);
      ctx.lineTo(r * 1.75, i * r * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  };

  const shoe = (f: V2, col: string) => {
    const F = toW(f);
    const lift = clamp(-f[1] * 4.2, 0, 0.45);
    ctx.save();
    ctx.translate(F[0], F[1]);
    ctx.scale(facing, 1);
    ctx.rotate(lift);
    const s = h;
    ctx.beginPath();
    ctx.moveTo(-0.032 * s, -0.058 * s);
    ctx.lineTo(-0.036 * s, -0.012 * s);
    ctx.quadraticCurveTo(-0.034 * s, 0, -0.02 * s, 0);
    ctx.lineTo(0.074 * s, 0);
    ctx.quadraticCurveTo(0.098 * s, 0, 0.094 * s, -0.018 * s);
    ctx.quadraticCurveTo(0.088 * s, -0.036 * s, 0.056 * s, -0.04 * s);
    ctx.quadraticCurveTo(0.03 * s, -0.044 * s, 0.022 * s, -0.062 * s);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = OL(col);
    ctx.lineWidth = lw * 1.1;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fillStyle = shade(col, 0.55);
    ctx.fillRect(-0.034 * s, -0.009 * s, 0.128 * s, 0.009 * s);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(0.03 * s, -0.026 * s);
    ctx.quadraticCurveTo(0.06 * s, -0.03 * s, 0.083 * s, -0.02 * s);
    ctx.stroke();
    ctx.restore();
  };

  const trouser = st.bottom;
  const ankle = (f: V2): V2 => [f[0], f[1] - 0.035];
  const thighW = 0.066 * b;
  const shinW = 0.052 * b;
  const longSleeve = !st.shortSleeve;

  // back arm
  limb(shB, elbB, hB, 0.036 * b, 0.031 * b, shade(st.topDark, 0.12), longSleeve ? shade(st.topDark, 0.12) : shade(st.skin, 0.2));
  hand(elbB, hB, shade(st.topDark, 0.12));
  // back leg
  limb(hip, kneeB, ankle(pose.footB), thighW * 0.95, shinW * 0.95, shade(trouser, 0.18), shade(trouser, 0.18));
  shoe(pose.footB, shade(st.shoes, 0.12));
  // front leg
  limb(hip, kneeF, ankle(pose.footF), thighW, shinW, trouser, tint(trouser, 0.03));
  shoe(pose.footF, st.shoes);

  /* ----- braid behind the body ----- */
  const Hd = toW(head);
  const hr = h * 0.078;
  if (st.hairStyle === "braid" && !pose.back) {
    const a: V2 = [Hd[0] - facing * hr * 0.85, Hd[1] + hr * 0.2];
    const sway = Math.sin(T * 2.1) * hr * 0.35;
    const e: V2 = [Hd[0] - facing * hr * 1.5 + sway, Hd[1] + hr * 5.2];
    const cpt: V2 = [Hd[0] - facing * hr * 2.1, Hd[1] + hr * 2.6];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const px = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cpt[0] + u * u * e[0];
      const py = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cpt[1] + u * u * e[1];
      const rad = hr * (0.34 - u * 0.13);
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? st.hair : tint(st.hair, 0.1);
      ctx.fill();
      ctx.strokeStyle = OL(st.hair);
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(e[0], e[1] + hr * 0.1, hr * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = st.accent ?? C.red;
    ctx.fill();
  }

  /* ----- torso ----- */
  const u: V2 = [sn, -cs];
  const nr: V2 = [cs, sn];
  const P = (a: number, o: number): V2 => [hip[0] + u[0] * 0.3 * a + nr[0] * o, hip[1] + u[1] * 0.3 * a + nr[1] * o];
  const W = (a: number, o: number): V2 => toW(P(a, o));
  const br = 1 + Math.sin(T * 1.7 + b * 3) * 0.02;
  const bb = b * 1.14;
  const bust = st.bust ?? 0;
  const belly = st.belly ?? 0;
  const coat = st.coat ?? 0;

  const frontPts: [number, number][] = [
    [0.22, 0.058 * bb + belly * 0.7],
    [0.48, 0.066 * bb + belly + bust * 0.3],
    [0.72, 0.079 * bb * br + bust],
    [0.93, 0.068 * bb],
    [1.02, 0.036 * bb],
  ];
  const backPts: [number, number][] = [
    [1.02, -0.034 * bb],
    [0.94, -0.072 * bb],
    [0.72, -0.084 * bb * br],
    [0.45, -0.072 * bb],
    [0.2, -0.066 * bb],
  ];
  const torsoPath = () => {
    ctx.beginPath();
    if (coat) {
      const fxx = Math.max(pose.footF[0], pose.footB[0]);
      const bxx = Math.min(pose.footF[0], pose.footB[0]);
      const len = coat * 0.9;
      const flare = 0.016 + coat * 0.06;
      const hemF: V2 = [hip[0] + nr[0] * (0.075 * b + flare) + Math.max(0, fxx) * 0.32 + Math.sin(T * 1.4) * 0.003, hip[1] + len];
      const hemB: V2 = [hip[0] - nr[0] * (0.08 * b + flare) + Math.min(0, bxx) * 0.32 - 0.01, hip[1] + len];
      const midF: V2 = [hip[0] + nr[0] * (0.068 * b + flare * 0.4) + Math.max(0, fxx) * 0.12, hip[1] + len * 0.5];
      const midB: V2 = [hip[0] - nr[0] * (0.072 * b + flare * 0.4) + Math.min(0, bxx) * 0.12, hip[1] + len * 0.5];
      const pts: V2[] = (
        [
          hemB,
          midB,
          P(0.0, -0.068 * b),
          ...backPts.slice().reverse().map(([a, o]) => P(a, o)),
          ...frontPts.slice().reverse().map(([a, o]) => P(a, o)),
          P(0.0, 0.066 * b + belly * 0.5),
          midF,
          hemF,
        ] as V2[]
      ).map(toW);
      spline(ctx, pts, false, true, 0.9);
      const hf = pts[pts.length - 1];
      const hb = pts[0];
      const mx = (hf[0] + hb[0]) / 2;
      ctx.bezierCurveTo(mx + (hf[0] - hb[0]) * 0.2, hf[1] + h * 0.008, mx - (hf[0] - hb[0]) * 0.2, hf[1] - h * 0.006, hb[0], hb[1]);
      ctx.closePath();
    } else {
      const pts: V2[] = ([P(0.0, -0.07 * b), ...backPts.slice().reverse().map(([a, o]) => P(a, o)), ...frontPts.slice().reverse().map(([a, o]) => P(a, o)), P(0.0, 0.066 * b + belly * 0.5)] as V2[]).map(toW);
      spline(ctx, pts, false, true, 0.9);
      ctx.closePath();
    }
  };
  const bBack = W(0.55, -0.085 * b);
  const bFront = W(0.55, 0.09 * b);
  const tg = ctx.createLinearGradient(bBack[0], bBack[1], bFront[0], bFront[1]);
  tg.addColorStop(0, shade(st.top, 0.22));
  tg.addColorStop(0.45, st.top);
  tg.addColorStop(1, tint(st.top, 0.1));
  torsoPath();
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.save();
  torsoPath();
  ctx.clip();
  const vg = ctx.createLinearGradient(0, W(1, 0)[1], 0, toW([0, hip[1] + (coat ? coat * 0.9 : 0.02)])[1]);
  vg.addColorStop(0, "rgba(255,255,255,0.05)");
  vg.addColorStop(1, "rgba(20,10,30,0.2)");
  ctx.fillStyle = vg;
  ctx.fillRect(x - h, y - h * 1.2, h * 2, h * 1.3);
  ctx.strokeStyle = "rgba(20,10,30,0.20)";
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = "round";
  const folds = coat ? 3 : 2;
  for (let i = 0; i < folds; i++) {
    const a0 = W(0.38 - i * 0.04, -0.03 + i * 0.026);
    const len = coat ? coat * 0.78 : 0.07;
    const a1: V2 = [a0[0] + facing * (i - 1) * h * 0.02 + Math.sin(T * 1.3 + i) * h * 0.003, a0[1] + len * h];
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.quadraticCurveTo((a0[0] + a1[0]) / 2 + facing * h * 0.012, (a0[1] + a1[1]) / 2, a1[0], a1[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(20,10,30,0.16)";
  const w1 = W(0.52, -0.05 * b);
  const w2 = W(0.5, 0.07 * b);
  ctx.beginPath();
  ctx.moveTo(w1[0], w1[1]);
  ctx.quadraticCurveTo((w1[0] + w2[0]) / 2, (w1[1] + w2[1]) / 2 + h * 0.01, w2[0], w2[1]);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  const c1 = W(0.9, -0.03 * b);
  const c2 = W(0.84, 0.05 * b);
  ctx.beginPath();
  ctx.moveTo(c1[0], c1[1]);
  ctx.lineTo(c2[0], c2[1]);
  ctx.stroke();
  ctx.restore();
  torsoPath();
  ctx.strokeStyle = OL(st.top);
  ctx.lineWidth = lw * 1.35;
  ctx.lineJoin = "round";
  ctx.stroke();

  /* ----- torso extras ----- */
  const polyW = (pts: V2[], fill: string, stroke?: string, w = lw) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };
  const rrect = (cx: number, cy: number, w: number, hh: number, r: number, fill: string, stroke?: string, sw = lw) => {
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - hh / 2, w, hh, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.stroke();
    }
  };

  if (extras.includes("scrubs")) {
    polyW([W(1.0, 0.012), W(0.84, 0.034), W(1.0, 0.06)], st.skin, OL(st.skin), lw * 0.7);
  }
  if (extras.includes("shirt")) {
    polyW([W(1.0, 0.0), W(1.0, 0.05 * b), W(0.93, 0.068 * b), W(0.72, 0.079 * b), W(0.46, 0.066 * b), W(0.3, 0.055 * b), W(0.3, 0.028 * b), W(0.52, 0.026 * b), W(0.78, 0.018 * b)], "#f7f2e4", OL("#f7f2e4"), lw * 0.9);
    polyW([W(1.0, -0.004), W(1.03, 0.03 * b), W(0.9, 0.06 * b), W(0.93, 0.02)], "#ffffff", OL("#ffffff"), lw * 0.8);
    ctx.strokeStyle = OL(st.top);
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    const l0 = W(0.98, 0.002);
    ctx.moveTo(l0[0], l0[1]);
    const l1 = W(0.62, 0.02 * b);
    const l2 = W(0.3, 0.03 * b);
    ctx.quadraticCurveTo(l1[0], l1[1], l2[0], l2[1]);
    ctx.stroke();
  }
  if (extras.includes("tie")) {
    const t0 = W(0.96, 0.036 * b);
    const t1 = W(0.5, 0.044 * b);
    const w = h * 0.016;
    polyW([[t0[0] - w * 0.6, t0[1]], [t0[0] + w * 0.6, t0[1]], [t1[0] + w * 0.9 + Math.sin(T * 1.7) * 0.4, t1[1] - w], [t1[0], t1[1] + w * 0.6]], C.redDk, OL(C.redDk), lw * 0.7);
    circle2(ctx, t0[0], t0[1] + w * 0.5, w * 0.75, "#a33a2a", OL(C.redDk), lw * 0.7);
  }
  if (extras.includes("lanyard")) {
    const n1 = W(1.0, -0.004);
    const n2 = W(1.0, 0.032 * b);
    const sw = Math.sin(T * 1.5) * h * 0.003;
    const cp0 = W(0.66, 0.062 * b);
    const cardP: V2 = [cp0[0] + sw, cp0[1]];
    ctx.strokeStyle = "#8a7a62";
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.moveTo(n1[0], n1[1]);
    ctx.lineTo(cardP[0], cardP[1]);
    ctx.moveTo(n2[0], n2[1]);
    ctx.lineTo(cardP[0], cardP[1]);
    ctx.stroke();
    rrect(cardP[0], cardP[1] + h * 0.027, h * 0.036, h * 0.05, 2, "#ffffff", OL("#cdbfa8"), lw);
    rrect(cardP[0] - h * 0.007, cardP[1] + h * 0.018, h * 0.013, h * 0.015, 1, "#8d9ab0");
    line2(ctx, [cardP[0] - h * 0.012, cardP[1] + h * 0.037], [cardP[0] + h * 0.012, cardP[1] + h * 0.037], C.inkSoft, lw * 0.8);
    line2(ctx, [cardP[0], cardP[1] + h * 0.053], [cardP[0] + sw * 0.5, cardP[1] + h * 0.075], "#9c8a68", lw);
    circle2(ctx, cardP[0] + sw * 0.5, cardP[1] + h * 0.079, h * 0.009, C.gold, OL(C.gold), lw * 0.7);
  }
  if (extras.includes("pocket-recorder")) {
    const r = W(0.66, 0.05 * b);
    rrect(r[0] + facing * h * 0.018, r[1] - h * 0.004, h * 0.022, h * 0.036, 2, "#3a3440", "rgba(0,0,0,0.6)", lw * 0.8);
    circle2(ctx, r[0] + facing * h * 0.018, r[1] - h * 0.015, h * 0.0042, C.red);
  }
  if (extras.includes("belt-tools")) {
    const bt = W(0.04, 0.056 * b);
    rrect(bt[0], bt[1], h * 0.04, h * 0.034, 3, "#e3b12c", OL(C.yellowDk), lw);
    circle2(ctx, bt[0], bt[1] + h * 0.002, h * 0.0072, "#6b6358");
    line2(ctx, W(0.04, -0.07 * b), W(0.04, 0.07 * b), "#3a3036", lw * 1.6);
  }
  if (extras.includes("smock")) {
    const p = W(0.14, 0.05 * b);
    rrect(p[0], p[1] + h * 0.015, h * 0.07, h * 0.062, 3, "rgba(255,255,255,0.10)", OL(st.top), lw);
    ctx.setLineDash([h * 0.007, h * 0.006]);
    line2(ctx, [p[0] - h * 0.03, p[1] + h * 0.043], [p[0] + h * 0.03, p[1] + h * 0.043], C.yellow, lw * 0.9);
    ctx.setLineDash([]);
    circle2(ctx, p[0] - h * 0.014, p[1] - h * 0.006, h * 0.009, "#c9442f", OL("#c9442f"), lw * 0.6);
    line2(ctx, [p[0] + h * 0.012, p[1] + h * 0.012], [p[0] + h * 0.016, p[1] - h * 0.014], C.yellow, lw * 1.4);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = lw;
    const s1 = W(0.86, -0.05 * b);
    const s2 = W(0.8, 0.07 * b);
    ctx.beginPath();
    ctx.moveTo(s1[0], s1[1]);
    ctx.lineTo(s2[0], s2[1]);
    ctx.stroke();
  }
  if (extras.includes("apron")) {
    const w0 = W(0.0, -0.02);
    const w3 = W(0.0, 0.07);
    polyW([W(0.74, -0.015), W(0.78, 0.074 * b), W(0.02, 0.07 * b), [w3[0] + facing * h * 0.01, w3[1] + h * 0.17], [w0[0], w0[1] + h * 0.17]], "#d9ddd8", OL("#cdd2cf"), lw);
    const p = W(0.2, 0.05 * b);
    rrect(p[0], p[1] + h * 0.03, h * 0.05, h * 0.04, 2, "rgba(0,0,0,0.06)", OL("#cdd2cf"), lw * 0.8);
  }
  if (extras.includes("overalls")) {
    const bi = W(0.4, 0.03 * b);
    rrect(bi[0] + facing * h * 0.012, bi[1], h * 0.058, h * 0.082, 3, tint(st.top, 0.06), OL(st.top), lw);
    ctx.strokeStyle = shade(st.top, 0.1);
    ctx.lineWidth = h * 0.016;
    ctx.lineCap = "round";
    const s0 = W(0.58, 0.04 * b);
    const s1 = W(1.0, -0.018 * b);
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    ctx.lineTo(s1[0], s1[1]);
    ctx.stroke();
    circle2(ctx, s0[0], s0[1], h * 0.006, C.gold, OL(C.gold), lw * 0.6);
  }
  if (extras.includes("shawl")) {
    const sfr = Math.sin(T * 1.6) * 0.004;
    const pts: V2[] = [W(1.02, -0.095 * b), W(1.03, 0.07 * b), W(0.62, 0.095 * b), W(0.3, 0.04 * b + sfr), W(0.24, -0.06 * b), W(0.62, -0.1 * b)];
    ctx.beginPath();
    spline(ctx, pts, true, true, 0.8);
    ctx.fillStyle = "#a9472f";
    ctx.fill();
    ctx.strokeStyle = OL("#a9472f");
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    spline(ctx, pts, true, true, 0.8);
    ctx.clip();
    ctx.strokeStyle = "rgba(240,200,120,0.55)";
    ctx.lineWidth = lw * 1.3;
    for (let i = 0; i < 4; i++) {
      const a = W(0.98 - i * 0.2, -0.1);
      const c = W(0.98 - i * 0.2 - 0.06, 0.1);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#e0b36f";
    ctx.lineWidth = lw;
    for (let i = 0; i < 9; i++) {
      const f = i / 8;
      const a = W(0.26 + 0.1 * f, -0.06 * b + 0.1 * f);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(a[0] + Math.sin(T * 2 + i) * h * 0.003, a[1] + h * 0.022);
      ctx.stroke();
    }
  }
  if (extras.includes("tabletcradle")) {
    const t = W(0.2, 0.085 * b);
    rrect(t[0], t[1], h * 0.06, h * 0.05, 3, "#c8ccd2", OL("#c8ccd2"), lw);
    rrect(t[0], t[1], h * 0.048, h * 0.038, 2, "#47c07a");
  }
  if (extras.includes("badge")) {
    const c = W(0.76, 0.055 * b);
    rrect(c[0], c[1], h * 0.028, h * 0.02, 2, "#fff", OL("#fff"), lw * 0.8);
    circle2(ctx, c[0] - h * 0.006, c[1], h * 0.0042, C.greenDk);
    line2(ctx, [c[0] + h * 0.001, c[1]], [c[0] + h * 0.01, c[1]], C.inkSoft, lw * 0.7);
  }
  if (coat > 0 && !extras.includes("shirt") && !extras.includes("smock") && !extras.includes("tie")) {
    ctx.strokeStyle = "rgba(20,10,30,0.22)";
    ctx.lineWidth = lw;
    const a = W(0.95, 0.03 * b);
    const c = W(0.0, 0.05 * b);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(c[0], c[1] + coat * 0.7 * h);
    ctx.stroke();
  }
  if (!coat) {
    const a = W(0.03, -0.068 * b);
    const c = W(0.03, 0.065 * b);
    ctx.strokeStyle = "rgba(20,12,28,0.55)";
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.stroke();
  }

  /* ----- neck ----- */
  const nb = W(1.0, 0.0);
  const hdCos = Math.cos(hs);
  const nEnd: V2 = [Hd[0] - facing * hr * 0.12, Hd[1] + hr * 0.62 * hdCos];
  const ng = ctx.createLinearGradient(nb[0], nb[1], nEnd[0], nEnd[1]);
  ng.addColorStop(0, st.skin);
  ng.addColorStop(1, shade(st.skin, 0.28));
  ctx.lineCap = "round";
  ctx.strokeStyle = OL(st.skin);
  ctx.lineWidth = h * 0.036 * b + lw * 2;
  ctx.beginPath();
  ctx.moveTo(nb[0], nb[1]);
  ctx.lineTo(nEnd[0], nEnd[1]);
  ctx.stroke();
  ctx.strokeStyle = ng;
  ctx.lineWidth = h * 0.036 * b;
  ctx.beginPath();
  ctx.moveTo(nb[0], nb[1]);
  ctx.lineTo(nEnd[0], nEnd[1]);
  ctx.stroke();

  /* ----- head ----- */
  drawHead(ctx, Hd, hr, facing, hs * 0.55, st, pose, T, lw, extras);

  /* ----- front arm (over torso) ----- */
  const fSleeve = st.top;
  limb(shF, elbF, hF, 0.038 * b, 0.032 * b, fSleeve, longSleeve ? fSleeve : st.skin);
  {
    const S = toW(shF);
    ctx.beginPath();
    ctx.arc(S[0], S[1], h * 0.021 * b, 0, Math.PI * 2);
    ctx.fillStyle = fSleeve;
    ctx.fill();
  }
  hand(elbF, hF, fSleeve);

  return {
    hip: toW(hip),
    shoulder: toW(shoulder),
    head: Hd,
    handF: toW(hF),
    handB: toW(hB),
    footF: toW(pose.footF),
    footB: toW(pose.footB),
    scale: h,
    facing,
    local: L,
  };
}

function line2(ctx: Ctx, a: V2, b: V2, col: string, w: number) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.stroke();
}
function circle2(ctx: Ctx, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 1) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/* ---------- head ---------- */
function drawHead(ctx: Ctx, Hd: V2, hr: number, fx: 1 | -1, rot: number, st: FigureStyle, pose: Pose, T: number, lwPx: number, extras: string[]) {
  ctx.save();
  ctx.translate(Hd[0], Hd[1]);
  ctx.scale(fx * hr, hr);
  ctx.rotate(rot);
  const u = (lwPx * 0.5) / hr;
  const f = u * 0.55;
  const ol = shade(st.skin, 0.7);
  const hairOL = shade(st.hair, 0.6);
  const nose = st.nose ?? 1;
  const mouthOpen = pose.mouth ?? 0;

  const hairFill = (pts: V2[], col = st.hair, k = 0.9) => {
    ctx.beginPath();
    spline(ctx, pts, true, true, k);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = hairOL;
    ctx.lineWidth = u * 1.1;
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  const hairShine = (pts: V2[], alpha = 0.18) => {
    ctx.beginPath();
    spline(ctx, pts, false, true, 1);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = u * 2.4;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const knot = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = st.hair;
    ctx.fill();
    ctx.strokeStyle = hairOL;
    ctx.lineWidth = u * 1.1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = u * 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0.4, 4.2);
    ctx.stroke();
  };

  const style = st.hairStyle;
  /* --- hair behind skull --- */
  if (!pose.back) {
    if (style === "bun") knot(-0.78, -0.92, 0.46);
    if (style === "twist") knot(-0.86, -0.78, 0.42);
    if (st.bunLow) knot(-0.98, 0.42, 0.42);
    if (style === "curly") {
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (0.98 + (i / 12) * 1.08);
        const rad = 0.98 + (i % 2) * 0.17;
        ctx.beginPath();
        ctx.arc(-0.12 + Math.cos(a) * rad, -0.15 + Math.sin(a) * rad * 1.02, 0.34 + (i % 3) * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 ? st.hair : tint(st.hair, 0.08);
        ctx.fill();
        ctx.strokeStyle = hairOL;
        ctx.lineWidth = u;
        ctx.stroke();
      }
    }
    if (style === "scarf") {
      const tw = Math.sin(T * 2.2) * 0.12;
      ctx.beginPath();
      ctx.moveTo(-0.95, 0.2);
      ctx.quadraticCurveTo(-1.6 + tw, 0.55, -1.55 + tw, 1.15);
      ctx.quadraticCurveTo(-1.2, 0.9, -0.85, 0.5);
      ctx.closePath();
      ctx.fillStyle = "#c8452f";
      ctx.fill();
      ctx.strokeStyle = shade("#c8452f", 0.6);
      ctx.lineWidth = u * 1.1;
      ctx.stroke();
    }
  }

  /* --- skull / face --- */
  const nz = nose;
  const face: V2[] = [
    [0.02, -1.0],
    [0.66, -0.78],
    [0.88, -0.42],
    [0.9, -0.18],
    [0.86, 0.02],
    [0.9 + 0.3 * nz, 0.3],
    [0.98, 0.4],
    [1.0, 0.52],
    [0.92, 0.6],
    [0.97, 0.7],
    [0.88, 0.82],
    [0.8, 1.0],
    [0.45, 1.06],
    [-0.1, 0.96],
    [-0.62, 0.55],
    [-0.98, 0.05],
    [-0.8, -0.7],
  ];
  if (pose.back) {
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = st.skin;
    ctx.fill();
  } else {
    ctx.beginPath();
    spline(ctx, face, true, true, 0.85);
    ctx.fillStyle = st.skin;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const sg = ctx.createLinearGradient(0.7, -0.8, -0.9, 0.9);
    sg.addColorStop(0, "rgba(255,240,220,0.14)");
    sg.addColorStop(0.55, "rgba(0,0,0,0)");
    sg.addColorStop(1, "rgba(60,20,30,0.26)");
    ctx.fillStyle = sg;
    ctx.fillRect(-2, -2, 4, 4);
    const bg = ctx.createRadialGradient(0.4, 0.38, 0, 0.4, 0.38, 0.36);
    bg.addColorStop(0, "rgba(220,90,80,0.22)");
    bg.addColorStop(1, "rgba(220,90,80,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.strokeStyle = "rgba(70,30,30,0.18)";
    ctx.lineWidth = u * 4;
    ctx.beginPath();
    ctx.moveTo(0.78, 0.98);
    ctx.quadraticCurveTo(0.2, 1.12, -0.35, 0.8);
    ctx.stroke();
    if (st.stubble) {
      ctx.fillStyle = "rgba(40,30,30,0.22)";
      ctx.beginPath();
      ctx.moveTo(0.85, 0.56);
      ctx.quadraticCurveTo(0.7, 1.15, -0.3, 0.9);
      ctx.lineTo(0.0, 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    spline(ctx, face, true, true, 0.85);
    ctx.strokeStyle = ol;
    ctx.lineWidth = u * 1.3;
    ctx.lineJoin = "round";
    ctx.stroke();

    // ear
    ctx.beginPath();
    ctx.ellipse(-0.12, 0.12, 0.17, 0.27, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = shade(st.skin, 0.06);
    ctx.fill();
    ctx.strokeStyle = ol;
    ctx.lineWidth = u;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.1, 0.12, 0.08, 0.8, 4.6);
    ctx.strokeStyle = "rgba(80,30,30,0.35)";
    ctx.stroke();
  }

  /* --- hair cap --- */
  if (pose.back) {
    if (style !== "bald") {
      ctx.beginPath();
      ctx.arc(0, -0.04, 1.04, 0, Math.PI * 2);
      ctx.fillStyle = style === "scarf" ? "#c8452f" : st.hair;
      ctx.fill();
      ctx.strokeStyle = hairOL;
      ctx.lineWidth = u * 1.2;
      ctx.stroke();
    }
  } else {
    switch (style) {
      case "bald":
        hairFill([[-0.98, 0.0], [-0.9, 0.35], [-0.55, 0.55], [-0.35, 0.2], [-0.55, -0.05]], st.hair);
        break;
      case "crop":
      case "tuft":
      case "braid":
      case "bun":
      case "twist":
        hairFill([[0.9, -0.4], [0.78, -0.82], [0.4, -1.06], [-0.3, -1.08], [-0.92, -0.72], [-1.02, -0.1], [-0.9, 0.3], [-0.55, 0.05], [-0.2, -0.38], [0.3, -0.58], [0.62, -0.56]]);
        hairShine([[0.5, -0.88], [0.1, -1.0], [-0.4, -0.96]], 0.22);
        if (style === "tuft") hairFill([[0.2, -1.0], [0.45, -1.4], [0.65, -1.0]], st.hair);
        break;
      case "scarf": {
        const sc = "#c8452f";
        const outline: V2[] = [[0.92, -0.5], [0.8, -0.94], [0.2, -1.18], [-0.6, -1.08], [-1.12, -0.45], [-1.08, 0.35], [-0.7, 0.6], [-0.35, 0.15], [-0.2, -0.32], [0.35, -0.52], [0.7, -0.52]];
        ctx.beginPath();
        spline(ctx, outline, true, true, 0.9);
        ctx.fillStyle = sc;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = "rgba(255,230,180,0.65)";
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          ctx.arc(-1 + (i % 5) * 0.45 + (Math.floor(i / 5) % 2) * 0.2, -1.1 + Math.floor(i / 5) * 0.4, 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(60,15,10,0.22)";
        ctx.lineWidth = u * 2;
        ctx.beginPath();
        ctx.moveTo(0.8, -0.55);
        ctx.quadraticCurveTo(-0.1, -0.7, -1.0, -0.3);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        spline(ctx, outline, true, true, 0.9);
        ctx.strokeStyle = shade(sc, 0.6);
        ctx.lineWidth = u * 1.2;
        ctx.stroke();
        hairFill([[0.88, -0.5], [0.72, -0.62], [0.55, -0.5], [0.7, -0.4]], st.hair);
        break;
      }
      case "curly":
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(0.62 - i * 0.24, -0.82 - Math.sin(i * 0.55) * 0.14, 0.3, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 ? st.hair : tint(st.hair, 0.07);
          ctx.fill();
          ctx.strokeStyle = hairOL;
          ctx.lineWidth = u;
          ctx.stroke();
        }
        hairFill([[0.8, -0.5], [0.55, -0.72], [0.05, -0.78], [-0.55, -0.6], [-0.7, -0.1], [-0.3, -0.3], [0.2, -0.46]]);
        break;
      case "white":
        hairFill([[0.74, -0.52], [0.72, -0.86], [0.35, -1.1], [-0.3, -1.12], [-0.9, -0.74], [-1.04, -0.1], [-0.92, 0.35], [-0.6, 0.12], [-0.3, -0.25], [0.0, -0.5], [0.4, -0.62]]);
        hairShine([[0.55, -0.92], [0.0, -1.04], [-0.5, -0.95]], 0.3);
        hairShine([[0.35, -0.8], [-0.2, -0.9], [-0.7, -0.7]], 0.2);
        break;
      default:
        hairFill([[0.92, -0.44], [0.84, -0.84], [0.4, -1.1], [-0.28, -1.12], [-0.88, -0.78], [-1.04, -0.1], [-0.92, 0.38], [-0.6, 0.14], [-0.34, -0.16], [-0.05, -0.4], [0.36, -0.52], [0.66, -0.58]]);
        hairShine([[0.62, -0.9], [0.1, -1.04], [-0.45, -0.98]], 0.2);
        ctx.strokeStyle = shade(st.hair, 0.4);
        ctx.lineWidth = u * 1.2;
        ctx.beginPath();
        ctx.moveTo(0.38, -1.06);
        ctx.quadraticCurveTo(0.3, -0.8, 0.5, -0.58);
        ctx.stroke();
        if (st.hair === "#6c5f58") {
          ctx.strokeStyle = "rgba(205,200,195,0.6)";
          ctx.lineWidth = u * 1.3;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-0.7 + i * 0.5, -0.95 + i * 0.03);
            ctx.quadraticCurveTo(-0.5 + i * 0.5, -1.06, -0.3 + i * 0.52, -0.9);
            ctx.stroke();
          }
        }
    }
  }

  /* --- face features --- */
  if (!pose.back) {
    const cyc = 3.6 + (st.skin.charCodeAt(2) % 5) * 0.4;
    const ph = (T + st.build * 7.3) % cyc;
    const blink = ph > cyc - 0.14 ? 1 - Math.abs(((ph - (cyc - 0.14)) / 0.14) * 2 - 1) : 0;
    const open = 1 - blink * 0.95;
    const gz = pose.gaze ?? Math.sin(T * 0.8 + st.build * 5) * 0.3 + (Math.sin(T * 0.23 + st.build) > 0.82 ? 0.6 : 0);
    const ex = 0.54;
    const ey = -0.08;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.15, 0.095 * open + 0.004, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fbf9f2";
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(ex + 0.045 + gz * 0.04, ey + 0.005, 0.082, 0, Math.PI * 2);
    ctx.fillStyle = st.eye ?? "#3b2a22";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 0.05 + gz * 0.045, ey + 0.005, 0.045, 0, Math.PI * 2);
    ctx.fillStyle = "#120b0b";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 0.075 + gz * 0.04, ey - 0.03, 0.02, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = shade(st.hair === "#ece8e2" || st.hair === "#f1efe8" ? "#8a847e" : st.hair, 0.55);
    ctx.lineWidth = f * (st.lashes ? 2.6 : 2.0);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.01, 0.155, 0.1 * open + 0.004, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    if (st.lashes) {
      ctx.lineWidth = f * 1.5;
      ctx.beginPath();
      ctx.moveTo(ex + 0.14, ey - 0.02);
      ctx.lineTo(ex + 0.22, ey - 0.07);
      ctx.moveTo(ex + 0.08, ey - 0.08);
      ctx.lineTo(ex + 0.14, ey - 0.15);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(90,45,40,0.25)";
    ctx.lineWidth = f * 1.3;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.06, 0.14, 0.07, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // brow
    const raise = (pose.brow ?? 0) + mouthOpen * 0.25;
    const bw = st.mustache ? 1.6 : 1.0;
    ctx.strokeStyle = shade(st.hair === "#ece8e2" || st.hair === "#f1efe8" ? "#a09a94" : st.hair, 0.15);
    ctx.lineWidth = f * (st.lashes ? 2.6 : 3.4) * bw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0.24, -0.32 - raise * 0.05);
    ctx.quadraticCurveTo(0.52, -0.43 - raise * 0.09, 0.82, -0.32 + (raise < 0 ? -raise * 0.08 : -raise * 0.02));
    ctx.stroke();
    // nose detail
    ctx.strokeStyle = "rgba(90,45,40,0.35)";
    ctx.lineWidth = f * 1.3;
    ctx.beginPath();
    ctx.moveTo(0.9 + 0.3 * nz - 0.06, 0.34);
    ctx.quadraticCurveTo(0.84, 0.4, 0.78, 0.36);
    ctx.stroke();
    if (st.wrinkle) {
      ctx.strokeStyle = "rgba(90,45,40,0.28)";
      ctx.lineWidth = f * 1.1;
      ctx.beginPath();
      ctx.moveTo(0.7, 0.42);
      ctx.quadraticCurveTo(0.55, 0.6, 0.62, 0.8);
      ctx.moveTo(0.3, -0.62);
      ctx.quadraticCurveTo(0.5, -0.66, 0.78, -0.6);
      ctx.moveTo(0.3, -0.02);
      ctx.lineTo(0.18, -0.06);
      ctx.moveTo(0.3, 0.02);
      ctx.lineTo(0.17, 0.05);
      ctx.stroke();
    }
    // mouth
    const lips = mix(st.skin, "#9a3748", 0.5);
    const sm = pose.smile ?? 0;
    const my = 0.64;
    if (mouthOpen > 0.06) {
      const oh = 0.04 + mouthOpen * 0.2;
      ctx.beginPath();
      ctx.ellipse(0.8, my + oh * 0.35, 0.17, oh, 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#4a1c22";
      ctx.fill();
      ctx.strokeStyle = lips;
      ctx.lineWidth = f * 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(0.7, my + 0.005, 0.2, 0.04);
    } else {
      ctx.strokeStyle = shade(lips, 0.3);
      ctx.lineWidth = f * 2.1;
      ctx.beginPath();
      ctx.moveTo(0.54, my - sm * 0.06);
      ctx.quadraticCurveTo(0.74, my + 0.03 + sm * 0.04, 0.93, my - 0.01);
      ctx.stroke();
      ctx.strokeStyle = lips;
      ctx.lineWidth = f * 2.6;
      ctx.beginPath();
      ctx.moveTo(0.64, my + 0.06);
      ctx.quadraticCurveTo(0.8, my + 0.09, 0.9, my + 0.06);
      ctx.stroke();
    }
    if (st.mustache) {
      ctx.fillStyle = st.hair;
      ctx.beginPath();
      ctx.moveTo(1.0, 0.45);
      ctx.quadraticCurveTo(0.8, 0.38, 0.45, 0.5);
      ctx.quadraticCurveTo(0.7, 0.62, 1.0, 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hairOL;
      ctx.lineWidth = u;
      ctx.stroke();
    }
    if (st.glasses) {
      const gr = 0.29;
      const frame = "#4a4654";
      ctx.beginPath();
      ctx.arc(ex + 0.02, ey, gr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,225,255,0.20)";
      ctx.fill();
      ctx.strokeStyle = frame;
      ctx.lineWidth = f * 2.8;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = f * 1.6;
      ctx.beginPath();
      ctx.arc(ex + 0.02, ey, gr * 0.72, Math.PI * 1.15, Math.PI * 1.45);
      ctx.stroke();
      ctx.strokeStyle = frame;
      ctx.lineWidth = f * 2.2;
      ctx.beginPath();
      ctx.moveTo(ex + 0.02 + gr, ey - 0.02);
      ctx.quadraticCurveTo(0.86, ey - 0.08, 0.9, 0.02);
      ctx.moveTo(ex + 0.02 - gr * 0.98, ey - 0.03);
      ctx.lineTo(-0.1, 0.0);
      ctx.stroke();
    }
  }

  /* --- headwear --- */
  if (extras.includes("cap-white")) {
    ctx.beginPath();
    spline(ctx, [[0.9, -0.52], [0.78, -0.92], [0.1, -1.18], [-0.7, -1.0], [-1.0, -0.5], [-0.5, -0.56], [0.1, -0.66], [0.6, -0.62]], true, true, 0.9);
    ctx.fillStyle = "#f6f6f0";
    ctx.fill();
    ctx.strokeStyle = "rgba(60,60,70,0.6)";
    ctx.lineWidth = u * 1.2;
    ctx.stroke();
    ctx.strokeStyle = C.green;
    ctx.lineWidth = u * 3;
    ctx.beginPath();
    ctx.moveTo(0.82, -0.62);
    ctx.quadraticCurveTo(0.1, -0.74, -0.85, -0.55);
    ctx.stroke();
  }
  if (extras.includes("cap-flat")) {
    ctx.beginPath();
    spline(ctx, [[-1.0, -0.4], [-0.9, -0.95], [-0.1, -1.26], [0.75, -1.0], [1.05, -0.55], [0.5, -0.5], [-0.2, -0.55]], true, true, 0.9);
    ctx.fillStyle = "#58524c";
    ctx.fill();
    ctx.strokeStyle = "rgba(20,15,20,0.7)";
    ctx.lineWidth = u * 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.72, -0.56);
    ctx.quadraticCurveTo(1.2, -0.52, 1.32, -0.42);
    ctx.quadraticCurveTo(0.95, -0.4, 0.55, -0.5);
    ctx.closePath();
    ctx.fillStyle = "#3d3935";
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = u * 2;
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.98);
    ctx.quadraticCurveTo(0.1, -1.18, 0.55, -0.98);
    ctx.stroke();
  }
  if (extras.includes("headphones")) {
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = u * 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    spline(ctx, [[-0.1, 0.05], [-0.28, -0.55], [-0.12, -1.12], [0.3, -1.2]], false, true, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-0.1, 0.1, 0.3, 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#35353c";
    ctx.fill();
    ctx.strokeStyle = "rgba(15,15,20,0.85)";
    ctx.lineWidth = u * 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-0.04, 0.06, 0.1, 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
  }
  if (extras.includes("pencil")) {
    ctx.lineCap = "round";
    ctx.strokeStyle = C.yellowDk;
    ctx.lineWidth = u * 3.4;
    ctx.beginPath();
    ctx.moveTo(-0.6, -0.62);
    ctx.lineTo(-1.5, -1.45);
    ctx.stroke();
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = u * 1.8;
    ctx.beginPath();
    ctx.moveTo(-0.6, -0.62);
    ctx.lineTo(-1.5, -1.45);
    ctx.stroke();
    ctx.strokeStyle = "#e9a0a0";
    ctx.lineWidth = u * 3.4;
    ctx.beginPath();
    ctx.moveTo(-1.44, -1.39);
    ctx.lineTo(-1.52, -1.47);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- cast ---------- */
const mk = (s: Partial<FigureStyle> & Pick<FigureStyle, "skin" | "hair" | "hairStyle" | "top" | "topDark" | "bottom" | "shoes">): FigureStyle => ({ build: 1, ...s });

export const CAST: Record<string, FigureStyle> = {
  orrin: mk({
    build: 0.92,
    skin: "#e6bd98",
    hair: "#6c5f58",
    hairStyle: "short",
    top: "#cbc19f",
    topDark: "#b3a986",
    bottom: "#4a4658",
    shoes: "#3a2c2c",
    coat: 0.2,
    glasses: true,
    hunch: 0.05,
    nose: 1.05,
    wrinkle: true,
    eye: "#4a3a2c",
    extras: ["shirt", "tie", "lanyard", "pocket-recorder", "belt-tools"],
  }),
  lenna: mk({
    build: 1.04,
    skin: "#d7a27c",
    hair: "#3b2a2c",
    hairStyle: "twist",
    top: "#2f3f7a",
    topDark: "#27356a",
    bottom: "#4b3a45",
    shoes: "#7a5238",
    coat: 0.34,
    lashes: true,
    bust: 0.01,
    eye: "#2a1b16",
    accent: "#f3c22f",
    extras: ["smock", "pencil"],
  }),
  rill: mk({
    build: 1.1,
    skin: "#e2b793",
    hair: "#ece8e2",
    hairStyle: "white",
    top: "#7b4a38",
    topDark: "#6a3e2f",
    bottom: "#4a4a4c",
    shoes: "#3b3030",
    coat: 0.3,
    glasses: true,
    hunch: 0.07,
    bunLow: true,
    lashes: true,
    wrinkle: true,
    belly: 0.01,
    eye: "#5a6c78",
    extras: ["shawl"],
  }),
  attendant: mk({
    build: 0.94,
    skin: "#e5c3a6",
    hair: "#4a4034",
    hairStyle: "crop",
    top: "#f7f6f1",
    topDark: "#e5e3da",
    bottom: "#d8dde2",
    shoes: "#f2f2ee",
    coat: 0.52,
    gloves: true,
    nose: 0.85,
    eye: "#4a6a58",
    extras: ["cap-white", "badge", "tabletcradle"],
  }),
  tobias: mk({
    build: 1.2,
    skin: "#c99673",
    hair: "#9a9a9c",
    hairStyle: "short",
    top: "#3e4650",
    topDark: "#343b44",
    bottom: "#2f3238",
    shoes: "#20201f",
    coat: 0.5,
    mustache: true,
    stubble: true,
    belly: 0.014,
    nose: 1.15,
    wrinkle: true,
    extras: ["cap-flat"],
  }),
  ruta: mk({
    build: 1.05,
    skin: "#e8c3a1",
    hair: "#7b3b28",
    hairStyle: "scarf",
    top: "#8fb3b0",
    topDark: "#7aa09d",
    bottom: "#59606a",
    shoes: "#3a3a42",
    coat: 0.3,
    lashes: true,
    bust: 0.008,
    extras: ["apron"],
  }),
  dev: mk({
    build: 0.9,
    skin: "#b98260",
    hair: "#1f1a1d",
    hairStyle: "curly",
    top: "#b8bfc9",
    topDark: "#a0a8b3",
    bottom: "#3f4752",
    shoes: "#e6e0d0",
    coat: 0.16,
    stubble: true,
    extras: ["headphones", "apron"],
  }),
  samir: mk({
    build: 1.15,
    skin: "#c4906c",
    hair: "#1d1819",
    hairStyle: "short",
    top: "#365a8a",
    topDark: "#2e4d77",
    bottom: "#365a8a",
    shoes: "#3a2f24",
    shortSleeve: true,
    stubble: true,
    belly: 0.008,
    extras: ["overalls"],
  }),
  noor: mk({
    build: 0.98,
    skin: "#d0a07b",
    hair: "#241a1c",
    hairStyle: "bun",
    top: "#a33f55",
    topDark: "#8f3548",
    bottom: "#3a3646",
    shoes: "#2b2428",
    coat: 0.22,
    lashes: true,
    extras: ["headphones"],
  }),
  yusra: mk({
    build: 0.9,
    skin: "#d0a07b",
    hair: "#241a1c",
    hairStyle: "braid",
    top: "#e6b84a",
    topDark: "#d1a339",
    bottom: "#5a6f9a",
    shoes: "#c9442f",
    coat: 0.12,
    lashes: true,
    accent: "#c9442f",
  }),
  josie: mk({
    build: 1.04,
    skin: "#8d5b3e",
    hair: "#1b1416",
    hairStyle: "curly",
    top: "#3f9b99",
    topDark: "#368886",
    bottom: "#3f9b99",
    shoes: "#f2f2ee",
    shortSleeve: true,
    lashes: true,
    bust: 0.008,
    extras: ["scrubs"],
  }),
  anselm: mk({
    build: 0.95,
    skin: "#e0b895",
    hair: "#f1efe8",
    hairStyle: "white",
    top: "#6e6a62",
    topDark: "#5f5b54",
    bottom: "#5b5750",
    shoes: "#3a3028",
    coat: 0.26,
    glasses: true,
    hunch: 0.05,
    wrinkle: true,
    extras: ["tie"],
  }),
  neighbor: mk({
    skin: "#d9ae8b",
    hair: "#3a3030",
    hairStyle: "short",
    top: "#6a8e7a",
    topDark: "#587a68",
    bottom: "#4b4950",
    shoes: "#30282a",
    coat: 0.1,
  }),
};

export const HEIGHTS: Record<string, number> = {
  orrin: 1.0,
  lenna: 0.9,
  rill: 0.84,
  attendant: 0.97,
  tobias: 1.02,
  ruta: 0.89,
  dev: 1.0,
  samir: 0.96,
  noor: 0.9,
  yusra: 0.6,
  josie: 0.92,
  anselm: 0.88,
  neighbor: 0.95,
};

/* ---------- rear view (walking away from camera) ---------- */
export function drawBackFigure(ctx: Ctx, x: number, y: number, h: number, ph: number, st: FigureStyle, o: { recorder?: boolean } = {}) {
  const T = clock.t;
  const sw = Math.sin(ph * Math.PI * 2);
  const lw = Math.max(1, h / 150);
  const b = st.build;
  const OL = (c: string) => shade(c, 0.66);
  const idle = Math.sin(T * 0.9) * 0.004 * h;
  const bob = Math.abs(sw) * 0.012 * h;
  const breathe = Math.sin(T * 1.7) * 0.003 * h;

  // soft shadow
  ctx.save();
  ctx.translate(x, y + 2);
  ctx.scale(1, 0.14);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.26);
  sg.addColorStop(0, "rgba(10,5,20,0.4)");
  sg.addColorStop(1, "rgba(10,5,20,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const stroke2 = (pts: V2[], w: number, col: string) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = OL(col);
    ctx.lineWidth = w + lw * 2.2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
  };

  // legs + shoes
  for (const s of [-1, 1]) {
    const lift = Math.max(0, sw * s) * 0.04 * h;
    const hipP: V2 = [x + s * 0.042 * b * h + idle * 0.5, y - 0.47 * h - bob];
    const foot: V2 = [x + s * 0.06 * b * h, y - lift];
    const knee: V2 = [(hipP[0] + foot[0]) / 2 + s * 0.012 * h, (hipP[1] + foot[1]) / 2 - lift * 0.25];
    const col = s < 0 ? shade(st.bottom, 0.06) : tint(st.bottom, 0.02);
    stroke2([hipP, knee, [foot[0], foot[1] - 0.03 * h]], 0.066 * b * h, col);
    // shoe (heel view)
    ctx.beginPath();
    ctx.roundRect(foot[0] - 0.04 * h, foot[1] - 0.036 * h, 0.08 * h, 0.038 * h, 0.014 * h);
    ctx.fillStyle = st.shoes;
    ctx.fill();
    ctx.strokeStyle = OL(st.shoes);
    ctx.lineWidth = lw * 1.1;
    ctx.stroke();
    ctx.fillStyle = shade(st.shoes, 0.55);
    ctx.fillRect(foot[0] - 0.04 * h, foot[1] - 0.008 * h, 0.08 * h, 0.008 * h);
  }

  // coat
  const sy = y - 0.775 * h - bob + breathe;
  const sh = 0.158 * b * h;
  const wy = y - 0.56 * h - bob;
  const wh = 0.128 * b * h;
  const hemY = y - (0.475 - (st.coat ?? 0.2) * 0.9) * h - bob * 0.5;
  const hh = 0.15 * b * h;
  const gape = Math.max(0, Math.abs(sw)) * 0.012 * h;
  const sway = Math.sin(T * 1.4 + 1) * 0.004 * h + sw * 0.01 * h;
  const coatPath = () => {
    ctx.beginPath();
    ctx.moveTo(x - 0.045 * h + idle, sy - 0.03 * h);
    ctx.quadraticCurveTo(x - sh * 0.75, sy - 0.018 * h, x - sh, sy + 0.02 * h);
    ctx.quadraticCurveTo(x - sh * 1.04, sy + 0.1 * h, x - wh, wy);
    ctx.quadraticCurveTo(x - wh * 1.05, (wy + hemY) / 2, x - hh + sway, hemY);
    ctx.quadraticCurveTo(x - hh * 0.5, hemY + 0.008 * h, x - gape, hemY - 0.002 * h);
    ctx.lineTo(x + gape, hemY - 0.002 * h);
    ctx.quadraticCurveTo(x + hh * 0.5, hemY + 0.008 * h, x + hh + sway, hemY);
    ctx.quadraticCurveTo(x + wh * 1.05, (wy + hemY) / 2, x + wh, wy);
    ctx.quadraticCurveTo(x + sh * 1.04, sy + 0.1 * h, x + sh, sy + 0.02 * h);
    ctx.quadraticCurveTo(x + sh * 0.75, sy - 0.018 * h, x + 0.045 * h + idle, sy - 0.03 * h);
    ctx.closePath();
  };
  const cg = ctx.createLinearGradient(x - sh, 0, x + sh, 0);
  cg.addColorStop(0, shade(st.top, 0.2));
  cg.addColorStop(0.5, tint(st.top, 0.06));
  cg.addColorStop(1, shade(st.top, 0.2));
  coatPath();
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  coatPath();
  ctx.clip();
  const vg = ctx.createLinearGradient(0, sy, 0, hemY);
  vg.addColorStop(0, "rgba(255,255,255,0.06)");
  vg.addColorStop(1, "rgba(20,10,30,0.22)");
  ctx.fillStyle = vg;
  ctx.fillRect(x - h, sy - h * 0.1, h * 2, h);
  ctx.strokeStyle = "rgba(20,10,30,0.3)";
  ctx.lineWidth = lw * 1.2;
  ctx.lineCap = "round";
  // centre vent + seam
  ctx.beginPath();
  ctx.moveTo(x + idle, sy - 0.01 * h);
  ctx.lineTo(x, wy);
  ctx.lineTo(x, hemY);
  ctx.stroke();
  // shoulder blades / yoke seam
  ctx.strokeStyle = "rgba(20,10,30,0.2)";
  ctx.beginPath();
  ctx.moveTo(x - sh * 0.9, sy + 0.05 * h);
  ctx.quadraticCurveTo(x, sy + 0.075 * h, x + sh * 0.9, sy + 0.05 * h);
  ctx.stroke();
  // belt-back crease + folds
  ctx.beginPath();
  ctx.moveTo(x - wh, wy + 0.02 * h);
  ctx.quadraticCurveTo(x, wy + 0.035 * h, x + wh, wy + 0.02 * h);
  ctx.stroke();
  for (const f of [-0.5, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x + f * wh, wy + 0.04 * h);
    ctx.quadraticCurveTo(x + f * hh * 1.05 + sway * 0.5, (wy + hemY) / 2, x + f * hh * 1.1 + sway, hemY - 0.004 * h);
    ctx.stroke();
  }
  ctx.restore();
  coatPath();
  ctx.strokeStyle = OL(st.top);
  ctx.lineWidth = lw * 1.4;
  ctx.lineJoin = "round";
  ctx.stroke();

  // collar
  ctx.beginPath();
  ctx.moveTo(x - 0.062 * h + idle, sy - 0.026 * h);
  ctx.quadraticCurveTo(x + idle, sy + 0.012 * h, x + 0.062 * h + idle, sy - 0.026 * h);
  ctx.lineTo(x + 0.05 * h + idle, sy - 0.04 * h);
  ctx.lineTo(x - 0.05 * h + idle, sy - 0.04 * h);
  ctx.closePath();
  ctx.fillStyle = shade(st.top, 0.25);
  ctx.fill();
  ctx.strokeStyle = OL(st.top);
  ctx.lineWidth = lw;
  ctx.stroke();

  // neck
  ctx.fillStyle = shade(st.skin, 0.12);
  ctx.fillRect(x - 0.026 * h + idle, sy - 0.07 * h, 0.052 * h, 0.04 * h);

  // head
  const hx = x + idle;
  const hy = y - 0.915 * h - bob + breathe;
  const rx = 0.078 * h;
  const ry = 0.088 * h;
  ctx.beginPath();
  ctx.ellipse(hx - rx, hy + 0.005 * h, 0.017 * h, 0.028 * h, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + rx, hy + 0.005 * h, 0.017 * h, 0.028 * h, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(st.skin, 0.06);
  ctx.fill();
  ctx.strokeStyle = shade(st.skin, 0.7);
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = st.skin;
  ctx.fill();
  // hair: covers the skull to a neat nape line
  ctx.beginPath();
  ctx.moveTo(hx - rx * 1.02, hy + 0.025 * h);
  ctx.bezierCurveTo(hx - rx * 1.08, hy - ry * 1.3, hx + rx * 1.08, hy - ry * 1.3, hx + rx * 1.02, hy + 0.025 * h);
  ctx.quadraticCurveTo(hx + rx * 0.9, hy + ry * 0.62, hx + rx * 0.5, hy + ry * 0.72);
  ctx.quadraticCurveTo(hx, hy + ry * 0.62, hx - rx * 0.5, hy + ry * 0.72);
  ctx.quadraticCurveTo(hx - rx * 0.9, hy + ry * 0.62, hx - rx * 1.02, hy + 0.025 * h);
  ctx.closePath();
  ctx.fillStyle = st.hair;
  ctx.fill();
  ctx.strokeStyle = shade(st.hair, 0.6);
  ctx.lineWidth = lw * 1.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(205,200,195,0.4)";
  ctx.lineWidth = lw * 1.4;
  for (const i of [-1.1, 0.2, 1.3]) {
    ctx.beginPath();
    ctx.moveTo(hx + i * rx * 0.5 - rx * 0.12, hy - ry * 0.85);
    ctx.quadraticCurveTo(hx + i * rx * 0.55, hy - ry * 0.5, hx + i * rx * 0.6 + rx * 0.1, hy - ry * 0.12);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = lw * 2;
  ctx.beginPath();
  ctx.moveTo(hx - rx * 0.6, hy - ry * 0.8);
  ctx.quadraticCurveTo(hx, hy - ry * 1.0, hx + rx * 0.6, hy - ry * 0.8);
  ctx.stroke();
  // glasses arms just visible at the ears
  ctx.strokeStyle = "#4a4654";
  ctx.lineWidth = lw * 1.2;
  ctx.beginPath();
  ctx.moveTo(hx - rx * 0.98, hy - 0.004 * h);
  ctx.lineTo(hx - rx * 0.7, hy - 0.012 * h);
  ctx.moveTo(hx + rx * 0.98, hy - 0.004 * h);
  ctx.lineTo(hx + rx * 0.7, hy - 0.012 * h);
  ctx.stroke();

  // arms
  const handR = (hxp: number, hyp: number, cuff: string) => {
    ctx.beginPath();
    ctx.arc(hxp, hyp, 0.024 * h, 0, Math.PI * 2);
    ctx.fillStyle = st.skin;
    ctx.fill();
    ctx.strokeStyle = OL(st.skin);
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = tint(cuff, 0.12);
    ctx.fillRect(hxp - 0.028 * h, hyp - 0.044 * h, 0.056 * h, 0.018 * h);
  };
  {
    // left arm swings down by the thigh
    const shP: V2 = [x - sh + 0.004 * h, sy + 0.03 * h];
    const elb: V2 = [x - sh - 0.016 * h, y - 0.6 * h - bob + sw * 0.01 * h];
    const hnd: V2 = [x - sh - 0.014 * h - sw * 0.008 * h, y - 0.47 * h - bob + sw * 0.022 * h];
    stroke2([shP, elb, hnd], 0.05 * h, shade(st.topDark, 0.1));
    handR(hnd[0], hnd[1] + 0.02 * h, st.topDark);
  }
  {
    const shP: V2 = [x + sh - 0.004 * h, sy + 0.03 * h];
    if (o.recorder) {
      // right arm raised, recorder at mouth height
      const elb: V2 = [x + sh + 0.045 * h, y - 0.63 * h - bob];
      const hnd: V2 = [x + sh + 0.02 * h, y - 0.8 * h - bob];
      stroke2([shP, elb, hnd], 0.05 * h, tint(st.topDark, 0.02));
      ctx.beginPath();
      ctx.roundRect(hnd[0] - 0.014 * h, hnd[1] - 0.06 * h, 0.028 * h, 0.07 * h, 0.004 * h);
      ctx.fillStyle = "#2b2733";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hnd[0], hnd[1] - 0.046 * h, 0.0055 * h, 0, Math.PI * 2);
      ctx.fillStyle = 0.5 + 0.5 * Math.sin(T * 5) > 0.3 ? C.red : "#7a2a24";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hnd[0], hnd[1] + 0.004 * h, 0.024 * h, 0, Math.PI * 2);
      ctx.fillStyle = st.skin;
      ctx.fill();
      ctx.strokeStyle = OL(st.skin);
      ctx.stroke();
    } else {
      const elb: V2 = [x + sh + 0.016 * h, y - 0.6 * h - bob - sw * 0.01 * h];
      const hnd: V2 = [x + sh + 0.014 * h + sw * 0.008 * h, y - 0.47 * h - bob - sw * 0.022 * h];
      stroke2([shP, elb, hnd], 0.05 * h, tint(st.topDark, 0.02));
      handR(hnd[0], hnd[1] + 0.02 * h, st.topDark);
    }
  }
}
