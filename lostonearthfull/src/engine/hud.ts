import { W, H, E, clamp, lerp, prog, hash, mod } from "./util";
import * as X from "./fx";
import { cover, mk, F, glow, type C2, type Assets } from "./fx";
import { shotScene, FX, type Shot, type Fx } from "./shots";
import type { Scene, Cap } from "../scenes/types";
import type { Cam } from "./fx";

/* =====================================================================================
   REUSABLE SCENE TYPES — log card, title card, recap, next-episode card
   plus the little "diegetic" instruments (spectrogram, crayon drawing, impact flash)
   ===================================================================================== */

/** talking-envelope derived from caption windows (the "voice" without a voice file) */
export const speech = (t: number, caps: Cap[]) => {
  for (const [a, b] of caps) {
    if (t > a && t < b) {
      const k = clamp(Math.min(t - a, b - t) / 0.3);
      return k * (0.4 + 0.6 * Math.abs(Math.sin(t * 9.1) * Math.sin(t * 4.3 + 1)));
    }
  }
  return 0;
};

export function logScene(m: { id: string; start: number; dur: number; label: string; sub: string; cell: string; caps: Cap[]; rgb?: string; fout?: number }): Scene {
  const rgb = m.rgb ?? "20,80,66";
  return {
    id: m.id, label: m.label, start: m.start, dur: m.dur, caps: m.caps, fout: m.fout ?? 0.5,
    draw: (c, t, g) => {
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
      const k = clamp(t / 2.2);
      const cy = H / 2 + 30;
      const gr = c.createRadialGradient(W / 2, cy, 0, W / 2, cy, 760);
      gr.addColorStop(0, `rgba(${rgb},${0.3 * k})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr;
      c.fillRect(0, 0, W, H);
      for (let j = 0; j < 3; j++) {
        const ph = (t * 0.8 + j / 3) % 1;
        c.strokeStyle = `rgba(110,255,215,${(1 - ph) * 0.2 * k})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(W / 2, cy, 60 + ph * 560, 0, Math.PI * 2);
        c.stroke();
      }
      const env = speech(t, m.caps);
      const N = 150, bw = 6, gap = 5;
      const x0 = W / 2 - (N * (bw + gap)) / 2;
      const f = Math.floor(t * 24);
      for (let i = 0; i < N; i++) {
        const u = (i / (N - 1)) * 2 - 1;
        const win = Math.pow(Math.cos((u * Math.PI) / 2), 1.5);
        const n = hash(i * 3.17 + f * 1.31);
        const h = 3 + (env * 200 + 8 * k) * win * (0.2 + 0.8 * n);
        c.fillStyle = `rgba(140,255,225,${0.35 + 0.6 * win})`;
        c.fillRect(x0 + i * (bw + gap), cy - h / 2, bw, h);
      }
      X.typeText(c, m.label, W / 2, cy - 220, 0.9, t, { font: `64px ${F.title}`, color: "#ff9158", per: 0.09, sp: 14, align: "center", rise: 10 });
      X.mono(c, m.sub, W / 2, cy - 180, 16, "#7fd9c0", "center", 5, E.outCubic(prog(t, 1.6, 2.6)) * 0.8);
      X.mono(c, m.cell, W / 2, cy + 190, 15, "#ff8a7a", "center", 6, E.outCubic(prog(t, 2.2, 3.2)) * (Math.floor(g * 1.6) % 2 ? 0.55 : 0.95));
      X.rec(c, g, k);
      X.vignette(c, 0.6);
    },
  };
}

export function titleScene(m: {
  id: string; start: number; dur: number; plate: string; from: Cam; to: Cam;
  kicker: string; title: string; jp: string; fin?: number; fout?: number; fx?: Fx[];
}): Scene {
  const tmp = mk(W, H);
  const halo = mk(240, 103);
  return {
    id: m.id, label: "Title", start: m.start, dur: m.dur, fin: m.fin ?? 0.5, fout: m.fout ?? 0.9, bloom: 0.32, caps: [],
    draw: (c, t, g, A) => {
      const k = E.outQuint(prog(t, 0, 6.5));
      cover(c, A[m.plate], { z: lerp(m.from.z ?? 1, m.to.z ?? 1, k), fx: lerp(m.from.fx ?? 0.5, m.to.fx ?? 0.5, k), fy: lerp(m.from.fy ?? 0.5, m.to.fy ?? 0.5, k) });
      c.fillStyle = "rgba(0,8,10,0.52)";
      c.fillRect(0, 0, W, H);
      X.shafts(c, t, { ox: W * 0.55, oy: -80, ang: Math.PI * 0.5, spread: 1.3, n: 9, alpha: 0.16, len: 1400, seed: 21 });
      X.motes(c, t, 31, 50, { size: 8, alpha: 0.7 });
      m.fx?.forEach((f) => f(c, t, { map: (u, v) => [u * W, v * H], s: 1 }, A, k));
      X.vignette(c, 0.55);

      const tx = tmp.getContext("2d")!;
      tx.setTransform(1, 0, 0, 1, 0, 0);
      tx.clearRect(0, 0, W, H);
      tx.font = `100px ${F.title}`;
      const text = m.title;
      const w100 = [...text].reduce((a, ch) => a + tx.measureText(ch).width, 0);
      const size = Math.min(250, (100 * 1560) / (w100 + text.length * 6));
      const sp = size * 0.065;
      tx.font = `${size}px ${F.title}`;
      tx.textBaseline = "alphabetic";
      const widths = [...text].map((ch) => tx.measureText(ch).width + sp);
      const total = widths.reduce((a, b) => a + b, 0) - sp;
      let x = W / 2 - total / 2;
      const by = H / 2 + size * 0.22;
      [...text].forEach((ch, i) => {
        const a = E.outExpo(prog(t, 1.0 + i * 0.06, 1.0 + i * 0.06 + 0.95));
        tx.globalAlpha = a;
        tx.fillStyle = "#fff6e6";
        tx.fillText(ch, x, by + (1 - a) * 46);
        x += widths[i];
      });
      tx.globalAlpha = 1;
      tx.globalCompositeOperation = "source-atop";
      const bx = lerp(-400, W + 400, E.inOutCubic(prog(t, 2.6, 4.8)));
      const bg = tx.createLinearGradient(bx - 220, 0, bx + 220, 0);
      bg.addColorStop(0, "rgba(255,160,70,0)");
      bg.addColorStop(0.5, "rgba(255,170,80,0.95)");
      bg.addColorStop(1, "rgba(255,160,70,0)");
      tx.fillStyle = bg;
      tx.fillRect(0, 0, W, H);
      tx.globalCompositeOperation = "source-over";
      const hx = halo.getContext("2d")!;
      hx.clearRect(0, 0, 240, 103);
      hx.drawImage(tmp, 0, 0, 240, 103);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.75;
      c.imageSmoothingQuality = "high";
      c.drawImage(halo, 0, 0, W, H);
      c.restore();
      c.drawImage(tmp, 0, 0);
      const rk = E.outExpo(prog(t, 2.4, 3.4));
      c.fillStyle = "#ff7a2f";
      c.fillRect(W / 2 - 520 * rk, H / 2 + size * 0.22 + 38, 1040 * rk, 4);
      c.save();
      c.globalAlpha = E.outCubic(prog(t, 3.2, 4.2));
      c.font = `500 40px ${F.serif}`;
      c.textAlign = "center";
      c.fillStyle = "#ffe9cf";
      c.fillText(m.jp, W / 2, H / 2 + size * 0.22 + 105);
      c.restore();
      X.mono(c, m.kicker, W / 2, H / 2 - size * 0.78, 22, "#ffbe8a", "center", 10, E.outCubic(prog(t, 0.6, 1.6)));
      void g;
    },
  };
}

/** "Previously on…" — memory montage, warm and slightly faded, label slashed across the corner */
export function recapScene(m: { id: string; start: number; dur: number; xf?: number; fout?: number }, items: { plate: string; from: Cam; to?: Cam; ins?: Shot["in"] }[], jp = "前回までの Lost on Earth"): Scene {
  const each = m.dur / items.length;
  const shots: Shot[] = items.map((it, i) => ({
    at: i * each, dur: each + 0.01, plate: it.plate, from: it.from, to: it.to ?? { ...it.from, z: (it.from.z ?? 1) * 1.08 },
    in: i === 0 ? undefined : (it.ins ?? (i % 2 ? "flash" : "whip")), hh: 5,
    ease: E.outCubic,
    fx: [FX.motes(14, { seed: 9 + i, size: 6, alpha: 0.5 }), FX.wash("rgba(255,235,205,0.18)", "soft-light"), FX.scan(0.05), FX.vig(0.55)],
  }));
  return shotScene({ ...m, label: "Previously", caps: [], bloom: 0.34 }, shots, (c, t) => {
    const a = E.outExpo(prog(t, 0.2, 1.1)) * (1 - E.inQuad(prog(t, m.dur - 1, m.dur)));
    c.save();
    c.translate(-(1 - a) * 700, 0);
    c.fillStyle = "rgba(6,12,12,0.78)";
    c.beginPath();
    c.moveTo(0, 56); c.lineTo(660, 56); c.lineTo(618, 150); c.lineTo(0, 150);
    c.closePath();
    c.fill();
    c.fillStyle = "#ff7a2f";
    c.fillRect(0, 150, 618, 4);
    c.restore();
    c.save();
    c.translate(-(1 - a) * 700, 0);
    X.mono(c, "PREVIOUSLY", 64, 96, 18, "#ff9a5c", "left", 10);
    c.font = `500 34px ${F.serif}`;
    c.fillStyle = "#fff3e0";
    c.fillText(jp, 64, 134);
    c.restore();
  });
}

export function nextScene(m: { id: string; start: number; dur: number; plate: string; from: Cam; to: Cam; num: string; title: string; jp: string; lines: string[]; fin?: number }): Scene {
  return {
    id: m.id, label: "Next", start: m.start, dur: m.dur, fin: m.fin ?? 0.8, fout: 1.2, bloom: 0.3, caps: [],
    draw: (c, t, g, A) => {
      const k = E.inOutSine(prog(t, 0, m.dur));
      cover(c, A[m.plate], { z: lerp(m.from.z ?? 1, m.to.z ?? 1, k), fx: lerp(m.from.fx ?? 0.5, m.to.fx ?? 0.5, k), fy: lerp(m.from.fy ?? 0.5, m.to.fy ?? 0.5, k) });
      X.tint(c, "rgba(2,10,10,0.62)", "source-over");
      X.motes(c, t, 77, 36, { size: 7, alpha: 0.6 });
      X.vignette(c, 0.6);
      const a = E.outExpo(prog(t, 0.6, 1.6));
      X.mono(c, "NEXT EPISODE", 120, H / 2 - 200, 20, "#ff9a5c", "left", 12, a);
      X.mono(c, m.num, 120, H / 2 - 168, 16, "#9fe8d2", "left", 8, a * 0.8);
      X.typeText(c, m.title, 116, H / 2 + 20, 1.2, t, { font: `150px ${F.title}`, color: "#fff7ea", per: 0.04, sp: 4, rise: 18 });
      c.save();
      c.globalAlpha = E.outCubic(prog(t, 2.3, 3.2));
      c.font = `500 34px ${F.serif}`;
      c.fillStyle = "rgba(255,236,210,0.85)";
      c.fillText(m.jp, 124, H / 2 + 72);
      c.restore();
      c.fillStyle = "#ff7a2f";
      c.fillRect(120, H / 2 + 98, 520 * E.outExpo(prog(t, 2.0, 3.0)), 4);
      m.lines.forEach((l, i) => X.mono(c, l, 120, H / 2 + 150 + i * 32, 18, "#cfeee3", "left", 3, E.outCubic(prog(t, 3.6 + i * 0.7, 4.4 + i * 0.7))));
      void g;
    },
  };
}

/* ------------------------------------------------------------------ instruments */

/** scrolling spectrogram: past scrolls left, playhead at 72 %. events = [time, strength, pitchBin(0..1)] */
export function spectro(
  c: C2, x: number, y: number, w: number, h: number, t: number,
  o: { win?: number; events: [number, number, number?][]; mark?: [number, number]; alpha?: number; label?: string; rgb?: [number, number, number] }
) {
  const win = o.win ?? 9;
  const a = o.alpha ?? 1;
  const bins = 28;
  const cw = 5;
  const n = Math.floor(w / cw);
  c.save();
  c.globalAlpha = a;
  c.fillStyle = "rgba(4,14,14,0.78)";
  c.fillRect(x - 14, y - 40, w + 28, h + 70);
  c.strokeStyle = "rgba(160,255,225,0.28)";
  c.lineWidth = 1.5;
  c.strokeRect(x - 14, y - 40, w + 28, h + 70);
  X.mono(c, o.label ?? "SPECTROGRAM · 0–8 kHz", x, y - 14, 14, "#8fe8d0", "left", 4);
  const bh = h / bins;
  const [r0, g0, b0] = o.rgb ?? [255, 150, 70];
  for (let i = 0; i < n; i++) {
    const tt = t - win * 0.72 + (i / n) * win;
    if (tt > t) break;
    if (tt < 0) continue;
    const q = Math.floor(tt * 24);
    for (let b = 0; b < bins; b++) {
      const lowW = 1 - (b / bins) * 0.6;
      let v = hash(b * 7.1 + q * 0.37) * 0.22 * lowW;
      for (const [te, st, pb] of o.events) {
        const d = Math.abs(tt - te - 0.03);
        if (d > 0.4) continue;
        const pitch = (pb ?? 0.2) * bins;
        const bandd = Math.abs(b - pitch);
        const harm = Math.max(Math.exp(-bandd * 0.45), 0.6 * Math.exp(-Math.abs(b - pitch * 2) * 0.6), 0.35 * Math.exp(-Math.abs(b - pitch * 3) * 0.7));
        v += st * Math.exp(-d * 11) * (0.3 + 0.7 * harm) * (b < bins * 0.8 ? 1 : 0.4);
      }
      v = clamp(v);
      if (v < 0.08) continue;
      const hot = clamp((v - 0.45) * 2);
      c.fillStyle = `rgba(${lerp(40, r0, v)},${lerp(160, g0, v) + 60 * hot},${lerp(150, b0, v) + 120 * hot},${0.25 + 0.75 * v})`;
      c.fillRect(x + i * cw, y + h - (b + 1) * bh, cw - 0.5, bh - 0.8);
    }
  }
  if (o.mark) {
    const mx0 = x + ((o.mark[0] - (t - win * 0.72)) / win) * w;
    const mx1 = x + ((o.mark[1] - (t - win * 0.72)) / win) * w;
    c.strokeStyle = "rgba(255,200,120,0.95)";
    c.lineWidth = 2.5;
    c.strokeRect(Math.max(x, mx0), y - 4, Math.max(0, Math.min(x + w, mx1) - Math.max(x, mx0)), h + 8);
  }
  const px = x + w * 0.72;
  c.strokeStyle = "rgba(255,255,255,0.8)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(px, y - 8);
  c.lineTo(px, y + h + 8);
  c.stroke();
  for (let k = 0; k <= 4; k++) X.mono(c, `${(k * 2)}k`, x - 6, y + h - (k / 4) * h + 5, 11, "#6fb8a6", "right", 1);
  c.restore();
}

export type Stroke = { pts: [number, number][]; col: string; w?: number; at: number; dur: number };

/** child's crayon drawing — strokes write on with wobble and a waxy double pass */
export function crayonPaper(c: C2, t: number) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#efe2c4");
  g.addColorStop(1, "#d8c49d");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = 0.07;
  c.strokeStyle = "#7a5a30";
  for (let i = 0; i < 160; i++) {
    const x = hash(i * 3.3) * W, y = hash(i * 5.7) * H;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (hash(i * 9) - 0.5) * 90, y + (hash(i * 11) - 0.5) * 40);
    c.stroke();
  }
  c.restore();
  void t;
}

export function drawStrokes(c: C2, strokes: Stroke[], t: number, ox = 0, oy = 0, sc = 1) {
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  strokes.forEach((s, si) => {
    const p = E.inOutSine(prog(t, s.at, s.at + s.dur));
    if (p <= 0) return;
    const n = s.pts.length;
    const upto = p * (n - 1);
    for (let pass = 0; pass < 3; pass++) {
      c.strokeStyle = s.col;
      c.globalAlpha = pass === 0 ? 0.95 : 0.4;
      c.lineWidth = ((s.w ?? 9) * (pass === 0 ? 1 : 0.55)) * sc;
      c.beginPath();
      for (let i = 0; i <= Math.floor(upto) && i < n; i++) {
        const j = (k: number) => (hash(si * 13.1 + i * 3.7 + pass * 9.3 + k) - 0.5) * (pass === 0 ? 1.5 : 5);
        const [px, py] = s.pts[i];
        const x = ox + px * sc + j(0), y = oy + py * sc + j(1);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      const i0 = Math.floor(upto);
      if (i0 < n - 1) {
        const f = upto - i0;
        const [ax, ay] = s.pts[i0], [bx, by] = s.pts[i0 + 1];
        c.lineTo(ox + lerp(ax, bx, f) * sc, oy + lerp(ay, by, f) * sc);
      }
      c.stroke();
    }
  });
  c.restore();
}

/** colour-inverting impact flash (anime "negative frame") */
export function negative(c: C2, a: number) {
  if (a <= 0.01) return;
  c.save();
  c.globalCompositeOperation = "difference";
  c.fillStyle = `rgba(255,255,255,${clamp(a)})`;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** hand-crank HUD: shows the hand-cranked cell charging */
export function crankHud(c: C2, x: number, y: number, t: number, pct: number, a = 1, cranking = 0) {
  c.save();
  c.globalAlpha = a;
  c.fillStyle = "rgba(4,14,14,0.78)";
  c.fillRect(x - 16, y - 16, 330, 118);
  c.strokeStyle = "rgba(160,255,225,0.3)";
  c.strokeRect(x - 16, y - 16, 330, 118);
  c.restore();
  X.mono(c, "REC CELL · HAND CRANK", x, y + 6, 13, "#8fe8d0", "left", 3, a);
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = pct < 5 ? "#ff6a5a" : "#d8fff0";
  c.lineWidth = 2.5;
  c.strokeRect(x, y + 24, 210, 34);
  c.fillStyle = c.strokeStyle;
  c.fillRect(x + 212, y + 33, 6, 16);
  c.fillRect(x + 5, y + 29, Math.max(2, (pct / 100) * 200), 24);
  c.restore();
  X.mono(c, `${pct.toFixed(0).padStart(2, "0")}%`, x + 236, y + 52, 26, pct < 5 ? "#ff8a7a" : "#e8fff6", "left", 2, a);
  // crank wheel
  c.save();
  c.globalAlpha = a;
  c.translate(x + 40, y + 82);
  c.rotate(t * 8 * cranking);
  c.strokeStyle = "#ffb27a";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, 10, 0, Math.PI * 2);
  c.moveTo(0, 0); c.lineTo(22, 0);
  c.stroke();
  c.restore();
  X.mono(c, cranking > 0 ? "+ CRANKING" : "IDLE", x + 80, y + 87, 13, cranking > 0 ? "#ffb27a" : "#7fb5a6", "left", 3, a);
}

export { glow, mod, type Assets };
