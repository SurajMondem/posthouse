// Storyboard: reads video/scenes.json + narration/ (from npm run voice) and writes src/storyboard.json:
// scene start times and lengths, cue times pinned to spoken words, caption pages. Fails loudly if a cue word
// isn't in what was said.
import fs from 'node:fs';
import path from 'node:path';
import { lib, readJson, VIDEO } from './repo.mjs';

const { buildStoryboard } = await lib('timeline.mjs');

const spec = readJson('video', 'scenes.json');
const voiced = {};
for (const s of spec.scenes) {
  const metaFile = path.join(VIDEO, 'narration', `${s.id}.json`);
  if (!fs.existsSync(metaFile)) throw new Error(`${s.id}: no voice yet. Run "npm run voice" first.`);
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  voiced[s.id] = {
    words: readJson('narration', `${s.id}.words.json`),
    duration: meta.duration,
    audio: meta.audio ? `voice/${s.id}.wav` : null,
  };
}
const sb = buildStoryboard(spec, voiced, { sting: fs.existsSync(path.join(VIDEO, 'public', 'sfx', 'sting.wav')) });
fs.writeFileSync(path.join(VIDEO, 'src', 'storyboard.json'), JSON.stringify(sb, null, 2) + '\n');
console.log(`total ${sb.total.toFixed(2)} s · ${sb.scenes.length} scenes${sb.sting ? ` · sting at ${sb.sting.at.toFixed(2)} s` : ''}`);
for (const s of sb.scenes) console.log(`  ${s.id.padEnd(14)} start ${s.start.toFixed(2).padStart(6)}  dur ${s.duration.toFixed(2).padStart(5)}  cues ${Object.keys(s.cues).join(', ')}`);
