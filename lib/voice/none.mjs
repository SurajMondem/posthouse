// No voice: a silent video paced for reading. Captions carry the words; each scene lasts as long as it takes to read.
import { estimateWords } from '../align.mjs';
import { tokenize } from '../words.mjs';

export const name = 'none';
export const words = 'estimate';

export const describe = (o) => `silent · ${o.wordsPerSecond ?? 2.5} words/s reading pace`;

export async function check(o) {
  return { ok: true, detail: describe(o) };
}

export async function speak({ text, opts }) {
  const tokens = tokenize(text);
  const total = Math.round((tokens.length / (opts.wordsPerSecond ?? 2.5) + 0.8) * 100) / 100;
  return { wav: null, words: estimateWords(tokens, total), duration: total };
}
