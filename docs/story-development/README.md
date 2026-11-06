# Story library — start here

Every storyline now has **one dedicated folder**. Open its `README.md`, then use only that folder's story material when developing or generating that series. Shared comparisons and general audio advice are optional, not dependencies of the new-series packages.

## Choose a storyline

| Storyline folder | Format | What is ready |
|---|---|---|
| [Star Catcher](star-catcher/README.md) | Existing four-episode arc, 14:30 total | Arc review and a map to the existing application, narration subtitles, and audio assets. Runtime files remain in their original locations. |
| [Good Mourning](good-mourning/README.md) | 6 × 10-minute targets; ensemble dialogue | Series bible, 42-scene treatment, all six complete first-draft screenplays, continuity ledger, and structural validator. |
| [The Republic of Tomorrow](the-republic-of-tomorrow/README.md) | 6 × 10-minute targets; ensemble dialogue | Complete series treatment, world/character bible, six timed episode outlines, and payoff/continuity maps. Full screenplays are not yet written. |
| [Nobody Owns Tuesday](nobody-owns-tuesday/README.md) | 6 × 10-minute targets; ensemble dialogue | Complete series treatment, world/character bible, six timed episode outlines, and payoff/continuity maps. Full screenplays are not yet written. |
| [The Department of Missing Rooms](the-department-of-missing-rooms/README.md) | 6 × 4-minute targets; one narrator | Complete episode treatments and VO, timed picture/sound beats, six narration-only text files, continuity rules, and a standalone narration builder/checker. |
| [The Town That Forgot the Dark](the-town-that-forgot-the-dark/README.md) | 6 × 4-minute targets; one narrator | Complete episode treatments and VO, timed picture/sound beats, six narration-only text files, continuity rules, and a standalone narration builder/checker. |

## Folder map

```text
docs/story-development/
├── README.md                         ← this library index
├── validate_library.py               ← checks links and existing package validators
├── star-catcher/
│   ├── README.md                     ← existing production file map
│   └── arc-review.md
├── good-mourning/
│   ├── README.md
│   ├── series-bible.md
│   ├── scene-by-scene-treatments.md
│   ├── continuity-ledger.md
│   ├── screenplays/                  ← episodes 101–106, Fountain format
│   └── validate_package.py
├── the-republic-of-tomorrow/
│   ├── README.md
│   └── series-bible.md
├── nobody-owns-tuesday/
│   ├── README.md
│   └── series-bible.md
├── the-department-of-missing-rooms/
│   ├── README.md
│   ├── series-bible.md                ← includes every episode's picture beats + VO
│   ├── narration/                    ← README + 01.txt–06.txt, spoken words only
│   └── prepare_narration.py
├── the-town-that-forgot-the-dark/
│   ├── README.md
│   ├── series-bible.md
│   ├── narration/                    ← README + 01.txt–06.txt, spoken words only
│   └── prepare_narration.py
└── shared/                           ← optional cross-project reference
    ├── README.md
    ├── slate-overview.md
    ├── narrated-mini-series-overview.md
    ├── narration-workflow.md
    └── audio-production-guide.md
```

## Which files should I give a generation tool?

- **Story/world/visual reference:** the chosen folder's `series-bible.md`.
- **Good Mourning actor dialogue:** the relevant file in its `screenplays/` directory. Separate spoken lines from screenplay action before generating speech. Use its ledger to preserve continuity.
- **Short-series narration:** the relevant `narration/01.txt`–`06.txt`. Generate its five paragraphs separately, aligned to the bible's picture beats. Do not feed the entire bible into TTS.
- **Republic / Tuesday:** expand the treatment into scripts first; no narration-only or full dialogue script has been supplied yet.
- **Original Star Catcher:** follow its folder's file map. Existing audio, subtitles, and rendering source have deliberately not been moved or duplicated.

No new-series audio, images, or video have been generated. The new projects are writing/reference packages. All runtime figures are editorial targets except the existing Star Catcher episode definitions.

## Validate the organization

From the repository root:

```bash
python docs/story-development/validate_library.py
```

This checks local links, folder entry points, the Good Mourning scene/timing checks, both short-series narration exports, and outline timing for the two treatment-stage projects. It does not verify performed runtime or artistic quality.

The previous flat numbered files and combined `narrated-mini-series/` folder have been replaced by these locations. Links and maintenance commands inside the repository have been updated; older chat links may refer to superseded paths.
