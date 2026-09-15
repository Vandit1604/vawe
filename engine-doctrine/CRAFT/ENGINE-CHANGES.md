---
when: you are changing the ENGINE rather than authoring a film: a gate, a layer type, a registry, the capture path, or anything under core/ and internal/
answers: "why a gate is the LAST resort and where a refusal belongs instead · how sugar must fail loudly rather than no-op · the three primitives that let you add a thing without touching everything · how to price a change that touches the capture path · the framework harvest, and how to classify a problem as framework, gate gap or authoring"
group: crosscutting
---

# Changing the engine

## AGENT SUMMARY

- Five rules for touching `core/`, `internal/`, a gate, or the capture path: a gate is the LAST resort
  (fix at the write site first); sugar must resolve at boot or fail loudly, never silently no-op; use
  one of three loose-coupling primitives (`defineRegistry`, `paramsOf`, `createKit`) instead of a fourth;
  price a capture-path change with a before/after wall-clock render time in the commit body; after every
  render, classify each friction point as framework bug / gate gap / authoring choice and log framework
  bugs to `engine-doctrine/MISTAKES.md`.
- Two of the five (a save under `renderer/internal/scene`/`renderer/internal/render`, a new file under `quality/gates/`)
  are spoken at the keystroke by the Claude Code hook `harness/live/craft-live.mjs`; the rest are `[eye]`,
  check them yourself before committing an engine change.

<!-- doc-refs-allow: make slop · retired in `engine-doctrine/MISTAKES.md` #326; the paragraph below is the record of why -->

CLAUDE.md is addressed to somebody AUTHORING A FILM, and it says so in its first paragraph: you do not
edit `scene.html` or the Go renderer unless explicitly asked. This file is the other half, and it is
here rather than there for one reason: an always-loaded prompt is read for what it is about, and five
sections of engine-maintenance doctrine sitting inside an authoring brief dilute the thing the reader
came for. The rules are unchanged and are moved whole, evidence intact, because a rule shortened on the
way out loses the incident that justified it and becomes an overgeneral principle nobody can apply.

**Every trigger for these rules stays resident in CLAUDE.md**, one line each, because a reader who does
not know a rule exists cannot go and load it.

## ARCHITECTURE: fix it at the root, or fail there. A gate is the last resort.

**The rule, and it is not a preference.** A gate belongs ONLY where the problem cannot be avoided in
the code at its root, or made to fail there. If it can be fixed at the write site *simply*, it is fixed
at the write site and no gate is written. A gate is justified only when preventing the thing in code
would genuinely complicate the code AND it cannot be solved at the root either. Then, and only then,
build a gate.

**The test, applied to any check you are about to write: where is this value WRITTEN?** If that place
is reachable, the refusal goes there and the whole class of bug ends. A gate that runs afterwards
leaves the engine perfectly able to produce the same bad value tomorrow; it only promises to notice.

What a gate IS for, stated so the rule is not read as "never":
- a property only knowable **after a render** (a luminance flash across a cut, a frame that paints nothing)
- a property only knowable **across the whole library** (a design repeating a shipped one, a count on the
  site disagreeing with the registry that produced it)
- a comparison against a **baseline** (byte-identical frames, purity across render order)
- a **judgement**, which no code can make (`make judge`, and your eyes)

**The worked example, because it is exactly the reflex to avoid.** A block emitted `left: -calc(...)`.
Invalid CSS, so the browser dropped that one declaration, kept the rest of the rule, rendered on, and
three of four focus brackets never moved with every check green. The first fix was a NEW GATE that
swept every fragment in a browser. It worked, and it was the wrong shape. The right answer was three
files away: `core/type/sanitize-html.js` already refuses `transition`/`animation` for the identical reason,
hand-authored CSS that reads correctly and silently does nothing. The refusal now lives at the two
places author CSS reaches the DOM (`core/layers/util.js`, `core/layers/html.js`) and throws naming the
layer. The gate was deleted. Full write-up: `engine-doctrine/MISTAKES.md` #422.

**Every gate has a running cost, and this repo has paid it twice.** `visual-vocabulary` was deleted for
measuring size wrongly: it squared a 590x18 rule into 590x590 and credited a hairline with a tenth of
the frame. `make slop` ran 41 borrowed rules against a DOM dump carrying evidence for three of them and
reported its silence as a pass. **A gate is another thing that can be quietly wrong, and a wrong gate is
worse than no gate** because it manufactures confidence. Before adding one, read `engine-doctrine/TASTE.md` on that
cull.

**Every tool that measures a frame ships a known-answer test, and `quality/gates/lib-test.mjs` runs
it.** A `--self-test` flag nobody calls is the same failure as no test: five of them
(`motion-floor.mjs`, `frame-check.mjs`, `harness/media/content.mjs`, `harness/media/study.mjs`,
`quality/gates/screen-readiness.test.mjs`) sat unrun until lib-test.mjs wired each one in, which is how
a screen passed while clipped and a fill measure read a real hero crop as 0.02: the check that would
have caught the bug already existed and nothing ever ran it.

## SUGAR MUST NEVER SILENTLY NO-OP

An authoring convenience that needs a build step to work is a trap: the author writes something real,
skips a step they did not know about, and watches a still frame with nothing to tell them why.

This engine resolves four sugars, and this section used to be their cautionary tale: `block`, `beat`
and `comp` needed a separate `make expand` CLI pass to become layer TYPES, and a scene rendered without
it was refused by name at boot rather than left to paint nothing, silent failure being worse than a
loud one. That refusal is gone now, not the discipline behind it: `core/engine/expand.js`'s `expandScene`/
`loadScene` resolves all three at LOAD time, for every Node gate and script directly, and for
`./bin/vawe` a level down in Go (`renderer/internal/render/expand.go` shells out to this module's CLI wrapper
before the browser ever fetches the JSON, because the render page's file server default-denies the
~186 block/beat factories by design, a security boundary for MCP/stranger scenes, so the browser itself
never expands sugar). Either way the two-file world (`x.json` + a `make expand`-written
`x.expanded.json`) is gone: a scene naming `{type:"block"}` is correct as authored and renders
directly, and the build-step failure this section described can no longer happen because the step no
longer exists for an author to skip, even though the engine still performs it, just never in the JSON
the author reads or writes.

The fourth, `cameraMove`, was written into `data.cameraMove` and read by nobody: `films/scene/scene.js`
reads `data.camera`. So an author who wrote a camera move and rendered without expanding got no camera
and no error. It now bakes at boot (`bakeCameraMove` in `core/engine/produce.js`, also called from
`core/engine/expand.js` for the Node consumers that never reach `core/engine/boot.js`), and `core/engine/boot.js` THROWS if
`cameraMove` survives to render, because the failure was a field written and never read, so the repair
is not "convert it here", it is "make surviving unconverted impossible" (`engine-doctrine/MISTAKES.md` #424).

**The rule: sugar either resolves at LOAD, or its absence fails loudly. Silence is never the third
option.** `block`/`beat`/`comp` used to satisfy this with the second half (a loud refusal at boot); they
satisfy it with the first half now, which is the better of the two, because there is nothing left to
forget to run. `make expand` still exists, as a plain debugging command that prints the expanded JSON
to stdout, nothing more.

## LOOSE COUPLING: adding a thing must not mean touching everything

The engine should let you add an effect, a layer type, a block, a beat or a camera move **without
handling everything again**. Where that is true today it is because of one of three primitives, and a
new extension point should use one of them rather than invent a fourth:

- **`defineRegistry(...)`** (`core/registry/registry.js`): a named vocabulary that refuses an unknown name and
  says which slot it was reaching for. Give it a **`catalog`** block (title, tag, intro, usage, and
  either preview or noPreview) and it also writes its own section in `engine-doctrine/EFFECTS.md` and its own page
  on the site. That is the whole edit: adding one capability used to be four edits in three files, held
  together by two gates, and the id those other three were keyed by was a slug of the section title, so
  renaming a section orphaned its usage and its preview in silence. A half-written block is refused at
  load rather than by a gate.
- **`paramsOf`** (`core/camera-moves/index.js:216`), refuses an unknown parameter by reading the generator's
  OWN signature. Nobody maintains that list, so it cannot drift.
- **`createKit(ctx)`** (`core/layers/util.js`): dependency injection for layer builders. A capability
  added to the ctx reaches every primitive at once, with no signature change at any call site. The frame
  (`frameOf` in `core/layout/safe.js`) arrived exactly this way.

**One fact, one owner, everyone else receives it.** The recurring failure in this codebase is not
complexity, it is the same fact known in two places and then drifting: the audit graded a camera read
from the scene file while the renderer baked a different one at boot (#423), and light-versus-dark once
had two implementations (#159). Before computing something a caller could have handed you, check whether
an owner already exists. `nothing computes the frame twice` is the shape to copy.

**Deterministic, simple, readable, fail early.** `renderFrame(n)` is a pure function of `n` and every
suggestion is weighed against that first. Validate at the entry point rather than deep in the call chain.
Return the error; never log and continue. Prefer the boring, obvious construction: an abstraction with
one caller is not decoupling, it is a second thing to read.

## SPEED IS A PROPERTY YOU CAN LOSE WITHOUT NOTICING

A correctness fix is allowed to cost speed. **Not knowing what it cost is the failure.** Nothing in
this repo reports render time against a baseline, so a change that halves throughput lands green and
silent, and the next author inherits a slower engine with no note saying when or why.

**The worked example is one day's work, and it is not hypothetical.** Closing the sharded-render
determinism bug added `--disable-partial-raster` and removed `will-change` from every layer. Both
exist precisely to stop Chrome reusing a rasterised tile, which is the single largest thing making a
render fast. That was the right trade, made deliberately, and **nobody measured the price**. It is
still unpriced.

**The rule.** If you touch the capture path (`renderer/internal/scene`, `renderer/internal/render`, a Chrome flag, the
worker count, anything on `.hs-layer` or `#cam`), render one film before and after and state both
wall-clock times in the commit body. Two numbers. That is the whole ask, and it is what turns "we
chose correctness" from a hope into a record.

**Two things already true that a reader should not have to rediscover:**

- **The worker cap is `min(NumCPU - 1, 6)`** (`renderer/cmd/render/main.go:60`). On a 10-core machine that
  leaves four cores idle, and memory is not the reason: an extra tab costs one renderer process and
  about 118 MB, so nine tabs is roughly 1 GB. Whether the cap is a leftover or a deliberate ceiling
  is not written down anywhere.
- **Worker count and determinism are coupled**, so raising the cap is not purely a speed change.
  `renderer/internal/scene/scene.go` records two renders of identical code differing on 373 of 1890 captures
  at one worker and 1078 at four. Any speed experiment on the pool measures frame agreement too, or
  it is trading correctness for time without saying so.

**Do not optimise on a guess either.** The same rule that governs a rendering bug governs a slow one:
measure, name the number, then change one thing. This file already carries four wrong explanations
that were reasoned rather than measured, and a performance hunch is exactly as cheap to be wrong about.

## The framework harvest (do this EVERY render: the engine must compound)

Authoring a video always surfaces friction. If that friction is only patched inside the JSON, the
next author hits the identical wall and the engine never improves. So **after every render, before
declaring done, list every problem hit this pass and classify each one**:

| Class | Test | Action |
|---|---|---|
| **Framework bug** | Would ANY author hit this on a different brand? Did the engine do something silently wrong, or accept input it then ignored? | **Fix it in the engine/tooling now**, then delete the JSON-side workaround |
| **Gate gap** | The render was wrong and no gate said anything, or the error message didn't name the real cause | **Extend the gate / sharpen the message** |
| **Authoring choice** | Specific to this brand's taste, copy, or composition | Fix in the JSON only |

Rules that make this real, not ceremonial:
- **A workaround is a bug report.** If you wrote something odd to route around the engine
  (`ken:{from:1,to:1}` purely to get a border-radius), that IS a framework bug. Fix the engine and
  remove the hack, never leave the hack as the answer.
- **Silence is the worst failure.** Any input the engine accepts and then ignores must either work or
  fail loudly. Silent substitution is how the wrong font and square avatars both shipped.
- **Log it.** Append every framework-class finding to `engine-doctrine/MISTAKES.md` (what · root cause · fix ·
  which gate now catches it). That file is the memory; an unlogged fix gets re-broken.
- **ONE INCIDENT IS A HYPOTHESIS, NOT A RULE.** Logging a mistake and promoting it into standing
  doctrine are different acts, and the second needs more evidence than the first. When a harvest turns
  a finding into a rule in this file, cite the entries that support it and let the count do the
  arguing: `#505` alone is one film's experience, `#214 + #216` is the same misreading surfacing twice
  in two consumers, which is a pattern. A rule derived from a single run is a rule the next author
  obeys as though it were measured, because nothing in the sentence says it was not. Say so instead.
- **Check the blast radius** before changing shared behaviour: grep the other scenes for the pattern,
  and re-run `make probe` + `make snap`. Say plainly which existing videos change output and why.
- **Report it.** Tell the user what was framework vs authoring. Never silently absorb engine bugs into
  a scene file.
- **FIX THE RULE, NOT THE CALL SITE. Grep every consumer before you close it.** A measurement bug is
  almost never in one place: the primitive that was read wrongly is read the same way somewhere else.
  #214 taught the audit that `<style>` source is not glyphs, applied it to the overlap check alone, and
  left the identical bug in the clipped-text check, where it surfaced as #216 the same day. Before
  closing any finding of this shape, grep for the thing that was misread (`textContent`, `getBBox`,
  `boxOf`, a default-substituting helper) and fix or explicitly clear EVERY consumer. A fix at one call
  site looks exactly like a finished fix until something else trips the half you skipped.
- **FINISH THE FIX. Reverting is not a resolution.** Having found an engine or gate bug, you fix it in
  this pass. "I could not get it working so I put it back and logged it" is the one outcome that is
  never acceptable: the next author inherits the same wall plus a note saying it is known. If a first
  attempt does not fire, DEBUG IT: instrument the thing, print what the code actually sees, and find
  out why. Every fix in this file that looked impossible was one measurement away (#211 took three
  distinct root causes, and stopping after the first two would have shipped half a fix that changed
  nothing). Abandon only when you can state what makes it genuinely infeasible, and then say so to the
  user in plain words rather than quietly restoring the old behaviour.
- **When satisfying a gate requires making the film worse, suspect the gate.** A gate that measures the
  wrong thing does not merely miss defects, it manufactures them, and the author pays by deforming a
  good design until the number moves. Before you shrink, recentre or delete something you know is right,
  go and read what the gate actually measures (#211).
- **A gate change must never invent findings.** Run the whole scene library before and after and diff the
  counts. The only acceptable shapes are "no scene changes" and "these N changed, FAIL to PASS, here is
  why each was a false positive". A single scene going PASS to FAIL is a regression, not a discovery,
  until you have proven otherwise: an unclamped bound in #211 turned one clean scene into 7 failures.

## What this engine took from the agent harness  `[ref: make rung]`

Several Claude Code mechanisms answer problems this repo also has, adopted one at a time. When you
adopt another, add its row and give it a rung. `make rung` prints the current distribution; `node
quality/gates/rung.mjs --list` prints the worklist. Highest rung wins:

```
[built]  the engine makes it true          a wrong value cannot be written
[gated]  a gate refuses it                 the push stops
[live]   something says it while you write a hook speaks at the keystroke (Claude Code; elsewhere, check by hand)
[ref]    a command answers it on demand    you have to ask
[eye]    nothing but the sentence          you have to remember
```

| the harness does | this engine does | where |
|---|---|---|
| PostToolUse hooks that speak mid-task | a hook reads what you just saved and answers | `harness/live/*.mjs` |
| a PreToolUse deny, evaluated before permission mode | the authoring ORDER refuses a write that skips a stage | `harness/live/stage-gate.mjs` |
| UserPromptSubmit context injection | the open stage and its next command, re-stated every turn | `harness/live/stage-say.mjs` |
| `[live]` capability discovery, PUSHED instead of searched | a beat with real duration and no `move`/`motion` is named at the moment its storyboard is saved, and told to name what arrives during the hold, never a `move:` line or a camera move; `make surface D=<storyboard>` is the neutral on-demand form | `harness/live/beat-surfacer.mjs` |
| deferred tools, fetched by search | `make arsenal Q="…"`, `make schema AT=…` | `harness/author/` |
| skills loaded only when needed | `engine-doctrine/CRAFT/*.md`; a finding NAMES the doc that settles it | `engine-doctrine/TASTE.md` |
| refusing an invalid call at the boundary | refusing at the WRITE SITE, so a bad state is unrepresentable | `core/registry/registry.js` |

A gate is the LAST resort: if the bad value has a write site, the refusal goes there. Where a clean
state can't be reached today, the number goes in a ratchet (`quality/baselines/*-ratchet.json`), never rising.
