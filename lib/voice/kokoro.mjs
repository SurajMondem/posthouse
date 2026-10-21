// Kokoro: a small open-weight voice model (Apache-2.0) that runs locally on CPU through kokoro-js.
// Install once at the repo root: npm install --no-save kokoro-js   (the first run downloads the model, ~90 MB).
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, RATE, toWav } from '../audio.mjs';

export const name = 'kokoro';
export const words = 'aligned';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

export const describe = (o) => `Kokoro (local) · ${o.voice ?? 'af_heart'} · speed ${o.speed ?? 1}`;
export const license = () => ({ id: 'Apache-2.0', commercial: true });

async function load() {
  try {
    return (await import('kokoro-js')).KokoroTTS;
  } catch {
    throw new Error('kokoro-js is not installed. At the repo root run: npm install --no-save kokoro-js');
  }
}

let tts = null;
async function engine(o) {
  if (!tts) tts = await (await load()).from_pretrained(o.model ?? MODEL, { dtype: o.dtype ?? 'q8', device: 'cpu' });
  return tts;
}

export async function check(o) {
  try {
    await load();
    return { ok: true, detail: describe(o) };
  } catch (e) {
    return { ok: false, detail: 'kokoro-js not installed', fix: 'npm install --no-save kokoro-js (at the repo root)' };
  }
}

export async function list(o = {}) {
  const t = await engine(o);
  return Object.entries(t.voices ?? {}).map(([id, v]) => ({ id, name: v.name ?? id, note: [v.language, v.gender].filter(Boolean).join(' ') }));
}

// Kokoro reads ~500 phonemes per call, so a whole-script take is spoken in sentence-sized chunks and joined with a
// short natural pause. Audio tags ([excited]…) are for ElevenLabs; Kokoro would read them aloud, so they're removed.
const MAX_CHARS = 300;
export function chunks(text) {
  const sentences = text.replace(/\[[^\]]*\]\s*/g, '').split(/(?<=[.?!])\s+/).filter(Boolean);
  const out = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last && last.length + s.length + 1 <= MAX_CHARS) out[out.length - 1] = `${last} ${s}`;
    else out.push(s);
  }
  return out;
}

export async function speak({ text, out, opts }) {
  const t = await engine(opts);
  const dir = path.dirname(out);
  const base = path.join(dir, `.${path.basename(out, '.wav')}.kokoro`);
  const parts = [];
  for (const [i, piece] of chunks(text).entries()) {
    const audio = await t.generate(piece, { voice: opts.voice ?? 'af_heart', speed: opts.speed ?? 1 });
    const raw = `${base}.${i}.wav`;
    await audio.save(raw);
    parts.push(raw);
  }
  if (parts.length === 1) toWav(parts[0], out);
  else ffmpeg([...parts.flatMap((p) => ['-i', p]), '-filter_complex', `${parts.map((_, i) => `[${i}:a]apad=pad_dur=0.12[a${i}]`).join(';')};${parts.map((_, i) => `[a${i}]`).join('')}concat=n=${parts.length}:v=0:a=1`, '-ar', String(RATE), out]);
  for (const p of parts) fs.rmSync(p, { force: true });
  return { wav: out };
}
