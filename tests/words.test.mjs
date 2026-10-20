import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignmentToWords, cacheKey, canon, findCue, mergePhrases, tokenize } from '../lib/words.mjs';

// An ElevenLabs-style alignment: one entry per character, 0.1 s each.
const align = (s) => ({
  characters: [...s],
  character_start_times_seconds: [...s].map((_, i) => i / 10),
  character_end_times_seconds: [...s].map((_, i) => (i + 1) / 10),
});

test('tokenize keeps punctuation and drops audio tags', () => {
  assert.deepEqual(tokenize('[excited] Hello,  world. [pause] Bye!'), ['Hello,', 'world.', 'Bye!']);
});

test('alignmentToWords groups characters into words with start/end', () => {
  assert.deepEqual(alignmentToWords(align('It gave 92.')), [
    { text: 'It', start: 0, end: 0.2 },
    { text: 'gave', start: 0.3, end: 0.7 },
    { text: '92.', start: 0.8, end: 1.1 },
  ]);
});

test('alignmentToWords drops audio tags, even glued to a word', () => {
  const words = alignmentToWords(align('[excited] Wow, [pause]really.'));
  assert.deepEqual(words.map((w) => w.text), ['Wow,', 'really.']);
  assert.equal(words[1].start, 2.2);
});

test('alignmentToWords handles empty or missing alignment', () => {
  assert.deepEqual(alignmentToWords(null), []);
  assert.deepEqual(alignmentToWords(align('   ')), []);
});

test('mergePhrases turns a spoken phrase into its on-screen form, keeping its timing', () => {
  const words = alignmentToWords(align('visit example dot com. Thanks'));
  const merged = mergePhrases(words, { 'example dot com': 'example.com' });
  assert.deepEqual(merged.map((w) => w.text), ['visit', 'example.com.', 'Thanks']);
  assert.equal(merged[1].start, words[1].start);
  assert.equal(merged[1].end, words[3].end);
});

test('cacheKey is stable for equal input and changes with any field', () => {
  const a = cacheKey({ text: 'hi', provider: 'say', opts: { rate: 180 } });
  assert.equal(a, cacheKey({ opts: { rate: 180 }, provider: 'say', text: 'hi' }));
  assert.notEqual(a, cacheKey({ text: 'hi!', provider: 'say', opts: { rate: 180 } }));
  assert.notEqual(a, cacheKey({ text: 'hi', provider: 'say', opts: { rate: 200 } }));
});

test('canon treats spoken and written numbers as the same', () => {
  assert.equal(canon(['thirty']), '30');
  assert.equal(canon(['30%.']), '30');
  assert.equal(canon(['twenty', 'five']), '25');
  assert.equal(canon(['three', 'point', 'three']), '3.3');
  assert.equal(canon(['Hello,']), 'hello');
});

test('findCue finds a word or a spelled-out number', () => {
  const words = [{ text: 'It' }, { text: 'took' }, { text: 'three' }, { text: 'point' }, { text: 'three' }, { text: 'seconds.' }];
  assert.equal(findCue(words, '3.3'), words[2]);
  assert.equal(findCue(words, 'seconds'), words[5]);
  assert.equal(findCue(words, 'minutes'), null);
});
