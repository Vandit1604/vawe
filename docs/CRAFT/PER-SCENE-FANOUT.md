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
`node scripts/author/stagekit.mjs <film> --check`) reads every `<film>.sceneN.html` fragment and
asserts its kit block is byte-identical to the one `make stagekit` generated. Drift between three
agents' fragments becomes impossible to ship silently rather than merely discouraged.

## The per-scene contract

The contract is not a second planning artefact. It is two fields the storyboard `make scaffold`
already writes now carries on every beat: `object_in` and `object_out`, each
`"<placement>@<w>x<h>"`, a name from the safe-area placement registry (`core/layout/safe.js`
`PLACEMENT`) plus a size in px. `object_in` is the continuous object's state at the start of the
beat; `object_out` is its state at the end. `make contract D=<film>` (`scripts/lib/contract.mjs`)
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

## The fan-out: print, never launch

`make scenes D=<film>` prints one brief per scene: which fragment file to write, the kit block to
paste, that scene's exact on-screen copy (do not paraphrase), the continuous object's arrival and
departure state for this scene (the object itself is drawn later by `make assemble`, not by the
fragment), the anti-slop rules from `AGENTS.md`, and the one verify command
(`make preview HTML=<frag> THEME=<name>`). It launches nothing. Whether to spend a real fan-out's
tokens on the briefs it prints is a decision for whoever is running this, per
`docs/CRAFT/SUBAGENT-BUDGET.md`: fewer, larger agents beat one-per-item, and a fan-out that cannot
state in one sentence what a single agent would plausibly have produced is a guess, not a decision.

## Assemble: thin on purpose

`make assemble D=<film>` reads the storyboard's contract and writes the scene JSON: one `html` layer
per scene (`src`-loaded, timed at the beat's start/end, sized to the full canvas so a full-bleed
fragment does not collapse to its wrapper's default near-zero box), one continuous-object layer with a
hand-keyed `motion` track built from every edge (resolved to real px through the engine's own
`resolveCoords`, never a second copy of that math), a `bg` window per beat cycling the theme's own
`look.backdrop` rotation, and an explicit `transitions[]` boundary at every beat start.

Two things it gets right that are easy to get wrong by hand:

- **`acrossBeats: true` on the object layer.** `sceneUnits: true` wraps every beat as its own unit, so
  nothing survives a cut unless it opts out (`scripts/gates/direction-floor.mjs`
  `no-continuous-object`'s own wrap note). Miss this and the gate reports no continuous object even
  though the layer is right there with a real motion track.
- **`mech: "seam"` on the transitions, not the "cut" a bare `fx` name defaults to.** A `cut` only
  transforms the scene ROOT (one opacity ramp over the whole stack), so two beats with different `bg`
  presets swap hard mid-ramp instead of blending, the exact "hard swap disguised inside a soft
  transition" `scripts/gates/seam-forensics.mjs`'s `seam-split` check exists to catch. `seam` is the
  real two-scene GPU blend.

`assemble` deliberately does nothing else: no camera, no captions, no authored `cuts`/`sceneUnits`
beyond the one line above. Everything past that is the engine's, or the next author's, to add.

## When this is overkill

A one-scene film has nothing to fan out. A film with no continuous object (a manifesto, a vignette
anthology, one holding a different device from `docs/CRAFT/FILM-STRUCTURE.md`) can still use
`stagekit` for a shared look, but `contract`/`scenes`/`assemble` have nothing to chain and nothing to
assemble from beat edges. And for anything you would write faster in one sitting than you would spend
briefing three agents, the four commands are pure overhead: `docs/CRAFT/SUBAGENT-BUDGET.md`'s own
conclusion, one good agent beats a fan-out for sequential, dependent work, applies here at least as
much as anywhere else in this repo.
