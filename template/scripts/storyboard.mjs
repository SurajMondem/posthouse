// Storyboard: reads video/scenes.json + narration/ (from npm run voice) and writes src/storyboard.json:
// scene start times and lengths, bridge lines over the camera moves, cue times pinned to spoken words, caption
// pages. Fails loudly if a cue word isn't in what was said.
import fs from 'node:fs';
import path from 'node:path';
import { lib, readJson, VIDEO } from './repo.mjs';

const { buildStoryboard } = await lib('timeline.mjs');
const { segments } = await lib('script.mjs');

const spec = readJson('video', 'scenes.json');
const voiced = {};
for (const seg of segments(spec)) {
  const metaFile = path.join(VIDEO, 'narration', `${seg.id}.json`);
  if (!fs.existsSync(metaFile)) throw new Error(`${seg.id}: no voice yet. Run "npm run voice" first.`);
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  voiced[seg.id] = {
    words: readJson('narration', `${seg.id}.words.json`),
    duration: meta.duration,
    audio: meta.audio ? `voice/${seg.id}.wav` : null,
  };
}
// A bed that doesn't exist yet (still generating, or never made) would crash the render: leave it out and say so.
if (spec.music?.file && !fs.existsSync(path.join(VIDEO, 'public', spec.music.file))) {
  console.log(`note: music file public/${spec.music.file} not found; rendering without music. Make it with: posthouse asset music "…" --name ${path.basename(spec.music.file, path.extname(spec.music.file))}`);
  delete spec.music;
}
const sb = buildStoryboard(spec, voiced, { sting: fs.existsSync(path.join(VIDEO, 'public', 'sfx', 'sting.wav')) });
fs.writeFileSync(path.join(VIDEO, 'src', 'storyboard.json'), JSON.stringify(sb, null, 2) + '\n');
console.log(`total ${sb.total.toFixed(2)} s · ${sb.scenes.length} scenes · ${sb.bridges.length} bridges${sb.sting ? ` · sting at ${sb.sting.at.toFixed(2)} s` : ''}`);
for (const s of sb.scenes) console.log(`  ${s.id.padEnd(14)} start ${s.start.toFixed(2).padStart(6)}  dur ${s.duration.toFixed(2).padStart(5)}  cues ${Object.keys(s.cues).join(', ')}`);
