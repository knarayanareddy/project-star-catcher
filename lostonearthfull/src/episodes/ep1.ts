import { sceneLog, sceneSandbar, sceneTitle, sceneInventory } from "../scenes/partA";
import { sceneMaze, sceneSilence, sceneFlood } from "../scenes/partB";
import { sceneDark, sceneKnock, sceneClearing, sceneEnd } from "../scenes/partC";
import { renderScore } from "../engine/audio";
import type { Episode } from "./types";

/** Episode 1 — "The Green Silence" — original production, mounted unchanged. */
export const ep1: Episode = {
  id: "ep1", num: 1, title: "THE GREEN SILENCE", jp: "緑の沈黙", duration: 300, accent: "#7fe0c0",
  tagline: "Alone on a sandbar. Five items. One recorder. The jungle is about to tell her where she is.",
  scenes: [sceneLog, sceneSandbar, sceneTitle, sceneInventory, sceneMaze, sceneSilence, sceneFlood, sceneDark, sceneKnock, sceneClearing, sceneEnd],
  art: ["river_dawn", "canopy", "walk_back", "portrait", "jaguar", "storm", "fungi_night", "flashback", "clearing", "ridge_dawn"],
  synopsis: {
    log: "A black screen, a heartbeat, a voice memo. The recording starts.",
    sandbar: "Maya wakes on a river sandbar. The rapids flash back. She opens her eyes.",
    title: "Lost on Earth.",
    inventory: "Five items. One recorder. Zero maps. One good decision.",
    maze: "She's walking in circles. The way out is hidden in sound.",
    silence: "Every living thing in the forest stops at once. Something is listening.",
    flood: "The ants know before she does. A flash flood from the mountains.",
    dark: "Her light dies. A memory of her grandfather. The forest answers.",
    knock: "Three knocks, getting louder. The recording reveals a pattern.",
    clearing: "A fire still warm. A small red handprint. Someone is right behind her.",
    end: "Next: The One Who Knocks.",
  },
  brief: [
    ["PREMISE", "Maya, a field acoustic ecologist, survives a river accident. The jungle isn't hostile — it's speaking, and she is learning to listen."],
    ["FORMAT", "1920×820 (2.34:1), 300 s. Every frame is a pure function of t; window.seek(t) exposes the render contract."],
    ["LOOK", "Hand-painted key plates, cel-shaded vector eyes, bloom pyramid, grain on twos, teal / amber, accent #ff7a2f."],
    ["SOUND", "72 BPM procedural score; the jaguar's heartbeat drives both the on-screen pulse and the audio."],
  ],
  score: () => renderScore(),
};
