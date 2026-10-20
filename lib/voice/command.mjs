// Any local text-to-speech you can run from a shell: Piper, a Coqui/XTTS script, your own clone server via curl…
// Config (voice.command):
//   run    the shell command. Placeholders: {out} audio file to write · {text} the text, shell-quoted · {textFile}
//   input  "stdin" (default: the text is piped in) | "none" (use {text} or {textFile} in run)
//   ext    the extension the command writes (default "wav"); posthouse converts it to 48 kHz WAV
// The command is yours and runs as you; posthouse never fills it in from anything but your config.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { toWav, which } from '../audio.mjs';

export const name = 'command';
export const words = 'aligned';

export const describe = (o) => `command · ${(o.run ?? '(no run set)').split(' ')[0]}`;

const quote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

export async function check(o) {
  if (!o.run) return { ok: false, detail: 'voice.command.run is empty', fix: 'see docs/voices.md (Piper example)' };
  const bin = o.run.trim().split(/\s+/)[0].replace(/^~/, process.env.HOME ?? '~');
  if (!which(bin)) return { ok: false, detail: `"${bin}" is not on PATH`, fix: 'install it, or put its full path in voice.command.run' };
  return { ok: true, detail: describe(o) };
}

export async function speak({ text, out, opts }) {
  const base = path.join(path.dirname(out), `.${path.basename(out, '.wav')}`);
  const raw = `${base}.cmd.${opts.ext ?? 'wav'}`;
  const textFile = `${base}.txt`;
  fs.writeFileSync(textFile, text);
  const cmd = opts.run.replaceAll('{out}', quote(raw)).replaceAll('{textFile}', quote(textFile)).replaceAll('{text}', quote(text));
  const r = spawnSync('sh', ['-c', cmd], { input: (opts.input ?? 'stdin') === 'stdin' ? text : undefined, stdio: ['pipe', 'ignore', 'pipe'] });
  fs.rmSync(textFile, { force: true });
  if (r.status !== 0 || !fs.existsSync(raw)) throw new Error(`voice command failed (exit ${r.status}):\n${cmd}\n${r.stderr?.toString().slice(0, 800)}`);
  toWav(raw, out);
  fs.rmSync(raw, { force: true });
  return { wav: out };
}
