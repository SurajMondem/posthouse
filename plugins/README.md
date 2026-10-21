# Plugins

Optional local models. Nothing here is installed until you run `node bin/posthouse.mjs setup <name>`. Each model
lives in its own environment under `~/.cache/posthouse/`, so posthouse itself stays dependency-free.

| Plugin | Makes | How it connects | Licence of the output |
|---|---|---|---|
| `acestep` | music (full songs or instrumentals, 10–600 s); 32 GB+ RAM or a CUDA GPU recommended | local REST server (`posthouse serve acestep`) | MIT |
| `musicgen` | music (up to 30 s, looped to length) | `musicgen/generate.py` in a venv | CC-BY-NC 4.0: non-commercial |
| `stable-audio` | sound effects, textures, short beds (up to 47 s) | `stable-audio/generate.py` in a venv | Stability AI Community License |
| `kokoro` | narration voice | `kokoro-js` npm package | Apache-2.0 |

A plugin script takes `--prompt --seconds --out` (plus its own options), writes an audio file, and prints one JSON
line. To add one: a folder here with `generate.py` + `requirements.txt`, a source in `lib/assets/sources.mjs`, and
a row in `docs/assets.md`.
