import { hash, kf } from "../../film/util";
import { Cue, ScoreSpec, Synth, addMotif, D5, MAJOR } from "../synth";
import type { EpisodeDef } from "../types";
import { BEATS4 } from "./beats";
import { renderEp4 } from "./scene";

const q: Cue[] = [];
const add = (t: number, fire: Cue["fire"]) => q.push({ t, fire });

// 0 — return
add(0.2, (s, at) => { s.song(at, 7, 60, 110, 0.24); s.boom(at, 0.6, 4); });
addMotif(q, 1.6, { vel: 0.14, step: 1.0, cents: -10 });
add(6.2, (s, at) => s.riser(at, 0.8, 300, 6000, 0.22));
add(7, (s, at) => { s.boom(at, 1, 3); s.crack(at, 0.5); });
for (let i = 0; i < 10; i++) add(7.2 + i * 0.75, (s, at) => s.bell(at, D5 + 12 + [0, 3, 7, 10, 12][i % 5], 0.1, 3));
add(14.2, (s, at) => s.riser(at, 0.7, 300, 6000, 0.22));
add(14.9, (s, at) => { s.boom(at, 1, 3.5); s.cry(at, 3, 800, 0.1); });
addMotif(q, 16, { semi: MAJOR, vel: 0.2, step: 0.85 });
for (let i = 0; i < 30; i++) add(17 + i * 0.4 + hash(i) * 0.2, (s, at) => s.bell(at, D5 + 12 + [0, 2, 4, 7, 9, 12][i % 6], 0.07, 2.5));
add(22.6, (s, at) => { s.boom(at, 1, 4); s.braam(at, 0.4, 4); });

// 1 — the brood fights
add(30, (s, at) => { s.boom(at, 1, 3); s.riser(at - 1, 1, 200, 5000, 0.2); });
[37, 45, 52, 59, 67].forEach((tt) => add(tt, (s, at) => { s.crack(at, 0.5); s.boom(at, 0.7, 2); }));
for (let i = 0; i < 20; i++) add(61 + i * 0.35 + hash(i * 2) * 0.2, (s, at) => { s.crack(at, 0.28); s.bell(at, D5 + 12 + (i % 7) * 2, 0.08, 2); });
add(73.6, (s, at) => s.riser(at, 1.4, 150, 8000, 0.3));

// 2 — the lid
add(77.1, (s, at) => { s.boom(at, 1, 5); s.crack(at, 0.9); s.braam(at, 0.5, 5); });
for (let i = 0; i < 40; i++) add(77.4 + i * 0.28 + hash(i) * 0.1, (s, at) => s.crack(at, 0.15 + (i % 4) * 0.03));
add(88, (s, at) => s.song(at, 10, 90, 180, 0.26));
addMotif(q, 90, { semi: MAJOR, vel: 0.2, step: 0.9, oct: 0 });
add(99.6, (s, at) => s.riser(at, 1.6, 100, 5000, 0.28));
add(100.5, (s, at) => { s.boom(at, 1, 5); s.song(at, 10, 45, 90, 0.3); });
add(112, (s, at) => { s.boom(at, 0.8, 4); s.bell(at, D5 - 12, 0.3, 6); });

// 3 — the gift
addMotif(q, 117, { semi: MAJOR, vel: 0.14, step: 1.3, oct: -12 });
add(128, (s, at) => s.song(at, 8, 110, 200, 0.14));
for (let i = 0; i < 24; i++) add(134 + i * 0.66, (s, at) => s.bell(at, D5 + [0, 4, 7, 12, 16, 19][i % 6] + 12 * (i > 14 ? 1 : 0), 0.06 + i * 0.004, 4));
add(147.5, (s, at) => s.riser(at, 3, 200, 3000, 0.16));
add(150.4, (s, at) => { s.boom(at, 0.9, 5); s.crack(at, 0.35); });
[0, 4, 7, 12, 16, 19, 24].forEach((n, i) => add(150.6 + i * 0.14, (s, at) => s.bell(at, D5 + n, 0.24, 6)));
addMotif(q, 153, { semi: MAJOR, vel: 0.26, step: 0.95, oct: 0 });
addMotif(q, 160 - 0.0, { semi: MAJOR, vel: 0.2, step: 0.95, oct: 12 });

// 4 — home
for (let i = 0; i < 50; i++) add(161 + i * 0.22 + hash(i * 2) * 0.1, (s, at) => s.bell(at, D5 + [0, 2, 4, 7, 9, 12, 14, 16][i % 8] - 12 + (i > 26 ? 12 : 0), 0.06, 3));
add(171.5, (s, at) => { s.boom(at, 0.6, 4); s.bell(at, D5 - 12, 0.3, 6); });
addMotif(q, 173, { semi: MAJOR, vel: 0.22, step: 1.0 });
addMotif(q, 181, { semi: [0, 4, 7, 12, 7, 4, 0], vel: 0.18, step: 1.1, oct: 12 });
add(186, (s, at) => s.song(at, 9, 120, 240, 0.12));

// 5 — the top
add(195, (s, at) => s.bell(at, D5, 0.2, 5));
addMotif(q, 196, { semi: MAJOR, vel: 0.14, step: 1.4, oct: 0 });
add(204, (s, at) => s.riser(at, 1.2, 400, 4000, 0.1));
add(205.15, (s, at) => { s.boom(at, 0.4, 2); s.tone(at, 880, 880, 0.2, 0.0001); });
add(207, (s, at) => s.bell(at, D5 - 12, 0.12, 8));

const spec: ScoreSpec = {
  drone: (t) => kf(t, [[0, 0.2], [7, 0.5], [14, 0.3], [22, 0.5], [30, 0.7], [75, 0.5], [77, 1], [100, 0.6], [115, 0.08], [150, 0.2], [160, 0.15], [195, 0.05], [205, 0.1], [206, 0]]),
  tension: (t) => kf(t, [[0, 0.2], [14, 0.5], [30, 0.8], [75, 1], [100, 0.9], [115, 0.1], [150, 0.2], [160, 0.1], [195, 0.1], [205, 0.4], [206, 0]]),
  sub: (t) => kf(t, [[0, 0.3], [30, 0.9], [75, 1], [112, 0.5], [115, 0], [150, 0.5], [156, 0], [195, 0], [205, 0.4], [206, 0]]),
  subFreq: (t) => kf(t, [[0, 36.7], [75, 32.7], [115, 36.7], [195, 36.7]]),
  choir: (t) => kf(t, [[0, 0.2], [14, 0.3], [22, 0.5], [30, 0.4], [75, 0.2], [88, 0.7], [112, 0.6], [117, 0.3], [150, 0.5], [160, 0.8], [180, 0.8], [195, 0.5], [205, 0.1], [206, 0]]),
  pad: (t) => kf(t, [[0, 0.1], [22, 0.5], [75, 0.2], [100, 0.7], [115, 0.4], [140, 0.6], [153, 1], [180, 1], [195, 0.6], [205, 0.2], [206, 0]]),
  sea: (t) => kf(t, [[0, 0], [115, 0], [118, 0.15], [150, 0.1], [160, 0.2], [190, 0.1], [200, 0.05], [206, 0]]),
  seaCut: () => 900,
  heartVol: (t) => kf(t, [[0, 0], [2, 0.5], [30, 0.6], [75, 0.8], [112, 0.5], [115, 0.5], [150, 0.8], [160, 0.7], [195, 0.5], [205, 0.4], [206.8, 0.3], [210, 0.2]]),
  heartKind: (t) => (t < 150 ? 1 : t < 196 ? 2 : 2),
  beats: BEATS4,
  chords: [
    [0, [0, 7, 12, 15, 19]], [14, [0, 5, 12, 15, 17]], [22, [0, 7, 12, 16, 19]], [30, [0, 3, 7, 12, 15]], [52, [-2, 5, 10, 14, 17]], [75, [0, 1, 6, 12, 13]],
    [88, [0, 7, 12, 14, 19]], [100, [0, 6, 12, 18, 24]], [112, [0, 4, 7, 12, 16]], [117, [-5, 0, 4, 7, 12]], [150, [0, 4, 7, 12, 16]], [160, [0, 4, 7, 11, 14]],
    [180, [0, 4, 7, 12, 19]], [195, [0, 4, 7, 12, 16]],
  ],
  cues: q,
  grooves: [
    { t0: 7, t1: 14.8, bpm: 128, kick: "X...x...X...x...", hat: "..x...x...x...x.", vol: 0.6 },
    { t0: 15, t1: 30, bpm: 128, kick: "X...x...X...x.x.", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.xx", arp: "x.x.x.x.x.x.x.x.", arpNotes: [62, 66, 69, 74, 69, 66], vol: 0.7 },
    { t0: 30, t1: 75, bpm: 150, kick: "X..xX..xX..xX.x.", snare: "....X.......X..x", hat: "x.x.x.x.xxx.x.xx", tom: "..x...x...x..x.x", bass: "X.x.xx.xX.x.xx.x", bassNote: 38, arp: "xxxxxxxxxxxxxxxx", arpNotes: [62, 65, 69, 74, 72, 69, 65, 62, 63, 66, 70, 75], vol: 0.95 },
    { t0: 77, t1: 100, bpm: 120, tom: "X..x..x.X..x.x.x", kick: "X.......X.......", vol: 0.8 },
    { t0: 160, t1: 180, bpm: 96, kick: "X.......x.......", hat: "..x...x...x...x.", arp: "x...x...x...x...", arpNotes: [74, 78, 81, 86], vol: 0.4 },
  ],
};

export const EP4: EpisodeDef = {
  id: "ep4",
  roman: "IV",
  title: "The Star Child",
  duration: 210,
  posterAt: 24,
  status: "new",
  accent: "#fcd34d",
  bpmNote: "3:30 · 150 BPM dogfight · finale",
  pitch: "The baby returns, grown, and not alone. The sky stops pretending to be the sky.",
  recap: "A black door opened in the sky, and the Catcher rode a slab to the top of the world. Someone was coming back.",
  chapters: [
    { id: "return", n: 1, title: "Return", start: 0, end: 30, homage: "Ep. III — the eye", logline: "The eye closes. A comet with a body arrives. Behind it, a hundred and ninety more.", vo: [{ at: 15, dur: 8, note: "It has grown. It has brought friends." }] },
    { id: "brood", n: 2, title: "The Brood", start: 30, end: 75, homage: "Star Wars — the trench / Attack on Titan — the swarm", logline: "The lid of the sky has guards. The stars the hunters were, freed in Ep. II, fight for the one who freed them.", vo: [{ at: 46, dur: 8, note: "Painted sky. Real teeth." }] },
    { id: "lid", n: 3, title: "The Sky Stops Pretending", start: 75, end: 115, homage: "Inception — the fold / The Truman Show — the wall", logline: "The tiles flip away. Behind them: an ocean of eyes. The world rolls over, and the sea is above us.", vo: [{ at: 100, dur: 10, note: "The sky was never above. It was just the other side of the water." }] },
    { id: "gift", n: 4, title: "The Gift", start: 115, end: 160, homage: "E.T. — 'be good' / Interstellar — the watch", logline: "The child opens its chest. The star the Catcher gave away returns, carried across still water. Three hearts, one beat.", vo: [{ at: 134, dur: 16, note: "He gave it away. It was kept for him." }] },
    { id: "home", n: 5, title: "Home", start: 160, end: 195, homage: "Ep. I — the breathing lanterns", logline: "Every rope relit, all breathing together. The top of the spire, where it began. A catcher doesn't capture. He cradles.", vo: [{ at: 173, dur: 10, note: "The rule was never 'don't look at the water.' It was 'don't look away.'" }] },
    { id: "top", n: 6, title: "The Top", start: 195, end: 210, homage: "Inception — the totem", logline: "The pilot sleeps. The top is still spinning. We cut before we know.", vo: [{ at: 198, dur: 6, note: "Is it still spinning?" }] },
  ],
  render: renderEp4,
  makeScore: (ctx, outs) => new Synth(ctx, outs, spec),
};
