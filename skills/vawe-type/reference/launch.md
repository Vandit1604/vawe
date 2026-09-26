---
when: "authoring a SaaS or product launch video from a captured site"
answers: "the launch type's spine, motion to reach for, rules, assets and worked example"
group: skill
---

# The launch playbook: SaaS/product

A launch film is built from CAPTURE, not invention. Its taste already lives on the real site; the job
is to reflect it, never redesign it.

## The spine changes shape with length

**Under ~15s: ONE CONTINUOUS ACTION, not the six-beat spine below.** `CONTINUOUS_ACTION_MAX_S`
(`harness/author/type-spines.mjs`, 15s) is the switch: below it, write the storyboard around the
primary action control (the button or field the viewer would press), named once, carrying a hand-keyed
track across the whole film, never cutting. Read `skills/vawe-continuous-action/SKILL.md` first at this
length; the six-beat spine below is the wrong shape for it, not a shorter version of it.

**At or past ~15s: the six-beat spine**, hook -> captured UI -> feature proof -> payoff -> brand lockup
-> CTA:

Hook (open loop, 2-3s) -> captured UI (the product itself, 3-4s) -> feature proof (2-3s) -> payoff stat
(2-3s) -> brand lockup (2-3s) -> CTA (2-3s). Pace band: 2.0-3.2s per beat. The payoff lands right before
the brand beat, never after it: a stat after the logo reads as an afterthought.

## What this type needs that others do not

- **Kinetic register.** A launch film sells sustained motion, not one loud moment against a quiet
  field: `engine-doctrine/CRAFT/MOTION-REGISTERS.md` §1 and `type-spines.mjs`'s `register: 'kinetic'`. A beat that
  moves differently from its neighbours is directed; a beat that copies the last beat's timing is the
  real failure, not the fact that most beats move.
- **Captured UI, not invented UI.** `make sections` / `make media X=capture` before writing a single layer.
  A hand-drawn dashboard is the fastest way into generic-AI-slop territory.
- **A continuous object.** One element (the wordmark, a UI element, an accent rule) that survives
  every cut and changes across it. `engine-doctrine/RULES/continuous-object.md`.
- **A hue-turning field.** `bg` changes tone per beat; a launch film especially needs this because the
  captured UI is usually light, so the backdrop is the only thing that can carry mood change.
  `engine-doctrine/RULES/world-turns.md`.
- **Logo prominence.** The mark gets its own beat (`logoLockup`/`logoReveal`), never a bullet beside a
  headline. `engine-doctrine/RULES/logo-prominence.md`.
- **Paired directional exits.** A layer that enters from the right leaves to the left.
  `engine-doctrine/RULES/paired-directional-exit.md`.

## The motion to reach for

By role (`make arsenal Q="…"` to search):
- **hook**: `kineticHook`, `typedHook`, `blurResolveHook`
- **product (needs a real captured asset)**: `screenDive`, `recordedPan`, `scrollStory`
- **feature proof**: `cardCascade`, `chipGrid`, `containerFill`
- **payoff**: `statReveal`, `wordBlast`
- **brand**: `logoLockup`, `logoReveal`, `wordmarkAssemble`
- **close**: `ctaEnd`

## The rules that matter most

`engine-doctrine/RULES/continuous-object.md` · `engine-doctrine/RULES/world-turns.md` · `engine-doctrine/RULES/logo-prominence.md` ·
`engine-doctrine/RULES/paired-directional-exit.md` · `engine-doctrine/RULES/video-scale.md` · `engine-doctrine/RULES/text-on-flat.md` ·
`engine-doctrine/RULES/banned-defaults.md`. Also read AGENTS.md's "Launch-video rules" section (five standing
rules, checked by the `craft-live.mjs` hook on every save).

## Assets and how to get them

`make sections URL=<site> NAME=<name>` inventories every real section; `make media X=capture` grabs one UI
cluster as an image; `make study-tool X=palette` eyedrops the real colours; `make media X=assets` pulls the real logo (never
a bare `curl`, which writes a zero-byte file on a 404). Crawl every page and view mode, not just the
homepage: the real product often lives one click deeper than the hero.

## Writing the storyboard

Beats, in order: `kineticHook -> screenDive -> cardCascade -> statReveal -> logoLockup -> ctaEnd`
(`harness/author/type-spines.mjs`), cycling `soft/mesh/spotlight/accent` bg presets and a
fade-then-cinematicZoom cut family. `screenDive`/`logoLockup` need real `image`/`mark` paths: mark them
`REPLACE:` in the storyboard until the real capture exists, never invent one.

## What the judge weighs for this type

Does the captured UI look like the real product (not a redraw)? Does the brand mark get real screen
time? Is there one thing the eye can follow across every cut? Does the backdrop actually change tone,
not just texture? Is the payoff a real fact, not a slogan?

## The worked example

`quality/runs/evals/briefs/launch.json` (13s, 16:9). Shows: a real captured still
(`assets/brands/vawe/stills/glass-hero.png`) carrying the build beat, a real engine fact (5 canvases)
as the payoff instead of a slogan, the wave mark's own beat (drawn on, not a bullet), and a wordmark
that travels bottom-left across every cut as the continuous object.
