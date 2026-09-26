---
when: "a check blocks or flags a film and you need to know whether it should adapt (clamp, tolerate, reclassify, skip) or stay a hard refusal"
answers: "which safeguards adapt to the film and how · the shared registry harness/lib/safeguards.mjs and its adaptation line · which checks stay hard and why · how adaptation relates to authoring.allow waivers"
group: process
---

# SAFEGUARDS.md: which checks adapt, and which stay hard

This is an INDEX, not a rulebook. Each guard's intent still lives next to the code it measures
(the file:line and doc columns below); this page only says what the harness does with the verdict.

**The rule** (owner: "the safeguards we have normally dont apply to every film. safeguards should be
documented but the harness should understand things and tweak"): a guard keeps its measurement and its
documented intent. Only the verdict changes. Before a finding fails a film, it asks whether the film's
own context (a storyboard beat, a declared device, an element's own computed facts) already explains
it, through `harness/lib/safeguards.mjs`'s registry: `clamp` a value to what's allowed, `tolerate` a
finding under a stated floor, `reclassify` it as something the film did on purpose, or `skip` it
outright. Every adaptation prints one line: `adapted <code>: <what changed> (<why>)`.

Two mechanisms stay separate on purpose:
- **Adaptation** (this page) fires automatically, from facts the harness can already read off the
  render. Nobody asks for it; it either applies or it doesn't.
- **Waivers** (`authoring.allow` + `authoring._why`, `quality/gates/author-check.mjs:225-251`) are for
  breaks the harness cannot infer: a deliberate choice only the author can justify, spent as one written
  sentence per waiver.

One waiver field covers two different cases, never two mechanisms: a rule broken for cause, and a
chosen absence a static rule cannot otherwise see (no continuous object, a still frame, no transition,
an ending with nothing after it). Neither is an apology; `quality/gates/audio-check.mjs` already draws
the same split for sound, where chosen quiet and an audio block nobody considered are not the same
finding. The only door out of a fired rule is a reason written in the scene, whether that reason is "I
broke this on purpose" or "I chose this absence on purpose." Measured across the library, half of real
waiver use is the second case, an author declaring "I chose this", not "I broke this":
`no-continuous-object`, `dead-air`, `plain-slideshow`, `static-bg`, `no-transition`, `ends-on-nothing`
are the codes this shows up on most.

Hard refusals are the third tier and stay hard: determinism (a non-finite render target, `renderFrame`
purity checked by `quality/gates/probe-purity.mjs`) and a schema failure the engine itself would refuse
at boot (`core/validate/validate.mjs`). Nothing adapts those, because there is no film-context reading
that makes them correct.

## AUTHOR-SIDE GATES ADVISE, NEVER BLOCK

Owner decision: HyperFrames and Remotion ship with no authoring quality gates at all; a gate on the
author's path is DX friction unless it stops something that literally cannot render. So every finding
on that path (`make dev-tool X=author-check`, `make check D=`, `make ship`, `make stage`/`make next`, the
`stage-gate`/`craft-live` hooks) is advisory by default: it prints in full and exits 0. Only two things
still stop the run: **validate** (schema, vocabulary, em-dashes) and **determinism** (`renderFrame`
purity). Everything this page calls "stays hard" above those two is a construction bug the engine would
have refused anyway, never a craft opinion.

`STRICT=1` is the one opt-in that restores the old blocking behaviour for someone who wants the teeth
back: `quality/gates/author-check.mjs`'s structural steps (beats, storyboard, motion, seams, the
HARD_CODES escalation, inspect/plan against an intent sidecar), and the `stage-gate.mjs` /
`craft-live.mjs` live hooks all read it. `TASTE=1` is unchanged: it still gives teeth to the house-style
steps that are left (critique, direct, designspec, copy, read, sound). The look-or-move TASTE gates that
used to sit behind this flag (direction-floor, motion-floor, eye-trace, ground-arc, choreo,
backdrop-turn, pace-check, jolt-check) were DELETED, not demoted: see "OBJECTIVE vs TASTE" below. The
engine-contributor gates (`.githooks/pre-push`, `.github/workflows/gates.yml`) are untouched by either
flag: they protect the engine, not one film, and stay hard.

## The guards

| code | file:line | intent | owning doc | adaptive behaviour |
|---|---|---|---|---|
| diveIn headroom | `core/camera-moves/dive-in.js:26-38` | a dive-in target must stay inside the frame at the requested headroom | `engine-doctrine/CRAFT/DIRECTION.md` | clamp `to` to the safe maximum and report, unless the beat declares a crop intent |
| arrival-ease | `core/timeline/sequence.js` `adaptArrivalEase` | a move whose ease ends at full speed (`easeIn*`, `linear`, `rush`) but lands in a hold never decelerates, a hard stop with no braking | `engine-doctrine/MOTION-CRAFT.md` | adapt the ease to its decelerating twin (`easeInCubic` -> `easeInOutCubic`, `linear` -> `easeOutCubic`, `rush` -> `brake`) and print `adapted arrival-ease: ...`; an exit (a move to opacity 0) and an authored `easeIn`/`easeOut` handle are left alone |
| overflow | `quality/audit.mjs:647-660` | text clipped past its box (scrollW/H > clientW/H) is unreadable content | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: under 1% of the box on either axis tolerates as rounding, reported not failed |
| clipped-text | `quality/audit.mjs:754-776` | a text mask shorter/narrower than its glyphs cuts descenders or edges | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: a node with `text-overflow:ellipsis` + `overflow:hidden` reclassifies as designed truncation |
| small-text (28px text floor) | `harness/lib/stagekit.mjs:92`, read by `harness/author/screen.mjs` readiness() | a kit must never write a text role below the smallest size a moving 1920-wide frame can be read at | `engine-doctrine/CRAFT/TYPOGRAPHY.md` | **built**: skip for text inside an `hs-img-wrap` capture or a `data-ink="off"` decorative wrapper, where the floor is the captured surface's own type, not the kit's |
| ends-on-nothing | `quality/gates/beat-check.mjs:186-197` | the final tail of the film must hold a content layer, not a bare backdrop | `engine-doctrine/CRAFT/DIRECTION.md` | **built**: a closing layer whose id/class/role names it a brand card or mark reclassifies the tail as covered |
| plan-overruns-render | `quality/gates/plan-vs-render.mjs:236-247` | the plan's beat spans must describe the film that actually rendered | `engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md` | **built**: on top of the existing 0.5s OVERRUN floor, a drift of one frame at the scene's own fps tolerates as a warning |
| bindDials row contract | `core/registry/knobs.js:181-224` | every advertised dial must be read by its preset, and every dial the preset reads must have a row | `engine-doctrine/CRAFT/ENGINE-CHANGES.md` | **built**: contract stays strict, but a mismatch is collected into `DIAL_CONTRACT_VIOLATIONS` instead of thrown at module import; `tests/registry/lib-test.registry.test.mjs`'s "dial contract" assertions enforce it by name, so one broken preset can no longer crash every core import |
| archetype-repeat | `quality/gates/storyboard-check.mjs:43-57` | two beats running with the same composition archetype back to back read as one flat cut | `engine-doctrine/CRAFT/LAYOUT.md` | **built**: skips when the storyboard's own `not:` line names the repeat on purpose |
| seam-split | `quality/gates/seams.mjs:246-253` | a hard background swap disguised inside a soft dissolve, measured in the margin strip outside every authored layer box | `engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-split-seam` | **built**: reclassifies when a real content layer's own authored box occupies that margin strip, the doc's own named blind spot |
| overscan | `core/tracks/motion.js` (composition), `core/tracks/overscan.js` (math) | a full-bleed plane must not reveal its own edge (and the backdrop behind it) while it tilts or stands off the picture plane under the camera rig | this doc (mechanism); `core/tracks/overscan.js` header (math) | **built**: every frame, a plane whose box already covers the stage at rest is scaled up by the minimum amount real projection math says its current tilt/depth needs to still cover the viewport; reports the peak with `adapted overscan: <id> scaled up to <k>x at <t>s`; opt out per layer with `overscan: false` |
| group-3d-opacity | `films/scene/scene.js` ("GROUP 3D" build-time block, `applyGroup3DOpacityAdapt`) | a group holding a descendant with its own 3D motion (rotX/rotY/z) needs `preserve-3d`, but opacity and filter are grouping properties in CSS and flatten that context right back | this doc (mechanism); `films/scene/scene.js` "THE CAMERA RIG" header | **built**: every frame, a 3D-holding group's own opacity/filter is moved onto its direct children, multiplying into whatever they already carry, and the group is reset to opaque/unfiltered; reports the first frame it fires with `adapted group-3d-opacity: <id> opacity moved to children (opacity flattens 3D in CSS)` |

## edge-reveal: what overscan does not catch

Overscan (the row above) only fires when a layer keys 3D (`has3D`: a `rotX`/`rotY`/`z` track) and the
frame already covers the stage at rest. It never runs for a flat camera `s` below 1, a layer's own
`scale` dropping below 1 with no 3D key, or a corner radius, none of which are `has3D` and none of
which the projection math above is asked about. edge-check reports a full-bleed layer that stops
covering the frame while it is on screen, by sampling the rendered page (10fps of film time,
`document.elementsFromPoint` on the four borders) rather than re-deriving the projection. Report only,
never blocks; a deliberate reveal (a floating panel over a full ground, on purpose) waives the same way
as any other finding: `{"authoring":{"allow":["edge-reveal"]}}`.

## Stays hard, always

- `renderFrame` purity (a scene function may not have side effects across frames).
- `beat-check.mjs` empty-beat (a declared beat with nothing in it).
- storyboard timeline over/underrun (the plan's own spans don't add up).
- `dive-in.js` non-finite `tx`/`ty` targets (a camera move that resolves to NaN has no safe value to clamp to).

These are refused rather than adapted because no film-context reading changes the answer: each one is
either a determinism bug, the one signature the harness must never forge, or a construction error the
scene itself states incorrectly.

## OBJECTIVE vs TASTE: every check under `quality/gates/` and `quality/audit.mjs`

Owner decision: an OBJECTIVE check measures something true regardless of anyone's opinion (schema
validity, determinism, text clipped past its box, a blank frame at a seam, whether a caption gives enough
time to read it, a missing asset, a colour or font outside the theme, a prop nothing reads, a doc that no
longer matches the code, repo hygiene for an engine contributor). A TASTE check grades HOW a film looks or
moves: an opinion about motion, direction, eye-trace, ground behaviour, choreography, restraint, or
variety, fitted to this library's own habits rather than to a correctness fact. **TASTE checks were
deleted, not demoted to report-only**, because a script grading opinion still teaches an author to satisfy
the metric instead of the eye; `make judge` and a human/agent eye carry that judgement now, and each
deleted gate's real knowledge moved into the `engine-doctrine/CRAFT` doc (or the judge rubric) that owns
its topic, cited below.

| gate | class | why | knowledge now lives in |
|---|---|---|---|
| `direction-floor.mjs` | TASTE, **DELETED** | graded whether a film is "directed": plain-slideshow, low-vocab, sparse-beats, feature-poverty, template-sameness, all fitted thresholds about motion range, not correctness | `engine-doctrine/CRAFT/DIRECTION.md` ("The ambition floor") |
| `motion-floor.mjs` | TASTE, **DELETED** | graded whether local content motion ever stops (dead windows), a floor tuned to this library's own reference films | `engine-doctrine/MOTION-CRAFT.md` ("Does the film ever stop") |
| `eye-trace.mjs` | TASTE, **DELETED** | graded where the eye lands across a cut against a corpus-derived jump threshold; explicitly REPORT-only even when it ran, because Murch ranks it the 7% item | `engine-doctrine/CRAFT/EYE-TRACE.md` |
| `ground-arc.mjs` | TASTE, **DELETED** | graded whether a ground flip reads as a planned beat change or a flash; the opinion half | judge rubric's "Ground continuity" dimension (`quality/gates/rubric.mjs`); the pure measurement moved to `harness/lib/ground-flip.mjs` for the OBJECTIVE `plan-vs-render.mjs` check that still needs it |
| `choreo.mjs` | TASTE, **DELETED** | graded per-beat choreography quality: exit/entrance emphasis, handoffs, eye-plan vs storyboard | `engine-doctrine/CRAFT/KEYED-MOTION.md` ("exits faster than entrances" addendum) |
| `backdrop-turn.mjs` | TASTE, **DELETED** | graded whether the backdrop changes tone across the film, a look opinion (was a hard BLOCK before deletion) | `engine-doctrine/RULES/world-turns.md` |
| `pace-check.mjs` | TASTE, **DELETED** | graded events-per-second against the library's own median, a movement-feel opinion | doctrine folded into `engine-doctrine/CRAFT/DIRECTION.md`'s pacing discussion |
| `jolt-check.mjs` | TASTE, **DELETED** | wrapped speed.mjs's velocity spikes + motion-floor's dead windows into a blocking-eligible finding: a smoothness opinion | `engine-doctrine/MOTION-CRAFT.md` ("Does the film ever stop"); the underlying numbers stay live in `quality/gates/speed.mjs`, kept as a readout |
| `similarity.mjs` | TASTE-flavoured, KEPT (infra) | self-describes as turning "taste judgment into a failing check" over motion vocabulary/structure/layout sameness, but its `fingerprint`/`similarity`/`verdict` exports are load-bearing library code for `make dev-tool X=ledger`'s cross-film diversity accounting, not a per-film gate (`harness/dev/gate-census.mjs`'s own OTHER_TOOLS list) | n/a, still the live mechanism |
| `copy-check.mjs` | borderline, KEPT | grades on-screen WORDS (jargon, restated headlines, weak hooks), a craft opinion but about voice, not "how a film looks or moves"; out of this pass's TASTE definition on purpose | n/a |
| `critique.mjs` | OBJECTIVE-leaning, KEPT | own comment: "not taste-complete... makes the recurring mistakes un-shippable"; catches named, previously-shipped defects (placeholder words, illegible transitions), not a fitted look/move opinion | n/a |
| `motion-audit.mjs` | OBJECTIVE, KEPT | asserts motion INVARIANTS (final frame not faded, a reveal that doesn't dip, a typewriter that finishes, a counter that doesn't reverse both ways, a degenerate/invisible element): correctness bugs, not an opinion about style |
| `motion-sound-check.mjs` | OBJECTIVE, KEPT | does a sound land where the picture moves in the rendered mp4: a sync defect | n/a |
| `motion-split.mjs` | OBJECTIVE, KEPT | a readout (how much motion is ground vs film), no verdict of its own | n/a |
| `asset-check.mjs`, `audio-check.mjs`, `audio-render-check.mjs`, `sfx-audit.mjs` | OBJECTIVE | missing assets / declared-vs-rendered sound: correctness, not opinion |
| `beat-check.mjs`, `sweep-static.mjs`, `covered-move.mjs`, `paints-nothing.mjs`, `edge-check.mjs`, `edge-reveal.mjs`, `seams.mjs` | OBJECTIVE | blank/dead frames, a move hidden before it plays, a layer that paints nothing, an edge that stops covering the frame, a checked defect at a join: all named, previously-shipped defects |
| `read-check.mjs`, `designspec-check.mjs`, `font-audit.mjs`, `glyphs-audit.mjs` | OBJECTIVE | caption reading speed, off-theme colour/font, a typeface or 3D glyph that drifted from its source |
| `layer-props.mjs`, `prop-probe.mjs`, `unused.mjs`, `inert-check.mjs`, `dead-branch.mjs`, `silent-fallback.mjs` | OBJECTIVE | dead props, a mechanism wired to nothing, a branch that can't be taken, a silent default standing in for a real vocabulary |
| `audit-scenes.mjs`, `block-schema.mjs`, `block-scale.mjs`, `blocks-audit.mjs`, `schema-drift.mjs`, `conformance.mjs`, `canvas-purity.mjs`, `probe-purity.mjs`, `sim-audit.mjs`, `snap-blocks.mjs`, `snap-scenes.mjs`, `snap-signature.mjs`, `scene-snap.mjs` (OTHER_TOOLS), `render-verify.mjs` | OBJECTIVE | schema validity and determinism |
| `doc-map.mjs`, `doc-refs.mjs`, `docs-drift.mjs`, `craft-coverage.mjs`, `generated-check.mjs`, `mistakes-dupes.mjs`, `rule-length.mjs`, `rung.mjs`, `threshold-provenance.mjs`, `word-action.mjs`, `arsenal-check.mjs`, `discovery.mjs`, `skill-check.mjs`, `skill-reach.mjs`, `feature-audit.mjs`, `coverage.mjs`, `output-contract.mjs`, `consequence-lint.mjs`, `hook-report-check.mjs`, `knobs-audit.mjs`, `transitions-catalog.mjs`, `waiver-drift.mjs`, `legacy-fold.mjs`, `legacy-unfold.mjs`, `gate-mutation.mjs`, `gate-classification.mjs` | OBJECTIVE | doc/code drift and repo hygiene for an engine contributor |
| `code-quality.mjs`, `lint-test.mjs`, `contrast-regression.mjs`, `measure-regression.mjs`, `site-build-check.mjs`, `site-counts.mjs`, `seo-surface.mjs`, `docker-context.mjs`, `docker-context-check.mjs`, `e2e-check.mjs`, `review.mjs` | OBJECTIVE | codebase/repo hygiene, regression pins, and site build correctness |
| `preflight.mjs`, `craft-checklist.mjs`, `storyboard-check.mjs`, `frame-check.mjs`, `plan-vs-render.mjs`, `inspect.mjs`, `judge.mjs`, `draft-check.mjs`, `study-check.mjs`, `study-verify.mjs`, `content-check.mjs`, `compare.mjs`, `ledger.mjs`, `stage.mjs` (n/a, not in this dir), `next.mjs` | OBJECTIVE / PROCESS | did a required step happen, does the plan hold together, does the render match the plan; none of these grade whether the film LOOKS or MOVES well |

`quality/audit.mjs` (the page audit: overflow, clipped-text, contrast, layout) is OBJECTIVE throughout:
every finding it raises is a measured geometry or WCAG-contrast fact, never a style opinion.
