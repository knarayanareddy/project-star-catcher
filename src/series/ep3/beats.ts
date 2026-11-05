import { makeBeats } from "../synth";

/** Episode III heart: the mech's new heart wakes at 11, a second, smaller one answers inside the belly map. */
export const BEATS3 = makeBeats(
  [[0, 44], [11, 46], [28, 62], [76, 50], [112, 42], [124, 70], [140, 96], [150, 124], [168, 70], [180, 50]],
  180,
  [[0, 10.4], [124, 124.6], [174.5, 180]],
  [],
);
