import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryboard, captionPages, fixCaption, LEAD, MOVE, PULL, TAIL } from '../lib/timeline.mjs';

const words = (s, step = 0.5) => s.split(' ').map((text, i) => ({ text, start: i * step, end: i * step + 0.4 }));
const spec = {
  fps: 30,
  scenes: [
    { id: 'a', text: 'One idea here.', cues: { idea: 'idea' } },
    { id: 'b', text: 'It took thirty seconds.', cues: { n: '30' } },
    { id: 'c', text: 'Read the post.', cues: {}, overlay: true },
  ],
};
const voiced = {
  a: { words: words('One idea here.'), duration: 1.5, audio: 'voice/a.wav' },
  b: { words: words('It took thirty seconds.'), duration: 2, audio: 'voice/b.wav' },
  c: { words: words('Read the post.'), duration: 1.5, audio: null },
};

test('scenes last lead + voice + tail, with a move between and a pull into the overlay', () => {
  const sb = buildStoryboard(spec, voiced);
  const [a, b, c] = sb.scenes;
  assert.equal(a.start, 0);
  assert.equal(a.duration, LEAD + 1.5 + TAIL);
  assert.equal(b.start, a.duration + MOVE);
  assert.equal(c.start, Math.round((b.start + b.duration + PULL) * 30) / 30);
  assert.equal(c.moveIn, PULL);
  assert.equal(sb.total, Math.round((c.start + c.duration) * 30) / 30);
  assert.equal(c.audio, null);
});

test('cues are seconds from arrival, pinned to the spoken word (numbers in either form)', () => {
  const sb = buildStoryboard(spec, voiced);
  assert.equal(sb.scenes[0].cues.idea, LEAD + 0.5);
  assert.equal(sb.scenes[1].cues.n, LEAD + 1.0);
});

test('a cue word that was never said fails loudly', () => {
  const bad = { ...spec, scenes: [{ ...spec.scenes[0], cues: { x: 'missing' } }] };
  assert.throws(() => buildStoryboard(bad, voiced), /cue "x" wants the word "missing"/);
});

test('the sting extends the last scene so it plays out', () => {
  const plain = buildStoryboard(spec, voiced);
  const withSting = buildStoryboard(spec, voiced, { sting: true });
  assert.ok(withSting.sting.at > withSting.scenes[2].start);
  assert.ok(withSting.total >= withSting.sting.at + withSting.sting.duration - 1 / 30);
  assert.ok(withSting.total > plain.total);
  assert.equal(buildStoryboard({ ...spec, sting: false }, voiced, { sting: true }).sting, null);
});

test('caption pages break at sentence ends and never exceed six words', () => {
  const pages = captionPages(words('One two three four five six seven eight. Nine ten.'), 0);
  assert.deepEqual(pages.map((p) => p.tokens.length), [6, 2, 2]);
  assert.ok(pages.every((p) => p.endMs > p.startMs));
});

test('fixCaption supports exact and /regex/ keys', () => {
  assert.equal(fixCaption('Gonna', { Gonna: 'Going to' }), 'Going to');
  assert.equal(fixCaption('posthous', { '/^posth/i': 'posthouse' }), 'posthouse');
  assert.equal(fixCaption('other', { '/^posth/i': 'posthouse' }), 'other');
});
