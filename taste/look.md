# Look: Marquee

The starter look. A dark stage, warm white type, one marquee-yellow accent. Change it to your own brand by editing
this file **and** the tokens in `template/src/video/theme.ts` together.

## Colours

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0f1014` | the ground everywhere |
| `surface` | `#191b21` | cards |
| `surface2` | `#22252d` | wells, chart tracks |
| `border` | `#30343e` | 2 px hairlines |
| `text` | `#f3f1ea` | primary text |
| `muted` | `#a3a7b1` | secondary text, idle shapes |
| `accent` | `#ffc53d` | **one** focal element per scene: the key number, the active item, the call to action |
| `accentInk` | `#ffd86b` | accent-coloured text on dark |
| `good` / `warn` | `#46b17b` / `#e0913a` | only for good / needs-work bands in charts |

No gradients on content. No drop shadows, glass or blur.

## Type

| Role | Font | Size (1080 canvas) |
|---|---|---|
| Display / headline | Bricolage Grotesque 700–800, tracking −0.03em | 56–112 px |
| Body, labels | DM Sans 400–700 | 21–40 px |
| Kicker | DM Sans 700, uppercase, tracking 0.16em | 22 px |

Both fonts ship in `template/public/fonts/` under the SIL Open Font License. Bricolage is subset to ASCII: set
symbols like ≤ × → in DM Sans.

## Composition

- 84 px edge padding. Left-aligned text blocks. Nothing tilted at rest.
- One focal element per scene, upper-left third or dead centre; everything else muted.
- Cards: `surface`, 24 px radius, 2 px `border`.
- A small corner mark (logo + name) top-left, so a muted mid-scroll viewer knows whose video this is.
