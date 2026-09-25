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

Hard refusals are the third tier and stay hard: determinism (a non-finite render target), the owner's
own approval signature, and a construction bug (an empty beat, a plan that doesn't match the render).
Nothing adapts those, because there is no film-context reading that makes them correct.

## The guards

| code | file:line | intent | owning doc | adaptive behaviour |
|---|---|---|---|---|
| diveIn headroom | `core/camera-moves/dive-in.js:26-38` | a dive-in target must stay inside the frame at the requested headroom | `engine-doctrine/CRAFT/DIRECTION.md` | clamp `to` to the safe maximum and report, unless the beat declares a crop intent |
| arrival-ease | `core/timeline/sequence.js` `adaptArrivalEase` | a move whose ease ends at full speed (`easeIn*`, `linear`, `rush`) but lands in a hold never decelerates, a hard stop with no braking | `engine-doctrine/MOTION-CRAFT.md` | adapt the ease to its decelerating twin (`easeInCubic` -> `easeInOutCubic`, `linear` -> `easeOutCubic`, `rush` -> `brake`) and print `adapted arrival-ease: ...`; an exit (a move to opacity 0) and an authored `easeIn`/`easeOut` handle are left alone |
| overflow | `quality/audit.mjs:647-660` | text clipped past its box (scrollW/H > clientW/H) is unreadable content | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: under 1% of the box on either axis tolerates as rounding, reported not failed |
| clipped-text | `quality/audit.mjs:754-776` | a text mask shorter/narrower than its glyphs cuts descenders or edges | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: a node with `text-overflow:ellipsis` + `overflow:hidden` reclassifies as designed truncation |
| dead-window | `quality/gates/motion-floor.mjs:45-51,471-484` | a sampled window with no content motion means a reveal finished and nothing took over | `engine-doctrine/MOTION-CRAFT.md` | when the beat declares typing or a letter/word stagger, measure text arrival (units revealed) instead of pixel share, and report instead of fail |
| small-text (28px text floor) | `harness/lib/stagekit.mjs:92`, read by `harness/author/screen.mjs` readiness() | a kit must never write a text role below the smallest size a moving 1920-wide frame can be read at | `engine-doctrine/CRAFT/TYPOGRAPHY.md` | **built**: skip for text inside an `hs-img-wrap` capture or a `data-ink="off"` decorative wrapper, where the floor is the captured surface's own type, not the kit's |
| plain-slideshow / feature-poverty | `quality/gates/direction-floor.mjs:307-318,373` | a film this long needs a minimum count of beats/effects/expressive families, or it reads as an unforced default | `engine-doctrine/CRAFT/DIRECTION.md` | **built**: `plain-slideshow` skips when the storyboard's `not:` line names it; `feature-poverty` skips below a 12s short-film floor |
| sparse-beats | `quality/gates/direction-floor.mjs:357` | a film this long needs a boundary roughly every 3.5s, or it reads as a slideshow by length | `engine-doctrine/CRAFT/DIRECTION.md` | **built**: report-only, as its own comment always said; it was still wired through `fail()` and is now `warn()` |
| ends-on-nothing | `quality/gates/beat-check.mjs:186-197` | the final tail of the film must hold a content layer, not a bare backdrop | `engine-doctrine/CRAFT/DIRECTION.md` | **built**: a closing layer whose id/class/role names it a brand card or mark reclassifies the tail as covered |
| plan-overruns-render | `quality/gates/plan-vs-render.mjs:236-247` | the plan's beat spans must describe the film that actually rendered | `engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md` | **built**: on top of the existing 0.5s OVERRUN floor, a drift of one frame at the scene's own fps tolerates as a warning |
| bindDials row contract | `core/registry/knobs.js:181-224` | every advertised dial must be read by its preset, and every dial the preset reads must have a row | `engine-doctrine/CRAFT/ENGINE-CHANGES.md` | **built**: contract stays strict, but a mismatch is collected into `DIAL_CONTRACT_VIOLATIONS` instead of thrown at module import; `tests/registry/lib-test.registry.test.mjs`'s "dial contract" assertions enforce it by name, so one broken preset can no longer crash every core import |
| archetype-repeat | `quality/gates/storyboard-check.mjs:43-57` | two beats running with the same composition archetype back to back read as one flat cut | `engine-doctrine/CRAFT/LAYOUT.md` | **built**: skips when the storyboard's own `not:` line names the repeat on purpose |
| seam-split | `quality/gates/seam-forensics.mjs:246-253` | a hard background swap disguised inside a soft dissolve, measured in the margin strip outside every authored layer box | `engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-split-seam` | **built**: reclassifies when a real content layer's own authored box occupies that margin strip, the doc's own named blind spot |
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
- `stage-gate.mjs` refusing `approved:` written by anything but the user's own signature.
- `beat-check.mjs` empty-beat (a declared beat with nothing in it).
- storyboard timeline over/underrun (the plan's own spans don't add up).
- `dive-in.js` non-finite `tx`/`ty` targets (a camera move that resolves to NaN has no safe value to clamp to).

These are refused rather than adapted because no film-context reading changes the answer: each one is
either a determinism bug, the one signature the harness must never forge, or a construction error the
scene itself states incorrectly.
