# Troubleshooting

Start with `node bin/posthouse.mjs doctor`. It checks each piece and prints the fix.

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module './storyboard.json'` in Studio or render | No storyboard yet | `npm run voice && npm run storyboard` |
| `cue "x" wants the word "y", which isn't in: …` | The cue word isn't in the narration (or was spelled differently) | Change the cue to a word that's said, or fix the script; then `npm run voice` and `npm run storyboard` |
| Cues land a beat early or late | Timings were estimated (no whisper) | Install whisper.cpp ([voices.md](voices.md#word-timings)); `npm run voice -- --force` |
| Captions show a misspelled name | ElevenLabs/whisper spelled it as heard | `captionPhrases` (multi-word) or `captionFixes` (one word) in `scenes.json` |
| `ELEVENLABS_API_KEY is not set` | No key in the environment | `cp .env.example .env` and fill it in |
| `401` from ElevenLabs | Wrong or revoked key | Make a new key; update `.env` |
| `not enough credits` | Plan limit reached | Shorten the script, wait for the reset, or switch provider for drafts |
| `kokoro-js is not installed` | Optional dependency missing | `npm install --no-save kokoro-js` at the repo root |
| `voice command failed` | The `command` provider's program errored | Run the printed command yourself to see the error |
| `ffmpeg is not on PATH` | ffmpeg missing | macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg` |
| `the template is not installed yet` | `posthouse new` before setup | `npm run setup` |
| A scene's element appears twice during a camera move | The carried-in copy is visible while the carrier draws it | Hide it while `t < 0` ([stage-api.md](stage-api.md#a-scene)) |
| Render is slow | High resolution / long video | `npm run render -- --concurrency=8`, or render a still: `npm run still -- --frame=120` |
