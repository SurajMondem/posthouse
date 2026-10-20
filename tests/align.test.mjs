import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignWords, estimateWords } from '../lib/align.mjs';

const heard = (pairs) => pairs.map(([text, start, end]) => ({ text, start, end }));

test('alignWords keeps the script text and takes times from what was heard', () => {
  const out = alignWords(['Hello,', 'world.'], heard([['Hello', 0.1, 0.4], ['world', 0.5, 0.9]]), 1);
  assert.deepEqual(out, [{ text: 'Hello,', start: 0.1, end: 0.4 }, { text: 'world.', start: 0.5, end: 0.9 }]);
});

test('alignWords matches spoken numbers to digits', () => {
  const out = alignWords(['It', 'was', 'thirty', 'percent.'], heard([['It', 0, 0.2], ['was', 0.2, 0.4], ['30%.', 0.4, 1.2]]), 1.3);
  assert.equal(out[2].start, 0.4);
  assert.equal(out[2].end, 1.2);
  assert.ok(out[3].start >= out[2].end, 'the unmatched word follows its neighbour');
});

test('alignWords interpolates words whisper heard differently', () => {
  const out = alignWords(['Use', 'ElevenLabs', 'today.'], heard([['Use', 0, 0.3], ['11', 0.35, 0.6], ['Labs', 0.6, 0.9], ['today', 1.0, 1.4]]), 1.5);
  assert.equal(out[0].start, 0);
  assert.equal(out[2].start, 1.0);
  assert.ok(out[1].start >= 0.3 && out[1].end <= 1.0, 'the missed word sits in the gap between its neighbours');
});

test('alignWords never returns zero-length or backwards words', () => {
  const out = alignWords(['a', 'b', 'c', 'd'], heard([['a', 0.5, 0.6], ['d', 0.6, 0.7]]), 1);
  for (const w of out) assert.ok(w.end > w.start, `${w.text} has length`);
  for (let i = 1; i < out.length; i++) assert.ok(out[i].start >= out[i - 1].start - 1e-9, 'in order');
});

test('alignWords with nothing heard spreads words across the audio', () => {
  const out = alignWords(['one', 'two'], [], 2);
  assert.equal(out.length, 2);
  assert.ok(out[1].end <= 2);
});

test('estimateWords spreads words by length across the duration', () => {
  const out = estimateWords(['a', 'longer'], 2);
  assert.ok(out[0].start >= 0 && out[1].end <= 2);
  assert.ok(out[1].end - out[1].start > out[0].end - out[0].start);
});
