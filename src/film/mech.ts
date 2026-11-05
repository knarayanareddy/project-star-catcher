import { RGB, TAU, V2, clamp, mix3, rgba, scale3, hash } from "./util";
import { Pal, glow } from "./look";

export interface MechPose {
  x: number;
  y: number;
  s: number;
  flip?: number;
  lean?: number;
  tilt?: number;
  bob?: number;
  feet: [V2, V2];
  hands: [V2, V2];
  grip?: [number, number];
  lens: RGB;
  glow: number;
  gaze?: V2;
  iris?: number;
  chest?: number;
  heart?: number;
  hollow?: boolean;
  lamp?: number;
  t: number;
  pal: Pal;
  alpha?: number;
}

export function idlePose(t: number, ph = 0): Pick<MechPose, "feet" | "hands" | "bob" | "lean"> {
  const b = Math.sin(t * 0.9 + ph);
  return {
    feet: [[-46, 0], [46, 0]],
    hands: [[-104 - b * 2, -98 + b * 3], [104 + b * 2, -98 + b * 3]],
    bob: b * 1.6,
    lean: b * 0.006,
  };
}

/** a walking cycle. phase in radians, direction +1 right */
export function walkPose(phase: number, dir = 1): Pick<MechPose, "feet" | "hands" | "bob" | "lean"> {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const stride = 54;
  const f = (sn: number, cs: number): V2 => [-46 * 0 + sn * stride * dir + 0, -Math.max(0, cs) * 30];
  const fl = f(s, c);
  const fr = f(-s, -c);
  return {
    feet: [[-40 + fl[0], fl[1]], [40 + fr[0], fr[1]]],
    hands: [[-100 + s * 30 * dir * -1, -110 + Math.abs(c) * 6], [100 + s * 30 * dir, -110 + Math.abs(c) * 6]],
    bob: Math.abs(c) * -7,
    lean: 0.05 * dir,
  };
}

const rot = (p: V2, a: number, c: V2): V2 => {
  const dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

function ik(a: V2, target: V2, l1: number, l2: number, bend: number): { k: V2; e: V2 } {
  let dx = target[0] - a[0], dy = target[1] - a[1];
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.5;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  if (d < 1) d = 1;
  const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
  const ex = a[0] + (dx * aa) / d, ey = a[1] + (dy * aa) / d;
  return { k: [ex + bend * (-dy / d) * h, ey + bend * (dx / d) * h], e: [a[0] + dx, a[1] + dy] };
}

const HIP_Y = -150;
const SH_Y = -262;

function solve(p: MechPose) {
  const bob = p.bob ?? 0;
  const lean = p.lean ?? 0;
  const pivot: V2 = [0, HIP_Y - 12 + bob];
  const shL = rot([-88, SH_Y + bob], lean, pivot);
  const shR = rot([88, SH_Y + bob], lean, pivot);
  const hipL: V2 = [-36, HIP_Y + bob], hipR: V2 = [36, HIP_Y + bob];
  const legL = ik(hipL, p.feet[0], 80, 78, 1);
  const legR = ik(hipR, p.feet[1], 80, 78, -1);
  const armL = ik(shL, p.hands[0], 88, 90, 1);
  const armR = ik(shR, p.hands[1], 88, 90, -1);
  return { pivot, shL, shR, hipL, hipR, legL, legR, armL, armR, bob, lean };
}

export function mechAnchors(p: MechPose) {
  const sv = solve(p);
  const f = p.flip ?? 1;
  const w = (v: V2): V2 => [p.x + v[0] * p.s * f, p.y + v[1] * p.s];
  const lensLocal = rot([0, -303 + sv.bob], sv.lean, sv.pivot);
  const chestLocal = rot([0, -232 + sv.bob], sv.lean, sv.pivot);
  return {
    handL: w(sv.armL.e), handR: w(sv.armR.e),
    lens: w(lensLocal), chest: w(chestLocal),
    lamp: w(rot([-112, -372 + sv.bob], sv.lean, sv.pivot)),
  };
}

function limb(ctx: CanvasRenderingContext2D, pts: V2[], w: number, base: RGB, dark: RGB, hi: RGB) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.strokeStyle = rgba(scale3(dark, 0.45), 1);
  ctx.lineWidth = w + 6;
  ctx.stroke();
  ctx.strokeStyle = rgba(base, 1);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(-w * 0.2, -w * 0.08);
  ctx.strokeStyle = rgba(hi, 0.5);
  ctx.lineWidth = Math.max(1.5, w * 0.16);
  ctx.stroke();
  ctx.restore();
}

function joint(ctx: CanvasRenderingContext2D, q: V2, r: number, base: RGB, dark: RGB, hi: RGB, rust: RGB) {
  ctx.beginPath();
  ctx.arc(q[0], q[1], r + 2.5, 0, TAU);
  ctx.fillStyle = rgba(scale3(dark, 0.45), 1);
  ctx.fill();
  const g = ctx.createRadialGradient(q[0] - r * 0.4, q[1] - r * 0.4, 0, q[0], q[1], r);
  g.addColorStop(0, rgba(hi, 0.9));
  g.addColorStop(0.4, rgba(mix3(base, rust, 0.35), 1));
  g.addColorStop(1, rgba(dark, 1));
  ctx.beginPath();
  ctx.arc(q[0], q[1], r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.arc(q[0] + Math.cos(a) * r * 0.62, q[1] + Math.sin(a) * r * 0.62, 1.4, 0, TAU);
    ctx.fillStyle = rgba(scale3(dark, 0.6), 1);
    ctx.fill();
  }
}

function hand(ctx: CanvasRenderingContext2D, from: V2, to: V2, grip: number, base: RGB, dark: RGB, hi: RGB) {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  ctx.save();
  ctx.translate(to[0], to[1]);
  ctx.rotate(ang);
  const spread = 0.62 * (1 - grip) + 0.12;
  ctx.lineCap = "round";
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8 + 30, k * 30 * Math.tan(spread) * 0.85);
    ctx.strokeStyle = rgba(scale3(dark, 0.45), 1);
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = rgba(base, 1);
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.fillStyle = rgba(scale3(dark, 0.45), 1);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fillStyle = rgba(base, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-4, -4, 5, 0, TAU);
  ctx.fillStyle = rgba(hi, 0.35);
  ctx.fill();
  ctx.restore();
}

export function drawMech(ctx: CanvasRenderingContext2D, p: MechPose) {
  const f = p.flip ?? 1;
  const pal = p.pal;
  const base = mix3([46, 56, 80], pal.haze, 0.22);
  const dark = mix3([14, 18, 30], pal.shade, 0.6);
  const hi = mix3(pal.lit, [255, 255, 255], 0.15);
  const rust = mix3([120, 68, 48], pal.lamp, 0.12);
  const sv = solve(p);
  const lean = sv.lean;
  const iris = p.iris ?? 0.5;
  const t = p.t;

  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  ctx.translate(p.x, p.y);
  ctx.scale(p.s * f, p.s);

  // ---- back lamp pole & lantern (behind everything)
  ctx.save();
  ctx.translate(0, sv.bob);
  ctx.rotate(lean);
  ctx.translate(0, -(HIP_Y - 12));
  ctx.translate(0, 0);
  // pivot trick: draw in rotated frame about pivot
  ctx.restore();

  const upper = (fn: () => void) => {
    ctx.save();
    ctx.translate(sv.pivot[0], sv.pivot[1]);
    ctx.rotate(lean);
    ctx.translate(-sv.pivot[0], -sv.pivot[1] + sv.bob * 0); // bob already in pivot/shoulder y; apply below
    ctx.translate(0, sv.bob);
    fn();
    ctx.restore();
  };

  // lamp pole
  upper(() => {
    const sw = Math.sin(t * 1.3) * 4;
    ctx.beginPath();
    ctx.moveTo(-70, -230);
    ctx.quadraticCurveTo(-118, -300, -112, -372);
    ctx.lineWidth = 6;
    ctx.strokeStyle = rgba(dark, 1);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-112, -372);
    ctx.lineTo(-112 + sw * 0.4, -358);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const lamp = p.lamp ?? 0.8;
    const lx = -112 + sw, ly = -345;
    glow(ctx, lx, ly, 70 * (0.4 + lamp), pal.lamp, 0.8 * lamp);
    ctx.beginPath();
    ctx.ellipse(lx, ly, 10, 14, 0, 0, TAU);
    ctx.fillStyle = rgba(mix3(pal.lamp, [255, 255, 255], 0.35), 0.4 + lamp * 0.6);
    ctx.fill();
    ctx.strokeStyle = rgba(dark, 1);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // net drum
    ctx.beginPath();
    ctx.ellipse(86, -222, 26, 44, 0.08, 0, TAU);
    ctx.fillStyle = rgba(scale3(base, 0.7), 1);
    ctx.fill();
    ctx.strokeStyle = rgba(scale3(dark, 0.45), 1);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = rgba(hi, 0.3);
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(86, -222 + i * 10, 22, 4, 0, 0, TAU);
      ctx.stroke();
    }
  });

  // ---- legs
  const legW = 38;
  const leg = (l: ReturnType<typeof ik>, hip: V2, foot: V2) => {
    limb(ctx, [hip, l.k, l.e], legW, base, dark, hi);
    joint(ctx, l.k, 20, base, dark, hi, rust);
    // boot
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.beginPath();
    ctx.roundRect(-30, -17, 60, 22, 7);
    ctx.fillStyle = rgba(scale3(dark, 0.5), 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-27, -16, 54, 17, 6);
    ctx.fillStyle = rgba(mix3(base, rust, 0.25), 1);
    ctx.fill();
    ctx.fillStyle = rgba(hi, 0.25);
    ctx.fillRect(-24, -15, 48, 2.5);
    ctx.restore();
  };
  leg(sv.legL, sv.hipL, p.feet[0]);
  leg(sv.legR, sv.hipR, p.feet[1]);

  // ---- upper body (leaning)
  upper(() => {
    // pelvis
    ctx.beginPath();
    ctx.roundRect(-62, -176, 124, 36, 12);
    ctx.fillStyle = rgba(scale3(dark, 0.5), 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-58, -173, 116, 30, 10);
    ctx.fillStyle = rgba(mix3(base, rust, 0.15), 1);
    ctx.fill();
    // torso
    ctx.beginPath();
    ctx.moveTo(-98, -282);
    ctx.lineTo(98, -282);
    ctx.lineTo(80, -192);
    ctx.lineTo(58, -162);
    ctx.lineTo(-58, -162);
    ctx.lineTo(-80, -192);
    ctx.closePath();
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = rgba(scale3(dark, 0.45), 1);
    ctx.stroke();
    const tg = ctx.createLinearGradient(-98, 0, 98, 0);
    tg.addColorStop(0, rgba(mix3(base, hi, 0.35), 1));
    tg.addColorStop(0.35, rgba(base, 1));
    tg.addColorStop(1, rgba(scale3(base, 0.5), 1));
    ctx.fillStyle = tg;
    ctx.fill();
    // plates & rivets
    ctx.strokeStyle = rgba(scale3(dark, 0.5), 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-86, -250); ctx.lineTo(-48, -262); ctx.lineTo(-48, -196);
    ctx.moveTo(86, -250); ctx.lineTo(48, -262); ctx.lineTo(48, -196);
    ctx.moveTo(-70, -190); ctx.lineTo(70, -190);
    ctx.stroke();
    ctx.fillStyle = rgba(hi, 0.35);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(-84 + i * 28, -274, 2, 0, TAU); ctx.fill();
    }
    // rust streaks
    ctx.fillStyle = rgba(rust, 0.35);
    for (let i = 0; i < 6; i++) {
      const rx = -70 + hash(i * 2.3) * 140;
      ctx.fillRect(rx, -270 + hash(i) * 20, 2.5, 18 + hash(i + 9) * 40);
    }
    // shoulder pauldrons
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 92, -272, 30, 22, s * 0.2, 0, TAU);
      ctx.fillStyle = rgba(scale3(dark, 0.45), 1);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 92, -273, 27, 19, s * 0.2, 0, TAU);
      const pg = ctx.createLinearGradient(s * 92 - 20, -290, s * 92 + 20, -255);
      pg.addColorStop(0, rgba(mix3(base, hi, 0.4), 1));
      pg.addColorStop(1, rgba(scale3(base, 0.6), 1));
      ctx.fillStyle = pg;
      ctx.fill();
    }

    // ---- chest cage + heart
    const cx = 0, cy = -230, cw = 64, ch = 66;
    ctx.beginPath();
    ctx.roundRect(cx - cw / 2 - 5, cy - ch / 2 - 5, cw + 10, ch + 10, 9);
    ctx.fillStyle = rgba(scale3(dark, 0.35), 1);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 6);
    ctx.clip();
    if (p.hollow) {
      const hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 44);
      hg.addColorStop(0, "#0a0b1c");
      hg.addColorStop(1, "#000");
      ctx.fillStyle = hg;
      ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
      for (let i = 0; i < 40; i++) {
        const sx = cx + (hash(i * 1.7) - 0.5) * cw;
        const sy = cy + (hash(i * 4.2) - 0.5) * ch;
        ctx.fillStyle = `rgba(200,220,255,${0.2 + 0.7 * hash(i + t * 0.0 + Math.floor(t * 0.7 + i) * 0.1)})`;
        ctx.fillRect(sx, sy, 1.3, 1.3);
      }
    } else {
      ctx.fillStyle = "#07060d";
      ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
      const hv = clamp(p.heart ?? 0.8, 0, 1.4);
      glow(ctx, cx, cy, 52 * (0.5 + hv * 0.6), pal.lamp, 0.95 * Math.min(1, hv));
      // star core
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU - Math.PI / 2;
        const r = (i % 2 ? 7 : 17) * (0.7 + 0.3 * Math.min(1.2, hv));
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(mix3(pal.lamp, [255, 255, 255], 0.7), clamp(hv));
      ctx.fill();
    }
    ctx.restore();
    // cage doors
    const open = clamp(p.chest ?? 0);
    const sx = Math.max(0.04, Math.cos(open * 1.5));
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + s * (cw / 2), cy);
      ctx.scale(s * -sx, 1);
      ctx.strokeStyle = rgba(scale3(dark, 0.5), 1);
      ctx.lineWidth = 3.5;
      ctx.strokeRect(0, -ch / 2, cw / 2, ch);
      ctx.strokeStyle = rgba(mix3(base, hi, 0.25), 1);
      ctx.lineWidth = 2.5;
      for (let i = 0; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo((i / 3) * (cw / 2), -ch / 2);
        ctx.lineTo((i / 3) * (cw / 2), ch / 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- head
    const hx = 0, hy = -304;
    ctx.fillStyle = rgba(scale3(dark, 0.7), 1);
    ctx.fillRect(-15, -290, 30, 16);
    ctx.beginPath();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(p.tilt ?? 0);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.fillStyle = rgba(scale3(dark, 0.5), 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 33, 0, TAU);
    const hg2 = ctx.createRadialGradient(-12, -14, 3, 0, 0, 36);
    hg2.addColorStop(0, rgba(mix3(base, hi, 0.45), 1));
    hg2.addColorStop(1, rgba(scale3(base, 0.55), 1));
    ctx.fillStyle = hg2;
    ctx.fill();
    // visor slot
    ctx.beginPath();
    ctx.ellipse(0, 3, 27, 22, 0, 0, TAU);
    ctx.fillStyle = "#04050c";
    ctx.fill();
    // lens
    const gz = p.gaze ?? [0, 0];
    const lx = gz[0] * 6, ly = 3 + gz[1] * 4;
    glow(ctx, lx, ly, 56 * (0.3 + p.glow), p.lens, 0.9 * p.glow);
    ctx.beginPath();
    ctx.arc(lx, ly, 15, 0, TAU);
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 15);
    lg.addColorStop(0, rgba(mix3(p.lens, [255, 255, 255], 0.75 * p.glow), 1));
    lg.addColorStop(0.55, rgba(mix3(p.lens, [0, 0, 0], 0.35 * (1 - p.glow)), 1));
    lg.addColorStop(1, rgba(scale3(p.lens, 0.25), 1));
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 15 * iris * 0.5 + 1.5, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx - 4, ly - 4, 2.4, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
    ctx.restore();
    // hat
    ctx.beginPath();
    ctx.moveTo(0, -368);
    ctx.quadraticCurveTo(-40, -340, -86, -318);
    ctx.quadraticCurveTo(0, -304, 86, -318);
    ctx.quadraticCurveTo(40, -340, 0, -368);
    ctx.closePath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = rgba(scale3(dark, 0.4), 1);
    ctx.stroke();
    const hatc = mix3([128, 108, 76], pal.haze, 0.3);
    const hgr = ctx.createLinearGradient(-86, 0, 86, 0);
    hgr.addColorStop(0, rgba(mix3(hatc, hi, 0.45), 1));
    hgr.addColorStop(0.5, rgba(hatc, 1));
    hgr.addColorStop(1, rgba(scale3(hatc, 0.4), 1));
    ctx.fillStyle = hgr;
    ctx.fill();
    ctx.strokeStyle = rgba(scale3(hatc, 0.45), 0.7);
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -368);
      ctx.lineTo(i * 15, -312 + Math.abs(i) * -1.6);
      ctx.stroke();
    }
    // hat shadow on face
    const sg = ctx.createLinearGradient(0, -318, 0, -285);
    sg.addColorStop(0, "rgba(0,0,0,0.5)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(-30, -316, 60, 30);
  });

  // ---- arms (in mech space, IK solved)
  const armW = 32;
  const arm = (a: ReturnType<typeof ik>, sh: V2, hi2: number, g: number) => {
    limb(ctx, [sh, a.k, a.e], armW, base, dark, hi);
    joint(ctx, a.k, 17, base, dark, hi, rust);
    hand(ctx, a.k, a.e, g, mix3(base, rust, 0.2), dark, hi);
    void hi2;
  };
  arm(sv.armL, sv.shL, 0, p.grip?.[0] ?? 0.4);
  arm(sv.armR, sv.shR, 0, p.grip?.[1] ?? 0.4);
  ctx.restore();
}

/** HAL-style extreme close-up of the lens */
export function drawLensCU(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number,
  o: { color: RGB; glow: number; dil: number; t: number; refl?: (c: CanvasRenderingContext2D, r: number) => void; pal: Pal },
) {
  ctx.save();
  ctx.translate(cx, cy);
  // housing
  const base = mix3([50, 58, 80], o.pal.haze, 0.2);
  const hg = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R * 1.5);
  hg.addColorStop(0, rgba(mix3(base, o.pal.lit, 0.5), 1));
  hg.addColorStop(0.6, rgba(base, 1));
  hg.addColorStop(1, rgba(scale3(base, 0.2), 1));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.5, 0, TAU);
  ctx.fill();
  // bolts
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 1.32, Math.sin(a) * R * 1.32, R * 0.05, 0, TAU);
    ctx.fillStyle = "rgba(10,12,20,0.9)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 1.32 - R * 0.012, Math.sin(a) * R * 1.32 - R * 0.012, R * 0.02, 0, TAU);
    ctx.fillStyle = rgba(o.pal.lit, 0.5);
    ctx.fill();
  }
  // brushed rings
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.22 - k * 0.04), 0, TAU);
    ctx.strokeStyle = `rgba(${k % 2 ? "0,0,0" : "180,200,230"},${0.25})`;
    ctx.lineWidth = R * 0.012;
    ctx.stroke();
  }
  // glass
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fillStyle = "#020208";
  ctx.fill();
  ctx.save();
  ctx.clip();
  const ig = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R);
  ig.addColorStop(0, rgba(mix3(o.color, [255, 255, 255], 0.8 * o.glow), 1));
  ig.addColorStop(0.18, rgba(o.color, 1));
  ig.addColorStop(0.55, rgba(scale3(o.color, 0.35 + 0.4 * o.glow), 1));
  ig.addColorStop(1, rgba(scale3(o.color, 0.03), 1));
  ctx.fillStyle = ig;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  // iris fibres
  ctx.strokeStyle = rgba(mix3(o.color, [255, 255, 255], 0.5), 0.12 + 0.2 * o.glow);
  ctx.lineWidth = R * 0.006;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU + Math.sin(o.t * 0.3 + i) * 0.01;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.2 * o.dil * 2, Math.sin(a) * R * 0.2 * o.dil * 2);
    ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
    ctx.stroke();
  }
  // pupil
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.18 * o.dil * 2, 0, TAU);
  ctx.fillStyle = "#000";
  ctx.fill();
  if (o.refl) o.refl(ctx, R);
  // glass sheen
  const sh = ctx.createLinearGradient(-R, -R, R, R);
  sh.addColorStop(0, "rgba(255,255,255,0.22)");
  sh.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
  glow(ctx, 0, 0, R * 2.4, o.color, 0.55 * o.glow);
  ctx.restore();
}
