import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chooseVoice, merge } from '../lib/config.mjs';
import { plan, readLock, resolveAsset } from '../lib/assets/index.mjs';
import { SOURCES } from '../lib/assets/sources.mjs';
import { synthFor } from '../lib/sfx.mjs';
import { moodOf } from '../lib/music.mjs';
import { musicEnvelope } from '../lib/timeline.mjs';
import { which } from '../lib/audio.mjs';

const base = JSON.parse(fs.readFileSync(new URL('../posthouse.config.json', import.meta.url)));
const tmpVideo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'posthouse-assets-'));
  const videoDir = path.join(root, 'video');
  fs.mkdirSync(path.join(videoDir, 'video'), { recursive: true });
  return { root, videoDir, config: merge(base, { root }) };
};
const offline = (config) => merge(config, { assets: { sfx: { order: ['files', 'synth', 'musicgen', 'elevenlabs'] }, music: { order: ['files', 'musicgen', 'procedural', 'elevenlabs'] } } });

test('ElevenLabs voice is used only when asked for', () => {
  const config = merge(base, { voice: { provider: 'elevenlabs' } });
  const draft = chooseVoice(config, {});
  assert.notEqual(draft.name, 'elevenlabs');
  assert.match(draft.note, /only when you ask/);
  assert.equal(chooseVoice(config, { final: true }).name, 'elevenlabs');
  assert.equal(chooseVoice(config, { explicit: 'elevenlabs' }).name, 'elevenlabs');
  assert.equal(chooseVoice(merge(base, { voice: { provider: 'kokoro' } }), {}).name, 'kokoro');
});

test('the resolver skips paid sources unless named, and takes the first that can deliver', async () => {
  const { videoDir, config } = tmpVideo();
  const p = await plan({ kind: 'sfx', prompt: 'soft whoosh' }, { config: offline(config), videoDir });
  assert.equal(p.chosen, 'synth');
  assert.match(p.rows.find((r) => r.name === 'elevenlabs').reason, /only when asked/);
  const asked = await plan({ kind: 'sfx', prompt: 'soft whoosh', source: 'elevenlabs' }, { config: offline(config), videoDir });
  assert.deepEqual(asked.rows.map((r) => r.name), ['elevenlabs']);
});

test('commercial videos skip non-commercial sources', async () => {
  const { videoDir, config } = tmpVideo();
  const p = await plan({ kind: 'music', prompt: 'calm' }, { config: offline(config), videoDir, commercial: true });
  assert.match(p.rows.find((r) => r.name === 'musicgen').reason, /not for commercial use/);
  assert.equal(p.chosen, 'procedural');
});

test('your own files win, from assets/ or the shared library/', async () => {
  const { root, videoDir, config } = tmpVideo();
  fs.mkdirSync(path.join(root, 'library', 'sfx'), { recursive: true });
  fs.writeFileSync(path.join(root, 'library', 'sfx', 'whoosh.wav'), 'x');
  const p = await plan({ kind: 'sfx', prompt: 'big whoosh', name: 'whoosh' }, { config: offline(config), videoDir });
  assert.equal(p.chosen, 'files');
});

test('every source declares kinds and a licence', () => {
  for (const [name, s] of Object.entries(SOURCES)) {
    assert.ok(s.kinds.length, `${name} kinds`);
    const lic = s.license({});
    assert.ok(lic.id, `${name} licence id`);
    assert.ok([true, false, 'conditional', 'unknown'].includes(lic.commercial), `${name} commercial flag`);
  }
  assert.equal(SOURCES.musicgen.license().commercial, false);
  assert.equal(SOURCES.elevenlabs.paid, true);
});

test('synth and mood matching read the prompt', () => {
  assert.equal(synthFor('a soft swoosh'), 'whoosh');
  assert.equal(synthFor('Big IMPACT'), 'impact');
  assert.equal(synthFor('violin'), null);
  assert.equal(moodOf('upbeat launch trailer'), 'uplifting');
  assert.equal(moodOf('dark and moody'), 'dark');
  assert.equal(moodOf('something'), 'calm');
});

test('Openverse picks the CC0 result closest in length', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ results: [
    { title: 'long', creator: 'a', url: 'u1', duration: 9000, license: 'cc0', source: 'freesound' },
    { title: 'right', creator: 'b', url: 'u2', duration: 800, license: 'cc0', source: 'freesound' },
  ] }) });
  try {
    const a = await SOURCES.openverse.available({ kind: 'sfx', prompt: 'whoosh', seconds: 0.7 }, { opts: {} });
    assert.match(a.detail, /"right" by b/);
  } finally {
    globalThis.fetch = real;
  }
});

test('music ducks under speech and stays in time order', () => {
  const env = musicEnvelope([[2, 5], [7, 9]], 12, { volume: 0.3, duck: 0.5, fadeIn: 1, fadeOut: 2, ramp: 0.25 });
  for (let i = 1; i < env.length; i++) assert.ok(env[i][0] > env[i - 1][0], 'strictly increasing times');
  const at = (t) => env.reduce((g, [k, v], i) => (t >= k && env[i + 1] && t <= env[i + 1][0] ? v + ((env[i + 1][1] - v) * (t - k)) / (env[i + 1][0] - k) : g), 0);
  assert.equal(at(3.5), 0.15);
  assert.equal(at(6), 0.3);
  assert.equal(env[0][1], 0);
  assert.equal(env[env.length - 1][1], 0);
});

test('a resolved asset lands in public/ and in assets.lock.json, and repeats come from cache', { skip: !which('ffmpeg') && 'needs ffmpeg' }, async () => {
  const { videoDir, config } = tmpVideo();
  const r = await resolveAsset({ kind: 'sfx', prompt: 'tick', name: 'tick' }, { config: offline(config), videoDir });
  assert.ok(fs.existsSync(path.join(videoDir, 'public', 'sfx', 'tick.wav')));
  assert.equal(r.entry.source, 'synth');
  assert.equal(readLock(videoDir).assets['sfx/tick.wav'].license.commercial, true);
  const again = await resolveAsset({ kind: 'sfx', prompt: 'tick', name: 'tick' }, { config: offline(config), videoDir });
  assert.equal(again.entry.cached, true);
});
