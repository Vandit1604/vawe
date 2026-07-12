# TYPOGRAPHY — choosing and setting type

A good face does ~90% of the work; spend the effort *before* styling (Butterick). When reflecting a brand,
the face is decided for you — use the site's real font. This guide is for choosing when it's open, and for
sizing/spacing well either way. Maps to the theme's `type.{sans, serif, mono, num}` keys.

## 1. Choose the face by the signal you want
| Class | Signals | Reach for it when | Bundled here |
|---|---|---|---|
| Geometric sans | modern, rational, cool, brand-forward | logos, big headlines (tires at length) | Plus Jakarta Sans |
| Humanist sans | warm, legible, approachable | body, UI, the safe default | Hanken Grotesk, Inter* |
| Grotesque / neo-grotesque | neutral, corporate, objective | data, editorial restraint | Geist, Söhne(licensed) |
| Serif | authoritative, editorial, trustworthy | a serif pull-quote, luxury/print feel | Instrument Serif |
| Mono | technical, precise, code/data | filenames, counts, terminal, `num` | Geist Mono, JetBrains Mono |
| Handwriting | human, annotation, warmth | ONE marker note, sparingly | Caveat |

\* **Avoid Inter / Space Grotesk / Poppins for *generic* work** — they're the default on every AI/landing page,
so they read as "template". Commit to a face with a viewpoint, or the real brand font. (This is also an
`impeccable` rule — `make slop` flags overused faces.)

## 2. Pair with contrast, not conflict
- **Two faces max; one is often enough.** Differ *clearly* by class or weight (serif + sans, or black + regular),
  never slightly. Two similar sans fight.
- **Safest pairing = one superfamily**, harmony is built in: **Geist + Geist Mono** (this repo's default), or Inter + a mono.
- Typical split: **sans for headline + body, mono for data/labels/filenames, serif for one accent line.** That's
  exactly the `sans/mono/serif` split the theme contract asks for.

## 3. Size from a scale (the `size` field is free px, so impose one)
Pick a ratio, hand-pick ~5 sizes, reuse them. Don't use every step.
- **Editorial / display drama:** ratio **1.333–1.618** (perfect fourth → golden). Big hero, tiny caption.
- **Dense / dashboard:** ratio **1.2–1.25** (minor third) so sizes stay close.
- A landscape hero headline lives around **96–140px**; a supporting line **44–64px**; a caption/label **28–36px**.
  The gap between hero and caption should be *obvious* (scale contrast is the #1 hierarchy tool — see [LAYOUT.md](LAYOUT.md)).

## 4. Weight, tracking, leading
- **Hierarchy via weight + colour, not size alone** — supporting text = lighter weight or `dim`/`text2` colour,
  not merely smaller. Body never below 400.
- **Tracking is optical:** tighten large display (negative letter-spacing, ~-0.02 to -0.03em on big headings);
  open UPPERCASE and small caps; never letterspace lowercase. The engine's `trackingFor(px)` already scales this
  when `theme.type.optical` is on; otherwise set `tracking` per layer.
- **Leading:** body **1.2–1.45×**; tighter for big headlines (1.02–1.1), looser for long measure.
- **Measure (line length):** 45–75 chars, ~66 ideal — set the text layer `w` so lines don't run edge to edge.

## 5. Motion-graphics specifics
- Video type is read at a distance and over grain/compression → favour **heavier weights and generous size**;
  thin weights shimmer.
- **No em-dashes on screen** (validator-enforced) — comma, period, or ·.
- Numbers use `type.num` (mono, tabular) so counters don't jitter width. The `count`/`num` layers already do this.

**Sources:** Butterick *Practical Typography*; Refactoring UI (type system, font weight); Material 3 typography
(optical size, roles); type-scale.com (modular ratios).
