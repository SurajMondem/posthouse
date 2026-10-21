import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeId, lintScript, segments, splitTake } from '../lib/script.mjs';
import { buildStoryboard, BRIDGE_LEAD, BRIDGE_TAIL, LEAD, MOVE, TAIL } from '../lib/timeline.mjs';
import { chunks } from '../lib/voice/kokoro.mjs';

const spec = {
  delivery: { persona: 'launch-host' },
  scenes: [
    { id: 'a', text: 'Someone paid less. They knew the number.', cues: {} },
    { id: 'b', bridge: 'Surprising, right?', text: 'Finance it and it grows.', tone: 'wry', cues: { grows: 'grows' } },
    { id: 'c', text: 'Because each charge is small.', cues: {} },
  ],
};

test('segments put each bridge before its scene, never before the first', () => {
  const s = segments({ scenes: [{ id: 'x', bridge: 'ignored', text: 'Hi.' }, ...spec.scenes.slice(1)] });
  assert.deepEqual(s.map((x) => x.id), ['x', bridgeId('b'), 'b', 'c']);
  assert.equal(s[2].tone, 'wry');
});

test('splitTake cuts a take between segments, mid-pause, and re-zeroes word times', () => {
  const w = (text, start, end) => ({ text, start, end });
  const words = [w('one', 0.1, 0.4), w('two', 0.5, 0.8), w('three', 1.2, 1.6), w('four', 2.0, 2.3)];
  const [a, b] = splitTake(words, [2, 2], 2.6);
  assert.equal(a.start, 0.02);
  assert.equal(a.end, 1.0); // middle of 0.8 → 1.2
  assert.equal(b.start, 1.0);
  assert.equal(b.end, 2.5);
  assert.deepEqual(b.words[0], { text: 'three', start: 0.2, end: 0.6 });
});

test('lint flags cold scene openings, telegraphic rhythm and a missing persona', () => {
  const warns = lintScript({ scenes: [
    { id: 'a', text: 'One. Two. Three.' }, { id: 'b', text: 'Financed over six years. Big. Short.' }, { id: 'c', text: 'But then. Wait. No.' },
  ] });
  const msg = warns.map((w) => `${w.scene}:${w.message}`).join('\n');
  assert.match(msg, /persona/);
  assert.match(msg, /b:starts cold/);
  assert.doesNotMatch(msg, /c:starts cold/); // "But" links to the scene before
  assert.match(msg, /reads like a list/);
  assert.deepEqual(lintScript(spec).filter((w) => w.level === 'warn').map((w) => w.scene), []);
});

test('a bridge plays over the camera move and shrinks the pauses around it', () => {
  const v = (n, dur = 1) => ({ words: n.split(' ').map((text, i) => ({ text, start: i * 0.2, end: i * 0.2 + 0.15 })), duration: dur, audio: 'x.wav' });
  const voiced = { a: v('Someone paid less. They knew the number.', 2), [bridgeId('b')]: v('Surprising, right?', 1.4), b: v('Finance it and it grows.', 1.5), c: v('Because each charge is small.', 1.6) };
  const sb = buildStoryboard({ fps: 30, scenes: spec.scenes }, voiced);
  const [a, b, c] = sb.scenes;
  assert.equal(sb.bridges.length, 1);
  const br = sb.bridges[0];
  assert.equal(a.duration, Math.round((LEAD + 2 + BRIDGE_TAIL) * 30) / 30); // short tail before the bridge
  assert.equal(br.at, a.start + a.duration); // bridge starts as the camera leaves
  assert.equal(b.moveIn, 1.5); // the move stretches to fit the 1.4 s bridge (+0.1)
  assert.equal(b.lead, BRIDGE_LEAD);
  assert.equal(b.cues.grows, Math.round((BRIDGE_LEAD + 0.8) * 30) / 30);
  assert.equal(c.moveIn, MOVE); // no bridge into c: a plain move
  assert.equal(b.duration, Math.round((BRIDGE_LEAD + 1.5 + TAIL) * 30) / 30);
  assert.ok(sb.captions.some((p) => p.tokens.some((t) => t.text === 'Surprising,')), 'bridge words are captioned');
});

test('Kokoro chunks long text at sentence ends and drops audio tags', () => {
  const long = Array.from({ length: 12 }, (_, i) => `[excited] Sentence number ${i} is here and it is fairly long.`).join(' ');
  const out = chunks(long);
  assert.ok(out.length > 1);
  assert.ok(out.every((c) => c.length <= 300 && !c.includes('[')));
  assert.ok(out.every((c) => /[.?!]$/.test(c)));
});
