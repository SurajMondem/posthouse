// Word-level helpers: script tokens, ElevenLabs character timings → words, spoken phrase → on-screen form, cache keys.
import crypto from 'node:crypto';

const round = (x) => Math.round(x * 1000) / 1000;

// The words a viewer will see, in script order. Audio tags like [excited] are voice directions, not words.
export function tokenize(text) {
  return text.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean);
}

// ElevenLabs returns one timing per character; group them into words.
export function alignmentToWords(alignment) {
  if (!alignment?.characters?.length) return [];
  const { characters: ch, character_start_times_seconds: s, character_end_times_seconds: e } = alignment;
  const words = [];
  let cur = null;
  let inTag = false;
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (c === '[') { inTag = true; continue; }
    if (inTag) { if (c === ']') inTag = false; continue; }
    if (/\s/.test(c)) { if (cur) { words.push(cur); cur = null; } continue; }
    if (!cur) cur = { text: '', start: s[i], end: e[i] };
    cur.text += c;
    cur.end = e[i];
  }
  if (cur) words.push(cur);
  return words.map((w) => ({ text: w.text, start: round(w.start), end: round(w.end) }));
}

// Spoken phrase → on-screen form ("example dot com" → "example.com"), keeping the run's timing and any trailing
// punctuation. Matching ignores case and punctuation.
export function mergePhrases(words, phrases = {}) {
  const bare = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const out = [];
  for (let i = 0; i < words.length; ) {
    let hit = null;
    for (const [spoken, shown] of Object.entries(phrases)) {
      const parts = spoken.split(/\s+/).map(bare);
      const run = words.slice(i, i + parts.length);
      if (run.length === parts.length && run.every((w, k) => bare(w.text) === parts[k])) { hit = { run, shown }; break; }
    }
    if (hit) {
      const last = hit.run[hit.run.length - 1];
      const tail = last.text.match(/[^\p{L}\p{N}]+$/u)?.[0] ?? '';
      out.push({ text: hit.shown + tail, start: hit.run[0].start, end: last.end });
      i += hit.run.length;
    } else {
      out.push(words[i]);
      i += 1;
    }
  }
  return out;
}

export function cacheKey(obj) {
  const stable = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  return crypto.createHash('sha256').update(JSON.stringify(stable(obj))).digest('hex').slice(0, 16);
}

// Numbers are spoken as words and transcribed as digits (or the other way round). Compare their canonical form.
const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9.%]/g, '').replace(/\.+$/, '').replace(/%$/, '');

function wordNum(w) {
  if (/^\d+(\.\d+)?$/.test(w)) return w;
  if (UNITS.includes(w)) return String(UNITS.indexOf(w));
  if (w in TENS) return String(TENS[w]);
  const m = w.match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(one|two|three|four|five|six|seven|eight|nine)$/);
  if (m) return String(TENS[m[1]] + UNITS.indexOf(m[2]));
  if (w === 'hundred') return '100';
  return null;
}

// Canonical form of a run of 1–3 tokens: a number ("3.3", "30") when it spells one, else the normalised word.
export function canon(tokens) {
  const ws = tokens.map(norm);
  if (ws.length === 1) return wordNum(ws[0]) ?? ws[0];
  if (ws.length === 2 && ws[0] in TENS && wordNum(ws[1]) && Number(wordNum(ws[1])) < 10) return String(TENS[ws[0]] + Number(wordNum(ws[1])));
  if (ws.length === 3 && ws[1] === 'point' && wordNum(ws[0]) && wordNum(ws[2])) return `${wordNum(ws[0])}.${wordNum(ws[2])}`;
  return null;
}

// First word (or 2–3 word run) whose canonical form matches the cue; returns the word the run starts with.
export function findCue(words, cue) {
  const want = canon([cue]);
  for (let i = 0; i < words.length; i++) {
    for (const n of [1, 2, 3]) {
      if (i + n > words.length) break;
      if (canon(words.slice(i, i + n).map((w) => w.text)) === want) return words[i];
    }
  }
  return null;
}
