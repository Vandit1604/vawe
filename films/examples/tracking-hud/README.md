# tracking-hud

An 8 s, 16:9 film: a computer-vision tracking HUD. Hatched boxes and `x: y:` labels lock on the glyphs of big words while a lens (tilt, depth of field, bloom, pixel grid, aberration, tear) films the HTML screen. The message is "every frame, computed".

Style after a tracking-HUD test by Michael Nowak (@mnowakdesign); no frames, words or layouts of his are used.

## Render

```
bin/vawe dev films/examples/tracking-hud/page.html
bin/vawe ship films/examples/tracking-hud/page.html
```

The draft is half size, 30 fps. `ship` renders the final.

## Files

- `page.html`: the film.
- `kit/kit.css`: the HUD parts (screen, words, boxes, labels, connectors, caret).
- `DESIGN.md`: the look. `brief.md`: shot list, board, cut table, motion pass.
- `assets/`: Archivo and JetBrains Mono (SIL OFL 1.1; licenses beside them).

## Where things are in page.html

- `SHOTS` table, line 48: one row per shot (time, palette, tilt, zoom, aim, words, which glyphs get a box). The cut table is the `start` and `end` columns.
- `FLASH_CUTS`, line 86: the exposure flashes.
- Locks: `lockLate` rows in `SHOTS`, `lockDecay` (line 212) and `tearOn` (line 213).
- Lens call, line 221: `lens(htmlSource(...), {...})` with the DOF, bloom, grid, aberration, tear and exposure controls.
- `project()` labels, `paintLabels`, line 264: the label text is `cam.project` of the box corner.
- Tick cues: the `data-synth="tick"` rows at the top of `<body>`.

## Add your own music

The film ships the ticks and no bed. To use a track, add `<audio loop src="assets/your-track.m4a" data-at="0" data-fade-out="0.4"></audio>`, then run `bin/vawe see films/examples/tracking-hud/page.html` and check that the cuts land on its beat. The cuts sit on a 73.8 BPM grid (see `brief.md`, Board). Do not commit a track you do not have the rights to.
