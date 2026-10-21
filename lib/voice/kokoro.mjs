// Kokoro: a small open-weight voice model (Apache-2.0) that runs locally on CPU through kokoro-js.
// Install once at the repo root: npm install --no-save kokoro-js   (the first run downloads the model, ~90 MB).
import fs from 'node:fs';
import path from 'node:path';
import { toWav } from '../audio.mjs';

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

export async function speak({ text, out, opts }) {
  const t = await engine(opts);
  const audio = await t.generate(text, { voice: opts.voice ?? 'af_heart', speed: opts.speed ?? 1 });
  const raw = path.join(path.dirname(out), `.${path.basename(out, '.wav')}.kokoro.wav`);
  await audio.save(raw);
  toWav(raw, out);
  fs.rmSync(raw, { force: true });
  return { wav: out };
}
