import { W, H, FPS, DURATION, Ctx, makeCanvas, prog, smooth, eis, hash, rng } from './util';
import { Assets, ShotFn, loadAssets } from './assets';
import { shotNight, shotPlatform, shotEye, shotArrive, shotRun, shotDeck } from './shots1';
import { shotClimb, shotArch, shotOffering, shotRebirth, shotTitle } from './shots2';

export interface ShotDef {
  name: string;
  s: number;
  e: number;
  fn: ShotFn;
  dissolve?: number; // seconds of dissolve from previous shot (omit = hard cut)
}

// ---- the shot list (the SHOTS block of the brief) ----
export const SHOTS: ShotDef[] = [
  { name: 'The sky lets go', s: 0, e: 12, fn: shotNight },
  { name: 'Platform, blue hour', s: 12, e: 24, fn: shotPlatform('blue'), dissolve: 1.4 },
  { name: 'The eye', s: 24, e: 30, fn: shotEye(1) },
  { name: 'The train arrives', s: 30, e: 42, fn: shotArrive, dissolve: 0.6 },
  { name: 'Run across the water', s: 42, e: 48, fn: shotRun, dissolve: 0.5 },
  { name: 'On the rear deck', s: 48, e: 54, fn: shotDeck },
  { name: 'The climb', s: 54, e: 68, fn: shotClimb, dissolve: 0.4 },
  { name: 'The star-loom', s: 68, e: 79, fn: shotArch, dissolve: 1.4 },
  { name: 'The eye, again', s: 79, e: 84, fn: shotEye(2) },
  { name: 'The offering', s: 84, e: 96, fn: shotOffering, dissolve: 0.5 },
  { name: 'Rebirth', s: 96, e: 106, fn: shotRebirth, dissolve: 1.2 },
  { name: 'Platform, dawn', s: 106, e: 116, fn: shotPlatform('dawn'), dissolve: 1.6 },
  { name: 'Title', s: 116, e: 120, fn: shotTitle, dissolve: 1.6 },
];

export interface Renderer {
  canvas: HTMLCanvasElement;
  render: (t: number) => void;
  assets: Assets;
}

export async function createRenderer(): Promise<Renderer> {
  if (document.fonts) {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('500 96px "Cormorant Garamond"'),
          document.fonts.load('400 36px "Noto Serif JP"', '星降る駅'),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
      await document.fonts.ready;
    } catch {
      /* fonts are optional */
    }
  }
  const A = await loadAssets();
  const out = makeCanvas(W, H);
  const O = out.getContext('2d', { alpha: false })!;
  const scene = makeCanvas(W, H);
  const S = scene.getContext('2d', { alpha: false })!;
  const scratch = makeCanvas(W, H);
  const X = scratch.getContext('2d', { alpha: false })!;
  const b1 = makeCanvas(W / 4, H / 4);
  const B1 = b1.getContext('2d')!;
  const b2 = makeCanvas(W / 16, H / 16);
  const B2 = b2.getContext('2d')!;
  const hasFilter: boolean = typeof (B1 as unknown as { filter?: string }).filter === 'string';

  // seeded film grain tiles
  const grain: CanvasPattern[] = [];
  for (let k = 0; k < 4; k++) {
    const g = makeCanvas(256, 256);
    const gc = g.getContext('2d')!;
    const img = gc.createImageData(256, 256);
    const r = rng(500 + k);
    for (let i = 0; i < 256 * 256; i++) {
      const v = 90 + r() * 90;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
    grain.push(O.createPattern(g, 'repeat')!);
  }

  const runShot = (ctx: Ctx, sh: ShotDef, t: number) => {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    sh.fn(ctx, t - sh.s, sh.e - sh.s, A);
    ctx.restore();
  };

  const render = (tRaw: number) => {
    const frame = Math.max(0, Math.min(Math.round(DURATION * FPS) - 1, Math.floor(tRaw * FPS + 1e-6)));
    const t = frame / FPS;
    let idx = SHOTS.findIndex((s) => t >= s.s && t < s.e);
    if (idx < 0) idx = SHOTS.length - 1;
    const sh = SHOTS[idx];
    S.fillStyle = '#000';
    S.fillRect(0, 0, W, H);
    const inTr = sh.dissolve && idx > 0 && t < sh.s + sh.dissolve;
    if (inTr) {
      runShot(S, SHOTS[idx - 1], t);
      X.fillStyle = '#000';
      X.fillRect(0, 0, W, H);
      runShot(X, sh, t);
      S.globalAlpha = eis(prog(t, sh.s, sh.s + sh.dissolve!));
      S.drawImage(scratch, 0, 0);
      S.globalAlpha = 1;
    } else {
      runShot(S, sh, t);
    }

    // ---------- post ----------
    O.globalCompositeOperation = 'source-over';
    O.globalAlpha = 1;
    O.drawImage(scene, 0, 0);
    if (hasFilter) {
      B1.filter = 'brightness(0.85) contrast(1.4) blur(2px)';
      B1.drawImage(scene, 0, 0, W / 4, H / 4);
      B2.filter = 'brightness(0.9) contrast(1.35) blur(1px)';
      B2.drawImage(scene, 0, 0, W / 16, H / 16);
    } else {
      B1.drawImage(scene, 0, 0, W / 4, H / 4);
      B2.drawImage(scene, 0, 0, W / 16, H / 16);
    }
    O.globalCompositeOperation = 'screen';
    O.imageSmoothingEnabled = true;
    O.imageSmoothingQuality = 'high';
    O.globalAlpha = 0.42;
    O.drawImage(b1, 0, 0, W, H);
    O.globalAlpha = 0.5;
    O.drawImage(b2, 0, 0, W, H);
    O.globalAlpha = 1;
    O.globalCompositeOperation = 'source-over';
    // vignette
    const vg = O.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,10,0)');
    vg.addColorStop(1, 'rgba(0,0,10,0.38)');
    O.fillStyle = vg;
    O.fillRect(0, 0, W, H);
    // grain (jumps every frame, seeded by frame number)
    O.save();
    O.globalCompositeOperation = 'overlay';
    O.globalAlpha = 0.085;
    O.translate(Math.floor(hash(frame * 1.3) * 256), Math.floor(hash(frame * 2.7 + 4) * 256));
    O.fillStyle = grain[frame % 4];
    O.fillRect(-256, -256, W + 512, H + 512);
    O.restore();
    // fades
    const fin = 1 - smooth(0, 2.2, t);
    const fout = smooth(DURATION - 1.3, DURATION - 0.05, t);
    const fa = Math.max(fin, fout);
    if (fa > 0) {
      O.fillStyle = `rgba(0,0,0,${fa})`;
      O.fillRect(0, 0, W, H);
    }
  };

  return { canvas: out, render, assets: A };
}
