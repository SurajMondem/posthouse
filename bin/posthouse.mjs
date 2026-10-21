#!/usr/bin/env node
// posthouse: turn a post into a narrated video.
//   posthouse doctor                          check your setup and say how to fix what's missing
//   posthouse new <slug> [--post <file>]      start a video in videos/<slug>/ from the template
//   posthouse voices [--provider <name>]      list the voices a provider offers
//   posthouse say "text" [--provider <name>] [--out file.wav]   hear one line
//   posthouse asset sfx|music "prompt" [--seconds n] [--name x] [--source s] [--video dir] [--dry-run] [--force]
//   posthouse sources [sfx|music]             which asset sources are ready, in resolver order
//   posthouse check [--video dir] [--commercial]   licences of every voice take and asset in a video
//   posthouse setup acestep|musicgen|stable-audio|kokoro [--yes]   install an optional local model
//   posthouse serve acestep                   run the ACE-Step music server
//   posthouse kit                             rebuild the default synth sound kit in kit/sfx/
//   posthouse usage                           ElevenLabs credits left
// Paid services (ElevenLabs) run only when you ask: npm run voice -- --final, or asset … --source elevenlabs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { chooseVoice, loadConfig, PAID, ROOT } from '../lib/config.mjs';
import { findWhisper, wordsFor } from '../lib/align.mjs';
import { which } from '../lib/audio.mjs';
import { makeKit } from '../lib/sfx.mjs';
import { loadProvider } from '../lib/voice/index.mjs';
import { KINDS, plan, readLock, resolveAsset } from '../lib/assets/index.mjs';
import { SOURCES } from '../lib/assets/sources.mjs';
import { HOME, install as installPython, installed } from '../lib/assets/python.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const VALUED = ['provider', 'post', 'out', 'seconds', 'name', 'source', 'video'];
const flag = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const has = (k) => rest.includes(`--${k}`);
const positional = () => { const vals = new Set(VALUED.map(flag)); return rest.filter((a) => !a.startsWith('--') && !vals.has(a)); };
const config = loadConfig(ROOT);
const TEMPLATE = path.join(ROOT, 'template');
const PROMPT_DEPENDENT = new Map([['files', 'your assets/ and library/ folders'], ['synth', 'built in (whoosh, tick, pop, sting, riser, impact, chime)'], ['openverse', 'online CC0 search']]);
const ACE_DIR = path.join(HOME, 'plugins', 'ACE-Step-1.5');

async function provider() {
  const name = chooseVoice(config, { explicit: flag('provider') }).name;
  return { name, mod: await loadProvider(name), opts: config.voice?.[name] ?? {} };
}

// The video a command acts on: --video <slug|path>, else the current folder if it is one.
function videoDir() {
  const v = flag('video');
  const candidates = v ? [path.resolve(v), path.join(ROOT, 'videos', v)] : [process.cwd()];
  const dir = candidates.find((d) => fs.existsSync(path.join(d, 'video', 'scenes.json')));
  if (!dir) throw new Error(v ? `no video at ${v}` : 'run this inside a video folder (videos/<slug> or template/), or pass --video <slug>');
  return dir;
}
const isCommercial = (dir) => has('commercial') || JSON.parse(fs.readFileSync(path.join(dir, 'video', 'scenes.json'), 'utf8')).commercial === true;

async function doctor() {
  const rows = [];
  const row = (ok, what, detail, fix, optional = false) => rows.push({ ok, what, detail, fix, optional });
  const major = Number(process.versions.node.split('.')[0]);
  row(major >= 20, 'Node.js', `v${process.versions.node}`, 'install Node 20 or newer (https://nodejs.org)');
  row(!!which('ffmpeg') && !!which('ffprobe'), 'ffmpeg', which('ffmpeg') ?? 'not found', 'macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg');
  row(fs.existsSync(path.join(TEMPLATE, 'node_modules', 'remotion')), 'Remotion (template)', fs.existsSync(path.join(TEMPLATE, 'node_modules')) ? 'installed' : 'not installed', 'npm run setup');
  const draft = chooseVoice(config, {});
  for (const [label, name, optional] of [['Draft voice', draft.name, false], ['Final voice (--final)', config.voice?.final ?? 'elevenlabs', true]]) {
    const mod = await loadProvider(name);
    let c;
    try { c = await mod.check(config.voice?.[name] ?? {}); } catch (e) { c = { ok: false, detail: e.message.split('\n')[0] }; }
    row(c.ok, `${label}: ${name}`, c.detail, c.fix, optional);
    if (!optional && mod.words === 'aligned') {
      const w = findWhisper(config);
      row(!!w, 'Word timings: whisper.cpp', w ? path.basename(w.model) : 'not found (timings will be estimated, less exact)', 'docs/voices.md#word-timings', true);
    }
  }
  if (draft.note) console.log(`note: ${draft.note}`);
  row(fs.existsSync(path.join(config.tasteDir, 'rules.md')), 'Taste', path.relative(ROOT, config.tasteDir) || config.tasteDir, 'set "taste" in posthouse.config.local.json to a folder with rules.md, look.md, corrections.md');
  row(fs.existsSync(path.join(ROOT, 'kit', 'sfx', 'whoosh.wav')), 'Sound kit', 'kit/sfx', 'node bin/posthouse.mjs kit');
  for (const kind of KINDS) {
    const ready = await readySources(kind);
    row(ready.length > 0, `Asset sources: ${kind}`, ready.join(' → ') || 'none', 'node bin/posthouse.mjs sources', true);
  }
  for (const r of rows) console.log(`${r.ok ? '✓' : r.optional ? '·' : '✗'} ${r.what.padEnd(30)} ${r.detail ?? ''}${!r.ok && r.fix ? `\n    → ${r.fix}` : ''}`);
  const bad = rows.filter((r) => !r.ok && !r.optional);
  console.log(bad.length ? `\n${bad.length} thing(s) to fix before your first render.` : '\nReady. Next: node bin/posthouse.mjs new my-first-video --post path/to/post.md');
  process.exitCode = bad.length ? 1 : 0;
}

// Sources that could serve this kind right now (ignoring the prompt), in resolver order. Paid ones are listed apart.
async function readySources(kind) {
  const out = [];
  for (const name of config.assets?.[kind]?.order ?? []) {
    const src = SOURCES[name];
    if (!src || PAID.has(name)) continue;
    if (PROMPT_DEPENDENT.has(name)) { out.push(name); continue; } // their readiness depends on the request
    const a = await src.available({ kind, prompt: 'test', seconds: 10 }, { config, videoDir: ROOT, opts: config.assets?.sources?.[name] ?? {} });
    if (a.ok) out.push(name);
  }
  return out;
}

async function sources() {
  const kinds = positional().length ? positional() : KINDS;
  for (const kind of kinds) {
    console.log(`${kind}: tried in this order (posthouse.config.json → assets.${kind}.order)`);
    for (const name of config.assets?.[kind]?.order ?? []) {
      const src = SOURCES[name];
      const ctx = { config, videoDir: ROOT, opts: config.assets?.sources?.[name] ?? {} };
      const lic = src.license(ctx.opts);
      const a = PAID.has(name) ? { ok: false, detail: `paid: only with --source ${name}` }
        : PROMPT_DEPENDENT.has(name) ? { ok: true, detail: PROMPT_DEPENDENT.get(name) }
        : await src.available({ kind, prompt: 'test', seconds: 10 }, ctx);
      console.log(`  ${a.ok ? '✓' : '·'} ${name.padEnd(13)} ${String(lic.commercial === true ? 'commercial ✓' : lic.commercial === false ? 'non-commercial' : 'check terms').padEnd(15)} ${a.detail}${!a.ok && a.fix ? `  → ${a.fix}` : ''}`);
    }
  }
}

async function asset() {
  const [kind, prompt] = positional();
  if (!KINDS.includes(kind) || !prompt) throw new Error('usage: posthouse asset sfx|music "prompt" [--seconds n] [--name x] [--source s] [--video dir] [--dry-run] [--force]');
  const dir = videoDir();
  const req = { kind, prompt, seconds: flag('seconds') ? Number(flag('seconds')) : undefined, name: flag('name'), source: flag('source') };
  const commercial = isCommercial(dir);
  if (has('dry-run')) {
    const p = await plan(req, { config, videoDir: dir, commercial });
    for (const r of p.rows) console.log(`  ${r.use ? '→' : ' '} ${r.name.padEnd(13)} ${r.reason}${r.fix ? `  (${r.fix})` : ''}`);
    console.log(p.chosen ? `would use: ${p.chosen}` : 'no source can make this');
    return;
  }
  const r = await resolveAsset(req, { config, videoDir: dir, commercial, force: has('force') });
  const e = r.entry;
  console.log(`${e.kind}: public/${e.file} · ${e.model} · ${e.license.id} · ${e.cost}${e.credit ? `\n  credit: ${e.credit}` : ''}`);
}

function check() {
  const dir = videoDir();
  const commercial = isCommercial(dir);
  const spec = JSON.parse(fs.readFileSync(path.join(dir, 'video', 'scenes.json'), 'utf8'));
  const rows = [];
  for (const s of spec.scenes) {
    const f = path.join(dir, 'narration', `${s.id}.json`);
    const m = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    rows.push({ what: `voice ${s.id}`, source: m?.provider ?? 'not voiced', license: m?.license ?? { id: 'unknown', commercial: 'unknown' } });
  }
  const lock = readLock(dir);
  for (const [file, e] of Object.entries(lock.assets)) rows.push({ what: file, source: e.model, license: e.license, credit: e.credit });
  const sfxDir = path.join(dir, 'public', 'sfx');
  for (const f of fs.existsSync(sfxDir) ? fs.readdirSync(sfxDir) : []) {
    const rel = path.join('sfx', f);
    if (lock.assets[rel]) continue;
    const kit = path.join(ROOT, 'kit', 'sfx', f);
    const same = fs.existsSync(kit) && fs.readFileSync(kit).equals(fs.readFileSync(path.join(sfxDir, f)));
    rows.push({ what: rel, source: same ? 'kit (synth)' : 'unknown', license: same ? { id: 'MIT (posthouse)', commercial: true } : { id: 'not in assets.lock.json', commercial: 'unknown' } });
  }
  rows.push({ what: 'fonts', source: 'Bricolage Grotesque, DM Sans', license: { id: 'OFL-1.1', commercial: true } });
  let blocked = 0;
  let warn = 0;
  for (const r of rows) {
    const c = r.license?.commercial;
    const mark = c === true ? '✓' : c === false ? (commercial ? '✗' : '·') : '?';
    if (c === false && commercial) blocked++;
    if (c !== true && c !== false) warn++;
    console.log(`${mark} ${r.what.padEnd(22)} ${String(r.source).padEnd(28)} ${r.license?.id}${r.license?.note ? ` (${r.license.note})` : ''}${r.credit ? `\n    credit: ${r.credit}` : ''}`);
  }
  console.log(`\n${commercial ? 'commercial use' : 'personal use (pass --commercial or set "commercial": true in scenes.json to check for paid use)'}: ${blocked} blocked · ${warn} to check yourself`);
  const credits = rows.filter((r) => r.credit).map((r) => r.credit);
  if (credits.length) console.log(`credits for the description:\n${credits.map((c) => `  ${c}`).join('\n')}`);
  process.exitCode = blocked ? 1 : 0;
}

const SETUP = {
  musicgen: { what: 'a Python venv with torch + transformers (~1 GB) at ~/.cache/posthouse/venvs/musicgen; the model (facebook/musicgen-small, ~1.2 GB) downloads on first use', licence: 'weights CC-BY-NC 4.0: non-commercial', run: () => installPython('musicgen') },
  'stable-audio': { what: 'a Python venv with torch + diffusers (~1.5 GB) at ~/.cache/posthouse/venvs/stable-audio; the model (~4.8 GB) downloads on first use after you accept its terms on Hugging Face and run huggingface-cli login', licence: 'Stability AI Community License', run: () => installPython('stable-audio') },
  acestep: {
    what: `a clone of github.com/ace-step/ACE-Step-1.5 at ${ACE_DIR} plus its uv environment (several GB); models download on first start`,
    licence: 'MIT',
    run: () => {
      if (!which('uv')) throw new Error('ACE-Step needs uv: curl -LsSf https://astral.sh/uv/install.sh | sh   (then run setup again)');
      if (!fs.existsSync(ACE_DIR)) { fs.mkdirSync(path.dirname(ACE_DIR), { recursive: true }); execFileSync('git', ['clone', '--depth', '1', 'https://github.com/ace-step/ACE-Step-1.5.git', ACE_DIR], { stdio: 'inherit' }); }
      execFileSync('uv', ['sync'], { cwd: ACE_DIR, stdio: 'inherit' });
      console.log('ACE-Step installed. Start it with: node bin/posthouse.mjs serve acestep');
    },
  },
  kokoro: { what: 'the kokoro-js npm package in this repo (not saved to package.json); the model (~90 MB) downloads on first use', licence: 'Apache-2.0', run: () => execFileSync('npm', ['install', '--no-save', 'kokoro-js'], { cwd: ROOT, stdio: 'inherit' }) },
};

function setup() {
  const [name] = positional();
  const s = SETUP[name];
  if (!s) throw new Error(`usage: posthouse setup ${Object.keys(SETUP).join('|')} [--yes]`);
  const done = name === 'acestep' ? fs.existsSync(path.join(ACE_DIR, '.venv')) : name === 'kokoro' ? fs.existsSync(path.join(ROOT, 'node_modules', 'kokoro-js')) : installed(name);
  console.log(`${name}: ${done ? 'already installed' : 'not installed'}\n  installs: ${s.what}\n  output licence: ${s.licence}`);
  if (!has('yes')) return console.log('\nRe-run with --yes to install.');
  s.run();
}

function serve() {
  if (positional()[0] !== 'acestep') throw new Error('usage: posthouse serve acestep');
  if (!fs.existsSync(ACE_DIR)) throw new Error('ACE-Step is not set up. Run: node bin/posthouse.mjs setup acestep --yes');
  // Same as ACE-Step's own start scripts, minus their interactive update prompts: Apple Silicon uses the MLX backend.
  const url = new URL(config.assets?.sources?.acestep?.url ?? 'http://127.0.0.1:8001');
  // Its language model (1–4 GB more) only serves "thinking" mode; leave it unloaded unless thinking is on.
  const thinking = config.assets?.sources?.acestep?.thinking === true;
  // Under 24 GB of memory its audio decoder can exhaust RAM and swap the disk full: decode in small chunks instead.
  const lowMemory = os.totalmem() < 24 * 1024 ** 3;
  const env = {
    ...process.env, TOKENIZERS_PARALLELISM: 'false', ACESTEP_INIT_LLM: thinking ? 'auto' : 'false',
    ...(process.platform === 'darwin' && process.arch === 'arm64' ? { ACESTEP_LM_BACKEND: 'mlx' } : {}),
    ...(lowMemory ? { ACESTEP_VAE_DECODE_CHUNK_SIZE: '128', ACESTEP_MPS_DECODE_OFFLOAD: '1' } : {}),
  };
  console.log(`starting ACE-Step at ${url.origin} (first start downloads its models; Ctrl-C to stop)…`);
  spawn('uv', ['run', 'acestep-api', '--host', url.hostname === 'localhost' ? '127.0.0.1' : url.hostname, '--port', url.port || '8001'], { cwd: ACE_DIR, stdio: 'inherit', env });
}

async function voices() {
  const { name, mod, opts } = await provider();
  if (!mod.list) return console.log(`${name} has no voice list. See docs/voices.md.`);
  for (const v of await mod.list(opts)) console.log(`${v.id.padEnd(32)} ${v.note ?? ''}`);
  console.log(`\nSet one in posthouse.config.local.json: { "voice": { "${name}": { "${name === 'elevenlabs' ? 'voiceId' : 'voice'}": "…" } } }`);
}

async function say() {
  const [text] = positional();
  if (!text) throw new Error('usage: posthouse say "text" [--provider <name>] [--out file.wav]');
  const { mod, opts } = await provider();
  const out = path.resolve(flag('out') ?? 'say.wav');
  const r = await mod.speak({ text, out, opts });
  const words = r.words ?? (r.wav ? wordsFor(r.wav, text, config).words : []);
  console.log(`${mod.describe(opts)}\n${r.wav ?? '(silent: no audio)'}\nwords: ${words.map((w) => `${w.text}@${w.start}`).join(' ')}`);
  if (r.wav && process.platform === 'darwin' && which('afplay') && !flag('out')) execFileSync('afplay', [r.wav]);
}

async function usage() {
  const el = await loadProvider('elevenlabs');
  const s = await el.subscription();
  console.log(`${s.tier}: ${s.used.toLocaleString()} / ${s.limit.toLocaleString()} credits used, ${s.remaining.toLocaleString()} left${s.resetsAt ? `, resets ${s.resetsAt.toDateString()}` : ''}`);
}

function kit() {
  const files = makeKit(path.join(ROOT, 'kit', 'sfx'));
  for (const f of files) fs.copyFileSync(f, path.join(TEMPLATE, 'public', 'sfx', path.basename(f)));
  console.log(`sound kit: ${files.map((f) => path.basename(f)).join(', ')} → kit/sfx/ and template/public/sfx/`);
}

const COMMANDS = { doctor, new: newVideo, voices, say, asset, sources, check, setup, serve, kit, sfx: kit, usage };

function newVideo() {
  const [slug] = positional();
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('usage: posthouse new <slug> [--post <file>]   (slug: lowercase-with-dashes)');
  if (!fs.existsSync(path.join(TEMPLATE, 'node_modules'))) throw new Error('the template is not installed yet. Run: npm run setup');
  const dest = path.join(ROOT, 'videos', slug);
  if (fs.existsSync(dest)) throw new Error(`${dest} already exists`);
  const post = flag('post') ? path.resolve(flag('post')) : null;
  if (post && !fs.existsSync(post)) throw new Error(`post not found: ${post}`);
  const skip = new Set(['node_modules', 'renders', 'narration']);
  fs.cpSync(TEMPLATE, dest, {
    recursive: true,
    filter: (p) => {
      const rel = path.relative(TEMPLATE, p);
      if (skip.has(rel.split(path.sep)[0])) return false;
      return !/^public[\\/]voice[\\/].+/.test(rel) && rel !== path.join('src', 'storyboard.json');
    },
  });
  fs.symlinkSync(path.join(TEMPLATE, 'node_modules'), path.join(dest, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(dest, 'posthouse.json'), JSON.stringify({ root: ROOT, post, created: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
  console.log(`new video: ${path.relative(process.cwd(), dest) || dest}`);
  console.log('next: write video/scenes.json → npm run voice → npm run storyboard → build src/video/ → npm run render');
}

try {
  if (!COMMANDS[cmd]) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exitCode = cmd ? 2 : 0;
  } else {
    await COMMANDS[cmd]();
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
