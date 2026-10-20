import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, merge, providerName } from '../lib/config.mjs';
import { loadProvider, providerNames } from '../lib/voice/index.mjs';

test('merge is deep and later values win', () => {
  assert.deepEqual(merge({ a: { b: 1, c: 2 }, d: 1 }, { a: { c: 3 } }), { a: { b: 1, c: 3 }, d: 1 });
  assert.deepEqual(merge({ a: [1, 2] }, { a: [3] }), { a: [3] });
});

test('the local config file is merged over the committed defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'posthouse-config-'));
  fs.writeFileSync(path.join(dir, 'posthouse.config.json'), JSON.stringify({ voice: { provider: 'auto', say: { rate: 180, voice: 'A' } }, taste: 'taste' }));
  fs.writeFileSync(path.join(dir, 'posthouse.config.local.json'), JSON.stringify({ voice: { say: { voice: 'B' } }, taste: 'my-taste' }));
  const c = loadConfig(dir);
  assert.deepEqual(c.voice.say, { rate: 180, voice: 'B' });
  assert.equal(c.tasteDir, path.join(dir, 'my-taste'));
  fs.rmSync(dir, { recursive: true });
});

test('"auto" picks say on macOS and silent elsewhere; an explicit name wins', () => {
  assert.equal(providerName({ voice: { provider: 'auto' } }), process.platform === 'darwin' ? 'say' : 'none');
  assert.equal(providerName({ voice: { provider: 'say' } }, 'kokoro'), 'kokoro');
});

test('every provider loads and has the interface', async () => {
  for (const name of providerNames) {
    const p = await loadProvider(name);
    assert.equal(p.name, name);
    for (const fn of ['describe', 'check', 'speak']) assert.equal(typeof p[fn], 'function', `${name}.${fn}`);
  }
  await assert.rejects(loadProvider('nope'), /unknown voice provider/);
});

test('the silent provider paces words for reading and makes no audio', async () => {
  const none = await loadProvider('none');
  const r = await none.speak({ text: 'one two three four five', opts: { wordsPerSecond: 2.5 } });
  assert.equal(r.wav, null);
  assert.equal(r.words.length, 5);
  assert.equal(r.duration, 2.8);
});
