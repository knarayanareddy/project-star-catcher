import { kf } from "../../film/util";
import { Cue, ScoreSpec, Synth, addMotif, D5, MAJOR } from "../synth";
import type { EpisodeDef } from "../types";
import { BEATS3 } from "./beats";
import { renderEp3 } from "./scene";

const q: Cue[] = [];
const add = (t: number, fire: Cue["fire"]) => q.push({ t, fire });

// 0 — the slab rises
add(0.6, (s, at) => s.riser(at, 3.4, 60, 900, 0.18));
add(1.2, (s, at) => { s.boom(at, 0.8, 4); s.song(at, 8, 40, 40, 0.3); });
add(4.0, (s, at) => { s.boom(at, 0.9, 3); s.ping(at, 62, 0.14); });
add(6.2, (s, at) => { s.boom(at, 1, 3.5); s.ping(at, 67, 0.14); });
addMotif(q, 7.2, { vel: 0.1, step: 1.1, cents: -20, skip: [3, 4] });
add(9.4, (s, at) => { s.crack(at, 0.6); s.riser(at - 0.5, 0.5, 400, 3000, 0.16); });
[0, 7, 12, 16].forEach((n, i) => add(11 + i * 0.35, (s, at) => s.bell(at, D5 + n - 12, 0.16, 5)));
add(10.5, (s, at) => s.boom(at, 0.5, 2.4));

// 1 — title
add(17.4, (s, at) => s.riser(at, 1, 300, 4000, 0.15));
add(18.2, (s, at) => { s.boom(at, 1, 3.4); s.braam(at, 0.35, 3.5); });
addMotif(q, 19, { vel: 0.18, step: 0.8, cents: -10 });
add(22.6, (s, at) => { s.crack(at, 0.5); s.boom(at, 0.8, 3); });
add(27.2, (s, at) => s.riser(at, 0.8, 200, 4000, 0.18));

// 2 — four seasons, a cut every 12 seconds, a new colour of music for each
const SEAS_NOTES = [
  [62, 66, 69, 73, 74, 73, 69, 66],   // spring: bright D major lift
  [62, 67, 71, 74, 79, 74, 71, 67],   // summer: wide, open
  [62, 65, 68, 71, 74, 71, 68, 65],   // autumn: diminished lean
  [62, 65, 69, 70, 69, 65, 62, 58],   // winter: sparse D minor
];
for (let i = 0; i < 4; i++) {
  const t0 = 28 + i * 12;
  add(t0 - 0.35, (s, at) => s.riser(at, 0.35, 600, 6000, 0.16, false));
  add(t0, (s, at) => { s.boom(at, 0.85, 2.6); s.crack(at, 0.35); });
  [0, 7, 12, 16].forEach((n, j) => add(t0 + 0.1 + j * 0.12, (s, at) => s.bell(at, D5 + n + (i === 2 ? -1 : 0) - 12, 0.14, 4)));
  add(t0 + 6, (s, at) => s.tom(at, 0.5, 60));
}
addMotif(q, 31, { semi: MAJOR, vel: 0.16, step: 0.9 });
addMotif(q, 55, { vel: 0.15, step: 0.9, cents: -12 });
addMotif(q, 67, { vel: 0.12, step: 1.2, skip: [2, 5] });
add(73.8, (s, at) => s.riser(at, 2.2, 200, 5000, 0.2));

// 3 — the mother descends
add(76, (s, at) => { s.boom(at, 0.8, 4); s.song(at, 9, 55, 95, 0.26); });
add(82, (s, at) => s.riser(at, 4, 100, 2200, 0.2));

// 4 — the belly map: eight stars, eight bells, each one a note of the lullaby
const CHILD_NOTES = [0, 3, 7, 5, 3, 2, 0, 12];
for (let i = 0; i < 8; i++) add(94 + i * 0.9, (s, at) => s.bell(at, D5 + 12 + CHILD_NOTES[i], 0.2, 4));
addMotif(q, 88, { vel: 0.12, step: 0.9, oct: -12 });
add(100.8, (s, at) => { s.boom(at, 0.5, 3); s.bell(at, D5 + 7, 0.3, 5); });
add(103.2, (s, at) => s.riser(at, 1.4, 300, 3500, 0.14));
addMotif(q, 105, { semi: MAJOR, vel: 0.2, step: 0.8, oct: 12 });
add(111.6, (s, at) => s.boom(at, 0.6, 3));

// 5 — contact
add(112.4, (s, at) => s.song(at, 8, 60, 80, 0.2));
add(122.4, (s, at) => { s.crack(at, 0.8); s.boom(at, 1, 4); });

// 6 — vision
add(124, (s, at) => { s.braam(at, 0.5, 4); s.riser(at - 0.4, 0.4, 200, 6000, 0.2); });
[124.3, 128.2, 132.1, 136].forEach((tt, i) => add(tt, (s, at) => { s.boom(at, 0.6, 2); s.bell(at, D5 + [0, 7, 12, 3][i], 0.28, 4); s.cry(at, 2.5, 600 + i * 120, 0.06); }));
add(139.2, (s, at) => s.riser(at, 0.8, 200, 7000, 0.22));

// 7 — the door
add(140, (s, at) => s.boom(at, 0.9, 4));
add(142.2, (s, at) => { s.boom(at, 0.9, 5); s.braam(at, 0.4, 4); });
add(146, (s, at) => s.song(at, 5, 120, 240, 0.2));

// 8 — the rise
add(150, (s, at) => { s.boom(at, 1, 3); s.riser(at, 17, 80, 8000, 0.28); });
add(167.6, (s, at) => { s.boom(at, 1, 4); s.crack(at, 0.7); });

// 9 — the eye
add(168.6, (s, at) => s.song(at, 8, 70, 140, 0.28));
add(170, (s, at) => s.bell(at, D5 - 12, 0.3, 6));
add(174, (s, at) => { s.boom(at, 1, 5); s.braam(at, 0.4, 5); });
addMotif(q, 175.4, { vel: 0.16, step: 1.2, cents: -20, skip: [4], oct: 0 });

const spec: ScoreSpec = {
  drone: (t) => kf(t, [[0, 0.1], [1.2, 0.6], [10, 0.2], [17, 0.4], [28, 0.1], [76, 0.3], [86, 0.05], [112, 0.3], [124, 0.7], [140, 0.5], [150, 0.8], [168, 0.4], [174, 0.7], [179, 0.05]]),
  tension: (t) => kf(t, [[0, 0.1], [9, 0.5], [28, 0.3], [76, 0.4], [86, 0.1], [112, 0.5], [124, 0.9], [140, 0.7], [150, 1], [168, 0.5], [174, 0.9], [180, 0.2]]),
  sub: (t) => kf(t, [[0, 0], [1.2, 0.9], [10, 0.3], [18, 0.8], [28, 0.2], [76, 0.7], [86, 0], [112, 0.5], [124, 0.7], [150, 0.9], [168, 0.6], [174, 1], [180, 0]]),
  subFreq: (t) => kf(t, [[0, 36.7], [76, 32.7], [124, 36.7], [150, 41.2], [174, 32.7]]),
  choir: (t) => kf(t, [[0, 0], [17, 0], [20, 0.3], [27, 0.3], [28, 0], [76, 0.3], [86, 0.5], [100, 0.2], [112, 0.4], [140, 0.5], [146, 0.8], [150, 0.4], [168, 0.7], [180, 0]]),
  pad: (t) => kf(t, [[0, 0], [28, 0], [34, 0.3], [76, 0.3], [86, 0.7], [112, 0.4], [124, 0.8], [140, 0.4], [168, 0.9], [180, 0]]),
  sea: (t) => kf(t, [[0, 0.2], [10, 0.25], [28, 0.15], [64, 0.02], [76, 0.1], [86, 0], [112, 0.1], [124, 0], [140, 0.3], [150, 0.1], [180, 0]]),
  seaCut: () => 700,
  heartVol: (t) => kf(t, [[0, 0], [10.4, 0.5], [28, 0.5], [86, 0.45], [112, 0.5], [124, 0.6], [150, 0.8], [168, 0.7], [174, 0.3], [180, 0]]),
  heartKind: (t) => (t >= 86 && t < 112 ? 1 : 2),
  beats: BEATS3,
  chords: [
    [0, [0, 7, 12, 15, 19]], [17, [0, 5, 12, 14, 19]], [28, [0, 4, 7, 12, 16]], [40, [0, 7, 11, 14, 19]], [52, [-2, 3, 6, 10, 15]], [64, [0, 3, 7, 10, 12]],
    [76, [0, 1, 7, 12, 13]], [86, [-5, 0, 3, 7, 12]], [112, [0, 7, 12, 14, 19]], [124, [0, 6, 12, 13, 18]], [140, [0, 5, 12, 17, 19]],
    [150, [0, 7, 12, 15, 19]], [168, [0, 3, 7, 12, 15]], [174, [-2, 5, 10, 13, 17]],
  ],
  cues: q,
  grooves: [
    { t0: 28, t1: 40, bpm: 120, kick: "X.......x...x...", hat: "..x...x...x...x.", arp: "x.x.x.x.x.x.x.x.", arpNotes: SEAS_NOTES[0], vol: 0.55 },
    { t0: 40, t1: 52, bpm: 132, kick: "X...x...X...x.x.", snare: "........X.......", hat: "x.x.x.x.x.x.x.xx", arp: "x.xxx.x.x.xxx.x.", arpNotes: SEAS_NOTES[1], vol: 0.65 },
    { t0: 52, t1: 64, bpm: 112, kick: "X..x....X..x..x.", tom: "....x.......x.x.", hat: "x...x...x...x.x.", arp: "x..x..x.x..x..x.", arpNotes: SEAS_NOTES[2], vol: 0.6 },
    { t0: 64, t1: 76, bpm: 96, kick: "X.......X.......", hat: "..x...x...x...x.", arp: "x.......x.......", arpNotes: SEAS_NOTES[3], vol: 0.5 },
    { t0: 124.4, t1: 140, bpm: 130, tom: "x..x..x.x..x..x.", hat: "x.x.x.x.x.x.x.x.", arp: "xxxxxxxxxxxxxxxx", arpNotes: [74, 77, 81, 86, 81, 77], vol: 0.5 },
    { t0: 150, t1: 168, bpm: 154, kick: "X...X...X...X...", snare: "....X.......X..x", hat: "x.x.x.x.x.x.x.xx", tom: "...............x", bass: "x.x.xx.x.x.xx.x.", bassNote: 38, arp: "x.x.x.x.x.x.x.x.", arpNotes: [62, 65, 69, 74, 72, 69, 65, 62], vol: 0.9 },
  ],
};

export const EP3: EpisodeDef = {
  id: "ep3",
  roman: "III",
  title: "Monolith Season",
  duration: 180,
  posterAt: 19,
  status: "new",
  accent: "#a5b4fc",
  bpmNote: "3:00 · four-season time-lapse · 154 BPM climb",
  pitch: "A black slab rises from the reflected sky. The Mother's map has a second figure on it. This one is a child.",
  recap: "The lanterns went home and the mirror gave them back as stars, and in the reflected sky, a perfect black rectangle.",
  chapters: [
    { id: "slab", n: 1, title: "It Rises", start: 0, end: 28, homage: "2001 — the dawn of man", logline: "Water sheets off a black rectangle. A new heart wakes beside it. The sky turns to look.", vo: [{ at: 12, dur: 8, note: "Something arrived overnight. It does not move. It does not need to." }] },
    { id: "seasons", n: 2, title: "Four Seasons", start: 28, end: 76, homage: "Koyaanisqatsi — time-lapse", logline: "Every time he gets closer, a season passes. Spring, summer, autumn, winter. The slab is the only thing that does not change.", vo: [{ at: 30, dur: 8, note: "Each season, a year. Each year, a step." }] },
    { id: "figure", n: 3, title: "The Second Figure", start: 76, end: 112, homage: "Ep. I — the belly map", logline: "The Mother comes down to read it. Her constellation draws itself again: the Catcher, and next to him, holding his hand, someone smaller.", vo: [{ at: 96, dur: 10, note: "The sky always knew there were two." }] },
    { id: "touch", n: 4, title: "Contact", start: 112, end: 150, homage: "E.T. — the finger / 2001 — the star gate", logline: "He touches his own reflection. Visions: a falling star, a figure of stars, a child, a heart inside a door. The door opens.", vo: [{ at: 125, dur: 12, note: "He remembers. Or he is being told. It is hard to tell the difference." }] },
    { id: "rise", n: 5, title: "The Rise", start: 150, end: 180, homage: "Akira — the ascent", logline: "The slab climbs, with him on top. Lanterns follow. At the summit, an eye opens in the light.", vo: [{ at: 169, dur: 8, note: "Someone is coming back." }] },
  ],
  render: renderEp3,
  makeScore: (ctx, outs) => new Synth(ctx, outs, spec),
};
