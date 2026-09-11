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
| 28px text floor | `harness/lib/stagekit.mjs:90-92` | a kit must never write a text role below the smallest size a moving 1920-wide frame can be read at | `docs/CRAFT/TYPOGRAPHY.md` | skip for text inside a screenshot or mock-UI wrapper, where the floor is the captured surface's own type, not the kit's |
| peak-not-largest | `quality/gates/frame-check.mjs:179-192` | the beat declared the peak must hold the largest object, or the "peak" promise is broken | `docs/CRAFT/DIRECTION.md` | downgrade to a warning when the plan names a non-size payoff for that beat |
| plain-slideshow / feature-poverty / sparse-beats | `quality/gates/direction-floor.mjs:296,337,353` | a film this long needs a minimum count of beats/effects/expressive families, or it reads as an unforced default | `docs/CRAFT/DIRECTION.md` | read the plan's NOT lines and stated duration before failing; `sparse-beats` is report-only by its own comment |
| ends-on-nothing | `quality/gates/beat-check.mjs:187` | the final tail of the film must hold a content layer, not a bare backdrop | `docs/CRAFT/DIRECTION.md` | a branded card or mark in the tail counts as content |
| plan-overruns-render | `quality/gates/plan-vs-render.mjs:238` | the plan's beat spans must describe the film that actually rendered | `docs/CRAFT/AUTHORING-WALKTHROUGH.md` | one-frame tolerance on the length comparison |
| bindDials row contract | `core/registry/knobs.js:181-212` | every advertised dial must be read by its preset, and every dial the preset reads must have a row | `docs/CRAFT/ENGINE-CHANGES.md` | contract stays strict; enforced in lib-test/arsenal-check instead of throwing at module import, so one broken preset can't take down every core import |

## Stays hard, always

- `renderFrame` purity (a scene function may not have side effects across frames).
- `stage-gate.mjs` refusing `approved:` written by anything but the user's own signature.
- `beat-check.mjs` empty-beat (a declared beat with nothing in it).
- storyboard timeline over/underrun (the plan's own spans don't add up).
- `dive-in.js` non-finite `tx`/`ty` targets (a camera move that resolves to NaN has no safe value to clamp to).

These are refused rather than adapted because no film-context reading changes the answer: each one is
either a determinism bug, the one signature the harness must never forge, or a construction error the
scene itself states incorrectly.
