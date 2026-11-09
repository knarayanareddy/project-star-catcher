import { W, H, E, lerp, prog, hash } from "../engine/util";
import * as X from "../engine/fx";
import { F, glow, cover, type C2 } from "../engine/fx";
import { shotScene, FX, type Fx } from "../engine/shots";
import { logScene, recapScene, titleScene, negative, crankHud, speech } from "../engine/hud";
import { renderScore, type Kit, type Chord } from "../engine/synth";
import { eyeInsert, SKIN_WAYRA, GR } from "./common";
import type { Scene, Cap } from "../scenes/types";
import type { Episode } from "./types";

const DUR = 300;
const T = { log: 0, recap: 12, relay: 26, title: 62, climb: 70, ila: 110, listen: 156, crown: 190, rescue: 236, epi: 268, end: 292 };

/* ======================================================= 0 · LOG 004 */
const c0: Cap[] = [
  [2.2, 5.6, "LOG 004. Day four. Dawn. Battery: nineteen percent."],
  [6.0, 9.2, "The flood crested at four a.m. We're still here. So is the forest."],
  [9.6, 11.6, "And every drum in it is pointing the same way."],
];
const sLog = logScene({ id: "log", start: T.log, dur: 12, label: "LOG 004", sub: "FIELD RECORDER · PARABOLIC MIC · DAY 04", cell: "CELL 19% · HAND-CRANKED", caps: c0, rgb: "30,90,70" });

/* ======================================================= 1 · PREVIOUSLY */
const sRecap = recapScene({ id: "recap", start: T.recap, dur: 14, fout: 0.4 }, [
  { plate: "flooded_dawn", from: { z: 1.6, fx: 0.38, fy: 0.58 } },
  { plate: "jaguar_water", from: { z: 1.4, fx: 0.4, fy: 0.34 } },
  { plate: "night_bridge", from: { z: 1.8, fx: 0.45, fy: 0.42 } },
  { plate: "canopy", from: { z: 1.0, fx: 0.5, fy: 0.5 } },
]);
sRecap.caps = [
  [0.6, 4.2, "A drowned forest. A jaguar who walked us out of danger."],
  [4.6, 8.0, "A bridge we crossed by listening. A river that rose to meet us."],
  [8.4, 13.0, "And a forest full of drums, answering a child."],
];

/* ======================================================= 2 · THE RELAY */
const NODES: [number, number][] = [[0.7, 0.71], [0.62, 0.63], [0.66, 0.55], [0.55, 0.52], [0.58, 0.46], [0.47, 0.45], [0.42, 0.41], [0.33, 0.42]];
const RT = [10.4, 12.4, 14.2, 15.8, 17.2, 18.4, 19.4, 20.2];
const relayFx: Fx = (c, t, co) => {
  c.save();
  c.lineCap = "round";
  for (let i = 1; i < NODES.length; i++) {
    const k = E.outCubic(prog(t, RT[i - 1] + 0.1, RT[i] + 0.2));
    if (k <= 0) continue;
    const [ax, ay] = co.map(...NODES[i - 1]);
    const [bx, by] = co.map(...NODES[i]);
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = "rgba(255,170,90,0.7)";
    c.lineWidth = 3;
    c.setLineDash([14, 10]);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); c.stroke();
    c.setLineDash([]);
  }
  NODES.forEach(([u, v], i) => {
    const q = t - RT[i];
    if (q < 0) return;
    const [x, y] = co.map(u, v);
    const last = i === NODES.length - 1;
    glow(c, x, y, (last ? 160 : 60) * (0.7 + 0.3 * Math.sin(t * 4 + i)) * co.s * 1.2, last ? "255,210,130" : "255,160,80", last ? 0.8 : 0.6);
    c.globalCompositeOperation = "lighter";
    c.fillStyle = "#fff4dc";
    c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
    for (let j = 0; j < 3; j++) {
      const p = (q - j * 0.18) / 2.2;
      if (p > 0 && p < 1) { c.strokeStyle = `rgba(255,200,130,${(1 - p) * 0.8})`; c.lineWidth = 3 * (1 - p) + 1; c.beginPath(); c.ellipse(x, y, E.outCubic(p) * 260 * co.s, E.outCubic(p) * 130 * co.s, 0, 0, Math.PI * 2); c.stroke(); }
    }
    X.mono(c, last ? "NODE 08 · THE MOTHER TREE · 5.9 KM" : `NODE ${String(i).padStart(2, "0")} · ${(i * 0.84).toFixed(1)} KM`, x + 18, y - 16, last ? 18 : 12, last ? "#ffe2b0" : "#ffcfa0", "left", 3, E.outCubic(prog(q, 0.2, 0.9)));
  });
  c.restore();
};
const c2: Cap[] = [
  [0.8, 5.0, "The flood crested at four. By sunrise the forest steamed, like it had been holding its breath."],
  [5.4, 9.8, "And from the horizon, a sound I'd never heard: knocks. Dozens. Passing something along."],
  [10.4, 14.6, "Each drum tree took the call and handed it on. Ila's knocks, relayed across six kilometres."],
  [15.0, 19.4, "Seven relays. Ten seconds. Each one faster than the last."],
  [20.0, 24.0, "Wayra was translating, one hand tapping her chest. It wasn't about us."],
  [24.4, 26.0, "It was for us."],
  [26.8, 30.6, "Wayra said it with her whole face: the Mother."],
  [31.0, 34.0, "A kapok older than the maps. Taller than the cloud."],
  [34.4, 36.0, "Ila had been drumming from its roots for six days."],
];
const sRelay = shotScene({ id: "relay", label: "The Relay", start: T.relay, dur: 36, fin: 0.5, xf: 0, fout: 0.6, bloom: 0.36, caps: c2 }, [
  { at: 0, dur: 10, plate: "ridge_dawn", from: { z: 1.0, fx: 0.5, fy: 0.55 }, to: { z: 1.12, fx: 0.55, fy: 0.5 }, hh: 2,
    sway: [{ u0: 0, v0: 0.5, u1: 1, v1: 0.85, amp: 1.6, anchor: "none", freq: 0.5 }],
    fx: [FX.flare(0.3, 0.28, { a: 0.5, len: 1400 }), FX.birds(10, { y0: 0.1, y1: 0.35, size: 26 }), FX.fog(0.64, 0.14, 0.2), FX.motes(30, { size: 6 }), FX.vig(0.35)] },
  { at: 10, dur: 16, plate: "ridge_dawn", from: { z: 1.12, fx: 0.55, fy: 0.5 }, to: { z: 1.5, fx: 0.45, fy: 0.46 }, hh: 2,
    sway: [{ u0: 0, v0: 0.5, u1: 1, v1: 0.85, amp: 1.6, anchor: "none", freq: 0.5 }],
    fx: [FX.flare(0.3, 0.28, { a: 0.5, len: 1400 }), FX.fog(0.64, 0.14, 0.18), relayFx_(10), FX.birds(6, { y0: 0.1, y1: 0.3 }), FX.vig(0.4)] },
  { at: 26, dur: 10, plate: "mother_tree", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.35, fx: 0.5, fy: 0.4 }, in: "dissolve", inDur: 1.4,
    sway: [{ u0: 0.2, v0: 0, u1: 0.8, v1: 0.35, amp: 2, anchor: "bottom" }],
    fx: [FX.flare(0.9, 0.38, { a: 0.55, len: 1400 }), FX.shafts(0.9, 0.38, { ang: 2.2, spread: 1, n: 8, alpha: 0.16 }), FX.motes(60, { size: 7, alpha: 0.8, vy: -14, vx: 20, rgb: "255,250,235" }), FX.fog(0.8, 0.1, 0.16), FX.vig(0.35)] },
], (c, t) => {
  if (t >= 20.2 && t < 26.5) {
    const lines = ["STAY HIGH.", "THE WATER IS NOT FINISHED.", "COME TO THE MOTHER."];
    c.save();
    c.fillStyle = "rgba(4,14,14,0.7)";
    c.fillRect(70, 560, 760, 142);
    c.strokeStyle = "rgba(160,255,225,0.3)";
    c.strokeRect(70, 560, 760, 142);
    c.restore();
    X.mono(c, "TRANSLATION · WAYRA (AGE 9) · SOURCE: ILA", 92, 592, 13, "#8fe8d0", "left", 4, E.outCubic(prog(t, 20.2, 21)));
    lines.forEach((l, i) => X.typeText(c, l, 92, 634 + i * 30, 20.6 + i * 1.5, t, { font: `500 24px ${F.mono}`, color: i === 2 ? "#ffb27a" : "#fff0d8", per: 0.04 }));
  }
});
function relayFx_(t0: number): Fx { return (c, t, co, A, k) => relayFx(c, t + t0, co, A, k); }

/* ======================================================= 3 · TITLE */
const sTitle = titleScene({ id: "title", start: T.title, dur: 8, plate: "mother_tree", from: { z: 1.9, fx: 0.5, fy: 0.12 }, to: { z: 1.05, fx: 0.5, fy: 0.5 }, kicker: "LOST ON EARTH  ·  EPISODE 04  ·  FINALE", title: "THE MOTHER TREE", jp: "母なる樹" });

/* ======================================================= 4 · THE WALK */
const c4: Cap[] = [
  [0.6, 4.8, "We walked all morning. The forest dripped, like a held breath finally let go."],
  [5.2, 8.6, "Wayra ran ahead, then back, then ahead. A compass with legs."],
  [9.4, 13.4, "The birds came back first. Then the frogs. Then every voice I'd ever recorded here, at once."],
  [13.8, 16.6, "Like the forest saying: you're allowed to listen now."],
  [17.4, 21.4, "A familiar shape on a log, far across the water. She watched us go."],
  [21.8, 25.6, "I like to think she nodded."],
  [26.6, 31.0, "The Mother Tree didn't come into view. It simply stopped being the sky."],
  [31.4, 35.6, "A trunk wider than a house. Roots like cathedral walls. And at the foot of it: smoke."],
  [36.0, 39.6, "A cooking fire. A woven boat, upside down. And a figure, standing very still."],
];
const sClimb = shotScene({ id: "walk", label: "The Walk", start: T.climb, dur: 40, xf: 0.8, fout: 0.5, bloom: 0.34, caps: c4 }, [
  { at: 0, dur: 9, plate: "walk_back", from: { z: 1.05, fx: 0.7, fy: 0.62 }, to: { z: 1.5, fx: 0.6, fy: 0.6 }, hh: 5,
    fx: [FX.shafts(0.6, -0.05, { n: 9, alpha: 0.2 }), FX.glints(0.1, 0.9, 0.1, 0.9, 50, 9), FX.ferns({ n: 8, sway: 1.3 }), FX.mist({ alpha: 0.12, n: 8 }), ...GR.warm, FX.vig(0.4)] },
  { at: 9, dur: 8, plate: "canopy", from: { z: 1.3, fx: 0.3, fy: 0.55 }, to: { z: 1.0, fx: 0.5, fy: 0.5 }, in: "dissolve", hh: 2,
    fx: [FX.shafts(0.6, 0.0, { n: 10, alpha: 0.22 }), FX.birds(8, { y0: 0.1, y1: 0.3 }), FX.motes(40, { size: 6, alpha: 0.7 }), FX.flies(10, { size: 9, rgb: "255,240,160" }), FX.vig(0.35)] },
  { at: 17, dur: 9, plate: "jaguar_water", from: { z: 1.2, fx: 0.45, fy: 0.4 }, to: { z: 1.6, fx: 0.4, fy: 0.34 }, in: "dissolve", inDur: 1,
    sway: [{ u0: 0, v0: 0.62, u1: 1, v1: 1, amp: 3, anchor: "none" }],
    fx: [FX.shafts(0.82, 0.12, { n: 8, alpha: 0.18 }), FX.glints(0.5, 0.95, 0.65, 0.95, 24, 9), FX.fog(0.62, 0.1, 0.14), FX.vig(0.35)] },
  { at: 26, dur: 14, plate: "mother_tree", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 3.0, fx: 0.485, fy: 0.88 }, in: "dissolve", inDur: 1.2, ease: E.inOutCubic,
    sway: [{ u0: 0.2, v0: 0, u1: 0.8, v1: 0.35, amp: 2, anchor: "bottom" }],
    fx: [FX.shafts(0.9, 0.38, { ang: 2.2, spread: 1, n: 8, alpha: 0.14 }), FX.motes(50, { size: 7, alpha: 0.8, vy: -12, vx: 22, rgb: "255,250,235" }), FX.embers(0.49, 0.9, 10, { rise: 300 }), FX.vig(0.4)] },
], (c, t) => {
  if (t > 17 && t < 26) {
    const a = E.outCubic(prog(t, 18, 19)) * (1 - prog(t, 25, 26));
    X.mono(c, "● SPECIES LOG  ·  PANTHERA ONCA  ·  1 ADULT FEMALE  ·  UNHARMED", 90, 110, 16, "#ffd2a8", "left", 5, a * 0.9);
  }
});

/* ======================================================= 5 · ILA */
const c5: Cap[] = [
  [0.6, 4.0, "Wayra stopped so suddenly I almost walked into her."],
  [4.4, 7.6, "Her whole body asked a question."],
  [8.4, 12.4, "She said it once. Not shouting. The way you say a word you're afraid will break."],
  [12.8, 15.6, "“Mama Ila.”"],
  [16.4, 20.4, "The figure turned. Slowly. One hand on the root, as if it were holding her up."],
  [20.8, 23.6, "And then Wayra was running."],
  [24.2, 28.6, "I've never seen anything cover ground like that. Not the jaguar. Not the flood."],
  [29.0, 33.4, "She hit her grandmother at full speed. Neither of them fell. The tree wouldn't allow it."],
  [34.4, 38.4, "Ila held her face the way you hold a thing you were told was lost forever."],
  [38.8, 42.4, "Six days of knocking. She'd never stopped counting either."],
  [42.8, 45.6, "Neither of them said a word. The forest said it for them."],
];
const sIla = shotScene({ id: "ila", label: "Ila", start: T.ila, dur: 46, xf: 0.8, fout: 0.5, bloom: 0.36, caps: c5, ca: (t) => (t > 29 && t < 30.2 ? 10 : 0) }, [
  { at: 0, dur: 8, plate: "mother_tree", from: { z: 3.0, fx: 0.485, fy: 0.88 }, to: { z: 3.8, fx: 0.49, fy: 0.9 },
    fx: [FX.embers(0.49, 0.9, 14, { rise: 260 }), FX.motes(40, { size: 6, rgb: "255,250,235" }), FX.vig(0.4)] },
  { at: 8, dur: 8, plate: "wayra_portrait", from: { z: 1.1, fx: 0.62, fy: 0.42 }, to: { z: 1.6, fx: 0.67, fy: 0.34 }, in: "dissolve", rack: [0.7, 1.2],
    sway: [{ u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 6, anchor: "none" }, { u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(36, { size: 7 }), FX.vig(0.4)] },
  { at: 16, dur: 8, plate: "mother_tree", from: { z: 3.6, fx: 0.49, fy: 0.9 }, to: { z: 3.4, fx: 0.49, fy: 0.9 }, in: "dissolve" },
  { at: 24, dur: 6, plate: "mother_tree", from: { z: 1.6, fx: 0.4, fy: 0.9 }, to: { z: 3.4, fx: 0.49, fy: 0.9 }, in: "whip", hh: 14, ease: E.inCubic,
    fx: [FX.motes(40, { size: 8, vx: 200, rgb: "255,250,235" }), FX.vig(0.4)] },
  { at: 30, dur: 4.6, plate: "grandmother", from: { z: 1.05, fx: 0.45, fy: 0.45 }, to: { z: 1.2, fx: 0.4, fy: 0.35 }, in: "flash", inDur: 0.6,
    fx: [FX.motes(40, { size: 8 }), FX.flies(14, { size: 9, rgb: "255,240,160" }), FX.vig(0.35)] },
  { at: 34.6, dur: 11.4, plate: "grandmother", from: { z: 1.25, fx: 0.4, fy: 0.3 }, to: { z: 1.75, fx: 0.4, fy: 0.27 }, in: "dissolve", inDur: 1.2,
    sway: [{ u0: 0.6, v0: 0, u1: 1, v1: 1, amp: 3, anchor: "none", freq: 0.7 }],
    fx: [FX.motes(46, { size: 8 }), FX.flies(18, { size: 10, rgb: "255,240,160" }), FX.flare(0.85, 0.08, { a: 0.4 }), FX.vig(0.4)] },
], (c, t, _g, A) => {
  if (t >= 16 && t < 24) eyeInsert(c, t - 16, A, { dur: 8, skin: SKIN_WAYRA, reflect: "mother_tree", blinks: [4.4], pupil: [0.45, 0.62], look: [0.3, -0.1], tears: [5, 7.5], tremor: 0.12, warm: "255,220,160" });
  if (t >= 24 && t < 30) X.speedLines(c, t - 24, W * 0.55, H * 0.7, { color: "rgba(0,0,0,0.45)", inner: 380 - (t - 24) * 40, seed: 9, n: 70 });
  if (t >= 29.9 && t < 31) { negative(c, 0.9 * Math.exp(-(t - 29.9) * 6)); X.flash(c, 0.8 * Math.exp(-(t - 29.9) * 5), "255,240,215"); }
});

/* ======================================================= 6 · LISTENING */
const c6: Cap[] = [
  [0.6, 4.6, "I stood there like an idiot — recorder in hand, tears in my gear."],
  [5.0, 9.4, "Ila looked at me over Wayra's head. She saw the headphones around my neck."],
  [10.4, 14.8, "She tapped her ear. Then the root beneath her feet. Then her chest."],
  [15.2, 19.6, "Three places. The same three places Grandpa taught me to listen from."],
  [20.4, 24.4, "The world isn't quiet, he'd said. We're just loud."],
  [24.8, 29.4, "Wayra translated Ila's reply: the forest is never lost. Only people who stop listening."],
  [30.0, 33.6, "Different forests. Different mouths. Same sentence."],
];
const sListen = shotScene({ id: "listen", label: "Listening", start: T.listen, dur: 34, xf: 0.8, fout: 0.5, bloom: 0.36, caps: c6 }, [
  { at: 0, dur: 10, plate: "portrait", from: { z: 1.15, fx: 0.63, fy: 0.42 }, to: { z: 1.3, fx: 0.64, fy: 0.45 }, rack: [0.6, 1.2],
    fx: [FX.motes(40, { size: 9, alpha: 0.6 }), FX.flare(0.1, 0.1, { a: 0.4 }), FX.vig(0.35)] },
  { at: 10, dur: 10.4, plate: "grandmother", from: { z: 1.2, fx: 0.4, fy: 0.3 }, to: { z: 1.0, fx: 0.5, fy: 0.5 }, in: "dissolve", inDur: 1,
    sway: [{ u0: 0.6, v0: 0, u1: 1, v1: 1, amp: 3, anchor: "none" }],
    fx: [FX.motes(40, { size: 8 }), FX.flies(14, { size: 9, rgb: "255,240,160" }), FX.vig(0.35)] },
  { at: 20.4, dur: 9.4, plate: "flashback", from: { z: 1.0, fx: 0.5, fy: 0.52 }, to: { z: 1.25, fx: 0.52, fy: 0.56 }, in: "flash", inDur: 0.6,
    fx: [...GR.memory, FX.flies(16, { size: 9 }), FX.motes(30, { size: 6 }), FX.vig(0.5)] },
  { at: 29.8, dur: 4.2, plate: "portrait", from: { z: 1.3, fx: 0.64, fy: 0.45 }, to: { z: 1.1, fx: 0.63, fy: 0.42 }, in: "dissolve", inDur: 1,
    fx: [FX.motes(40, { size: 9 }), FX.vig(0.35)] },
]);

/* ======================================================= 7 · THE CROWN */
const climber: Fx = (c, t, co) => {
  const k = prog(t, 8.2, 29.6);
  if (k <= 0 || k >= 1) return;
  const v = lerp(0.88, 0.1, E.inOutSine(k));
  const u = 0.47 + Math.sin(k * 9) * 0.008;
  const [x, y] = co.map(u, v);
  const s = co.s * 1.2;
  c.save();
  c.translate(x, y);
  c.strokeStyle = "rgba(40,30,20,0.8)"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 600); c.stroke();
  c.fillStyle = "#e2701f";
  c.beginPath(); c.roundRect(-6 * s, -14 * s, 12 * s, 18 * s, 4 * s); c.fill();
  c.fillStyle = "#1f8f8f"; c.fillRect(5 * s, -12 * s, 5 * s, 12 * s);
  c.fillStyle = "#1a1210"; c.beginPath(); c.arc(0, -20 * s, 5 * s, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#e2701f"; c.lineWidth = 3 * s;
  const sw = Math.sin(t * 5) * 6 * s;
  c.beginPath(); c.moveTo(-5 * s, -10 * s); c.lineTo(-10 * s, -24 * s + sw); c.moveTo(5 * s, -10 * s); c.lineTo(10 * s, -24 * s - sw); c.stroke();
  c.restore();
};
function satPhone(c: C2, x: number, y: number, state: "search" | "bar" | "dial" | "ring" | "live", t: number, a = 1) {
  c.save();
  c.globalAlpha = a;
  c.fillStyle = "rgba(10,14,16,0.92)";
  c.beginPath(); c.roundRect(x, y, 230, 330, 22); c.fill();
  c.strokeStyle = "rgba(190,210,215,0.5)"; c.lineWidth = 3; c.stroke();
  c.fillStyle = "#0d2a26";
  c.beginPath(); c.roundRect(x + 16, y + 34, 198, 150, 8); c.fill();
  c.strokeStyle = "#31403f"; c.lineWidth = 6;
  c.beginPath(); c.moveTo(x + 190, y); c.lineTo(x + 190, y - 70); c.stroke();
  c.restore();
  const bars = state === "search" ? 0 : state === "bar" ? 1 : 2;
  c.save();
  c.globalAlpha = a;
  for (let i = 0; i < 4; i++) { c.fillStyle = i < bars ? "#9fffd0" : "rgba(160,255,225,0.15)"; c.fillRect(x + 30 + i * 12, y + 70 - i * 6, 8, 10 + i * 6); }
  c.restore();
  const blink = Math.floor(t * 2) % 2 === 0;
  const txt = { search: "SEARCHING…", bar: "1 BAR", dial: "DIALING BASECAMP", ring: blink ? "RINGING…" : "RINGING", live: "CONNECTED" }[state];
  X.mono(c, txt, x + 30, y + 120, state === "dial" ? 14 : 18, state === "live" ? "#9fffd0" : "#bff", "left", 2, a);
  if (state === "live") X.mono(c, "00:" + String(Math.floor(t) % 60).padStart(2, "0"), x + 30, y + 160, 22, "#9fffd0", "left", 2, a);
  c.save(); c.globalAlpha = a;
  c.fillStyle = "#3b4648";
  for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x + 54 + (i % 3) * 62, y + 220 + Math.floor(i / 3) * 34, 11, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
const c7: Cap[] = [
  [0.6, 4.6, "Sat phone: useless for four days. Because it needs sky."],
  [5.0, 7.8, "And the only sky out here is above the Mother Tree."],
  [8.4, 12.4, "Wayra went first. Barefoot. Of course."],
  [12.8, 16.8, "Ila's drum kept time below us. Three knocks. Two. Three. A heartbeat I could climb to."],
  [17.2, 21.2, "Forty metres. Sixty. I stopped looking down at forty-one."],
  [21.6, 25.4, "The air changed. Brighter. Cooler. The leaves got smaller."],
  [25.8, 29.6, "Eighty metres. The canopy fell away like a green sea."],
  [30.2, 33.8, "I cranked until the little screen woke. Searching. Searching."],
  [34.2, 37.6, "One bar."],
  [38.0, 41.0, "I dialled the only number I knew by heart. My team's."],
  [41.4, 45.4, "It rang. Once. Twice."],
];
const sCrown = shotScene({ id: "crown", label: "The Crown", start: T.crown, dur: 46, xf: 0.8, fout: 0.2, bloom: 0.38, caps: c7 }, [
  { at: 0, dur: 8.2, plate: "mother_tree", from: { z: 2.2, fx: 0.485, fy: 0.86 }, to: { z: 2.2, fx: 0.49, fy: 0.84 },
    fx: [FX.embers(0.49, 0.9, 8, { rise: 260 }), FX.motes(30, { size: 6, rgb: "255,250,235" }), FX.vig(0.4)] },
  { at: 8.2, dur: 21.4, plate: "mother_tree", from: { z: 2.2, fx: 0.49, fy: 0.8 }, to: { z: 2.2, fx: 0.49, fy: 0.26 }, in: "cut", ease: E.inOutSine, hh: 2,
    fx: [climber, FX.motes(50, { size: 7, alpha: 0.8, vy: -10, rgb: "255,250,235" }), FX.shafts(0.9, 0.38, { ang: 2.2, spread: 1, n: 6, alpha: 0.12 }), FX.vig(0.4)] },
  { at: 29.6, dur: 16.4, plate: "mother_tree", from: { z: 1.7, fx: 0.55, fy: 0.22 }, to: { z: 1.4, fx: 0.62, fy: 0.3 }, in: "dissolve", inDur: 1.4,
    fx: [FX.flare(0.9, 0.38, { a: 0.7, len: 1600 }), FX.motes(60, { size: 7, alpha: 0.8, vy: -14, vx: 30, rgb: "255,250,235" }), FX.birds(6, { y0: 0.05, y1: 0.3, speed: 60 }), FX.vig(0.35)] },
], (c, t) => {
  if (t >= 12 && t < 30) {
    const a = E.outCubic(prog(t, 12, 13)) * (1 - prog(t, 29, 30));
    X.mono(c, `ALTITUDE  ${String(Math.round(lerp(0, 86, prog(t, 8.2, 29.6)))).padStart(2, "0")} m`, W - 100, 100, 28, "#fff0d8", "right", 6, a);
    X.mono(c, "ILA · DRUM TEMPO  72 BPM", W - 100, 134, 14, "#ffb27a", "right", 6, a * 0.9);
  }
  if (t >= 30) {
    const a = E.outCubic(prog(t, 30, 31));
    crankHud(c, 90, 90, t, lerp(19, 24, prog(t, 30, 34)), a, t < 34 ? 1 : 0);
    const st = t < 34.2 ? "search" : t < 38 ? "bar" : t < 41.4 ? "dial" : "ring";
    satPhone(c, W - 340, 300, st, t, a);
  }
});

/* ======================================================= 8 · RESCUE */
const rotor: Fx = (c, t, co) => {
  const [x, y] = co.map(0.77, 0.235);
  c.save();
  c.translate(x, y - 6 * co.s);
  c.strokeStyle = "rgba(20,20,20,0.5)";
  c.lineWidth = 3 * co.s;
  for (let i = 0; i < 3; i++) {
    const a = t * 55 + (i * Math.PI) / 3;
    c.globalAlpha = 0.35;
    c.beginPath(); c.moveTo(-Math.cos(a) * 52 * co.s, -Math.sin(a) * 8 * co.s); c.lineTo(Math.cos(a) * 52 * co.s, Math.sin(a) * 8 * co.s); c.stroke();
  }
  c.restore();
};
const c8: Cap[] = [
  [0.4, 3.6, "“—Maya? Is that— MAYA?”"],
  [4.0, 8.0, "I've never loved a voice so much. Or been so unable to speak."],
  [8.4, 10.0, "“Coordinates. Give me coordinates.”"],
  [10.6, 14.6, "They didn't wait for a helicopter to find us. They drummed us a runway."],
  [15.0, 17.8, "Three knocks. Pause. Three. A beacon made of wood."],
  [18.4, 22.4, "Rotors. At first I thought it was thunder."],
  [22.8, 26.4, "Then the whole sky turned orange and white. Six days of nothing, and then this."],
  [26.8, 29.8, "I'd like to say we waved. Mostly we screamed."],
  [30.2, 31.8, "Wayra covered her ears and grinned."],
];
const sRescue = shotScene({ id: "rescue", label: "Rescue", start: T.rescue, dur: 32, xf: 0.4, fout: 0.5, bloom: 0.38, caps: c8 }, [
  { at: 0, dur: 10.4, plate: "mother_tree", from: { z: 1.4, fx: 0.62, fy: 0.3 }, to: { z: 1.5, fx: 0.65, fy: 0.32 },
    fx: [FX.flare(0.9, 0.38, { a: 0.65, len: 1600 }), FX.motes(60, { size: 7, alpha: 0.8, vy: -14, vx: 30, rgb: "255,250,235" }), FX.vig(0.35)] },
  { at: 10.4, dur: 8, plate: "drum_roots", from: { z: 1.4, fx: 0.55, fy: 0.74 }, to: { z: 1.2, fx: 0.52, fy: 0.68 }, in: "whip", punch: [0.6, 0.95, 1.3, 2.4, 2.75, 3.1, 4.4, 4.75, 5.1],
    fx: [FX.shafts(0.12, 0.05, { ang: 0.9, spread: 0.9, n: 8, alpha: 0.26 }), FX.pulse(0.5, 0.72, [0.6, 0.95, 1.3, 2.4, 2.75, 3.1, 4.4, 4.75, 5.1], { r: 1000, life: 1.8 }), ...GR.warm, FX.motes(40, { size: 6 }), FX.vig(0.4)] },
  { at: 18.4, dur: 13.6, plate: "rescue_sky", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 2.0, fx: 0.72, fy: 0.3 }, in: "dissolve", inDur: 1.0, ease: E.inOutCubic, hh: 3,
    sway: [{ u0: 0, v0: 0.5, u1: 1, v1: 0.95, amp: 1.5, anchor: "none", freq: 0.6 }],
    fx: [FX.flare(0.33, 0.38, { a: 0.7, len: 1600 }), FX.birds(14, { y0: 0.4, y1: 0.7, size: 20, rgb: "20,60,150", speed: 120 }), rotor, FX.motes(30, { size: 7, alpha: 0.8, vx: 120 }), FX.vig(0.3)] },
], (c, t) => {
  if (t < 10.4) {
    satPhone(c, W - 340, 300, "live", t, 1);
    const env = speech(t, [[0.4, 3.6, ""], [8.4, 10, ""]]);
    X.mono(c, "BASECAMP · VOICE", W - 340 + 30, 300 + 190, 12, "#8fe8d0", "left", 3);
    c.fillStyle = "#9fffd0";
    for (let i = 0; i < 12; i++) c.fillRect(W - 340 + 30 + i * 12, 300 + 278 - env * 30 * hash(i * 3.1 + Math.floor(t * 20)), 8, env * 30 * hash(i * 3.1 + Math.floor(t * 20)) + 2);
    if (t > 8.4) X.typeText(c, "S 03°12′44″   W 70°48′09″", 90, 640, 8.8, t, { font: `500 38px ${F.mono}`, color: "#fff0d8", per: 0.05 });
  }
});

/* ======================================================= 9 · EPILOGUE */
const c9: Cap[] = [
  [0.8, 4.4, "Two months later. A wooden dock. A different river. The same sky."],
  [4.8, 9.0, "Ila said she'd never leave the forest. So we stopped asking her to."],
  [9.4, 13.4, "This time, we asked permission first. And brought a better crank."],
  [13.8, 18.2, "Wayra put on the headphones for the first time since the fire. And listened."],
  [18.6, 23.0, "Grandpa was right. The world isn't quiet. We're just loud."],
];
const sEpi = shotScene({ id: "epilogue", label: "Epilogue", start: T.epi, dur: 24, fin: 0.6, xf: 0, fout: 0.6, bloom: 0.38, caps: c9 }, [
  { at: 0, dur: 24, plate: "final_porch", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.9, fx: 0.4, fy: 0.45 }, ease: E.inOutSine,
    sway: [{ u0: 0.4, v0: 0.5, u1: 1, v1: 0.95, amp: 2.2, anchor: "none", freq: 0.7 }],
    fx: [FX.flies(24, { size: 12, rgb: "255,240,160" }), FX.motes(40, { size: 7, rgb: "255,200,160" }), FX.glints(0.5, 1, 0.5, 0.8, 30, 9), FX.flare(0.75, 0.1, { a: 0.4 }), FX.fog(0.8, 0.1, 0.1, "255,210,200"), FX.vig(0.4)] },
], (c, t, g) => {
  if (t > 15) {
    const a = E.outCubic(prog(t, 15, 16));
    X.rec(c, g, a, "  ·  LOG 005");
  }
});

/* ======================================================= 10 · END */
const sEnd: Scene = {
  id: "end", label: "Fin", start: T.end, dur: 8, fin: 0.6, caps: [], bloom: 0.3,
  draw: (c, t, g, A) => {
    cover(c, A.canopy, { z: 1.3 + t * 0.01, fx: 0.5, fy: 0.5 });
    X.tint(c, "rgba(0,6,8,0.86)", "source-over");
    X.motes(c, t, 77, 30, { size: 6, alpha: 0.5 });
    const a = E.outExpo(prog(t, 0.6, 2));
    X.mono(c, "THE END OF SEASON ONE", W / 2, H / 2 - 90, 20, "#ffbe8a", "center", 14, a);
    c.save();
    c.globalAlpha = a;
    c.font = `170px ${F.title}`;
    c.textAlign = "center";
    c.fillStyle = "#fff6e6";
    c.fillText("LOST ON EARTH", W / 2, H / 2 + 60);
    c.restore();
    c.fillStyle = "#ff7a2f";
    c.fillRect(W / 2 - 340 * a, H / 2 + 92, 680 * a, 4);
    X.mono(c, "終  ·  ロスト・オン・アース", W / 2, H / 2 + 150, 22, "#ffe9cf", "center", 8, E.outCubic(prog(t, 2, 3)));
    X.mono(c, "20 PAINTED PLATES  ·  0 RECORDED SOUNDS  ·  EVERY FRAME A FUNCTION OF TIME", W / 2, H / 2 + 210, 14, "#9fe8d2", "center", 5, E.outCubic(prog(t, 3.2, 4.4)) * 0.8);
    X.vignette(c, 0.5);
    void g;
  },
};
sEnd.fout = 1.2;

/* ======================================================= 11 · NEXT? (none) SCORE */
const Bm: Chord = { b: 35, n: [59, 62, 66, 71] };
const G: Chord = { b: 43, n: [59, 62, 67, 71] };
const D: Chord = { b: 38, n: [57, 62, 66, 69] };
const A: Chord = { b: 33, n: [57, 61, 64, 69] };
const PROG = [Bm, G, D, A];
const PROG_UP = [G, D, A, Bm];

function compose(k: Kit) {
  const { BAR, BEAT } = k;
  const S = T;
  k.dayBed([[0, 0], [13, 0.05], [26, 0.25], [40, 0.35], [62, 0.35], [70, 0.7], [110, 0.7], [150, 0.5], [190, 0.35], [235, 0.3], [268, 0.4], [292, 0.2], [300, 0.1]]);
  k.nightBed([[0, 0], [268, 0], [274, 0.2], [292, 0.2], [300, 0]]);
  k.riverBed([[0, 0.1], [14, 0.4], [60, 0.4], [70, 0.2], [100, 0.1], [262, 0.1], [270, 0.35], [300, 0.2]]);
  k.windBed([[0, 0.3], [190, 0.3], [212, 0.9], [236, 1], [248, 0.4], [300, 0.2]]);
  k.fireBed(S.climb + 36, S.crown, 0.3);
  // LOG
  k.pad(1, 11, [35, 42, 47], 0.2, { cut: 320, att: 3 });
  for (let t = 2.2; t < 11.8; t += BEAT * 1.15) k.thump(t, 0.42);
  // RECAP
  k.rev(S.recap, 1.2, 0.18);
  k.arp(S.recap + 1, S.recap + 14, PROG, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.055);
  k.padBars(S.recap, S.recap + 14, PROG, 0.06, { cut: 700 });
  // RELAY
  const T2 = S.relay;
  k.pad(T2, 36, [35, 42, 47], 0.12, { cut: 360, att: 4 });
  k.fluteLine([[T2 + 2.4, 78, 2.2], [T2 + 5.4, 81, 2], [T2 + 8, 83, 2.6]], 0.12);
  RT.forEach((o, i) => { if (i === 0) k.tok(T2 + o, 0.9); else { k.tokFar(T2 + o, 0.5, 0.85 + i * 0.05); k.tokFar(T2 + o + 0.6, 0.3, 0.85 + i * 0.05); } });
  k.arp(T2 + 10, T2 + 26, PROG, BEAT / 2, [0, 2, 1, 3, 2, 1], 0.045);
  k.bassBars(T2 + 10, T2 + 26, PROG, 0.1);
  for (let t = T2 + 14; t < T2 + 26; t += BAR) k.taiko(t, 0.3);
  k.riser(T2 + 21, T2 + 26, 0.18);
  k.boom(T2 + 26.2, 0.5);
  k.choir(T2 + 26, 10, [59, 66, 71, 74], 0.1, "a");
  k.fluteLine([[T2 + 26.8, 74, 1.8], [T2 + 28.8, 78, 1.4], [T2 + 30.4, 81, 4]], 0.16);
  k.bell(T2 + 27.6, 93, 6, 0.045);
  // TITLE
  k.boom(S.title + 0.6, 0.6);
  k.padBars(S.title, S.title + 8, PROG, 0.13, { att: 1.2 });
  k.choir(S.title + 1, 8, [59, 66, 71, 74], 0.09, "o");
  k.fluteLine([[S.title + 2.4, 74, 1.8], [S.title + 4.4, 78, 1.2], [S.title + 5.8, 81, 1.2], [S.title + 7, 83, 3]], 0.18);
  k.bell(S.title + 3, 90, 5, 0.04);
  // WALK
  const T4 = S.climb;
  k.padBars(T4, T4 + 40, PROG_UP, 0.1, { att: 2.2 });
  k.arp(T4, T4 + 40, PROG_UP, BEAT, [0, 2, 1, 3], 0.05);
  k.bassBars(T4 + 8, T4 + 40, PROG_UP, 0.1);
  [9.4, 10.6, 12.2, 13.6, 15.2].forEach((o, i) => k.birdcall(T4 + o, 2200 + i * 260, 3));
  for (let t = T4 + 11; t < T4 + 17; t += 0.8) if (hash(t * 3) > 0.3) k.frog(t, 480 + hash(t) * 200);
  k.fluteLine([[T4 + 17.4, 78, 1.8], [T4 + 19.6, 81, 1.8], [T4 + 22, 83, 3]], 0.13);
  k.riser(T4 + 28, T4 + 31, 0.12);
  k.choir(T4 + 26.4, 14, [59, 66, 71], 0.09, "o");
  k.fluteLine([[T4 + 31.6, 74, 2], [T4 + 34, 78, 2], [T4 + 36.4, 81, 3]], 0.14);
  // ILA
  const T5 = S.ila;
  k.pad(T5, 46, [35, 42, 47], 0.1, { cut: 380, att: 3 });
  for (let t = T5 + 0.6; t < T5 + 8; t += 1) k.thump(t, 0.28);
  k.tone(T5 + 12.8, 2.5, { f0: 392, vel: 0.05, att: 0.2, dest: k.buses.fluteBus });
  for (let t = T5 + 16; t < T5 + 24; t += 0.9 - (t - T5 - 16) * 0.05) k.thump(t, 0.34);
  k.riser(T5 + 20.5, T5 + 24.2, 0.22);
  for (let t = T5 + 24.2, i = 0; t < T5 + 29.8; t += BEAT / 4, i++) { k.taiko(t, i % 4 === 0 ? 0.5 : 0.28, i % 2 ? 1.5 : 1); k.tick(t, 0.05); k.step(t + 0.02, 0.05); }
  k.boom(T5 + 29.9, 0.8); k.rev(T5 + 29.9, 1.0, 0.2);
  k.choir(T5 + 30.2, 16, [47, 54, 59, 66, 71], 0.13, "a");
  k.bell(T5 + 30.4, 90, 7, 0.07);
  k.melody([[T5 + 34.6, 71, 3], [T5 + 37.6, 74, 3], [T5 + 40.6, 78, 3], [T5 + 43.6, 76, 4]], 0.12, 0.03);
  k.fluteLine([[T5 + 36, 83, 2.4], [T5 + 39, 81, 2], [T5 + 42, 78, 4]], 0.14);
  // LISTEN
  const T6 = S.listen;
  k.padBars(T6, T6 + 34, PROG, 0.1, { att: 2.2 });
  k.arp(T6 + 4, T6 + 34, PROG, BEAT, [0, 2, 3, 2], 0.05);
  k.melody([[T6 + 20.4, 74, 2], [T6 + 22.4, 78, 2], [T6 + 24.4, 81, 2], [T6 + 26.4, 78, 3]], 0.1, 0.03);
  k.tok(T6 + 11.2, 0.4, 1.3); k.tok(T6 + 12.4, 0.5, 0.8); k.tok(T6 + 13.6, 0.4, 1.0);
  k.fluteLine([[T6 + 30, 74, 2], [T6 + 32, 78, 3]], 0.13);
  // CROWN
  const T7 = S.crown;
  k.pad(T7, 46, [35, 42, 47], 0.11, { cut: 400, att: 3 });
  for (let t = T7 + 12.8; t < T7 + 29.6; t += 0.83) { k.tok(t, 0.34, 0.9, k.buses.farBus); }
  k.arp(T7 + 8.2, T7 + 30, PROG_UP, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.045, 0);
  for (let t = T7 + 8.2; t < T7 + 29.6; t += BAR) k.taiko(t, 0.25);
  k.riser(T7 + 24, T7 + 29.6, 0.18);
  for (let t = T7 + 30.4; t < T7 + 34; t += 0.16) { k.tick(t, 0.05); }
  [30.4, 32.2, 34.0].forEach((o) => k.tone(T7 + o, 0.25, { type: "square", f0: 880, vel: 0.02, att: 0.01, lp: 2400 }));
  k.tone(T7 + 34.4, 0.35, { type: "square", f0: 1320, vel: 0.03, att: 0.01, lp: 2400 });
  for (let i = 0; i < 8; i++) k.tone(T7 + 38 + i * 0.1, 0.05, { type: "square", f0: 700 + (i % 3) * 120, vel: 0.02, att: 0.005, lp: 2200 });
  [41.4, 43.4].forEach((o) => { for (const d of [0, 0.5]) { k.tone(T7 + o + d * 0.4, 0.34, { f0: 440, vel: 0.04, att: 0.01, dest: k.buses.musicBus }); k.tone(T7 + o + d * 0.4, 0.34, { f0: 480, vel: 0.04, att: 0.01, dest: k.buses.musicBus }); } });
  k.choir(T7 + 31, 14, [59, 66, 71, 74], 0.08, "o");
  // RESCUE
  const T8 = S.rescue;
  for (let t = T8; t < T8 + 10; t += 0.07 + hash(t) * 0.1) k.noise(t, 0.04, { type: "bandpass", f0: 1800 + hash(t * 2) * 1500, q: 2, vel: 0.02 });
  k.pad(T8, 32, [35, 42, 47, 54], 0.1, { cut: 500, att: 2 });
  [0.6, 0.95, 1.3, 2.4, 2.75, 3.1, 4.4, 4.75, 5.1].forEach((o) => k.tok(T8 + 10.4 + o, 0.9, 0.95 + (o > 4 ? 0.1 : 0)));
  k.heli(T8 + 15, T8 + 32, [[15, 0], [18.4, 0.05], [22, 0.18], [26, 0.5], [30, 0.85], [32, 0.85]]);
  k.arp(T8 + 14, T8 + 32, PROG_UP, BEAT / 2, [0, 2, 1, 3, 2, 1], 0.05);
  k.bassBars(T8 + 14, T8 + 32, PROG_UP, 0.12);
  for (let t = T8 + 18.4; t < T8 + 32; t += BAR) k.taiko(t, 0.38);
  k.choir(T8 + 22.4, 10, [59, 66, 71, 78], 0.12, "a");
  k.fluteLine([[T8 + 22.6, 78, 1.6], [T8 + 24.4, 81, 1.6], [T8 + 26.2, 83, 2], [T8 + 28.4, 86, 3.4]], 0.17);
  k.bell(T8 + 22.8, 90, 6, 0.06);
  [24, 25.4, 28].forEach((o, i) => k.birdcall(T8 + o, 1900 + i * 300, 4));
  // EPILOGUE
  const T9 = S.epi;
  k.padBars(T9, T9 + 24, PROG, 0.1, { att: 2.4 });
  k.melody([[T9 + 1, 71, 3], [T9 + 4, 74, 3], [T9 + 7, 78, 3], [T9 + 10, 76, 3], [T9 + 13, 74, 3], [T9 + 16, 78, 3], [T9 + 19, 81, 4]], 0.11, 0.03);
  k.fluteLine([[T9 + 6, 83, 2.4], [T9 + 9, 81, 2], [T9 + 14, 78, 2.4], [T9 + 18.6, 74, 2], [T9 + 20.6, 78, 4]], 0.14);
  k.arp(T9 + 12, T9 + 24, PROG, BEAT, [0, 2, 1, 3], 0.045);
  [21.0, 21.55, 22.1].forEach((o) => k.tok(T9 + o, 0.45, 1));
  [23.0, 23.55].forEach((o) => k.tokFar(T9 + o, 0.5, 1));
  // END
  const T10 = S.end;
  k.boom(T10 + 0.6, 0.45);
  k.choir(T10, 8, [47, 54, 59, 66], 0.09, "o");
  k.bell(T10 + 1.0, 90, 7, 0.06);
  k.fluteLine([[T10 + 1.6, 74, 1.4], [T10 + 3, 78, 1.4], [T10 + 4.4, 81, 3]], 0.14);
}

export const ep4: Episode = {
  id: "ep4", num: 4, title: "THE MOTHER TREE", jp: "母なる樹", duration: DUR, accent: "#ffd27a",
  tagline: "Every drum in the forest points the same way. Climb.",
  scenes: [sLog, sRecap, sRelay, sTitle, sClimb, sIla, sListen, sCrown, sRescue, sEpi, sEnd],
  art: ["flooded_dawn", "jaguar_water", "night_bridge", "canopy", "ridge_dawn", "mother_tree", "walk_back", "wayra_portrait", "grandmother", "portrait", "flashback", "drum_roots", "rescue_sky", "final_porch"],
  synopsis: {
    log: "Day four. The flood has crested. Every drum points one way.",
    recap: "Drowned forest, jaguar, bridge, rising river — a people answering a child.",
    relay: "A knock relayed across six kilometres, node by node, to the Mother Tree.",
    title: "The Mother Tree.",
    walk: "The forest exhales. Birds, frogs, and a jaguar who might have nodded.",
    ila: "A name said once. A sprint. A hug the tree will not let fall.",
    listen: "Three places to listen from — ear, ground, chest. Grandfather's sentence in another mouth.",
    crown: "Eighty metres up, a hand-cranked sat phone, one bar of signal.",
    rescue: "A voice. A runway of drumming. Rotors that sound like thunder.",
    epilogue: "Two months later. A dock. Permission asked. Headphones on a small head.",
    end: "The end of Season One.",
  },
  brief: [
    ["PREMISE", "The lost woman and the lost child find the grandmother who never stopped knocking — and the sky above the oldest tree finally lets a signal through."],
    ["PAYOFF", "Hand crank (Ep2) → sat phone; headphones (Ep1 flashback) → Wayra; 'the world isn't quiet' → Ila's sentence; two knocks → three-and-two answer on the dock."],
    ["HERO MOVES", "Relay map across the canopy; sprint cut with negative impact frame; 86 m vertical climb with altitude counter; sat-phone UI; rotor-blur helicopter arrival."],
    ["LOOK", "Dawn-after-storm gold, white cotton-seed motes, kapok light. The palette finally warms; accent #ff7a2f becomes sunrise."],
  ],
  score: () => renderScore(DUR, 72, 20240704, compose),
};
