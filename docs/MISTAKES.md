# MISTAKES.md — errors made authoring videos, and the fix for each

A permanent, append-only log so the same mistake is never made twice. Read this before authoring
a brand video. Each entry: **what went wrong · root cause · the fix (and which gate now catches it)**.

---

## 1. Built a DARK video for a WHITE site (taste inversion)

**What:** creed.md's site is bright white with a blue-sky hero; the first video was dark navy/gray.
**Root cause:** trusted a tool's `dominant: dark` heuristic instead of LOOKING at the hero. A heuristic
guessed a semantic ("is this brand light or dark?") that only eyes can judge.
**Fix:** dominance is decided by LOOKING, never by a field. `make palette` eyedrops the WHOLE page for
a grounded reading, then you confirm against the hero screenshot. `make beats VS=<brand>` stacks each
beat beside its source section — if the video doesn't read as the same brand, it fails there. Both are
mandatory in the planning skill. → **Gate: `make beats VS=<brand>` (fidelity), the eyeball.**

## 2. Patterned background on a PLAIN site

**What:** creed's hero used the `accent` preset, which draws ripple dots + a spotlight. The creed site
is totally plain (a flat blue field, a clean white body). The dots were invented texture the brand
never had.
**Root cause:** reached for a "nice looking" preset instead of matching the site's actual surface. A
plain site wants a plain field.
**Fix:** added the `accentPlain` preset (the brand accent as a clean gradient, grain only — no dots,
no spotlight). Match plain with plain. Rule: **the background's texture must exist on the real site.**
If the site is flat, use `plain` / `paper` / `accentPlain`. Only use a patterned preset
(`accent`/`dotmatrix`/`aurora`/`mesh`/`constellation`/`paperShapes`) if the site itself has that texture.

## 3. Patterned backgrounds SPAMMED across the whole video

**What:** when a patterned bg was used, it ran through most beats — the pattern became the wallpaper.
**Root cause:** treating the bg preset as a global constant, not a per-beat choice.
**Fix doctrine (taste rule):** a patterned bg is a SEASONING, not the wallpaper. Use it on at most one
or two beats — a hook or a single accent moment — never throughout. Content/proof beats stay plain so
the content reads. If every beat has the same texture, it's spam: pull it back to plain and let one
beat carry the pattern. (Wired into MOTION-CRAFT.md + the planning skill lock sheet.)

## 4. Used a stock image, untastefully

**What:** dropped a literal stock photo in as a bare full-bleed layer.
**Root cause:** an image with no treatment and no reason reads as slop; a mismatched photo is worse
than none.
**Fix:** prefer real captured UI (`make capture`) or a clean gradient over a generic photo. If an image
IS used, it must have a treatment (`ken`, `edgeFade`, clipped card + radius) and a reason traceable to
the site. A still, untreated, off-brand image fails the beats fidelity gate.

## 5. Sounds added before the audio system is real

**What:** `audio: {auto: true}` derived SFX (whooshes/hits) and a music bed onto videos before the
audio system was properly built — the sound was placeholder-quality and distracting.
**Root cause:** shipping a half-built subsystem on by default.
**Fix:** videos are **silent by default** (`audio: {silent: true}`) until the audio system is built
properly. Do NOT set `audio.auto` on any authored video for now. When audio is real, this entry gets
revised.

## 6. `group` primitive doesn't render image children (engine bug)

**What:** logos placed as `image` children inside a `group` rendered invisible.
**Root cause:** the group compositor doesn't walk image leaves (only text/rect). Known engine bug.
**Fix (workaround):** place logos as absolute `image` layers, not group children. **TODO (engine):**
make `group` render image children, then simplify the affected videos.

## 7. Logo colour invisible against the bg

**What:** white monochrome logos (anthropic/github/markdown) were invisible on the white content bg.
**Root cause:** grabbed the wrong monochrome variant for the surface.
**Fix:** keep both variants in `assets/icons/` — light (`#f3f3f0`) for dark bgs, `-dark`
(`#0e0e0d`) for white bgs — and pick by the beat's background. (A dark logo on white, a light logo on
blue.)

## 8. A non-existent bg preset failed loud with no hint

**What:** used `deep` as a bg preset before it existed; boot failed with a bare "unknown preset".
**Root cause:** no "did you mean" and the preset genuinely didn't exist.
**Fix:** added `deep`/`dark`/`accentPlain` as real presets, plus a Levenshtein "Did you mean 'x'?"
suggestion in `scripts/validate.mjs` for enum typos. Doctrine: when a default doesn't fit, CREATE or
customize a preset — don't force a wrong default.

## 9. `<b>` emphasis invisible on an accent-coloured background (blue-on-blue)

**What:** on creed's blue payoff beats, the emphasised words ("from scratch.") rendered in the accent
blue — the same colour as the background — so they vanished.
**Root cause (foundation):** `.hs-text b { color: var(--em, var(--accent)); }` force-coloured every `<b>`
with the brand accent, with no awareness that the bg WAS that accent. First fix attempt set
`--em: inherit`, which made it worse: on a CSS custom property, `inherit` resolves to the
guaranteed-invalid value, so `var(--em, …)` fell straight back to `var(--accent)` — still blue.
**Fix:** `styleText` now sets `--em` per layer to a REAL colour: the brand accent over normal bgs (the
pop is preserved on white), but the layer's OWN colour over an accent-coloured bg
(`accent`/`accentPlain`/`brandglow`) so emphasis is bold-but-visible, never invisible. Authors can
override with a per-layer `emColor`. Lesson: **never set a CSS custom property to the keyword `inherit`
as a "use the parent colour" trick — it invalidates the var and triggers the fallback.**
**Now gated:** `make audit` inspects `<b>`/`<em>` sub-span colour vs the bg (not just the layer's top
colour) and hard-fails a colour ≈ its background; `make audit-test` (fixture `verify/fixtures/
emphasis-contrast.json`) proves the check still catches it. This class can no longer ship silently.

## 10. Headline rendered in the generic sans (theme font silently not loaded)

**What:** the creed video's headlines looked like a generic sans, not the theme's Geist.
**Root cause:** `boot()` awaited a HARDCODED font-preload list, and Geist (the sans) wasn't in it (Geist
*Mono* was). With `font-display: block`, a face that isn't loaded before the first frame falls back to
the generic `Hanken Grotesk` / system sans. The list is easy to forget when a new face is added.
**Fix:** two layers — (1) added Geist (+ Hanken) to the static list; (2) `boot()` now ALSO loads the
fonts the THEME declares (`theme.type.{sans,serif,mono,num}`) at every weight, so a brand's face can
never be silently swapped again ("load what you use", like another engine's per-font render-blocking handle).
Verify a face is really rendering: `document.fonts.check("800 100px '<Face>'")` in a headless boot.
**Lesson:** if a headline looks generic, first check the face is actually LOADED, not just referenced.

## 11. Guessed the type weight + eyedropped the wrong accent (didn't read the CSS)

**What:** creed's headline shipped at weight 800 (chunky) when the site is **600**; the accent was the
sky-photo blue `#0575f0` when the brand's real accent is `#2563eb`. Also `<b>` emphasis rendered heavier
than its own line (UA bold 700 on a 600 layer).
**Root cause:** authored type/colour from *guesses and pixels*, not the site's declared CSS. Eyedrop reads
rendered pixels — great for dominance, but it sampled the hero *photo*, not the UI accent token; and no tool
measured the real font weights, so "big headline = 800" was a guess.
**Fix (framework):** (1) `make brandspec URL=…` reads the CSS + computed styles → the 1-3 real faces with
their actual weights (→ primary/secondary/accent), the `--color-*`/`--font-*` tokens, and WCAG contrast.
Run it BEFORE authoring a theme. (2) `.hs-text b` now `font-weight: inherit` — emphasis is recolour-only,
never a stray bold. (3) TYPOGRAPHY.md §0/§0b: measure-first + the 1-3 font-role system.
**Lesson:** for anything DECLARED (font family/weight, brand colour, radius), **read the CSS**; use pixels
(eyedrop) only for what isn't declared (dominance, a photo's colour).

---

## 12. Text "shaking" — captured at 1×, no anti-alias headroom
**What happened:** text shimmered/crawled frame-to-frame, worst under camera moves and per-word kinetic
reveals. I first "fixed" it by STRIPPING the effects (camera, stings, splits) — wrong trade; the video
went lifeless.
**Root cause:** the renderer captured at `force-device-scale-factor: 1`. The moment any transform lands
text on a fractional pixel there is no AA headroom to absorb it, so it crawls.
**Fix (framework):** `internal/scene/scene.go` now captures at **2× and box-resolves to native 1080p**
(`downsample` = exact SSAA); draft stays 1×. Sub-pixel jitter averages out → crisp text UNDER motion, so
effects stay. Verified: held-text churn 73dB (was visibly shimmering).
**Lesson:** fix a rendering artefact at the RENDER layer, never by deleting the design. Supersample.

## 13. Cursor click missed the button (base-offset footgun)
**What happened:** a `cursor` `path` ending on the Accept button rendered ~(60,240) px off — the click
fired in empty space.
**Root cause:** scene.html defaults every layer to `x:60,y:240`; the cursor `frame` ADDS the path coords
to that base, so path was silently offset.
**Fix (framework):** `core/layers/cursor.js` anchors the base at (0,0) when no x/y is authored → `path` is
absolute screen px by default (explicit x/y still makes it relative). Schema label documents it.

## 14. Silent authoring bugs the schema couldn't catch → `lintData` (make lint-test)
Three bugs shipped in renders and passed every gate; each is now a `validate` warning (fail with
`--strict`), pinned by `make lint-test`:
- **missing `duration`** → a layer renders for the WHOLE video (a "+" gutter leaked 53s).
- **`typing` + `<b>/<em>`** → typing reveals characters literally, so tags show as text.
- **scene collision** → two content layers overlapping in space AND time (one scene bled into the next).
**Lesson:** when a bug slips every gate, add the cheap deterministic gate that would have caught it.

---

## 15. Authored from imagination + hand-math instead of the real asset + the composition tools (argus)

**What:** three flaws shipped in the first argus pass: (a) the pixel-eye **mascot was recreated from
memory** (a made-up almond) when the real one is a moth-eye creature with antennae + a spiral iris — I had
it in the captured hero and never traced it; (b) the CTA **headline wasn't centred** — I hand-computed `x`
and gave it `w` with **no `align`**, so text left-aligned in its box; (c) the **hand-underline missed its
word** — I hardcoded `x` guessing where "purpose" would render.
**Root cause:** I placed things by *imagination and arithmetic* instead of by the **real reference** and the
**composition tools that exist for this**. And worse — when I eyeballed the frames I *noticed* the flaws and
rationalized them ("reads as the signature, could nudge") instead of fixing them. The static gates
(validate/critique/slop) can't SEE composition or asset fidelity, so my eye was the only gate and it blinked.
**Fix (framework + discipline):**
- **Assets: capture, never recreate.** If the brand has a mark/mascot/illustration, `make capture` it or
  crop it from the section screenshot (transparent it if needed) and use an `image` layer. Recreating a
  brand asset from memory is off-brand by definition.
- **Placement: use `pin`/`col`/`align`, never eyeballed `x`.** `pin:"center"` (optical) centres a hero;
  a text layer with `w` MUST set `align` or it left-aligns in its box. `critique` now warns on a big text
  layer with `w` and no `align` (the mis-centre tell).
- **Annotations bind to their target.** An underline/marker under a word belongs in the SAME element as the
  word (an html layer, underline absolutely-positioned under the span) or anchored to it — never a blind `x`.
- **Fix flaws, don't rationalize them.** "Renders + passes the gates" ≠ done. If the eye catches it, fix it.
**Lesson:** the gates check hollowness and slop; they don't check *taste*. Until the vision-judge exists,
YOUR eye is the composition/fidelity gate — capture real assets, place with the tools, and never ship a flaw
you already noticed. (This is the concrete case for building the vision judge, #1 on the taste roadmap.)

---

## 16. The SITE cropped the videos it was selling (`object-fit: cover`)

**What went wrong:** every `<video>` on the marketing site used `object-fit:cover`, so any clip whose
container ratio didn't match its file got cropped. The homepage gallery's hero clip lost ~28% of its
width. Worst: the showcase's "any aspect" row — whose entire claim is *one source renders 16:9, 9:16,
1:1* — stretched all three into equal-height flex boxes and cropped each one. The feature was refuted
by its own demo.
**Root cause:** `cover` is the reflex default for images, where cropping a photo is harmless. A video
out of this engine is a **composed frame** — every coordinate was placed by the layout gates against a
known safe box. Cropping it throws away the composition the renderer just proved correct.
**The fix:** `object-fit:contain` on every video, and containers carry the video's TRUE ratio. For the
aspect trio, each box's `flex-grow` is set to its own ratio (1.778 / 0.563 / 1.0) so widths scale to
the container and heights land equal automatically — the shapes ARE the demo.
**The rule: never crop a rendered frame downstream.** If a box and a clip disagree on shape, the box
is wrong. Verify by measuring, not squinting: compare `videoWidth/videoHeight` to the rendered
`getBoundingClientRect()` ratio and assert the mismatch is ~0.

## 17. Widening a gate to "everything" made it flag decoration (safe-zone false positives)

**What went wrong:** the safe-zone/overflow checks were widened from `[data-layer=critical]` to every
`.hs-layer` (so a corner watermark would be caught). That immediately hard-failed three of four films —
and **not one hit was real**: stripe's blurred gradient blob (`y:-360`, meant to bleed), linear's `glow`
bloom, creed's 4px hairline rule.
**Root cause:** the widening assumed every layer is content. Decoration routinely leaves the frame *by
design* — that's what makes it decoration.
**The fix:** the safe box governs **legible content**, so a layer only earns the check when it carries a
text node or an image (`carriesContent()` in `verify/audit.mjs`). Scoping back to `critical` would have
been the wrong fix — it would undo the widening and re-hide the watermark case.
**The rule: when a widened gate fires, triage before you fix.** Ask of each hit "what IS this element?"
The right discriminator is usually a property of the thing (does it carry content?), not the label
someone gave it (`critical: true/false`). A gate that cries wolf on decoration gets ignored, and then
it catches nothing. Removing the noise here also **surfaced a real hit** that had been hiding behind
linear's glow.

## 18. Six scenes couldn't reproduce their own video (`aspect` lived in the CLI, not the JSON)

**What went wrong:** re-rendering `showcase-{type,cuts,stings,data,ui}` + `hero-site` straight from their
JSON produced **portrait 1080×1920** videos, which then overwrote the site's landscape assets. Every step
reported success.
**Root cause:** those scenes are authored for landscape (`showcase-data` puts a stat at `x:1330`, off-frame
in a 1080-wide portrait) but declared **no `aspect` and no `orientation`**. The landscape renders only ever
existed because a human passed `--aspect 16:9` on the command line. The shape lived in shell history, so
the JSON was not self-describing — the whole premise is *one JSON → one video*, and these needed a JSON
plus a flag someone had to remember.
**The fix:** `"aspect": "16:9"` is now IN each scene. Plus a guard: `scripts/site-assets.mjs` records the
ratio the site layout expects per asset and refuses to encode a render whose real shape disagrees (>1%).
`showcase-aspect` — the one scene that legitimately renders three ratios — declares its multi-aspect
render in the manifest instead.
**The rule: if a render needs a flag to come out right, that flag belongs in the data.** Anything the JSON
can't reproduce alone will eventually be regenerated wrong by someone who didn't know the incantation.
Corollary: a build step that transforms media must **assert the shape it expects**, because a wrong-shaped
video encodes perfectly happily and ships looking fine to every check that only asks "did ffmpeg exit 0?"

---

## Tool-accuracy note (see also: the survey in chat)

Tools are accurate for MECHANICAL/precise data (exact hexes, geometry, pixel histograms) and unreliable
for SEMANTIC judgment (dominance, which colour is text vs accent, what the hero means, is it plain or
patterned). Rule: **use tools to measure, use your eyes to judge.** Specifically:
- `make palette` — TRUST its dominance/bg/accent hexes; DON'T trust its `text` colour (thin strokes
  blend to gray). Read the body-text colour off the screenshot yourself.
- Any "what does this section mean / which is the hero / plain or textured" question — LOOK, don't infer
  from a script. That is exactly what mistakes #1 and #2 came from.

---

## 19. `radius` on an image was silently ignored unless `ken` was set (engine bug)

**What:** tpot.cc's entire visual identity is CIRCULAR avatars. Every avatar layer was authored with
`radius: d/2` and every one rendered as a hard square. Nothing warned.
**Root cause:** `core/layers/image.js` applied `borderRadius` only inside `if (L.ken)`. A plain image
accepted `radius` and threw it away. The schema label even said "Corner radius (rect/ken-image)", so
the engine was documented-wrong rather than obviously-wrong.
**Fix:** radius now clips ANY image (`L.ken || L.radius != null`), and brings `object-fit: cover` with
it so a non-square source fills the shape instead of distorting. The workaround this replaced —
`ken:{from:1,to:1}` purely to unlock a border-radius — was itself the bug report.
**Gate:** `make audit` cannot see "should have been round". The real guard is the rule: any prop the
engine ACCEPTS must either work or fail loudly. Silent ignore is never acceptable.

---

## 20. Captured components pointed at REMOTE images → blank cards in an offline render

**What:** the tpot Moments card (3 avatars) and Events card (hero banner) rendered empty. The scene
looked fine in the capture preview and broke in the actual video.
**Root cause:** `capture-component.mjs` absolutizes `<img src>` against the live site. That makes the
component depend on the NETWORK at render time; headless render 404s and paints nothing. It also
breaks determinism — the same JSON renders differently depending on whether the site is reachable.
**Fix:** capture now LOCALIZES every remote asset into `components/media/` and rewrites the html to
local paths. Anything it cannot fetch is a loud warning naming the URL.
**Gate:** a component is only self-contained if it renders with the network off. If you see a blank
card, check `brokenImgs` before touching layout.

---

## 21. Schema advertised an anim name that does not exist (`slideL`)

**What:** authored `anim:"slide"` + `from:"left"`, guided by the schema label
`"driveClips enter anim (fade/rise/pop/slideL/...)"`. Validation then failed with
`layers[81].from must be a number` — an error about `from` (a *count* prop), never mentioning that
`slide` is not a real anim and `slideL` does not exist either.
**Root cause:** the label was written from memory, not from `core/clips.js`'s ANIM registry. The real
names are `slide-left`/`slide-right`/`slide-up`/`slide-down`; direction is part of the NAME, not a
separate prop. Unknown anim names silently `resolveAnim() -> fade`.
**Fix:** the schema now carries the exact enum from the registry and states that unknown names fall
back to fade silently.
**Rule:** a prop label is documentation. If it lists names, they must be copied from the code that
resolves them, never recalled.

---

## 22. Fonts substituted silently — twice — because the load list was hand-maintained

**What:** Anybody (vawe) and Manrope (tpot) both rendered in a generic sans. Third occurrence of the
same class after Geist.
**Root cause:** `core/boot.js` held a HARDCODED `FACES` array. Vendoring a font required also
remembering to add it there; nobody remembers a hardcoded list. Worse, `assets/fonts/` is gitignored
and self-heals via `make fonts`, so a face that was never added to `scripts/media/fonts.mjs` simply
vanished on a fresh clone.
**Fix:** (1) the load set is now DERIVED from the `@font-face` rules in the CSS (`core/fonts.js`),
so vendoring is the only step; (2) `make font-audit` fails the build on any family that is not
vendored + loaded + painting.
**Do NOT use `document.fonts.check()`** for this — measured in headless Chrome it returns `true` for a
family that does not exist and `false` for a registered-but-unloaded one. The reliable probe is width
comparison against three generics (all-equal = the family resolved), plus an `@font-face` registration
check to catch the nastiest case: a font that paints only because it is installed on THIS machine
(`SYSTEM-LUCK`) and falls back everywhere else.
**Gate:** `make font-audit D=<file>` → `out/<name>.fonts.json`, exits 1 on FALLBACK / SYSTEM-LUCK / BROKEN.

---

## 23. Auto sound-design ignored the `cuts` array (so a scored film was silent at every cut)

**What:** `audio:{auto:true}` produced no cut cues. The film cut five times and none of them made a sound.
**Root cause:** the builder derived cues from LAYER-level `L.cut` and from `stings` only. The top-level
`cuts` array — which is how a scene actually cuts between beats — was never read.
**Fix:** `cuts` are now a cue source, and the mapping is style-aware (`CUT_CUE`): a `punch` snaps
(`press`), a `softwipe` breathes (`whisper`), a `rise` blooms. One whoosh on everything is not sound
design. Authors can also place cues directly with `audio.cues:[{t,name,gain}]`.

---

## 24. A group image child silently dropped `radius` (same bug as #19, one level down)

**What:** avatars that were perfect circles as top-level layers turned back into squares the moment
they were moved inside a `group` to save layer budget.
**Root cause:** `addGroupChild` honoured every image prop except `radius`. Fixing #19 in
`core/layers/image.js` did nothing for group children, which take a completely separate code path.
**Fix:** group image children clip too, with cover-fit when both `w` and `h` are given.
**Rule:** when you fix "a prop is silently ignored", grep for EVERY path that builds that primitive.
A primitive with two constructors has two places to forget.

---

## 25. The layout audit called a cross-dissolve a collision

**What:** morphing a headline between two states (A fading out while B fades in, same box) tripped a
HARD `overlap` failure, which would have made dissolves unusable engine-wide.
**Root cause:** the overlap rule compared boxes with no notion of time or opacity. Two boxes in the
same place is normally a bug; during a hand-off it is the technique working.
**Fix:** overlap is skipped only for a genuine hand-off — one layer inside its exit window, the other
inside its enter window, and BOTH below full opacity. Two solid overlapping layers still hard-fail
(regression-tested with a fixture).
**Related:** #17. A gate widened without a notion of intent starts flagging correct work.

---

## 26. Two more silent-ignore traps found while auditing the first one

**`b.height > 1` skipped collapsed images.** The image legibility floor only considered images
TALLER than 1px, so an image that laid out at zero — visible layer, no pixels — was the one case it
could never report. Now a HARD `collapsed-image`, measured on the LAYOUT box (`offsetWidth/Height`)
rather than the painted rect, so an image mid-`scale` entry is not a false positive.

**`document.fonts.check()` was still used in `core/layers/text.js`.** Same inverted API as #22: it
returns true for a family that does not exist and false for a registered-but-unloaded one, so the
auto-fit warning fired on healthy fonts and stayed quiet on missing ones. Replaced with
`isPainting()` from `core/fonts.js`.

**Discipline note — do not claim a regression you have not reproduced.** While guarding the #19 fix
I asserted that forcing `height:100%` "would collapse the argus mascot to zero". It does not: the
mascot measures 268px with and without the guard. The guard is still correct (cover-fit is meaningless
without a box) but the justification was invented. Measure the claim, then make it.

---

## 27. Sound was a downloaded sample library, not part of the framework

**What:** every cue came from Mixkit over the network, into a gitignored folder, with per-file
licensing to track.
**Fix:** `core/audio-kit.mjs` — the engine now SYNTHESIZES its own audio: oscillators, seeded noise,
RBJ biquads, envelopes, a feedback-delay shimmer, a WAV writer, and a parameterized music-bed
generator. `make audio` bakes every cue + bed. Cue voicings are ported from Cuelume (MIT © Daniel
White); the DSP is ours because Web Audio does not exist in a build step.
**Why it matters:** a cue is now a pure function of its spec + seed, so the same JSON always scores
the same mix (asserted in `make lib-test`), there is nothing to license, and a fresh clone needs no
network. **Gotcha:** Cuelume's `peak` values are Web Audio UI gains and bake out at -25..-40 dBFS,
inaudible under a bed — every cue is peak-normalized to a common ceiling and balance is left to the
mixer's per-cue gain, which is where balance belongs.

---

## 28. `tracking` was applied and then overwritten one statement later

**What:** every text layer that set `tracking` rendered with automatic optical tracking instead.
12 shipped scenes are affected.
**Root cause:** the schema declares TWO synonyms for one CSS property — `ls` and `tracking`, both
labelled "Letter-spacing". `styleText` applied the author's `tracking`, then `microType` ran and
overwrote `letterSpacing` because its guard named only `L.ls`. So the value was accepted, applied,
and discarded within the same build.
**Fix:** the guard now honours both names.
**Found by:** `make conformance` (phase 2) — not by reading the code, which looks correct at both sites.

---

## 29. The `cuts` array renders NOTHING (the engine's largest silent-ignore)

**What:** `formats/scene/schema.json:127` declares `cuts` — "Hard cuts between beats (timing x
presentation, from core/cuts.js)" — with 26 presentation styles, directions and timings. Authors use
it: 12 shipped scenes carry a top-level `cuts` array, including the tpot launch film and the
showcase. **None of those cuts produce any visual transition.**
**Root cause:** `formats/scene/scene.html:235` applies `cutStyle()` only for the LAYER-level prop
`L.cut`. The top-level `data.cuts` array is read in exactly one place in the whole engine — the auto
sound-design block — and never reaches the renderer. The vocabulary, the schema entry and
`core/cuts.js` itself are all real; only the wiring between them is missing.
**Why nobody noticed:** beats still change on time because each beat's layers have their own
start/duration windows. The scene LOOKS like it cut; what is missing is the transition treatment, and
you cannot miss a softwipe you have never seen.
**Fix:** scene cuts now render. A cut treats the beat LEAVING as an exit and the beat ARRIVING as an
enter, applied to the camera root (`#cam`) so the whole beat moves as one. The camera already owns
`cam.style.transform`, so the cut transform is COMPOSED with it rather than overwriting it. Purity is
safe because `cutStyle` always returns the full style set — the no-cut branch asks for that identity
explicitly, so nothing written during a cut can stick into a later frame in any render order. An
unknown style is now a loud build error instead of a silent fall back to `fade`.
**Found by:** `make conformance` (phase 1): all 25 cut styles rendered byte-identical to no-cut. After
the fix: 25/25 distinct.

**What the fix then exposed (authoring, not engine):** beats had been authored back-to-back with a
small GAP at each boundary. That was invisible while cuts rendered nothing, and became a blank frame
the moment a cut treated the boundary. Two consequences: the default cut window is short (0.36s total)
because a beat's layers already animate themselves in and out, and a scene's beats must OVERLAP their
cut rather than meet at it. A transition needs something on both sides of it.

---

## Method note — how conformance findings must be triaged

The first conformance run reported 13 inert props; 10 were the harness's fault, not the engine's:
`opacity`/`scale`/`rotate` are CAMERA-KEYFRAME props (schema:858-871, `core/sequence.js:26`), never
layer props; `look` is not a prop at all (composite looks ride on `filter`, `core/layers/util.js:71`);
`text.radius`/`pad` are conditional on `bg` by design. A second run reported 20 dead looks — because
the look names had been typed from memory again, the same mistake as #21.

Two rules came out of that, both now enforced in the harness:
1. **Derive vocabulary from the registries, never restate it.** The sweep imports `ANIM_NAMES`,
   `PRESETS`, `LOOK_NAMES`, `CANVAS_FX_NAMES`. A hand-typed list in a gate drifts from the code and
   then the gate certifies the drift.
2. **The default value of a vocabulary is identical to the baseline by definition** — `fade` for
   anim, `up` for preset. Naming them stops one guaranteed false finding per category, forever.
An allowlist entry must carry a REASON, never a bare name, or it becomes the place bugs hide.

