import { W, H, E, lerp, prog, hash, mod } from "../engine/util";
import * as X from "../engine/fx";
import { F, glow, type C2 } from "../engine/fx";
import { shotScene, FX, type Shot, type Fx } from "../engine/shots";
import { logScene, recapScene, titleScene, nextScene, spectro, negative, crayonPaper, drawStrokes, type Stroke } from "../engine/hud";
import { renderScore, type Kit, type Chord } from "../engine/synth";
import { eyeInsert, GR } from "./common";
import type { Cap } from "../scenes/types";
import type { Episode } from "./types";

const DUR = 300;
const T = { log: 0, recap: 12, dawn: 26, title: 60, map: 68, flood: 104, jag: 140, bridge: 174, shelter: 214, rising: 250, next: 286 };

/* ---------- local fx */
const eyesFx = (u: number, v: number, gap: number, times: number[], rgb = "255,190,60"): Fx => (c, t, co) => {
  const [x, y] = co.map(u, v);
  let a = 0;
  for (const t0 of times) a = Math.max(a, E.outCubic(prog(t, t0, t0 + 0.6)) * (1 - prog(t, t0 + 4.5, t0 + 5.2)));
  const bl = Math.floor(t * 0.45) !== Math.floor(t * 0.45 - 0.07) ? 0.1 : 1;
  if (a <= 0.01) return;
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const s of [-1, 1]) {
    glow(c, x + s * gap * co.s, y, 36 * co.s, rgb, a * 0.8 * bl);
    glow(c, x + s * gap * co.s, y, 12 * co.s, "255,255,220", a * bl);
  }
  c.restore();
};

function waterRise(c: C2, t: number, level: number, a = 0.74) {
  const y0 = H * (1 - level);
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) c.lineTo(x, y0 + Math.sin(x * 0.011 + t * 1.7) * 9 + Math.sin(x * 0.027 - t * 2.4) * 5);
  c.lineTo(W, H);
  c.closePath();
  const gr = c.createLinearGradient(0, y0, 0, H);
  gr.addColorStop(0, `rgba(58,66,62,${a})`);
  gr.addColorStop(1, `rgba(20,30,34,${Math.min(1, a + 0.1)})`);
  c.fillStyle = gr;
  c.fill();
  c.strokeStyle = "rgba(210,225,230,0.35)";
  c.lineWidth = 2.5;
  c.stroke();
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 16; i++) {
    const x = mod(hash(i * 3.1) * W + t * (20 + hash(i) * 30), W);
    c.globalAlpha = 0.12 * (0.5 + 0.5 * Math.sin(t * 2 + i));
    c.fillStyle = "#cfe";
    c.fillRect(x, y0 + 14 + hash(i * 7) * (H - y0), 120 * hash(i * 2.3) + 30, 2);
  }
  c.restore();
}

/* ======================================================= 0 · LOG 003 */
const c0: Cap[] = [
  [2.2, 5.4, "LOG 003. Day three. Battery: fourteen percent, thanks to a stranger's crank."],
  [5.8, 9.0, "Bearing zero-four-one. Six kilometres. One nine-year-old guide."],
  [9.4, 11.6, "I have never been this lost… or this sure."],
];
const sLog = logScene({ id: "log", start: T.log, dur: 12, label: "LOG 003", sub: "FIELD RECORDER · PARABOLIC MIC · DAY 03", cell: "CELL 14% · HAND-CRANKED", caps: c0 });

/* ======================================================= 1 · PREVIOUSLY */
const sRecap = recapScene({ id: "recap", start: T.recap, dur: 14, fout: 0.4 }, [
  { plate: "clearing", from: { z: 1.4, fx: 0.495, fy: 0.5 } },
  { plate: "wayra_portrait", from: { z: 1.15, fx: 0.62, fy: 0.4 } },
  { plate: "portrait", from: { z: 1.3, fx: 0.65, fy: 0.9 }, to: { z: 2.0, fx: 0.66, fy: 0.95 } },
  { plate: "drum_roots", from: { z: 1.3, fx: 0.55, fy: 0.72 } },
  { plate: "camp_two", from: { z: 1.6, fx: 0.62, fy: 0.55 } },
]);
sRecap.caps = [
  [0.6, 4.0, "A tree full of floods. A girl called Wayra. A grandmother called Ila."],
  [4.4, 8.4, "A recorder, a hand crank, a language made of knocks."],
  [8.8, 11.4, "And two knocks, very far away. Saying: I hear you."],
  [11.8, 13.6, "Now we go find her."],
];

/* ======================================================= 2 · DAWN */
const c2: Cap[] = [
  [0.8, 4.8, "Day three. We left before the sun cleared the trees."],
  [5.4, 9.4, "Wayra packed like a field scientist: nothing she couldn't run with."],
  [10.2, 14.4, "She'd memorised the ridge. I'd memorised the sound."],
  [14.8, 18.6, "Between the two of us, we almost had a map."],
  [20.4, 24.0, "She looked upriver the way I look at a sunrise."],
  [24.4, 27.0, "Like it was a promise."],
  [28.4, 33.4, "But the river had been busy overnight. The path we needed was underwater."],
];
const s2: Shot[] = [
  { at: 0, dur: 10, plate: "camp_two", from: { z: 1.5, fx: 0.62, fy: 0.55 }, to: { z: 1.05, fx: 0.5, fy: 0.5 },
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.4, amp: 2.5 }],
    fx: [FX.fire(0.5, 0.8, { r: 500, a: 0.1 }), FX.wash("rgba(255,190,120,0.3)", "soft-light"), FX.shafts(0.9, -0.05, { ang: 1.9, n: 6, alpha: 0.14 }), FX.mist({ alpha: 0.12, y0: 0.6, y1: 1, n: 8 }), FX.flies(6, { size: 9 }), FX.vig(0.45)] },
  { at: 10, dur: 10, plate: "ridge_dawn", from: { z: 1.05, fx: 0.4, fy: 0.2 }, to: { z: 1.9, fx: 0.7, fy: 0.74 }, in: "dissolve", ease: E.inOutCubic,
    sway: [{ u0: 0, v0: 0.5, u1: 1, v1: 0.85, amp: 1.8, anchor: "none", freq: 0.5 }],
    fx: [FX.flare(0.5, 0.18, { a: 0.5, len: 1400 }), FX.birds(9, { y0: 0.1, y1: 0.3, size: 24 }), FX.fog(0.62, 0.12, 0.14), FX.motes(24, { size: 6 }), FX.vig(0.35)] },
  { at: 20, dur: 8, plate: "wayra_portrait", from: { z: 1.2, fx: 0.64, fy: 0.4 }, to: { z: 1.45, fx: 0.67, fy: 0.37 }, in: "dissolve", rack: [0.6, 1.2],
    sway: [{ u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 6, anchor: "none" }, { u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(40, { size: 7 }), FX.flare(0.2, 0.06, { a: 0.35, len: 900 }), ...GR.warm, FX.vig(0.4)] },
  { at: 28, dur: 6, plate: "walk_back", from: { z: 1.05, fx: 0.7, fy: 0.62 }, to: { z: 1.4, fx: 0.62, fy: 0.6 }, in: "whip", hh: 5,
    fx: [FX.ferns({ n: 7, sway: 1.4 }), FX.mist({ alpha: 0.14, n: 8 }), FX.shafts(0.6, -0.05, { n: 6, alpha: 0.16 }), FX.vig(0.45)] },
];
const sDawn = shotScene({ id: "dawn", label: "Dawn", start: T.dawn, dur: 34, fin: 0.6, fout: 0.5, xf: 0, bloom: 0.34, caps: c2 }, s2, (c, t) => {
  if (t >= 10 && t < 21) {
    const a = E.outCubic(prog(t, 11, 12)) * (1 - prog(t, 19.5, 20.6));
    const cx = W - 190, cy = 190, R = 90;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = "rgba(4,14,14,0.6)";
    c.beginPath(); c.arc(cx, cy, R + 24, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,200,150,0.7)"; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 36; i++) {
      const an = (i / 36) * Math.PI * 2 - Math.PI / 2;
      c.beginPath();
      c.moveTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R);
      c.lineTo(cx + Math.cos(an) * (R - (i % 9 === 0 ? 16 : 7)), cy + Math.sin(an) * (R - (i % 9 === 0 ? 16 : 7)));
      c.stroke();
    }
    const tgt = (41 * Math.PI) / 180;
    const k = E.outBack(prog(t, 12, 14.5));
    const ang = -Math.PI / 2 + tgt * k + Math.sin(t * 9) * 0.02 * (1 - k);
    c.strokeStyle = "#ff7a2f"; c.lineWidth = 5; c.lineCap = "round";
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * (R - 8), cy + Math.sin(ang) * (R - 8)); c.stroke();
    c.restore();
    X.mono(c, `BEARING  ${String(Math.round(41 * Math.min(1, k))).padStart(3, "0")}°`, cx, cy + R + 56, 18, "#ffd2a8", "center", 6, a);
    X.mono(c, "REPLY #1 · UPRIVER", cx, cy + R + 82, 13, "#8fe8d0", "center", 4, a * 0.9);
  }
});

/* ======================================================= 3 · TITLE */
const sTitle = titleScene({ id: "title", start: T.title, dur: 8, plate: "flooded_dawn", from: { z: 1.8, fx: 0.45, fy: 0.7 }, to: { z: 1.05, fx: 0.5, fy: 0.5 }, kicker: "LOST ON EARTH  ·  EPISODE 03", title: "THE LONG DRUM", jp: "長い太鼓" });

/* ======================================================= 4 · SOUND MAP */
const c4: Cap[] = [
  [1.0, 5.0, "Sound is slow. That's the whole secret."],
  [5.4, 9.8, "Through air it crawls at 343 metres a second. Through a root, four times faster."],
  [10.2, 14.0, "So one knock reaches you twice. And the gap between the two is distance."],
  [14.4, 18.4, "I replayed last night's answer. Ground first. And then — much later — the air."],
  [18.8, 22.8, "Thirteen point four seconds. Six kilometres."],
  [23.4, 27.4, "Bearing zero-four-one. Upriver. Past the ridge. Past the water."],
  [27.8, 31.8, "Six kilometres of flooded forest. One kid. One dead headlamp."],
  [32.2, 35.6, "I've had worse odds. I think."],
];
const ink = "#1c2b36";
function soundMap(c: C2, u: number) {
  // notebook page
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#efe6cf"); g.addColorStop(1, "#dccfae");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(60,110,140,0.16)"; c.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.strokeStyle = "rgba(200,60,50,0.35)"; c.beginPath(); c.moveTo(96, 0); c.lineTo(96, H); c.stroke();
  X.typeText(c, "FIELD NOTES — DAY 03", 130, 96, 0.4, u, { font: `60px ${F.title}`, color: ink, per: 0.05, sp: 5 });
  // ---- air vs root race
  const ra = E.outCubic(prog(u, 5, 6)) * (1 - prog(u, 13, 14));
  if (ra > 0.01) {
    c.save(); c.globalAlpha = ra;
    const x0 = 140, x1 = 900;
    for (const [y, lbl, sp, col] of [[260, "AIR  ·  343 m/s", 1, "#2f6f8f"], [350, "ROOT  ·  1,500 m/s", 4.37, "#d9531e"]] as const) {
      c.strokeStyle = ink; c.lineWidth = 3; c.setLineDash([10, 8]);
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]);
      X.mono(c, lbl, x0, y - 22, 18, ink, "left", 4);
      const ph = mod((u - 5.4) / 7 * sp * 0.55, 1.15);
      c.fillStyle = col;
      c.beginPath(); c.arc(x0 + Math.min(1, ph) * (x1 - x0), y, 14, 0, Math.PI * 2); c.fill();
      if (ph >= 1 && ph < 1.1) { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x1, y, 14 + (ph - 1) * 400, 0, Math.PI * 2); c.stroke(); }
    }
    X.mono(c, "KNOCK", x0 - 8, 410, 14, "#6a5a40", "left", 4);
    X.mono(c, "EAR", x1 - 6, 410, 14, "#6a5a40", "left", 4);
    c.restore();
  }
  // ---- replay spectrogram
  const sa = E.outCubic(prog(u, 12.5, 13.5));
  if (sa > 0.01) {
    const ts = Math.min(17.6, Math.max(0, (u - 14.0) * 4));
    spectro(c, 130, 250, 780, 200, ts, { win: 22, alpha: sa, label: "REPLAY ×4 · NIGHT 2 · 03:12", events: [[2, 1, 0.25], [15.4, 0.8, 0.25]], rgb: [255, 120, 50] });
    const ba = E.outCubic(prog(u, 18.2, 19.2));
    if (ba > 0) {
      c.save(); c.globalAlpha = ba; c.strokeStyle = "#d9531e"; c.lineWidth = 4;
      const xA = 130 + 780 * 0.72 - ((ts - 2) / 22) * 780, xB = 130 + 780 * 0.72 - ((ts - 15.4) / 22) * 780;
      c.beginPath(); c.moveTo(xA, 235); c.lineTo(xA, 222); c.lineTo(xB, 222); c.lineTo(xB, 235); c.stroke();
      c.restore();
      X.mono(c, "Δt = 13.4 s", (xA + xB) / 2, 210, 22, "#b4431a", "center", 4, ba);
    }
    X.typeText(c, "d = Δt ÷ (1/343 − 1/1500)", 130, 560, 19.2, u, { font: `500 30px ${F.mono}`, color: ink, per: 0.045 });
    X.typeText(c, "  = 6.0 km", 130, 610, 21.2, u, { font: `500 52px ${F.mono}`, color: "#c4481a", per: 0.07 });
  }
  // ---- map
  const ma = E.outCubic(prog(u, 20, 21.5));
  if (ma > 0.01) {
    c.save(); c.globalAlpha = ma;
    c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(1010, 60, 820, 700);
    X.mono(c, "N ↑", 1790, 100, 18, ink, "right", 4);
    // flooded river
    c.fillStyle = "rgba(60,130,170,0.22)";
    c.beginPath(); c.moveTo(1010, 700);
    for (let i = 0; i <= 20; i++) c.lineTo(1010 + i * 41, 640 - i * 17 + Math.sin(i * 0.9) * 34);
    for (let i = 20; i >= 0; i--) c.lineTo(1010 + i * 41, 760 - i * 17 + Math.sin(i * 0.9) * 34 + 40);
    c.closePath(); c.fill();
    c.strokeStyle = "#2f6f8f"; c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i <= 20; i++) { const x = 1010 + i * 41, y = 700 - i * 17 + Math.sin(i * 0.9) * 34; if (!i) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    // ridge hatching
    c.strokeStyle = "#6a5a40"; c.lineWidth = 2;
    for (let i = 0; i < 22; i++) { c.beginPath(); c.moveTo(1340 + i * 11, 360 + Math.sin(i) * 12); c.lineTo(1352 + i * 11, 330 + Math.sin(i) * 12); c.stroke(); }
    X.mono(c, "RIDGE", 1420, 318, 14, "#6a5a40", "left", 4);
    // camp + bearing line
    const cx = 1180, cy = 640;
    c.fillStyle = ink; c.beginPath(); c.arc(cx, cy, 9, 0, Math.PI * 2); c.fill();
    X.mono(c, "CAMP", cx + 16, cy + 26, 16, ink, "left", 3);
    const bk = E.outCubic(prog(u, 23.4, 26));
    const dx = Math.sin((41 * Math.PI) / 180), dy = -Math.cos((41 * Math.PI) / 180);
    const L = 640 * bk;
    c.strokeStyle = "#d9531e"; c.lineWidth = 4; c.setLineDash([14, 9]);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * L, cy + dy * L); c.stroke(); c.setLineDash([]);
    c.strokeStyle = "rgba(217,83,30,0.5)"; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, 640, -Math.PI / 2 + 0.45, -Math.PI / 2 + 0.95); c.stroke();
    const sk = E.outBack(prog(u, 26.5, 28));
    if (sk > 0) {
      const tx = cx + dx * 640, ty = cy + dy * 640;
      c.save(); c.translate(tx, ty); c.scale(sk, sk);
      glow(c, 0, 0, 90 + 20 * Math.sin(u * 4), "255,140,60", 0.5);
      c.fillStyle = "#d9531e"; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 24, an = (i / 10) * Math.PI * 2 - Math.PI / 2; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      c.closePath(); c.fill();
      c.restore();
      X.mono(c, "?  ILA  ·  6.0 KM", tx - 20, ty - 38, 16, "#b4431a", "right", 4, sk);
    }
    c.restore();
  }
}
const sMap = shotScene({ id: "map", label: "Sound Map", start: T.map, dur: 36, xf: 0.8, fout: 0.6, bloom: 0.2, caps: c4 }, [
  { at: 0, dur: 36, plate: "canopy", from: { z: 1.1, fx: 0.5, fy: 0.5 }, fx: [FX.vig(0.5)] },
], (c, t) => {
  const a = E.outCubic(prog(t, 0.2, 1.2));
  c.save(); c.globalAlpha = a; soundMap(c, t); c.restore();
});

/* ======================================================= 5 · FLOODED FOREST */
const c5: Cap[] = [
  [0.6, 4.6, "The flood had turned the forest into a lake with ambitions."],
  [5.0, 9.0, "Wayra walked into it like a road. For her, it always had been."],
  [9.6, 13.6, "She taught me to read water. A ripple with a V points at whatever's moving."],
  [14.0, 17.6, "Bubbles mean mud. Silence means deep. Leaves going the wrong way mean: don't."],
  [18.2, 22.6, "She was nine. Nine years old, and she navigated like a field team."],
  [23.0, 26.4, "I recorded her humming as she waded. I will never delete it."],
  [27.4, 31.2, "That was when I felt it. The animal feeling. The back of the neck."],
  [31.6, 35.2, "Somebody else was reading the water. Somebody with patience."],
];
const waterSway = { u0: 0, v0: 0.62, u1: 1, v1: 0.99, amp: 4, freq: 1.2, anchor: "none" as const };
const s5: Shot[] = [
  { at: 0, dur: 9.5, plate: "flooded_dawn", from: { z: 1.0, fx: 0.4, fy: 0.55 }, to: { z: 1.45, fx: 0.38, fy: 0.56 }, sway: [waterSway],
    fx: [FX.shafts(0.45, 0.1, { n: 8, alpha: 0.16 }), FX.ripples(0.38, 0.64, { r: 160, n: 3 }), FX.fog(0.5, 0.1, 0.16), FX.glints(0.1, 0.9, 0.7, 0.95, 30, 10), FX.motes(24, { size: 5 }), FX.vig(0.35)] },
  { at: 9.5, dur: 9, plate: "flooded_dawn", from: { z: 2.5, fx: 0.38, fy: 0.6 }, to: { z: 2.9, fx: 0.4, fy: 0.62 }, in: "dissolve", hh: 3, sway: [waterSway],
    fx: [FX.ripples(0.38, 0.66, { r: 120, n: 3, period: 2.4 }), FX.ripples(0.4, 0.68, { r: 100, n: 2 }), FX.glints(0.2, 0.7, 0.7, 0.95, 24, 9), FX.birds(4, { y0: 0.05, y1: 0.2 }), FX.vig(0.4)] },
  { at: 18.5, dur: 9, plate: "wayra_portrait", from: { z: 1.3, fx: 0.62, fy: 0.42 }, to: { z: 1.5, fx: 0.66, fy: 0.38 }, in: "dissolve", rack: [0.6, 1.0],
    sway: [{ u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 6, anchor: "none" }, { u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(36, { size: 7 }), ...GR.cold, FX.vig(0.4)] },
  { at: 27.5, dur: 8.5, plate: "flooded_dawn", from: { z: 1.9, fx: 0.12, fy: 0.52 }, to: { z: 1.35, fx: 0.25, fy: 0.54 }, in: "dissolve", inDur: 1.0, sway: [waterSway],
    fx: [FX.ripples(0.38, 0.64, { r: 160 }), FX.fog(0.55, 0.12, 0.2), eyesFx(0.1, 0.5, 40, [4.5]), ...GR.cold, FX.vig(0.55)] },
];
const sFlood = shotScene({ id: "flood", label: "Flooded Forest", start: T.flood, dur: 36, xf: 0.8, fout: 0.5, bloom: 0.34, caps: c5 }, s5);

/* ======================================================= 6 · JAGUAR */
const c6: Cap[] = [
  [0.6, 4.4, "The jaguar from the sandbar. I'd know those eyes anywhere."],
  [4.8, 8.2, "Or she knew mine. I think she'd been with us all morning."],
  [8.8, 12.4, "Wayra's hand closed on my wrist. Pressure. Not yet. Not yet."],
  [12.8, 16.0, "Rule one of fieldwork: when everything goes wrong… stop. And listen."],
  [16.4, 20.0, "Thirty seconds. Forty. Her tail moved once."],
  [20.4, 24.0, "Wayra began to hum. Very low. The three notes the forest hums."],
  [24.6, 27.8, "Then the jaguar turned her head. Not to us. To the bank behind us."],
  [28.4, 31.0, "The ground let go. Exactly where we'd been about to step."],
  [31.4, 33.8, "She hadn't been following us. She'd been walking us."],
];
const s6: Shot[] = [
  { at: 0, dur: 8.5, plate: "jaguar_water", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.9, fx: 0.4, fy: 0.34 }, ease: E.inOutCubic,
    sway: [{ u0: 0, v0: 0.62, u1: 1, v1: 1, amp: 3.5, freq: 1.1, anchor: "none" }],
    fx: [FX.shafts(0.82, 0.12, { n: 9, alpha: 0.18 }), FX.fog(0.62, 0.1, 0.16), FX.glints(0.5, 0.95, 0.65, 0.95, 26, 10), FX.motes(26, { size: 5 }), FX.heart(76, 0.25), FX.vig(0.4)] },
  { at: 8.5, dur: 7.5, plate: "wayra_portrait", from: { z: 1.15, fx: 0.62, fy: 0.42 }, to: { z: 1.4, fx: 0.64, fy: 0.4 }, in: "dissolve", rack: [0.5, 1],
    sway: [{ u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 2, anchor: "top" }],
    fx: [FX.motes(30, { size: 6 }), ...GR.cold, FX.heart(76, 0.3), FX.vig(0.5)] },
  { at: 16, dur: 8.4, plate: "jaguar", from: { z: 1.5, fx: 0.69, fy: 0.5 }, to: { z: 2.9, fx: 0.69, fy: 0.49 }, in: "dissolve", inDur: 1.0, ease: E.inCubic,
    fx: [FX.motes(30, { size: 5 }), FX.heart(80, 0.4), FX.vig(0.55)] },
  { at: 24.4, dur: 4, plate: "jaguar_water", from: { z: 1.7, fx: 0.4, fy: 0.34 }, to: { z: 1.2, fx: 0.5, fy: 0.45 }, in: "dissolve",
    sway: [{ u0: 0, v0: 0.62, u1: 1, v1: 1, amp: 3.5, anchor: "none" }],
    fx: [FX.fog(0.62, 0.1, 0.16), FX.vig(0.4)] },
  { at: 28.4, dur: 5.6, plate: "flooded_dawn", from: { z: 1.2, fx: 0.4, fy: 0.55 }, to: { z: 1.6, fx: 0.38, fy: 0.58 }, in: "flash", hh: 12, punch: [0.2, 0.5],
    sway: [{ u0: 0, v0: 0.62, u1: 1, v1: 0.99, amp: 7, freq: 2.2, anchor: "none" }],
    fx: [FX.ripples(0.6, 0.72, { r: 400, n: 4, period: 1.2 }), FX.wash("rgba(200,170,120,0.2)", "multiply"), FX.vig(0.5)] },
];
const sJag = shotScene({ id: "jaguar", label: "The Jaguar", start: T.jag, dur: 34, xf: 0.8, fout: 0.5, bloom: 0.32, caps: c6, ca: (t) => (t > 28.3 && t < 29.4 ? 9 : 0) }, s6, (c, t, g, A) => {
  if (t >= 12.8 && t < 16) eyeInsert(c, t - 12.8, A, { dur: 3.2, reflect: "jaguar_water", pupil: [0.3, 0.5], tremor: 0.3, look: [0.3, 0] });
  if (t >= 28.3 && t < 30.2) {
    negative(c, 0.9 * Math.exp(-(t - 28.3) * 7));
    X.speedLines(c, t - 28.3, W * 0.6, H * 0.6, { color: "rgba(0,0,0,0.5)", inner: 300, seed: 7 });
  }
  void g;
});

/* ======================================================= 7 · NIGHT BRIDGE */
const TAPS: [number, number, number][] = [[10.0, 0.43, 1], [12.0, 0.49, 1], [14.0, 0.55, 1], [17.4, 0.58, 1], [19.0, 0.6, 1], [20.4, 0.63, 0], [25.0, 0.7, 1], [27.4, 0.76, 1], [29.6, 0.82, 1]];
const BOLTS = [31.6, 34.0, 36.6, 38.4];
const c7: Cap[] = [
  [0.6, 4.4, "Night. A fallen kapok across a ravine. The only way over."],
  [4.8, 8.6, "Wet bark. Forty metres. A river screaming underneath."],
  [9.0, 13.0, "Wayra knelt. Knocked. Listened. Moved a hand's width. Knocked."],
  [13.4, 17.2, "She was reading the tree. A solid trunk sings. A rotten one swallows the sound."],
  [17.6, 21.8, "Tok. Tok. Dok. She stopped. Pointed left. Mouthed: no."],
  [22.2, 26.0, "Termites. A hollow the length of a bus, under perfect-looking bark."],
  [26.4, 30.6, "So we crossed the way she knocked: step, listen, step."],
  [31.0, 35.4, "Halfway over, the sky cracked open."],
  [36.0, 39.6, "And the whole trunk began to hum."],
];
const tapMarks: Fx = (c, t, co) => {
  for (const [t0, u, ok] of TAPS) {
    const q = t - t0;
    if (q < 0) continue;
    const [x, y] = co.map(u, 0.4 + (u - 0.43) * 0.18);
    const fade = ok ? 1 - prog(q, 2.5, 3.5) : 1 - prog(q, 6, 8);
    if (fade <= 0) continue;
    const col = ok ? "120,255,190" : "255,90,70";
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let j = 0; j < 2; j++) {
      const p = Math.min(1, q / 1.1) - j * 0.2;
      if (p > 0) { c.strokeStyle = `rgba(${col},${(1 - p) * 0.8 * fade})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 20 + p * 90 * co.s, 8 + p * 34 * co.s, 0, 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = fade * (ok ? 0.5 : 0.8);
    glow(c, x, y, 36 * co.s, col, 0.9);
    c.restore();
    if (!ok) { X.mono(c, "HOLLOW", x, y - 66 * co.s, 20, "#ff8a7a", "center", 6, fade); X.mono(c, "✕", x, y + 8, 30, "#ff6a5a", "center", 0, fade); }
    else if (q < 1.6) X.mono(c, "SOLID", x, y - 66 * co.s, 16, "#9fffd0", "center", 6, fade);
  }
};
const s7: Shot[] = [
  { at: 0, dur: 9, plate: "night_bridge", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.5, fx: 0.4, fy: 0.42 },
    sway: [{ u0: 0, v0: 0.78, u1: 1, v1: 1, amp: 3, anchor: "none", freq: 1.6 }],
    fx: [FX.lamp(0.385, 0.38, 150, "255,190,100", 0.4, 0.5), FX.flies(18, { size: 11 }), FX.fog(0.82, 0.12, 0.2, "150,200,210", 20), FX.lightning([5.5], { u: 0.78, v: 0.08 }), FX.vig(0.45)] },
  { at: 9, dur: 31, plate: "night_bridge", from: { z: 2.0, fx: 0.4, fy: 0.42 }, to: { z: 2.0, fx: 0.76, fy: 0.42 }, in: "dissolve", ease: E.inOutQuart ?? E.inOutCubic, hh: 2,
    sway: [{ u0: 0, v0: 0.78, u1: 1, v1: 1, amp: 3, anchor: "none", freq: 1.6 }],
    fx: [FX.lamp(0.39, 0.38, 130, "255,190,100", 0.34, 0.5), FX.flies(16, { size: 12 }), FX.fog(0.85, 0.1, 0.22, "150,200,210", 20),
      (c, t, co, A, k) => tapMarks(c, t + 9, co, A, k),
      FX.lightning(BOLTS.map((b) => b - 9), { u: 0.78, v: 0.08 }), FX.heart(76, 0.2), FX.vig(0.5)] },
];
const sBridge = shotScene({ id: "bridge", label: "The Bridge", start: T.bridge, dur: 40, xf: 0.8, fout: 0.5, bloom: 0.36, caps: c7 }, s7, (c, t) => {
  if (t > 9.5 && t < 31) {
    let last: [number, number, number] | null = null;
    for (const tp of TAPS) if (t >= tp[0]) last = tp;
    const a = E.outCubic(prog(t, 9.5, 10.5)) * (1 - prog(t, 30, 31));
    const x = W - 520, y = 90;
    c.save(); c.globalAlpha = a;
    c.fillStyle = "rgba(4,14,14,0.78)"; c.fillRect(x - 16, y - 34, 470, 130);
    c.strokeStyle = "rgba(160,255,225,0.3)"; c.strokeRect(x - 16, y - 34, 470, 130);
    c.restore();
    X.mono(c, "TAP TEST · CONTACT MIC", x, y - 8, 14, "#8fe8d0", "left", 4, a);
    if (last) {
      const q = t - last[0];
      const ok = last[2] === 1;
      X.mono(c, ok ? "SOLID" : "HOLLOW", x, y + 38, 36, ok ? "#9fffd0" : "#ff7a6a", "left", 6, a);
      X.mono(c, ok ? "RING 312 Hz · DECAY 0.4 s" : "THUD 96 Hz · DECAY 0.05 s", x, y + 70, 14, "#cfeee3", "left", 3, a);
      c.save(); c.globalAlpha = a;
      for (let i = 0; i < 26; i++) {
        const env = Math.exp(-q * (ok ? 2.2 : 9)) * (0.4 + 0.6 * hash(i * 3.1 + Math.floor(q * 20)));
        c.fillStyle = ok ? "#6fffc0" : "#ff6a5a";
        c.fillRect(x + 230 + i * 9, y + 48 - env * 52, 6, env * 52 + 2);
      }
      c.restore();
    }
  }
});

/* ======================================================= 8 · SHELTER & CRAYON */
const poly = (pts: number[][]): [number, number][] => pts.map(([x, y]) => [x, y]);
const circ = (cx: number, cy: number, r: number, n = 22, a0 = 0, a1 = Math.PI * 2): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + ((a1 - a0) * i) / n) * r, cy + Math.sin(a0 + ((a1 - a0) * i) / n) * r]);
const wave = (x0: number, x1: number, y: number, amp: number, n = 18): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [lerp(x0, x1, i / n), y + Math.sin(i * 1.3) * amp]);
const figure = (x: number, y: number, s: number, at: number, coat: string, hair: string, braids: boolean, armUp: boolean): Stroke[] => [
  { pts: circ(x, y - 130 * s, 26 * s), col: "#2b1a12", w: 7, at, dur: 0.5 },
  { pts: poly([[x - 26 * s, y - 140 * s], [x - 30 * s, y - 150 * s], [x, y - 164 * s], [x + 30 * s, y - 150 * s], [x + 26 * s, y - 140 * s]]), col: hair, w: 12, at: at + 0.4, dur: 0.4 },
  ...(braids ? [{ pts: poly([[x - 28 * s, y - 130 * s], [x - 34 * s, y - 90 * s], [x - 30 * s, y - 55 * s]]), col: "#9a9a9a", w: 8, at: at + 0.7, dur: 0.4 }, { pts: poly([[x + 28 * s, y - 130 * s], [x + 34 * s, y - 90 * s], [x + 30 * s, y - 55 * s]]), col: "#9a9a9a", w: 8, at: at + 0.9, dur: 0.4 }] : []),
  { pts: poly([[x - 28 * s, y - 100 * s], [x - 40 * s, y], [x + 40 * s, y], [x + 28 * s, y - 100 * s], [x - 28 * s, y - 100 * s]]), col: coat, w: 12, at: at + 0.5, dur: 0.8 },
  { pts: armUp ? poly([[x + 24 * s, y - 90 * s], [x + 60 * s, y - 130 * s], [x + 70 * s, y - 170 * s]]) : poly([[x + 28 * s, y - 85 * s], [x + 50 * s, y - 50 * s]]), col: "#2b1a12", w: 7, at: at + 1.1, dur: 0.4 },
  { pts: poly([[x - 18 * s, y], [x - 20 * s, y + 40 * s]]), col: "#2b1a12", w: 8, at: at + 1.3, dur: 0.2 },
  { pts: poly([[x + 18 * s, y], [x + 20 * s, y + 40 * s]]), col: "#2b1a12", w: 8, at: at + 1.4, dur: 0.2 },
];
const DRAW: Stroke[] = [
  { pts: [...circ(1640, 130, 56)], col: "#f2b705", w: 10, at: 10.6, dur: 1.0 },
  ...Array.from({ length: 10 }, (_, i): Stroke => { const a = (i / 10) * Math.PI * 2; return { pts: poly([[1640 + Math.cos(a) * 72, 130 + Math.sin(a) * 72], [1640 + Math.cos(a) * 100, 130 + Math.sin(a) * 100]]), col: "#f2b705", w: 7, at: 11.4 + i * 0.05, dur: 0.15 }; }),
  { pts: wave(60, 1860, 600, 12), col: "#2f78c4", w: 10, at: 11.8, dur: 2.2 },
  { pts: wave(60, 1860, 650, 12), col: "#2f78c4", w: 8, at: 12.8, dur: 2.0 },
  { pts: wave(60, 1860, 700, 12), col: "#2f78c4", w: 7, at: 13.6, dur: 1.8 },
  { pts: poly([[340, 600], [352, 440], [362, 330], [366, 250]]), col: "#6b3f1d", w: 16, at: 13.8, dur: 1.4 },
  { pts: poly([[470, 600], [452, 440], [440, 330], [436, 250]]), col: "#6b3f1d", w: 16, at: 14.2, dur: 1.4 },
  { pts: [...circ(400, 170, 100, 30, 0, 6.3), ...circ(320, 215, 62, 20, 0, 6.3), ...circ(485, 215, 62, 20, 0, 6.3)], col: "#2f8f3f", w: 11, at: 14.6, dur: 1.6 },
  { pts: poly([[300, 600], [250, 640]]), col: "#6b3f1d", w: 12, at: 15.2, dur: 0.3 },
  { pts: poly([[520, 600], [580, 640]]), col: "#6b3f1d", w: 12, at: 15.4, dur: 0.3 },
  ...figure(700, 590, 1.0, 15.8, "#b04a8e", "#555", true, true),
  ...[0, 1, 2].map((i): Stroke => ({ pts: circ(800 + i * 30, 380, 24 + i * 12, 10, -0.8, 0.8), col: "#d9531e", w: 8, at: 17.8 + i * 0.4, dur: 0.4 })),
  ...figure(900, 590, 0.62, 19.2, "#e8d9a0", "#2b1a12", true, false),
  { pts: poly([[1060, 590], [1140, 640], [1360, 640], [1440, 590], [1060, 590]]), col: "#3f6f9f", w: 12, at: 21.6, dur: 1.6 },
  { pts: poly([[1100, 560], [1400, 560]]), col: "#3f6f9f", w: 9, at: 22.8, dur: 0.6 },
  { pts: poly([[740, 640], [880, 700], [1020, 640], [1100, 700], [1300, 690], [1500, 600], [1560, 520]]), col: "#d9531e", w: 7, at: 24.0, dur: 3.4 },
  { pts: poly([[1500, 470], [1560, 520], [1520, 580]]), col: "#d9531e", w: 7, at: 27.4, dur: 0.4 },
  ...figure(1560, 590, 1.0, 28.6, "#f2c230", "#111", false, false),
  { pts: poly([[1500, 458], [1540, 430], [1580, 458]]), col: "#3a3a3a", w: 7, at: 30.2, dur: 0.6 },
  { pts: poly([[1520, 520], [1500, 580], [1480, 570]]), col: "#1f8f8f", w: 14, at: 30.8, dur: 0.6 },
  { pts: poly([[930, 500], [1150, 380], [1380, 400], [1520, 470]]), col: "#e0457b", w: 8, at: 32.4, dur: 1.8 },
  { pts: circ(1180, 380, 22, 12), col: "#e0457b", w: 6, at: 34.2, dur: 0.5 },
];
const c8: Cap[] = [
  [0.6, 4.2, "The storm caught us on the far side. We ran."],
  [4.6, 9.4, "We found shelter in the roots of something older than the country."],
  [10.6, 14.6, "Wayra couldn't tell me with words. So she drew."],
  [15.0, 19.2, "A river. A tree. A woman with long braids, one hand raised to knock."],
  [19.6, 23.4, "Then a girl. Then a boat — upside down."],
  [23.8, 28.0, "The flood took their boat. Mama Ila went downriver to find it. She never came back."],
  [28.6, 32.2, "And then, at the edge of the paper: a woman in a yellow raincoat."],
  [32.6, 35.8, "She drew me into her family. Just like that."],
];
const sShelter = shotScene({ id: "shelter", label: "Shelter", start: T.shelter, dur: 36, xf: 0.8, fout: 0.6, bloom: 0.3, caps: c8, ca: (t) => (BOLTS_S.some((b) => t > b && t < b + 0.3) ? 6 : 0) }, [
  { at: 0, dur: 10.5, plate: "storm", from: { z: 1.0, fx: 0.45, fy: 0.55 }, to: { z: 1.25, fx: 0.58, fy: 0.55 }, hh: 9,
    fx: [FX.rain(280, { len: 110, alpha: 0.4, slant: 0.3 }), FX.rain(120, { len: 60, alpha: 0.2, seed: 9, speed: 2000 }), FX.lightning([1.2, 2.4, 2.7, 5.9], { u: 0.76, v: 0.15 }), FX.leaves(14, "20,60,30", 1100), FX.vig(0.5)] },
  { at: 10.5, dur: 25.5, plate: "camp_two", from: { z: 1.0, fx: 0.5, fy: 0.5 }, in: "dissolve", fx: [FX.vig(0.5)] },
], (c, t) => {
  if (t >= 10.2) {
    const u = t - 10.6;
    const a = E.outCubic(prog(t, 10.2, 11.4));
    c.save();
    c.globalAlpha = a;
    crayonPaper(c, u);
    drawStrokes(c, DRAW, t);
    // warm firelight pulsing over the paper
    c.globalCompositeOperation = "soft-light";
    glow(c, 160, 760, 900, "255,150,70", 0.5 + 0.12 * Math.sin(t * 7) + 0.08 * Math.sin(t * 17));
    c.globalCompositeOperation = "multiply";
    X.vignette(c, 0.55, "60,30,10");
    c.restore();
    if (t > 34.5) X.mono(c, "— WAYRA, AGE 9", W - 100, 90, 16, "#6a4a2a", "right", 8, E.outCubic(prog(t, 34.6, 35.4)));
  }
});
const BOLTS_S = [1.2, 2.4, 2.7, 5.9];

/* ======================================================= 9 · THE RISING */
const REPLIES: [number, number, number][] = [[22.8, 0.12, 0.62], [24.0, 0.88, 0.55], [25.0, 0.5, 0.35], [26.8, 0.3, 0.45], [27.6, 0.72, 0.7], [28.4, 0.18, 0.4], [29.0, 0.6, 0.6], [29.7, 0.92, 0.45], [30.3, 0.4, 0.55], [31.0, 0.8, 0.38]];
const c9: Cap[] = [
  [0.6, 4.4, "The rain didn't stop. By three a.m. the river had climbed into the roots."],
  [4.8, 8.8, "Every animal I'd ever recorded was going up. Spiders. Snakes. A sloth, politely."],
  [9.4, 13.4, "Wayra pulled me up the buttress by my backpack."],
  [13.8, 17.6, "Water at our ankles. Then our knees. The drum tree was the last high ground."],
  [18.0, 22.0, "She took the stick. And knocked. Three times. Into the dark."],
  [22.8, 26.4, "And from the left — an answer. Then the right. Then dead ahead."],
  [26.8, 30.6, "Not one voice. A chain. Tree to tree. Someone was relaying her call."],
  [31.0, 35.4, "We weren't being answered by a person. We were being answered by a people."],
];
const sRising = shotScene({ id: "rising", label: "The Rising", start: T.rising, dur: 36, xf: 0.8, fout: 0.8, bloom: 0.34, caps: c9, ca: (t) => (t > 21.6 && t < 22.1 ? 8 : 0) }, [
  { at: 0, dur: 9, plate: "storm", from: { z: 1.2, fx: 0.4, fy: 0.62 }, to: { z: 1.0, fx: 0.5, fy: 0.55 }, hh: 5,
    fx: [FX.rain(240, { len: 100, alpha: 0.35 }), FX.lightning([2.2, 6.1], { u: 0.76, v: 0.15 }), ...GR.night, FX.vig(0.55)] },
  { at: 9, dur: 12.5, plate: "drum_roots", from: { z: 1.2, fx: 0.55, fy: 0.7 }, to: { z: 1.7, fx: 0.55, fy: 0.62 }, in: "whip", hh: 6,
    fx: [FX.rain(200, { len: 90, alpha: 0.3 }), FX.lightning([4.0, 9.5], { u: 0.1, v: 0.05 }), FX.pulse(0.5, 0.7, [9.4, 10.1, 10.8], { r: 1000, a: 0.8 }), ...GR.deepNight, FX.vig(0.6)] },
  { at: 21.5, dur: 14.5, plate: "canopy", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.25, fx: 0.5, fy: 0.55 }, in: "flash", inDur: 0.3,
    fx: [FX.rain(120, { len: 70, alpha: 0.18 }), FX.pulse(0.5, 0.75, [0.3, 1.0, 1.7], { r: 1400, life: 3, a: 0.9 }),
      ...REPLIES.map(([t0, u, v]) => FX.pulse(u, v, [t0 - 21.5], { r: 900, life: 3.2, rgb: "140,255,220", squash: 0.45 })),
      ...GR.deepNight, FX.vig(0.55)] },
], (c, t) => {
  if (t < 21.5) {
    const lvl = t < 3 ? 0.05 : lerp(0.05, 0.62, E.inOutSine(prog(t, 3, 19)));
    waterRise(c, t, lvl);
    X.black(c, 0.15);
  }
  if (t >= 22.4 && t < 35.5) {
    const a = E.outCubic(prog(t, 22.6, 23.6)) * (1 - prog(t, 34.6, 35.5));
    const n = REPLIES.filter((r) => t >= r[0]).length;
    spectro(c, 90, 540, 760, 150, t, { win: 14, alpha: a, label: `LISTENING · ${String(n).padStart(2, "0")} SOURCES`, events: [[18.4, 1, 0.2], [19.1, 1, 0.2], [19.8, 1, 0.2], ...REPLIES.map(([a2, , v]) => [a2, 0.7, 0.15 + v * 0.6] as [number, number, number])] });
  }
  if (t >= 14 && t < 21) {
    const lvl = lerp(0.35, 0.62, prog(t, 14, 19));
    X.mono(c, `WATER  +${(lvl * 8).toFixed(1)} m`, W - 100, 100, 22, "#ffb27a", "right", 6, E.outCubic(prog(t, 14, 15)) * (1 - prog(t, 20, 21)));
  }
});

/* ======================================================= 10 · NEXT */
const sNext = nextScene({ id: "next", start: T.next, dur: 14, plate: "mother_tree", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.3, fx: 0.5, fy: 0.3 }, num: "EPISODE 04  ·  FINALE", title: "THE MOTHER TREE", jp: "母なる樹", lines: ["Every drum in the forest is pointing the same way.", "Climb."] });

/* ======================================================= SCORE */
const Gm: Chord = { b: 43, n: [58, 62, 67, 70] };
const Eb: Chord = { b: 39, n: [58, 63, 67, 70] };
const Bb: Chord = { b: 34, n: [58, 62, 65, 70] };
const Fc: Chord = { b: 41, n: [57, 60, 65, 69] };
const PROG = [Gm, Eb, Bb, Fc];

function compose(k: Kit) {
  const { BEAT } = k;
  const S = T;
  k.dayBed([[0, 0], [24, 0], [28, 0.4], [66, 0.3], [70, 0.1], [104, 0.15], [108, 0.6], [138, 0.6], [142, 0.2], [170, 0], [286, 0.1], [300, 0.1]]);
  k.nightBed([[0, 0], [170, 0], [176, 0.5], [210, 0.35], [214, 0.1], [248, 0], [286, 0]]);
  k.riverBed([[0, 0], [100, 0], [108, 0.04], [138, 0.04], [174, 0.45], [212, 0.5], [216, 0.1], [250, 0.3], [262, 0.7], [284, 0.8], [300, 0]]);
  k.rainBed([[0, 0], [200, 0], [208, 0.2], [214, 0.8], [222, 0.9], [240, 0.7], [250, 0.7], [270, 0.5], [286, 0.2], [292, 0]]);
  k.windBed([[0, 0.3], [140, 0.4], [300, 0.2]]);
  k.fireBed(S.shelter + 10, S.shelter + 36, 0.35);
  // LOG
  k.pad(1, 11, [43, 50, 55], 0.2, { cut: 320, att: 3 });
  for (let t = 2.2; t < 11.8; t += BEAT * 1.15) k.thump(t, 0.45);
  // RECAP
  k.rev(S.recap, 1.2, 0.18);
  k.arp(S.recap + 1, S.recap + 14, PROG, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.055);
  k.padBars(S.recap, S.recap + 14, PROG, 0.06, { cut: 700 });
  k.tokFar(S.recap + 9.4, 0.4); k.tokFar(S.recap + 10.1, 0.4);
  // DAWN
  const T2 = S.dawn;
  k.padBars(T2, T2 + 34, PROG, 0.1, { att: 2.5 });
  k.fluteLine([[T2 + 3, 79, 2.4], [T2 + 5.8, 82, 1.6], [T2 + 7.6, 84, 2], [T2 + 10.4, 82, 1.4], [T2 + 12, 79, 3.6]], 0.14);
  k.arp(T2 + 10, T2 + 34, PROG, BEAT, [0, 2, 1, 3], 0.05);
  k.bassBars(T2 + 10, T2 + 34, PROG, 0.1);
  for (let t = T2 + 12; t < T2 + 14.5; t += 0.2) k.tick(t, 0.04);
  k.bell(T2 + 14.5, 91, 4, 0.04);
  k.fluteLine([[T2 + 20.4, 82, 1.6], [T2 + 22.4, 84, 1.6], [T2 + 24.4, 86, 3]], 0.14);
  k.riser(T2 + 28, T2 + 34, 0.14);
  // TITLE
  k.boom(S.title + 0.6, 0.55);
  k.padBars(S.title, S.title + 8, PROG, 0.12, { att: 1.2 });
  k.choir(S.title + 1, 8, [55, 62, 67, 70], 0.08, "o");
  k.fluteLine([[S.title + 2.4, 79, 1.8], [S.title + 4.4, 82, 1.2], [S.title + 5.8, 86, 1.4], [S.title + 7.2, 84, 3]], 0.17);
  k.bell(S.title + 3, 91, 5, 0.04);
  // MAP
  const T4 = S.map;
  k.pad(T4, 36, [43, 50, 58], 0.09, { cut: 380, att: 3 });
  for (let t = T4 + 1; t < T4 + 36; t += 0.5) if (hash(t * 3.3) > 0.55) k.noise(t, 0.12, { type: "highpass", f0: 3600, vel: 0.02, dest: k.buses.ambBus });
  for (let t = T4 + 5.4; t < T4 + 13.5; t += 3.2) { k.tok(t, 0.5, 1.2); k.tokFar(t + 0.9, 0.2); }
  k.tokFar(T4 + 14.5, 0.7, 0.8); k.tokFar(T4 + 17.85, 0.5, 1.1);
  k.arp(T4 + 12, T4 + 36, PROG, BEAT / 2, [0, 2, 1, 3, 2, 1], 0.05);
  k.bassBars(T4 + 12, T4 + 36, PROG, 0.11);
  k.bell(T4 + 21.2, 91, 5, 0.06);
  k.thump(T4 + 27.8, 0.5);
  k.fluteLine([[T4 + 27.8, 79, 1.6], [T4 + 29.6, 82, 2.4], [T4 + 32, 77, 3]], 0.13);
  // FLOOD
  const T5 = S.flood;
  k.pad(T5, 36, [43, 50, 55], 0.1, { cut: 420, att: 3 });
  for (let t = T5 + 9; t < T5 + 27; t += 0.7) if (hash(t * 7.1) > 0.4) k.splash(t, 0.03);
  k.arp(T5 + 4, T5 + 27, [Eb, Bb, Fc, Gm], BEAT, [0, 2, 3, 1], 0.05);
  k.fluteLine([[T5 + 18.5, 79, 2], [T5 + 21, 82, 1.4], [T5 + 22.6, 84, 2.4]], 0.12);
  for (let t = T5 + 27; t < T5 + 36; t += 0.9 - (t - T5 - 27) * 0.04) k.thump(t, 0.28);
  k.tone(T5 + 28, 8, { f0: 55, vel: 0.07, att: 3, dest: k.buses.musicBus });
  // JAGUAR
  const T6 = S.jag;
  k.pad(T6, 34, [43, 50, 55], 0.1, { cut: 400 });
  for (let t = T6 + 0.5; t < T6 + 24; t += 0.85 - Math.min(0.3, (t - T6) * 0.012)) k.thump(t, 0.34 + (t - T6) * 0.008);
  k.noise(T6 + 16, 5, { type: "lowpass", f0: 140, f1: 70, q: 1, vel: 0.22, att: 2 });
  for (const o of [20.6, 21.6, 22.6]) k.tone(T6 + o, 0.5, { f0: o > 21 ? 392 : 349, vel: 0.05, att: 0.08, dest: k.buses.fluteBus });
  k.choir(T6 + 20.4, 6, [43, 50, 55], 0.05, "u");
  k.rev(T6 + 28.35, 1.4, 0.2);
  k.boom(T6 + 28.4, 0.7); k.noise(T6 + 28.4, 3, { type: "lowpass", f0: 400, f1: 80, vel: 0.3, att: 0.1 }); k.splash(T6 + 29, 0.12); k.splash(T6 + 29.6, 0.09);
  k.fluteLine([[T6 + 31.4, 79, 1.4], [T6 + 33, 77, 2.5]], 0.13);
  // BRIDGE
  const T7 = S.bridge;
  k.pad(T7, 40, [43, 50, 58], 0.1, { cut: 360, att: 3 });
  for (const [t0, , ok] of TAPS) { if (ok) k.tok(T7 + t0, 0.8, 1.1); else k.tok(T7 + t0, 0.8, 0.5, k.buses.farBus); }
  k.arp(T7 + 4, T7 + 31, [Gm, Gm, Eb, Fc], BEAT / 2, [0, 2, 1, 3], 0.045);
  for (const b of BOLTS) k.thunder(T7 + b + 0.35, 0.5, 4);
  k.riser(T7 + 29, T7 + 31.5, 0.2);
  for (let t = T7 + 31; t < T7 + 40; t += BEAT / 2) k.taiko(t, 0.35);
  k.tone(T7 + 36, 4, { type: "sawtooth", f0: 58, vel: 0.08, att: 1.5, dest: k.buses.musicBus, lp: 220 });
  // SHELTER
  const T8 = S.shelter;
  for (const b of BOLTS_S) k.thunder(T8 + b + 0.3, 0.5, 4);
  for (let t = T8; t < T8 + 10; t += BEAT / 2) k.taiko(t, 0.3);
  for (let t = T8 + 11; t < T8 + 34; t += 0.13 + hash(t) * 0.2) if (hash(t * 5.5) > 0.35) k.noise(t, 0.09, { type: "bandpass", f0: 2600, q: 2, vel: 0.02, dest: k.buses.ambBus });
  k.pad(T8 + 10, 26, [43, 50, 55, 58], 0.1, { att: 3, cut: 520 });
  k.melody([[T8 + 11, 74, 3], [T8 + 14, 77, 3], [T8 + 17, 79, 3], [T8 + 20, 77, 3], [T8 + 23, 74, 4], [T8 + 27, 79, 3], [T8 + 30, 82, 4]], 0.1, 0.022);
  k.fluteLine([[T8 + 15, 82, 2], [T8 + 18, 79, 2], [T8 + 24, 86, 2], [T8 + 28.6, 84, 2.4], [T8 + 32.6, 79, 3.4]], 0.12);
  // RISING
  const T9 = S.rising;
  k.pad(T9, 36, [43, 50, 55], 0.12, { cut: 330, att: 3 });
  for (const b of [2.2, 6.1, 13.5]) k.thunder(T9 + b + 0.3, 0.5, 4);
  for (let t = T9 + 1; t < T9 + 21; t += 0.75 - Math.min(0.35, (t - T9) * 0.02)) k.thump(t, 0.3 + (t - T9) * 0.01);
  k.noise(T9 + 9, 12, { type: "lowpass", f0: 200, f1: 600, vel: 0.12, att: 6 });
  [9.4, 10.1, 10.8].forEach((o) => k.tok(T9 + o, 0.9));
  [18.4, 19.1, 19.8].forEach((o) => k.tok(T9 + o, 1, 0.9));
  k.rev(T9 + 21.5, 1.6, 0.2);
  REPLIES.forEach(([o, , v], i) => { k.tokFar(T9 + o, 0.5 - i * 0.015, 0.8 + v * 0.5); k.tokFar(T9 + o + 0.65, 0.4, 0.8 + v * 0.5); });
  for (let t = T9 + 31; t < T9 + 35; t += 0.17) k.tokFar(t, 0.22 + hash(t) * 0.2, 0.8 + hash(t * 2) * 0.6);
  k.choir(T9 + 22.4, 14, [43, 50, 55, 62], 0.1, "a");
  k.bell(T9 + 23, 91, 6, 0.05);
  k.fluteLine([[T9 + 26.8, 79, 1.6], [T9 + 28.6, 82, 1.6], [T9 + 30.4, 86, 4.4]], 0.15);
  k.boom(T9 + 33.5, 0.3);
  // NEXT
  const T10 = S.next;
  k.pad(T10, 14, [43, 50, 55, 62], 0.1, { att: 2, cut: 500 });
  k.fluteLine([[T10 + 2, 79, 2], [T10 + 4.4, 82, 1.4], [T10 + 6, 86, 3]], 0.12);
  k.arp(T10 + 7, T10 + 14, PROG, BEAT, [0, 2, 1, 3], 0.04);
  for (let t = T10 + 10, i = 0; i < 6; i++, t += 0.35) k.tokFar(t, 0.3 + i * 0.05, 0.9 + (i % 3) * 0.15);
}

export const ep3: Episode = {
  id: "ep3", num: 3, title: "THE LONG DRUM", jp: "長い太鼓", duration: DUR, accent: "#6fe3c6",
  tagline: "Six kilometres of flooded forest. A bearing, a bridge, a jaguar — and a forest that answers.",
  scenes: [sLog, sRecap, sDawn, sTitle, sMap, sFlood, sJag, sBridge, sShelter, sRising, sNext],
  art: ["clearing", "wayra_portrait", "portrait", "drum_roots", "camp_two", "ridge_dawn", "walk_back", "flooded_dawn", "canopy", "jaguar_water", "jaguar", "night_bridge", "storm", "mother_tree"],
  synopsis: {
    log: "Day three. Fourteen percent. One bearing.",
    recap: "A tree full of floods, a girl called Wayra, and two knocks very far away.",
    dawn: "A compass swings to 041°. The path upriver is underwater.",
    title: "The Long Drum.",
    map: "Field-notebook physics: the same knock arrives twice — through root and air. The gap is the distance: 6.0 km.",
    flood: "Reading water. Something else is reading it too.",
    jaguar: "The jaguar from the sandbar. Stillness. Then the bank collapses where they were about to step.",
    bridge: "Step, tap, listen. A solid trunk sings; a hollow one swallows the sound.",
    shelter: "Wayra's crayon story: the river, the tree, the boat, Mama Ila — and a woman in a yellow raincoat.",
    rising: "The river climbs the roots. Three knocks into the dark — and the whole forest answers.",
    next: "Next: The Mother Tree.",
  },
  brief: [
    ["PREMISE", "Maya turns a faint reply into a bearing and a distance, then crosses a flooded forest — guided by a child who reads trees by ear."],
    ["SCIENCE BEAT", "Distance from the gap between ground-borne (1,500 m/s) and airborne (343 m/s) arrivals: d = Δt ÷ (1/343 − 1/1500) → 13.4 s ≈ 6.0 km."],
    ["HERO MOVES", "Animated field-notebook map; jaguar stare-down with heartbeat vignette; tap-test bridge with solid/hollow readouts; crayon-drawn family story; rising water with a 10-source answering chain."],
    ["LOOK", "Cool morning mists → gold jaguar light → indigo night bridge → storm-lit crayon paper → blue deep-night relay. Accent #ff7a2f."],
  ],
  score: () => renderScore(DUR, 76, 20240703, compose),
};
