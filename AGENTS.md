# Agent instructions

- **Making a video:** follow [SKILL.md](SKILL.md). It is the full playbook (plan, voice, build, review, render).
- **Working on posthouse itself:**
  - `npm test` must pass. Library code in `lib/` is plain Node ESM with no dependencies; keep it that way.
  - `template/src/framework/` is shared by every video: nothing video-specific goes there.
  - Typecheck the template: `cd template && npm run voice -- --provider none && npm run storyboard && npx tsc`.
  - Never commit `.env`, `posthouse.config.local.json`, `videos/`, renders or any `*.mp4`.
  - A new voice provider = one file in `lib/voice/`, one entry in `lib/voice/index.mjs`, a section in
    `docs/voices.md`, and a test in `tests/config.test.mjs` (the interface check covers it automatically).
