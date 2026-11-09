import type { C2, Assets } from "../engine/fx";

export type Cap = [number, number, string];

export interface Scene {
  id: string;
  label: string;
  start: number;
  dur: number;
  /** fade from black at scene start (s) */
  fin?: number;
  /** fade to black at scene end (s) */
  fout?: number;
  /** cross-dissolve from previous scene (s) */
  xf?: number;
  /** extra bloom amount for dreamy scenes */
  bloom?: number;
  caps: Cap[];
  draw: (c: C2, t: number, g: number, A: Assets) => void;
}
