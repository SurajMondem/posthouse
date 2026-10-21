# Sound

Sound in posthouse works like haptics on a phone: small, quiet confirmations that something moved or landed. The
voice always stays on top.

| Sound | When it plays | Volume | File |
|---|---|---|---|
| whoosh | every camera move between scenes | 0.35 | `public/sfx/whoosh.wav` |
| tick | a carrier lands in the next scene | 0.6 | `public/sfx/tick.wav` |
| pop | on cue words you list in `pops` | 0.5 | `public/sfx/pop.wav` |
| sting | after the last word, over the closing card | 0.6 | `public/sfx/sting.wav` |
| music bed | under everything, ducked under the voice | `music.volume` | any file you set in `scenes.json` |

Volumes are per video: `volume: { whoosh: 0.2 }` in `src/video/config.tsx`. Drop the sting with `"sting": false`
in `video/scenes.json`.

## The default kit

The four kit sounds are **synthesised from maths** by `lib/sfx.mjs` with ffmpeg: filtered noise under a swell
(whoosh), a decaying sine (tick), a falling-pitch blip (pop), a four-note arpeggio (sting). No samples, so there's
nothing to license or credit. Rebuild them with `node bin/posthouse.mjs kit`.

## Replacing a sound

Any sound in a video is just a file with a known name. Make or fetch a new one with the asset command and it
replaces the old one for that video:

```bash
node ../../bin/posthouse.mjs asset sfx "airy cinematic whoosh" --name whoosh             # free sources first
node ../../bin/posthouse.mjs asset sfx "airy cinematic whoosh" --name whoosh --source elevenlabs   # when you ask
```

Where sounds can come from (your files, synth, Stable Audio Open, CC0 libraries, ElevenLabs) and how the choice is
made: [assets.md](assets.md).

## Music

Make or fetch a bed, then point `scenes.json` at it:

```bash
node ../../bin/posthouse.mjs asset music "calm warm synth pad" --seconds 60 --name bed
```

```json
"music": { "file": "music/bed.wav", "volume": 0.3, "duck": 0.4 }
```

Sources for music (ACE-Step, MusicGen, Stable Audio Open, procedural, CC0, ElevenLabs) and their licences:
[assets.md](assets.md).
