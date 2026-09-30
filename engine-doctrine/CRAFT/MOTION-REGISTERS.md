---
when: "the restraint rule (one loud moment, effects as seasoning) reads wrong for the film you are writing, or you need a published number instead of an adjective"
answers: "why restraint depends on register · the Material Design 3 curves and the duration and stagger bands · the seven motion devices · what is and is not measurable about motion"
group: look
---

# MOTION REGISTERS: restraint has two answers

`DIRECTION.md` section 4 and `TASTE-RULES.md` state restraint as one law: one loud moment, everything else
quiet. That is right for UI-adjacent and quiet-explainer work and wrong for kinetic typography, hype and
launch promos and continuous title sequences, where sustained motion is the content. Pick the register
before you pick the restraint level. Every number below carries its source, because an unsourced number
becomes the next false reference band.

## 1. The two registers

Motion is a cost in a UI-adjacent film. Nielsen Norman Group treats animation duration as time taken from
the user's task ([nngroup.com/articles/animation-duration](https://www.nngroup.com/articles/animation-duration/)).
Apple's HIG: "avoid gratuitous motion" ([developer.apple.com/design/human-interface-guidelines/motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
A demo or talking-head explainer stands in for an interface, and the same tax applies.

Motion is the content in kinetic type. Type is choreographed to a beat for the whole runtime, not settled
into a still between moves ([We Design Motion](https://wedesignmotion.com/blog/design/kinetic-typography-when-and-why-it-works/)).
Beat-synced promos cut and move on the beat by design. Saul Bass and Kyle Cooper (Se7en) hold attention with
unbroken motion across a whole title sequence.

| Register | Motion is | Restraint rule |
|---|---|---|
| UI-adjacent, quiet explainer | a cost the viewer pays for legibility | one loud moment, everything else quiet |
| Kinetic type, hype, launch promo, continuous title | the content | sustained motion across the runtime is correct, a still beat is the cost |

The register changes the restraint target, not the variety requirement. A hype film with every beat moving
differently is directed. One with every beat moving the same way is still monotone.

## 2. Numbers, not adjectives

Material Design 3 easing ([m3.material.io](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)):

| Curve | cubic-bezier | Use |
|---|---|---|
| Standard | `(0.2, 0, 0, 1)` | the default |
| Standard decelerate | `(0, 0, 0, 1)` | entrances |
| Standard accelerate | `(0.3, 0, 1, 1)` | exits |
| Emphasized | decelerate `(0.05, 0.7, 0.1, 1)`, accelerate `(0.3, 0, 0.8, 0.15)` | a hero moment |

They sit closer to `easeOutQuint` and `easeInQuint` than to `easeOutCubic`, which is too weak
(`MOTION-STANDARDS.md`).

Duration bands where MD3, NN/g and Emil Kowalski's review-animations STANDARDS agree: micro feedback about
100 ms; a standard transition 200 to 300 ms; a dramatic or hero transition 300 to 500 ms; entrances longer
than exits at the same tier. Stagger between related elements: 50 to 200 ms (MD3, Kowalski). `AGENTS.md`
uses 30 to 80 ms for siblings in a film.

## 3. Seven motion devices

Practice names seven. Each row: what it says, when it is right, its usual failure.

| # | Device | Communicates | Right when | Failure |
|---|---|---|---|---|
| 1 | Continuous ambient | the world is alive | a backdrop, a held beat that would be dead | pulls the eye off the content |
| 2 | Entrance, exit | an element arrives or is done | almost every element | enter-and-retreat, an exit with no direction |
| 3 | Emphasis, punctuation | this moment matters most | the one hero reveal, a stat, a CTA | fires on every beat, so nothing is emphasised |
| 4 | Transformation, morph | one thing becomes another | a headline shrinking into a label | two objects with no shared logic: a cut with extra steps |
| 5 | Camera, viewport | the frame moves through a world | real depth, a capture pan, a continuous push | camera and element motion double-count travel |
| 6 | Physics-driven | mass, weight, momentum | a spring on something with a rigid identity | overshoot on a counter: a number has no mass and overshoot paints a false value |
| 7 | Time remapping | urgency or weight changes | a speed ramp inside one move, a longer hold on the payoff | a ramp with no reason reads as a glitch |

## 4. What can be measured

Cut rate has an accepted metric: average shot length (total runtime over cut count), backed by the roughly
15,000-film Cinemetrics corpus ([cinemetrics.lv](http://www.cinemetrics.lv/)). "Is this motion good" has
none anywhere in the field. Frame difference detects a dead frame (a hold where motion was intended). It
cannot judge whether motion serves the beat. Two films can share one frame-difference curve, one directed
and one noise. Keep the fresh judge (`bin/vawe judge`) as an eye-first step, and never let a proxy count
stand in for a judgement.

Sources: NN/g; Apple HIG; We Design Motion; Google Material Design 3; Emil Kowalski's review-animations
STANDARDS; Cinemetrics.
