// ElevenLabs: hosted voices (including your own clone) with exact character timings, plus sound effects and music.
// The API key comes only from ELEVENLABS_API_KEY (shell or the git-ignored .env); on macOS a Keychain item named
// "elevenlabs" also works. It is never written to a file by posthouse.
// API: POST /v1/text-to-speech/{voice_id}/with-timestamps, GET /v1/user/subscription, GET /v1/voices, GET /v1/models.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { toWav } from '../audio.mjs';
import { alignmentToWords } from '../words.mjs';

const BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';

export const name = 'elevenlabs';
export const words = 'exact'; // timings come back with the audio; no transcription step

export function apiKey({ required = true } = {}) {
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key && process.platform === 'darwin') {
    try {
      key = execFileSync('security', ['find-generic-password', '-a', os.userInfo().username, '-s', 'elevenlabs', '-w'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      process.env.ELEVENLABS_API_KEY = key;
    } catch {}
  }
  if (!key && required) throw new Error('ELEVENLABS_API_KEY is not set. Put it in .env at the repo root (copy .env.example), or export it in your shell.');
  return key;
}

async function request(p, { method = 'GET', body, query, binary = false } = {}) {
  const url = new URL(p, BASE);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { 'xi-api-key': apiKey(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.json();
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt)); // rate limit or server hiccup: back off and retry
      continue;
    }
    const hint = res.status === 401 ? ' (the API key was rejected: check ELEVENLABS_API_KEY)' : res.status === 422 ? ' (the request was invalid: see detail)' : '';
    throw new Error(`ElevenLabs ${method} ${url.pathname} → ${res.status}${hint}\n${text.slice(0, 800)}`);
  }
}

export async function subscription() {
  const s = await request('/v1/user/subscription');
  return {
    tier: s.tier,
    used: s.character_count,
    limit: s.character_limit,
    remaining: s.character_limit - s.character_count,
    resetsAt: s.next_character_count_reset_unix ? new Date(s.next_character_count_reset_unix * 1000) : null,
  };
}

export async function voices() {
  const r = await request('/v1/voices');
  return (r.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, note: v.category }));
}

export async function models() {
  const r = await request('/v1/models');
  return (Array.isArray(r) ? r : []).filter((m) => m.can_do_text_to_speech !== false).map((m) => ({ id: m.model_id, name: m.name }));
}

// One request: text → { audio (Buffer), words [{ text, start, end }] }.
export async function tts({ voiceId, modelId, text, settings, previousText, nextText, outputFormat = 'mp3_44100_192', seed }) {
  const r = await request(`/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    query: { output_format: outputFormat },
    body: {
      text,
      model_id: modelId,
      voice_settings: settings,
      previous_text: previousText || undefined, // keeps intonation continuous across separately generated scenes
      next_text: nextText || undefined,
      seed,
    },
  });
  return { audio: Buffer.from(r.audio_base64, 'base64'), words: alignmentToWords(r.alignment ?? r.normalized_alignment) };
}

// Sound effect: prompt → audio Buffer. seconds 0.5–30 (omit to let the model choose); influence 0–1.
export async function soundEffect({ text, seconds, influence = 0.3, loop = false, outputFormat = 'mp3_44100_192' }) {
  return request('/v1/sound-generation', {
    method: 'POST', binary: true, query: { output_format: outputFormat },
    body: { text, duration_seconds: seconds, prompt_influence: influence, loop, model_id: 'eleven_text_to_sound_v2' },
  });
}

// Music: prompt → audio Buffer. ms 3000–600000. Instrumental by default (videos are voice-led).
export async function music({ prompt, ms, instrumental = true, modelId = 'music_v1', outputFormat = 'mp3_44100_192' }) {
  return request('/v1/music', {
    method: 'POST', binary: true, query: { output_format: outputFormat },
    body: { prompt, music_length_ms: ms, force_instrumental: instrumental, model_id: modelId },
  });
}

// ---- provider interface ----

export const describe = (o) => `ElevenLabs · ${o.voiceName || o.voiceId || '(no voiceId set)'} · ${o.modelId}`;

export async function check(o) {
  if (!apiKey({ required: false })) return { ok: false, detail: 'ELEVENLABS_API_KEY is not set', fix: 'cp .env.example .env, then paste your key after ELEVENLABS_API_KEY=' };
  if (!o.voiceId) return { ok: false, detail: 'no voiceId', fix: 'node bin/posthouse.mjs voices --provider elevenlabs, then set voice.elevenlabs.voiceId in posthouse.config.local.json' };
  const s = await subscription();
  return { ok: true, detail: `${s.tier} plan · ${s.remaining.toLocaleString()} credits left` };
}

// ~1 credit per character on most plans.
export async function estimate(texts) {
  const chars = texts.reduce((n, t) => n + t.length, 0);
  const s = await subscription();
  return {
    line: `~${chars.toLocaleString()} credits · ${s.remaining.toLocaleString()} left this period`,
    blocked: chars > s.remaining ? `not enough credits: need ~${chars}, have ${s.remaining}. Nothing was generated.` : null,
  };
}

export async function speak({ text, previousText, nextText, out, opts }) {
  const r = await tts({ ...opts, text, previousText, nextText });
  const tmp = path.join(path.dirname(out), `.${path.basename(out, '.wav')}.mp3`);
  fs.writeFileSync(tmp, r.audio);
  toWav(tmp, out);
  fs.rmSync(tmp, { force: true });
  return { wav: out, words: r.words };
}

export const list = voices;
