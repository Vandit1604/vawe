---
when: "you pick or assign the look of a move demo, or add an eleventh look"
answers: "the shared foundation every look inherits, the ten looks in one line each, and the rule that spreads looks over the 70 demos"
group: reference
---

# prompts/moves/LOOKS.md: one design system, ten looks

`demo/demo.css` holds both. A demo sets `<html data-look="name">`; no class, size or timing changes.

## The foundation (every look inherits it)

- Type: six sizes as a share of frame height (`--u` is 1 percent): hero 18, title 11, head 7.6, lead 6, body 4.8, small 3.8. `--hk` scales only the three headline sizes for a face that sets small.
- Faces: `--sans` text, `--head` headlines (weight, tracking, case by token), `--label` eyebrows, `--mono`, `--display` wordmarks, `--em-face` one emphasis word (`.em`).
- Spacing `--s1`..`--s5` (1.2 to 7 u). One grid: 12 columns, margin `--s5`, gutter `--s3` (`.grid`).
- Radius steps `--r0`..`--r6` (0, 0.5, 1, 2, 3, 4.6, 6 u). A look picks `--r-chip` and `--r-card` from them.
- Line weights: hair 1 px, rule 0.25 u, heavy 0.45 u. Depth: ring, stack, lift, hero. A look changes only the colour and which step it uses.
- Colour roles: ground, surface, raised, hover (a visible ladder), ink, muted, accent, on-accent, plus the `--paper` pair for a cut.
- Contrast: ink, muted, on-accent and paper text pass 4.5:1; accent as text passes 3:1 (large type only). `--faint` is for dots, rules and icons, never for text. `node prompts/moves/demo/contrast.mjs` checks all ten.
- `.chip` is a fixed square (`--size`, default 11 u) for an icon or a letter; a label that grows with its text is a pill of your own, not a `.chip`.
- Faces are in `generators/media/fonts.mjs` with a locked version (`harness/media/fonts.lock.json`).

## The ten looks

| look | character | use for |
|---|---|---|
| vawe | cool near-black, cobalt, dark ink on the accent | product UI, brand stings, anything default |
| daylight | white-blue, navy ink, tinted shadow, indigo | product UI on light: cursor, palette, before-after |
| terminal | charcoal green, one mono face, phosphor | typing, commands, streams, code |
| swiss | off-white hairlines, red, tracked mono labels | type and data: charts, logo walls, callouts |
| paper | cream, serif headline, brick orange, grain | quiet editorial type: titles, quotes, thanks |
| dusk | indigo to plum, grain, amber, one italic word | calm lockups, blur, focus, spotlight |
| brutal | acid yellow, black borders, hard shadow | hits on the beat: punch, cut, cascade |
| signal | near-black, condensed capitals, mint, pills | loud headlines, flash cuts, slices, release notes |
| field | one saturated green, lemon, tints | bold colour wipes, pops, sweeps |
| chrome | periwinkle bevels, halftone, burnt orange | physical objects: plates, stacks, tilts, flaps |

## Variety rule (how a look is assigned)

1. Within a group a look appears at most twice. Two exceptions: a group of more than 20 moves (Change between shots) lets one look take a third, and a move may borrow the nearest look when its pool is full.
2. Adjacent moves in a group list differ.
3. Product-UI moves take product looks (vawe, daylight, terminal, swiss). Type moves take editorial looks (paper, swiss, brutal, dusk, signal). Transitions take colour-led looks (field, chrome, brutal, signal) first.
4. A physical move (plates, flaps, tilts) takes chrome; a typed stream takes terminal.

The assignment is the `data-look` on each `demo/*.html`; the README looks table lists the clips per look.

## Skills used in the design pass

Used: `jakubkrehel/better-typography` (measure, balanced wraps, smart truncation with an ellipsis, tabular figures), `jakubkrehel/better-ui` (concentric radius, optical alignment, scrims that dim), `ibelick/baseline-ui` (spacing and hierarchy review only).
Rejected: better-typography's 16 px body floor and `font-synthesis: none` (a film sets its own sizes), baseline-ui's no-gradient and no-letter-spacing rules (looks set both), and every hover, press and hit-area rule (a film has no input).
