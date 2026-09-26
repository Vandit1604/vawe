---
when: "you want to know what the motion-design literature says about a rule in this repo, or what the engine still cannot express"
answers: "the canonical sources, what could actually be read of each, the findings that survive the four-part bar, the rules the canon independently confirms, and the graph-editor gaps"
group: reference
---

# MOTION CANON: what the literature says, and what this engine cannot yet say

Research pass, 2026-09. **No engine code was written.** Everything below is either a citation with an
honest read-level, a measurement taken from this repo, or a proposal for somebody else to accept or
reject.

The bar every ADOPT item had to clear: name the principle and its source, name what the engine can
express today by file and where it stops, name the concrete change, and name how a viewer would see the
difference. Anything already stated in [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md),
[`../CRAFT/`](../CRAFT/README.md) or [`../CRAFT/AFTER-EFFECTS-TECHNIQUES.md`](../CRAFT/AFTER-EFFECTS-TECHNIQUES.md)
was thrown out, and there was a lot of it: this repo has already done most of this reading.

---

## SOURCES

Read-level is stated for every item, and it is the honest one. Where a source was reached only through
a secondary summary, that is said plainly and no sentence below leans on it alone.

| source | link | read-level |
|---|---|---|
| Emil Kowalski, `animate/SKILL.md` + `review-animations/STANDARDS.md` | https://github.com/emilkowalski/skills | **FULL TEXT** |
| Richard Williams, *The Animator's Survival Kit* (2001) | https://archive.org/stream/TheAnimatorsSurvivalKitRichardWilliams/The%20Animator's%20Survival%20Kit%20-%20Richard%20Williams_djvu.txt | SUBSTANTIVE EXCERPT (OCR prose; the timing/spacing CHARTS are diagrams and did not survive OCR) |
| Jake Bartlett, *Animation Principles for Motion Designers* | https://www.jakeinmotion.com/animation-principles-for-motion-designers | SUBSTANTIVE EXCERPT (course page) |
| Bruce Block, *The Visual Story* | https://arthurtasquin.com/blog/visualjourney1 · chapter abstract https://www.taylorfrancis.com/chapters/mono/10.4324/9781315794839-2/contrast-affinity-bruce-block | SUBSTANTIVE EXCERPT **of a secondary summary**, not of the book |
| Thomas & Johnston, *The Illusion of Life* (1981) | https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation | SUMMARY ONLY (the page marks itself as a paraphrase) |
| Walter Murch, *In the Blink of an Eye* (2001) | https://www.studiobinder.com/blog/walter-murch-rule-of-six/ | SUMMARY ONLY (secondary) |
| Eisenstein, the five methods of montage | https://media-studies.com/eisenstein-montage/ | SUMMARY ONLY |
| Austin Shaw, *Design for Motion* (2018) · Jon Krasner, *Motion Graphic Design* | publisher pages | SUMMARY ONLY, nothing quotable extracted |
| Reisz & Millar, *The Technique of Film Editing* | (PDF returned unreadable binary) | **COULD NOT ACCESS** |
| School of Motion, a canonical graph-editor article | (searched, not located) | **COULD NOT ACCESS** |
| Roy Thompson, *Grammar of the Shot* · Hitchcock/Truffaut on staging | | SUMMARY ONLY / not researched |
| Adobe, "Set speed between keyframes" (the Keyframe Velocity dialog: Speed and Influence) | https://helpx.adobe.com/after-effects/desktop/animate-in-after-effects/speed-between-keyframes/speed.html | **SNIPPET-READ ONLY**: direct fetches to helpx.adobe.com timed out three times, so this is search-result snippets, not the page |
| Adobe, "Keyframe interpolation" (linear · bezier · continuous bezier · auto bezier · hold) | https://helpx.adobe.com/after-effects/desktop/animate-in-after-effects/animation-keyframes/keyframe-interpolation.html | **SNIPPET-READ ONLY**, same reason |
| Adobe, roving keyframes ("Rove Across Time"), corroborated by provideocoalition.com and richardharrington.com | https://helpx.adobe.com/after-effects/using/speed.html | SNIPPET-READ, corroborated by two independent tutorials |

**Two negative findings worth recording, so nobody re-runs the search.**

- **There is no Kurt Lancaster motion-graphics book.** His bibliography (*DSLR Cinema*, *Cinema Raw*,
  *Basic Cinematography*, *Video Journalism for the Web*) is cinematography and documentary. Do not cite
  "Lancaster on motion graphics"; the citation would be invented.
- **Murch's percentages could not be verified against the book in this pass.** Every source that states
  51/23/10/7/5/4 is secondary, including the ones this repo already cites in
  [`../CRAFT/DIRECTION.md`](../CRAFT/DIRECTION.md). Our figures agree with the literature; the literature
  agrees with itself; nobody in this chain has opened the book. That is worth one sentence in
  DIRECTION.md and nothing more.

**The single most useful source found is not a book.** Emil Kowalski's published skill files are the
only FULL TEXT in the set, and they are the most operational: named curves as literal cubic-beziers,
duration bands per component class, a frequency gate on whether to animate at all. This repo already
cites `emilkowal.ski/ui/great-animations` in MOTION-CRAFT.md and REJECTS its 300ms ceiling for film,
which remains correct. The rejection covers the DURATION table and nothing else: the rest of that
document is about interruptible, gesture-driven UI and simply does not address film.

---

## ADOPT

Ranked by how much a viewer would notice. Three items, and I am deliberately not padding the list: the
rest of what the canon offers is already in `engine-doctrine/CRAFT/`. Two of the three are documentation, not code.

### 1. Per-property timing on the motion track (the graph-editor gap, in one sentence)

**The principle, and the source.** Follow-through and overlapping action: "parts of a thing do not move
together, the trailing part starts LATE and stops LATER" (Thomas & Johnston's fifth principle; Williams'
own version is **successive breaking of joints**, animating primary action first, then secondary, then
the loose trailing parts, rather than solving every joint at once). Bartlett states the motion-graphics
form directly: SPACING is the graph editor's distribution of keys, and it is a per-property decision.

**What the engine expresses today.** `core/timeline/sequence.js:274` `motionAt` interpolates a segment with ONE
progress value `p` and applies it to every property: `lerp(a[prop] ?? dflt, b[prop] ?? dflt, p)`
(`segmentAt`, `core/timeline/sequence.js:203`). A keyframe is therefore a **complete pose**, not a property key.
Worse for this purpose, an omitted property falls back to its IDENTITY, not to the neighbour's value
(`core/timeline/sequence.js:275`, `norm`), so you cannot key `rot` at 0.30s without restating `x` there too. That
rule is deliberate and is defended in the file: one interpretation rule, both endpoints or neither. It
also means the thing Williams describes is not expressible on one layer. Scale cannot finish three
frames after position; rotation cannot trail the travel.

**The engine has already solved this exact problem one channel-space over.** `core/tracks/vars.js:21`
gives `varsEase`, `varsDur` and `varsDelay` a PER-CHANNEL form (a map keyed by channel, with `'*'` as
the default), and its comment says why: higgsfield-recreation needed width on one curve and radius on
another, its author hand-wrote the easing as polynomials inside `calc()`, and this repo's own rule says
a workaround is a bug report (`engine-doctrine/MISTAKES.md` #357). The identical argument applies to the transform
track, and the transform track is where most motion lives.

**The concrete change.** A per-property offset on a key, not a second track: `{ "t": 0.4, "x": -200,
"rot": { "v": 8, "lag": 0.1 } }`, or the cheaper form, a layer-level `lead: { rot: 0.1, scale: 0.06 }`
that shifts named properties' sampling time. The second form is one line in `motionAt`: sample the track
at `lt - lead[prop]` for that property. It keeps the pose rule intact (every key still states every
property), stays pure in `t`, and needs no new track. It should be designed against `core/fx/lag.js`
first, which already does the between-layer version, so the two do not become two spellings of one idea.

**What a viewer would see.** The tell that separates "animated" from "moved". A card that slides in and
whose rotation settles a beat after it lands reads as a physical object; the same card whose every
property stops on the same frame reads as a slide changing. It is the single loudest difference between
the exemplar and a competent film.

**Caveat, stated honestly.** `lag` (`core/fx/lag.js`, used by 11 scenes) already covers the case where
the trailing thing is a SEPARATE layer, and that is the commonest case in graphics. This item is worth
building only if somebody hits the one-layer case in real work. It is the biggest gap; it is not
obviously the biggest win.

### 2. Name the three speed-graph SHAPES, and cap influence at 90

**The principle, and the source.** A motion designer does not choose a curve, they choose the shape of
the SPEED graph, and the shapes carry meaning. From the practitioner writeups (designkkashi.com,
mtmograph.com, snippet-read): a **spike then decay** reads as a hit that settles; a **flat plateau**
reads as sustained, mechanical, deliberate travel; a **symmetrical hump** reads as soft and floaty, and
is criticised as generic precisely because AE's Easy Ease gives every keyframe the identical hump
whatever the motion means. Adobe's own framing supports the frame: the speed graph changes no value and
no duration, it is only how you read and shape the motion. The second fact from the same pages is a
number: **influence is a percentage of the segment, and forcing it high on BOTH handles of one key
(above roughly 90) collapses the hump into a near-vertical spike and the object visibly skips.**
Practitioners cap it near 90 for that reason.

**What the engine expresses today.** All three shapes are already reachable, and the registry at
`core/motion/motion.js:226` even names them: `fling` (influence 18, speed 4) IS the spike, `linear` IS the
plateau, `easyEase` (influence 33, speed 0) IS the hump, and `hang` (influence 75, speed 0) is the
flat-ended graph a snappy swap is cut on. What is missing is that the easing table in MOTION-CRAFT.md,
which is where an author actually looks, is indexed by FEELING and contains none of them: it stops at
named curves and never mentions that a key has two sides. Nothing anywhere warns about the influence
ceiling; `resolveHandle` accepts 0 to 100 and 100 is legal on both sides.

**The concrete change.** Two rows and one sentence, both in `engine-doctrine/MOTION-CRAFT.md`: a small table
mapping the three speed-graph shapes to the handle names that produce them, and a line saying influence
above about 90 on both sides of one key reads as a skip rather than as a snap. If somebody later wants
the refusal in code it belongs in `resolveHandle` (`core/motion/motion.js:243`), which is the one place a
handle is read, but a doc line is the honest first move: no film in the library has hit it yet.

**What a viewer would see.** The difference between a film whose every move is the same soft hump and
one where the payoff spikes and the pan plateaus. It is the audible difference between one tone of
voice and several, and it is the reason `easyEase` everywhere reads as stock.

### 3. The intensity arc: plot the motion figure, do not only bound it

**The principle, and the source.** Bruce Block, *The Visual Story*: contrast in a visual component
RAISES visual intensity, affinity LOWERS it, uniformly across the seven components (space, line, shape,
tone, colour, movement, rhythm), and the film's intensity should follow the story: establish the visual
rules, escalate through the conflict, resolve against what was established. **Read-level warning: this
came from a secondary summary, not from Block's own sentences.** Nothing in `engine-doctrine/` cites Block at all
today, and this is the one canonical idea in the set that our doctrine does not already carry in some
form.

**What the engine expresses today.** `quality/gates/motion-split.mjs` samples consecutive frame pairs
across the whole film and reports how much of the motion is the GROUND and how much is the FILM, and it
runs inside `make ship`. `engine-doctrine/CRAFT/GRAMMAR.md` records a per-shot motion range for 16 reference films
("a shot in work that reads well measures 0.37 to 13.49"). Both are BOUNDS. Neither reads the SHAPE. The
nearest existing finding, `front-loaded` (`direction-floor.mjs:393` (retired)), counts where reveals
land, not how intensity moves.

**The concrete change.** A doc rule, not a gate: `motion-split` already has the per-sample series in
hand, so print it as a sparkline against the cut times and let the author read whether the film rises
into its payoff. Write it up in `engine-doctrine/CRAFT/DIRECTION.md` §2 beside "accelerate toward the climax",
which today is judgement with nothing to look at. **Do not gate it.** A film can be right and fall, and
this repo has already deleted two gates that measured a proxy for a judgement.

**What a viewer would see.** Films whose loudest frames sit in the middle feel like they end twice. A
printed curve makes that visible before the render is shown to anybody.

---

## CONFIRMS

Rules this repo wrote from one person's eye, which the literature independently supports. Nothing here
needs a change; all of it needs a citation the next author can check.

- **"Never linear on a visible move; entrances decelerate, exits accelerate"** (MOTION-CRAFT rule 2).
  Kowalski's STANDARDS.md, read in full, gives the same rule with the reason: `ease-out` for entering
  and exiting, `ease-in-out` for moving or morphing on screen, `linear` for constant motion, and never
  `ease-in` on something a person is watching for, because "it starts slow, delaying the exact moment
  the user is watching". Our own carve-out is the sharper one: linear is CORRECT for a pan, a marquee, a
  spinner (DIRECTION.md §1), which is the same claim about constant motion arriving from the other side.
- **The overshoot band.** MOTION-CRAFT keeps bounce "deliberately modest (0.14 to 0.20)" and warns that a
  big bounce on every word reads as a children's app. Kowalski: keep bounce 0.1 to 0.3, avoid bounce in
  most UI. Two independent practitioners, the same window.
- **The stagger band.** MOTION-CRAFT rule 3 says 60 to 120ms; Kowalski says 30 to 80ms for simultaneously
  entering elements. These overlap and do not agree, and the disagreement is the useful part: his is a UI
  number, ours is a film number, and film reads slower because nobody is waiting for it. Our 0.5s
  sequence-total cap (`stagger-total`) has no counterpart in his rules and is ours.
- **"One hero motion per beat"** (rule 6) is Thomas & Johnston's STAGING, whose original phrasing survives
  even the Wikipedia paraphrase: the presentation of an idea so that it is "completely and unmistakably
  clear".
- **Dense keys with linear between them** (`KEYED-MOTION.md` §1, and the `DENSE_KEY_SEC` default at
  `core/timeline/sequence.js:109`) is Williams' ONES AND TWOS argument arriving from the other end. Williams:
  animate on ones (every frame) for fast, high-impact action; the shape comes from where the drawings
  ARE. Our rule: below 0.14s a segment is not a span with a shape, it is one step of a traced path, so
  the curve is wrong and the key placement is the whole answer. Same claim, different medium.
- **"Bad inbetweens will kill the finest animation"** (Williams, quoting Natwick) is the sharpest one-line
  statement of the finding at `core/timeline/sequence.js:145`: every per-segment easing zeroes velocity at both
  ends of its own segment, so an interior keyframe is a full stop by construction, and the measured
  velocity series (1418 · 168 · 8 · 2 · 16 · 336 · 2836 px/s) is a dead stop in the middle of a travel.
  `ease: "through"` was written to fix exactly that. The literature had the complaint eighty years early.
- **`ease: "through"` is AE's Continuous Bezier, arrived at independently.** Adobe's interpolation list
  (snippet-read) has five types, and Continuous Bezier is the one whose handles stay tangent across the
  key so the velocity does not kink, with Auto Bezier computing that tangent from the neighbours. That is
  the cubic Hermite with finite-difference tangents at `core/timeline/sequence.js:220`, described in the same
  words by the comment above it. Two of AE's five are ours by default (linear below `DENSE_KEY_SEC`,
  bezier via handles), one is `through`, one (Auto Bezier) is the same code path, and only HOLD is
  missing.
- **Murch's Rule of Six** and **Eisenstein's five methods** are already cited in DIRECTION.md and
  FILM-STRUCTURE.md, and both check out against the secondary literature. Add only the honesty note above:
  the percentages are secondhand everywhere.

---

## GAPS: the graph-editor question, answered

**What a motion designer does in a graph editor**, taken from what could actually be read (Bartlett on
spacing; Williams on breaking joints and on ones-versus-twos; Kowalski on curve choice) and from the
recipe vocabulary already collected in `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md`: they shape SPACING rather
than pick a preset. Concretely, that is five distinct operations, and the engine's parity is not uniform
across them.

| the operation | engine today | verdict |
|---|---|---|
| shape one segment's acceleration by dragging two handles (influence + speed) | `easeIn`/`easeOut` per key, per side, `{influence, speed}` or a named handle (`core/motion/motion.js:163`, `handleCurve`) | **FULL PARITY**, and unused (below) |
| make velocity survive an interior key, so a three-key travel reads as one gesture | `ease: "through"`, cubic Hermite with neighbour tangents (`core/timeline/sequence.js:220`) | **FULL PARITY**, and used ZERO times |
| offset one property's keys from another's on the same layer | not expressible: one `p` per segment, every key a full pose | **NO PARITY** (ADOPT 1) |
| bend the PATH between two position keys (spatial interpolation) | not on the track. `motionPath` (GSAP, with `autoRotate`) flies a layer along an SVG path, and `alongPath` sets type on a curve | **PARALLEL MECHANISM, NOT PARITY** |
| jump a value with no interpolation (AE's HOLD interpolation type) | nothing: 41 easings and none is a step (`core/motion/motion.js` `EASINGS`) | **NO PARITY**, and trivially closable |
| give each axis its own curve (AE's Separate Dimensions) | `x` and `y` are already separate scalars on the key, but ONE `p` shapes both | **HALF**: we pay the cost and do not get the benefit (below) |
| retime a whole move without reshaping it (roving keyframes) | nothing | **NO PARITY**, and correct: roving is spatial-only |

**The measurement that matters most, and it is not about a missing feature.** Across the 166
`module: "scene"` files in `films/scene/`, containing 2838 layers:

| | count |
|---|---|
| layers carrying a `motion` track | **288 of 2838 (10.1%)** |
| tracks with **2 keys**, that is one span and one curve | **70 of 288 (24%)** |
| tracks authoring a bezier **handle** (`easeIn`/`easeOut`) | **12 of 288 (4%)**, across 5 files, two of which are `schema.json` and `_handle-probe.json` |
| tracks using `ease: "through"` | **0** |
| tracks stating `influence` as a number | **0** (only the named handles are ever used) |

Re-run: the script is four lines of `node -e` over `films/scene/*.json`; the counts above were taken
on 2026-09-02.

**So the answer to the question CLAUDE.md asks is uncomfortable.** The engine gained full AE graph-editor
parity on the two operations that matter most, and the library has used one of them twelve times and the
other never. The gap is not capability. Three quarters of authored tracks are dense-key traces (55 of 288
carry a segment under `DENSE_KEY_SEC`), which is the exemplar's register and is right for a cursor; a
quarter are a single span with a preset curve. What is missing in between is the ordinary professional
move: **three or four sparse keys, shaped by hand, with velocity carried through the middle one.** That
is what `through` is for and nobody has typed it.

Two things follow, and neither is engine code:

1. **`through` is undiscoverable.** It is not an easing (it is dispatched before `resolveEasing` ever
   sees it, `core/timeline/sequence.js:209`), so it does not appear in the easing table in MOTION-CRAFT.md, which
   is where an author looks. It appears in `KEYED-MOTION.md` and in the arcs row of the recipes table.
   One row in the MOTION-CRAFT easing table ("the value keeps its speed through an interior key") would
   cost a line and is the highest-value edit in this document.
2. **The handle vocabulary is named but not demonstrated.** `hang`, `fling`, `overshoot`, `easyEase` and
   `linear` all carry good blurbs in `core/motion/motion.js:226`. No shipped film shows what one looks like.
   A `make site X=catalog` card per handle, or one demo scene, would do more than any new feature here.

**The Separate Dimensions finding, which is the sharpest thing this pass turned up.** In After Effects,
Position is ONE property with a spatial motion path, and a designer who wants X and Y on different
curves right-clicks it and separates the dimensions, which deletes the motion path: the bezier handles
disappear from the composition viewer and each axis becomes a scalar with its own temporal
interpolation. That is a TRADE, made knowingly, and it is made often. **This engine is permanently on
the far side of that trade and gets nothing for it.** `x` and `y` are already separate scalars on a
motion key (`core/timeline/sequence.js:275`), so there is no motion path to bow, which is why arcs are hard here.
But one `p` still shapes both, so there is no independent curve per axis either. Whichever way you look
at it, the engine took the cost of separation and kept the coupling of the joined form. Closing it is
the same one-line change as ADOPT 1, since a per-property sampling offset generalises to a per-property
CURVE, and `core/tracks/vars.js:21` already shows the shape the API should take.

**One deliberate divergence worth recording so nobody "fixes" it.** Adobe's Keyframe Velocity dialog
states SPEED in the property's own units (px/sec on Position), which means a handle copied between
properties is meaningless. `core/motion/motion.js:191` writes speed as a MULTIPLE of the segment's average
velocity instead, and the algebra cancels the delta and the duration, so one handle pair is correct for
`x`, `scale` and `rot` at once. That is better than AE for a JSON authoring surface, and it is the
reason the handle spec is flat rather than a map keyed by property. It also means an AE number lifted
from a tutorial does not transfer: the influence does, the speed does not.

**Three smaller gaps, each stated so it can be dismissed cheaply:**

- **No HOLD keyframe.** The easing registry has 41 names and none of them is a step
  (`core/motion/motion.js` `EASINGS`). A value that jumps rather than travels has to be written as two keys a
  frame apart. AE has one; a stepped swap is a real motion-graphics move. Small, and obviously right if
  anybody wants it: the change is one entry that returns 0 until `t >= 1`.
- **The anchor point is not keyable.** `origin` is a static CSS `transform-origin`
  (`core/layers/util.js:402`); AE keys the anchor point, which is how a rotation's pivot travels. Rare in
  graphics, and the workaround (a `group`) exists.
- **The recipes table and DIRECTION.md disagree about arcs and squash.** `DIRECTION.md:58` says
  squash-and-stretch, arcs, straight-ahead and solid drawing "don't apply to flat type" and omits them;
  `AFTER-EFFECTS-TECHNIQUES.md` has squash SHIPPED as a modifier and arcs marked HAVE in the table and PARTLY
  in the body. Both files are read by authors and they say different things. That is a doc fix, not a
  finding.

**On arcs specifically, because the repo's own two answers conflict.** The table's claim is right about
the mechanism and oversells it: `ease: "through"` rounds a corner AT an interior key (measured in that
doc: a three-key apex turns 22 degrees where `linear` turns 66), so a polyline of keys becomes a curve.
It cannot bow a TWO-key segment, which is what AE's spatial bezier does and what the 10 to 20%
perpendicular bow in the recipes doc describes. The honest verdict for a two-key move is the body's
PARTLY, and the route is `motionPath`, which is a different mechanism with a different clock (GSAP,
`core/engine/preload.js:234`) and cannot be combined with a keyed track. Nobody should build spatial handles for
this: one file in the library uses `motionPath` at all, so the demand is not there.

---

## REJECT

- **The whole character-animation half of Williams.** Walk cycles, breakdown and passing positions,
  successive joints on a figure, straight-ahead action. These need an animator drawing, not a JSON scene.
  Only "breaking the joints" survives, and only as the abstract version already adopted above.
- **Squash and stretch as a principle** (as opposed to `core/fx/squash.js`, which is shipped and is
  velocity-driven). Volume-preserving deformation is a claim about a body with mass. A card, a chip and a
  screenshot are boards, and the recipes doc already says a board that drags reads as jelly.
- **Kowalski's duration ceilings** (100 to 500ms per component class). Already rejected in
  MOTION-CRAFT.md for the right reason: those numbers are set by how long a person tolerates waiting for
  an interface to answer them, and nobody waits through a film. Re-confirmed against the primary text
  this pass, which strengthens the rejection rather than weakening it.
- **`prefers-reduced-motion` and the hover/pointer gates.** Correct for the web, meaningless for an mp4.
- **Interruptibility, and springs chosen because they carry velocity through an interruption.** There is
  no interruption in a rendered film. Our springs are analytic and pure in `t` by design
  (`core/motion/motion.js:392`), which is the right trade here and would be the wrong one in a UI.
- **Roving keyframes.** Adobe's own constraint settles this: roving applies ONLY to spatial properties
  (Position, Anchor Point, effect points) with three or more keys, never to the first or last, and it
  works by moving a key's TIME so the speed through it stays constant. The engine has no spatial path,
  and `ease: "through"` already delivers the outcome roving is used for (velocity carried through an
  interior key) without moving anybody's key. Building it would be a second spelling.
- **Eisenstein's intellectual montage.** Collision of two unrelated shots to produce a concept. Real, and
  it needs shots of things, which a 30-second product film composed of type and captured UI does not
  have. FILM-STRUCTURE.md already carries the four montage methods that do apply.
