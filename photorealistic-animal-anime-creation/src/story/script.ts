import type { PoseId } from "../engine/opossum";

export type Speaker = "NARRATOR" | "GERALD" | "DOLORES" | "MANAGEMENT" | "MOM";
export type EnvId = "street" | "void" | "office" | "court" | "tunnel";
export type MoodId =
  | "alley" | "alleyRain" | "alleyDawn" | "void" | "white" | "office" | "officeDim" | "officeLamp" | "court" | "tunnel";
export type Anchor = "head" | "eye" | "body" | "tail" | "paw" | "snout" | "moth" | "world";
export type V3 = [number, number, number];

export interface Line {
  at: number;
  speaker: Speaker;
  text: string;
  dir: string; // performance direction for the voice model
}

export interface EnvOpts {
  rain?: number;
  car?: [number, number];
  eyes?: number;
  screen?: "memories" | "off";
  contract?: number;
  phone?: string;
  lamp?: number;
  mothLamp?: boolean;
}

export interface Shot {
  at: number;
  env?: EnvId;
  target: Anchor;
  tOff?: V3; // world look point (when target = world) or offset
  from: V3; // camera (offset from anchor, or absolute for world)
  to: V3;
  fov?: number;
  pose?: PoseId;
  mood?: MoodId;
  dof?: number;
  roll?: number;
  animal?: { pos?: V3; to?: V3; yaw?: number; hide?: boolean };
  moth?: { pos: V3; to?: V3; mode?: "hover" | "orbit"; hide?: boolean };
  opts?: EnvOpts;
}

export interface Fx {
  at: number;
  dur: number;
  type: "flash" | "glitch" | "shake" | "invert" | "speed" | "blackout" | "warp" | "hue";
}

export interface Sfx {
  at: number;
  name: "buzz" | "boom" | "whoosh" | "ding" | "heart" | "glitch" | "stamp" | "sting" | "drop" | "screech" | "chime" | "sigh";
}

export type CueId = "none" | "tense" | "weird" | "hype" | "sad" | "void" | "court" | "dawn" | "chaos";
export type AmbId = "none" | "rain" | "hum" | "wind" | "void";

export interface Card {
  at: number;
  dur: number;
  kind: "title" | "end";
  title: string;
  sub: string;
}

export interface Scene {
  n: number;
  title: string;
  start: number;
  dur: number;
  env: EnvId;
  tone: string;
  desc: string;
  mj: string;
  runway: string;
  suno: string;
  cue: CueId;
  amb: AmbId;
  lines: Line[];
  shots: Shot[];
  fx: Fx[];
  sfx: Sfx[];
  cards?: Card[];
}

export const TOTAL = 360;

export const CAST = [
  {
    id: "GERALD" as Speaker,
    name: "Gerald",
    role: "Protagonist · Virginia opossum · 2 yrs (14 in possum-years)",
    glyph: "G",
    color: "#c6ff3d",
    bio: "A professional faker of his own death. Rent, feelings, family, eye contact: all handled by collapsing. Believes it's a lifestyle. It is, in fact, a nervous reflex.",
    arc: ["Ep 1 open: Avoids all of life by 'dying' on cue.", "Ep 1 mid: Learns he is statistically the deadest possum in history.", "Ep 1 end: Chooses to live. His own body immediately betrays the contract."],
    flaw: "Treats absence as a personality.",
    want: "To never be asked 'how are you?' again.",
    need: "To be bad at living, loudly.",
    voice: "ElevenLabs 'Adam'. Dry, anxious, a little too reasonable. Stability 0.35.",
    mj: "photoreal opossum, white face, pink nose, glossy black bead eyes, guard-hair fur, lying on wet asphalt, tongue out, dead-possum pose, sodium streetlight, rain, macro lens, shallow depth of field, 85mm, cinematic, 4k",
  },
  {
    id: "DOLORES" as Speaker,
    name: "Dolores",
    role: "Afterlife Intake Clerk · Luna moth · died at a bug zapper",
    glyph: "D",
    color: "#7dffc4",
    bio: "Department of Final Outcomes, Window 1 of 1. Compulsively drawn to every light source, which makes tunnel-guidance a nightmare. Has processed 4,112 of Gerald's deaths and none of his lives.",
    arc: ["Starts: Exhausted, bureaucratic, deadpan.", "Middle: Drops the clipboard and admits she never chose a single light.", "End: Picks one direction. Away from the lamp."],
    flaw: "Cannot stop walking toward the light.",
    want: "A lunch break that isn't a bulb.",
    need: "To be asked how she is doing.",
    voice: "ElevenLabs 'Bella'. Warm, tired, secretly funny. Stability 0.4.",
    mj: "photoreal luna moth, pale green wings with eyespots, fuzzy cream thorax, tiny round glasses, lanyard badge, hovering in front of a glowing bare bulb, soft bloom, macro, 4k",
  },
  {
    id: "MANAGEMENT" as Speaker,
    name: "The Management",
    role: "Cosmic Authority · A very large dumpster",
    glyph: "M",
    color: "#ff4d8d",
    bio: "Creator, auditor, landlord. Speaks exclusively in policy. Wants you to know that the Wi-Fi in Option A is genuinely terrible. Its lid opens like a mouth. Its eyes are two green emergency lights.",
    arc: ["Starts: Detached, booming, unreadable.", "Middle: Offers a deal with strategic fine print.", "End: Reveals Clause 14(b). Was never really on Gerald's side."],
    flaw: "Reads the terms aloud with far too much enthusiasm.",
    want: "Compliance.",
    need: "Unknown. Possibly a lid replacement.",
    voice: "ElevenLabs 'Antoni', pitched down. Slow, booming, bureaucratic. Stability 0.6.",
    mj: "enormous green metal dumpster as a god, glowing green eyes, lid open like a jaw, cosmic void, bottle-cap stars, volumetric light, worship composition, 4k",
  },
  {
    id: "NARRATOR" as Speaker,
    name: "The Narrator",
    role: "Nature-documentary voice · increasingly unwell",
    glyph: "N",
    color: "#ffd84d",
    bio: "Forty years of calm wildlife narration. Has never once been emotionally prepared for this. Will be muted by the Management in Scene 10.",
    arc: ["Starts: Serene, sarcastic, superior.", "Middle: Begins to care. Resents it.", "End: Reduced to 'He had one job.'"],
    flaw: "Editorializes.",
    want: "To observe from a safe distance.",
    need: "To be unmuted.",
    voice: "ElevenLabs 'Antoni'. Deep, cinematic, authoritative. Stability 0.35.",
    mj: "(never seen on screen)",
  },
];

const L = (at: number, speaker: Speaker, text: string, dir: string): Line => ({ at, speaker, text, dir });

export const SCENES: Scene[] = [
  /* ──────────────────────────────────────────────── 1 */
  {
    n: 1,
    title: "Nature Is Healing",
    start: 0,
    dur: 32,
    env: "street",
    tone: "Serene, sarcastic. Nature documentary with a pulse of dread.",
    desc: "Rain-slicked service alley behind a burger restaurant. A neon sign hums. An opossum lies perfectly rigid in a puddle of fry grease, tongue out, eyes open, rain bouncing off his fur.",
    mj: "photoreal opossum lying on wet asphalt in an alley at night, playing dead, tongue out, glossy black eyes, rain, pink neon reflections, sodium streetlight, dumpster in background, shallow depth of field, cinematic, 4k",
    runway: "Camera cranes down from above the alley toward the opossum. Rain streaks through neon light. Fur twitches once as a drop lands on his nose. Slow push to a macro close-up of the glassy eye. 8 seconds. Dread, deadpan.",
    suno: "Nature documentary strings, solemn and ironic, low cello drone, distant glitchy electronic tick every 9 seconds, rain ambience, never resolves, loop-friendly",
    cue: "tense",
    amb: "rain",
    lines: [
      L(0.8, "NARRATOR", "Behind a burger restaurant, in the great wilderness of a Tuesday, nature goes quietly about its business.", "Calm, regal, a little too pleased with yourself."),
      L(8.4, "NARRATOR", "Here lies Gerald. Opossum. Two years old. Cause of death: a phone call.", "Dry. Pause 0.6s after 'Gerald.'"),
      L(14.8, "GERALD", "Shh. I'm dead. Come back never.", "Barely above a whisper. Mouth does not move. Somehow."),
      L(19.0, "NARRATOR", "He is not dead. It is a nervous reflex that Gerald has been calling a lifestyle for two years.", "Amused. Plant this as a throwaway fact."),
      L(27.4, "GERALD", "Day one thousand two hundred and four of being fine.", "Flat. Like a hostage video."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0.3, 0.2, 0], from: [4.6, 3.2, 5.6], to: [2.4, 1.3, 3.7], fov: 32, pose: "dead", mood: "alleyRain", dof: 0.3, opts: { rain: 1 }, animal: { pos: [0, 0, 0], yaw: 0 } },
      { at: 8, target: "head", from: [0.35, 0.18, 1.05], to: [0.22, 0.1, 0.72], fov: 26, dof: 1 },
      { at: 14.4, target: "eye", from: [0.28, 0.02, 0.38], to: [0.14, 0.0, 0.24], fov: 22, dof: 1 },
      { at: 18.8, target: "body", from: [-2.8, 0.7, 3.1], to: [-1.9, 0.5, 2.3], fov: 30, dof: 0.4 },
      { at: 26.6, target: "head", from: [0.9, 0.35, 0.95], to: [0.5, 0.2, 0.7], fov: 26, dof: 1 },
    ],
    fx: [{ at: 0, dur: 1.4, type: "blackout" }],
    sfx: [{ at: 14.7, name: "sigh" }],
  },
  /* ──────────────────────────────────────────────── 2 */
  {
    n: 2,
    title: "The Phone",
    start: 32,
    dur: 30,
    env: "street",
    tone: "Comic dread. A phone buzzes like a tiny, loving threat.",
    desc: "A phone lies face-up next to the opossum. Its screen reads MOM. It vibrates itself in a slow circle. Gerald's eye follows it, without any other muscle moving.",
    mj: "smartphone glowing on wet asphalt, screen reads MOM, buzzing, opossum lying rigid behind it out of focus, rain, neon pink reflections, macro lens, 4k",
    runway: "Phone vibrates and drifts in a small circle on wet asphalt. Screen light washes across the opossum's face. Rack focus from phone to eye. 6 seconds. Tense, absurd.",
    suno: "Anime opening build, taiko drums creeping in, plucked bass, glitch percussion, quiet intro building to explosive hook at 0:45, J-rock guitar stab on the title drop",
    cue: "weird",
    amb: "rain",
    lines: [
      L(1.0, "NARRATOR", "Enter the apex predator of his life: Mom.", "Hushed jungle-documentary reverence."),
      L(5.2, "GERALD", "Not today. Not ever. I've got a perfectly good coma going.", "Whispered panic."),
      L(10.8, "NARRATOR", "Mom has called forty-seven times. Gerald has died forty-seven times. It is a very healthy relationship.", "Deadpan. Pause after 'times.'"),
      L(18.0, "GERALD", "Dying is a flexible work arrangement. Rent? Dead. Feelings? Dead. Brad's open mic night? Deeply, tragically dead.", "Defensive, rapid, escalating."),
      L(24.4, "NARRATOR", "Welcome to Gerald Is Fine. Please clap quietly. He might be asleep.", "Warm, mock-formal."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [1.2, 0.05, 0.55], from: [-0.4, 0.5, 2.1], to: [0.3, 0.3, 1.5], fov: 34, pose: "dead", mood: "alleyRain", dof: 0.6, opts: { rain: 1, phone: "MOM" }, animal: { pos: [0, 0, 0], yaw: 0 } },
      { at: 5, target: "head", from: [0.95, 0.12, 0.85], to: [0.75, 0.1, 0.6], fov: 26, dof: 1 },
      { at: 10.4, target: "world", tOff: [1.35, 0.03, 0.62], from: [0.7, 0.35, 1.0], to: [0.9, 0.22, 0.86], fov: 28, dof: 1 },
      { at: 17.6, target: "head", from: [0.3, 0.18, 1.1], to: [0.15, 0.1, 0.8], fov: 26, dof: 1 },
      { at: 23.4, target: "world", tOff: [0.5, 0.3, 0], from: [0.4, 0.5, 2.2], to: [2.8, 2.8, 6.2], fov: 32, dof: 0.2 },
    ],
    fx: [
      { at: 24.0, dur: 0.5, type: "flash" },
      { at: 24.2, dur: 5.8, type: "speed" },
    ],
    sfx: [
      { at: 0.4, name: "buzz" }, { at: 3.2, name: "buzz" }, { at: 9.8, name: "buzz" }, { at: 14.5, name: "buzz" },
      { at: 24.0, name: "sting" },
    ],
    cards: [{ at: 24.2, dur: 5.8, kind: "title", title: "GERALD IS FINE", sub: "EPISODE 01 · TERMS & CONDITIONS" }],
  },
  /* ──────────────────────────────────────────────── 3 */
  {
    n: 3,
    title: "Headlights",
    start: 62,
    dur: 28,
    env: "street",
    tone: "Rising comic tension that snaps into silence.",
    desc: "Gerald has dragged himself to the middle of the road because the signal is worse there. Two white headlights bloom on the horizon and grow.",
    mj: "opossum lying in the middle of a wet road at night, two huge headlights approaching in the distance, lens flare, rain, low angle, cinematic, 4k",
    runway: "Low camera behind the opossum. Headlights approach from the far end of the wet road, flare blooming. Rain shimmers in the beams. Final frame whiteout. 10 seconds. Anxious, then nothing.",
    suno: "Cinematic dark ambient thriller, low cello drones, rising Shepard-tone riser, heartbeat bass drum, one enormous impact then total silence",
    cue: "tense",
    amb: "rain",
    lines: [
      L(0.6, "GERALD", "Mom can't reach me in the middle of the road. Low signal. Very private.", "Smug, conspiratorial whisper."),
      L(6.4, "NARRATOR", "Reader, there was no signal. There was, however, a Subaru.", "Deadpan, delighted."),
      L(11.2, "GERALD", "Don't mind me. I'm dead. Just go around.", "Slow. Fake-calm. A tremor creeping in."),
      L(16.0, "NARRATOR", "It does not go around.", "Quiet. Final."),
      L(20.6, "NARRATOR", "Gerald's finest performance. The first one that was a documentary.", "Gently stunned. Over white."),
      L(25.8, "GERALD", "...huh. That's new.", "Echoed, tiny, bewildered."),
    ],
    shots: [
      { at: 0, target: "head", from: [-0.25, 0.1, 0.95], to: [-0.12, 0.06, 0.7], fov: 26, pose: "dead", mood: "alleyRain", dof: 1, opts: { rain: 1, car: [0.04, 0.1] }, animal: { pos: [0, 0, 0], yaw: 0 } },
      { at: 5.8, target: "world", tOff: [9, 0.55, 0], from: [-2.3, 0.28, 0.35], to: [-1.9, 0.25, 0.3], fov: 30, dof: 0.2, opts: { rain: 1, car: [0.1, 0.5] } },
      { at: 10.8, target: "head", from: [0.4, 0.14, 0.9], to: [0.22, 0.08, 0.7], fov: 26, dof: 1, opts: { rain: 1, car: [0.5, 0.68] } },
      { at: 15.6, target: "world", tOff: [5, 0.5, 0], from: [-1.3, 0.3, 0.45], to: [-1.1, 0.26, 0.4], fov: 32, dof: 0, opts: { rain: 1, car: [0.68, 0.98] } },
      { at: 19.2, env: "void", target: "head", from: [0.6, 0.2, 1.4], to: [0.5, 0.15, 1.1], fov: 30, pose: "float", mood: "white", dof: 0.2, opts: {}, animal: { pos: [0, 0, 0], yaw: -0.4 } },
    ],
    fx: [
      { at: 18.4, dur: 0.9, type: "speed" },
      { at: 19.0, dur: 1.6, type: "flash" },
      { at: 19.0, dur: 0.8, type: "shake" },
      { at: 19.2, dur: 6, type: "warp" },
    ],
    sfx: [{ at: 1, name: "heart" }, { at: 11.5, name: "heart" }, { at: 14, name: "screech" }, { at: 19, name: "boom" }, { at: 19.4, name: "drop" }],
  },
  /* ──────────────────────────────────────────────── 4 */
  {
    n: 4,
    title: "Walk Toward the Light",
    start: 90,
    dur: 30,
    env: "void",
    tone: "Dreamy, absurd, gently bureaucratic. Trippy.",
    desc: "A blinding cream-colored void. The floor is a glossy pizza crust that curves up into the horizon. Pepperoni drift like planets. A single bare bulb the size of a moon hangs overhead. A luna moth in tiny glasses orbits it with a clipboard.",
    mj: "surreal afterlife void, glossy cream floor, giant bare lightbulb like a moon, floating pepperoni planets, luna moth with tiny glasses and lanyard orbiting the bulb, photoreal opossum standing small in foreground, dreamy bloom, 4k",
    runway: "Slow push-in toward Gerald. Pepperoni rotate lazily. The luna moth spirals down out of the glare, wings catching light, and hovers at eye level. Dreamlike drift. 8 seconds.",
    suno: "Ethereal pad, glassy bell tones, detuned harp glissandos, a muffled elevator-music motif under reverb, 74 BPM, dreamlike and faintly wrong, instrumental",
    cue: "void",
    amb: "void",
    lines: [
      L(0.6, "NARRATOR", "Gerald woke in a place with no walls, no ceiling, and surprisingly good lighting.", "Hushed wonder, deadpan landing."),
      L(6.6, "GERALD", "Okay. Am I... did I... am I dead dead? Like for real? Not even a little method?", "Rising panic, rapid, voice cracks on 'method.'"),
      L(14.2, "DOLORES", "Name?", "Bored. Pen clicks."),
      L(15.8, "GERALD", "Gerald.", "Small. Obedient."),
      L(17.0, "DOLORES", "Cause of death?", "Flat. Not looking up."),
      L(18.8, "GERALD", "I was... lying down? In traffic. On purpose.", "Ashamed, trailing off."),
      L(22.6, "DOLORES", "Already lying down. Most efficient arrival I've ever processed.", "Genuinely impressed, tired."),
      L(27.2, "DOLORES", "Sorry. The light. I can't help it.", "Distracted, drifting away mid-sentence."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0, 1.6, 0], from: [7, 2.6, 9], to: [4.2, 1.4, 6.2], fov: 38, pose: "stand", mood: "void", dof: 0.2, animal: { pos: [0, 0, 0], yaw: -0.5 }, moth: { pos: [-5, 5, -9], mode: "orbit" } },
      { at: 6.2, target: "head", from: [1.0, 0.2, 1.3], to: [0.75, 0.15, 1.0], fov: 28, pose: "sniff", dof: 0.8 },
      { at: 13.6, target: "moth", from: [0.1, 0.05, 1.3], to: [0.05, 0.05, 1.0], fov: 28, dof: 0.8, moth: { pos: [1.7, 0.95, 0.7], mode: "hover" } },
      { at: 15.6, target: "head", from: [0.9, 0.12, 1.0], to: [0.7, 0.1, 0.8], fov: 28, pose: "stand", dof: 0.8 },
      { at: 16.8, target: "moth", from: [0.1, 0.02, 1.2], to: [0.05, 0.02, 0.9], fov: 28, dof: 0.8 },
      { at: 18.6, target: "head", from: [0.9, 0.12, 1.0], to: [0.65, 0.1, 0.8], fov: 26, pose: "slump", dof: 0.8 },
      { at: 22.2, target: "moth", from: [0.1, 0.02, 1.2], to: [0.05, 0.02, 0.8], fov: 26, dof: 0.8 },
      { at: 26.6, target: "moth", from: [0.5, 0.0, 2.4], to: [1.2, -0.4, 4.4], fov: 32, dof: 0.2, moth: { pos: [1.7, 0.95, 0.7], to: [-3, 4.5, -8], mode: "orbit" } },
    ],
    fx: [{ at: 0, dur: 30, type: "hue" }],
    sfx: [{ at: 0.4, name: "chime" }, { at: 14.0, name: "ding" }, { at: 27.0, name: "sigh" }],
  },
  /* ──────────────────────────────────────────────── 5 */
  {
    n: 5,
    title: "Department of Final Outcomes",
    start: 120,
    dur: 32,
    env: "office",
    tone: "Beige horror. Corporate purgatory. Absurd, deadpan.",
    desc: "A fluorescent waiting room carved inside a landfill cathedral. Beige carpet that breathes. Clocks melt off the walls like cheese. A NOW SERVING sign flickers: 4,112.",
    mj: "surreal beige waiting room, fluorescent tubes, breathing carpet, melting clocks, NOW SERVING sign reading 4112, luna moth clerk at desk, photoreal opossum small in foreground, uncanny, 4k",
    runway: "Slow lateral dolly through a beige waiting room. Clocks droop and sag in slow motion. Carpet rises and falls like a lung. Sign flickers. 8 seconds. Uncanny, quiet.",
    suno: "Corporate hold music in a minor key, detuned electric piano, soft muzak saxophone, sub-bass hum, subtle glitch every 8 seconds, uncanny, loop-friendly",
    cue: "weird",
    amb: "hum",
    lines: [
      L(0.8, "NARRATOR", "Death, it turns out, is mostly paperwork.", "Resigned. Like a man who has filed before."),
      L(4.8, "DOLORES", "I'm Dolores. Intake, Department of Final Outcomes. Take a number, hold your regrets, and don't touch the clocks.", "Rote, monotone, one breath."),
      L(13.2, "GERALD", "Why are the clocks melting?", "Hushed, genuinely curious."),
      L(15.8, "DOLORES", "Budget cuts.", "Instant, joyless."),
      L(18.0, "NARRATOR", "The carpet is breathing. Nobody has addressed this either.", "Quiet, appalled."),
      L(22.4, "DOLORES", "Says here you've died four thousand, one hundred and twelve times.", "Reading a file, eyebrow audible."),
      L(27.6, "DOLORES", "Lives lived: zero. Deadest possum on record.", "Stamping the file as she says it."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0, 1.4, -1], from: [-2.4, 1.7, 5.2], to: [0.2, 1.4, 3.6], fov: 36, pose: "stand", mood: "office", dof: 0.2, animal: { pos: [0, 0, 0], yaw: -0.3 }, moth: { pos: [1.5, 0.95, -0.4], mode: "hover" } },
      { at: 4.4, target: "moth", from: [-0.2, 0.05, 1.6], to: [-0.1, 0.05, 1.2], fov: 28, dof: 0.8 },
      { at: 12.6, target: "head", from: [0.9, 0.15, 0.95], to: [0.7, 0.12, 0.8], fov: 28, pose: "sniff", dof: 0.8 },
      { at: 15.4, target: "world", tOff: [-1.8, 2.2, -2.6], from: [-0.5, 1.4, 3.6], to: [-1.0, 1.7, 2.4], fov: 40, dof: 0.2 },
      { at: 17.8, target: "world", tOff: [0, 0.1, 0], from: [0.6, 0.18, 2.9], to: [0.3, 0.14, 2.1], fov: 34, pose: "stand", dof: 0.5 },
      { at: 22.0, target: "moth", from: [-0.1, 0.0, 1.5], to: [-0.05, 0.0, 1.0], fov: 28, dof: 0.8 },
      { at: 27.2, target: "head", from: [0.9, 0.1, 0.9], to: [0.55, 0.08, 0.65], fov: 26, pose: "slump", dof: 1 },
    ],
    fx: [{ at: 15.4, dur: 2.4, type: "warp" }, { at: 27.6, dur: 0.3, type: "shake" }],
    sfx: [{ at: 4.4, name: "ding" }, { at: 27.8, name: "stamp" }],
  },
  /* ──────────────────────────────────────────────── 6 */
  {
    n: 6,
    title: "The Audit",
    start: 152,
    dur: 30,
    env: "office",
    tone: "Funny, then suddenly very sad. Quiet piano.",
    desc: "The lights drop. A projector throws Gerald's life onto the wall: each frame is a major moment, and in each one he is face-down. Final slide: a kitchen table, a casserole, an empty chair.",
    mj: "dim office, projector beam through dust, opossum seen from behind sitting small watching a giant screen of memories, cinematic backlight, melancholy, 4k",
    runway: "Projector beam flickers through dust. Frames on the screen slide past like film. Light washes over the opossum's back as he sits very still. Slow push. 7 seconds. Quiet, aching.",
    suno: "Soft melancholic piano, anime ED style, 68 BPM, acoustic guitar enters at 0:30, violin enters at 1:00, fades gently, the end of an episode where everything changed",
    cue: "sad",
    amb: "hum",
    lines: [
      L(0.6, "DOLORES", "Let's review the footage.", "Dry, clicks a remote."),
      L(3.2, "DOLORES", "Your birthday. Fainted before cake.", "Flat. Scrolling."),
      L(6.4, "DOLORES", "Mom's recital. Fainted in row three.", "Flat. Slightly pained."),
      L(9.6, "DOLORES", "Marguerite. Lovely girl. Fainted at 'hi.'", "A small, sympathetic wince."),
      L(13.0, "GERALD", "In my defense, 'hi' was a lot.", "Weak, defensive, almost a laugh."),
      L(17.0, "NARRATOR", "Every Sunday, a casserole. Every Sunday, an empty chair.", "Soft. All irony drained out."),
      L(22.6, "GERALD", "...I wasn't avoiding her. I was pre-grieving. Efficiently.", "Quiet. Realizing as he says it. Voice thins on 'Efficiently.'"),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0, 1.3, -3], from: [-1.5, 0.95, 2.6], to: [-0.9, 0.95, 1.7], fov: 36, pose: "sit", mood: "officeDim", dof: 0.7, opts: { screen: "memories" }, animal: { pos: [0, 0, 0], yaw: Math.PI / 2 - 0.05 }, moth: { pos: [1.4, 1.1, -0.2], mode: "hover" } },
      { at: 9.2, target: "head", from: [1.0, 0.15, 0.9], to: [0.8, 0.1, 0.7], fov: 26, dof: 0.9, animal: { yaw: Math.PI / 2 - 0.9 } },
      { at: 12.8, target: "head", from: [0.7, 0.12, 0.9], to: [0.55, 0.08, 0.7], fov: 26, dof: 1 },
      { at: 16.6, target: "world", tOff: [0, 1.3, -3], from: [-0.6, 1.0, 2.0], to: [-0.3, 1.05, 1.2], fov: 32, dof: 0.7, animal: { yaw: Math.PI / 2 - 0.05 } },
      { at: 22.0, target: "eye", from: [0.25, 0.02, 0.4], to: [0.12, 0.0, 0.26], fov: 22, pose: "slump", dof: 1, animal: { yaw: Math.PI / 2 - 0.9 } },
    ],
    fx: [{ at: 3.2, dur: 0.25, type: "glitch" }, { at: 6.4, dur: 0.25, type: "glitch" }, { at: 9.6, dur: 0.25, type: "glitch" }],
    sfx: [{ at: 0.5, name: "ding" }],
  },
  /* ──────────────────────────────────────────────── 7 */
  {
    n: 7,
    title: "The Management",
    start: 182,
    dur: 32,
    env: "court",
    tone: "Epic, ridiculous, ominous. A cosmic trial run like a municipal hearing.",
    desc: "A starless-dark cosmos where the stars are bottle caps. Shopping carts drift like seraphim. At the far end, an impossibly large green dumpster opens its lid like a jaw. Its eyes are two emergency lights.",
    mj: "cosmic courtroom, stars made of bottle caps, seraph shopping carts, colossal green dumpster god with glowing eyes and open lid mouth, tiny opossum in foreground, worship composition, volumetric light, 4k",
    runway: "Low angle looking up at a colossal dumpster. Lid slowly opens. Green light spills over a trembling opossum. Bottle-cap stars twinkle. 8 seconds. Epic, absurd.",
    suno: "Choir pads and brass swells slightly out of tune, bureaucratic marimba pattern underneath, deep taiko hits, ominous but silly, 60 BPM",
    cue: "court",
    amb: "wind",
    lines: [
      L(0.6, "NARRATOR", "Above the office, past the stars made of bottle caps, sat the Management.", "Grand, reverent."),
      L(6.4, "MANAGEMENT", "GERALD. You have been using death as a coping mechanism.", "Booming, slow, formal."),
      L(11.6, "MANAGEMENT", "This is not covered under your plan.", "Deadly bureaucratic."),
      L(15.2, "GERALD", "I have a plan?", "Small and genuinely baffled."),
      L(17.6, "MANAGEMENT", "Option A: eternal rest. Free. The Wi-Fi is terrible.", "Brochure cheer."),
      L(22.4, "MANAGEMENT", "Option B: Go back. Live. But you may never play dead again. Not once.", "Slow, final. Lean on 'Not once.'"),
      L(28.4, "GERALD", "That's my entire personality.", "Horrified whisper."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0, 2.8, -9], from: [3.2, 0.9, 6.0], to: [1.2, 1.3, 4.2], fov: 44, pose: "cower", mood: "court", dof: 0.2, animal: { pos: [0, 0, 0], yaw: 0.35 }, opts: { eyes: 0 } },
      { at: 6.0, target: "world", tOff: [0, 4.0, -9], from: [0.6, 0.45, 1.8], to: [0.4, 0.7, 0.9], fov: 46, dof: 0, opts: { eyes: 1 } },
      { at: 11.2, target: "world", tOff: [0, 3.2, -9], from: [-1.2, 1.4, 3.5], to: [-0.6, 1.6, 2.4], fov: 40, dof: 0, opts: { eyes: 1 } },
      { at: 14.8, target: "head", from: [0.9, 0.12, 0.95], to: [0.7, 0.1, 0.78], fov: 26, dof: 0.9, opts: { eyes: 1 }, animal: { yaw: -0.4 } },
      { at: 17.4, target: "world", tOff: [0, 3.5, -9], from: [0.3, 0.3, 1.6], to: [0.2, 0.6, 0.8], fov: 46, dof: 0, opts: { eyes: 1 } },
      { at: 22.2, target: "world", tOff: [0, 3.8, -9], from: [0.0, 0.2, 1.4], to: [0.0, 0.5, 0.5], fov: 50, dof: 0, opts: { eyes: 1 } },
      { at: 28.0, target: "eye", from: [0.28, 0.0, 0.4], to: [0.14, 0.0, 0.26], fov: 22, pose: "hiss", dof: 1, opts: { eyes: 1 }, animal: { yaw: -0.4 } },
    ],
    fx: [{ at: 6.4, dur: 0.5, type: "shake" }, { at: 22.4, dur: 0.6, type: "shake" }],
    sfx: [{ at: 6.0, name: "boom" }, { at: 22.2, name: "boom" }, { at: 28.6, name: "sting" }],
  },
  /* ──────────────────────────────────────────────── 8 */
  {
    n: 8,
    title: "Slow Burn",
    start: 214,
    dur: 30,
    env: "office",
    tone: "Soft, vulnerable, darkly funny. The heart of the episode.",
    desc: "The office after hours. One desk lamp. Dolores drifts toward it again and again, pulling herself back with visible effort. Gerald sits beside the desk. For once, nobody is asking him for anything.",
    mj: "after-hours office, single warm desk lamp, luna moth hovering near lamp with tiny glasses, opossum sitting listening, warm rim light, bokeh, intimate, 4k",
    runway: "Moth drifts toward the lamp, stops, drifts back, as if on a string. Warm light pulses. Gerald watches in profile. Camera cuts between faces. 7 seconds. Tender, funny.",
    suno: "Soft solo piano with warm room reverb, hesitant melody, subtle ambient synth swell, acoustic guitar at 0:30, 66 BPM, intimate, melancholic, fades",
    cue: "sad",
    amb: "hum",
    lines: [
      L(0.8, "DOLORES", "Hey. Before you decide.", "Hushed. Not her clerk voice."),
      L(3.4, "DOLORES", "I died at a bug zapper. Best three seconds of my life.", "Soft, deadpan, a half-laugh."),
      L(8.4, "GERALD", "That's the saddest thing I've ever heard.", "Sincere, without joking."),
      L(11.8, "DOLORES", "Fourteen hundred years I've walked toward lights. Never once picked one.", "Slow. The first honest sentence she's said in a century."),
      L(17.4, "GERALD", "Dolores. Are you okay?", "Gentle. The first time he's asked anyone."),
      L(20.2, "DOLORES", "...Nobody's asked in a long time.", "Voice catches slightly."),
      L(23.2, "DOLORES", "Go, Gerald. Be bad at living. Loudly.", "Warm, fierce, smiling."),
      L(26.6, "NARRATOR", "Moths. Doomed, and weirdly drawn to lamps.", "Quiet, fond."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [-0.3, 1.0, -0.6], from: [1.6, 1.1, 3.7], to: [1.0, 1.0, 2.7], fov: 34, pose: "sit", mood: "officeLamp", dof: 0.7, opts: { lamp: 1 }, animal: { pos: [0.6, 0, 0.2], yaw: Math.PI + 0.55 }, moth: { pos: [-1.0, 1.35, -0.5], mode: "hover" } },
      { at: 3.2, target: "moth", from: [0.2, 0.05, 1.4], to: [0.1, 0.03, 1.0], fov: 26, dof: 1, opts: { lamp: 1, mothLamp: true } },
      { at: 8.2, target: "head", from: [-0.2, 0.1, 0.95], to: [-0.1, 0.08, 0.7], fov: 26, dof: 1, opts: { lamp: 1 } },
      { at: 11.6, target: "moth", from: [0.5, 0.05, 1.2], to: [0.3, 0.05, 0.9], fov: 26, dof: 1, opts: { lamp: 1, mothLamp: true } },
      { at: 17.2, target: "head", from: [-0.1, 0.1, 0.9], to: [0.0, 0.08, 0.65], fov: 26, dof: 1, opts: { lamp: 1 } },
      { at: 20.0, target: "moth", from: [0.2, 0.0, 1.0], to: [0.1, 0.0, 0.7], fov: 24, dof: 1, opts: { lamp: 1 } },
      { at: 23.0, target: "world", tOff: [-0.2, 1.0, -0.4], from: [1.2, 0.9, 3.4], to: [0.5, 1.0, 4.4], fov: 34, dof: 0.6, opts: { lamp: 1 } },
    ],
    fx: [],
    sfx: [{ at: 20.4, name: "sigh" }],
  },
  /* ──────────────────────────────────────────────── 9 */
  {
    n: 9,
    title: "Terms & Conditions",
    start: 244,
    dur: 30,
    env: "office",
    tone: "Kafka by way of a software EULA. Trippy, fast, absurd.",
    desc: "A contract the size of a cathedral unfurls from the ceiling. The letters crawl off the page like ants. Gerald stands before it with a paw dipped in ketchup.",
    mj: "gigantic floating contract scroll, text crawling like ants, tiny opossum holding a ketchup-dipped paw before it, surreal office, dramatic spotlight, 4k",
    runway: "Contract unfurls from above, letters shiver and crawl. Camera tilts up the length of the page. Gerald's paw hovers over the signature line. 8 seconds. Surreal, urgent.",
    suno: "Frantic harpsichord and marimba loop, glitchy pizzicato strings, tempo climbs from 90 to 140 BPM, comedic suspense, sudden stop",
    cue: "chaos",
    amb: "hum",
    lines: [
      L(0.6, "NARRATOR", "The Terms and Conditions of being alive. Four million pages. Gerald skimmed.", "Brisk, dry, quick."),
      L(6.4, "GERALD", "Life is not liable for pain, taxes, or Marguerite not texting back.", "Reading aloud, escalating dread."),
      L(12.0, "GERALD", "That's a lot of liability.", "Small, honest."),
      L(14.6, "GERALD", "Can I just play dead a little? For old times' sake?", "Hopeful. Knows the answer."),
      L(19.4, "MANAGEMENT", "You are already dead, Gerald. Playing dead while dead is incredibly rude.", "Offended. Slow."),
      L(24.4, "NARRATOR", "Method acting. Truly his finest.", "Dry as a cracker."),
      L(27.2, "GERALD", "Fine. Where do I sign?", "Defeated, then a flicker of resolve."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0, 2.4, -2.5], from: [-1.4, 0.9, 2.8], to: [-0.6, 1.4, 1.8], fov: 44, pose: "stand", mood: "officeDim", dof: 0.2, opts: { contract: 1 }, animal: { pos: [0, 0, 0], yaw: Math.PI / 2 - 0.2 } },
      { at: 6.2, target: "world", tOff: [0, 1.4, -2.5], from: [0.4, 0.8, 1.2], to: [0.2, 1.1, 0.4], fov: 36, dof: 0.6 },
      { at: 11.8, target: "head", from: [0.8, 0.12, 0.9], to: [0.6, 0.1, 0.7], fov: 26, pose: "slump", dof: 1, animal: { yaw: -0.5 } },
      { at: 14.4, target: "head", from: [0.5, 0.2, 0.9], to: [0.4, 0.14, 0.6], fov: 24, pose: "sit", dof: 1 },
      { at: 19.2, target: "world", tOff: [0, 4.0, -9], from: [0.5, 0.3, 2.2], to: [0.3, 0.8, 1.3], fov: 50, dof: 0, env: "court", mood: "court", pose: "cower", opts: { eyes: 1 }, animal: { yaw: 0.35 } },
      { at: 24.2, env: "office", target: "body", from: [-1.2, 0.5, 2.6], to: [-0.8, 0.45, 1.9], fov: 32, pose: "slump", mood: "officeDim", dof: 0.5, opts: { contract: 1 }, animal: { yaw: Math.PI / 2 - 0.3 } },
      { at: 27.0, target: "paw", from: [0.2, 0.1, 0.7], to: [0.1, 0.05, 0.4], fov: 24, pose: "proud", dof: 1, animal: { yaw: Math.PI / 2 - 0.6 } },
    ],
    fx: [{ at: 0, dur: 14, type: "warp" }, { at: 13.8, dur: 0.4, type: "glitch" }, { at: 29.1, dur: 0.9, type: "flash" }, { at: 29.1, dur: 0.4, type: "shake" }],
    sfx: [{ at: 29.1, name: "stamp" }, { at: 19.4, name: "boom" }],
  },
  /* ──────────────────────────────────────────────── 10 */
  {
    n: 10,
    title: "Re-Entry",
    start: 274,
    dur: 30,
    env: "tunnel",
    tone: "Psychedelic free-fall into the most physical, painful, beautiful moment of the episode.",
    desc: "A tunnel of rewinding memories: colors invert, the narrator loses his composure and is muted by the Management. Then rain. Cold asphalt. A stopped car. The first breath.",
    mj: "psychedelic tunnel of rushing colors, opossum falling through it, glitch, chromatic aberration, then wet asphalt close-up of an opossum waking up, car headlights, rain, 4k",
    runway: "Hyper-speed fall through a tunnel of streaking color. Cut to white. Cut to rain on asphalt, shallow focus on an opossum's nose twitching as it breathes in. Camera cranes up. 10 seconds. Awe and pain.",
    suno: "Chaotic synth arpeggios and tape-rewind glitches, riser into a sudden silence, then a single warm piano note over rain, building to a full cinematic swell",
    cue: "chaos",
    amb: "void",
    lines: [
      L(0.4, "NARRATOR", "Re-entry. Please keep your paws inside the afterlife at all times.", "Chipper flight-attendant tone."),
      L(5.6, "NARRATOR", "Forty years narrating and I have never seen a possum do... oh no, oh no, oh my—", "Losing composure, getting fast and high."),
      L(10.6, "MANAGEMENT", "Narrator. You are muted.", "Calm. Absolute."),
      L(15.2, "GERALD", "Ow. Oh no. Everything hurts.", "A raw, wet gasp. Real."),
      L(19.0, "GERALD", "...That's great. That's amazing. Ow.", "Laughing and crying at once."),
      L(22.4, "NARRATOR", "Somewhere, a Subaru driver was having the worst night of his life. Gerald was having the best.", "Unmuted. Warm, wrecked."),
    ],
    shots: [
      { at: 0, target: "body", from: [1.6, 0.4, 2.3], to: [1.0, 0.2, 1.7], fov: 50, pose: "float", mood: "tunnel", dof: 0.3, animal: { pos: [0, 0, 0], yaw: -0.2 } },
      { at: 5.4, target: "head", from: [0.7, 0.1, 0.9], to: [0.5, 0.05, 0.6], fov: 28, pose: "hiss", dof: 0.4, roll: 6 },
      { at: 10.4, target: "body", from: [0, 0.6, 3], to: [0, 0.2, 1.6], fov: 60, pose: "float", dof: 0.2, roll: -10 },
      { at: 13.6, env: "street", target: "head", from: [0.18, 0.05, 0.45], to: [0.16, 0.04, 0.5], fov: 20, pose: "dead", mood: "alleyRain", dof: 1, opts: { rain: 1, car: [0.985, 0.985] }, animal: { pos: [0, 0, 0], yaw: 0 }, roll: 0 },
      { at: 15.0, target: "head", from: [0.3, 0.2, 0.9], to: [0.4, 0.12, 0.8], fov: 26, pose: "slump", dof: 1 },
      { at: 18.8, target: "eye", from: [0.28, 0.0, 0.4], to: [0.14, 0.0, 0.26], fov: 22, pose: "sniff", dof: 1 },
      { at: 22.2, target: "body", from: [0.8, 0.3, 2.0], to: [2.6, 2.4, 5.8], fov: 32, pose: "stand", dof: 0.3 },
    ],
    fx: [
      { at: 0, dur: 13, type: "warp" }, { at: 0, dur: 13, type: "hue" }, { at: 4, dur: 0.4, type: "glitch" }, { at: 7, dur: 0.5, type: "invert" },
      { at: 9.8, dur: 0.5, type: "glitch" }, { at: 10.8, dur: 0.4, type: "invert" }, { at: 12.8, dur: 1.4, type: "flash" }, { at: 12.9, dur: 0.6, type: "shake" },
    ],
    sfx: [{ at: 0.2, name: "whoosh" }, { at: 4.2, name: "glitch" }, { at: 10.6, name: "stamp" }, { at: 12.8, name: "boom" }, { at: 14.6, name: "heart" }, { at: 15.6, name: "heart" }],
  },
  /* ──────────────────────────────────────────────── 11 */
  {
    n: 11,
    title: "Mom",
    start: 304,
    dur: 28,
    env: "street",
    tone: "Warm, awkward, quietly devastating. The comedy of finally answering the phone.",
    desc: "The rain thins. The phone is still on the asphalt, buzzing. On the streetlamp above, a luna moth circles the bulb, stops, and chooses to fly away from it.",
    mj: "opossum standing over a buzzing phone on wet asphalt, rain easing, streetlamp above with a luna moth flying away from it, soft sodium light, tender, cinematic, 4k",
    runway: "Rain softens. Phone buzzes. Gerald stares at it with a trembling paw. Above, a moth leaves the lamp and drifts off into the dark. 8 seconds. Gentle.",
    suno: "Warm acoustic guitar and soft piano, a tentative major-key melody emerging out of rain, strings swell gently, 70 BPM, hopeful, a little shaky",
    cue: "dawn",
    amb: "rain",
    lines: [
      L(0.8, "NARRATOR", "The phone rang. Forty-eight.", "Quiet, expectant."),
      L(4.0, "GERALD", "Don't faint. Don't faint. Don't faint.", "Whispered mantra, shaky."),
      L(7.6, "GERALD", "Hi, Mom.", "Very small."),
      L(9.6, "MOM", "Gerald?! Oh thank God. I thought you were dead.", "Flooded with relief, a little stern."),
      L(14.0, "GERALD", "Define 'were.'", "Dry, nervous half-laugh."),
      L(16.4, "MOM", "Come home. I made the good garbage.", "Warm, bossy, practical."),
      L(20.0, "GERALD", "I'll be there in twenty minutes. Alive. Ish.", "Choked up, trying to joke."),
      L(23.6, "MOM", "You sound different.", "Soft surprise."),
      L(25.8, "GERALD", "Yeah. Working on it.", "Honest."),
    ],
    shots: [
      { at: 0, target: "world", tOff: [0.9, 0.1, 0.4], from: [-1.2, 0.5, 2.6], to: [-0.5, 0.35, 1.8], fov: 34, pose: "cower", mood: "alleyRain", dof: 0.6, opts: { rain: 0.4, phone: "MOM", lamp: 1 }, animal: { pos: [0, 0, 0], yaw: -0.2 } },
      { at: 3.6, target: "head", from: [0.7, 0.14, 0.9], to: [0.5, 0.1, 0.65], fov: 26, pose: "cower", dof: 1 },
      { at: 7.2, target: "paw", from: [0.2, 0.2, 0.6], to: [0.1, 0.08, 0.4], fov: 24, pose: "sit", dof: 1, opts: { rain: 0.3, phone: "MOM 00:01" } },
      { at: 9.4, target: "world", tOff: [1.4, 0.05, 0.55], from: [0.5, 0.35, 1.0], to: [0.8, 0.25, 0.8], fov: 28, dof: 1, opts: { rain: 0.3, phone: "MOM 00:04" } },
      { at: 13.8, target: "head", from: [0.6, 0.15, 0.9], to: [0.4, 0.1, 0.7], fov: 26, dof: 1, opts: { rain: 0.2, phone: "MOM 00:09" } },
      { at: 16.2, target: "world", tOff: [3.0, 3.6, -1.2], from: [0.5, 0.4, 3.0], to: [0.9, 0.6, 3.4], fov: 38, dof: 0.2, opts: { rain: 0.15, lamp: 1, mothLamp: true }, moth: { pos: [2.6, 3.4, -1.0], to: [-5, 6.5, -8], mode: "hover" } },
      { at: 19.8, target: "head", from: [0.5, 0.15, 0.9], to: [0.35, 0.1, 0.6], fov: 24, pose: "proud", dof: 1, opts: { rain: 0.1, phone: "MOM 00:21" } },
      { at: 23.4, target: "eye", from: [0.28, 0.0, 0.4], to: [0.14, 0.0, 0.26], fov: 22, dof: 1, opts: { rain: 0.1 } },
    ],
    fx: [],
    sfx: [{ at: 0.3, name: "buzz" }, { at: 2.4, name: "buzz" }, { at: 9.0, name: "ding" }],
  },
  /* ──────────────────────────────────────────────── 12 */
  {
    n: 12,
    title: "Clause 14(b)",
    start: 332,
    dur: 28,
    env: "street",
    tone: "A sunrise of hope that gets run over by a plot twist. Cliffhanger.",
    desc: "Dawn. The rain has stopped. Gerald walks home through steam and gold light. Then: the dumpster's eyes glow green. Then: headlights, from the one direction he's been trying to avoid.",
    mj: "opossum walking along an alley at sunrise, steam rising, golden light on wet fur, green glowing dumpster eyes in the background, headlights approaching, anamorphic lens flare, 4k",
    runway: "Golden hour tracking shot beside a walking opossum. Mist glows. At the midpoint dumpster eyes ignite green and headlights flood the alley. Opossum freezes and topples onto his side. Hard cut to black. 10 seconds. Triumph into dread.",
    suno: "Triumphant strings and acoustic guitar, golden-hour anime ending, abruptly interrupted by a sub drop, then total silence, then one sustained dissonant violin",
    cue: "dawn",
    amb: "wind",
    lines: [
      L(0.4, "NARRATOR", "And so the possum learned to live. Nature, as always, was healing.", "Warm. Sincere. Please enjoy it while it lasts."),
      L(5.8, "GERALD", "Okay. Left foot. Right foot. Casserole. I can do this.", "Brave and terrified."),
      L(10.6, "MANAGEMENT", "GERALD. Quick note. Clause fourteen B.", "Cheerful, enormous."),
      L(13.8, "MANAGEMENT", "Playing dead is an involuntary reflex. Always was.", "Casual. A fact."),
      L(17.6, "GERALD", "Wait, what?", "Small."),
      L(19.0, "MANAGEMENT", "Breach of contract.", "Delighted."),
      L(21.4, "GERALD", "No no no no no—", "Panic, cut off mid-word."),
      L(24.2, "NARRATOR", "He had one job.", "Flat. Heartbroken. Funny."),
    ],
    shots: [
      { at: 0, target: "body", from: [0.4, 0.4, 3.4], to: [0.8, 0.5, 3.0], fov: 32, pose: "walk", mood: "alleyDawn", dof: 0.4, opts: { rain: 0 }, animal: { pos: [-3.2, 0, 0], to: [-0.2, 0, 0], yaw: 0 } },
      { at: 5.6, target: "head", from: [0.5, 0.2, 1.2], to: [0.7, 0.15, 1.0], fov: 28, pose: "walk", dof: 0.9, animal: { pos: [-1.6, 0, 0], to: [0.8, 0, 0], yaw: 0 } },
      { at: 10.4, target: "world", tOff: [-2.5, 1.0, -2.4], from: [1.5, 0.8, 3.0], to: [1.0, 0.8, 2.2], fov: 38, pose: "stand", mood: "alleyDawn", dof: 0.2, opts: { eyes: 1, car: [0.55, 0.62] }, animal: { pos: [0.8, 0, 0], yaw: 0 } },
      { at: 17.4, target: "head", from: [0.8, 0.12, 0.9], to: [0.55, 0.1, 0.75], fov: 26, pose: "cower", dof: 1, opts: { eyes: 1, car: [0.62, 0.8] } },
      { at: 18.8, target: "world", tOff: [-2.5, 1.0, -2.4], from: [1.6, 0.8, 3.0], to: [1.4, 0.8, 2.6], fov: 38, dof: 0.2, opts: { eyes: 1, car: [0.8, 0.9] } },
      { at: 21.0, target: "head", from: [0.9, 0.1, 0.8], to: [0.5, 0.08, 0.65], fov: 24, pose: "dead", dof: 1, opts: { eyes: 1, car: [0.9, 0.99] } },
      { at: 24.0, target: "eye", from: [0.3, 0.0, 0.4], to: [0.14, 0.0, 0.26], fov: 20, dof: 1, opts: { eyes: 1, car: [0.99, 0.99] } },
    ],
    fx: [
      { at: 17.0, dur: 3.8, type: "speed" },
      { at: 21.2, dur: 0.5, type: "shake" },
      { at: 21.2, dur: 0.3, type: "flash" },
      { at: 26.6, dur: 1.4, type: "blackout" },
    ],
    sfx: [{ at: 10.5, name: "sting" }, { at: 20.8, name: "drop" }, { at: 21.4, name: "heart" }, { at: 26.4, name: "boom" }],
    cards: [{ at: 26.2, dur: 1.8, kind: "end", title: "TO BE CONTINUED", sub: "NEXT: EPISODE 02 · BREACH OF CONTRACT" }],
  },
];

export const SERIES = [
  { ep: 1, title: "Terms & Conditions", log: "Gerald dies, negotiates, and comes back. Mostly.", status: "Watch now" },
  { ep: 2, title: "Breach of Contract", log: "Clause 14(b) takes effect. The Management sends a repo-moth.", status: "In production" },
  { ep: 3, title: "Brad's Open Mic", log: "Gerald finally attends. It is the worst forty minutes of comedy in history.", status: "Scripted" },
  { ep: 4, title: "Marguerite Texts Back", log: "She does. He faints. Dolores has to do the paperwork from the other side.", status: "Scripted" },
  { ep: 5, title: "The Subaru Driver", log: "The man who hit Gerald needs someone to talk to. Obviously, it's a possum.", status: "Outlined" },
  { ep: 6, title: "Hell Is a Gas Station", log: "A detour. The Management takes a personal day.", status: "Outlined" },
  { ep: 7, title: "Dolores Picks a Light", log: "A full episode from her point of view, with no lamps. Mostly.", status: "Outlined" },
  { ep: 8, title: "Casserole", log: "Dinner with Mom. Nobody survives the conversation.", status: "Outlined" },
  { ep: 9, title: "The Narrator Is Unmuted", log: "He has opinions about everything. Several are about you.", status: "Outlined" },
  { ep: 10, title: "Sunday", log: "The family reunion from hell. Some of the family is literally in hell.", status: "Outlined" },
  { ep: 11, title: "Audit Season", log: "The Management audits the narrator's feelings.", status: "Outlined" },
  { ep: 12, title: "Gerald Is Fine", log: "Is he? Season finale. Do not ask the opossum.", status: "Outlined" },
];

export const SPEAKER_COLOR: Record<Speaker, string> = {
  NARRATOR: "#ffd84d",
  GERALD: "#c6ff3d",
  DOLORES: "#7dffc4",
  MANAGEMENT: "#ff4d8d",
  MOM: "#ff9a5c",
};

export function sceneAt(t: number): Scene {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return SCENES[i];
  return SCENES[0];
}

export function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
