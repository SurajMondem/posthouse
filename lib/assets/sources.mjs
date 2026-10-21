// Asset sources. Each one:
//   name, kinds: ['sfx' | 'music'], paid?, license(opts) → { id, commercial: true | false | 'conditional' | 'unknown', note? },
//   available(req, ctx) → { ok, detail, fix? }, generate(req, out, ctx) → { model?, cost?, credit?, license? }
// req = { kind, prompt, seconds, name }. ctx = { config, videoDir, opts (this source's settings) }.
// generate() writes any audio file to `out`; the resolver converts and fits it.
import fs from 'node:fs';
import path from 'node:path';
import { procedural } from '../music.mjs';
import { makeSound, synthFor } from '../sfx.mjs';
import { installed, run } from './python.mjs';

const EXT = ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aiff', 'aif'];
export const slug = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'asset';

// ---- your files ----
function findFile(req, ctx) {
  const base = req.name ?? slug(req.prompt);
  const dirs = [path.join(ctx.videoDir, 'assets', req.kind), path.join(ctx.videoDir, 'assets'), path.join(ctx.config.root, 'library', req.kind), path.join(ctx.config.root, 'library')];
  for (const d of dirs) for (const e of EXT) { const f = path.join(d, `${base}.${e}`); if (fs.existsSync(f)) return f; }
  return null;
}
const files = {
  name: 'files', kinds: ['sfx', 'music'],
  license: () => ({ id: 'yours', commercial: true, note: 'a <file>.license text file next to it overrides this' }),
  available: async (req, ctx) => {
    const f = findFile(req, ctx);
    return f ? { ok: true, detail: path.relative(ctx.videoDir, f) } : { ok: false, detail: `no ${req.name ?? slug(req.prompt)}.* in assets/ or library/` };
  },
  generate: async (req, out, ctx) => {
    const f = findFile(req, ctx);
    fs.copyFileSync(f, out);
    const lic = fs.existsSync(`${f}.license`) ? fs.readFileSync(`${f}.license`, 'utf8').trim() : null;
    return { model: path.basename(f), license: lic ? { id: lic, commercial: 'unknown' } : undefined };
  },
};

// ---- synthesised sfx (no install) ----
const synth = {
  name: 'synth', kinds: ['sfx'],
  license: () => ({ id: 'MIT (posthouse)', commercial: true }),
  available: async (req) => (synthFor(req.prompt) ? { ok: true, detail: synthFor(req.prompt) } : { ok: false, detail: 'no synth sound matches (whoosh, tick, pop, sting, riser, impact, chime)' }),
  generate: async (req, out) => { makeSound(synthFor(req.prompt), out); return { model: `synth:${synthFor(req.prompt)}` }; },
};

// ---- procedural music (no install) ----
const proc = {
  name: 'procedural', kinds: ['music'],
  license: () => ({ id: 'MIT (posthouse)', commercial: true }),
  available: async () => ({ ok: true, detail: 'always' }),
  generate: async (req, out) => procedural({ prompt: req.prompt, seconds: req.seconds ?? 30, out }),
};

// ---- ACE-Step 1.5 (local server, MIT) ----
async function ace(url, p, body) {
  const res = await fetch(new URL(p, url), body ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.ACESTEP_API_KEY ? { Authorization: `Bearer ${process.env.ACESTEP_API_KEY}` } : {}) }, body: JSON.stringify(body) } : {});
  if (!res.ok) throw new Error(`ACE-Step ${p} → ${res.status}`);
  return res;
}
const acestep = {
  name: 'acestep', kinds: ['music'],
  license: () => ({ id: 'MIT (ACE-Step 1.5)', commercial: true }),
  available: async (req, ctx) => {
    // On 16 GB machines ACE-Step's memory use spills into swap; with little free disk that fills the drive.
    const freeGb = (() => { try { const s = fs.statfsSync(ctx.config.root); return (s.bavail * s.bsize) / 1024 ** 3; } catch { return Infinity; } })();
    const need = ctx.opts.minFreeDiskGb ?? 20;
    if (freeGb < need) return { ok: false, detail: `only ${freeGb.toFixed(1)} GB disk free; ACE-Step can swap ${need}+ GB on machines under 32 GB RAM`, fix: 'free disk space, or set assets.sources.acestep.minFreeDiskGb' };
    try { await ace(ctx.opts.url, '/health'); return { ok: true, detail: ctx.opts.url }; } catch {
      return { ok: false, detail: `no ACE-Step server at ${ctx.opts.url}`, fix: 'node bin/posthouse.mjs setup acestep, then node bin/posthouse.mjs serve acestep' };
    }
  },
  generate: async (req, out, ctx) => {
    const { url, thinking = false, timeout = 900, model } = ctx.opts;
    const vocals = /\b(vocal|vocals|singing|song with lyrics)\b/i.test(req.prompt);
    const task = await (await ace(url, '/release_task', { prompt: req.prompt, lyrics: vocals ? '' : '[Instrumental]', audio_duration: Math.max(10, Math.ceil(req.seconds ?? 30)), audio_format: 'wav', thinking, ...(model ? { model } : {}) })).json();
    const id = task.data?.task_id;
    if (!id) throw new Error(`ACE-Step did not return a task: ${JSON.stringify(task).slice(0, 300)}`);
    const until = Date.now() + timeout * 1000;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, 2000));
      const q = await (await ace(url, '/query_result', { task_id_list: [id] })).json();
      const item = q.data?.[0];
      if (item?.status === 2) throw new Error(`ACE-Step generation failed: ${String(item.result).slice(0, 300)}`);
      if (item?.status === 1) {
        const result = typeof item.result === 'string' ? JSON.parse(item.result) : item.result;
        const file = result?.[0]?.file;
        fs.writeFileSync(out, Buffer.from(await (await ace(url, file)).arrayBuffer()));
        return { model: `acestep:${result?.[0]?.dit_model ?? 'default'}` };
      }
    }
    throw new Error(`ACE-Step timed out after ${timeout} s`);
  },
};

// ---- MusicGen (Python plugin, weights CC-BY-NC 4.0) ----
const musicgen = {
  name: 'musicgen', kinds: ['music'],
  license: () => ({ id: 'CC-BY-NC-4.0 (MusicGen weights)', commercial: false, note: 'non-commercial use only' }),
  available: async () => (installed('musicgen') ? { ok: true, detail: 'installed' } : { ok: false, detail: 'not set up', fix: 'node bin/posthouse.mjs setup musicgen' }),
  generate: async (req, out, ctx) => {
    const r = run('musicgen', ['--prompt', req.prompt, '--seconds', String(Math.min(30, req.seconds ?? 30)), '--out', out, '--model', ctx.opts.model ?? 'facebook/musicgen-small']);
    return { model: `musicgen:${r.model ?? ctx.opts.model}` };
  },
};

// ---- Stable Audio Open (Python plugin, Stability community licence, gated on Hugging Face) ----
const stableAudio = {
  name: 'stable-audio', kinds: ['sfx', 'music'],
  license: () => ({ id: 'Stability AI Community License', commercial: 'conditional', note: 'free commercial use under US$1M annual revenue' }),
  available: async () => (installed('stable-audio') ? { ok: true, detail: 'installed' } : { ok: false, detail: 'not set up', fix: 'node bin/posthouse.mjs setup stable-audio' }),
  generate: async (req, out, ctx) => {
    const r = run('stable-audio', ['--prompt', req.prompt, '--seconds', String(Math.min(47, req.seconds ?? 10)), '--out', out, '--model', ctx.opts.model, '--steps', String(ctx.opts.steps ?? 100)]);
    return { model: `stable-audio:${r.model ?? ctx.opts.model}` };
  },
};

// ---- Openverse (CC0 search, mostly Freesound) ----
async function search(req, opts) {
  const q = new URLSearchParams({ q: req.kind === 'music' ? `${req.prompt} music` : req.prompt, license: opts.license ?? 'cc0', page_size: '20' });
  const res = await fetch(`https://api.openverse.org/v1/audio/?${q}`);
  if (!res.ok) throw new Error(`Openverse search → ${res.status}`);
  const want = (req.seconds ?? (req.kind === 'music' ? 30 : 1)) * 1000;
  const hits = (await res.json()).results.filter((r) => r.url && r.duration);
  // sfx: the closest length; music: the shortest that is long enough (loops fill the rest)
  return hits.sort((a, b) => (req.kind === 'music' ? (a.duration < want) - (b.duration < want) || a.duration - b.duration : Math.abs(a.duration - want) - Math.abs(b.duration - want)))[0] ?? null;
}
const openverse = {
  name: 'openverse', kinds: ['sfx', 'music'],
  license: (opts) => ({ id: (opts?.license ?? 'cc0').toUpperCase(), commercial: (opts?.license ?? 'cc0') === 'cc0' ? true : 'unknown' }),
  available: async (req, ctx) => {
    try { const hit = await search(req, ctx.opts); return hit ? { ok: true, detail: `"${hit.title}" by ${hit.creator}` } : { ok: false, detail: 'no CC0 results' }; } catch (e) { return { ok: false, detail: e.message }; }
  },
  generate: async (req, out, ctx) => {
    const hit = await search(req, ctx.opts);
    const res = await fetch(hit.url);
    if (!res.ok) throw new Error(`download → ${res.status}`);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    return { model: `openverse:${hit.source}`, credit: `"${hit.title}" by ${hit.creator} (${hit.license.toUpperCase()}) ${hit.foreign_landing_url ?? hit.url}`, license: { id: hit.license.toUpperCase(), commercial: hit.license === 'cc0' ? true : 'unknown' } };
  },
};

// ---- ElevenLabs (paid; only when asked with --source elevenlabs) ----
const elevenlabs = {
  name: 'elevenlabs', kinds: ['sfx', 'music'], paid: true,
  license: () => ({ id: 'ElevenLabs plan terms', commercial: 'conditional', note: 'commercial use on paid plans' }),
  available: async () => {
    const el = await import('../voice/elevenlabs.mjs');
    return el.apiKey({ required: false }) ? { ok: true, detail: 'key set' } : { ok: false, detail: 'ELEVENLABS_API_KEY not set', fix: 'add it to .env' };
  },
  generate: async (req, out) => {
    const el = await import('../voice/elevenlabs.mjs');
    const before = await el.subscription();
    const audio = req.kind === 'music'
      ? await el.music({ prompt: req.prompt, ms: Math.round((req.seconds ?? 30) * 1000) })
      : await el.soundEffect({ text: req.prompt, seconds: req.seconds });
    fs.writeFileSync(out, audio);
    const after = await el.subscription();
    return { model: `elevenlabs:${req.kind}`, cost: `${(after.used - before.used).toLocaleString()} credits (counter can lag)` };
  },
};

export const SOURCES = { files, synth, procedural: proc, acestep, musicgen, 'stable-audio': stableAudio, openverse, elevenlabs };
