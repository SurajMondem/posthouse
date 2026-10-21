# Third-party notices

posthouse's own code is under the [MIT License](LICENSE). It ships two font files and relies on the software below,
each under its own licence. Nothing listed here is copied into posthouse's source except the fonts.

## Shipped in this repository

| What | Where | Licence |
|---|---|---|
| Bricolage Grotesque (subset) | `template/public/fonts/` | [SIL Open Font License 1.1](template/public/fonts/OFL.txt) |
| DM Sans (Latin subset) | `template/public/fonts/` | [SIL Open Font License 1.1](template/public/fonts/OFL.txt) |
| Sound kit (whoosh, tick, pop, sting) | `kit/sfx/`, `template/public/sfx/` | MIT, as part of posthouse: synthesised by `lib/sfx.mjs`, no samples |
| Logo | `template/public/img/posthouse-mark.svg` | MIT, as part of posthouse |

## Installed by `npm run setup`

| Package | Licence | Note |
|---|---|---|
| `remotion`, `@remotion/cli` | [Remotion License](https://www.remotion.dev/license) | Free for individuals, for-profit organisations with up to 3 employees, and non-profits. Larger companies need a Remotion company licence. |
| `@remotion/fonts` | MIT | |
| `react`, `react-dom` | MIT | |
| `typescript`, `@types/react` | Apache-2.0, MIT | development only |

## Optional, installed by you

| Tool | Licence | Note |
|---|---|---|
| [ffmpeg](https://ffmpeg.org/legal.html) | LGPL-2.1+ / GPL depending on build | required; called as a separate program |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT | word timings; models are MIT |
| [kokoro-js](https://www.npmjs.com/package/kokoro-js) + Kokoro-82M | Apache-2.0 | local voice |
| [Piper](https://github.com/rhasspy/piper) | MIT (voices vary) | check each voice's licence |
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) | MIT (code and weights) | music; `posthouse setup acestep` |
| [MusicGen / audiocraft](https://github.com/facebookresearch/audiocraft) | code MIT, **weights CC-BY-NC 4.0** | music; `posthouse setup musicgen`; non-commercial output |
| [Stable Audio Open 1.0](https://huggingface.co/stabilityai/stable-audio-open-1.0) | Stability AI Community License (gated) | sfx and music; free commercial use under US$1M annual revenue |
| `torch`, `transformers`, `diffusers` (plugin venvs) | BSD-3 / Apache-2.0 | installed only into plugin environments |
| [Openverse](https://openverse.org) results | per file (CC0 by default) | posthouse records the licence and a credit line for each download |

## Output licences (what you may do with the audio)

| Voice | Terms |
|---|---|
| macOS `say` | Apple's macOS licence allows system voices for personal, non-commercial projects. |
| ElevenLabs | Free tier: attribution required, non-commercial. Paid plans: commercial use allowed. See ElevenLabs' terms. |
| Kokoro | Apache-2.0 model; you own your output. |
| Piper / other `command` voices | Per voice; read the model card. |
| ACE-Step 1.5 music | MIT; you own your output. |
| MusicGen music | CC-BY-NC 4.0 weights: non-commercial use only. |
| Stable Audio Open | Stability AI Community License: free commercial use under US$1M annual revenue. |
| Procedural music, synth sounds | MIT, as part of posthouse. |

Run `node bin/posthouse.mjs check --commercial` inside a video to check all of it at once.

This page is a summary for convenience, not legal advice. Each project's own licence text is what applies.
