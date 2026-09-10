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
is applied to layers the author already named by `id`, and it writes their `motion` keys and windows.

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

In a scene or a storyboard beat, one line:

```json
{ "recipe": "flow-seam", "at": 1.9, "out": "window", "in": "tagline", "ground": ["g1", "g2"] }
```

The expander turns that line into plain `motion` keys on the named layers. Nothing new reaches
the renderer, so `renderFrame(n)` stays pure.

## Adding one

1. `make study` the reference at a dense rate (`docs/CRAFT/REFERENCE-STUDY.md`).
2. Find the moment, name the second, look at the frames around it.
3. Measure the params off those frames. Write the entry with its `sources`.
4. Rebuild the moment from the recipe and put it beside the reference.
