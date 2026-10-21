# Changelog

## 0.2.0 (2026-10-20)

The open asset layer.

- **Paid services are intentional.** Draft voice (free) and final voice (`npm run voice -- --final`, ElevenLabs)
  are separate. ElevenLabs never runs from config alone or as a fallback.
- **Per-provider take cache** (`narration/cache/`): switching between draft and final never re-spends credits.
- **`posthouse asset sfx|music "prompt"`**: one resolver over your files, synth sounds, procedural music,
  ACE-Step 1.5, MusicGen, Stable Audio Open, Openverse (CC0) and ElevenLabs (only with `--source`). Results are
  cached, fitted to length, and music is normalised to −18 LUFS.
- **Music beds** in `scenes.json` that fade in, duck under every line of narration and fade out.
- **Licence tracking**: every take and asset records its licence; `posthouse check [--commercial]` audits a video
  and prints credit lines. Commercial videos skip non-commercial sources.
- **`posthouse setup` / `serve`** for optional local models, each in its own environment.
- New synth sounds: riser, impact, chime. `posthouse sfx` is now `posthouse kit` (old name still works).
- Example video gets a procedural music bed.
- Tested on an M1 Pro (16 GB): MusicGen ✓, Openverse ✓, synth/procedural ✓. ACE-Step runs out of memory on 16 GB
  machines; posthouse now refuses ACE-Step requests under 20 GB free disk, serves it without its optional LM, and
  connects over IPv4 (`127.0.0.1`, not `localhost`). See `docs/assets.md` § What's been tested.
- Stable Audio Open tested on Apple Silicon ✓. The plugin skips the repo's unused 4.5 GB single-file checkpoint,
  replaces the sampler's torchsde Brownian noise with seeded Gaussian noise off CUDA (it hit a RecursionError on
  MPS), and finds Hugging Face logins saved by older clients (`~/.huggingface/token`).

## 0.1.0 (2026-10-20)

First public release.

- One continuous stage in Remotion: stations, a camera that travels in the voice's pauses, carriers that morph
  shapes between scenes, a pulled-back closing overlay.
- Voice providers: ElevenLabs, macOS `say`, Kokoro, any shell command, and silent.
- Word timings from ElevenLabs, or whisper.cpp aligned onto the script, or an estimate.
- Storyboard: voice-timed scenes, cue words → seconds, caption pages per scene.
- Synthesised sound kit (whoosh, tick, pop, sting).
- Starter taste (`taste/`), Claude Code skill (`SKILL.md`), CLI (`doctor`, `new`, `voices`, `say`, `sfx`,
  `usage`).
- Example video and its source post.
- MIT licence, third-party notices, contributing guide, code of conduct, security policy, CI.
