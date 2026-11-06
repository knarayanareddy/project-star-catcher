import type { Ctx } from "../engine/draw";
import type { FX } from "../engine/post";
import type { EpisodeSound, SoundCue } from "../engine/audio";
import { prog } from "../engine/util";
import { EpisodeScene, beatOf } from "./common";
import { beat1, beat2 } from "./ep2a";
import { beat3, beat4, beat5, endCard2 } from "./ep2b";

function render(ctx: Ctx, t: number, fx: FX) {
  const { b, lt, endCard } = beatOf(t);
  if (endCard) return endCard2(ctx, t - 225, fx, t);
  if (b === 0) return beat1(ctx, lt, fx);
  if (b === 1) return beat2(ctx, lt, fx);
  if (b === 2) return beat3(ctx, lt, fx);
  if (b === 3) return beat4(ctx, lt, fx);
  return beat5(ctx, lt, fx, t);
}

const B = (b: number) => b * 45;

const cues: SoundCue[] = ([
  // BEAT 1
  { t: 0.4, type: "chime", f: 880, v: 0.7 },
  { t: 10.7, type: "tap", v: 0.8 },
  { t: 13.3, type: "tap", v: 0.8 },
  { t: 16.0, type: "tap", v: 0.8 },
  { t: 17.0, type: "pen", d: 1.0, v: 0.7 },
  { t: 19.6, type: "rasp", d: 0.8, v: 0.5 },
  { t: 20.4, type: "rasp", d: 0.4, v: 0.35 },
  { t: 22.0, type: "rasp", d: 1.0, v: 0.25 },
  { t: 24.8, type: "tap", v: 0.8 },
  { t: 25.1, type: "stamp", v: 0.7 },
  { t: 40.5, type: "tug", v: 0.25 },
  // BEAT 2
  { t: B(1) + 0.8, type: "key", v: 0.8 },
  { t: B(1) + 2.0, type: "key", v: 0.6 },
  { t: B(1) + 4.0, type: "lock", v: 0.9 },
  { t: B(1) + 6.9, type: "hatch", f: 640, v: 1 },
  { t: B(1) + 7.4, type: "swell", d: 3, v: 0.8 },
  { t: B(1) + 9.2, type: "boom", v: 0.6 },
  ...[17.2, 18.4, 19.4, 20.2, 20.9, 21.8, 22.5, 23.0, 24.3].map((t, i) => ({ t: B(1) + t, type: i === 8 ? ("bell" as const) : ("pen" as const), d: 0.25, f: 783.99, v: i === 8 ? 0.8 : 0.5 })),
  // BEAT 3
  ...[1.6, 3.4, 5.2, 7.0, 8.8].map((t) => ({ t: B(2) + t, type: "knock" as const, f: 58, v: 0.3 })),
  { t: B(2) + 14.9, type: "paper", d: 1.0, v: 0.9 },
  { t: B(2) + 18.5, type: "pen", d: 2.5, v: 0.8 },
  { t: B(2) + 22.2, type: "bell", f: 523.25, v: 0.8 },
  { t: B(2) + 24.0, type: "slide", d: 8, v: 0.25 },
  { t: B(2) + 33.0, type: "click", v: 0.9 },
  // BEAT 4
  { t: B(3) + 1.0, type: "rasp", d: 2.2, v: 0.6 },
  { t: B(3) + 2.8, type: "screws", v: 1 },
  { t: B(3) + 5.0, type: "clatter", v: 0.7 },
  { t: B(3) + 8.1, type: "slide", d: 0.7, v: 0.6 },
  { t: B(3) + 8.8, type: "slide", d: 0.7, v: 0.6 },
  { t: B(3) + 9.5, type: "slide", d: 0.7, v: 0.6 },
  { t: B(3) + 12.2, type: "tock", f: 310, v: 1 },
  { t: B(3) + 12.7, type: "tock", f: 305, v: 0.9 },
  { t: B(3) + 16.2, type: "knock", f: 180, v: 0.5 },
  { t: B(3) + 21, type: "bell", f: 440, v: 0.6 },
  { t: B(3) + 30, type: "bell", f: 349.23, v: 0.5 },
  // BEAT 5
  { t: B(4) + 0.6, type: "key", v: 0.8 },
  { t: B(4) + 1.5, type: "hatch", f: 500, v: 0.4 },
  { t: B(4) + 5.8, type: "key", v: 0.7 },
  { t: B(4) + 6.4, type: "knock", f: 220, v: 0.3 },
  { t: B(4) + 7.0, type: "key", v: 0.6 },
  { t: B(4) + 9.5, type: "lock", v: 1 },
  { t: B(4) + 11.4, type: "tap", v: 1 },
  { t: B(4) + 16.0, type: "shutter", v: 1 },
  { t: B(4) + 18.2, type: "shutter", v: 1 },
  { t: B(4) + 19.0, type: "shutter", v: 1 },
  { t: B(4) + 19.8, type: "stopclick", v: 0.6 },
  { t: B(4) + 24.2, type: "tear", d: 0.9, v: 1 },
  { t: B(4) + 25.0, type: "boom", v: 0.4 },
  { t: B(4) + 28, type: "bell", f: 587.33, v: 0.7 },
  // END CARD
  { t: 227, type: "bell", f: 440, v: 0.5 },
] as SoundCue[]).sort((a, b) => a.t - b.t);

const sound: EpisodeSound = {
  cues,
  duration: 240,
  seed: 2203,
  progression: [0, 3, 5, -2, 0, 3, 7, -2, 0, 3, 5, -2, 0, 3, 7, 10, 0, 3, 5, -2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  levels: (t) => {
    const near = (a: number, b: number) => prog(t, a, b);
    const reveal = near(B(1) + 6.5, B(1) + 9.5);
    return {
      hum: 1 - reveal * 0.5,
      drone: 0.2 + reveal * 0.45 - near(B(3), B(3) + 6) * 0.5 + near(B(4), B(4) + 6) * 0.35,
      warm: 0,
      pump: reveal * 0.9 * (1 - near(B(3), B(3) + 8) * 0.55) * (t >= B(3) ? 1 - near(B(3), B(3) + 2) : 1) + near(B(4), B(4) + 6) * 0.25 * (t >= 225 ? 0.7 : 1),
      tone: 1,
      music: 0.3 + near(B(2), B(2) + 10) * 0.05,
      tick: t >= B(4) ? 0.9 : 0,
      reverb: reveal * 0.55 - near(B(2), B(2) + 4) * 0.4 + near(B(3), B(3) + 2) * 0.0,
    };
  },
};

export const ep2Scene: EpisodeScene = {
  id: "ep2",
  render,
  sound,
  cuts: [10.5, 18.5, 24, 31, B(1) + 7, B(2) + 10, B(2) + 18.2, B(2) + 22.2, B(3) + 7.5, B(3) + 10.8, B(3) + 15, B(3) + 18.2, B(4) + 14.5, B(4) + 21.5],
  hud: (t) => {
    const b = beatOf(t);
    return {
      rec: true,
      subject: null,
      clock: 23 * 60 + (Math.min(t, 240) / 240) * 80,
      showPurge: true,
      hidden: (b.b === 0 && ((b.lt >= 10.5 && b.lt < 18.5) || (b.lt >= 24 && b.lt < 31))) || (b.b === 2 && b.lt >= 10 && b.lt < 36) || (b.b === 3 && b.lt < 18.2),
    };
  },
};
