# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

## Set up

```bash
git clone https://github.com/<you>/posthouse.git && cd posthouse
npm run setup
npm run doctor
npm test
```

Check the template still builds:

```bash
cd template
npm run voice -- --provider none && npm run storyboard && npx tsc
```

## Good first contributions

- **An asset source** (a new local model or library) in `lib/assets/sources.mjs`, with its licence declared.
- **A voice provider.** One file in `lib/voice/`, one line in `lib/voice/index.mjs`, a section in
  `docs/voices.md`. The interface test in `tests/config.test.mjs` checks it automatically.
- **A reusable scene component** in `kit/components/` (a chart, a gauge, a tap ripple), with a header comment
  saying what it shows.
- **Layouts for 1080×1920 or 1920×1080**, proven with a render.
- **Docs**: anything that confused you during setup.

## Guidelines

- `lib/` stays dependency-free (Node built-ins only). Optional tools are loaded lazily and checked by `doctor`.
- `template/src/framework/` is shared by every video: nothing video-specific there.
- Add or update a test for any change in `lib/`.
- Never commit secrets, `posthouse.config.local.json`, `videos/`, renders or `*.mp4`.
- Commit messages: a short imperative summary (`voice: add Piper speed option`).

## Reporting bugs

Open an issue with: what you ran, what you expected, what happened, and the output of
`node bin/posthouse.mjs doctor`. Please remove any API keys from logs.
