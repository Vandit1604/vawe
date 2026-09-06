---
name: vawe-type-launch
description: "Playbook for a SaaS/product launch video in this engine: captured UI, a continuous object, a hue-turning field, logo prominence. Load when the route table (docs/CRAFT/ROUTING.md) matches launch-video, or the request is to market/showcase a real product, company or site."
---

# vawe-type-launch: the SaaS launch playbook

A launch film is built from CAPTURE, not invention. Its taste already lives on the real site; your job
is to reflect it, never redesign it. This is the playbook; `vawe-launch` (a separate skill) is the
step-by-step orchestrated pipeline if you want the full gated flow instead of authoring by hand.

## The spine

Hook (open loop, 2-3s) -> captured UI (the product itself, 3-4s) -> feature proof (2-3s) -> payoff stat
(2-3s) -> brand lockup (2-3s) -> CTA (2-3s). Pace band: 2.0-3.2s per beat. The payoff lands right before
the brand beat, never after it: a stat after the logo reads as an afterthought.

## What this type needs that others do not

- **Captured UI, not invented UI.** `make sections` / `make capture` before writing a single layer.
  A hand-drawn dashboard is the fastest way into generic-AI-slop territory.
- **A continuous object.** One element (the wordmark, a UI element, an accent rule) that survives
  every cut and changes across it. `docs/RULES/continuous-object.md`.
- **A hue-turning field.** `bg` changes tone per beat; a launch film especially needs this because the
  captured UI is usually light, so the backdrop is the only thing that can carry mood change.
  `docs/RULES/world-turns.md`.
- **Logo prominence.** The mark gets its own beat (`logoLockup`/`logoReveal`), never a bullet beside a
  headline. `docs/RULES/logo-prominence.md`.
- **Paired directional exits.** A layer that enters from the right leaves to the left.
  `docs/RULES/paired-directional-exit.md`.

## The blueprints to reach for

By role (`make blueprints` for the full 29):
- **hook**: `kineticHook`, `typedHook`, `blurResolveHook`
- **product (needs a real captured asset)**: `screenDive`, `recordedPan`, `scrollStory`
- **feature proof**: `cardCascade`, `chipGrid`, `containerFill`
- **payoff**: `statReveal`, `wordBlast`
- **brand**: `logoLockup`, `logoReveal`, `wordmarkAssemble`
- **close**: `ctaEnd`

## The rules that matter most

`docs/RULES/continuous-object.md` · `docs/RULES/world-turns.md` · `docs/RULES/logo-prominence.md` ·
`docs/RULES/paired-directional-exit.md` · `docs/RULES/video-scale.md` · `docs/RULES/text-on-flat.md` ·
`docs/RULES/banned-defaults.md`. Also read AGENTS.md's "Launch-video rules" section (five standing
rules, checked by the `craft-live.mjs` hook on every save).

## Assets and how to get them

`make sections URL=<site> NAME=<name>` inventories every real section; `make capture` grabs one UI
cluster as an image; `make palette` eyedrops the real colours; `make assets` pulls the real logo (never
a bare `curl`, which writes a zero-byte file on a 404). Crawl every page and view mode, not just the
homepage: the real product often lives one click deeper than the hero.

## `make scaffold TYPE=launch`

```bash
make scaffold OUT=formats/scene/<name>.json TYPE=launch DUR=13
```

Composes `kineticHook -> screenDive -> cardCascade -> statReveal -> logoLockup -> ctaEnd`
(`scripts/author/type-spines.mjs`), cycling `soft/mesh/spotlight/accent` bg presets and a
fade-then-cinematicZoom cut family. `screenDive`/`logoLockup` need real `image`/`mark` paths: the
scaffold marks them `REPLACE:` since it cannot invent an asset for you.

## What the judge weighs for this type

Does the captured UI look like the real product (not a redraw)? Does the brand mark get real screen
time? Is there one thing the eye can follow across every cut? Does the backdrop actually change tone,
not just texture? Is the payoff a real fact, not a slogan?

## The worked example

`verify/evals/briefs/launch.json` (13s, 16:9). Shows: a real captured still
(`assets/brands/vawe/stills/glass-hero.png`) carrying the build beat, a real engine fact (5 canvases)
as the payoff instead of a slogan, the wave mark's own beat (drawn on, not a bullet), and a wordmark
that travels bottom-left across every cut as the continuous object.
