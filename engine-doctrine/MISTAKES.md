---
when: you hit something odd in the engine, or you just fixed one and must log it
answers: "numbered lessons from past mistakes; a citation elsewhere (`MISTAKES.md #N`) resolves here by number"
group: process
---

# MISTAKES.md: numbered lessons

Each entry is the title, the one-sentence lesson, and what holds it today (a live check, or "none"
when only a person can remember it). Numbers never change, so a citation like `MISTAKES.md #207`
keeps resolving. Entries whose lesson depended on the removed JSON scene format were dropped. The full
history is in git.

New incidents: add a rule or a check message first. Add a line here only if nothing else can hold the lesson.

---

## 1. Built a DARK video for a WHITE site (taste inversion)
dominance is decided by LOOKING, never by a field.
holds: none

## 7. Logo colour invisible against the bg
keep both variants in `assets/icons/` ,  light (`#f3f3f0`) for dark bgs, `-dark` (`#0e0e0d`) for white bgs ,  and pick by the beat's background. (A dark logo on white, a light logo on blue.).
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

## 15. Authored from imagination + hand-math instead of the real asset + the composition tools (argus)
What: three flaws shipped in the first argus pass: (a) the pixel-eye mascot was recreated from memory (a made-up almond) when the real one is a moth-eye creature with antennae + a spiral iris ,  I...
holds: quality/gates/critique.mjs

## 16. The SITE cropped the videos it was selling (`object-fit: cover`)
What went wrong: every `<video>` on the marketing site used `object-fit:cover`, so any clip whose container ratio didn't match its file got cropped.
holds: none

## 20. Captured components pointed at REMOTE images → blank cards in an offline render
capture now LOCALIZES every remote asset into `components/media/` and rewrites the html to local paths.
holds: none

## 27. Sound was a downloaded sample library, not part of the framework
`core/audio/kit.mjs` ,  the engine now SYNTHESIZES its own audio: oscillators, seeded noise, RBJ biquads, envelopes, a feedback-delay shimmer, a WAV writer, and a parameterized music-bed generator.
holds: none

## 29. The `cuts` array renders NOTHING (the engine's largest silent-ignore)
scene cuts now render. A cut treats the beat LEAVING as an exit and the beat ARRIVING as an enter, applied to the camera root (`#cam`) so the whole beat moves as one.
holds: none

## 32. Beat matching: build the edit ON the music, do not drag cuts onto it
What: snapping existing cut times to the nearest beat did nothing useful ,  at 77 BPM the bars are 3.11s apart, so the nearest beat was often half a second away from the intended edit point. The...
holds: none

## 35. Descenders were sliced off every `riseClip` word (shipped, in every scene using it)
What: g, y, p rendered with flat bottoms ,  "coverin_g everythin_g" cut through the tails.
holds: none

## 42. `blur(0px)` is not free, and identity values are written every frame
`defocus` returns `filter: 'none'` at u >= 1. Rule: an animation's identity must be genuinely free, because it is the value the scene spends almost all of its frames at.
holds: none

## 43. A captured component's root margin falls out of the box the capture measured
the root's margins are dropped at capture (they describe siblings that do not come along), AND `component.js` zeroes the root child's margin at build time so components already on disk heal...
holds: none

## 49. Sound had no way to come from the picture
auto sound-design emits one key cue per revealed character from that same expression.
holds: none

## 50. A block hand-computed its own centring
the mark centres via the group's own `justify` (or a text layer's `align` over its width). Rule: the rule against hand-computed centring applies to BLOCK CODE too, not just scene JSON.
holds: none

## 51. A sound effect named `click` was 19.6 seconds long
keystrokes are now GENERATED, not downloaded ,  `key1/key2/key3/keyspace/keyenter` in core/audio/kit.mjs are ~15-35ms bandpassed noise transients, which is physically what a key click is.
holds: quality/gates/sfx-audit.mjs

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

## 61. Auto-derived cues had no volume dial
`audio.sfxGain` scales every effect cue, derived ones included.
holds: none

## 66. Per-band normalisation makes silence look loud
the sidecar reports each band's ABSOLUTE `peak` alongside the normalised frames, and the bake prints it (`high 0.0291`), flagging `(near-silent)` under 0.01. Caught by: a lib-test assertion that...
holds: none

## 71. Only one colour set in the block library was ever measured
What: five hardcoded colour pairs shipped below the WCAG body bar.
holds: none

## 72. A block's whole reason for existing sat behind a condition that was always true
an `active` prop ,  `i < active ? '✓' : i === active ? '•' : '·'` ,  defaulting to "all done", which is exactly what the broken condition produced, so no existing caller changes.
holds: none

## 75. The conformance sweep cannot detect two identical values (OPEN)
Status: real defect, evidenced, NOT fixed.
holds: none

## 77. The doc, the manifest and the engine each said something different about `unit`
a leading currency symbol in `unit` is hoisted in front of the number, so `unit:"$B"` reads `$880B` as documented.
holds: none

## 78. The overlap check does not see text that grows by wrapping (OPEN)
What: a showcase end card had a headline wrap to two lines and land directly on top of the mono filepath beneath it.
holds: none

## 80. `ls` was declared, documented, used 18 times, and never applied
`ls` is honoured as a synonym for `tracking`.
holds: none

## 82. A decision that decides nothing
What: `deploySuccess` shipped `i === last ?
holds: quality/gates/dead-branch.mjs, quality/gates/lint-test.mjs

## 84. A positional assertion silently changed what it was testing
`branchOf(name)` locates a branch by the effect's own name, and the check now runs over matrixDecode, nebula and dotCrawl.
holds: none

## 85. A gate flagged its own test fixture
exclude the mutation harness too. Worth stating plainly because the cost is asymmetric ,  a gate that cries wolf about itself trains people to skim its output, which is exactly how a real finding...
holds: quality/gates/dead-branch.mjs, quality/gates/lint-test.mjs

## 86. An incomplete GL texture samples as opaque black, and says nothing
`naturalWidth ?? width`, and a failed source now THROWS with the offending URL rather than returning early.
holds: none

## 87. refract ran every line and did nothing
`/ (2.0 * e)` and a scale retuned to the now-correct magnitude. The other half of this entry is the mistake I nearly made. In the same contact sheet I read `bitCrush` as broken too, at three...
holds: none

## 88. The comment described the intent; the code did the opposite
the sign. Lesson: a comment stating a direction is a claim that has to be rendered and looked at, exactly like a number.
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

## 104. I discarded a correct diagnosis because of evidence that never contradicted it
vawe-site had failed every deploy for three days at `COPY scripts ./scripts` with `failed to stat active key during commit`.
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

## 111. The layout audit called Ken Burns a bug, so authors learned to ignore it
the overflow rule skips `.hs-img-wrap`. Its stated purpose (`quality/audit.mjs:4`) is *clipped text*; an image box exists in order to clip, so it can never be evidence there. The lesson: a false...
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

## 121. a loudness (LUFS) target is not an RMS gain; do it at the mux with ffmpeg loudnorm
apply loudness at the MUX via ffmpeg `loudnorm=I=<target>:TP=-1.5:LRA=11` (encode.Mux), which implements gated BS.1770 correctly.
holds: none

## 122. a typed line cut off mid-type because its beat was too short
(authoring) raised the speed to 48/s and the duration to 1.6s so it finishes at ~0.8s and holds before the cut. (framework) `make check GATE=critique` now has a `typing-cutoff` rule: it flags any typing...
holds: none

## 123. beat transitions dipped to an EMPTY stage (jump-cut with a dip)
(authoring) overlap the beats ,  start each beat's entrance ~0.4-0.5s BEFORE the previous beat's content ends, with `out:"blur"` + the next `cut:"blur"`/`cutTiming:"brake"`, so the two...
holds: none

## 124. Seam D whole-stage bake deadlocked the render: the virtual clock starved chromedp's readiness Poll
Seam D (two-scene shader transitions) rasterises the two beats either side of a boundary into textures at build time, inside boot's awaited phase.
holds: none

## 126. neon bloomed a flat FLOOD colour, not the image's own colours (not how neon works)
What. The luminance-bloom refactor (#115) thresholds luminance for the highlight mask (correct), but then FLOODED a single colour through that mask (`feFlood` + `feComposite operator=in`),...
holds: none

## 128. the camera zoom "shook" / wasn't smooth: cameraAt eased EVERY segment, zeroing velocity at each keyframe
`cameraAt` now honours a per-keyframe `ease` (mirroring `motionAt`), default `easeInOutCubic` so every existing camera is byte-identical (`make check GATE=probe` confirms).
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

## 138. resolveEasing swallowed unknown easing names
`resolveEasing` now checks membership explicitly and WARNS once per unknown name (listing the valid ones) before falling back.
holds: none

## 144. seams flashed BLACK on every white-first scene without an explicit bg window
`core/timeline/seams.js stageToCanvas` ,  in the no-canvas-bg branch, fill the theme base bg (read `--bg` off `.hs-stage`, fall back to computed background-color, then `#fff`) BEFORE drawing the DOM, so...
holds: quality/gates/seams.mjs

## 147. camera library + logoReveal: two authoring traps found building the demo (fixed at the source)
What. Building the motion-showcase demo surfaced two ways an author gets a silently-wrong render: 1.
holds: none

## 150. ported an external craft study: seam-QA, anti-front-load floor, author-the-frame, the spec contract
What. Studied a real externally-built promo (its storyboard, `frame.md` design spec, per-beat HTML+GSAP compositions, rendered frames, and the build session trace) to find what set its output...
holds: none

## 151. ported a full external pipeline (Steps 0-6) as local-model tooling
What. Studied an external `product-launch-video` pipeline (its gated Step 0-6 stages) and built our own version of all five adoptable pieces, offline / local-model only: 1....
holds: none

## 154. the composition path (per-beat GSAP timeline), and TWO framework bugs it surfaced
What. Adopted the "one worker hand-writes a GSAP timeline per beat" model from an external pipeline ,  but SAFELY.
holds: quality/gates/lib-test.mjs

## 158. glow.frame() left a STALE inner value outside its window; beat-unit extension exposed it as non-determinism
glow.frame() now sets the inner DETERMINISTICALLY for every t ,  no early return.
holds: none

## 159. the engine PICKED the background, so nobody ever designed one
`bg` is now required in `films/scene/schema.json` (`required` + `minItems: 1`), and the injection is gone from `core/engine/produce.js`.
holds: quality/gates/author-check.mjs, quality/gates/gate-mutation.mjs, quality/gates/lib-test.mjs, quality/gates/scene-snap.mjs, quality/gates/snap-signature.mjs

## 161. judged a moving background on ONE still, and got the motion twice too fast
Retuned against the strip, not the still (speed 1 → 0.42, scale 2.4 → 1.25, crossed-wave field, ramp rebalanced for the new distribution).
holds: none

## 163. `anim: "none"` was a valid schema value the engine did not have
`"none"` is a real no-op entry in `ANIM` now. Lesson. `schema-drift` compares the schema against the registries it copies, and it reported this enum as in sync while it carried a value the engine...
holds: quality/gates/direction-floor.mjs, quality/gates/gate-mutation.mjs

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
holds: quality/gates/author-check.mjs, quality/gates/seams.mjs

## 175. the anti-slop detector read every ISO date as an `01 / 02 / 03` section scaffold
`(?<![\w\-/:.])(0[1-9]|1[0-2])(?![\w\-/:.])` in `skills/impeccable/scripts/detector/engines/regex/detect-text.mjs`.
holds: none

## 177. a dissolve between two text states is illegible at its midpoint, and nothing checks it
What. Raised by the user as "settled states are good but during the animation things can be calibrated better".
holds: none

## 180. the crossfade-to-mud defect came straight back, in the film written to fix everything else
Both are wipes now: one box, two strings, clipped from opposite sides by the same variable, with a read head at the seam.
holds: none

## 187. the A/B sampler landed mid-entrance and three judges scored the still as broken
When only one arm has a scene, that scene's beat table is used for BOTH arms.
holds: none

## 191. four contact-sheet writers shared one filename
Every sheet is named for its scene: `/tmp/beats/<name>.png`, `/tmp/reveal/<name>.png`, `/tmp/seams/<name>.png`, `/tmp/audit/<name>.png`, each with its own scratch directory.
holds: none

## 193. a layer could not opt out of beat wrapping, so the doctrine's central rule was unauthorable
`"acrossBeats": true` on a layer. `beatIndexOf` returns null for it, which the two existing call sites already handle: the layer attaches to `cam` rather than a wrapper, and `setLayerTiming`...
holds: none

## 196. eight render workers starved raster, and words blinked out
A user watching `showcase-flight` said "words are flickering".
holds: none

## 198. three craft decisions were opt-in, so the library never made them
A continuous-action recreation is the exemplar and the rest of the library does not move like it.
holds: none

## 201. a merged motion track must state the whole pose at every key it fabricates
Every key the merge produces now states the full pose.
holds: none

## 203. multiPhase's "hold" leg panned the camera home
Found by prediction, not by watching. The method: take the bug shapes from #199-#202, enumerate every site in the engine that has the same shape, and probe each one.
holds: none

## 204. removing an element is not the same as replacing what it did
Keep the function, drop the form: three dots pulsing in sequence, which cannot be mistaken for the ring because they are not round, and which read as the ellipsis of "Composing…" rather than as an...
holds: none

## 205. the silent-prop sweep: four conditionals that swallow an author's input
Class E of the predicted-bug hunt. A prop read only INSIDE a conditional on another prop does nothing when that other prop is absent, and does it in silence.
holds: none

## 207. four things between the capture tools and a real brand
All four found in the first twenty minutes of trying to make a film for an actual company, which is the point: they had been in the repo for months and no amount of engine work would have surfaced...
holds: quality/gates/lib-test.mjs

## 210. rendering at 60fps silently threw away motion blur
The floor is now `AUTO_BLUR_FLOOR_PER_SEC = 480`, divided by the frame rate at use.
holds: none

## 212. the engine could move a box and scale a box, but never resize one
`w`/`h` are keyable. `core/timeline/sequence.js` gains `resolveBoxes()` and `motionAt` returns `w`/`h`.
holds: none

## 213. depth was a number, not a track, so nothing could pass behind anything
`track` is keyable, on the same contract as `w`/`h` (#212) ,  `resolveKeyedProps` fills a keyed property from the layer once, up front, so `motionAt` keeps ONE interpretation rule.
holds: none

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

## 227. what a modifier may not assume at build time: no parent, and no wrapper
Stated in the contract at `core/fx/index.js:43-58` and obeyed by all four modifiers.
holds: none

## 229. a 404's body was parsed as the scene, and a file nobody opened was blamed for its contents
What. Two error messages, both naming the wrong cause, both current until this pass.
holds: none

## 230. `--alpha` exported a fully opaque overlay, and every downstream flag on that path was wrong too
`films/scene/scene.js` reads the `alpha` class `core/engine/boot.js` already sets and suppresses both backdrops, the canvas and the hand-authored `bgHtml`.
holds: none

## 233. "a group child has no box" was a conclusion drawn from the authored x/y
`films/scene/scene.js` measures each identified child once at build as a delta from its top-level ancestor's rect (rects, not an `offsetLeft` chain ,  `offsetParent` skips a statically...
holds: none

## 239. the camera scaled a finished picture and called it a push
One camera model ,  position (`x`, `y`, `s`), orientation (`roll`, `rx`, `ry`), lens (`p`) ,  with two provably equivalent emissions.
holds: none

## 243. sound by default was never decided, it was inherited from a bug fix
Doctrine reversed. `audio._why` added, matching `authoring._why` including its 12-character floor.
holds: none

## 244. the only continuity the engine could express was visual, so every film had to carry a prop
`audio.bridges` ,  a span of sound hung off a NAMED junction, `core/audio/bridges.js` resolving it in the browser (the only place that knows where the film's cuts are) into seconds, and...
holds: none

## 246. the provenance table described a file that was no longer there, and could not survive a clone
`audio-bake.mjs` writes a credits row for every bed it bakes ,  generated-by, no licence, verified true ,  and says out loud when it is correcting an entry that claimed a download.
holds: none

## 247. beat wrapping discarded the authored `duration`, and the DOM kept no record of it
Separate what renders from what is reported, rather than change what renders. - `scene.js` writes `data-authored-duration` alongside the rewrite.
holds: none

## 249. `buried` called a fully visible graphic 100% covered, because an ink rect was read raw (a fourth #211/#214/#216/#217)
The clamp now lives inside `inkRect` (`clampToBox`), so an ink rect can only ever shrink the element's border box and falls back to the box when the intersection is empty, for every consumer,...
holds: none

## 251. The layout audit read a rotated stage as if it were flat, and manufactured collisions
What happened. `onefilm`'s beat 5 is its only camera move: the stage tilts and pushes so the file and its results are seen on a plane from an angle.
holds: none

## 254. `make dev-tool X=reveal` reported a contact sheet it had not written, and stamped a receipt for it
What happened. `make dev-tool X=reveal D=films/scene/playhead.json` printed `✓ reveal · 5 beats … → /tmp/reveal/playhead.png` and exited 0.
holds: none

## 256. the dead-CSS check had three blind spots, and each one was a place hand-written CSS actually lives
What happened. `core/tokens.css` disables `transition` and `animation` engine-wide, so hand-authored CSS motion renders a dead still and says nothing.
holds: none

## 260. the guard against a destructive command matched the prose describing it, twice
`commandsIn()` in `harness/live/no-blanket-git.mjs` strips heredoc bodies and quoted literals, splits on command positions (`;`, newline, `&&`, `||`, `|`) and anchors every pattern with `^`, so a...
holds: none

## 267. the gates measured the box the author asked for, not the ink the frame carries (a fifth #214)
- `quality/audit.mjs`: the ink helpers (`paintsBox` … `inkRect`) move above their consumers, and `info` (which feeds overlap · tight · top-heavy · display-type contrast · image contrast) is built...
holds: none

## 268. a load-bearing comment claimed the capture was byte-stable, and it never was
The comment is replaced with the measurement.
holds: none

## 270. `_lightfall.html` moves at frame rates against a clock measured in seconds
Not applied. `_lightfall.html` was out of scope for this pass and is hand-baked, so there is nothing to fix but the 58 literals.
holds: none

## 272. a fidelity metric that averages away the thing it is grading
`research/lightfield/lightfield-metrics.mjs` now defines both, once, and both are printed: `blockError` for the colour field, `striping` for the pattern (`edge`, the mean absolute horizontal step;...
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

## 278. a capture localizer that only recognised an asset by its file extension
`scripts/brand/localize-assets.mjs`. One tokenizer finds asset references BY CONTEXT, from a table of (tag, attribute) pairs: `img`/`source` `src` and `srcset`, `video` `src` and `poster`,...
holds: none

## 280. the worker that drew a frame was decided by a race, so no two renders could be compared
The jobs are dealt round-robin before any browser starts (`perWorker[i%workers]`), not raced for.
holds: none

## 281. still open: a second cause, and it is not antialiasing either
With the raster race closed and the worker assignment fixed, 250 of 1890 frames still differ between two renders, and the frame map is identical, so the *same browser* drew each of those frames in...
holds: none

## 282. two passes tuned the wrong half, because each inherited the last one's ceiling
What. The lightfield reference reproduction was washed out.
holds: none

## 283. the playground found two engine bugs in its first hour, which is the argument for it
The generator playground went up so people could turn the dials in a browser.
holds: none

## 284. a screenshot taken at `load` is a picture of the browser's timing
`stableShot` (`research/lightfield/lightfield-render.mjs`) shoots until two consecutive frames are byte-identical, and throws when that never happens.
holds: none

## 285. `loadingBar` accepts `color` and never reads it
What. `blocks/dev.mjs`: export function loadingBar({ …, color = T.greenBright, settle = T.green, label, done = true } = {}) The fill paints with `settle`.
holds: none

## 286. `toast` accepts `body` and never renders it
What. `blocks/ui.mjs`. The file's own comment says the alert family (`notification` · `toast` · `callout` · `banner`) "now shares ONE vocabulary: `title` and `body`".
holds: none

## 288. Ranges that could not be derived, and are wide on purpose
Recorded so nobody reads a wide bound as a considered one: - `statBig.to` / `statBig.from` / `statCard.to` / `statCard.from`: `±1e12`.
holds: none

## 290. the silhouette is per-element, and the reference's is one landscape
Attempted and reverted, twice, and recorded so the next attempt starts past it.
holds: none

## 291. the randomiser could roll an illegal pair, and the person clicking got the blame
What. `lightfield` refuses a dial the chosen structure cannot express: `rings` has no seam WIDTH and no left-to-right axis, so `shadow.seamWidth` and `envelope` on a ring field throw and name the...
holds: none

## 292. the playground did not fit on a screen, measured
Before, on the live page: 2.4 screens at 1440x900, 2.7 at 1280x800, 3.1 on a phone, and the preview started 455px down and ended at 914px against a 900px viewport, so the thing the page exists for...
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
`research/lightfield/lightfield-seeds.mjs` cannot run: it imports `research/lightfield/lightfield-model.mjs`, which is not in the repository.
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

## 325. One deliberate behaviour change, stated plainly
`u_p2.yz`, the band field's centre, was read as raw coordinates and is now read as a FRACTION OF THE FRAME with the x half multiplied by the aspect inside the shader.
holds: none

## 326. wed: there is no snapshot for the shader effects
Findings A and C were both caught by throwaway scripts written for this pass and deleted with it: one that shoots all eighteen ambient effects at two clocks with and without a palette and prints a...
holds: none

## 332. The two tools that FIT a seed have never once run
Wrote the module. The field is a stack of CSS gradients composited source-over, and source-over is `src*a + dst*(1-a)`, so every alpha comes from geometry and the painted colour at any point is a...
holds: none

## 333. A default that reproduces the old behaviour, except in float32
Even spacing is sent as NO positions at all: the generator drops the suffix when every stop sits exactly where the even spread would put it, and the shader reads a negative first position as the...
holds: none

## 334. The playground card drew a different picture from the generator it names
Pass all six vectors; use the engine's converter.
holds: none

## 336. Two films authored as improvements, both slower than the one they replaced
`pace-check.mjs` measured this, in the TASTE half of `author-check`. It was a TASTE gate and was later
retired (`engine-doctrine/SAFEGUARDS.md`); the pacing doctrine it enforced moved to
`engine-doctrine/CRAFT/DIRECTION.md`.
holds: quality/gates/author-check.mjs

## 339. Moving markup into a file moved it out of the hash that proves somebody looked at it
`hashOf` folds in the bytes of every html fragment the subject NAMES, path first so pointing at a different file with identical contents still counts, in sorted order so the digest is stable.
holds: none

## 343. Four colour parsers, four grammars, and one of them was unanchored
One parser in `core/motion/motion.js`, accepting the union and anchored at both ends, with a `{r,g,b}` adapter for the two object-shaped consumers.
holds: none

## 345. Stripping tags eight times with three answers, and the two common answers were both wrong
One definition in `core/type/on-screen-text.js` ,  in `core/`, not `harness/lib/`, because `core/validate/validate.mjs` and `core/type/captions.js` need it and both ship to the browser, so a definition parked in...
holds: none

## 346. driveClips asked the DOM what to drive, on every frame
`collectClips(root)` takes the set ONCE, frozen, where the scene finishes building; `driveClips` takes the collection instead of a root.
holds: none

## 347. Two answers to "is this background light", disagreeing on every saturated colour
One `isLightBg` in `core/motion/motion.js`, in linear light, beside the `relLum` the contrast maths already uses.
holds: none

## 350. Worker count changes about 80% of frames, and the cap should not move until that is understood
> CORRECTED by its own Phase 0, below.
holds: none

## 352. The one gate that blocks on structure read six of the eight channels its own source returns
`poseAt` folds all nine, with `null` (this track does not drive that property) printed as `-` so it compares equal to itself.
holds: quality/gates/direction-floor.mjs

## 355. Six camera generators would run their clock backward, and the reviewer that found it named two
Two helpers, `span` (positive, for anything that advances the clock) and `hold` (zero allowed, negative never), used by all six generators plus `travel`'s stations.
holds: none

## 357. The arsenal could not describe itself, and the one shared map made it lie
`engine-doctrine/EFFECTS.md` is generated from the registries and exists so an author can "see everything, then choose".
holds: none

## 360. A field enumerated by hand at a boundary, four times in one day
Four separate files today collected a value, carried it to a boundary that lists its fields by hand, and dropped it.
holds: none

## 362. Describing the looks found four bugs in the looks
Writing one line per composite look meant reading all 31 recipes.
holds: none

## 367. `--p` was frozen at 0 for every backdrop that spans its film, and a sentinel is why
Told that reaching for framework presets caps what you can build, the fix was to stop picking a background off a list and hand-author one.
holds: none

## 368. `inkflash` was a colour wave wearing a name nobody had built
Asked where `inkflash` came from, the answer was in the repo's own history.
holds: none

## 370. A colour default is a decision about the theme, or a deliberate constant, and nothing could tell them apart
F3 of the framework plan. Twice this week a brand's colours turned out to be the engine's defaults: `PAL_PLINTH` painted every unthemed background in plinthai.xyz blue (#366), and `inkflash`...
holds: none

## 371. One ease for every channel, so the second curve had to be hand-written in CSS
F2 of the framework plan. `core/tracks/vars.js` animates CSS custom properties, which is how a block animates what it DOES rather than merely entering.
holds: none

## 375. Seven vocabularies still answered a wrong name with a plausible substitute
The review that produced #374 prompted a full sweep: probe every named vocabulary in the engine with a nonsense name, then read what each CALLER does with the result. The sweep corrected a claim I...
holds: none

## 376. A rule the framework cannot enforce, and the census that reads its own limits
P3, P4 and P5 of the plan, and the end of the silent-substitution work. P3 ,  every vocabulary is a registry now: 8 became 17. Five of them (camera move, caption style, paint fx, raymarch, ambient...
holds: none

## 378. Eighty-nine words for one idea, and the answer to "should we remove every default?"
Three things, from one planning pass. The first is a question I was asked and answered with a measurement rather than an opinion. "Should we remove every default colour, so nothing default ever...
holds: none

## 384. The same frame paints differently depending on which worker tab drew it
The user said the contribution grid was blinking.
holds: none

## 385. Two backdrop windows, and only the last one ever painted
`bg` is a required field, so the backdrop is always the author's decision.
holds: none

## 386. The renderer segfaulted instead of telling you why the scene would not load
A six-second test scene with `"fx": "fade"` on a boundary killed the process: panic: runtime error: invalid memory address or nil pointer dereference vawe/internal/scene.Capture(...)...
holds: none

## 390. The contrast gate graded frames 0.067s into their entrance
`make check GATE=audit-all` (#388) reported 33 scenes with hard contrast failures.
holds: quality/gates/lib-test.mjs

## 391. A worktree fan-out over films silently throws the work away
Four agents were sent to fix contrast findings across 32 scenes, one worktree each, split so no two shared a file.
holds: quality/gates/author-check.mjs, quality/gates/snap-blocks.mjs, quality/gates/waiver-drift.mjs

## 392. Two swatches in the ransom palette were never readable
`ransomColorSwatches` is a HOUSE table: every ransom-note scene draws from it.
holds: none

## 395. A slot swap that cross-faded two words in the same box
`over = 0`. Passes butt. The payload slot, which does pop, blinks for its `payload` offset, and a slot visibly re-filling is what this beat is a picture of.
holds: none

## 397. The validator kept its own copy of "is this a real easing", and it was already one behind
`core/motion/motion.js` exports `isEasingName(n)` ,  the one membership test ,  and the validator asks it.
holds: none

## 398. A track compared the transform it wrote against the one the browser gives back
Store the browser's own spelling, not the author's: `el.hsIdle = { out: el.style.transform, base }` after the write.
holds: none

## 401. A documented `--json` flag whose output could not be parsed, and a test that pinned a repealed rule
Two bugs found by an agent doing unrelated work.
holds: quality/gates/arsenal-check.mjs, quality/gates/audio-check.mjs, quality/gates/author-check.mjs, quality/gates/beat-check.mjs, quality/gates/copy-check.mjs, quality/gates/designspec-check.mjs, quality/gates/direction-floor.mjs, quality/gates/discovery.mjs, quality/gates/seams.mjs, quality/gates/generated-check.mjs, quality/gates/lib-test.mjs, quality/gates/motion-audit.mjs, quality/gates/pace-check.mjs, quality/gates/plan-vs-render.mjs, quality/gates/read-check.mjs, quality/gates/rung.mjs

## 404. Three checks that could not be reached, and a fourth still blind
A check nothing runs is not a check. Three reachability holes, closed, plus one reported. The spectacle check never ran on an unplanned film. `plan-vs-render` needed an intent sidecar or a...
holds: none

## 405. Closing #388: the letter-spacing write happens once, and a second one fails a test
#403 ended with an argument rather than a fix: "anything that writes `letterSpacing` after `styleText` will be the third [to discard something].
holds: none

## 409. Burnt-in captions rendered underneath the platform's own caption strip
`core/engine/boot.js:325` writes `--safe-bottom` from `safeArea(w, h, destination)`.
holds: quality/gates/arsenal-check.mjs, quality/gates/lib-test.mjs

## 411. The last readers of `transitions`, and the one that was policing the seams blind
#394 closed eight consumers of the unified `transitions` surface. #407 found the ninth and its required grep found seven more.
holds: none

## 413. Nothing stopped a headline landing on the caption
#409 fixed WHERE a burnt-in caption sits: `.hs-cap` reads `--safe-bottom`, so it clears the platform's own strip.
holds: none

## 415. The audit that told us which gates were blind was itself wrong
#394 fixed eight consumers of the unified `transitions` surface and declared itself closed. #407 found the ninth. #412 found five more.
holds: none

## 416. The ratchet: legacy is not a waiver
A new rule always fails old films. `no-storyboard` fires on 121 of 132 scenes.
holds: none

## 419. Every font came from an unversioned URL, so the whole library measured differently by the day
`generators/media/fonts.mjs` fetched 16 faces from `cdn.jsdelivr.net/npm/<pkg>/files/…` with no version in any URL.
holds: none

## 420. A caption style could be added to the registry and stay unreachable, and one shipped style had two states where it claims three
Three separate findings, all surfaced by adding four styles to `core/type/captions.js`.
holds: none

## 421. Every count blueprint in the library is frozen at a non-zero start
A count blueprint (retired with blueprints/kit.mjs) wrote `countStart` as an ABSOLUTE time.
holds: none

## 423. The two most-used caption mechanisms in short-form video were unsayable, and the reason was in the contract
`CAP_STYLE_SHAPE` in `core/type/captions.js` declares `mode:'one'` and `unit:'char'` per style, and `capUnitWins(cap, unit)` subdivides each WORD window across that word's characters, so speech pacing...
holds: none

## 426. Four caption mechanisms were reported reachable, and not one of them was callable
Four caption-native styles, each satisfying the doctrine rather than being exempted from it: `flipUp` (hinges from -90deg, invisible without being dim, the same argument `typeOn` makes for...
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

## 433. Two thirds of a status vocabulary was theme-aware, and a brief demanded a check its worktree could not run
The token. Every theme ships `up` and `down`, so `blocks/kit.mjs` TONES could paint ok and danger from the palette.
holds: none

## 434. CLOSED: the frozen counter, fixed and shown
`dollyNumber` (retired with blueprints/kit.mjs) wrote `countStart: start + 0.1`.
holds: none

## 435. /editor rendered a blank stage in production, and the engine had been saying why the whole time
What a visitor saw. The page loaded.
holds: none

## 439. `css` painted a box, and `radius` was silently dropped on it
One condition, gated on an EXPLICIT radius so `chipBox`'s own `??
holds: none

## 441. retiring 35 agent worktrees, and the five files that nearly went with them
What. Agent worktrees had reached 35, at 9.1G.
holds: none

## 445. an array's ORDER was a shader API, and nothing could have caught it
`core/stings/index.js:22` declared `SHADER_FX` as a flat list of names.
holds: none

## 446. a documented `curl` that writes a zero-byte file on 404
Three scenes stopped booting the moment `core/engine/boot.js` began refusing an asset that never loaded.
holds: none

## 447. an engine easing name on a GSAP-driven field renders a different curve, silently
`gsapEase(e, fallback, where)` in `core/motion/motion.js`, at all five call sites.
holds: none

## 449. a bare catalog name does not carry its catalog props, and the comment said it did
NOT by merging props here: that would give every unset field demo content, the same substitution wearing the other coat.
holds: none

## 450. block-schema evaluated defaults in a hand-listed scope that had drifted from the kit
`const SCOPE = { ...KIT, ...REGISTRY, T: TOKENS }`, spread, never listed.
holds: none

## 452. producing a contact sheet is not looking at one
The receipt records `auto: true` when a sheet was produced by the loop.
holds: none

## 453. a trim ate a status prefix, so the worktree pruner retired nothing
`gitRaw()` returns the output untouched and porcelain is parsed off that; `git()` keeps the trim for the callers that want one value, with a comment saying that column-positioned output must not...
holds: none

## 455. the npm package shipped one CPU architecture and claimed to be cross-platform
The host's own identity picks the file (`vawe-<platform>-<arch>`), and the file's MAGIC BYTES are read back before spawning: ELF / Mach-O / MZ against `process.platform`.
holds: none

## 456. every `npm install` downloaded 473MB of Chrome to read one path string
Moved to `devDependencies`, where the 41 repo tools that genuinely need it still get it. `optionalDependencies` would NOT have fixed this: npm installs those by default too, so the download would...
holds: none

## 457. a typo'd `anchor` id, and a palette value that is not a colour
Two of the same shape, found by a read-only audit rather than by a render. `anchor`. `resolveAnchors` did `const T = L.anchor && byId[L.anchor]; if (!T) continue;`, so NO anchor and a WRONG anchor...
holds: none

## 466. the camera's lens was keyable, reached nothing, and said nothing
`cameraAt` has interpolated a `p` keyframe (the lens, `persp`) since the rig landed, and `drawCameraAndCut` writes it to `#root` every frame, but only under the RIG, and the rig turns on for a...
holds: none

## 468. the audit read text that is in the DOM on purpose and never on screen
`wordSlot` (core/fx/word-slot.js) puts a swapping word in a fixed box by stacking EVERY candidate in one CSS grid cell: the column is auto-sized by layout to the widest of them, so nothing after...
holds: none

## 471. eight resampling passes, and nothing we build ourselves could be fed to one
- `core/raster/raster.js`: the serialiser moved out of `seams.js` with `buildInlinedCss`, `domToCanvas`, `isBlankRaster` and a new `rasterStats`.
holds: none

## 473. the engine found the beat and no scene could ask it to use it
`core/beats/index.js`, and a scene declares its grid: "audio": { "music": "beat", "beatSync": true } `true` derives the sidecar from the bed the way the mixer derives the bed itself...
holds: none

## 474. a camera nobody wrote switched a HARD rule off for most of the library
The frame-wide filter is deleted. In its place the safe test asks the question in both spaces and reports only when they agree. - SCENE space, via `unCam`: undo the camera's ZOOM about the centre...
holds: none

## 476. six production deploys failed in a row and the only place that said so was a build log
The check now asks git rather than the filesystem (`git check-ignore --stdin`, one call for the whole set), and separately reads `.dockerignore`'s negations to confirm the path survives into the...
holds: none

## 478. the default push and the safe margin were one piece of geometry, written down twice
What. `core/engine/produce.js` gives any scene declaring no camera a `slowPush` from `1` to `1.06` spanning the whole runtime.
holds: none

## 480. the engine could not cut on a match, and the rule that wanted one cannot see it
What went wrong. `engine-doctrine/CRAFT/FILM-STRUCTURE.md` lists the match cut first among spatial devices, and `no-continuous-object` is the most-waived rule in this library: 14 films, 11% of the 132...
holds: none

## 482. a deploy went green and served every stylesheet as a 404
Do not accommodate the pin; remove it where it has no job.
holds: none

## 486. the render order was a comment, so two bugs in one week broke it and nothing said so
What happened. `#483` and `#484` landed within days of each other.
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

## 495. a sting counted as a joint, so declaring a spectacle moved every backdrop one beat late
The binder calls `shotWindows`, so one function owns "where does this film turn" and the two cannot drift again.
holds: none

## 498. beatSync reports what it moved, and the render log could not hear it
The value now travels the channel that already exists rather than a new one.
holds: none

## 499. the one block whose job is to host a brand painted Apple's window buttons over every theme
Close / minimise / zoom is danger / warn / ok, so the three dots are now `['error','warn','ok'].map(toneColor)`.
holds: none

## 500. the same frame number drew two different pictures, and the difference was one card's type
`will-change:transform` on the hero, which pins the choice.
holds: none

## 502. the wordSlot chip clipped its own descenders
The chip's vertical padding is `INK_PAD_EM`, so the plate contains the ink and the clip can stay.
holds: none

## 505. the clipped-text rule read every mask as a mistake
`quality/audit.mjs` hard-failed any film using the `tabBar.switch` block: `[clipped-text] DesignMotionExpo: mask is 329px too narrow for the glyphs`.
holds: none

## 506. the validator's lint was one 225-line body, so adding a rule was surgery
`lintData` in `core/validate/validate.mjs` scored cyclomatic complexity 84 across 225 lines, the highest in the repo.
holds: none

## 507. a comment inside devDependencies broke `npm install` for every fresh clone
Hoist the comment to the root as `//puppeteer-note`.
holds: none

## 508. two motion gates where one function held every rule
`harness/dev/complexity.mjs` put four functions from the motion pair in the repo's worst band: `motion-director.mjs` `analyse` at cx 108 over 372 lines, and in `motion-audit.mjs` the per-element...
holds: none

## 509. one static file server, copied 22 times, with 22 hand-rolled path guards
`harness/lib/render-harness.mjs` owns the three facts: `serveRepo` (one server, one guard, an optional `route(req, res)` hook for the five callers that serve a virtual path from memory),...
holds: none

## 511. the engine wrote 7,345 em dashes, and its own error message told you not to
Every occurrence in `core/` `blocks/` `scripts/` `formats/` `verify/` `blueprints/` `cli/` `engine-doctrine/` plus the Makefile and the markdown at the root now reads as a colon, a comma, a full stop or a...
holds: none

## 514. RETRACTED, and the retraction is the lesson
This entry claimed vawe's sound effects were 19 unlicensed Mixkit recordings.
holds: none

## 515. the engine knew every event in its own timeline and turned none of it into sound
`core/audio/tactile.js` derives motion cues from the timeline the engine already holds, in the `{ t, name, gain }` shape `buildSfx` has always carried.
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

## 523. a filter and a height, both authored, both silently dropped
The motion track stashes its base beside the OUTPUT it produced, the same shape `core/tracks/idle.js` already used, so a fresh write from build is recognised rather than guessed at.
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

## 531. the same film rendered at 1 worker and at 6 was a different film, and #506 named the symptom
`will-change` removed from `.hs-layer`, `#cam` and the beat wrapper; `--disable-partial-raster` added beside the two determinism flags that were already there; both early returns made authoritative.
holds: none

## 532. `snap-scenes` was read as a pixel gate for years, and it compares the DOM
The header now says plainly that it is not a pixel gate, gives the worked example, and says to diff rendered frames when the question is whether the picture changed. No new gate: a pixel net over...
holds: none

## 535. the velocity-cut advisory could not see a rotation, and its own worked example is one
`ROT_REACH` beside `SCALE_REACH`, a degree per second converted to px per second at an assumed radius, approximate on purpose exactly as the scale term is.
holds: none

## 536. KNOWN LIMITATION, not fixed here: a motion track cannot carry velocity out of its own ends
`tangentAt` (`core/timeline/sequence.js`) forces the FIRST and LAST tangents of an `ease: "through"` chain to zero, so a travel eases out of rest and back into it whatever its neighbours are doing.
holds: none

## 538. The refraction lens cannot bend a straight edge, because its map is separable
What. `glass: "refract"` displaces the backdrop through a lens ramp built from an `feImage` whose red channel is a function of x alone and whose green channel is a function of y alone.
holds: none

## 541. at the supersample it SHIPS with, the renderer is not reproducible against itself
What. #531 measures its residue at `--draft`, where the capture runs at `ss=1`.
holds: none

## 543. a camera that arrives on time can still leave early, and the same shot fails both ways
The hold now runs PAST the press it framed, by `dwell` where there is room and by half the gap where there is not, and the reframe takes what is left (`core/camera-moves/index.js`, followCursor's...
holds: none

## 544. the premium animated gradient cycled in 57 to 105 seconds, so it shipped as a still image
The six coefficients are multiplied by 5 (`core/surfaces/shaders-ambient.js`, the `u_fx==0` branch), landing the periods at 11.4 to 20.9s.
holds: none

## 545. a logo reveal that could never end as the logo, because the fill was thrown away at build
`core/layers/svg.js`. Build keeps the resolved colour on `el.drawFill` and paints the path with it at `fill-opacity: 0`; `frame()` brings that opacity up over `draw.fillDur` (0.4s) once the stroke...
holds: none

## 547. a device that ignored the two dials it declared, and a plane that assumed every capture was 1.6:1
`roughness: L.roughness ?? 0.34, metalness: L.metalness ??
holds: none

## 546. `PMREMGenerator.fromEquirectangular` on an 8-bit DataTexture returns a valid, black texture
`pmrem.fromScene(room, 0.04)` over four `BackSide` boxes, which is how three's own `RoomEnvironment` does it and which works here: the same body renders (69,72,80).
holds: none

## 549. the text scramble refreshed a fixed COUNT per window, so its speed tracked its duration
`rate`, in refreshes per second, default 48, with `each` passed in: `step = floor(u * each * rate)`.
holds: none

## 550. a fragment's own comment ate its stylesheet, because every regex read prose as markup
`stripComments` in `core/type/sanitize-html.js`, one owner, called first by `sanitizeHtml`, `timeCssUsed` and `droppedDecls`.
holds: none

## 552. a canvas layer kept its build-time size, so a folding shader showed a CROP of a bigger field
The element owns the box (`el.style.width/height`) and the canvas fills it (`width:100%;height:100%`).
holds: quality/gates/lib-test.mjs

## 553. the engine's idle default breathes, and a breathing terminal reads as fake
What. The terminal panel in the shader film crept: measured off the rendered frames, it was 1230px wide at 4.33s and 1267px at 6.33s, so every line of typed text drifted about seven pixels out and...
holds: none

## 556. a scene-level `matchCut` cannot match three subjects, and the closed state proves it
authoring, not engine. A graphic match needs ONE subject in the shape; a beat that ends on three equal panels has no single form to hand over.
holds: none

## 561. a shader panel could not change its look, and the workaround cost a WebGL context per look
What happened. A film wanted three panels, each cycling through several ambient shader looks.
holds: none

## 563. a fold sprang back to full size, because a later keyframe mentioned only `scale`
What happened. A terminal panel folds from 1240x620 down to a 564x404 tile over one bar, holds there, then takes a 1.07 scale punch when its contents swap.
holds: quality/gates/lib-test.mjs

## 566. every seam shifted its text to the top of the frame, because the bake dropped a linked stylesheet
`core/raster/raster.js` `buildInlinedCss` now inlines EVERY same-origin `<link rel="stylesheet">`, not just tokens.css: it loops `document.querySelectorAll('link[rel="stylesheet"]')`, skips cross-origin...
holds: none

## 569. a film rendered portrait and every "bug" for an hour was the canvas, plus a 404 that blamed the wrong thing
none new yet; both classes are named above with their write-site fix.
holds: quality/gates/lint-test.mjs

## 578. 101 of 181 films had no joint at all, because the only code that ever inferred one lived inside a GATE, not the engine
`seam-snap.mjs` derived a film's likely beat boundaries (a track-bearing layer's start landing >1.2s after the previous one) to know where to sample for a flash, and never told the engine. So beat-unit wrapping, `bindWindowsToJunctions`, audio-bridge cues and `shotWindows` all stayed off by default on any film that hadn't hand-authored a cut, which is most of them. The loop moved to `core/timeline/junctions.js` as `inferCuts(layers, duration)`, beside `shotWindows` for the same reason that one is there (a second copy of "where does this film turn" is this exact class of drift, #159/#358); `seam-snap.mjs` now imports it instead of keeping its own copy. `produceBaseline` injects the inferred boundaries as real `data.cuts` (absent-only: a film with a cut, a seam, or a `motion` track is untouched) styled with `look.cuts.default`, and does so before the beats are wrapped so a freshly-cut film turns its beats into cross-fading units in the same pass, not after: a `fade` cut with no beat wrapper is a whole-frame fade with nothing under it, refused at render (this whole-frame path and its refusal were later deleted outright, once beat wrapping stopped being optional; #636 in this file).
holds: core/timeline/junctions.js (`inferCuts`), core/engine/produce.js (`produceBaseline`), quality/gates/seams.mjs

## 593. a doc was written for a rule that already named its own file, and a file was overwritten to do it
The global rule says to record which design skills shaped a surface "in the project's DESIGN.md or the commit". `DESIGN.md` existed, 246 lines of engine rationale and brand tokens. Instead of appending to it, a new CRAFT doc was created for the same content, and `DESIGN.md` was written over with `cat >` after an `ls` whose output was filtered and read as "the file does not exist". Recovered whole from `HEAD`, which is the only reason this is an entry and not a loss. Two habits behind one mistake: reaching for a new file when a named one exists, and treating a tool's silence as evidence. The record now lives in `DESIGN.md` as the rule says, the ramps live in `engine-doctrine/CRAFT/HTML-FRAGMENTS.md` where the author who needs them already is, and the new doc is deleted. Before writing a file that does not appear to exist, `git show HEAD:<path>` is the check that costs nothing.
holds: engine-doctrine/CRAFT/HTML-FRAGMENTS.md

## 594. seven fragments carried the stage kit without its markers, so every tool that reads the kit read the fragment instead
The kit is pasted as `buildKit().block`, which wraps the CSS in `STAGEKIT:start`/`:end`. Seven hand-written fragments pasted the generated `<film>.kit.css` sidecar instead, which is the same CSS with no markers. `extractKitBlock` then returned null on all seven, and every tool that strips the kit before judging a fragment judged the kit as if the author had written it: `preview-fragment`'s full-bleed detector reads `position:absolute` out of `.kit-root`, and the new live hook counted `.kit-card`'s own `box-shadow` as two hand-written shadows on a fragment that has none. The markers are not decoration, they are the boundary between what the author wrote and what the generator did, and that boundary is what four separate checks depend on. Re-stamped from `block`, and the fragment's own CSS now sits in its own second `<style>`.
holds: layout.kit-markers-required

## 596. the storyboard planned the story and never planned the picture, so the wrong object passed every gate
Beat 3 of a film about a command line shipped a rounded pill with a circular accent send button: the together.ai chat input, copied off the reference shape-first. Its storyboard said `blueprint: terminalReveal` and its own `picture:` line said "a white pill bar holding the command, with a round cobalt run button", the two contradicting each other in the same beat, and nothing compared them. `make preview` was clean, correctly: the detector reads craft tells and cannot know a well-made object is the wrong object. Worse, the `picture:` line had been EDITED to agree with the wrong drawing rather than the drawing corrected to the plan. The same hole produced three more defects in one session: eight invented type sizes across seven fragments (no field decided the film's ramp), seven identical centred stacks (`layout:` is prose only `make dev-tool X=panels` reads), and a declared peak that measured fifth-largest in its own film (`spectacle:` names a beat and nothing compared beat sizes). Four closed-vocabulary fields now carry those decisions (`archetype:`, `weight:`, `borrows:`, and film-level `ramp:`), and `quality/gates/frame-check.mjs` is the check nothing was doing: it reads the storyboard AND the fragments together, renders each at 1920x1080 through the same wrapper `make preview` photographs, and measures the largest painted object per beat. Two measurement bugs were found and fixed while writing it: transparent flex wrappers spanning the margins reported as the largest "object" on three beats at an identical 83%, and a plane bleeding off two edges was credited with its off-screen half. An object PAINTS or is a text leaf, and only the part inside the canvas is in the picture.
holds: quality/gates/frame-check.mjs, harness/author/storyboard-parse.mjs, quality/gates/storyboard-check.mjs, engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md

## 599. the reference was decoded into twelve devices and the catalogue lived in a chat message
The first pass at one film used three of the reference film's twelve devices and nobody could see which nine were missing, because the study existed only in a transcript and a scratch file in /tmp. The frames looked "too simple" for several rounds while the compositions, the type ramp, the elevation ramp and the theme were each fixed in turn, and the actual gap was that nine of the reference's moves had never been written down anywhere a reviewer could check them against the film. This is the same failure as #593 in a different place: a decision that lives in a conversation cannot be checked tomorrow, and the brief had already been lost the same way earlier in the same session. The catalogue is now a `### Reference devices` table in the storyboard (a `###` so `blocksOf` does not read it as a beat), `referenceDevices()` in the shared parser reads it, and studio's plan pane renders it beside the spine. Each beat's `borrows:` names the device ids it uses, so "which of the reference's moves does this film actually use" is answerable from the file, not memory. A DROPPED device keeps its row, struck through rather than deleted: refusing a device is a decision, and an absent row reads as an oversight.
holds: harness/author/storyboard-parse.mjs, studio/page.mjs

## 610. the film stops because its moves END, not because there are too few of them
Three sweeps, one variable each, every variant assembled and rendered identically and measured by the same gate. STRUCTURE: two films differing only in whether a layer survived the cut measured the same. DENSITY: one to eight moves per beat cut dead windows from 86% to 57% and never moved the median off 0.02, against a reference median of 0.66. OVERLAP: four moves fired together measured 80% dead and a median of 0.000, the same four spread sequentially 60% and 0.106, which is the opposite of the advice the gate itself was printing. MAGNITUDE: travel distance and duration moved nothing either, every `parts` variant sitting at 0.01 to 0.03 whether the move was 24px or 40px, 0.22s or 1.2s.
The one axis that moved the number was SUSTAINED motion: a keyed layer track that never finishes, always mid-travel, took the median from 0.02 to between 0.17 and 1.61 and the peak to 4.13 against a target of 4.71. Everything else in the vocabulary is a one-shot entrance that lands, and once landed the frame is still again, so stacking more of them, spacing them out, or making each travel further changes WHEN the stillness happens, never whether it happens. The film does not stop because too little was asked for; it stops because everything that was asked for finishes.
And the storyboard cannot ask for the thing that works: `motion:` compiles only to `parts[]` on the html layer, and a keyed x/y/scale track on the layer exists only in hand-written JSON and in the one `object_in`/`object_out` chain.
holds: quality/gates/motion-floor.mjs, harness/author/assemble.mjs, harness/lib/contract.mjs

## 620. A size rule measured one frame at a time and could not see fast motion
`frame-check`'s peak check rendered each fragment as a single still and compared the largest painted
object across beats, failing a film whenever the beat declared the peak did not hold the biggest object
(`peak-not-largest`) or barely led the next beat (`peak-barely-leads`). Fast motion legitimately shows a
small object for only a few frames: a browsing ring of films panned past several small cards in quick
succession, and the still-frame measurement forced the focused card to 92% of the frame to satisfy the
rule, killing the browsing feel the beat was going for. The rule was checking the wrong evidence: size
in one frame is not the same claim as loudness across the beat's whole span, which is carried by motion,
contrast or a camera move instead.
The fix is deletion, not a smarter measurement: the size check, its helpers, both codes, and the
`peak-not-largest` safeguards entry are gone. `weight: peak` still means one thing: the one loud moment,
carried by motion, contrast or a camera move, judged by eye rather than measured in pixels.
holds: none

## 626. A camera `travel`'s velocity-continuous tangent overshot below every authored station
`ease: "through"` (core/timeline/sequence.js, `tangentAt`) gives a `travel` station velocity-continuous
arrivals by fitting a chordal finite-difference tangent from each key's two neighbours. The tangent was
never clamped, and `core/camera-moves/travel.js` had already named the gap in a `ponytail:` comment
without a real film hitting it yet. One did: vawe-flow-2's camera (a local, gitignored scene) `travel` ends in
stations `s:1.08 -> s:1 -> s:1 -> ...`, all at or above 1. At authored time 11.22s the rig carried
`translate3d(0px, 0px, -8.95px)`, a scale BELOW every one of those stations, and the stage shrank enough
to show a 3-5px rim of ground around the frame.

The cause: the key shared by the unequal segment (1.08 -> 1) and the following flat one (1 -> 1) still
carries the unequal segment's nonzero tangent into the flat segment, bowing it below 1 even though both
its own endpoints equal 1 exactly. Measured on that station tail in isolation: worst sampled `s` was
0.9895 against an authored minimum of 1.

The fix: `tangentAt` is now Fritsch-Carlson clamped, the standard monotone-cubic constraint, applied per
key rather than as a second min/max clamp downstream of the curve. A tangent whose two neighbouring
secants disagree in sign (a real reversal) or where either secant is flat is zeroed; otherwise it is
scaled so the Hermite curve on neither neighbouring segment can leave that segment's own [min, max].
Re-measured on the same station tail: worst sampled `s` is exactly 1, no overshoot. `core/camera-moves/
travel.test.mjs` adds a test on this exact tail asserting the sampled scale never leaves the authored
[min, max] to within 1e-9, alongside the existing tests (interior stations stay `through`, velocity stays
continuous, the wider 2%-tolerance overshoot check) which still pass unchanged.
holds: core/timeline/sequence.js (tangentAt), core/camera-moves/travel.js, core/camera-moves/travel.test.mjs

## 629. `tempo` scaled every authored time except a sound CUE, because the comment excluding it was only half true
`core/engine/tempo.js`'s header justified skipping "audio" wholesale: "the mixer already trims or loops it to whatever window length it is given." True of a music BED, which stretches to fill its window. False of a CUE (`audio.cues[].t`), a point event pinned to one instant, the same shape as `transitions[].t`. On a film with `tempo: 0.85` (the flagship launch cut, gitignored like every film under `films/scene/`) every cue fired about 18% early: the logo chime landed at 14.66s, over two seconds before the mark it was meant to hit, because the scene stretched to 22.03s (1/0.85 of its 18.73s authored duration) and the cue's raw authored time never moved with it. The author worked around it by hand-computing compensated cue times in the film, which then had to be reverted once the engine fixed it, or the two corrections would have stacked.
The fix: added `audio.cues[].t` to `tempo.js`'s one scaling table (`AUDIO_CUE_TIME_KEYS`), the same place every other point-in-time key lives, and reworded the header to say "footage and the music BED are excluded" instead of "audio". The class: a comment that excludes a whole category to justify skipping one member of it stops being true the day someone adds a second member with different physics; grep for the other members before trusting the reasoning still covers all of them.
holds: core/engine/tempo.test.mjs

## 634. a bg window switch under a masking cut style always alpha-blended, because `bgCutAt` asked the one phase a masking style never writes to
`films/scene/scene.js`'s `bgCutAt` derived whether a cut "masks" (and should fall back to a plain crossfade rather than driving the blend off the wrapper's own opacity) by reading the OUTGOING wrapper's `exit` style, `cutStyle(cu.style, { exit: raw, enter: 1 }, opts)`. Every masking presentation in `core/cuts/presentations.js` (`wipe`/`iris`/`clock`/`barn`/`letterbox`/`blinds`/`softwipe`/`softiris`/`matchCut`) writes its `clipPath`/`maskImage` ONLY on `enter` (the incoming side reveals through a shape); its `exit` is a plain opacity fade, by design (the outgoing card simply clears). So `masked` was `false` for every one of these styles, on every film, always, and the bg blend fell back to the plain alpha crossfade every time, exactly the "still closer than a hard switch" compromise #577 already documented and accepted, but with `masked` never actually distinguishing the two cases it was written to distinguish. Under a real masking cut (e.g. `wipe`, white to cobalt) that produced a pale, muddy mid-transition tint (`#92b1f5` at p=0.5, alpha-blending two saturated colours in gamma space) instead of the hard shape reveal the author asked for.
The fix, in two parts. First, `bgCutAt` now reads the INCOMING wrapper's `enter` phase at the same raw progress `driveBeatUnits` itself uses (`cutStyle(cu.style, { exit: 0, enter: raw }, opts)`), so `masked` is finally true for the styles that are actually masking. Second, `applyCssClipPath` (`core/backgrounds/index.js`) parses that style's real `clipPath` string (`inset()`/`circle()`/`polygon()`, the only three this engine's presentations ever emit) into an actual canvas clip region, so a masking cut reveals the incoming bg window as a real clip with no blending at all; a `maskImage`-only style (`softwipe`/`softiris`/`blinds`, a feathered gradient band with no hard region to clip to) falls back to a hard cut at the fx's own midpoint instead of a continuous alpha blend, so the pale tint still never paints a frame.
holds: tests/backgrounds/clip-path.test.mjs
