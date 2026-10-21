# Stage API

What you (or the agent) write for each video: `video/scenes.json`, `src/video/layout.ts`, `src/video/scenes/*.tsx`
and `src/video/config.tsx`. Everything in `src/framework/` is shared and stays the same.

## config.tsx

```tsx
export const config: StageConfig = {
  stations: [{ id: 's1-hook', Comp: Hook }, …],           // one per non-overlay scene, in scenes.json order
  carriers: [{ after: 0, render: (p) => <div style={at(mix(FROM, TO, p))} /> }, …],
  pops: { 's1-hook': ['video'] },                          // cue names that get a pop sound
  overlay: { id: 's6-cta', Comp: CtaOverlay, pose: { cx: 2.5, cy: 0.5, s: 0.18 } },
  chrome: { text: 'yourname.com', logo: 'img/logo.svg' },  // or false
  volume: { whoosh: 0.35, tick: 0.6, pop: 0.5, sting: 0.6 },
};
```

- **Stations** sit at world `x = i × width`. Their ids must match the scene ids.
- **Carriers** draw only while the camera travels from station `after` to `after + 1`. `p` runs 0 → 1, already
  eased. Boxes are world px: put shared boxes in `layout.ts` and use `world(box, stationIndex)`.
- **Overlay** is the closing scene, drawn in screen space over a pulled-back camera. `pose.s ≈ 0.9 / stations`
  fits every station in frame; with 5 stations at 1080 px they sit in a strip at y 443–637.

## A scene

```tsx
export const Hook: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, gone } = useT();
  return (
    <AbsoluteFill>
      <div style={appear(t, cues.post - 0.3)}><Kicker>You wrote a post</Kicker></div>
      <div style={{ ...at(CARD), opacity: t < 0 ? 0 : gone ? 0.35 : 1 }} />   {/* carried in, carried out */}
    </AbsoluteFill>
  );
};
```

| From `useT()` | Meaning |
|---|---|
| `t` | seconds since the camera arrived (negative while it travels in) |
| `gone` | the camera has left for the next station |
| `end` | when it leaves (seconds since arrival) |

| Cues | Seconds since arrival at which that word starts. `appear(t, cues.x - 0.2)` lands the entrance with the word. |
|---|---|

Rules that keep it one continuous shot:

- An element **carried in** is hidden while `t < 0` (the carrier is drawing it).
- An element **carried out** dims to 0.35 when `gone`, so the pulled-back ending never shows an empty station.
- Nothing moves while the voice speaks except what the words are naming.

## Helpers

`framework/theme.ts`: `C` (colour tokens), `DISPLAY`, `SANS`, `MONO`, `E` (easeInOutCubic), `OUT` (ease-out),
`prog(t, at, d, ease)` (0 → 1), `appear(t, at, d, dy)` (fade up), `dim(t, at, to)` (focus by dimming),
`pop(t, at)` (overshoot scale), `count(t, at, from, to, d)` (number counter), `usd(n)` ("$48,710").

`framework/ui.tsx`: `useT`, `Kicker`, `Headline`, `Card`, `Label`, `Small`, `Lines` (placeholder text lines).

`framework/Stage.tsx`: `mix(a, b, p)`, `at(box)`, types `Box`, `Pose`, `Cues`, `StageConfig`, `Storyboard`.

## Timing constants

`lib/timeline.mjs`: `LEAD` 0.4 s before the voice, `TAIL` 0.6 s after, `MOVE` 1.0 s between stations, `PULL` 1.5 s
into the overlay, `STING` 3.0 s.

**Bridges.** When a scene has a `bridge` line, it is spoken over the camera move into that scene. The move stretches
to fit the line (bridge length + 0.1 s), and the pauses around it shrink to `BRIDGE_TAIL` 0.2 s and `BRIDGE_LEAD`
0.15 s, so the narration flows across the move. Bridges are in `storyboard.bridges` and captioned like any line.

## The look

Colours, fonts and the mono face live in each video's `src/video/theme.ts` (`C`, `FONTS`, `DISPLAY`, `SANS`,
`MONO`). The framework re-exports them, so scenes keep importing from `framework/theme`, and restyling a video
never touches `src/framework/`.

## Reusable pieces

`kit/components/` collects mechanisms worth reusing (a gauge, a bar race, a tap ripple). Copy one into a video's
`src/video/` and adapt it.
