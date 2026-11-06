# Project Star Catcher

> **Episode I: The Hollow Tide**  
> *A five-minute generative nightmare-anime short. Every frame and note made by code.*

---

## Overview

**Star Catcher** is a generative cinematic experience created entirely in-browser. Built with React, Vite, TypeScript, Tailwind CSS, Canvas API, and Web Audio API, the project synthesizes real-time visuals and audio without pre-rendered video assets or recorded audio files.

- **Runtime:** 5:00
- **Aspect Ratio:** 16:9
- **Audio:** Real-time Web Audio API procedural synthesis with heartbeat motif spine
- **Visuals:** Canvas rendering engine with custom camera work, palette transforms, and post-processing

---

## Features

- **Procedural Cinematic Engine:** Custom rendering pipeline orchestrating 2D canvas drawing, mecha animations, atmosphere layers, particle systems, and optical bloom.
- **Audio Synthesis:** Layered procedural sound design including mechanical pulses, drones, synth melodies, and dynamic environmental cues.
- **Interactive Director Controls:**
  - Chapter scrubbing and timeline jump points.
  - Narration window cue sheets.
  - Real-time full-screen preview.
  - Series bible and episode pitches.
  - Direct canvas recording/exporting capabilities.

---

## Story Development

**[Open the organized story library](docs/story-development/README.md).** Each storyline has its own folder and a `README.md` explaining what to use for generation:

- [Star Catcher](docs/story-development/star-catcher/README.md) — arc review and original production-file map.
- [Good Mourning](docs/story-development/good-mourning/README.md) — bible, scene treatments, six full first-draft screenplays, and continuity ledger.
- [The Republic of Tomorrow](docs/story-development/the-republic-of-tomorrow/README.md) — bible and six detailed episode outlines.
- [Nobody Owns Tuesday](docs/story-development/nobody-owns-tuesday/README.md) — bible and six detailed episode outlines.
- [The Department of Missing Rooms](docs/story-development/the-department-of-missing-rooms/README.md) — six four-minute narrated episodes, picture/sound beats, and narration-only files.
- [The Town That Forgot the Dark](docs/story-development/the-town-that-forgot-the-dark/README.md) — six four-minute narrated episodes, picture/sound beats, and narration-only files.

Cross-project comparisons and the consolidated audio-tool discussion are in [shared reference](docs/story-development/shared/README.md). The new-series materials are development documents, not implemented episodes. The existing player and original production assets remain unchanged.

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn / pnpm

### Installation

```bash
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

---

## Series Bible & Motifs

- **The Heartbeat:** Mech heart → baby's heart → the empty mech's final beat at 4:55.
- **The Lullaby:** D-minor music box; major when given, warped when wrong.
- **The Belly Map:** The Mother's constellation is a portrait of the Star Catcher. His chest star was missing until he gave it away.
- **The Sea Reflects the True Sky:** Watch the eyes.
- **The Spinning Top:** Never falls on screen.
