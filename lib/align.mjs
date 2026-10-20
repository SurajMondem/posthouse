// Word timings for voices that don't return them (macOS say, Kokoro, Piper, any command).
// whisper.cpp listens to the audio and returns heard words with times. The script is the source of truth for the
// words themselves, so heard words are aligned back onto the script tokens; script words whisper missed or heard
// differently get times interpolated between their neighbours. Without whisper, times are estimated from length.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { duration, ffmpeg, which } from './audio.mjs';
import { canon, tokenize } from './words.mjs';

const round = (x) => Math.round(x * 1000) / 1000;
const weight = (t) => t.length + 1; // a word's share of a gap: roughly its spoken length

// Spread tokens across [from, to] by length.
function spread(tokens, from, to) {
  const total = tokens.reduce((n, t) => n + weight(t), 0) || 1;
  let at = from;
  return tokens.map((t) => {
    const d = ((to - from) * weight(t)) / total;
    const w = { text: t, start: round(at), end: round(at + d) };
    at += d;
    return w;
  });
}

export function estimateWords(tokens, total, { pad = 0.05 } = {}) {
  return spread(tokens, Math.min(pad, total / 4), Math.max(total - pad, total * 0.75));
}

// Edit-distance alignment of script tokens onto heard words. Returns script tokens with { start, end }.
export function alignWords(tokens, heard, total) {
  const S = tokens.map((t) => canon([t]));
  const H = heard.map((h) => canon([h.text]));
  const n = S.length;
  const m = H.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j - 1] + (S[i - 1] === H[j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (S[i - 1] === H[j - 1] && d[i][j] === d[i - 1][j - 1]) { match[i - 1] = j - 1; i--; j--; }
    else if (d[i][j] === d[i - 1][j - 1] + 1) { i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }

  const out = new Array(n);
  for (let i = 0; i < n; i++) if (match[i] >= 0) out[i] = { text: tokens[i], start: round(heard[match[i]].start), end: round(heard[match[i]].end) };
  const first = heard.length ? heard[0].start : 0.05;
  const last = heard.length ? heard[heard.length - 1].end : total - 0.05;
  for (let i = 0; i < n; ) {
    if (out[i]) { i++; continue; }
    let j = i;
    while (j < n && !out[j]) j++;
    let from = i > 0 ? out[i - 1].end : Math.min(first, j < n ? out[j].start : first);
    let to = j < n ? out[j].start : Math.max(last, from);
    const need = 0.06 * (j - i); // never zero-length words: borrow time from the neighbours, never overlap them
    if (j === n) to = Math.max(to, Math.min(total, from + need)); // trailing words may use the audio's tail first
    if (to - from < need) {
      if (i > 0) { from = Math.max(out[i - 1].start + 0.03, from - need / 2); out[i - 1].end = round(from); }
      if (j < n) { to = Math.min(out[j].end - 0.03, to + need / 2); out[j].start = round(to); }
      if (to - from < need && j === n) to = from + need;
    }
    spread(tokens.slice(i, j), from, to).forEach((w, k) => { out[i + k] = w; });
    i = j;
  }
  return out;
}

const expand = (p) => (p?.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

// whisper.cpp binary + a ggml model, from config.align, $WHISPER_MODEL, or the usual places. null when unavailable.
export function findWhisper(config = {}) {
  const align = config.align ?? {};
  if (align.whisper === 'off') return null;
  const bin = align.whisper && align.whisper !== 'auto' ? which(expand(align.whisper)) : which('whisper-cli');
  if (!bin) return null;
  let model = expand(align.model) || process.env.WHISPER_MODEL;
  if (!model) {
    const dirs = [config.root && path.join(config.root, 'models'), '~/.cache/whisper', '~/.cache/hyperframes/whisper/models',
      '/opt/homebrew/share/whisper-cpp', '/usr/local/share/whisper-cpp'].filter(Boolean).map(expand);
    const found = dirs.flatMap((dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^ggml-.*\.bin$/.test(f) && !/silero|vad/i.test(f)).map((f) => path.join(dir, f)) : []));
    model = found.find((f) => /base|small/.test(f)) ?? found[0];
  }
  if (!model || !fs.existsSync(model)) return null;
  return { bin, model, language: align.language ?? 'en' };
}

// Heard words with times, one per whisper segment (-ml 1 -sow).
export function whisperWords(wav, { bin, model, language = 'en' }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'posthouse-whisper-'));
  try {
    const in16 = path.join(tmp, 'in.wav');
    ffmpeg(['-i', wav, '-ar', '16000', '-ac', '1', in16]);
    execFileSync(bin, ['-m', model, '-f', in16, '-l', language, '-ml', '1', '-sow', '-oj', '-of', path.join(tmp, 'out'), '-np'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const json = JSON.parse(fs.readFileSync(path.join(tmp, 'out.json'), 'utf8'));
    return (json.transcription ?? [])
      .map((s) => ({ text: s.text.trim(), start: s.offsets.from / 1000, end: s.offsets.to / 1000 }))
      .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Script text + its audio → timed words. method says how the times were found.
export function wordsFor(wav, text, config) {
  const tokens = tokenize(text);
  const total = duration(wav);
  const w = findWhisper(config);
  if (w) return { words: alignWords(tokens, whisperWords(wav, w), total), method: 'whisper', duration: total };
  return { words: estimateWords(tokens, total), method: 'estimate', duration: total };
}
