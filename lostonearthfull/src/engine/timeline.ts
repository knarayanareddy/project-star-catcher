import { W, H, E, clamp, prog, hash } from "./util";
import { mk, caption, black, type Assets, type C2 } from "./fx";
import type { Scene } from "../scenes/types";

/* ---------------------------------------------------------------- post-processing */
const bloomA = mk(480, 205);
const bloomB = mk(240, 103);
const bloomC = mk(120, 52);
let vig: HTMLCanvasElement | null = null;
const grainTiles: CanvasPattern[] = [];
let layer: HTMLCanvasElement | null = null;
let aber: HTMLCanvasElement | null = null;

export const state = { captions: true };

export const sceneAt = (scenes: Scene[], g: number) => {
  let idx = 0;
  for (let i = 0; i < scenes.length; i++) if (g >= scenes[i].start) idx = i;
  return idx;
};

function ensure(ctx: C2) {
  if (!vig) {
    vig = mk(W, H);
    const v = vig.getContext("2d")!;
    const gr = v.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.66);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,0.34)");
    v.fillStyle = gr;
    v.fillRect(0, 0, W, H);
  }
  if (!grainTiles.length) {
    for (let k = 0; k < 4; k++) {
      const t = mk(256, 256);
      const g = t.getContext("2d")!;
      const id = g.createImageData(256, 256);
      for (let i = 0; i < 256 * 256; i++) {
        const n = hash(i * 0.731 + k * 9137.7);
        const v = n > 0.5 ? 255 : 0;
        id.data[i * 4] = v;
        id.data[i * 4 + 1] = v;
        id.data[i * 4 + 2] = v;
        id.data[i * 4 + 3] = Math.abs(n - 0.5) * 2 * 24;
      }
      g.putImageData(id, 0, 0);
      grainTiles.push(ctx.createPattern(t, "repeat")!);
    }
  }
  if (!layer) layer = mk(W, H);
  if (!aber) aber = mk(W, H);
}

/** `ca` = chromatic aberration strength in px (impact / dream moments) */
function post(ctx: C2, bloom: number, g: number, ca: number) {
  const a = bloomA.getContext("2d")!;
  const b = bloomB.getContext("2d")!;
  const c = bloomC.getContext("2d")!;
  for (const x of [a, b, c]) {
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
  }
  a.drawImage(ctx.canvas, 0, 0, bloomA.width, bloomA.height);
  b.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
  c.drawImage(bloomB, 0, 0, bloomC.width, bloomC.height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = bloom * 0.8;
  ctx.drawImage(bloomB, 0, 0, W, H);
  ctx.globalAlpha = bloom;
  ctx.drawImage(bloomC, 0, 0, W, H);
  // warm halation: the brightest areas bleed amber, like film
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = bloom * 0.55;
  ctx.drawImage(bloomC, 0, 0, W, H);
  ctx.restore();
  if (ca > 0.2) {
    const ax = aber!.getContext("2d")!;
    ax.setTransform(1, 0, 0, 1, 0, 0);
    ax.globalCompositeOperation = "source-over";
    ax.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35;
    ctx.drawImage(aber!, -ca, 0);
    ctx.drawImage(aber!, ca, 0);
    ctx.restore();
  }
  ctx.drawImage(vig!, 0, 0);
  const f = Math.floor(g * 12);
  ctx.save();
  ctx.translate(Math.floor(hash(f * 1.7) * 256), Math.floor(hash(f * 3.1) * 256));
  ctx.fillStyle = grainTiles[f % 4];
  ctx.fillRect(-256, -256, W + 512, H + 512);
  ctx.restore();
}

function drawScene(ctx: C2, s: Scene, g: number, A: Assets) {
  const lt = g - s.start;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  s.draw(ctx, lt, g, A);
  ctx.restore();
  if (s.fin) black(ctx, 1 - prog(lt, 0, s.fin));
  if (s.fout) black(ctx, prog(lt, s.dur - s.fout, s.dur));
}

/** Render the exact frame at global time g. Pure: same g → same pixels. */
export function renderAt(ctx: C2, g: number, A: Assets, scenes: Scene[], duration: number) {
  ensure(ctx);
  g = clamp(g, 0, duration - 1 / 120);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const i = sceneAt(scenes, g);
  const s = scenes[i];
  const lt = g - s.start;
  if (s.xf && lt < s.xf && i > 0) {
    drawScene(ctx, scenes[i - 1], g, A);
    const lctx = layer!.getContext("2d")!;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, W, H);
    drawScene(lctx, s, g, A);
    ctx.globalAlpha = E.inOutSine(lt / s.xf);
    ctx.drawImage(layer!, 0, 0);
    ctx.globalAlpha = 1;
  } else {
    drawScene(ctx, s, g, A);
  }
  post(ctx, s.bloom ?? 0.28, g, s.ca ? s.ca(lt) : 0);

  if (state.captions) {
    let a = 0;
    let text = "";
    for (const [t0, t1, tx] of s.caps) {
      if (lt >= t0 && lt <= t1) {
        a = Math.min(prog(lt, t0, t0 + 0.3), 1 - prog(lt, t1 - 0.3, t1));
        text = tx;
      }
    }
    if (text) caption(ctx, text, E.outCubic(a));
  }
}
