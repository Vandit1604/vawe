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

Hard refusals are the third tier and stay hard: determinism (a non-finite render target), the owner's
own approval signature, and a construction bug (an empty beat, a plan that doesn't match the render).
Nothing adapts those, because there is no film-context reading that makes them correct.

## The guards

| code | file:line | intent | owning doc | adaptive behaviour |
|---|---|---|---|---|
| diveIn headroom | `core/camera-moves/dive-in.js:26-38` | a dive-in target must stay inside the frame at the requested headroom | `docs/CRAFT/DIRECTION.md` | clamp `to` to the safe maximum and report, unless the beat declares a crop intent |
| overflow | `quality/audit.mjs:647-660` | text clipped past its box (scrollW/H > clientW/H) is unreadable content | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: under 1% of the box on either axis tolerates as rounding, reported not failed |
| clipped-text | `quality/audit.mjs:754-776` | a text mask shorter/narrower than its glyphs cuts descenders or edges | this doc (mechanism); `quality/audit.mjs` (measurement) | **built**: a node with `text-overflow:ellipsis` + `overflow:hidden` reclassifies as designed truncation |
| dead-window | `quality/gates/motion-floor.mjs:45-51,471-484` | a sampled window with no content motion means a reveal finished and nothing took over | `docs/MOTION-CRAFT.md` | when the beat declares typing or a letter/word stagger, measure text arrival (units revealed) instead of pixel share, and report instead of fail |
| small-text (28px text floor) | `harness/lib/stagekit.mjs:92`, read by `harness/author/screen.mjs` readiness() | a kit must never write a text role below the smallest size a moving 1920-wide frame can be read at | `docs/CRAFT/TYPOGRAPHY.md` | **built**: skip for text inside an `hs-img-wrap` capture or a `data-ink="off"` decorative wrapper, where the floor is the captured surface's own type, not the kit's |
| peak-not-largest | `quality/gates/frame-check.mjs:179-198` | the beat declared the peak must hold the largest object, or the "peak" promise is broken | `docs/CRAFT/DIRECTION.md` | **built**: downgrade to a warning when the peak beat's own `threads:`/`object:` field names a non-size payoff |
| plain-slideshow / feature-poverty | `quality/gates/direction-floor.mjs:307-318,373` | a film this long needs a minimum count of beats/effects/expressive families, or it reads as an unforced default | `docs/CRAFT/DIRECTION.md` | **built**: `plain-slideshow` skips when the storyboard's `not:` line names it; `feature-poverty` skips below a 12s short-film floor |
| sparse-beats | `quality/gates/direction-floor.mjs:357` | a film this long needs a boundary roughly every 3.5s, or it reads as a slideshow by length | `docs/CRAFT/DIRECTION.md` | **built**: report-only, as its own comment always said; it was still wired through `fail()` and is now `warn()` |
| ends-on-nothing | `quality/gates/beat-check.mjs:186-197` | the final tail of the film must hold a content layer, not a bare backdrop | `docs/CRAFT/DIRECTION.md` | **built**: a closing layer whose id/class/role names it a brand card or mark reclassifies the tail as covered |
| plan-overruns-render | `quality/gates/plan-vs-render.mjs:236-247` | the plan's beat spans must describe the film that actually rendered | `docs/CRAFT/AUTHORING-WALKTHROUGH.md` | **built**: on top of the existing 0.5s OVERRUN floor, a drift of one frame at the scene's own fps tolerates as a warning |
| bindDials row contract | `core/registry/knobs.js:181-224` | every advertised dial must be read by its preset, and every dial the preset reads must have a row | `docs/CRAFT/ENGINE-CHANGES.md` | **built**: contract stays strict, but a mismatch is collected into `DIAL_CONTRACT_VIOLATIONS` instead of thrown at module import; `quality/gates/lib-test.mjs`'s "dial contract" assertions enforce it by name, so one broken preset can no longer crash every core import |

## Stays hard, always

- `renderFrame` purity (a scene function may not have side effects across frames).
- `stage-gate.mjs` refusing `approved:` written by anything but the user's own signature.
- `beat-check.mjs` empty-beat (a declared beat with nothing in it).
- storyboard timeline over/underrun (the plan's own spans don't add up).
- `dive-in.js` non-finite `tx`/`ty` targets (a camera move that resolves to NaN has no safe value to clamp to).

These are refused rather than adapted because no film-context reading changes the answer: each one is
either a determinism bug, the one signature the harness must never forge, or a construction error the
scene itself states incorrectly.
