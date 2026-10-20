// Small ffmpeg / PATH helpers shared by the voice providers and the sound kit.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const RATE = 48000; // every narration and sound is 48 kHz, to match the render

export function which(cmd) {
  if (!cmd) return null;
  if (cmd.includes('/')) return fs.existsSync(cmd) ? cmd : null;
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const p = path.join(dir, cmd);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function ffmpeg(args) {
  if (!which('ffmpeg')) throw new Error('ffmpeg is not on PATH. Install it (macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg).');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
}

// Any audio file → 48 kHz WAV (mono unless the source is stereo).
export function toWav(src, out, { rate = RATE, mono = false } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ffmpeg(['-i', src, '-ar', String(rate), ...(mono ? ['-ac', '1'] : []), out]);
  return out;
}

export function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
}
