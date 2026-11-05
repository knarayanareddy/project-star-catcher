import { hash, kf } from "../../film/util";
import { Cue, ScoreSpec, Synth, addMotif, D5, MAJOR } from "../synth";
import type { EpisodeDef } from "../types";
import { BEATS2 } from "./beats";
import { renderEp2 } from "./scene";

const q: Cue[] = [];
const add = (t: number, fire: Cue["fire"]) => q.push({ t, fire });

// 0 — wake: the last beat, the lens, the reflection reaching
add(0.5, (s, at) => { s.boom(at, 0.8, 3); s.braam(at, 0.25, 3); });
addMotif(q, 1.6, { vel: 0.13, step: 0.9, cents: -14, skip: [3] });
add(7.2, (s, at) => s.riser(at, 5.6, 200, 3800, 0.2));
[0, 1, 2, 3].forEach((i) => add(12.6 + i * 0.5, (s, at) => s.whisper(at, 1.2, 0.07)));
add(15.3, (s, at) => { s.boom(at, 1, 3); s.crack(at, 0.6); });

// 1 — plunge (the splash, the title, the speed ramp)
add(18.2, (s, at) => { s.boom(at, 1, 3.4); s.crack(at, 0.7); s.riser(at - 0.6, 0.6, 300, 4000, 0.2); });
[0, 3, 7, 10, 12, 15].forEach((n, i) => add(18.5 + i * 0.12, (s, at) => s.bell(at, D5 + n - 12, 0.2, 4)));
add(22.4, (s, at) => { s.crack(at, 0.5); s.riser(at, 7, 150, 2400, 0.14); });
add(31, (s, at) => s.song(at, 7, 70, 120, 0.12));
add(34, (s, at) => s.whisper(at, 4, 0.08));
add(39.4, (s, at) => s.riser(at, 0.9, 400, 3000, 0.16));

// 2 — the empty cockpit, and what's inside
add(40.3, (s, at) => s.ping(at, 86, 0.14));
add(42.5, (s, at) => s.ping(at, 86, 0.1));
add(43.6, (s, at) => { s.bell(at, D5 + 6, 0.2, 4); s.whisper(at, 1.5, 0.08); });
addMotif(q, 44.6, { vel: 0.12, step: 0.34, oct: 12 }); // tiny lullaby, hummed by the lantern

// 3 — the seabed
add(47.4, (s, at) => { s.boom(at, 1, 3); s.crack(at, 0.4); });
[49.2, 51.6, 53.8].forEach((t, i) => add(t, (s, at) => { s.ping(at, 91 - i * 3, 0.2); s.boom(at, 0.2, 1.6); }));
add(55, (s, at) => s.riser(at, 1.0, 200, 2400, 0.14));

// 4 — the river of lanterns
[0, 3, 7, 10, 12, 15, 19, 22].forEach((n, i) => add(56 + i * 0.42, (s, at) => s.bell(at, D5 + n - 12, 0.15 + i * 0.012, 5)));
addMotif(q, 60.4, { vel: 0.17, step: 0.8, cents: -6 });
addMotif(q, 66, { vel: 0.1, step: 0.5, oct: 12, skip: [4] });

// 5 — they gather
add(68, (s, at) => s.whisper(at, 6, 0.1));
addMotif(q, 70.4, { vel: 0.2, step: 0.9 });
add(76, (s, at) => { s.riser(at, 3, 300, 2800, 0.18); });
add(79.2, (s, at) => { s.braam(at, 0.55, 3); s.boom(at, 0.9, 3); });

// 6 — eyes in the dark
add(82.4, (s, at) => s.song(at, 5, 55, 85, 0.2));
for (let i = 0; i < 20; i++) add(82 + Math.pow(i / 20, 0.62) * 6, (s, at) => s.tom(at, 0.45, 62 + (i % 4) * 7));
add(86, (s, at) => { s.song(at, 5, 45, 70, 0.28); s.riser(at, 4, 100, 1800, 0.2); });
add(89.2, (s, at) => s.riser(at, 0.8, 300, 5000, 0.2));

// 7 — the chase
add(90, (s, at) => { s.boom(at, 1, 2.4); s.braam(at, 0.4, 2.4); });
add(94.8, (s, at) => s.boom(at, 0.7, 1.6));
add(98.2, (s, at) => s.riser(at, 1.5, 200, 3500, 0.2));
add(99.85, (s, at) => { s.boom(at, 0.9, 2); s.crack(at, 0.3); });
add(101.2, (s, at) => { s.crack(at, 0.8); s.boom(at, 1, 2.6); });
[103, 103.5, 104, 104.25, 104.5, 104.75, 105, 105.12, 105.25, 105.38, 105.5, 105.62, 105.75, 105.87].forEach((t, i) => add(t, (s, at) => s.tom(at, 0.5 + i * 0.03, 90 - (i % 3) * 6)));

// 8 — the net, in slow-motion
add(108.3, (s, at) => s.riser(at, 2.2, 300, 5200, 0.22));
add(110.55, (s, at) => { s.crack(at, 0.9); s.boom(at, 1, 3); });
add(111.2, (s, at) => s.tone(at, 880, 220, 3, 0.12, "sawtooth"));
add(113.85, (s, at) => { s.boom(at, 1, 4.5); s.braam(at, 0.4, 4); });
[0, 7, 12, 16, 19, 24, 28].forEach((n, i) => add(114.1 + i * 0.1, (s, at) => s.bell(at, D5 + n, 0.2, 5)));
add(114.4, (s, at) => s.cry(at, 5, 760, 0.1));

// 9 — freed
addMotif(q, 119, { semi: MAJOR, vel: 0.22, step: 0.9 });
for (let i = 0; i < 24; i++) add(119 + i * 0.36 + hash(i) * 0.2, (s, at) => s.bell(at, D5 + [0, 2, 4, 7, 9, 12][i % 6] + 12 * (i % 3 === 2 ? 1 : 0), 0.08, 3));
add(124, (s, at) => s.ping(at, 98, 0.1));

// 10 — the drowned village relights
for (let i = 0; i < 46; i++) add(129 + i * 0.22 + hash(i * 3) * 0.12, (s, at) => s.bell(at, D5 + [0, 3, 5, 7, 10, 12, 15][i % 7] + (i > 24 ? 12 : 0), 0.07 + i * 0.001, 3));
add(131, (s, at) => s.song(at, 8, 110, 220, 0.12));
add(139.5, (s, at) => s.riser(at, 2.4, 200, 3200, 0.14));

// 11 — the heart
add(142.2, (s, at) => s.boom(at, 0.4, 2.5));
add(145.9, (s, at) => { s.bell(at, D5, 0.3, 5); s.riser(at, 0.6, 600, 5000, 0.2, true); });
add(147.7, (s, at) => s.crack(at, 0.3));
addMotif(q, 148.4, { semi: MAJOR, vel: 0.26, step: 0.85, oct: 0 });
add(149.1, (s, at) => s.boom(at, 0.6, 3));

// 12 — surge
add(152, (s, at) => { s.boom(at, 0.9, 3); s.riser(at, 10, 120, 7000, 0.26); });
add(161.8, (s, at) => { s.boom(at, 1, 4); s.crack(at, 0.8); });

// 13 — above: the mirror, the slab
add(165.4, (s, at) => s.riser(at, 1.2, 200, 4000, 0.16, true));
add(168.5, (s, at) => { s.braam(at, 0.45, 5); s.ping(at, 74, 0.2); });
add(172.2, (s, at) => { s.boom(at, 1, 5); s.song(at, 6, 40, 40, 0.25); });
add(174.4, (s, at) => s.boom(at, 0.7, 4));
addMotif(q, 174.4, { vel: 0.18, step: 1.3, cents: -30, drop: 80, skip: [2], semi: [0, 3, 7, 6, 3, 2, 0] });
add(179.5, (s, at) => s.bell(at, D5 - 12, 0.1, 5));

const spec: ScoreSpec = {
  drone: (t) => kf(t, [[0, 0], [0.5, 0.5], [8, 0.15], [15, 0.35], [18.2, 0.75], [30, 0.4], [40, 0.5], [46, 0.15], [56, 0.1], [68, 0.2], [82, 0.1], [90, 0.7], [106, 0.35], [114, 0.55], [118, 0.05], [128, 0.15], [142, 0.3], [152, 0.7], [162, 0.2], [172, 0.6], [179, 0.05]]),
  tension: (t) => kf(t, [[0, 0.1], [15, 0.6], [30, 0.4], [46, 0.3], [82, 0.6], [90, 1], [114, 0.8], [118, 0.1], [142, 0.1], [152, 0.9], [162, 0.4], [172, 0.8], [180, 0.2]]),
  sub: (t) => kf(t, [[0, 0], [0.5, 0.9], [4, 0.2], [18.2, 1], [30, 0.4], [47.4, 0.8], [56, 0.1], [79, 0.8], [86, 1], [90, 1], [114, 0.8], [118, 0], [142, 0.4], [152, 0.9], [162, 0.2], [172, 1], [180, 0]]),
  subFreq: (t) => kf(t, [[0, 36.7], [82, 30], [118, 36.7], [172, 32.7]]),
  choir: (t) => kf(t, [[0, 0], [62, 0], [70, 0.3], [79, 0.4], [80, 0], [118, 0.1], [124, 0.4], [142, 0.4], [150, 0.7], [162, 0.7], [166, 0.2], [172, 0.5], [180, 0]]),
  pad: (t) => kf(t, [[0, 0], [118, 0], [126, 0.5], [142, 0.5], [162, 0.9], [166, 0.2], [180, 0]]),
  sea: (t) => kf(t, [[0, 0.12], [16, 0.2], [18.2, 0.8], [30, 0.5], [46, 0.15], [90, 0.2], [162, 0.3], [180, 0.1]]),
  seaCut: (t) => kf(t, [[0, 600], [18.2, 3000], [30, 700], [46, 300], [150, 500], [162, 2400], [180, 800]]),
  heartVol: (t) => kf(t, [[0, 0], [0.5, 0.6], [13, 0.25], [46, 0.35], [82, 0.5], [118, 0.5], [142, 0.85], [162, 0.7], [172, 0.2], [180, 0]]),
  heartKind: (t) => (t < 142 ? 1 : 2),
  beats: BEATS2,
  chords: [
    [0, [0, 7, 12, 15, 19]], [16, [0, 1, 7, 12, 13]], [46, [-2, 5, 10, 14, 17]], [68, [0, 7, 12, 15, 19]], [82, [0, 1, 6, 12, 13]],
    [118, [0, 7, 12, 16, 19]], [142, [0, 4, 7, 12, 16]], [162, [-2, 5, 10, 14, 17]], [172, [0, 3, 6, 12, 15]],
  ],
  cues: q,
  grooves: [
    { t0: 18.4, t1: 30, bpm: 124, tom: "x..x..x.x..x..x.", hat: "..x...x...x...x.", vol: 0.7 },
    { t0: 32, t1: 40, bpm: 124, kick: "X.......x.......", hat: "x.x.x.x.x.x.x.x.", vol: 0.45 },
    { t0: 90, t1: 106, bpm: 140, kick: "X...x..xX...x.x.", snare: "....X.......X..x", hat: "x.x.x.x.x.x.x.xx", bass: "X..x..x.X..x.x..", bassNote: 38, arp: "x.x.x.x.x.x.x.x.", arpNotes: [62, 65, 69, 72, 69, 65], vol: 0.85 },
    { t0: 152, t1: 162, bpm: 150, kick: "X...X...X...X...", hat: "..x...x...x...x.", arp: "xxxxxxxxxxxxxxxx", arpNotes: [62, 66, 69, 74, 69, 66, 62, 66, 69, 74, 78, 74], bass: "x.x.x.x.x.x.x.x.", bassNote: 38, vol: 0.8 },
  ],
};

export const EP2: EpisodeDef = {
  id: "ep2",
  roman: "II",
  title: "The Long Descent",
  duration: 180,
  posterAt: 4.2,
  status: "new",
  accent: "#5eead4",
  bpmNote: "3:00 · cut every 4–10 s · 140 BPM chase",
  pitch: "The empty mech wakes underwater, piloted by no one. Below the drowned sky, the village's lost lanterns are still burning in the dark, and they want to go home.",
  recap: "Ep. I ended on a single heartbeat in a machine with no heart, and a sea that reflects the true sky.",
  chapters: [
    { id: "wake", n: 1, title: "Wake", start: 0, end: 16, homage: "Ep. I — the final beat", logline: "The empty machine opens its eye. The reflection reaches back.", vo: [{ at: 4, dur: 6, note: "Nobody is home, and yet." }] },
    { id: "plunge", n: 2, title: "The Plunge", start: 16, end: 46, homage: "Contact — the fall / Alien — the empty chair", logline: "Through the mirror, past the roots of the village, down. Nobody is steering. Or someone very small is.", vo: [{ at: 33, dur: 8, note: "How far down does a drowned sky go?" }] },
    { id: "lanterns", n: 3, title: "The Lost Lanterns", start: 46, end: 82, homage: "Spirited Away — the procession", logline: "Sonar finds a river of amber light in the dark. They have eyes. They have been waiting.", vo: [{ at: 58, dur: 8, note: "The lanterns that went out in Ep. I never went out." }] },
    { id: "hunters", n: 4, title: "The Hunters", start: 82, end: 128, homage: "Mad Max: Fury Road — the chase / Akira — the net", logline: "Things with lures follow the light. Run. Stand. Cast the net, and find out what the hunters were.", vo: [{ at: 119, dur: 8, note: "They were never monsters. They were stars, caged." }] },
    { id: "village", n: 5, title: "The Drowned Village", start: 128, end: 162, homage: "Laputa — the garden / Ep. I — the Lantern Heart", logline: "Every rope relit. The pilot becomes the heart. Then every lantern goes home, all at once.", vo: [{ at: 143, dur: 8, note: "A new heart is not the old one. It beats anyway." }] },
    { id: "above", n: 6, title: "Above", start: 162, end: 180, homage: "2001 — the slab", logline: "The mirror gives them back as stars. In the reflected sky, a perfect black rectangle.", vo: [{ at: 169, dur: 8, note: "The sky has a door, and it is black." }] },
  ],
  render: renderEp2,
  makeScore: (ctx, outs) => new Synth(ctx, outs, spec),
};
