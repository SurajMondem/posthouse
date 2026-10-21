// Voice: video/scenes.json → narration/<id>.wav + narration/<id>.words.json (+ public/voice/<id>.wav) for every scene
// and every bridge (`<scene id>~bridge`, the line spoken over the camera move into that scene).
// Usage: npm run voice [-- --dry-run] [--force] [--final] [--provider <name>] [--take continuous|scenes] [--only <id>]
//   --dry-run   show the script lint, what would be voiced and the cost (paid providers); make nothing
//   --force     re-voice even if cached
//   --final     use the final voice (config voice.final, ElevenLabs by default). Paid voices run only this way.
//   --provider  use this provider for this run (elevenlabs | say | kokoro | command | none)
//   --take      continuous (default): the whole script in ONE take, then sliced into scenes, so the intonation flows
//               like one person talking. scenes: one take per scene and bridge (cheaper to re-voice one scene).
//   --only      (scenes take) voice one scene or bridge
// Every take is normalised to −16 LUFS and cached in narration/cache/ by a hash of its text and settings, so
// switching between draft and final never re-spends credits.
import fs from 'node:fs';
import path from 'node:path';
import { arg, has, lib, readJson, REPO, VIDEO } from './repo.mjs';

const { chooseVoice, loadConfig, merge } = await lib('config.mjs');
const { loadProvider } = await lib('voice/index.mjs');
const { wordsFor } = await lib('align.mjs');
const { duration, ffmpeg, normalize } = await lib('audio.mjs');
const { cacheKey, tokenize } = await lib('words.mjs');
const { lintScript, segments, splitTake } = await lib('script.mjs');

const VOICE_LUFS = -16;
const spec = readJson('video', 'scenes.json');
const config = loadConfig(REPO);
const { name, note } = chooseVoice(config, { explicit: arg('provider'), final: has('final'), wanted: spec.voice?.provider });
if (note) console.log(`note: ${note}`);
const provider = await loadProvider(name);
const opts = merge(config.voice?.[name] ?? {}, spec.voice?.[name] ?? {});
const take = arg('take') ?? spec.delivery?.take ?? 'continuous';
const narr = path.join(VIDEO, 'narration');
const cache = path.join(narr, 'cache');
const pub = path.join(VIDEO, 'public', 'voice');
for (const d of [narr, cache, pub]) fs.mkdirSync(d, { recursive: true });

for (const w of lintScript(spec)) console.log(`script ${w.level}: ${w.scene ? `${w.scene}: ` : ''}${w.message}`);

// Emotion tags ([curious], [excited]…) only reach models that perform them (ElevenLabs v3); everyone else gets plain text.
const tags = name === 'elevenlabs' && /v3/.test(opts.modelId ?? '');
const said = (s) => (tags && s.tone ? `[${s.tone}] ${s.text}` : s.text);
const segs = segments(spec);
const meta = (base) => (fs.existsSync(`${base}.json`) ? JSON.parse(fs.readFileSync(`${base}.json`, 'utf8')) : null);
const cachedAt = (base) => { const m = meta(base); return !!m && fs.existsSync(`${base}.words.json`) && (!m.audio || fs.existsSync(`${base}.wav`)); };

// One take: speak → words → normalise → cache. Returns the cache base path.
async function voiceTake({ text, previousText, nextText, key }) {
  const base = path.join(cache, key);
  if (!has('force') && cachedAt(base)) return base;
  const out = `${base}.wav`;
  const r = await provider.speak({ text, previousText, nextText, out, opts });
  let words = r.words;
  let method = provider.words;
  let dur = r.duration;
  if (r.wav) {
    const tmp = `${base}.raw.wav`;
    fs.renameSync(out, tmp);
    normalize(tmp, out, VOICE_LUFS);
    fs.rmSync(tmp, { force: true });
    if (words) dur = duration(out);
    else ({ words, method, duration: dur } = wordsFor(out, text, config));
  } else {
    fs.rmSync(out, { force: true });
  }
  fs.writeFileSync(`${base}.words.json`, JSON.stringify(words, null, 2) + '\n');
  fs.writeFileSync(`${base}.json`, JSON.stringify({ key, provider: name, words: method, audio: !!r.wav, duration: dur, license: provider.license?.(opts) ?? null, at: new Date().toISOString() }, null, 2) + '\n');
  return base;
}

// Write one segment's files where the storyboard and the renderer look for them.
function publish(seg, { wav, words, dur, m }) {
  fs.writeFileSync(path.join(narr, `${seg.id}.words.json`), JSON.stringify(words, null, 2) + '\n');
  fs.writeFileSync(path.join(narr, `${seg.id}.json`), JSON.stringify({ ...m, duration: dur, scene: seg.scene, kind: seg.kind, take }, null, 2) + '\n');
  const local = path.join(narr, `${seg.id}.wav`);
  const dest = path.join(pub, `${seg.id}.wav`);
  if (wav) { if (wav !== local) fs.copyFileSync(wav, local); fs.copyFileSync(local, dest); } else { fs.rmSync(local, { force: true }); fs.rmSync(dest, { force: true }); }
  console.log(`  ${seg.id.padEnd(20)} ${dur.toFixed(2)} s · timings: ${m.words}`);
}

const continuous = take === 'continuous' && name !== 'none';
const chars = segs.reduce((n, s) => n + said(s).length, 0);
console.log(`voice: ${provider.describe(opts)} · ${continuous ? 'one continuous take' : 'one take per scene'} · ${segs.length} segments (${segs.filter((s) => s.kind === 'bridge').length} bridges)`);

if (continuous) {
  const text = segs.map(said).join(' ');
  const key = cacheKey({ provider: name, opts, take: 'continuous', text });
  const fresh = has('force') || !cachedAt(path.join(cache, key));
  console.log(`  whole script   ${fresh ? `voice    ${chars} chars` : 'cached'}`);
  const est = fresh && provider.estimate ? await provider.estimate([text], opts) : null;
  if (est) console.log(`  estimate ${est.line}`);
  if (has('dry-run')) process.exit(0);
  if (est?.blocked) throw new Error(est.blocked);
  const base = await voiceTake({ text, key });
  const m = meta(base);
  const words = JSON.parse(fs.readFileSync(`${base}.words.json`, 'utf8'));
  const counts = segs.map((s) => tokenize(s.text).length);
  if (words.length !== counts.reduce((a, b) => a + b, 0)) throw new Error(`the take has ${words.length} words but the script has ${counts.reduce((a, b) => a + b, 0)}; re-run with --take scenes`);
  splitTake(words, counts, m.duration).forEach((slice, k) => {
    const seg = segs[k];
    const wav = path.join(narr, `${seg.id}.wav`);
    ffmpeg(['-ss', String(slice.start), '-to', String(slice.end), '-i', `${base}.wav`, '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', wav]);
    publish(seg, { wav, words: slice.words, dur: duration(wav), m });
  });
} else {
  const plan = segs.map((s, i) => {
    const req = { text: said(s), previousText: segs[i - 1]?.text, nextText: segs[i + 1]?.text };
    return { s, req, key: cacheKey({ provider: name, opts, ...req }) };
  });
  const todo = plan.filter((p) => (!arg('only') || p.s.id === arg('only')) && (has('force') || !cachedAt(path.join(cache, p.key))));
  for (const p of plan) console.log(`  ${p.s.id.padEnd(20)} ${todo.includes(p) ? `voice    ${p.req.text.length} chars` : 'cached'}`);
  const est = todo.length && provider.estimate ? await provider.estimate(todo.map((p) => p.req.text), opts) : null;
  if (est) console.log(`  estimate ${est.line}`);
  if (has('dry-run')) process.exit(0);
  if (est?.blocked) throw new Error(est.blocked);
  for (const p of plan) {
    if (arg('only') && p.s.id !== arg('only') && !cachedAt(path.join(cache, p.key))) continue;
    const base = await voiceTake({ ...p.req, key: p.key });
    const m = meta(base);
    publish(p.s, { wav: m.audio ? `${base}.wav` : null, words: JSON.parse(fs.readFileSync(`${base}.words.json`, 'utf8')), dur: m.duration, m });
  }
}
console.log('voice: done. Listen (narration/*.wav), then: npm run storyboard');
