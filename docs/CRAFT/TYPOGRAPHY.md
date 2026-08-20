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
**You will look at the site's big headline, decide it is 800, and type 800. Don't. Run `make brandspec
URL=…` BEFORE you author the theme.** That is not a suggested first step, it is the step that makes the
rest of this file true. Creed's headline is **600**. It was authored as 800 by eye and shipped wrong
([`../MISTAKES.md`](../MISTAKES.md) #11).

`make brandspec` reads the site's real CSS + computed styles and reports the actual faces, **the weights
they're set at**, sizes, tracking, and declared `--font-*`/`--color-*` tokens. Eyedrop (`make palette`)
reads pixels — good for dominance, but it read creed's accent as the *sky-photo* blue; the CSS says
`#2563eb`. **CSS tokens beat pixels for anything declared.**

## 0a. Guardrails: you know these rules but you violate them. Stop.

Borrowed close to verbatim from the reference system's `another engine-creative/references/typography.md`,
whose films measurably read better than ours. Their sentences, our measurements. Go and read the source
before you argue with any of it.

- **RUN `make fonts-discover` BEFORE you pick a pairing. This is not optional.** *"You will otherwise
  reach for the same 8 fonts every time. That's your training data default, not a contextual choice."*
  They keep two lists. The BANNED faces (`typography.md`): Inter, Roboto, Open Sans, Noto Sans, Arimo,
  Lato, Source Sans, PT Sans, Nunito, Poppins, Outfit, Sora, Playfair Display, Cormorant Garamond, Bodoni
  Moda, EB Garamond, Cinzel, Prata, Syne, with Syne singled out as *"the most overused 'distinctive'
  display font. It is an instant AI design tell."* And the eight a generator reaches for when asked for
  something distinctive (`design-picker.md`): Bricolage Grotesque, Instrument Serif, Fraunces, Archivo
  Black, DM Serif Display, Space Grotesk, Fredoka. **Six of those names are bundled in `core/tokens.css`:
  Inter, Bricolage Grotesque, Instrument Serif, Fraunces, Archivo and Space Grotesk.** Being bundled is
  not an argument for using one. Instrument Serif was picked here for a real film and rejected by the
  person who asked for it as *"a saturated AI-default face"* ([APPROVAL-STOPS.md](APPROVAL-STOPS.md)).
- **Reject your first instinct.** *"The first font that feels right is usually your training-data default
  for that register. If you picked it last time too, find something else."*
- **Don't pair two sans-serifs.** *"You do this constantly, one for headlines, one for body. Cross the
  boundary: serif + sans, or sans + mono."* Our own §2 already says a superfamily (Geist + Geist Mono) is
  the safest 2-face system, and that IS the crossing: sans + mono.
- **One expressive font per scene.** *"You pick two interesting fonts trying to make it 'better.' One
  performs, one recedes."*
- **Weight contrast must be extreme. You default to 400 vs 700. Video needs 300 vs 900.** *"The difference
  must be visible in motion at a glance."* Measured here across the 138 scene files that declare a font
  weight: every one of the 2,417 declarations sits between **400 and 800**, and the two commonest values
  are 500 and 600. **Zero declarations at or below 300. Zero at or above 900.** Eleven `@font-face` rules
  in `core/tokens.css` load the full `100 900` range, so the light and black ends are paid for, loaded,
  and never used.
- **Video sizes, not web sizes. You will try to use 14px. Don't.** Full-screen viewing: body 20px minimum,
  headlines 60px+, data labels 16px. **In a phone feed** (`"destination": "tiktok" | "reels" | "shorts"`)
  the video plays small inside a scrolling column, so scale up: body ≥32px, headlines ≥90px, labels ≥24px.
- **Fill the frame. Hero text: 60 to 80% of frame width. You will try to use web-sized elements. Don't.**
  Measured on our landscape films, the hero ink averages **44.7%** of frame width and **79% of frames sit
  below the 60% floor**. That is not a house style anybody chose.
- **Tracking tighter than web.** Their number is **-0.03em to -0.05em** on display sizes, against the
  -0.02 to -0.03 in §4 below. Video encoding compresses letter detail. Theirs is the more extreme claim
  and it is theirs, not a measurement of ours; §4 stays as written until somebody measures it here.

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

\* **You will reach for Inter. Or Space Grotesk, or Poppins, or whichever face the last theme you opened
used. Don't.** Those three are the default on every AI landing page, so they read as "template", and
reaching for the theme you saw most recently is recall, not a decision. Neither is a choice you made about
this brand. Reflecting a real site? The face is already decided and `make brandspec` has told you what it
is. Nothing to reflect? Pick from the table above by the SIGNAL you want, name the signal out loud, and
commit. (This is also an `impeccable` rule — `make designspec-check` flags overused faces.)

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
  **This rule and the frame-fill guardrail in §0a disagree, and the disagreement is unresolved.** Butterick's
  measure is a rule for a body PARAGRAPH; applied to a six-word hook it forces the hero box narrow, which is
  one mechanical route to the 44.7% figure above. [LAYOUT.md](LAYOUT.md) §5 repeats the same 45-75 without an
  exemption either. Until display type is exempted properly, read the measure as binding on body copy and the
  60-80% frame fill as binding on a hero line, and do not use one to excuse the other.

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
