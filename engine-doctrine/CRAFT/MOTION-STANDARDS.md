---
when: "motion is technically correct and still feels wrong, or you are choosing an easing or a duration"
answers: "which outside UI-motion standards transfer to film, which do not, and the numbers to use"
group: look
---

# Why some motion feels right

Sources: [animations.dev](https://animations.dev) and [emilkowal.ski](https://emilkowal.ski/ui/great-animations)
by Emil Kowalski, and his [review-animations STANDARDS](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md),
the only one of the three with concrete numbers. `[eye]`: no check enforces this page.

These are UI rules and we make films. About half do not apply, and applying them would make films worse.

## What does not transfer

| their rule | why it has no subject here |
|---|---|
| UI animations stay under 300 ms | a budget for answering a click. Nobody waits on a film. A beat runs 1 to 4 s by design |
| frequency of use ("100+ times a day, no animation") | a film is watched once. Every moment is the rare case |
| interruptibility, retargeting mid-flight | nothing interrupts a render |
| `prefers-reduced-motion` | no viewer at render time. It belongs to the site hosting the mp4 |
| hover, press, drag, momentum | no pointer. A cursor is a drawn prop |
| "animate only transform and opacity for 60 fps" | we render offline. Keep it for determinism and layout stability, not frame rate |

## What transfers

- **Easing order.** Entering or exiting: `ease-out`. Moving on screen: `ease-in-out`. Constant motion:
  `linear`. **Never `ease-in` on an entrance**: it delays the exact moment the eye is watching.
- **Use strong curves.** Built-in CSS easings are too weak. Kowalski's `cubic-bezier(0.23, 1, 0.32, 1)`
  (ease-out) is `easeOutQuint` within a mean error of 0.0044 (`core/motion/curves.js`). His in-out,
  `cubic-bezier(0.77, 0, 0.175, 1)`, is close to `easeInOutQuart`. `easeOutCubic` is too weak as a default.
- **Asymmetric timing.** Slow on the decision, fast on the response. In a film: an entrance is an
  introduction and deserves its time, an exit is over. Exits run faster and shorter than entrances
  (`../RULES/ease-direction.md`).
- **Physicality.** Never `scale(0)`. Use 0.9 to 0.97 with `opacity: 0`.
- **Stagger.** 30 to 80 ms between siblings.
- **Springs.** Keep bounce in 0.1 to 0.3 (subtle). Reason about a spring as duration plus bounce
  (`springLinear`, `springDuration` in `core/motion/springs.js`), not by guessing a preset name.
- **Origin-aware motion.** The strongest single technique: a popover scales from the button that opened it,
  not from its own centre, so the motion explains where the thing came from. Set `transform-origin` to the
  point the thing came from.
- **Linear is for constant motion only.** A pan, a scroll, a progress ring, an ambient drift.

## The line worth remembering

Motion is not decoration. It is an explanation of what just happened. A popover growing from its trigger
explains where it came from. An exit faster than its entrance says the thing is over. A held frame says the
last thing mattered. That is the argument `SHOW-DONT-TELL.md` makes about pictures, one layer down.
