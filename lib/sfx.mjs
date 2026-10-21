// The default sound kit, synthesised from maths with ffmpeg: no samples, no licences, no downloads.
// whoosh: camera move · tick: a carrier lands · pop: a reveal on a cue word · sting: a short sign-off after the last word.
// Swap any file in kit/sfx/ for your own (same name, 48 kHz WAV, peaks near −3 dB). See docs/sound.md.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, RATE } from './audio.mjs';

const tone = (f, at, decay, amp) => `${amp}*gte(t,${at})*sin(2*PI*${f}*(t-${at}))*exp(-(t-${at})*${decay})`;

export const SOUNDS = {
  // band-limited pink noise under a sine-squared swell
  whoosh: ['-f', 'lavfi', '-i', `anoisesrc=d=0.7:c=pink:r=${RATE}:a=0.9`, '-af', "highpass=f=350,lowpass=f=4200,volume='1.8*sin(PI*t/0.7)*sin(PI*t/0.7)':eval=frame,alimiter=limit=0.7"],
  // a short, bright sine click
  tick: ['-f', 'lavfi', '-i', `aevalsrc='0.7*sin(2*PI*1900*t)*exp(-t*80)':d=0.08:s=${RATE}`],
  // a falling-pitch blip: f(t) = 380 + 900·e^(−30t), phase is its integral
  pop: ['-f', 'lavfi', '-i', `aevalsrc='0.7*sin(2*PI*(380*t+30*(1-exp(-30*t))))*exp(-t*22)':d=0.18:s=${RATE}`],
  // a rising major arpeggio (C5 E5 G5 C6) that rings out
  sting: ['-f', 'lavfi', '-i', `aevalsrc='${[[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36]].map(([f, at]) => tone(f, at, 1.8, 0.17)).join('+')}':d=3:s=${RATE}`, '-af', 'afade=t=out:st=2.4:d=0.6'],
};

// Extra synth sounds the asset resolver can make on request (not part of the default kit).
export const EXTRA = {
  // noise that brightens and swells over 1.5 s, cut dead at the end: a build into a reveal
  riser: ['-f', 'lavfi', '-i', `anoisesrc=d=1.5:c=white:r=${RATE}:a=0.6`, '-af', "highpass=f=600,volume='1.6*pow(t/1.5,2)':eval=frame,alimiter=limit=0.7"],
  // a low sine thump with a noise transient: weight under a big moment
  impact: ['-f', 'lavfi', '-i', `aevalsrc='0.75*sin(2*PI*(55*t+40*(1-exp(-25*t))))*exp(-t*6)+0.25*random(0)*exp(-t*60)':d=1.2:s=${RATE}`, '-af', 'lowpass=f=1800,alimiter=limit=0.7'],
  // two bell partials: a notification, a success
  chime: ['-f', 'lavfi', '-i', `aevalsrc='${tone(1318.5, 0, 4, 0.3)}+${tone(1975.5, 0.09, 4.5, 0.22)}':d=1.2:s=${RATE}`],
};

// Which synth sound fits a prompt ("soft swoosh" → whoosh). null when none does.
const WORDS = [
  [/whoosh|swoosh|swish|swoop|woosh|transition|swipe/, 'whoosh'],
  [/tick|click|tap|tock/, 'tick'],
  [/pop|blip|bubble|plop/, 'pop'],
  [/sting|logo|outro|sign.?off|jingle|ident/, 'sting'],
  [/riser|rise|build|swell/, 'riser'],
  [/impact|boom|hit|thud|slam|drop/, 'impact'],
  [/chime|bell|ding|notification|success/, 'chime'],
];
export const synthFor = (prompt = '') => WORDS.find(([re]) => re.test(prompt.toLowerCase()))?.[1] ?? null;

export function makeSound(name, out) {
  const args = SOUNDS[name] ?? EXTRA[name];
  if (!args) throw new Error(`no synth sound "${name}"`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ffmpeg([...args, '-c:a', 'pcm_s16le', out]);
  return out;
}

export function makeKit(dir) {
  return Object.keys(SOUNDS).map((name) => makeSound(name, path.join(dir, `${name}.wav`)));
}
