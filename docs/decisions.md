# Decisions

Why posthouse is built the way it is, and what else was on the table. Each entry: the choice, the alternatives, and
when you might choose differently.

## 1. Time comes from the voice

**Choice.** Each scene lasts as long as its narration plus a short lead and tail. Visuals fire on the words that
name them.

| Option | Upside | Downside |
|---|---|---|
| **Voice-timed scenes** ✓ | Picture and words always agree; editing the script re-times everything | Needs word timings |
| Fixed scene lengths | Simple | Voice and picture drift; every edit means re-timing by hand |
| Reading-paced, no voice | No audio setup | Less engaging; slower to watch |

Silent videos are still supported (`none`), paced for reading.

## 2. One continuous stage instead of slides

**Choice.** Scenes are stations in one world; a camera travels between them and carriers morph shapes across.

| Option | Upside | Downside |
|---|---|---|
| **One stage + carriers** ✓ | Feels like one shot; the eye has something to follow | Scenes must agree on shared boxes (`layout.ts`) |
| Cuts / crossfades between scenes | Each scene is independent | Reads as a slideshow |
| Free 3D camera | Cinematic | Much more to build per video; easy to overdo |

## 3. Remotion for rendering

**Choice.** [Remotion](https://www.remotion.dev): React components rendered frame by frame.

| Option | Upside | Downside |
|---|---|---|
| **Remotion** ✓ | Mature; React; precise frame control; Studio preview; audio built in | Company licence above a small team size |
| [HyperFrames](https://www.npmjs.com/package/hyperframes) (Apache-2.0) | HTML + GSAP; permissive licence | Younger ecosystem |
| Motion Canvas (MIT) | Permissive; strong for diagrams | Smaller community; different authoring model |
| Raw ffmpeg | No framework | Layout and animation by hand |

If Remotion's licence doesn't fit your company, the stage is small (`Stage.tsx` is ~120 lines). Porting it to
another renderer is a contained job.

## 4. Pluggable voices, with a free default

**Choice.** One provider interface (`lib/voice/`), five providers, `auto` picks a free one.

Why not ElevenLabs only: a public tool shouldn't need a credit card to try. Why not local only: hosted voices
(and voice cloning) are still clearly better, and creators care about sounding like themselves.

## 5. The script is the source of truth for words

**Choice.** For local voices, whisper's transcript is aligned *onto* the script instead of replacing it.

| Option | Upside | Downside |
|---|---|---|
| **Align whisper onto the script** ✓ | Captions show your exact words and punctuation; cues match what you wrote | A small alignment step |
| Use whisper's transcript as-is | Simplest | Misheard names and number formats end up in captions and break cues |
| Estimate from word length | No dependency | Cues can be a beat off |

The estimate is kept as the fallback when whisper isn't installed.

## 6. Synthesised sounds

**Choice.** The default sound kit is generated from maths with ffmpeg.

Sample packs (even CC0 ones) add a download step and a licence to track; AI-generated sounds depend on a paid
plan's terms. Synthesised sounds ship in the repo with no strings. Swap in your own any time.

## 7. Taste as plain markdown

**Choice.** Look, rules and corrections are three markdown files the agent reads every run. Feedback becomes a
dated correction line (after your yes); a repeated correction becomes a rule.

| Option | Upside | Downside |
|---|---|---|
| **Markdown taste files** ✓ | Human-readable; versioned; any agent can follow them | Not machine-checked |
| JSON style schema | Machine-checkable | Can't express "why" or judgement calls |
| Nothing (prompt each time) | No files | Every video starts from zero |

## 8. Dependency-free library

**Choice.** `lib/` uses only Node built-ins (plus ffmpeg, and optional whisper.cpp / kokoro-js).

Fewer installs, fewer supply-chain risks, and the voice step runs anywhere Node does. The template holds the only
npm dependencies (Remotion, React, TypeScript).

## 9. Videos never enter git

**Choice.** `videos/`, renders and every `*.mp4` are git-ignored.

Renders are large and personal. Publish finished videos where they're watched, not in the repo.

## 10. Paid services are intentional

**Choice.** ElevenLabs (voice, SFX, music) runs only when a command names it: `npm run voice -- --final`,
`--provider elevenlabs`, or `posthouse asset … --source elevenlabs`. A config file alone never triggers it, and it
is never a fallback.

| Option | Upside | Downside |
|---|---|---|
| **Only when asked** ✓ | Drafts cost $0; credits go to versions you already like | One extra flag for the final pass |
| Use it whenever a key is set | Best quality every run | Burns credits on every draft and test |
| Ask interactively each time | Explicit | Breaks scripted and agent runs |

Takes and assets are cached per provider, so moving between draft and final never re-spends credits.

## 11. Heavy models as plugins, not dependencies

**Choice.** ACE-Step, MusicGen and Stable Audio Open install only on `posthouse setup <name>`, each in its own
environment under `~/.cache/posthouse/`, and talk to posthouse over HTTP (ACE-Step) or a one-line JSON process
boundary (Python plugins).

The library stays dependency-free and the install stays small for people who never want local AI audio. Each
model's Python stack (often pinned to different torch versions) can't break the others.

## 12. Every asset records its licence

**Choice.** Each voice take and asset stores its source, model and licence; `posthouse check` reads them, and a
video marked commercial skips non-commercial sources.

Open model licences differ a lot (MusicGen weights are non-commercial; ACE-Step is MIT; Stable Audio has a revenue
cap). Tracking it per file is the only way a creator can answer "can I monetise this?" with confidence.

## 13. Music normalised to one loudness

**Choice.** Every music asset is normalised to −18 LUFS before use.

Different sources produce tracks 10–20 dB apart. Normalising means `music.volume` behaves the same whatever made
the track, so swapping a procedural draft bed for an ACE-Step or ElevenLabs track needs no re-mixing.

## 14. Narration is spoken, and has its own rules

**Choice.** A dedicated guide (`taste/narration.md`) with personas and bridges, a script lint, and `SKILL.md`
telling the agent to write the script as one spoken piece before cutting it into scenes.

The first real-world test video showed the failure mode: an agent that writes tersely for chat ("short sentences,
one idea per sentence, no filler") produced narration that sounded like a list of facts, with 2 s of silence at
every scene change. Connective lines are not filler when spoken; they are what makes it sound like a person.

## 15. Bridges over the camera moves, and one continuous take

**Choice.** Linking lines play while the camera travels, and the whole script is voiced as one take, then sliced.

| Option | Upside | Downside |
|---|---|---|
| **Bridges + continuous take** ✓ | Dead air between scenes drops from ~2.0 s to ~0.4 s; intonation flows across cuts for every voice | Editing one line re-voices the whole take (cached otherwise; `--take scenes` when that's costly) |
| Shorter pauses only | Simple | Still sounds like separate clips; the camera move has nowhere to go |
| Voice over the whole move without bridges | No new field | Content spoken over a moving camera is hard to follow |
