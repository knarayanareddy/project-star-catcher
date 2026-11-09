import { SCENES, sceneAt, type Line, type Scene, type Sfx, type Speaker } from "./script";
import { lineTiming } from "../engine/audio";

export interface ActiveLine {
  scene: Scene;
  idx: number;
  line: Line;
  abs: number; // absolute start
  dur: number;
  rate: number;
}

export interface TimelineEvent {
  time: number;
  kind: "line" | "sfx" | "scene";
  scene: Scene;
  line?: Line;
  idx?: number;
  rate?: number;
  sfx?: Sfx["name"];
}

export const EVENTS: TimelineEvent[] = [];
for (const s of SCENES) {
  EVENTS.push({ time: s.start, kind: "scene", scene: s });
  s.lines.forEach((l, i) => EVENTS.push({ time: s.start + l.at, kind: "line", scene: s, line: l, idx: i, rate: lineTiming(s, i).rate }));
  s.sfx.forEach((f) => EVENTS.push({ time: s.start + f.at, kind: "sfx", scene: s, sfx: f.name }));
}
EVENTS.sort((a, b) => a.time - b.time);

export function activeLine(t: number, linger = 0): ActiveLine | null {
  const s = sceneAt(t);
  let found: ActiveLine | null = null;
  s.lines.forEach((line, idx) => {
    const { dur, rate } = lineTiming(s, idx);
    const abs = s.start + line.at;
    if (t >= abs && t < abs + dur + linger) found = { scene: s, idx, line, abs, dur, rate };
  });
  return found;
}

export function talking(t: number): Speaker | null {
  const a = activeLine(t, 0);
  return a ? a.line.speaker : null;
}
