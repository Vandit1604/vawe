# colour-sting: design system

The system of the 5 s onsen sting. The tokens and parts are in `kit/kit.css`; `kit/kit.html` shows them on one sheet.
`page.html` is built from them.

Skills (named when this kit was written, after the film): the principles of `pbakaus/colorize` (one saturated colour per world, a near-neutral room behind it, one accent on one word).
Rejected: the web-page patterns of `leonxlnx/soft-skill` (nav, CTA button, pill, eyebrow, section padding), because a video frame is not a hero page.
No UI skill was needed: the film has no product UI.

## Palette roles

| role | value | where |
|---|---|---|
| ground, cold | ultramarine `#4254ff` to `#0b1170` | world cold |
| ground, warm | magenta `#ff5aa8` to `#a30d57` | world warm |
| ground, hot | vermilion `#ffb347` to `#b8260c` | world hot |
| ground, amber | amber `#ffd35c` to `#d8640a` | world amber |
| ground, red | red `#ff8a3a` to `#a8160a` | world red |
| ink | cream `#fff3e3` | text on every ground except amber |
| ink on light | plum `#2a0710` | text on amber |
| room | `#1a0907` | behind the worlds, never seen |
| accent | ultramarine `#2536ff` | the word "colour" on amber, nothing else |

## Type

One face: Unbounded. The name at 400 and 29% of the frame height. The line at 300 and 11.5%, with "colour" at 600 (the heaviest word is the one the film is about). The name is untracked, because the face is already wide. Its round o is the shape of the ring, so the ring stands in for the letter.

## Ground and light devices

- Ground: a radial gradient per world, lit from the ring (`--lx`, `--ly`, `--lr` follow it every frame), farthest-corner so no gradient ends inside the frame.
- Light: a screen-blend glow placed on the ring, and a heat front (`.heat`) that closes in from the edges on the last two worlds.
- Grain: 12 percent overlay on top of every frame, so nothing bands.
- Every world turn changes the ground colour and the light position. A ground is never flat.

## Text treatment

Words are set big and few: the name and one line of four words. The line opens from the ring's edge on a feathered mask, and the accent runs word by word to "colour". Text is never set under 6.7% of the frame height.

## Parts (each one element)

`.ground-*` (five), `.heat`, `.glow`, `.grain`, `.lockup` with `.word` and `.line`. The ring is the one 3D object, drawn on a canvas by the page.
