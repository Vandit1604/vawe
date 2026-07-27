# AUTHOR-THE-FRAME — bespoke SVG/HTML beats (the another engine expressiveness)

another engine' single biggest edge is that a beat is a **hand-authored HTML+SVG file** — a bespoke dataviz,
a spatial org-tree, exact coordinates, any CSS — rather than an assembly of generic layer primitives. This
guide is how to get that expressiveness in our engine, what already works, and the one honest gap.

## We already share the mechanism

another engine seeks a **paused GSAP timeline per frame**, registered on `window.__timelines`. **Our engine
does the identical thing** — `core/clips.js` `seekAll(t)` seeks every timeline in `window.__timelines` and
pauses+seeks `gsap.globalTimeline`. So our motion is the same deterministic seek model theirs is; we are
not behind on the mechanism, only on how a bespoke frame is authored.

## What works TODAY: bespoke inline SVG/HTML as a layer

The `html` layer takes raw hand-authored HTML/CSS, and **static SVG survives sanitization** (only
`<script>`/`<iframe>`/embedding tags and escaping URLs are stripped, for the untrusted-input security
boundary — see `core/layers/html.js`). So a bespoke chart, tree, or diagram is a first-class beat:

```json
{ "type": "html", "x": 300, "y": 600, "w": 480, "start": 0.2, "duration": 2.6, "anim": "rise",
  "html": "<svg viewBox='0 0 200 120' width='480'><rect x='10' y='70' width='30' height='40' fill='var(--accent)' rx='2'/>…<polyline points='25,60 70,30 115,12 160,45' fill='none' stroke='#111' stroke-width='3'/></svg>" }
```

That renders a real dataviz (bespoke bars + a trend line) and passes `make probe` (pure in n). Combine it with:
- the `svg` layer for a mark that **draws on** or **shape-morphs** (`draw` / `morph`),
- `cameraMove` (`diveIn`/`panFollow`/`slowPush`) to push through or pan across the bespoke frame,
- a `paint`/`aurora` field or `beam` for living motion behind/around it,
- engine-seeked `fx`/`gsap:{}` and kinetic `split`+`preset` for the type.

Most of what a another engine composition does — bespoke SVG structure, camera choreography, path draw-on,
count-ups, morph — is expressible this way, deterministically.

## Dense per-CHILD choreography — the DEFAULT via `parts`

another engine animates **individual children of one figure on a single timeline** — bar 1 grows, then bar 2,
the line draws, the dots pop, all staggered (`01-divergence.html`). **That density is our default now, via
`parts`.** Put a named entrance on a layer's children and they animate piece by piece, staggered — pure in
n (it builds a paused GSAP tween that `seekAll` drives, the same mechanism as `fx`), and it works on ANY
layer's children (an `html` inline-SVG, a `group`, an `svg`). No `<script>` in the untrusted html layer
(that was a real exploit surface); `parts` is the safe, declarative path.

```json
{ "type": "html", "html": "<svg …><rect/><rect/>…<polyline/><circle/><circle/></svg>",
  "parts": [
    { "select": "rect", "anim": "growUp", "each": 0.5, "stagger": 0.09, "delay": 0.3 },
    { "select": "polyline", "anim": "drawOn", "each": 1.1, "delay": 1.3 },
    { "select": "circle", "anim": "popIn", "each": 0.3, "stagger": 0.12, "delay": 1.5 }
  ] }
```

Named entrances: **growUp** (bars from a baseline), **widen** (bars left→right), **popIn** (scale+fade),
**fadeUp** / **riseIn**, **drawOn** (SVG stroke draws itself). Pass one spec or an ARRAY (bars, THEN line,
THEN dots) so a single figure develops across its beat instead of arriving as one block. **Author figures
this way by default** — a static figure that lands in one frame is the flat tell `parts` exists to kill.

Still layer-level when you want it: `anim`/`motion`/`fx`/`split`+`preset` for the whole layer or its text.

Effects: [EFFECTS.md](../EFFECTS.md) · camera: `vawe-camera` · the storyboard/spec discipline that makes a
frame worth authoring: [FRAME-SPEC.md](FRAME-SPEC.md).
