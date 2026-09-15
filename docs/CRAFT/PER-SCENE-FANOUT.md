---
when: "\"one agent per scene, writing HTML\" or \"why do my three fragments not read as one film\""
answers: "the lock-step-before-fan-out chain: stagekit, contract, scenes, assemble, and when it is overkill"
group: crosscutting
---

# Per-scene HTML fan-out: lock the contract before you fan out

## AGENT SUMMARY

- HTML renders instantly, so one agent per scene can look at its own fragment and iterate with no
  render wait. The flaw: three agents each writing a perfect fragment produce three unrelated
  pictures, the slideshow failure reached faster and at triple the cost. A shared contract has to
  exist BEFORE the fan-out, not be discovered after it.
- Four commands, in order: `make stagekit D=<film>` (the shared CSS every fragment carries verbatim),
  `make contract D=<film>` (validate the storyboard's continuous-object handoff), `make scenes
  D=<film>` (PRINT one agent brief per scene, launches nothing), `make assemble D=<film>` (write the
  scene JSON once the fragments exist).
- Overkill for a one-scene film, a film with no continuous object, or anything you would author faster
  by hand in one sitting. Read docs/CRAFT/SUBAGENT-BUDGET.md before spending the tokens a real fan-out
  costs.

## Why a shared stylesheet cannot work

Each `html` layer's `<style>` block is wrapped in a prelude-less `@scope { … }`
(`core/type/sanitize-html.js` `scopeStyles`), scoped to that fragment's own subtree. A `<link>` or a
second `<style>` elsewhere in the document cannot reach across fragments. So the only way three scene
agents draw the same card, the same radius, the same type scale is to give each of them the identical
CSS bytes and have each paste them in. `make stagekit D=<film>` generates that block from the film's
own theme (`resolveLook`, `core/registry/theme-contract.js`): one card style, a three-step radius
scale, the theme's own type scale (hook/headline/body/caption), a shadow, and the token names (already
global, set by `applyTheme`) a fragment may reference without redeclaring.

Because the block is pasted verbatim, it is CHECKABLE: `make stagekit D=<film> --check` (or
`node harness/author/stagekit.mjs <film> --check`) reads every `<film>.sceneN.html` fragment and
asserts its kit block is byte-identical to the one `make stagekit` generated. Drift between three
agents' fragments becomes impossible to ship silently rather than merely discouraged.

## The per-scene contract

The contract is not a second planning artefact. It is two fields the storyboard `make scaffold`
already writes now carries on every beat: `object_in` and `object_out`, each
`"<placement>@<w>x<h>"`, a name from the safe-area placement registry (`core/layout/safe.js`
`PLACEMENT`) plus a size in px. `object_in` is the continuous object's state at the start of the
beat; `object_out` is its state at the end. `make contract D=<film>` (`harness/lib/contract.mjs`)
reads the storyboard and refuses to proceed if beat *i*'s `object_out` does not equal beat *i+1*'s
`object_in`, naming both values:

```
✗ beat 1 (Hook) ends at bottom-left@10x10 but beat 2 (Build) starts at bottom-right@10x10.
  The edges must match: fix one beat's object_in or the other's object_out.
```

A placement NAME, not a pixel pair, because the contract has to be something a person reviewing the
storyboard can actually check ("bottom-left, that's the same corner"), and because it stays correct at
whichever aspect the film ends up at. `make scenes D=<film>` refuses to print a single brief until the
chain is clean: handing three agents a contract that does not chain is handing them three disagreeing
instructions, not three that will assemble into one film.

**A POSE, not only a position.** Two optional trailing fields ride the same edge string:
`/rot:<deg>` and `/op:<0-1>`, e.g. `object_out: center@40x26/rot:15/op:0.4`. Before this, `w`/`h` were
parsed and then discarded (`assemble.mjs` only ever built x/y offsets), so a beat could declare a size
and the built film would ignore it. `x`, `y`, `w`, `h`, `rot` and `opacity` are all properties
`layers[].motion[]` can already key (`formats/scene/schema.json`), so `make assemble` now writes
`w`/`h`/`rot`/`opacity` keys whenever the chain actually uses one (a film that states no pose beyond
placement builds the identical track it always did). A pose mismatch at a handoff is a chain error
exactly like a placement mismatch, named on both sides. What this cannot do: a shape morph (rectangle
to pill to circle) needs a keyable corner radius the engine does not expose to `motion[]` yet, so reach
for `morph` or `becomes` directly on a layer for that.

## The motion plan: what else moves

`object_in`/`object_out` cover the one thing that survives every cut. Everything ELSE in a beat, a
headline that pushes in, a card that pops, had no contract at all: a fragment agent invented its own
entrances after the markup was written, `assemble.mjs` never built them, and a storyboard that said
"the headline slides in hard" produced a film where nothing moved.

A beat's `motion:` field (also `harness/lib/contract.mjs`) is one or more `;`-separated entries,
`<selector>@<kind>:<inBand>[/<outBand>]`. `<selector>` is a CSS selector into the fragment's own
markup, the same selector a hand-authored `parts[].select` already takes (`core/motion/parts.js`);
`<kind>` is one of the engine's named part entrances (`growUp`, `fadeUp`, `slide-left`, …); the bands
are the four this repo already names for a duration decision (`docs/RULES/speed-bands.md`: energy,
professional, gravity, cinematic), reused here as the boundary velocity, because a fast (short) exit
lands the next cut on a picture already moving, exactly what the content-aware cut
(`core/timeline/velocity-cut.js`) reads for. `make scenes D=<film>` prints each entry's selector under
"MUST BE ADDRESSABLE": the fragment author is told what has to carry that selector (a `data-part`
attribute, a class) BEFORE writing the markup, not after. `make assemble D=<film>` builds every entry
into `parts[]` on that beat's own scene layer, the same vocabulary a hand-authored parts block already
takes, so nothing here is a second motion mechanism.

## The fan-out: print, never launch

`make scenes D=<film>` prints one brief per scene: which fragment file to write, the kit block to
paste, that scene's exact on-screen copy (do not paraphrase), the continuous object's arrival and
departure state for this scene (the object itself is drawn later by `make assemble`, not by the
fragment), the motion plan's elements the fragment MUST make addressable (see above), the anti-slop
rules from `AGENTS.md`, and the one verify command
(`make preview HTML=<frag> THEME=<name>`). It launches nothing. Whether to spend a real fan-out's
tokens on the briefs it prints is a decision for whoever is running this, per
`docs/CRAFT/SUBAGENT-BUDGET.md`: fewer, larger agents beat one-per-item, and a fan-out that cannot
state in one sentence what a single agent would plausibly have produced is a guess, not a decision.

## Assemble: thin on purpose

`make assemble D=<film>` reads the storyboard's contract and writes the scene JSON: one `html` layer
per scene (`src`-loaded, timed at the beat's start/end, sized to the full canvas so a full-bleed
fragment does not collapse to its wrapper's default near-zero box), that scene's `motion:` entries
built into the layer's own `parts[]`, one continuous-object layer with a hand-keyed `motion` track
built from every edge (resolved to real px through the engine's own `resolveCoords`, never a second
copy of that math), a `bg` window per beat cycling the theme's own `look.backdrop` rotation, and an
explicit `transitions[]` boundary at every beat start.

Two things it gets right that are easy to get wrong by hand:

- **`acrossBeats: true` on the object layer.** `sceneUnits: true` wraps every beat as its own unit, so
  nothing survives a cut unless it opts out (`quality/gates/direction-floor.mjs`
  `no-continuous-object`'s own wrap note). Miss this and the gate reports no continuous object even
  though the layer is right there with a real motion track.
- **`mech: "seam"` on the transitions, not the "cut" a bare `fx` name defaults to.** A `cut` only
  transforms the scene ROOT (one opacity ramp over the whole stack), so two beats with different `bg`
  presets swap hard mid-ramp instead of blending, the exact "hard swap disguised inside a soft
  transition" `quality/gates/seam-forensics.mjs`'s `seam-split` check exists to catch. `seam` is the
  real two-scene GPU blend.
- **A caused junction is staged, not fired flat.** Every html layer carries an `id` (`scene1`,
  `scene2`, …), and `assemble` keeps one SHIFTED schedule the whole file is built from. When beat *i*'s
  `trigger:` names a real cause (`harness/lib/contract.mjs isCausedTrigger`, the same test
  `storyboard-check`'s causal-chain report already uses), 0.05s of REAL time is inserted before that
  beat: every beat keeps its full planned duration (nothing is shrunk to make room), so the film runs
  0.05s longer per caused junction. 0.05s is evidence, not a guess: higgsfield-recreation's own three
  key events land roughly 30ms and 150ms apart. A junction with no stated trigger is left exactly where
  it always was: staging an undocumented cause would be inventing one. `layers[].start` also legally
  accepts a live relative reference (`"otherId.end+0.5"`, 2 of 120 films used it), same for
  `transitions[].at` and `cameraMove[].start`; core/timeline/relative-time.js resolves it to a real
  number at load (`core/engine/expand.js`, before `resolveTempo`), so every gate reads a plain number
  and `assemble` no longer needs to pre-resolve it for them.

`assemble` deliberately does nothing else: no camera, no captions, no authored `cuts`/`sceneUnits`
beyond the two lines above. Everything past that is the engine's, or the next author's, to add.

## Ownership: what a re-assemble keeps, and what it warns about

A real film outgrows the per-beat contract: a hand-keyed height ramp, a `count` layer, a `cameraMove`,
anything the contract has no vocabulary for yet. `assemble` owns what it GENERATES and nothing else.
It stamps `id: scene<N>` on every html layer and `id: object` on the one continuous-object layer it
builds, so its own set is nameable rather than guessed at from shape. Any existing `layers[]` entry
whose `id` is not in that set passes through untouched, appended after the generated layers in its
original relative order, so re-assembling twice in a row with nothing changed reproduces the file
byte-identically. A short allowlist of film-level fields (`cameraMove`, for now) survives the same
way; `duration`, `bg`, `transitions` and `sceneUnits` stay assemble's own and are never resurrected
from a stale scene.

A preserved layer can still go stale: it was timed against beats that have since moved or shrunk.
`assemble` reports every preserved layer and field by name, and warns when a preserved layer's
`[start, start+duration]` window no longer lands inside the film:

```
preserved 1 hand-authored layer(s) the per-beat contract has no vocabulary for: depth-rule
STALE:
  ⚠ "depth-rule" spans 0s–17.5s, outside the new film (0s–17.3s): its beat likely moved or was
    deleted. Review before shipping.
```

A preserved layer that carries `acrossBeats` is flagged as a candidate for the continuous-object
contract, not a permanent exception: once the contract's vocabulary can express what it does (a pose
beyond position, say), it belongs back in the per-beat fields, not hand-maintained forever.

## The film against the plan

`storyboard-check SB=<file>` (`quality/gates/storyboard-check.mjs`) reads the sibling `<film>.json` if
one already exists and compares it against the storyboard's own motion plan and continuous-object
contract, advisory, never a blocker (the film may legitimately not exist yet, or be mid-edit). A beat
whose `motion:` entry names a selector/kind the built layer's `parts[]` does not carry is reported by
name, both the declared and the built value; a continuous-object edge whose resolved px does not match
the built layer's real motion key is reported the same way, and now so is its POSE: a declared size,
rotation or opacity the built key does not carry is named too, the same way `motion-diverges` already
compares a fragment's `parts[]` against the storyboard's `motion:`. Nothing here is a second reader of the
storyboard: it calls the same `parseMotion`/`edges` functions `assemble.mjs` itself calls, so a plan
and a film can only agree or disagree, never each be individually "correct" by two different readings.

## When this is overkill

A one-scene film has nothing to fan out. A film with no continuous object (a manifesto, a vignette
anthology, one holding a different device from `docs/CRAFT/FILM-STRUCTURE.md`) can still use
`stagekit` for a shared look, but `contract`/`scenes`/`assemble` have nothing to chain and nothing to
assemble from beat edges. And for anything you would write faster in one sitting than you would spend
briefing three agents, the four commands are pure overhead: `docs/CRAFT/SUBAGENT-BUDGET.md`'s own
conclusion, one good agent beats a fan-out for sequential, dependent work, applies here at least as
much as anywhere else in this repo.
