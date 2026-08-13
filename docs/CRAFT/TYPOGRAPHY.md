---
when: "picking `type.sans/serif/mono`, sizing headlines"
answers: which face signals which personality · pairing · the size scale · weight/tracking/leading
group: look
---

# TYPOGRAPHY — choosing and setting type

A good face does ~90% of the work; spend the effort *before* styling (Butterick). When reflecting a brand,
the face is decided for you — use the site's real font. This guide is for choosing when it's open, and for
sizing/spacing well either way. Maps to the theme's `type.{sans, serif, mono, num}` keys.

## 0. MEASURE first — never guess the weight/face
When reflecting a brand, **run `make brandspec URL=…` before authoring the theme.** It reads the site's
real CSS + computed styles and reports the actual faces, **the weights they're set at**, sizes, tracking,
and declared `--font-*`/`--color-*` tokens. Eyeballing "big headline = 800" is how the wrong weight ships
(creed's headline is **600**, not 800). Eyedrop (`make palette`) reads pixels — good for dominance, but it
read creed's accent as the *sky-photo* blue; the CSS says `#2563eb`. **CSS tokens beat pixels for anything
declared.** See [`../MISTAKES.md`](../MISTAKES.md) #11.

## 0b. The font SYSTEM — 1 to 3 faces, like the colour system
Pick a small, deliberate set of faces with roles, exactly like primary/secondary/accent colours. **Three is
the ceiling; one is often enough.** More than three fragments the piece.

| Role | Job | Theme key | creed |
|---|---|---|---|
| **primary** | headlines + most body — the brand's voice | `type.sans` | Geist |
| **secondary** | *optional* — a contrasting body/support face (only if the brand truly uses two) | `type.serif` or a 2nd sans | (same: Geist) |
| **accent** | data / code / filenames / counters / one special line | `type.mono` (or a display/serif) | Geist Mono |

Rules: pair for **contrast, not conflict** (§2); a **superfamily** (Geist + Geist Mono) is the safest 2-face
system. Numbers use `type.num` (tabular mono). Don't reach for a face without a role — if a beat doesn't need
the accent face, use the primary. `make brandspec` maps the site's real faces to these roles for you.

Emphasis (`<b>`) inside a line is **recolour only, same weight** (it inherits the layer weight, not UA bold) —
so accent words never sit heavier than their own line. Emphasise by colour or a deliberate weight step, not an
accidental one.

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
`impeccable` rule — `make designspec-check` flags overused faces.)

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

## 4b. The face must actually LOAD (engine gotcha)
Referencing a face isn't enough — it must be **loaded before the first frame** or it silently falls back
to the generic sans (`font-display: block`). `boot()` loads every bundled face + whatever the theme
declares; if you add a NEW face to `tokens.css`, confirm it renders with
`document.fonts.check("800 100px '<Face>'")` in a headless boot. A "why does my headline look generic"
symptom is almost always an unloaded face, not a wrong choice. See [`../MISTAKES.md`](../MISTAKES.md) #10.

## 5. Motion-graphics specifics
- Video type is read at a distance and over grain/compression → favour **heavier weights and generous size**;
  thin weights shimmer.
- **No em-dashes on screen** (validator-enforced) — comma, period, or ·.
- Numbers use `type.num` (mono, tabular) so counters don't jitter width. The `count`/`num` layers already do this.

**Sources:** Butterick *Practical Typography*; Refactoring UI (type system, font weight); Material 3 typography
(optical size, roles); type-scale.com (modular ratios).
