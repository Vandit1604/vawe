---
when: you hit something odd in the engine, or you just fixed one and must log it
answers: "the one-line index of past mistakes; the full reasoning lives in git history"
group: process
---

# MISTAKES.md: an index of lessons, not the essays

This used to be a 17,797-line, 569-entry diary. Nobody could read it end to end, so in practice
nobody read any of it, which defeated the point of a log meant to stop a repeat. Each entry below is
now three lines: the title, the one-sentence lesson, and what holds it today (a gate, a live check,
or "none" if it is still just a sentence someone has to remember).

The full write-up for any entry, root cause and all, still exists: it is git history as of
77993ff0799dcc41efd2f948204e95531a15ed9f. Read one with `make mistakes N=<n> FULL=1`. A citation elsewhere in the repo
(`docs/MISTAKES.md #N`) still resolves here by number; nothing renumbers.

New incidents: add a rule or a gate message first. Only add a line here if nothing else can hold
the lesson yet.

---

## 1. Built a DARK video for a WHITE site (taste inversion)
dominance is decided by LOOKING, never by a field.
holds: none

## 2. Patterned background on a PLAIN site
added the `accentPlain` preset (the brand accent as a clean gradient, grain only ,  no dots, no spotlight).
holds: none

## 3. Patterned backgrounds SPAMMED across the whole video
What: when a patterned bg was used, it ran through most beats ,  the pattern became the wallpaper. Root cause: treating the bg preset as a global constant, not a per-beat choice. Fix doctrine...
holds: scripts/gates/lib-test.mjs

## 4. Used a stock image, untastefully
prefer real captured UI (`make capture`) or a clean gradient over a generic photo.
holds: none

## 5. Sounds added before the audio system is real
videos are silent by default (`audio: {silent: true}`) until the audio system is built properly.
holds: scripts/gates/lib-test.mjs

## 6. `group` primitive doesn't render image children (engine bug)
What: logos placed as `image` children inside a `group` rendered invisible. Root cause: the group compositor doesn't walk image leaves (only text/rect).
holds: none

## 7. Logo colour invisible against the bg
keep both variants in `assets/icons/` ,  light (`#f3f3f0`) for dark bgs, `-dark` (`#0e0e0d`) for white bgs ,  and pick by the beat's background. (A dark logo on white, a light logo on blue.).
holds: none

## 8. A non-existent bg preset failed loud with no hint
added `deep`/`dark`/`accentPlain` as real presets, plus a Levenshtein "Did you mean 'x'?" suggestion in `core/validate/validate.mjs` for enum typos.
holds: none

## 9. `<b>` emphasis invisible on an accent-coloured background (blue-on-blue)
`styleText` now sets `--em` per layer to a REAL colour: the brand accent over normal bgs (the pop is preserved on white), but the layer's OWN colour over an accent-coloured bg...
holds: none

## 10. Headline rendered in the generic sans (theme font silently not loaded)
two layers ,  (1) added Geist (+ Hanken) to the static list; (2) `boot()` now ALSO loads the fonts the THEME declares (`theme.type.{sans,serif,mono,num}`) at every weight, so a brand's face can...
holds: none

## 11. Guessed the type weight + eyedropped the wrong accent (didn't read the CSS)
What: creed's headline shipped at weight 800 (chunky) when the site is 600; the accent was the sky-photo blue `#0575f0` when the brand's real accent is `#2563eb`.
holds: none

## 12. Text "shaking" ,  captured at 1×, no anti-alias headroom
What happened: text shimmered/crawled frame-to-frame, worst under camera moves and per-word kinetic reveals.
holds: none

## 13. Cursor click missed the button (base-offset footgun)
What happened: a `cursor` `path` ending on the Accept button rendered ~(60,240) px off ,  the click fired in empty space. Root cause: scene.html defaults every layer to `x:60,y:240`; the cursor...
holds: none

## 14. Silent authoring bugs the schema couldn't catch → `lintData` (make lint-test)
Three bugs shipped in renders and passed every gate; each is now a `validate` warning (fail with `--strict`), pinned by `make lint-test`: - missing `duration` → a layer renders for the WHOLE video...
holds: none

## 15. Authored from imagination + hand-math instead of the real asset + the composition tools (argus)
What: three flaws shipped in the first argus pass: (a) the pixel-eye mascot was recreated from memory (a made-up almond) when the real one is a moth-eye creature with antennae + a spiral iris ,  I...
holds: scripts/gates/critique.mjs

## 16. The SITE cropped the videos it was selling (`object-fit: cover`)
What went wrong: every `<video>` on the marketing site used `object-fit:cover`, so any clip whose container ratio didn't match its file got cropped.
holds: none

## 17. Widening a gate to "everything" made it flag decoration (safe-zone false positives)
What went wrong: the safe-zone/overflow checks were widened from `[data-layer=critical]` to every `.hs-layer` (so a corner watermark would be caught).
holds: none

## 18. Six scenes couldn't reproduce their own video (`aspect` lived in the CLI, not the JSON)
What went wrong: re-rendering `showcase-{type,cuts,stings,data,ui}` + `hero-site` straight from their JSON produced portrait 1080×1920 videos, which then overwrote the site's landscape assets.
holds: none

## Tool-accuracy note (see also: the survey in chat)
Tools are accurate for MECHANICAL/precise data (exact hexes, geometry, pixel histograms) and unreliable for SEMANTIC judgment (dominance, which colour is text vs accent, what the hero means, is it...

## 19. `radius` on an image was silently ignored unless `ken` was set (engine bug)
radius now clips ANY image (`L.ken || L.radius != null`), and brings `object-fit: cover` with it so a non-square source fills the shape instead of distorting.
holds: scripts/gates/conformance.mjs

## 20. Captured components pointed at REMOTE images → blank cards in an offline render
capture now LOCALIZES every remote asset into `components/media/` and rewrites the html to local paths.
holds: none

## 21. Schema advertised an anim name that does not exist (`slideL`)
the schema now carries the exact enum from the registry and states that unknown names fall back to fade silently. Rule: a prop label is documentation.
holds: scripts/gates/conformance.mjs, scripts/gates/schema-drift.mjs

## 22. Fonts substituted silently ,  twice ,  because the load list was hand-maintained
(1) the load set is now DERIVED from the `@font-face` rules in the CSS (`core/engine/fonts.js`), so vendoring is the only step; (2) `make font-audit` fails the build on any family that is not vendored +...
holds: none

## 23. Auto sound-design ignored the `cuts` array (so a scored film was silent at every cut)
`cuts` are now a cue source, and the mapping is style-aware (`CUT_CUE`): a `punch` snaps (`press`), a `softwipe` breathes (`whisper`), a `rise` blooms.
holds: scripts/gates/coverage.mjs

## 24. A group image child silently dropped `radius` (same bug as #19, one level down)
group image children clip too, with cover-fit when both `w` and `h` are given. Rule: when you fix "a prop is silently ignored", grep for EVERY path that builds that primitive.
holds: scripts/gates/conformance.mjs, scripts/gates/lib-test.mjs

## 25. The layout audit called a cross-dissolve a collision
overlap is skipped only for a genuine hand-off ,  one layer inside its exit window, the other inside its enter window, and BOTH below full opacity.
holds: scripts/gates/author-check.mjs, scripts/gates/blocks-audit.mjs, scripts/gates/direction-floor.mjs, scripts/gates/gate-mutation.mjs

## 26. Two more silent-ignore traps found while auditing the first one
`b.height > 1` skipped collapsed images. The image legibility floor only considered images TALLER than 1px, so an image that laid out at zero ,  visible layer, no pixels ,  was the one case it...
holds: scripts/gates/gate-mutation.mjs

## 27. Sound was a downloaded sample library, not part of the framework
`core/audio/kit.mjs` ,  the engine now SYNTHESIZES its own audio: oscillators, seeded noise, RBJ biquads, envelopes, a feedback-delay shimmer, a WAV writer, and a parameterized music-bed generator.
holds: none

## 28. `tracking` was applied and then overwritten one statement later
the guard now honours both names. Found by: `make conformance` (phase 2) ,  not by reading the code, which looks correct at both sites. ---.
holds: scripts/gates/lib-test.mjs

## 29. The `cuts` array renders NOTHING (the engine's largest silent-ignore)
scene cuts now render. A cut treats the beat LEAVING as an exit and the beat ARRIVING as an enter, applied to the camera root (`#cam`) so the whole beat moves as one.
holds: none

## Method note ,  how conformance findings must be triaged
The first conformance run reported 13 inert props; 10 were the harness's fault, not the engine's: `opacity`/`scale`/`rotate` are CAMERA-KEYFRAME props (schema:858-871, `core/timeline/sequence.js:26`),...

## 30. Synthesized cues sounded like buzzing; music now comes from real recordings
deleted the generated cues, restored the recorded Mixkit sfx library, and added `make music` to fetch a real soundtrack.
holds: none

## 31. A hand-typed enum in the schema rejected a valid new value within minutes
`make schema-check` now asserts the schema's anim enum EQUALS `ANIM_NAMES` from `core/timeline/clips.js`, and fails loudly with both sets printed when they diverge. Rule: if a gate or a schema restates a...
holds: none

## 32. Beat matching: build the edit ON the music, do not drag cuts onto it
What: snapping existing cut times to the nearest beat did nothing useful ,  at 77 BPM the bars are 3.11s apart, so the nearest beat was often half a second away from the intended edit point. The...
holds: none

## 33. Who checks the checkers ,  `make gate-test`
The image legibility floor guarded on `b.height > 1`, so the ONE case it existed to catch ,  an image occupying no space ,  was the one case it skipped (#26).
holds: none

## 34. Coverage ,  conformance proves it works, this asks if anything uses it
`make coverage` reports which vocabulary no authored scene exercises.
holds: none

## 35. Descenders were sliced off every `riseClip` word (shipped, in every scene using it)
What: g, y, p rendered with flat bottoms ,  "coverin_g everythin_g" cut through the tails.
holds: none

## 36. Fixing cuts made the safe-zone gate fire on every cut
the audit now receives the cut windows and skips positional checks inside them, mirroring `scene.html`'s own filter (`none` excluded, `dur` split evenly around `t`).
holds: none

## 37. `make coverage-reel` ,  renders whatever nothing else renders
Conformance proves a value changes the frame; coverage says nothing USES it.
holds: none

## 38. Every fade in the engine was linear (and the obvious fix broke cross-dissolves)
What: entrances and exits felt slightly wrong in a way that is hard to point at. Root cause: `core/timeline/clips.js` composed opacity as `clamp01(enterT) * exitMul` ,  two linear ramps ,  while the...
holds: scripts/gates/scene-snap.mjs

## 39. `make snap` reported IDENTICAL after every fade curve in the engine changed
frames are now derived from where the motion IS ,  mid-entrance and mid-exit of every layer, read from the same `data-*` attributes `driveClips` uses, plus cut windows and stings, plus the even...
holds: none

## 40. Every directional exit in the engine ran backwards
pass `exitT`. Verified: 0 offset at the start, full offset at the end. Why no gate saw it: nothing asserts the DIRECTION of motion, only that frames are pure and boxes are in-bounds.
holds: none

## 41. A blur left behind by an exit stuck to frames rendered later
`driveClips` now writes the resting values of the layer's own enter+exit animations before applying the active one.
holds: scripts/gates/lib-test.mjs, scripts/gates/probe-purity.mjs

## 42. `blur(0px)` is not free, and identity values are written every frame
`defocus` returns `filter: 'none'` at u >= 1. Rule: an animation's identity must be genuinely free, because it is the value the scene spends almost all of its frames at.
holds: none

## 43. A captured component's root margin falls out of the box the capture measured
the root's margins are dropped at capture (they describe siblings that do not come along), AND `component.js` zeroes the root child's margin at build time so components already on disk heal...
holds: none

## 44. The headline bar rejected a brand's own button colour
the bar is 3:1 when an opaque sibling shape sits under the text (a structural test, not a colour heuristic), 7:1 otherwise. Gate: two `make gate-test` cases, pinned in both directions ,  a grey...
holds: scripts/gates/gate-mutation.mjs

## 45. The layout audit sampled 14 uniform frames and missed a whole beat
sampling is content-aware ,  the resting midpoint of every layer is sampled, not just uniform ticks.
holds: scripts/gates/sim-audit.mjs

## 46. Five tools rendered every landscape scene into a portrait viewport
`sceneDims(cfg, key?)` in `core/layout/safe.js` ,  dimensions and the safe area are the same question asked twice, so they live together.
holds: scripts/gates/lib-test.mjs

## 47. `make motion D=...` audited a different file and said nothing
the target forwards `D` to `--data`, and the report line names the data file it read. Rule: same class as #19 and #28 ,  input accepted and silently ignored.
holds: scripts/gates/motion-audit.mjs

## 48. `make validate` with no arguments validated one file out of sixty
no arguments now means every scene that declares a `module` (which naturally excludes planning artifacts like `*.intent.json`) plus every `themes/*.json` checked directly. What it found on the...
holds: none

## 49. Sound had no way to come from the picture
auto sound-design emits one key cue per revealed character from that same expression.
holds: none

## 50. A block hand-computed its own centring
the mark centres via the group's own `justify` (or a text layer's `align` over its width). Rule: the rule against hand-computed centring applies to BLOCK CODE too, not just scene JSON.
holds: none

## 51. A sound effect named `click` was 19.6 seconds long
keystrokes are now GENERATED, not downloaded ,  `key1/key2/key3/keyspace/keyenter` in core/audio/kit.mjs are ~15-35ms bandpassed noise transients, which is physically what a key click is.
holds: scripts/gates/sfx-audit.mjs

## 52. The demo was silently scored
What: every window of the search demo measured ~-23dB, including the stretches that should have been silent ,  which made it impossible to tell whether the keystroke fix had worked. Root cause:...
holds: none

## 53. A wordmark re-typed in the theme's font is a lookalike
the block takes a `logo` (a real SVG) which wins over `word`/`brand`, and the demo points at the actual wordmark.
holds: none

## 54. The build artifact's name leaked into the deliverable
the renderer strips a trailing `.expanded` when deriving the output name. Rule: intermediate filenames are for the pipeline.
holds: none

## 55. A "click" that was all treble is a Geiger counter, not a keyboard
each key is now a lowpass-shaped body (250-430Hz) with only a trace of clack on top, Q≈0.7, and the default cue gain dropped 0.22 → 0.13.
holds: none

## 56. My own gate measured file length instead of sound length
the gate decodes the PCM and reports the last moment the signal is above -45dBFS.
holds: none

## 57. `pop` was an alias for a cue that rings for a second
`pop` has its own voicing ,  a sine gliding 880→260Hz over 45ms with a trace of clack, which is physically what a small cavity collapsing sounds like.
holds: none

## 58. The ported cue library had drifted from the library it was ported from
the specs are extracted verbatim from the library and marked do-not-hand-edit, with the source and version in the file.
holds: none

## 59. Perspective is a camera property, not a layer property
rx/ry/p are CAMERA keyframes. Applied once on the camera root, every layer shares one vanishing point and the frame reads as a single plane in space.
holds: none

## 60. A block silently swallowed the prop that carried its sound
the block forwards keyCue/keyGain onto the typing layer, AND `make expand` now warns when a block layer carries a prop its factory does not accept ,  the parameter names are readable off the...
holds: scripts/gates/blocks-audit.mjs, scripts/gates/layer-props.mjs

## 61. Auto-derived cues had no volume dial
`audio.sfxGain` scales every effect cue, derived ones included.
holds: none

## 62. The schema was narrower than the engine
`string|boolean`, which the validator's union types already support. Rule: `make schema-check` proves every engine prop is DECLARED.
holds: none

## 63. `at` was already taken
renamed to `aspects`. Caught in one run because the prop was declared in the schema before being used; had it gone undeclared, the overrides would have been silently ignored at render. Rule:...
holds: none

## 64. `make probe` cannot see inside a canvas
both layer types clear when off-window. New gate `make canvas-purity` hashes the actual pixels, pinned in gate-test by reverting the clear. Rule: the sixth time this session (#39, #41, #45, #48, #56).
holds: scripts/gates/canvas-purity.mjs

## 65. `make coverage` reported 15 layer types as 14/14
`core/layers/index.js` exports `LAYER_TYPES` from the registry; coverage imports it.
holds: none

## 66. Per-band normalisation makes silence look loud
the sidecar reports each band's ABSOLUTE `peak` alongside the normalised frames, and the bake prints it (`high 0.0291`), flagging `(near-silent)` under 0.01. Caught by: a lib-test assertion that...
holds: none

## 67. Block factories were exempt from the rules the videos obey
`make blocks-audit` ,  invented figures, brand defaults, superlatives, dead props, and prop-surface divergence across a family.
holds: scripts/gates/blocks-audit.mjs

## 68. The gate audited the factories and missed the manifest
the gate walks every string in every catalog row's `props`, with a reasoned exemption list (`FIGURE_IS_THE_POINT`) so a price on a pricing card is a specimen and a render time in a terminal is a...
holds: scripts/gates/blocks-audit.mjs, scripts/gates/sim-audit.mjs

## 69. `delay` never delayed anything, and I signed it off from a settled frame
`addGroupChild` writes the child's timing dataset, handing it to the same driver as a top-level layer.
holds: none

## 70. Group children ran a re-implemented subset of the layer pipeline
children delegate leaf construction to `REGISTRY[type].build` via an injected `buildLeaf` (util.js cannot import the registry ,  circular), both paths call one `decorate()` helper, and...
holds: none

## 71. Only one colour set in the block library was ever measured
What: five hardcoded colour pairs shipped below the WCAG body bar.
holds: none

## 72. A block's whole reason for existing sat behind a condition that was always true
an `active` prop ,  `i < active ? '✓' : i === active ? '•' : '·'` ,  defaulting to "all done", which is exactly what the broken condition produced, so no existing caller changes.
holds: none

## 73. The block gate audited one file while the registry became four
it globs `blocks/*.mjs`. A new factory file is audited the day it lands, not the day someone remembers.
holds: none

## 74. Every block could only enter, because the engine could only move a box
`vars: { '--p': [0, 1] }` interpolates a CSS custom property across the layer's window.
holds: scripts/gates/conformance.mjs, scripts/gates/gate-mutation.mjs

## 75. The conformance sweep cannot detect two identical values (OPEN)
Status: real defect, evidenced, NOT fixed.
holds: none

## 76. I diagnosed a flake twice from truncated output
What: `make conformance` failed twice inside a chain of `make` targets.
holds: none

## 77. The doc, the manifest and the engine each said something different about `unit`
a leading currency symbol in `unit` is hoisted in front of the number, so `unit:"$B"` reads `$880B` as documented.
holds: none

## 78. The overlap check does not see text that grows by wrapping (OPEN)
What: a showcase end card had a headline wrap to two lines and land directly on top of the mono filepath beneath it.
holds: none

## 79. Non-block layers get no unknown-prop check at all
What: a scene wrote `{"type":"glow","r":620,"opacity":0.5}` and got no glow.
holds: scripts/gates/lib-test.mjs

## 80. `ls` was declared, documented, used 18 times, and never applied
`ls` is honoured as a synonym for `tracking`.
holds: none

## 81. Three composition defects the gates structurally could not see ,  now two of them can
Closing #78, and the third stays open on purpose. (a) Overlap only compared "critical" layers. Text under 60px was invisible to it, so a headline that WRAPPED onto a second line and landed on the...
holds: scripts/gates/gate-mutation.mjs

## 82. A decision that decides nothing
What: `deploySuccess` shipped `i === last ?
holds: scripts/gates/dead-branch.mjs, scripts/gates/lint-test.mjs

## 83. A test that hardcodes a count is edited by whoever breaks it
counts derived (`length > 0 && new Set(x).size === x.length`), so appending an effect can never fail the test for the wrong reason, and the per-effect branch-coverage check still fails loudly if...
holds: scripts/gates/docs-drift.mjs

## 84. A positional assertion silently changed what it was testing
`branchOf(name)` locates a branch by the effect's own name, and the check now runs over matrixDecode, nebula and dotCrawl.
holds: none

## 85. A gate flagged its own test fixture
exclude the mutation harness too. Worth stating plainly because the cost is asymmetric ,  a gate that cries wolf about itself trains people to skim its output, which is exactly how a real finding...
holds: scripts/gates/dead-branch.mjs, scripts/gates/lint-test.mjs

## 86. An incomplete GL texture samples as opaque black, and says nothing
`naturalWidth ?? width`, and a failed source now THROWS with the offending URL rather than returning early.
holds: none

## 87. refract ran every line and did nothing
`/ (2.0 * e)` and a scale retuned to the now-correct magnitude. The other half of this entry is the mistake I nearly made. In the same contact sheet I read `bitCrush` as broken too, at three...
holds: none

## 88. The comment described the intent; the code did the opposite
the sign. Lesson: a comment stating a direction is a claim that has to be rendered and looked at, exactly like a number.
holds: none

## 89. The gate that proves every other gate can fire silently stopped proving one
Editing `core/surfaces/paint.js` for resample changed the off-window line that `gate-mutation` patches to prove `canvas-purity` works.
holds: scripts/gates/gate-mutation.mjs

## 90. The roadmap decayed again, in the exact way its own closing warning describes
`make docs-drift`, registered in the mutation harness (37/37).
holds: none

## 91. The distinctness check decided its own answer, and the fix for it nearly did too
Keep frameSig's exact hash and redact its input instead.
holds: scripts/gates/gate-mutation.mjs

## 92. The dataflow half of dead-branch, and the rule I had to cut
#82 shipped `make dead-branch` catching one shape ,  `cond ?
holds: none

## 93. `opacity` on a layer did nothing, in two shipped scenes, for months
`decorate()` writes `el.dataset.opacity` and the clips loop multiplies it into the composed envelope, so a base opacity coexists with the entrance fade instead of fighting it for one property.
holds: none

## 94. The validator accepted any prop name at all
unknown props on a layer are now a validation error, with a "did you mean" built from case-insensitive and prefix matches.
holds: none

## 95. A gate answered a question it was not asked
an extra positional argument is a hard error naming what was ignored and pointing at `make compare`. ---.
holds: none

## 96. Coverage lists that do not grow cover less every time you ship
derive from the registry, exempt by name.
holds: scripts/gates/sim-audit.mjs

## 97. The docs decayed identically, one file over from the gate watching them
generalized to `make docs-drift`, covering ROADMAP prose claims and PRIMITIVES heading counts.
holds: none

## 98. A group child was legal at depth 2 and illegal at depth 1
the child enum is the full layer registry, and `make schema-check` now derives it from `core/layers/index.js` so it cannot drift again.
holds: none

## 99. A nested `layout:'free'` group did not position its own children
a nested free group is set `position:relative` in `addGroupChild`, not in `layoutGroup`, because a TOP-LEVEL free group is already absolute with left/top from scene.html and `relative` would break...
holds: none

## 100. Every vendored font is VARIABLE, and the obvious extractor reads the wrong master
fontkit instead of opentype.js ,  it applies `gvar` deltas, so `getVariation({wght})` bakes the weight actually asked for.
holds: none

## 101. The shard grid that was already broken before anything hit it
one jittered vertex lattice, shared between neighbours, boundary vertices unjittered so the panel edge stays straight.
holds: none

## 102. `git stash` in a shared worktree, while other agents were writing to it
Mine, during the same session. I wanted the pre-change count for `make gate-test`, so I stashed the tree, ran the harness, and popped.
holds: none

## 103. The build context is the working tree, so .gitignore does not protect it
`make docker-context` walks the tree applying `.dockerignore` the way BuildKit does and fails over a 40MB budget, naming the biggest contributors.
holds: none

## 104. I discarded a correct diagnosis because of evidence that never contradicted it
vawe-site had failed every deploy for three days at `COPY scripts ./scripts` with `failed to stat active key during commit`.
holds: none

## 105. `preview.mjs` is non-deterministic where the production render is not
Building the `ransom` treatment, I checked determinism by rendering a frame 5× through `make frame` / `scripts/author/preview.mjs` and hashing the PNGs.
holds: none

## 106. A failed render left a stale PNG, and the hash read it as "identical"
Chasing #105, I wrote scenes to `/tmp` and rendered them with `preview.mjs`.
holds: none

## 107. Diagonal clip-path edges rasterise non-deterministically under per-element rotation
the ransom cut stays near-axis-aligned (ragged rectangle only); the exotic shapes were removed, which also simplified the module.
holds: none

## 108. Two shipped scenes do not render the same twice, and nothing was checking
Refactoring boot()'s preloaders, I byte-compared renders across the change.
holds: none

## 109. The ransom effect has a determinism ENVELOPE, and I shipped it without knowing where the edge was
`ransom` was verified byte-identical on two scenes (7 glyphs at size 180, 16 glyphs at size 150) and shipped as "pure in n".
holds: none

## 110. Half of every composite look was thrown away on any top-level layer, silently
`decorate()` now runs LAST, after `build()` and after `splitText`/`ransomStyle`, matching the group path.
holds: none

## 111. The layout audit called Ken Burns a bug, so authors learned to ignore it
the overflow rule skips `.hs-img-wrap`. Its stated purpose (`verify/audit.mjs:4`) is *clipped text*; an image box exists in order to clip, so it can never be evidence there. The lesson: a false...
holds: none

## 112. `make photos` wrote WebP bytes into files named `.jpg`
sniff the magic bytes and use the true extension; the printed usage hint now names the real file.
holds: none

## 113. Two gate messages that describe something other than what they test
Both found while running the ladder on one film; neither is fixed in the gate that reports it. - `make beats` reported "3 beats" for a film with seven distinct visual beats.
holds: none

## 114. The site quoted nine capability numbers, and the registry had moved past all of them
`scripts/gates/site-counts.mjs` (`make site-counts`) reads the registries, scans the site copy for both shapes counts appear in (`148 blocks`, `Kinetic presets (25)`), and fails with file:line,...
holds: none

## 115. Every "glow" in the engine was a drop-shadow, which glows the wrong channel
a real `bloom` SVG filter in `core/looks/filters.js` (feColorMatrix → feComponentTransfer → feFlood/feComposite → two feGaussianBlur → additive feComposite), and `bloomStack` in `core/looks/index.js` now...
holds: none

## 116. A kernel's `amount` knob has to respect what the kernel sums to
branch on the base sum. Zero-sum kernels scale uniformly (the sum stays zero); others scale around the identity. The lesson. I reached for a property of the *content* to explain a defect in the...
holds: none

## 117. A build step that stops at the first error reports one error per run
record and continue, then fail at the end with the full list.
holds: none

## 118. Two kinetic knobs cancelled themselves out and did nothing
make the spring input a constant and let `settle` drive frequency alone.
holds: none

## 119. The audit gate was broken for the ENTIRE MCP flow, and only a real session caught it
normalise the arg to a repo-relative path once (`path.isAbsolute` → `path.relative`), reject one that escapes the repo, and use that everywhere including the browser URL. The lesson: a smoke test...
holds: none

## 120. a direction gate must measure beat-holds from real cut times, not start-clusters
base beat-hold duration on real `cuts[].t` gaps (the true beat boundaries); skip the check when a scene has no cuts.
holds: none

## 121. a loudness (LUFS) target is not an RMS gain; do it at the mux with ffmpeg loudnorm
apply loudness at the MUX via ffmpeg `loudnorm=I=<target>:TP=-1.5:LRA=11` (encode.Mux), which implements gated BS.1770 correctly.
holds: none

## 122. a typed line cut off mid-type because its beat was too short
(authoring) raised the speed to 48/s and the duration to 1.6s so it finishes at ~0.8s and holds before the cut. (framework) `make critique` now has a `typing-cutoff` rule: it flags any typing...
holds: none

## 123. beat transitions dipped to an EMPTY stage (jump-cut with a dip)
(authoring) overlap the beats ,  start each beat's entrance ~0.4-0.5s BEFORE the previous beat's content ends, with `out:"blur"` + the next `cut:"blur"`/`cutTiming:"brake"`, so the two...
holds: none

## 124. Seam D whole-stage bake deadlocked the render: the virtual clock starved chromedp's readiness Poll
Seam D (two-scene shader transitions) rasterises the two beats either side of a boundary into textures at build time, inside boot's awaited phase.
holds: none

## 125. seams ran at LINEAR speed while cuts were eased: every two-scene transition felt mechanical
Seams take a `timing` field (the same `TIMINGS` curves as cuts), applied in scene.html as `p = TIMINGS[s.timing]((t - s.t)/s.dur)`.
holds: scripts/gates/lib-test.mjs

## 126. neon bloomed a flat FLOOD colour, not the image's own colours (not how neon works)
What. The luminance-bloom refactor (#115) thresholds luminance for the highlight mask (correct), but then FLOODED a single colour through that mask (`feFlood` + `feComposite operator=in`),...
holds: none

## 127. our videos read STATIC and small next to real motion-graphics references
Captured the habits + the study pipeline (measure → catalog motifs → map to primitives) in docs/CRAFT/REFERENCE-STUDY.md, linked from CRAFT/README, with the reference-feel→primitive map and a...
holds: none

## 128. the camera zoom "shook" / wasn't smooth: cameraAt eased EVERY segment, zeroing velocity at each keyframe
`cameraAt` now honours a per-keyframe `ease` (mirroring `motionAt`), default `easeInOutCubic` so every existing camera is byte-identical (`make probe` confirms).
holds: none

## 129. seams rendered DEAD SILENT under `audio.auto`: sound design derived cuts + stings but never seams
(1) Added `SEAM_CUE` (13 seam fx → Cuelume voicing, same logic as CUT_CUE: whip→whoosh, iris→bloom, zoom→droplet, flash→press) and a `data.seams` derivation branch in scene.html. (2) While there,...
holds: none

## 130. `dy`/`dx` set without `anchor` silently did nothing: two pin-centred lines rendered on top of each other
What. Scoring the seam demo, two payoff lines ("every seam" / "is scored"), both `pin:"center"` with `dy:-105` / `dy:+105` to stack them, rendered ON TOP of each other ,  a garbled overlap.
holds: none

## 131. beatsync couldn't snap cuts past the music LOOP: a short bed left most of a film off-grid
beatsync now UNROLLS a looping grid: a seamless bed keeps its beat phase across the loop seam, so beat b recurs at b + k·period (period = the track's `seconds`).
holds: none

## 132. built a sparse TYPE-TEASER when the brief wanted a dense PRODUCT DEMO (told, didn't show)
What. Asked for a launch film with the density of a real reference, I shipped 6 big-type-on-black beats in 21s ("On brand.", "in minutes.") and used ONE of 15 captured product surfaces.
holds: scripts/gates/audio-check.mjs

## 133. our motion read FLOATY, not because we lacked snap but because the snap was never wired or defaulted
Wired `motionDefaults(theme)` into scene.html (durationScale scales enter/exit, stagger feeds split-text, applied as the fallback only ,  a layer's own values still win).
holds: none

## 134. the music bed BUZZED because it was synthesized oscillators, and it was auto-selected
Nothing auto-selects a synth bed anymore.
holds: scripts/gates/lint-test.mjs

## 135. a bare bed NAME in `audio.music` shipped SILENT: the Go mixer and the validator disagreed on resolution
Made the two agree. The Go mixer now resolves a bare bed name (no separator, no extension) to `assets/music/<name>.wav` via the existing `resolve` fallback arg (internal/audio/audio.go) ,  a named...
holds: none

## 136. a `lottie` layer with a root-RELATIVE src silently rendered EMPTY (no warning)
`preloadLottie` now normalises a non-absolute src to root-relative (`'/' + p`) before fetching and WARNS on a non-OK status or throw instead of swallowing it.
holds: none

## 137. Named GSAP fx typos degraded silently; two splitters could fight
`validate.mjs` gained `fxErrors(cfg)`: it checks every `fx`/`fxOut` name against the real `GSAP_FX`/`EXIT_FX` exports (with a `nearest()` "did you mean" pointer), and rejects a layer that declares...
holds: scripts/gates/schema-drift.mjs

## 138. resolveEasing swallowed unknown easing names
`resolveEasing` now checks membership explicitly and WARNS once per unknown name (listing the valid ones) before falling back.
holds: none

## 139. The validator's TYPE pass policed block layers it was meant to exempt
`walk`'s array-item recursion now skips an element whose `type` is `block`/`comp`, matching the unknown-prop pass.
holds: none

## 140. every authoring-QUALITY gate was opt-in and WARN-tier, so effect-soup passed everything that ran
`scripts/gates/author-check.mjs` (`make author-check`) chains validate · critique · direct · slop · inspect into one command, and `make video` runs it before rendering unless `NOCHECK=1`...
holds: none

## 141. no from-scratch "author a good video" walkthrough existed, so a blank page regressed to priors
`docs/CRAFT/AUTHORING-WALKTHROUGH.md` ,  the one front-to-back narrative, chaining the arsenal in use-order (manufacture the four things → lock sheet → JSON in layering order → `make author-check`...
holds: none

## 142. `make inspect` silently passed when no `.intent.json` sidecar existed
Within `make author-check`, a missing sidecar is surfaced as a visible WARN ("this scene declares no per-beat value contract"), and `--strict`/`STRICT=1` treats it as a failure.
holds: none

## 143. enforcement only gated the DOWNSIDE (slop); nothing forced ambition, so authoring stayed plain
Two-part forcing function: (1) `blueprints/` ,  directed-motion BEAT factories (`{type:"beat"}`, expanded by `make expand`) so kinetic reveals / count-ups / cascades / dashboard dives are the...
holds: none

## 144. seams flashed BLACK on every white-first scene without an explicit bg window
`core/timeline/seams.js stageToCanvas` ,  in the no-canvas-bg branch, fill the theme base bg (read `--bg` off `.hs-stage`, fall back to computed background-color, then `#fff`) BEFORE drawing the DOM, so...
holds: scripts/gates/seam-snap.mjs

## 145. the killer per-frame effects were missing (border-beam, aurora, meteor, flash-bloom)
`core/layers/beam.js` (new: border-beam + shine, DOM conic ring masked to the border, re-emitted each frame + dataset-stamped).
holds: none

## 146. `morph` was assumed to be TextMorph for EVERY layer type (svg shape-morph rendered as text)
Type-guard the dispatch: `if (L.morph && L.type !== 'svg' && window.gsap) buildMorph(...)`.
holds: none

## 147. camera library + logoReveal: two authoring traps found building the demo (fixed at the source)
What. Building the motion-showcase demo surfaced two ways an author gets a silently-wrong render: 1.
holds: none

## 148. sleek surface library (Phase 5): two gate interactions worth knowing
the grain SVG uses explicit `140` px dims (its tile size), so there is no `%` literal to misread.
holds: none

## 149. a new valid prop (`fill`) silently disarmed a meta-gate that used it as its "unknown prop"
Point the mutation at `notARealProp` ,  a name no layer will ever accept ,  and match on it.
holds: scripts/gates/gate-mutation.mjs

## 150. ported the another engine craft: seam-QA, anti-front-load floor, author-the-frame, the spec contract
What. Studied a real another engine-built promo (its storyboard, `frame.md` design spec, per-beat HTML+GSAP compositions, rendered frames, and the build session trace) to find what set its output...
holds: none

## 151. ported the full another engine pipeline (Steps 0-6) as local-model tooling
What. Studied the authoritative another engine `product-launch-video` skill (its gated Step 0-6 pipeline) and built our own version of all five adoptable pieces, offline / local-model only: 1....
holds: none

## 152. theme-remix emitted an incomplete `bg` block; dark bg presets crashed the render
Derive the whole block: a light ground pair + a dark ground pair (both always present, so a scene can pick ANY bg preset regardless of the theme's dominance), mapped onto every...
holds: none

## 153. dense per-child choreography (`parts`), so figures animate piece by piece by default
What. Our motion read flatter than another engine because a figure (a chart, a diagram) arrived as ONE block ,  we animated at the layer level, they choreograph every child on a timeline (bar 1...
holds: none

## 154. the composition path (per-beat GSAP timeline), and TWO framework bugs it surfaced
What. Adopted another engine' "one worker hand-writes a GSAP timeline per beat" model ,  but SAFELY.
holds: scripts/gates/lib-test.mjs

## 155. direction-floor nagged "no-camera" on scenes that HAVE a cameraMove (pre-expand blind spot)
direction-floor now also credits `d.cameraMove` directly: a cameraMove that names a `move` or changes scale/position (from!==to, or a tx/ty target) counts as the `camera` technique.
holds: scripts/gates/lib-test.mjs

## 156. first-class scene-unit transitions (A slides out, B slides in) ,  the missing scene swap
Opt-in `"sceneUnits": true`: partition layers into BEATS by the `cuts` times, wrap each beat's layers in a `.hs-beat` div, and at each boundary move the OUTGOING wrapper (exit) against the...
holds: none

## 157. the produced baseline: force rich-by-default at the ENGINE, additively (go all-in like another engine)
What. The engine was capability-oriented (composition/parts/sceneUnits/camera all opt-in) so authors defaulted to thin videos.
holds: scripts/gates/lib-test.mjs

## 158. glow.frame() left a STALE inner value outside its window; sceneUnits exposed it as non-determinism
glow.frame() now sets the inner DETERMINISTICALLY for every t ,  no early return.
holds: none

## 159. the engine PICKED the background, so nobody ever designed one
`bg` is now required in `formats/scene/schema.json` (`required` + `minItems: 1`), and the injection is gone from `core/engine/produce.js`.
holds: scripts/gates/author-check.mjs, scripts/gates/gate-mutation.mjs, scripts/gates/lib-test.mjs, scripts/gates/scene-snap.mjs, scripts/gates/snap-signature.mjs

## 160. hand-authored CSS animation renders a DEAD STILL, and said nothing
`timeCssUsed()` in the new shared `core/type/sanitize-html.js` detects `animation` / `@keyframes` / `transition`; validate rejects them by name in BOTH a bg window and an `html` layer, and the message...
holds: none

## 161. judged a moving background on ONE still, and got the motion twice too fast
Retuned against the strip, not the still (speed 1 → 0.42, scale 2.4 → 1.25, crossed-wave field, ramp rebalanced for the new distribution).
holds: none

## 162. "check the beats" was a step in a list, so it got skipped
What. `make beats` has always been step 2 of the authoring ladder, and it is the step that catches the things no static gate can see.
holds: none

## 163. `anim: "none"` was a valid schema value the engine did not have
`"none"` is a real no-op entry in `ANIM` now. Lesson. `schema-drift` compares the schema against the registries it copies, and it reported this enum as in sync while it carried a value the engine...
holds: scripts/gates/direction-floor.mjs, scripts/gates/gate-mutation.mjs

## 164. four shipped scenes had been cross-fading against their own instructions
What. Fixing #163 (`anim:"none"` was a schema value the engine did not have) changed the output of four tracked scenes: `showcase-cuts`, `brew-launch-act1`, `showcase-vawe`, `showcase-vawe-reel`.
holds: none

## 165. a gate went blind in a refactor and spent months shouting at everything
The shared path is now named by DIRECTORY, not by file, so a future split cannot blind it.
holds: scripts/gates/audit-scenes.mjs, scripts/gates/lib-test.mjs, scripts/gates/motion-audit.mjs

## 166. every short film in the library was a slideshow, and nothing said so
The tell blocks, and the 18 carry explicit waivers so the gate holds new work without breaking `make video` for scenes it did not cause.
holds: scripts/gates/beat-check.mjs, scripts/gates/gate-mutation.mjs, scripts/gates/lib-test.mjs

## 167. the continuity skill was A/B tested, won on structure, and lost the hook
Step 3b added to the skill: the continuity rule sits UNDER the house hook rule, not in place of it.
holds: none

## 168. second A/B, the hard case: no product, no UI, nothing to capture
What. The continuity skill was tested again on the case built to break it: a service with NO app and NO dashboard (humans negotiate your software contracts, you forward a quote and get a lower price).
holds: none

## 169. the slideshow ban never evaluated a single one of the three test films
What. A three-arm test on one brief: no skill and no gates, no skill with gates, and the skill.
holds: none

## 170. closing #163: boundaries are inferred now, and the ban is honestly scoped
`no-continuous-object-inferred` catches a short film that declares no cuts at all.
holds: none

## 171. dead-air counted a black scrim and a 60px dot as "content on screen"
`content` now drops both. A blackout is a rect at or over the canvas on both axes with an opaque bare-hex fill; a speck is a declared box under 8% of the canvas on both axes (under two thousandths...
holds: scripts/gates/author-check.mjs, scripts/gates/dissolve-check.mjs

## 172. a global `cut` blanked the whole frame, and the timeline gate called the hole a transition
`core/cuts/index.js` gains `soloCutStyle` for the single-root path: same closed-form styles, every VISIBILITY channel (opacity, clip, mask) pinned at identity, so the transition rides on transform and...
holds: scripts/gates/scene-timing.mjs

## 173. the storyboard promised a change, the film never built one, and every gate stayed green
`scripts/gates/plan-vs-render.mjs`, wired into `author-check` after `inspect` (it reads the same `.intent.json` sidecar, which already carried `span` and `becomes`) and standalone as `make...
holds: none

## 174. six gate fixtures were passing on the fixture's own filename
Anchor on the printed FINDING shape (`[plan-has-no-spans]`, `stub-why , `), which a filename cannot produce.
holds: scripts/gates/author-check.mjs, scripts/gates/dissolve-check.mjs

## 175. the anti-slop detector read every ISO date as an `01 / 02 / 03` section scaffold
`(?<![\w\-/:.])(0[1-9]|1[0-2])(?![\w\-/:.])` in `skills/impeccable/scripts/detector/engines/regex/detect-text.mjs`.
holds: none

## 176. the layout audit was the one gate you could not waive, so a deliberate composition failed it
`verify/audit.mjs` reads `authoring.allow` the same way every other gate does.
holds: none

## 177. a dissolve between two text states is illegible at its midpoint, and nothing checks it
What. Raised by the user as "settled states are good but during the animation things can be calibrated better".
holds: none

## 178. every film was type in a box, and no gate had an opinion about it
`scripts/gates/visual-vocabulary.mjs`, blocking, wired into `author-check` beside the ambition floor and standalone as `make visuals`.
holds: none

## 179. the mutation harness edits tracked source in place with no lock
What. `gate-mutation` reported `conformance` failures that changed count between two identical runs (2, then 1), which I had been carrying as a known intermittent flake.
holds: none

## 180. the crossfade-to-mud defect came straight back, in the film written to fix everything else
Both are wipes now: one box, two strings, clipped from opposite sides by the same variable, with a read head at the seam.
holds: none

## 181. the mud detector, and the sixth instance it found immediately
What. #177 named a mechanically detectable defect and said the fix was a gate. #180 recorded that skipping the gate cost one repeat within two commits.
holds: none

## 182. the gate measured area as `w * h` and reported 0% with total confidence
`boxOf(L)` in `scripts/gates/scene-timing.mjs` resolves size in five honest tiers: `explicit`, `size`, `intrinsic` (read the asset's own header, PNG IHDR / JPEG SOFn / SVG viewBox, no...
holds: none

## 183. the tool for comparing two cuts could not hold two cuts
`/tmp/judge/<basename>/`. Every path the tool prints now names the film. The related duplication, fixed at the same time. The beat clustering, the ffmpeg tiling graph, and the craft rubric each...
holds: scripts/gates/direction-floor.mjs

## 184. three ways to make a picture that isn't there, found in one afternoon
The show-don't-tell campaign's first two scenes each shipped a graphic that was, at some point, silently not drawing.
holds: none

## 185. `var(--t)` worked on the background and did nothing on a layer
`core/layers/html.js` now exports a `frame()` that sets `--t`.
holds: none

## 186. the fake waveform three judges believed
The beat-grid drawn under "on the beat." used `abs(sin(i * 1.7))` for its background bars, as filler behind the real cut marks.
holds: scripts/gates/gate-mutation.mjs

## 187. the A/B sampler landed mid-entrance and three judges scored the still as broken
When only one arm has a scene, that scene's beat table is used for BOTH arms.
holds: none

## 188. three gates were blind to motion authored in CSS, and one of them demanded it
`hero-site`'s new graphic is an inline `<svg>` whose every shape is a function of `var(--t)`: eighteen bars, each with its own delay, that hold as raw numbers through beat 1 and grow into an...
holds: scripts/gates/gate-mutation.mjs

## 189. the continuity gate passed a spine the renderer had already cut in half
A cut film that wraps beats as units now fails `beats-wrapped-as-units` and is told the one fact that unblocks it: set `"sceneUnits": false`.
holds: scripts/gates/gate-mutation.mjs

## 190. the layout audit forgave a headline it could not see
A new HARD finding, `buried`: for each `[data-layer="critical"]` layer (>=60px display text), sample a 9x9 grid over its ink and hit-test each point; if more than 40% of it sits under opaque...
holds: none

## 191. four contact-sheet writers shared one filename
Every sheet is named for its scene: `/tmp/beats/<name>.png`, `/tmp/reveal/<name>.png`, `/tmp/seams/<name>.png`, `/tmp/audit/<name>.png`, each with its own scratch directory.
holds: none

## 192. the continuity gate printed an instruction that throws
The gate imports `SOLO_BLIND` from the renderer's own module rather than restating the list, and when the film's cuts contain one it names the two routes that exist: move those seams to a style...
holds: none

## 193. a layer could not opt out of beat wrapping, so the doctrine's central rule was unauthorable
`"acrossBeats": true` on a layer. `beatIndexOf` returns null for it, which the two existing call sites already handle: the layer attaches to `cam` rather than a wrapper, and `setLayerTiming`...
holds: none

## 194. 37 references to a custom property nothing defines
All 37 repointed, generators included. A new `dead-token` finding in the design-spec lock reads every `var(--x)` in a scene and checks it against the tokens the ENGINE actually defines, derived...
holds: scripts/gates/lib-test.mjs

## 195. the renderer painted nothing rather than refusing, and looked like the lenient one
Dispatch goes through `pick(L)`. A missing `type` still means text, the documented default.
holds: scripts/gates/lib-test.mjs

## 196. eight render workers starved raster, and words blinked out
A user watching `showcase-flight` said "words are flickering".
holds: none

## 197. a card scaled about a box that did not exist yet
Scale about the card's own centre stated in user units (`transform-box: view-box` plus an explicit `transform-origin` in px).
holds: scripts/gates/lib-test.mjs

## 198. three craft decisions were opt-in, so the library never made them
`higgsfield-recreation` is the exemplar and the rest of the library does not move like it.
holds: none

## 199. a layer flashed back to solid on the last frames of its own fade
`baseOpacity(el)` returns the parsed value whenever it is finite and only defaults to 1 when it is not.
holds: none

## 200. a layer that peels off a shared pan continues from where the PAN left it
Two parts. The film peels at t=1.05 instead of 1.44, before the pan crosses its destination, so the travel stays monotonic and decelerates 877 → 834 → 601 → 556 → 362 → 200 → 100 → 40.
holds: none

## 201. a merged motion track must state the whole pose at every key it fabricates
Every key the merge produces now states the full pose.
holds: none

## 202. two elements that mean the same thing, and the dead tail under both gates
The waveform now draws until ~4.6s instead of ~4.08s, then settles for 0.4s.
holds: scripts/gates/motion-audit.mjs

## 203. multiPhase's "hold" leg panned the camera home
Found by prediction, not by watching. The method: take the bug shapes from #199-#202, enumerate every site in the engine that has the same shape, and probe each one.
holds: none

## 204. removing an element is not the same as replacing what it did
Keep the function, drop the form: three dots pulsing in sequence, which cannot be mistaken for the ring because they are not round, and which read as the ellipsis of "Composing…" rather than as an...
holds: none

## 205. the silent-prop sweep: four conditionals that swallow an author's input
Class E of the predicted-bug hunt. A prop read only INSIDE a conditional on another prop does nothing when that other prop is absent, and does it in silence.
holds: none

## 206. a frozen span is a fraction of the runtime, and the gate could not see inside a layer
Class D: the gap between two gates' thresholds. `motion-audit` warned on a frozen span over a flat 2s.
holds: scripts/gates/motion-audit.mjs

## Class B and Class C: what the hunt did NOT find
Recorded because a negative result from a systematic sweep is worth as much as a hit, and because the next person to have this idea should know the yield. Class C (identity-vs-absent defaults) has...

## 207. four things between the capture tools and a real brand
All four found in the first twenty minutes of trying to make a film for an actual company, which is the point: they had been in the repo for months and no amount of engine work would have surfaced...
holds: scripts/gates/lib-test.mjs

## 208. the rules audit: nine of thirty-four rules are not doing what they claim
`scripts/dev/rules-audit.mjs` asks every gate finding the three questions the gates ask films: does it > Cut on 2026-08-05 in `cc2dfc2`. The audit below is the one run it produced.
holds: none

## 209. the library was already disposable, and I nearly deleted it permanently
What happened. Asked to clear out the scene library so the rules stop being calibrated against it, I triaged 108 scenes into keep/drop and said, in as many words, that deletion was safe because...
holds: scripts/gates/author-check.mjs

## 210. rendering at 60fps silently threw away motion blur
The floor is now `AUTO_BLUR_FLOOR_PER_SEC = 480`, divided by the frame rate at use.
holds: none

## 211. the 60fps default, and the two gates that would have read it wrong
The policy. A final render is 60fps, an iteration render is 30.
holds: scripts/gates/seam-snap.mjs

## 212. the engine could move a box and scale a box, but never resize one
`w`/`h` are keyable. `core/timeline/sequence.js` gains `resolveBoxes()` and `motionAt` returns `w`/`h`.
holds: none

## 213. depth was a number, not a track, so nothing could pass behind anything
`track` is keyable, on the same contract as `w`/`h` (#212) ,  `resolveKeyedProps` fills a keyed property from the layer once, up front, so `motionAt` keeps ONE interpretation rule.
holds: none

## 214. a documented layer feature that never once worked, and I claimed the gap it left was a wall
What. I wrote in #212 that reflowing a grid was "impossible, not hard".
holds: none

## 215. four lossless compressions per frame, for a lossy file
Capture JPEG q95 (526 → 80 ms/frame at 3840x2160, 6.6x) and hand the supersample resolve to ffmpeg's `scale=flags=area` ,  which IS the ss×ss box filter the Go loop implemented, so it is the same...
holds: none

## 216. an html layer's `h` was accepted, set, and then ignored by everything inside it
`build()` now sets `height` from `L.h` alongside `width`, and the wrapper carries `height:100%`.
holds: scripts/gates/lib-test.mjs, scripts/gates/lint-test.mjs

## 217. the layout audit measured a rotating layer's empty corners, not the ink it draws
`verify/audit.mjs` samples SVG outlines for a true rotated bound, uses geometry ink on both axes, and CLAMPS the result to the border box.
holds: scripts/gates/lib-test.mjs, scripts/gates/lint-test.mjs

## 218. the script gate called kinetic typography an echo
The distinction is frequency, and it is the one a human makes without thinking.
holds: none

## 219. a rect's `fill` was accepted and thrown away, because the unknown-prop check is type-agnostic
`rect` now honours `fill` as an alias for `bg`.
holds: scripts/gates/plan-vs-render.mjs

## 220. the layout audit called a label on a card a collision
`verify/audit.mjs` now treats a layer as a SURFACE when it, or any descendant filling at least 85% of it, paints a background, and excludes surfaces from the text-overlap set.
holds: scripts/gates/lib-test.mjs, scripts/gates/lint-test.mjs

## 221. a single `--aspect` silently overwrote the render it was not asked to replace
Tag whenever `--aspect` is passed at all.
holds: none

## 222. the audit read a stylesheet as glyphs and called it clipped text
The check now uses the shared `inkText()` helper, which walks text nodes and rejects anything inside `style` or `script`. Class, and the part worth remembering. This is #220 again, in a second...
holds: none

## 223. the same stylesheet-as-text bug, in a third and fourth consumer
All of them read the shared `inkText()` now. Class, and why this entry exists at all. This is the THIRD time. #220 found it in the overlap check and fixed that call site. #222 found it in...
holds: none

## 224. a modifier slot was nearly added to a prop that was already taken
The slot is `modifiers` (`core/fx/index.js:13-18` states why, next to the registry it names).
holds: none

## 225. the scene's light was going to be handed to every layer unvalidated
`formats/scene/scene.js:464-481` validates `lighting` before freezing it: object shape, the key set `x`/`y`/`intensity`, finite numbers, non-negative intensity, each with a message naming the...
holds: none

## 226. the 3D spike proved a construction and said nothing about how the engine is assembled
`core/fx/tilt.js` writes the camera on `el.parentNode`, whatever that turns out to be, at frame time (see #227 for why not at build). Which gate catches it. None, and that is worth saying: a...
holds: none

## 227. what a modifier may not assume at build time: no parent, and no wrapper
Stated in the contract at `core/fx/index.js:43-58` and obeyed by all four modifiers.
holds: none

## 228. two tilted siblings under one parent resolved last-writer-wins, and one silently lost its lens
`core/fx/tilt.js:130-137` makes it a hard error: a layer writing a camera onto a parent that already carries a different one throws, naming both values and the two ways out (agree on one `dist`,...
holds: none

## 229. a 404's body was parsed as the scene, and a file nobody opened was blamed for its contents
What. Two error messages, both naming the wrong cause, both current until this pass.
holds: none

## 230. `--alpha` exported a fully opaque overlay, and every downstream flag on that path was wrong too
`formats/scene/scene.js` reads the `alpha` class `core/engine/boot.js` already sets and suppresses both backdrops, the canvas and the hand-authored `bgHtml`.
holds: none

## 231. the watermark was drawn at twice the frame size and clipped, on every render that was not a draft
`internal/encode/encode.go` scales the base first and sizes the sheet against the result.
holds: none

## 232. a nested group's modifiers were built by nobody, and only half of each one ran
`core/layers/index.js:74` injects `kit.buildFx` beside `kit.buildLeaf`, and `core/layers/util.js:243` calls it for the group branch.
holds: none

## 233. "a group child has no box" was a conclusion drawn from the authored x/y
`formats/scene/scene.js` measures each identified child once at build as a delta from its top-level ancestor's rect (rects, not an `offsetLeft` chain ,  `offsetParent` skips a statically...
holds: none

## 234. the per-frame pipeline's order was the order of nine statements, and three of them were load-bearing in ways nothing said
`core/tracks/` ,  one file per job exporting `slot` and `frame()`, with the running order in a single `SLOTS` list resolved ONCE at module load into a flat array of functions.
holds: scripts/gates/gate-mutation.mjs

## 235. schema-drift had been reading a 20-line shell and calling it the engine
The scan is now the orchestrator (`scene.js`, and `scene.html` for as long as it may hold anything) plus the three registry DIRECTORIES walked whole: `core/layers`, `core/fx`, `core/tracks`.
holds: scripts/gates/schema-drift.mjs

## 236. four layer types were one primitive in four copies, and the copies had already drifted apart
`core/layers/canvas.js` is the one primitive; `core/surfaces/` is a registry of backends in the shape of `core/layers/`, `core/fx/` and `core/tracks/` ,  a `REGISTRY`, an exported `SURFACE_TYPES`,...
holds: none

## 237. schema-drift read `L.` and `C.` but not `LL.`, which the gate next to it had matched all along
The same pattern the neighbouring gate uses.
holds: none

## 238. a gate followed a builder's imports one hop up, but never sideways
Resolve both relative forms against the importing file's own directory.
holds: none

## 239. the camera scaled a finished picture and called it a push
One camera model ,  position (`x`, `y`, `s`), orientation (`roll`, `rx`, `ry`), lens (`p`) ,  with two provably equivalent emissions.
holds: none

## 240. a blocking gate squared a layer, and so passed the one defect it existed to catch
The `proxy` tier is gone: `boxOf` returns `{w:0,h:0,how:'unknown'}` for a single-axis layer with no intrinsic aspect.
holds: none

## 241. a determinism sweep reported regressions that had not happened, because it shared one browser
`scripts/gates/snap-scenes.mjs` recycles the browser every 10 scenes.
holds: none

## 242. a factual finding was filed in the taste bucket, and a cull carried it out of sight
Moved to `scripts/gates/beat-check.mjs`, which is always on, walks the clock rather than the layer list, and already owns `dead-air` ,  the same class of finding, the same reader.
holds: scripts/gates/lint-test.mjs

## 243. sound by default was never decided, it was inherited from a bug fix
Doctrine reversed. `audio._why` added, matching `authoring._why` including its 12-character floor.
holds: none

## 244. the only continuity the engine could express was visual, so every film had to carry a prop
`audio.bridges` ,  a span of sound hung off a NAMED junction, `core/audio/bridges.js` resolving it in the browser (the only place that knows where the film's cuts are) into seconds, and...
holds: none

## 245. The design-spec lock knew three type roles; the engine has four
What happened. `onefilm` sets `"font": "num"` on its count layer, which is what the vawe theme's `type.num` (JetBrains Mono) exists for: tabular figures under a rolling number.
holds: scripts/gates/designspec-check.mjs

## 246. the provenance table described a file that was no longer there, and could not survive a clone
`audio-bake.mjs` writes a credits row for every bed it bakes ,  generated-by, no licence, verified true ,  and says out loud when it is correcting an entry that claimed a download.
holds: none

## 247. beat wrapping discarded the authored `duration`, and the DOM kept no record of it
Separate what renders from what is reported, rather than change what renders. - `scene.js` writes `data-authored-duration` alongside the rewrite.
holds: none

## 248. `make studio` showed a blank stage for a scene whose exact error was one property away
`ready()` checks `engineError` first and paints it into a card over the stage, verbatim, with the readout saying `scene did not load`.
holds: none

## 249. `buried` called a fully visible graphic 100% covered, because an ink rect was read raw (a fourth #211/#214/#216/#217)
The clamp now lives inside `inkRect` (`clampToBox`), so an ink rect can only ever shrink the element's border box and falls back to the box when the intersection is empty, for every consumer,...
holds: none

## 250. A validator rule outlived the bug it was written for, and started inventing one
What happened. Authoring `onefilm`, every typed line in the file column carried `<b>` around its JSON value so the value read in ink against a grey key.
holds: none

## 251. The layout audit read a rotated stage as if it were flat, and manufactured collisions
What happened. `onefilm`'s beat 5 is its only camera move: the stage tilts and pushes so the file and its results are seen on a plane from an angle.
holds: none

## 252. a layer the engine animated for 12.7s and never drew: an overlay bar behind a tilted capture
What. `playhead.json` declares its continuous object as one vertical bar: a text caret at 0s, the studio playhead from 3.3s, the leading edge of a render fill at 14s.
holds: none

## 253. `layer-props` was inverted: 1482 false alarms and ~66 real misses, because it looked for reads instead of asking for them (a fourth #229/#232/#242, and the same shape as #214/#216/#217)
`make layer-props` reported 1482 props "accepted and dropped" ,  the failure CLAUDE.md names as the most expensive in this repo.
holds: none

## 254. `make reveal` reported a contact sheet it had not written, and stamped a receipt for it
What happened. `make reveal D=formats/scene/playhead.json` printed `✓ reveal · 5 beats … → /tmp/reveal/playhead.png` and exited 0.
holds: none

## 255. the film's declared subject was not drawn for seven frames, at the exact moment it hands off
What happened. `playhead.json`'s whole spine is ONE vertical mark the viewer tracks from caret to playhead to render fill.
holds: none

## 256. the dead-CSS check had three blind spots, and each one was a place hand-written CSS actually lives
What happened. `core/tokens.css` disables `transition` and `animation` engine-wide, so hand-authored CSS motion renders a dead still and says nothing.
holds: none

## 257. a missing fragment would have been a grey box, so it throws instead
What happened. Hand-authored HTML could only be an escaped string inside the scene JSON: 130 fragments across 53 scenes, one of them 127,467 characters on a single line, none of them readable,...
holds: none

## 258. two gate runs at once deleted a guard from the engine and left it deleted
What happened. `gate-mutation`'s source cases edit tracked engine files in place: write the mutation, run the gate, write the original back.
holds: none

## 259. the anti-pattern detector reports "clean" when it cannot run
What happened. Wiring `impeccable`'s detector into `make preview` (approval stop 1b), the first result on every fragment and on `docs/animation.html` was zero findings and exit 0.
holds: none

## 260. the guard against a destructive command matched the prose describing it, twice
`commandsIn()` in `scripts/live/no-blanket-git.mjs` strips heredoc bodies and quoted literals, splits on command positions (`;`, newline, `&&`, `||`, `|`) and anchors every pattern with `^`, so a...
holds: none

## 261. the schema and the engine compared layer props BY NAME, so a name could mean two things
`formats/scene/schema.json` now carries a generated `layerProps` block, written by `node scripts/gates/schema-drift.mjs --write` from the `PROPS` declarations and checked in.
holds: none

## 262. `hue` was live in the engine and missing from the schema, because the scan only matched `L.`
The comparison is now against the DECLARATIONS, which `core/surfaces/paint-fx.js` has always carried (`export const PROPS = { …, hue: {}, hues: {}, … }`).
holds: none

## 263. `transition` was documented, read, and declared by nothing
`core/transitions/lower.js` exports `PROPS = { transition: {} }` beside the read, and `core/layers/vocabulary.js` merges it into the shared half. Which gate catches it. `make schema-check` ,...
holds: none

## 264. an unknown prop on a layer was accepted and then ignored, at render time
`core/layers/vocabulary.js` assembles the complete vocabulary from the declarations, and `createRenderer(...).build()` walks the layer and every descendant and THROWS on a prop nothing declares,...
holds: none

## 265. the gate and the renderer each built their own copy of "what the engine accepts"
One union, `SHARED_PROPS` in `core/layers/vocabulary.js`.
holds: none

## 266. the docs named commands and files the repo did not have, and two gates that would have said so were red and ignored
`scripts/gates/doc-refs.mjs` (`make doc-refs`), wired into `make review`.
holds: none

## 267. the gates measured the box the author asked for, not the ink the frame carries (a fifth #214)
- `verify/audit.mjs`: the ink helpers (`paintsBox` … `inkRect`) move above their consumers, and `info` (which feeds overlap · tight · top-heavy · display-type contrast · image contrast) is built...
holds: none

## 268. a load-bearing comment claimed the capture was byte-stable, and it never was
The comment is replaced with the measurement.
holds: none

## 269. a captured component's images were never preloaded, and they are somebody else's CDN
What. `preloadImages` in `core/engine/boot.js` walks the SCENE DATA for image paths, and its own comment says why it exists: "without this the Go renderer can screenshot a frame mid-download, so the...
holds: none

## 270. `_lightfall.html` moves at frame rates against a clock measured in seconds
Not applied. `_lightfall.html` was out of scope for this pass and is hand-baked, so there is nothing to fix but the 58 literals.
holds: none

## 271. `make preview` is the wrong page for a full-bleed fragment
`scripts/author/lightfield-shot.mjs` gives one: a stage at the exact output size with `--t` set explicitly.
holds: none

## 272. a fidelity metric that averages away the thing it is grading
`scripts/author/lightfield-metrics.mjs` now defines both, once, and both are printed: `blockError` for the colour field, `striping` for the pattern (`edge`, the mean absolute horizontal step;...
holds: none

## 273. four abandoned search processes, all appending to one log
Not applied in code. The working practice is: one search at a time, verify with `pgrep -fl` before relaunching, and give each run its own log path.
holds: none

## 274. a backdrop declared by `src` rendered nothing, and said nothing, the day `src` shipped
`createBgHtml` takes the table and resolves through `htmlSource`, so both halves of the feature use one resolver.
holds: none

## 275. the one-source rule explained a collision it was not looking at
The message now names the pair that actually collided: `src` IS `html` in a file, so keep one.
holds: none

## 276. update ,  the two hand-authored backdrops moved at frame rates against a clock in seconds
Fixed in the same pass. Every `var(--t) * K` coefficient in `_lightfall.html` (86 terms) and `_arcfall.html` (40 terms) was authored as if `--t` counted frames; `core/layout/bg-html.js` writes SECONDS.
holds: none

## 277. closed in part, and one half of it is still open
Two real defects in `make preview`, both fixed. One: the preview never set `--t`. The frame clock is written by `core/layout/bg-html.js` every frame, in seconds.
holds: none

## 278. a capture localizer that only recognised an asset by its file extension
`scripts/brand/localize-assets.mjs`. One tokenizer finds asset references BY CONTEXT, from a table of (tag, attribute) pairs: `img`/`source` `src` and `srcset`, `video` `src` and `poster`,...
holds: none

## 279. Chrome painted a blank placeholder where a captured component's images should be, and the screenshot kept it
Two Chrome flags in `allocOpts`, `internal/scene/scene.go`: chromedp.Flag("disable-checker-imaging", true), chromedp.Flag("run-all-compositor-stages-before-draw", true), The entrance window then...
holds: none

## 280. the worker that drew a frame was decided by a race, so no two renders could be compared
The jobs are dealt round-robin before any browser starts (`perWorker[i%workers]`), not raced for.
holds: none

## 281. still open: a second cause, and it is not antialiasing either
With the raster race closed and the worker assignment fixed, 250 of 1890 frames still differ between two renders, and the frame map is identical, so the *same browser* drew each of those frames in...
holds: none

## How to re-measure any of this
VAWE_KEEP_FRAMES=1 VAWE_FRAME_MAP=/tmp/mapA.txt ./bin/vawe formats/scene/brew-launch.json cp -R "$(printf %s "$TMPDIR")frames_brew-launch" /tmp/runA # repeat for run B go run...

## 282. two passes tuned the wrong half, because each inherited the last one's ceiling
What. The lightfield reference reproduction was washed out.
holds: none

## 283. the playground found two engine bugs in its first hour, which is the argument for it
The generator playground went up so people could turn the dials in a browser.
holds: none

## 284. a screenshot taken at `load` is a picture of the browser's timing
`stableShot` (`scripts/author/lightfield-render.mjs`) shoots until two consecutive frames are byte-identical, and throws when that never happens.
holds: none

## The block option contract, and two dead props it exposed
70 block families now declare what they accept (`blocks/schema.mjs`, gate `scripts/gates/block-schema.mjs`).

## 285. `loadingBar` accepts `color` and never reads it
What. `blocks/dev.mjs`: export function loadingBar({ …, color = T.greenBright, settle = T.green, label, done = true } = {}) The fill paints with `settle`.
holds: none

## 286. `toast` accepts `body` and never renders it
What. `blocks/ui.mjs`. The file's own comment says the alert family (`notification` · `toast` · `callout` · `banner`) "now shares ONE vocabulary: `title` and `body`".
holds: none

## 287. A range that was tighter than the shipped catalog
What. The first draft of `CORE_SCHEMAS.splitScreen.h` set `min: 100`, reasoning from the container's own geometry.
holds: none

## 288. Ranges that could not be derived, and are wide on purpose
Recorded so nobody reads a wide bound as a considered one: - `statBig.to` / `statBig.from` / `statCard.to` / `statCard.from`: `±1e12`.
holds: none

## 289. the deploy failed on a directory `.dockerignore` excluded, and nothing local could see it
`scripts/site/docker-context-check.mjs` (`make docker-check`, in `make review`): read the Dockerfile's COPY lines, apply `.dockerignore`, and fail on anything the build asks for that the context...
holds: none

## A. A fidelity metric that samples only the lit half
What happened. The `ref` preset scored a mean sample distance of 12.7 against `refs/lightfield-ref.jpg`, every other number agreed, and the human who asked for it said it did not match.

## B. One colour role doing two jobs, and the measurement that proved it
What happened. The obvious fix for warm shadows was to make `ground`, the colour the light falls away into, violet.

## C. A constant fitted to one image, imposed on every image after it
What happened. Two of three reference photographs came out with three hard-edged ellipses across them that nothing in the palette could hide. Root cause. How fast a bloom lobe fades was a module...

## D. A prominence filter with a fixed pass count
What happened. The new band-counting metric reported 292 bands for a picture with twelve panels. Root cause. It counts local maxima in a column-luma profile and collapses the extrema chain until...

## Also found, not fixed
`scripts/author/lightfield-fit.mjs` imported `open`, `W` and `H` from `lightfield-render.mjs`, which exported none of them, so the tool could not run at all and nothing said so.

## 290. the silhouette is per-element, and the reference's is one landscape
Attempted and reverted, twice, and recorded so the next attempt starts past it.
holds: none

## 291. the randomiser could roll an illegal pair, and the person clicking got the blame
What. `lightfield` refuses a dial the chosen structure cannot express: `rings` has no seam WIDTH and no left-to-right axis, so `shadow.seamWidth` and `envelope` on a ring field throw and name the...
holds: none

## 292. the playground did not fit on a screen, measured
Before, on the live page: 2.4 screens at 1440x900, 2.7 at 1280x800, 3.1 on a phone, and the preview started 455px down and ended at 914px against a 900px viewport, so the thing the page exists for...
holds: none

## 293. one score for five looks could not say which one was wrong
`lightfield` was one generator with five presets and ONE fidelity number, taken against one photograph.
holds: none

## 294. the library is the page, and the cards are the real thing
The playground picked a generator from a dropdown, which is fine for one and useless for twenty-seven.
holds: none

## 295. a preview that animates cannot be judged
The playground drove `--t` from a rAF loop, so the field was always moving.
holds: none

## 296. "has a reference" is not "looks good", and I shipped the difference
Having pulled the two invented looks, I kept the other three because each HAD a reference.
holds: none

## 297. two of the five looks were invented, and it showed
The user opened the library and said everything except `colonnade` looked bad.
holds: none

## 298. the basic panel is a colour changer, and that is the whole point
Eight primary dials was still a control panel.
holds: none

## 299. the playground exports what it shows, and nothing on it can move
No movement, no way to make it move. The rAF loop went in #295 and the clock slider went with this change.
holds: none

## 300. a ceiling reported by a previous pass was a missing operation, not a ceiling
What went wrong. `ember` shipped as the tonal INVERSE of its own reference for three passes: `refs/ref-a.jpg` is black with bright flames on it, and the render was a lit field with black teeth in it.
holds: none

## 301. a layout fitted to one photograph was imposed on every field after it
What went wrong. `ember`'s light is off the bottom-right corner of the frame.
holds: none

## 302. the mound of light on a face was nailed to one side of every element
What went wrong. Every lit field this generator could draw was lit from the same side.
holds: none

## 303. a landscape is not a row of boxes, and softness could not turn one into the other
What went wrong. `colonnade`'s dark masses were twelve separate rounded boxes with steps between them; `refs/ref-b.png` is ONE continuous ridge with the panel seams drawn over it.
holds: none

## 304. a mean error cannot see a shadow's temperature, and `blinds` proved it twice
What went wrong. `blinds` scored 20.0 and its lower-left corner read `#5a071f`, a lit crimson, where the reference is `#1c0b21`, a dark violet.
holds: none

## 305. what is still wrong with the three looks, measured
* ember's hottest flames are amber where the reference's are white (`#a47800` against `#fefff2`).
holds: none

## 306. unrelated, found on the way: lightfield-seeds.mjs cannot run
`scripts/author/lightfield-seeds.mjs` cannot run: it imports `scripts/author/lightfield-model.mjs`, which is not in the repository.
holds: none

## 307. the randomiser made ugly pictures, and the presets said exactly why
The user rolled the dice and got a green bloom, a blue blob and a yellow wash in one frame: three unrelated light sources and nothing to look at.
holds: none

## 308. a backtick inside a GLSL comment silently ended the shader
Adding a `blinds` effect to `core/surfaces/shaders-ambient.js`, the render stopped failing with a named GLSL error and started TIMING OUT with nothing in the log.
holds: none

## 309. the blinds generator is ours, and the licence is why
React Bits ships a "Gradient Blinds" component under MIT plus the Commons Clause, which permits use and forbids redistributing the component "whether alone, in a bundle, or as a ported version".
holds: none

## 310. The bloom cluster had exactly three lobes, and the three was a constant
`colour.lobes`, 1 to 12, default 3. The lobe series is the fitted three continued by their own decay, and the whole series is scaled so the cluster covers the same total area at any count.
holds: none

## 311. Lobe placement was independent, so a cluster is lumpy by construction
`colour.evenness`, 0 to 1, default 0. At 1 the span is cut into one band per lobe and each lobe draws inside its own.
holds: none

## 312. `shadow.direction` could not say "a lit band"
`top-and-bottom` and `left-and-right` in `DIRECTIONS`: the existing falloff profile mirrored about the middle of the frame.
holds: none

## 313. A recorded finding said the reference's dark side has no bars. It has more than anywhere else
`colour.through`, a fifth colour role: the light that comes through the pattern rather than off it, screened on the lit faces only.
holds: none

## 314. `lightfield-seeds.mjs` and `lightfield-fit.mjs` have never run
What. Both import `./lightfield-model.mjs`.
holds: none

## 315. Every curve in the envelope was a sine or a straight line
Four kinds built from circular arcs and gaussians rather than from sines: `circle` (the exact unit semicircular arc, symmetric), `crescent` (one arc with an equal arc bitten out of it), `scallops`...
holds: none

## 316. `shadow.direction` is a bearing, and a bearing is not a place
`shadow.originX` / `shadow.originY`, the same units and the same name as the light's pair, default 50/50 which is exactly the unmoved position.
holds: none

## 317. The silhouette had no position, so authors picked its shape for the wrong reason
`envelope.originX` / `envelope.originY`, same units, same name, default 50/50 unmoved.
holds: none

## 318. The committed HTML fragments were stale, and nothing said so
What. `formats/scene/_lightfield-ember.html` and `_lightfield-colonnade.html` in the tree did not match what their own presets generate.
holds: none

## 319. A new parameter vector that the test harness silently dropped, three times running
What. The `bands` branch grew from two parameter vectors to six.
holds: none

## 320. An enum whose position was not its value, and every shape drew a different shape
`const LIGHT_SHAPES = { round: 0, oval: 0, bar: 1, rounded: 2, cross: 3, sweep: 4 }`, with the name list derived from its keys, and `render` throws on a name that is not in it.
holds: none

## 321. A zoom of exactly 1 was not the identity
`if (u_p6.w > 0.0 && u_p6.w != 1.0)`, and the softening widens only BELOW 1, as `0.35/zoom`, so zoom 1 lands on the old constant by construction rather than by a fitted coefficient. How it was...
holds: none

## 322. The pixel metric preferred a softer picture than the reference
What. Mean per-channel error against `refs/colonnade/c6.jpg` bottoms out at 14.2 and rises for every setting that increases contrast toward the reference.
holds: none

## 323. A backtick in a shader comment, for the fourth time
What. A comment inside `FRAG` was written as `so `count` keeps meaning bands`.
holds: none

## 324. `schema-drift.mjs --write` reformats the file it maintains
What. The gate correctly reported three new props missing from `formats/scene/schema.json`.
holds: none

## 325. One deliberate behaviour change, stated plainly
`u_p2.yz`, the band field's centre, was read as raw coordinates and is now read as a FRACTION OF THE FRAME with the x half multiplied by the aspect inside the shader.
holds: none

## 326. wed: there is no snapshot for the shader effects
Findings A and C were both caught by throwaway scripts written for this pass and deleted with it: one that shoots all eighteen ambient effects at two clocks with and without a palette and prints a...
holds: none

## 327. `inspect` cannot see through `<b>`, so it fails every film that uses emphasis
Strip markup before matching: const plain = (s) => String(s || '').replace(/<[^>]+>/g, ''); const textOf = (l) => (l.type === 'text' ? plain(l.text) : '') + (l.block ?
holds: scripts/gates/inspect.mjs

## 328. `make assets` plans image cards for audio cue names
Skip `audio` (and `captions`) when collecting subjects.
holds: none

## 329. The same script's DRY RUN writes files to disk
Gate the card generator on the same flag as the JSON edit.
holds: none

## 330. A motion track is layer-relative and nothing shows it in film time
What. The film's payoff is one snap: a red measured rectangle collapsing onto the ink.
holds: none

## 331. A missing typeface substitutes silently in a fresh worktree
At boot, resolve every `@font-face` src the active theme's roles depend on and fail (or at minimum warn once, loudly, in the render log) when one 404s.
holds: scripts/gates/asset-check.mjs

## Waivers for `doc-refs`
`make doc-refs` checks that every command and path a doc names exists.

## 332. The two tools that FIT a seed have never once run
Wrote the module. The field is a stack of CSS gradients composited source-over, and source-over is `src*a + dst*(1-a)`, so every alpha comes from geometry and the painted colour at any point is a...
holds: none

## 333. A default that reproduces the old behaviour, except in float32
Even spacing is sent as NO positions at all: the generator drops the suffix when every stop sits exactly where the even spread would put it, and the shader reads a negative first position as the...
holds: none

## 334. The playground card drew a different picture from the generator it names
Pass all six vectors; use the engine's converter.
holds: none

## 335. The catalogue that exists so nobody misses a capability was missing the biggest one
`scripts/gates/arsenal-check.mjs`. It walks `core/`, imports each module, and treats an export as a vocabulary by its VALUE (an array of two or more strings, or an object keyed by names) rather...
holds: scripts/gates/arsenal-check.mjs

## 336. Two films authored as improvements, both slower than the one they replaced
`scripts/gates/pace-check.mjs`, in the TASTE half of `author-check` and runnable as `make pace-check` (no argument prints a census over the library).
holds: scripts/gates/author-check.mjs, scripts/gates/pace-check.mjs

## 337. A gate that names the exact drift, and is only a warning
It blocks under `TASTE=1`, not only under `STRICT=1`.
holds: scripts/gates/author-check.mjs

## 338. The anti-slop detector cannot read SVG text, and invented 21 findings on the first fragment it was ever pointed at
One helper, `textPaintCss(el, style)`, applied at every text-colour site in all three files ,  the SVG namespace means `fill` is the paint, `currentColor` is the one case where the two agree, and...
holds: scripts/gates/designspec-check.mjs

## 339. Moving markup into a file moved it out of the hash that proves somebody looked at it
`hashOf` folds in the bytes of every html fragment the subject NAMES, path first so pointing at a different file with identical contents still counts, in sorted order so the digest is stable.
holds: none

## 340. The anti-slop gate ran 41 rules over three CSS properties, and its silence read as a pass
What. `make slop` rendered a scene, dumped the DOM and ran the vendored 41-rule detector over it.
holds: scripts/gates/author-check.mjs

## 341. A background parameter one level out of place: accepted, dropped, and a byte-identical render
`bgErrors` in `core/validate/validate.mjs` now flags any key at the top level of a bg window that is a real parameter of that window's preset (`bgOptKeys`) and not one of the window's own keys, and prints...
holds: none

## 342. Off-window was an absence, not a state: two clocks' worth of stale transform
The off-window branch writes the resting style set before zeroing opacity ,  the same set the in-window path composes, for the same reason recorded at #41: only the layer's OWN anims contribute...
holds: none

## 343. Four colour parsers, four grammars, and one of them was unanchored
One parser in `core/motion/motion.js`, accepting the union and anchored at both ends, with a `{r,g,b}` adapter for the two object-shaped consumers.
holds: none

## 344. A git worktree silently removes the thing that proves a change is safe
Any worktree agent whose brief includes verification must first run `make fonts` and copy `verify/snap/` from the main tree, and the merge must be re-verified in the main tree regardless ,  three...
holds: none

## 345. Stripping tags eight times with three answers, and the two common answers were both wrong
One definition in `core/type/on-screen-text.js` ,  in `core/`, not `scripts/lib/`, because `core/validate/validate.mjs` and `core/type/captions.js` need it and both ship to the browser, so a definition parked in...
holds: none

## 346. driveClips asked the DOM what to drive, on every frame
`collectClips(root)` takes the set ONCE, frozen, where the scene finishes building; `driveClips` takes the collection instead of a root.
holds: none

## 347. Two answers to "is this background light", disagreeing on every saturated colour
One `isLightBg` in `core/motion/motion.js`, in linear light, beside the `relLum` the contrast maths already uses.
holds: none

## 348. A snapshot baseline was only valid within one font state, and nothing recorded which
`snap-scenes.mjs` stamps the font state ,  every file under `assets/fonts/` and `assets/fonts/local/` by name and size, hashed ,  into a `.font-state.json` stamp written beside the snap baselines...
holds: none

## 349. Four workers meant four whole browsers, and one CDP call was the difference
What. `internal/scene/scene.go` `newTab` called `chromedp.NewExecAllocator` on every invocation.
holds: none

## 350. Worker count changes about 80% of frames, and the cap should not move until that is understood
> CORRECTED by its own Phase 0, below.
holds: none

## 351. `make preview` clipped every fragment at 1080px, because a portrait default outlived its page
Both harnesses that link tokens.css without booting now state their own geometry, each with the reason in place: - `preview-fragment.mjs` sets `:root{--vw:1920px;--vh:1080px}` (the canvas it...
holds: scripts/gates/snap-signature.mjs

## 352. The one gate that blocks on structure read six of the eight channels its own source returns
`poseAt` folds all nine, with `null` (this track does not drive that property) printed as `-` so it compares equal to itself.
holds: scripts/gates/direction-floor.mjs

## 353. The camera sugar accepted a typo, a missing target and the wrong frame, and said nothing to all three
Adding `travel` (the station-to-station journey) meant reading `core/camera-moves/index.js` closely, and the module had three silent failures sitting under the one it was asked for.
holds: scripts/gates/unused.mjs

## 354. Every static gate measured against the canvas origin, so a film whose transition is the camera was graded on a frame nobody was looking at
A film can lay its beats out as STATIONS on a canvas far larger than the frame and travel between them with the camera, which is how `linear-journey` (5760x2160, 12 camera keys, zero cuts) and...
holds: scripts/gates/unused.mjs

## 355. Six camera generators would run their clock backward, and the reviewer that found it named two
Two helpers, `span` (positive, for anything that advances the clock) and `hold` (zero allowed, negative never), used by all six generators plus `travel`'s stations.
holds: none

## 356. Two profile rules read as enforced and had never once run
`banMotion` is a second list holding per-layer entrance names, and the contradiction loop now tests `l.anim` and `l.preset` against it.
holds: none

## 357. The arsenal could not describe itself, and the one shared map made it lie
`docs/EFFECTS.md` is generated from the registries and exists so an author can "see everything, then choose".
holds: none

## 358. The site study read every heading and then threw the words away
`title` is the heading as the site wrote it, kept beside the slug, with the whitespace collapsed (a heading that wraps in the page arrives as `"Make product \noperations self-driving"`, and a...
holds: none

## 359. The storyboard writer claimed to pass the gate and never had, at any duration
`scripts/brand/storyboard-draft.mjs` turns a site study into a storyboard skeleton, and its header says plainly: *"Output passes storyboard-check structurally."* Running the two against each other...
holds: none

## 360. A field enumerated by hand at a boundary, four times in one day
Four separate files today collected a value, carried it to a boundary that lists its fields by hand, and dropped it.
holds: none

## 361. `vawe_capabilities` shipped names and kept the meanings at home
An MCP client asking what this engine can do got `looks (31): neon dreamyHaze crt …` and `cuts (26): none fade slide …` ,  bare strings.
holds: scripts/gates/direction-floor.mjs, scripts/gates/lib-test.mjs, scripts/gates/silent-fallback.mjs

## 362. Describing the looks found four bugs in the looks
Writing one line per composite look meant reading all 31 recipes.
holds: none

## 363. The storyboard gate had never heard of the repo's own placeholder token
The verdict counts unfilled placeholders and says so: *"STRUCTURALLY complete … but N decision(s) are still `<fill: …>`.
holds: none

## 364. A flat dark backdrop escaped the flat-backdrop warning
`beat-check` warns `static-bg` on a film built entirely from flat presets, because CLAUDE.md's rule is that the backdrop is always a decision and a still field must be a deliberate one.
holds: scripts/gates/arsenal-check.mjs, scripts/gates/lib-test.mjs

## 365. Five of the six documented look knobs did nothing, and the guard for exactly that was scoped to one family
A public knob NAMES the private arguments it controls (`KNOB_ROUTES`) and is written after the fixed bag.
holds: scripts/gates/knobs-audit.mjs, scripts/gates/lib-test.mjs

## 366. The engine's defaults were another brand's colours, and nobody had ever chosen them
`bgPaletteFrom(palette)` derives the whole background palette from the theme's own, and `scene.js` uses it whenever a theme authors no `bg`.
holds: scripts/gates/lib-test.mjs

## 367. `--p` was frozen at 0 for every backdrop that spans its film, and a sentinel is why
Told that reaching for framework presets caps what you can build, the fix was to stop picking a background off a list and hand-author one.
holds: none

## 368. `inkflash` was a colour wave wearing a name nobody had built
Asked where `inkflash` came from, the answer was in the repo's own history.
holds: none

## 369. Nine name→thing maps, each with its own silent fallback, and one film that never played as written
F1 of the framework plan: stop writing gates for the silent-substitution class and remove the ability to express it.
holds: scripts/gates/lib-test.mjs

## 370. A colour default is a decision about the theme, or a deliberate constant, and nothing could tell them apart
F3 of the framework plan. Twice this week a brand's colours turned out to be the engine's defaults: `PAL_PLINTH` painted every unthemed background in plinthai.xyz blue (#366), and `inkflash`...
holds: none

## 371. One ease for every channel, so the second curve had to be hand-written in CSS
F2 of the framework plan. `core/tracks/vars.js` animates CSS custom properties, which is how a block animates what it DOES rather than merely entering.
holds: none

## 372. Every background boundary was written twice, and nothing kept the two equal
F4 of the framework plan. `brew-launch-act1` cuts its backdrop per beat ,  paper, dark, paper, accent, paper ,  and that is the film's main structural device.
holds: scripts/gates/motion-audit.mjs

## 373. F5, and what measuring "unused" actually showed
The last item of the framework plan, and the one whose premise did not survive contact.
holds: scripts/gates/lib-test.mjs, scripts/gates/unused.mjs

## 374. The review found the fix I had recorded but never made
Two reviewers were run over the framework plan (`c49ea03..f70358d`).
holds: scripts/gates/lib-test.mjs

## 375. Seven vocabularies still answered a wrong name with a plausible substitute
The review that produced #374 prompted a full sweep: probe every named vocabulary in the engine with a nonsense name, then read what each CALLER does with the result. The sweep corrected a claim I...
holds: none

## 376. A rule the framework cannot enforce, and the census that reads its own limits
P3, P4 and P5 of the plan, and the end of the silent-substitution work. P3 ,  every vocabulary is a registry now: 8 became 17. Five of them (camera move, caption style, paint fx, raymarch, ambient...
holds: none

## 377. The gate written to catch blind spots had one, and its waiver list hid it
A reviewer over `25746ee..08d9c36` cleared the three things that could have gone badly: no new throw fires on an ABSENT value, none sits on a per-frame path (every one is scene-build-time),...
holds: scripts/gates/silent-fallback.mjs

## 378. Eighty-nine words for one idea, and the answer to "should we remove every default?"
Three things, from one planning pass. The first is a question I was asked and answered with a measurement rather than an opinion. "Should we remove every default colour, so nothing default ever...
holds: none

## 379. `author-check` read as the safety net, and it is not one
B2, and the smallest change of the run with the clearest reason.
holds: scripts/gates/author-check.mjs

## 380. Sixteen looks declared a colour that never rendered, and the test for it asked the wrong question
Chasing the `make unused` census, which names itself a test backlog: three never-used effects had turned out to be BROKEN the moment anything exercised them, so the never-named vocabulary is...
holds: scripts/gates/beat-check.mjs, scripts/gates/critique.mjs, scripts/gates/direction-floor.mjs, scripts/gates/lib-test.mjs, scripts/gates/pace-check.mjs

## 381. A warning printed once, from one of eight workers, into a log nobody reads
Found while reporting #380, in `lib-test`'s own output: `ease: unknown easing "nope" ,  using easeOutCubic`.
holds: scripts/gates/lib-test.mjs

## 382. The gate for hand-authored fragments painted the brand colour black
Building a GitHub-wrapped heatmap, I previewed the fragment and every cell came out grey.
holds: none

## 383. A bar chart rendered white, because `color` is the third name for a rect's fill
Authoring a GitHub-wrapped, I wrote the obvious thing: { "type": "rect", "w": 820, "h": 76, "color": "var(--accent)" } The bars rendered white.
holds: scripts/gates/plan-vs-render.mjs

## 384. The same frame paints differently depending on which worker tab drew it
The user said the contribution grid was blinking.
holds: none

## 385. Two backdrop windows, and only the last one ever painted
`bg` is a required field, so the backdrop is always the author's decision.
holds: none

## 386. The renderer segfaulted instead of telling you why the scene would not load
A six-second test scene with `"fx": "fade"` on a boundary killed the process: panic: runtime error: invalid memory address or nil pointer dereference vawe/internal/scene.Capture(...)...
holds: none

## 387. Dark text on a dark backdrop, because the token name lied
The first film built on per-beat backdrops (#385) rendered three beats over paper, dark and accent.
holds: scripts/gates/audit-scenes.mjs, scripts/gates/plan-vs-render.mjs

## 388. A check that only grades the file you have open
`make audit` is a good check. It samples the bg canvas under a text element's own ink box, computes WCAG against it, and names the layer.
holds: scripts/gates/lib-test.mjs

## 389. The colour wave settled to invisible, one level under #373
#387 fixed the ink a layer inherits from its bg window.
holds: none

## 390. The contrast gate graded frames 0.067s into their entrance
`make audit-all` (#388) reported 33 scenes with hard contrast failures.
holds: scripts/gates/lib-test.mjs

## 391. A worktree fan-out over films silently throws the work away
Four agents were sent to fix contrast findings across 32 scenes, one worktree each, split so no two shared a file.
holds: scripts/gates/author-check.mjs, scripts/gates/snap-blocks.mjs, scripts/gates/waiver-drift.mjs

## 392. Two swatches in the ransom palette were never readable
`ransomColorSwatches` is a HOUSE table: every ransom-note scene draws from it.
holds: none

## 393. A gate threw away a declared width and invented an empty frame
Unknown is per axis, not per layer: when `boxOf` cannot derive the extent, `inView` reads each axis's declared value back and defaults only the axis that is genuinely missing.
holds: none

## 394. The documented way to declare a transition was invisible to every gate
`lowerScene()` at the point of parse in `beat-check`, `critique`, `direction-floor`, `pace-check`, `beats`, `reveal`, `motion-director` and `verify/audit.mjs`.
holds: scripts/gates/plan-vs-render.mjs, scripts/gates/scene-timing.mjs, scripts/gates/seam-snap.mjs

## 395. A slot swap that cross-faded two words in the same box
`over = 0`. Passes butt. The payload slot, which does pop, blinks for its `payload` offset, and a slot visibly re-filling is what this beat is a picture of.
holds: none

## 396. `critical: false` said "exclude from the layout audit" and excluded nothing from it
`critical: false` now writes `data-audit="off"` (`formats/scene/scene.js`, and the group-child twin in `core/layers/util.js` so the flag means the same at both depths), and the safe/overflow walk...
holds: none

## 397. The validator kept its own copy of "is this a real easing", and it was already one behind
`core/motion/motion.js` exports `isEasingName(n)` ,  the one membership test ,  and the validator asks it.
holds: none

## 398. A track compared the transform it wrote against the one the browser gives back
Store the browser's own spelling, not the author's: `el.hsIdle = { out: el.style.transform, base }` after the write.
holds: none

## 399. The doctrine told authors to render a false number
`docs/MOTION-CRAFT.md` recommended, twice, that "a value that should feel physical (number, bar, camera)" use `ease:"spring"`.
holds: scripts/gates/snap-signature.mjs

## 400. A `SPECTACLE` field was added to the brief, read by the parser, and consumed by nothing
A scene-level block, `"spectacle": { at, of, device, why }`, resolved by `core/timeline/spectacle.js` before any DOM exists.
holds: scripts/gates/lib-test.mjs, scripts/gates/plan-vs-render.mjs, scripts/gates/schema-drift.mjs, scripts/gates/snap-signature.mjs

## 401. A documented `--json` flag whose output could not be parsed, and a test that pinned a repealed rule
Two bugs found by an agent doing unrelated work.
holds: scripts/gates/arsenal-check.mjs, scripts/gates/audio-check.mjs, scripts/gates/author-check.mjs, scripts/gates/beat-check.mjs, scripts/gates/copy-check.mjs, scripts/gates/designspec-check.mjs, scripts/gates/direction-floor.mjs, scripts/gates/discovery.mjs, scripts/gates/dissolve-check.mjs, scripts/gates/generated-check.mjs, scripts/gates/lib-test.mjs, scripts/gates/motion-audit.mjs, scripts/gates/pace-check.mjs, scripts/gates/plan-vs-render.mjs, scripts/gates/read-check.mjs, scripts/gates/rung.mjs

## 402. `make reveal` crashed on any single-beat film, and sampled every layer window a third too wide
Two pre-existing bugs in `scripts/author/reveal.mjs`, found by an agent adding a ghost mode and verified against `git show HEAD:` before either was touched. It crashed on a one-beat film. ffmpeg...
holds: none

## 403. The same statement discarded a tracking value for the second time
`core/layers/text.js` `microType` re-writes `el.style.letterSpacing` from `kit.trackingFor(size)` one statement after `styleText` has already set it.
holds: none

## 404. Three checks that could not be reached, and a fourth still blind
A check nothing runs is not a check. Three reachability holes, closed, plus one reported. The spectacle check never ran on an unplanned film. `plan-vs-render` needed an intent sidecar or a...
holds: none

## 405. Closing #388: the letter-spacing write happens once, and a second one fails a test
#403 ended with an argument rather than a fix: "anything that writes `letterSpacing` after `styleText` will be the third [to discard something].
holds: none

## 406. `onDark` asked the layer, and `ransom` paints every glyph on its own paper
`onDark(L, midT)` answered polarity from the LAYER's resolved ink.
holds: none

## 407. The ninth consumer of a defect that was declared closed
#394 fixed eight readers of the unified `transitions` surface one at a time, and that is the bug. `beat-check`, `critique`, `direction-floor`, `pace-check`, `beats`, `reveal`, `motion-director`...
holds: scripts/gates/plan-vs-render.mjs, scripts/gates/scene-timing.mjs, scripts/gates/seam-snap.mjs

## 408. SEVEN more consumers still do not lower `transitions`, and one is `make seam-check`
#407 closed the ninth consumer. The grep it was required to run before closing found seven more, which is the point of that rule and the reason #394's "eight consumers, fixed" was wrong. The sharp...
holds: scripts/gates/coverage.mjs, scripts/gates/seam-snap.mjs, scripts/gates/similarity.mjs

## 409. Burnt-in captions rendered underneath the platform's own caption strip
`core/engine/boot.js:325` writes `--safe-bottom` from `safeArea(w, h, destination)`.
holds: scripts/gates/arsenal-check.mjs, scripts/gates/lib-test.mjs

## 410. `letterSpacing` had two writers, and now it has one that cannot become two
#403 recorded that one statement in `core/layers/text.js` had silently discarded two upstream decisions: the author's own `tracking` (#28, in 12 shipped scenes) and the dark-ground polarity.
holds: none

## 411. The last readers of `transitions`, and the one that was policing the seams blind
#394 closed eight consumers of the unified `transitions` surface. #407 found the ninth and its required grep found seven more.
holds: none

## 412. The seam gate printed a pass it had never earned, and the ledger scan was dead
Five more consumers of the unified `transitions` surface, found by the grep #407 was required to run. `make seam-check` on `brew-launch-act1` sampled SEVEN boundaries and not one was a cut. All...
holds: none

## 413. Nothing stopped a headline landing on the caption
#409 fixed WHERE a burnt-in caption sits: `.hs-cap` reads `--safe-bottom`, so it clears the platform's own strip.
holds: none

## 414. Half the authoring ladder was behind a flag, so half the authoring ladder did not exist
`make author-check` ran seven of its steps only when `TASTE=1` was set: `critique`, `direct`, `direction-floor`, `dissolve`, `designspec`, `copy`, `pace`.
holds: none

## 415. The audit that told us which gates were blind was itself wrong
#394 fixed eight consumers of the unified `transitions` surface and declared itself closed. #407 found the ninth. #412 found five more.
holds: none

## 416. The ratchet: legacy is not a waiver
A new rule always fails old films. `no-storyboard` fires on 121 of 132 scenes.
holds: none

## 417. `gradient` + `split` painted nothing, and a comment said it could not happen
A `text` layer with `gradient` AND `split` rendered an INVISIBLE line.
holds: scripts/gates/lib-test.mjs

## 418. The determinism net could not see a single kinetic type reveal
`snap-signature.mjs` captured `[id], [data-layer="critical"], [data-start]`.
holds: none

## 419. Every font came from an unversioned URL, so the whole library measured differently by the day
`scripts/media/fonts.mjs` fetched 16 faces from `cdn.jsdelivr.net/npm/<pkg>/files/…` with no version in any URL.
holds: none

## 420. A caption style could be added to the registry and stay unreachable, and one shipped style had two states where it claims three
Three separate findings, all surfaced by adding four styles to `core/type/captions.js`.
holds: none

## 421. Every count blueprint in the library is frozen at a non-zero start
`blueprints/kit.mjs:31` writes `countStart` as an ABSOLUTE time.
holds: none

## 422. A caption accepted three fields, so where it sat was a CSS constant no JSON could reach
A caption resolves through `resolveCoords` (`core/engine/boot.js`), the SAME function that places a layer: `pin`, `x`, `y`, `w`, the `"50%"` and `"center"` and edge keywords, all against the same safe box.
holds: none

## 423. The two most-used caption mechanisms in short-form video were unsayable, and the reason was in the contract
`CAP_STYLE_SHAPE` in `core/type/captions.js` declares `mode:'one'` and `unit:'char'` per style, and `capUnitWins(cap, unit)` subdivides each WORD window across that word's characters, so speech pacing...
holds: none

## 424. `out/*.png` never matched `out/flight/shot.png`, and fourteen render frames reached main
`out//*.png` and the same for log/html/jpg/webp and the two json sidecars.
holds: none

## 425. `<b>` around a caption word was accepted, rendered, and had no effect
Emphasis is a fact about the DOM and not about t, so it is read ONCE at build (`u.closest('b, strong, em, i')`) rather than thirty times a second, and the apply loop swaps the colour for...
holds: scripts/gates/motion-audit.mjs

## 426. Four caption mechanisms were reported reachable, and not one of them was callable
Four caption-native styles, each satisfying the doctrine rather than being exempted from it: `flipUp` (hinges from -90deg, invisible without being dim, the same argument `typeOn` makes for...
holds: none

## 427. The pixel-regression gate had been blind for an unknown number of sessions
`make fonts` first, which verified 16 faces and downloaded none: the extra files are drift from `fonts-discover` runs, not a missing set.
holds: none

## 428. The CSS-animation ban is not required for determinism, and the engine already proves it
The claim under test. `core/tokens.css:28` kills every CSS animation globally (`* { transition: none !important; animation: none !important }`) under the comment "determinism: every frame is set...
holds: none

## 429. A part could arrive and never leave, and it was read as a limit of hand-written HTML
A fourth slot per entry, the exit, opt-in per spec with `out: true` plus `exitDur`/`exitEase`. A translate CONTINUES, a scale REVERSES, and that is not a detail.
holds: none

## 430. A grandchild was scheduled to appear before the group it lives in
Compute `cStart`/`cDur` above the branch and recurse with `{ start: cStart, duration: cDur }`.
holds: none

## 431. 155 blocks, no shared spacing scale, so every one was made to look right on its own
Measured before anything changed, by calling every factory and walking its emitted output: | prop | distinct values | emitted | on a scale | |---|---|---|---| | gap | 20 | 232 | 58% | | pad | 25 |...
holds: none

## 432. A scaling idle on text is a shimmer, and it shipped in a film
`idleErrors` in `core/validate/validate.mjs` refuses a scaling idle on a layer whose subtree is text, and names `drift` as the alternative in the message.
holds: none

## 433. Two thirds of a status vocabulary was theme-aware, and a brief demanded a check its worktree could not run
The token. Every theme ships `up` and `down`, so `blocks/kit.mjs` TONES could paint ok and danger from the palette.
holds: none

## And the brief defect, which is mine
The literal-conversion agent was told its change "must stay 105 identical on `snap-scenes`, or justify each change one by one". It could not run that check at all. `verify/snap/` is gitignored...

## 434. CLOSED: the frozen counter, fixed and shown
`blueprints/kit.mjs` `dollyNumber` wrote `countStart: start + 0.1`.
holds: none

## 435. /editor rendered a blank stage in production, and the engine had been saying why the whole time
What a visitor saw. The page loaded.
holds: none

## 436. a layer is a wrapper over one DOM element, so give it a CSS passthrough, refuse the frame-owned half
The idea, and why the obvious version is a trap. The layer vocabulary cannot express a box gradient (`gradient` is a TEXT fill via `background-clip`, not a box background), `mask-image`,...
holds: none

## 437. the `paints-nothing` gate, and the sweep that was checking the wrong files
What it is for. An `html` layer whose content was masked away rendered as a blank white card, and the agent that built it said the truest thing anyone said this week: "the mask bug that blanked...
holds: scripts/gates/snap-scenes.mjs

## 438. `css` on a layer, and the eleven properties it refuses
The layer vocabulary is a wrapper over HTML, so a box gradient, a `mask-image`, a `clip-path` and an inset `box-shadow` were unreachable while the DOM underneath could do all four.
holds: none

## 439. `css` painted a box, and `radius` was silently dropped on it
One condition, gated on an EXPLICIT radius so `chipBox`'s own `??
holds: none

## 440. the determinism gate exits green on a fresh clone, having compared nothing
Fail only on the all-empty case: if (!identical.length && !changed.length && nobaseline.length) { ...exit(1) } A FEW no-baseline scenes stay soft, deliberately: that is a newly authored film...
holds: scripts/gates/snap-blocks.mjs

## 441. retiring 35 agent worktrees, and the five files that nearly went with them
What. Agent worktrees had reached 35, at 9.1G.
holds: none

## 442. A gate is not a fix: the CSS refusal that belonged in the code
The correction, in the user's words: "dont add gates mf / you get to gates everytime / dont do things additively / do them properly in the code where you are writing logic". They were right, and...
holds: none

## 443. the layout audit graded a camera that was not there
Found by chasing a regression I thought I had caused, which turned out to be this. `core/engine/produce.js` injects a camera push into any un-choreographed scene, and #444 below made that push real.
holds: scripts/gates/site-counts.mjs

## 444. the produced camera push had never once run
`core/engine/produce.js` gives any scene that declares no camera a gentle slow push, so the frame stays alive.
holds: scripts/gates/lib-test.mjs

## 445. an array's ORDER was a shader API, and nothing could have caught it
`core/stings/index.js:22` declared `SHADER_FX` as a flat list of names.
holds: none

## 446. a documented `curl` that writes a zero-byte file on 404
Three scenes stopped booting the moment `core/engine/boot.js` began refusing an asset that never loaded.
holds: none

## 447. an engine easing name on a GSAP-driven field renders a different curve, silently
`gsapEase(e, fallback, where)` in `core/motion/motion.js`, at all five call sites.
holds: none

## 448. the html layer accepted six box props and ignored every one
One `chipBox(el, L)` call, plus `box-sizing: border-box` scoped to layers that declared both a box and a `pad`.
holds: none

## 449. a bare catalog name does not carry its catalog props, and the comment said it did
NOT by merging props here: that would give every unset field demo content, the same substitution wearing the other coat.
holds: none

## 450. block-schema evaluated defaults in a hand-listed scope that had drifted from the kit
`const SCOPE = { ...KIT, ...REGISTRY, T: TOKENS }`, spread, never listed.
holds: none

## 451. `make beats --vs` printed a tick and wrote nothing (MISTAKES #245, half-fixed)
Both tools now adopt `openScene`, `scratch()` and `ffmpegOrDie`, and share one exported `drawtext()` escape in the new `scripts/author/sheets.mjs`.
holds: scripts/gates/gate-mutation.mjs

## 452. producing a contact sheet is not looking at one
The receipt records `auto: true` when a sheet was produced by the loop.
holds: none

## 453. a trim ate a status prefix, so the worktree pruner retired nothing
`gitRaw()` returns the output untouched and porcelain is parsed off that; `git()` keeps the trim for the callers that want one value, with a comment saying that column-positioned output must not...
holds: none

## 454. a look naming a pass that does not exist rendered without that effect, silently
Both throw, naming the vocabulary. Verified: all 31 shipped looks resolve cleanly, and a probe look carrying `sepiaa` and `corner: 'top-right'` is refused by name. What was checked and left alone,...
holds: scripts/gates/silent-fallback.mjs

## 455. the npm package shipped one CPU architecture and claimed to be cross-platform
The host's own identity picks the file (`vawe-<platform>-<arch>`), and the file's MAGIC BYTES are read back before spawning: ELF / Mach-O / MZ against `process.platform`.
holds: none

## 456. every `npm install` downloaded 473MB of Chrome to read one path string
Moved to `devDependencies`, where the 41 repo tools that genuinely need it still get it. `optionalDependencies` would NOT have fixed this: npm installs those by default too, so the download would...
holds: none

## 457. a typo'd `anchor` id, and a palette value that is not a colour
Two of the same shape, found by a read-only audit rather than by a render. `anchor`. `resolveAnchors` did `const T = L.anchor && byId[L.anchor]; if (!T) continue;`, so NO anchor and a WRONG anchor...
holds: none

## 458. `anim` and `enterDur` accepted on a `split`/`cut` layer, then thrown away
`formats/scene/scene.js` `setLayerTiming` writes `el.dataset.anim = (L.split || L.cut) ? 'none' : ...` and, for a split layer, `el.dataset.enter = '0'`.
holds: none

## 459. a call site was updated and its import was not, and no gate took that branch
The imports. And the probe that proves it: expanding a scene that declares `cameraMove` now bakes it (`cameraMove` removed, `camera` keys written) rather than throwing.
holds: none

## 460. the determinism net could not see a single block, and nobody noticed for the whole library
`scripts/gates/snap-blocks.mjs` + `make snap-blocks [SAVE=1] [BLOCK=<name>]`.
holds: none

## 461. `pad` on an unpainted layer was accepted and discarded
Padding is not paint, so it is written BEFORE the guard.
holds: scripts/gates/lib-test.mjs

## 462. schema.json enums were hand-copied, and two had already drifted
`--write` now regenerates the registry-owned enums in place, and the table grew from 16 to 19: `cutTiming`, the per-layer `cut`, and `bg.item.preset` were registry copies nobody had listed.
holds: none

## 463. a font axis the docs promised and the shipped subset does not have
The comment now states what the file actually holds and says to re-subset before reaching for `wdth`.
holds: scripts/gates/lib-test.mjs

## 464. a scene past the browser's WebGL cap renders completely blank and exits 0
`core/engine/webgl.js` is the one owner. It counts live contexts, so the error can say how many, which is the fact that makes it actionable and which no call site could know.
holds: scripts/gates/lib-test.mjs

## 465. one scene differs between main and every worktree, and four agents each rediscovered it
What. `react-demo` renders consistently in every worktree and consistently differently on main.
holds: scripts/gates/lib-test.mjs

## 466. the camera's lens was keyable, reached nothing, and said nothing
`cameraAt` has interpolated a `p` keyframe (the lens, `persp`) since the rig landed, and `drawCameraAndCut` writes it to `#root` every frame, but only under the RIG, and the rig turns on for a...
holds: none

## 467. a gate's fix line named a command that cannot fix it
`schema-drift.mjs` checks 20 derived enums and then, in a separate block, checks that `layers.item.modifiers.item` names every modifier in `core/fx/index.js`.
holds: none

## 468. the audit read text that is in the DOM on purpose and never on screen
`wordSlot` (core/fx/word-slot.js) puts a swapping word in a fixed box by stacking EVERY candidate in one CSS grid cell: the column is auto-sized by layout to the widest of them, so nothing after...
holds: none

## 469. a UI cue was mixed quieter than the music under it
`overTheBed` in `internal/audio/audio.go` is now the one place that relationship is decided.
holds: none

## 470. six gates stated a verdict they had not earned
Each gate now separates cannot-check from checked-and-clean.
holds: none

## 471. eight resampling passes, and nothing we build ourselves could be fed to one
- `core/resample/raster.js`: the serialiser moved out of `seams.js` with `buildInlinedCss`, `domToCanvas`, `isBlankRaster` and a new `rasterStats`.
holds: none

## 472. the motion contract's windows came from a field nobody writes, and one of its clauses was measuring the camera
`scripts/gates/motion-audit.mjs` scores five FAIL-tier clauses (i final-hold · ii monotonic · iii settle · iv count-up · v typing) against a WINDOW.
holds: scripts/gates/motion-audit.mjs

## 473. the engine found the beat and no scene could ask it to use it
`core/beats/index.js`, and a scene declares its grid: "audio": { "music": "beat", "beatSync": true } `true` derives the sidecar from the bed the way the mixer derives the bed itself...
holds: none

## 474. a camera nobody wrote switched a HARD rule off for most of the library
The frame-wide filter is deleted. In its place the safe test asks the question in both spaces and reports only when they agree. - SCENE space, via `unCam`: undo the camera's ZOOM about the centre...
holds: none

## 475. the site kept its own copy of a scene, and served a bug that had been fixed for forty days
`scripts/site/scenes-json.mjs` DERIVES the whole directory from `formats/scene/`, dropping a short closed list of author-only keys (`authoring`, `authoringNote`, `note`) and copying everything...
holds: none

## 476. six production deploys failed in a row and the only place that said so was a build log
The check now asks git rather than the filesystem (`git check-ignore --stdin`, one call for the whole set), and separately reads `.dockerignore`'s negations to confirm the path survives into the...
holds: none

## 477. two owners of "which beat does this joint land on", and neither imported the other
`core/beats/index.js` owns the policy and exports it: `snapJoints(data, grid, maxShift)` and `unrollGrid(pulse, period, dur)`, with `DEFAULT_MAX_SHIFT` beside them.
holds: scripts/gates/lib-test.mjs

## 478. the default push and the safe margin were one piece of geometry, written down twice
What. `core/engine/produce.js` gives any scene declaring no camera a `slowPush` from `1` to `1.06` spanning the whole runtime.
holds: none

## 479. 558 effects and not one of them ever asked where the layer had been
`core/fx/ghost.js`, one modifier with two presentations over ONE sampler.
holds: none

## 480. the engine could not cut on a match, and the rule that wanted one cannot see it
What went wrong. `docs/CRAFT/FILM-STRUCTURE.md` lists the match cut first among spatial devices, and `no-continuous-object` is the most-waived rule in this library: 14 films, 11% of the 132...
holds: none

## 481. the catalogue taught the wrong key, and a whole subsystem went unused
The family is `Per-layer modifiers`, the prose names `"modifiers"`, and it says what `"fx"` is so an author who has already made the mistake can see why the error mentioned a name. Which gate...
holds: none

## 482. a deploy went green and served every stylesheet as a 404
Do not accommodate the pin; remove it where it has no job.
holds: none

## 483. a box said where the layer was heading, not where it was
`formats/scene/scene.js` `resolveBoxes(t)` composed every layer's box from its authored `x`/`y` plus `motionAt`, and from nothing else.
holds: none

## 484. the handover measured a word as zero wide, and put the card 401px away without saying so
What. `becomes: "<id>"` resolves the incoming layer's opening pose from the outgoing layer's final pose: centres matched, size matched by scale.
holds: none

## 485. one library, two sizes: 135 in one gate and 150 in the next, on the same afternoon
`census.mjs` now exports the rule itself.
holds: none

## 486. the render order was a comment, so two bugs in one week broke it and nothing said so
What happened. `#483` and `#484` landed within days of each other.
holds: none

## 487. the GSAP trigger list was a hand-kept second source of truth, and #148 was one of its failures
What. `core/engine/preload.js` decides whether the tween engine is fetched at all, from the props a scene names.
holds: scripts/gates/lib-test.mjs

## 488. `no-continuous-object` could not see a match cut, and a match cut is what it asked for
The gate now reads both surfaces that declare a handover: layer-level `becomes`, and the junction-bound `matches` array.
holds: none

## 489. `linear-motion` warned on a pan, and 41% of this library's eases are `linear` on purpose
Judge the RUN, not the key. A maximal chain of consecutive linear MOVING segments is flat only when it is entered from rest AND left at rest.
holds: none

## 490. two entries withdrawn: they were duplicates of #488 and #489
Both entries were byte-identical copies of the two above them, filed again under a second numbering scheme.
holds: none

## 491. five blocks drew a shape the object does not have, and every one was a tidy constant
`phoneFrame` was reported: at the catalog's own `props: { w: 230, h: 440 }` it rendered a capsule, not a phone.
holds: none

## 492. a poster drifted on every run, and nothing anywhere looked at a poster
What. `make blocks-scenes` rewrote `borderBeamCard.png` and `glassCard.png` on every run.
holds: none

## 493. a gate printed "this film has sound" over a track measuring -91 dB
A declared cue set is now checked against `assets/sfx/`: an empty pack raises `cues-have-no-sound`, and named cues with no file raise `cue-missing`.
holds: none

## 494. the showcase page typed six film durations, and two were already wrong
`scripts/site/films-json.mjs` reads the duration from the encoded film with `ffprobe` and writes `site/lib/films.json`; the page looks each one up by slug.
holds: none

## 495. a sting counted as a joint, so declaring a spectacle moved every backdrop one beat late
The binder calls `shotWindows`, so one function owns "where does this film turn" and the two cannot drift again.
holds: none

## 496. beatSync moved the cuts and left the stings behind, so a sting drifted off the cut it punctuates
A sting rides the joint it punctuates: it is moved by the SAME delta as the nearest cut or seam within half a beat, so an authored offset is preserved to the millisecond and a sting written ON a...
holds: scripts/gates/lib-test.mjs

## 497. a sting tint was read as a hex, so a theme token silently painted it black
What. `stings[].color` and `stings[].colors[]` reach a WebGL uniform through `formats/scene/scene.js`, which converted them with `parseInt(String(h).replace('#',''), 16)`.
holds: scripts/gates/lib-test.mjs

## 498. beatSync reports what it moved, and the render log could not hear it
The value now travels the channel that already exists rather than a new one.
holds: none

## 499. the one block whose job is to host a brand painted Apple's window buttons over every theme
Close / minimise / zoom is danger / warn / ok, so the three dots are now `['error','warn','ok'].map(toneColor)`.
holds: none

## 500. the same frame number drew two different pictures, and the difference was one card's type
`will-change:transform` on the hero, which pins the choice.
holds: none

## 501. the ghost trail painted OVER the layer, and a filled plate trailed nothing at all
What. `core/fx/ghost.js` builds k copies of a layer and poses each at where the layer WAS.
holds: none

## 502. the wordSlot chip clipped its own descenders
The chip's vertical padding is `INK_PAD_EM`, so the plate contains the ink and the clip can stay.
holds: none

## 503. a gate kept its own list of which backdrops move, and called eight of them dead
The gate asks the preset instead of matching its name: `movingPreset(name, value)` calls `bgPreset` and reports motion when any fx is not `grain` (film grain over a still base is exactly what the...
holds: none

## 504. a gate could only see a fragment written the shorter of its two documented ways
One `htmlOf(o)` reader in the gate returns `o.html`, or the file `o.src` names (repo-root relative, as `core/engine/preload.js` resolves it).
holds: none

## 505. the clipped-text rule read every mask as a mistake
`verify/audit.mjs` hard-failed any film using the `tabBar.switch` block: `[clipped-text] DesignMotionExpo: mask is 329px too narrow for the glyphs`.
holds: none

## 506. the validator's lint was one 225-line body, so adding a rule was surgery
`lintData` in `core/validate/validate.mjs` scored cyclomatic complexity 84 across 225 lines, the highest in the repo.
holds: none

## 507. a comment inside devDependencies broke `npm install` for every fresh clone
Hoist the comment to the root as `//puppeteer-note`.
holds: none

## 508. two motion gates where one function held every rule
`scripts/dev/complexity.mjs` put four functions from the motion pair in the repo's worst band: `motion-director.mjs` `analyse` at cx 108 over 372 lines, and in `motion-audit.mjs` the per-element...
holds: none

## 509. one static file server, copied 22 times, with 22 hand-rolled path guards
`scripts/lib/render-harness.mjs` owns the three facts: `serveRepo` (one server, one guard, an optional `route(req, res)` hook for the five callers that serve a virtual path from memory),...
holds: none

## 510. two `html` layers, one document, and the later stylesheet silently won
The symptom. Authoring `preface-launch`, the hero file pane was set to `.h { font-size: 40px }` and rendered at about 25px.
holds: scripts/gates/lib-test.mjs

## 511. the engine wrote 7,345 em dashes, and its own error message told you not to
Every occurrence in `core/` `blocks/` `scripts/` `formats/` `verify/` `blueprints/` `cli/` `docs/` plus the Makefile and the markdown at the root now reads as a colon, a comma, a full stop or a...
holds: none

## 512. the audit's one function did eleven jobs, because puppeteer only ships one
`auditFrameFn` in `verify/audit.mjs` was 927 lines with a cyclomatic complexity of 166: the hardest function to change in this repo, and the gate that grades every film in the library.
holds: none

## 513. the validator passed a scene the engine refuses at boot, and studio hid the reason
What. A scene declaring `spectacle` with an `of` naming no layer passed `make validate` clean, then died at boot.
holds: none

## 514. RETRACTED, and the retraction is the lesson
This entry claimed vawe's sound effects were 19 unlicensed Mixkit recordings.
holds: none

## 515. the engine knew every event in its own timeline and turned none of it into sound
`core/audio/tactile.js` derives motion cues from the timeline the engine already holds, in the `{ t, name, gain }` shape `buildSfx` has always carried.
holds: none

## 516. author-check expanded two sugars of three, so a film built from blueprints failed step one
What. `make author-check` expands `block` and `comp` sugar before it validates, and did not expand `beat`.
holds: none

## 517. four defects in two films that every gate passed
What. Two films were upgraded with cuts, camera moves and backdrops.
holds: none

## 518. `schema-drift --write` could never write the block it exists to write
The indent is captured off the file (`/\n( +)"layerProps": \{[\s\S]*?\n\1\},/`) and passed to the renderer.
holds: none

## 519. `iris` was registered as a bare `circleWipe`, so its second argument was the iris centre
Adding the entrance warp gave the registry a second argument, and `iris` silently read it as `cx`: a warped iris opened from the wrong point, with a plausible frame and no error.
holds: none

## 520. the recipes doc said motion blur was opt-in per layer, and the engine had made it automatic
The real gap was the one the paragraph's LAST sentence points at: a scene had no angle.
holds: none

## 521. three name collisions in one session, and the check that would have caught all three
The cheap check that would have caught all three, in order of cost: try to RESOLVE the name (`resolveEasing('smooth')` returns a function, which is the whole answer in one line); then read the...
holds: none

## 522. the motion instrument lied twice, and I was fooled by it within the hour
Normalised to change-per-thirtieth-of-a-second in `internal/scene/scene.go`, so the number is comparable across frame rates and the still floor means one thing.
holds: none

## 523. a filter and a height, both authored, both silently dropped
The motion track stashes its base beside the OUTPUT it produced, the same shape `core/tracks/idle.js` already used, so a fresh write from build is recognised rather than guessed at.
holds: none

## 524. green ticks read as passes, twice, in the gate for reading green ticks as passes
Assert the insert landed (`assert 'MARKER' in open(p).read()`), and prove a check in BOTH directions before trusting it: corrupt the input, watch it fail by name, restore, watch it clear.
holds: none

## 525. a claim tested against the wrong population, and a test pinned to a count
Every claim now declares `scope` (`reference` or `ours`) and the two are measured differently: theirs from a rendered shot list, ours from the declared boundaries in the JSON.
holds: none

## 526. a fork of a store that already existed, twenty lines from a doc that documented it
Resolved as one owner with two views rather than by deleting either: the store owns the measurements and the per-film reading, a DEEP study owns one film in depth and names itself in `deepStudy`,...
holds: none

## 527. four blind attempts at an effect that has a name and a published recipe
the behaviour is now written down as a standing rule in `CLAUDE.md`, "NAME THE EFFECT BEFORE YOU BUILD IT".
holds: none

## 528. the motion figure was measuring worker boundaries, not the film
the renderer no longer prints a motion figure when it sharded, and says why and where to get one.
holds: none

## 529. `cuts[].cx`/`cy` were documented 0-1 and read as per cent
The schema now says per cent, with `max: 100`, matching both the code and its own sibling entries.
holds: scripts/gates/lib-test.mjs, scripts/gates/prop-probe.mjs

## 530. `glass` was a frosted panel because nobody asked whether backdrop-filter takes a url()
`glass: "refract"` and `glass: "refractThin"`, a named recipe built once in `core/layers/util.js`: a lens height map as a `data:` `feImage` (a red x-ramp plus a green y-ramp, screened, with the...
holds: none

## 531. the same film rendered at 1 worker and at 6 was a different film, and #506 named the symptom
`will-change` removed from `.hs-layer`, `#cam` and the beat wrapper; `--disable-partial-raster` added beside the two determinism flags that were already there; both early returns made authoritative.
holds: none

## 532. `snap-scenes` was read as a pixel gate for years, and it compares the DOM
The header now says plainly that it is not a pixel gate, gives the worked example, and says to diff rendered frames when the question is whether the picture changed. No new gate: a pixel net over...
holds: none

## 533. the `blobs` preset painted a blueprint grid nobody asked for
What: an author writing `"preset": "blobs"` on a bg window got a ruled technical line grid behind the whole film.
holds: none

## 534. `ease: "through"` worked on a layer key and threw on a camera key
`segmentAt` (`core/timeline/sequence.js`) is the single owner of how a segment is eased, and both call it.
holds: none

## 535. the velocity-cut advisory could not see a rotation, and its own worked example is one
`ROT_REACH` beside `SCALE_REACH`, a degree per second converted to px per second at an assumed radius, approximate on purpose exactly as the scale term is.
holds: none

## 536. KNOWN LIMITATION, not fixed here: a motion track cannot carry velocity out of its own ends
`tangentAt` (`core/timeline/sequence.js`) forces the FIRST and LAST tangents of an `ease: "through"` chain to zero, so a travel eases out of rest and back into it whatever its neighbours are doing.
holds: none

## 537. The cut-velocity advisory was blind to the camera, so it scored its own recipe at zero
`cameraSpeedAt` in `core/timeline/velocity-cut.js`, differenced off `cameraAt` exactly as the layer term is differenced off `velocityAt`, so an authored handle on a camera key is read for free and no curve...
holds: none

## 538. The refraction lens cannot bend a straight edge, because its map is separable
What. `glass: "refract"` displaces the backdrop through a lens ramp built from an `feImage` whose red channel is a function of x alone and whose green channel is a function of y alone.
holds: none

## 540. the render path that ships never awaited `frameSettle`, only the profiled one did
The two barriers are now named constants, `settleJS` and `paintJS`, next to `allocOpts` in `internal/scene/scene.go`, and both branches run both.
holds: none

## 541. at the supersample it SHIPS with, the renderer is not reproducible against itself
What. #531 measures its residue at `--draft`, where the capture runs at `ss=1`.
holds: none

## 542. an ANCESTOR's style silently disables a DESCENDANT's capability, and CSS never says so
What. `formats/scene/vawe-glass-hero.json` is a film about one thing: a refracting lens crossing a hard black horizon.
holds: scripts/gates/lib-test.mjs

## 543. a camera that arrives on time can still leave early, and the same shot fails both ways
The hold now runs PAST the press it framed, by `dwell` where there is room and by half the gap where there is not, and the reframe takes what is left (`core/camera-moves/index.js`, followCursor's...
holds: none

## 544. the premium animated gradient cycled in 57 to 105 seconds, so it shipped as a still image
The six coefficients are multiplied by 5 (`core/surfaces/shaders-ambient.js`, the `u_fx==0` branch), landing the periods at 11.4 to 20.9s.
holds: none

## 545. a logo reveal that could never end as the logo, because the fill was thrown away at build
`core/layers/svg.js`. Build keeps the resolved colour on `el.drawFill` and paints the path with it at `fill-opacity: 0`; `frame()` brings that opacity up over `draw.fillDur` (0.4s) once the stroke...
holds: none

## 548. the multiplane scale correction was written down, in an error message, and never applied
`hold` is a key on the plane spec and writes the `scale` longhand with `(lens - z) / lens`.
holds: scripts/gates/lib-test.mjs

## 547. a device that ignored the two dials it declared, and a plane that assumed every capture was 1.6:1
`roughness: L.roughness ?? 0.34, metalness: L.metalness ??
holds: none

## 546. `PMREMGenerator.fromEquirectangular` on an 8-bit DataTexture returns a valid, black texture
`pmrem.fromScene(room, 0.04)` over four `BackSide` boxes, which is how three's own `RoomEnvironment` does it and which works here: the same body renders (69,72,80).
holds: none

## 548. `presetOpts` on a `decode` layer was accepted and then read by nobody
`decodeText(el, u, i, { ...popts, each })`, and `decodeText` now takes `{ chars, rate, revealDelay, each }`.
holds: scripts/gates/lib-test.mjs

## 549. the text scramble refreshed a fixed COUNT per window, so its speed tracked its duration
`rate`, in refreshes per second, default 48, with `each` passed in: `step = floor(u * each * rate)`.
holds: none

## 550. a fragment's own comment ate its stylesheet, because every regex read prose as markup
`stripComments` in `core/type/sanitize-html.js`, one owner, called first by `sanitizeHtml`, `timeCssUsed` and `droppedDecls`.
holds: none

## 551. five capabilities shipped in one day, and none was reachable at the moment it mattered
`scripts/author/recency.mjs` answers one question, "did this name exist 14 days ago", by reading git.
holds: scripts/gates/lib-test.mjs

## 552. a canvas layer kept its build-time size, so a folding shader showed a CROP of a bigger field
The element owns the box (`el.style.width/height`) and the canvas fills it (`width:100%;height:100%`).
holds: scripts/gates/lib-test.mjs

## 553. the engine's idle default breathes, and a breathing terminal reads as fake
What. The terminal panel in the shader film crept: measured off the rendered frames, it was 1230px wide at 4.33s and 1267px at 6.33s, so every line of typed text drifted about seven pixels out and...
holds: none

## 554. a cut's `cx`/`cy` were per cent in the engine and 0-1 in the schema, so the only legal values were the wrong ones
the schema entry now says per cent, `max: 100`, and names `core/cuts/index.js` as the owner, so the two spellings agree. → Gate: `make validate` / `core/validate/validate.mjs`, which now permits what the engine...
holds: none

## 555. `sceneUnits` held EVERY layer of a beat alive through the cut, so a long beat rendered its whole history at once
FIXED. `beatIsCurrent` in `formats/scene/scene.js`, mirrored in `scripts/gates/scene-timing.mjs`, which is the one model of this rule outside the renderer.
holds: scripts/gates/lib-test.mjs, scripts/gates/scene-timing.mjs

## 556. a scene-level `matchCut` cannot match three subjects, and the closed state proves it
authoring, not engine. A graphic match needs ONE subject in the shape; a beat that ends on three equal panels has no single form to hand over.
holds: none

## 557. the arsenal answered two questions it had no answer to, and missed the one it held
What happened. `make arsenal Q="..."` is the search an author is told to reach for before inventing anything.
holds: none

## 558. every modifier was invisible to the search tool, because the family exported no registry
WHAT `make arsenal Q="matte"` answered `nothing matched "matte"`.
holds: none

## 559. the camera whipped and every frame came back razor sharp
What happened. `core/tracks/motion.js` computed motion blur from a LAYER's own motion track and nothing in it read the camera.
holds: none

## 560. the arsenal printed a snippet nobody could paste, and two registries named a slot the engine does not read
`slot` is now a documented PATH with two markers, stated once in `core/registry/registry.js` beside the option: `bg[].preset` puts the name in the VALUE of `preset`; `modifiers[]` ends at the array, so the...
holds: none

## 561. a shader panel could not change its look, and the workaround cost a WebGL context per look
What happened. A film wanted three panels, each cycling through several ambient shader looks.
holds: none

## 562. the GPU was never off, and the raster it does at ss=2 is what made a render irreproducible
The premise this started from was wrong, and it was wrong in the way this file keeps warning about: it was reasoned, not measured. `internal/scene/scene.go` names no `use-gl`, `enable-gpu`,...
holds: none

## 563. a fold sprang back to full size, because a later keyframe mentioned only `scale`
What happened. A terminal panel folds from 1240x620 down to a 564x404 tile over one bar, holds there, then takes a 1.07 scale punch when its contents swap.
holds: scripts/gates/lib-test.mjs

## 564. `schema-drift --write` looked like it deleted the whole `shared` prop list, and had not
`renderVocabulary` now emits one name per line at the indent it reads off the file, so a `--write` over a current file is byte-identical and a one-prop addition is a 3-line diff.
holds: scripts/gates/lib-test.mjs, scripts/gates/schema-drift.mjs

## 565. the dead-prop audit could only judge props somebody had already written, so a declared dial waited for an author to find it
`scripts/gates/prop-probe.mjs`, blocking in `.githooks/pre-push` (`make prop-probe`).
holds: scripts/gates/prop-probe.mjs

## 566. every seam shifted its text to the top of the frame, because the bake dropped a linked stylesheet
`core/resample/raster.js` `buildInlinedCss` now inlines EVERY same-origin `<link rel="stylesheet">`, not just tokens.css: it loops `document.querySelectorAll('link[rel="stylesheet"]')`, skips cross-origin...
holds: none

## 567. the scaffold's default draft did not render, and the fix silently broke its continuous object
the BLOCKING floor was already right. `direction-floor.mjs` `no-continuous-object` excludes any layer the engine confines to its beat (`sceneTiming.unitEnd` non-null under `sceneUnits`), so a...
holds: none

## 568. a fresh scaffold could never pass author-check, because two gates mishandled the expanded path
the fix is verified end to end: a fresh scaffold, after `make preflight D=<file>`, now passes `make author-check` (exit 0).
holds: scripts/gates/pace-check.mjs

## 569. a film rendered portrait and every "bug" for an hour was the canvas, plus a 404 that blamed the wrong thing
none new yet; both classes are named above with their write-site fix.
holds: scripts/gates/lint-test.mjs

## 570. `screenDive`'s own `image` layer carries `border`, which `core/layers/image.js` never reads
An image layer never consumes `border` (rect/text/group/html do, through kit.chipBox), so the prop-audit refused the render and the blueprint had never painted one; the same defect sat in viewportTrio. Fixed at the write site: `border` dropped from both recipes.
holds: core/prop-audit.js (refuses a prop set and never read); blueprints/beats.mjs, blueprints/beats-mined.mjs

## 571. the theme palette key is `surface2`; the CSS variable it becomes is `--surface-2`, and using the key's own spelling paints nothing, silently
A `var(--surface2)` resolves to an undefined custom property and the box renders transparent with no render-time warning; the hyphenated `--surface-2` (and `--text-2`) is what boot sets from the palette key. The designspec lock catches it before render as `dead-token`, with a did-you-mean; the film was authored without running it.
holds: scripts/gates/designspec-check.mjs (dead-token, inside author-check)

## 572. a group's children fell back to the 0.26s default exit, so every dissolve over a group-built beat crossed an empty field
`addGroupChild` in core/layers/util.js computed a child's clock from the parent but never passed the parent's `exitDur` down, so a child with none of its own faded out over the last quarter second of its window, exactly at the beat boundary; a hard cut hid it, a dissolve found nothing to cross. A child now inherits the group's `exitDur` when it states none, and blueprint layers hold to the beat end.
holds: core/layers/util.js (childExitDur), blueprints/kit.mjs (exitDur 0 by default), make seam-check

## 573. a migration script read the file the same change deleted, so it could run exactly once
legacy-fold.mjs folded the legacy manifest into scene waivers and the manifest was deleted in the same commit; on any machine whose gitignored library was not folded yet the script crashed on ENOENT. A one-shot script that owns its input reads it from the last commit that carried it (`git show <sha>:<path>`) when the file is gone.
holds: scripts/gates/legacy-fold.mjs (MANIFEST_LAST_COMMIT)

## 574. a beat wrapper stretched a layer's `data-duration` past its own life, and the primitive that stopped driving at its authored end rendered its resting pose instead of holding
sceneUnits credited a layer as the beat's "current state" (and therefore stretched its visibility to the cut) whenever nothing else in the beat started after it, even when the layer's OWN end fell well short of the cut. The stretch widened `data-duration` on the DOM only; every primitive's `frame()` still measured against `L.start`/`L.duration`, the untouched authored numbers, so a `cursor` past its own path (or any layer past its own end) hit its shared `if (!(t>=start&&t<end)) return` guard and left whatever `driveClips` had written moments earlier: the resting transform, i.e. the origin. A pointer that finished its path at 6.1s and a caption that finished at 7.1s both reappeared, unmoved, from 6.9s to the cut at 7.2s. Fixed two ways: `beatIsCurrent` now credits only a layer whose own end reaches the beat's end (the "nothing replaced it" clause is gone, so a layer that truly ended early is simply gone, same as outside sceneUnits), and `renderFrame`'s per-layer loop clamps the `t` handed to every primitive at `L.start + L.duration` regardless of what the DOM's stretched `data-duration` says, so a still-visible layer's own clock never runs past what it was authored for and its last real pose holds by construction.
holds: formats/scene/scene.js (`beatIsCurrent`, the per-layer clock clamp in `renderFrame`), make lib-test

## 575. every layer with no `out` faded for its last 0.26s anyway, because the default lived at the READ site, not the write site
`setLayerTiming` always wrote a `data-exitDur`, defaulting to `BASE_EXIT` for any layer that named no `out`; `clipStyleAt`'s opacity envelope ramps down over the last `exitDur` seconds of a layer's life whether or not `out` is set (the documented "calm fade in place" default), so a layer authored to simply END quietly faded anyway. Removing the write-site default (scene.js now only defaults `exitDur` when the layer names an `out`) was not enough on its own: `core/timeline/clips.js`'s `exitDurOf` fell back to `BASE_EXIT` whenever the attribute was absent, so the one write site stopped authoring the fade and the one read site kept inventing it. `exitDurOf` now defaults to 0 unless `el.dataset.out` is set, so an exit is authored (`out`, with or without `exitDur`) or it holds to its end.
holds: core/timeline/clips.js (`exitDurOf`), formats/scene/scene.js (`setLayerTiming`)

## 576. a bg window switched hard at a cut while the content dissolved across it, because `drawBg` only ever asked "which window wins now"
`bgWinAt(t)` picks the last matching `bg` window and nothing else, so a preset boundary that happened to land on a real transition snapped instantly while the transition's own layers crossfaded over its whole duration: the world jumped while the foreground glided. `drawBg` now asks a second question, `bgCutAt(t)`, naming the real cut (if any, `sceneCuts` excludes `style:"none"`) straddling the current frame, using the SAME window and default duration the visual transition itself uses (sceneUnits' `[ct,ct+dur)` vs the plain camera cut's centred `[ct-dur/2,ct+dur/2)`); when the window before and after that joint differ and are both canvas presets (not a hand-authored `html` backdrop, which the canvas cannot blend), it paints the outgoing field on the real canvas and the incoming field on a lazily-built off-screen canvas, then composites the incoming one on top at the cut's own eased progress. `renderBg` clears-then-paints its target, which is why the incoming side needs its own canvas rather than a second call on the same one.
holds: formats/scene/scene.js (`bgCutAt`, `drawBg`)

## 577. a bg cross-dissolve's alpha followed the transition's EASED TIMING, not the transition's own VISIBLE curve, and drifted from it on a shaped presentation
`bgCutAt` (#576) blended the bg on `T(raw)`, the eased timing curve alone. A presentation shapes its own opacity on TOP of that curve (`punch`'s exit is `1 - T(raw)^2`, not `T(raw)`), so on `punch` the bg reached "fully the next window" while the outgoing wrapper was still half-visible on top of it (`seam-forensics` "split seam ... while the transition is still dissolving the layers on top of it"). `bgCutAt` now asks `cutStyle` itself, the wrapper's own function, for the outgoing side's opacity at this progress and blends on its complement, so the field and the content it sits behind are reading the same curve rather than two independent approximations of it. A presentation that reveals through a mask instead of opacity (`wipe`, `iris`, `blinds`, ...) holds opacity at `'1'` throughout and falls back to the plain eased timing, which is not a match to the mask's own shape but is still closer than a hard switch.
holds: formats/scene/scene.js (`bgCutAt`)

## 578. 101 of 181 films had no joint at all, because the only code that ever inferred one lived inside a GATE, not the engine
`seam-snap.mjs` derived a film's likely beat boundaries (a track-bearing layer's start landing >1.2s after the previous one) to know where to sample for a flash, and never told the engine. So `sceneUnits`, `bindWindowsToJunctions`, audio-bridge cues and `shotWindows` all stayed off by default on any film that hadn't hand-authored a cut, which is most of them. The loop moved to `core/timeline/junctions.js` as `inferCuts(layers, duration)`, beside `shotWindows` for the same reason that one is there (a second copy of "where does this film turn" is this exact class of drift, #159/#358); `seam-snap.mjs` now imports it instead of keeping its own copy. `produceBaseline` injects the inferred boundaries as real `data.cuts` (absent-only: a film with a cut, a seam, or a `motion` track is untouched) styled with `look.cuts.default`, and does so BEFORE the existing `sceneUnits` default so a freshly-cut film turns its beats into cross-fading units in the same pass, not after: a `fade` cut with no scene-unit wrapper is a whole-frame fade with nothing under it, refused at render. An author who wrote `sceneUnits: false` is left alone rather than overridden, so an explicit "no" cannot be silently followed by a cut the render then refuses.
holds: core/timeline/junctions.js (`inferCuts`), core/engine/produce.js (`produceBaseline`), scripts/gates/seam-snap.mjs

## 579. an inferred cut styled every joint the same way, whether or not anything actually crossed it
`inferCuts` (#578) told the engine WHERE a film likely turns, and `produceBaseline` styled every one of those joints with the same `look.cuts.default`, purely from the gap between beat starts. On `showcase-lumen.json` that meant a whole-frame fade wrapped a joint a layer's own window straddled (the wrapper truncates a non-`acrossBeats` layer at the beat boundary regardless of its authored duration) and a second joint where the outgoing card's box overlapped the incoming headline's box (a dissolve there reads as a muddy double-exposure, exactly what `seam-forensics` exists to catch). `chooseCutStyles`/`classifyJoint` (`core/timeline/junctions.js`) now read the relationship at each joint before picking a style: a straddling window or a `becomes` handover rules out every style but the hard cut; overlapping boxes rule out the fade-family name; only a moving layer, a medium change, or a backdrop turn promotes past the hard cut, and the accent is spent at most once per film. The distinction that keeps this from repeating #159 (the engine picking the BACKGROUND itself): ruling a name OUT is a structural fact about the two beats, never a taste call, and the names left to choose among are still only the theme's own two (`look.cuts.default`/`accent`) plus the doctrine's unconditional hard cut.
holds: core/timeline/junctions.js (`classifyJoint`, `chooseCutStyles`), core/engine/produce.js (`produceBaseline`), scripts/gates/seam-forensics.mjs (now clean on showcase-lumen.json)

## 580. `size ?? 96` sat at five separate call sites, so a named text scale had five places to teach the same lesson
Nothing let an author write `size: "headline"` and mean "this theme's headline size": `size` was always a raw px number or the same hardcoded 96 fallback, spelled out five times in `core/layers/text.js` (build's fit path, its auto-fit safety path, and `microType`). Worse, `resolveCoords` (`core/engine/boot.js`) reads `L.size` directly to estimate a text layer's height for a bottom pin, so a role string reaching that arithmetic before it lowered would have become `NaN` with no error. `bakeTextSizeRoles` (`core/engine/produce.js`) now lowers `size: "<role>"` against `look.scale` (`hook`/`headline`/`body`/`caption`) at boot, in the one gap between resolving `look` and calling `resolveCoords`; an unknown role throws and names the real ones, copying `resolveJunction`'s own refusal shape rather than silently landing on 96. `core/layers/text.js`'s five sites collapsed onto one `sizeOf(L)` default, now only reached when a layer names no size at all.
holds: core/engine/produce.js (`resolveTextSize`, `bakeTextSizeRoles`), core/engine/boot.js (the bake runs before `resolveCoords`), core/layers/text.js (`sizeOf`)

## 581. an svg `draw` reveal painted a stray dot at the arc seam, because `pathLength="1"` asked the browser to measure an arc it measures wrong
`post-halyard.json`'s mark is one path, a line into two arcs forming a loop. At u=0 a round-cap dot appeared not at the path's true start but at the line-to-arc seam (35x34px, matching the stroke width); one frame later it vanished and a disconnected 109px blob appeared back near the true start; only by u≈0.13 did the two join into one continuous stroke. `applyDraw` (`core/layers/svg.js`) set `pathLength="1"` and dashed in that normalised unit so the offset stayed "a pure function of u, no measuring" (the comment's own words), but Chromium's rescale from real geometry to that unit uses its own arc-flattening length estimate, which disagrees with the true length right at a line-to-arc command boundary, and the disagreement paints a spurious cap there for the first frame or two. `path-morph.js`'s `resamplePath` already measures the same kind of arc-bearing path correctly with `getTotalLength()` (a build-time DOM read, a different and accurate code path from the pathLength rescale), so `applyDraw` now calls it once at build and dashes in the path's REAL length units; `frame()`'s dashoffset is a new pure function, `drawOffset(total, u)`, monotonic from `total` to `0`, tested with no DOM in `core/layers/svg.test.mjs`. `curve` (`Q`/`T`) paths, e.g. `vawe-explainer-v2.json`'s end-card squiggle, never showed the seam artefact and render unchanged.
holds: core/layers/svg.js (`applyDraw`, `drawOffset`, `frame`), core/layers/svg.test.mjs, scripts/gates/lib-test.mjs (the svg draw mock DOM gained `getTotalLength`)

## 582. a reference band was quoted in four places for months, and the tool that would have caught it existed the whole time
`internal/scene/scene.go`, `internal/render/render.go` (twice) and `scripts/media/study.mjs` all printed "reference films are still for 13% to 24% of their frames", sourced from CLAUDE.md and a motion plan, never from the grammar corpus itself. `node scripts/author/claims.mjs` (grammar/_claims.json id `ref-still-share`) already reported this CONTRADICTED: the measured spread is 11% to 77% still, median 29%, with the two Arc product films (the closest genre to a launch film) at 71% and 77%, both of which the renderer's own 60%-still warning would have flagged as a problem. A number that ships from a plan file and is never run against the corpus it claims to describe gets quoted downstream faster than it gets checked, and four call sites repeated it without one of them running the check. Fixed by updating the claim to the measured spread (now SUPPORTED, 15/17) and quoting the real numbers at every call site; the 60%-still warning moved to 80% for the same reason, since 60% would fire on films doing exactly what the doctrine asks for.
holds: grammar/_claims.json (`ref-still-share`), internal/scene/scene.go, internal/render/render.go, scripts/media/study.mjs

## 583. two stillness readings of the same film disagreed because they were never the same codec
The reference band lives in grammar/*.json, measured by `scripts/media/study.mjs` reading ffmpeg's `signalstats.YAVG` off decoded H.264 frames; the renderer's own `Stillness` (`internal/scene/scene.go`) reads the JPEG screenshots it captures by default (`CaptureExt`). `scripts/gates/motion-split.mjs` had already measured the gap this causes: a JPEG carries a quantisation noise floor around 0.9, above `stillFloor` (0.5), while a lossless PNG of the same instant reads 0.05, so "the render reports 25% still where this file reports 67% on the same film". Comparing the renderer's JPEG-floor number against the reference's H.264-decoded number was comparing two different measurements as if they were one. Neither side's number was wrong; printing them beside each other without saying which codec each came from was. Fixed by naming the codec in every printed line (`"25% still on jpg"`) rather than by trying to make the two measurements identical, since the codec floor is a real property of the format, not a bug to patch away, and `VAWE_CAPTURE=png` remains the way to get a codec-comparable reading.
holds: internal/scene/scene.go (`Stillness`, `CaptureExt`), internal/render/render.go

## 584. 48 evenly spaced probes measured velocity at 48 random instants, so a burst-and-hold film scored the same as a film that never moved
`Stillness` sampled 48 adjacent-frame pairs across the film and reported the share below `stillFloor` plus the median, both of which describe a random instant, not the film over time. A shot built exactly the way this repo's own doctrine asks for (hold, then one loud burst) lands most of its probes inside the hold and reports mostly-still, indistinguishable from a shot that is mostly-still because it never moves at all. `scripts/media/study.mjs` had already solved this for reference films by keeping `peak` (the loudest single frame) beside `held` (the still share), reasoning that "a shot that holds for three seconds and then explodes has the same mean as one that moves steadily". `Stillness` now returns `peak` too, computed from the same deltas array it already builds, so a burst-and-hold film and a genuinely static one both read mostly-still by share but only the first also reports a real peak. `internal/scene/stillness_test.go` asserts the separation directly: a flat 20-frame sequence peaks under 1, one with a single bright frame inserted peaks over 30, and both stay above 80% still by share.
holds: internal/scene/scene.go (`Stillness`), internal/render/render.go, internal/scene/stillness_test.go

## 585. a part's `drawOn` stroke rendered as a one-frame snap, because GSAP rounds a px-unit style value to the nearest whole pixel and the whole tween lived inside one pixel
`post-trailhead.json`'s route line is a straight-segment path (no arcs, so not #581's shape) with `parts: [{ select: "#route", anim: "drawOn", each: 7.0 }]`. `PARTS.drawOn` (`core/motion/parts.js`) set `pathLength="1"` and tweened `strokeDashoffset` from 1 to 0 with `gsap.fromTo`, the same normalise-to-[0,1] idea `applyDraw` used before #581. Measured on the DOM across the seven-second span: `gsap.getProperty` and the CSSOM both read exactly `"1px"` for the first 1.45s, then exactly `"0px"` for the remaining 5.55s, with no value ever observed in between even at 33ms (one-frame) resolution; a synthetic `fromTo` on the SAME element confirmed the mechanism directly, tweening `strokeDashoffset` from a real `getTotalLength()` (~842) to 0 produced a clean descending px sequence (842, 758, 673, ...), while the identical tween scaled to the [0,1] range produced only "1px"/"0px". GSAP writes a px-unit style value rounded to the nearest integer pixel; a [0,1] range has exactly two representable integers, so the tween is binary regardless of duration or ease, and the browser's own preview and the encoded video are the same code path (`window.__engine.renderFrame(n)`) so both show the identical snap. `PARTS.drawOn`'s setup now measures the real path length with `getTotalLength()` (the same accurate call `applyDraw` and `resamplePath` already trust) and dashes/tweens in real units via GSAP's per-target function-value form, so multiple matched elements each get their own length; a real length of hundreds of pixels makes the same integer rounding imperceptible.
holds: core/motion/parts.js (`PARTS.drawOn`)

## 586. a layer's authored `id` never reached the DOM, so the one instrument built to measure motion could see two layers out of eight
`scripts/gates/motion-audit.mjs --trace` selected `[id], [data-layer="critical"]` and reported 2 tracked elements on `formats/scene/higgsfield-recreation.json`, a film with 8 layers and 6 keyed motion tracks. The cause is that a layer carries TWO identities and only one of them is real in the browser: `formats/scene/scene.js:922` sets `g.id = L.id` on the JS-side geometry object, which `becomes`, `anchor` and every error message read, and nothing anywhere assigns `el.id`. So `[id]` matched only the four literal ids in `scene.html`'s own static markup (`stage`, `root`, `cv`, `cam`) and never an authored layer, while `[data-layer="critical"]` fires only for text layers at 60px or more, which is why the two it did find were both big text: every non-text layer, every small text layer and every group child was structurally invisible, and widening the selector could not have helped because the attribute was never written. The one attribute every timed element does carry is `[data-start]`, stamped by `setLayerTiming` (scene.js:585) and `addGroupChild` (core/layers/util.js:589), and it is already what the engine's own clip driver means by "every timed element" (core/timeline/clips.js:213). The trace now selects on it and recovers a readable name from `data-idx` back to the authored JSON, since the authored id still does not reach the DOM. Tracked elements on that film went 2 to 8, and the trace's own numbers then independently confirmed a frame-by-frame luma measurement of the same render: the scrim moves at 3.07-3.13s, which is the single-frame world flood measured at f93.
holds: scripts/gates/motion-audit.mjs

## 587. a layer could travel and resize but never change shape, because the pose table never had a radius row
`core/timeline/sequence.js:134` declares `POSE`, the one table mapping an authored keyframe name to its pose slot and its identity, and it carried x, y, scale, rot, opacity, blur, w, h, track, ox and oy. It did not carry `radius`, and that single omission is why every continuous object in this library could move and resize and never become a different shape. The reference film this repo argues from goes rectangle to pill to circle, and measured frame by frame those three states are `{w:39,h:22,radius:4}`, `{w:39,h:22,radius:11}` and `{w:22,h:22,radius:11}`: two of the three properties were already keyable, since a pill is a rectangle whose radius reached half its height and a circle is a pill whose width reached its height. So nothing was invented to fix this, a forgotten row was added. Identity is `null` rather than a number, following `w`/`h`/`track`, so a track that never mentions radius leaves the layer's authored corner exactly as it was instead of quietly writing one. `KEYFRAME_PROPS` is generated from `POSE`, so the boot-time refusal for stray keyframe keys covered the new name for free rather than needing a second refusal. The write goes through `chipBox` (core/layers/util.js), which already owned a layer's resting radius and whose own comment records the earlier bug where an absent radius silently rendered square. THE TRAP THAT MAKES THE OBVIOUS TEST WORTHLESS: a radius larger than half the box is legal CSS and clamps silently, so a track can interpolate through wrong values and report nothing, which is why the test asserts the RENDERED radius on real frames rather than the authored number.
holds: core/timeline/sequence.js (`POSE`), core/timeline/sequence.test.mjs

## 588. `squash` had zero users because the one thing it exists to squash is the one thing it could not see
`velocityAt` (core/timeline/sequence.js) read only `dx`/`dy`, so a layer rotating about a fixed anchor (`ox`/`oy` keyed, `dx`/`dy` never keyed) has zero TRANSLATION by construction and reported `speed` exactly 0 however fast it spun. `squash` reads that number, so it rendered `scale: none` on every frame of a pendulum, silently, and a pendulum is the most natural thing in the vocabulary to squash. Measured on a 400x20 rect pivoting at its own left edge through 360 degrees in one second: `scale: none` on every frame before, `0.76923 / 1.3` after. The fix does NOT substitute one quantity for the other: angular velocity is deg/s and linear is px/s, with no shared unit at the point `velocityAt` runs, because it has no box. `velocityAt` now reports `omega` beside vx/vy, read off the same two samples so no caller evaluates the track a third time, and `core/fx/squash.js` converts it to a tangential px/s at the layer's own extremity, which is where the two become comparable. Whichever of translation or rotation reads faster wins the frame; volume conservation is untouched.
holds: core/timeline/sequence.js (`velocityAt`), core/fx/squash.js, core/fx/squash.test.mjs

## 589. a follower and the layer it followed disagreed about what time it was
`resolveBoxes` (formats/scene/scene.js) sampled a layer's motion track at raw `t - start`, while `runTracks` samples the same layer through `layerTime(L, t, start, end)`, which applies `timeWarp` and `timeRemap`. So a warped layer's published BOX described where it would have been on an unwarped clock, and everything reading that box (a `follow`, an `anchor`, a shadow) was placed against a position the layer was not in. It agreed only where the warp happened to be the identity, which is why nothing caught it: the mechanism is invisible until a film warps a clock, and `timeWarp` had zero users. Measured on a layer moving 0 to 800px over 2s under `easeInQuint`, followed at `edge: "center"`: the follower drifted up to 410px off the target's real centre before the fix and matched to floating-point rounding after, at every sampled frame. `layerTime` is pure in (L, t, start, end), so routing through it keeps `resolveBoxes` pure in t and sharded rendering intact.
holds: formats/scene/scene.js (`resolveBoxes`), core/timeline/sequence.test.mjs

## 590. beats, frames and fragments are three counts, and the decider brief printed one of them under another's name
`scripts/author/critics.mjs` built its film summary with `beats: fragments.length`, equating a unit of STORY with a hand-written HTML surface. The two are independent by design: `formats/scene/vawe-explainer-v2.json` is five `{type:"beat"}` blocks with five transitions and zero html layers, and `make critics DECIDERS=1` described it to all six deciders as `The film: 0 beat(s), 22s`. The error also runs the other way, and that is the direction that shapes a plan: a seven-beat film whose beats 5 and 6 REUSE beat 4's rendered card needs three fragments, and reading that back as a three-beat film silently deletes the reuse, which was the continuity plan and the reason the multiplication beat means anything. Nothing downstream could catch it, because every decider inherits the shape of the film from that one line. Beats now derive from what actually marks a beat, in order of directness: `{type:"beat"}` blocks, else transitions + 1, else top-level layers. Both counts are PRINTED, and when they differ the brief says in words that the reuse is deliberate, so the next reader sees a design rather than a gap. The planning half, how the fragment count falls out of the requirement, is now `docs/CRAFT/HTML-FRAGMENTS.md`, which owned how to write a fragment and had never said how many to write.
holds: scripts/author/critics.mjs, docs/CRAFT/HTML-FRAGMENTS.md

## 591. the decider roster was run backwards, and the reason given for it was written down in the doc that forbids it
`AGENTS.md` orders the deciders storyboard (1) · subject (2) · scene (3), and the scene decider is the one that writes a fragment. On `formats/scene/vawe-oblique.json` the fragments were authored first and the storyboard second. The justification offered was that a `motion:` line names CSS selectors, so the markup has to exist before the plan can point at it. `docs/CRAFT/STORYBOARD-TEMPLATE.md` states the opposite in the field's own definition: `motion:` exists "so a fragment author is told what has to move BEFORE writing the markup rather than inventing entrances after". Written in that order the entrances are invented after, and they agree with the plan only because one author wrote both halves; hand either half to a second agent and the selectors name nothing. It also inverts what the fragment count is derived from: the beat table is what sorts each beat into drawn-by-a-blueprint or needs-a-fragment, so authoring fragments first is guessing the count and then writing a plan that agrees with the guess. `make critics DECIDERS=1` already refuses to let the roles below start with `! no storyboard ... Step 1 is not optional`, and that refusal was read and then worked around rather than obeyed. The fragment doc now says the same thing at the top of its own planning section, because the author who is about to write markup is reading that file and not the roster.
The rule was at [eye] and stayed broken while its author could quote it, so it is not at [eye] any more: `scripts/live/craft-live.mjs` now has a fragment branch that speaks the moment a `formats/scene/*.html` is saved, and says so when no storyboard exists. The same branch carries the type and elevation ramps, broken the same way and in the same file. Writing the rule down a second time was the wrong fix and was tried first.
holds: scripts/live/craft-live.mjs, docs/CRAFT/HTML-FRAGMENTS.md, AGENTS.md

## 592. the plan was reviewed as grey boxes and loose html files, so nobody could see the film
`make panels` draws one grey still per beat by reading `shot:` and `layout:` and sizing a box. That answers how big and where, and nothing at all about what is in the frame, which is the only question a human reviewing a plan can actually answer. The real pictures existed the whole time: every beat that names a `fragment:` has hand-written markup on disk that renders in a browser instantly. They were being shown as separate files opened out of `/tmp`, with no relation to the plan and no relation to each other, so approving a film meant reading a markdown table in one window and guessing which loose page went with which row. studio's own `plan` state now draws the storyboard as HTML in the studio's room: each beat's plan beside that beat's real fragment, live, on the film's own theme, in the same wrapper `make preview` photographs (`scripts/lib/frag-page.mjs`, extracted so the two tools cannot drift). A beat with no fragment says which blueprint draws it, because there is no honest picture to show for markup nobody has written.
holds: scripts/dev/studio.mjs, scripts/dev/studio-page.mjs, scripts/lib/frag-page.mjs

## 593. a doc was written for a rule that already named its own file, and a file was overwritten to do it
The global rule says to record which design skills shaped a surface "in the project's DESIGN.md or the commit". `DESIGN.md` existed, 246 lines of engine rationale and brand tokens. Instead of appending to it, a new CRAFT doc was created for the same content, and `DESIGN.md` was written over with `cat >` after an `ls` whose output was filtered and read as "the file does not exist". Recovered whole from `HEAD`, which is the only reason this is an entry and not a loss. Two habits behind one mistake: reaching for a new file when a named one exists, and treating a tool's silence as evidence. The record now lives in `DESIGN.md` as the rule says, the ramps live in `docs/CRAFT/HTML-FRAGMENTS.md` where the author who needs them already is, and the new doc is deleted. Before writing a file that does not appear to exist, `git show HEAD:<path>` is the check that costs nothing.
holds: DESIGN.md, docs/CRAFT/HTML-FRAGMENTS.md

## 594. seven fragments carried the stage kit without its markers, so every tool that reads the kit read the fragment instead
The kit is pasted as `buildKit().block`, which wraps the CSS in `STAGEKIT:start`/`:end`. Seven hand-written fragments pasted the generated `<film>.kit.css` sidecar instead, which is the same CSS with no markers. `extractKitBlock` then returned null on all seven, and every tool that strips the kit before judging a fragment judged the kit as if the author had written it: `preview-fragment`'s full-bleed detector reads `position:absolute` out of `.kit-root`, and the new live hook counted `.kit-card`'s own `box-shadow` as two hand-written shadows on a fragment that has none. The markers are not decoration, they are the boundary between what the author wrote and what the generator did, and that boundary is what four separate checks depend on. Re-stamped from `block`, and the fragment's own CSS now sits in its own second `<style>`.
holds: formats/scene/_vawe-oblique.*.html, scripts/lib/stagekit.mjs

## 595. the authoring order was written, printed, and still run backwards, so it stopped being written and became a refusal
Three rules were broken in one session by an author who could quote all three: the decider roster (#591), the ui-skills route, and the file a rule named by filename (#593). Every one sat at `[eye]`, which `make rung` defines as "nothing but the sentence: you have to remember", and `make critics DECIDERS=1` had already printed `! no storyboard ... Step 1 is not optional` to a reader who worked around it. The first fix attempted was another paragraph of doctrine, which is the same mechanism that had already failed and would have been a ninth sentence to not follow. What replaced it: `scripts/gates/stage.mjs` derives which of eight stages a film is in FROM ITS ARTIFACTS (a stored state file would be free to disagree with the repo); `scripts/live/stage-gate.mjs` answers `PreToolUse` with `permissionDecision: "deny"` on the three writes that skip a stage, which is evaluated before any permission-mode check and so holds under bypass; and `scripts/live/stage-say.mjs` re-states the open stage at every `UserPromptSubmit`, because reasoning quality falls as a session lengthens and a rule read once at session start is a rule that fails late in the work, which is when it matters. Approval is the one piece of state nothing can derive, so it is a line only the user's `/vawe-approve` writes and the gate denies to everyone else. Three denials only, one per mistake actually made, and no flag to skip them: a flag on this would be the thing it prevents.
holds: scripts/gates/stage.mjs, scripts/live/stage-gate.mjs, scripts/live/stage-say.mjs, scripts/author/approve.mjs, .claude/settings.json

## 596. the storyboard planned the story and never planned the picture, so the wrong object passed every gate
Beat 3 of `formats/scene/vawe-oblique.json` shipped a rounded pill with a circular accent send button: the together.ai chat input, copied off the reference shape-first, in a film about a command line. Its own storyboard said `blueprint: terminalReveal` and its own `picture:` line said "a white pill bar holding the command, with a round cobalt run button", the two contradicting each other in the same beat, and nothing compared them. `make preview` was clean, correctly: the detector reads craft tells and cannot know that a well-made object is the wrong object. Worse, the `picture:` line had been EDITED to agree with the wrong drawing rather than the drawing corrected to the plan. The same hole produced three more defects in one session: eight invented type sizes across seven fragments (no field decided the film's ramp), seven identical centred stacks (`layout:` is prose only `make panels` reads), and a declared peak that measured fifth-largest in its own film (`spectacle:` names a beat and nothing compared beat sizes). Four closed-vocabulary fields now carry those decisions (`archetype:`, `weight:`, `borrows:`, and film-level `ramp:`), and `scripts/gates/frame-check.mjs` is the check nothing was doing: it reads the storyboard AND the fragments together, renders each at 1920x1080 through the same wrapper `make preview` photographs, and measures the largest painted object per beat. Two measurement bugs were found and fixed while writing it, both worth keeping: transparent flex wrappers spanning the margins reported as the largest "object" on three beats at an identical 83%, and a plane bleeding off two edges was credited with its off-screen half. An object PAINTS or is a text leaf, and only the part inside the canvas is in the picture.
holds: scripts/gates/frame-check.mjs, scripts/author/storyboard-parse.mjs, scripts/gates/storyboard-check.mjs, docs/CRAFT/STORYBOARD-TEMPLATE.md

## 597. a flat white theme cannot show depth, so every modern effect it was given rendered as nothing
A glass shine was added to the peak frame of `formats/scene/vawe-oblique.json` as a light band whose x is a formula on `--t`, the scene clock. It rendered INVISIBLE, and the reason is not a bug in the shine: `themes/vawe.json` puts a `#ffffff` surface on a `#ffffff` ground, and a white highlight on a white plate has nothing to catch. The same absence of tonal range is why the frames read "too simple" for several rounds while the compositions, the type ramp and the elevation ramp were each fixed in turn: with no tone between ground and surface, depth cannot exist, so layout was carrying the whole film alone. `themes/vawe.json` was NOT changed, because it mirrors the real landing page and Anybody is the site's actual face, a fact this repo already corrected once. Films get `themes/vawe-film.json` instead: Geist and Geist Mono (a matched pair, because a film alternating statements and code every other beat reads as two design systems under two unrelated families), a cool `#f4f6fa` ground against a `#ffffff` surface, and a moving backdrop by default because a flat white FILM is what `direction-floor` already calls `no-bg-motion`. The motion budget that came with it is the half worth keeping: an ambient backdrop belongs on every beat because it is the ground, and a shine belongs on exactly one, the beat the plan already named as the peak.
holds: themes/vawe-film.json, docs/CRAFT/HTML-FRAGMENTS.md, formats/scene/_vawe-oblique.frame.html

## 598. a vendored third-party skill was used like house tooling: reached past its entry point, and credited nowhere
`skills/impeccable` is not this repo's work. It is pbakaus's `impeccable`, v3.5.0, Apache 2.0, vendored whole with its LICENSE, and its detector is the only check here that opens a browser and measures what actually RENDERED. Two things were wrong with how it was used. First, `scripts/author/preview-fragment.mjs` imported `skills/impeccable/scripts/detector/detect-antipatterns.mjs` by hard-coded path, while the skill's OWN entry point (its own entry point one directory up) tries two layouts before giving up: a skill update that moved the detector would have broken the check silently, and every run after it would have reported a clean preview because the catch returned `skipped` and the caller printed on. Second, the Apache 2.0 attribution existed only in a LICENSE file three directories down, while `AGENTS.md`, `HTML-FRAGMENTS.md` and the tool's own output all said "impeccable" in the same voice they use for `make preview`, so a reader had no way to tell a vendored dependency from a house gate. It matters beyond politeness: this repo's own anti-slop is `scripts/live/craft-live.mjs` (a fragment's SOURCE, for sizes and shadows off the kit ramp) and `scripts/gates/frame-check.mjs` (the plan against the frames), and calling those "impeccable" would credit a third party with what they catch and hide that the rendered-page check is the one thing we did not write. The resolution order now mirrors the skill's own, and every place the name appears says vendored, third-party and Apache 2.0.
holds: scripts/author/preview-fragment.mjs, AGENTS.md, docs/CRAFT/HTML-FRAGMENTS.md

## 599. the reference was decoded into twelve devices and the catalogue lived in a chat message
The first pass at `formats/scene/vawe-oblique.json` used three of the reference film's twelve devices and nobody could see which nine were missing, because the study existed only in a transcript and a scratch file in /tmp. The frames therefore looked "too simple" for several rounds while the compositions, the type ramp, the elevation ramp and the theme were each fixed in turn, and the actual gap was that nine of the reference's moves had never been written down anywhere a reviewer could check them against the film. This is the same failure as #593 in a different place: a decision that lives in a conversation cannot be checked tomorrow, and the brief had already been lost the same way earlier in the same session. The catalogue is now a `### Reference devices` table in the storyboard (a `###` so `blocksOf` does not read it as a beat), `referenceDevices()` in the shared parser reads it, and studio's plan pane renders it beside the spine. Each beat's `borrows:` names the device ids it uses, so "which of the reference's moves does this film actually use" is answerable from the file rather than from memory. A DROPPED device keeps its row and is struck through rather than deleted: refusing a device is a decision, and an absent row reads as an oversight.
holds: formats/scene/vawe-oblique.storyboard.md, scripts/author/storyboard-parse.mjs, scripts/dev/studio-page.mjs

## 600. seven frames were designed at web values and rendered at 1920x1080
`formats/scene/_vawe-oblique.*.html` read "too simple" across five rounds of fixes: compositions, then the type ramp, then the elevation ramp, then the theme, then the double bezel. Each fix was real and none of them was the reason. The reason is in a table this machine already had: `~/.claude/skills/another engine-creative/references/video-composition.md` puts decorative opacity at 3-8% on a web page and 12-25% on video, borders at 1px against 2-4px, and says plainly that a card at `1px solid #e2e3e6` with a 6% shadow is INVISIBLE on video. The ambient backdrop here was authored at 6-9% opacity, twice, with a comment defending it: "a backdrop a viewer NOTICES has stopped being a backdrop". That is a true statement about a page and a wrong one about a frame that will be encoded. Every decorative value in `scripts/lib/stagekit.mjs` is now set from the video column: hairlines 2px, grain 5.5%, ambient fields 14-20%. The same reference names two more things the film was failing: "muted is fine, flat is not", and that a LIGHT canvas is the hard case because an accent glows for free on dark and needs bolder structure and real texture on light. What was NOT taken from it: registration marks. They are on its list of foreground accents and they belong to a genre this film is not in, and the film's own reference has none. A frame's accents come from its reference, not from a menu. One correction to how this was first written down, because the wrong reading is expensive: "a video frame is not a web page" is a claim about VIEWING CONDITIONS, not about design quality. Web craft is the input, and inheriting it is why this engine renders HTML at all: `make capture URL= SEL=` lifts a real component with its computed CSS into an animatable layer, and hand-authoring a fragment is the fallback for a surface that does not exist yet. What the medium breaks is a short list of decorative VALUES; hierarchy, restraint, rhythm, optical alignment and type pairing transfer unchanged. Transpose the decoration, keep the craft.
holds: scripts/lib/stagekit.mjs, docs/CRAFT/HTML-FRAGMENTS.md

## 601. a ground that remaps a token painted itself with the token it was about to remap
`.kit-ground-accent` was written as `background:var(--accent)` in the same rule that sets `--accent:#ffffff` for its children. CSS resolves a `var()` against the element's OWN computed custom properties, redefinition included, so the rule painted the frame white with the value it was in the middle of setting. Silent: the beat simply rendered as another white one in a set of white ones, and the fix was invisible until the frames were laid side by side. The flood is now the theme's accent emitted as a LITERAL by the kit generator, which knows the theme and has no reason to indirect through a token it is rewriting. The same change surfaced the counterpart bug and its fix: a ground remapping semantic tokens is what lets one fragment render on paper, ink or accent unchanged, but some things inside a frame are PICTURES OF ANOTHER FRAME (a rendered still, a screenshot, a captured component) and must not inherit them, or the cobalt beat draws white type on a white plate. `.kit-picture` restores the theme's paper values for exactly that, and it is also what a `make capture` component needs, since real UI lifted off a live site was designed against its own palette. Three further contrast pairs fell out of the same work and were all real: an alpha chip background no contrast check can composite (made solid per ground), a rule setting `color` on the same element as the chip and beating it (declares nothing now), and `color:inherit` as the attempted fix, which was worse because all three classes sit on ONE element and inherit takes the PARENT's colour.
holds: scripts/lib/stagekit.mjs, docs/CRAFT/HTML-FRAGMENTS.md

## 603. a layer that begins just before a sceneUnits boundary loses 99.8% of itself, silently
`sceneUnits: true` is what lets a `fade` cross-fade two beats as units, and the engine refuses the fade without it in clear words. What nothing said is that with the flag ON, a layer is assigned to a beat BY ITS START TIME (`formats/scene/scene.js`, `beatIndexOf`) and its wrapper only exists for that beat, so a layer beginning just before a boundary is truncated to the sliver between its start and that boundary. On `formats/scene/together-recreation.json` a layer ran 2.55s to 6.70s against a boundary at 2.65s: ten of its four thousand one hundred and fifty milliseconds survived. Four beats of a finished film rendered pure white, with no error, no warning and no clue, and it took a single-layer probe scene to find because every fragment previewed perfectly on its own. Now a lint warning naming the exact percentage that will survive.
TWO CORRECTIONS TO THE FIRST ATTEMPT, both found by running it against the library before shipping it. It was written as an ERROR and as "a straddling layer belongs to neither beat", and it failed 11 of 182 scenes. Neither half was right. The engine does not orphan the layer, it TRUNCATES it, which is a different fact with a different fix. And `acrossBeats: true` already exists as the documented opt-out ("the whole mechanism by which a continuous object can exist in a cut film"), which all 11 of those scenes already declared: they were correct authoring and the check was wrong. A new check that fails eleven working films to catch one bug of the author's own is not a check, it is a regression with a rationale. Corrected, it has zero false positives across 182 scenes.
holds: core/validate/validate.mjs, formats/scene/scene.js

## 604. the whole mechanism existed, and the paved road drew it as an orange box
`scripts/author/assemble.mjs` read `object_in`/`object_out` from the storyboard, built ONE layer with a motion track spanning every beat, resolved every edge through the engine's own coordinate math, and set `acrossBeats: true`, the flag whose own comment calls it "the whole mechanism by which a continuous object can exist in a cut film". Then it emitted that layer as `type: 'rect', fill: 'var(--accent)'`. The most structural decision a film can make travelled the entire pipeline correctly and came out a placeholder, so every film built this way was a slideshow no matter how well it was planned. The lesson is not about this rect. It is that a capability with no path to it is indistinguishable from a missing capability, and the engine had twenty-four layer types, keyframes, parenting, precomps and time remapping the whole time. Look for the placeholder at the END of a correct mechanism before concluding the mechanism is absent.
holds: scripts/author/assemble.mjs, scripts/gates/frame-check.mjs

## 605. a test that borrows a live film as its fixture fails the day someone approves that film
`scripts/live/test/stage-gate.test.mjs` proved three denials against `vawe-oblique`, whose plan passed and which nobody had signed. That is a state a real film LEAVES. The day the user approved it, all three cases broke. The test survived its own trap only because it had asserted its precondition out loud ("the fixture film is unapproved, or these cases prove nothing"), so it failed clearly instead of passing vacuously, which is the only reason anyone noticed. A fixture must be BUILT and removed by the test, never borrowed from the working library, whenever the property under test is one the library can change. Assert the precondition anyway: it is what turns a silent hole into a loud failure.
holds: scripts/live/test/stage-gate.test.mjs, scripts/gates/stage.test.mjs

## 606. a gate keyed on the broadest promise convicts the films that keep it a different way
A new `frame-as-surface` finding fired when a storyboard claimed continuity and every beat was still a full-bleed frame. It keyed on `object:` OR `threads:`, and it convicted `hinge`, which is authored correctly. Its `threads:` names a hand-drawn ink underline that draws on under one word per beat, plus a line of reasoning: a motif and an argument, both kept honestly INSIDE each beat's own fragment, neither needing a layer that travels. `threads:` answers "what holds the film across cuts", a film under 15s hard-errors without one, so nearly every storyboard carries one and most promise something no positioned layer could satisfy. `object:` is the narrow promise, a thing that TRAVELS, and only it can be contradicted by frames that give it nowhere to go. Swept all 40 films with a storyboard and a scene: 1 fires, and it is the film with the defect. Same shape as #603 and the second time in one session: a check written against the broad field, corrected by running it over the library BEFORE shipping it.
holds: scripts/gates/frame-check.mjs

## 607. a worktree fan-out inherits the last COMMIT, not the tree you are looking at
Three agents were sent into git worktrees to change files that were still uncommitted in the main checkout. A worktree branches from HEAD, so one agent's worktree did not contain `scripts/gates/frame-check.mjs` at all, and it spent a third of its run rebuilding a four-hundred-line file that already existed, from a copy it found in the parent's working tree. Another could not read the approved plan, because `.claude/` is gitignored. A third resolved `fragment:` against the film's own directory, a bug the parent caught only because it re-ran the check itself: every real storyboard writes that path relative to the repo root. COMMIT THE BASE FIRST, then fan out, and inline into the brief anything that lives in an ignored path. The parent's own verification is not ceremony: two of the three reports in that round were accurate and the third was confidently wrong in a way only a re-run could show.
holds: docs/CRAFT/SUBAGENT-BUDGET.md, docs/CRAFT/SUBAGENTS.md


## 608. a persistent object does not create motion, it only makes motion possible
The object path was built to fix films that read as slideshows, and the fix was proved by three throwaway films that differ only in structure. A, the old way: two beats, a fragment each, torn down and rebuilt at the cut. B: the same two beats sharing one fragment, so the DOM survives, one layer with `acrossBeats`. C: B plus a keyed object chain across the cut. `make motion-floor` on all three, same theme, same copy, same 6 seconds: A is 9 of 10 windows dead, B is 9 of 10 dead, and C is 10 of 10 dead with a LOWER peak than either. The structural change is real and the before/after is unambiguous (the old assembler drew the object as `type: rect, fill: var(--accent)` on the identical storyboard) but it moved the motion floor by nothing at all. What the floor measures is the RATE of localised change, and all three films key one reveal per three-second beat, so each holds still for two and a half seconds no matter who owns the DOM. C measured worst on that film, and the reason I gave for it was wrong. I wrote that its slow 900x420 to 760x360 drift was "spread and gentle, the definition of the ambient motion the gate refuses to count". It is not: a size-only key on a solid object changes a thin ring at its edge, which pairProfile's share metric reads as LOCAL, the opposite classification. Rebuilt to the same description by scripts/dev/motion-lab.mjs, the C variant measures BETTER than B, not worse, and a variant with real translation better still. The original films were thrown away, so the two runs cannot be reconciled and the C number is fixture-dependent. What survives is the half that reproduces and is load-bearing: A and B measure the same, so structure alone buys nothing. Two different problems were being treated as one: the PATH (can a thing survive a cut and be drawn as itself) and the DENSITY (how many overlapping keyed events per second). This work fixed the first. The second is the motion decider's, and no amount of the first substitutes for it.
holds: scripts/author/assemble.mjs, scripts/gates/motion-floor.mjs

## 609. a prop set and never read fails the render, and a comment naming the prop is not proof it is read
The new object layer carried `radius: chain[0].in.radius ?? 4`, a default inherited from the placeholder rect. As an `html` layer that refused to render at all: `core/registry/prop-audit.js` stops a build where a documented prop is accepted and then dropped (#428), which is the engine being right. The check that missed it was mine. `grep radius core/layers/html.js` returned a line, so it was called read; the line was a COMMENT explaining that these box props are shared, and the builder consumes radius only through `chipBox`, which paints nothing without a surface prop beside it. Reading a match instead of the code around it is how a two-second check produces a confident wrong answer. The rect keeps its historic default so every existing film assembles byte-identically; a non-rect object now carries a radius only when the contract names one.
holds: scripts/author/assemble.mjs, core/registry/prop-audit.js


## 610. the film stops because its moves END, not because there are too few of them
Three sweeps, one variable each, every variant assembled and rendered identically and measured by the same gate. STRUCTURE: two films differing only in whether a layer survived the cut measured the same. DENSITY: one to eight moves per beat cut dead windows from 86% to 57% and never moved the median off 0.02, against a reference median of 0.66. OVERLAP: four moves fired together measured 80% dead and a median of 0.000, the same four spread sequentially 60% and 0.106, which is the opposite of the advice the gate itself was printing. MAGNITUDE: travel distance and duration moved nothing either, every `parts` variant sitting at 0.01 to 0.03 whether the move was 24px or 40px, 0.22s or 1.2s.
The one axis that moved the number was SUSTAINED motion: a keyed layer track that is never finished, always mid-travel, took the median from 0.02 to between 0.17 and 1.61 and the peak to 4.13 against a target of 4.71. Everything else in the vocabulary is a one-shot entrance, and a one-shot entrance lands. Once it has landed the frame is still again, so stacking more of them, spacing them out, or making each travel further changes when the stillness happens and never whether it happens. The film does not stop because too little was asked for. It stops because everything that was asked for finishes.
And the storyboard cannot ask for the thing that works: `motion:` compiles only to `parts[]` on the html layer, and a keyed x/y/scale track on the layer exists only in hand-written JSON and in the one `object_in`/`object_out` chain.
holds: scripts/gates/motion-floor.mjs, scripts/author/assemble.mjs, scripts/lib/contract.mjs

## 611. the motion gate scores a whole frame sliding off its stage higher than real content arriving
`pairProfile` separates LOCAL motion (change concentrated in under 8% of the frame, meaning content arriving) from GLOBAL (spread, meaning ambience), and only local counts, so that idle and breathing cannot satisfy the floor. That much works. What it cannot see is a large UNIFORM region moving rigidly: the interior of a sliding block is the same colour before and after, so only its edges change, the share stays under the threshold, and it is counted as content. Measured directly: a uniform block shifted two cells reads share 0.021 amount 4.99, while a genuine small reveal reads share 0.014 amount 2.26. The glitch scores DOUBLE the real thing.
Found by looking, not by measuring. The highest scoring variant of the magnitude sweep reached a median of 1.61 and it looked like a rendering fault: the entire scene, background and text together, drifting inside the canvas and exposing the edge. The number said it was the best film of the sweep. This is why the plan's rule is that every phase ends with the mp4 looked at and not only the table, and it is why the instrument gets fixed BEFORE it is promoted to a blocking gate. A gate with this hole, made binding, would teach every author to slide the frame.
holds: scripts/gates/motion-floor.mjs

## 612. going back one stage to fix a fragment silently deleted every directed camera move
`make assemble` is stage 5 of eight and `make direct` is stage 6. The director writes a resolved `camera` track into the film; assemble's `PRESERVED_FILM_FIELDS` listed `cameraMove` and not `camera`, so re-running assemble to pick up an edited fragment dropped the whole camera track without a word. The stages are documented as an order, and the order is real, but nothing said that stepping back through it destroys the work of the stage in front. Found while checking byte-identity after an unrelated merge: the film lost a five-key camera array and the diff was the only thing that said so. assemble generates no camera of its own, its own header says it is kept thin on purpose with no camera, so it never had a claim on the field. The same file already reports every preserved LAYER by name; film-level fields now go through the same report, so a preserved field is visible rather than assumed. Re-assembling a film is now idempotent, which it was not.
holds: scripts/author/assemble.mjs, scripts/author/motion-director.mjs

## 613. the motion meter had two opposite bugs, and the fix for the first caused the second
The gate separates LOCAL motion (content arriving) from GLOBAL (ambience) by how concentrated the change is, and counts only local, so that idle cannot satisfy the floor. FIRST BUG: a large uniform region moving rigidly changes only at its edges, so it scored as content, and a film whose whole frame slid off the canvas measured as the best in its sweep. FIRST FIX: look for a whole-frame translation that explains the changed pixels, and call it global when one does. SECOND BUG, caused by that fix: a card sliding across a static ground is ALSO a rigid translation explained by a shift, so it was thrown away too, and a card sliding in is the reference film's core vocabulary. Measured: a card sliding on a plain ground read share 1.000, identical to the whole frame sliding.
The discriminator is not WHETHER a shift explains the change, it is HOW MUCH OF THE FRAME MOVED. Both a card and the whole frame change only at their edges, so the changed-pixel count cannot separate them; the bounding box of the change can. A card's swept box is 0.11 of the frame, a full-bleed slide's is 0.95. Rigid motion is now global only when the moving box covers at least half the frame.
The self-test fixture had to change with it, and that is worth recording rather than quietly editing: it used a 60x34 block, 41% of the frame, as the proxy for "camera". Once a bounded object had to keep counting, a 41% block was on the wrong side of the line, because a panel that size is a design element and not a camera move. The fixture is now the full-bleed case that actually failed in a real film. The proxy was wrong, not the threshold, and the honest way to say that is to say which one moved and why.
holds: scripts/gates/motion-floor.mjs

## 614. sustained motion and bounded layers are one fix, and neither half works alone
Three films, identical but for two flags, measured with the corrected meter. Full-bleed layer and no sustained move: 18 of 21 windows dead, median 0.01, peak 0.66. Full-bleed layer WITH `move: pan:cinematic`: 17 of 21 dead, median 0.01, peak 0.99, which is nothing, because moving a layer that IS the whole frame moves the whole picture and that is the camera, not content. The same move on a layer bounded to a 1100x600 box inside the frame: 12 of 21 dead, median 0.04, peak 2.50, against a reference of 5 of 37 dead, median 0.55, peak 3.49.
So the two pieces built separately are one mechanism. `move:` gives a beat motion that never lands, and `fragment: @ <placement>` gives it something to move that is not the entire frame. A film where every layer is full-bleed has no motion available to it except moving the frame, which is why "every beat is a whole separate page" and "the film reads as a slideshow" were never two problems. The first frame of the full-bleed `move:` test is empty: the pan slid the content clean off the canvas.
holds: scripts/author/assemble.mjs, scripts/gates/motion-floor.mjs, docs/CRAFT/STORYBOARD-TEMPLATE.md

<!-- carried over from the archived file; doc-refs.mjs's own syntax for -->
<!-- "this reference names a thing in order to record that the thing is gone" -->
`<!-- doc-refs-allow: <ref> · <reason> -->` when it names a thing in order to say the thing is gone.
<!-- doc-refs-allow: make schema-drift · #266 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: formats/scene/showcase-flight.json · superseded by showcase-flight-globe and deleted; entries that cite it are records of what it taught -->
<!-- doc-refs-allow: formats/scene/showcase-flight-computed.json · the flat-chart iteration, superseded and deleted -->
<!-- doc-refs-allow: formats/scene/_flight-chart.html · lived only in the deleted flat-chart film -->
<!-- doc-refs-allow: make roadmap-drift · #266 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: make sfx · #266 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: make brandkit · #266 quotes a target removed with the templates -->
<!-- doc-refs-allow: core/shaders.js · #266 quotes a path that moved two refactors ago -->
<!-- doc-refs-allow: core/layers/shader.js · #266 quotes a path that moved into core/surfaces/ -->
<!-- doc-refs-allow: core/layers/paint.js · #266 quotes a path that moved into core/surfaces/ -->
<!-- doc-refs-allow: scripts/gates/copy.mjs · quoted from a film pass; the copy gate runs inside author-check, not as its own file -->
<!-- doc-refs-allow: make visuals · #NNN records a gate that was later culled -->
<!-- doc-refs-allow: scripts/gates/visual-vocabulary.mjs · the entry records this gate's own deletion -->
<!-- doc-refs-allow: make flicker-check · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/predict.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/rules-audit.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: formats/scene/tokenjam-launch.json · the entry records this scene's deletion -->
<!-- doc-refs-allow: make slop · retired in #340; the entries that cite it are records of what it did -->
<!-- doc-refs-allow: scripts/gates/slop.mjs · the script #340 records the retirement of -->
