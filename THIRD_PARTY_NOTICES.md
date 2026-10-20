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

## Output licences (what you may do with the audio)

| Voice | Terms |
|---|---|
| macOS `say` | Apple's macOS licence allows system voices for personal, non-commercial projects. |
| ElevenLabs | Free tier: attribution required, non-commercial. Paid plans: commercial use allowed. See ElevenLabs' terms. |
| Kokoro | Apache-2.0 model; you own your output. |
| Piper / other `command` voices | Per voice; read the model card. |

This page is a summary for convenience, not legal advice. Each project's own licence text is what applies.
