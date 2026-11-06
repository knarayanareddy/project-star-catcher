# The Town That Forgot the Dark
## Start here — self-contained storyline folder

**Format:** six single-narrator episodes, each targeting 4:00 including a 15-second end card. 24-minute season.
**Status:** complete first-draft episode stories, narration, and timed picture/sound beats; not generated audio or finished video.

Everything already written for this storyline is in this folder. You do not need another series' documents.

## Files to use

1. [Series bible and complete episode treatments](series-bible.md) — premise, world rules, characters, all six episodes, five timed picture/sound beats per episode, complete VO, setup/payoff audit, and production boundaries.
2. [Narration-only scripts](narration/README.md) — six plain-text episode files, without production directions.
3. `prepare_narration.py` — independently extracts and checks this series' narration; needs only Python's standard library. It does not generate audio.

## Generation workflow

1. Read the whole bible before creating assets; the final episodes depend on the early rules.
2. Cast **Iona Senn** once. One mature feminine voice: warm public-service delivery, becoming more candid without losing clarity.
3. Keep the same approved voice reference, model/version, pronunciation notes, and settings across all six episodes. No second character voice is required.
4. For each episode, use the corresponding `narration/01.txt`–`06.txt`. Each file contains five spoken paragraphs corresponding to the five 45-second picture beats. Generate one paragraph per clip.
5. Use the bible's picture/sound directions for visual generation and editing. Do not narrate those directions. The narration assumes pictures; it is not a sound-only audiobook adaptation.
6. Assemble narration, music, ambience, and effects as separate tracks. Leave room for the nonverbal action rather than stretching speech to fill each window.
7. Time an animatic. Four minutes is a target allocation, not a verified voice-generation duration.

## Repeated PA cue

The three-word recorded cue, **Rest. Rise. Return.**, is Iona's voice, not another actor. Record it once and reuse it only where the picture directions call for the existing PA recording. The fresh return instruction in episode 5 is intentional. Her private diary narration is not broadcast over the town's feeding PA.

## Episode narration

1. [Good Night, Productive Citizens](narration/01.txt)
2. [Additional Rest](narration/02.txt)
3. [The Things We Dream for Free](narration/03.txt)
4. [A Rehearsal for Night](narration/04.txt)
5. [One Hour](narration/05.txt)
6. [The Unread Page](narration/06.txt)

## Update or validate this folder

From this folder:

```bash
python prepare_narration.py --check
```

After editing the VO paragraphs in `series-bible.md`, regenerate exports:

```bash
python prepare_narration.py --write
```

The bible is the authored source; the narration files are derived copies. Edit the bible first. No other storyline folder is required for either command.
