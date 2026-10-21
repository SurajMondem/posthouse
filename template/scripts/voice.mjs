// Voice: video/scenes.json text → narration/<id>.wav + narration/<id>.words.json (+ public/voice/<id>.wav).
// Usage: npm run voice [-- --dry-run] [--only <scene id>] [--force] [--final] [--provider <name>]
//   --dry-run   show which scenes would be voiced (and the cost, for paid providers); make nothing
//   --only      voice one scene
//   --force     re-voice even if the scene is cached
//   --final     use the final voice (config voice.final, ElevenLabs by default). Paid voices run only this way.
//   --provider  use this provider for this run (elevenlabs | say | kokoro | command | none)
// Drafts use the configured free provider. Every take is cached in narration/cache/ by a hash of its text, its
// neighbours' text, the provider and its settings, so switching between draft and final never re-spends credits.
import fs from 'node:fs';
import path from 'node:path';
import { arg, has, lib, readJson, REPO, VIDEO } from './repo.mjs';

const { chooseVoice, loadConfig, merge } = await lib('config.mjs');
const { loadProvider } = await lib('voice/index.mjs');
const { wordsFor } = await lib('align.mjs');
const { duration } = await lib('audio.mjs');
const { cacheKey } = await lib('words.mjs');

const spec = readJson('video', 'scenes.json');
const config = loadConfig(REPO);
const { name, note } = chooseVoice(config, { explicit: arg('provider'), final: has('final'), wanted: spec.voice?.provider });
if (note) console.log(`note: ${note}`);
const provider = await loadProvider(name);
const opts = merge(config.voice?.[name] ?? {}, spec.voice?.[name] ?? {});
const narr = path.join(VIDEO, 'narration');
const cache = path.join(narr, 'cache');
const pub = path.join(VIDEO, 'public', 'voice');
for (const d of [narr, cache, pub]) fs.mkdirSync(d, { recursive: true });

const all = spec.scenes;
const plan = all.map((s, i) => {
  const req = { text: s.text.trim(), previousText: all[i - 1]?.text.trim(), nextText: all[i + 1]?.text.trim() };
  const key = cacheKey({ provider: name, opts, ...req });
  const base = path.join(cache, key);
  const meta = fs.existsSync(`${base}.json`) ? JSON.parse(fs.readFileSync(`${base}.json`, 'utf8')) : null;
  const cached = !!meta && fs.existsSync(`${base}.words.json`) && (!meta.audio || fs.existsSync(`${base}.wav`));
  return { s, req, key, base, cached };
});
const todo = plan.filter((p) => (!arg('only') || p.s.id === arg('only')) && (has('force') || !p.cached));

console.log(`voice: ${provider.describe(opts)}`);
for (const p of plan) console.log(`  ${p.s.id.padEnd(14)} ${todo.includes(p) ? `voice    ${p.req.text.length} chars` : 'cached'}`);
const est = todo.length && provider.estimate ? await provider.estimate(todo.map((p) => p.req.text), opts) : null;
if (est) console.log(`  estimate ${est.line}`);
if (has('dry-run')) process.exit(0);
if (est?.blocked) throw new Error(est.blocked);

for (const p of todo) {
  const out = `${p.base}.wav`;
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
  fs.writeFileSync(`${p.base}.words.json`, JSON.stringify(words, null, 2) + '\n');
  fs.writeFileSync(`${p.base}.json`, JSON.stringify({ key: p.key, provider: name, words: method, audio: !!r.wav, duration: dur, license: provider.license?.(opts) ?? null, at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`  ${p.s.id.padEnd(14)} ${dur.toFixed(2)} s · timings: ${method}`);
}

// Point each scene at its take for this provider.
for (const p of plan) {
  if (!fs.existsSync(`${p.base}.json`)) continue; // --only skipped it and it was never voiced with this provider
  const meta = JSON.parse(fs.readFileSync(`${p.base}.json`, 'utf8'));
  fs.copyFileSync(`${p.base}.words.json`, path.join(narr, `${p.s.id}.words.json`));
  fs.writeFileSync(path.join(narr, `${p.s.id}.json`), JSON.stringify({ ...meta, scene: p.s.id }, null, 2) + '\n');
  const dest = path.join(pub, `${p.s.id}.wav`);
  if (meta.audio) {
    fs.copyFileSync(`${p.base}.wav`, path.join(narr, `${p.s.id}.wav`));
    fs.copyFileSync(`${p.base}.wav`, dest);
  } else {
    fs.rmSync(path.join(narr, `${p.s.id}.wav`), { force: true });
    fs.rmSync(dest, { force: true });
  }
}
console.log('voice: done. Listen (narration/*.wav), then: npm run storyboard');
