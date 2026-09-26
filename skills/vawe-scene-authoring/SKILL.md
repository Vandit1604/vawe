---
name: vawe-scene-authoring
description: How to author a Vawe scene (the shared films/scene/scene.html shell) and its data JSON (films/scene/<topic>.json): the renderFrame(n) purity contract, design tokens, motion primitives, the image system, and the QA loop. Use when creating or editing scene HTML/CSS, adding animations, integrating images, or fixing spacing.
codes: canvas-order-dependent, purity-forward-mismatch, purity-render-order
stage: assemble
effort: medium
---

# Authoring Vawe scenes

One self-describing JSON → one rendered Short (1080×1920, 60fps final, 30fps `--draft`). Scenes are
vanilla HTML/CSS/JS; a Go renderer (chromedp + ffmpeg) seeks to each frame and screenshots. **You
almost never edit the Go renderer.** You write data JSON (most common) or the shared
`films/scene/scene.html`.

A scene is two layers that must never blur together: **the HTML is the settled frame** (what a beat
looks like, holding still), and **the JSON is the motion** (`parts`, `motion`, `vars`, on top of that
HTML, never CSS `transition`/`animation`). Get the settled frame right first; add motion second.

## Rules, loaded before you write a layer

This skill's own first stop is [`engine-doctrine/RULES/INDEX.md`](../../engine-doctrine/RULES/INDEX.md), read it now: the contract every scene obeys
(deterministic, seek-safe, offsets not absolutes, state the canvas, one cut family, the backdrop
turns, something continuous crosses every cut). Then load only the rule files the beat you are
writing needs, from the table there: one numeric rule per file, a right-JSON recipe and a wrong-JSON
anti-pattern. This is where the specific numbers live (durations, sizes, offsets); do not guess one.

Read `<film>.design.md` before you write a size, radius, shadow or colour: it is the film's own
resolved design, laid over the theme's numbers (`make dev-tool X=design-spec D=<film>` seeds it). Reference its
`--kit-<group>-<name>` token instead of a literal.

## The one hard rule: `renderFrame(n)` is PURE in `n`

`renderFrame(n)` must produce byte-identical DOM for a given `n`, regardless of call order: the
renderer shards frames across parallel Chrome tabs. Derive everything from `n`, animate only
`transform`/`opacity`/`clip-path`/`filter`, and run `make check GATE=probe M=<format>` after any scene-logic
change. Full contract, code sample, layout scaffold and the theme's no-fallback rule:
**read `reference/purity-and-layout.md` before touching `renderFrame` or a CSS var.**

## The five things that go wrong most

1. **Impure `renderFrame`.** Something depends on call order or wall-clock time, not just `n`; breaks
   sharded/seeked rendering. Read `reference/purity-and-layout.md`.
2. **A hardcoded colour fallback** (`var(--x, #fff)`) instead of a theme token. The theme is
   guaranteed complete; a fallback masks a real missing-key bug. Same reference file.
3. **A figure animated as one block instead of by `parts`.** Reads flat, not produced.
   `engine-doctrine/MISTAKES.md #153`; primitives in `reference/motion-primitives.md`.
4. **Cards/logos with no real asset**, or emoji reached for before `make media X=assets` ran.
   `reference/html-and-images.md`.
5. **Declaring "done" unrendered.** The audit and eyeball pass catch overlap, overflow and safe-zone
   breaks that no amount of reading the JSON will show you. `reference/qa-loop.md`.

## Where to look next

| Task | Read |
|---|---|
| `renderFrame` purity, the layout scaffold, theme tokens | `reference/purity-and-layout.md` |
| Animation primitives (`interpolate`, `spring`, `track`, easings) | `reference/motion-primitives.md` |
| Hand-writing HTML without AI slop, images, `edits[]` cut lists | `reference/html-and-images.md` |
| The QA commands to run before calling a scene done | `reference/qa-loop.md` |
| Translating a GSAP idea into vawe's JSON | `engine-doctrine/CRAFT/FROM-GSAP.md` |

## Gotchas

- `scene.html` defaults every layer to `x:60,y:240`; a `cursor` `path` computed without accounting
  for that base offset clicks empty space next to the real target. `engine-doctrine/MISTAKES.md #13`.
- A nested `layout:'free'` group does not position its own children the way a top-level free group
  does; the nested one needs its own `position:relative`. `engine-doctrine/MISTAKES.md #99`.
- A figure (chart, diagram) animated at the layer level instead of via `parts` reads flatter than a
  reference pipeline; choreograph every child piece by piece, not the whole block at once.
  `engine-doctrine/MISTAKES.md #153`.
- A blur left behind by an exit can stick to frames rendered later unless the layer's resting values
  are written before the active animation applies. `engine-doctrine/MISTAKES.md #41`.
