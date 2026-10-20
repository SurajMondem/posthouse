#!/usr/bin/env node
// posthouse: turn a post into a narrated video.
//   posthouse doctor                         check your setup and say how to fix what's missing
//   posthouse new <slug> [--post <file>]     start a video in videos/<slug>/ from the template
//   posthouse voices [--provider <name>]     list the voices a provider offers
//   posthouse say "text" [--provider <name>] [--out file.wav]   hear one line in the configured voice
//   posthouse sfx                            rebuild the default sound kit in kit/sfx/
//   posthouse usage                          ElevenLabs credits left (only for the elevenlabs provider)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig, providerName, ROOT } from '../lib/config.mjs';
import { findWhisper, wordsFor } from '../lib/align.mjs';
import { which } from '../lib/audio.mjs';
import { makeKit } from '../lib/sfx.mjs';
import { loadProvider } from '../lib/voice/index.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const positional = () => { const vals = new Set(['provider', 'post', 'out'].map(flag)); return rest.filter((a) => !a.startsWith('--') && !vals.has(a)); };
const config = loadConfig(ROOT);
const TEMPLATE = path.join(ROOT, 'template');

async function provider() {
  const name = providerName(config, flag('provider'));
  return { name, mod: await loadProvider(name), opts: config.voice?.[name] ?? {} };
}

async function doctor() {
  const rows = [];
  const row = (ok, what, detail, fix) => rows.push({ ok, what, detail, fix });
  const major = Number(process.versions.node.split('.')[0]);
  row(major >= 20, 'Node.js', `v${process.versions.node}`, 'install Node 20 or newer (https://nodejs.org)');
  row(!!which('ffmpeg') && !!which('ffprobe'), 'ffmpeg', which('ffmpeg') ?? 'not found', 'macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg');
  row(fs.existsSync(path.join(TEMPLATE, 'node_modules', 'remotion')), 'Remotion (template)', fs.existsSync(path.join(TEMPLATE, 'node_modules')) ? 'installed' : 'not installed', 'npm run setup');
  const { name, mod, opts } = await provider();
  let c;
  try { c = await mod.check(opts); } catch (e) { c = { ok: false, detail: e.message.split('\n')[0] }; }
  row(c.ok, `Voice: ${name}`, c.detail, c.fix);
  if (mod.words === 'aligned') {
    const w = findWhisper(config);
    row(!!w, 'Word timings: whisper.cpp', w ? path.basename(w.model) : 'not found (timings will be estimated, less exact)', 'docs/voices.md#word-timings (brew install whisper-cpp + a ggml model)');
  }
  row(fs.existsSync(path.join(config.tasteDir, 'rules.md')), 'Taste', path.relative(ROOT, config.tasteDir) || config.tasteDir, 'set "taste" in posthouse.config.local.json to a folder with rules.md, look.md, corrections.md');
  row(fs.existsSync(path.join(ROOT, 'kit', 'sfx', 'whoosh.wav')), 'Sound kit', 'kit/sfx', 'node bin/posthouse.mjs sfx');
  for (const r of rows) console.log(`${r.ok ? '✓' : '✗'} ${r.what.padEnd(28)} ${r.detail ?? ''}${!r.ok && r.fix ? `\n    → ${r.fix}` : ''}`);
  const bad = rows.filter((r) => !r.ok && !r.what.startsWith('Word timings'));
  console.log(bad.length ? `\n${bad.length} thing(s) to fix before your first render.` : '\nReady. Next: node bin/posthouse.mjs new my-first-video --post path/to/post.md');
  process.exitCode = bad.length ? 1 : 0;
}

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

async function voices() {
  const { name, mod, opts } = await provider();
  if (!mod.list) return console.log(`${name} has no voice list. See docs/voices.md.`);
  for (const v of await mod.list(opts)) console.log(`${v.id.padEnd(32)} ${v.note ?? ''}`);
  console.log(`\nSet one in posthouse.config.local.json: { "voice": { "provider": "${name}", "${name}": { "${name === 'elevenlabs' ? 'voiceId' : 'voice'}": "…" } } }`);
}

async function say() {
  const [text] = positional();
  if (!text) throw new Error('usage: posthouse say "text" [--provider <name>] [--out file.wav]');
  const { name, mod, opts } = await provider();
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

const COMMANDS = {
  doctor,
  new: newVideo,
  voices,
  say,
  usage,
  sfx: () => {
    const files = makeKit(path.join(ROOT, 'kit', 'sfx'));
    for (const f of files) fs.copyFileSync(f, path.join(TEMPLATE, 'public', 'sfx', path.basename(f)));
    console.log(`sound kit: ${files.map((f) => path.basename(f)).join(', ')} → kit/sfx/ and template/public/sfx/`);
  },
};

try {
  if (!COMMANDS[cmd]) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exitCode = cmd ? 2 : 0;
  } else {
    await COMMANDS[cmd]();
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
