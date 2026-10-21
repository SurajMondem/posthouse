// macOS `say`: built in, free, offline. Good for drafts and for trying posthouse with nothing installed.
// Better voices: System Settings → Accessibility → Spoken Content → System voice → Manage Voices (Premium/Enhanced).
// Apple's licence allows system voices for personal, non-commercial projects; use another provider for paid work.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { toWav, which } from '../audio.mjs';

export const name = 'say';
export const words = 'aligned'; // timings come from whisper (or an estimate)

export const describe = (o) => `macOS say · ${o.voice || 'system voice'} · ${o.rate ?? 180} wpm`;
export const license = () => ({ id: 'Apple macOS system voice', commercial: false, note: 'personal, non-commercial use' });

export function list() {
  return execFileSync('say', ['-v', '?']).toString().split('\n').map((line) => line.match(/^(.+?)\s{2,}([a-z]{2,3}_[A-Z0-9]{2,3})\s+#/)).filter(Boolean)
    .map((m) => ({ id: m[1].trim(), name: m[1].trim(), note: m[2] }));
}

export async function check(o) {
  if (process.platform !== 'darwin' || !which('say')) return { ok: false, detail: '`say` is macOS only', fix: 'set voice.provider to "kokoro", "command" or "none" (docs/voices.md)' };
  if (o.voice && !list().some((v) => v.id === o.voice)) return { ok: false, detail: `voice "${o.voice}" is not installed`, fix: 'node bin/posthouse.mjs voices' };
  return { ok: true, detail: describe(o) };
}

export async function speak({ text, out, opts }) {
  const dir = path.dirname(out);
  const base = path.join(dir, `.${path.basename(out, '.wav')}`);
  fs.writeFileSync(`${base}.txt`, text);
  execFileSync('say', [...(opts.voice ? ['-v', opts.voice] : []), '-r', String(opts.rate ?? 180), '-o', `${base}.aiff`, '-f', `${base}.txt`]);
  toWav(`${base}.aiff`, out);
  for (const ext of ['txt', 'aiff']) fs.rmSync(`${base}.${ext}`, { force: true });
  return { wav: out };
}
