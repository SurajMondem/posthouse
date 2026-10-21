// The asset resolver: one request (kind, prompt, seconds, name) → the first source in the configured order that can
// deliver it → public/<kind>/<name>.wav in the video, recorded in assets.lock.json with its source and licence.
// Paid sources run only when named explicitly (req.source). Results are cached by request, so asking again is free.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PAID } from '../config.mjs';
import { fitDuration, normalize, toWav } from '../audio.mjs';
import { cacheKey } from '../words.mjs';
import { slug, SOURCES } from './sources.mjs';

export const KINDS = ['sfx', 'music'];
export const sourceNames = Object.keys(SOURCES);

const ctxFor = (name, config, videoDir) => ({ config, videoDir, opts: config.assets?.sources?.[name] ?? {} });

// Why each source would or wouldn't be used, in order. The first 'use' wins.
export async function plan(req, { config, videoDir, commercial = false }) {
  if (!KINDS.includes(req.kind)) throw new Error(`kind must be one of: ${KINDS.join(', ')}`);
  const order = req.source ? [req.source] : config.assets?.[req.kind]?.order ?? [];
  const rows = [];
  let chosen = null;
  for (const name of order) {
    const src = SOURCES[name];
    if (!src) { rows.push({ name, use: false, reason: 'unknown source' }); continue; }
    if (!src.kinds.includes(req.kind)) { rows.push({ name, use: false, reason: `doesn't make ${req.kind}` }); continue; }
    if (PAID.has(name) && req.source !== name) { rows.push({ name, use: false, reason: `paid: only when asked (--source ${name})` }); continue; }
    const ctx = ctxFor(name, config, videoDir);
    const lic = src.license(ctx.opts);
    if (commercial && lic.commercial === false) { rows.push({ name, use: false, reason: `${lic.id}: not for commercial use` }); continue; }
    if (chosen) { rows.push({ name, use: false, reason: 'not needed' }); continue; }
    const a = await src.available(req, ctx);
    rows.push({ name, use: a.ok, reason: a.detail, fix: a.fix });
    if (a.ok) chosen = name;
  }
  return { rows, chosen };
}

export const lockFile = (videoDir) => path.join(videoDir, 'assets.lock.json');
export function readLock(videoDir) {
  const f = lockFile(videoDir);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { assets: {} };
}

export async function resolveAsset(req, { config, videoDir, commercial = false, force = false }) {
  const { rows, chosen } = await plan(req, { config, videoDir, commercial });
  if (!chosen) {
    const why = rows.map((r) => `  ${r.name}: ${r.reason}${r.fix ? ` → ${r.fix}` : ''}`).join('\n');
    throw new Error(`no source could make this ${req.kind}:\n${why}`);
  }
  const src = SOURCES[chosen];
  const ctx = ctxFor(chosen, config, videoDir);
  const name = req.name ?? slug(req.prompt);
  const key = cacheKey({ kind: req.kind, prompt: req.prompt, seconds: req.seconds ?? null, source: chosen, opts: ctx.opts, file: chosen === 'files' ? rows.find((r) => r.name === 'files')?.reason : undefined });
  const cacheDir = path.join(config.root, 'cache', 'assets');
  const cached = path.join(cacheDir, `${key}.wav`);
  const cachedMeta = `${cached}.json`;
  let meta;
  if (!force && fs.existsSync(cached) && fs.existsSync(cachedMeta)) {
    meta = { ...JSON.parse(fs.readFileSync(cachedMeta, 'utf8')), cached: true };
  } else {
    fs.mkdirSync(cacheDir, { recursive: true });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'posthouse-asset-'));
    try {
      const raw = path.join(tmp, 'raw.wav'); // ffmpeg-made sources need an extension; downloaded bytes are probed on read
      const r = await src.generate(req, raw, ctx);
      let wav = toWav(raw, path.join(tmp, 'a.wav'));
      if (req.kind === 'music') wav = normalize(wav, path.join(tmp, 'n.wav')); // every bed at the same loudness
      if (req.seconds) fitDuration(wav, cached, req.seconds, { loop: req.kind === 'music' });
      else fs.copyFileSync(wav, cached);
      meta = { source: chosen, model: r.model ?? chosen, license: r.license ?? src.license(ctx.opts), credit: r.credit ?? null, cost: r.cost ?? (src.paid ? 'see provider usage' : 'free') };
      fs.writeFileSync(cachedMeta, JSON.stringify(meta, null, 2) + '\n');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  const rel = path.join(req.kind, `${name}.wav`);
  const dest = path.join(videoDir, 'public', rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cached, dest);
  const entry = { kind: req.kind, file: rel, prompt: req.prompt, seconds: req.seconds ?? null, ...meta, key, at: new Date().toISOString() };
  const lock = readLock(videoDir);
  lock.assets[rel] = entry;
  fs.writeFileSync(lockFile(videoDir), JSON.stringify(lock, null, 2) + '\n');
  return { file: dest, entry, rows };
}
