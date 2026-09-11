---
when: you are about to author a fragment and want to know what has to exist first, you are deciding HOW MANY fragments a film needs, you are writing an `html` layer by hand, or a fragment renders as a dead still and nothing says why
answers: "how to route a frame through the stage kit and ui-skills before writing markup · why the storyboard has to exist before any fragment · how many fragments a film needs and why beats, frames and fragments are three different counts · how to author a resting frame the engine can grab · what a layer actually wraps · the four ways a fragment moves · the three things the engine refuses and what to use instead · the traps that cost a render each · the defaults that make hand-written markup read as AI slop, and which of the two gates sees what"
group: look
applies-when: hasHtml
confirm: "does each html fragment move by the engine's mechanisms, not CSS animation or transition?"
---

# Writing HTML fragments, and making them move

## AGENT SUMMARY

- The stage kit ships type ROLES (`.kit-display` … `.kit-caption`), a three-level elevation ramp
  (`--kit-elev-1/2/3`), spacing and radius tokens. Use it for consistency; any CSS is also allowed for
  size, shadow, radius and spacing (docs/MISTAKES.md #621). Only `animation`/`transition`, `opacity`/
  `filter` in the layer `css` prop, and `<script>` are refused outright, for determinism.
- The STORYBOARD comes first. Sort its beat table into who-draws-what, then author only the
  fragments it asked for, against the `motion:` selectors it already named (MISTAKES #591).
- Fragment count comes from the REQUIREMENT, one per hand-drawn surface, never one per beat: a
  fragment reused across beats is the continuity plan. Beats, frames and fragments are three different
  counts; state all three in the lock sheet.
- Author the RESTING frame so the engine can grab it: one element and one role-named class per thing
  that moves separately, DOM in reading order, keyable numbers behind a `var()` with a fallback.
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

## The storyboard comes FIRST. This step does not start without one

**"Walk the beat table" below is not a figure of speech.** The beat table has to exist before you open
a fragment file, because it is the thing you sort. The decider roster in `AGENTS.md` puts storyboard at
1 and scene (the role that writes a fragment) at 3, and `make critics DECIDERS=1` refuses to brief the
roles below with `! no storyboard ... Step 1 is not optional`.

Two things break when the fragments are written first, and neither is visible afterwards:

- **The count becomes a guess.** With no beat table there is nothing to sort into the three columns
  below, so you decide how many surfaces to draw and then write a plan that agrees with you.
- **The handles become an invention.** The storyboard's `motion:` line names the CSS selectors the
  engine will animate, and `docs/CRAFT/STORYBOARD-TEMPLATE.md` says why the line exists in the field's
  own definition: "so a fragment author is told what has to move BEFORE writing the markup rather than
  inventing entrances after". Backwards, the selectors are read OFF finished markup, and they match only
  because one author wrote both halves. Hand either half to a second agent and they name nothing.

So the order is: write the beat table, run `make storyboard-check`, sort the beats, then author only the
fragments the table asked for, against the selectors it already named. Review both halves together with
`make studio SB=<file>.storyboard.md`, which serves the plan with every beat's real fragment live inside
it. `docs/MISTAKES.md` #591 is this rule being broken, with the excuse.

## How many fragments does a film need?

Not one per beat, and not one per frame. **One per hand-drawn SURFACE.** The count falls out of the
requirement once you ask the right question of each beat, and the question is not "does this beat need
a picture" but **"does this beat need a picture nothing already in the film can give it?"**

Walk the beat table and put each beat in one of three columns:

| the beat needs | who draws it | costs a fragment |
|---|---|---|
| type, a number, a mark, a real product capture | `text` · `count` · `svg` · `component` | no |
| a surface the layer vocabulary cannot draw: a code slab, a terminal, a rebuilt UI, a composed figure | **you, in HTML** | **yes, one** |
| a surface an EARLIER beat already drew, at a new size, count, angle or state | the engine, on the existing fragment | no |

The third column is the one that gets miscounted, and it is the one that carries the film. A fragment
shown once, then five times, then beside its twin is **one** fragment doing the work of three beats,
and that reuse IS the continuity plan: the viewer recognises the thing, so its multiplication means
something. Drawing a second, different picture for the multiplication beat destroys the point of the
beat. **Reuse is the design, not a saving.**

So the count is set by the requirement, exactly as you would expect. A long film with one repeating
subject can need two fragments. A short film that visits five unrelated surfaces needs five. Duration
predicts nothing.

### The three counts are different, and saying so out loud is the check

**Frames** (30 per second) · **beats** (units of story) · **fragments** (hand-written surfaces). They
are three different numbers and they are never equal. Stating all three in the lock sheet is the whole
guard, because a mismatch is invisible until someone writes it down:

```
20s film · 600 frames · 7 beats · 3 fragments
```

This was worth a bug. `harness/author/critics.mjs` set `beats: fragments.length`, so a five-beat film
that hand-wrote no HTML was described to every decider in the roster as **"0 beat(s)"**, and a
seven-beat film with three fragments was described as a three-beat film. Every brief downstream
inherited the wrong shape of the film. The counts are now derived separately and PRINTED together, and
the brief says in words when they differ, so the next reader sees a deliberate reuse instead of a gap.

### Express as much as possible HERE

Given the choice between solving something in the fragment and solving it later in the scene JSON,
**solve it in the fragment.** HTML renders instantly and previews in a browser, so a wrong decision
costs seconds; the same decision made in the JSON costs a render. Composition, hierarchy, spacing,
colour, type and the whole resting state of a frame belong here.

The line is sharp and it is the same one as everywhere else in this doc: **the fragment owns what the
frame LOOKS like, the engine owns what it DOES over time.** Push everything on the left of that line
into the fragment. Push nothing from the right of it: a fragment that tries to own its own timing is
the dead-still failure at the end of this file.

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

## Author the fragment so the engine can animate it

A fragment is not finished when it looks right standing still. It is finished when the engine has
something to GRAB. The four mechanisms above are all selectors and variables reaching into your
markup, so a fragment written without them in mind renders correctly and then moves as one flat card,
and the author concludes the medium cannot do better. It can. The markup was the problem.

Five things to do while writing the resting state, each of which makes the motion pass cheap:

- **Give every element that should move separately its own element and its own class.** `parts` is a
  CSS selector, so a line of text that must arrive on its own cannot be a `<br>` inside a paragraph. It
  needs to be `<div class="line">`. This is the single highest-value habit here, and it costs nothing
  at write time. Name classes for the ROLE (`.row`, `.line`, `.chip`, `.token`), never for the
  appearance, because the motion author selects by meaning.
- **Order the DOM in reading order.** `parts` staggers in document order, so the eye follows the source
  file. If the thing that should land LAST is written first, the stagger fights the hierarchy and the
  fix is a reorder in the fragment, not a workaround in the JSON.
- **Put every number you might key behind a CSS variable with a fallback.** `width:calc(var(--fill,0)
  * 100%)` is animatable the moment someone adds `vars`; `width:60%` is a literal that has to be
  rewritten first. A variable with a fallback costs one word and previews identically outside a scene.
- **Leave the moving parts room in the resting layout.** An element that slides 40px in needs 40px of
  space that is not already occupied, and a fragment packed edge to edge has to be re-laid-out before
  anything can enter. Compose at rest with the entrances already in mind.
- **Do not bake in the state the motion is supposed to create.** A fragment authored already-faded,
  already-offset or already-blurred fights the envelope the engine writes every frame. Author the
  RESTING state, the frame as it looks when everything has arrived, and let the engine take it away
  and bring it back.

The test, before handing a fragment on: **name out loud which selector each intended move will use.**
If a move has no selector, the fragment is not ready, and adding the element now is a one-line edit
that is a rewrite later.

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
**`make designspec-check D=<file>`** runs OUR rule table (`harness/lib/designspec-rules.mjs`) over the
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

`node harness/author/stagekit.mjs <film.json>` (`make stagekit D=<film>`) prints one `<style>` block
every scene fragment in a per-scene fan-out pastes VERBATIM (`node ... --check` asserts byte identity,
`docs/CRAFT/PER-SCENE-FANOUT.md`). It is generated from the FILM's theme, so it is not one fixed
stylesheet: 45 themes get 45 different kits, never one kit in 45 colours. Every number in it traces back
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
  box to `quality/audit.mjs` and never collides with a sibling layer underneath it.

## Beautiful, not merely correct

**Route the design decisions before you write the markup:** the stage kit first, then the reference's
grammar if there is one, then the SMALLEST useful set from `ui-skills`
(`command npx -y ui-skills categories`, one or two skills, never two builder skills on one surface),
then `make preview`, then your own eye at full size. `DESIGN.md` records which skills shaped this
repo's frames and which were refused.

## The ramps the kit offers, and why

Two things help seven frames read as one film rather than seven films. Both live in the stage kit,
available by pasting the block and naming a role; neither is required, and any literal size or shadow
a reference calls for is allowed (docs/MISTAKES.md #621).

**Type is a ROLE, never a number.** `.kit-display` · `.kit-hook` · `.kit-headline` · `.kit-body` ·
`.kit-caption` · `.kit-eyebrow` · `.kit-stat`. Before this file existed, seven frames of one film
carried eight invented sizes (236, 104, 76, 40, 34, 27, 24, 22), which is exactly the "collection of
arbitrary values" a type system exists to remove. `.kit-display` was added for the role that kept being
written as a literal: one word carrying a whole frame. Where a role needs a second voice it changes
WEIGHT, TONE or TRACKING, never size alone: the eyebrow and the caption are within 10% of each other on
purpose and are told apart by the mono face, the tracking and the uppercase.

**Elevation is a RAMP, and there are three of them.** `--kit-elev-1` a pill or a control ·
`--kit-elev-2` a card or panel, the ordinary lift · `--kit-elev-3` the one hero surface in a frame.
One level per element, never two. What makes a shadow read as DISTANCE rather than as dirt is many
small offsets at low alpha, each roughly doubling the blur before it. Two stops is a smudge.

**Three surface treatments, and picking the wrong one is the commonest tell.**

| class | what it says | when |
|---|---|---|
| `.kit-panel` | this region is PART of the ground | a grouped area, an instrument face |
| `.kit-card` | this object sits ON the ground, and has an edge | a control, a product-UI object |
| `.kit-plane` | this is a piece of a larger surface, caught mid-shot | a film frame's floating UI |

`.kit-plane` is fill plus `--kit-elev-3` plus a large radius and deliberately NO border. It exists
because every frame that wanted a reference film's floating UI reached for `.kit-card` and got a
hairline the reference does not have.

### THE LADDER: which skill answers which symptom, in order

A frame is not made good by one skill. Six of them each answer one symptom, they must be applied in
this ORDER (structure before type before colour before depth), and each one has a local check that
holds the result afterwards. Climb from the symptom you actually have; do not fetch the whole ladder.
The order is not taste: a colour decision made before the composition is settled gets thrown away, and
a premium pass on a flat layout makes an expensive-looking flat layout.

| # | the symptom | skill | what it settles | what holds it here |
|---|---|---|---|---|
| 1 | every frame reads alike, nothing leads | `pbakaus/layout` | state the spatial thesis first; one archetype per beat, never twice running | `frame-check` `archetype-repeat` |
| 2 | a bag of arbitrary sizes | `pbakaus/typeset` | roles not numbers; change weight, tone or tracking, never size alone | `frame-check` `scale-drift` (report-only, film-wide) |
| 3 | dull, monochrome, flat colour | `pbakaus/colorize` | the strongest colour OWNS a region; grounds rotate; remap tokens, never invert | contrast pairs in `make preview` |
| 4 | depth is muddy, borders generic | `mengto/beautiful-shadows` | a three-level neutral ramp, one level per element | judged by eye |
| 5 | clean but not expensive | `leonxlnx/soft-skill` | the double bezel, chips, macro whitespace, concentric radii | `impeccable` `nested-cards`, as a reason |
| 6 | too safe, no peak | `pbakaus/bolder` | commit to ONE loud moment, quiet everything around it | motion, contrast, or a camera move, judged by eye |

Two more that are not skills and outrank all six, because they decide whether the ladder is even
pointed at the right thing:

- **The reference, if there is one.** Decode it into a `### Reference devices` table and let each beat
  name what it borrows. A device from another genre is not an accent, however good the skill that
  suggested it.
- **The video values.** Everything above is web craft, and web craft is the input. Only the decorative
  NUMBERS change: opacity, border weight, scale, padding. See the table below.

**This applies to a CAPTURED surface too.** `make capture URL=… SEL=…` lifts real UI with its computed
CSS, and real UI arrives at web values by definition: 1px borders, 6% shadows, 14px labels. Wrap it in
`.kit-picture` so it keeps its own palette on any ground, then transpose its decoration up. Capturing
is the better start; it is not the finish.

### A video frame is not a web page. That is about VIEWING, not about quality

Read the heading carefully, because the wrong reading of it is expensive. It does NOT mean web design
is the wrong standard. **Web craft is the input.** The entire reason this engine renders HTML is to
inherit thirty years of it: a good page is the best-designed artefact most people will see today, and
a film made of surfaces that hold up as pages is a film that holds up. `make capture URL=… SEL=…`
exists for exactly that, lifting a REAL component with its computed CSS into an animatable layer, and
`AGENTS.md` already says to prefer capturing a real surface over inventing one. Hand-authoring a
fragment is the FALLBACK, for a surface that does not exist yet.

What is different is the VIEWING CONDITION, and only that. No scroll, no hover, no second look, no
reading time the viewer controls, a fixed viewport, 30 frames a second, and H.264 between the design
and the eye. Those conditions destroy a specific and short list of values, and nothing else:

The single reason a set of frames reads thin is almost always this: they were designed at WEB values
and rendered at 1920x1080. The vendored another engine reference states it as a table
(`~/.claude/skills/another engine-creative/references/video-composition.md`), and every number in the
stage kit is now set from it:

| | web | video |
|---|---|---|
| headlines | 32-48px | **64-120px** |
| body | 14-16px | **28-42px** |
| labels | 12px | **18-24px** |
| decorative opacity | 3-8% | **12-25%** |
| borders | 1px | **2-4px** |
| padding | 16-32px | **60-140px** |

**A 1px border at 5% and a glow at 6% are invisible once the frame is encoded.** Note what is NOT in
that table: hierarchy, restraint, rhythm, optical alignment, type pairing, the whole of composition.
Those transfer unchanged, which is the point. Transpose the decoration, keep the craft. This film's ambient
backdrop was authored at 6-9% for two rounds on the reasoning that a backdrop a viewer notices has
stopped being a backdrop, which is a true statement about a web page and a wrong one about video.

Three more from the same source, all of which this film was failing:

- **Muted is fine, flat is not.** Every frame needs one colour that pulls the eye.
- **Light canvases are the hard case.** On dark, an accent glows for free. On light you need bolder
  structure, full-saturation accent hits, and TEXTURE, or the frame reads as a blank slide. Do not
  answer that by switching to dark: make the light cinematic.
- **Three roles, not one.** Background treatment, midground content, foreground accents (dividers,
  labels, data bars, monospace metadata). A frame carrying only the middle one is the thin frame.
  Borrow the accents from the film's OWN reference, though: registration marks are a real device and
  they belong to a genre this film is not in.

### Why AI-built UI reads generic, and which of these five the repo already answers

The failure has a name: **distributional convergence.** A model predicts from statistical patterns, so
the choices that are safe everywhere and offend nobody dominate, and it reverts to them. The output is
predictable: Inter or Roboto, a purple-indigo gradient, a centred hero, three rounded cards, drop
shadows at 0.1 opacity. A coding agent narrows it further by building only what is easy to implement.
The fix is process and context, never a cleverer one-shot.

| the fix | what already does it here |
|---|---|
| **Split the creative call from the build.** Decide layout, style and motion in TEXT, then let the builder execute a choice already made | the storyboard is stage 2 and the fragment is stage 4, and `stage-gate` DENIES the fragment first (MISTAKES #591) |
| **Extract the design system before any screen.** Pull every colour, size and spacing value from the file; ask before inventing anything not in it | the stage kit ships the tokens to reuse; `frame-check`'s `scale-drift` reports, film-wide, when fragments drift onto many scales anyway |
| **Give explicit specs, not adjectives** | `archetype:` `weight:` `borrows:` are closed vocabularies; `not:` names the forbidden defaults by name |
| **Ground with tone.** No pure black or white; tint it. One dominant colour (~60%), one neutral (~30%), one sharp accent (~10%), never past three hues | `themes/vawe-film.json`: a cool `#f4f6fa` ground, one accent, one neutral. The flat white theme is what made a glass shine render as nothing |
| **Add real motion, and keep the touch light.** One memorable moment beats motion on everything | `spectacle:` and `weight: peak` name that one moment, carried by motion, contrast or a camera move |

The one this repo did NOT have is the fourth, and it is the one that was making the frames read flat:
a ground with no tonal range cannot show depth, glass or light, so every modern effect degrades to
nothing and layout is left carrying the whole film alone.

The fifth is a budget, not a licence. An ambient backdrop belongs on every beat because it is the
ground; a shine, a sweep, a spotlight belongs on ONE, and the plan already names which one.

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

Renders the fragment in a real browser with real computed styles, runs `impeccable`'s detector over
it (a vendored third-party skill, v3.5.0, Apache 2.0, `skills/impeccable/LICENSE`, and the only check
here that measures the RENDERED page rather than its source), and
writes `/tmp/preview.png`. **Read the image.** Real fonts? Real assets loaded? Spacing and hierarchy
right? Then render.

**The gate that compares the plan with the frames built from it:**

```bash
make frame-check D=formats/scene/<film>.json
```

It checks every fragment against its own beat, and it fails a size or a shadow that does not trace to
the kit. `weight: peak` names the one loud moment, carried by motion, contrast or a camera move, not a
size to measure: fast motion legitimately shows a small object for a few frames. Nothing did the kit
check before: `storyboard-check` grades the plan against itself, `critique` and `eye-trace` read the
scene after assembly, and `make preview` judges one fragment with no idea which beat it serves.

**To review the fragments AS THE FILM, and to hand a human something to approve:**

```bash
make studio D=formats/scene/<film>.json   # then press 1, or click `plan`
```

The studio's plan state: every beat's plan beside that beat's real fragment, live, on the film's
own theme, in the same wrapper `make preview` photographs. A beat with no fragment names the blueprint
that draws it. Use it instead of opening loose html files, which is the review that showed a human grey
boxes and could not answer what was in the frame (MISTAKES #592).

## Worked examples in this repo

- **`formats/scene/_vawe-teaser-word.html`**: an entire six-second film in one fragment: a plain state,
  a thermal ramp that fades in and out, and a goo morph between two words. Carries the four After
  Effects steps of the effect and their SVG equivalents in its own comments, which is the shape to copy:
  the recipe lives beside the implementation, so the next author inherits the name rather than the guess.
- **`core/generators/generators.js`, the `thermalBlur` card**: a fragment that inlines its own SVG filter, and
  says in its comments why it does that rather than referencing one on the page.
- **`formats/scene/demo-frag-*.html`**, four kit-built exemplars, one archetype and one theme each:
  [`FRAGMENT-EXEMPLARS.md`](FRAGMENT-EXEMPLARS.md) says what each one refuses.

## The one thing to remember

A fragment animated with CSS renders as a **dead still**, and the engine tells you so at boot rather
than letting you find out from the mp4. Every other way of moving it is above, and `parts` is the one
you are most likely not to have tried.
