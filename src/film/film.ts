import { PostParams } from "./post";
import { palAt } from "./look";
import { sceneWorld } from "./scenes/main";
import { sceneCockpit, sceneGalaxy, sceneGargantua, sceneLens, sceneStargate, sceneTouch, sceneWhiteRoom } from "./scenes/special";

/** The whole film is a pure function of time. */
export function renderFilm(ctx: CanvasRenderingContext2D, t: number, post: PostParams) {
  const pal = palAt(t);
  if (t >= 56 && t < 61) return sceneLens(ctx, t, pal, post);
  if (t >= 93 && t < 104) return sceneTouch(ctx, t, pal, post);
  if (t >= 168 && t < 177) return sceneCockpit(ctx, t, pal, post);
  if (t >= 212 && t < 222) return sceneGargantua(ctx, t, pal, post);
  if (t >= 222 && t < 231) return sceneStargate(ctx, t, pal, post);
  if (t >= 231 && t < 238) return sceneGalaxy(ctx, t, pal, post);
  if (t >= 238 && t < 252) return sceneWhiteRoom(ctx, t, pal, post);
  return sceneWorld(ctx, t, post);
}
