---
when: "the restraint rule (one loud moment, effects as seasoning) reads wrong for the type you are writing, or you need a published number instead of an adjective"
answers: "why restraint is register-dependent, not universal; the Material Design 3 curves and the duration/stagger numbers that replace our adjectives; the seven-device motion taxonomy; what is and is not measurable about motion"
group: look
codes: effect-soup
---

# MOTION REGISTERS: restraint has two answers, not one

## AGENT SUMMARY

- `engine-doctrine/CRAFT/DIRECTION.md` §3 and `engine-doctrine/CRAFT/TASTE-RULES.md` state restraint as a universal law: name
  ONE loud moment, everything else stays quiet. That is correct for UI-adjacent and quiet-explainer
  work and wrong for kinetic typography, hype/launch promos and continuous title sequences, where
  sustained motion IS the content. Pick the register before you pick the restraint level.
- Numbers, not adjectives: MD3's four curves with their exact bezier values, and the duration/stagger
  bands that converge across three independent sources (§2).
- Seven motion devices exist, not two: continuous ambient, entrance/exit, emphasis/punctuation,
  transformation/morph, camera/viewport, physics-driven, time remapping (§3).
- Cut rate has a real accepted metric (average shot length, the Cinemetrics corpus). "Is this motion
  good" does not. Frame-difference detects dead frames; it cannot judge direction (§4).
- `make arsenal SHAPE=`'s five shapes are measured off two films IN THIS REPO (higgsfield-recreation and
  brew-launch-act1), never off an external reference (§5).

This is a research doc, not a rule page: it exists to hold the sourced argument so the correction to
`DIRECTION.md` and `TASTE-RULES.md` does not float free of its evidence. An unsourced number here
becomes the next false reference band this repo has to unwind, so every claim below carries its source.

---

## 1. The restraint rule is register-dependent, and we apply it as if it were universal

`DIRECTION.md` §3 says "one motion idea per beat" and "effects are seasoning, 2-3 earned moments across
a film." `TASTE-RULES.md` calls effect soup "the primary failure." Both state the rule with no
register attached, as if every video in this engine were trying to do the same job as a settings panel.

**The rule is right, for one register, and it is right because motion there is a COST the viewer pays.**
Nielsen Norman Group frames animation duration as time subtracted from the user's task: every
millisecond of motion is a millisecond the user is not doing the thing they opened the interface to do
([nngroup.com/articles/animation-duration](https://www.nngroup.com/articles/animation-duration/)).
Apple's Human Interface Guidelines make the same argument from the platform side: "avoid gratuitous
motion... motion for its own sake can be distracting and can make people feel like they're losing
control of the experience"
([developer.apple.com/design/human-interface-guidelines/motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
In that register restraint is not taste, it is the whole argument: a UI-adjacent film (a demo, a
talking-head explainer) is standing in for an interface, and the same tax applies.

**The rule is backwards for a second register, where sustained motion is not a cost, it is the content
being sold.** Kinetic typography practice treats continuous movement as the medium: type choreographed
to a beat for the whole runtime, not settling into a still frame between two moves
([We Design Motion: "Kinetic Typography, When and Why It Works"](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/)).
Beat-synced editing in music-video and promo work cuts and moves ON the beat for the entire piece, by
design, because the rhythm IS the structure, not a texture applied to three moments. And the
title-sequence tradition this repo already argues from, Saul Bass's continuous kinetic sequences and
Kyle Cooper's *Se7en* main title, holds a viewer's attention through unbroken motion across an entire
sequence with no still beat at all. `engine-doctrine/CRAFT/DIRECTION.md` §1 already cites `higgsfield-recreation`
as hand-keying 75% of its 8 layers with zero cuts; that film IS this register, and grading it against a
one-loud-moment rule would mark its whole identity as a violation.

**Both films this repo argues from sit in the second group.** `higgsfield-recreation` (6 of 8 layers
hand-keyed, zero cuts) and `brew-launch-act1` (a continuous camera push across five inverted backdrop
windows) are launch/hype promos, not UI explainers. Measuring them against a UI restraint rule is
comparing a title sequence to a settings dialog and marking the title sequence over-designed.

### The split, stated as a table

| Register | Motion is | Restraint rule | Named examples |
|---|---|---|---|
| UI-adjacent / quiet explainer | a cost the viewer pays for legibility | one loud moment, everything else quiet; NN/g and Apple HIG apply directly | `vawe-type` (`reference/explainer.md`, `reference/talking-head.md`) |
| Kinetic typography / hype / launch promo / continuous title | the content itself | sustained motion across the whole runtime is correct; a still beat is the cost | `vawe-type` (`reference/launch.md`, `reference/sting.md`), `higgsfield-recreation`, `brew-launch-act1` |

**This does not repeal `effect-soup`, `monotone-timing` or the rest of `make direct`.** Those gates
measure whether motion VARIES (different eases, different durations, different directions), and
variety is required in both registers. What changes is whether the register EXPECTS one loud moment
against a quiet field, or expects the field itself to move for the whole runtime. A hype film with 100%
of its beats moving is not effect soup if every beat moves differently; a hype film with 100% of its
beats moving the *same way* is still monotone. The register changes the restraint target, not the
variety requirement.

**Where the split lives now: `harness/author/type-spines.mjs`.** Each type spine carries a `register`
field (`'kinetic'` or `'quiet'`) so the register is SELECTED by the type when the storyboard is written,
not remembered by the author on every film. A launch storyboard starts kinetic; an explainer starts
quiet. See §5 of `DIRECTION.md` and the per-type `SKILL.md` files for the consuming doctrine.

---

## 2. The numbers, not the adjectives

Our docs say "fast," "gentle," "smooth, confident." Three independent sources converge on the same
numbers; here they are, attributed, so a duration decision can cite a number instead of a mood.

### Material Design 3's four curves

MD3 ships exact cubic-bezier values, not adjectives
([m3.material.io/styles/motion/easing-and-duration/tokens-specs](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)):

| MD3 curve | cubic-bezier | Use |
|---|---|---|
| **Standard** | `(0.2, 0, 0, 1)` | the default, most transitions |
| **Standard decelerate** | `(0, 0, 0, 1)` | entrances: an element arriving from off-frame |
| **Standard accelerate** | `(0.3, 0, 1, 1)` | exits: an element leaving the frame |
| **Emphasized** (composite) | decelerate `(0.05, 0.7, 0.1, 1)`, accelerate `(0.3, 0, 0.8, 0.15)` | a hero moment MD3 wants to draw the eye to |

The decelerate/accelerate split is the same rule `DIRECTION.md` §1 already states as "entrances
decelerate, exits accelerate," and MD3's own exact numbers are a closer neighbour to our
`easeOutQuint`/`easeInQuint`-family curves than to `easeOutCubic`, which is already flagged as too weak
in `MOTION-STANDARDS.md`.

### Duration: three sources converge on the same bands

| Band | Duration | Source |
|---|---|---|
| Micro feedback | ~100ms | MD3 (`m3.material.io`), the shortest named token |
| Standard transition | 200-300ms | MD3 "short"/"medium" tokens; NN/g's general guidance for a simple UI move |
| Dramatic / hero transition | 300-500ms | MD3 "long" tokens; Emil Kowalski's `review-animations` STANDARDS (already vendored, cited in `MOTION-STANDARDS.md`) |
| Entrances vs exits | entrances run longer than exits | MD3 (decelerate tokens run longer than accelerate tokens at the same tier); Kowalski's "slow on arrival, fast on exit" |

This is the same asymmetry this engine already ships as `exitRatio` (`MOTION-STANDARDS.md` §"Asymmetric
timing"), now with the published band it sits inside rather than just the direction of the effect.

### Stagger: 50-200ms between related elements

MD3 and Kowalski's STANDARDS both name a 50-200ms band for staggering related elements, which our own
`stagger` default of 45ms (`../MOTION-CRAFT.md`) sits just under, and our documented "60-120ms" hierarchy
band (`DIRECTION.md` §1, Follow-through row) sits inside.

**Where this leaves our existing tables.** `TASTE-RULES.md`'s cause->feeling ease table and
`../MOTION-CRAFT.md`'s speed-dial table already carry numeric ranges, not bare adjectives; they do not
need rewriting. What they lacked was the external convergence proving those ranges are not house
invention. That convergence is stated here, once, so a future reader does not have to re-derive it.

---

## 3. Seven motion devices, not two

Doctrine currently names two devices by implication: emphasis (the "one loud moment") and
entrance/exit (the whole vocabulary of `anim`/`out`). Practice names seven. Each row: what it
communicates, when it is correct, its characteristic failure.

| # | Device | Communicates | Correct when | Characteristic failure |
|---|---|---|---|---|
| 1 | **Continuous ambient** | the world is alive, not a slide | a backdrop, a bg window, a held beat that would otherwise be dead | drawing the eye off the content it is meant to support (too much contrast against the still foreground) |
| 2 | **Entrance / exit** | an element is arriving or has finished its job | almost every layer, every beat | enter-and-retreat (same side both ways), or an exit with no direction at all |
| 3 | **Emphasis / punctuation** | this moment matters more than its neighbours | the one hero reveal, a stat landing, a CTA | firing on every beat, at which point nothing is emphasised (the `effect-soup` failure) |
| 4 | **Transformation / morph** | one thing IS becoming another, not being replaced | a headline shrinking into a label, a card becoming a chip, `matches`/`becomes` junctions | morphing two objects with no shared visual logic, which reads as an unrelated cut with extra steps |
| 5 | **Camera / viewport** | the FRAME is moving through a world, not the content moving inside a fixed frame | a scene with real depth (`three`, `depth`/`modifiers`), a captured-UI pan, `brew-launch-act1`'s continuous push | camera moves that fight a layer's own motion track, producing double-counted travel |
| 6 | **Physics-driven** | mass, weight, momentum: this object obeys real forces | a spring/overshoot on something with a rigid identity or the eye reads as light; the `squash` modifier | overshoot on a `count` layer (`TASTE-RULES.md`'s own named accusation): a number has no mass and overshoot paints a false value for several frames |
| 7 | **Time remapping** | urgency or weight changes independent of what is moving | a `ramp` speed-change inside one move, holding on the payoff longer than "correct" (Disney's Exaggeration, `DIRECTION.md` §1) | a ramp with no narrative reason, which reads as a render glitch rather than a directorial choice |

Devices 1, 2 and 3 already have doctrine (`world-turns`, most of `DIRECTION.md`, `effect-soup`). Devices
4-7 exist in the engine (`matches`/`becomes`, `depth`/`modifiers`/`three`, the `squash` modifier, `ramp`)
but are not named as a taxonomy anywhere, so an author reaching past "entrance or emphasis" has nothing
to search for by name. Naming them is the fix `engine-doctrine/CRAFT/HTML-FRAGMENTS.md`'s
"name the effect before you build it" rule already argues for at the fragment level; this table is the
same argument one level up, at the device level.

---

## 4. What can be measured, and what cannot, and why that is fine

**Cut rate has a real, accepted metric.** Average Shot Length (ASL): total runtime divided by cut
count. It is not a house invention, it is the standard unit of cinemetric analysis, backed by a corpus
of roughly 15,000 films (Cinemetrics, [cinemetrics.lv](http://www.cinemetrics.lv/)) built specifically
so ASL claims could be checked against a population instead of a single critic's impression.
`engine-doctrine/CRAFT/DIRECTION.md`'s own pacing rules (accelerate toward the climax, alternate short/long beats)
are ASL-shaped claims and could in principle be checked against that corpus.

**"Is this motion good" has no accepted metric, anywhere in the field.** The study behind this doc
found no equivalent of ASL for motion QUALITY. Frame-difference (comparing consecutive rendered frames
to detect how much changed) is a real, legitimate signal for one narrow question: is this frame dead
(a hold with no motion where one was intended)? It is craft-blind for the actual judgement: whether the
motion that IS there serves the beat, whether it is directed rather than merely present, whether
restraint was earned. Two films can carry identical frame-difference curves, one directed and one
noise, and the metric cannot tell them apart.

**This repo's existing stance is consistent with the field, not behind it.** `DIRECTION.md` already
says "nothing scores this and nothing will" about the film's energy-over-time shape, and
`engine-doctrine/CRAFT/FILM-STRUCTURE.md` already treats several structural devices (a motif, a sound bridge, an
unfinished sentence) as things no static gate can verify. That is not a gap in this engine's tooling;
it is the correct description of where the whole field's measurement stops. The retired `slop` gate
`DIRECTION.md` names failed this way: it measured a PROXY (a DOM-dump rule count) and let the proxy
stand in for the judgement it could not make. Keeping `make judge` as an eye-only, mandatory, unscored
step is the correct response
to a field with no accepted quality metric, not a workaround for one this repo has failed to build.

---

## 5. Provenance correction: `make arsenal SHAPE=`'s shapes are measured off THIS repo's own films

`harness/author/track.mjs` emits a hand-keyed `motion` track from one of five shapes
(`pan`/`blast`/`drift`/`enter`/`exit`). Its own header states the source plainly:

> `higgsfield-recreation` carries a keyed track on 6 of its 8 layers... higgsfield beat 2, whose
> per-segment speed runs 1.03, 1.35, 1.29, 0.75, 0.62... brew's punctuation leaves by growing THROUGH
> the frame.

Every shape is measured off `higgsfield-recreation` and `brew-launch-act1`, the two films IN THIS
REPO, never off an external reference video or a named outside brand. `engine-doctrine/CRAFT/HTML-FRAGMENTS.md`'s
"measured off a real film" (§3, the `motion` track paragraph) is consistent with this, if read
alongside the two films it names one paragraph earlier; nothing found in this pass states the false
version (an external-reference claim) outright, so nothing else needed correcting. This section exists
so the true provenance is stated once, plainly, in a doc that is not source code, for the next author
who reads "measured off a real film" and reasonably wonders which one.

---

## Sources

- Nielsen Norman Group, ["Animation Duration"](https://www.nngroup.com/articles/animation-duration/): motion as a cost against the user's task.
- Apple, [Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion): "avoid gratuitous motion."
- We Design Motion, ["Kinetic Typography, When and Why It Works"](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/): sustained motion as the content.
- Saul Bass's title sequences and Kyle Cooper's *Se7en* main title (1995): the continuous-kinetic title tradition, cited already in `engine-doctrine/CRAFT/FILM-STRUCTURE.md`.
- Google, [Material Design 3: Easing and Duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs): the four curves, the duration tokens.
- Emil Kowalski, [`review-animations` STANDARDS](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md): vendored and already cited in `MOTION-STANDARDS.md`.
- Cinemetrics, [cinemetrics.lv](http://www.cinemetrics.lv/): the ~15,000-film ASL corpus.
- `harness/author/track.mjs`: the primary source for §5, read directly.
