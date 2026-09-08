---
when: judging or proving a layer's motion without rendering or watching the video, checking a claimed wind-up/pulse/beat-timing against real numbers
answers: "per-layer moving/held spans, peak velocity, peak area change (a wind-up/scale pulse), monotonic vs oscillating shape"
group: crosscutting
---

# Motion trace

An agent cannot watch a video. It reads frames. `make motion` already renders every frame headless
and builds a per-element time series to run nine checks against, then throws the series away.
`make motion-trace` keeps it: it is the same capture, reported as a per-layer motion signal instead
of a pass/fail.

```
make motion-trace M=scene D=formats/scene/<file>.json [STRIDE=N] [JSON=1]
node scripts/gates/motion-audit.mjs scene --data formats/scene/<file>.json --trace [--stride N] [--json]
```

## What it shows

For every element the engine itself considers a timed layer, top-level or nested inside a group
(selected on `[data-start]`, the same attribute `core/timeline/clips.js` uses to find "every timed
element", stamped on every layer by `formats/scene/scene.js` and `core/layers/util.js`'s
`addGroupChild`; an authored `id` reaches this report when the layer has one, but it is never a
requirement to be tracked):

- **spans**: when it was `moving` vs `held`, in seconds. A step counts as moving if its centre moved
  more than 0.3px, its opacity changed more than 0.005, its area changed more than 1%, or its text or
  a descendant transform changed. The same threshold `make motion`'s frozen-span check (vi) already
  uses, so a trace and a finding never disagree about what "held" means.
- **peak velocity**: the fastest position change, in px/s, and when it happens.
- **peak area change**: the largest relative bounding-box area change in one sampled step, and when.
  This is the field a position-only check cannot give you: a wind-up, a punch-in, or a scale pulse
  moves no pixel of its own centre and would be invisible without it.
- **shape**: `monotonic`, `oscillating`, or `held`. Judged on position when the layer travels (net
  displacement over total path length: a straight move scores near 1, a wobble scores low); on area
  when it does not (a steady grow or shrink scores near 1, a grow-then-shrink pulse scores low,
  which is what a wind-up looks like in this number). Mirrors the peak+curve reasoning in
  `scripts/media/study.mjs:306-311`: a mean, or one peak number, cannot tell a held-then-launch beat
  from a steady drift, so the shape rides beside the peak here too.

## Sampling, stated

A trace an agent will actually run has to cost seconds, so it does not render every frame. The
stride auto-scales to land near 200 samples over the film's runtime (override with `--stride`/
`STRIDE=`), and the report always prints what it used: `sampled every N frame(s) = Xms`. A number
whose sampling is unstated is how this repo got a false reference band once already
(`scripts/gates/motion-split.mjs`'s header). Read the stated interval before trusting a peak: a
burst shorter than the sample interval can be missed or its true peak underestimated.

## Candidates: a fast stop with nothing trailing it

The trace also names a candidate for `modifiers:[{"lag":...}]` (core/fx/lag.js), FOLLOW-THROUGH after
Dan Ebberts: a layer trails another's motion by a frame or three and overruns its stop before
settling back. Used by 0 of 187 films in this library as of this writing (`morph` by 1, `follow` by
1), which does not mean it belongs on any of them: it means nobody had ever measured where it might.

A candidate fires when a layer is a top mover in its own film (peak velocity within half the film's
own max, floored at 150px/s so a gentle-easing film does not manufacture one), it comes to a full
stop, and no OTHER tracked layer's own motion starts within 0.4s of that stop. It reads:

```
"btn" peaks at 34046px/s at 1.57s and stops at 3.73s, and nothing trails it. Candidate for
`modifiers:[{"lag":"btn"}]` follow-through (core/fx/lag.js, 1-3 frame delay), UNLESS this is a rigid
board: a card that drags reads as jelly.
```

The caveat is not decorative: `lag`'s own schema note is "wrong on a rigid board, a card that drags
reads as jelly", and this trace cannot tell a card from a token. It names the candidate and the
caveat in the same breath and leaves the call to whoever is reading it, the same shape
`scripts/live/scene-live.mjs` uses for `unusedPresets`. No pass/fail here either: a film with no
candidates said nothing wrong, and a film with one is not required to act on it.

## What it cannot show

- **Whether a candidate is actually right.** It names a fast, unanswered stop; it does not know
  whether the layer is a card, a chip, a label or a trailing token, so it cannot tell you whether
  `lag` belongs there. Read the caveat every time.
- **Anything the fingerprint does not fold in.** The per-step "moved" signal reads position, opacity,
  text length, a capped set of descendant `transform`s, and `strokeDashoffset` (added for `drawOn`,
  core/motion/parts.js:40). A CSS custom property driving a shader, a canvas draw, or a `filter`
  value change moves nothing this trace reads and will show as held.
- **Whether the motion is any GOOD.** No pass/fail, ever (like `motion-split`, this is an
  instrument): a peak in the middle of a film that should build to its payoff is a real problem
  `docs/CRAFT/DIRECTION.md` names, and this file will not flag it. Read the shape, judge it yourself.
- **The video, faithfully.** This samples the same browser preview `make motion` and `make studio`
  render from (`scene.html`), not the encoded mp4. A `drawOn` stroke on `post-trailhead` measured as a
  single-frame snap (1px to 0px in one sampled step) rather than a smooth seven-second interpolation:
  worth knowing if you are trying to verify a claimed gradual draw specifically, since the preview
  path may not be the same interpolation the real render produces.

## When to reach for it instead of `make studio` or `make motion-split`

- **`make studio`**: a human with an eye. Use it to judge whether a move looks right; it has a
  scrubber and drag-to-key editing, both human affordances an agent cannot use.
- **`make motion-split`**: one number per film, ground vs layers, plus one whole-film energy curve.
  Use it to ask "how much of this film's motion is its content, and does the film build toward its
  payoff." It cannot tell you which LAYER did what.
- **`make motion-trace`**: per layer, not per film. Use it to check one beat: did this layer actually
  move when the storyboard says it should, does its peak land where the beat lands, is a claimed
  wind-up actually a pulse or is it noise. This is the instrument that answers "prove it," not
  "how does the whole film feel."
