# Audio production — consolidated discussion reference

**Context:** the creator has an Apple M1 MacBook with 16 GB RAM. This document preserves the recommendations discussed in chat so they are not scattered across messages. It is not a fresh benchmark, a guarantee of hardware performance, or a legal opinion. Product terms and model support should be checked again before production.

## Recommended production structure

**Persistent character/narrator voices + separately created music + editorial assembly.** Keep original WAV clips, alternatives, voice-reference assets, model/version information, and rights records. Do not rely on one generation of a mixed ten-minute track as the only editable master.

- **Ensemble series:** audition each character, preserve the selected voice/reference, generate small exchanges, and keep independently editable takes. Do not feed screenplay directions into TTS as spoken text.
- **Single-narrator series:** one approved voice for the whole season. The local narration files contain five paragraphs per episode; use the local bible's beat timings. Other characters remain silent.
- **Star Catcher:** existing episode audio/subtitles are mapped in its folder. This organization does not replace them.

## Paid/convenience route discussed

- **ElevenLabs:** documented voice IDs and text/voice-ID dialogue turns make it a practical audition candidate for consistent casts. Persistent identity is not a guarantee of identical accent, acting, or pace. Multi-speaker output does not automatically imply isolated per-actor stems. [Dialogue documentation](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert).
- **Suno:** use for music experiments and approved instrumental cues, keeping the score separate from actor dialogue. Reuse approved recordings rather than expecting every fresh prompt to recreate an identical motif. Verify the applicable download and commercial-use terms. [Terms](https://suno.com/terms).
- **DaVinci Resolve / Fairlight:** proposed editor for picture, dialogue, effects, music, and final delivery. Start with the free edition; some advanced tools require Studio. [Fairlight](https://www.blackmagicdesign.com/products/davinciresolve/fairlight).
- **REAPER:** optional dedicated audio editor/mixer, not an indefinitely free product. It offers an evaluation and paid licenses. There is no need to learn REAPER and Fairlight at the same time. [Licensing](https://www.reaper.fm/purchase.php).

## Free/local route discussed

- **Kokoro:** lightweight selectable preset voices; a useful first audition/table-read candidate. It is not guaranteed to supply the emotional range needed for every final dramatic scene. [Official repository](https://github.com/hexgrad/kokoro).
- **Qwen3-TTS:** supports reference-based voice cloning and a documented Voice Design → reusable clone-prompt workflow. Base models perform cloning; VoiceDesign creates new synthetic references; CustomVoice uses supplied presets. [Official repository](https://github.com/QwenLM/Qwen3-TTS).
- **MLX-Audio:** Apple-Silicon-oriented model execution route worth evaluating, including quantized options. The exact supported checkpoint and memory behavior must be checked before installation. [Repository](https://github.com/blaizzy/mlx-audio).
- **Audacity:** free/open-source recording and audio-editing option. [Website](https://www.audacityteam.org/).
- **LMMS:** free/open-source music composition software, not an automatic prompt-to-music service. [Website](https://lmms.io/).
- **Pixabay music:** stock music under its applicable license. Save the track link and any available certificate; Content ID claims can still occur. Free use is not exclusivity or unrestricted redistribution. [FAQ](https://pixabay.com/service/faq/).
- **Original small effects:** record your own kettle, cups, paper, chairs, breathing, and room ambience where practical. Preserve the same approved sound when a recurring object needs continuity.

**Free software does not mean free cloud computing.** Running locally avoids per-line service charges, but consumes memory, storage, electricity, and time. Renting GPUs is not part of a zero-cost promise. No model has been installed or benchmarked on the creator's actual Mac in this project.

## M1 / 16 GB approach

Start with a short local Kokoro test, or test a smaller/quantized Qwen Base configuration with an authorized reference. Do not commit to the largest model before measuring memory pressure and generation speed. Close heavy video-editing projects while generating voices. Save completed clips, unload the model, then edit.

The previously discussed Kokoro starting route used Python 3.11, an isolated virtual environment, `kokoro`, `soundfile`, and `espeak-ng`; it deliberately used CPU execution for an initial compatibility test. The Apple Silicon optimization route is a separate setup, not a promise that the same command automatically uses MLX. Installation instructions in a chat are not evidence that a local installation has succeeded.

## A voice reference per character

For an original synthetic cast, the proposed Qwen workflow is:

1. Design and audition a short reference.
2. Approve one specific recording, not just its written description.
3. Save that recording and exact transcript.
4. Build and reuse a clone prompt with a compatible Base model.
5. Preserve model/version, settings, pronunciation notes, and reference take across the season.
6. Generate and review short passages; repeatability of identity does not remove the need to direct performance.

For a real person's reference, obtain explicit authorization for cloning and intended use, including commercial episodes and future material. Do not substitute a celebrity imitation or an unauthorized recording.

## Suno voice → Qwen reference: important caution

Technically, Qwen can condition speech on a synthetic voice recording. That alone does not establish permission to use a particular service's output as the reference.

The Suno terms examined in the discussion included a restriction on using outputs to “power, enable or train” other AI/ML tools. The wording is broader than weight training. Using a Suno voice as a Qwen conditioning reference may therefore be restricted even if you hold commercial-use rights for the output itself. **Seek written clarification rather than assuming a paid subscription permits it.** [Suno terms](https://suno.com/terms).

The recommended cleaner route was **Qwen VoiceDesign → Qwen Base**, with Suno music remaining a separate licensed soundtrack asset. This is a contractual-risk recommendation, not a definitive legal interpretation.

Likewise, distinguish code and model-weight licenses: the AudioCraft/MusicGen discussion identified MIT code but noncommercial CC-BY-NC model weights. Do not assume that a free/open repository grants unrestricted commercial model use. [AudioCraft licensing](https://github.com/facebookresearch/audiocraft).

## First production test

For Good Mourning, test a 60–90-second Mara/Isha scene and replace one line to evaluate matching. For a narrated mini-series, test one 45-second beat with a simple animatic. Check intelligibility, pronunciation, voice continuity, natural pauses, and the ability to replace a clip independently.

Never infer final runtime from narration word count alone. The mini-series deliberately reserves time for pictures and sound. Music, effects, and pauses belong in the edit, not in an instruction asking TTS to stretch every paragraph to its window.
