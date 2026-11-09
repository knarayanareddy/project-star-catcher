import type { Scene } from "../scenes/types";

export interface Episode {
  id: string;
  num: number;
  title: string;
  jp: string;
  tagline: string;
  duration: number;
  scenes: Scene[];
  art: string[];
  synopsis: Record<string, string>;
  brief: [string, string][];
  score: () => Promise<AudioBuffer>;
  /** captions are the narration; optional per-line voice via speechSynthesis */
  accent: string;
}
