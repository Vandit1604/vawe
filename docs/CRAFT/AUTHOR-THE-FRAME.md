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

## The one honest gap: per-CHILD inline choreography

another engine animates **individual children of one SVG on a single timeline** — bar 1 grows, then bar 2, the
line draws, the camera pushes, all as `tl.fromTo(...)` at absolute times (`01-divergence.html`). Our motion
operates at the **layer** level (`anim`/`motion`/`fx` target the layer, not its inner rects/paths). So a
staggered per-bar fill inside one bespoke `<svg>` is not yet a one-liner here.

Why we do NOT just allow inline `<script>` in the `html` layer: that layer renders **untrusted** MCP-supplied
bytes, and script execution there is a real exploit surface (it once read private files into a draft). The
safe path for per-child choreography is a **first-party trusted composition** (a scene the repo author
writes), not the untrusted input layer. Options, in order of effort:
1. **Split the parts into layers** — author each bar/segment as its own `rect`/`svg` layer in a `group`,
   and the group's `each`/stagger gives you the staggered fill. Verbose but works today and stays pure.
2. **A future `motion` binding for html-layer child selectors** (seek a registered timeline that targets
   `el.querySelectorAll(...)`), gated to first-party scenes only — the clean long-term fix (tracked, not built).

Until then: bespoke SVG structure + engine-seeked layer motion covers the large majority. Reach for split
layers when a single figure needs its parts to animate independently.

Effects: [EFFECTS.md](../EFFECTS.md) · camera: `vawe-camera` · the storyboard/spec discipline that makes a
frame worth authoring: [FRAME-SPEC.md](FRAME-SPEC.md).
