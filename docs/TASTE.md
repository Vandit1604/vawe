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
make author-check D=<file> [VS=<brand>]           # THE LADDER. Every step, every time (15 or 16 of
                                                  # them: the intent sidecar and a landscape canvas each
                                                  # add one).
                                                  # BLOCKS:  validate · beats · inspect · plan-vs-render
                                                  #          (assets joins them under STRICT=1)
                                                  # REPORTS: storyboard · critique · direct · floor ·
                                                  #          dissolve · designspec · copy · pace · hero ·
                                                  #          treatment · waiver-drift
                                                  # The run lists them all before it starts, numbers each
                                                  # one as it goes, and says "nothing found" when a step
                                                  # is clean. Measured: 1.4s end to end on a 19.6s film,
                                                  # browser launch included.
                                                  # Waive a deliberate break with the FULL shape. A bare
                                                  # allow array blocks (author-check.mjs):
                                                  #   {"authoring":{"allow":["dead-air"],
                                                  #     "_why":{"dead-air":"why this film is the exception"}}}
                                                  # STRICT=1 makes warnings block.

TASTE=1 make author-check D=<file> [VS=<brand>]   # same steps; the style findings now BLOCK.
```

## One process, two severities

There is no optional half any more. Every step runs on every scene, every time, and prints what it
checked and what it found. What is not uniform is what a finding **costs**:

| Tier | Steps | Effect |
|---|---|---|
| **BLOCKS** | validate · beats · inspect · plan (+ assets under `STRICT=1`) | the film is broken; the run stops |
| **REPORTS** | storyboard · critique · direct · floor · dissolve · designspec · copy · pace · hero · treatment · waiver-drift | printed in full, never a wall; `TASTE=1` promotes them |

`storyboard` is the exception in that second row, and the exception has a mechanism: it BLOCKS on any
film that is not grandfathered, in every mode. See "The ratchet" below.

**Why the second row is not a lowered bar.** Measured on this library the day the split was written:
give the REPORTS tier teeth and **116 of 141 scenes fail**. Four films in five. `CLAUDE.md` already
names what happens next, and it has happened here twice: a rule that fires on most of the library gets
waived by reflex, and a rule waived by reflex has already been repealed with nobody writing it down.
So the step became mandatory and the severity did not move. Making a step optional protected the rule
from ever being read; it never protected the author from a rule fitted to the wrong library.

**The storyboard step, and its promotion condition.** `plan-vs-render` used to print "write the
storyboard" at a film that had none, and nothing anywhere asked whether one existed. Now step 2 looks
for it, every time, and says what it found. A scene declares its plan explicitly:

```json
{ "storyboard": "formats/scene/my-film.storyboard.md" }
```

Without that field the step falls back to the naming convention: `<base>.storyboard.md` beside the
scene, then `_concepts/<base>.storyboard.md`. Find one and it runs `storyboard-check` over it. Find
none and it reports `no-storyboard`.

### The ratchet: grandfather the past, block new work now

`no-storyboard` fires on **121 of the 132 scenes** in `formats/scene/`. Two answers were considered and
both rejected. **Backfill** writes 121 storyboards to satisfy a gate, and for a judgement rule that is
worse than the red: the number goes green and nobody learns anything. **Wait for a threshold** ("promote
it when under a quarter are missing") leaves the rule toothless for months and depends on a cleanup
nobody is scheduled to do.

So the rule is **ratcheted**. A film that predates it is recorded as **LEGACY** in a generated manifest,
`scripts/gates/legacy-manifest.json`, with the rule and the date. Anything not in that manifest must
comply immediately, and `no-storyboard` BLOCKS on it whether or not `TASTE=1` is set. Legacy films keep
exactly the severity they had before the ratchet existed: reported by default, promoted by `TASTE=1`.
Measured across all 132 scenes, the day it was built: **0 exit codes moved**, in either mode.

**Legacy is not a waiver, and if the two ever read the same the rule has been repealed.** A waiver lives
in the scene, in `authoring.allow` with a `_why`, and it says a person looked at this film and decided
the rule is wrong for it. Legacy lives in a central generated file, carries no reason, and says nobody
has looked yet. They print differently on purpose:

```
  ○ storyboard  waived (no-storyboard) · somebody decided, and said why
  ▪ storyboard  LEGACY (no-storyboard, grandfathered 2026-08-21) · nobody has looked yet
```

**Two numbers, not one.** Every run prints `121 legacy · 11 current · 0 NEW failures`. "0 new failures"
is a thing you can act on. "121 failures" is noise people learn to scroll past, and that habit is the
disease this exists to treat.

**Editing a legacy film costs it the status.** The manifest stores a hash of each film's canonicalised
content, so a reformat is free and a change to what the film IS is not. Touching a film is when you owe
it a plan: the moment the file is open and decisions are being made about it is the cheapest one there
will ever be to write down what it is for. A one-line colour fix does not force a fake storyboard, it
forces one sentence in a waiver, which is a decision the next reader can argue with.

**It only tightens.** `--adopt` freezes a rule's legacy set once and refuses to run twice; `--stamp`
can only remove rows (the film complied, was deleted, or was edited). Nothing adds a row after adoption,
so nobody can grandfather today's film by re-running the command. A hand-kept list would have gone stale
the day it was written, which is `#159`.

```bash
make legacy                       # the census, writes nothing
make legacy ADOPT=<rule>          # freeze today's failures as legacy, once, on promotion day
make legacy STAMP=1               # prune rows that no longer qualify
```

**Any rule can join.** A rule opts in by name in `RATCHET_RULES` (`scripts/gates/author-check.mjs`) with
a probe that says whether one scene fails it. The probe must be cheap and pure, fs and JSON only: the
census runs it across the whole library on every author-check run, so a probe that launched a browser
would cost 132 browsers. A finding that only exists after a child gate has run cannot be ratcheted this
way, and should not be, because its census would go stale between runs.

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
It was also waived by 30 of 130 films at the time of the cull. Making the measurement honest would have
made the rule true and then failed dozens of films nobody is going to rebuild, which is another way of
saying the rule was already repealed and nobody wrote it down. The `proxy` tier went with it. Both
figures are HISTORICAL and neither can be re-run: the gate is gone and the scenes were cleaned, so
`node scripts/gates/waiver-drift.mjs` finds one `no-visual-vocabulary` waiver left today, flagged DEAD.

**Seven gates were switched OFF BY DEFAULT, not deleted:** `critique`, `direct` (motion-director),
`floor` (direction-floor), `dissolve`, `designspec`, `copy`, `pace`.
**That opt-in was REVERSED in 2026-08-21, and only halfway on purpose.** All seven run on every scene
again. What did not come back is their teeth: their findings report, and `TASTE=1` promotes them. The
cull's reasoning was about severity and it had been applied to existence, which is a different and
worse thing — a step nobody runs is a step nobody reads, and the seven had been silent for weeks. See
"One process, two severities" above for the measured cost of promoting them (116 of 141 scenes fail).
<!-- doc-refs-allow: scripts/gates/slop.mjs · this line records that the script is gone -->
`slop` is not among them: it was RETIRED, not switched off, its script `scripts/gates/slop.mjs` was
deleted, and this list named it as a live opt-in step for months.
Nothing about them is dishonest. They are *fitted*, to a library this
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
