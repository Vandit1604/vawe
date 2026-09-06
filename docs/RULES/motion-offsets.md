---
name: motion-offsets
when: writing a layer's motion[] keyframe track
holds: eye (formats/scene/schema.json labels x/y as offsets; no gate catches an absolute value)
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
