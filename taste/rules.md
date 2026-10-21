# Taste rules

Loaded on every run. These are the starter rules: edit them until the videos look like yours. Two tiers. **Fixed**
rules are never broken. **Defaults** may be broken when the plan says why in one line ("breaks *still while
speaking*: a slow push on the photo, to set the mood").

New rules come from your feedback through `corrections.md`: the same note twice becomes a rule here.

## Fixed: never broken

1. **The look.** `look.md`. Token colours only.
2. **Time comes from the voice.** Each scene lasts as long as its voice (plus 0.4 s before, 0.6 s after). Visuals
   fire on the words that name them (cues). To shorten a scene, cut words; never speed up the voice. Silent videos
   are paced for reading instead (about 2.5 words a second).
3. **No slide resets.** One continuous stage. Every move between scenes hands something across (a carrier): a shape
   that morphs, a frame, a line that becomes the next scene's floor. Never cut or crossfade between self-contained
   frames.
4. **Still while speaking.** The camera moves only between scenes, in the pause after the voice. No idle wobble to
   fill time.
5. **Real facts only.** Every number and claim on screen or in the script traces to a line in the post. Nothing
   invented.
6. **Nothing that costs money unless you ask.** Draft with free voices and sounds. Paid ones run only on request
   (`npm run voice -- --final`, `--source elevenlabs`) and show their cost first (`--dry-run`).
7. **One voice per channel.** Once you pick a voice, keep it across videos. A voice is part of who's talking.

## Defaults: break with a stated reason

| Default | Notes |
|---|---|
| Narrated, with captions | Burned-in captions (pages never cross a scene) so the video works on mute. |
| Sounds as haptics | A soft whoosh on each camera move, a tick when a carrier lands, a pop on the key word of a reveal, a short sting after the last word. Quiet: the voice stays on top. |
| Hook within 3 seconds | A belief the viewer shares, then the turn, then the gap the rest of the video fills. Pitch 2–3 hooks with a pick. |
| Plain words first, jargon small | Feelings and outcomes in the headline; technical names small and muted beneath. |
| Show the mechanism | Act the idea out (a bar that splits, a queue that jams, a tap that gets answered) instead of a box with a caption. Diagrams assemble piece by piece; what's being explained stays bright, the rest dims. |
| One direction of travel | Push in = deeper into the same idea. Pull back = the bigger picture or the ending. |
| Entrances 0.3–0.5 s | One ease (easeInOutCubic), 0.1 s staggers. Camera moves 0.8–1.5 s. |
| One accent per scene | The accent colour marks one focal element per scene at most. |
| Keep the bottom clear | Leave the bottom ~200 px for captions. |
| End by pointing to the post | Title, one line on what's inside, where to read it. |

## Kinds

| Kind | Signal in the post | Treatment |
|---|---|---|
| Explainer | A claim, numbers, a "how it works" | Keeps every core idea. Data animates from real values. Calm camera. |
| Demo | A live thing to show: a product, a URL, screenshots, a recording | Real UI is the stage; action → result. Less text. |
| Trailer | An announcement or launch; the goal is curiosity | The 3–5 strongest moments. Faster, bolder. Ends on a question. |
| Story | A personal post or reflection | Kinetic type over your own photos. Slow, mood-led. |

## Destinations

| Destination | Canvas (`scenes.json` width × height) | Note |
|---|---|---|
| Feed (LinkedIn, X, Instagram) | 1080 × 1080 | Offer a tighter cut when it runs over 90 s. |
| Shorts / Reels / TikTok | 1080 × 1920 | First line within 1 s. Lay scenes out for the tall canvas. |
| YouTube | 1920 × 1080 | No length warning. |
