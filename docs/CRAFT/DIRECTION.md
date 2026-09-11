---
when: it "reads amateur" though every layer renders fine
answers: "the direction spine, Disney's 12 · Murch's Rule of Six · restraint · story placement, each sourced + tagged by which gate enforces it"
group: crosscutting
codes: pace, pace-not-chosen, pace-not-kept, pacing, archetype-repeat, feature-poverty, library-top5-only, no-peak, sparse-beats, uniform-cadence, preset-monotony, never-adopted, similarity-same, similarity-close, eye-missing, eye-unresolved, eye-device-untargeted, eye-competing-focal-points, ground-flash
applies-when: always
confirm: "where is the restraint, and what does the spectacle beat earn against it?"
---

# DIRECTION: the spine that turns effects into a directed film

## AGENT SUMMARY

- Direct every beat with the spine below: ease every start/stop with intent, vary timing and rhythm, keep restraint (one motion idea per beat, effects as seasoning), and place beats hook -> build -> payoff.
- Enforced by `[gated]` direct checks (codes: `pace`, `pace-not-chosen`, `pace-not-kept`, `pacing`, plus `effect-soup`, `monotone-timing`, `dead-final-frame`, `enter-and-retreat`, `linear-motion`, `cut-families`, `continuity`) and by `[eye]` + `make judge` where no static gate can see the call.
- Checkable action: where is the restraint, and what does the spectacle beat earn against it?

The engine can do almost anything. That is the problem: with every primitive available, an author
reaches for *more* and ships "lots of effects" instead of a directed piece. This file is the missing
spine (**pacing, restraint, and story placement**) stated as principles from the craft's real
literature, each with a checkable translation into a scene JSON. It is the answer to *"why does this
read as amateur when every layer renders fine?"*

Every rule is tagged:
- **`[gated]`**: a gate catches it mechanically (named in the rule). Run `make author-check D=<file>`.
- **`[eye]`**: no static gate can see it; only `make judge` + your own eye. If your eye catches it,
  it is a FIX, never a rationalization ([`../JUDGE.md`](../JUDGE.md), [`../MISTAKES.md`](../MISTAKES.md) #15).

> This is the **Motion** and **Story-spine** doctrine from [`../TASTE.md`](../TASTE.md). The mechanics of
> *which curve / which cut* live in [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md); the copy-paste JSON in
> [`../MOTION-SNIPPETS.md`](../MOTION-SNIPPETS.md); the feeling layer in [`TASTE-RULES.md`](TASTE-RULES.md).
> This file is *why*: the principles those apply.

> **The fastest way to obey all of this: compose from [`recipes/`](../../recipes/README.md)**,
> directed motion measured off a real film, so you start from directed motion instead of a blank
> `rise`+`fade`. **The two-sided guard:** `effect-soup` (in `make direct`) is the ceiling, too much,
> undirected; the **ambition floor** (`make direction-floor`, opt-in via `TASTE=1`) is the floor, too plain,
> a slideshow. A directed video sits between them.

---

> **The accusing version of §1 and §2 lives in [`TASTE-RULES.md`](TASTE-RULES.md) § "Guardrails".** It
> names the exact defaults an author here reaches for (one ease everywhere, one duration everywhere, one
> entrance direction everywhere, everything starting at t=0, entrances slower than exits) and forbids each
> one, borrowed close to verbatim from the reference system. This file is the reasoning under those
> guardrails. Read the guardrails first; read this when you need to know why.

## 1. First principles of motion (Disney's 12, only the ones type/graphics obey)

| Principle | One line | JSON translation | Tag |
|---|---|---|---|
| **Slow in / slow out** | Nothing STARTS or STOPS instantly. | A move from rest to rest eases: entrances decelerate (ease-out), exits accelerate (ease-in). A constant rate is right where there is no rest to ease, so `ease:"linear"` is CORRECT for a pan, a scroll, a marquee, a progress ring, a spinner and an ambient drift. | `[gated]` direct: `linear-motion` (warns, never blocks) |
| **Timing** | Frame count = weight and meaning. | A title (heavy) enters slower (0.5-0.7s) than a caption (0.25-0.4s). Never one global duration. | `[gated]` direct: `monotone-timing` (warns, never blocks) |
| **Spacing** | How distance spreads across frames is the ease's texture. | Prefer overshoot/settle (`snap`, `easeOutBack`, `spring`) over flat ramps for entrances. | `[eye]` |
| **Anticipation** | A small opposite wind-up readies the eye. | Before a hero scale-up, dip ~2-4% (or nudge back ~8px) for ~4 frames. Hero moments only. | `[eye]` |
| **Follow-through / overlap** | Parts don't stop at once; they trail and stagger. | THREE mechanisms, at three scopes, and this row named only the weakest. Between SIBLINGS: stagger 60-120ms, never one frame. Between LAYERS: `modifiers:[{lag:"card"}]`, which carries the leader's offset late and overruns its stop. Within ONE layer: `motionDelay:{scale:0.08,rot:0.12}`, so scale finishes after position, which is Williams' successive breaking of joints and the thing 138 of 283 motion tracks could not say. Overshoot-and-settle on arrival (~5-10% past) is arrival, not follow-through. | `[eye]` (stagger partly in `motion-audit`) |
| **Staging** | One clear idea per shot; one focal point. | One headline-scale message per beat; everything else subordinate in size/opacity/motion. | `[eye]` + `[gated]` critique: `scattered-beat` |
| **Secondary action** | A supporting motion that never competes. | At most one quiet secondary motion per beat (bg drift, glow, cursor), lower-contrast, offset in time. | `[eye]` |
| **Exaggeration** | Push the key beat past literal so it reads at a glance. | On the payoff, push scale and hold longer than "correct"; keep the rest restrained so it reads. | `[eye]` |
| **Appeal** | Clear, charismatic, uncluttered. | Committed face, real brand colour, generous negative space, strong scale contrast. Murk/overlap kills it. | `[gated]` `make audit` + `designspec` (slop was retired in 2026-08) |

### Straight-ahead, solid drawing, squash and arcs in this engine

*Straight-ahead*, as a PROCESS, cannot exist here: `renderFrame(n)` is a pure function of the frame
number, so nothing can be discovered by drawing in order, and that purity is the engine's founding rule.
But the distinction the principle actually draws is between motion planned as POSES and motion that
emerges from a RULE, and this engine has both. Pose-to-pose is the `motion` track. Straight-ahead is
everything computed per frame from local time with no keys at all: a `shader` or `raymarch` surface, the
`effector` track (one travelling point, every child reacting to its distance), an `idle`, and any
hand-written fragment driving geometry off `var(--t)`. Reach for the second when the motion is a
behaviour rather than a path, and note that the two compose: `parts` can bring a grid in pose-to-pose and
an effector can then wash across it.

*Solid drawing* is weight, volume and consistent dimension, and the engine expresses all three: the
`depth` registry and `modifiers` (`plane`, `tilt`, `kick`) put a layer in space rather than on a plane,
`three` scenes carry real geometry with a light, and `track` keyed over time lets one thing pass BEHIND
another mid-shot. What has no form here is the draughtsmanship half: nobody is drawing a figure, so
"does the volume hold as it turns" is a question about a `three` scene, not about your linework.

*Squash-and-stretch and arcs* both apply here, per [AFTER-EFFECTS-TECHNIQUES.md](AFTER-EFFECTS-TECHNIQUES.md):

| Principle | Here | How |
|---|---|---|
| **Squash and stretch** | **shipped** | the `squash` modifier, scaling non-uniformly off the layer's own velocity with the reciprocal kept, so it deforms rather than zooming. Wrong for anything with a rigid identity: a logo that squashes is a damaged logo |
| **Arcs** | **partly** | `ease: "through"` rounds the corner AT an interior key, so a polyline of keys becomes a curve: a three-key apex turns 22 degrees where `linear` turns 66. It cannot bow a TWO-key segment, which is what AE's spatial bezier does. For that, `motionPath`, a different mechanism on a different clock that cannot combine with a keyed track |

## Directing the eye: every device names its target

A colour flash, a word-by-word reveal, a camera push, a cursor, contrast, size, a blur-to-sharp focus
pull, all of them exist for the same reason: to point the viewer's attention somewhere. Per-word colour
is not decoration on top of the words, it is how the eye is walked through a phrase to its key word.
The plan has to say where each device points, or the device is a guess wearing a decision's clothes.

- **One landing per moment.** Google's own choreography guide states the rule under this whole engine's
  motion system: *"Maintain a clear focal point during transitions by carefully selecting the number and
  type of elements shared across the transitions"* (Material, quoted in full in
  [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md#layering-life-and-handoffs)). Two devices pulling toward two
  different places in one beat is not two ideas, it is no read at all: state which pulls first.
- **The order of pulls is planned.** Cursor or motion moves before colour or size settles the eye,
  because a moving thing recruits attention before a static contrast does (the same primary-before-
  secondary ordering `MOTION-CRAFT.md`'s "Layering, life and handoffs" already states for WHAT moves;
  this is the same ordering applied to WHERE the eye is pulled).
- **Per-word colour walks the eye, it never just decorates.** A colour flash on every word with no
  destination is wallpaper; a colour flash that walks in reading order to the key word is direction. The
  test is the same one §3 already applies to a layer's motion: say out loud what the colour is FOR, in
  one clause. "It walks the eye to launch film" passes. "It's on-brand" does not.
- **Measured, not asserted.** `quality/gates/eye-trace.mjs` scores where the eye actually is at a cut
  (Murch's Rule of Six, §2 above, the 7% eye-trace term); `make choreo` reports, per beat, where the
  measured primary motion region ends against what the plan's `eye:` line said would be there. Neither
  one invents a number: both read the frame or the render, never a guess.

Storyboard grammar: a film names its whole journey once, `attention:` in the frontmatter (one sentence:
the path the eye travels across the film); a beat names its own leg, `eye: <where it starts> -> <what
pulls it, naming the device> -> <where it lands>` (`harness/lib/contract.mjs parseEyeLine`). WARN only
(`quality/gates/storyboard-check.mjs`): a beat with motion and no `eye:` line, a device named in the
beat's own fields that the `eye:` line never targets, and two devices in one `eye:` line pulling to
different landings with no stated order.

## 2. Editing & pacing, rhythm is the direction

- **The Rule of Six**. A cut serves, in priority: **emotion (51%) · story (23%) · rhythm (10%) ·
  eye-trace (7%) · screen plane (5%) · spatial continuity (4%)**. Emotion dominates; spatial logic is
  nearly worthless. → Cut/transition to serve the feeling and the beat first. When a move and the
  meaning fight, keep the meaning. `[eye]` The 7% item is now MEASURED, and only reported, see
  [`EYE-TRACE.md`](EYE-TRACE.md) and `node quality/gates/eye-trace.mjs <scene.json>`.
- **Cut on motion / the blink**: the eye accepts a cut on a movement or a natural attention-blink. →
  Change beats on an action (a word lands, a count finishes), never in a dead hold. `[eye]`
- **Rhythm variety**: uniform beat lengths deaden. → Alternate short punchy beats (0.8-1.5s) with
  longer breathing beats (2-3s); the payoff is the longest. `[gated]` direct: `pacing`, `monotone-timing`
- **The hold between moves**: motion needs stillness to read; a beat where everything moves is chaos.
  → After a layer settles, hold it still ≥0.4-0.6s before the next move. Every beat has a resting
  state where the copy is fully legible. `[eye]` (+ `make audit` reads legibility)
- **Accelerate toward the climax**: tighten cutting through the build, then release on the payoff. →
  Shorten beats through the middle; the final held frame is the release. `[gated]` direct: `dead-final-frame`

**Look at the shape, do not only feel it.** The rule above is a judgement and until now it had nothing
to look at. `node quality/gates/motion-split.mjs <scene.json>` now prints the film's energy over time as
a sparkline of the LAYERS alone, with the cuts and seams ruled under the column they land in:

```
  THE FILM'S ENERGY OVER TIME · 54 samples of the layers, the ground removed

    ▁▂▂▃▂▁▁▁▁▁▁▂▁▆▃▃▂▁▁▁▁▁▁▁▂▁▂▁█▅▂▁▁▂▁▂▁▁▆▂▂▂▁▂▁▂▁▁▂▁▂▁▁▂
                  │             │         │
    0s                                               10.8s   │ cut or seam · sting
```

The source is Bruce Block, *The Visual Story*: a film's visual intensity should establish the visual
rules, escalate through the conflict, and resolve against what was established. So read the SHAPE, not
the height. A film whose loudest frame sits in its middle ends twice, and the sample above is one:
its peak is at 5.6s of 10.8s and everything after it is quieter than the beat before. The ground is
removed on purpose, because a backdrop that churns for the whole runtime flatters the curve exactly as
much as a moving subject does.

**Nothing scores this and nothing will.** A film can be right and fall: a quiet ending is a choice, and
a threshold on this curve would manufacture a finding on every film that made it. Two gates here have
been deleted for measuring a proxy for a judgement ([`../TASTE.md`](../TASTE.md)), and the printer says
so in its own comments so the next author does not add the teeth back.

## 3. Restraint, the single biggest amateur-vs-pro tell, and it has TWO answers

**Read [`MOTION-REGISTERS.md`](MOTION-REGISTERS.md) before applying anything below.** The rules in
this section were stated as universal and are not: they are correct for the UI-adjacent / quiet
explainer register, where motion is a cost the viewer pays for legibility (NN/g, Apple's HIG), and
backwards for kinetic typography, hype/launch promos and continuous title sequences, where sustained
motion IS the content and stillness is the cost (kinetic-typography practice, beat-synced editing, the
Saul Bass / Kyle Cooper title-sequence tradition). **Both films this file argues from,
`higgsfield-recreation` and `brew-launch-act1`, sit in the second register**, so read their numbers in
§1 above as evidence for sustained motion, not as an exception to a quiet-by-default rule. Pick the
register from `harness/author/type-spines.mjs`'s `register` field (`kinetic` or `quiet`) before judging
a beat against the list below; a `kinetic`-register film with every beat moving differently is directed,
not effect soup, and a `quiet`-register film held to the same density is undirected.

- **One motion idea per beat.** A dolly, OR a colour-wave, OR a stagger, not all three. Stacking them
  is maximalism that reads as a demo reel, not a film. `[gated]` direct: `effect-soup`
- **Two properties on one layer must make ONE claim.** This is the finer cut of the rule above, and it
  is about a single element rather than a beat. *"A confirmation that slides up AND fades in reads as one
  idea: this is arriving. A sheet that rises AND rotates makes two unrelated claims about one object."*
  Rise plus fade is arriving. Rise plus rotate is arriving and also tumbling, which is two things the
  viewer has to reconcile about one object, and the reconciling is what reads as amateur.
  The test is a sentence: say out loud what the layer is doing, in one clause. If the clause needs an
  "and" joining two unrelated verbs, drop one. `slide-up` + `fade` passes. `slide-up` + `spin` does not.
  **No gate can hold this** and none should try: whether two properties say the same thing is a semantic
  judgement, and a gate that guessed would manufacture findings on every deliberate exception. It is
  yours, and it costs one sentence to check.
  Borrowed from a reference system whose films measurably read better than ours (`../MISTAKES.md`).
- **Effects are seasoning, not wallpaper.** 2-3 earned moments across a film, not a texture on every
  beat. Content/proof beats stay clean so the content reads. `[gated]` direct: `effect-soup`
- **One cut family per film.** Rotate *within* a family (soft/motion/shape/spatial); mixing families
  announces edits. `[gated]` direct: `cut-families` (≥3 = FAIL)
- **Continuity over slideshow.** Something should carry across a cut so the beats connect instead of
  clicking past. A layer spanning the boundary is one way; a match cut, a motif, a held cut rate or an
  unfinished sentence are others, and none of them is a lesser answer ([`FILM-STRUCTURE.md`](FILM-STRUCTURE.md)).
  `[gated]` direct: `continuity`, which sees only the first kind.
- **Paired directional exits.** A layer that enters from a side exits the *opposite* side, one
  continuous direction of travel. Enter-and-retreat (in from right, out to right) is the tell.
  `[gated]` direct: `enter-and-retreat`
- **Blur out when moving would fight the content.** Faces, cards, dense grids leave through focus
  (`out:"defocus"`), not through space; sliding 50 elements is chaos. `[eye]`

## 4. Story placement, the beats, in the right order

The applied spine lives in [`STORY.md`](STORY.md); §"Provenance" below carries its sources and laws.

- **Hook → build → payoff.** Every film is setup, escalation, release. Beat 1 poses; the middle
  escalates; the last beat pays off. `[eye]`
- **Open loop / curiosity gap.** An unanswered question holds attention. The hook withholds the
  number/answer; it lands only at the end. `[eye]`
- **Never spoil the payoff.** The most counterintuitive fact/number is the LAST beat; nothing earlier
  states it. `[eye]`
- **Front-load the strong element.** The first ~3s decide whether they stay. First frame ≤ ~12 words,
  strongest word first, ≤1 emoji. `[gated]` validate (hook length) + `[eye]`
- **Build to a shocker.** Order the middle by increasing surprise; the "no way" moment is final. `[eye]`
- **Tension and release.** The payoff gets the longest hold and biggest scale, the release the build
  earned. `[gated]` direct: `dead-final-frame` + `[eye]`
- **Honesty / earned attention.** On-screen copy must be literally true; the hook's promise must be
  paid. Real, accurate numbers only. `[gated]` critique: `unbacked-claim`/`false-claim` + `[eye]`

## 5. The pro-vs-amateur checklist (run this before shipping)

Each is concrete. `[gated]` ones are in `make author-check`; `[eye]` ones are yours + `make judge`.

1. **A move that starts and stops eases at both ends.** A move with no rest to ease (a pan, a scroll, a spinner, a drift) runs at a constant rate on purpose, and curving it is the defect. The gate reads the whole RUN, not the key: entered or left in motion, or spaced so the keys already decelerate, and it stays quiet. `[gated]` `linear-motion`
2. **No uniform tempo.** Durations and stagger vary with intent. `[gated]` `monotone-timing`, `pacing`
3. **Overshoot-and-settle in ~0.2-0.3s on entrances.** Flat ease-out reads as a stock template. `[eye]`
4. **One hero + one tiny caption** (scale contrast ~5-8x), not three medium lines. `[eye]`
5. **Hold on the payoff**: the final reveal gets the longest still hold. `[gated]` `dead-final-frame`
6. **Enter and exit in one continuous direction.** `[gated]` `enter-and-retreat`
7. **A resting state exists**, not everything moves at once; the copy is still long enough to read. `[eye]`
8. **Exits accelerate, entrances decelerate.** (The engine bakes this into the clip driver; don't fight it.) `[gated]` `linear-motion`
8a. **A constant rate is a decision, not a lapse.** `linear` is 41% of the eases in this library because the pan, the scroll and the progress ring are all constant by nature. Say which one yours is, then leave it flat.
9. **Blur/defocus out** when sliding would fight faces/cards/grids. `[eye]`
10. **One motion idea per beat**: effects are 2-3 earned moments. `[gated]` `effect-soup`

---

## Reading `make direct`: every finding carries a census

Twelve checks run in `harness/author/motion-director.mjs` and eleven of them warn. Across the 135
gate-visible scenes, 104 trip at least one. That is 77% of the library meeting the same wall of prose,
film after film, and a warning nobody reads is a rule that has already been repealed with nobody
writing it down.

The rules did not change. What each finding now carries is two numbers.

```
~ [effect-soup] an effect on 10/13 beats ...
    library: 6 of 135 films trip this. On its measure: yours an effect on 77% of beats,
    the median of 134 films an effect on 0% of beats, and 4 films sit further out than yours.
```

The first number puts the RULE on trial. A code six films trip is a rule with teeth; a code fifty-two
films trip is a rule the library has quietly voted on, and `waiver-drift.mjs` makes exactly this
argument about waivers. The second number puts the FILM on a scale. An author told their tempo spread
is 1.17x against a median of 1.91x, with five films flatter, knows what to do with the finding. An
author told "uniform tempo reads as monotone" for the hundredth time does not.

**Findings print most unusual first.** The order used to be whichever check happened to run first, so a
code half the library trips could sit above the one finding worth acting on. The sort key is how far out
this film is on that rule's own measure, or, for a rule with no scale, how few films trip it. Ties break
on the code name, so two runs print the same report.

### The census sets no target, and that is the point

A census that became a target would push every film toward one rhythm, which is a worse library and not
a better one. Three things keep it from doing that.

- **It only annotates findings that already fired.** It cannot create one and it cannot clear one. Every
  threshold sits exactly where it sat. A film that trips nothing is told nothing, so a clean film feels
  no pull toward the median.
- **It reports a position, never an aim.** "Five films are flatter than yours" is a fact about where you
  stand. No line in the report says to move.
- **The median is described as what has been made here.** Half this library is debt the same documents
  say not to copy. The number is evidence about the rule, not a mark to hit.

This is the same reasoning that keeps `pace-check`'s floor at the library's tenth percentile instead of
its median: the aim is to catch a film that is asleep, not to make every film move at one speed.

### The library view

`node harness/author/motion-director.mjs` with no file prints the census on its own: how often each code
fires, and the p10, median and p90 of the measure behind it. Use it to argue about a rule. It reaches no
verdict and exits 0.

## no-continuous-object (and its inferred twin)

**Read [`FILM-STRUCTURE.md`](FILM-STRUCTURE.md) before you reach for this rule.** It is one device out of
about eighteen that hold a short film together, it is the cheapest of them, and in Murch's own ranking it is
the 4% item, the one he says to sacrifice first. It is also **opt-in**: `TASTE=1 make author-check`, or
`make direction-floor D=<file>`. Run it when the film's CONTENT is continuous, which is a single-subject
product film, a process shown end to end, or a demo where the UI is the subject. On a manifesto, a vignette
anthology, a comparison built on its junctions, or a metric-cut list film it is wrong by construction.

What it measures: one content layer that both spans a cut and CHANGES across it. Pose either side of the
boundary is read with the engine's own pure functions, so a static watermark riding the cut buys nothing. A
layer whose internal clock the gate cannot read is assumed to transform, because a gate must not invent a
failure out of something it cannot see. A layer the engine confines to its own beat is not a candidate at
all (see `beats-wrapped-as-units` below). **Blocks when the gate is run.**

`no-continuous-object-inferred` is the same test where the author declared no cuts at all. An island
boundary is a moment where at least two content layers leave and at least two unrelated ones arrive, and the
layers standing through it do not outnumber either side. It exists because three films authored on one brief
declared zero cuts between them, so the blocking tell evaluated none of them, including a textbook slideshow
(MISTAKES #163). It **warns**, and blocks under `STRICT=1`: failing a build over a boundary the author never
wrote is a bad error to be wrong about, and the threshold that separates the exemplar from the slideshow is a
single integer validated against four films.

**What neither tell can see.** Both measure that a prop survives a junction and moves. Neither can tell a
card that travels from a card that BECOMES the next thing, which is the actual grammar. Two of the A/B films
pass on that technicality. Neither can see a motif, a bookend, a metric cut rate or an unfinished sentence at
all, and a film held by those is properly structured and fails here every time.

A layer the engine confines to its own beat is not a candidate at all: see below.

## beats-wrapped-as-units (always on, in `make beat-check`)

Not a taste rule. `core/engine/produce.js` turns `sceneUnits` on for any cut film with no choreographed `motion`
track, and `formats/scene/scene.js` then rewrites every non-last-beat layer to end with its own beat so the
wrapper can slide the beat out as one block. A layer authored across a cut is **truncated at it**, silently.
`make beat-check` names every layer the wrapping actually shortens and by how much. Mark the one layer that
should carry the film `"acrossBeats": true` and it attaches to the camera instead of its beat, keeping its
authored window. It **warns** (blocks under `STRICT=1`): truncation is a fact about the render, and whether
it is a defect depends on whether you meant the layer to live past the cut.

## beats-held-open (always on, in `make beat-check`)

The same rewrite read the other way. `setLayerTiming` **replaces** the authored duration; it does not keep
the shorter of the two. So a layer written to leave at 2.0s inside a beat that runs to 9.4s stays on screen
for the whole beat, and the frame holds content the JSON says has already gone. Carrying a layer through its
own beat's cut window is the wrapper's job and is never reported; what is reported is the excess, measured
against the same 0.4s this gate calls the line where a held frame stops reading as a breath. Same two
answers as above: write `duration` to say what you meant, or mark the layer `"acrossBeats": true` to keep
the authored window (it then fades out on its own instead of sliding with the beat). It **warns**.

## Provenance

**Do not re-add:** a claim that straight-ahead action, solid drawing, squash-and-stretch or arcs have no
form in this engine. §1 states the live mechanism for each (the `squash` modifier, `ease:"through"`,
`motionPath`, the `effector`/`shader`/`raymarch`/`idle` tracks, the `depth`/`modifiers`/`three`/`track`
family).

**Per-section sourcing**, moved here from the top of each numbered section above:

- §1 First principles of motion. Source: **Thomas & Johnston, _The Illusion of Life: Disney Animation_
  (1981)**, the 12 principles; motion-graphics adaptation from **Austin Shaw, _Design for Motion_
  (2020)** and **School of Motion, "12 Principles for Motion Design."**
- §2 Editing & pacing. Source: **Walter Murch, _In the Blink of an Eye_ (2001)**; edit-rhythm from
  **Reisz & Millar, _The Technique of Film Editing_.**
- §3 Restraint. Source: **School of Motion; Shaw ("less, but better")**; enforced locally in
  [`TASTE-RULES.md`](TASTE-RULES.md).
- §4 Story placement. Source: **McKee, _Story_ (1997)** (setup/turn/payoff, rising action,
  tension/release); **Snyder, _Save the Cat!_** (hook-first, escalation); **Loewenstein, "The
  Psychology of Curiosity" (1994)** (the open loop); **Ogilvy, _Ogilvy on Advertising_** (front-load,
  honesty).

**Full bibliography**, gathered from every "Source:" line above:

- Thomas & Johnston (_The Illusion of Life: Disney Animation_ (1981)) the 12 principles.
- Walter Murch (_In the Blink of an Eye_ (2001)) the Rule of Six, cut-on-motion, emotion-first.
- Austin Shaw (_Design for Motion_ (2020)) the motion-graphics adaptation, type-in-motion.
- Jon Krasner (_Motion Graphic Design: Applied History and Aesthetics_) negative space, holds.
- School of Motion ("12 Principles for Motion Design") the practitioner translation.
- Google Material Design (Motion guidelines) asymmetric easing, duration-by-distance.
- Robert McKee (_Story_ (1997)) setup/turn/payoff, rising action, tension & release.
- Blake Snyder (_Save the Cat!_) hook-first, escalation.
- George Loewenstein ("The Psychology of Curiosity" (1994)) the open loop / curiosity gap.
- David Ogilvy (_Ogilvy on Advertising_) front-loading the strong element, honesty.
