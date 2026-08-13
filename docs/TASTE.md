---
when: you are about to make something and want the front door to the taste system
answers: "the one law (every frame must fight for its value) · the spines · the block registry · the author→gate→render loop"
group: crosscutting
---

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
| **Film structure** | *What holds this film together across its cuts?* | [`CRAFT/FILM-STRUCTURE.md`](CRAFT/FILM-STRUCTURE.md) — the catalogue: ~18 devices in four registers (spatial · verbal and aural · temporal · conceptual), what each one survives, when it fails, and a six-question decision aid. Read it before you pick. Carry two threads, not one. |
| **Continuous action** | *Why does my plan read as three unrelated cards?* | [`vawe-continuous-action`](../.claude/skills/vawe-continuous-action/SKILL.md) · ONE of those devices, worked end to end: one object that transforms across every cut. Diegetic motion (the product doing its job), the measured 5-second budget, and the anti-slop checks you run before a frame renders. Worked from `higgsfield.mp4`. Right for a single-subject product film; wrong for a manifesto or an anthology. |
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
make author-check D=<file> [VS=<brand>]           # THE LADDER. Always on, about a second:
                                                  #   validate (schema + em-dash) · beats (timeline holes)
                                                  #   assets (referenced files exist) · inspect + plan-vs-render
                                                  # These catch BROKEN. Waive a deliberate break with
                                                  # {"authoring":{"allow":[...]}}. STRICT=1 makes warnings block.

TASTE=1 make author-check D=<file> [VS=<brand>]   # ...plus the STYLE gates, which are opinions:
                                                  #   critique · direct · floor · dissolve · slop
                                                  #   designspec · copy
```

The style half is **off by default**. The run tells you it skipped them and how to run them. Read the
next section before you assume that is a lowered bar: it is the opposite.

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

## What was culled, and why (2026-08)

A gate is worth having when it tells the truth cheaply. Two things were found to be true of this
repo's style gates at once, and they pull in opposite directions from "be stricter".

**`visual-vocabulary` was DELETED.** It asked whether a film shows anything or is only type, and it
answered with an area. The area came from `boxOf` in `scripts/gates/scene-timing.mjs`, which had a
`proxy` tier: a layer declaring one axis and carrying no readable intrinsic aspect was **squared**.
A 590x18 decorative underline was measured as 590x590 and credited with about a tenth of the frame.
So the gate passed the exact defect it existed to catch, on the exact quantity it existed to measure.
It was also waived by 30 of 130 films. Making the measurement honest would have made the rule true and
then failed about 52 films nobody is going to rebuild, which is another way of saying the rule was
already repealed and nobody wrote it down. The `proxy` tier went with it.

**Seven gates were switched OFF BY DEFAULT, not deleted:** `critique`, `direct` (motion-director),
`floor` (direction-floor), `dissolve`, `slop`, `designspec`, `copy`. Every file is still here and
still runs under `TASTE=1`. Nothing about them is dishonest. They are *fitted*, to a library this
repo's own doctrine calls debt, and a fitted rule left switched on stops raising the floor and starts
teaching the waiver keyword. `direction-floor` blocked 38 of 130 shipped scenes.

**Nothing that catches BROKEN was touched:** `validate`, `beat-check`, `asset-check`, `probe` /
`scene-snap` / `canvas-purity`, `seam-check`, `audit`, `schema-drift`, `gate-mutation`, plan-vs-render.

Measured across the library, before and after: 36 scenes moved FAIL to PASS, and none moved PASS to
FAIL. Every one of the 36 was blocked by `plain-slideshow`, `no-visual-vocabulary`, or both.

### What would have to be true to switch one back on by default

Answer all three, in writing, before you move a gate back:

1. **Name what it measures and show the measurement is right.** Not the rule, the number. `boxOf`
   looked right for a year. Write the fixture that proves the number, and pin it in `gate-mutation`.
2. **Run the whole library and publish the count.** A gate that fails a quarter of the shipped work
   is not a floor, it is a tax. Either fix the films first or accept that it is opt-in.
3. **Say what a green tick would then mean, and what it still would not.** `visual-vocabulary` could
   prove a picture was on screen and large. It could never prove the picture explained anything, and
   its own header said so, and it was treated as the show-don't-tell floor anyway.

And the rule that produced this cull, which is worth keeping whichever way it points: **when
satisfying a gate would make the film worse, go and read what the gate actually measures.**

## Anti-slop discipline (the defaults to reach past)

The enforcement lives in `.claude/skills/{taste-skill, impeccable}` — dials + a 41-rule detector.
The doctrine, in one breath: **asymmetry over centered · scale contrast (one huge hero + tiny
caption) · a committed non-generic face (the real brand font) · real assets over emoji · colour only
from the brand · patterns as seasoning, never wallpaper · no em-dashes on screen.** CRAFT tells you
what to do; `make designspec-check` checks you did it; this doc tells you the loop that ties it together.
