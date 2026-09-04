---
when: "it \"renders fine but feels cheap\""
answers: "cause→feeling ease table · the failure-modes catalog · restraint · continuity"
group: story
codes: effect-soup
---

# TASTE RULES: what not to do, and how each choice makes the viewer feel

## AGENT SUMMARY

- Prime directive: rather no motion than bad motion, rather one clean idea than five effects. Every
  rule below is a corollary; when two rules collide, this one wins.
- Vary ease, duration, entrance direction and stagger per beat. Never repeat one default (one ease,
  one 0.4-0.5s duration, one entrance direction) across a whole film.
- Enforced by: `codes: effect-soup`, plus the backstop table at the end (`make validate`/`critique`,
  `designspec-check`, `make audit`, `make knobs-audit`, `make motion`, `make ledger`, judgment via
  `make direct`, `make judge`).
- Checkable action: name the beat's motion in one clause. Does it need "and" to join two unrelated
  verbs (a second effect on the same beat)?

`MOTION-CRAFT.md` says HOW to move a thing (the 10 rules, the speed dials). This file says WHAT it
feels like when you do, and WHAT NOT TO DO. It is the cause→feeling layer: you reach for it when the
video "renders fine but feels cheap." Modelled on the another engine taste system (doctrine in prose,
the source-decidable subset backstopped by a gate).

Two things a from-scratch video lacks that a brand site hands you for free, a taste anchor and a
story spine. This file is the anchor when there is no site. Its companion [`SELECTION.md`](SELECTION.md) turns an intent into the specific transition/font/effect to reach for. Read it before authoring, not after.

---

## The prime directive

> **Rather no motion than bad motion. Rather one clean idea than five effects.**

Every rule below is a corollary. When two rules collide, this one wins.

---

## Guardrails: you know these rules but you violate them. Stop.

Borrowed close to verbatim from the reference system's
`another engine-creative/references/motion-principles.md`. Their sentences, our engine's names, and the
receipts from this repo where we have them. Everything below this block is the reasoning; this block is
the part you skip.

- **Don't use the same ease on every tween. You default to `power2.out` on everything.** Ours is
  `easeOutCubic`, which the table below calls *"the default for almost everything"*, and that phrasing is
  how a table entry becomes a habit. *"Vary eases like you vary font weights: no more than 2 independent
  tweens with the same ease in a scene."*
- **Don't use the same speed on everything. You default to 0.4-0.5s for everything.** *"The slowest scene
  should be 3x slower than the fastest. Vary duration deliberately."* This is the same defect the
  failure catalog below already names as **the monotone** ("every entrance is the same 0.45s"), and it is
  gated as `monotone-timing`. Two independent systems arrived at the same number about you.
- **Don't enter everything from the same direction. You default to `y: 30, opacity: 0` on every element.**
  Our version of that default is `anim: "fade"`. A 28s film shipped here with 31 hand-written layers and
  `anim: "fade"` on nearly every one (`../../CLAUDE.md`, the #1 authoring failure). *"Vary: from left,
  from right, from scale, opacity-only, letter-spacing."*
- **Don't use the same stagger on every scene.** *"Each scene needs its own rhythm."*
- **Don't use ambient zoom on every scene.** *"Pick different ambient motion per scene: slow pan, subtle
  rotation, scale push, colour shift, or nothing. Stillness after motion is powerful."*
- **Don't start at t=0.** *"Offset the first animation 0.1-0.3s. Zero-delay feels like a jump cut."*
- **Ease-out for entering, ease-in for leaving, ease-in-out for moving between positions. You get this
  backwards constantly.** *"Ease-in for entrances feels sluggish. Ease-out for exits feels reluctant."*
- **Entrances take longer than exits.** *"A card takes 0.4s to appear but 0.25s to disappear."* The engine
  has a field for exactly this: `theme.motion.exitRatio`, which defaults to `1` and is set to `0.45` by
  exactly one theme ([KEYED-MOTION.md](KEYED-MOTION.md)).
- **Subtle reads as static at 30fps.** *"Err toward more movement than feels safe."* Measured here: two
  films authored as improvements on a third both came out SLOWER than the film they criticised, at 0.95
  and 0.85 events per second against a library median of 1.20 ([`../MISTAKES.md`](../MISTAKES.md) #322).
  `make pace-check` fails below 1.0.

**One accusation this repo has to add for itself, because their engine has no counter layer:** you will
put a spring or an overshoot ease on a `count`. Don't. `core/layers/count.js` runs the value through
whatever ease it is handed, so overshoot paints a number that is **not true** for several frames. The
house motion guide recommended it, twice, for a year ([`../MISTAKES.md`](../MISTAKES.md) #385).
`countEaseErrors` in `core/validate.mjs` now refuses it. Overshoot is a claim about MASS, and a number
has none.

---

## Cause → feeling: the ease + duration table

The single highest-leverage taste control is the easing curve, and authors reach for the wrong one by
default (linear, or a bounce). Pick the row by the FEELING the beat wants; the engine names are real
(`core/motion.js`).

| Feeling you want | Ease (our name) | Duration | Use it for |
|---|---|---|---|
| Smooth, confident | `easeOutCubic` | 0.4–0.6s | the default for almost everything |
| Snappy, punchy | `easeOutQuart` / `easeOutQuint` | 0.2–0.35s | payoffs, a hard reveal |
| Dramatic, arriving | `easeOutExpo` | 0.3–0.5s | a hero line landing, a number slamming |
| Dreamy, calm | `easeInOutSine` | 0.5–0.9s | ambient drift, a held thesis |
| Mechanical, precise | `steps`-like / `easeInOutQuart` | 0.3–0.5s | UI mechanism, a toggle, a tab slide |
| Playful (RARE) | `easeOutBack` (overshoot) | 0.3–0.5s | ONE accent word, never body text |
| Springy (RARER) | `spring` / `easeOutElastic` | 0.3–0.5s | a logo pop, a single moment per film |

**The bounce warning, stated once.** `easeOutBack`/`easeOutBounce`/`easeOutElastic` are the #1 instant
turn-off. A novice thinks bounce adds emphasis; it buys that emphasis at the cost of looking cheap.
Bounce is a seasoning for ONE accent per video, never the default entrance. `easeOutCubic` reads as
more premium than any bounce, every time. (This is why `kinetic.bounce`/`elastic` exist but are not
the default preset.)

**Exits accelerate, entrances decelerate.** An arrival is a landing (`easeOut*`); a departure is a
launch (`easeIn*` / `accel`). Linear on a visible move is the tell of no taste.

---

## The failure-modes catalog, name the smell, then the fix

Each is a real way from-scratch videos go wrong. Name → why it reads bad → the fix. Several are bugs
this engine actually shipped (`docs/MISTAKES.md`).

- **Effect soup** (the primary failure): a different composite look / shader / 3D toy every beat, so
  the video is a demo reel, not a film. Nothing connects; the eye never rests. → Effects are seasoning:
  2–3 earned moments in a 45s film, not fifteen. Most beats are clean type on the palette. Reserve an
  effect for the hero reveal, an act break, the CTA. *Bolding every word is the same as bolding none.*
- **Slideshow**: every beat is an independent card that animates once and freezes, cut-replace,
  cut-replace. → Motion continuity: carry ONE or two elements across the cut (a headline shrinks into
  the next label; a card moves, it is not replaced). One continuous film, one camera.
- **The white flash / backdrop reveal**: a moving cut (cube, roll, spin) or a fading background reveals
  a light page body behind dark content. → Match the backdrop to the content (`bg:"dark"` under a dark
  film), and hold full-bleed backgrounds with `exitDur:0` so they never fade out. (MISTAKES #114/#116.)
- **The monotone**: every entrance is the same 0.45s. Reads as a machine narrating. → Timing is a
  voice: ambient 0.8–1.2s, thesis 0.5s, payoff 0.25–0.35s (MOTION-CRAFT rule 1).
- **The chord that should be an arpeggio** (and vice-versa): a group all enters at once (screenshot) or
  staggers too wide (lazy). → Stagger 0.06s, capped so `count × stagger ≤ ~0.5s` or the group stops
  reading as one beat.
- **Cheap aliveness**: something loops/breathes near text being read. → No loop near reading text.
  Stillness with subtle jitter is the only honest "alive."
- **The invisible effect**: a displacement wash on smooth material, a glow look on dark content (it
  thresholds brightness, so a dark frame emits nothing), a 0.4s `blinds` nobody can perceive. → If it
  does not read at its size and duration, it is not a feature. Pick one that reads.
- **The unearned claim**: on-screen copy says "26 looks" and 26 looks do not appear; a number that is
  not true. → Show what you claim in the same breath, or cut the claim. An unbacked number is worse
  than none.
- **Centered everything**: one size, everything centred, Inter, a blue→purple gradient. The AI-slop
  signature. → Asymmetry over centred; one huge hero + one tiny caption (scale contrast); a committed
  non-generic face; one accent hue. (`make designspec-check` catches the mechanical tells.)
- **The dead final frame**: the CTA fades out, or the last held word sits over an emptied plate. → End
  on a held frame, `exitDur:0`. Never fade the payoff.

---

## Restraint: an effect must be EARNED

~95% of cuts are hard cuts. A shader transition or a composite look is for 2–3 key moments: the hero
reveal, an act break, the CTA, a music punctuation. Everything else is a hard cut on the beat.

| The beat's role | Reach for |
|---|---|
| hero reveal · act break · CTA · the one "wow" | a sting / composite look / 3D moment |
| connective tissue · rapid-fire · fast pacing | a hard cut, nothing else |
| a held, readable beat | stillness (+ optional micro-jitter), no effect |

One cut family per film. One accent hue. Mixing whip and iris in one piece, or a new look every beat,
is the video equivalent of five fonts on a slide.

The effect budget flexes with the video's PURPOSE (a launch film is restrained; an effects showreel is
allowed to be dense, but even it earns each beat), and the director gate judges busyness against that
purpose rather than a fixed count.

---

## Continuity: one continuous film

- **Shared elements travel.** The strongest "directed" signal: a persistent layer with a motion track
  that repositions/resizes it across beats, not two separate layers that cut-replace. The headline
  becomes the label; the card slides to its next mark.
- **Match the seam.** Cut at peak velocity, and match direction + speed on both sides, an element
  leaving left hands off to one entering from the same motion. Pair exits with entrances directionally
  (`slide-right` in → `slide-left` out), never enter-and-retreat.
- **Cover a hard backdrop jump** (dark↔light) with a sting peaking AT the cut; leave same-bg cuts raw.

---

## Every beat declares its feeling (the required fields)

Borrowed from another engine' story model: a beat that cannot say what it is DOING to the viewer is
decoration. In the storyboard / lock sheet, every beat states two things:

- **persuasion**. The rhetorical move: `pain agitation` · `negative contrast` · `future pacing` ·
  `social proof` · `risk reversal` · `inevitability`.
- **feeling**. The emotion arc: `anxiety → relief` · `aspiration → trust` · `curiosity → payoff`.

If a beat has neither, it is not a beat; it is a frame occupying time, and it should be cut (the value
gate in `vawe-video-planning`).

---

## What is gate-checkable vs what is judgment

Following the another engine split: prose carries the taste; a gate backstops only the source-decidable
subset. Cross-linked by name so a rule can say "or it trips `X`."

| Taste rule | Backstop |
|---|---|
| No em-dash; unbacked number; claim-not-shown | `make validate` / `make critique` |
| Centered / overused-font / gradient tells | `make designspec-check` |
| Invisible-at-size text; dead-final-frame; overlap | `make audit` |
| A dial set on a preset that ignores it | `make knobs-audit` |
| Monotone timing; payoff doesn't settle | `make motion` |
| Design repeats a shipped one | `make ledger` |
| Effect soup / no continuity / mixed cut family | **judgment** (the planned `make direct` gate) |
| Does it FEEL right | **judgment** (`make judge` vision pass) |

The last two rows are why a human verdict per beat still matters. A gate proves it did not break a
rule; only an eye proves it is good.
