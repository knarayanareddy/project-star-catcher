import river_dawn from "./river_dawn.jpg";
import canopy from "./canopy.jpg";
import walk_back from "./walk_back.jpg";
import portrait from "./portrait.jpg";
import jaguar from "./jaguar.jpg";
import storm from "./storm.jpg";
import fungi_night from "./fungi_night.jpg";
import flashback from "./flashback.jpg";
import clearing from "./clearing.jpg";
import ridge_dawn from "./ridge_dawn.jpg";
import wayra_portrait from "./wayra_portrait.jpg";
import camp_two from "./camp_two.jpg";
import drum_roots from "./drum_roots.jpg";
import flooded_dawn from "./flooded_dawn.jpg";
import night_bridge from "./night_bridge.jpg";
import jaguar_water from "./jaguar_water.jpg";
import mother_tree from "./mother_tree.jpg";
import grandmother from "./grandmother.jpg";
import rescue_sky from "./rescue_sky.jpg";
import final_porch from "./final_porch.jpg";

export const ART_URL: Record<string, string> = {
  river_dawn,
  canopy,
  walk_back,
  portrait,
  jaguar,
  storm,
  fungi_night,
  flashback,
  clearing,
  ridge_dawn,
  wayra_portrait,
  camp_two,
  drum_roots,
  flooded_dawn,
  night_bridge,
  jaguar_water,
  mother_tree,
  grandmother,
  rescue_sky,
  final_porch,
};

const cache = new Map<string, Promise<HTMLImageElement>>();
export function loadArt(name: string) {
  let p = cache.get(name);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(name));
      i.src = ART_URL[name];
    });
    cache.set(name, p);
  }
  return p;
}
