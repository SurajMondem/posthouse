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
| The CLI | `node SKILL_DIR/bin/posthouse.mjs doctor \| new \| voices \| say \| sfx \| usage` |
| Settings (voice provider, whisper, taste folder) | `SKILL_DIR/posthouse.config.json`, overridden by `posthouse.config.local.json` |
| Taste: look, rules, corrections | `taste` in the config (default `SKILL_DIR/taste/`) |
| API keys | only environment variables or `SKILL_DIR/.env`. Never ask the user to paste a key into chat; never write one to a file. |
| Each video | `SKILL_DIR/videos/<slug>/` (git-ignored). Never commit renders or MP4s to any repo. |
| Building blocks | `SKILL_DIR/template/src/framework/` (Stage, Captions, theme, ui) and `SKILL_DIR/kit/components/` |
| Stage API | `SKILL_DIR/docs/stage-api.md` |

## Load every run

1. `<taste>/rules.md`, `look.md`, `corrections.md`. They override generic video advice.
2. `SKILL_DIR/docs/stage-api.md`, and `SKILL_DIR/template/src/video/` as the worked example.

## Steps

0. **Setup.** `node SKILL_DIR/bin/posthouse.mjs doctor`. Fix what it flags, or tell the user what they must do
   themselves (install a tool, add a key). Then `node SKILL_DIR/bin/posthouse.mjs new <slug> --post <path>`.
1. **Read.** The post and its media. List every claim and number with the line it comes from. Nothing else reaches
   the screen or the script.
2. **Decide.** Kind (explainer / demo / trailer / story; rules § Kinds) and destination (sets `width`/`height` in
   `video/scenes.json`; lay scenes out for that canvas). Voice: the configured provider unless the user says
   otherwise; `silent` means provider `none`.
3. **Script.** One scene per idea, 4–8 scenes. Hook within 3 s; one insight per scene; plain words; end by pointing
   to the post. Write for the ear: spell names and URLs the way they're said ("example dot com") and map them back
   in `captionPhrases`. Numbers may be digits or words; cues match either. About 150 spoken words a minute; the
   length follows the content.
4. **Plan checkpoint (user).** One message: kind and why · estimated length · a table of scenes (what the voice
   says, the mechanism acted out on screen, the carrier into the next scene) · 2–3 hook options with a pick · any
   default being broken. Wait for yes or edits.
5. **Voice.** Write `video/scenes.json`. `npm run voice -- --dry-run` first (paid providers show the cost), then
   `npm run voice`. Unchanged scenes are cached; `-- --only <id> --force` re-voices one. Ask the user to listen
   before you go on: a note on the voice is a taste note.
6. **Storyboard.** `npm run storyboard`. It fails loudly if a cue word isn't in what was said; fix the cue or the
   script, never the timings.
7. **Build.** Replace `src/video/scenes/*`, `src/video/layout.ts` and `src/video/config.tsx` (Stage API). Each
   station acts out its idea on the words that name it. Carried-in elements are hidden while `t < 0`; carried-out
   ones dim when `gone`. Keep the bottom ~200 px clear for captions. Token colours only.
8. **Self-review.** `npx tsc`. Render, then sample frames at every mid-scene and mid-move into one sheet:
   `ffmpeg -i renders/video.mp4 -vf "select='eq(n\,F1)+eq(n\,F2)…',scale=400:-1,tile=4x3" -frames:v 1 sheet.jpg`
   (F = seconds × fps from `src/storyboard.json`). Look: legible on a phone, nothing overlapping, carriers read as
   the same object, captions never cover content. Fact-check the script against step 1 once more.
9. **Deliver.** `npm run render` → `renders/video.mp4`. Send it to the user. When they approve, copy it to
   `final/<slug>.mp4` with a short `final/README.md` (source post, voice provider and settings, date).
10. **Feedback.** Sort each note. This video only → fix it, log nothing. Taste → label it (`script`, `visual`,
    `timing`, `style`, `voice`, `sound`) and propose one dated line for `<taste>/corrections.md`. Write it only
    after the user says yes. The same note twice → propose moving it into `rules.md`.

## Rules of thumb

- Show the mechanism: act the idea out (a tap that gets answered, a bar that splits) instead of a labelled box.
- Entrances 0.3–0.5 s, one ease, 0.1 s staggers. Dim what isn't being explained.
- Pops on the key word of a reveal, not on every entrance.
- A scene that needs more time needs fewer words, not slower motion.
- Save a mechanism worth reusing to `SKILL_DIR/kit/components/` with a one-line header comment.
