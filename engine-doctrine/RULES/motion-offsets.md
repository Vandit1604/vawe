---
name: motion-offsets
when: writing a layer's motion[] keyframe track
holds: eye (films/scene/schema.json labels x/y as offsets; no gate catches an absolute value)
answers: "motion track x/y are offsets on the base position, not absolute canvas coordinates"
group: look
---
# Motion x/y are offsets on the base position, never absolute coordinates

A layer's `motion[]` keyframe does not move the layer TO `x`/`y`. It moves the layer BY `x`/`y` pixels
from wherever the layer's own `x`/`y` placed it. The schema says so in plain words: "X offset (px)". A
key written as if it were an absolute screen position lands the layer somewhere the author never saw
on the canvas. The first key, at `t: 0`, is always `{x: 0, y: 0}`: it is the layer's rest pose, not a
place to write its base coordinates a second time.

| parameter | value |
|---|---|
| unit | pixels, relative to the layer's own `x`/`y` |
| first key | `t: 0`, `x: 0`, `y: 0` |
| a key that means "go to 1120" | subtract the layer's base `x` first |

Right:
```json
{ "id": "card", "x": 200, "y": 400,
  "motion": [
    { "t": 0, "x": 0, "y": 0 },
    { "t": 5.6, "x": 720, "y": 0 }
  ]
}
```

Wrong:
```json
{ "id": "card", "x": 200, "y": 400,
  "motion": [
    { "t": 0, "x": 0, "y": 0 },
    { "t": 5.6, "x": 1120, "y": 0 }
  ]
}
```

## Why the write site still cannot catch this

`resolveKeyedProps` (`core/timeline/sequence.js`) has every layer in hand at boot, so it looks like the
write site for a refusal: flag a key whose value, read as an offset, resolves the layer far off the
canvas, while the SAME value, read as an absolute coordinate, would sit plainly on it. Measured against
every motion track in `films/scene/*.json` (295 tracks) before writing anything:

- A threshold loose enough to clear every real track (resolved position within roughly [-0.6, 1.6] of
  the canvas span, given the value alone looks like a plausible absolute coordinate) never fires: zero
  false positives, but it also would not have caught the illustrative bug (`x: 1200` base, `x: 1180`
  key resolves to 2380, comfortably inside that band).
- A threshold tight enough to catch that illustrative case (resolved position more than ~100px past the
  canvas edge) fires on real, shipped scenes: `rec1-nogate.json`'s `thumb` (base 1158, key 954, resolves
  to 2112) and `showcase-data.json`'s `runB` (base 1040, key 1080, resolves to 2120) are legitimate large
  intentional slides, sitting in the SAME resolved-position range as the hypothetical mistake.

There is no daylight in the value space between "an author's large, deliberate offset" and "an author's
absolute coordinate typed where an offset belongs": both produce a resolved position a few hundred
pixels past the canvas edge, and this codebase already ships scenes that land there on purpose. A
refusal tuned to catch the mistake also refuses real authoring, which this repo's own standard ranks
worse than the silent jump it would prevent. Not gated. An author checks by eye: if the first key doesn't
read as "how far from where I placed it," it is probably the absolute again.
