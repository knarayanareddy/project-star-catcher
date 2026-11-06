import { BEAT_LEN, computeCues, type Cue } from "../engine/util";

export interface Beat {
  /** "00:00–00:45" */
  window: string;
  /** Picture/sound direction from the series bible (never narrated) */
  picture: string;
  /** Orrin's narration — the only intelligible voice in the series */
  vo: string;
  /** How the beat is staged in this build: shot-by-shot */
  shots: string[];
  /** The sound design for this beat */
  sound: string[];
}

export interface EpisodeData {
  id: "ep1" | "ep2";
  number: number;
  title: string;
  tagline: string;
  objective: string;
  change: string;
  /** story clock at start & end of the 4:00 episode, in minutes after midnight (can exceed 1440) */
  clockStart: number;
  clockEnd: number;
  clockLabel: string;
  endCard: string;
  nextTitle: string;
  logline: string;
  beats: Beat[];
  continuity: string[];
}

export const PURGE_MIN = 24 * 60 + 6 * 60; // 06:00 Friday, in minutes after Thursday 00:00

const ep1: EpisodeData = {
  id: "ep1",
  number: 1,
  title: "A Minor Discrepancy",
  tagline: "The city allows a discrepancy of two rooms before requiring a person.",
  objective: "Inspect an unexplained reduction in room count.",
  change: "Orrin recognizes a person behind the discrepancy.",
  clockStart: 22 * 60 + 10,
  clockEnd: 22 * 60 + 58,
  clockLabel: "Thursday 22:10 · purge at 06:00",
  endCard: "Hold the seam and the intact tape. No extra whispered voice.",
  nextTitle: "Unoccupied, Technically",
  logline:
    "A district surveyor is sent to verify that Calder Court has become three rooms more efficient. Walking his own approved plan, he finds a hairline crease where his sister's sewing room used to be — and something on the other side takes the end of her cloth tape.",
  beats: [
    {
      window: "00:00–00:45",
      picture:
        "A corridor opens like a paper model. Orrin checks an occupancy board: 81 corrected to 78. A cheerful poster depicts a family enjoying an impossibly spacious home. In the real corridor two neighbors pass sideways.",
      vo: "Our building became three rooms more efficient on a Thursday. Nobody moved out. This was considered an improvement. I was sent to verify the improvement, because the city allows a discrepancy of two rooms before requiring a person. I am that person. My name is Orrin Voss. I used to find the distinction amusing.",
      shots: [
        "0:00 — Paper-model unfold: four flat flaps (floor, ceiling, two walls) hinge open around a small back wall until the Level 2 corridor of Calder Court stands in one-point perspective.",
        "0:07 — Wide corridor. Orrin enters at the far end, clipboard squared against his hip. Two neighbours — one of them Mrs. Rill, plan tube under her arm — turn side-on to pass him. She reads his badge, then looks away.",
        "0:14 — The LIVE LARGER poster: a plaster-smiling family in an impossibly vast living room. Orrin glances up at it, then at his own corridor, which is 1.1 metres wide.",
        "0:20 — Close-up on the occupancy board. The red pen strikes 81 and writes 78. Stamp-click. The pen cap is chewed.",
        "0:34 — Medium shot to camera: the Survey Recorder's red lamp, his lanyard card, name lower-third. He looks at the board a moment too long.",
      ],
      sound: [
        "Dry paper-fold creaks as the flaps hinge",
        "Fluorescent hum at 100 Hz, one tube slightly out of phase",
        "Two pairs of shoes, one scuff — the neighbours' sideways shuffle",
        "Stamp-click on the board correction (the future motor-engagement click)",
        "Soft municipal score: detuned Rhodes chords under a cardboard clock-tick",
      ],
    },
    {
      window: "00:45–01:30",
      picture:
        "Orrin follows the approved plan. A wall interrupts the remembered route. Half a wallpaper flower faces the other half across a hairline crease. He checks behind himself, then checks the plan again.",
      vo: "My sister's sewing room was between the laundry and the stairs. I knew because I had carried her machine up both flights and mentioned it every birthday since. The new plan placed the laundry beside the stairs. I stood in the useful space where my sister was no longer supposed to be.",
      shots: [
        "0:45 — Side elevation, tracking right along the wall with Orrin. The plan sheet in his hand is REV D, signed. He counts doors with a finger: laundry, … stairs.",
        "0:56 — Insert on the plan: red-dotted ghost of Room 2-07 under REV D, where laundry now touches stairs. His own approval stamp sits in the corner.",
        "1:05 — The crease: a hairline in the wallpaper cutting a flower down its middle, left half a few millimetres higher than the right. A brass plate reads “2–0 | 7”, sheared.",
        "1:16 — He checks behind himself (empty corridor, a long shadow), checks the plan again, then steps into the doorway-shaped space that is no longer there.",
      ],
      sound: [
        "Room tone narrows by a half-step as he approaches the crease",
        "Paper rustle of the plan unfolding",
        "A single sustained violet drone enters, barely audible, below 60 Hz",
        "The corridor’s ambient reverb is wrong — dry on one side of the crease",
      ],
    },
    {
      window: "01:30–02:15",
      picture:
        "He calls toward the seam; no answer is intelligible. On the reverse of a maintenance hatch: temporary storage until 06:00. An air pump pulses. He feels moving air at a screw hole.",
      vo: "Folding was invented for emergencies. Fire damage. Flooding. Repairs. A room waits in storage while its place is made safe. According to the notice, this place had been made profitable. The storage connection would be purged at six. The notice did not say what the room was meant to do with its people.",
      shots: [
        "1:30 — Orrin cups a hand and calls toward the seam. Sound-rings radiate from his mouth and stop dead at the crease. A faint rhythmic thrum comes back; nothing resembling words.",
        "1:42 — He opens a maintenance hatch beside the crease. On the reverse of the hatch door: a stencilled notice — TEMPORARY STORAGE — CONNECTION PURGED 06:00 — and a Department reference number.",
        "1:56 — Close-up on a screw hole in the hatch frame. A strip of tissue breathes in and out on a 1.2-second cycle. Dust drifts sideways toward the hole.",
        "2:06 — Orrin lays his cheek near the hole. The air touches his face. His glasses glint, then the REC lamp.",
      ],
      sound: [
        "His voice is cleanly dry — no echo — and then simply gone at the crease",
        "Storage air pump: 1.2-second cycle, low-pass filtered, ‘beneath apparently solid walls’",
        "Hatch hinge — a dry iron squeal",
        "Dust-fall hiss pulled sideways in the stereo field",
      ],
    },
    {
      window: "02:15–03:00",
      picture:
        "Orrin takes out his steel survey tape. It catches at the crease. From his pocket he retrieves Lenna’s soft tape and corrects for its damaged first inch. A few centimeters of its edge enter the seam.",
      vo: "Lenna gave me a cloth tape because, she said, buildings were not the only things that needed room. I told her cloth stretched. She repaired the first inch with yellow thread and told me to remember it was missing. I remembered the missing inch more faithfully than I remembered to visit.",
      shots: [
        "2:15 — The steel tape blade extends toward the crease and catches; the hook bends and the blade chatters, unable to enter. A cold ringing note.",
        "2:27 — He pockets it. From his inside pocket, the cloth tape: cream, black numerals, and the first inch frayed and repaired with yellow thread. He rolls his thumb across it.",
        "2:38 — Macro: the tape’s first inch. He reads from the 1-inch mark and mouths “plus one.” The numeral ‘1’ is circled, in red, by him, years ago.",
        "2:48 — The edge of the cloth tape enters the hairline of the seam. Not pushed — accepted.",
      ],
      sound: [
        "Steel blade ring — hard, metallic, wrong",
        "Soft cloth rasp as the tape unrolls",
        "Hushed room: even the pump sits a little lower",
        "A music-box-adjacent single bell tone, the first of the sibling motif",
      ],
    },
    {
      window: "03:00–03:45",
      picture:
        "The tape slides inward. Three distinct tugs. Orrin drops his clipboard. For the first time he kneels rather than measures from standing. The yellow thread pulls taut between wall and hand.",
      vo: "Something took the other end. Three tugs. The service signal we were taught before the Department replaced training with a video. Not a haunting. Not settling plaster. A person, behind a wall I had certified as empty. I stopped the report. Then I started it again. This time I said her name.",
      shots: [
        "3:00 — The tape slides in by itself, hand-over-hand, at a walking pace, drawn from the other side.",
        "3:11 — Three distinct tugs. Each one snaps the tape taut, flicks dust sideways and rings a red correction pulse across the frame. The clipboard drops. Forms scatter.",
        "3:22 — Low wide: for the first time Orrin is on his knees. The yellow thread is a straight line between his fist and the wall.",
        "3:32 — The Recorder: REC lamp dies — REPORT STOPPED. A beat. New file: REPORT STARTED — SUBJECT: LENNA VOSS. The lamp lights again.",
      ],
      sound: [
        "Dry fabric rasp ×3 — the service signal, never a voice",
        "Clipboard clatter, paper skitter",
        "Recorder: stop-click, silence, start-chirp",
        "The violet drone resolves to a soft major third — the first warmth in the series",
      ],
    },
  ],
  continuity: [
    "The building number moves 81 → 78. Three rooms, not three people: nine occupants are counted in Episode 2.",
    "The cloth tape is short by exactly one inch. Orrin compensates; it never carries load.",
    "Three tugs is a living, trained sender — never a sentence. No other voice appears.",
    "Mrs. Rill cameo (plan tube) plants the six months of ignored requests paid off in Episode 3.",
    "Calder Court Level 2: laundry 2-06, sewing room 2-07, stairs. “Both flights” = two flights up from the lobby.",
  ],
};

const ep2: EpisodeData = {
  id: "ep2",
  number: 2,
  title: "Unoccupied, Technically",
  tagline: "This is how a city becomes haunted: one accurate description is refused at a time.",
  objective: "Find where folded rooms are held and how to retrieve them.",
  change: "A private rescue becomes nine people and a visible act of noncompliance.",
  clockStart: 23 * 60,
  clockEnd: 24 * 60 + 20,
  clockLabel: "23:00 – 00:20 · purge at 06:00",
  endCard: "Broken seal lies beside the live timer.",
  nextTitle: "The Display Family",
  logline:
    "The Compliance Attendant offers a green number, a penalty, and a review slot two hours too late. Orrin opens a hatch on three folded frames, discovers his own signature under the showroom that occupies their receiving bays, and breaks a numbered seal on camera.",
  beats: [
    {
      window: "00:00–00:45",
      picture:
        "The silent Attendant shows Orrin a green occupancy total, an expensive purge-cancellation penalty, and an emergency-review slot at 08:00, two hours after the purge. Orrin puts Lenna’s tape across the green display. The Attendant removes it carefully, like dirt.",
      vo: "The attendant showed me a green number. Green means safe, unless it means complete, paid, compliant, or not our department. The emergency review was at eight. Purge remained at six. I showed the attendant the tape moving inside the wall. They offered to record it as an equipment fault. This is how a city becomes haunted: one accurate description is refused at a time.",
      shots: [
        "0:00 — Service office on the ground floor. The Attendant (white coat, gloves) turns a wall display toward Orrin: OCCUPANCY 78 — COMPLIANT, in a calm green.",
        "0:10 — Tablet cut-in: PURGE CANCELLATION — PENALTY ¤ 4,812,000. A small checkbox waits to be ticked.",
        "0:19 — Tablet: EMERGENCY REVIEW — SLOT 08:00. A red correction line draws between PURGE 06:00 and REVIEW 08:00 and the gap labels itself 2h 00.",
        "0:27 — Orrin lays the cloth tape across the green display, the end still moving with a faint tug. The Attendant lifts it off with two fingers, carefully, as one removes dirt, and sets it on a clean cloth.",
        "0:36 — The Attendant’s tablet: LOG AS: EQUIPMENT FAULT (CODE 7). The box is already ticked. Orrin watches it tick.",
      ],
      sound: [
        "Green-state chime — one note, major, indifferent",
        "Tablet taps: dry plastic, evenly spaced",
        "A fabric rasp as the tape is lifted: still alive, quieter",
        "Stamp-click as the fault code logs — the motor sound’s ancestor",
      ],
    },
    {
      window: "00:45–01:30",
      picture:
        "Orrin uses his survey key to open an inspection hatch, not the transfer control. Beyond: three folded frames. Nine ordinary personal objects hang in compressed perspective. Air lines run to all three.",
      vo: "There were three frames in the storage shaft. Each held a room made thinner than its door. I could see a coat, a lunch tin, a child’s shoe. Then I stopped counting possessions and started counting movement. Nine people. My sister was one of them. That made her neither less important nor the only important one.",
      shots: [
        "0:45 — Orrin’s brass survey key turns in the inspection hatch (three notches). Not the transfer control: the key has a limited authority and the film shows it.",
        "0:54 — THE REVEAL: the hatch swings open on a violet shaft. Three folded frames hang in depth, each a room squeezed to a slab thinner than its own door; wallpaper compressed into vertical stripes, window-light a thin line.",
        "1:06 — Red correction circles pick out a coat, a lunch tin, a child’s shoe. Air lines (corrugated ducts) pulse into all three.",
        "1:16 — Tally marks: a silhouette shifts inside a slab, and a red tick appears. Nine ticks. The ninth is Lenna’s: underlined in yellow thread.",
      ],
      sound: [
        "Key-in-lock, brass on brass",
        "Hatch opens → the violet drone blooms; the reverb tail suddenly lengthens ten-fold",
        "Air pumps — three overlapping 1.2s cycles slightly out of step",
        "Each tally tick is a soft pencil-mark plus a tiny fabric movement",
      ],
    },
    {
      window: "01:30–02:15",
      picture:
        "Orrin examines physical arrows linking storage to receiving bays. The three receivers have been decorated over on the current plan. His older signed diagram remains underneath. He lines up its corners with the live hardware.",
      vo: "A folded room needs somewhere to unfold. It does not care how urgently you ask. The receiving bays were still on the original plan, under a decorative rectangle labeled Demonstration Residence. I recognized the signature approving the rectangle. Recognition is a very small word for discovering you have already been here, holding the wrong pen.",
      shots: [
        "1:30 — Mechanical arrows: three brass push-rods and linkage arms run from the folded frames, down the shaft, to three empty bays marked on the floor.",
        "1:42 — The current plan (marketing cream-and-gold): DEMONSTRATION RESIDENCE, a lush rectangle. Orrin lifts its corner. Underneath: the original plan, three squares labelled EMERGENCY RECEIVER A / B / C.",
        "1:54 — The approval signature on the rectangle: “O. Voss” — animated stroke by stroke, with a pen in his own hand held a little too tight. 14 months ago.",
        "2:03 — He lines the old plan’s corners up against the live hardware, rivet to rivet. They fit.",
      ],
      sound: [
        "Low linkage creaks, regular as pendulum motion",
        "Plan paper: heavy, matte — different from the thin marketing sheet",
        "The signature stroke has a pen-nib scratch; held slightly longer than it should",
        "Rhodes motif returns, one chord lower",
      ],
    },
    {
      window: "02:15–03:00",
      picture:
        "He unscrews the showroom plan cover and reveals the original emergency-receiver label. He lays three frame templates over three matching suite modules. None is yet clear; each is full of staging furniture.",
      vo: "The show apartment had three rooms, all empty of residents and full of things shaped like a life. A bowl of fruit that could not rot. Books that could not open. We had not run out of space. We had used it to demonstrate how much space the city had learned to save.",
      shots: [
        "2:15 — Four screws drop into his palm. A gilt plate comes away: LIVE LARGER — THE DEMONSTRATION RESIDENCE. Behind it, a stencil in correction red: EMERGENCY RECEIVER.",
        "2:26 — Top-down: the show apartment as a floor plan with staging furniture. Three violet acetate templates (living room, dining room, bedroom) slide into place. Each flashes red: BLOCKED — 31 / 24 / 19 ITEMS.",
        "2:38 — Real-world cut: the fruit bowl. A knuckle taps a pear: hollow tock. Plaster.",
        "2:48 — A shelf of books; he tries to open one: the pages are a painted block. Orrin looks at the unopened volume as though it owed him an explanation.",
      ],
      sound: [
        "Screws on tile: four distinct, tiny bounces",
        "Acetate template slide — wet, glassy",
        "Hollow pear ‘tock’ — a resonant tuned knock (~310 Hz)",
        "Showroom ambience is eerily clean: no air pump here; only HVAC",
      ],
    },
    {
      window: "03:00–03:45",
      picture:
        "The Attendant locks the transfer panel and places a tamper seal. Orrin photographs the seal and his own ID, then breaks it in view of the recorder. The purge clock continues. He does not yet activate transfer.",
      vo: "My key could inspect the mechanism. It could not authorize a transfer. The attendant sealed the control and waited for me to become reasonable. I recorded the seal number, my name, and what I intended to do. There are moments when making a mistake properly becomes less useful than making a record of refusing one.",
      shots: [
        "3:00 — The transfer panel: grey steel cabinet, a heavy lever, three keyed slots. The Attendant turns a lock, presses a numbered seal across the door: No. 0047-1193.",
        "3:11 — The Attendant folds their hands and waits. Orrin photographs the seal; flash. He photographs his own ID card; flash.",
        "3:23 — The Recorder is set on the panel, REC lamp steady. He says (VO) the seal number, his name, his intention. Thumbnail under the seal edge.",
        "3:34 — The seal tears: VOID chevrons across the broken strip. The LED purge clock keeps counting in the background. The lever is not touched.",
      ],
      sound: [
        "Lock turn — one oiled click, clean and unhurried",
        "Camera shutter ×2, flash capacitor whine",
        "Seal tear — a long dry rip, not a pop",
        "Purge clock: a quiet digital tick, one per second, underneath everything",
      ],
    },
  ],
  continuity: [
    "The Attendant is procedural, not omnipotent: locks, logs, requests reset. No private force.",
    "08:00 review vs 06:00 purge is stated aloud — and shown. Phones exist; the review is simply too late.",
    "Smashing the wall is excluded: a seam is a compressed threshold, not plaster over a full room.",
    "Orrin’s key can inspect, not authorize. Breaking the seal is visible and recorded — his responsibility stays on file.",
    "Nine occupants across three frames: porter + 2 laundry (A), family of three (B), Lenna + caregiver + older relative (C).",
    "His signature on the Demonstration Residence overlay — dated 14 months ago — is a plant that pays off in Episode 4.",
  ],
};

export const EPISODES: EpisodeData[] = [ep1, ep2];

export const cuesFor = (ep: EpisodeData, beat: number): Cue[] => computeCues(ep.beats[beat].vo);

export const beatStart = (beat: number) => beat * BEAT_LEN;
