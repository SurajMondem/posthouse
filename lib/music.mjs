// Procedural music: a soft chord bed synthesised with ffmpeg. Always available, MIT, no downloads.
// It reads a mood from the prompt (calm · uplifting · dark · tense) and plays a four-chord loop of sine pads with
// slow attacks, a gentle lowpass and a little echo. Good enough for a quiet bed under a voice; use a model
// (ACE-Step, MusicGen, Stable Audio) or your own track for anything with a real melody.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ffmpeg, RATE } from './audio.mjs';

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note → Hz

// Chords as MIDI notes (root-position triads/sevenths around C3–C5).
const MOODS = {
  calm: { bpm: 68, chords: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]] }, // Cmaj7 Am7 Fmaj7 G
  uplifting: { bpm: 92, chords: [[48, 55, 64, 67], [43, 50, 59, 62], [45, 52, 60, 64], [41, 48, 57, 60]] }, // C G Am F
  dark: { bpm: 60, chords: [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59]] }, // Am F C G (minor feel)
  tense: { bpm: 84, chords: [[45, 52, 57, 60], [46, 53, 58, 62], [45, 52, 57, 60], [44, 51, 56, 59]] }, // Am Bb Am G#dim-ish
};

export function moodOf(prompt = '') {
  const p = prompt.toLowerCase();
  if (/\b(dark|sad|moody|somber|melanchol|night|mysterious)\b/.test(p)) return 'dark';
  if (/\b(tense|suspense|thriller|urgent|danger|countdown)\b/.test(p)) return 'tense';
  if (/\b(upbeat|uplifting|happy|bright|energetic|launch|trailer|hype|fun)\b/.test(p)) return 'uplifting';
  return 'calm';
}

function chordExpr(notes, d) {
  const env = `min(1,t/1.2)*min(1,(${d}-t)/1.2)`;
  const voices = notes.map((n) => {
    const f = NOTE(n).toFixed(3);
    return `0.10*sin(2*PI*${f}*t)+0.03*sin(2*PI*${(NOTE(n) * 2).toFixed(3)}*t)`;
  });
  return `(${voices.join('+')})*${env}`;
}

// Write a bed of `seconds` length to `out` (48 kHz stereo WAV).
export function procedural({ prompt, seconds = 30, out }) {
  const mood = MOODS[moodOf(prompt)];
  const bar = (4 * 60) / mood.bpm;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'posthouse-music-'));
  try {
    const parts = mood.chords.map((c, i) => {
      const f = path.join(tmp, `c${i}.wav`);
      ffmpeg(['-f', 'lavfi', '-i', `aevalsrc='${chordExpr(c, bar.toFixed(3))}':d=${bar.toFixed(3)}:s=${RATE}`, f]);
      return f;
    });
    const loop = path.join(tmp, 'loop.wav');
    ffmpeg([...parts.flatMap((f) => ['-i', f]), '-filter_complex', `${parts.map((_, i) => `[${i}:a]`).join('')}concat=n=${parts.length}:v=0:a=1`, loop]);
    const fadeOut = Math.min(3, seconds / 4);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    ffmpeg(['-stream_loop', '-1', '-i', loop, '-t', String(seconds), '-af',
      `lowpass=f=2400,aecho=0.8:0.6:120|240:0.25|0.15,afade=t=in:d=1.5,afade=t=out:st=${(seconds - fadeOut).toFixed(2)}:d=${fadeOut.toFixed(2)},alimiter=limit=0.6,aformat=channel_layouts=stereo`, '-ar', String(RATE), out]);
    return { file: out, model: `procedural:${moodOf(prompt)}` };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
