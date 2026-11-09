import { W, H, clamp, prog } from "./util";
import type { C2 } from "./fx";

export interface EyeOpts {
  cx: number;
  cy: number;
  w: number;
  open: number; // 0 closed .. 1 wide
  t: number;
  lookX?: number; // -1..1
  lookY?: number;
  pupil?: number; // 0.2 pin .. 0.6 dilated
  tremor?: number;
  reflect?: (c: C2, r: number) => void;
  /** drawn on top of the pupil (source-over), clipped to the iris — for things seen *in* the pupil */
  after?: (c: C2, r: number, pr: number) => void;
  skin?: [string, string];
}

/** a closing/opening blink multiplier. Returns 1 when open → dips toward 0 during the blink. */
export function blink(t: number, t0: number, dur = 0.26) {
  const k = prog(t, t0, t0 + dur);
  if (k <= 0 || k >= 1) return 1;
  return 1 - 0.96 * Math.sin(Math.PI * k);
}

/** Procedural cel-shaded anime eye, extreme close-up. Everything is vector. */
export function animeEye(c: C2, o: EyeOpts) {
  const { w, t } = o;
  const op = clamp(o.open);
  const hh = w * 0.27;
  const skin = o.skin ?? ["#e0a679", "#a96c47"];
  const shx = (o.tremor ?? 0) * Math.sin(t * 61) * 3;
  const shy = (o.tremor ?? 0) * Math.sin(t * 47 + 1) * 3;

  // skin
  c.save();
  const sg = c.createLinearGradient(0, 0, W * 0.3, H);
  sg.addColorStop(0, skin[0]);
  sg.addColorStop(1, skin[1]);
  c.fillStyle = sg;
  c.fillRect(0, 0, W, H);
  c.restore();

  c.save();
  c.translate(o.cx + shx, o.cy + shy);

  // cel shadow under brow
  c.fillStyle = "rgba(110,55,35,0.28)";
  c.beginPath();
  c.moveTo(-w * 0.7, -hh * 0.2);
  c.bezierCurveTo(-w * 0.4, -hh * 2.1, w * 0.4, -hh * 2.1, w * 0.72, -hh * 0.05);
  c.bezierCurveTo(w * 0.4, -hh * 1.25, -w * 0.4, -hh * 1.3, -w * 0.7, -hh * 0.2);
  c.fill();

  // eyebrow (tapered)
  c.fillStyle = "#170d0b";
  c.beginPath();
  c.moveTo(-w * 0.62, -hh * 1.55);
  c.bezierCurveTo(-w * 0.3, -hh * 2.05, w * 0.2, -hh * 2.2, w * 0.6, -hh * 1.82);
  c.bezierCurveTo(w * 0.2, -hh * 2.0, -w * 0.28, -hh * 1.88, -w * 0.62, -hh * 1.5);
  c.fill();

  // lid crease
  c.strokeStyle = "rgba(95,45,28,0.6)";
  c.lineWidth = w * 0.006;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(-w * 0.46, -hh * (0.2 + 0.7 * op));
  c.bezierCurveTo(-w * 0.2, -hh * (0.9 + 0.8 * op), w * 0.2, -hh * (1.0 + 0.8 * op), w * 0.5, -hh * (0.25 + 0.55 * op));
  c.stroke();

  const A: [number, number] = [-w / 2, hh * 0.08];
  const B: [number, number] = [w / 2, -hh * 0.06];
  const uy = -hh * (0.04 + 1.62 * op);
  const ly = hh * (0.14 + 0.55 * op);
  const upper = () => {
    c.moveTo(A[0], A[1]);
    c.bezierCurveTo(-w * 0.2, uy * 1.05, w * 0.22, uy, B[0], B[1]);
  };
  const eyePath = () => {
    c.beginPath();
    upper();
    c.bezierCurveTo(w * 0.2, ly, -w * 0.2, ly * 1.05, A[0], A[1]);
    c.closePath();
  };

  // eyeball
  c.save();
  eyePath();
  c.clip();
  const sc = c.createLinearGradient(0, uy, 0, ly);
  sc.addColorStop(0, "#cdbcb6");
  sc.addColorStop(0.35, "#f7f1ee");
  sc.addColorStop(1, "#e6d8d4");
  c.fillStyle = sc;
  c.fillRect(-w, -hh * 2, w * 2, hh * 4);

  const ix = (o.lookX ?? 0) * w * 0.07;
  const iy = (o.lookY ?? 0) * hh * 0.18 + hh * 0.06;
  const ir = hh * 1.05;
  const pr = ir * (o.pupil ?? 0.42);

  // iris
  const ig = c.createRadialGradient(ix, iy + ir * 0.3, ir * 0.08, ix, iy, ir);
  ig.addColorStop(0, "#f6bd55");
  ig.addColorStop(0.3, "#d38a2a");
  ig.addColorStop(0.68, "#7a4318");
  ig.addColorStop(1, "#27130a");
  c.fillStyle = ig;
  c.beginPath();
  c.arc(ix, iy, ir, 0, Math.PI * 2);
  c.fill();

  c.save();
  c.beginPath();
  c.arc(ix, iy, ir, 0, Math.PI * 2);
  c.clip();
  // fibres
  c.strokeStyle = "rgba(255,225,150,0.2)";
  c.lineWidth = 2.2;
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    c.beginPath();
    c.moveTo(ix + Math.cos(a) * pr * 1.1, iy + Math.sin(a) * pr * 1.1);
    c.lineTo(ix + Math.cos(a + 0.05) * ir * 0.96, iy + Math.sin(a + 0.05) * ir * 0.96);
    c.stroke();
  }
  // reflections of the world
  if (o.reflect) {
    c.save();
    c.translate(ix, iy);
    c.globalCompositeOperation = "screen";
    o.reflect(c, ir);
    c.restore();
  }
  // upper-lid shadow cast on iris
  const ls = c.createLinearGradient(0, iy - ir, 0, iy + ir * 0.2);
  ls.addColorStop(0, "rgba(14,6,3,0.82)");
  ls.addColorStop(1, "rgba(14,6,3,0)");
  c.fillStyle = ls;
  c.fillRect(ix - ir, iy - ir, ir * 2, ir * 1.3);
  // dark limbal ring
  c.strokeStyle = "rgba(20,8,4,0.85)";
  c.lineWidth = ir * 0.08;
  c.beginPath();
  c.arc(ix, iy, ir * 0.96, 0, Math.PI * 2);
  c.stroke();
  // pupil
  const pg = c.createRadialGradient(ix, iy, 0, ix, iy, pr);
  pg.addColorStop(0, "#050202");
  pg.addColorStop(0.85, "#080303");
  pg.addColorStop(1, "rgba(8,3,3,0.85)");
  c.fillStyle = pg;
  c.beginPath();
  c.arc(ix, iy, pr, 0, Math.PI * 2);
  c.fill();
  if (o.after) {
    c.save();
    c.beginPath();
    c.arc(ix, iy, pr, 0, Math.PI * 2);
    c.clip();
    c.translate(ix, iy);
    o.after(c, ir, pr);
    c.restore();
  }
  // highlights — the anime soul of the eye
  c.fillStyle = "rgba(255,255,255,0.96)";
  c.beginPath();
  c.ellipse(ix - ir * 0.34, iy - ir * 0.36, ir * 0.24, ir * 0.3, -0.35, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.85)";
  c.beginPath();
  c.arc(ix + ir * 0.34, iy + ir * 0.34, ir * 0.1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.6)";
  c.beginPath();
  c.arc(ix + ir * 0.06 + Math.sin(t * 0.7) * ir * 0.03, iy + ir * 0.5, ir * 0.05, 0, Math.PI * 2);
  c.fill();
  c.restore(); // iris clip

  // lid shadow over sclera
  const ts = c.createLinearGradient(0, uy, 0, uy + hh * 0.9);
  ts.addColorStop(0, "rgba(70,35,30,0.55)");
  ts.addColorStop(1, "rgba(70,35,30,0)");
  c.fillStyle = ts;
  c.fillRect(-w, uy, w * 2, hh * 0.9);
  // wet lower line
  c.strokeStyle = "rgba(255,255,255,0.45)";
  c.lineWidth = w * 0.006;
  c.beginPath();
  c.moveTo(-w * 0.36, ly * 0.86);
  c.bezierCurveTo(-w * 0.15, ly * 0.98, w * 0.15, ly * 0.98, w * 0.36, ly * 0.8);
  c.stroke();
  c.restore(); // eye clip

  // upper lash line
  c.strokeStyle = "#0a0505";
  c.lineCap = "round";
  c.lineJoin = "round";
  c.lineWidth = w * 0.034;
  c.beginPath();
  upper();
  c.stroke();
  // thicker outer wing
  c.lineWidth = w * 0.05;
  c.beginPath();
  c.moveTo(w * 0.18, uy * 0.98);
  c.bezierCurveTo(w * 0.3, uy * 0.92, w * 0.42, uy * 0.5, B[0], B[1]);
  c.stroke();
  // flick
  c.lineWidth = w * 0.024;
  c.beginPath();
  c.moveTo(B[0] - w * 0.02, B[1]);
  c.quadraticCurveTo(B[0] + w * 0.07, B[1] - hh * 0.05, B[0] + w * 0.11, B[1] - hh * 0.3 * (0.5 + op * 0.5));
  c.stroke();
  // individual upper lashes
  c.lineWidth = w * 0.007;
  for (let i = 0; i < 7; i++) {
    const u = 0.5 + i * 0.07;
    const x = A[0] + (B[0] - A[0]) * u;
    const y = uy * Math.sin(Math.PI * u) * 1.0 + (A[1] + (B[1] - A[1]) * u) * (1 - Math.sin(Math.PI * u));
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + w * 0.02 * (u + 0.3), y - hh * 0.18);
    c.stroke();
  }
  // lower lid
  c.strokeStyle = "rgba(60,28,20,0.7)";
  c.lineWidth = w * 0.007;
  c.beginPath();
  c.moveTo(A[0], A[1]);
  c.bezierCurveTo(-w * 0.2, ly * 1.05, w * 0.2, ly, B[0], B[1]);
  c.stroke();
  // lower lashes (outer half)
  c.lineWidth = w * 0.004;
  for (let i = 0; i < 5; i++) {
    const u = 0.55 + i * 0.09;
    const x = A[0] + (B[0] - A[0]) * u;
    const y = ly * 0.78 * Math.sin(Math.PI * u) + (A[1] + (B[1] - A[1]) * u) * 0.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + w * 0.012, y + hh * 0.09);
    c.stroke();
  }
  // closed-lid line when almost shut
  if (op < 0.06) {
    c.strokeStyle = "#0a0505";
    c.lineWidth = w * 0.03;
    c.beginPath();
    c.moveTo(A[0], A[1]);
    c.bezierCurveTo(-w * 0.2, hh * 0.22, w * 0.2, hh * 0.2, B[0], B[1]);
    c.stroke();
  }
  c.restore();
}
