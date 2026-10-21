---
name: posthouse
description: Turn a post (a blog article, project write-up, notes, a markdown/MDX path or a URL) into a finished narrated video with captions, sound cues and one continuous stage where the camera travels between ideas, built with Remotion. Use when the user asks to make a video from a post or article, "turn this into a video", "post to video", a LinkedIn / Shorts / YouTube / Reels video for something they wrote, or an explainer, demo, trailer or story video of a post.
---

# posthouse

You are the director. Read the post, write the narration, show the user one plan, voice it, build the stage, review
your own frames, render, and learn from their notes.

Usage: `/posthouse <post> [kind] [destination] [silent]`. `<post>` is a markdown/MDX path, a URL, or pasted notes.

`SKILL_DIR` below is the folder this file is in.

## Where things live

| What | Where |
|---|---|
| The CLI | `node SKILL_DIR/bin/posthouse.mjs doctor \| new \| voices \| say \| asset \| sources \| check \| setup \| serve \| kit \| usage` |
| Settings (voice provider, whisper, taste folder) | `SKILL_DIR/posthouse.config.json`, overridden by `posthouse.config.local.json` |
| Taste: look, rules, corrections | `taste` in the config (default `SKILL_DIR/taste/`) |
| API keys | only environment variables or `SKILL_DIR/.env`. Never ask the user to paste a key into chat; never write one to a file. |
| Paid services (ElevenLabs) | only when the user asks in this conversation: `--final` for voice, `--source elevenlabs` for assets |
| Sounds and music | `posthouse asset`, `posthouse sources`, `posthouse check` (`SKILL_DIR/docs/assets.md`) |
| Each video | `SKILL_DIR/videos/<slug>/` (git-ignored). Never commit renders or MP4s to any repo. |
| Building blocks | `SKILL_DIR/template/src/framework/` (Stage, Captions, theme, ui) and `SKILL_DIR/kit/components/` |
| Stage API | `SKILL_DIR/docs/stage-api.md` |

## Load every run

1. `<taste>/rules.md`, `narration.md`, `look.md`, `corrections.md`. They override generic video advice, and
   `narration.md` overrides any writing-style rules you follow elsewhere (chat or doc voices): narration is spoken.
2. `SKILL_DIR/docs/stage-api.md`, and `SKILL_DIR/template/src/video/` as the worked example.

## Steps

0. **Setup.** `node SKILL_DIR/bin/posthouse.mjs doctor`. Fix what it flags, or tell the user what they must do
   themselves (install a tool, add a key). Then `node SKILL_DIR/bin/posthouse.mjs new <slug> --post <path>
   --size wide|square|tall` (a blank starter; `--example` copies the example video instead). For a second version
   of the same video (another voice or music), `posthouse variant <slug> <name>` shares the scene code.
1. **Read.** The post and its media. List every claim and number with the line it comes from. Nothing else reaches
   the screen or the script.
2. **Decide.** Kind (explainer / demo / trailer / story; rules § Kinds) and destination (sets `width`/`height` in
   `video/scenes.json`; lay scenes out for that canvas). Voice: the configured provider unless the user says
   otherwise; `silent` means provider `none`. Persona: who is talking (`narration.md` § 1), set as
   `delivery.persona`.
3. **Script.** Write the whole narration first as **one spoken piece**, in the persona's voice, and read it aloud
   in your head: it must sound like one person talking, not a list of facts. Then cut it into scenes (one idea
   each, 4–8 scenes) and move the linking lines into **bridges** (`narration.md` § 2), spoken over the camera
   moves. Vary sentence length; ask at least one question; name the feeling before the fact. Hook within 3 s; end
   on an action. Write for the ear: spell names and URLs the way they're said ("example dot com") and map them
   back in `captionPhrases`. Numbers may be digits or words; cues match either. About 150 spoken words a minute.
4. **Plan checkpoint (user).** One message: kind and why · persona · estimated length · a table of scenes (bridge
   in, what the voice says, the mechanism acted out on screen, the carrier into the next scene) · 2–3 hook options
   with a pick · any default being broken. Wait for yes or edits.
5. **Voice.** Write `video/scenes.json`, then `npm run voice` (the free draft voice). It prints the script lint
   first: fix "starts cold" and "reads like a list" before voicing. By default the whole script is voiced as one
   continuous take and sliced into scenes and bridges, so the intonation flows; every take is normalised to
   −16 LUFS and cached. Ask the user to listen before you go on: a note on the voice is a taste note. **Never use a paid voice unless the user asks for it in this conversation.** When they do:
   `npm run voice -- --final --dry-run` to show the cost, then `npm run voice -- --final`.
   - **Sound and music.** The kit sounds are already in place. For a bed or a new sound:
     `node SKILL_DIR/bin/posthouse.mjs asset music|sfx "prompt" [--seconds n] --name <name>`, run inside the
     video folder (`--dry-run` shows which source it will use). Free sources only, unless the user asks for
     ElevenLabs: then add `--source elevenlabs`. Point `"music"` in `scenes.json` at the bed. If the video is for
     paid use, set `"commercial": true` in `scenes.json`.
6. **Storyboard.** `npm run storyboard`. It fails loudly if a cue word isn't in what was said; fix the cue or the
   script, never the timings.
7. **Build.** Replace `src/video/scenes/*`, `src/video/layout.ts`, `src/video/config.tsx` and the look in `src/video/theme.ts` (Stage API). Each
   station acts out its idea on the words that name it. Carried-in elements are hidden while `t < 0`; carried-out
   ones dim when `gone`. Keep the bottom ~200 px clear for captions. Token colours only.
8. **Self-review.** `npx tsc`. Render, then sample frames at every mid-scene and mid-move into one sheet:
   `ffmpeg -i renders/video.mp4 -vf "select='eq(n\,F1)+eq(n\,F2)…',scale=400:-1,tile=4x3" -frames:v 1 sheet.jpg`
   (F = seconds × fps from `src/storyboard.json`). Look: legible on a phone, nothing overlapping, carriers read as
   the same object, captions never cover content. Fact-check the script against step 1 once more.
9. **Deliver.** `npm run render` → `renders/video.mp4`. Run `node SKILL_DIR/bin/posthouse.mjs check` and tell the
   user anything non-commercial or needing credit. Send the video. When they approve, copy it to
   `final/<slug>.mp4` with a short `final/README.md` (source post, voice provider and settings, `check` output,
   date). If they want a polished version, offer the final voice (`--final`) and ElevenLabs music/SFX; spend
   nothing until they say yes.
10. **Feedback.** Sort each note. This video only → fix it, log nothing. Taste → label it (`script`, `visual`,
    `timing`, `style`, `voice`, `sound`) and propose one dated line for `<taste>/corrections.md`. Write it only
    after the user says yes. The same note twice → propose moving it into `rules.md`.

## Rules of thumb

- Show the mechanism: act the idea out (a tap that gets answered, a bar that splits) instead of a labelled box.
- Entrances 0.3–0.5 s, one ease, 0.1 s staggers. Dim what isn't being explained.
- Pops on the key word of a reveal, not on every entrance.
- A scene that needs more time needs fewer words, not slower motion.
- Save a mechanism worth reusing to `SKILL_DIR/kit/components/` with a one-line header comment.
