---
when: you want a film to move the way a real reference film moves: its spine, its seams, how things enter and exit
answers: "what a recipe is, its format, why every recipe names its source video, and how to add one"
group: process
---

# recipes/: structure copied from real video

A recipe is one thing a real film does that another film can reuse: its **spine**, a **seam** between
two acts, how something **enters** or **exits**, how the **camera** moves, how the **ground** changes.
It is measured off a reference, never invented. That is the whole reason it exists: a film built from
what real films do beats a film built from what an agent imagines they do.

A recipe owns MOTION and STRUCTURE only. The layers, the copy, the colours stay the author's. A recipe
is applied to layers the author already named by `id`.

## Every recipe compiles to a named core capability

A recipe does not invent its own motion vocabulary. It reads what a reference film measurably does and
writes it as the ENGINE'S OWN named capability: a `seam` writes plain `motion` keys because a seam's
travel comes off the layers' own boxes and the canvas, and no single named primitive covers that; a
`camera` recipe writes a `cameraMove` entry (`core/camera-moves/`); an `enter` recipe writes a text
layer's own split-text sugar (`split`, `preset`, `core/kinetic/presets.js`). Nothing here is a second
motion language sitting beside the core's: a recipe is a route INTO it, measured off a real film instead
of typed from memory.

That is also why a gap in the core shows up here rather than getting quietly worked around. When no
named capability can express the measured move, the recipe REFUSES that part and says why, instead of
hand-keying a substitute (`recipes/expand.mjs`'s `word-by-word` refusing more than one distinct
per-word colour is the example: `core/kinetic/presets.js` `colorWave` sweeps a single accent through a
line and settles every word to the SAME resting colour, so two colours is a real gap, not a design
choice). Fixing that gap in the core makes every recipe that hits it better at once, which is the whole
argument for building recipes this way rather than as hand-authored one-offs.

## The kinds

| kind | compiles to | example |
|---|---|---|
| `seam` | plain `motion` keys on the outgoing/incoming layers, computed from their boxes and the canvas | `flow-seam` |
| `camera` | a `cameraMove` leg (`core/camera-moves/`, e.g. `diveIn`) | `window-dolly` |
| `enter` | a layer's split-text sugar (`split`, `preset`, `each`, `stagger`) | `word-by-word` |
| `spine` `exit` `ground` | not yet built; `recipes/index.mjs` accepts the kind, `recipes/expand.mjs` has no expander for it yet | - |

**Recipes can compose.** A `flow-seam` line whose `in` layer already carries `split: "word"` (written
by an earlier `word-by-word` line in the same `recipes[]` array) skips the whole-layer slide it would
otherwise write: the split track already owns the word-by-word arrival, and the seam only contributes
WHEN it starts (`start = at + gap`). Order the lines so the one that sets `split` runs first; a later
line always wins a field both would write (recipes/expand.mjs).

## The format (`recipes/recipes.json`)

```json
"flow-seam": {
  "kind": "seam",
  "blurb": "one act leaves on an axis, a frame of empty ground, the next arrives on the same axis",
  "sources": [{ "ref": "example-madera", "t": 4.58, "note": "window exits left, words enter from right" }],
  "slots": { "at": "seconds", "out": "layer id", "in": "layer id", "ground": "[layer id, layer id]?" },
  "params": { "axis": { "default": "x", "enum": ["x", "y"] } }
}
```

| field | rule |
|---|---|
| `kind` | one of `spine` `seam` `enter` `exit` `camera` `ground` |
| `blurb` | what it does, in words an author would search for |
| `sources` | **required, at least one.** `ref` names `refs/_clips/<ref>.mp4`, `t` is the second in that video. A recipe with no source is refused at load |
| `slots` | what the author must hand it: times and layer ids |
| `params` | every tunable, each with a MEASURED `default`. A default measured off one source is marked `"one-source": true` until a second source agrees |

## Using one

In a scene or a storyboard beat, one line per kind:

```json
{ "recipe": "flow-seam", "at": 1.9, "out": "window", "in": "tagline", "ground": ["g1", "g2"] }
{ "recipe": "window-dolly", "from": 0, "to": 1.9, "target": "window" }
{ "recipe": "word-by-word", "at": 1.9, "layer": "tagline" }
```

The expander turns each line into the named core capability above on the layers (or the scene's own
`cameraMove`) the author already named. Nothing new reaches the renderer, so `renderFrame(n)` stays
pure.

## Adding one

1. `make study` the reference at a dense rate (`docs/CRAFT/REFERENCE-STUDY.md`).
2. Find the moment, name the second, look at the frames around it.
3. Measure the params off those frames. Write the entry with its `sources`.
4. Rebuild the moment from the recipe and put it beside the reference.
