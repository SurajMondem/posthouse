// Voice: video/scenes.json text → narration/<id>.wav + narration/<id>.words.json (+ public/voice/<id>.wav).
// Usage: npm run voice [-- --dry-run] [--only <scene id>] [--force] [--provider <name>]
//   --dry-run   show which scenes would be voiced (and the cost, for paid providers); make nothing
//   --only      voice one scene
//   --force     re-voice even if the scene is cached
//   --provider  override the provider for this run (elevenlabs | say | kokoro | command | none)
// The provider comes from scenes.json "voice.provider", else the repo config. A scene is cached by a hash of its
// text, its neighbours' text, the provider and its settings: unchanged scenes are free and instant.
import fs from 'node:fs';
import path from 'node:path';
import { arg, has, lib, readJson, REPO, VIDEO } from './repo.mjs';

const { loadConfig, merge, providerName } = await lib('config.mjs');
const { loadProvider } = await lib('voice/index.mjs');
const { wordsFor } = await lib('align.mjs');
const { duration } = await lib('audio.mjs');
const { cacheKey } = await lib('words.mjs');

const spec = readJson('video', 'scenes.json');
const config = loadConfig(REPO);
const name = providerName(config, arg('provider') ?? spec.voice?.provider);
const provider = await loadProvider(name);
const opts = merge(config.voice?.[name] ?? {}, spec.voice?.[name] ?? {});
const narr = path.join(VIDEO, 'narration');
const pub = path.join(VIDEO, 'public', 'voice');
fs.mkdirSync(narr, { recursive: true });
fs.mkdirSync(pub, { recursive: true });

const all = spec.scenes;
const plan = all.map((s, i) => {
  const req = { text: s.text.trim(), previousText: all[i - 1]?.text.trim(), nextText: all[i + 1]?.text.trim() };
  const key = cacheKey({ provider: name, opts, ...req });
  const metaFile = path.join(narr, `${s.id}.json`);
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : null;
  const cached = meta?.key === key && fs.existsSync(path.join(narr, `${s.id}.words.json`)) && (!meta.audio || fs.existsSync(path.join(narr, `${s.id}.wav`)));
  return { s, req, key, metaFile, cached };
});
const todo = plan.filter((p) => (!arg('only') || p.s.id === arg('only')) && (has('force') || !p.cached));

console.log(`voice: ${provider.describe(opts)}`);
for (const p of plan) console.log(`  ${p.s.id.padEnd(14)} ${todo.includes(p) ? `voice    ${p.req.text.length} chars` : 'cached'}`);
const est = todo.length && provider.estimate ? await provider.estimate(todo.map((p) => p.req.text), opts) : null;
if (est) console.log(`  estimate ${est.line}`);
if (has('dry-run')) process.exit(0);
if (est?.blocked) throw new Error(est.blocked);

for (const p of todo) {
  const out = path.join(narr, `${p.s.id}.wav`);
  const r = await provider.speak({ ...p.req, out, opts });
  let words = r.words;
  let method = provider.words;
  let dur = r.duration;
  if (r.wav && words) {
    dur = duration(r.wav);
  } else if (r.wav) {
    ({ words, method, duration: dur } = wordsFor(r.wav, p.req.text, config));
  } else {
    fs.rmSync(out, { force: true });
  }
  fs.writeFileSync(path.join(narr, `${p.s.id}.words.json`), JSON.stringify(words, null, 2) + '\n');
  fs.writeFileSync(p.metaFile, JSON.stringify({ key: p.key, provider: name, words: method, audio: !!r.wav, duration: dur, at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`  ${p.s.id.padEnd(14)} ${dur.toFixed(2)} s · timings: ${method}`);
}
for (const p of plan) {
  const wav = path.join(narr, `${p.s.id}.wav`);
  const dest = path.join(pub, `${p.s.id}.wav`);
  if (fs.existsSync(wav)) fs.copyFileSync(wav, dest);
  else fs.rmSync(dest, { force: true });
}
console.log('voice: done. Listen (narration/*.wav), then: npm run storyboard');
