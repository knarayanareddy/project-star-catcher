import { W, H, E, lerp, prog, hash } from "../engine/util";
import * as X from "../engine/fx";
import { F, cover, type C2, type Assets } from "../engine/fx";
import { shotScene, FX, type Shot } from "../engine/shots";
import { logScene, recapScene, titleScene, nextScene, spectro, negative, crankHud } from "../engine/hud";
import { renderScore, type Kit, type Chord } from "../engine/synth";
import { eyeInsert, handprint, SKIN_WAYRA, GR } from "./common";
import type { Cap } from "../scenes/types";
import type { Episode } from "./types";

const DUR = 300;
const T = { log: 0, recap: 13, tok: 29, title: 72, contact: 80, count: 128, code: 172, fire: 216, answer: 250, next: 284 };

/* ======================================================= 0 · LOG 002 */
const c0: Cap[] = [
  [2.4, 5.8, "LOG 002. Day two. Sunset."],
  [6.2, 9.6, "Battery: one percent. And somebody is standing behind me."],
  [10.0, 12.6, "…Somebody very small."],
];
const sLog = logScene({ id: "log", start: T.log, dur: 13, label: "LOG 002", sub: "FIELD RECORDER · PARABOLIC MIC · DAY 02", cell: "CELL 01% · LOW", caps: c0 });

/* ======================================================= 1 · PREVIOUSLY */
const sRecap = recapScene({ id: "recap", start: T.recap, dur: 16, fout: 0.4 }, [
  { plate: "river_dawn", from: { z: 1.0, fx: 0.5, fy: 0.55 } },
  { plate: "canopy", from: { z: 1.1, fx: 0.3, fy: 0.5 } },
  { plate: "jaguar", from: { z: 1.2, fx: 0.66, fy: 0.5 } },
  { plate: "storm", from: { z: 1.1, fx: 0.6, fy: 0.5 } },
  { plate: "fungi_night", from: { z: 1.2, fx: 0.3, fy: 0.56 } },
  { plate: "clearing", from: { z: 1.5, fx: 0.495, fy: 0.46 }, to: { z: 2.2, fx: 0.495, fy: 0.46 } },
]);
sRecap.caps = [
  [0.8, 4.2, "Lost. Alone. Following water — and then, a sound."],
  [4.6, 8.4, "A silence that was a sentence. A flood that arrived before I saw it."],
  [8.8, 12.2, "A forest that glowed… and pointed."],
  [12.6, 15.6, "And three knocks. Louder every time."],
];

/* ======================================================= 2 · TOK */
const c2: Cap[] = [
  [0.4, 4.2, "Tok. Tok. Tok. Right behind me."],
  [4.6, 10.8, "I turned around so slowly I could hear my own neck."],
  [12.4, 16.2, "Leaves. Just leaves. Then… leaves that were breathing."],
  [16.8, 19.6, "A girl. Seven, maybe eight. Red clay on her cheeks."],
  [20.4, 23.6, "She ran. And God help me, so did I."],
  [25.0, 29.0, "Fieldwork rule two: never chase what you're listening for."],
  [29.6, 33.4, "Rule three: break rule two."],
  [36.4, 41.0, "She stopped at the biggest tree I have ever seen. And knocked."],
  [41.4, 42.8, "Not at me. At the tree."],
];
const DUSK = GR.dusk;
const s2: Shot[] = [
  { at: 0, dur: 6.5, plate: "clearing", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.9, fx: 0.495, fy: 0.46 }, punch: [1.2, 1.9, 2.6], hh: 3,
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.5, amp: 3, anchor: "bottom" }],
    fx: [FX.fire(0.57, 0.88, { r: 700, a: 0.3 }), FX.embers(0.57, 0.88, 22), FX.flies(14, { size: 12 }), FX.mist({ alpha: 0.1, y0: 0.6, y1: 0.95, n: 7 }), ...DUSK, FX.vig(0.5)] },
  { at: 6.5, dur: 5.5, plate: "portrait", from: { z: 1.2, fx: 0.62, fy: 0.4 }, fx: [FX.vig(0.5)] },
  { at: 12, dur: 4.5, plate: "wayra_portrait", from: { z: 2.5, fx: 0.1, fy: 0.3 }, to: { z: 2.1, fx: 0.32, fy: 0.3 }, in: "dip", rack: [0.9, 2.6], hh: 4,
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.7, amp: 9, freq: 1.1, anchor: "bottom" }],
    fx: [FX.flies(12, { size: 10 }), FX.motes(24, { size: 5 }), ...DUSK, FX.vig(0.55)] },
  { at: 16.5, dur: 3.5, plate: "wayra_portrait", from: { z: 1.3, fx: 0.64, fy: 0.42 }, to: { z: 1.12, fx: 0.66, fy: 0.4 }, in: "flash", rack: [0.8, 1.5],
    sway: [{ u0: 0, v0: 0, u1: 0.55, v1: 1, amp: 6, anchor: "none" }, { u0: 0.7, v0: 0.4, u1: 0.85, v1: 0.95, amp: 3, anchor: "top" }],
    fx: [FX.motes(24, { size: 6 }), ...DUSK, FX.vig(0.5)] },
  { at: 20, dur: 4, plate: "walk_back", from: { z: 1.0, fx: 0.72, fy: 0.62 }, to: { z: 1.5, fx: 0.62, fy: 0.6 }, in: "whip", hh: 16, ease: E.inQuad,
    fx: [FX.leaves(14, "20,60,30", 700), FX.ferns({ n: 7, scale: 1.1, sway: 2.2 }), ...DUSK, FX.vig(0.5)] },
  { at: 24, dur: 4, plate: "canopy", from: { z: 1.3, fx: 0.75, fy: 0.55 }, to: { z: 1.7, fx: 0.35, fy: 0.62 }, in: "whip", hh: 18, ease: E.inQuad,
    fx: [FX.leaves(18, "15,50,28", 900), FX.shafts(0.6, -0.05, { n: 6, alpha: 0.12 }), ...DUSK, FX.vig(0.5)] },
  { at: 28, dur: 4, plate: "walk_back", from: { z: 1.35, fx: 0.55, fy: 0.64 }, to: { z: 1.9, fx: 0.7, fy: 0.62 }, in: "whip", hh: 18, ease: E.inQuad,
    fx: [FX.leaves(14, "20,60,30", 800), FX.ferns({ n: 8, scale: 1.2, sway: 2.6, seed: 12 }), ...DUSK, FX.vig(0.52)] },
  { at: 32, dur: 4, plate: "canopy", from: { z: 1.8, fx: 0.22, fy: 0.7 }, to: { z: 1.25, fx: 0.55, fy: 0.5 }, in: "whip", hh: 14,
    fx: [FX.leaves(10, "15,50,28", 700), ...DUSK, FX.vig(0.55)] },
  { at: 36, dur: 7, plate: "drum_roots", from: { z: 1.0, fx: 0.5, fy: 0.55 }, to: { z: 1.55, fx: 0.5, fy: 0.7 }, in: "dissolve", inDur: 1.2, punch: [2.0, 2.7, 3.4],
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.45, amp: 3, anchor: "bottom" }],
    fx: [FX.shafts(0.12, 0.05, { ang: 0.9, spread: 0.9, n: 8, alpha: 0.2 }), FX.pulse(0.5, 0.7, [2.0, 2.7, 3.4], { r: 1100, life: 2.6 }), FX.motes(40, { size: 6 }), FX.mist({ alpha: 0.1, n: 6 }), FX.vig(0.45)] },
];
const sTok = shotScene({ id: "tok", label: "Tok", start: T.tok, dur: 43, fin: 0.6, fout: 0.4, bloom: 0.34, caps: c2, ca: (t) => (t > 19.9 && t < 21 ? 7 : 0) }, s2, (c, t, g, A) => {
  if (t >= 6.5 && t < 12.2) eyeInsert(c, t - 6.5, A, { dur: 5.7, reflect: "clearing", blinks: [3.4], tremor: 0.35, pupil: [0.62, 0.3], look: [0.1, 0] });
  if (t > 19.95 && t < 22.5) {
    X.speedLines(c, t - 19.95, W / 2, H / 2, { color: "rgba(0,0,0,0.55)", inner: 360, seed: 3, n: 80 });
  }
  negative(c, Math.max(0, Math.exp(-(t - 20) * 9) * 0.9) * (t >= 20 ? 1 : 0));
  negative(c, Math.max(0, Math.exp(-(t - 16.5) * 12) * 0.7) * (t >= 16.5 && t < 18 ? 1 : 0));
  for (const [t0, x, y, r] of [[25.2, 1380, 300, -0.2], [29.4, 640, 430, 0.15], [33.6, 1100, 250, 0.05]] as const) {
    const a = E.outCubic(prog(t, t0, t0 + 0.2)) * (1 - prog(t, t0 + 0.9, t0 + 1.7));
    handprint(c, x, y, 1.9, a, r);
  }
  void g;
});

/* ======================================================= 3 · TITLE */
const sTitle = titleScene({ id: "title", start: T.title, dur: 8, plate: "drum_roots", from: { z: 1.8, fx: 0.5, fy: 0.85 }, to: { z: 1.05, fx: 0.5, fy: 0.45 }, kicker: "LOST ON EARTH  ·  EPISODE 02", title: "THE ONE WHO KNOCKS", jp: "ノックする者" });

/* ======================================================= 4 · FIRST CONTACT */
const c4: Cap[] = [
  [0.6, 5.0, "Tok. Tok. Tok. Then she waited — like she expected an answer."],
  [5.4, 8.6, "Nobody answered. She didn't flinch. She'd done this before."],
  [9.0, 12.6, "She looked at me the way the jaguar had. Measuring."],
  [13.0, 15.0, "I put my hands where she could see them."],
  [15.8, 19.4, "I don't speak her language. She doesn't speak mine."],
  [19.8, 22.0, "But everybody speaks sound."],
  [22.8, 27.2, "I pressed play. Yesterday's forest came out of a little yellow box."],
  [27.6, 30.4, "She didn't scream. She went completely still."],
  [31.0, 34.6, "Then, very slowly, she stepped out of the leaves."],
  [35.0, 39.0, "And she put her ear against the speaker. As if it might be alive."],
  [40.4, 44.2, "Grandpa put headphones on me when I was six. I never forgot the face I made."],
  [44.6, 47.6, "So I took mine off. And gave them to her."],
];
const s4: Shot[] = [
  { at: 0, dur: 8.5, plate: "drum_roots", from: { z: 1.4, fx: 0.55, fy: 0.74 }, to: { z: 1.25, fx: 0.52, fy: 0.7 }, punch: [1.5, 2.2, 2.9], hh: 3,
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.45, amp: 3 }],
    fx: [FX.shafts(0.12, 0.05, { ang: 0.9, spread: 0.9, n: 8, alpha: 0.22 }), FX.pulse(0.5, 0.72, [1.5, 2.2, 2.9], { r: 900 }), FX.motes(36, { size: 6 }), FX.mist({ alpha: 0.1 }), FX.vig(0.45)] },
  { at: 8.5, dur: 7, plate: "wayra_portrait", from: { z: 1.12, fx: 0.62, fy: 0.4 }, to: { z: 1.5, fx: 0.66, fy: 0.34 }, in: "dissolve", rack: [0.7, 1.4],
    sway: [{ u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 7, anchor: "none", freq: 1.0 }, { u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(34, { size: 7, alpha: 0.6 }), FX.flies(10, { size: 9 }), FX.vig(0.4)] },
  { at: 15.5, dur: 7, plate: "wayra_portrait", from: { z: 1.0, fx: 0.5, fy: 0.5 }, in: "cut", fx: [FX.vig(0.4)] },
  { at: 22.5, dur: 8, plate: "portrait", from: { z: 1.15, fx: 0.62, fy: 0.4 }, to: { z: 2.2, fx: 0.66, fy: 0.9 }, in: "dissolve", ease: E.inOutCubic,
    fx: [FX.lamp(0.665, 0.96, 120, "255,70,60", 0.5, 0.2), FX.motes(30, { size: 8 }), FX.vig(0.4)] },
  { at: 30.5, dur: 9.5, plate: "wayra_portrait", from: { z: 1.45, fx: 0.64, fy: 0.36 }, to: { z: 1.05, fx: 0.58, fy: 0.5 }, in: "dissolve", inDur: 1.0,
    sway: [{ u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 8, anchor: "none", freq: 1.2 }, { u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(40, { size: 7, alpha: 0.7 }), FX.flies(12, { size: 10 }), FX.vig(0.4)] },
  { at: 40, dur: 5.2, plate: "flashback", from: { z: 1.0, fx: 0.5, fy: 0.52 }, to: { z: 1.2, fx: 0.55, fy: 0.55 }, in: "flash", inDur: 0.5,
    fx: [...GR.memory, FX.flies(14, { size: 9 }), FX.motes(26, { size: 6 }), FX.vig(0.5)] },
  { at: 45.2, dur: 3, plate: "wayra_portrait", from: { z: 1.35, fx: 0.62, fy: 0.4 }, to: { z: 1.2, fx: 0.64, fy: 0.38 }, in: "dissolve", rack: [0.8, 1.2],
    sway: [{ u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }],
    fx: [FX.motes(36, { size: 7 }), FX.vig(0.4)] },
];
const sContact = shotScene({ id: "contact", label: "First Contact", start: T.contact, dur: 48, xf: 0.8, fout: 0.6, bloom: 0.3, caps: c4 }, s4, (c, t, g, A) => {
  if (t >= 15.5 && t < 22.6) eyeInsert(c, t - 15.5, A, { dur: 7.1, skin: SKIN_WAYRA, reflect: "portrait", blinks: [4.4], pupil: [0.6, 0.42], look: [-0.15, 0.05], tremor: 0.1 });
  if (t >= 30.5 && t < 40) {
    const a = E.outCubic(prog(t, 31, 32)) * (1 - prog(t, 38.8, 39.8));
    spectro(c, 90, 560, 520, 120, t - 30.5 + 4, { win: 8, label: "PLAYBACK · FIELD 001 · TREE FROGS", alpha: a * 0.95, events: Array.from({ length: 40 }, (_, i) => [i * 0.31 + 0.05, 0.45 + 0.4 * hash(i * 3.3), 0.15 + 0.5 * hash(i * 7.7)] as [number, number, number]) });
  }
  void g;
});

/* ======================================================= 5 · THE COUNTING TREE */
const GROUPS = 80;
const tallyT = (i: number) => 0.3 + 10.5 * Math.pow(i / (GROUPS - 1), 1.5);
const c5: Cap[] = [
  [0.6, 4.4, "She led me back to her camp. To the tree with the marks."],
  [4.8, 7.8, "Hundreds of them. I'd assumed it was a prisoner's count."],
  [8.6, 12.4, "It wasn't. Every cut is a flood."],
  [12.8, 17.0, "One mark each time the river rose. Some are so old the tree has grown over them."],
  [17.4, 21.4, "Generations of one family, counting the river. Counting each other."],
  [21.8, 25.6, "The last mark was fresh. Sap still beading in the cut."],
  [27.4, 31.0, "She touched it and said one word. Again and again. A name, I think."],
  [31.6, 35.4, "Mama Ila. That's what I heard. Mama Ila."],
  [35.8, 39.8, "And suddenly the knocks made sense. I hadn't been led home."],
  [40.2, 43.6, "She wasn't calling me. She was calling someone who never came back."],
];
function tallyWall(c: C2, u: number, A: Assets) {
  cover(c, A.clearing, { z: 3.3, fx: 0.5, fy: 0.5, ox: Math.sin(u * 0.3) * 6 });
  X.tint(c, "rgba(14,8,4,0.55)", "source-over");
  c.save();
  c.translate(Math.sin(u * 0.3) * 6, 0);
  c.lineCap = "round";
  let visible = 0;
  for (let gi = 0; gi < GROUPS; gi++) {
    const row = Math.floor(gi / 20), col = gi % 20;
    const last = gi === GROUPS - 1;
    const t0 = last ? 13.2 : tallyT(gi) - 0.1;
    const marks = last ? 2 : 5;
    const age = lerp(0.4, 1, row / 3);
    const x0 = 100 + col * 84, y0 = 150 + row * 150;
    for (let m = 0; m < marks; m++) {
      const k = E.outCubic(prog(u, t0 + m * 0.09, t0 + m * 0.09 + 0.14));
      if (k <= 0) continue;
      visible++;
      const diag = m === 4;
      const fresh = last ? 1 : 0;
      const ax = diag ? x0 - 6 : x0 + m * 15, ay = diag ? y0 + 76 : y0;
      const bx = diag ? x0 + 66 : ax, by = diag ? y0 : y0 + 78 * k;
      const ex = diag ? lerp(ax, bx, k) : bx, ey = diag ? lerp(ay, by, k) : by;
      c.strokeStyle = `rgba(6,3,1,${0.92 * age + 0.05})`;
      c.lineWidth = 11;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = fresh ? `rgba(255,170,80,${0.95 * (0.7 + 0.3 * Math.sin(u * 4))})` : `rgba(255,214,150,${0.62 * age})`;
      c.lineWidth = fresh ? 4 : 3;
      c.beginPath(); c.moveTo(ax - 2, ay); c.lineTo(ex - 2, ey); c.stroke();
      if (fresh) X.glow(c, (ax + ex) / 2, (ay + ey) / 2, 90, "255,140,50", 0.4 * k);
    }
  }
  c.restore();
  // moss over the oldest rows
  c.save();
  c.globalCompositeOperation = "multiply";
  const mg = c.createLinearGradient(0, 80, 0, 300);
  mg.addColorStop(0, "rgba(40,70,30,0.7)");
  mg.addColorStop(1, "rgba(40,70,30,0)");
  c.fillStyle = mg;
  c.fillRect(0, 80, W, 240);
  c.restore();
  X.vignette(c, 0.6);
  const a = E.outCubic(prog(u, 0.2, 1.2));
  X.mono(c, "THE COUNTING TREE", 100, 76, 20, "#ffb27a", "left", 10, a);
  X.mono(c, "1 CUT  =  1 FLOOD SEASON", W - 100, 76, 16, "#cfeee3", "right", 6, a * 0.8);
  const count = u > 13.2 ? 397 : visible;
  X.mono(c, `SEASONS  ${String(count).padStart(4, "0")}`, W - 100, 150, 44, "#fff0d8", "right", 8, a);
  const fk = E.outCubic(prog(u, 14, 15));
  if (fk > 0) {
    X.mono(c, "LAST CUT  ·  THIS YEAR  ·  SAP STILL WET", W - 100, 190, 16, "#ffb27a", "right", 6, fk);
  }
}
const s5: Shot[] = [
  { at: 0, dur: 8, plate: "clearing", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 2.3, fx: 0.495, fy: 0.56 }, hh: 3,
    fx: [FX.fire(0.57, 0.88, { r: 700, a: 0.25 }), FX.embers(0.57, 0.88, 18), FX.flies(16, { size: 12 }), FX.mist({ alpha: 0.1, y0: 0.6, y1: 0.95, n: 6 }), ...GR.warm, FX.vig(0.45)] },
  { at: 8, dur: 18.5, plate: "clearing", from: { z: 2.3, fx: 0.495, fy: 0.56 }, fx: [] },
  { at: 26.5, dur: 4.2, plate: "grandmother", from: { z: 1.1, fx: 0.4, fy: 0.35 }, to: { z: 1.35, fx: 0.4, fy: 0.3 }, in: "flash", rack: [1, 3],
    fx: [...GR.memory, FX.motes(30, { size: 8 }), FX.vig(0.55)] },
  { at: 30.7, dur: 13.3, plate: "wayra_portrait", from: { z: 1.2, fx: 0.64, fy: 0.4 }, to: { z: 1.6, fx: 0.67, fy: 0.34 }, in: "dissolve", inDur: 1.1, rack: [0.8, 1.8],
    sway: [{ u0: 0.72, v0: 0.35, u1: 0.85, v1: 1, amp: 3, anchor: "top" }, { u0: 0, v0: 0, u1: 0.5, v1: 1, amp: 6, anchor: "none" }],
    fx: [FX.motes(40, { size: 7 }), FX.flies(8, { size: 9 }), ...DUSK, FX.vig(0.45)] },
];
const sCount = shotScene({ id: "count", label: "The Counting Tree", start: T.count, dur: 44, xf: 0.8, fout: 0.6, bloom: 0.3, caps: c5 }, s5, (c, t, _g, A) => {
  if (t >= 8 && t < 26.7) {
    const u = t - 8;
    const a = E.inOutSine(prog(u, 0, 0.7)) * (1 - E.inOutSine(prog(u, 17.9, 18.7)));
    c.save();
    c.globalAlpha = a;
    tallyWall(c, u, A);
    c.restore();
  }
  if (t > 31.5) X.typeText(c, "MAMA ILA", 110, 160, 31.7, t, { font: `120px ${F.title}`, color: "#ffd9b0", per: 0.08, sp: 10, rise: 14 });
  if (t > 31.5) X.mono(c, "祖母 · GRANDMOTHER", 114, 196, 18, "#ffb27a", "left", 8, E.outCubic(prog(t, 33.5, 34.5)));
});

/* ======================================================= 6 · THE KNOCK CODE */
const c6: Cap[] = [
  [0.6, 4.6, "She taught me, one root at a time. Three knocks: I am here."],
  [5.0, 9.0, "Two knocks: I hear you. Everything else is conversation."],
  [10.6, 15.0, "A kapok root is a drum the size of a house. The sound runs through the ground."],
  [15.4, 19.8, "For kilometres. People out here used it before there were maps."],
  [22.4, 26.4, "Which means every knock Wayra made went out across the whole forest."],
  [26.8, 30.6, "Calling a name. Once a minute. For days."],
  [31.0, 34.0, "And never once getting an answer."],
  [34.6, 38.8, "Nine days, I guessed. Maybe ten. She knocked, and listened."],
  [39.2, 43.4, "I couldn't fix that. But I knew one thing I could do."],
];
const EV6: [number, number, number][] = [[2.0, 1, 0.2], [2.6, 1, 0.2], [3.2, 1, 0.2], [6.0, 0.9, 0.34], [6.55, 0.9, 0.34]];
const s6: Shot[] = [
  { at: 0, dur: 10.3, plate: "drum_roots", from: { z: 1.3, fx: 0.55, fy: 0.72 }, to: { z: 1.6, fx: 0.62, fy: 0.72 }, punch: [2.0, 2.6, 3.2, 6.0, 6.55], hh: 3,
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.45, amp: 3 }],
    fx: [FX.shafts(0.12, 0.05, { ang: 0.9, spread: 0.9, n: 8, alpha: 0.22 }), FX.pulse(0.5, 0.72, [2.0, 2.6, 3.2], { r: 900 }), FX.pulse(0.72, 0.75, [6.0, 6.55], { r: 700, rgb: "140,255,220" }), FX.motes(30, { size: 6 }), FX.vig(0.42)] },
  { at: 10.3, dur: 12, plate: "canopy", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.35, fx: 0.52, fy: 0.55 }, in: "dissolve", hh: 2,
    fx: [FX.shafts(0.62, 0.05, { n: 8, alpha: 0.18 }), FX.pulse(0.5, 0.62, [11, 13.5, 16, 18.5], { r: 1500, life: 3.2, squash: 0.4 }), FX.birds(5, { y0: 0.1, y1: 0.3 }), FX.motes(30, { size: 6 }), ...DUSK, FX.vig(0.4)] },
  { at: 22.3, dur: 12.2, plate: "ridge_dawn", from: { z: 1.0, fx: 0.5, fy: 0.55 }, to: { z: 1.5, fx: 0.82, fy: 0.78 }, in: "dissolve", inDur: 1.0,
    sway: [{ u0: 0, v0: 0.45, u1: 1, v1: 0.8, amp: 2, anchor: "none", freq: 0.5 }],
    fx: [FX.pulse(0.82, 0.8, [23, 25, 27, 29, 31, 33], { r: 2000, life: 4, squash: 0.35, rgb: "255,170,100", a: 0.55 }), FX.fog(0.7, 0.15, 0.14), ...DUSK, FX.vig(0.45)] },
  { at: 34.5, dur: 9.5, plate: "drum_roots", from: { z: 1.2, fx: 0.55, fy: 0.74 }, to: { z: 1.85, fx: 0.62, fy: 0.76 }, in: "dissolve", inDur: 1.2,
    fx: [FX.shafts(0.12, 0.05, { ang: 0.9, spread: 0.9, n: 6, alpha: 0.1 }), FX.flies(18, { size: 11 }), FX.motes(30, { size: 6 }), ...GR.night, FX.vig(0.55)] },
];
const sCode = shotScene({ id: "code", label: "The Knock Code", start: T.code, dur: 44, xf: 0.8, fout: 0.6, bloom: 0.3, caps: c6 }, s6, (c, t) => {
  if (t < 10) {
    const a = E.outCubic(prog(t, 0.8, 1.6)) * (1 - prog(t, 9.2, 10));
    spectro(c, W - 640, 110, 520, 130, t, { win: 9, label: "FIELD RECORDER · KNOCK TRACE", alpha: a, events: EV6 });
    const l1 = E.outCubic(prog(t, 3.5, 4.3)) * (1 - prog(t, 5, 5.6));
    X.mono(c, "● ● ●   =   I AM HERE", W - 640, 290, 22, "#ffb27a", "left", 6, l1);
    const l2 = E.outCubic(prog(t, 7, 7.8)) * (1 - prog(t, 9.2, 9.9));
    X.mono(c, "● ●   =   I HEAR YOU", W - 640, 290, 22, "#8fffd6", "left", 6, l2);
  }
  if (t >= 10.3 && t < 22) {
    const a = E.outCubic(prog(t, 11, 12)) * (1 - prog(t, 21, 22));
    X.mono(c, `GROUND-BORNE SIGNAL  ·  ${(Math.min(1, prog(t, 11, 20)) * 4.2).toFixed(1)} KM`, 90, 90, 18, "#ffd2a8", "left", 6, a * 0.9);
  }
  if (t >= 22.3 && t < 34.5) {
    const a = E.outCubic(prog(t, 23, 24)) * (1 - prog(t, 33.5, 34.4));
    const days = Math.min(10, Math.floor(prog(t, 23, 32) * 10));
    X.mono(c, `KNOCK CALLS SENT  ·  ${String(days * 1440 / 10 | 0).padStart(4, "0")}`, 90, 90, 18, "#ffd2a8", "left", 6, a * 0.9);
    X.mono(c, "REPLIES RECEIVED  ·  0000", 90, 120, 18, "#ff8a7a", "left", 6, a * 0.9);
  }
});

/* ======================================================= 7 · FIRE */
const c7: Cap[] = [
  [0.6, 4.4, "Her family's old trade radio had a crank. Thirty turns, thirty seconds of record."],
  [4.8, 9.0, "Battery, one percent. Fourteen. I turned until my shoulder screamed."],
  [10.6, 14.6, "She fell asleep mid-sentence. Hand still on my sleeve."],
  [15.0, 19.0, "I don't know what I am to her. A stranger. A noisemaker. Another lost thing."],
  [19.4, 22.0, "But she's the first person I've seen in four days."],
  [22.8, 26.6, "Grandpa used to say: the opposite of lost isn't found."],
  [27.0, 30.4, "It's heard."],
  [30.8, 33.6, "So tomorrow, we find whoever she's been calling."],
];
const s7: Shot[] = [
  { at: 0, dur: 10.5, plate: "camp_two", from: { z: 1.0, fx: 0.5, fy: 0.5 }, to: { z: 1.35, fx: 0.52, fy: 0.55 }, hh: 2,
    sway: [{ u0: 0, v0: 0, u1: 1, v1: 0.4, amp: 2.5 }],
    fx: [FX.fire(0.5, 0.8, { r: 800, a: 0.36 }), FX.embers(0.5, 0.78, 30), FX.flies(26, { size: 12 }), FX.mist({ alpha: 0.08, y0: 0.7, y1: 0.98, n: 6 }), FX.vig(0.45)] },
  { at: 10.5, dur: 12, plate: "camp_two", from: { z: 1.4, fx: 0.55, fy: 0.55 }, to: { z: 2.35, fx: 0.68, fy: 0.58 }, in: "dissolve", ease: E.inOutCubic,
    fx: [FX.fire(0.5, 0.8, { r: 800, a: 0.34 }), FX.embers(0.5, 0.78, 30), FX.flies(24, { size: 12 }), FX.vig(0.5)] },
  { at: 22.5, dur: 11.5, plate: "camp_two", from: { z: 2.2, fx: 0.55, fy: 0.52 }, to: { z: 2.8, fx: 0.54, fy: 0.5 }, in: "dissolve", inDur: 1.2,
    fx: [FX.fire(0.5, 0.8, { r: 800, a: 0.36 }), FX.embers(0.5, 0.78, 24), FX.flies(24, { size: 12 }), FX.vig(0.55), FX.lamp(0.52, 0.6, 180, "120,255,220", 0.12)] },
];
const sFire = shotScene({ id: "fire", label: "The Fire", start: T.fire, dur: 34, xf: 0.8, fout: 0.6, bloom: 0.34, caps: c7 }, s7, (c, t, g) => {
  if (t < 10.5) {
    const a = E.outCubic(prog(t, 0.5, 1.4)) * (1 - prog(t, 9.6, 10.4));
    const pct = lerp(1, 14, E.inOutSine(prog(t, 1.5, 9)));
    crankHud(c, 90, 520, t, pct, a, prog(t, 1.5, 9) > 0 && prog(t, 1.5, 9) < 1 ? 1 : 0);
  }
  void g;
});

/* ======================================================= 8 · THE ANSWER */
const c8: Cap[] = [
  [0.6, 4.2, "Midnight. I woke up because the forest did."],
  [4.6, 8.4, "No insects. No frogs. The silence again."],
  [9.0, 13.4, "Three knocks. Her usual. She did them without waking up, almost."],
  [13.8, 17.0, "Then she waited. Ten seconds. Fifteen."],
  [17.4, 20.4, "Seventeen. Eighteen. Nineteen."],
  [22.4, 26.0, "Two knocks. Far away. Faint as a heartbeat through a wall."],
  [26.4, 28.6, "I hear you."],
  [29.2, 32.4, "Somebody answered. Somebody out there is still counting."],
  [32.6, 33.9, "Battery: zero."],
];
const EV8: [number, number, number][] = [[10.0, 1, 0.2], [10.7, 1, 0.2], [11.4, 1, 0.2], [21.0, 0.34, 0.3], [21.7, 0.34, 0.3]];
const s8: Shot[] = [
  { at: 0, dur: 8.8, plate: "camp_two", from: { z: 2.2, fx: 0.7, fy: 0.62 }, to: { z: 1.6, fx: 0.6, fy: 0.55 },
    fx: [FX.fire(0.5, 0.8, { r: 600, a: 0.14 }), ...GR.deepNight, FX.flies(6, { size: 8 }), FX.vig(0.6)] },
  { at: 8.8, dur: 11.5, plate: "drum_roots", from: { z: 1.3, fx: 0.55, fy: 0.74 }, to: { z: 1.7, fx: 0.52, fy: 0.72 }, in: "dissolve", inDur: 1.0, punch: [10.0 - 8.8, 10.7 - 8.8, 11.4 - 8.8],
    fx: [FX.pulse(0.5, 0.72, [1.2, 1.9, 2.6], { r: 1000 }), FX.flies(14, { size: 10 }), ...GR.deepNight, FX.lamp(0.72, 0.62, 160, "120,255,220", 0.1), FX.vig(0.6)] },
  { at: 20.3, dur: 6.2, plate: "drum_roots", from: { z: 2.0, fx: 0.52, fy: 0.72 }, to: { z: 2.6, fx: 0.5, fy: 0.72 }, in: "cut",
    fx: [...GR.deepNight, FX.vig(0.65)] },
  { at: 26.5, dur: 8, plate: "camp_two", from: { z: 2.5, fx: 0.72, fy: 0.62 }, to: { z: 1.4, fx: 0.55, fy: 0.5 }, in: "dissolve", inDur: 1.0,
    fx: [FX.fire(0.5, 0.8, { r: 600, a: 0.18 }), ...GR.night, FX.flies(10, { size: 10 }), FX.vig(0.6)] },
];
const sAnswer = shotScene({ id: "answer", label: "The Answer", start: T.answer, dur: 34, xf: 0.8, fout: 0.6, bloom: 0.3, caps: c8 }, s8, (c, t, g, A) => {
  if (t >= 20.3 && t < 26.5) {
    eyeInsert(c, t - 20.3, A, { dur: 6.2, skin: SKIN_WAYRA, reflect: "drum_roots", pupil: [0.38, 0.62], tremor: 0.05, look: [0.1, 0], tears: [3.4, 5.6], warm: "150,200,255", w: 1180 });
  }
  if (t >= 12 && t < 27) {
    const a = E.outCubic(prog(t, 12, 13)) * (1 - prog(t, 26, 27));
    spectro(c, 90, 560, 780, 150, t, { win: 14, label: "LISTENING · 0–8 kHz · GAIN +42 dB", alpha: a, events: EV8, mark: t > 21.6 ? [20.9, 22] : undefined });
    const fl = E.outExpo(prog(t, 21.0, 21.35)) * (1 - prog(t, 23, 24));
    X.mono(c, "UNKNOWN SOURCE · BEARING 041° · ~6 KM", 90, 496, 20, "#ff9a5c", "left", 6, fl);
  }
  if (t > 33) X.black(c, 0);
  void g;
});

/* ======================================================= 9 · NEXT */
const sNext = nextScene({ id: "next", start: T.next, dur: 16, plate: "flooded_dawn", from: { z: 1.0, fx: 0.4, fy: 0.55 }, to: { z: 1.4, fx: 0.4, fy: 0.55 }, num: "EPISODE 03", title: "THE LONG DRUM", jp: "長い太鼓", lines: ["Two knocks. One bearing. Six kilometres of river.", "Follow the sound."] });

/* ======================================================= SCORE */
const Dm: Chord = { b: 38, n: [62, 65, 69, 72] };
const Bb: Chord = { b: 34, n: [58, 62, 65, 69] };
const Fm: Chord = { b: 41, n: [60, 65, 69, 72] };
const Cm: Chord = { b: 36, n: [60, 64, 67, 71] };
const PROG = [Dm, Bb, Fm, Cm];

function compose(k: Kit) {
  const { BAR, BEAT } = k;
  const S = T;
  // ---- ambience
  k.dayBed([[0, 0], [3, 0.2], [26, 0.25], [29, 0.4], [64, 0.3], [70, 0.15], [78, 0.4], [100, 0.4], [102, 0.9], [118, 0.9], [121, 0.3], [128, 0.25], [210, 0.25], [214, 0], [284, 0.1], [300, 0.1]]);
  k.nightBed([[0, 0], [213, 0], [218, 0.5], [247, 0.5], [250, 0.45], [251.5, 0], [272, 0], [276, 0.25], [284, 0.15], [300, 0.15]]);
  k.loopNoise("lowpass", 380, 0.7, [[0, 0], [36, 0], [40, 0.1], [62, 0.1], [66, 0], [296, 0]], k.buses.ambBus, 700);
  k.windBed([[0, 0.3], [130, 0.4], [250, 0.5], [284, 0.3], [300, 0.2]]);
  k.fireBed(S.fire, S.fire + 34, 0.45);
  k.fireBed(S.contact, S.contact, 0);
  // ---- 0 LOG: heartbeat + drone
  k.pad(1, 12, [38, 45, 50], 0.22, { cut: 320, att: 3 });
  for (let t = 2.2; t < 12.8; t += BEAT * 1.15) k.thump(t, 0.5);
  // ---- 1 RECAP: memory piano
  k.rev(S.recap, 1.2, 0.18);
  k.arp(S.recap + 1, S.recap + 16, PROG, BEAT / 2, [0, 1, 2, 3, 2, 1], 0.055);
  k.padBars(S.recap, S.recap + 16, PROG, 0.06, { cut: 700 });
  // ---- 2 TOK
  const T2 = S.tok;
  [1.2, 1.9, 2.6].forEach((o) => k.tok(T2 + o, 0.95));
  k.pad(T2 + 3, 12, [38, 45, 57], 0.16, { cut: 300, att: 3 });
  for (let t = T2 + 12; t < T2 + 19.6; t += 0.62 - (t - T2 - 12) * 0.03) k.thump(t, 0.4);
  k.rev(T2 + 20, 0.6, 0.3); k.boom(T2 + 20, 0.5);
  for (let t = T2 + 20, i = 0; t < T2 + 34; t += BEAT / 2, i++) {
    if (i % 4 === 0) k.taiko(t, 0.5); else if (i % 4 === 2) k.taiko(t, 0.3, 1.5);
    k.tick(t, 0.05);
    if (i % 2 === 0) k.step(t + 0.02, 0.05);
  }
  k.fluteLine([[T2 + 20.2, 74, 0.5], [T2 + 21.6, 74, 0.4], [T2 + 22.4, 77, 0.5], [T2 + 24, 76, 0.5], [T2 + 25.5, 74, 0.4], [T2 + 27, 77, 0.4], [T2 + 28.4, 79, 0.9]], 0.13);
  k.riser(T2 + 31, T2 + 37, 0.25);
  [38, 38.7, 39.4].forEach((o) => { k.tok(T2 + o, 1, 0.95); k.tokFar(T2 + o + 0.9, 0.3); });
  k.choir(T2 + 38, 6, [50, 57, 62], 0.06, "o");
  // ---- 3 TITLE
  k.boom(S.title + 0.6, 0.6);
  k.padBars(S.title, S.title + 8, PROG, 0.12, { att: 1.2 });
  k.choir(S.title + 1, 8, [57, 62, 65, 69], 0.08, "o");
  k.fluteLine([[S.title + 2.4, 74, 2], [S.title + 4.6, 77, 1.2], [S.title + 6, 79, 1.2], [S.title + 7.2, 77, 3]], 0.17);
  k.bell(S.title + 3, 86, 5, 0.04);
  // ---- 4 CONTACT
  const T4 = S.contact;
  [1.5, 2.2, 2.9].forEach((o) => k.tok(T4 + o, 0.9));
  k.pad(T4 + 4, 20, [38, 45, 50], 0.12, { cut: 400 });
  k.fluteLine([[T4 + 9, 74, 2], [T4 + 11.4, 77, 1.5], [T4 + 13.2, 74, 1], [T4 + 14.4, 72, 2.4]], 0.13);
  k.rev(T4 + 22.5, 0.6, 0.12);
  k.arp(T4 + 24, T4 + 48, [Bb, Fm, Cm, Dm], BEAT, [0, 2, 3, 2], 0.06);
  k.bassBars(T4 + 24, T4 + 48, [Bb, Fm, Cm, Dm], 0.12);
  k.fluteLine([[T4 + 31, 79, 2.4], [T4 + 33.8, 77, 1.5], [T4 + 35.5, 74, 2.5]], 0.12);
  k.melody([[T4 + 40.4, 69, 2], [T4 + 42.4, 72, 2], [T4 + 44.4, 74, 2], [T4 + 46.4, 72, 3]], 0.1, 0.025);
  k.choir(T4 + 40.5, 7, [57, 62, 65], 0.06, "u");
  // ---- 5 COUNT
  const T5 = S.count;
  k.pad(T5, 44, [34, 41, 46], 0.12, { cut: 360, att: 3 });
  for (let i = 0; i < GROUPS; i++) {
    const t = T5 + 8 + tallyT(i);
    k.tok(t, 0.07 + 0.1 * (i / GROUPS), 1.9 + 0.5 * hash(i * 3.1));
    if (i % 5 === 4) k.tick(t + 0.02, 0.05);
  }
  k.bell(T5 + 21.2, 81, 7, 0.09); k.thump(T5 + 21.4, 0.55); k.thump(T5 + 22.2, 0.45);
  k.rev(T5 + 26.5, 1.2, 0.25);
  k.choir(T5 + 26.5, 8, [62, 69, 74], 0.07, "a");
  k.fluteLine([[T5 + 28, 74, 1.8], [T5 + 30.2, 72, 1.2], [T5 + 31.6, 69, 4.5]], 0.15);
  k.arp(T5 + 34, T5 + 44, PROG, BEAT, [0, 2, 1, 3], 0.05);
  // ---- 6 CODE
  const T6 = S.code;
  [2.0, 2.6, 3.2].forEach((o) => k.tok(T6 + o, 0.9));
  [6.0, 6.55].forEach((o) => k.tok(T6 + o, 0.8, 1.35));
  k.arp(T6 + 8, T6 + 44, PROG, BEAT / 2, [0, 2, 1, 3, 2, 1], 0.055);
  k.bassBars(T6 + 8, T6 + 44, PROG, 0.12);
  [11, 13.5, 16, 18.5].forEach((o) => { k.tok(T6 + o, 0.8); k.tokFar(T6 + o + 1.1, 0.35); k.tokFar(T6 + o + 2.1, 0.2); });
  for (let t = T6 + 10; t < T6 + 22; t += BAR) k.taiko(t, 0.35);
  k.choir(T6 + 22, 12, [50, 57, 62, 65], 0.07, "o");
  for (let o = 23; o < 34; o += 2) { k.tokFar(T6 + o, 0.3); k.tokFar(T6 + o + 0.4, 0.25); k.tokFar(T6 + o + 0.8, 0.22); }
  k.fluteLine([[T6 + 34.6, 74, 2.4], [T6 + 37.2, 72, 1.5], [T6 + 39, 69, 2], [T6 + 41, 67, 3]], 0.13);
  // ---- 7 FIRE
  const T7 = S.fire;
  for (let t = T7 + 1.5; t < T7 + 9; t += 0.16) { k.tick(t, 0.06); k.tone(t, 0.04, { f0: 900, f1: 500, vel: 0.02, lp: 1500 }); }
  k.padBars(T7 + 9, T7 + 34, [Bb, Fm, Cm, Dm], 0.1, { att: 2 });
  k.melody([[T7 + 10.6, 69, 3], [T7 + 13.6, 72, 3], [T7 + 16.6, 74, 3], [T7 + 19.6, 72, 3], [T7 + 22.6, 69, 4], [T7 + 26.6, 74, 3], [T7 + 29.6, 77, 4]], 0.11, 0.025);
  k.fluteLine([[T7 + 24, 81, 2], [T7 + 26.4, 79, 2], [T7 + 29, 77, 2.5], [T7 + 31.8, 74, 3]], 0.12);
  // ---- 8 ANSWER
  const T8 = S.answer;
  k.pad(T8, 34, [38, 45], 0.14, { cut: 260, att: 4 });
  k.tone(T8 + 4.6, 20, { f0: 41, vel: 0.05, att: 3, dest: k.buses.musicBus });
  [10.0, 10.7, 11.4].forEach((o) => k.tok(T8 + o, 1, 0.9));
  for (let t = T8 + 13.5, g = 0.95; t < T8 + 21; g *= 0.97, t += g) k.thump(t, 0.3 + (t - T8 - 13.5) * 0.02);
  [21.0, 21.7].forEach((o) => k.tokFar(T8 + o, 0.55));
  k.choir(T8 + 22.2, 12, [50, 57, 62, 69], 0.09, "a");
  k.fluteLine([[T8 + 25, 74, 1.4], [T8 + 26.6, 77, 1.4], [T8 + 28.2, 81, 4]], 0.15);
  k.bell(T8 + 22.4, 86, 6, 0.05);
  k.tone(T8 + 32.9, 1.2, { f0: 1300, f1: 40, vel: 0.1, att: 0.01 });
  k.tick(T8 + 33.9, 0.2);
  // ---- 9 NEXT
  const T9 = S.next;
  k.pad(T9, 16, [38, 45, 50, 57], 0.1, { att: 2, cut: 500 });
  k.fluteLine([[T9 + 2, 74, 2], [T9 + 4.4, 77, 1.4], [T9 + 6, 79, 3]], 0.12);
  k.arp(T9 + 8, T9 + 16, PROG, BEAT, [0, 2, 1, 3], 0.04);
  [11, 11.7].forEach((o) => k.tokFar(T9 + o, 0.4));
}

export const ep2: Episode = {
  id: "ep2", num: 2, title: "THE ONE WHO KNOCKS", jp: "ノックする者", duration: DUR, accent: "#ff9a5c",
  tagline: "The knocks were never meant for her. And somewhere upriver, someone is knocking back.",
  scenes: [sLog, sRecap, sTok, sTitle, sContact, sCount, sCode, sFire, sAnswer, sNext],
  art: ["river_dawn", "canopy", "jaguar", "storm", "fungi_night", "clearing", "portrait", "walk_back", "flashback", "ridge_dawn", "wayra_portrait", "drum_roots", "camp_two", "grandmother", "flooded_dawn"],
  synopsis: {
    log: "A black screen, a heartbeat. One percent battery. Someone is standing behind her.",
    recap: "Episode 1 in sixteen seconds, told as memory.",
    tok: "Three knocks. A girl in the leaves. A chase through dusk. A tree the size of a cathedral.",
    title: "The One Who Knocks.",
    contact: "No shared language. One yellow recorder. Two sets of headphones, thirty years apart.",
    count: "The tree's tally marks are not a prisoner's count. They are the river's memory — and one cut is still wet.",
    code: "Three knocks: I am here. Two knocks: I hear you. The forest is a telegraph.",
    fire: "A hand crank, a sleeping child, and the opposite of lost.",
    answer: "Midnight silence. Three knocks. Nineteen seconds. Then — two, from very far away.",
    next: "Next: The Long Drum.",
  },
  brief: [
    ["PREMISE", "The knocks that saved Maya were never for her. They were a child's nightly call to a grandmother who never came back — until, tonight, someone answers."],
    ["MOTIF", "Sound is the only common language. Three knocks = I am here. Two = I hear you. Grandfather's headphones echo across two generations."],
    ["LOOK", "Dusk-violet grade for the chase, firelight amber for intimacy, cold moonlight for the answer. One accent: #ff7a2f."],
    ["HERO MOVES", "Tally-tree counting sequence (397 cuts, one wet); knock-trace spectrogram; ground-borne pulse across the canopy; the 19-second wait."],
  ],
  score: () => renderScore(DUR, 68, 20240702, compose),
};
