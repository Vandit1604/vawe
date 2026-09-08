---
when: you are writing an `html` layer by hand, or a fragment renders as a dead still and nothing says why
answers: "what a layer actually wraps · the four ways a fragment moves · the three things the engine refuses and what to use instead · the traps that cost a render each · the defaults that make hand-written markup read as AI slop, and which of the two gates sees what"
group: look
applies-when: hasHtml
confirm: "does each html fragment move by the engine's mechanisms, not CSS animation or transition?"
---

# Writing HTML fragments, and making them move

## AGENT SUMMARY

- An `html` layer is content, not an escape hatch: every layer effect (`filter`, `modifiers`, `depth`,
  `origin`, `timeWarp`, `motion`, `vars`, camera) applies to it exactly as it does to a `text` layer.
- Move a fragment with `--t` in `calc()`, `parts`, a `motion` track, or `vars`. Never CSS `animation`
  or `transition`: the engine refuses both at boot, because they run on a clock it does not own.
- Checkable action: does each html fragment move by the engine's mechanisms, not CSS animation or
  transition?

An `html` layer is not an escape hatch from the engine. It is the engine's **content**, and **every
layer effect works on it, which is the architecture and not a coincidence**: `filter`, `modifiers`
(tilt/plane/kick/matte/…), `depth`, `origin`, `timeWarp`, `motion`, `vars` and the camera all apply to
an `html` layer exactly as they do to a `text` one, because they are written on the LAYER ELEMENT and
the fragment is its content. Verified in one render, with all of it stacked on a single fragment at once.

So the choice is never "HTML or effects". It is **HTML for what the frame LOOKS like, and the engine
for what it DOES over time.**

## Reach for HTML when the answer is CSS

If you find yourself hunting for the prop that does what a CSS declaration already does, stop and write
the CSS. A gradient-filled word with a bloom behind it is four declarations. It took three failed
attempts through the layer vocabulary to not get it, and fifteen lines of markup to get it right first
time. The three attempts, in the order they failed: `filter` through `css` (refused, engine-owned),
`filter` as a layer prop (silently destroyed by the motion track, a real bug now fixed), and a `glow`
layer orbiting the word (the wrong idea entirely). The signal is not subtle: **if you are hunting for
the prop that does the thing CSS already does, stop and write the CSS.**

The layer vocabulary is 24 layer types and ~197 props, and it is worth having. Reach for a layer TYPE when it
does something you would otherwise hand-roll: `text` measures and fits and carries the theme's ink,
`count` counts, `component` captures a real product surface, `group` scopes a box AND a clock.

## A layer wraps TIME, not HTML

This is the sentence that makes the rest make sense. The layer owns the window (`start`, `duration`),
injects a seekable clock, and carries the per-frame tracks. That clock is the one thing your fragment
cannot supply for itself, and it is the whole reason the layer exists.

**`--t` is the scene clock, in seconds, written on your layer every frame.** Not a fraction, not a
progress value. Seconds.

## The four ways a fragment moves

Pick by what is moving. They compose freely.

### 1. `--t` in a `calc()`, for geometry you own

```html
<div style="position:absolute;bottom:12%;height:6px;background:#ff6a00;
  width:calc(var(--t,0) * 14cqw)"></div>
```

A bar that grows on the scene clock. Always give `var(--t)` a fallback, so the fragment still renders
when previewed outside a scene.

This is the most flexible and the most hand-rolled. Use it for a shape whose geometry is a formula.

### 2. `parts`, for anything with children

**The most useful feature almost nobody uses.** 8 of 164 scenes reach for it, against 62 that carry an
`html` layer, and when the paired exit was added the count was 0 of 13 block files and 6 of 161 scenes.
Two agents building the same figure both concluded "an html layer leaves as one card" and
reported it as a fact about the medium. It was a feature they had not found (`core/motion/parts.js`,
[`../MISTAKES.md`](../MISTAKES.md) #410).

`parts` is a CSS selector into your own markup. Every matched element gets an engine-driven, **seeked**
entrance with a stagger, and `out: true` gives it the paired exit:

```json
"parts": { "select": ".chip", "anim": "riseIn", "each": 0.5, "stagger": 0.12, "out": true }
```

Keys: `select · anim · each · stagger · delay · ease · out · exitDur`.

Entrances: `growUp · widen · popIn · fadeUp · riseIn · drawOn · fade · slide-left · slide-right`.

**These are their own vocabulary.** `rise` is a real name in two other slots and not here, and the
engine refuses it by name rather than resolving it to a default that would look deliberate.

The trade this makes is the good one: your markup keeps the whole CSS surface, and the CLOCK still owns
each piece.

### 3. A `motion` track, for the layer as one object

Seven keys beat one preset name. The two films this repo argues from carry hand-keyed tracks on 6 of 8
and 4 of 35 layers; the library median is 0. `make track SHAPE=pan|blast|drift|enter|exit` emits one
from a shape measured off a real film.

### 4. `vars`, for a number your own CSS reads

```json
"vars": { "--heat": [0, 1] }, "varsDur": 0.8, "varsEase": "easeOutQuint"
```

Then `calc(var(--heat) * 20px)` anywhere in your fragment. This is how every keyable value in the
engine works, including `--glow-c`, `--plane-z` and the adjustment layer's `--adjust`. **Do not invent
a second keying mechanism for your fragment.** `vars` is already the answer.

## Three refusals, and what to use instead

Each of these throws at boot, by name. None of them is arbitrary.

| refused | why | instead |
|---|---|---|
| `animation` / `transition` in your CSS (`core/type/sanitize-html.js` refuses them at boot, `core/validate/validate.mjs` refuses both by name, engine wide) | they run on a clock the renderer does not own, so a seeked frame would be wrong | `--t` in a `calc()`, `parts`, or a motion track |
| `opacity` or `filter` in `css` | the engine writes both every frame (the enter/exit envelope, and the velocity blur) | the layer's own `opacity` and `filter` props |
| a CSS value this Chrome drops | an invalid declaration is dropped silently, the rest of the rule survives, and the frame renders looking almost right | see the traps below |

The third one is the important one. **A browser drops one bad declaration and keeps going.** That is
how three of four focus brackets never moved with every check green.

## The traps, each of which cost a render

**`abs()` does not exist here.** This renderer's Chrome has no `abs()`, so `calc(abs(x))` is invalid,
the whole `filter` declaration is dropped, and the element computes `filter: none`. The frame looks
merely plain and nothing reports anything. Use `max(x, -x)`.

**Size from the CONTAINER, not the viewport.** `vw` resolves against whatever viewport the markup finds
itself in, which is the window in a live preview and something else entirely inside an exporter. Put
`container-type: size` on your root and use `cqw`. Same box in both places.

**Black means `#000000`.** Every dark preset carries a tint and samples well above zero at the corners.
A pitch-black ground is `background:#000` in your own markup, plus `"tone": "dark"` on the window,
because the engine cannot read lightness out of your CSS.

**A gradient map needs a real black to map from.** If you are remapping luminance, put the subject on
an OPAQUE plate and `mix-blend-mode: screen` to drop the plate back out. On a transparent layer the
ramp's bottom stops land where the alpha has already gone.

**Your stylesheet stops at your own layer.** A `<style>` block inside a fragment is scoped to it, so
`.chip` in one fragment cannot reach `.chip` in another. Name things for readability, not to avoid
collisions that cannot happen.

## Beat the AI slop

Hand-authored HTML regresses to the mean: centered text, Inter, blue/purple gradient, equal card grid.
Before writing any by hand, **load the relevant [`docs/CRAFT/`](README.md) guide** (how to choose
a face / palette / layout / image), then the **`taste-skill`** (state the Design Read + set VARIANCE/MOTION/
DENSITY dials, obey Anti-Default Discipline), then **`impeccable`** for craft. Skills are vendored in `skills/`.
Defaults to reach past: **asymmetry over centered · scale contrast (one huge hero + tiny caption) · a
committed non-generic face** (the real brand font when reflecting a brand; never Inter/Space Grotesk for
anything generic). Then gate it two ways, and know which one sees what.
**`make preview HTML=<frag>`** runs the vendored impeccable detector over the FRAGMENT, in a real browser
with real computed styles. That is where it works, and it is the only place it is still wired.
**`make designspec-check D=<file>`** runs OUR rule table (`scripts/lib/designspec-rules.mjs`) over the
scene: the theme colour/font lock plus the copy and effect-dose rules. Both must be clean before you render.

<!-- doc-refs-allow: make slop · this line records the target's retirement -->
> `make slop` was RETIRED in 2026-08 (`docs/MISTAKES.md` #326). It ran the 41 borrowed rules over a DOM
> dump that inlined three CSS properties (`font-family`, `color`, `background`) so every rule about a
> border, a shadow, a glow or spacing had no evidence and returned nothing. Its silence read as a pass on
> the whole library. The two counts in this paragraph are different things, and reading them as one is
> why they look contradictory: the retired gate RAN **41** rules, and **38** were then examined
> one by one for the fork (`docs/MISTAKES.md` #326). Of those 38, **6 were worth keeping**: most were
> already measured better here, four had no subject in our artifacts at all, and five would have fired on
> the engine's OWN features (the `glow` layer, the card recipe at `core/layers/doc.js:25`, the `eyebrow`
> blueprint prop, the blinds-wipe mask in `core/cuts/index.js:130` that `lib-test` asserts).

## The stage kit: a foundation, not a reset

`node scripts/author/stagekit.mjs <film.json>` (`make stagekit D=<film>`) prints one `<style>` block
every scene fragment in a per-scene fan-out pastes VERBATIM (`node ... --check` asserts byte identity,
`docs/CRAFT/PER-SCENE-FANOUT.md`). It is generated from the FILM's theme, so it is not one fixed
stylesheet: 41 themes get 41 different kits, never one kit in 41 colours. Every number in it traces back
to `resolveLook` (`core/registry/theme-contract.js`), never a literal the kit author picked:

- **Type scale**: `.kit-hook/.kit-headline/.kit-body/.kit-caption` (unchanged from before) plus
  `.kit-eyebrow` (an uppercase mono kicker) and `.kit-stat` (a tabular-numeral display size for a real
  number, `font-variant-numeric:tabular-nums` so digits don't jitter width).
- **Spacing rhythm**: `--kit-space-1` through `--kit-space-8`, an atom derived from the theme's own hook
  size (a bigger, louder brand gets a roomier rhythm; a quieter one gets tighter), calibrated so vawe's
  own hook (92px) reproduces LAYOUT.md's own house ladder (8 16 24 32 48 64 96 128) exactly. Reach for
  these in your own CSS (`padding:var(--kit-space-4)`) rather than a literal px: the kit gives you the
  atom, not a fixed set of margin utility classes, because the composition is still yours to invent.
- **The content column and a grid**: `--kit-margin` (the theme's own layout margin) and `.kit-stage`
  (a full-height column inset by it); `.kit-grid` (a 12-column grid, `--kit-gutter` wide) plus
  `.kit-col-1`.."`.kit-col-12`" for asymmetric splits (`col:"2-7"` by hand, LAYOUT.md §4). An
  **unequal** split (4/8, 7/5) is a choice you make with these; the grid itself does not impose one.
- **Two surfaces, not one**: `.kit-card` (raised: border + a light/dark-aware shadow) for one object that
  reads as ON TOP of the ground, and `.kit-panel` (fill only, `--surface-2`, no border or shadow) for a
  region that reads as PART of it. Giving every surface a border is the `Nested cards` tell the detector
  catches; `.kit-panel` is the way out. Radius (`.kit-radius-sm/md/lg`) scales with the theme's own
  ACCENT cut (`look.cuts.accent`): a near-still brand (`letterbox`) reads more rectilinear, a bouncy one
  (`punch`) reads rounder, so the corners agree with the brand's own energy instead of a fixed default.
- **A hairline**: `.kit-divider`, the structural rule LAYOUT.md §0 asks for ("rules, dividers, border
  panels… they create paths for the eye"), distinct from a card's own border.
- **A ground for a full-bleed root**: `.kit-root` (`position:absolute;inset:0`) fills itself with a
  faint tint of the theme's own `--line`, so a full-bleed fragment is never one giant transparent text
  box to `verify/audit.mjs` and never collides with a sibling layer underneath it.

## Beautiful, not merely correct

A fragment can obey every rule above and still read as a template. These are the checks that catch the
gap, each stated so it can be verified by looking rather than argued about:

- **Optical alignment, not mathematical.** Two edges that are numerically equal do not always look
  equal: a circle or an italic against a straight edge reads short by a few pixels and needs a nudge a
  ruler would call wrong. If every edge in a fragment is `left:0` against every other, check by eye, not
  by the CSS, whether they actually line up.
- **Scale contrast is a ratio, not an adjective.** "Big hero, small caption" is not a decision until it
  is a number: the kit's own hook-to-caption ratio is **~3.4:1** to **~4:1** across the library (a 92px
  hook against a 24-27px caption). A fragment where the biggest and smallest sizes sit inside 2:1 of each
  other has not made a hierarchy decision yet, whatever the copy says.
- **An equal grid reads as unconsidered because it answers a question nobody asked.** Three cards at
  `flex:1` each says "these three things matter exactly the same amount," which is a claim, not a
  layout default, and it is almost never the true claim (`formats/scene/post-postmark.scene2.html`
  before this pass: two `flex:1` cards for two typefaces with different jobs). An asymmetric split
  (`.kit-col-4`/`.kit-col-8`, `.kit-col-7`/`.kit-col-5`) forces the question to be answered: which one is
  more important, by how much.
- **A border is doing work when it separates two things that could otherwise be confused for one; it is
  a default when it wraps a surface that already reads as separate from its ground by fill alone.**
  `.kit-panel` (a fill-only surface, no border) is correct for a region that IS part of the frame's
  composition (an instrument face, a grouped section); `.kit-card` (a border and a shadow) is correct
  for the one object in the frame that has to read as sitting ON something, physically above it. Reach
  for a border reflexively and every surface looks like a form field.
- **The type scale carries hierarchy so weight doesn't have to do all of it.** `.kit-hook` and
  `.kit-body` differ in size by 2.4-2.7x already; setting the body to 700 to "make it pop" fights a
  distinction the SIZE already made and flattens the one dimension (size) a viewer reads fastest, in
  favour of one (weight) that reads slower and closer up. Reserve weight for the SECOND distinction
  inside one size (`<b>` recolours, per TYPOGRAPHY.md §0b: it never gets heavier than its own line).

Four fragments that pass every gate here and still look different from each other, plus what each one
deliberately refuses: [`FRAGMENT-EXEMPLARS.md`](FRAGMENT-EXEMPLARS.md).

## Preview before you render

```bash
make preview HTML=formats/scene/_your-fragment.html THEME=<brand>
```

Renders the fragment in a real browser with real computed styles, runs the craft detector over it, and
writes `/tmp/preview.png`. **Read the image.** Real fonts? Real assets loaded? Spacing and hierarchy
right? Then render.

## Worked examples in this repo

- **`formats/scene/_vawe-teaser-word.html`**: an entire six-second film in one fragment: a plain state,
  a thermal ramp that fades in and out, and a goo morph between two words. Carries the four After
  Effects steps of the effect and their SVG equivalents in its own comments, which is the shape to copy:
  the recipe lives beside the implementation, so the next author inherits the name rather than the guess.
- **`core/layout/generators.js`, the `thermalBlur` card**: a fragment that inlines its own SVG filter, and
  says in its comments why it does that rather than referencing one on the page.
- **`formats/scene/demo-frag-*.html`**, four kit-built exemplars, one archetype and one theme each:
  [`FRAGMENT-EXEMPLARS.md`](FRAGMENT-EXEMPLARS.md) says what each one refuses.

## The one thing to remember

A fragment animated with CSS renders as a **dead still**, and the engine tells you so at boot rather
than letting you find out from the mp4. Every other way of moving it is above, and `parts` is the one
you are most likely not to have tried.
