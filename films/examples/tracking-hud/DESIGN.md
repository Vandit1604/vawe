# tracking-hud: design system

An 8 s film in the look of a computer-vision tracking HUD. The screen is plain HTML (`#screen`, 1920 x 1080 px, tokens and parts in `kit/kit.css`). `core/surfaces/lens.js` films it, so the CRT look comes from the lens and not from CSS.

Style after a tracking-HUD test by Michael Nowak (@mnowakdesign); no frames, words or layouts of his are used.

## Screen (HTML)

- One `section.shot` per world (`data-world` s1 to s16), built from the `SHOTS` table in `page.html`.
- Words: Archivo 800, tracking -0.035em. Code: JetBrains Mono 700. Labels: JetBrains Mono 500, chrome (`aria-hidden`, `data-chrome`).
- Overlay: a hatched box per tracked glyph (45 degree lines, ink outline), an `x: 000 y: 000` label, a connector with an arrow and a dot between boxes. One glyph per film takes the yellow `#f6e84a`.
- Ground: a radial light per shot (`--lx`, `--ly`) over a faint field of coordinate text.

## Lens (per shot)

| control | what it does |
|---|---|
| `pal` | lens palette per shot: mono, phosphor (green), paper, thermal, navy |
| `rx ry rz` | camera tilt (perspective) in degrees |
| `zoom`, `aim` | zoom from and to; the box index the camera centres on, moving over the shot |
| DOF | focus follows the newest box; blur 0.6, bokeh 7 |
| bloom | strength 0.9, radius 42 |
| grid | pixel grid, amount 0.9, cell 2.5 |
| aberration | 3 at rest, up to 15 on a lock, decaying in about 0.12 s |
| tear | 70 for 3 frames on a lock, probability 0.3 |

## Locks and flashes

- A lock is 2 red frames on the first box of a shot, with an aberration peak and a tear. Every shot start has one; s15 and s16 have a second.
- Exposure flashes (`core/motion/exposure.js`, 3 frames) sit on the beat grid at 2.767, 3.95, 5.183 and 6.8 s, never more than two in one second.
- Labels read their coordinates from `cam.project`, so they follow the box through the lens.
