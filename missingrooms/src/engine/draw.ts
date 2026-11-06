import { MONO, SERIF, hash } from "./util";

/** Palette — municipal cream, correction red, storage bruised violet, Lenna's yellow thread. */
export const C = {
  cream: "#efe5cd",
  creamLt: "#f7f0de",
  creamDk: "#d6c8a8",
  creamDeep: "#b9a982",
  ink: "#2a2230",
  inkSoft: "rgba(42,34,48,0.55)",
  red: "#d23a2a",
  redDk: "#8f241b",
  violet: "#4a2f6c",
  violetDk: "#241536",
  violetDeep: "#140b22",
  violetLt: "#8c6cb6",
  violetMist: "#b9a2d8",
  yellow: "#f3c22f",
  yellowDk: "#c8961a",
  green: "#3eb36d",
  greenDk: "#1f7a46",
  steel: "#8f98a4",
  steelDk: "#5b626e",
  steelLt: "#c5ccd4",
  wood: "#8a5d3a",
  woodDk: "#5c3b22",
  sage: "#b9bf9f",
  sageDk: "#8d9577",
  white: "#fbfaf5",
  gold: "#c9a24d",
};

type Cv = HTMLCanvasElement;
export function makeCanvas(w: number, h: number): Cv {
  const g = globalThis as unknown as { __makeCanvas?: (w: number, h: number) => Cv };
  if (g.__makeCanvas) return g.__makeCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export type Ctx = CanvasRenderingContext2D;

/* ---------- primitives ---------- */

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r = 6) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string, lw = 1.5) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function poly(ctx: Ctx, pts: [number, number][], fill?: string, stroke?: string, lw = 1.5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 1.5) {
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

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw = 2, cap: CanvasLineCap = "round") {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = cap;
  ctx.stroke();
}

export interface TxtOpts {
  size?: number;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  weight?: string | number;
  spacing?: number;
  baseline?: CanvasTextBaseline;
  alpha?: number;
}
export function txt(ctx: Ctx, s: string, x: number, y: number, o: TxtOpts = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 400} ${o.size ?? 16}px ${o.font ?? SERIF}`;
  ctx.fillStyle = o.color ?? C.ink;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = o.baseline ?? "alphabetic";
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${o.spacing ?? 0}px`;
  } catch {
    /* older engines */
  }
  ctx.fillText(s, x, y);
  ctx.restore();
}

export const mono = (ctx: Ctx, s: string, x: number, y: number, o: TxtOpts = {}) => txt(ctx, s, x, y, { font: MONO, ...o });

export function shadowEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(20,10,30,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Hand-drawn red correction line, revealed with progress p (0..1). */
export function corrLine(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, p = 1, w = 4, color = C.red, seed = 3) {
  if (p <= 0) return;
  const n = 14;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = w;
  ctx.beginPath();
  const m = Math.max(1, Math.floor(n * Math.min(1, p)));
  for (let i = 0; i <= m; i++) {
    const f = Math.min(p, i / n);
    const wob = hash(i * 1.7 + seed) * w * 0.6;
    const px = x1 + dx * f + nx * wob;
    const py = y1 + dy * f + ny * wob;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = w * 2.2;
  ctx.stroke();
  ctx.restore();
}

/** red circle drawn progressively */
export function corrCircle(ctx: Ctx, x: number, y: number, r: number, p = 1, w = 3, color = C.red) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  const steps = 40;
  const m = Math.floor(steps * Math.min(1, p) * 1.08);
  for (let i = 0; i <= m; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2;
    const rr2 = r * (1 + 0.05 * Math.sin(i * 0.4 + 1) + (i / steps) * 0.06);
    const px = x + Math.cos(a) * rr2;
    const py = y + Math.sin(a) * rr2 * 0.88;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/* ---------- textures ---------- */

let grainTile: Cv | null = null;
export function paperGrain(): Cv {
  if (grainTile) return grainTile;
  const c = makeCanvas(256, 256);
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let s = 12345;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 24) & 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function flower(ctx: Ctx, cx: number, cy: number, r: number, petal = C.red, heart = C.yellow) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.62, r * 0.34, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = petal;
    ctx.fill();
  }
  circle(ctx, 0, 0, r * 0.28, heart);
  ctx.restore();
}

/**
 * Patterned wallpaper in a clipped rect. The pattern is anchored to `ox`, so two panels can share
 * the same lattice and show one flower bisected by a crease.
 */
export function wallpaper(ctx: Ctx, x: number, y: number, w: number, h: number, ox = 0, oy = 0, base = C.sage, scale = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  const P = 96 * scale;
  const Q = 104 * scale;
  // faint stripes
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let sx = Math.floor((x - ox) / P) * P + ox - P; sx < x + w + P; sx += P) ctx.fillRect(sx + P * 0.46, y, P * 0.08, h);
  for (let row = Math.floor((y - oy) / Q) - 1; oy + row * Q < y + h + Q; row++) {
    const off = row % 2 ? P / 2 : 0;
    for (let col = Math.floor((x - ox - off) / P) - 1; ox + off + col * P < x + w + P; col++) {
      flower(ctx, ox + off + col * P, oy + row * Q, 14 * scale, "#b24a3c", "#f0d27a");
      // leaves
      ctx.fillStyle = C.sageDk;
      ctx.beginPath();
      ctx.ellipse(ox + off + col * P + 22 * scale, oy + row * Q + 30 * scale, 8 * scale, 4 * scale, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------- figure rig ---------- */

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
  /** hair part tweaks etc. */
  mustache?: boolean;
}

export type V2 = [number, number];
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
  /** override eye gaze x direction -1..1 */
  gaze?: number;
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
  /** convert world → local pose coords for the same placement */
  local: (wx: number, wy: number) => V2;
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
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const ang = a + dir * Math.acos(cosA);
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

export const poses = {
  stand(breath = 0): Pose {
    return {
      hip: [0, -0.475 + breath * 0.003],
      lean: 0,
      tilt: 0,
      footB: [-0.045, 0],
      footF: [0.05, 0],
      handB: [-0.03, -0.2],
      handF: [0.03, -0.2],
    };
  },
  walk(ph: number, amp = 1): Pose {
    const s = 0.13 * amp;
    const f = (p: number): V2 => {
      const q = ((p % 1) + 1) % 1;
      if (q < 0.5) return [s - (q / 0.5) * 2 * s, 0];
      const u = (q - 0.5) / 0.5;
      return [-s + 2 * s * u, -0.065 * amp * Math.sin(Math.PI * u)];
    };
    const a = f(ph);
    const b = f(ph + 0.5);
    const bob = Math.abs(Math.cos(Math.PI * 2 * ph)) * 0.012;
    return {
      hip: [0, -0.43 - bob],
      lean: 0.05,
      tilt: -0.03,
      footF: a,
      footB: b,
      handF: [-a[0] * 0.8 + 0.02, -0.21 + Math.abs(a[0]) * 0.02],
      handB: [-b[0] * 0.8 - 0.02, -0.21 + Math.abs(b[0]) * 0.02],
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

/**
 * Draws a flat-shaded figure of pixel-height `h` standing at (x,y) = feet.
 * Poses are in units of height; the rig solves arms and legs by 2-bone IK.
 */
export function drawFigure(ctx: Ctx, x: number, y: number, h: number, facing: 1 | -1, st: FigureStyle, pose: Pose, shadow = true): Joints {
  const toW = (p: V2): V2 => [x + facing * p[0] * h, y + p[1] * h];
  const L = (wx: number, wy: number): V2 => [((wx - x) / h) * facing, (wy - y) / h];
  const b = st.build;
  const ink = "rgba(30,22,40,0.7)";
  const lw = Math.max(1, h / 150);

  const hip = pose.hip;
  const sn = Math.sin(pose.lean);
  const cs = Math.cos(pose.lean);
  const shoulder: V2 = [hip[0] + sn * 0.3, hip[1] - cs * 0.3];
  const hs = pose.lean + pose.tilt;
  const head: V2 = [shoulder[0] + Math.sin(hs) * 0.118, shoulder[1] - Math.cos(hs) * 0.118];

  // knees / elbows (local space)
  const kneeF = ik(hip[0], hip[1], pose.footF[0], pose.footF[1], 0.235, 0.235, -1);
  const kneeB = ik(hip[0], hip[1], pose.footB[0], pose.footB[1], 0.235, 0.235, -1);
  const shB: V2 = [shoulder[0] - 0.01, shoulder[1] + 0.012];
  const shF: V2 = [shoulder[0] + 0.012, shoulder[1] + 0.012];
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

  if (shadow) shadowEllipse(ctx, x, y + 2, h * 0.17, h * 0.022, 0.3);

  const limb = (a: V2, m: V2, e: V2, w: number, col: string, outline = true) => {
    const A = toW(a);
    const M = toW(m);
    const E = toW(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (outline) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = w * h + lw * 2;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(M[0], M[1]);
      ctx.lineTo(E[0], E[1]);
      ctx.stroke();
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = w * h;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(M[0], M[1]);
    ctx.lineTo(E[0], E[1]);
    ctx.stroke();
  };
  const shoe = (f: V2, col: string) => {
    const F = toW(f);
    ctx.fillStyle = col;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(F[0] + facing * h * 0.03, F[1] - h * 0.012, h * 0.05, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  const hand = (p: V2) => {
    const P = toW(p);
    circle(ctx, P[0], P[1], h * 0.021, st.gloves ? "#f3f1ea" : st.skin, ink, lw);
  };
  const dark = st.topDark;

  // back arm
  limb(shB, elbB, hB, 0.034 * b, dark);
  hand(hB);
  // back leg
  limb(hip, kneeB, pose.footB, 0.056 * b, st.bottom);
  shoe(pose.footB, st.shoes);
  // front leg
  limb(hip, kneeF, pose.footF, 0.058 * b, st.bottom);
  shoe(pose.footF, st.shoes);

  // torso
  const nx = cs;
  const ny = sn;
  const sw = 0.078 * b;
  const hw = 0.07 * b;
  const S = shoulder;
  const sFront: V2 = [S[0] + nx * sw, S[1] + ny * sw];
  const sBack: V2 = [S[0] - nx * sw, S[1] - ny * sw];
  const hFront: V2 = [hip[0] + nx * hw, hip[1] + ny * hw];
  const hBack: V2 = [hip[0] - nx * hw, hip[1] - ny * hw];
  const coat = st.coat ?? 0;
  const extras = st.extras ?? [];
  const body: V2[] = coat
    ? [sBack, sFront, [hFront[0] + 0.012 * b, hFront[1] + coat * 0.9], [hBack[0] - 0.02 * b, hBack[1] + coat * 0.9]]
    : [sBack, sFront, hFront, hBack];
  const bodyW = body.map(toW);
  ctx.beginPath();
  bodyW.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = st.top;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 1.4;
  ctx.lineJoin = "round";
  ctx.stroke();
  // coat centre seam & shade
  if (coat) {
    const m1 = toW([S[0] + nx * 0.02, S[1] + ny * 0.02]);
    const m2 = toW([hip[0] + 0.012 * b + nx * 0.02, hip[1] + coat * 0.9]);
    line(ctx, m1[0], m1[1], m2[0], m2[1], "rgba(30,22,40,0.28)", lw);
  }
  // back shading band
  {
    const q1 = toW(sBack);
    const q2 = toW([S[0] - nx * (sw - 0.022 * b), S[1] - ny * (sw - 0.022 * b)]);
    const q3 = toW([hip[0] - nx * (hw - 0.02 * b), hip[1] - ny * (hw - 0.02 * b)]);
    const q4 = toW(hBack);
    ctx.fillStyle = "rgba(30,20,50,0.14)";
    ctx.beginPath();
    ctx.moveTo(q1[0], q1[1]);
    ctx.lineTo(q2[0], q2[1]);
    ctx.lineTo(q3[0], q3[1]);
    ctx.lineTo(q4[0], q4[1]);
    ctx.closePath();
    ctx.fill();
  }

  // torso extras
  const chest = toW([S[0] - sn * 0.06 + nx * 0.035, S[1] + cs * 0.06 + ny * 0.035]);
  const mid = toW([hip[0] + sn * 0.12, hip[1] - cs * 0.12]);
  if (extras.includes("shirt")) {
    const a = toW([S[0] + nx * 0.015, S[1] + ny * 0.015]);
    const t1 = toW([S[0] + nx * 0.02 + sn * -0.1, S[1] + ny * 0.02 + cs * 0.1]);
    poly(ctx, [toW([S[0] - nx * 0.02, S[1] - ny * 0.02]), a, t1], "#f6f1e3", ink, lw);
  }
  if (extras.includes("tie")) {
    const t0 = toW([S[0] + nx * 0.012 + sn * -0.02, S[1] + ny * 0.012 + cs * 0.02]);
    const t1 = toW([S[0] + nx * 0.012 + sn * -0.17, S[1] + ny * 0.012 + cs * 0.17]);
    line(ctx, t0[0], t0[1], t1[0], t1[1], C.redDk, h * 0.014);
  }
  if (extras.includes("lanyard")) {
    const n1 = toW([S[0] - nx * 0.014, S[1] - ny * 0.014 + 0.0]);
    const n2 = toW([S[0] + nx * 0.03, S[1] + ny * 0.03]);
    const cardP = toW([S[0] + nx * 0.016 - sn * 0.14, S[1] + ny * 0.016 + cs * 0.14]);
    line(ctx, n1[0], n1[1], cardP[0], cardP[1], "#7a6a52", lw * 1.2);
    line(ctx, n2[0], n2[1], cardP[0], cardP[1], "#7a6a52", lw * 1.2);
    fillRR(ctx, cardP[0] - h * 0.018, cardP[1], h * 0.036, h * 0.05, 2, C.white, ink, lw);
    fillRR(ctx, cardP[0] - h * 0.012, cardP[1] + h * 0.006, h * 0.012, h * 0.014, 1, "#8d9ab0");
    line(ctx, cardP[0] - h * 0.002, cardP[1] + h * 0.009, cardP[0] + h * 0.012, cardP[1] + h * 0.009, C.inkSoft, lw);
    line(ctx, cardP[0] - h * 0.012, cardP[1] + h * 0.026, cardP[0] + h * 0.012, cardP[1] + h * 0.026, C.inkSoft, lw);
    // brass key
    const keyP = toW([S[0] + nx * 0.016 - sn * 0.205, S[1] + ny * 0.016 + cs * 0.205]);
    line(ctx, cardP[0], cardP[1] + h * 0.05, keyP[0], keyP[1], "#9c8a68", lw);
    circle(ctx, keyP[0], keyP[1] + h * 0.006, h * 0.008, C.gold, ink, lw * 0.7);
    line(ctx, keyP[0], keyP[1] + h * 0.014, keyP[0], keyP[1] + h * 0.036, C.gold, h * 0.005);
  }
  if (extras.includes("pocket-recorder")) {
    const r = toW([S[0] + nx * 0.045 - sn * 0.09, S[1] + ny * 0.045 + cs * 0.09]);
    fillRR(ctx, r[0] - h * 0.012, r[1] - h * 0.016, h * 0.024, h * 0.034, 2, "#3a3440", ink, lw * 0.8);
    circle(ctx, r[0], r[1] - h * 0.011, h * 0.0042, C.red);
  }
  if (extras.includes("smock")) {
    // deep patch pocket + pincushion style detail
    const p = toW([hip[0] + nx * 0.02 + sn * 0.08, hip[1] + ny * 0.02 - cs * 0.08 + 0.04]);
    fillRR(ctx, p[0] - h * 0.035, p[1] - h * 0.02, h * 0.07, h * 0.065, 3, "rgba(255,255,255,0.12)", ink, lw);
    line(ctx, p[0] - h * 0.03, p[1] - h * 0.02, p[0] + h * 0.03, p[1] - h * 0.02, "rgba(30,22,40,0.5)", lw);
    // yellow pocket stitching
    ctx.setLineDash([h * 0.007, h * 0.006]);
    line(ctx, p[0] - h * 0.03, p[1] + h * 0.038, p[0] + h * 0.03, p[1] + h * 0.038, C.yellow, lw * 0.8);
    ctx.setLineDash([]);
  }
  if (extras.includes("apron")) {
    const a1 = toW([hip[0] - nx * 0.065 + sn * 0.1, hip[1] - ny * 0.065 - cs * 0.1 + 0.02]);
    const a2 = toW([hip[0] + nx * 0.07 + sn * 0.1, hip[1] + ny * 0.07 - cs * 0.1 + 0.02]);
    const a3 = toW([hip[0] + nx * 0.07 + 0.012, hip[1] + 0.18]);
    const a4 = toW([hip[0] - nx * 0.065, hip[1] + 0.18]);
    poly(ctx, [a1, a2, a3, a4], "#cdd2cf", ink, lw);
  }
  if (extras.includes("belt-tools")) {
    const bt = toW([hip[0] + nx * 0.03, hip[1] + ny * 0.03 - 0.005]);
    fillRR(ctx, bt[0] - h * 0.02, bt[1] - h * 0.014, h * 0.04, h * 0.032, 3, C.steelDk, ink, lw);
    circle(ctx, bt[0], bt[1] + h * 0.002, h * 0.007, C.steelLt);
  }
  if (extras.includes("shawl")) {
    const s1 = toW([S[0] - nx * (sw + 0.015), S[1] - ny * (sw + 0.015) - 0.012]);
    const s2 = toW([S[0] + nx * (sw + 0.02), S[1] + ny * (sw + 0.02) - 0.012]);
    const s3 = toW([S[0] + nx * 0.075 - sn * 0.19, S[1] + ny * 0.075 + cs * 0.19]);
    const s4 = toW([S[0] - nx * 0.08 - sn * 0.24, S[1] - ny * 0.08 + cs * 0.24]);
    poly(ctx, [s1, s2, s3, s4], "#a9472f", ink, lw);
    const fringe = toW([S[0] - sn * 0.22, S[1] + cs * 0.22]);
    line(ctx, s4[0], s4[1], s3[0], s3[1], "#e0b36f", lw * 1.4);
    void fringe;
  }
  if (extras.includes("scrubs")) {
    const v1 = toW([S[0] + nx * 0.012, S[1] + ny * 0.012]);
    const v2 = toW([S[0] + nx * 0.004 - sn * 0.06, S[1] + ny * 0.004 + cs * 0.06]);
    const v3 = toW([S[0] - nx * 0.02, S[1] - ny * 0.02]);
    poly(ctx, [v1, v2, v3], st.skin);
  }
  if (extras.includes("overalls")) {
    const bi = toW([hip[0] + sn * 0.2 + nx * 0.015, hip[1] - cs * 0.2 + ny * 0.015]);
    fillRR(ctx, bi[0] - h * 0.03, bi[1] - h * 0.03, h * 0.06, h * 0.06, 3, "rgba(255,255,255,0.12)", ink, lw);
    line(ctx, bi[0] - h * 0.02, bi[1] - h * 0.03, bi[0] - h * 0.035, toW(S)[1], st.top, h * 0.012);
  }
  if (extras.includes("tabletcradle")) {
    const t = toW([hip[0] + sn * 0.16 + nx * 0.05, hip[1] - cs * 0.16 + ny * 0.05]);
    fillRR(ctx, t[0] - h * 0.04, t[1] - h * 0.032, h * 0.08, h * 0.056, 3, "#c8ccd2", ink, lw);
    fillRR(ctx, t[0] - h * 0.033, t[1] - h * 0.026, h * 0.066, h * 0.044, 2, "#47c07a");
  }
  if (extras.includes("badge")) {
    fillRR(ctx, chest[0] - h * 0.014, chest[1] - h * 0.01, h * 0.028, h * 0.02, 2, "#fff", ink, lw * 0.8);
    circle(ctx, chest[0] - h * 0.006, chest[1], h * 0.0042, C.greenDk);
  }
  void mid;

  // neck
  const nb = toW([S[0] + sn * 0.005, S[1]]);
  const nt = toW([head[0] - Math.sin(hs) * 0.04, head[1] + Math.cos(hs) * 0.04]);
  line(ctx, nb[0], nb[1], nt[0], nt[1], st.skin, h * 0.034 * b);

  // front arm
  limb(shF, elbF, hF, 0.036 * b, st.top);
  hand(hF);

  // head
  const Hd = toW(head);
  const hr = h * 0.064;
  const fx = facing;
  const hairBack = () => {
    switch (st.hairStyle) {
      case "bun":
        circle(ctx, Hd[0] - fx * hr * 0.95, Hd[1] - hr * 0.55, hr * 0.5, st.hair, ink, lw);
        break;
      case "braid": {
        ctx.strokeStyle = ink;
        ctx.lineWidth = hr * 0.5 + lw * 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Hd[0] - fx * hr * 0.7, Hd[1] - hr * 0.1);
        ctx.quadraticCurveTo(Hd[0] - fx * hr * 1.5, Hd[1] + hr * 1.2, Hd[0] - fx * hr * 1.1, Hd[1] + hr * 2.4);
        ctx.stroke();
        ctx.strokeStyle = st.hair;
        ctx.lineWidth = hr * 0.5;
        ctx.stroke();
        break;
      }
      case "twist":
        circle(ctx, Hd[0] - fx * hr * 0.8, Hd[1] - hr * 0.7, hr * 0.5, st.hair, ink, lw);
        break;
      case "scarf":
        circle(ctx, Hd[0] - fx * hr * 0.55, Hd[1] + hr * 0.1, hr * 1.12, "#c8452f", ink, lw);
        break;
      case "curly":
        for (let i = 0; i < 6; i++) circle(ctx, Hd[0] - fx * hr * 0.6 + Math.cos(i) * hr * 0.4, Hd[1] - hr * 0.3 + Math.sin(i * 1.7) * hr * 0.55, hr * 0.42, st.hair);
        break;
      default:
        break;
    }
  };
  hairBack();
  circle(ctx, Hd[0], Hd[1], hr, st.skin, ink, lw * 1.2);
  // ear
  if (!pose.back) circle(ctx, Hd[0] - fx * hr * 0.2, Hd[1] + hr * 0.1, hr * 0.17, st.skin, ink, lw * 0.7);
  // hair cap
  const hairFront = () => {
    ctx.fillStyle = st.hair;
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    switch (st.hairStyle) {
      case "bald":
        break;
      case "crop":
      case "tuft":
        ctx.arc(Hd[0], Hd[1] - hr * 0.1, hr * 1.02, Math.PI * 1.02, Math.PI * (fx > 0 ? 1.95 : 2.0) + (fx > 0 ? 0 : -0.0), false);
        ctx.closePath();
        break;
      case "scarf":
        ctx.arc(Hd[0], Hd[1] - hr * 0.1, hr * 1.04, Math.PI * 0.95, Math.PI * 2.05, false);
        ctx.closePath();
        break;
      default:
        ctx.arc(Hd[0], Hd[1] - hr * 0.08, hr * 1.04, Math.PI * 0.92, Math.PI * 2.08, false);
        ctx.closePath();
        break;
    }
    if (st.hairStyle !== "bald") {
      ctx.fill();
      ctx.stroke();
    }
    if (st.hairStyle === "white" || st.hairStyle === "short") {
      // sideburn
      ctx.beginPath();
      ctx.ellipse(Hd[0] - fx * hr * 0.55, Hd[1] + hr * 0.1, hr * 0.28, hr * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = st.hair;
      ctx.fill();
    }
    if (pose.back) {
      circle(ctx, Hd[0], Hd[1], hr * 1.03, st.hair, ink, lw);
    }
  };
  hairFront();
  // face
  if (!pose.back) {
    const gz = pose.gaze ?? 0;
    const ex = Hd[0] + fx * hr * (0.42 + gz * 0.1);
    const ey = Hd[1] - hr * 0.02;
    circle(ctx, ex, ey, hr * 0.11, C.ink);
    circle(ctx, ex + fx * hr * 0.03, ey - hr * 0.04, hr * 0.035, "#fff");
    // brow
    line(ctx, ex - hr * 0.16, ey - hr * 0.2, ex + hr * 0.16, ey - hr * 0.24 - (pose.mouth ?? 0) * 0.02 * hr, "rgba(30,22,40,0.7)", lw);
    // nose
    poly(ctx, [[Hd[0] + fx * hr * 0.9, Hd[1] + hr * 0.02], [Hd[0] + fx * hr * 1.13, Hd[1] + hr * 0.32], [Hd[0] + fx * hr * 0.85, Hd[1] + hr * 0.32]], st.skin, ink, lw * 0.8);
    // mouth
    const mo = pose.mouth ?? 0;
    if (mo > 0.05) {
      ctx.fillStyle = "#4a1c22";
      ctx.beginPath();
      ctx.ellipse(Hd[0] + fx * hr * 0.7, Hd[1] + hr * 0.55, hr * 0.14, hr * (0.05 + mo * 0.17), 0, 0, Math.PI * 2);
      ctx.fill();
    } else line(ctx, Hd[0] + fx * hr * 0.55, Hd[1] + hr * 0.55, Hd[0] + fx * hr * 0.85, Hd[1] + hr * 0.55, "rgba(60,25,30,0.8)", lw);
    if (st.mustache) {
      ctx.fillStyle = st.hair;
      ctx.beginPath();
      ctx.ellipse(Hd[0] + fx * hr * 0.7, Hd[1] + hr * 0.42, hr * 0.32, hr * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (st.glasses) {
      ctx.strokeStyle = "#5a5560";
      ctx.lineWidth = lw * 1.1;
      circle(ctx, ex, ey, hr * 0.3, "rgba(255,255,255,0.18)", "#4a4450", lw * 1.1);
      line(ctx, ex - fx * hr * 0.3, ey, Hd[0] - fx * hr * 0.2, ey - hr * 0.02, "#4a4450", lw);
    }
  }
  // headwear
  if (extras.includes("cap-white")) {
    ctx.fillStyle = "#f6f6f0";
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(Hd[0], Hd[1] - hr * 0.12, hr * 1.1, Math.PI * 0.95, Math.PI * 2.05, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (extras.includes("cap-flat")) {
    ctx.fillStyle = "#4f4a46";
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(Hd[0] + fx * hr * 0.1, Hd[1] - hr * 0.7, hr * 1.2, hr * 0.38, fx * -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (extras.includes("headphones")) {
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = hr * 0.16;
    ctx.beginPath();
    ctx.arc(Hd[0], Hd[1] - hr * 0.1, hr * 1.12, Math.PI * 1.02, Math.PI * 1.98, false);
    ctx.stroke();
    circle(ctx, Hd[0] - fx * hr * 0.1, Hd[1] + hr * 0.1, hr * 0.34, "#35353c", ink, lw);
  }
  if (extras.includes("pencil")) {
    line(ctx, Hd[0] - fx * hr * 0.5, Hd[1] - hr * 0.9, Hd[0] - fx * hr * 1.5, Hd[1] - hr * 1.5, C.yellowDk, hr * 0.12);
  }

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

/* ---------- cast (render styles shared by scenes and the cast gallery) ---------- */

const mk = (s: Partial<FigureStyle> & Pick<FigureStyle, "skin" | "hair" | "hairStyle" | "top" | "topDark" | "bottom" | "shoes">): FigureStyle => ({ build: 1, ...s });

export const CAST: Record<string, FigureStyle> = {
  orrin: mk({
    build: 0.92,
    skin: "#e6bd98",
    hair: "#6c5f58",
    hairStyle: "short",
    top: "#c9bf9d",
    topDark: "#b2a885",
    bottom: "#4a4658",
    shoes: "#2c2428",
    coat: 0.2,
    glasses: true,
    extras: ["shirt", "tie", "lanyard", "pocket-recorder", "belt-tools"],
  }),
  lenna: mk({
    build: 1.08,
    skin: "#d7a27c",
    hair: "#3b2a2c",
    hairStyle: "twist",
    top: "#2f3f7a",
    topDark: "#27356a",
    bottom: "#4b3a45",
    shoes: "#6a4a34",
    coat: 0.34,
    extras: ["smock", "pencil"],
  }),
  rill: mk({
    build: 1.12,
    skin: "#e2b793",
    hair: "#ece8e2",
    hairStyle: "white",
    top: "#7b4a38",
    topDark: "#6a3e2f",
    bottom: "#4a4a4c",
    shoes: "#3b3030",
    coat: 0.3,
    glasses: true,
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

/* ---------- props ---------- */

export function clipboard(ctx: Ctx, x: number, y: number, w: number, h: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fillRR(ctx, -w / 2, -h / 2, w, h, 4, "#9c6b3f", C.ink, 1.5);
  fillRR(ctx, -w / 2 + w * 0.08, -h / 2 + h * 0.1, w * 0.84, h * 0.84, 2, C.creamLt, "rgba(30,22,40,0.4)", 1);
  fillRR(ctx, -w * 0.18, -h / 2 - h * 0.03, w * 0.36, h * 0.07, 2, C.steelLt, C.ink, 1.2);
  for (let i = 0; i < 6; i++) line(ctx, -w * 0.34, -h * 0.28 + i * h * 0.1, w * 0.3 - (i % 3) * w * 0.08, -h * 0.28 + i * h * 0.1, "rgba(30,22,40,0.28)", 1.2);
  ctx.restore();
}

/** The cloth measuring tape: cream cloth, black numerals, frayed first inch repaired with yellow thread. */
export function clothTape(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, o: { width?: number; sag?: number; showFirstInch?: boolean; taut?: number; marks?: number; scroll?: number; thread?: boolean } = {}) {
  const wdt = o.width ?? 22;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  const sag = (o.sag ?? 0) * (1 - (o.taut ?? 0));
  const path = (off: number) => {
    ctx.beginPath();
    ctx.moveTo(0, off);
    ctx.quadraticCurveTo(len / 2, off + sag, len, off);
  };
  void path;
  // body (straight when taut)
  ctx.beginPath();
  ctx.moveTo(0, -wdt / 2);
  ctx.quadraticCurveTo(len / 2, -wdt / 2 + sag, len, -wdt / 2);
  ctx.lineTo(len, wdt / 2);
  ctx.quadraticCurveTo(len / 2, wdt / 2 + sag, 0, wdt / 2);
  ctx.closePath();
  ctx.fillStyle = "#efe2b8";
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // ticks + numerals (scroll shifts them along the tape so it can slide through fingers)
  const step = Math.max(14, wdt * 1.4);
  const scroll = o.scroll ?? 0;
  const n = Math.floor(len / step) + 1;
  const base = Math.floor(scroll / step);
  for (let i = 0; i <= n; i++) {
    const px = i * step - (scroll % step);
    if (px < 0 || px > len) continue;
    const f = px / len;
    const sy = sag * 2 * f * (1 - f);
    line(ctx, px, -wdt / 2 + sy, px, -wdt / 2 + sy + wdt * 0.32, C.ink, 1.1, "butt");
    line(ctx, px, wdt / 2 + sy, px, wdt / 2 + sy - wdt * 0.18, C.ink, 1, "butt");
    const num = (((i + base) % 48) + 48) % 48;
    if (num > 0 && wdt >= 14) txt(ctx, String(num), px + 2, sy + wdt * 0.24, { size: wdt * 0.42, font: MONO, weight: 700, color: C.ink });
  }
  if (o.thread) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len / 2, sag, len, 0);
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = Math.max(1.5, wdt * 0.1);
    ctx.stroke();
  }
  // frayed first inch repaired with yellow thread (the missing inch)
  if (o.showFirstInch !== false) {
    ctx.fillStyle = "#d9c892";
    ctx.fillRect(0, -wdt / 2, step * 0.95, wdt);
    ctx.setLineDash([3, 2]);
    for (let i = 0; i < 5; i++) line(ctx, 3 + i * (step * 0.2), -wdt / 2 + 1, 3 + i * (step * 0.2) + 5, wdt / 2 - 1, C.yellow, 2.2, "butt");
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, -wdt / 2);
    ctx.lineTo(-4, -wdt * 0.2);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-5, wdt * 0.25);
    ctx.lineTo(0, wdt / 2);
    ctx.closePath();
    ctx.fillStyle = "#cdbb85";
    ctx.fill();
    line(ctx, 0, -wdt / 2, 0, wdt / 2, C.yellow, 3);
  }
  ctx.restore();
}

export function recorderLamp(ctx: Ctx, x: number, y: number, t: number, on = true, r = 6) {
  const pulse = on ? 0.55 + 0.45 * Math.sin(t * 5) : 0;
  ctx.save();
  if (on) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255,60,40,${0.5 * pulse})`);
    g.addColorStop(1, "rgba(255,60,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  circle(ctx, x, y, r, on ? `rgba(255,${60 + 40 * pulse},${40},1)` : "#4a2020", "#2a1010", 1.2);
  ctx.restore();
}

export function stamp(ctx: Ctx, x: number, y: number, s: string, color = C.red, rot = -0.08, size = 28) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `800 ${size}px ${MONO}`;
  const w = ctx.measureText(s).width + 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -size * 0.8, w, size * 1.35);
  ctx.strokeRect(-w / 2 + 4, -size * 0.8 + 4, w - 8, size * 1.35 - 8);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(s, 0, size * 0.2);
  ctx.restore();
}

/** Light pool from above (ceiling fixture). */
export function lightPool(ctx: Ctx, x: number, y: number, r: number, a = 0.22, col = "255,240,200") {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** White dust that falls sideways near compressed frames. */
export function sidewaysDust(ctx: Ctx, t: number, x: number, y: number, w: number, h: number, dirX = 1, n = 40, a = 0.6) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const sp = 18 + (hash(i * 3.1) + 1) * 26;
    const px = x + ((((hash(i * 7.7) + 1) / 2) * w + t * sp * dirX) % w + w) % w;
    const py = y + ((hash(i * 5.3) + 1) / 2) * h + Math.sin(t * 1.3 + i) * 5;
    const r = 0.8 + (hash(i * 9.1) + 1) * 0.9;
    ctx.fillStyle = `rgba(255,252,240,${a * (0.35 + 0.5 * ((hash(i * 2.2) + 1) / 2))})`;
    ctx.fillRect(px, py, r * 2.4, r * 0.8);
  }
  ctx.restore();
}

export { MONO, SERIF };
