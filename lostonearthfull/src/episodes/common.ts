import { W, H, E, clamp, lerp, prog, hash } from "../engine/util";
import { animeEye, blink } from "../engine/eye";
import * as X from "../engine/fx";
import type { C2, Assets } from "../engine/fx";
import { FX, type Fx } from "../engine/shots";

export const SKIN_MAYA: [string, string] = ["#e0a679", "#a96c47"];
export const SKIN_WAYRA: [string, string] = ["#b9784b", "#6c3d24"];
export const SKIN_ILA: [string, string] = ["#a56a40", "#5f3520"];

/** a small red-clay handprint, pressed onto the world */
export function handprint(c: C2, x: number, y: number, s: number, a: number, rot = 0) {
  if (a <= 0.01) return;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  c.globalAlpha = a;
  c.fillStyle = "rgba(176,44,26,0.92)";
  c.beginPath();
  c.ellipse(0, 18, 26, 30, 0, 0, Math.PI * 2);
  c.fill();
  const fing: [number, number, number, number][] = [[-22, -14, -0.35, 30], [-8, -26, -0.1, 36], [8, -26, 0.1, 34], [22, -12, 0.32, 27]];
  for (const [fx, fy, r, l] of fing) {
    c.save();
    c.translate(fx, fy);
    c.rotate(r);
    c.beginPath();
    c.ellipse(0, -l / 2 + 6, 7.5, l / 2, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.save();
  c.translate(-30, 14);
  c.rotate(-1.0);
  c.beginPath();
  c.ellipse(0, -16, 8, 20, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.globalCompositeOperation = "multiply";
  c.fillStyle = "rgba(120,20,10,0.4)";
  c.beginPath();
  c.ellipse(4, 20, 14, 18, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export interface EyeIn {
  dur: number;
  skin?: [string, string];
  reflect?: string;
  blinks?: number[];
  pupil?: [number, number];
  look?: [number, number];
  tremor?: number;
  tears?: [number, number];
  w?: number;
  cx?: number;
  cy?: number;
  warm?: string;
}

/** extreme close-up cel-shaded eye, with a plate reflected in the iris */
export function eyeInsert(c: C2, lt: number, A: Assets, o: EyeIn) {
  const skin = o.skin ?? SKIN_MAYA;
  let op = lt < 0.5 ? 0.04 : 0.04 + 0.88 * E.outCubic(prog(lt, 0.5, 2.4));
  for (const b of o.blinks ?? []) op *= blink(lt, b);
  op *= 1 - E.inCubic(prog(lt, o.dur - 0.7, o.dur - 0.1));
  const w = lerp(o.w ?? 1100, (o.w ?? 1100) * 1.12, prog(lt, 0, o.dur));
  const p0 = o.pupil?.[0] ?? 0.55, p1 = o.pupil?.[1] ?? 0.4;
  animeEye(c, {
    cx: (o.cx ?? W / 2) + Math.sin(lt * 0.4) * 12,
    cy: (o.cy ?? H / 2) + 40,
    w, open: op, t: lt,
    lookX: (o.look?.[0] ?? -0.2) + Math.sin(lt * 0.5) * 0.15,
    lookY: o.look?.[1] ?? -0.1,
    pupil: lerp(p0, p1, E.inOutSine(prog(lt, 0.5, o.dur * 0.7))),
    tremor: o.tremor ?? 0,
    skin,
    reflect: (g, r) => {
      if (o.reflect) {
        g.globalAlpha = 0.62;
        g.drawImage(A[o.reflect], -r * 1.5, -r * 0.95, r * 3, r * 1.3);
      }
      X.glow(g, r * 0.12, -r * 0.28, r * 0.7, o.warm ?? "255,225,170", 0.55);
    },
  });
  if (o.tears) {
    const k = E.inOutSine(prog(lt, o.tears[0], o.tears[1]));
    if (k > 0) {
      const x = (o.cx ?? W / 2) + (o.w ?? 1100) * 0.18;
      const y0 = (o.cy ?? H / 2) + 150;
      c.save();
      const gr = c.createLinearGradient(x, y0, x, y0 + 260 * k);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.2, "rgba(255,248,235,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0.1)");
      c.strokeStyle = gr;
      c.lineWidth = 9;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x, y0);
      c.quadraticCurveTo(x + 14, y0 + 120 * k, x + 4, y0 + 260 * k);
      c.stroke();
      c.restore();
    }
  }
  c.save();
  c.globalCompositeOperation = "soft-light";
  const gr = c.createLinearGradient(W, 0, 0, H);
  gr.addColorStop(0, `rgba(${o.warm ?? "255,200,120"},0.6)`);
  gr.addColorStop(0.6, `rgba(${o.warm ?? "255,200,120"},0)`);
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  c.restore();
  X.motes(c, lt, 5, 18, { size: 7, alpha: 0.5 });
  X.vignette(c, 0.55);
  X.flash(c, 1 - prog(lt, 0, 0.35));
}

/* colour grades as FX */
export const GR = {
  dusk: [FX.wash("rgba(130,105,185,0.42)", "multiply"), FX.wash("rgba(255,130,70,0.14)", "soft-light")] as Fx[],
  night: [FX.wash("rgba(30,55,140,0.6)", "multiply"), FX.desat(0.18)] as Fx[],
  deepNight: [FX.wash("rgba(18,32,96,0.72)", "multiply"), FX.desat(0.3)] as Fx[],
  memory: [FX.wash("rgba(255,222,180,0.3)", "soft-light"), FX.desat(0.12), FX.scan(0.05)] as Fx[],
  warm: [FX.wash("rgba(255,170,90,0.2)", "soft-light")] as Fx[],
  cold: [FX.wash("rgba(110,170,200,0.2)", "soft-light")] as Fx[],
};

/** a flat "cast" of recurring time sources, used by every episode */
export const kHash = hash;
export { clamp };
