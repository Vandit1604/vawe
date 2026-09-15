---
when: you are about to make something and want the front door to the taste system
answers: "the one law (every frame must fight for its value) · the spines · the block registry · the author→gate→render loop"
group: crosscutting
---

# TASTE: how to make something good in this engine

## AGENT SUMMARY

- The one law: every frame must fight for its value. Show something true (a real artifact, a live
  demo, a proof); cut a beat if the viewer loses nothing when it's gone.
- Route through the three spines (house-style, composition, motion, direction, film structure,
  story-spine) before authoring from your own priors.
- Enforced by `make author-check D=<file>` every time (BLOCKS: validate, beats, inspect,
  plan-vs-render; REPORTS: critique, direct, floor, dissolve, designspec, copy, pace, hero,
  treatment, waiver-drift, promoted to blocking by `TASTE=1`), then post-render `make judge`.
- `floor` (direction-floor.mjs) also reports whether THIS film is a template: `library-top5-only`
  (its whole vocabulary sits inside the handful of families the library already leans on hardest,
  barely touched) and `uniform-cadence` (every staggered reveal shares one spacing value). Both are
  measured against the library, not a chosen constant, and both name what to reach for instead.
- Checkable action: does every design decision trace to the brand's real site or the locked plan, not
  to a default?

The front door. Read this before authoring anything; it routes you to the specific guides and names
the loop that catches slop. It exists because the taste knowledge is (correctly) split across many
files, and without an index an agent authors from its own priors, which regress to the mean.

> **The one law:** *every frame must fight for its value.* If you cut a beat and the viewer loses
> nothing, it was slop. A frame earns its place by **showing** something true (a real artifact, a live
> demo, a proof), not by **saying** it (a word in a box). Produced, not generated.

**Competent is not the same as directed.** Same tool, same primitives, same defaults produces the same
film: that is not a guess, it is why any tool with a fixed effect library needs an anti-template check
against its own showcase. `library-top5-only` (above) is this engine's version of that check, and the fix is
always the same shape: reach for a family fewer films already use. [`CRAFT/AFTER-EFFECTS-TECHNIQUES.md`](CRAFT/AFTER-EFFECTS-TECHNIQUES.md)
names 26 real procedures with a HAVE/PARTLY/LACK verdict against this engine; `direction-floor.mjs`
reads that table live and cites the recipe by name when it names something to reach for, so the table
answers "what do I use for this" instead of sitting there for you to remember to open.

**The numbers behind these spines, one rule per file:** [`RULES/INDEX.md`](RULES/INDEX.md). The
contract every scene obeys, plus a table of atomic rules (motion offsets, ease direction, stagger
caps, video scale, banned defaults, and more), each with a right-JSON recipe and a wrong-JSON
anti-pattern.

## The three spines (what "taste" decomposes into)

Great video-making is three separable decisions: house-style, composition, and story. This engine
covers all three: here's where each lives.

| Spine | The question | Load |
|---|---|---|
| **House-style** | *How should it look?*: face, palette, shape, imagery | [`CRAFT/`](CRAFT/README.md) → TYPOGRAPHY · COLOR · LAYOUT · IMAGERY |
| **Composition** | *How do I fill a frame so it reads produced?*, density, hierarchy, metadata | [`CRAFT/DENSITY.md`](CRAFT/DENSITY.md) (hero + support + metadata triad) |
| **Motion** | *How should it move?* | [`MOTION-CRAFT.md`](MOTION-CRAFT.md) (10 rules + effect-selection) · [`MOTION-SNIPPETS.md`](MOTION-SNIPPETS.md) (copy-paste snippet index) |
| **Direction** | *Why does it read amateur when every layer renders fine?*, pacing, restraint, story placement | [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md). The spine that turns effects into a directed film; every rule sourced to its book + tagged by which gate enforces it |
| **Film structure** | *What holds this film together across its cuts?* | [`CRAFT/FILM-STRUCTURE.md`](CRAFT/FILM-STRUCTURE.md). The catalogue: ~18 devices in four registers (spatial · verbal and aural · temporal · conceptual), what each one survives, when it fails, and a six-question decision aid. Read it before you pick. Carry two threads, not one. |
| **Continuous action** | *Why does my plan read as three unrelated cards?* | [`vawe-continuous-action`](../skills/vawe-continuous-action/SKILL.md) · ONE of those devices, worked end to end: one object that transforms across every cut. Diegetic motion (the product doing its job), the measured 5-second budget, and the anti-slop checks you run before a frame renders. Worked from `higgsfield.mp4`. Right for a single-subject product film; wrong for a manifesto or an anthology. |
| **Story-spine** | *Why these beats, in this order?* | [`CRAFT/STORY.md`](CRAFT/STORY.md). The spine, beat-role→persuasion→feeling, named spines + timing (hook → suspense → payoff; never spoil; build to a shocker). The [`vawe-video-planning`](../skills/vawe-video-planning/SKILL.md) skill applies it. |

> **Never authored one from scratch (no brand site)?** Follow [`CRAFT/AUTHORING-WALKTHROUGH.md`](CRAFT/AUTHORING-WALKTHROUGH.md):
> the one narrative that carries a single video from a blank page to shipped, chaining the whole
> arsenal in the order you actually use it. It's the front-to-back companion to the reference docs below.

Every design decision must trace to the **brand's real site**, not your defaults. Colours by eyedrop
(`make palette`), dominance by *looking*, copy from the brand's own words. Two brands differ because
their sites differ, not because a preset changed. Recurring failures: [`MISTAKES.md`](MISTAKES.md).

## Per-brand house style (remembered taste)

The spines above are *general* craft. A brand's *specific* taste is persisted once as
`assets/brands/<brand>/house-style.md`: its Design Read as declarative rules (dominance · faces ·
palette · motion · shape · signature details · **NEVERs**). The planning skill **reads it first** so taste
isn't re-derived every video and every render for that brand stays consistent. Generate/refresh it with
`make house-style NAME=<brand>` (measured facts auto-fill from the theme; sharpen the judgment lines by
hand). This is the engine's brand memory. The thing that makes the second video for a brand fast and the
tenth still on-brand. Example: [`assets/brands/argus/house-style.md`](../assets/brands/argus/house-style.md).

## The block registry (our component library)

Don't author beat structure from scratch: that's where beats regress to hollow. Compose from
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
a film? Define a **comp** once and instance it (`{type:"comp"}`), same file, many placements.

A block earns its place only if it makes a beat *demonstrate* something. Decorative tiles are slop.

## The quality loop (author → gate → render, never skip the gate)

Planning and generating are two phases with a hard gate between them. Author against a **locked**
plan (the planning skill's lock sheet), then run the mandatory ladder. **One command runs the whole
static loop**, and `make video` runs it for you (skip only with an explicit `NOCHECK=1`), so an
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

`storyboard` is one of several exceptions in that second row with their own mechanism: `HARD_CODES` in
`quality/gates/author-check.mjs` names a set of codes that BLOCK whenever they fire and the scene has
not waived them, in every mode, whatever tier their own step sits in. See "Hard codes, and waivers, not
legacy" below.

**Why the second row is not a lowered bar.** Measured on this library the day the split was written:
give the REPORTS tier teeth and **116 of 141 scenes fail** (last measured; run
`node quality/gates/waiver-drift.mjs` for the current count). Four films in five. `CLAUDE.md` already
names what happens next, and it has happened here twice: a rule that fires on most of the library gets
waived by reflex, and a rule waived by reflex has already been repealed with nobody writing it down.
So the step became mandatory and the severity did not move. Making a step optional protected the rule
from ever being read; it never protected the author from a rule fitted to the wrong library.

**The storyboard step, and its promotion condition.** Step 2 of `plan-vs-render` looks for a
storyboard every run and says what it found. A scene declares its plan explicitly:

```json
{ "storyboard": "films/scene/my-film.storyboard.md" }
```

Without that field the step falls back to the naming convention: `<base>.storyboard.md` beside the
scene, then `_concepts/<base>.storyboard.md`. Find one and it runs `storyboard-check` over it. Find
none and it reports `no-storyboard`.

### Hard codes, and waivers, not legacy
<!-- doc-refs-allow: quality/gates/legacy-manifest.json · this section records that the file is gone -->

There used to be a RATCHET here: a rule that fires on most of the library on day one was recorded as
**LEGACY** in a generated manifest (`quality/gates/legacy-manifest.json`), with the rule and the date, so
new work had to comply while the past was excused "by the calendar". That was a THIRD excuse mechanism
sitting beside `authoring.allow` + `_why` (a person decided, and wrote why) and the ratchet engine that
read the manifest (`RATCHET_CODES` / `RATCHET_RULES` / `gateForCode` / `codeFiresOn`, ~340 lines in
`quality/gates/author-check.mjs`). Two systems saying "this rule does not apply here" is exactly the
drift the rest of this repo's doctrine warns against, and an audit measured what it cost:

**Measured, before any cut (164 gate-visible scenes, 2026-09-07; `node quality/gates/waiver-drift.mjs`
for the current count).** `fires` is legacy-or-new together (the rule's true trip rate); `unwaived-new`
is what was actually, live, blocking a real render on that day:

| code | fires | share | legacy | unwaived-new |
|---|---|---|---|---|
| no-preflight | 164 | 100% | 125 | 36 |
| no-storyboard | 137 | 84% | 94 | 32 |
| sparse-beats | 95 | 58% | 93 | **0** |
| no-transition | 89 | 54% | 88 | 1 |
| feature-poverty | 76 | 46% | 76 | 0 |
| static-bg | 68 | 41% | 68 | 0 |
| plain-slideshow | 53 | 32% | 42 | 3 |
| craft-unvisited | 24 | 15% | 24 | 0 |
| no-continuous-object | 17 | 10% | 0 | 7 |
| no-authored-motion | 16 | 10% | 13 | 3 |
| effect-soup | 5 | 3% | 5 | 0 |
| enter-and-retreat | 5 | 3% | 4 | 1 |
| restated-headline | 5 | 3% | 4 | 1 |
| linear-motion | 3 | 2% | 2 | 0 |
| monotone-timing | 2 | 1% | 2 | 0 |
| crossfade-mud / off-font / jargon | 0 | 0% | 0 | 0 |

Separately, `no-plan-for-craft` (never adopted into the ratchet at all) fired on **136 of 164 (83%)
with ZERO waivers anywhere**, because it duplicated `no-storyboard` under a looser, inconsistent check
(a sibling `<base>.storyboard.md` only, not a scene's declared `storyboard` field) and exited before the
craft checklist could even run.

**Two codes were retired rather than folded**, because folding would have been ceremony over a rule that
had already stopped meaning anything:
- **`sparse-beats`**: fires on 58% of the library and every single occurrence was already legacy or
  waived (0 unwaived-new). A rule with zero live enforcement anywhere is not excused, it is decoration.
  Removed from `HARD_CODES`; `direction-floor.mjs` still emits the finding as a plain report.
- **`no-plan-for-craft`**: folded into `craft-unvisited` instead, in `quality/gates/craft-checklist.mjs`.
  No storyboard now just means every relevant CRAFT doc reads as unanswered, which `craft-unvisited`
  already measured correctly; the duplicate exit path is gone.

**Every other row folded.** `quality/gates/legacy-fold.mjs` walked every row the manifest held and, for
each scene that still fires the rule, wrote it into that scene's own `authoring.allow` + `_why`:

```json
"_why": { "no-storyboard": "legacy: grandfathered 2026-08-21, adopted 2026-08-21 (the film has a written plan (a storyboard, declared or found beside it))" }
```

563 waivers were written across 157 scenes this way (9 rows dropped because the scene now complies or
was deleted; 12 already covered by a real waiver). The manifest and the ratchet engine that read it were
then deleted from `author-check.mjs`, and `quality/gates/legacy-manifest.json` itself was deleted.

**One excuse mechanism now.** `HARD_CODES` names the same codes the ratchet used to (minus the two
retired above): a code fires, the scene has not waived it, the run stops. No manifest, no census, no
legacy state, because those questions were about the library over time and the library is already
folded. `authoring.allow` + `_why` is the only door out, for old debt and a deliberate new exception
alike:

```
  ○ storyboard  waived (no-storyboard) · somebody decided, and said why
```

Only one glyph now. `▪ LEGACY` (nobody has looked yet) is retired along with the mechanism it named.

**A waiver can now name the ONE instance it excuses.** A bare entry, `"dead-air"`, still excuses that
code for the WHOLE FILM, forever, whatever finding fires under it, unchanged from everything above. That
was measured to cost something real: a new 1.0:1 contrast defect on a NEW beat rode through as
`(waived)` under an excuse written for a different beat, because a bare waiver cannot tell one finding
of its code from another. An entry may instead write `"<code>@<instance>"`, where instance is exactly
what that code's own finding already calls `at` (`harness/lib/findings.mjs`): a beat's timestamp
(critique, inspect), a layer or asset path (asset-check), whatever the gate already names. Nothing here
invents an identifier a finding cannot produce, so a code whose gate never sets `at` (most of
`HARD_CODES` today: `plain-slideshow`, `static-bg`, `no-continuous-object`, `crossfade-mud` and the
rest, none of them tag an instance yet) can only be waived bare, and `harness/lib/waivers.mjs` says so
rather than pretending the scoped form did something:

```json
"authoring": {
  "allow": ["placeholder-word@0.0s"],
  "_why": { "placeholder-word@0.0s": "the opening slate is deliberately a stand-in title card" }
}
```

`_why` keys the ENTRY, bare or scoped, never the bare code underneath a scoped one. A second
`placeholder-word` at `3.0s` is then a NEW finding, unwaived, exactly as if nothing had been written for
the first.

Because a bare waiver still hides everything, `author-check` prints what it is hiding every time one is
live:

```
  film-wide waiver: craft-unvisited (excuses 10 finding(s), no instance data to name them)
```

`quality/gates/waiver-drift.mjs` reports the same thing per scene, and `--suggest <scene.json>` prints
the scoped entries that would replace a bare waiver with exactly today's findings, for the codes whose
gate already names an instance; for the rest it says plainly that bare is the only shape the code has.
It never rewrites the file.

**Any rule can join `HARD_CODES`.** No probe needs to be cheap and pure any more, because nothing
re-evaluates the whole library at check time: a code's severity is a Set lookup against the codes the
ladder's own steps already produced for THIS scene. `harness/lib/finding-codes.mjs` still derives which
gate owns a code, so a hand-kept map cannot rot the first time a rule moves file.

**Re-running the fold.** Scenes are gitignored, so a fresh clone has never run
`quality/gates/legacy-fold.mjs` and does not need to: there is no manifest left to fold FROM. The script
stays in the repo as the record of how the migration was done, and because a future rule that goes
straight to `HARD_CODES` after a maintenance sweep can use the same shape by hand: write the waiver into
the scene, with a `_why` a person could have written.

These are the `make judge` / `make ledger` phases of the one spine in
[`AGENTS.md`](../AGENTS.md#the-process-has-one-owner-and-it-is-not-this-file) ("THE PROCESS HAS ONE
OWNER"): `preflight` → `dev`/`studio` → `check` → `ship` (which runs `author-check` → render → `audit`
→ `seam-check`) → `judge` → `ledger`. The eyeball + memory rungs below are read UNDER `judge`, not a
separate ladder (not chained: you must look):

```bash
make studio   D=<file>              # LIVE scrubbable preview + TIMELINE (bars, ramps, cuts, dead-air bands)
make beats    D=<file> VS=<brand>   # eyeball first/mid/last of every beat, stacked beside the source
make reveal   D=<file>              # the ENTER + settled + EXIT arc per beat (how it animates IN)
make audit                          # overlap / clipped text / safe-zone / WCAG contrast
make ledger   D=<file>              # cross-video sameness, fails if it repeats a shipped design
make judge    D=<file> VS=<brand>   # THE GATE THAT SEES, vision rubric on the near-final cut (JUDGE.md)
```

`make author-check` is necessary but **not sufficient**: the static gates can't see composition,
centering, or asset fidelity. After rendering you must run `make judge` ([`JUDGE.md`](JUDGE.md)), it
preps the key frames + brand house-style + a rubric and the agent scores them. If your eye catches a
flaw, it's a FIX; never rationalize one you noticed ([`MISTAKES.md`](MISTAKES.md) #15).

If you find yourself *trying things* in the JSON, the plan wasn't locked. Go lock it. If a beat needs
a decision the plan didn't make, that's a plan gap. Amend the plan, don't improvise in the JSON.

## What was culled, and why (2026-08)

A gate is worth having when it tells the truth cheaply. Two things were found to be true of this
repo's style gates at once, and they pull in opposite directions from "be stricter".

**`visual-vocabulary` was DELETED.** It asked whether a film shows anything or is only type, and it
answered with an area. The area came from `boxOf` in `quality/gates/scene-timing.mjs`, which had a
`proxy` tier: a layer declaring one axis and carrying no readable intrinsic aspect was **squared**.
A 590x18 decorative underline was measured as 590x590 and credited with about a tenth of the frame.
So the gate passed the exact defect it existed to catch, on the exact quantity it existed to measure.
It was also waived by 30 of 130 films at the time of the cull. Making the measurement honest would have
made the rule true and then failed dozens of films nobody is going to rebuild, which is another way of
saying the rule was already repealed and nobody wrote it down. The `proxy` tier went with it. Both
figures are HISTORICAL and neither can be re-run: the gate is gone and the scenes were cleaned, so
`node quality/gates/waiver-drift.mjs` finds one `no-visual-vocabulary` waiver left today, flagged DEAD.

**Seven gates were switched OFF BY DEFAULT, not deleted:** `critique`, `direct` (motion-director),
`floor` (direction-floor), `dissolve`, `designspec`, `copy`, `pace`.
**That opt-in was REVERSED in 2026-08-21, and only halfway on purpose.** All seven run on every scene
again. What did not come back is their teeth: their findings report, and `TASTE=1` promotes them. The
cull's reasoning was about severity and it had been applied to existence, which is a different and
worse thing: a step nobody runs is a step nobody reads, and the seven had been silent for weeks. See
"One process, two severities" above for the measured cost of promoting them (116 of 141 scenes fail,
last measured; run `node quality/gates/waiver-drift.mjs` for the current count).
<!-- doc-refs-allow: quality/gates/slop.mjs · this line records that the script is gone -->
`slop` is not among them: it was RETIRED, not switched off, its script `quality/gates/slop.mjs` was
deleted, and this list named it as a live opt-in step for months.
Nothing about them is dishonest. They are *fitted*, to a library this
repo's own doctrine calls debt, and a fitted rule left switched on stops raising the floor and starts
teaching the waiver keyword. `direction-floor` blocked 38 of 130 shipped scenes (last measured; run
`node quality/gates/waiver-drift.mjs` for the current count).

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

The enforcement lives in `skills/{taste-skill, impeccable}`, dials + a 41-rule detector.
The doctrine, in one breath: **asymmetry over centered · scale contrast (one huge hero + tiny
caption) · a committed non-generic face (the real brand font) · real assets over emoji · colour only
from the brand · patterns as seasoning, never wallpaper · no em-dashes on screen.** CRAFT tells you
what to do; `make designspec-check` checks you did it; this doc tells you the loop that ties it together.
