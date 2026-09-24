---
when: "picking a font or type face (`type.sans/serif/mono`), sizing headlines"
answers: which face signals which personality · pairing · the size scale · weight/tracking/leading
group: look
codes: off-font, weak-headline
applies-when: hasTextBeats
confirm: "which face was chosen for its personality, and does the size scale hold across beats?"
---

# TYPOGRAPHY: choosing and setting type

## AGENT SUMMARY

- Run `make brandspec URL=…` (or `make fonts-discover` with no site) BEFORE picking a face or a
  weight; never guess. Pick 1-3 faces with roles (primary/secondary/accent), pair for contrast not
  conflict, and size hero type to fill 60-80% of frame width, not a web-sized box.
- Enforced by `make audit` (`off-font`, `weak-headline`) and `make designspec-check`
  (overused-face detection).
- Checkable action: which face was chosen for its personality, and does the size scale hold across
  beats?

A good face does ~90% of the work; spend the effort *before* styling (Butterick). When reflecting a brand,
the face is decided for you, use the site's real font. This guide is for choosing when it's open, and for
sizing/spacing well either way. Maps to the theme's `type.{sans, serif, mono, num}` keys.

## 0. MEASURE first, never guess the weight/face
**You will look at the site's big headline, decide it is 800, and type 800. Don't. Run `make brandspec
URL=…` BEFORE you author the theme.** That is not a suggested first step, it is the step that makes the
rest of this file true. Creed's headline is **600**. It was authored as 800 by eye and shipped wrong
([`../MISTAKES.md`](../MISTAKES.md) #11).

`make brandspec` reads the site's real CSS + computed styles and reports the actual faces, **the weights
they're set at**, sizes, tracking, and declared `--font-*`/`--color-*` tokens. Eyedrop (`make palette`)
reads pixels: good for dominance, but it read creed's accent as the *sky-photo* blue; the CSS says
`#2563eb`. **CSS tokens beat pixels for anything declared.**

## 0a. Guardrails: you know these rules but you violate them. Stop.

Borrowed close to verbatim from the reference notes. Their sentences, our measurements. Go and read the
source before you argue with any of it.

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
  must be visible in motion at a glance."* Measured here across the 162 scene files that declare a font
  weight: of 2,142 declarations, the two commonest values are 600 and 500, and almost all of them sit
  between 400 and 800. The extremes are still a rounding error: **one declaration at 300**
  (`showcase-type.json`) and **five at 900**, across two films (`vawe-launch.json`, `_t-knobs.json`).
  Re-run the grep before repeating any of these figures.
  Thirteen `@font-face` rules in `core/tokens.css` load the full `100 900` range, so the light and black
  ends are paid for, loaded, and mostly unused.
- **Video sizes, not web sizes. You will try to use 14px. Don't.** Full-screen viewing: body 20px minimum,
  headlines 60px+, data labels 16px. **In a phone feed** (`"destination": "tiktok" | "reels" | "shorts"`)
  the video plays small inside a scrolling column, so scale up: body ≥32px, headlines ≥90px, labels ≥24px.
- **Fill the frame. Hero text: 60 to 80% of frame width. You will try to use web-sized elements. Don't.**
  Measured over the library, landscape hero ink sits at a **40.4% median** and **82.9% of sampled frames
  fall below the 60% floor** (1090 samples across 88 landscape scenes; `[data-layer="critical"]` ink width
  against frame width, sampled 14 frames per scene). That is not a house style anybody chose: it is §4's
  measure rule applied to display type, which §4 now exempts. **Portrait is already in band at a 66.4%
  median, so this is a landscape problem.**
- **Tracking tighter than web.** Their number is **-0.03em to -0.05em** on display sizes, against the
  -0.02 to -0.03 in §4 below. Video encoding compresses letter detail. Theirs is the more extreme claim
  and it is theirs, not a measurement of ours; §4 stays as written until somebody measures it here.

## 0b. The font SYSTEM, 1 to 3 faces, like the colour system
Pick a small, deliberate set of faces with roles, exactly like primary/secondary/accent colours. **Three is
the ceiling; one is often enough.** More than three fragments the piece.

| Role | Job | Theme key | creed |
|---|---|---|---|
| **primary** | headlines + most body: the brand's voice | `type.sans` | Geist |
| **secondary** | *optional*: a contrasting body/support face (only if the brand truly uses two) | `type.serif` or a 2nd sans | (same: Geist) |
| **accent** | data / code / filenames / counters / one special line | `type.mono` (or a display/serif) | Geist Mono |

Rules: pair for **contrast, not conflict** (§2); a **superfamily** (Geist + Geist Mono) is the safest 2-face
system. Numbers use `type.num` (tabular mono). Don't reach for a face without a role, if a beat doesn't need
the accent face, use the primary. `make brandspec` maps the site's real faces to these roles for you.

Emphasis (`<b>`) inside a line is **recolour only, same weight** (it inherits the layer weight, not UA bold),
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
commit. (This is also an `impeccable` rule, `make designspec-check` flags overused faces.)

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
  The gap between hero and caption should be *obvious* (scale contrast is the #1 hierarchy tool, see [LAYOUT.md](LAYOUT.md)).
- **In a per-scene fan-out, don't hand-pick this scale: `make stagekit D=<film>` already derived one
  from the film's theme** (`.kit-hook/.kit-headline/.kit-body/.kit-caption`, plus `.kit-eyebrow` for an
  uppercase kicker and `.kit-stat` for a tabular numeral display size). It holds this section's own
  ratio automatically: the hook-to-caption ratio across the shipped library sits at 3.4:1 to 4:1, inside
  the editorial/display band above. [HTML-FRAGMENTS.md](HTML-FRAGMENTS.md) explains what else the kit
  carries and why every number in it traces to the theme.

## 4. Weight, tracking, leading
- **Hierarchy via weight + colour, not size alone**: supporting text = lighter weight or `dim`/`text2` colour,
  not merely smaller. Body never below 400.
- **Tracking is optical:** tighten large display (negative letter-spacing, ~-0.02 to -0.03em on big headings);
  open UPPERCASE and small caps; never letterspace lowercase. The engine's `trackingFor(px)` already scales this
  when `theme.type.optical` is on; otherwise set `tracking` per layer. (On a `text`/`count` layer the ramp is
  applied by `microType` in `core/layers/text.js` and reaches every non-`mono`, non-`raw` layer, whether or not
  the theme sets `optical`.)
- **Light ink on a dark ground gets its gaps opened back up, automatically.** A bright letterform bleeds into
  the dark counters around it, so the same face at the same size reads heavier and tighter inverted than it
  does black-on-white. `trackingFor(px, dark)` adds a lift on top of the size ramp: nothing at 14px body,
  +0.010em by 120px hero, and it never reverses the ramp, so bigger type is still tighter type. The engine
  decides `dark` from the layer's settled ink colour, at the midpoint of the layer's own window.
  - **It is a DEFAULT.** An explicit `tracking` or `ls` on the layer wins outright and suppresses the whole
    ramp, lift included. Set one when you want a specific value and you will get exactly it.
  - **Expect to see it at hero sizes only.** At 24px the compensated and uncompensated settings are
    indistinguishable, and that is the intent. Below roughly 40px, treat this as a number that moved rather
    than a look that changed.
  - **The other two thirds of the source rule are NOT implemented, and nothing plans to be.** The full
    inverted-type correction also drops body weight (400 → 350) and opens leading (+0.05 to 0.1× line-height).
    The engine does neither. It ships the tracking third alone. Do those two by hand, per layer, when a dark
    scene needs them, and note that the weight advice fights the "body never below 400" line above: 350 is a
    correction for white-on-black only, not a floor to lower everywhere.
- **Leading:** body **1.2–1.45×**; tighter for big headlines (1.02–1.1), looser for long measure.
- **Measure (line length): 45-75 chars, ~66 ideal. BODY AND CAPTIONS ONLY. Display type is exempt.**
  Set the text layer `w` on a paragraph, a caption, a card body or any label so the lines don't run edge to
  edge. Butterick's measure protects the RETURN SWEEP: the eye has to find the start of the next line, and
  past about 75 characters it loses its place. **A line nobody returns from has no sweep to protect.**
  - **Where the exemption starts: type at 60px or larger, or any layer the engine marks
    `data-layer="critical"`, or any line short enough to read in one fixation (roughly under 12 words).**
    That is a hook, a headline, a payoff line, a stat, an end-card line. For those the governing rule is
    §0a: **fill 60-80% of frame width.**
  - **Where it still binds: anything under 60px, and anything the viewer reads line after line**, a
    paragraph, a quote body, a caption stack, a list of rows. There the measure is right and widening the
    box makes the text worse.
  - **Why this needed writing down.** Applied to display type the measure is one mechanical route to a thin
    hero: a six-word hook set to a 66-character measure lands near 45% of 1920 by construction. Measured
    over the library, landscape hero ink sits at a **40.4% median** with **82.9% of sampled frames under
    the 60% floor** (1090 samples, 88 landscape scenes). The declared boxes are close to right at a 70%
    median; the GLYPHS fill only 67.5% of them. So the fix is rarely a wider `w`. It is bigger type.
  - **The two rules never both apply to one layer, so neither excuses the other.**

## 4b. The face must actually LOAD (engine gotcha)
Referencing a face isn't enough. It must be **loaded before the first frame** or it silently falls back
to the generic sans (`font-display: block`). `boot()` loads every bundled face + whatever the theme
declares; if you add a NEW face to `tokens.css`, confirm it renders with
`document.fonts.check("800 100px '<Face>'")` in a headless boot. A "why does my headline look generic"
symptom is almost always an unloaded face, not a wrong choice. See [`../MISTAKES.md`](../MISTAKES.md) #10.

## 5. Motion-graphics specifics
- Video type is read at a distance and over grain/compression → favour **heavier weights and generous size**;
  thin weights shimmer.
- **No em-dashes on screen** (validator-enforced): comma, period, or ·.
- Numbers use `type.num` (mono, tabular) so counters don't jitter width. The `count`/`num` layers already do this.

## Provenance

**Sources:** Butterick *Practical Typography*; Refactoring UI (type system, font weight); Material 3 typography
(optical size, roles); type-scale.com (modular ratios); the reference notes and `design-picker.md`
(§0a guardrails, banned/overused face lists).
