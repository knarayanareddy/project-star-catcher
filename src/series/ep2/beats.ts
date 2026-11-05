import { makeBeats } from "../synth";

/** Episode II heart table. Silence after the last beat, a far-off pulse from below the mirror, and the mech's own at 142. */
export const BEATS2 = makeBeats(
  [[0, 40], [16, 58], [46, 50], [82, 88], [90, 128], [118, 66], [128, 54], [142, 60], [152, 84], [162, 96], [180, 70]],
  180,
  [[0.7, 13], [172.5, 180]],
  [0.52],
);
