---
when: picking a preset, a cut or a sting and you need the mechanics behind it
answers: "the stored rules of good motion: timing, physics, the gates that enforce each one"
group: process
codes: enter-and-retreat, front-loaded, linear-motion, monotone-timing, motion-monotony, profile, shared-start, stagger-total, tempo-flat, uneven-cascade, median-below-reference, sweep-static, dead-window, floor-below-reference, ambient-padding
applies-when: always
confirm: "is the motion hand-keyed with real physics, not a named preset firing once?"
---

# MOTION-CRAFT: the stored rules of great motion animation

## AGENT SUMMARY

- Vary timing per beat by intent (ambient 0.8-1.2s, thesis 0.5s, payoff 0.25-0.35s); ease out on
  entrances, ease in on exits; stagger 60-120ms in hierarchy order; settle and hold before the exit;
  one hero motion per beat.
- A beat layers primary (drives), secondary (reacts, quieter) and ambient (holds it alive) motion,
  offset by intent, never all at once; every element has a designed enter, hold and exit, or a
  `becomes` handoff, never a silent disappearance ("Layering, life and handoffs").
- Enforced by codes: `enter-and-retreat`, `front-loaded`, `linear-motion`, `monotone-timing`,
  `motion-monotony`, `profile`, `shared-start`, `stagger-total`, `tempo-flat`, `uneven-cascade`, via
  `make direct` / `motion-audit`. All warn; none block.
- Checkable action: is the motion hand-keyed with real physics, not a named preset firing once?

> **How should it FEEL, and what not to do?** See [`CRAFT/TASTE-RULES.md`](CRAFT/TASTE-RULES.md). The cause→feeling layer and the failure-modes catalog. This file is the mechanics; that one is the taste.
> **Which effect for which FEELING (intent-first), grounded in design theory?** See [`CRAFT/SELECTION.md`](CRAFT/SELECTION.md). This file is the effect→use index; that one is the intent→effect picker + the named reference profiles (linear/apple/nike/a24/…).
> **Just want the copy-paste JSON?** See [`MOTION-SNIPPETS.md`](MOTION-SNIPPETS.md). The atomic snippet index (one line per motion pattern: slug · exact JSON · tags). This file is the rules; that one applies them.
> **Is restraint the right call for THIS type, or is sustained motion the point?** See [`CRAFT/MOTION-REGISTERS.md`](CRAFT/MOTION-REGISTERS.md). Restraint (one loud moment) is correct for UI-adjacent/quiet types and backwards for kinetic-typography/hype/launch/sting types, sourced and split by `register` in `harness/author/type-spines.mjs`. Also carries the MD3 easing/duration numbers behind Rule 1's bands, the seven-device motion taxonomy, and what can and cannot be measured about motion quality.

Distilled July 2026 from motion-design craft literature and from our own shipped-film findings.
**Consult before storyboarding** (the planning skill points here). The right column says which of our
gates enforces each rule: everything else is judgment the ledger can't save you from.

> **The principles behind these rules, with sources:** see [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md),
> the direction spine (pacing · restraint · story placement), each rule traced to its book: Disney's 12
> (Thomas & Johnston, _The Illusion of Life_), Murch's Rule of Six (_In the Blink of an Eye_), Shaw
> (_Design for Motion_), Google Material Motion, McKee (_Story_), Ogilvy, Loewenstein's curiosity gap.
> This file is the mechanics; DIRECTION.md is *why*, and tags which rules `make author-check` enforces.

## The 10 rules

| # | Rule | What it means in practice | Enforced by |
|---|---|---|---|
| 1 | **Timing is a voice, not a constant** | Entry pace varies per beat with intent: ambient drifts 0.8–1.2s, payoffs snap 0.25–0.35s, thesis lines 0.5s+. Uniform 0.45s everywhere = monotone narration. | `motion-audit (ix) rhythm-monotony` + `direct: tempo-flat` warn |
| 2 | **Ease-out in, accelerate out** | Entrances decelerate (arrivals are landings); exits accelerate (departures are launches). Never linear on a visible move. Springs only where personality wants overshoot. | judgment (+ theme.motion sets the family) |
| 3 | **Hierarchy through offset** | Related elements stagger 60–120ms "one after another"; the beat's hero element moves last or largest. Motion order = reading order. | `direct: shared-start` + `uneven-cascade` warn |
| 4 | **Choreograph arrivals** | Elements sharing a beat arrive as one phrase (stagger chains via relative starts), not as independent events. Anticipation = the tiny pre-move (upbeat) before the main move. | `direct: stagger-total` warns; the rest is judgment |
| 5 | **Settle and hold** | See [`readable-hold`](RULES/readable-hold.md): the minimum a clip, card, or line of text must stay still to be read. | `motion contract (iii)` + `shimmer (viii)`, `read gate: unreadable-hold` |
| 6 | **One hero motion per beat** | One element owns the motion; everything else supports quietly. Two competing animations = zero read. | judgment |
| 7 | **Rotate layout archetypes** | Never the same archetype twice in a row (split / centered-top / full-bleed / card-over-board). | ledger flags SAME-SKELETON cross-video; per-video = storyboard rule |
| 8 | **Velocity contrast between beats** | A fast beat earns a still one; the freeze after a rush is the joke landing. Speed-ramp inside a move (`ramp`), contrast between moves. | judgment |
| 9 | **Cover the hard cut** | Background jumps (dark↔light) want a sting peaking AT the cut; same-bg scenes can whip/slide raw. | judgment (stings exist) |
| 10 | **Type moves like it reads** | Text enters in reading order (L→R, top→down), rises from its own baseline, never crosses another line's path. The motion IS part of the meaning (kinetic-type first law). | judgment |

## Layering, life and handoffs

<!-- doc-refs-allow: make choreo · being built now by another agent from the choreography plan, not yet a Makefile target -->

Rules 3, 4 and 6 above say a beat has one hero motion and everything else supports it. This section
says how a motion designer actually reaches that state, in After Effects and here: not by adding
effects until a frame feels busy, but by deciding, in order, what moves, what merely reacts, and what
never moves at all.

### How a designer decides what moves, in order

1. **The message and the hierarchy first.** Before anything is keyed, one focal point per transition
   is chosen and everything else is picked to serve it. Google's own choreography guide states this as
   the rule under the whole system: *"Maintain a clear focal point during transitions by carefully
   selecting the number and type of elements shared across the transitions."*
   (https://m1.material.io/motion/choreography.html)
2. **Boards, then an animatic.** The beats and their order are locked as still frames before anything
   moves, so a bad idea is cheap to throw away. In this engine that step is the storyboard
   (`make scaffold` → `make storyboard-check`), not the JSON.
3. **Blocking, pose to pose.** The hero motion is keyed first, at its start and end pose only: does the
   read work with nothing else moving. Only once that holds does a second layer get added.
4. **Secondary, then ambient, last.** Support is added in decreasing order of loudness, never all at
   once, and never before the primary read is proven.

### Layering: primary, secondary, ambient

Three kinds of motion can share a frame, and they are not interchangeable:

- **Primary** drives the beat. It is Rule 6's one hero motion, the thing the cut or the copy is about.
- **Secondary** reacts to the primary and stays quieter than it. Wikipedia's definition of secondary
  animation: *"a flat motion generated as a reaction to the movement of primary motion by a character,"*
  effects that "appear to be driven by the motion" rather than motion in their own right
  (https://en.wikipedia.org/wiki/Secondary_animation). Prolific Studio's framing of the same idea
  (search summary only, low confidence, not read directly) adds that secondary motion must never
  compete with the primary for the eye.
- **Ambient** keeps a held frame alive without asking to be watched: `idle: breathe/drift`,
  `driftHold`. It is the smallest of the three by design (see "Distance and duration: measured here,
  not imported" below: ambient drift is a third of the library's moves and runs nine times slower than
  a followed move).

**Timing them against each other is offset, not simultaneity.** Two or more motions sharing a beat
start at different moments, in hierarchy order, the same principle Rule 3 already states for sibling
layers. Material names a stagger interval for this: *"Begin each item's staggered entrance no more
than 20ms apart"* (same URL as above). **That number is a name for what to measure, not a threshold to
import**, exactly as "Distance and duration: measured here, not imported" already insists for
px/s: a UI guide is answering how long a person will wait for an interface, not how a shot should feel.
The same caution applies to 72Technologies' close-faster-than-open ratio below. Until the measuring
agent's work lands, the working numbers stay the ones already in this file (Rule 3's 60-120ms stagger,
the Speed dials table); the row below is the placeholder for what replaces them.

| what to measure | UI number (a name, not a threshold) | measured on the reference |
|---|---|---|
| offset between concurrent motions in one beat | Material: 20ms (https://m1.material.io/motion/choreography.html) | `<measured on example-madera by make choreo>` |
| exit duration vs entrance duration | 72Technologies: close is faster than open, "roughly a 2:3 ratio... the single highest-leverage rule in the whole system" (https://www.72technologies.com/blog/motion-ratios-ui-feel-cheap) | `<measured on example-madera by make choreo>` |

### Element life: enter, hold, exit

Every element that appears has a life, and the life is designed on purpose, the same way a beat's
motion is: an entrance, a hold, and an exit or a handoff. Rule 2 already says exits accelerate; the
point here is that the exit is its own designed move, never an afterthought left to a fade default.

An element that is simply not there in the next frame, with no exit keyed and no `becomes`, is not
"finished", it is dropped, and that is a finding, not a style. The measuring work in progress
(`make choreo`, see below) will name this at the plan level; until it lands, treat a vanished element
as a question to ask before shipping, not an assumption to make.

**`becomes` already expresses the one handoff this engine names for a continuous object.** An incoming
layer opens on the outgoing layer's final pose and animates into its own geometry, so the object is
seen to travel rather than cut. The schema default (`becomesDur: 0.42`, `easeOutCubic`) is too fast to
read as travel; [`engine-doctrine/RULES/handover-glide.md`](RULES/handover-glide.md) sets it to 0.8-1.0s at
`easeInOutCubic` instead.

### Handoffs: one element's exit leads the eye to the next element's entrance

School of Motion's six essential transitions name the vocabulary; each line below is verified against
this engine as it stands, not as it is planned to be.

- **Match cut**: *"a match cut is used to match a compositional element in one scene with that of the
  next"* (https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial). **HAVE**:
  `cuts[].style: "matchCut"` (`core/cuts/presentations.js`), both beats clipped to the same shape at
  the junction so the shape belongs to both shots.
- **Cut on action**: *"the cut on action transition, whereby you cut from one shot to another view
  while matching the first shot's action"* (same source). **[unrouted]**: the mechanism is a plain hard
  cut placed on the action frame (`cut:"none"`, `make beatsync` for on-the-beat timing), but nothing
  checks that the two shots' action frames actually line up. The alignment is still the author's eye.
- **Graphic match / shape morph**: **HAVE**: `svg` layers take `morph: { to: ... }`
  (`core/layers/svg.js`), and `filter: "goo"` morphs several elements as a metaball. Per-vertex control
  of the route is still missing (AFTER-EFFECTS-TECHNIQUES.md #21).
- **Container transform**: an element's own shape grows to become the next screen's frame.
  **[unrouted]**: no primitive reshapes one layer's box into a new layout. The nearest neighbours are
  `screenDive`/`seam:"cinematicZoom"` (push the camera into a surface) and `becomes` (swap identity at
  a point), and neither one grows a bounding box into a container.
- **Object becomes the next shot**: **HAVE**: the `becomes` field, see "Element life" above.
- **Zoom through**: **HAVE**: `seam:"cinematicZoom"` (`core/transitions/units.js`, family `zoom`), and
  the `window-dolly` recipe (`recipes/recipes.json`), a continuous push measured off three acts of
  `example-madera` with no cut across the shot.
- **Object wipe (a live scene crosses and reveals the next)**: **HAVE**: the `object-wipe` recipe
  (`recipes/recipes.json`), measured off `arc-space-swiping`: both scenes slide in lockstep on a hard
  edge with no empty ground, unlike `flow-seam`'s sequential exit-then-arrive with a gap.
- **Colour block (a panel becomes the next ground)**: **HAVE**: the `colour-wipe` recipe
  (`recipes/recipes.json`), measured off `make-it-move`'s 4-frame ground-colour change: the panel
  sweeps in and stays, it is the next ground rather than a decoration removed once the cut lands.

An audit of this engine's 26 seam shader transitions (`core/transitions/units.js`) found that a `seam`
bakes both beats into two STILL textures at build and blends the two static rasters
(`core/timeline/seams.js` header, `formats/scene/scene.js` `bakeSeams`/`drawSeams`): any motion inside
the seam window freezes at the bake, then jumps at the far side. A film with continuing motion through
a boundary needs a LIVE join recipe (`flow-seam`, `object-wipe`, `colour-wipe`, `becomes`, or a camera
move travelling through), never a seam mechanism, however close the seam's name reads to what is meant.

### Pitfalls

- **Everything moving at once.** The opposite of a clear focal point (Material's quote above): three or
  more top-level layers on one exact start read as a block, not a hierarchy. Already named here as
  `shared-start`.
- **Secondary competing with primary.** Rule 6 again: two things owning the motion is zero read, not
  double the read.
- **Uniform timing, in both directions.** Too many distinct durations reads as drift: *"the failure
  mode of unsystematized motion is not ugliness, it is drift, five modals with five durations, each
  defensible, collectively incoherent"* (Blake Crosley,
  https://blakecrosley.com/blog/motion-grammar-when-animation-earns-its-frames), which is why the Speed
  dials table above holds to three named bands rather than a free number per beat. Too few is the
  opposite failure this file already names as `tempo-flat`: one duration on everything reads as
  monotone narration, not restraint.
- **Motion with no meaning.** *"Motion is information or it is noise"* (same source). A kind of motion
  earns its place only when the storyboard can say what it is for; adding one because a frame feels
  empty is the noise this line warns against.
- **This repo's own measured pitfall: ambient padding used to pass a check.** `quality/gates/
  motion-floor.mjs` exists because the obvious way to raise a motion score is wrong: *"The obvious way
  to raise a motion score is to switch on `idle`/`breathe`/`drift` everywhere, which buys the number and
  costs the film: it is motion for the metric, not for the viewer."* The gate measures LOCAL motion for
  exactly this reason, so ambient padding cannot satisfy it.

### What checks this

- **`make choreo`** (in progress, built by another agent as this section was written): measures kinds of
  motion at once, element lives, and handoffs against `example-madera`, extending `motion-floor.mjs` and
  the scene timing reader. Not yet runnable; this doc names the doctrine ahead of the gate on purpose.
- **`quality/gates/motion-floor.mjs`**: local motion holes over time, and the `ambient-padding` finding
  above.
- **`harness/author/motion-director.mjs`**: `enter-and-retreat`, `linear-motion`, `monotone-timing`
  (see the AGENT SUMMARY and codes list at the top of this file).
- **`quality/gates/eye-trace.mjs`**: where the eye lands at a cut, Murch's rule already cited in
  [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md).

## Speed dials: the numbers, in one place

Rule 1 says timing is a voice; these are the ranges that voice speaks in. Measured against the
external consensus (Quiet UI text-reveal defaults: duration 100-2000ms, default 600; stagger 5-100ms,
default 20: https://next.quietui.org/docs/components/text-reveal), and against what actually reads on
a 30fps render.

| Dial | JSON | Fast | Default | Calm | Notes |
|---|---|---|---|---|---|
| Per-unit reveal | `each` | 0.25-0.35s | 0.5s | 0.75-1.2s | payoff / thesis / ambient (Rule 1) |
| Reveal stagger | `stagger` | 0.04s | 0.06s | 0.10-0.12s | Rule 3's 60-120ms; below 0.04 the sweep stops reading as a sweep |
| **Stagger sequence total** | `(units - 1) x stagger` | n/a | n/a | **cap 0.5s** | the per-item band above has no ceiling; 8 items at 0.10s take 0.8s. See "Arrival rhythm" |
| Cut length | `cutTiming` | `snappy`/`pop` | `smooth` | `out` | velocity contrast between beats (Rule 8) |
| **Ransom re-roll** | `ransom.cycle` | 0.5s | **1.2s** | 1.6-2.0s | see below |
| **Ransom re-roll offset** | `ransom.stagger` | 0.08s | 0.16s | 0.2s | keeps letters from flipping in unison |

**`ransom.cycle` deserves its own note, because it is the one dial that is NOT an entrance.** Everything
else here fires once and settles; a cycling ransom note changes *for the whole shot*, so the eye never
gets a rest frame. The instinct to reuse entrance timings (0.5s) is wrong, at 12 glyphs that is ~24
changes a second across the line and reads as noise, not as a note being re-pinned. **Start at 1.2s.**
Under ~0.8s it stops reading as deliberate; over ~2s it reads as broken. Scale UP with glyph count: the
more letters on screen, the more total churn per second at the same cycle.

Pair it with a slow entrance so the shot opens calm and stays calm: `preset:"blur"` with `each` 0.75 and
`stagger` 0.06 gives a left-to-right defocus sweep that resolves over ~0.7s (see ransom-internal.json).

## Distance and duration: measured here, not imported

Carbon and Material both say a move's duration should follow the ground it covers, and neither one
publishes the equation. Both send you to a generator tool
(https://v10.carbondesignsystem.com/guidelines/motion/overview/ ·
https://m1.material.io/motion/duration-easing.html). So this curve comes from our own films.

Every keyed move in the 135 gate-visible scenes, taking only the segments the engine treats as a span
rather than as one step of a traced path (`DENSE_KEY_SEC`, `core/timeline/sequence.js`): **345 moves.** Sorted
into distance buckets, the median speed barely moves.

| Distance | Moves | Median speed |
|---|---|---|
| under 50px | 176 | 72 px/s |
| 50-150px | 169 | 644 px/s |
| 150-300px | 104 | 652 px/s |
| 300-600px | 45 | 712 px/s |
| 600-1000px | 9 | 697 px/s |

**Read the table twice.** Flat speed across four buckets means duration already rises in step with
distance, and it rises linearly. Carbon's non-linear claim does not reproduce in this library. So the
working number is a speed, not a formula: **about 700 px/s for a move you want the eye to follow.** A
900px sweep at that rate takes 1.3 seconds. Halve it and you are at the top of what anyone here has
authored; quarter it and you are past all of it.

The first row is the other half of the answer. A third of every move in the library covers under 50px
and runs nine times slower. That is ambient drift, and it is deliberate. A short move is not obliged to
be a fast one.

**Four published ceilings, none of them ours.** 300ms (https://emilkowal.ski/ui/great-animations),
500ms (https://www.nngroup.com/articles/animation-duration/), 700ms (Carbon slow-02) and 1000ms
(Material 3 extra-long, https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) are all
absolute durations with no distance term. Each is set by how long a person tolerates waiting for an
interface to answer them. Nobody waits through a film, so all four are rejected here. At 700 px/s a
full 1920px sweep takes 2.7 seconds, past every one of them, and it is right.

**No gate enforces this, and the attempt is on record.** A ceiling was built at the library's 95th
percentile of 1232 px/s. Seven films sat above it. Three were rendered and read frame by frame, and the
arithmetic was wrong about all three: `creed-launch` sweeps a 2px rule across the frame at 4830 px/s to
REVEAL the UI behind it, `glass` slides an 1800px pane out at 1232 px/s and moves two percent of its own
width per frame, and `ab2-skill-tenor` tucks a 680px card into a slot at 1449 px/s while shrinking it.
All three read clean. Sizing the test against the object's own width does not save it either: creed's
bar is the smallest object of the three and fails that version hardest while being the most obviously
correct. Speed in the JSON cannot tell a travelling subject from a sweeping reveal.

So `make direct` prints your fastest keyed move and where it sits, as a note, and never as a finding.
Look at the frames.

## Arrival rhythm: four measures, and the tension between two of them

Rules 1, 3 and 4 above were judgment for a year. These four measures make them countable. All four
**warn**; none blocks. Run them with `make direct D=<file>` (also inside `TASTE=1 make author-check`).
They read the authored JSON, so they cost about a second and change no pixel.

| Finding | What it counts | Warns at | Why that number |
|---|---|---|---|
| `shared-start` | top-level layers that begin on one exact `start` | **3 or more** | two together is a pair (a card and the label on it); three is a row that arrives as a block |
| `stagger-total` | `(units - 1) x stagger` on one staggered layer | **over 0.5s** | past half a second the last unit lands in a different beat from the first |
| `uneven-cascade` | interval drift inside one cascade of like layers | **maxDrift ≥ 30% of the average**, and ≥ 40ms | 40ms is over a frame at 30fps, so below it the unevenness is not on screen |
| `tempo-flat` | slowest `enterDur` ÷ fastest, over 4 or more | **under 1.5x** | the speed dials span 0.25s to 1.2s, about 3x; 1.5x is the floor, 3x is the target |

**What each one does NOT see.** `stagger-total` skips a RATE: `preset:"type"` is a typewriter and
`preset:"wave"` is a looping phase (`core/type/type.js`), so for both the step is the effect's speed and its
total is the shot length by design. It also cannot count `parts`, which selects its children at render
time. `tempo-flat` reads only an explicit `enterDur`; a scene that leans on the engine default has one
tempo and says nothing about it, and stays silent here. `shared-start` counts top-level layers only,
because a group child inherits its parent's window and would be counted twice.

### Irregular ACROSS a beat, even WITHIN a cascade

`shared-start` wants entrances irregular. `uneven-cascade` wants them even. Both are right, because
they measure different scopes.

- **Across a beat**, between things that are not the same thing: irregular. A headline, a card and a
  chip that all begin on the same frame give the eye no order to read them in. Offset them by
  different amounts, and start the next one while the last is still settling.
- **Within one cascade**, among things that ARE the same thing: even. Six bullets, eight cards, a row
  of logos read as one sweep only if the interval holds. A cascade at 40 / 260 / 40ms reads as a stall,
  not as a rhythm.

The two can never fire on the same run, and the arithmetic says so: a shared start is an interval of
zero, and `uneven-cascade` skips any run whose average interval is zero. A cascade is also defined
narrowly on purpose: three or more sibling layers of the same `type`, `anim`, `preset`, `enterDur` and
`split`, each within 0.3s of the last, the whole run inside 1.2s. Anything looser is a running order,
not an arrival, and grading a film's running order for evenness would be wrong.

### Two element-level checks that watch the render

`make motion` adds two findings that read the rendered frames rather than the JSON, both WARN:

- **`xi:degenerate`**. An element laid out for every frame of its life that never once has both a
  width and a height. It animates with no box.
- **`xii:invisible`**. An element with a box for every frame of its life that never reaches 1%
  opacity. It animates its whole life and is never seen.

`dead-air` in `beat-check` asks whether a FRAME is empty and passes any frame that holds other content.
These ask about an ELEMENT across its whole life, which is a different question, and it is the question
that catches a layer nobody has ever seen.

## Snap: the overshoot-and-settle (what separates ours from real motion graphics)

The single most recognizable "this was directed" tell in professional motion graphics is **overshoot**:
an element moves fast, passes slightly beyond its rest point, and settles back. A curve that only
decelerates to its target (easeOutCubic) reads floaty; a curve that overshoots and settles reads alive.
This is not a new capability (the engine ships it) it just has to be USED.

- **Entrances overshoot; the default now does it for you.** The layer-level `rise`/`up` entrance uses
  `easeOutSnap` (a modest spring, bounce 0.20): the translate carries past rest and settles. `pop`/`scale`
  use `easeOutBack`. You get snap for free on any `anim:"rise"`/`"pop"` layer, reach for a flat curve
  only when you deliberately want calm.
- **Snap lands in the 0.2-0.3s band.** Default enter is now **0.30s** (was 0.45), exit **0.26s** (was 0.4).
  A move that takes half a second reads floaty; a third of a second reads confident. Stretch only with intent.
- **Overshoot on a TRANSFORM track, never on a counter.** On a `motion[]`/camera keyframe, set
  `ease:"spring"` (or `"spring-bouncy"`/`"spring-stiff"`) and the value overshoots-and-settles instead of
  gliding. Same for cut timing `pop`. This is how a card, a bar, or a camera arrives with weight.
  **A COUNTER IS NOT A PHYSICAL OBJECT AND MUST NEVER OVERSHOOT.** Overshoot is a claim about mass: a
  thing with weight passes its target and settles back. A number has no mass, and a count that springs
  flies PAST its true figure and falls back to it, so for a few frames the film shows a number that is
  not true. A film that says 1,822 contributions and paints 1,900 on the way has broken the one content
  rule this repo does not bend ("use real, accurate figures"): `core/layers/count.js` runs the value
  through whatever ease it is handed, so overshoot is never absorbed. Reach for `easeOutExpo` or
  `easeOutQuart` on a count: the deceleration IS the weight.
- **The theme owns the personality, and it now applies.** `theme.motion`
  `{easing,bounce,settle,enter,durationScale,stagger}` scales every default at render time (a punchy brand
  tightens `durationScale`/`stagger`; a calm one stretches them). It was defined-but-unwired before; it is
  live now, so set it per brand rather than hand-tuning every layer.
- **Keep it premium, not toy.** Bounce is deliberately modest (0.14-0.16). A big visible bounce on every
  word reads as a children's app. Overshoot should be felt, not counted.

## Easing, which curve, and what it FEELS like (the vocabulary, in our names)

An easing curve is the *acceleration* of a move: how it starts and stops. It is the single biggest
difference between motion that feels alive and motion that feels cheap, and it is chosen by INTENT, not
by taste. The one law under everything below: **an entrance decelerates, an exit accelerates, and a
visible position move is NEVER linear.** Linear on a moving object is the tell of amateur motion, real
things have mass, so they ease. (Linear is correct only for *continuous* motion with no start/stop: a
looping marquee, a steady rotation.)

Names below are the strings you put in `ease` / `motion.easing` / a keyframe `ease` / cut timing. All are
pure and land exactly at rest. Reach into this table by the FEELING you want, then read across.

| Feeling you want | Use | What the curve does | Where |
|---|---|---|---|
| **Default entrance: premium, calm** | `settle` | decelerate with a whisper of overshoot; glides to rest, no wobble | any layer, split-text (default) |
| **Directed entrance: visible snap** | `snap` | carries slightly PAST rest and settles back (the "this was directed" tell) | headlines, hero cards (`rise` uses it) |
| **Clean decelerate, zero overshoot** | `easeOutQuart` / `easeOutQuint` | fast in, long smooth settle, never passes the target | restrained brands, dense grids |
| **Dramatic arrival** | `easeOutExpo` | very fast then a long tail; feels weighty and cinematic | a single hero statement |
| **Anticipation / spring** | `spring` · `spring-bouncy` · `spring-stiff` | overshoots and rings to rest; bouncy = playful, stiff = no overshoot | payoffs, count/`motion[]`/camera keyframes |
| **Alive object (card/avatar/chip)** | `easeOutBack` (via `pop`/`lift`) | dips-then-launches / launches-then-settles past 1 | things that should feel physical |
| **Ambient loop: breathing, drifting** | `easeInOutSine` | gentlest curve, no hard stop at either end | pulses, glows, background drift (tiny amplitude) |
| **Mechanical / geometric** | `easeOutCirc` · `easeInCirc` | stops or starts very HARD (near-vertical at one end) | wipes, bars, technical/UI reveals |
| **Exit: launch away** | mirror of the entrance (automatic), or `rush` / `easeInCubic` | accelerates out; departures leave fast | any `out:` (the engine mirrors by default) |
| **Speed ramp inside one move** | `ramp` (slow→fast→slow) · `rush` (accel) · `brake` (decel) | remaps progress so a camera/counter reads as intentional, not a lerp | camera moves, counters, velocity contrast |
| **No travel at all: a stepped swap** | `hold` | holds the FROM value for the whole segment and jumps at the far key | a counter that ticks, a label that changes without sliding, anything cut rather than animated |
| **Rebound (ball drop)** | `easeOutBounce` | rebounds inside [0,1]; never overshoots, bounces down to rest | rare; a literal drop, a playful accent |

### The pivot can travel

`origin` is a static CSS transform-origin: it decides which point a scale or rotation grows out of, and
it is written once when the layer is built. So the pivot could never move, and nesting in a group buys
a DIFFERENT FIXED pivot rather than a moving one.

`ox`/`oy` key it, as percentages of the layer's own box:

```json
{ "motion": [{ "t": 0, "rot": 0,  "ox": 0,   "oy": 50 },
             { "t": 1, "rot": 45, "ox": 100, "oy": 50 }] }
```

A door that swings from one hinge and then the other; a panel that grows from its left edge and then
from its centre. Same rule as `w`/`h`: both endpoints of a segment state it or neither does, because a
one-sided value could only mean "hold", and that is a second reading of a track that has exactly one.
A track that never mentions them leaves `origin` alone.

### Follow-through: one property finishing after another, on the SAME layer

The tell that separates "animated" from "moved". A card that slides in and whose rotation settles a
beat after it lands reads as a physical object; the same card whose every property stops on the same
frame reads as a slide changing. Thomas and Johnston call it overlapping action, Williams calls it
successive breaking of joints, and until now the engine had no way to say it on one layer: a keyframe
is a whole POSE, so one progress value drove every property in the segment.

`motionDelay` shifts WHEN a property is read off the same track. It changes no value and no keyframe.

```json
{ "motion": [{ "t": 0, "x": -300, "scale": 0.9 }, { "t": 0.6, "x": 0, "scale": 1 }],
  "motionDelay": { "scale": 0.08, "rot": 0.12 } }
```

A number delays everything; a map delays by name, and `"*"` is the map's own default, so
`{ "*": 0.1, "x": 0 }` trails everything behind the travel. Keep the numbers small: 0.05 to 0.15
seconds is the band where it reads as weight rather than as a second, later move.

**Reach for the other one when the trailing thing is a separate layer.** `modifiers: [{ "lag": "card" }]`
makes one layer follow another's motion late and overrun its stop. Same principle, different scope, and
choosing the wrong one is how you end up hand-keying what the engine already does.

### The two things a graph editor does that this table cannot say

Both are built, both are reachable from a scene, and neither appears above, which is why the library
uses one of them twelve times in 288 motion tracks and the other **zero times in 166 films**. A
capability an author cannot find is a capability the engine does not have.

**1. A key in the MIDDLE of a move should not stop.** Every curve in the table is fitted inside one gap,
so it lands at rest at both ends. Three keys therefore read as two moves with a full stop between them.
`ease: "through"` computes the tangent at each key from its NEIGHBOURS, so the velocity entering a key
equals the velocity leaving it and the whole track reads as one travel. Reach for it whenever a track
has an interior key that is a waypoint rather than a destination: a camera passing a subject, a card
crossing the frame and continuing, a counter that changes rate without pausing. It is not an easing (it
is dispatched before `resolveEasing`, `core/timeline/sequence.js`), which is exactly why it was invisible here.

**2. A key has TWO sides, and their shape is the speed graph.** A handle carries an influence (how far
along the segment it reaches) and a speed (its slope), so `{ "t": 1.2, "x": 400, "out": "fling" }` shapes
the departure independently of the arrival. Three shapes, and the meaning is in the shape, not the name:

| Speed-graph shape | Handle | Reads as |
|---|---|---|
| **Spike, then decay** | `fling` (influence 18, speed 4) | a hit that settles. The subject is thrown and coasts |
| **Flat plateau** | `linear` | sustained, mechanical, deliberate travel. A machine, a conveyor |
| **Symmetrical hump** | `easyEase` (influence 33, speed 0) | soft and floaty, and generic BY DEFAULT: it is the same hump whatever the motion means |
| **Flat-ended hold** | `hang` (influence 75, speed 0) | arrives and sits. What a snappy swap cuts on |
| **Past the mark** | `overshoot` (influence 62, speed -0.8) | carries beyond rest and comes back |

`easyEase` is the one to be suspicious of. It is AE's default on every keyframe, and applying it
everywhere is the reason so much motion reads as competent and characterless. Choose the shape the
motion means.

**Do not force influence high on both sides of one key.** The engine accepts 0 to 100 on each handle,
and near 100 on both collapses the hump into a near-vertical spike: the object visibly skips rather than
snapping. Practitioners cap it around 90 for exactly that reason, and nothing here warns you.

### Reading the tells: good vs bad, at the easing level

| Good | Bad (and why) |
|---|---|
| Entrance on `settle`/`snap` (ease-OUT) | Entrance on `easeInOutQuad`, starts slow, so it feels sluggish and never snaps |
| A visible slide on `easeOutQuart` | A visible slide on `linear`, robotic, weightless, the amateur tell |
| Overshoot ONLY on things that then hold still | Overshoot (`snap`/`spring`) on text held for reading, it wobbles = looks like shaking |
| Modest bounce (0.14-0.20) felt once | Big bounce on every word, reads as a toy / children's app |
| Curve + duration VARIED by intent (Rule 1) | One curve + one duration on everything, monotone, no hierarchy |
| Exit accelerates away (mirror / `rush`) | Exit on the same ease-out as the entrance. The layer "arrives" while leaving, reads backwards |

**How to pick, in one line:** entrances → `settle` (calm) or `snap` (directed); exits → leave them to the
engine's mirror, or `rush` for a hard launch; ambient → `easeInOutSine`; a value that should feel physical
(bar, card, camera) → `spring`; a COUNTER → `easeOutExpo`, never a spring (see above). Everything else is a deviation you should be able to justify by intent.

> A name the registry does not know now **warns** (`resolveEasing`) instead of silently rendering
> `easeOutCubic`, so a typo'd or imagined ease (including GSAP names like `power3.out`, we don't use that
> vocabulary; the equivalent is `easeOutQuart`) fails loud instead of looking right while doing the wrong thing.

## Genre pacing tables

| Genre | Beat length | Entry pace | Cuts | Stings |
|---|---|---|---|---|
| Launch film (30–60s) | 4–7s | varied per rule 1 | 1 family + 1 accent | 2–3 total, at act breaks |
| Product walkthrough | 5–8s | calm, UI-mechanism motion only | punch/fade | 0–1 |
| Shorts (games/facts) | 2–4s | snappy throughout (genre IS fast) | whip/pop | flash on reveals |

## DO / DON'T pairs

- DO let a counter's easing be the story (speedRamp timer). DON'T animate numbers linearly.
- DO give ambient chrome `pulse`/`wave` at tiny amplitude. DON'T loop anything near text being read.
- DO use `elevation` + glow for depth. DON'T stack two shadows systems on one card.
- DO stagger board cards 60–90ms. DON'T pop a whole board at once (reads as a screenshot).
- DO end on a held frame (exitDur 0). DON'T fade the CTA (the holdLast bug class).
- DO scale travel to element size (22px for UI text, 40–70px for heroes). DON'T fling small text far.

## Cut, or transition? (the boundary between two beats)

Before reaching for a seam/sting, ask whether the beat wants a plain CUT. Grounded in School of Motion's
six essential transitions (https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial):
*"Simplicity is the ultimate sophistication"*: the hard cut is the professional default, and a transition
has to EARN its place. Map the editorial intent to the mechanism:

| Intent between two beats | Use | In the engine |
|---|---|---|
| Fast pace / on the beat / raw impact | **Hard cut** (no transition) | just adjacent beats; `cut:"none"`; `make beatsync` puts it on the beat |
| Passage of time · location change · montage | **Dissolve** | `seam:"dissolve"` / `fade` |
| Punch / launch / hide-then-reveal (matched action) | **Cut on action** | a hard cut placed ON the motion (e.g. at a click's impact frame) |
| Visual continuity: a shape/object carries over | **Match cut** | align the two beats' hero shape + `seam:"fade"`, or a `morph` when a real shape tweens |
| Element is sub-framed / diving into a screen | **Dynamic zoom** | `seam:"cinematicZoom"` / camera push into the artifact |
| Logo / icon / "awe" flourish | **Morph** | reserve it (the article calls it "the most complicated"), logos and one hero moment only |

Rules of thumb from the article, as engine doctrine:
- **Default to the hard cut.** If a transition would overcomplicate the boundary, cut. A film is mostly cuts
  with a few earned transitions, not a transition on every seam (that reads as a template, and the ledger
  flags it).
- **Cut TO the beat.** A hard cut re-times a boundary to the music, this is exactly what `make beatsync`
  automates now that beds have a real beat. On-beat cuts read directed; off-beat ones read sloppy.
- **A transition states a relationship** (time passed, place changed, this-becomes-that). If there is no
  relationship to state, the cut is the honest choice.
- **Master a few.** fade/dissolve · one momentum move (whip/push) · one zoom · a rare morph. Don't spread
  across the whole `SEAM_FX`/`SHADER_FX` menu in one film.

## Effect selection guide (when to use what)

- **Kinetic presets**: `up/down` default read · `type` terminals & timers · `decode` tech reveal
  (sparingly, hero words only) · `riseClip` editorial mastheads · `tilt/skew` sporty ·
  `elastic/bounce` playful brands only · `focus/blur` dreamy/premium · `gradient` one hero word
  max per film · `highlight/underline` emphasis mid-sentence · `shadow` poster-style statements ·
  `stretch` impact words · `wave` ambient loops only.
- **Cuts**: `fade/blur` neutral · `whip/skewWhip` momentum (same-bg only) · `punch/zoom` product
  focus · `spin` logos/badges · `collapse` terminal/data beats · `blinds` editorial reveal ·
  `letterbox/barn` cinematic openers · `riseBlur` premium slow beats · `jitter` alarm/glitch only.
- **Stings**: `flash` energy cut · `burn/leak` warm brands · `ink/dissolve` editorial ·
  `glitch/scan/pixel` tech · `streak/warp` speed · `ripple` impact · `bokeh` dreamy divider ·
  `confetti` wins/celebrations only · `grain` texture pulse · `crossWarp` a wipe with grit (organic
  brands where `wipe` is too clean; dark scenes) · `domainWarp` art/culture beats, one per film · `sdfIris`
  playful reveal (the seeded shape is the personality; dark scenes) · `vortex` dramatic pivots, "everything
  changes here" · `ridgedBurn` hotter burn for launches/records · `lens` premium product glamour (dark scenes, it is a light source) ·
  `thermal` intensity/data beats, sparingly · `whipPan` momentum cut when the layout also moves
  sideways · `chromaticSplit` impact with a tech accent (softer than `glitch`) · `dispersion`
  spectral flourish for color/light stories only · `gridPixelateWipe` a digital/retro-game or
  data-glitch cut (tint with `color` to a brand accent; the block front reads as "loading/decoding").
- **Ambient shader looks** (`shader` layer, looping): fields BEHIND content at intensity ~0.3, `flow`
  premium default · `aurora` soft/organic · `plasma` retro/energetic · `drift` calm/dreamy · `mist`
  barely-there · `matrixDecode` hacker/terminal/AI-code backdrop (`colors[0]` sets the rain hue; keep
  body copy in the darker gutters). Overlay looks ON TOP at intensity ~0.6-0.9, one per film, `vhs` lo-fi/nostalgic ·
  `crt` retro-tech/terminal · `filmGrain` texture on flat frames (keeps contrast) · `lightLeak` warm
  analog warmth over a hero · `barrel` a lens-shot feel · `heatShimmer` tension/heat/desert · `ripple`
  calm water/reflection · `kaleidoscope` a music/psychedelic flourish. Place overlays on a high track;
  they veil, they don't warp the pixels beneath. Don't stack two, and never behind small body copy.
- **Motion blur** (`"motionBlur": true` on a layer with a `motion` track): a velocity-derived streak on
  fast moves. The layer smears while travelling, snaps crisp when it settles. Reach for it on whip-ins,
  fast slides, and hard slams to sell speed and hide the discrete-frame stutter; a `0..1` number tunes
  strength (default `true` = half-shutter). Skip it on slow/ambient drifts (no streak to earn) and on
  small body text held mid-move (it dissolves). Pure in the frame → seek-safe, capped so text never melts.
- **Resample** (`"resample"` on an `image`/`paint`/`shader` layer): the layer's own pixels re-sampled
  through a shader, so unlike a `filter` it can smear, bend and quantise. One per film, on the hero
  shot. `zoomBlur` on an impact moment (ramp `amount:[0.6, 0]` so the frame rushes in and snaps sharp)
  · `dissolve` as a transition OUT of an image (`amount:[0.05, 0.95]` erodes it away on an ember front)
  · `refract` for a liquid-glass hero · `spinBlur` on a rotating badge · `bitCrush`/`macroblock` for a
  degrade/glitch beat, never as decoration. A constant `amount` is usually the wrong call: half of these
  only read as motion while they MOVE, so ramp them across the layer's window.

### Let the director pick (restraint by default)
Don't hand-scatter effects. **`make direct D=<file>`** reads the brand's motion personality (`theme.motion`)
and applies these rules per transition: cover a hard background jump with a sting · whip/punch only when the
background *doesn't* change · rotate one cut family (no archetype twice) · punchy brands snap, calm brands
dissolve. It prints a report; `WRITE=1` applies the picks → `<file>.directed.json`. This is how you kill the
"too many effects" tell: the director chooses fewer, righter effects than an author reaching for variety.

## The enforcement map (what code already guarantees)

Purity probe (determinism) · motion contract i–v (holds/settles/monotonic/counters/typing) ·
shimmer viii (no shaking text) · rhythm ix (no monotone entries) · layout audit (overlap /
safe-zone / clipping) · contrast gates (text 4.5+, images 3+, headline dominance 7+) ·
no-emdash · similarity + ledger (cross-video sameness). Everything else in this file is taste,
which is why it's written down.


## Wave-1 effect selection (colour grades · glow · captions)

Colour-grade filter presets (any layer, `filter:`, core/looks/filters.js):
- **duotone**: collapse a busy photo into two brand colours so it reads as graphic, not photographic; the bare default (ink to accent) makes any image on-brand instantly.
- **tritone**: duotone with a mid-tone, for photos that lose too much in two colours (faces, product shots).
- **gradientMap**: a full stylised grade for hero imagery that should feel art-directed, not filtered.
- **posterize**: screen-print bands for a punchy retro beat; keep levels 4-6, below 4 gets muddy.
- **sepia**: the archive-footage cue; partial (`sepia:0.6`) reads warmer, less costume-y.
- **vignette**: pull the eye to centre on full-bleed imagery; keep under 0.6 or it reads as a tunnel.

Glow presets (`type:"glow"`, `preset:`, core/layers/glow.js):
- **bloom**, energy AT a bright point: behind a logo, a lit number, a payoff word.
- **halation**: film-warm glamour on a single highlight; keep intensity low, felt not seen.
- **diffusion**: soften a busy dark region so foreground text floats; an area treatment, not a point.
- **rimLight**: edge-light a subject placed to the crescent's upper-right; gives a cutout dimension.
- **spotlight**, stage a reveal: aim the cone (angle, default from above-left) at what enters next.

Caption styles (`captionStyle:`, core/type/captions.js; word-timed, degrade to length-proportional pacing):
- **highlight**: marker-pen emphasis with a read trail; the default when the caption IS the content.
- **pillKaraoke**: the loudest, most social; fast hype cuts over busy footage, never over dense UI.
- **weightShift**: the quietest; product demos and calm brand films; needs a multi-weight face.
- **clipWipe**: lyric-video energy for one hero line; only on themes whose accent clears 4.5:1.

## Provenance

**Do not re-add:** overshoot/spring easing as a recommendation for a `count` layer. This doc endorsed
it twice; `core/layers/count.js` obeys whatever ease it is given, so an overshoot ease paints a number
that is not true for several frames ([`MISTAKES.md`](MISTAKES.md) #385). Use `easeOutExpo` /
`easeOutQuart` on a count instead, never `spring` / `easeOutBack` / `easeOutElastic`.
