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
| **Motion** | *How should it move?* | [`MOTION-CRAFT.md`](MOTION-CRAFT.md) (10 rules + effect-selection) |
| **Story-spine** | *Why these beats, in this order?* | the [`vawe-video-planning`](../.claude/skills/vawe-video-planning/SKILL.md) skill — hook → suspense → payoff; never spoil; build to a shocker |

Every design decision must trace to the **brand's real site**, not your defaults. Colours by eyedrop
(`make palette`), dominance by *looking*, copy from the brand's own words. Two brands differ because
their sites differ — not because a preset changed. Recurring failures: [`MISTAKES.md`](MISTAKES.md).

## Per-brand house style (remembered taste)

The spines above are *general* craft. A brand's *specific* taste is persisted once as
`engine/assets/brands/<brand>/house-style.md` — its Design Read as declarative rules (dominance · faces ·
palette · motion · shape · signature details · **NEVERs**). The planning skill **reads it first** so taste
isn't re-derived every video and every render for that brand stays consistent. Generate/refresh it with
`make house-style NAME=<brand>` (measured facts auto-fill from the theme; sharpen the judgment lines by
hand). This is the engine's brand memory — the thing that makes the second video for a brand fast and the
tenth still on-brand. Example: [`engine/assets/brands/creed/house-style.md`](../engine/assets/brands/creed/house-style.md).

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
plan (the planning skill's lock sheet), then run the ladder — each rung catches a failure mode a
human would otherwise catch per-scene:

```bash
make critique D=<file>       # VALUE GATE — placeholder words, unbacked claims, thin/lonely beats
make slop     D=<file>       # anti-slop detector (overused font / gradient / card-in-card / centered)
make inspect  D=<file>       # does the scene actually show what its .intent.json promises?
make beats    D=<file> VS=<brand>   # eyeball first/mid/last of every beat, stacked beside the source
make audit                   # overlap / clipped text / safe-zone / WCAG contrast
make ledger   D=<file>       # cross-video sameness — fails if it repeats a shipped design
make judge    D=<file> VS=<brand>   # THE GATE THAT SEES — vision rubric on the near-final cut (JUDGE.md)
```

The static gates can't see composition, centering, or asset fidelity — `make judge` ([`JUDGE.md`](JUDGE.md))
preps the key frames + brand house-style + a rubric and the agent scores them. If your eye catches a flaw,
it's a FIX; never rationalize one you noticed ([`MISTAKES.md`](MISTAKES.md) #15).

If you find yourself *trying things* in the JSON, the plan wasn't locked. Go lock it. If a beat needs
a decision the plan didn't make, that's a plan gap — amend the plan, don't improvise in the JSON.

## Anti-slop discipline (the defaults to reach past)

The enforcement lives in `.claude/skills/{taste-skill, impeccable}` — dials + a 41-rule detector.
The doctrine, in one breath: **asymmetry over centered · scale contrast (one huge hero + tiny
caption) · a committed non-generic face (the real brand font) · real assets over emoji · colour only
from the brand · patterns as seasoning, never wallpaper · no em-dashes on screen.** CRAFT tells you
what to do; `make slop` checks you did it; this doc tells you the loop that ties it together.
