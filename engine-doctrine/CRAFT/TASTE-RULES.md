---
when: "it \"renders fine but feels cheap\""
answers: "the guardrails you break by default, the cause to feeling ease table, the failure-modes catalog, restraint, continuity"
group: story
---

# TASTE RULES: what not to do, and how each choice makes the viewer feel

`MOTION-CRAFT.md` says how to move a thing. This page says what it feels like when you do, and what not
to do. Reach for it when a film renders fine but feels cheap. `SELECTION.md` turns an intent into the
specific cut, face and ease. Read both before authoring, not after.

> Rather no motion than bad motion. Rather one clean idea than five effects.

Every rule below is a corollary. When two rules collide, this one wins.

## Guardrails: you know these rules and you break them

Borrowed from reference motion-design notes, with the receipts from this repo.

- Do not use one ease on every tween. Your default is `power2.out` everywhere. Vary eases like you vary
  font weights: no more than two independent tweens in a scene with the same ease.
- Do not use one speed on everything. Your default is 0.4 to 0.5 s. The slowest beat is at least 3x the
  fastest (`engine-doctrine/RULES/speed-bands.md`).
- Do not enter everything from one direction. Your default is `translateY(30px)` plus fade on every
  element. A 28 s film shipped with a fade on nearly every one of 31 hand-written layers. Vary the origin:
  from left, from right, from scale, opacity only, letter-spacing.
- Do not use one stagger everywhere. Each scene needs its own rhythm.
- Do not put an ambient zoom on every scene. Pick a different ambient motion per scene (slow pan,
  subtle rotation, scale push, colour shift) or nothing. Stillness after motion is powerful.
- Do not start at t = 0. Offset the first animation 0.1 to 0.3 s. Zero delay feels like a jump cut.
- Ease out for entering, ease in for leaving, ease in and out for moving between positions. You get
  this backwards. Ease-in entrances feel sluggish. Ease-out exits feel reluctant.
- Entrances take longer than exits: a card takes 0.4 s to appear and 0.25 s to leave. The theme's exit
  ratio ran 0.35 to 0.6 in shipped themes.
- Subtle reads as static at 30 fps. Err toward more movement than feels safe. Two films written as
  improvements on a third both came out slower, at 0.95 and 0.85 events per second against a library
  median of 1.20.
- Never put a spring or an overshoot ease on a counting number. Overshoot paints a number that is not
  true for several frames. Overshoot is a claim about mass, and a number has none.

## Cause to feeling: the ease and duration table

The easing curve is the highest-leverage taste control, and authors reach for the wrong one by default
(linear, or a bounce). Names are in `core/motion/curves.js` (`approach(f, from, to, k)` for settles is in
`core/motion/springs.js`).

| feeling | ease | duration | use it for |
|---|---|---|---|
| smooth, confident | `easeOutCubic` | 0.4 to 0.6 s | most things |
| snappy, punchy | `easeOutQuart`, `easeOutQuint` | 0.2 to 0.35 s | payoffs, a hard reveal |
| dramatic, arriving | `easeOutExpo` | 0.3 to 0.5 s | a hero line landing, a number slamming |
| dreamy, calm | `easeInOutSine` | 0.5 to 0.9 s | ambient drift, a held thesis |
| mechanical, precise | `easeInOutQuart`, steps | 0.3 to 0.5 s | UI mechanism, a toggle, a tab slide |
| playful (rare) | `easeOutBack` | 0.3 to 0.5 s | one accent word, never body text |
| springy (rarer) | spring, `easeOutElastic` | 0.3 to 0.5 s | a logo pop, one moment per film |

Bounce is the first instant turn-off. A novice thinks it adds emphasis. It buys that at the cost of
looking cheap. Use it as seasoning on one accent per film, never as the default entrance. Exits
accelerate and entrances decelerate: an arrival is a landing, a departure is a launch. Linear on a
visible move is the tell of no taste.

## The failure-modes catalog: name the smell, then the fix

- **Effect soup** (the primary failure): a different look, shader or 3D toy every beat, so the film is
  a demo reel and the eye never rests. Effects are seasoning: two or three earned moments in a 45 s
  film. Reserve them for the hero reveal, an act break, the CTA. Bolding every word is bolding none.
- **Slideshow**: every beat is a card that animates once and freezes, cut and replace. Carry one or two
  elements across the cut (a headline shrinks into the next label, a card moves and is not replaced).
- **The white flash**: a moving cut or a fading background reveals a light page behind dark content.
  Match the ground to the content, and never fade a full-bleed background out.
- **The monotone**: every entrance is the same 0.45 s. It reads as a machine narrating. Timing is a
  voice: ambient 0.8 to 1.2 s, thesis 0.5 s, payoff 0.25 to 0.35 s.
- **The chord that should be an arpeggio**, and the reverse: a group that all lands at once, or a
  stagger too wide. Stagger 30 to 80 ms and cap `count x stagger` at about 0.5 s or the group stops
  reading as one beat.
- **Cheap aliveness**: something loops or breathes near text being read. Stillness with subtle jitter
  is the only honest "alive".
- **The invisible effect**: a displacement wash on smooth material, a glow on dark content, a 0.4 s
  blinds nobody can perceive. If it does not read at its size and duration, it is not a feature.
- **The unearned claim**: copy says "26 looks" and 26 looks do not appear. Show what you claim in the
  same breath, or cut the claim. An unbacked number is worse than none.
- **Centred everything**: one size, everything centred, Inter, a blue to purple gradient. Asymmetry
  over centred; one huge hero and one tiny caption; a committed non-generic face; one accent hue.
- **The dead final frame**: the CTA fades out, or the last word sits over an emptied plate. Do not fade the
  payoff, and do not freeze it either: the world keeps moving to the last frame (no static tail).

## Restraint: an effect must be earned

About 95% of cuts are hard cuts. A shader transition or a strong look is for two or three moments: the
hero reveal, an act break, the CTA, a music punctuation. Everything else is a hard cut on the beat.

| the beat's role | reach for |
|---|---|
| hero reveal, act break, CTA, the one "wow" | a special transition, look or 3D moment |
| connective tissue, rapid-fire, fast pacing | a hard cut, nothing else |
| a held, readable beat | stillness (plus optional micro-jitter), no effect |

One cut family per film. One accent hue. Mixing whip and iris in one piece, or a new look every beat,
is five fonts on a slide.

The budget flexes with the register (`MOTION-REGISTERS.md`): quiet (UI-adjacent, explainer) treats
motion as a cost the viewer pays, so one loud moment against a still field is right. Kinetic (launch,
sting, hype) makes sustained motion the content, so a still beat is the cost.

## Continuity: one continuous film

- Shared elements travel. The strongest "directed" signal is one persistent element that repositions and
  resizes across beats, not two layers that cut and replace. The headline becomes the label. The card
  slides to its next mark.
- Match the seam: cut at peak velocity, and match direction and speed on both sides. Pair exits with
  entrances by direction, never enter-and-retreat.
- Cover a hard ground jump (dark to light) with an effect that peaks at the cut. Leave same-ground cuts raw.

## Every beat declares its feeling

A beat that cannot say what it does to the viewer is decoration. In the brief, every beat states a
persuasion move (`pain agitation`, `negative contrast`, `future pacing`, `social proof`, `risk reversal`,
`inevitability`) and a feeling arc (`anxiety to relief`, `aspiration to trust`, `curiosity to payoff`).
A beat with neither is a frame occupying time: cut it. The role table is in `STORY.md`.

Nothing checks these rules by machine except `bin/vawe check page-check` and `anim-traps`. Whether it
feels right is judged by an eye: yours, then a fresh critic's (`SUBAGENTS.md`).
