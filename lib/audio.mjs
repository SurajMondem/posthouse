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

// Make a clip exactly `seconds` long: loop it (music) or pad it with silence (sfx), then fade the tail.
export function fitDuration(src, out, seconds, { loop = false } = {}) {
  const fade = Math.min(2, seconds / 5);
  const tail = `afade=t=out:st=${Math.max(0, seconds - fade).toFixed(2)}:d=${fade.toFixed(2)}`;
  ffmpeg([...(loop ? ['-stream_loop', '-1'] : []), '-i', src, '-t', String(seconds), '-af', loop ? tail : `apad,${tail}`, '-ar', String(RATE), out]);
  return out;
}

// Bring a track to a standard loudness (LUFS) so a video's "volume" means the same whatever made the track.
export const MUSIC_LUFS = -18;
export function normalize(src, out, lufs = MUSIC_LUFS) {
  ffmpeg(['-i', src, '-af', `loudnorm=I=${lufs}:TP=-2:LRA=11`, '-ar', String(RATE), out]);
  return out;
}

export function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
}
