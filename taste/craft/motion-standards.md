---
when: "motion is technically correct and still feels wrong, or you are choosing an easing or a duration"
answers: "which outside UI-motion standards transfer to film, which do not, and the rule behind each"
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
| a UI animation stays under a short budget (300 ms) | a budget for answering a click. Nobody waits on a film. Product UI shown in a film follows the film speed bands ([speed-bands](../rules/speed-bands.md)), not app timing |
| frequency of use ("100+ times a day, no animation") | a film is watched once. Every moment is the rare case |
| interruptibility, retargeting mid-flight | nothing interrupts a render |
| `prefers-reduced-motion` | no viewer at render time. It belongs to the site hosting the mp4 |
| hover, press, drag, momentum | no pointer. A cursor is a drawn prop |
| "animate only transform and opacity for 60 fps" | we render offline. Keep it for determinism and layout stability, not frame rate |

## What transfers

- **Easing order.** An entrance lands: EASE.land. An exit launches: EASE.launch. A move between two seen
  positions travels: EASE.carry. Constant motion: linear, only for a pan, a progress ring or an ambient
  drift. **Never a slow-start curve on an entrance**: it delays the exact moment the eye is watching
  ([entrance-ease](../rules/entrance-ease.md)).
- **Use strong curves.** The built-in CSS keywords are too weak, and a hand-fitted cubic-bezier starts too
  hard and stops too early. Use the EASE names, which are exact `linear()` curves
  ([named-eases](../rules/named-eases.md)). Kowalski's strong ease-out bezier is a reference for what
  EASE.land approximates, not a value to paste; the /easing pages on the site may show the nearest bezier
  for reading only. A weak ease-out is not a default anywhere.
- **Asymmetric timing.** Slow on the decision, fast on the response. In a film: an entrance is an
  introduction and deserves its time, an exit is over. Exits run faster and shorter than entrances
  ([exits-shorter](../rules/exits-shorter.md)).
- **Physicality.** Never start from scale 0: start slightly smaller with opacity 0
  ([entrance-ease](../rules/entrance-ease.md)).
- **Stagger.** A short gap between siblings ([stagger](../rules/stagger.md)).
- **Springs.** Reason about a spring as duration plus bounce (`springLinear`, `springDuration` in
  `core/motion/springs.js`), not by guessing a preset name. Bounce is not a default on type or UI; EASE.pop
  is for a press or a pop the page names ([no-bounce](../rules/no-bounce.md)).
- **Origin-aware motion.** The strongest single technique: a popover scales from the button that opened it,
  not from its own centre, so the motion explains where the thing came from. Set `transform-origin` to the
  point the thing came from ([entrance-origin](../rules/entrance-origin.md)).
- **Linear is for constant motion only.** A pan, a scroll, a progress ring, an ambient drift, and the
  interior legs of a multi-key camera path ([camera-path-linear](../rules/camera-path-linear.md)).

## The line worth remembering

Motion is not decoration. It is an explanation of what just happened. A popover growing from its trigger
explains where it came from. An exit faster than its entrance says the thing is over. A held frame says the
last thing mattered. That is the argument [show-dont-tell.md](show-dont-tell.md) makes about pictures, one
layer down.
