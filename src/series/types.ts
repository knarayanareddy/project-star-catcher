import type { Chapter } from "../film/timeline";
import type { PostParams } from "../film/post";

export type { Chapter };

export interface Scorer {
  start(t: number): void;
  update(t: number): void;
  dispose(): void;
  pause?(): void;
}

export interface EpisodeDef {
  id: string;
  roman: string;
  title: string;
  duration: number;
  /** a frame to show on the poster before play */
  posterAt: number;
  status: "released" | "new";
  pitch: string;
  recap: string;
  /** does this episode's closing card tease the next? */
  chapters: Chapter[];
  accent: string; // tailwind-free css colour for UI
  render: (ctx: CanvasRenderingContext2D, t: number, post: PostParams) => void;
  makeScore: (ctx: AudioContext, outs: AudioNode[]) => Scorer;
  bpmNote: string;
}
