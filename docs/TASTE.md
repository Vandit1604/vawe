# TASTE — how to make something good in this engine

The front door. Read this before authoring anything; it routes you to the specific guides and names
the loop that catches slop. It exists because the taste knowledge is (correctly) split across many
files, and without an index an agent authors from its own priors — which regress to the mean.

> **The one law:** *every frame must fight for its value.* If you cut a beat and the viewer loses
> nothing, it was slop. A frame earns its place by **showing** something true (a real artifact, a live
> demo, a proof), not by **saying** it (a word in a box). Produced, not generated.

## The three spines (what "taste" decomposes into)

Great video-making is three separable decisions. another engine names them house-style / composition /
story; we have all three — here's where each lives.

| Spine | The question | Load |
|---|---|---|
| **House-style** | *How should it look?* — face, palette, shape, imagery | [`CRAFT/`](CRAFT/README.md) → TYPOGRAPHY · COLOR · LAYOUT · IMAGERY |
| **Composition** | *How do I fill a frame so it reads produced?* — density, hierarchy, metadata | [`CRAFT/DENSITY.md`](CRAFT/DENSITY.md) (hero + support + metadata triad) |
| **Motion** | *How should it move?* | [`MOTION-CRAFT.md`](MOTION-CRAFT.md) (10 rules + effect-selection) · [`MOTION-RECIPES.md`](MOTION-RECIPES.md) (copy-paste recipe index) |
| **Direction** | *Why does it read amateur when every layer renders fine?* — pacing, restraint, story placement | [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md) — the spine that turns effects into a directed film; every rule sourced to its book + tagged by which gate enforces it |
| **Continuous action** | *Why does my plan read as three unrelated cards?* | [`vawe-continuous-action`](../.claude/skills/vawe-continuous-action/SKILL.md) · for any film under ~15s, plan ONE object that transforms across every cut instead of a sequence of beats. Diegetic motion (the product doing its job), the measured 5-second budget, and the anti-slop checks you run before a frame renders. Worked from `higgsfield.mp4`. |
| **Story-spine** | *Why these beats, in this order?* | [`CRAFT/STORY.md`](CRAFT/STORY.md) — the spine, beat-role→persuasion→feeling, named spines + timing (hook → suspense → payoff; never spoil; build to a shocker). The [`vawe-video-planning`](../.claude/skills/vawe-video-planning/SKILL.md) skill applies it. |

> **Never authored one from scratch (no brand site)?** Follow [`CRAFT/AUTHORING-WALKTHROUGH.md`](CRAFT/AUTHORING-WALKTHROUGH.md)
> — the one narrative that carries a single video from a blank page to shipped, chaining the whole
> arsenal in the order you actually use it. It's the front-to-back companion to the reference docs below.

Every design decision must trace to the **brand's real site**, not your defaults. Colours by eyedrop
(`make palette`), dominance by *looking*, copy from the brand's own words. Two brands differ because
their sites differ — not because a preset changed. Recurring failures: [`MISTAKES.md`](MISTAKES.md).

## Per-brand house style (remembered taste)

The spines above are *general* craft. A brand's *specific* taste is persisted once as
`assets/brands/<brand>/house-style.md` — its Design Read as declarative rules (dominance · faces ·
palette · motion · shape · signature details · **NEVERs**). The planning skill **reads it first** so taste
isn't re-derived every video and every render for that brand stays consistent. Generate/refresh it with
`make house-style NAME=<brand>` (measured facts auto-fill from the theme; sharpen the judgment lines by
hand). This is the engine's brand memory — the thing that makes the second video for a brand fast and the
tenth still on-brand. Example: [`assets/brands/creed/house-style.md`](../assets/brands/creed/house-style.md).

## The block registry (our component library)

Don't author beat structure from scratch — that's where beats regress to hollow. Compose from
**blocks**: vetted, deterministic, pre-tasteful factories (like a shadcn registry, but each returns
scene-layer JSON). Browse them, drop one in, fill its props.

```bash
make catalog                 # render every block on paged stages → eyeball the arsenal
```
```json
{ "type": "block", "block": "chart.donut", "x": 1200, "y": 400, "start": 3, "dur": 4 }
```

A block is the **support** (a live demo / stat / chart) that proves the hero's claim; add a dim mono
readout as **metadata**. See [`BLOCKS.md`](BLOCKS.md) for the catalog. Need a cluster reused across
a film? Define a **comp** once and instance it (`{type:"comp"}`) — same file, many placements.

A block earns its place only if it makes a beat *demonstrate* something. Decorative tiles are slop.

## The quality loop (author → gate → render, never skip the gate)

Planning and generating are two phases with a hard gate between them. Author against a **locked**
plan (the planning skill's lock sheet), then run the mandatory ladder. **One command runs the whole
static loop** — and `make video` runs it for you (skip only with an explicit `NOCHECK=1`), so an
effect-soup video can no longer ship silently:

```bash
make author-check D=<file> [VS=<brand>]   # THE MANDATORY LADDER — chains the four below + inspect:
                                          #   validate · critique (value) · direct (direction) · slop
                                          # blocks on schema/em-dash, hollow beats, and the direction
                                          # tells (linear-motion · monotone-timing · enter-and-retreat ·
                                          # effect-soup · ≥3 cut families). Waive a deliberate break with
                                          # {"authoring":{"allow":[...]}}. STRICT=1 makes warnings block.
```

Then the eyeball + memory rungs (not chained — you must look):

```bash
make studio   D=<file>              # LIVE scrubbable preview + TIMELINE (bars, ramps, cuts, dead-air bands)
make beats    D=<file> VS=<brand>   # eyeball first/mid/last of every beat, stacked beside the source
make reveal   D=<file>              # the ENTER + settled + EXIT arc per beat (how it animates IN)
make audit                          # overlap / clipped text / safe-zone / WCAG contrast
make ledger   D=<file>              # cross-video sameness — fails if it repeats a shipped design
make judge    D=<file> VS=<brand>   # THE GATE THAT SEES — vision rubric on the near-final cut (JUDGE.md)
```

`make author-check` is necessary but **not sufficient**: the static gates can't see composition,
centering, or asset fidelity. After rendering you must run `make judge` ([`JUDGE.md`](JUDGE.md)) — it
preps the key frames + brand house-style + a rubric and the agent scores them. If your eye catches a
flaw, it's a FIX; never rationalize one you noticed ([`MISTAKES.md`](MISTAKES.md) #15).

If you find yourself *trying things* in the JSON, the plan wasn't locked. Go lock it. If a beat needs
a decision the plan didn't make, that's a plan gap — amend the plan, don't improvise in the JSON.

## Anti-slop discipline (the defaults to reach past)

The enforcement lives in `.claude/skills/{taste-skill, impeccable}` — dials + a 41-rule detector.
The doctrine, in one breath: **asymmetry over centered · scale contrast (one huge hero + tiny
caption) · a committed non-generic face (the real brand font) · real assets over emoji · colour only
from the brand · patterns as seasoning, never wallpaper · no em-dashes on screen.** CRAFT tells you
what to do; `make slop` checks you did it; this doc tells you the loop that ties it together.
