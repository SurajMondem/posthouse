// Storyboard: scene timing from the voice, cues pinned to spoken words, caption pages. Pure: no files, no audio.
// Each scene lasts LEAD + voice + TAIL. Then the camera travels MOVE s to the next station (PULL s into an overlay
// scene). Nothing overlaps: one stage, no fades.
import { findCue, mergePhrases } from './words.mjs';

export const LEAD = 0.4;
export const TAIL = 0.6;
export const MOVE = 1.0;
export const PULL = 1.5;
export const STING = 3.0; // signature sting after the last word, over the closing card
const STING_GAP = 0.15; // breath between the last word and the sting

// Caption fixes: exact keys, or "/regex/flags" keys for spellings that vary run to run (a name, a URL).
export function fixCaption(text, fixes = {}) {
  if (fixes[text] !== undefined) return fixes[text];
  for (const [k, v] of Object.entries(fixes)) {
    const m = k.match(/^\/(.*)\/([a-z]*)$/);
    if (m && new RegExp(m[1], m[2]).test(text)) return v;
  }
  return text;
}

// Pages never cross a scene; break at sentence ends, at a comma once 3+ words are up, or at 6 words.
export function captionPages(words, offset, { phrases = {}, fixes = {} } = {}) {
  const pages = [];
  let page = null;
  const shown = mergePhrases(words, phrases);
  shown.forEach((w, k) => {
    const text = fixCaption(w.text, fixes);
    const tok = { text, fromMs: Math.round((offset + w.start) * 1000), toMs: Math.round((offset + w.end) * 1000) };
    if (!page) { page = { startMs: tok.fromMs, tokens: [] }; pages.push(page); }
    page.tokens.push(tok);
    const n = page.tokens.length;
    if (/[.?!]$/.test(text) || (/,$/.test(text) && n >= 3) || n >= 6 || k === shown.length - 1) {
      page.endMs = tok.toMs + 250;
      page = null;
    }
  });
  return pages;
}

// spec: video/scenes.json. voiced: { [sceneId]: { words, duration, audio } } (audio is null for silent scenes).
export function buildStoryboard(spec, voiced, { sting = false } = {}) {
  const fps = spec.fps ?? 30;
  const snap = (s) => Math.round(s * fps) / fps;
  const list = spec.scenes;
  const captions = [];
  let start = 0;
  const scenes = list.map((sc, i) => {
    const v = voiced[sc.id];
    if (!v) throw new Error(`${sc.id}: no voice yet. Run "npm run voice" first.`);
    const duration = snap(LEAD + v.duration + TAIL);
    const cues = {};
    for (const [name, word] of Object.entries(sc.cues ?? {})) {
      const w = findCue(v.words, word);
      if (!w) throw new Error(`${sc.id}: cue "${name}" wants the word "${word}", which isn't in: ${v.words.map((x) => x.text).join(' ')}`);
      cues[name] = snap(LEAD + w.start);
    }
    captions.push(...captionPages(v.words, start + LEAD, { phrases: spec.captionPhrases, fixes: spec.captionFixes }));
    const moveIn = i === 0 ? 0 : sc.overlay ? PULL : MOVE;
    const next = list[i + 1];
    const moveOut = !next ? 0 : next.overlay ? PULL : MOVE;
    const scene = { id: sc.id, audio: v.audio ?? null, start: snap(start), duration, lead: LEAD, moveIn, cues, voice: v.duration };
    start += duration + moveOut;
    return scene;
  });
  captions.forEach((p, i) => { if (captions[i + 1]) p.endMs = Math.min(p.endMs, captions[i + 1].startMs); });

  // The last scene grows so the sting plays out over the closing card.
  let st = null;
  if (sting && spec.sting !== false) {
    const last = scenes[scenes.length - 1];
    const at = snap(last.start + last.lead + last.voice + STING_GAP);
    last.duration = Math.max(last.duration, snap(at + STING - last.start));
    start = last.start + last.duration;
    st = { at, duration: STING };
  }
  const total = snap(start);
  const speech = scenes.filter((s) => s.audio).map((s) => [s.start + s.lead, s.start + s.lead + s.voice]);
  for (const s of scenes) delete s.voice;
  const music = spec.music?.file ? { file: spec.music.file, envelope: musicEnvelope(speech, total, spec.music) } : null;
  return { fps, width: spec.width ?? 1080, height: spec.height ?? 1080, total, scenes, captions, sting: st, music };
}

// Music volume over time as [seconds, gain] keyframes: fade in, dip under every stretch of speech (ducking),
// come back up in the pauses, fade out at the end. The stage interpolates linearly between keyframes.
export function musicEnvelope(speech, total, { volume = 0.3, duck = 0.4, fadeIn = 1.5, fadeOut = 2.5, ramp = 0.3 } = {}) {
  const low = volume * duck;
  const pts = [[0, 0], [Math.min(fadeIn, total / 4), volume]];
  for (const [a, b] of speech) {
    const down = Math.max(pts[pts.length - 1][0], a - ramp);
    pts.push([down, volume], [a, low], [b, low], [b + ramp, volume]);
  }
  const outAt = Math.max(pts[pts.length - 1][0], total - fadeOut);
  pts.push([outAt, pts[pts.length - 1][1] === low ? low : volume], [total, 0]);
  // keep times strictly increasing (remotion's interpolate requires it)
  const out = [];
  for (const [t, g] of pts) {
    const r = Math.round(t * 1000) / 1000;
    if (out.length && r <= out[out.length - 1][0]) { out[out.length - 1][1] = g; continue; }
    out.push([r, Math.round(g * 1000) / 1000]);
  }
  return out;
}
