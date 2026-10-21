# Narration: how the video talks

Loaded on every run with `rules.md`. Narration is **spoken**, not written. Rules for writing messages, docs or
emails (short sentences, no filler, one idea per sentence) do **not** apply here: they produce a list of facts read
aloud. A video should sound like one person talking to the viewer, from the first word to the last.

## 1. Pick who's talking

Set `delivery.persona` in `video/scenes.json`. It decides the energy, the words and the tone tags.

| Persona | Use for | Sounds like | Moves | Tone tags (ElevenLabs v3) |
|---|---|---|---|---|
| `launch-host` | product launches, pitches | a confident founder on stage | stakes → reveal, "Meet…", a beat before the name | `confident`, `excited`, `curious` |
| `teacher` | explainers, how-it-works | a friend who just figured it out | "Here's the thing…", "Think of it like…" | `curious`, `warm`, `thoughtful` |
| `fellow-buyer` | consumer pain, money, trust | someone who got burned once | "We've all been there", second person, honest asides | `wry`, `sympathetic`, `confident` |
| `storyteller` | personal posts, reflections | late-night, unhurried | scene-setting, a pause before the turn | `warm`, `soft`, `reflective` |
| `announcer` | trailers, short ads | big, punchy, fast | short bursts, a question at the end | `excited`, `dramatic` |

## 2. Write it as one piece, then cut it into scenes

Write the whole script first, the way you'd say it out loud to one person. Read it aloud. Only then split it into
scenes (one idea each) and pull the linking lines out into **bridges**.

A **bridge** (`"bridge"` on a scene) is spoken while the camera travels into that scene. It carries the viewer
across the move, so nothing ever "all of a sudden" changes. Use one on most scene changes:

| Bridge type | Example | When |
|---|---|---|
| Reaction | "Surprising, right?" · "Ouch." | after a fact that should land |
| Question | "So how did they know, and you didn't?" | before the explanation |
| Callback | "That $2,000? It gets worse." | when the next scene builds on the last |
| Turn | "Here's the thing." · "But it doesn't have to be that way." | before the solution |
| Setup | "That's the gap we're closing." | right before the product's name |

Keep bridges short: 2–8 words, about one camera move long. The scene's own text then starts mid-thought.

## 3. Rhythm

- **Vary the length.** A long line that builds, then a short one that lands. Three short fragments in a row read
  like a spreadsheet ("Same price. Same day. Same card.").
- **Talk to one person:** "you", contractions ("you'll", "that's"), and numbers the way they're said
  ("twenty-four hundred", not "2,400").
- **Name the feeling, then the fact:** "It stings: that two thousand becomes almost twenty-five hundred."
- **One question per video, at least.** It pulls the viewer in.
- **End on an action**, not a summary.

## 4. Emotion

- `tone` on a scene (and `bridgeTone` on its bridge) sets how a line is delivered. ElevenLabs v3 models act it
  out; other voices ignore it (and never read it aloud).
- Local voices (Kokoro, Piper) have no emotion control: the words and the rhythm have to carry the feeling, which is
  one more reason for bridges and varied sentence length.

## 5. Before and after

| Before (a list of facts) | After (someone talking) |
|---|---|
| "Most people pay for subscriptions they forgot about. Forty dollars a month. Every month. Nobody checks." | "Most people are paying for subscriptions they forgot about. About forty dollars a month. And the reason? Nobody ever checks." |
| *(2 s of silence, camera moves)* | *bridge:* "Doesn't sound like much, right? Now add it up…" |
| "Over five years, that forty dollars becomes twenty-four hundred." | "Over five years, that forty dollars quietly adds up to twenty-four hundred." |
| *(2 s of silence)* | *bridge:* "So why does nobody notice?" |
| "Because the charges are small. And spread out." | "Because each charge is small, and they land on different days. You only ever see one at a time." |

## 6. What `npm run voice` and `posthouse check` flag

- no `delivery.persona`
- a scene with no bridge that starts cold (no linking word like "But", "So", "That's", "Here's")
- sentences averaging under 7 words (reads like a list)
- no question anywhere

Warnings, not errors: break them on purpose, with a reason in the plan.
