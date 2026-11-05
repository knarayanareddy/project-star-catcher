import { makeBeats } from "../synth";

/** Episode IV heart: two hearts that find the same tempo, and finally the same beat. */
export const BEATS4 = makeBeats(
  [[0, 50], [14, 64], [30, 100], [75, 120], [90, 70], [115, 52], [150, 60], [160, 68], [195, 56], [205, 48], [210, 44]],
  210,
  [[0, 2], [205.2, 206.8]],
  [],
);
