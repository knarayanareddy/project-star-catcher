import { Score } from "../film/audio";
import { renderFilm } from "../film/film";
import { CHAPTERS } from "../film/timeline";
import type { EpisodeDef } from "./types";

/** Episode I — the original, unchanged. */
export const EP1: EpisodeDef = {
  id: "ep1",
  roman: "I",
  title: "The Hollow Tide",
  duration: 300,
  posterAt: 31.6,
  status: "released",
  accent: "#c4b5fd",
  bpmNote: "5:00 · slow-burn · 44 BPM heart",
  pitch: "An old fishing mech catches a falling star. He gives away his heart to return it. The sea remembers.",
  recap: "",
  chapters: CHAPTERS,
  render: renderFilm,
  makeScore: (ctx, outs) => new Score(ctx, outs),
};
