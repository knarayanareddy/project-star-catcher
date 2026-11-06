import { H, W, clamp } from "./util";
import { makeCanvas, paperGrain } from "./draw";

/** Per-frame post parameters. Lens distortion is only ever tied to folding hardware. */
export interface FX {
  distort: number; // 0..1 amplitude of the folding-hardware lens wobble
  fx: number; // focus x
  fy: number; // focus y
  fr: number; // focus radius (px)
  flash: number; // 0..1 white flash
  dim: number; // 0..1 fade to black
  shake: number; // px
  tint: [number, number, number, number] | null;
  vignette: number;
  grain: number;
}

export const defaultFX = (): FX => ({ distort: 0, fx: W / 2, fy: H / 2, fr: 220, flash: 0, dim: 0, shake: 0, tint: null, vignette: 0.55, grain: 0.07 });

export class Post {
  private ctx: CanvasRenderingContext2D;
  private vig: HTMLCanvasElement;

  constructor(public out: HTMLCanvasElement, public scene: HTMLCanvasElement) {
    out.width = W;
    out.height = H;
    this.ctx = out.getContext("2d", { alpha: false })!;
    this.vig = makeCanvas(W, H);
    const g = this.vig.getContext("2d")!;
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.98);
    gr.addColorStop(0, "rgba(10,4,20,0)");
    gr.addColorStop(1, "rgba(10,4,20,1)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }

  render(fx: FX, t: number, overlay?: (ctx: CanvasRenderingContext2D) => void) {
    const c = this.ctx;
    const sx = fx.shake ? (Math.sin(t * 91) + Math.sin(t * 53)) * 0.5 * fx.shake : 0;
    const sy = fx.shake ? (Math.cos(t * 77) + Math.sin(t * 61)) * 0.5 * fx.shake : 0;
    c.save();
    c.fillStyle = "#0d0714";
    c.fillRect(0, 0, W, H);
    if (fx.distort > 0.01) {
      const step = 4;
      for (let y = 0; y < H; y += step) {
        const d = (y - fx.fy) / fx.fr;
        const fall = Math.exp(-d * d);
        const dx = (Math.sin(y * 0.045 + t * 2.6) * 14 + Math.sin(y * 0.013 - t * 1.4) * 22) * fx.distort * fall;
        // pinch toward focus
        const pinch = 1 - 0.07 * fx.distort * fall;
        c.drawImage(this.scene, 0, y, W, step, (W - W * pinch) / 2 + dx + sx, y + sy, W * pinch, step);
      }
    } else {
      c.drawImage(this.scene, sx, sy);
    }
    if (fx.tint) {
      c.fillStyle = `rgba(${fx.tint[0]},${fx.tint[1]},${fx.tint[2]},${fx.tint[3]})`;
      c.fillRect(0, 0, W, H);
    }
    // grain
    if (fx.grain > 0) {
      c.save();
      c.globalAlpha = fx.grain;
      c.globalCompositeOperation = "overlay";
      const g = paperGrain();
      const ox = Math.floor((t * 60) % 256);
      const oy = Math.floor((t * 37) % 256);
      for (let x = -256 + (ox % 256); x < W; x += 256) for (let y = -256 + (oy % 256); y < H; y += 256) c.drawImage(g, x, y);
      c.restore();
    }
    // vignette
    c.globalAlpha = clamp(fx.vignette);
    c.drawImage(this.vig, 0, 0);
    c.globalAlpha = 1;
    if (fx.flash > 0.001) {
      c.fillStyle = `rgba(255,252,240,${clamp(fx.flash)})`;
      c.fillRect(0, 0, W, H);
    }
    if (overlay) overlay(c);
    if (fx.dim > 0.001) {
      c.fillStyle = `rgba(8,3,14,${clamp(fx.dim)})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();
  }
}
