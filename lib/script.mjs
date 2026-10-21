// The spoken script: scenes plus the bridges between them, as segments in speaking order; splitting one continuous
// take back into those segments; and a lint that catches narration that reads like a list instead of a person.
import { tokenize } from './words.mjs';

const round = (x) => Math.round(x * 1000) / 1000;

// A bridge is spoken while the camera travels INTO its scene, so the first scene can't have one.
export const bridgeId = (sceneId) => `${sceneId}~bridge`;

// [{ id, scene, kind: 'bridge' | 'scene', text }] in speaking order.
export function segments(spec) {
  const out = [];
  spec.scenes.forEach((s, i) => {
    if (i > 0 && s.bridge?.trim()) out.push({ id: bridgeId(s.id), scene: s.id, kind: 'bridge', text: s.bridge.trim(), tone: s.bridgeTone });
    out.push({ id: s.id, scene: s.id, kind: 'scene', text: s.text.trim(), tone: s.tone });
  });
  return out;
}

// One take's timed words → one slice per segment. counts[k] = how many words segment k has. Cuts fall in the middle
// of the pause between segments, so no word is clipped. Returns [{ start, end, words (re-zeroed to the slice) }].
export function splitTake(words, counts, total) {
  const slices = [];
  let i = 0;
  const bounds = counts.map((n) => { const r = [i, i + n - 1]; i += n; return r; });
  bounds.forEach(([a, b], k) => {
    const first = words[a];
    const last = words[b];
    const prevLast = k > 0 ? words[bounds[k - 1][1]] : null;
    const nextFirst = k < bounds.length - 1 ? words[bounds[k + 1][0]] : null;
    const start = prevLast ? (prevLast.end + first.start) / 2 : Math.max(0, first.start - 0.08);
    const end = nextFirst ? (last.end + nextFirst.start) / 2 : Math.min(total, last.end + 0.2);
    slices.push({
      start: round(start),
      end: round(end),
      words: words.slice(a, b + 1).map((w) => ({ text: w.text, start: round(w.start - start), end: round(w.end - start) })),
    });
  });
  return slices;
}

const CONNECTIVES = /^(and|but|so|because|now|then|that|that's|here's|this|meanwhile|imagine|picture|still|yet|plus|instead|even|or|if|when|which|meet|and yet|no wonder|it's|sounds|shocking|surprising|wait|turns out|here)\b/i;
const sentences = (text) => text.replace(/\[[^\]]*\]/g, ' ').split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);

// Warnings about how the narration will sound. Pure; used by `npm run voice` and `posthouse check`.
export function lintScript(spec) {
  const out = [];
  if (!spec.delivery?.persona) out.push({ level: 'warn', scene: null, message: 'no delivery.persona: say who is talking (launch-host, teacher, fellow-buyer, storyteller); see taste/narration.md' });
  spec.scenes.forEach((s, i) => {
    if (i === 0) return;
    const opener = (s.bridge?.trim() || s.text.trim()).replace(/^\[[^\]]*\]\s*/, '');
    if (!s.bridge?.trim() && !CONNECTIVES.test(opener)) {
      out.push({ level: 'warn', scene: s.id, message: `starts cold ("${opener.split(/\s+/).slice(0, 5).join(' ')}…"): add a bridge, or open with a word that links to the scene before` });
    }
  });
  // Rhythm is judged on the scenes' own lines: bridges are meant to be short.
  const body = spec.scenes.flatMap((s) => sentences(s.text));
  const avg = body.reduce((n, s) => n + tokenize(s).length, 0) / Math.max(1, body.length);
  if (body.length >= 6 && avg < 7) out.push({ level: 'warn', scene: null, message: `sentences average ${avg.toFixed(1)} words: reads like a list. Vary the rhythm: a long line, then a short punch` });
  const all = [...body, ...spec.scenes.flatMap((s) => sentences(s.bridge ?? ''))];
  if (!all.some((s) => s.endsWith('?'))) out.push({ level: 'info', scene: null, message: 'no questions anywhere: one well-placed question pulls the viewer in' });
  return out;
}
