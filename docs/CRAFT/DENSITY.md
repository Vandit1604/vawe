# Density — "produced, not generated"

The single biggest reason a beat looks *generated* (flat, web-page-like, AI) instead of *produced*
(a real motion-graphic) is **too few elements carrying too little information.** A headline + a caption
on empty space reads as a slide. A produced frame has **8–10 meaningful elements** working together:
the hero, its supporting data, and the *metadata layer* that says "a person crafted this."

This is another engine' `video-composition` doctrine, restored for Shortwave (we had it in the blueprint
version and stripped it — that's why later cuts felt sparse).

## The metadata layer (the "produced" tell)
Add a thin, quiet layer of production detail that frames the content without competing with it:

- **Registration / corner marks** — small ticks at the frame corners (a camera/print register mark).
- **Monospace readouts** — a coordinate/spec/timecode line (`x:160 y:420 · 132pt`, `01 · signal`,
  `1920×1080 · 30fps`). Dim, small, in the corners or margins.
- **Section label** — a per-beat tag (`03 · vocabulary`) so the film reads as a documented system.
- **Dimension brackets** — a measure line under a hero (`900 × 132 px`) turns a title into a spec.
- **Secondary data** — a real supporting number, a status pill, a small chart, a diff — never just the claim.

Keep it at **~15–25% opacity of attention**: present, legible, never loud. It's seasoning, not the meal.

## The rule
- **A content beat held > 3s must carry ≥ 3 sizable elements** (a hero + supporting artifact + metadata).
  Fewer than that and it's a slide, not a shot. `make critique` flags this as `thin-beat`.
- **Hero + support + metadata** is the minimum triad. The hero states, the support proves, the metadata
  frames. If a beat has only a hero, add support (a live demo, a stat, a chart) and metadata (a readout).
- **Exception:** a deliberate held *hook* or *end card* (≤ the first/last beat) may run lean for impact.

## DON'T
- A big word centered on empty space with nothing else (the slide tell).
- Decorative density — noise added just to fill. Every element must inform or frame.
- Metadata that competes (too bright, too big). If you read it before the hero, it's too loud.

## Blocks that add produced density fast
`kpiRow` · `barChart` · `diff` · `callout` · `pillRow` · `notification` — drop one in as the *support*,
and a dim mono readout as the *metadata*. See [`docs/BLOCKS.md`](../BLOCKS.md).
