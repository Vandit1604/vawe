---
name: vawe-type-sting
description: "Playbook for a motion-graphic sting/bumper in this engine: one move, the mark, four to eight seconds. Load when the route table (engine-doctrine/CRAFT/ROUTING.md) matches motion-graphic, or the request is a short unnarrated logo reveal, stat hit, or moving title."
---

# vawe-type-sting: the motion-graphic sting playbook

The shortest type and the least forgiving: at 4-8s there is no room for a second idea. A sting that
tries to do two things does neither. Judge every addition against "does this serve the ONE move".

## The spine, at every length

A sting's own paceBand (4.0-8.0s) sits entirely under `CONTINUOUS_ACTION_MAX_S` (15s), so this type is
ALWAYS the continuous-action shape (`skills/vawe-continuous-action/SKILL.md`), never the beat rotation:
`type-spines.mjs` names the mark itself as the one object (`continuousObject`), unformed at t=0,
assembling into its full form, held. There is no length at which this type takes a different shape.

One move. No hook/build/payoff structure at all: the mark or the word arrives, resolves, holds. Pace
band: **4.0-8.0s total runtime**, not per-beat, because there is usually exactly one beat. Where the
film needs no cuts, use none: `engine-doctrine/RULES/one-cut-family.md`'s floor does not fire under 8s
(`quality/gates/direction-floor.mjs`), so a single continuous move is not a violation, it is the point.

## What this type needs that others do not

- **Kinetic register.** A sting is the purest case of `engine-doctrine/CRAFT/MOTION-REGISTERS.md` §1's second
  register: at 4-8s there is no still beat to hold, so the whole runtime is the "loud moment," and
  restraint means one move done well, not motion held back (`register: 'kinetic'` in `type-spines.mjs`).
- **One move, named up front.** Before writing anything, say in one sentence what the single motion
  is (a draw-on, a scale-through, a wipe). If you cannot say it in one sentence, it is not one move.
- **The mark, not a slogan.** A sting's job is brand recognition in under 8 seconds; the wordmark or
  icon needs real size and real screen time, not a caption crawling past it.
- **`AUTHOR THE MOTION. DO NOT NAME IT.`** A sting is judged entirely on its hand-keyed motion track:
  a named preset animates one layer over one span with one curve, and that reads as generic at this
  length more than at any other. `engine-doctrine/CRAFT/KEYED-MOTION.md`.
- **Black means black.** If the brief calls for a true-black bumper, write `{"preset":"black"}`
  (`#000000`, no tint) rather than a themed dark preset, which carries a colour wash.

## The motion to reach for

By role (`make arsenal Q="…"` to search):
- **the one move**: `logoReveal` (draw-on + bloom + wordmark cascade), `wordmarkAssemble`, `wordBlast`,
  `wordWipe`, `morphButton`
- Chaining two devices is almost always wrong here: `kineticHook` or `statReveal` alone, never combined
  with a second beat, is the ceiling this type's route file (`engine-doctrine/CRAFT/routes/motion-graphic.md`)
  already names.

## The rules that matter most

`engine-doctrine/RULES/handover-glide.md` · `engine-doctrine/RULES/ease-direction.md` · `engine-doctrine/RULES/first-arrival.md` ·
`engine-doctrine/RULES/svg-inline.md` (a mark is almost always an `svg` layer) · `engine-doctrine/CRAFT/KEYED-MOTION.md`.

## Assets and how to get them

The mark itself: an inline `svg` `d` path (never a rasterised logo file for a vector mark), pulled from
the real brand asset (`assets/icons/<name>.svg` or the captured site). A sting almost never needs any
other asset; if it does, that is a sign the brief wants a different type.

## `make scaffold TYPE=sting`

```bash
make scaffold OUT=films/scene/<name>.json TYPE=sting DUR=6
```

Emits the CONTINUOUS-ACTION shape (`harness/author/type-spines.mjs`'s `continuousObject`): the mark,
named as the one object, on a hand-keyed track from `track.mjs`'s measured `pan`/`blast` shapes, `black`
bg, zero transitions. Replace the placeholder `html` box with your real `svg` mark; the track and the
zero-transitions waiver are already right for this type at any length inside its paceBand.

## What the judge weighs for this type

Is there genuinely one move, or did a second idea sneak in? Does the mark get real size and real time on
screen? Is the motion hand-keyed and specific, or a named preset that could belong to any brand? Does it
hold the resolved frame long enough to register, or does it end mid-motion?

## The worked example

`quality/runs/evals/briefs/sting.json` (6s, 16:9, true black). The wave mark draws itself on stroke by stroke,
resolves to a filled shape on a hand-keyed scale track, and the wordmark settles in behind it. No cuts,
no second beat.
