import { RGB, mix3, smooth } from "./util";

export interface Pal {
  skyTop: RGB;
  skyMid: RGB;
  skyLow: RGB;
  sea: RGB;
  seaLow: RGB;
  lit: RGB;
  shade: RGB;
  haze: RGB;
  lamp: RGB;
  moon: RGB;
  accent: RGB;
}

export const PALS: Record<string, Pal> = {
  calm: {
    skyTop: [4, 6, 24], skyMid: [16, 18, 58], skyLow: [50, 52, 112],
    sea: [16, 34, 66], seaLow: [4, 9, 26], lit: [150, 172, 232], shade: [12, 14, 34],
    haze: [40, 48, 100], lamp: [255, 172, 72], moon: [226, 232, 255], accent: [90, 232, 220],
  },
  uneasy: {
    skyTop: [8, 3, 20], skyMid: [32, 12, 52], skyLow: [78, 36, 92],
    sea: [18, 22, 50], seaLow: [6, 5, 22], lit: [190, 150, 232], shade: [16, 9, 32],
    haze: [92, 50, 122], lamp: [255, 140, 90], moon: [236, 226, 242], accent: [120, 255, 200],
  },
  dread: {
    skyTop: [1, 3, 10], skyMid: [7, 14, 30], skyLow: [26, 42, 66],
    sea: [6, 14, 26], seaLow: [1, 3, 9], lit: [110, 160, 205], shade: [5, 9, 20],
    haze: [28, 52, 72], lamp: [160, 232, 255], moon: [205, 232, 247], accent: [150, 255, 255],
  },
  crimson: {
    skyTop: [22, 0, 8], skyMid: [74, 8, 30], skyLow: [160, 42, 52],
    sea: [42, 8, 26], seaLow: [14, 2, 8], lit: [255, 150, 140], shade: [24, 4, 14],
    haze: [124, 32, 52], lamp: [255, 204, 120], moon: [255, 204, 192], accent: [255, 120, 170],
  },
  tide: {
    skyTop: [2, 10, 24], skyMid: [10, 42, 62], skyLow: [64, 124, 134],
    sea: [8, 38, 52], seaLow: [2, 10, 18], lit: [170, 232, 242], shade: [6, 18, 28],
    haze: [40, 92, 102], lamp: [255, 190, 110], moon: [230, 250, 255], accent: [120, 255, 230],
  },
  gold: {
    skyTop: [8, 6, 28], skyMid: [48, 28, 66], skyLow: [170, 104, 92],
    sea: [32, 34, 72], seaLow: [8, 8, 24], lit: [255, 212, 162], shade: [22, 14, 42],
    haze: [144, 92, 112], lamp: [255, 204, 100], moon: [255, 242, 222], accent: [255, 222, 140],
  },
  drown: {
    skyTop: [0, 2, 8], skyMid: [6, 14, 28], skyLow: [22, 36, 54],
    sea: [4, 12, 22], seaLow: [0, 2, 6], lit: [92, 132, 162], shade: [4, 8, 14],
    haze: [14, 28, 44], lamp: [200, 240, 255], moon: [182, 202, 222], accent: [160, 255, 240],
  },
  day: {
    skyTop: [70, 120, 190], skyMid: [140, 190, 230], skyLow: [250, 220, 190],
    sea: [50, 120, 160], seaLow: [14, 50, 80], lit: [255, 245, 220], shade: [50, 60, 90],
    haze: [200, 220, 240], lamp: [255, 220, 150], moon: [255, 255, 240], accent: [200, 255, 240],
  },
};

export const mixPal = (a: Pal, b: Pal, t: number): Pal => {
  const o: any = {};
  for (const k of Object.keys(a) as (keyof Pal)[]) o[k] = mix3(a[k], b[k], t);
  return o as Pal;
};

const SEQ: [number, string][] = [
  [0, "calm"],
  [26, "calm"],
  [40, "uneasy"],
  [62, "uneasy"],
  [78, "calm"],
  [100, "calm"],
  [114, "dread"],
  [142, "dread"],
  [150, "crimson"],
  [178, "crimson"],
  [188, "tide"],
  [211, "tide"],
  [222, "dread"],
  [252, "dread"],
  [258, "gold"],
  [278, "gold"],
  [286, "drown"],
];

export function palAt(t: number): Pal {
  if (t <= SEQ[0][0]) return PALS[SEQ[0][1]];
  for (let i = 1; i < SEQ.length; i++) {
    if (t <= SEQ[i][0]) {
      const u = smooth(SEQ[i - 1][0], SEQ[i][0], t);
      return mixPal(PALS[SEQ[i - 1][1]], PALS[SEQ[i][1]], u);
    }
  }
  return PALS[SEQ[SEQ.length - 1][1]];
}

// ------------------------------------------------------------------ sprites
const cache = new Map<string, HTMLCanvasElement>();
export function glowSprite(c: RGB): HTMLCanvasElement {
  const key = `${c[0] >> 3},${c[1] >> 3},${c[2] >> 3}`;
  let s = cache.get(key);
  if (!s) {
    s = document.createElement("canvas");
    s.width = s.height = 128;
    const g = s.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const [r, gg, b] = c.map((v) => Math.round(v));
    const mid = [Math.min(255, r + 40), Math.min(255, gg + 40), Math.min(255, b + 40)];
    gr.addColorStop(0, `rgba(255,255,255,1)`);
    gr.addColorStop(0.1, `rgba(${mid[0]},${mid[1]},${mid[2]},0.95)`);
    gr.addColorStop(0.28, `rgba(${r},${gg},${b},0.42)`);
    gr.addColorStop(0.6, `rgba(${r},${gg},${b},0.1)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    cache.set(key, s);
  }
  return s;
}

/** additive glow blob */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a = 1, sy = 1) {
  if (a <= 0.003 || r < 0.3) return;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(c), x - r, y - r * sy, r * 2, r * 2 * sy);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}
