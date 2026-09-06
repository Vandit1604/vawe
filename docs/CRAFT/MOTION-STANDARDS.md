---
when: "motion is technically correct and still feels wrong, or you are choosing an easing or a duration"
answers: "the outside standards for why motion reads well, which of them transfer to FILM, and what this engine already has against what it is missing"
group: look
---

# Why some motion feels right

## AGENT SUMMARY

- Default entrances to `easeOutQuint` (not the weaker `easeOutCubic` this engine currently defaults to); never `ease-in` on an entrance. Turn on `exitRatio` per theme so exits move faster than their entrance.
- `[eye]`: no gate enforces this page. `make claims` tracks the `linear`-easing split it names.
- Checkable action: does this entrance ease out on a strong curve, and does its exit move faster than its arrival?

Sources, all read 2026-08-29: [animations.dev](https://animations.dev) and
[emilkowal.ski](https://emilkowal.ski/ui/great-animations) by Emil Kowalski, and his
[review-animations STANDARDS](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md),
which is the only one of the three carrying concrete numbers. The vocabulary they use is vendored at
`~/.claude/skills/ui-ux-interview/references/animation-vocabulary.md`.

> **THESE ARE UI RULES AND WE MAKE FILMS.** That is not a caveat to skim: roughly half of the standard
> does not apply here at all, and applying it anyway would make our films worse. The split is set out
> below before anything else, because a borrowed rule with no subject is exactly what got the retired
> slop gate deleted: 41 borrowed rules run over a DOM dump that carried evidence for three of them, and
> its silence read as a pass on the whole library (`docs/MISTAKES.md` #326).

## What does NOT transfer, and why

| their rule | why it has no subject here |
|---|---|
| "UI animations stay under 300ms" | a duration budget for something answering a CLICK. Nobody is waiting on a film; a beat runs 1 to 4 seconds by design |
| frequency-of-use hierarchy ("100+ times/day → no animation ever") | a film is watched once, start to finish. Every moment in it is the rare case |
| interruptibility, retargeting mid-flight | nothing interrupts a render. `renderFrame(n)` is a pure function of n |
| `prefers-reduced-motion` | there is no viewer at render time. It belongs to the SITE that hosts the mp4, not to the mp4 |
| hover, press, drag, rubber-banding, momentum | no pointer. `cursor` is a drawn prop, not an input |
| "animate only transform and opacity for 60fps" | true for jank on someone's laptop. We render offline at whatever cost, and the reason WE keep this rule is purity and layout stability, not frame rate |

## What DOES transfer, and where we stand

### Easing, and we are mostly right already

Their decision order: entering or exiting → `ease-out` · moving on screen → `ease-in-out` · constant
motion → `linear` · **never `ease-in` on an entrance**, because it delays the exact moment the eye is
watching.

Measured over 1,216 keys in this library: **ease-in appears on an entrance key once.** That rule is
already kept, without ever having been written down here.

**Their strong curves, and ours.** They argue the built-in CSS easings are too weak and name three
custom ones. Sampled against our 41 easings at 21 points:

| theirs | nearest ours | mean error |
|---|---|---|
| `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` | **`easeOutQuint`** | **0.0044** |
| `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` | `easeInOutQuart` | 0.0200 |
| `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` | `easeOutQuint` | 0.0233 |

We already ship their ease-out under another name. **We default to `easeOutCubic`, which is the weaker
one they specifically argue against.** That is a one-line change to `DEFAULT_MOTION` and a re-baseline,
and it is the highest-value item on this page.

### Asymmetric timing: we have the knob and almost nobody turns it

"Slow on the user's decision, fast on the system's response." The film equivalent is the one
`docs/CRAFT/KEYED-MOTION.md` already states: an entrance is an introduction and deserves its time; an
exit is over.

`exitRatio` exists in `motionDefaults` for exactly this and defaults to 1, meaning symmetric.
**11 of 41 themes declare it.** So 30 brands leave everything exiting at the speed it arrived.

### Physicality: kept, and by accident

"Never `scale(0)`; use 0.9 to 0.97 with `opacity: 0`." Measured: **zero `scale: 0` keys in the
library.** Nothing enforces it; it simply has not happened.

### Stagger: in band

They give 30 to 80ms. `DEFAULT_MOTION.stagger` is **0.045**, which is 45ms, in the middle of it.

### Springs: we have the physics, not the Apple form

We ship `spring`, `springStiff`, `spring-bouncy`, `spring-stiff`, `springEase`. Sampled, our `spring`
overshoots to 1.068 and `spring-bouncy` to 1.205, which is their "bounce 0.1 to 0.3, subtle" band.
What we do not have is their **`{ duration, bounce }`** form, which is the one a person can reason
about: our springs are named presets, so choosing a bounce means guessing which name has it.

## What we are MISSING

**Origin-aware motion is not authorable.** Their strongest single technique: a popover scales from the
button that opened it, not from its own centre, so the motion explains where the thing came from.
`transformOrigin` is written in six engine files and **no layer prop reaches it**. (`origin` in the
schema is a globe's route start, which is how this was nearly missed.) Every scale in every one of our
films grows from its own centre. Logged in `grammar/_gaps.json`.

**The strong ease-out is not the default.** See above.

**`linear` is 26% of our keyed easings** (317 of 1,216). Part of that is correct and deliberate:
`scripts/author/track.mjs` emits linear interiors for a measured shape, and `core/timeline/sequence.js`
interpolates a sub-0.14s segment linearly anyway. The rest is unexamined, and their rule is that
linear is for constant motion only. `make claims` tracks the split.

## The one line worth remembering

Their whole argument reduces to: **motion is not decoration, it is an explanation of what just
happened.** A popover growing from its trigger explains where it came from. An exit faster than its
entrance explains that the thing is over. A held frame explains that the last thing mattered.

That is the same argument `docs/CRAFT/SHOW-DONT-TELL.md` makes about pictures, one layer down.
