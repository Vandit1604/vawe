# The camera as the transition, and depth parallax

## The camera as the transition (what you asked the cuts to do, done with the lens)

A cut, a sting and a seam are all LOCAL: they own a window around a boundary. The camera is CONTINUOUS and
GLOBAL, and it does not reset at a cut. That is the whole device. Lay the beats out as STATIONS on a canvas
larger than the frame, then let `travel` visit them. The transition is the flight, and there is no cut at all.

Two films here are built this way, and they are the reference: `linear-journey.json` (a 3x2 station grid on
5760x2160, 12 camera keys, **zero** cuts) and `playhead.json` (16s, 20 keys, `s` climbing 1 → 2.66 while `x`
travels 656 → -848). Both hand-typed their keyframes because `travel` did not exist. Do not copy that.

**Pair it with depth or it is a slide, not a move.** Every layer sits at z = 0 unless you say otherwise, and
a camera trucking past a flat plane moves every layer by exactly the same amount: a picture of a scene, not a
scene. Parallax is a DIFFERENCE of depth, so it cannot exist while there is only one depth to have. Stand
layers apart with the `plane` modifier, `"modifiers": [{ "plane": -600 }]` behind, `{ "plane": { "z": 240 } }`
in front. Sign is the CSS one. Measured under a 600px truck at a 1600px lens (`harness/dev/spike-depth.mjs`):

| layer | z | moves |
|---|---|---|
| near | +300 | 738px |
| mid | 0 | 600px |
| far | -900 | 384px |

354px of differential displacement across one move. A layer at depth also changes apparent SIZE, by
`lens / (lens - z)`, and it must: depth without magnification is a translation, not a distance. Author the
layer at the size the distance asks for. `plane` turns the 3D rig on by itself, exactly as `tilt` does.
