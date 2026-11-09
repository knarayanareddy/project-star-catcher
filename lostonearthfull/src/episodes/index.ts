import { ep1 } from "./ep1";
import { ep2 } from "./ep2";
import { ep3 } from "./ep3";
import { ep4 } from "./ep4";
import type { Episode } from "./types";

export const EPISODES: Episode[] = [ep1, ep2, ep3, ep4];
/** a representative still for each episode's poster frame (seconds) */
export const STILL: Record<string, number> = { ep1: 46.2, ep2: 47.2, ep3: 144.5, ep4: 148 };
export type { Episode };
