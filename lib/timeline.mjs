// Storyboard: scene timing from the voice, cues pinned to spoken words, caption pages. Pure: no files, no audio.
// Each scene lasts LEAD + voice + TAIL. Then the camera travels MOVE s to the next station (PULL s into an overlay
// scene). A scene's bridge line is spoken during that move (the move stretches to fit it), and the pauses around a
// bridge shrink to BRIDGE_TAIL / BRIDGE_LEAD, so the narration flows across the cut.
import { findCue, mergePhrases } from './words.mjs';
import { bridgeId } from './script.mjs';

export const LEAD = 0.4;
export const TAIL = 0.6;
export const MOVE = 1.0;
export const PULL = 1.5;
export const BRIDGE_TAIL = 0.2; // last word → bridge
export const BRIDGE_LEAD = 0.15; // bridge → first word of the next scene
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

// spec: video/scenes.json. voiced: { [id]: { words, duration, audio } } (audio is null for silent scenes), where id is
// a scene id or `<scene id>~bridge` for the line spoken over the camera move into that scene.
export function buildStoryboard(spec, voiced, { sting = false } = {}) {
  const fps = spec.fps ?? 30;
  const snap = (s) => Math.round(s * fps) / fps;
  const list = spec.scenes;
  const captions = [];
  const bridges = [];
  const capOpts = { phrases: spec.captionPhrases, fixes: spec.captionFixes };
  let start = 0;
  let moveIn = 0;
  const scenes = list.map((sc, i) => {
    const v = voiced[sc.id];
    if (!v) throw new Error(`${sc.id}: no voice yet. Run "npm run voice" first.`);
    const next = list[i + 1];
    const bridgedIn = i > 0 && !!voiced[bridgeId(sc.id)];
    const bridgeOut = next ? voiced[bridgeId(next.id)] : null;
    // A bridge fills the camera move, so the pauses around it shrink: the line carries the viewer across.
    const lead = bridgedIn ? BRIDGE_LEAD : LEAD;
    const tail = bridgeOut ? BRIDGE_TAIL : TAIL;
    const duration = snap(lead + v.duration + tail);
    const cues = {};
    for (const [name, word] of Object.entries(sc.cues ?? {})) {
      const w = findCue(v.words, word);
      if (!w) throw new Error(`${sc.id}: cue "${name}" wants the word "${word}", which isn't in: ${v.words.map((x) => x.text).join(' ')}`);
      cues[name] = snap(lead + w.start);
    }
    captions.push(...captionPages(v.words, start + lead, capOpts));
    const scene = { id: sc.id, audio: v.audio ?? null, start: snap(start), duration, lead, moveIn, cues, voice: v.duration };
    const base = !next ? 0 : next.overlay ? PULL : MOVE;
    const moveOut = bridgeOut ? Math.max(base, snap(bridgeOut.duration + 0.1)) : base;
    if (bridgeOut) {
      const at = snap(start + duration);
      bridges.push({ id: bridgeId(next.id), audio: bridgeOut.audio ?? null, at, voice: bridgeOut.duration });
      captions.push(...captionPages(bridgeOut.words, at, capOpts));
    }
    start += duration + moveOut;
    moveIn = moveOut;
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
  const speech = [
    ...scenes.filter((s) => s.audio).map((s) => [s.start + s.lead, s.start + s.lead + s.voice]),
    ...bridges.filter((b) => b.audio).map((b) => [b.at, b.at + b.voice]),
  ].sort((a, b) => a[0] - b[0]);
  for (const s of [...scenes, ...bridges]) delete s.voice;
  const music = spec.music?.file ? { file: spec.music.file, envelope: musicEnvelope(mergeWindows(speech), total, spec.music) } : null;
  return { fps, width: spec.width ?? 1080, height: spec.height ?? 1080, total, scenes, bridges, captions, sting: st, music };
}

// Speech windows closer than the music's dip-and-rise (~0.6 s) are one window: the bed stays down between them.
function mergeWindows(ws, gap = 0.6) {
  const out = [];
  for (const [a, b] of ws) {
    const last = out[out.length - 1];
    if (last && a - last[1] < gap) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
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
