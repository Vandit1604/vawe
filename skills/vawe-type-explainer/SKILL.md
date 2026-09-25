---
name: vawe-type-explainer
description: "Playbook for an explainer video in this engine: held pace, real counted figures, payoff last, no product or site needed. Load when the route table (engine-doctrine/CRAFT/ROUTING.md) matches explainer, or the request explains a topic/article/data with invented visuals."
stage: plan
---

# vawe-type-explainer: the explainer playbook

No product, no site: the taste anchor is a NAMED reference (a style word, or a manufactured profile),
never "clean modern SaaS". The whole film has to earn attention on the strength of the facts and the
counts, so it holds pace longer per idea than a launch film does.

## The spine changes shape with length

**Under ~15s: ONE CONTINUOUS ACTION**, not the multi-beat spine below. `CONTINUOUS_ACTION_MAX_S`
(`harness/author/type-spines.mjs`, 15s) is the switch. Below it, write the storyboard around a held
FIGURE (the one number this film proves): it counts up from zero and holds at its final value, no cut.
Read `skills/vawe-continuous-action/SKILL.md` first at this length. A single counted fact genuinely IS a
continuous action; do not force the four-beat build below into 10s just because the type is explainer.

**At or past ~15s: the multi-beat spine**, hook -> build -> counted proof -> payoff:

Hook (open loop, 2-3s) -> build 1 (a set of named things, 3-4s) -> build 2 (a counted fact, 2-3s) ->
payoff (the shocker number/fact, last, 2-3s) -> optional CTA/close. Pace band: **2.5-4.0s per beat**,
noticeably held longer than a launch or demo film: an explainer's job is to let one idea land before the
next starts, not to keep pace with a product tour.

## What this type needs that others do not

- **Quiet register.** An explainer is UI-adjacent: motion is a cost the viewer pays to keep reading
  (NN/g, Apple HIG; `engine-doctrine/CRAFT/MOTION-REGISTERS.md` §1). Name ONE loud moment (the payoff) and hold
  everything else still enough that the facts can be read (`register: 'quiet'` in `type-spines.mjs`).
- **Counts with REAL figures.** The `count` layer compacts >=1e6 automatically; use a real number,
  never a round placeholder. This type's own worked example (`engine-doctrine/EVALS.md`) uses this engine's own
  facts (24 layer types, CSS animation refused at boot, frame-independent rendering) precisely because
  they are checkable.
- **Payoff last, always.** Order beats so the most counterintuitive fact lands at the very end; never
  spoil it in the hook. `engine-doctrine/RULES/payoff-last.md`.
- **No product needed.** Resist the urge to bolt on a CTA or a brand lockup; an explainer that ends on
  "vawe.dev" when nothing was being sold reads as a bait-and-switch.
- **A held pace.** Do not chain devices at launch-film speed; a fact needs room to be read and
  understood before the cut.

## The motion to reach for

By role (`make arsenal Q="…"` to search):
- **hook**: `kineticHook`, `dialogueAccumulate`, `wordWipe`
- **named-things build**: `containerFill`, `chipGrid`, `listBuildRows`, `cardFan`
- **counted proof**: `statReveal` (a `count` layer under a kinetic label)
- **payoff**: `statReveal`, `wordBlast`, `echoRing`
- **close** (only if there is a real next step): `ctaEnd`

## The rules that matter most

`engine-doctrine/RULES/payoff-last.md` · `engine-doctrine/RULES/speed-bands.md` · `engine-doctrine/RULES/stagger-total.md` ·
`engine-doctrine/RULES/text-on-flat.md` · `engine-doctrine/RULES/banned-defaults.md` · `engine-doctrine/RULES/world-turns.md`. Also
AGENTS.md's "Content philosophy" section (hook -> suspense -> payoff, never spoil, real numbers).

## Assets and how to get them

None required: an explainer is built from type, counts and named-thing chips, not captured UI. If a
graphic genuinely helps (a diagram, a real chart), prefer generating it from real data over a stock
icon; see `engine-doctrine/CRAFT/SHOW-DONT-TELL.md` for what counts as explanation versus decoration.

## Writing the storyboard

Under 15s: the held-figure continuous action above. At or past 15s: beats, in order,
`kineticHook -> containerFill -> listBuildRows -> chipGrid -> statReveal -> ctaEnd`
(`harness/author/type-spines.mjs`), cycling `paper/soft/dotmatrix` bg presets and a
dissolve-then-punch cut family. This is the one type whose beat spine needs no captured asset at all,
so it is also the fastest to validate clean out of the box at that length.

## What the judge weighs for this type

Is the payoff genuinely the most surprising fact, and does it land last? Are the numbers real and
checkable? Does the pace give each idea room, or does it rush like a product tour? Is there a picture
carrying real information, or is the whole film type on a field (`engine-doctrine/CRAFT/SHOW-DONT-TELL.md`)?

## The worked example

`quality/runs/evals/briefs/explainer.json` (20s, 16:9). Shows: this engine's own checkable facts (a frame
is a pure function of time, 24 layer types each built from `frame(kit,el,L,t)`, CSS animation/transition
refused at boot), a live `count` layer reading the film's own elapsed seconds, and the payoff (splitting
the render across workers loses nothing) landing last. A live t-readout is the continuous object.
