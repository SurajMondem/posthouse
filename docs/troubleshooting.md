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
| `note: elevenlabs is used only when you ask for it` | ElevenLabs is set as the draft voice | Expected. Draft with a free voice; `npm run voice -- --final` for ElevenLabs |
| `no source could make this music/sfx` | Nothing in the order can deliver (lists why for each) | Install a model (`posthouse setup …`), add a file to `assets/`, or reorder `assets.*.order` |
| `no ACE-Step server at http://127.0.0.1:8001` | The server isn't running | `node bin/posthouse.mjs serve acestep` in another terminal (first start downloads models) |
| `musicgen is not set up` / `stable-audio is not set up` | Optional model not installed | `node bin/posthouse.mjs setup <name> --yes` |
| Stable Audio: `401` / `gated repo` | Model terms not accepted | Accept them on the model's Hugging Face page, then `huggingface-cli login` |
| `check --commercial` fails | A non-commercial voice (macOS `say`) or track (MusicGen) is in the video | Re-voice with another provider; regenerate the asset with `"commercial": true` in `scenes.json` |
| Music too loud or quiet | `music.volume` | 0.2–0.4 suits most beds; `duck` sets how far it dips under speech |
| Render is slow | High resolution / long video | `npm run render -- --concurrency=8`, or render a still: `npm run still -- --frame=120` |
