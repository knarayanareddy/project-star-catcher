// The film as data. Each chapter is a self-contained movement; a future episode
// can reuse the engine, the palette, the heartbeat spine and the motifs below.

export interface Chapter {
  id: string;
  n: number;
  title: string;
  start: number;
  end: number;
  homage: string;
  logline: string;
  /** space left in the mix for narration, and what it should do */
  vo: { at: number; dur: number; note: string }[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: "lanterns",
    n: 1,
    title: "The Breathing Lanterns",
    start: 0,
    end: 34,
    homage: "E.T. — a silhouette crossing the moon",
    logline:
      "A village of stone pillars lights its lanterns, one by one. They breathe together. Something below the sea is counting.",
    vo: [
      { at: 3, dur: 14, note: "Intimate, almost a bedtime story. Set the world, the old fisherman, the rule: never look at the water at night." },
      { at: 20, dur: 9, note: "A small wrongness. The lanterns lean toward the sky." },
    ],
  },
  {
    id: "starfall",
    n: 2,
    title: "Starfall",
    start: 34,
    end: 66,
    homage: "2001 — the red lens",
    logline: "The sky cracks like glass. The stars blink. One of them is falling slowly, and crying.",
    vo: [
      { at: 37, dur: 11, note: "The night of the starfall. Stars are not supposed to blink." },
      { at: 56, dur: 8, note: "The lens turns red. The old machine has made a decision." },
    ],
  },
  {
    id: "net",
    n: 3,
    title: "The Net of Light",
    start: 66,
    end: 104,
    homage: "E.T. — the touching finger",
    logline: "The Star Catcher casts his net. What he pulls up has too many eyes, and it is not afraid of him.",
    vo: [
      { at: 70, dur: 14, note: "Ritual. The catcher's craft, passed down; how a net of light is thrown." },
      { at: 91, dur: 11, note: "The touch. Tender, then dread: it knows his name." },
    ],
  },
  {
    id: "mother",
    n: 4,
    title: "Mother",
    start: 104,
    end: 144,
    homage: "Interstellar — silence in space / 2001 — the open eye",
    logline: "The stars go out. The moon opens its eye. Sixteen hundred metres of mother come down to listen.",
    vo: [
      { at: 108, dur: 12, note: "Hushed. The dead calm. Everything holds its breath." },
      { at: 128, dur: 12, note: "Awe turning to horror. The lanterns were never lanterns." },
    ],
  },
  {
    id: "fold",
    n: 5,
    title: "The Fold",
    start: 144,
    end: 184,
    homage: "Inception — the city folds, the spinning top",
    logline: "She wrecks the village to get her child back, and the world begins to fold. Is the top still spinning?",
    vo: [
      { at: 150, dur: 10, note: "Urgent, breathless. Sea becomes sky; sky becomes floor." },
      { at: 170, dur: 11, note: "The totem. Doubt. Whose dream is this?" },
    ],
  },
  {
    id: "climb",
    n: 6,
    title: "Miller's Tide",
    start: 184,
    end: 212,
    homage: "Interstellar — the wave, the ticking clock",
    logline: "The only way up is the tallest pillar. Every tick is a year. A wall of water stands up behind him, silent.",
    vo: [{ at: 187, dur: 22, note: "Time dilation. The ticking is the narrator's heartbeat. Years pass per rung." }],
  },
  {
    id: "threshold",
    n: 7,
    title: "The Threshold",
    start: 212,
    end: 252,
    homage: "Interstellar — Gargantua / 2001 — Star Gate, the white room, the monolith",
    logline: "At the summit the sky is a door. Through it: light, eyes, a white room, a black slab, and a very old man.",
    vo: [
      { at: 216, dur: 8, note: "Whispered. The sky opens." },
      { at: 238, dur: 12, note: "The room. He sees himself age. He sees what the heart was." },
    ],
  },
  {
    id: "heart",
    n: 8,
    title: "The Lantern Heart",
    start: 252,
    end: 280,
    homage: "E.T. — 'be good' / the gift",
    logline: "The child is too weak to fly. The old machine opens its chest and gives away the only light it has.",
    vo: [{ at: 256, dur: 20, note: "The gift. Tender, final. He was a star once too." }],
  },
  {
    id: "drowned",
    n: 9,
    title: "The Drowned Sky",
    start: 280,
    end: 300,
    homage: "Inception — the totem, the cut to black",
    logline: "The sea reflects the true sky, and the true sky is looking back. Something is still awake in the empty machine.",
    vo: [{ at: 283, dur: 14, note: "The hook. The stars were never falling. They were being released." }],
  },
];

export const chapterAt = (t: number) => CHAPTERS.find((c) => t >= c.start && t < c.end) ?? CHAPTERS[CHAPTERS.length - 1];

export interface Episode {
  n: string;
  title: string;
  status: "released" | "next" | "planned";
  pitch: string;
}
export const SERIES: Episode[] = [
  {
    n: "I",
    title: "The Hollow Tide",
    status: "released",
    pitch: "An old fishing mech catches a falling star. He gives away his heart to return it. The sea remembers.",
  },
  {
    n: "II",
    title: "The Long Descent",
    status: "next",
    pitch:
      "The empty mech wakes underwater, piloted by no one. Below the drowned sky, the village's lost lanterns are still burning in the dark, and they want to go home.",
  },
  {
    n: "III",
    title: "Monolith Season",
    status: "planned",
    pitch: "A black slab rises from the reflected sky. The Mother's map has a second figure on it. This one is a child.",
  },
  {
    n: "IV",
    title: "The Star Child",
    status: "planned",
    pitch: "The baby returns, grown, and not alone. The sky stops pretending to be the sky.",
  },
];
