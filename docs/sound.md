# Sound

Sound in posthouse works like haptics on a phone: small, quiet confirmations that something moved or landed. The
voice always stays on top.

| Sound | When it plays | Volume | File |
|---|---|---|---|
| whoosh | every camera move between scenes | 0.35 | `whoosh.wav` (0.7 s) |
| tick | a carrier lands in the next scene | 0.6 | `tick.wav` (0.08 s) |
| pop | on cue words you list in `pops` | 0.5 | `pop.wav` (0.18 s) |
| sting | after the last word, over the closing card | 0.6 | `sting.wav` (3 s) |

Volumes are per video: `volume: { whoosh: 0.2 }` in `src/video/config.tsx`. Drop the sting with `"sting": false`
in `video/scenes.json`.

## The default kit

The four sounds in `kit/sfx/` are **synthesised from maths** by `lib/sfx.mjs` with ffmpeg: filtered noise under a
swell (whoosh), a decaying sine (tick), a falling-pitch blip (pop), a four-note arpeggio (sting). No samples, so
there's nothing to license or credit. Rebuild them (and copy them into the template) with:

```bash
node bin/posthouse.mjs sfx
```

Tweak a sound by editing its ffmpeg expression in `lib/sfx.mjs` and rebuilding.

## Your own sounds

Replace any file in `kit/sfx/` and `template/public/sfx/` (videos you've already started keep their own copy in
`public/sfx/`). Keep the names, use 48 kHz WAV, and normalise peaks to about −3 dB:

```bash
ffmpeg -i my-whoosh.mp3 -ar 48000 -af "loudnorm=I=-20:TP=-3" kit/sfx/whoosh.wav
```

Where to find more:

| Source | Licence | Notes |
|---|---|---|
| Your own recordings | yours | A phone in a quiet room is enough for ticks and pops. |
| [Kenney](https://kenney.nl/assets?q=audio) | CC0 | Good UI packs; no credit needed. |
| [Freesound](https://freesound.org) | per file | Filter by CC0; read each file's licence. |
| ElevenLabs sound effects | your plan's terms | `elevenlabs.soundEffect()` in `lib/voice/elevenlabs.mjs`; paid plans allow commercial use. |

## Music

Not built in yet (it's on the roadmap). To add a bed today, put a file in `public/` and add a Remotion `<Audio>` at
a low volume (~0.08) in `src/Root.tsx`, under the stage.
