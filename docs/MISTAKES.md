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

---

## 30. Synthesized cues sounded like buzzing; music now comes from real recordings

**What:** the ported Cuelume voicings (#27) were correct DSP and unpleasant audio — thin sine/noise
blips that read as buzzing under picture.
**Fix:** deleted the generated cues, restored the recorded Mixkit sfx library, and added
`make music` to fetch a real soundtrack. Synthesis is still the right tool for a deterministic
*test* tone; it was the wrong tool for something a person listens to.
**Licensing:** `assets/music/` is gitignored, so the repo never REDISTRIBUTES a track — the main
licence risk. Provenance (id, source, licence URL) is recorded in `assets/music/credits.json`, and
the fetcher prints that the Mixkit **music** licence is separate from the sfx one and could NOT be
read programmatically (it renders client-side). Confirm before publishing commercially.

---

## 31. A hand-typed enum in the schema rejected a valid new value within minutes

**What:** adding the `lift` entrance to `core/clips.js` made `make validate` reject every layer using
it — the schema's anim enum was a hand-typed copy of the registry.
**Root cause:** the same copy that once advertised `slideL`, an anim that never existed (#21). A copy
drifts in BOTH directions: it can name something that does not exist, and it can miss something that
does.
**Fix:** `make schema-check` now asserts the schema's anim enum EQUALS `ANIM_NAMES` from
`core/clips.js`, and fails loudly with both sets printed when they diverge.
**Rule:** if a gate or a schema restates a list the code owns, it will eventually certify a lie.
Derive it, or assert equality with the source.

---

## 32. Beat matching: build the edit ON the music, do not drag cuts onto it

**What:** snapping existing cut times to the nearest beat did nothing useful — at 77 BPM the bars are
3.11s apart, so the nearest beat was often half a second away from the intended edit point.
**The fix that worked:** derive the beat boundaries FROM the grid instead. Every beat in the tpot film
is now an exact beat index of `assets/music/launch.wav`, so the structure is musical by construction
rather than nudged toward musical.
**Guard kept anyway:** `snapToBeat` refuses to move a cut further than `maxShift` (0.12s default).
Silently dragging an edit a third of a second to hit a beat destroys the timing the author wrote —
a beat-matched video that ignores intent is not better, just differently wrong.
**Honesty:** `estimateTempo` returns a `confidence`, and an ambient pad scores ~1.35 against ~7.4 for
a track with a real pulse. The detector says "WEAK — do not snap to this" rather than inventing a
grid. Verified against a synthetic 120 BPM click track in `make lib-test`.

---

## 33. Who checks the checkers — `make gate-test`

The image legibility floor guarded on `b.height > 1`, so the ONE case it existed to catch — an image
occupying no space — was the one case it skipped (#26). Nothing noticed, because **a gate being quiet
looks exactly like a gate being satisfied.**

`make gate-test` mutation-tests the gates: each is fed a fixture built to trip it, and must SPEAK.
The mirror cases matter as much — fixtures that must PASS, so a gate cannot buy sensitivity by crying
wolf, which is what briefly made the layout audit call every cross-dissolve a collision (#25).
Two of the eleven cases can only be tested by breaking the thing the gate guards, so they mutate the
SOURCE (remove an `@font-face`, drift the anim enum) and restore it in a `finally`-shaped path.

Current: 11/11 — overlap, contrast, safe-zone, tiny-text, clean-scene, cross-dissolve, unknown anim,
unknown cut style, valid scene, font fallback, enum drift.

---

## 34. Coverage — conformance proves it works, this asks if anything uses it

`make coverage` reports which vocabulary no authored scene exercises. Unused vocabulary is where
regressions live undetected: nothing renders it, so no screenshot shows it and no gate misses it.
The audio path had zero coverage of both kinds, which is exactly why the `cuts` array produced no
sound for as long as it existed (#23).

First run across 59 scenes: kinetic presets 100%, composite looks 100%, canvas fx 100%, layer types
93%, shader stings 85%, enter anims 64%, **cut styles 38%**. That last number is only meaningful
*because* cuts now render — before #29 it would have been a lie in either direction.

WARN tier by design (always exits 0): a brand-new effect is legitimately unused on the day it lands.

**The report had to be fixed before it was trustworthy**, the same lesson as the conformance triage:
its first run claimed `t`, `dur`, `style` and `timing` were unused props. They are used constantly —
on `cuts`/`stings`/`bg` items, which the collector never walked. A coverage report that cries wolf
gets ignored exactly like a gate that does.

---

## 35. Descenders were sliced off every `riseClip` word (shipped, in every scene using it)

**What:** g, y, p rendered with flat bottoms — "coverin_g everythin_g" cut through the tails. Visible
in shipped video across 11 scenes.
**Root cause:** two correct-looking decisions that are wrong together.
`core/type.js` wraps each `riseClip` word in a span with `overflow: hidden` so the word can rise out
from behind a mask. `.hs-text` sets `line-height: 1.04`. A 1.04 line box is TIGHTER than the ink
extent of any real face, so the mask was smaller than the glyphs it contained: measured at 76px,
`clientHeight` 79 against `scrollHeight` 92 — **13px sliced off every word**, whether or not it had a
descender.
**Fix (root, not per-scene):** the mask now carries `padding-bottom: 0.3em` with a matching
`margin-bottom: -0.3em`, so the clip region grows to hold the full ink while the layout does not move
a pixel. And `dist` became a PERCENTAGE of the unit's own height instead of 44px: 44px is a different
fraction of a 40px caption than of a 150px headline, so at large sizes the word was already half
visible at u=0 and the mask read as a smudge rather than an edge.
**Gate so it can never ship again:** `clipped-text` (HARD) in `make audit` — any masked, text-bearing
element whose ink exceeds its clip box. The existing `overflow` rule could not see this: it only
inspected top-level and `[data-layer=critical]` elements, and the mask is a span NESTED inside the
text layer. Mutation-tested in `make gate-test` (12/12).

**Two mistakes made while fixing it, both worth keeping:**
1. *"Transforms don't affect scroll metrics"* — false. A transformed descendant contributes to its
   ancestor's scrollable overflow, so mid-rise every masked word reports a huge `scrollHeight`. The
   first version of the gate confidently flagged the very fix that removed the real clipping. The
   check now measures only when the word is AT REST.
2. The lib-test assertion pinned the literal string `(0.00px)`, so it failed the moment the unit was
   corrected — while saying nothing about whether the preset actually lands at identity. Assert the
   INVARIANT (the translate value is 0; travel is in %; u=0 is fully behind the mask), never the
   formatting.

---

## 36. Fixing cuts made the safe-zone gate fire on every cut

**What:** the first render of the coverage reel failed with 2 HARD safe-zone violations — text measured
at `x=-88` when it was authored at `x=140`.
**Root cause:** a scene cut displaces the whole CAMERA for the length of its window, so mid-cut every
layer is legitimately off its mark, including outside the safe box. The audit already understood that
a layer mid-entrance is intentionally out of position (`midMove`), but it knew nothing about cuts —
because until an hour earlier the `cuts` array rendered nothing at all (#29). The moment cuts started
moving the camera, a cut in flight read as a safe-zone breach.
**Fix:** the audit now receives the cut windows and skips positional checks inside them, mirroring
`scene.html`'s own filter (`none` excluded, `dur` split evenly around `t`). The must-fail
safe-zone mutation case still passes, so the rule did not go soft.
**The general lesson:** turning on a dormant feature does not just add behaviour, it changes the
assumptions every gate was written under. When something starts rendering for the first time, re-run
the whole ladder against a scene that uses it hard — which is exactly what the coverage reel is for.

---

## 37. `make coverage-reel` — renders whatever nothing else renders

Conformance proves a value changes the frame; coverage says nothing USES it. Neither says it LOOKS
right, and the descender bug (#35) was a real effect doing real work while slicing the glyphs.

`make coverage-reel` generates a reel from the LIVE coverage gap — add an effect and it is in the reel
with no edit — then renders it. First run moved enter anims 64% -> 100%, cut styles 38% -> 96% and
shader stings 85% -> 100%, and immediately surfaced #36.

Cut styles stop at 25/26 on purpose: `none` is a documented no-op the builder filters before the
renderer sees it. Listing it would make the reel look permanently incomplete for no reason.

**Pacing — the first cut of the reel was unwatchable and the reason is general.** At 1.15s per style
each boundary stacked THREE overlapping events: the outgoing label lingering 0.26s past the cut, the
incoming label entering, and the camera mid-cut. You could not tell which transition you were looking
at. Two fixes, both worth reusing in any demo:
1. **A hold.** 1.9s per beat, so ~1.3s where the subject sits still and alone. A transition is only
   legible against something at rest.
2. **No cross-dissolve between labels.** The outgoing label now ends EXACTLY at the next cut, so one
   name is ever on screen. Dissolving two big words together is precisely what read as "mixed" — the
   cut still has content on both sides of it, which is the part worth seeing.

**The `clip` hole.** `clip` was the last uncovered primitive and needs an actual video. Rather than
commit one, the generator SYNTHESIZES it — an ffmpeg gradient in the engine's palette, decomposed to
the deterministic PNG frame sequence the layer plays — so `assets/gen/` stays gitignored and a fresh
clone self-heals, exactly like fonts, sfx and music. Verified by hashing three frames a second apart:
a frozen poster and a playing clip look identical in a single screenshot.

---

## 38. Every fade in the engine was linear (and the obvious fix broke cross-dissolves)

**What:** entrances and exits felt slightly wrong in a way that is hard to point at.
**Root cause:** `core/clips.js` composed opacity as `clamp01(enterT) * exitMul` — **two linear ramps**
— while the transform beside it was eased (`rise` settles on `easeOutSettle`). The two halves of a
single entrance therefore arrived on different curves. `docs/MOTION-CRAFT.md` has said "entrances
decelerate, exits accelerate, never linear on visible moves" the whole time; the engine simply did
not do it, and no gate could see it because a linear fade is not a defect, just a dull one.

**The first fix was wrong, and measuring caught it.** Easing the two halves independently —
`easeOutCubic` in, `1 - easeInCubic` out — is the textbook answer and it BREAKS handoffs: two layers
sharing the same pixels then both sit high through the middle of the blend. Measured across tpot's
This/Tech handoff, the opacity sum peaked at **1.71** where linear had held 1.00. The dissolve went
muddy — the exact problem the coverage reel had just been repaced to avoid.

**The right fix:** the exit curve is the MIRROR of the entrance curve (`1 - easeOutCubic`), not an
independent one. A matched handoff then sums to exactly 1 at every instant, so density stays
constant, while a solo fade still eases instead of ramping. Re-measured: 1.00 flat across the handoff.

**Locked in `make lib-test`:** the envelope is exported as `opacityEnvelope(enterT, exitT)` and
asserted on both properties — non-linear, monotonic, endpoints exact, and `leaving + arriving === 1`
for every t. The invariant is the point; anyone re-easing one side alone will fail that assert.

**The general lesson:** a curve is not a local decision. Entrance and exit easing look independent
and are not, because layers hand over the same pixels. When changing a curve, measure the SUM across
a real handoff, not the shape of one side.

---

## 39. `make snap` reported IDENTICAL after every fade curve in the engine changed

**What:** re-easing the opacity envelope (#38) altered every fade in every scene. `make snap`, whose
whole job is "prove the rendered frames are unchanged", diffed it as nothing at all.
**Root cause — two, and the second is worse:**
1. It sampled **20 evenly spaced frames**. Transition windows are 0.3-0.6s, so an even grid lands
   almost entirely in steady state. The gate was measuring the parts of the timeline where nothing
   happens.
2. Opacity was stored rounded to 1 decimal and compared with a **shared 0.6 tolerance**. That
   threshold is sane for a pixel box and meaningless on a 0..1 scale: it took a >60% opacity change
   to register. Even had it sampled the right frames, it would still have seen nothing.
**Fix:** frames are now derived from where the motion IS — mid-entrance and mid-exit of every layer,
read from the same `data-*` attributes `driveClips` uses, plus cut windows and stings, plus the even
spread for general coverage. Tolerance is per field: 0.02 for opacity, 0.6 for geometry.
**Proof, not assertion:** reverting the easing now produces
`f97 hs-layer.opacity: 0.296 → 0.667`, where the old gate printed IDENTICAL. Locked as a mutation
case in `make gate-test` (13/13).

**A gate can speak without exiting non-zero.** snap is a review tool — an intended change is still a
change — so it reports and exits 0 on purpose. The mutation harness now supports asserting on OUTPUT
alone for exactly that shape of gate, rather than forcing every gate to be pass/fail.

**The pattern across #26, #35, #38 and this one:** a gate's blind spot is never in the rule it
states, it is in the sampling or the tolerance underneath it. `b.height > 1` skipped zero-height
images; the overflow rule never descended into nested masks; this one measured the quiet parts of
the timeline with a threshold nothing could cross. Ask what a gate CANNOT see, not what it checks.

---

## 40. Every directional exit in the engine ran backwards

**What:** `out:"slide-up"` made the layer TELEPORT to its offset the instant the exit began, then
slide back to rest while fading. Every directional exit, in every scene using one (5 of them).
**Root cause:** `asExit = (fn, t) => fn(1 - t)` was called with `exitMul` (already `1 - exitT`), so the
two inversions cancelled and the entrance played FORWARDS. Measured: `out:"slide-up"` gave
`translate(0,-60px)` at exit start and `translate(0,0)` at exit end — exactly inverted.
**Fix:** pass `exitT`. Verified: 0 offset at the start, full offset at the end.
**Why no gate saw it:** nothing asserts the DIRECTION of motion, only that frames are pure and boxes
are in-bounds. An exit that animates the wrong way is perfectly deterministic and perfectly in-frame.

---

## 41. A blur left behind by an exit stuck to frames rendered later

**What:** the hook rendered sharp in isolation and blurred in the final video.
**Root cause:** `defocus` writes `filter`; `fade`/`rise`/`slide` do not. `Object.assign(el.style, s)`
only writes the keys the active animation returns, so a `filter` set during an exit was never
cleared. Frames render across 8 workers in arbitrary order, so "a later frame" is not "after":
measured, frame 111 rendered `filter: none` alone and `blur(9.8px)` once an exit frame had run.
`cutStyle` has always returned its FULL style set for exactly this reason; the anim registry had no
such contract.
**Fix:** `driveClips` now writes the resting values of the layer's own enter+exit animations before
applying the active one. Only the layer's OWN anims contribute keys, so an authored `filter` look on
a layer that does not animate filter is untouched.

**`make probe` did not catch it, twice over.** Its signature omitted `filter` and `clipPath`, and its
scrambler only dirtied state with frame 0 or the last frame — at both, a mid-timeline layer is
off-window and `driveClips` returns before writing anything, so nothing got dirtied. It now records
those properties and scrambles with `n±9` (about one exit window away), which is where the writes
that stick actually happen. With the fix reverted: 2/25 frames now fail. Same shape as #39 — the
blind spot was in the sampling and the field list, never in the rule.

---

## 42. `blur(0px)` is not free, and identity values are written every frame

**What:** after the #41 fix the render started failing with `frame N: context canceled` — a per-frame
timeout, on a scene that had just rendered fine.
**Root cause:** the resting value is written on EVERY frame, and `defocus` returned
`filter: blur(0.00px)` at rest. A zero-radius blur is still a filter: the compositor promotes the
layer and rasterizes it through the filter pipeline. With ~50 image layers carrying a resting defocus
(46 map bubbles plus a 102-avatar wall) that alone pushed frames past the timeout.
**Fix:** `defocus` returns `filter: 'none'` at u >= 1.
**Rule:** an animation's identity must be genuinely free, because it is the value the scene spends
almost all of its frames at. "Visually identical" is not the same as "costs nothing".


---

## 43. A captured component's root margin falls out of the box the capture measured

**What:** tpot's recaps card shipped visibly cropped along the bottom, its rounded corners and padding
sliced off. Reported by eye, twice, before it was chased properly.
**Root cause:** `capture-component.mjs` records the element's `getBoundingClientRect()`, which is a
BORDER box and excludes margins. The renderer then sizes `.hs-comp` to exactly that box and puts the
element inside it. The captured root carried `margin-top: 24px`, so the content sat 24px low in a
166px box and needed 190px; `.hs-comp`'s `overflow:hidden` ate the difference in silence.
**Fix:** the root's margins are dropped at capture (they describe siblings that do not come along),
AND `component.js` zeroes the root child's margin at build time so components already on disk heal
without a re-capture.
**Gate:** `clipped-component` (HARD) in the layout audit — content that does not fit its captured box.
**Rule:** when one number describes a box and another describes the thing inside it, state which box
you mean. Border box vs margin box is the whole bug.

---

## 44. The headline bar rejected a brand's own button colour

**What:** the audit hard-failed white on `#0093eb` at 112px — tpot's real primary, the exact treatment
its site ships on buttons.
**Root cause:** `weak-headline` requires >= 7:1 of the largest text on the frame. That bar exists for
display type on the SCENE FIELD, where a low-saturation tint of the background reads as a washed-out
grey heading. It cannot tell that case apart from text on a deliberate, saturated, filled chip, which
does not wash out and which WCAG judges at the large-text bar.
**Fix:** the bar is 3:1 when an opaque sibling shape sits under the text (a structural test, not a
colour heuristic), 7:1 otherwise.
**Gate:** two `make gate-test` cases, pinned in both directions — a grey headline on the field must
still HARD fail, and a headline on a filled chip must pass.
**Rule:** loosening a rule for one video kills it unless the tightening half is pinned in the same
commit.

---

## 45. The layout audit sampled 14 uniform frames and missed a whole beat

**What:** #43 shipped for as long as it existed while `make audit` reported green — and the audit was
run every time.
**Root cause:** the audit sampled 14 evenly-spaced frames. Across 25s that is one every 1.8s, and the
recaps card is on screen for 1.4s (frames 190-232). The samples fell at 187 and 240. Every rule in
the file was skipping the card entirely; none of them was wrong.
**Fix:** sampling is content-aware — the resting midpoint of every layer is sampled, not just uniform
ticks. That is the one frame where a layer is guaranteed on screen and finished animating.
**What it found immediately:** #43, plus the events card overrunning the safe area by 45px, which had
also never been reported.
**Rule:** the third time (see #39, #41) the blind spot was in the sampling and not in the rule. When a
gate is quiet about something you can SEE, suspect its frame list before its logic.

---

## 46. Five tools rendered every landscape scene into a portrait viewport

**What:** `make frame` on a 16:9 scene produced a 1080x1920 image: the video, cropped. Noticed by
accident while chasing #43, and worked around by pulling frames out of the mp4 instead.
**Root cause:** the frame size was re-derived at eight call sites, and they had drifted into two
groups. `core/boot.js`, `verify/audit.mjs` and `verify/run.js` read `aspect`. `preview.mjs`,
`beats.mjs`, `slop.mjs`, `motion-audit.mjs` and `scene-snap.mjs` read only `orientation` — a field
almost no scene declares, because scenes declare `aspect`. So `make frame`, `make beats`, `make slop`,
`make motion` and `make snap` were all judging a canvas the renderer never produces.
**Why nothing failed:** a cropped viewport is a perfectly stable, perfectly deterministic wrong
answer. Every gate passed; they were passing on the wrong picture.
**Fix:** `sceneDims(cfg, key?)` in `core/safe.js` — dimensions and the safe area are the same question
asked twice, so they live together. All eight call sites import it; nobody re-derives.
**Gate:** `make lib-test` unit-tests sceneDims AND scans `core/`, `scripts/`, `verify/` for anyone
re-deriving the canvas from `orientation`. Proven to fire by reintroducing a copy.
**Rule:** this is the same failure as the safe box (see the header of `core/safe.js`), one level down.
When a value is computed in more than one place, the copies do not drift together, and the quiet one
is the one you are looking at.

---

## 47. `make motion D=...` audited a different file and said nothing

**What:** `make motion D=formats/scene/tpot-launch.json` reported "228 frames" for a 747-frame scene.
It was auditing `sample.json`.
**Root cause:** the tool supports `--data`, but the Makefile target only forwarded `M` and `STRIDE`.
`D` was accepted by make, dropped on the floor, and the report printed only the format name, so there
was no way to tell which scene the verdict belonged to.
**Fix:** the target forwards `D` to `--data`, and the report line names the data file it read.
**Rule:** same class as #19 and #28 — input accepted and silently ignored. A report that does not name
its input cannot be checked against the thing you meant to check.

---

## 48. `make validate` with no arguments validated one file out of sixty

**What:** a scene carried `anim: "slideL"` — a name that never existed — and two theme packs were
missing half the contract. All of it sat green for months.
**Root cause:** the no-argument target meant "every `formats/*/sample.json`". There is one format, so
that is ONE file. The 60 authored scenes were only ever checked if someone happened to pass `D=`, and
the 17 theme packs were only checked indirectly, via a scene that named one. `themes/threadcite.json`
and `themes/plinth-auto.json` were auto-extracted with 4 palette keys against a contract requiring 15,
so every video for those brands was unrenderable and nothing said so until you tried.
**Fix:** no arguments now means every scene that declares a `module` (which naturally excludes
planning artifacts like `*.intent.json`) plus every `themes/*.json` checked directly.
**What it found on the first run:** 4 broken scenes and 3 incomplete themes.
**Rule:** a validator is only as good as the file list you point it at, and the default list is the
one everybody actually uses. Same family as #45 — the rule was fine, the coverage was the bug.

---

## 49. Sound had no way to come from the picture

**What:** the brief was "typing, with a click on each keystroke". Every existing route put the author
in charge of placing 38 individual cues by hand, which drift the moment the copy or the speed changes.
**Root cause:** `audio.auto` derived cues from cuts and stings only — the two things that live in the
scene's *structure*. A `typing` layer already reveals character i at exactly `start + (i+1)/cps`
(core/layers/text.js), so the sound was fully determined and simply never read.
**Fix:** auto sound-design emits one key cue per revealed character from that same expression. Change
the copy or the speed and the clicks follow, because both come from one formula.
**Gotcha found while doing it:** the existing cue merge drops anything within 0.09s of the previous
cue, which at any realistic typing speed would have silently eaten every other letter. Keystrokes get
their own tighter floor; structural cues keep the old one.
**Rule:** if a value is already determined by the picture, the author should never be typing it twice.

---

## 50. A block hand-computed its own centring

**What:** the searchEngine wordmark was centred with `x + w/2 - 150`. It looked right for the one word
at the one size I tested and was wrong everywhere else — the site thumbnail cropped the mark in half.
**Root cause:** the authoring rules already say placement is `pin`/`col`/`align`, never eyeballed `x`,
because the engine knows the measured width and arithmetic in a factory does not.
**Fix:** the mark centres via the group's own `justify` (or a text layer's `align` over its width).
**Rule:** the rule against hand-computed centring applies to BLOCK CODE too, not just scene JSON. A
factory is the worst place for it — the error ships to every caller.

---

## 51. A sound effect named `click` was 19.6 seconds long

**What:** the typing sound design was reported as "sounding like a train going by".
**Root cause:** `assets/sfx/click.wav` was **19.6 seconds**. The Mixkit fetcher asks for "the 4th
ranked result in the click category" and saves whatever comes back; nothing ever checked that a file
named `click` was actually a click. The keystroke cues then fired one every 0.09s, so ~215 copies of a
19-second sample overlapped into a continuous drone. The sound design was correct; the sample was not.
**Fix:** keystrokes are now GENERATED, not downloaded — `key1/key2/key3/keyspace/keyenter` in
core/audio-kit.mjs are ~15-35ms bandpassed noise transients, which is physically what a key click is.
Three voicings rotate by character index, because a real keyboard does not make the identical sound
38 times and one repeated sample is its own kind of machine gun.
**Gate:** `make sfx-check` — every cue must be the SHAPE its role claims. A transient that outlasts
the gap between two of its own triggers is not a transient, and that is checkable arithmetic.
**Also found:** `make audio` (synth) and `make sfx` (recorded) write the same directory, so baking
silently replaced every recorded sample. Baking is now additive; `--force` to overwrite.
**Rule:** a downloaded asset is an input, not a fact. Check its shape against the role you gave it.

---

## 52. The demo was silently scored

**What:** every window of the search demo measured ~-23dB, including the stretches that should have
been silent — which made it impossible to tell whether the keystroke fix had worked.
**Root cause:** the Go mixer resolves `cfg.Music` and falls back to auto-discovering
`assets/music.wav`. A scene that never asks for music gets a bed anyway if that file exists.
**Fix (this scene):** `musicGain: 0` — a UI demo is not scored; the interface sounds ARE the sound
design. With the bed gone the gaps read -91dB, which is how you can prove the clicks are discrete.
**Rule:** an auto-discovered default that the JSON never mentions is invisible in the JSON. When
measuring a change, first check what else is in the signal.

---

## 53. A wordmark re-typed in the theme's font is a lookalike

**What:** "Google" was drawn as six coloured text layers in whatever face the theme shipped (Anybody).
It read as Google-ish and the user spotted it immediately: "you google written in your own font".
**Root cause:** the authoring rules already say capture or fetch a brand asset, never recreate it —
and I recreated one, then hand-typed its hexes. The colours were right; the letterforms were not, and
letterforms are most of what a wordmark IS.
**Fix:** the block takes a `logo` (a real SVG) which wins over `word`/`brand`, and the demo points at
the actual wordmark. Magnifier + mic are real Lucide icons (ISC) with the stroke baked, because an
SVG loaded as an `<img>` has no `currentColor` to inherit and renders invisible.
**Rule:** "close enough" on a brand asset is never close enough. The eye that knows the brand is the
eye you are showing it to.

---

## 54. The build artifact's name leaked into the deliverable

**What:** the film shipped as `out/search-demo.expanded.mp4`.
**Root cause:** `expand-blocks.mjs` writes `<name>.expanded.json` as an intermediate, and the renderer
names its output after whatever file it was handed. So every block-authored scene carries the
pipeline's internals in the one string a human actually reads.
**Fix:** the renderer strips a trailing `.expanded` when deriving the output name.
**Rule:** intermediate filenames are for the pipeline. The output name is for a person.

---

## 55. A "click" that was all treble is a Geiger counter, not a keyboard

**What:** after the 19.6s sample was replaced, the typing still did not sound like typing — reported
as too sharp and too loud.
**Root cause:** the replacement voicings were a narrow bandpass at 2-3kHz with Q≈1.6. That is a mouse
click: all treble, no body, and a resonant Q rings, which at this length is heard as a chirp. A key
is a THUD — the keycap bottoming out, most of the energy low.
**Fix:** each key is now a lowpass-shaped body (250-430Hz) with only a trace of clack on top, Q≈0.7,
and the default cue gain dropped 0.22 → 0.13. Measured: 8dB more energy below 800Hz than above.
**Rule:** synthesize the physical event, not the word for it. "Click" is a name; the sound is a mass
hitting a stop.

---

## 56. My own gate measured file length instead of sound length

**What:** `make sfx-check` (written one commit earlier to catch #51) failed the corrected key clicks.
**Root cause:** it measured WAV duration. `writeWav` pads a decay tail, so a 46ms click sits in a
0.31s file — and the reverse is worse: a file that is 20ms of tick followed by 19s of silence would
have PASSED a length check while being exactly the bug the gate exists to catch.
**Fix:** the gate decodes the PCM and reports the last moment the signal is above -45dBFS. Which
immediately proved the envelopes really were too long (0.22s audible against a 0.09s keystroke gap),
so the voicings were shortened until each key dies before the next arrives.
**Also:** the decoder only handled 16-bit, so it called every 24-bit recorded sample "unreadable" —
a narrow reader reported as broken files. Now handles 16/24/32-bit and float.
**Rule:** the fifth time this session (see #39, #41, #45, #48). The rule was right; the thing it
measured was a proxy for the rule. Ask what the sentence actually claims, then measure THAT.

---

## 57. `pop` was an alias for a cue that rings for a second

**What:** with the library rebuilt entirely from the Cuelume voicings, `make sfx-check` failed `pop`:
0.96s of audible signal against a 0.6s cap for a UI transient.
**Root cause:** the role table aliased `pop → droplet`, and droplet carries a shimmer (delay 0.09,
feedback 0.2) that rings long past the transient. It is the cue a UI click lands on. Nobody heard it
because the recorded Mixkit `pop.wav` (0.48s) had been sitting on top of the alias the whole time — the
download was masking a wrong mapping underneath.
**Fix:** `pop` has its own voicing — a sine gliding 880→260Hz over 45ms with a trace of clack, which
is physically what a small cavity collapsing sounds like. No shimmer.
**Rule:** an alias is a claim that two things are the same sound. Recorded assets sitting on top of the
synth path hid the claim being false; the moment the recordings went, the gate found it in one run.

---

## 58. The ported cue library had drifted from the library it was ported from

**What:** the synthesized cues were described as sounding bad, twice, across two sessions. The
conclusion drawn the first time was "synthesis sounds worse than recordings", and recorded Mixkit
samples were restored on top of them.
**Root cause:** the cues were a HAND-PORT of Cuelume, and they had drifted. Diffed against the real
library (v0.1.2, MIT): 7 of 14 cues differed — `success` was a different musical interval entirely
(659.25/987.77 against the real 880/1108.73) — and `page` and `loading` were missing. What sounded
bad was not synthesis. It was an impression of Cuelume rather than Cuelume.
**Fix:** the specs are extracted verbatim from the library and marked do-not-hand-edit, with the
source and version in the file. Cuelume ships no audio files at all — every cue is a synthesis spec —
so "use Cuelume's sounds" and "generate it from math" are the same sentence.
**What it cost:** two rounds of tuning custom keystroke voicings that should never have existed.
Cuelume already has `press`, which is literally the key-press cue; keystrokes now use it, and the
per-key variation is dynamics (±12% gain, deterministic by index) rather than a new sound.
**Rule:** when a port sounds wrong, diff it against the original before concluding the technique is
wrong. A hand-copied table is the thing most likely to be lying — the same failure as the schema
advertising an anim that never existed (#21).

---

## 59. Perspective is a camera property, not a layer property

**What:** "perspective effects on the frames" looks at first like a per-layer tilt.
**Root cause it would have hit:** CSS `perspective()` takes its vanishing point from the element it is
applied to. Tilt the browser-frame layer and the search content, which are siblings, and each rotates
about its OWN centre — the window leans one way, the text inside leans another, and the composition
comes apart. There is no per-layer angle that composes correctly.
**Fix:** rx/ry/p are CAMERA keyframes. Applied once on the camera root, every layer shares one
vanishing point and the frame reads as a single plane in space. Emitted only when a tilt is actually
non-zero, because a `perspective()` function with no rotation still promotes the subtree into a 3D
rendering context and changes rasterisation — scenes that never tilt stay byte-identical (snap agrees).
**Rule:** when an effect has to apply to several elements *as one thing*, it belongs to the thing that
already contains them.

---

## 60. A block silently swallowed the prop that carried its sound

**What:** `keyGain: 0.055` was set on the searchEngine block and the render stayed at the 0.13 default.
Measured twice before it was noticed, because the JSON looked correct.
**Root cause:** a factory destructures the props it knows and ignores the rest. `keyGain` was never a
parameter, so it evaporated at the call site. Same class as #19/#28: input accepted, then dropped.
**Fix:** the block forwards keyCue/keyGain onto the typing layer, AND `make expand` now warns when a
block layer carries a prop its factory does not accept — the parameter names are readable off the
factory source, so the mismatch is checkable rather than a matter of remembering.
**Gotcha:** a namespaced entry ("searchEngine.home") resolves to a wrapper that merges manifest props
and calls the family, so introspecting the wrapper reads the wrong signature. The check walks to the
family factory first.
**Rule:** the third time a silent-ignore has cost a debugging round this session. Every place the
engine accepts a bag of options is a place it can swallow one.

---

## 61. Auto-derived cues had no volume dial

**What:** with keystrokes softened to 0.055, the transition cues were ~11x louder and the mix was
still not "soft".
**Root cause:** the Go mixer keeps a per-cue gain table and defaults anything absent to 0.6. The cues
auto sound-design derives from cuts and stings carry no gain of their own, so they always landed at
that default. An author could trim the cues they placed BY HAND and had no way to touch the derived
ones — the loudest sounds in the film were the ones the JSON never mentions.
**Fix:** `audio.sfxGain` scales every effect cue, derived ones included. Also removed the table's
entries for `correct`/`wrong`/`beep`/`beep3`, which cannot be emitted since the library became
Cuelume-only — dead config that reads as intent.
**Rule:** anything the engine generates on your behalf needs a dial, or the generated thing wins.

---

## 62. The schema was narrower than the engine

**What:** `border: true` on a rect — which `core/layers/util.js` explicitly supports, mapping it to a
1px hairline — was rejected by `make validate` as "must be a string".
**Root cause:** the schema declared `border` as `string`. Schema drift usually runs the other way (the
schema advertising something the engine ignores, #21/#28); this is the mirror, and it is worse in one
respect: it rejects input that would have rendered correctly, so the author "fixes" working JSON.
**Fix:** `string|boolean`, which the validator's union types already support.
**Rule:** `make schema-check` proves every engine prop is DECLARED. It does not prove the declared
TYPE matches what the engine accepts. Those are two different claims.

---

## 63. `at` was already taken

**What:** per-aspect overrides were implemented on a layer key `at` and silently did nothing.
**Root cause:** `at` already existed in the schema as a layer PLACEMENT prop (below/above/right/left),
and the patch guarded with `if ('at' not in item)` — so the declaration was skipped, the old string
enum stayed, and every override failed type validation instead of applying.
**Fix:** renamed to `aspects`. Caught in one run because the prop was declared in the schema before
being used; had it gone undeclared, the overrides would have been silently ignored at render.
**Rule:** declare the prop first, then implement it. The schema is the place a name collision is cheap.

---

## 64. `make probe` cannot see inside a canvas

**What:** the new `paint` layer passed `make probe` cleanly. A pixel-level check of the same scene
found 2 of 6 frames rendering DIFFERENT PIXELS depending on render order.
**Root cause (the impurity):** `frame()` returned early when the layer was off-window, so its canvas
still held whatever it had last drawn. Frames render across 8 workers in arbitrary order, so the
canvas contents were a function of render order rather than of `t`. `shader` had the identical bug.
Invisible today only because `driveClips` sets opacity 0 off-window — impurity waiting for the day a
paint layer gets a non-zero resting opacity.
**Root cause (why probe missed it):** probe compares a DOM SIGNATURE — attributes and computed styles.
A canvas layer puts its entire output in a place that signature cannot reach, so probe was measuring
everything about these layers except the thing they produce.
**Fix:** both layer types clear when off-window. New gate `make canvas-purity` hashes the actual
pixels, pinned in gate-test by reverting the clear.
**Rule:** the sixth time this session (#39, #41, #45, #48, #56). When you add a layer that produces
output through a NEW channel, ask which existing gate can see that channel. Usually none can.

---

## 65. `make coverage` reported 15 layer types as 14/14

**What:** after `paint` landed, coverage still said "layer type 100% 14/14".
**Root cause:** `LAYER_TYPES` was a hand-typed array in the gate. A hand-copied list of a vocabulary
the engine owns — the exact shape of #21, in the gate whose entire job is noticing what is missing.
**Fix:** `core/layers/index.js` exports `LAYER_TYPES` from the registry; coverage imports it. Paint
effects get their own coverage row from `PAINT_FX_NAMES` the same way.
**Rule:** a gate that restates a vocabulary will eventually disagree with it, and it fails toward
silence — 100% of a stale list looks exactly like 100% of the real one.

---

## 66. Per-band normalisation makes silence look loud

**What:** the first spectrum bake normalised each band to its own maximum, so on a bass-heavy track
the `high` column still swept the full 0..1 range. A layer keyed to `high` would pulse convincingly
against essentially nothing.
**Root cause:** per-band normalisation is the right default — without it a track with no top end
leaves that band pinned at zero and the effect looks broken — but normalising away the difference
between "quiet" and "absent" hides the one fact the author needs.
**Fix:** the sidecar reports each band's ABSOLUTE `peak` alongside the normalised frames, and the bake
prints it (`high 0.0291`), flagging `(near-silent)` under 0.01.
**Caught by:** a lib-test assertion that was itself wrong — it compared normalised columns across
bands, which is meaningless by construction. Writing the test is what surfaced that the output was
missing the number the test needed.
**Rule:** when a normalisation makes two different situations look identical, publish the number it
normalised away.

---

## 67. Block factories were exempt from the rules the videos obey

**What:** `deploySuccess` baked in "Ready in 1.2s" and `browserFrame` defaulted `url` to a real
company's domain. Both shipped to every caller. Found by a human storyboarding a film, not by a gate.
**Root cause:** the copy rules ("never invent numbers", "ship the shape, never a brand lockup") were
enforced on scene JSON by `make validate`, and on nothing else. A block is authored content that
reaches every video that uses it, so it needed the same treatment and never got it.
**Fix:** `make blocks-audit` — invented figures, brand defaults, superlatives, dead props, and
prop-surface divergence across a family. Pinned in gate-test in both directions.
**Also fixed while the gate was being written:** `stripeCard` baked its amount, `pricingCard`
defaulted `price` to a figure, and the alert family (notification/toast/callout/banner) named the same
two slots four different ways — now one vocabulary with the old names as aliases, because a shared
vocabulary is worth nothing if adopting it breaks every caller.
**Rule:** a rule enforced on one artefact and not on the artefact that generates it is half a rule.

---

## 68. The gate audited the factories and missed the manifest

**What:** `make blocks-audit` reported "✓ no factory ships a claim or a brand" while `catalog.mjs`
shipped `url: 'stripe.com'` and `'done in 1.2s'` — the exact two defects the gate had just been
written to catch, one file over.
**Root cause:** the gate read `blocks/index.mjs`. But a namespaced catalog entry supplies its own
props, so **the manifest is a second, independent source of defaults**, and it is what lands in
`docs/BLOCKS.md` and the site thumbnails. Removing a brand from a factory while the manifest puts it
back is not a fix.
**Fix:** the gate walks every string in every catalog row's `props`, with a reasoned exemption list
(`FIGURE_IS_THE_POINT`) so a price on a pricing card is a specimen and a render time in a terminal is
a claim. It then found five real defects, including a logo wall of six real company marks.
**Rule:** the seventh time this session. The rule was right; the thing it measured was a proxy for it.
Ask what the artefact IS, then check that — not the file you happened to open first.

---

## 69. `delay` never delayed anything, and I signed it off from a settled frame

**What:** the per-child `delay` prop added for tpot's CTA ring was completely inert. Measured: the
first six ring avatars sat at opacity `1,1,1,1,1,1` on every frame of the entrance.
**Root cause:** `driveClips` owns every timed element and finds them by `[data-start]`
(`core/clips.js:44`). `addGroupChild` never wrote those attributes, so a group child's entrance always
came from its PARENT's window. `delay` shifted a `start` that only the cut/motion/split paths read.
69 authored uses across shipped scenes, every one non-functional — and the same call-site gap silently
dropped `anim`, `out`, `enterDur`, `exitDur` and `track` on children too.
**How it shipped:** I wrote the prop, wrote a comment stating it staggers, described the ring as
"blooming outward from the logo" in a report, and verified it by looking at a frame near the END of
the beat — where the stagger, had it existed, was already over. The check could not have failed.
**Fix:** `addGroupChild` writes the child's timing dataset, handing it to the same driver as a
top-level layer. Measured after: `0.80 · 0.74 · 0.67 · 0.58 · 0.48 · 0.36`.
**Rule:** verify a TRANSITION at a frame where it is mid-flight. A settled frame proves the end state
and says nothing about how it got there — which is the entire content of the feature.

---

## 70. Group children ran a re-implemented subset of the layer pipeline

**What:** eleven separate "the engine accepts this and ignores it" bugs, all one root cause.
`applyFade`, `mask`, `reflect`, `logotype`, image `canvasFx`/`ken`/`edgeFade`, text `fit`/`fitH`/
`maxLines`/`raw`+microType, and `pin`/`col`/`"50%"` coordinates ALL worked on a top-level layer and
were silently dropped the moment the same layer moved inside a group.
**Root cause:** `addGroupChild` re-implemented a SUBSET of each primitive's build inline instead of
calling it, and `scene.html` applied the per-layer decoration only on its own path. Two
implementations of one pipeline; the smaller one kept falling behind. `canvasFx` was the sharpest
case — `boot.js` scans recursively, so a child's effect was BAKED at load and then thrown away.
`resolveCoords` had the same shape: it looped `data.layers` with no recursion, while `applyAt`
(written later, ten lines away) does recurse.
**Fix:** children delegate leaf construction to `REGISTRY[type].build` via an injected `buildLeaf`
(util.js cannot import the registry — circular), both paths call one `decorate()` helper, and
`resolveCoords` walks children. Re-implementing a builder is how a subset drifts; calling it cannot.
**Also fixed in the same pass:** author-placed `audio.cues` and the whole keystroke train were inside
the `if (audio.auto)` guard, so a scene that hand-placed a cue got silence unless it also opted into
automatic sound design. `auto` now gates only the DERIVED cut/sting cues. And `data.audio.sting` was
resolved but never mixed — its only effect was letting an auto-discovered `assets/sting.wav` force a
silent audio track onto a scene that asked for none; removed.
**Rule:** when the same concept has two code paths, the one that is not the default will rot. Make the
second path call the first, not copy it.

---

## 71. Only one colour set in the block library was ever measured

**What:** five hardcoded colour pairs shipped below the WCAG body bar. Measured: white on the amber
`warn` fill **2.05:1** (in `badge` and `banner`), the `toast` action LINK **2.00:1**, `logLines` info
**2.95:1** and warn **2.05:1** on its light surface, and the dark-surface timestamp **2.86:1**.
**Root cause:** `CODE_THEMES` carries a comment recording a measured 4.68:1 minimum across the set, so
the file demonstrably knew how to do this. Nothing else got the same treatment. The engine's own
layout audit checks contrast on RENDERED text, which catches a scene but never a block that no scene
happens to use yet — and the block is what reaches every future video.
**Fixes, each measured rather than eyeballed:**
- `onColor(bg)` picks a foreground by luminance instead of assuming `#fff` works. `banner` was putting
  white on a CALLER-SUPPLIED accent with no check at all; it now reads ink on a light one and white on
  a dark one, verified both directions.
- The amber stays the brand amber and the TEXT changes (ink on amber is 8.86:1). Darkening the amber
  enough to carry white produces a muddy brown that is no longer a warning colour.
- `logLines` gets two measured palettes; one set of level colours cannot clear 4.5:1 on both a
  near-black card and a white one.
- The `toast` action link was Stripe's teal used as text on a light card — unreadable AND a
  brand-named token leaking into a generic block. Now the theme's accent.
**Gate:** `make blocks-audit` computes the ratio for every literal `color:` inside a literal `bg:` and
fails under 4.5:1, pinned in gate-test. Its stated limit: only literal hex pairs can be judged
statically — CSS vars resolve at render and remain the layout audit's job.
**Also fixed:** two theme-breaks in the same sweep — `avatarStack` hardcoded `#FFFFFF` rings and
`table` hardcoded `rgba(0,0,0,0.05)` dividers, both invisible on a dark theme, both now tokens.
**Rule:** a measurement that was done once, for one set, is a habit nobody formed.

## 72. A block's whole reason for existing sat behind a condition that was always true

**What happened:** `deploySuccess` exists to show a CI pipeline CASCADING — queued, then building, then
live. It never cascaded. The glyph was `const done = i < steps.length - 1;` followed by
`(done || i === steps.length - 1) ? '✓' : '•'`, which is `true` for every index by construction, so all
steps rendered ✓ from the first frame. The colour beside it was `i === last ? T.green : T.green`, two
identical branches. Nobody noticed because a card of green ticks looks like a deploy card.
**Root cause:** a tautology reads as a considered condition. `done ||` LOOKS like it is doing work, and
the dead `'•'` branch documented an intent the code could not reach. Both survived review twice.
**Fix:** an `active` prop — `i < active ? '✓' : i === active ? '•' : '·'` — defaulting to "all done",
which is exactly what the broken condition produced, so no existing caller changes. The identity
ternary is gone.
**Gate:** none catches this class, and that is stated rather than papered over: no test asserted the
cascade, and a gate that proves a branch is reachable is a linter's job, not a render gate's. What the
sweep did add is `make blocks-audit` reading `blocks/kit.mjs` and `blocks/app.mjs`, not just
`blocks/index.mjs` — the shared primitives moved out of the audited file and a rule that stops at a
file boundary is a rule with a hole in it.
**Found in the same sweep, all the same shape (a copy that drifted from its original):**
- FOUR avatar implementations across five identity blocks, two of which derived initials from a name
  prop spelled differently in each. Now one `avatarEl` in `kit.mjs`; every identity block speaks
  `{name, handle?, sub?, avatar, initials}` with its old prop kept as an alias.
- THREE html-card wrappers whose inner width disagreed with their own padding: `w - 48` on
  `padding:22`, `w - 44` on `padding:24`. Now one `htmlCard` that DERIVES the inner width from the pad
  and hands it to the body, so it cannot be restated wrongly.
- ~15 copies of the hairline-card chrome carrying three radii with no rule behind which. Now
  `cardChrome()` plus a named scale where RADIUS ENCODES REGISTER: `R.tight` instrument surfaces,
  `R.card` the default content card, `R.soft` person-facing social/identity/commerce cards.
- TWO tone→colour maps where `ok` and `success` were the same state under two names with different
  fallbacks. One `toneColor()`, both spellings accepted.
- Magic numbers that broke at non-default sizes: `h - 90` went NEGATIVE below h≈90 and inverted every
  bar; `phoneFrame`'s fixed 116px notch covered half the screen at the catalog's own `w:230`; the
  `loadingBar` done-label was positioned at `x + w - 70`, a guess at the string's rendered width.
  All now derived from real pad/label values, clamped, or right-aligned by layout.
**Rule:** every copy is correct only until someone fixes one of them.

---

## 72. The block gate audited one file while the registry became four

**What:** `blocks/index.mjs` was split into `kit.mjs` (shared primitives) and `app.mjs` (app surfaces).
`make blocks-audit` kept reading the single path it was written against and reported green over both
new files — 10 of 61 factories were never audited for brands, invented figures or contrast.
**Root cause:** the same failure it exists to prevent, recurring one level over. Two commits earlier
this gate audited the factories and missed the manifest (#68); now it audited one factory file and
missed the others. Each time the rule was right and the FILE LIST was the bug.
**Fix:** it globs `blocks/*.mjs`. A new factory file is audited the day it lands, not the day someone
remembers. Its dead-prop check also used to `continue` when it could not read a signature — silent,
and indistinguishable from passing; it now reports `unauditable` and fails.
**A correction to my own fix:** the scan false-positived on `", meta = "`, and I "fixed" it by removing
`meta` from the brand list. That was a patch on a symptom: the real cause was the literal scanner
pairing the CLOSING quote of one empty default with the OPENING quote of the next. With the scanner
corrected, `meta` is back in the list — the rule did not need weakening, the parser needed fixing.
**Rule:** when a gate is quiet about something you can see, check its INPUT SET before its logic. Four
of the last eight gate bugs were the file list, not the rule.

---

## 73. Every block could only enter, because the engine could only move a box

**What:** 101 of ~130 factories carried `anim: 'rise'`. The block registry — whose entire purpose is
"see what this does, then use it" — showed 131 tiles all doing the same thing: sliding up.
**Root cause:** not laziness in the blocks. The engine could drive transform, opacity and blur and
nothing else, so there was no way to animate what a block IS. A gauge could not sweep to its reading,
a bar could not grow, a line could not draw on. Every author hit the same wall and reached for the
same container entrance, and the sameness looked like a style choice rather than a missing capability.
**Fix:** `vars: { '--p': [0, 1] }` interpolates a CSS custom property across the layer's window. The
block writes `var(--p)` into its own CSS or SVG and the engine drives the number — one mechanism, so
~25 blocks got their real motion without 25 bespoke animations. Pure in n.
**Three gaps it exposed, each fixed:**
- A nested GROUP returned early in `addGroupChild`, before the decoration, the timing dataset and the
  clip driver. So `delay`/`anim`/`out`/`mask`/`filter`/`vars` were accepted and ignored on a nested
  group while working one node down on a leaf. #69 fixed exactly this and fixed it for LEAVES ONLY —
  the early return was two lines above the code being written.
- `core/motion.js` `wipe()` has implemented all four directions since it was written; `ANIM` only ever
  registered the two horizontal ones, so a bar could not grow from its baseline by name.
- `loadingBar` put its whole fill inside the ENTRANCE envelope (`enterDur: fillDur`), so the bar faded
  up from transparent for the entire wipe. Anyone reaching for `enterDur` as a duration will hit it.
**Rule:** when every author makes the same choice, ask what the alternative would have cost them. A
uniform style across 101 call sites is usually a missing capability wearing a convention's clothes.

---

## 74. The conformance sweep cannot detect two identical values (OPEN)

**Status: real defect, evidenced, NOT fixed. My attempted fix was a regression and I reverted it.**

**What:** `make conformance` prints "layer anim · 17 values · 17 distinct ✓". I made `wipe-down`
byte-identical to `wipe` (both `wipe(t, 'left')`), verified the mutation applied, and it still
reported 17 distinct.
**Root cause:** distinctness is decided by `frameSig(n)` (core/boot.js), which hashes
`document.body.innerHTML`. `scene.html` writes `el.dataset.anim = L.anim`, so the DOM literally
contains `data-anim="wipe-down"` versus `data-anim="wipe"`. **The signature includes the name of the
thing being tested**, so two values that render pixel-identically can never collide. The check is
self-fulfilling for every vocabulary whose value name reaches an attribute — anim, out, cut, preset.
Phase 2 (props) is sound, because a prop's name usually does not land in the DOM; that is why this
gate really did catch `tracking` (#28) while being blind here.
**Attempted fix, reverted:** a `visualSig` hashing computed transform/opacity/filter/clipPath/rects
plus the camera and image content. It did NOT catch the duplicate, and it introduced five false
"inert prop" reports in phase 2. Shipping a gate that cries wolf on five real props to fix a blind
spot on one is a bad trade, and a gate people stop trusting is worse than a known gap.
**What a correct fix needs:** a signature that is provably (a) blind to identity-revealing attributes
and (b) at least as sensitive as `frameSig` on every prop phase 2 currently proves. Both halves need
to be demonstrated before it lands — the second is the one I got wrong.
**Rule:** a self-fulfilling check reports success forever. When a gate has never failed, ask what it
would take to MAKE it fail, and then actually try it.

---

## 75. I diagnosed a flake twice from truncated output

**What:** `make conformance` failed twice inside a chain of `make` targets. I attributed it first to
"concurrent browsers" and then to "a subagent mid-edit on blocks/index.mjs", and reported both.
**Both were wrong.** Four concurrent conformance runs plus canvas-purity plus probe: all clean.
Conformance does not import `blocks/` at all — it imports four `core/` registries.
**Root cause of the misdiagnosis:** every observation came through `| tail -1`, which shows the
summary line and hides whatever error printed above it. I diagnosed from evidence I had truncated.
**Outcome:** still unexplained, and now honestly labelled as such. What it produced instead was #74 —
trying to force the failure is what exposed the vacuous distinctness check.
**Rule:** never diagnose from `tail -1`. If a gate fails, read all of it.

---

## 76. The doc, the manifest and the engine each said something different about `unit`

**What:** `CLAUDE.md` documents `unit: "$B"` with value `880` rendering as **`$880B`**. The catalog
ships `statBig.currency` with exactly those props. The engine rendered **`880$B`** — the shipped
variant was backwards, and the doctrine file taught it wrong.
**Root cause:** `core/layers/count.js` appended `unit` verbatim. Nobody had rendered the currency
variant and looked at it; a catalog still exists for it, which means the wrong output has been on the
site the whole time.
**Fix:** a leading currency symbol in `unit` is hoisted in front of the number, so `unit:"$B"` reads
`$880B` as documented. Plain units (`%`, `k`, `ms`) are untouched.
**Also:** `statBig` forwarded `unit` but not `prefix`, so the one block whose stated job is the big
number could not render a currency stat at all. That is why the money film's hero was a hand-written
`count` layer rather than the block the film was about. `prefix` is forwarded now.
**Rule:** three sources of truth for one behaviour is two too many. When a doc, a manifest and an
implementation all describe the same thing, only one of them is executable — check that one.

---

## 77. The overlap check does not see text that grows by wrapping (OPEN)

**What:** a showcase end card had a headline wrap to two lines and land directly on top of the mono
filepath beneath it. `make audit` reported **0 hard issues**.
**Root cause (suspected, not yet proven):** overlap is measured between declared layer boxes, and a
text layer that wraps grows beyond the box the check reasons about, into the next layer's space.
**Status: OPEN.** I have the reproduction (widening `w` from 1100 to 1420 so the headline holds one
line fixed it) but have not confirmed the mechanism, and I am not going to write a third gate patch
tonight on a hypothesis — see #74, where exactly that produced a regression.
**Why it matters:** this is the "renders silently wrong" class the roadmap describes. Two of the four
showcase films had a composition defect that passed every gate, and both were caught by looking.
**Related, also open:** nothing measures vertical mass distribution. Six of twelve beats initially put
all content in the upper 60% with a dead bottom third, and every one passed the safe-zone check.

---

## 78. Non-block layers get no unknown-prop check at all

**What:** a scene wrote `{"type":"glow","r":620,"opacity":0.5}` and got no glow. `core/layers/glow.js`
sizes from `w`/`h` and takes `color`+`intensity`; `r` and `opacity` are not props it reads.
**Root cause:** `make expand` warns when a BLOCK is handed a prop its factory does not accept
(MISTAKES #60). Nothing does the equivalent for a raw layer, so an unknown prop on a `glow`, `paint`
or `shader` layer is accepted and silently dropped — the exact class this repo has spent the most
effort eliminating, still live on the primitive path.
**Fix not attempted here.** The schema knows every declared prop per layer type, so the check is
available; it needs care about props that are legitimately type-agnostic.

---

## 79. `ls` was declared, documented, used 18 times, and never applied

**What:** the schema declares `ls` as "Letter-spacing (e.g. -0.03em)". Eighteen layers across shipped
scenes set it. `styleText` applied `L.tracking` and never `L.ls`; the only place `ls` was read at all
was a GUARD in text.js that suppresses auto-tracking when it is present. So setting `ls` removed the
optical default and applied nothing in its place — strictly worse than omitting it.
**Found by:** `make layer-props` on its first run, which is the entire reason that gate now exists.
**Fix:** `ls` is honoured as a synonym for `tracking`. Verified: `ls:"0.4em"` renders 36px, where it
previously rendered the theme default.
**Rule:** a prop with a schema entry and a doc string is a promise. The only thing that keeps it is a
line that reads it.

---

## 80. Three composition defects the gates structurally could not see — now two of them can

Closing #77, and the third stays open on purpose.

**(a) Overlap only compared "critical" layers.** Text under 60px was invisible to it, so a headline
that WRAPPED onto a second line and landed on the caption beneath it passed. Measured on the
reproduction: headline y 400-681, caption 500-525, entirely inside it, 0 hard issues.
Fixed — the set is now every visible TEXT layer, on the rule that two text inks overlapping is a
defect while text over a SHAPE is design. Getting there took three corrections, each caught by
measuring rather than reasoning:
  1. comparing raw boxes flagged `statBig`'s deliberate tight stacking, because a text box includes
     line-height leading and the ink does not → boxes are inset by ~16% of font size.
  2. a card floating over a board flagged, though the card is opaque and hides what is beneath →
     occlusion: sample the intersection, skip if an opaque surface is painted above the lower one.
  3. my first occlusion attempt used `parse` before its declaration, which threw on EVERY scene — and
     my blast-radius loop counted findings, so a stack trace read as "clean". I reported that as a
     clean sweep before noticing. The loop now greps for errors too.
Pinned four ways in gate-test. On the first real run it caught a genuine, visible defect: northwind's
wordmark obscured by a tile.

**(b) Nothing measured where content SITS.** Six of twelve beats across two showcase films put
everything in the top 60% with a dead bottom third, and every one passed safe-zone — that check
answers "is it inside the frame", not "does it USE the frame". New `top-heavy`/`bottom-heavy` warn.
Warn tier because a deliberately weighted beat is a real choice.

**(c) HALF CLOSED — see #81.** `deploySuccess`'s cascade was unreachable behind a tautological
ternary. The instance is fixed and the identical-arm half is now gated; the always-true-condition half
still needs real dataflow analysis and stays open.


---

## 81. A decision that decides nothing

**What:** `deploySuccess` shipped `i === last ? T.green : T.green` — a ternary with identical arms —
beside a condition that was always true. Between them, the step cascade the block exists for could
never render. No RENDER gate can see this: the output is valid, deterministic, and wrong by omission.
**Fix (the instance):** an `active` prop drives three distinct glyphs and the colour arms now differ.
**Fix (the class, half of it):** `make dead-branch` flags any ternary whose arms are textually
identical. This repo has ONE dependency and intends to keep it, so adding a linter for one rule was
the wrong trade; the check is 60 lines and reads source text.
**What it caught on its first run:** `verify/audit.mjs` had `bgFor(im === e.el ? e.el : e.el, …)` —
correct output, but a ternary that reads as though it decides something. In gate code, written by me,
while building the gate that finds it.
**What it deliberately does NOT catch, stated so nobody trusts it past its limit:** a condition that
is always true because of a variable defined three lines up (`const done = i < n-1` … `done || i === n-1`).
That needs dataflow analysis, and half a linter pretending to be a whole one is worse than none.
**Also fixed while building it:** the first version read `a ?? 0 : 0` as a ternary starting at the
second `?` and reported two identical arms that were not a ternary. A gate's first output is a
hypothesis, not a finding.

---

## #83 — A test that hardcodes a count is edited by whoever breaks it

`lib-test` asserted `SHADER_FX.length === 33` and `AMBIENT_FX.length === 14`. Adding three effects
failed both. The failure carries no information: nothing is wrong, a number moved. And the fix is
always to bump the number, which means the assertion has never once caught a real defect — it only
ever taught the next author to edit the test until it passed.

**Root cause:** asserting an accident (how many there are) instead of a property (all distinct, each
one reachable). The uniqueness and branch-coverage assertions on the same lines already carried the
real claim; the count was noise stapled to them.

**Fix:** counts derived (`length > 0 && new Set(x).size === x.length`), so appending an effect can
never fail the test for the wrong reason, and the per-effect branch-coverage check still fails loudly
if an effect is added to the enum but never given a shader branch.

**Gate:** `make gate-test` mutates each gate and proves it can still fire — the count removal did not
weaken it (36/36 still provable).

---

## #84 — A positional assertion silently changed what it was testing

The same file asserted matrixDecode's rain moves with time by slicing `frag.lastIndexOf('} else {')`
— the trailing branch. That was matrixDecode when it was written. Appending nebula and dotCrawl made
the trailing branch dotCrawl, so the assertion began testing a different effect while still reading
as a matrixDecode test. It only surfaced because the name check failed alongside it; had the slice
been `/\bt\b/` alone, it would have kept passing against the wrong branch forever.

**Root cause:** addressing a thing by its position in a list that grows.

**Fix:** `branchOf(name)` locates a branch by the effect's own name, and the check now runs over
matrixDecode, nebula and dotCrawl. Same class as the schema-drift fix (#82): name-matching and
position-matching both drift, exact addressing does not.

---

## #85 — A gate flagged its own test fixture

`dead-branch` reported `gate-mutation.mjs:183 both arms are 2`. That line is the mutation the harness
*injects* to prove dead-branch can fire. The gate was correct about the text and wrong about the file:
a fixture is a quotation, not a defect.

**Root cause:** the exclusion list had one entry (dead-branch.mjs, which documents the pattern) and
missed the second file that quotes the pattern for a different reason.

**Fix:** exclude the mutation harness too. Worth stating plainly because the cost is asymmetric — a
gate that cries wolf about itself trains people to skim its output, which is exactly how a real
finding gets missed.

---

## #86 — An incomplete GL texture samples as opaque black, and says nothing

The first resample render was a solid black rectangle. The guard was
`if (!src || !src.width || !src.height) return;`, meant to skip an image that had not decoded. But an
`<img>`'s `.width` is its LAYOUT width, which our own CSS had just set to 1400. A 404'd image reports
`width: 1400, naturalWidth: 0`, sailed through the guard, and got handed to `texImage2D`, which
warned `INVALID_VALUE: no image` to a console nobody was reading and left the texture INCOMPLETE.
WebGL samples an incomplete texture as `vec4(0,0,0,1)`. Opaque black. No error, no thrown exception,
a render that completes successfully and is entirely wrong.

**Root cause:** asking an element for a dimension it reports in two different senses, and picking the
one that is always non-zero.

**Fix:** `naturalWidth ?? width`, and a failed source now THROWS with the offending URL rather than
returning early. A black rectangle where a photo should be is not an acceptable render, and "return
quietly" was the wrong shape of guard for a condition that can only mean something is broken.

**How it was found:** not by looking at the frame (black on a dark scene reads as "the effect is
subtle"), but by dumping the live DOM and reading the WebGL console warning.

---

## #87 — refract ran every line and did nothing

`refract` computed a surface normal by finite-differencing a noise field:
`vec2 grad = vec2(n(q+e) - n(q-e), ...)` with `e = 0.004`. That is a DIFFERENCE, not a derivative.
Dividing by `2e` was missing, so `grad` came out around 0.01 instead of order 1, the sample offset
landed below a single pixel, and the effect was an identity transform at every strength.

Nothing could have caught this except looking. Every line executed, no branch was dead, the uniform
was read, the output was a valid image. `make conformance` proves a declared prop CHANGES the output
and would have passed: `amount` did change the output, by a fraction of a pixel.

**Fix:** `/ (2.0 * e)` and a scale retuned to the now-correct magnitude.

**The other half of this entry is the mistake I nearly made.** In the same contact sheet I read
`bitCrush` as broken too, at three different strengths. It was not. Measuring the rendered canvas
gave 27 / 19 / 10 / 4 distinct levels across the dial, exactly as designed. My eye could not see
10-level quantisation on a textured painting in a 440px thumbnail, and I was one edit away from
"fixing" correct code. The instrument was wrong, not the shader. Measure the pixels before believing
the eye on anything subtle, and believe the eye over the pixels on anything compositional.

(The dial was still worth changing: linear `32 → 3` spends most of its travel where nothing visibly
happens, so it is bit DEPTH now, halving every 0.25.)

---

## #88 — The comment described the intent; the code did the opposite

`fisheye` was labelled "barrel (amt>0.5) or pincushion (amt<0.5)" and computed
`d * (1.0 + k*r*r*0.6)`. Sampling FURTHER out at the edges pulls the image inward, which is
pincushion. Above 0.5 it did precisely the opposite of what its own comment promised, and both the
comment and the code looked right in isolation.

**Fix:** the sign. **Lesson:** a comment stating a direction is a claim that has to be rendered and
looked at, exactly like a number. Nothing in the type system, the schema, or any gate can check that
`+` was meant to be `-`.

---

## #89 — The gate that proves every other gate can fire silently stopped proving one

Editing `core/layers/paint.js` for resample changed the off-window line that
`gate-mutation` patches to prove `canvas-purity` works. The fixture pinned the ENTIRE line, so it no
longer matched, and the harness printed `~ SKIP (fixture is stale)` and **exited 0**.

So: `canvas-purity` was unproven, the summary quietly read 35/36 instead of 36/36, and CI was green.
This is the "reports green forever" failure the harness exists to prevent, reproduced inside the
harness itself. Any edit near a mutated line silently retires a gate, and the retirement is
announced in a line that looks like housekeeping.

**Fix, two parts:**
1. A stale fixture is now a FAILURE, not a skip. It names the file and says the gate is UNPROVEN.
   Verified by pointing a fixture at text that does not exist: exit code is now 1, was 0.
2. The `canvas-purity` fixture is re-anchored on the `clearRect` call rather than the whole line, so
   the branch can grow without retiring the gate.

**The general rule this earns:** a fixture should anchor on the smallest text that carries the
behaviour it removes. Pinning a whole line couples the gate's survival to every unrelated edit on it.

---

## #90 — The roadmap decayed again, in the exact way its own closing warning describes

`docs/ROADMAP.md` ends with a standing warning: three items sat on it as "build first" long after they
were built, two consecutive planning passes were routed at them, and "a roadmap is a claim about the
past as much as the future, and this one decayed silently because nothing checked it."

Within a single session it decayed again. It listed nebula, iridescence and dot-crawl as "genuinely
cheap and still absent" hours after all three shipped, and quoted `SHADER_FX` at 33 and `AMBIENT_FX`
at 14 when they held 34 and 16.

**Root cause:** the warning asked future authors to remember. Nothing enforced it. The same shape as
the schema enums before `make schema-drift` existed.

**Fix:** `make roadmap-drift`, registered in the mutation harness (37/37). Two narrow checks:
a line claiming absence may not name a registry entry that ships, and a quoted registry count must
match the registry. Deliberately not a prose linter.

**One false positive, kept as the design note.** The first version flagged "Glitch RGB captions", a
caption feature, as the `glitch` sting, because it matched bare words. The doc backticks a registry
entry every time it means the registry entry and uses plain prose for feature names, so the backtick
is the disambiguator. A gate that cries wolf on prose gets skimmed and takes its real findings with
it, which is the same lesson as #85.

---

## #91 — The distinctness check decided its own answer, and the fix for it nearly did too

#74 left this open and honest: `make conformance` printed "layer anim · 17 values · 17 distinct ✓"
while `wipe-down` was byte-identical to `wipe`. The signature is `frameSig`, which hashes
`document.body.innerHTML`, and scene.html stamps `data-anim="<name>"` on every layer. **The signature
contained the name of the thing being tested.** Two values that render pixel-identically could never
collide, so the check could not fail, so it had never failed, so everyone believed it.

**Root cause of the first attempted fix (`visualSig`, reverted).** It replaced the hash with one
computed from a hand-picked list of properties: transform, opacity, filter, clipPath, rects, camera.
That list does not include colour, background, letter-spacing, font-family or border-radius, so it
was far LESS sensitive than the thing it replaced, and phase 2 reported five real props as inert. The
mistake was treating "blind to identity" and "as sensitive as frameSig" as one problem. They are two,
and the second is the one that bites.

**Fix.** Keep frameSig's exact hash and redact its input instead. `blindSig` mirrors frameSig line for
line and neutralises `data-anim` / `data-out` before hashing. Which attributes leak was **measured,
not guessed**: every phase-1 vocabulary was rendered and searched for its own value name in the
resulting DOM. Only anim leaks. Preset, cut style, look and canvasFx reach the frame as computed
styles or as a baked data-URL and never as their own name, which is why this is a two-attribute
redaction and not a free-text scrub — over-redaction invents duplicates, and that is the #85 failure.

Both halves are now asserted every run, before the sweep that depends on them:
1. **As sensitive as frameSig** — with an empty redaction list, `blindSig` must reproduce frameSig's
   value bit for bit. A mirror can drift from its original; this makes the drift loud instead of
   silently measuring something weaker.
2. **Actually able to collide** — the declared aliases are the positive control. `up`/`rise` and
   `scale`/`pop` are literally the same function object in core/clips.js, so any trustworthy signature
   must see them as one thing.

**Which is how I caught myself repeating the bug.** My first version of (2) asserted that the DEFAULT
value hashes the same as the no-value baseline. It was vacuous: scene.html stamps `data-anim` on
every layer and defaults it to `fade`, so baseline and `anim:'fade'` matched even with redaction
switched OFF. I only found out by switching it off and watching the sweep still report clean — the
same self-fulfilling shape as the bug being fixed, one level up, written by me while fixing it. An
assertion you have not watched fail is not an assertion.

**Found on the first honest run:** `rise=up` and `scale=pop` — two real duplicate pairs sitting in the
production registry the whole time. They are declared synonyms, so they are exempt via `EXPECTED_ALIAS`
with a stated reason each (the EXPECTED_INERT discipline), and they now double as the positive control.
The printed count is honest too: "distinct" counts distinct SIGNATURES, so it reads 15 of 17, where
the old arithmetic could never print a number below the value count no matter how many values collided.

**Gate:** three cases in `make gate-test` — the defect itself (make `wipe-down` render as `wipe`), and
one for each half of the proof (empty `BLIND_ATTRS`, and a perturbed fnv seed). 45/45.

---

## #92 — The dataflow half of dead-branch, and the rule I had to cut

#81 shipped `make dead-branch` catching one shape — `cond ? X : X` — and said plainly that the
dataflow half needed real analysis and that half a linter pretending to be a whole one is worse than
none. This closes the part that can be closed honestly.

**Three rules, one mechanism.** A name that is bound and then never mentioned again in its own file:
a value computed and discarded, a destructure that drops a field, a function parameter that accepts a
prop and never reads it (the #19 shape, in source rather than in the DOM). Plus a condition whose
operands are all constant.

**The measurement underneath it, which is where a gate actually goes wrong.** "Never mentioned again"
is decided by counting word-boundary occurrences in the WHOLE FILE, raw text included — comments and
strings count as mentions. That is deliberately the over-counting direction: a shadowed name, a name
used only from a template literal, a name that appears only in a comment are all MISSED rather than
invented. Exactly one occurrence means no scope in that file can read it. The bindings are matched
over the whole file text rather than line by line, because the destructures that matter most here are
block factories' prop bags and they wrap across lines — a line-scoped scan would have exempted
precisely the code the rule exists for. That is the same class as every sampling bug in this file:
the blind spot is never in the rule, it is in the set the rule runs over.

**What it caught on its first run: six.** `clamp` in reimagine, `beatOf` in critique, `inWin` and
`lastF` in motion-audit, `FONTS` in rules-build, `total` in preview. Four of the six are in gate code.
Same as #81, where the first run found a dead ternary in the gate being written to find them.

**The rule I cut, and why it is worth writing down.** The constant-condition rule started as "a
comparison anywhere whose operands are all constant". It produced eight false positives immediately,
and every one was the same failure: a regex cannot see operator precedence or string boundaries. It
read `2 === 0` out of `Math.floor(x * 2.2) % 2 === 0`, `1080 > 0.85` out of `(y1 - y0) / 1080 > 0.85`,
and a `<` that was a character inside a string array. The salvage was to anchor on a place where the
syntax itself says where the expression begins and ends: only `if (…)` / `while (…)` whose ENTIRE
contents are token-operator-token. Nothing is left for precedence to change. Eight false positives
before the anchor, zero after. The broad version would have been a bigger rule and a worse gate.

**Still not caught, stated so nobody trusts it past its limit:** the multi-hop case #81 named
(`const done = i < n-1` … later `done || i === n-1`), where the condition is invariant only after
propagating a non-constant expression through another binding. That needs a real dataflow engine over
a real AST. This repo has one dependency and intends to keep it.

**Gate:** three cases in `make gate-test`, one per rule — a gate that catches one of its three stated
rules and reports green for the other two is the same failure as no gate at all. The const-bound-literal
form is the fixture for the condition rule rather than a bare `if (1 === 1)`, because the one-hop
lookup is the part that could rot silently. Both `dead-branch.mjs` and `gate-mutation.mjs` stay
excluded, now by one shared reasoned predicate: both QUOTE these patterns on purpose (#85).

---

## #93 — `opacity` on a layer did nothing, in two shipped scenes, for months

`paint-demo.json` and `react-demo.json` both set `opacity` on a paint layer. The engine never read it.
`driveClips` writes `el.style.opacity` from the enter/exit envelope on every single frame, so even a
build-time style would have been erased on frame 0. The authored intent was obvious and the result was
silence.

**Why no gate saw it:** `layer-props` proves every prop the ENGINE SETS is read by some type. It cannot
see a prop the engine never mentions. `schema-drift` proves every engine-read prop is in the schema,
which is the same direction. Nothing checked the other direction, from AUTHORED JSON back to the engine.

**Fix:** `decorate()` writes `el.dataset.opacity` and the clips loop multiplies it into the composed
envelope, so a base opacity coexists with the entrance fade instead of fighting it for one property.
Verified by rendering two identical black rects, one at `opacity: 0.25`, and reading the pixels:
`000000` and `bfbfbf`. 191 is exactly 75% white, which is 25% black over white.

**This changes output** for the two scenes above: their paint layers are now dimmer, which is what
their authors wrote.

---

## #94 — The validator accepted any prop name at all

A layer with `fill` (the rect prop is `bg`), `colour` (it is `color`), and a wholly invented key
validated clean and rendered wrong in silence. I found it by making the mistake myself: my raymarch
probe used `fill` and rendered on white, and I spent a minute assuming the raymarch layer had a
compositing bug.

**Fix:** unknown props on a layer are now a validation error, with a "did you mean" built from
case-insensitive and prefix matches. Scoped deliberately: `block`/`comp` layers carry the BLOCK's props
which this schema does not describe, `_`-prefixed keys are authoring scratch, and group children are
checked against the child schema PLUS the layer schema because a child runs the same builder.

**Blast radius was measured before it was made fatal**, not after: across all 72 scenes it found exactly
four unknown props. `seed`, `colors` and `opacity` were real engine props missing from `layers.item`
(added), and `fill` was my own typo. A check like this is only safe once you know it is not going to
condemn the corpus.

---

## #95 — A gate answered a question it was not asked

`node scripts/gates/scene-snap.mjs scene formats/scene/paint-demo.json` printed
`✓ IDENTICAL — no DOM/layout change`. It had never opened `paint-demo.json`. Snap takes a FORMAT name
and always loads that format's `sample.json`; the second argument was matched by
`args.find(a => !a.startsWith('--'))` picking the FIRST non-flag arg and the rest being dropped on the
floor.

I used it to check the blast radius of the `opacity` fix and it told me nothing had changed, about the
one file guaranteed to have changed. I nearly recorded "opacity affects nothing" on that basis.

**Root cause:** silently ignoring an argument. The rule the gate states was fine; the input it actually
read was not the input it was handed. That is the recurring shape here (#45 sampling, #46 file list,
#56 measurement, #68 file list), and it is now nine for nine: the blind spot is never the rule.

**Fix:** an extra positional argument is a hard error naming what was ignored and pointing at
`make compare`.

---

## #96 — Coverage lists that do not grow cover less every time you ship

`lib-test` asserted that stings depend on progress and ambient looks depend on time, over hand-typed
name lists: `wave2` (10 entries) and `wave3` (8). `SHADER_FX` holds 35 and `AMBIENT_FX` 17. So the
checks covered 29% and 47% of what they claimed to police, and every effect appended since those lists
were written landed outside them, uncovered, forever.

A subagent appending `gateWeave` reported this rather than assuming its work was checked: a frozen new
ambient effect passed 343/343.

**Fix:** derive from the registry, exempt by name. Stings exempt nothing (a sting that does not move is
not a sting); ambient exempts `barrel` alone, a static lens vignette that is motionless by design.
Proven by freezing each of the two newest effects in turn: `frozen: cinematicZoom` and
`frozen: gateWeave`, neither of which the old lists contained.

Third instance today of the same root cause, after #83 (hardcoded counts) and #90 (stale doc counts):
**a hand-maintained list of things that already exist elsewhere decays the moment someone ships.**

---

## #97 — The docs decayed identically, one file over from the gate watching them

`make roadmap-drift` shipped hours earlier to stop ROADMAP.md listing shipped work as missing. It
watched one file. `docs/PRIMITIVES.md` states counts in its section HEADINGS and had drifted exactly
the same way: 33 stings and 14 ambient against a real 35 and 17.

**Fix:** generalized to `make docs-drift`, covering ROADMAP prose claims and PRIMITIVES heading counts.
It also fails if a heading it expects to find has GONE, because a count check that silently stops
running is worse than one that never existed.

Writing a gate against a failure mode and then scoping it to one file is its own instance of that
failure mode.

---

## #98 — A group child was legal at depth 2 and illegal at depth 1

`boot` rejected `{type:'rect'}` as a direct group child ("not valid. Did you mean 'text'?") while two
SHIPPED scenes used `rect` and `html` children one level deeper and rendered fine. The engine only
enforced the restriction at depth 1, so the same type was legal or illegal depending on how deeply it
was nested.

The restriction itself was the stale part. `addGroupChild` delegates to `kit.buildLeaf`, which
dispatches the SAME registry as a top-level layer, so a child has been able to be any layer type since
that refactor (MISTAKES #70). The schema's four-name enum was left behind and nobody noticed, because
the only path that read it was a depth-1 check almost nothing exercised.

**How it surfaced:** I added a validator rule enforcing the enum, and it condemned two shipped videos.
A new rule that fails the existing corpus is evidence about the RULE, not the corpus.

**Fix:** the child enum is the full layer registry, and `make schema-drift` now derives it from
`core/layers/index.js` so it cannot drift again. The validator also checks children at every depth,
where before it stopped after one and a bad type reached the engine as a boot crash after a green
validate.

---

## #99 — A nested `layout:'free'` group did not position its own children

Reported by a subagent building `splitScreen`. A free group's children are `position:absolute`, which
resolves against the nearest POSITIONED ancestor. A top-level layer is absolute, so free layout worked
there; a nested group is static, so its children escaped past it to the layer root and the group's own
position stopped meaning anything.

**My first test failed to reproduce it, and I nearly dismissed the report.** I nested a free group at
offset 0,0 inside a group, and the children landed correctly. They would have landed in the same place
under either hypothesis, because "relative to a group at 0,0" and "relative to the layer root" are the
same coordinates. A test that cannot distinguish the two answers is not evidence for either. Giving the
inner group a non-zero offset showed the escape immediately.

**Fix:** a nested free group is set `position:relative` in `addGroupChild`, not in `layoutGroup`,
because a TOP-LEVEL free group is already absolute with left/top from scene.html and `relative` would
break every one of them.

---

## #100 — Every vendored font is VARIABLE, and the obvious extractor reads the wrong master

Building `scripts/fonts/glyphs.mjs` (woff2 → three.js typeface JSON, so `TextGeometry` can extrude
real brand type instead of helvetiker). The obvious chain is wawoff2 to decompress, then opentype.js
to read the outlines. It runs, it emits a clean file, and every glyph is correctly shaped.

It is also the wrong font. **opentype.js reads only a variable font's default master**, and this
repo's faces are all variable with surprising defaults: `Anybody.woff2` defaults to `wght=100`
(its postscript name is literally `AnybodyThin-Regular`), `Fraunces.woff2` to `wght=900`, and
`local/Sohne.woff2` to `wght=280.8`. A 3D headline would have shipped in a hairline weight, with
nothing anywhere reporting a substitution — the exact failure class as the silently-swapped
`@font-face` (#2's neighbours) but one layer further down, where no font audit can see it because
by then there is no font left to audit, only numbers.

Inspecting the JSON cannot catch this. Neither can a hash. Only rendering it can.

**Fix:** fontkit instead of opentype.js — it applies `gvar` deltas, so `getVariation({wght})` bakes
the weight actually asked for. It cannot read woff2's cmap directly, so wawoff2 still runs in front
of it. The baked weight is a stated default (700), recorded in the artifact and printed on every run.
Passing `--weight` to a genuinely static font now exits non-zero rather than accepting-then-ignoring.

Two further traps in the same file, both of which produce a valid-looking artifact:
- **three's `FontLoader` reads curve arguments END-POINT FIRST**, then the controls — the inverse of
  every canvas/path API. Transposing them parses fine and renders as knotted spaghetti.
- A codepoint the font lacks comes back as `.notdef`. Baking it yields a blank box mid-word, so
  missing glyphs are a hard failure naming the codepoints, not a silent hole.

**Gate:** `make glyphs-audit` (`scripts/gates/glyphs-audit.mjs`). These are BAKED artifacts that
nothing re-derives at render time, so a re-subset woff2 leaves the old outlines rendering flawless
letters in the previous font forever. Each artifact records its source's sha256; the gate fails on
mismatch (STALE) and on any gap in the charset it claims to cover (GAPS). Proven able to fire in
`gate-mutation.mjs`. Verify by RENDERING: `make glyphs-verify FONT=Anybody` puts the extruded
geometry directly above the same string set in the original woff2 and you look at them.

---

## #101 — The shard grid that was already broken before anything hit it

Building the `sim` tier (Tier B: stateful simulation baked offline to a PNG sequence, played back
through the existing `clip` layer). `sims/shatter.mjs` disintegrates a panel, so it starts from a
grid of quads and jitters the vertices to keep the pieces irregular.

The obvious way to write that is to jitter each quad's own four corners. It is wrong, and it is wrong
in a way that only shows up when you LOOK at the frames: neighbouring cells then disagree about where
their shared edge is, so the plate is full of gaps from frame 0. The whole beat is a solid surface
taking a hit, and the surface was never solid. I only caught it by building a contact sheet and
reading it — the sim was numerically fine, and every gate in the repo would have passed it forever.

**Fix:** one jittered vertex lattice, shared between neighbours, boundary vertices unjittered so the
panel edge stays straight. Plus two things the first version also got wrong and the sheet also
showed: adjacent fills that share an exact edge still leave an antialiasing seam (each shard is now
outset half a pixel about its centroid), and the edge highlight was drawn at rest, outlining every
seam and giving away the break before it happened (it now fades in only once a shard is loose).

**The class this belongs to.** There is no gate for it and there should not be one. `make sim-audit`
can prove a sim is seeded, that its bake is current and that its sequence has no holes; it cannot
prove the sim looks like the thing it is named after. That is the standing rule in this file —
tools measure, eyes judge — and a baked sequence makes it sharper, because a bake is a build
artifact that nobody re-renders casually. Anything wrong in it ships until someone looks.

---

## #102 — `git stash` in a shared worktree, while other agents were writing to it

Mine, during the same session. I wanted the pre-change count for `make gate-test`, so I stashed the
tree, ran the harness, and popped. Two things went wrong at once.

`gate-mutation.mjs` MUTATES source files and restores them, so a run that is interrupted (or one
whose fixtures fail) can leave a mutation behind. It left `BLIND_ATTRS = []` in `conformance.mjs`.
That alone is survivable. But the stash then captured the mutated file, and on the way back
`git stash pop` refused — "local changes would be overwritten" — leaving the tracked half applied,
the untracked half not, and a stash entry that looked like lost work.

It was not lost: nothing had been dropped and the worktree turned out to be NEWER than the stash,
because another agent had committed and edited in the meantime. But I could not know that until I
had diffed the worktree against the stash commit path by path, and for a few minutes it looked like
I had stashed away someone else's in-progress `three` layer.

**The rule:** never `git stash` a worktree you do not exclusively own. To learn what a gate counted
before your change, read the count out of git history, or run the gate from a throwaway clone. A
baseline number is never worth putting a shared tree into a state only a diff can explain.

---

## #100 — The build context is the working tree, so .gitignore does not protect it

`assets/baked` (67M of sim bake output) and `assets/gen` were gitignored, mentioned by no `COPY` in
the Dockerfile, and shipped to the daemon on **every single build** anyway. Nothing in a diff, a
review, or `git status` could show it, because the Docker build context is the WORKING TREE and
`.gitignore` has no bearing on it. Trimming them took the context from 89M to 15.8M.

**Fix:** `make docker-context` walks the tree applying `.dockerignore` the way BuildKit does and
fails over a 40MB budget, naming the biggest contributors. Mutation-tested: with the two lines
removed it reports 92.6MB and exits 1; restored, it passes.

Writing that gate immediately reproduced the same class of bug one level down: my first matcher
turned `**/node_modules` into `.*/node_modules`, which cannot match a ROOT-level `node_modules`, so
the gate reported 89MB where Docker reported 13.3MB. **A gate that models another tool's semantics
is only as good as its fidelity to them** — and the cheapest proof is to compare against the real
tool's own output, which is exactly what caught it.

---

## #101 — I discarded a correct diagnosis because of evidence that never contradicted it

vawe-site had failed every deploy for three days at `COPY scripts ./scripts` with
`failed to stat active key during commit`. I diagnosed a corrupt BuildKit snapshotter. Then I found
that `portfolio` had deployed successfully three times that same day on the same host, concluded
BuildKit was healthy, and abandoned the diagnosis to go hunting for disk pressure and cleanup crons.

The diagnosis was right. Cache corruption in BuildKit is **per cache-record**, not daemon-wide, so a
different application with a different chain is entirely unaffected. My "discriminating test"
discriminated nothing: both hypotheses predicted portfolio would succeed.

Worse, the decisive evidence had been sitting in the log from the first failure. The snapshot IDs
`0qbeajv3vali532ibd3opt5od → rjntgkdwifj56ue8yiqvtxqaw` were **byte-identical** across different
commits, different contexts, different deployment UUIDs, and `--no-cache`. BuildKit allocates those
randomly; identical IDs mean nothing was being allocated at all. I had read that line three times
without registering that a repeated random ID is impossible.

**Two rules:**
- Before letting evidence kill a hypothesis, ask what the *rival* hypothesis predicts. If both
  predict what you just saw, you have learned nothing and must not update on it.
- An identifier that repeats when it should be unique is the loudest signal in a log. Read the
  values, not just the message.

**The actual cause and cure:** the host cached the `WORKDIR /repo` layer whose backing overlay dir
had been pruned, so committing ANY child onto it failed regardless of what the child was. Re-keying
the children (reordering the COPYs) changed nothing, because the broken parent was still reached —
that reorder is still in the tree and was NOT the fix, which is worth knowing before someone credits
it. Renaming the workdir `/repo` → `/src` re-keyed the parent and the deploy went green.
`docker builder prune -af` on the host remains the real cure; Coolify's v1 API exposes no way to run
it (no exec endpoint, and `docker_cleanup_frequency` is not PATCHable), so this was fixed entirely
from the repo side.

---

## #102 — `preview.mjs` is non-deterministic where the production render is not

Building the `ransom` treatment, I checked determinism by rendering a frame 5× through
`make frame` / `scripts/author/preview.mjs` and hashing the PNGs. Five different hashes. I spent a
dozen cycles chasing a phantom font-load race that did not exist, because the production render was
byte-identical the whole time.

`preview.mjs`'s fast screenshot does NOT wait for GPU raster to settle. The moment a scene promotes
many small compositing layers (here: a per-glyph `rotate` on every cutout tile), preview captures
mid-raster and each grab differs. `bin/vawe` (the Go renderer) waits, so `make video` output is
byte-identical — which is the determinism the contract actually promises.

**The rule:** `preview.mjs` is for *looking*, never for *proving determinism*. Prove it by rendering
the real video twice and `cmp`-ing the mp4, or with `make probe`/canvas-purity. A preview tool that is
flakier than production will invent bugs that aren't there. (Worth hardening preview to wait for a
stable paint so it stops lying; logged as a follow-up.)

---

## #103 — A failed render left a stale PNG, and the hash read it as "identical"

Chasing #102, I wrote scenes to `/tmp` and rendered them with `preview.mjs`. The preview server only
serves files under the repo root, so every `/tmp` scene fetched empty and the render **errored without
writing a new PNG** — leaving the previous run's image in place. `md5 /tmp/preview_scene_100.png` then
read that stale file and reported the same hash across totally different inputs, "proving" determinism
about files that never rendered. I nearly concluded the opposite of the truth twice.

**The rule:** a measurement over an output file must first guarantee the file was *freshly produced*.
`rm -f` the target before each run and hard-fail if it is missing afterward — never hash whatever
happens to be on disk. Same shape as the byte-identical-snapshot-ID trap (#101): an identifier/artifact
that cannot have been produced by this run is the loudest signal that the run didn't happen.

---

## #104 — Diagonal clip-path edges rasterise non-deterministically under per-element rotation

The vivid `ransom` palette first shipped extra cut shapes (a pennant point, a sheared parallelogram).
The production render then varied across runs — 4/4 byte-identical with ragged near-rectangular torn
edges, but a fresh hash the moment a steep diagonal `clip-path` edge entered, because a long diagonal
under the tile's own `rotate()` promotes a compositing layer whose edge AA the GPU rasterises with
timing-dependent results the capture can't fully pin.

**Fix:** the ransom cut stays near-axis-aligned (ragged rectangle only); the exotic shapes were removed,
which also simplified the module. Determinism is the contract, so a shape that looks good but renders
non-reproducibly does not ship. Confirmed by the isolation ladder: paper (torn) 4/4 identical, color
without materials still varied, color with torn-only 4/4 identical — the diagonal shape was the sole
variable.

---

## #105 — Two shipped scenes do not render the same twice, and nothing was checking

Refactoring boot()'s preloaders, I byte-compared renders across the change. `ransom-demo`,
`ransom-color-demo` and `canvasfx-reel` were identical; `three-showcase` and `_coverage-reel` were
not. The obvious read was "the refactor broke the three and clip paths." It hadn't: rendering each
scene three times on the UNCHANGED committed code produced three different mp4s. Both scenes are
non-deterministic on `main`, and were before this session.

This is the product's central claim failing in the two scenes built to demonstrate the vocabulary —
the three.js showcase and the coverage reel. Determinism is the whole pitch; a showcase that renders
differently every run refutes it.

**Why no gate saw it:** `probe-purity` proves the *DOM* is identical regardless of render order, and
it passes here. Neither scene's problem is in the DOM — it is in the *pixels*, from GPU raster of
WebGL/compositing that the DOM check structurally cannot see. `canvas-purity` exists for pixels but is
not run over these scenes. So the gate that could catch it wasn't pointed at them, which is the same
sampling failure as #45/#46/#68/#95: the blind spot is never the rule, it is what the rule was aimed at.

**Not fixed here** (out of scope for a refactor commit, and three.js raster determinism is a real
project — see ROADMAP Tier 4/5). Logged so it is not rediscovered as "the refactor broke it." Next
step: point a pixel-level purity check at every shipped scene, so a scene that cannot render twice
identically fails CI instead of sitting in the showcase.

**The method note worth keeping:** the discriminating test was cheap and decisive — before blaming my
change, render the same scene twice on the *unchanged* code. Byte-comparing across a refactor is
worthless until you know the baseline is itself reproducible.

---

## #106 — The ransom effect has a determinism ENVELOPE, and I shipped it without knowing where the edge was

`ransom` was verified byte-identical on two scenes (7 glyphs at size 180, 16 glyphs at size 150) and
shipped as "pure in n". Authoring a three-line note, the render started varying run to run. My first
three guesses were all wrong: not the new cycling code (the STATIC version of the same scene varied
too), not machine load (the original 7-glyph scene was still 4/4 identical at load average 18.8, hash
unchanged), not the drop-shadow (removing it changed nothing).

The real variable is **how much rotated, clip-pathed tile is on screen at once**. Each tile is its own
compositing layer; past some amount the capture samples mid-raster. Measured: 16 glyphs @150 → 3/3
identical. 32 glyphs @150 → 3 distinct. 11 glyphs @88 → 3 distinct (small type sits on the AA margin).

**Two lessons.**
1. "Deterministic" is not a property I verified — it is a property I verified *at the sizes I happened
   to test*. A purity claim needs its envelope stated, or the next author walks straight out of it. The
   envelope is now in PRIMITIVES with the measurements.
2. Four hypotheses, each killed by a cheap discriminating test before moving on (static-vs-cycling,
   re-run the known-good scene, remove the shadow, vary size and count). That is the habit that finally
   found it, after #101 where I abandoned a correct diagnosis for want of one.

The video ships within the envelope: one line on screen at a time, size 150, 3/3 byte-identical. The
general fix is task #27 — a pixel-level purity gate over every shipped scene, which would have drawn
this boundary automatically instead of me discovering it by surprise.

---

## #107 — Half of every composite look was thrown away on any top-level layer, silently

Authoring the looks film, `"filter": "crt"` on an image produced a brightness lift and **no
scanlines**. The same look on a gradient card inside a `group` (looks-reel) rendered its scanlines
perfectly. That difference was the whole clue.

A look resolves to two halves: a CSS `filter` string written to `el.style`, and a set of overlay divs
(scanlines · grain · vignette · lightLeak · washes) appended as children of the layer. Both paths call
the same `decorate()`, which the comment at `core/layers/util.js:187` proudly notes is ONE definition
shared with group children. It is. The **order** was not:

- group children (`util.js:182-187`): `buildLeaf()` → `decorate()`  ✅
- top-level layers (`scene.html`): `decorate()` → `renderer.build()`  ❌

Every primitive builder starts with `el.innerHTML = …`, and `splitText` re-wraps text after that. So on
a top-level layer the overlays were built, then deleted, before the first frame. The `filter` half
survived because it lives on `el.style`, which is why the look looked *plausible* rather than broken —
the exact failure mode that hides longest.

**Fix:** `decorate()` now runs LAST, after `build()` and after `splitText`/`ransomStyle`, matching the
group path. Blast radius was one render: only `looks.json` uses a top-level overlay-bearing look
(`looks-reel.json`'s three are `neon:*`, which is filter-only). `make probe` and `make snap` both clean.

**The lesson, and it is not "check the order".** Sharing one function across two call sites looks like
one definition and reads like one definition, so the comment claiming that was believed by everyone
including me. What is shared is the *callee*; what diverged is the *sequence around it*. A helper being
common proves nothing about the context being common. Nine looks out of 26 carry overlays; all of them
were quietly degraded on top-level layers for as long as this has existed.

**Gate gap:** nothing catches "authored input accepted, then discarded". A DOM-level assertion that a
resolved look's overlay count matches what `resolveComposite` returned would have failed loudly on
frame 0. Filed as follow-up.

---

## #108 — The layout audit called Ken Burns a bug, so authors learned to ignore it

`make audit` hard-failed the new film with seven `[overflow] hs-img-wrap — content 925x929 clipped to
900x900`. Ken Burns *works* by scaling the image past its box so the box clips it; `object-fit: cover`
already overscans before `ken` adds any. The overscan is the mechanism, not a defect.

It was not my scene. The shipped `gradient-showcase.json` fails its own audit the same way, on every
ken layer. Which means that film was shipped with a red audit, because a gate that cries wolf on a
correct, universal idiom trains you to skim past it — and then it cannot do its real job either.

**Fix:** the overflow rule skips `.hs-img-wrap`. Its stated purpose (`verify/audit.mjs:4`) is *clipped
text*; an image box exists in order to clip, so it can never be evidence there.

**The lesson:** a false positive on a common correct pattern is not a cosmetic annoyance, it is a hole
in the gate. Every author who learns to ignore one line of audit output has also learned to ignore the
line under it. Measure how often a rule fires on healthy input before trusting the rule.

---

## #109 — `make photos` wrote WebP bytes into files named `.jpg`

Openverse serves whatever the upstream host stored, commonly WebP, from URLs still ending `.jpg`.
`scripts/brand/photos.mjs` named every download `<slug>-<i>.jpg` regardless of content. Chrome sniffs
the magic bytes and renders it, so the render was fine and nothing complained — ffmpeg only muttered
`invalid TIFF header in Exif data`. But the extension was a lie, and anything downstream that trusts
extensions (a CDN setting `Content-Type` from the suffix; an image pipeline that is not a browser)
would serve or reject it wrongly.

**Fix:** sniff the magic bytes and use the true extension; the printed usage hint now names the real
file. Existing assets renamed.

**The lesson:** "it rendered" is not evidence the file is correct. The browser is the most forgiving
consumer in the chain, so passing in a browser proves the least.

---

## #110 — Two gate messages that describe something other than what they test

Both found while running the ladder on one film; neither is fixed in the gate that reports it.

- **`make beats`** reported "3 beats" for a film with seven distinct visual beats. It derives beats
  from explicit `cuts`, not from layer boundaries, so a film that cuts by swapping layers is invisible
  to it. The number is not wrong so much as it is measuring a different thing than the word "beats"
  promises, which makes it useless exactly where an author would lean on it.
- **impeccable `flat-type-hierarchy`** flagged sizes 34/42/60 at "ratio 1.8:1" and advised aiming for
  "at least a 1.25 ratio between steps". 1.8 already exceeds 1.25. The code tests the *total span*
  (`max/min < 2.0`); the advice describes the *per-step* ratio. Contradictory on its face. Not patched
  here: the detector is vendored under `.claude/skills/impeccable/`, and forking vendored rules to fix
  prose costs more than it saves. Reported upstream-ward instead.

**The running theme** (now ~13 instances): a gate's blind spot is never in the rule it states. It is in
the sampling, the file list, or the measurement underneath it — here, in the gap between what the
message says it measures and what the code measures.

---

## #111 — The site quoted nine capability numbers, and the registry had moved past all of them

Asked to bring the site up to date, I found `96 components`, `96 blocks across 44 families`,
`44 families`, `a 100-block taste library`, a `<meta>` description promising `96 vetted components`,
and in `vawe-rules.md` headings claiming 22 kinetic presets, 32 stings, 16 backgrounds and 16 themes.
Real: 148 blocks, 63 families, 25 presets, 35 stings, 17 backgrounds, 18 themes. The name lists under
those headings were short by exactly the difference, so the docs an LLM author reads were missing
three real presets and three real stings.

None of it was written carelessly. Every number was true the day it was typed. That is the whole
point: a hand-typed count about a growing registry is not wrong, it is *pending*, and nothing was
watching. `site/lib/blocks.json` had a generator (`make blocks-sync`) and was stale only because
nobody ran it; the prose had no generator at all.

**Fix:** `scripts/gates/site-counts.mjs` (`make site-counts`) reads the registries, scans the site copy
for both shapes counts appear in (`148 blocks`, `Kinetic presets (25)`), and fails with file:line, the
stated number and the real one. It does not rewrite: a count usually sits inside a sentence that needs
rephrasing, not a substitution.

**It caught me inside ten minutes.** I had hand-typed "64 families" from a number I had computed over
the whole CATALOG. The site's grid excludes the full-frame overlay row, so the page renders 63. I was
adding a fresh wrong number to the file I was fixing, and the gate refused it.

**The lesson:** I nearly filed a second bug here too, reporting five blocks "missing from the catalog"
after diffing registry keys against catalog `name`. Catalog rows are namespaced (`pricingCard.free`)
with the bare key in `family`; comparing the right field showed nothing missing. Both halves of this
entry are the same mistake in opposite directions: a number is only meaningful next to the definition
that produced it, and 148 / 149 / 154 / 63 / 64 are all correct counts of different things. Say which
one, or the number is noise.

---

## #112 — Every "glow" in the engine was a drop-shadow, which glows the wrong channel

Six looks (`neon`, `dreamyHaze`, `halationFilm`, `angelic`, `hologram`, `glitchGlow`) built their bloom
from a stack of four `drop-shadow`s. On text and cut-outs that traces the glyph and looks right, so it
survived a long time. Put it on a photograph and it draws a glowing rectangle around the frame.

**Why, exactly.** `drop-shadow` blurs the **alpha** channel:

    bloom = G(σ) ⊛ alpha(src) · colour

An opaque photo's alpha is a solid rectangle. Blur a rectangle, get a soft rectangle. The picture is
never an input, which is why the result was identical whether the frame held a face or a grey wall.
The box was not an artifact; it was the operation working correctly on the wrong channel.

**What After Effects does instead** — it thresholds **luminance**, never alpha:

    1. L     = 0.2126R + 0.7152G + 0.0722B
    2. mask  = clamp((L - T) / (1 - T), 0, 1)
    3. bloom = Σᵢ G(σᵢ) ⊛ (mask · tint)
    4. out   = src + I · bloom

Step 2 is the entire difference. The mask is sparse: only pixels already brighter than T survive, so
light leaves the lit cheek and the highlights, and a dark edge emits nothing. No boundary term exists,
so no box can form. It is also what bloom physically is, light scattering in a lens from bright sources.

**Fix:** a real `bloom` SVG filter in `core/filters.js` (feColorMatrix → feComponentTransfer →
feFlood/feComposite → two feGaussianBlur → additive feComposite), and `bloomStack` in `core/looks.js`
now returns `url(#…)` instead of four drop-shadows. All six looks were routed through that one
function, so one change fixed all six. Static def, injected once at build, no frame hook: pure in n.

**Two lessons.**
1. **CSS filter has no threshold operator, so the engine quietly settled for the primitive it had.**
   That is the shape of the mistake: not a wrong value, a wrong *model*, adopted because it was the
   one available and it looked plausible on the first content anyone tried it on. Text hid this for
   the entire life of the feature.
2. I nearly shipped the workaround. Asked not to glow the border, I first clipped the bloom to the
   frame, which made the six glow looks invisible, then inset the picture, which made the rectangle
   obvious instead of subtle. Both were me negotiating with a broken model. The question "how does
   After Effects do this without the box" was worth more than either attempt, because it asked what
   the operation *should* be rather than how to hide what it was.

---

## #113 — A kernel's `amount` knob has to respect what the kernel sums to

Building the relief family, `edgeGlow` rendered as a solid black rectangle. My first read was the
subject: polished marble is smooth, smooth material has little edge energy, so I amplified after the
convolution. Still black. The subject was innocent.

`feConvolveMatrix` weights are only meaningful next to their SUM:

- **sum 1** (sharpen, emboss) — output brightness matches input. Scale these *around the identity*
  (`centre → 1 + (v-1)·a`), which keeps the sum at 1.
- **sum 0** (edge) — flat areas cancel to black and only boundaries survive. That cancellation IS the
  effect, and it only happens at exactly zero.

I applied the around-identity rule to both. On the edge kernel that gave centre `1+3(1.3) = 4.9` and
four neighbours at `-1.3`, summing to **-0.3**. A small negative sum is a constant downward push on
every pixel, so flat areas went past black and clamped, and the edges went with them. Amplifying
afterwards multiplies zero.

**Fix:** branch on the base sum. Zero-sum kernels scale uniformly (the sum stays zero); others scale
around the identity.

**The lesson.** I reached for a property of the *content* to explain a defect in the *operator*, and
the content was plausible enough to hold me for one wrong fix. The tell I walked past: brightness
amplification changing nothing at all. If a gain does literally nothing, the signal is not small, it
is absent, and those are different diagnoses. Same trap as #101, one level down.

Also worth stating plainly: this was a knob I added an hour earlier, and it was wrong for one of the
three kernels I shipped it with. A parameter that means different things to different members of its
own registry needs the branch written the day it is introduced, not the day one member visibly breaks.

---

## #114 — A build step that stops at the first error reports one error per run

Adding three rows to the site-assets manifest, nothing encoded and the only output was a complaint
about a different row entirely. `site-assets.mjs` called `process.exit(1)` the moment a manifest row
had no render in `out/`, and the aspect trio sits ABOVE the films in the table, so one stale row three
quarters of the way down hid every row beneath it. The new entries were never even attempted.

Worse, the failure was old and partly invisible: the trio had been missing for a long time, and
because the loop died on the first of the three, only ONE of them was ever named. The site kept
serving the committed copies, so nothing looked broken from outside.

**Fix:** record and continue, then fail at the end with the full list. The first run after the change
reported all three instead of one, which is how the gap got closed in a single pass rather than three.

**The lesson.** Fail-fast is right for a corrupting operation and wrong for a report. This loop does
independent work per row: stopping early buys nothing and costs the operator a round trip per defect.
Ask which one a step is before choosing — and if it prints a list of problems for a human to fix, it
owes them the whole list.

**Related, same run:** two renders on the shelf (`threadcite-launch`, `shortwave-launch`) have no
scene file at all. They cannot be re-rendered, verified, or offered as "view source", so they are
finished videos the engine can no longer account for. Nothing warns about an orphan render; a check
that every `out/*.mp4` traces to a `formats/scene/*.json` would.

---

## #115 — Two kinetic knobs cancelled themselves out and did nothing

Building the knob manifest, a drift guard (set each advertised dial, assert the output moves) flagged
`bounce.settle` and `elastic.settle` as dead. They were not typos in the manifest; the presets
genuinely ignored the dial.

The cause is a cancellation. `bounce` fed the spring `spring(u * settle * 2, { bounce, settle })`,
and `spring` sets its own frequency `omega = 2π / settle`. So the phase was `omega * t =
(2π/settle) * (u * settle * 2) = 4π * u` — the `settle` in the input and the `settle` in the frequency
cancel exactly, leaving a result independent of `settle`. An author dialing settle got no change,
silently. `elastic` had the same shape; `swing` did not (its input is not settle-scaled), which is why
only two were dead.

**Fix:** make the spring input a constant and let `settle` drive frequency alone. The constant is
chosen so the default (settle 0.5) reproduces the old output byte-for-byte — and no shipped scene sets
a custom settle, so the blast radius is zero. The dial now works.

**Why it stayed hidden:** every scene used the default, and at the default the bug is invisible by
definition (there is nothing to compare against). It took a tool that sets the dial to a NON-default
value and checks for a change to see it. That tool is now `make knobs-audit`, and it runs on every
draft, so the next dead dial fails loud the day it is written instead of years later.

The general lesson, again: a parameter that is accepted and silently ignored is the worst kind of bug,
because the code looks correct and the output looks plausible. The only defence is a check that
exercises the parameter and asserts an effect (docs/MISTAKES.md #19-28, #107, #113 — same family).

---

## #116 — The audit gate was broken for the ENTIRE MCP flow, and only a real session caught it

A fresh MCP session, told to build a video and read the gate verdicts, reported that the audit gate
returned "file not found · 1 HARD issue" on every revision. Every other check was clean and it shipped
anyway by eyeballing frames, but it flagged the gate as broken.

It was. `verify/audit.mjs` did `path.join(repoRoot, sample)` on its argument. The MCP pipeline passes
an ABSOLUTE path (scenes live under `.vawe-data/`, and the store builds absolute paths), and
`path.join(repoRoot, "/abs/path")` concatenates into `/repo/abs/path` — which does not exist, so the
gate reported file-not-found and, being advisory, the draft shipped without a real layout check. The
browser nav had the same doubling (`?data=/${absolute}`). A relative arg — which is what every manual
test and `make audit` uses — was fine, so the bug was invisible to everything except the MCP.

**Why my own smoke tests missed it:** the smoke test renders through the MCP with absolute paths, so
it EXERCISED the bug, but it only asserts "draft ready" — it never reads the audit verdict. The gate
failed silently into an advisory field nobody checked. It took a session that actually READS the gate
output to see it.

**Fix:** normalise the arg to a repo-relative path once (`path.isAbsolute` → `path.relative`), reject
one that escapes the repo, and use that everywhere including the browser URL.

**The lesson:** a smoke test that checks "did it run" cannot catch "did it run correctly". The most
valuable test I have is a real agent driving the product for a real outcome and reading every result,
because it uses the outputs the way a customer will — and it found in one run a gate that had been
dark for the whole life of the MCP.

## #117 — a direction gate must measure beat-holds from real cut times, not start-clusters

**What:** the first `make direct` beat-too-short check computed beat durations from layer-start
clusters, then flagged any span under 0.6s. It fired on `creed` (which has NO cuts at all) and other
clean films.

**Root cause:** start-clusters are grouped with a >1.4s gap, so by construction no two interior beats
are ever closer than 1.4s. The ONLY span that can read as "tiny" is the last cluster's distance to the
video end (a late-entering CTA element) — a pure artifact, not a real short beat. The check could
therefore only ever produce false positives.

**Fix:** base beat-hold duration on real `cuts[].t` gaps (the true beat boundaries); skip the check
when a scene has no cuts. Demoted to WARN, since a fast montage is a legitimate choice.

**Which gate catches it now:** `make direct` itself — calibrated against every existing scene (55 pass
/ 5 fail, and the 5 are genuine ≥3 cut-family soup), so a check that fires on clean films is caught by
the calibration sweep, not shipped.

**The lesson:** a heuristic that can only fire on an artifact of its own segmentation is worse than no
check. Before trusting a new gate, run it across the whole corpus and confirm the clean cases pass.

## #118 — a loudness (LUFS) target is not an RMS gain; do it at the mux with ffmpeg loudnorm

**What:** the first `audio.loudness` implementation normalized the mixed PCM to the target with a
single broadband gain computed from the un-weighted mean square. A scene asking for -14 LUFS rendered
at -7.2 (7 dB hot). Adding BS.1770 K-weighting closed it to -9, still 5 dB off.

**Root cause:** integrated LUFS (ITU-R BS.1770) is K-weighted AND gated (it discards blocks below the
absolute/relative gates). A short clip that is mostly fade-in/out has lots of quiet blocks; an ungated
RMS includes them and reads far too quiet, so the gain overshoots. Matching a gated perceptual standard
in the PCM domain needs K-weighting + 400 ms gated blocks — a lot of DSP to approximate a tool we
already run.

**Fix:** apply loudness at the MUX via ffmpeg `loudnorm=I=<target>:TP=-1.5:LRA=11` (encode.Mux), which
implements gated BS.1770 correctly. The PCM mixer no longer touches loudness. Re-measured: -14.0 target
→ -14.3 LUFS, -3.6 dBTP. Deterministic for a fixed input + ffmpeg build.

**Which gate catches it now:** end-to-end measurement — render, then `ffmpeg -af loudnorm=print_format=summary`
reads the true integrated LUFS. A self-estimate that says "on target" is not proof; a real meter is.

**The lesson:** do not re-derive a perceptual standard (LUFS, K-weighting, gating) by hand when the
encoder already implements it. And verify a loudness knob with a real meter end-to-end, never by the
same formula that set it.

## #119 — a typed line cut off mid-type because its beat was too short

**What:** a mono `{ "module": "scene", "layers": [ ... ] }` line (`typing: 30`, 40 chars) sat in a
1.4s beat. At 30 chars/sec it takes 1.33s to type, so it finished at the exact frame the layer began
fading — the next beat's cut landed while it still read as "being typed." No gate said anything.

**Root cause:** `typing:N` types at N chars/sec, but nothing checked that the type-time fits inside the
layer's `duration` with a hold. type-time + hold must be <= duration, or the cut always lands mid-type.
Any author on any scene hits this — it is a framework gap, not one bad JSON.

**Fix:** (authoring) raised the speed to 48/s and the duration to 1.6s so it finishes at ~0.8s and holds
before the cut. (framework) `make critique` now has a `typing-cutoff` rule: it flags any typing layer
where `chars/cps + 0.4s hold > duration`, naming the minimum duration needed.

**Which gate catches it now:** `make critique` (rule `typing-cutoff`) — teeth-tested: it fires on the
original (30/s, 1.4s) and passes the fix (48/s, 1.6s).

**The lesson:** a time-based reveal (typing, count-up, draw, ken) must be given time to COMPLETE and
hold before its beat ends. A reveal the cut interrupts reads as broken, and the engine will interrupt
it silently unless a gate checks the arithmetic.

## #120 — beat transitions dipped to an EMPTY stage (jump-cut with a dip)

**What:** in a fast multi-beat film, every cut showed a ~0.4s frame of blank stage: the outgoing beat
faded fully out before the incoming beat faded in. Seam screenshots were empty (only the persistent
watermark). It read as a slideshow of dips, not transitions.

**Root cause:** our transitions are PER-LAYER (each layer independently enters via `cut`/`anim` and
exits via `out`), with nothing enforcing overlap. Authored back-to-back beats left a gap between one
beat's `end` (start+duration) and the next beat's `start`, so the stage went to zero. Both another engine
(`TransitionSeries` subtracts the transition from both neighbors and mounts both scenes at once) and
another engine ("the transition IS the exit; exit-then-enter is BANNED") avoid this by construction.

**Fix:** (authoring) overlap the beats — start each beat's entrance ~0.4-0.5s BEFORE the previous
beat's content ends, with `out:"blur"` + the next `cut:"blur"`/`cutTiming:"brake"`, so the two
cross-dissolve with no empty frame. (framework) `make critique` now has a `transition-dip` rule:
merge every content layer's [start,end] interval and flag any blank gap > 0.12s in the middle
(persistent watermarks and tiny captions excluded so they can't mask a dip).

**Which gate catches it now:** `make critique` (rule `transition-dip`) — teeth-tested: it fires when
beats are pulled apart into gaps and passes the overlapping timeline.

**The lesson:** a transition is an OVERLAP, not a hand-off across a void. The outgoing content must
still be on screen when the incoming arrives; the motion between them IS the transition. Deeper win
(roadmap Seam D): true two-scene shader transitions that composite outgoing + incoming on the GPU.
## #121 — Seam D whole-stage bake deadlocked the render: the virtual clock starved chromedp's readiness Poll

Seam D (two-scene shader transitions) rasterises the two beats either side of a boundary into textures
at build time, inside boot's awaited phase. The scene booted fine in isolation (puppeteer: ready in
~1s, textures non-blank) but every REAL `bin/vawe` render hung at "capturing…" with zero frames
written and no error. Four wrong guesses got killed by cheap tests before the real one: not the
foreignObject bake (probe replicated it fine), not the second WebGL context (forcing the 2D fallback
still hung), not old-headless rAF starvation of the bake itself (a chromedp probe reached
`__engineReady===true` in 1s).

**Root cause.** `internal/scene/scene.go` waits for `window.__engineReady` with `chromedp.Poll`, whose
DEFAULT polling mode is `raf` — it re-evaluates the predicate inside `requestAnimationFrame`.
`core/boot.js installVirtualClock()` virtualises `requestAnimationFrame` (callbacks are QUEUED, flushed
only on `__vt.set`) the moment it runs, which is BEFORE the awaited bake. So Poll's first check ran
while `__engineReady` was still false (bake in flight), and its rAF-driven re-check never fired again →
deadlock. `sample.json` never hit this because it becomes ready in the same tick Poll first checks;
the ~1s seam bake widened the not-ready window enough to lose the race. **Any** author adding awaited
build-time work (Seam C's DOM bake, a heavier preload) would hit the identical wall — a framework bug,
not an authoring one.

**Fix (core/boot.js).** Split the virtual clock: `Date` / `performance.now` / `Math.random` are
virtualised immediately (the bake needs seeded, frame-pure time so every worker bakes identical
textures), but the TIMERS (`requestAnimationFrame` / `setTimeout` / `setInterval`) stay NATIVE through
boot+bake and flip to virtual only on the first real `__vt.set` (the first rendered frame). Readiness is
now signalled while rAF is still native, so Poll observes it. The bake uses a new `__vt.setBake` that
seeds time WITHOUT virtualising timers. Existing scenes are unaffected — timers are virtual again the
instant rendering starts — proven by `make probe` + `make canvas-purity` (byte-identical, order
independent) on the sample scene.

**Which gate catches it now.** `make probe` / `make canvas-purity` still guard purity; more to the
point, the render simply completes now, and the seam scene passes both gates (3 canvases, order
independent). The method note that finally worked: reproduce the exact Go/chromedp flow in a tiny
`cmd` probe with a watchdog that prints the stuck action — it named `nav+poll` immediately, which no
amount of puppeteer testing (different, non-starving headless) had revealed.

## #122 — seams ran at LINEAR speed while cuts were eased: every two-scene transition felt mechanical

**What.** A scene `cut` shapes its progress through `TIMINGS` (smooth / snappy / rush / brake …, core/cuts.js),
so it accelerates and settles. A `seam` did NOT: `renderFrame` drove the compositor with raw
`p = (t - s.t) / s.dur` — constant speed start to finish. A whipPan or slide that MOVES content at a
flat rate reads robotic, exactly the "not smooth" complaint. This is a framework gap, not an authoring
one: no author could fix it from the JSON (there was no field), and it hit every brand.

**Root cause.** Seam D shipped the compositor and the bake but reused cuts' progress only as a raw
ratio, never the easing half of cuts' two-axis model (timing × presentation). MOTION-CRAFT already says
"never linear on visible moves"; the seam path silently broke that rule.

**Fix.** Seams take a `timing` field (the same `TIMINGS` curves as cuts), applied in scene.html as
`p = TIMINGS[s.timing]((t - s.t)/s.dur)`. Default `smooth` (ease-in-out) — the correct transition
easing (Emil Kowalski: moving/morphing → ease-in-out), so seams are eased by default, `linear` opt-in
for a deliberately constant sweep. An unknown timing throws (no silent coerce, unlike the fx path). No
committed scene used seams, so the default change has zero baseline blast radius; purity is intact
(easing is pure in p) — `make probe` still byte-identical, and the seam scene renders across 8
out-of-order workers unchanged.

**Which gate catches it now.** `make schema-drift` compares `seams.item.timing` against `TIMINGS` (a
copied enum can't drift). `make transition-preview FX=… TIMING=linear|smooth` renders the window as a
filmstrip so the easing is visible (where the motion bunches) before authoring. `make direct` now also
suggests ONE eased seam at the payoff, applying the decision procedure (docs/CRAFT/TRANSITIONS.md)
instead of leaving seams undiscovered.

## #123 — neon bloomed a flat FLOOD colour, not the image's own colours (not how neon works)

**What.** The luminance-bloom refactor (#112) thresholds luminance for the highlight mask (correct), but
then FLOODED a single colour through that mask (`feFlood` + `feComposite operator=in`), throwing the
source's colours away. So `neon` painted one uniform glow: its default `color: var(--accent)` could not
encode into the SVG filter id (an id carries literal RGB, a CSS var can't), so it fell to WHITE — a
white-glowing neon. A real neon bleeds the image's OWN colours: a red sign glows red, a cyan one cyan.

**Root cause.** The bloom modelled the glow as "mask × tint", a stylised choice, and made it the only
mode. `neon`/`glitchGlow` inherited a flood tint they never wanted; the accent default was dead weight
(unencodable) that silently became white.

**Fix (core/filters.js + core/looks.js).** `buildBloom` now masks the **SourceGraphic** by the highlight
alpha when no colour is set (`SourceGraphic in mask` → the bright pixels keep their own colour → blur →
a colour-true glow); the flood-tint path stays for looks that WANT a uniform colour (dreamyHaze white,
halationFilm warm, cyberpunk magenta — all keep an explicit `glowColor`). Filter id encodes `src` for
the self-coloured glow vs the RGB for a tint. Removed the dead `color: var(--accent)` from `neon` and
`glitchGlow`; the `bloom` pass drops its `'#ffffff'` fallback so "no colour" means "source-coloured".
Verified by rendering red/cyan/yellow squares under `neon`: each glows its own colour.

**Follow-up (fixed).** The highlight mask first kept keying on Rec709 luminance, so a saturated-but-dark
colour (pure red/blue) barely crossed the threshold and under-glowed. `buildBloom` now takes a `key`
option: `value` (max(R,G,B) via feBlend "lighten") keys on HSV value, so a neon tube glows its colour at
full strength regardless of luminance. neon + glitchGlow use `value`; every other bloom look stays on
`luma` (unchanged). Verified by render (red/cyan/blue squares all glow strongly in their own colour).

## #124 — our videos read STATIC and small next to real motion-graphics references

**What.** Recreating a real launch film (the Brew film, `twitter.mp4`), the first pass read as "inspired
by," not a copy. Measuring the reference (`make measure`) and comparing frames named the gap precisely,
and it was not one effect — it was a set of habits our defaults skip: (1) the reference camera never sits
still (a continuous zoom push on every beat; UI beats dolly 34%→71% area in ~1s) while ours held static;
(2) it transitions with zoom/punch that carry motion through the seam, ours hard-cut; (3) its hero words
FILL the frame (letters cropped at the edges) and sit off-centre, ours were small and dead-centred (the
`make slop` centred tell); (4) words punch-in and settle (easeOutBack), ours faded.

**Root cause.** These are authoring habits, not engine gaps — the engine HAS `camera`, `transitions[]`,
`motion` tracks, `cursor`, 3D. They just are not the default reach, and nothing documented the premium
habits, so each author re-learns them (or doesn't).

**Fix.** Captured the habits + the study pipeline (measure → catalog motifs → map to primitives) in
**docs/CRAFT/REFERENCE-STUDY.md**, linked from CRAFT/README, with the reference-feel→primitive map and a
worked before/after on the Brew film. Applied to the Act 1 proof: `camera` push per beat, `transitions`
zoom/punch, `align:"left"` + low `y` for asymmetry, `preset:"scale"` entrances — motion went from
slideshow to "reads like the same film."

**Genuine engine gap found (open).** The text `size` caps at **260**, which blocks the frame-filling hero
scale premium references use (the reference "Today." is ~2× ours). Reachable today by pushing the
`camera` in on the beat; a cleaner fix is a fit-to-width or a higher hero-size cap on the text layer.
Logged here as the next text-layer improvement.

**Which gate catches it now.** `make slop` already flags dead-centre; `make measure` (self-verify)
confirms our render's motion matches the reference's curve; REFERENCE-STUDY.md is the checklist so the
habits are a deliberate reach, not a rediscovery.

## #125 — the camera zoom "shook" / wasn't smooth: cameraAt eased EVERY segment, zeroing velocity at each keyframe

**What.** A multi-keyframe camera push read as pulsing/shaking, not a smooth glide. Two compounding
causes: (1) authored keyframes that REVERSED (zoom in to s1.08, then snap to s1.02 at the next keyframe
0.05s later) — a visible in-out jerk at every beat; (2) the deeper engine cause — `cameraAt` hardcoded
`easeInOutCubic` PER SEGMENT, which drives velocity to zero at the start and end of every segment. So even
a monotonic chained push (kf1→kf2→kf3) decelerated to a stop at each interior keyframe and re-accelerated
— accelerate·stop·accelerate·stop — which reads as a pulse/shake. (The text itself was fine: `#cam` is
GPU-promoted with `will-change:transform`, so it scales its rasterised texture smoothly; the shake was the
camera curve, not text re-rendering.)

**How another engine/another engine avoid it.** One CONTINUOUS interpolation per shot — `interpolate(frame,
[start,end], [from,to], {easing})` — a single curve across the whole move, never chained ease-in-out
segments that reset velocity. A new shot is a new Sequence + a TransitionSeries, not a camera reset
mid-shot. And they animate `transform:scale` (GPU, sub-pixel) on a promoted layer, never `font-size`
(which reflows/re-hints and genuinely jitters).

**Fix.** `cameraAt` now honours a per-keyframe `ease` (mirroring `motionAt`), default `easeInOutCubic` so
every existing camera is byte-identical (`make probe` confirms). Set `ease:"linear"` on interior keyframes
for a velocity-continuous multi-keyframe push (verified: constant per-frame delta across the interior
keyframe = no velocity break). Added `camera[].ease` to the schema. In the authoring, the reversing
keyframes were replaced by one smooth camera glide + per-layer `motion.scale` with `ease:"linear"` (the
per-element push, the another engine way) — the beat now measures `linear`, residual 0.000 (perfectly smooth).

**The lesson (in REFERENCE-STUDY.md).** For a smooth continuous zoom: ONE monotonic move, no reversals,
`ease:"linear"` on interior keyframes (or a single 2-keyframe glide); per-beat push via per-layer
`motion.scale`, not chained camera resets.

## #126 — seams rendered DEAD SILENT under `audio.auto`: sound design derived cuts + stings but never seams

**What.** With `audio:{auto:true}`, the scene builder derives an SFX cue per transition — a whoosh on
each cut, a reveal on each sting. It read `layers[].cut`, `data.cuts`, and `stings`, but NOT `data.seams`.
So every SEAM (the two-scene GPU blends: whipPan, cinematicZoom, crossWarp, sdfIris, dispersion, lens,
flashWhite, …) played completely silent — and a whipPan is exactly the transition that most wants a
whoosh. Worse, this hit the NEW unified `transitions` surface hardest: `transitions:[{fx:"whipPan"}]`
lowers to a seam (core/transitions-lower.js), so an author using the headline API got a gorgeous,
mute transition. `make direct` payoffs are all seams too — every one silent.

**Root cause.** The cue-derivation loop simply had no seam branch, and there was no gate asserting
sound-design covers every transition mechanism. Silence is the worst failure mode (MISTAKES passim):
the engine accepted the seam, rendered it, and dropped its sound with no error.

**Fix.** (1) Added `SEAM_CUE` (13 seam fx → Cuelume voicing, same logic as CUT_CUE: whip→whoosh,
iris→bloom, zoom→droplet, flash→press) and a `data.seams` derivation branch in scene.html. (2) While
there, found CUT_CUE had ALREADY drifted — audio-bake.mjs had `push:'whisper'`, scene.html's hand-mirror
did not. Root-caused both to the same disease: the cue tables were duplicated by hand in two places.
Extracted them to **core/audio-cues.js** (pure data), now imported by scene.html (render mix),
audio-bake.mjs (bake catalogue) AND lib-test — one source of truth, drift impossible.

**Gate that now catches it.** lib-test asserts `SEAM_CUE covers every SEAM_FX` and every voicing
resolves to a baked wav. A new seam fx added to core/seams.js without a cue row fails the gate loudly
instead of shipping mute. Blast radius: `vawe-identity.json` (seams + auto) gains its seam whooshes;
frames byte-identical (`make probe` green — audio is meta, not renderFrame).

## #127 — `dy`/`dx` set without `anchor` silently did nothing: two pin-centred lines rendered on top of each other

**What.** Scoring the seam demo, two payoff lines ("every seam" / "is scored"), both `pin:"center"`
with `dy:-105` / `dy:+105` to stack them, rendered ON TOP of each other — a garbled overlap. The `dy`
was ignored. scene.html reads `L.dx`/`L.dy` ONLY inside the `if (L.anchor)` relative-placement block
(scene.html:177-185); a `pin`/`x`/`y` layer never consults them. So `dy` on a non-anchored layer is dead
config that READS as an intended offset and does nothing — the classic silent-substitution failure.

**Root cause.** No gate. The validator flags an UNKNOWN prop ("will ignore it silently"), but `dx`/`dy`
are KNOWN props that are only *conditionally* honoured, and nothing checked the condition. Accepted, ignored,
no error — exactly what MISTAKES #70 says must never happen.

**Fix (gate).** core/validate.mjs `check()` now hard-errors when a layer sets `dx`/`dy` without `anchor`,
naming the three real ways to stack/offset (anchor+at · one text layer with `<br>` · pin/y). Verified: no
tracked scene carried dead dx/dy (zero false positives), the negative case now fails loudly, tracked scenes
still pass. The demo was fixed the `<br>` way (one layer, natural line stacking).

**Lesson.** A prop that is honoured only under a companion prop is a silent-drop waiting to happen. When
the engine reads an input conditionally, the validator must assert the condition — "works or fails loudly",
never "accepted and ignored".

## #128 — beatsync couldn't snap cuts past the music LOOP: a short bed left most of a film off-grid

**What.** `make beatsync` snapped only 2 of 5 cuts in a 21s film. The bed (warm.wav) is an 8s loop; the
Go mixer repeats it to fill the film, but the beatmap only covers the 8s track file — so there are no
beats past 7.7s, and every cut after the first loop (11s, 14s, 17s) had nothing to snap to and was left
off-grid. A beat-synced film that desyncs after 8 seconds is worse than not syncing.

**Root cause.** beatsync read the beat grid verbatim from the beatmap without accounting for the bed
looping in the render. The grid described one loop; the film played several.

**Fix.** beatsync now UNROLLS a looping grid: a seamless bed keeps its beat phase across the loop seam,
so beat b recurs at b + k·period (period = the track's `seconds`). It replicates the grid across the
scene duration before snapping. On the 21s film: +33 beats → 4 of 5 cuts now land on the beat (the
last is a punch left 0.13s off, under no tolerance). Idempotent and regression-checked on the seam demo.

**Lesson.** A grid derived from an asset file is not the grid heard in the render when the engine
transforms that asset (loops it, time-stretches it). Sync tools must model the transform, not the file.

## #129 — built a sparse TYPE-TEASER when the brief wanted a dense PRODUCT DEMO (told, didn't show)

**What.** Asked for a launch film with the density of a real reference, I shipped 6 big-type-on-black
beats in 21s ("On brand.", "in minutes.") and used ONE of 15 captured product surfaces. It read as
empty and slogan-y next to the reference, which SHOWS the product working (prompt → generate → on-brand
→ canvas → send → results) across a longer runtime.

**Root cause (not what it looks like).** It was NOT too few cuts — ours cut MORE often than the reference
(0.29 vs 0.20 beats/sec). Three real causes: (1) FRAME EMPTINESS — one word on a black field carries a
fraction of the information a full product frame does; (2) TELLING not SHOWING — "On brand. Every time."
is a claim with zero on-screen proof, the exact anti-pattern the value gate forbids ("never claim
on-screen what the video doesn't show"); (3) UNDER-USING REAL ASSETS — 15 sections captured, 1 used, so
the film substituted type for the product. Plus too short to walk a product journey.

**Fix / rule.** A product launch film SHOWS the product. Every claim beat must be backed by the real
surface that proves it (revenue claim → the revenue UI; on-brand → the collage; integrates → the ESP
grid). Big-type-on-black is a TRANSITION or a hook, never the whole film. Density = information per
frame (a real surface + a hero line + support), not cuts per second. Use the real captures you have;
if you captured 15 surfaces, the film should draw on most of them. Longer is fine if every beat earns
its time (the value gate). This lesson now lives in docs/CRAFT/RECREATION.md ("Density: show it").

**Gate.** No static gate can score "shows vs tells" — this is a judged property. `make judge D=… VS=brew`
+ the value gate in the vawe-video-planning lock sheet (every beat names the artifact that earns it) are
the checks; run them before shipping a launch film.

## #130 — our motion read FLOATY, not because we lacked snap but because the snap was never wired or defaulted

**What.** Videos looked soft next to real motion graphics. The instinct was "we need spring/overshoot
easing." We already HAD it — `core/motion.js` ships `easeOutBack`, elastic, bounce, an analytic
`spring()`, `springEase`, and a per-brand `motion` personality object. It just never reached the pixels.

**Root cause.** Two silent gaps. (1) `motionDefaults(theme)` — the `{easing,bounce,settle,enter,
durationScale,stagger}` personality — was defined, validated by lib-test, and consumed by NOTHING at
render time: `formats/scene/scene.html` never imported it, so a brand's declared snap did nothing. (2)
The default timing was floaty: `enterDur 0.45 / exitDur 0.4` (a half-second move reads soft) and the
default `rise` used `easeOutSettle` at bounce 0.08 — essentially no overshoot. So every default-authored
layer glided in. Having the capability in the library is not the same as applying it.

**Fix.** Wired `motionDefaults(theme)` into scene.html (durationScale scales enter/exit, stagger feeds
split-text, applied as the fallback only — a layer's own values still win). Tightened the global defaults:
`BASE_ENTER 0.32 / BASE_EXIT 0.28` (exported from core/clips.js so scene.html scales from ONE source).
Added `easeOutSnap` (spring, bounce 0.16) and pointed the default `rise` at it so entrances overshoot-and-
settle. `pop`/`scale` already used `easeOutBack`. This re-baselines every scene's motion (accepted).

**Gate.** `make lib-test` holds the easing contract (f(0)=0, f(1)=1; overshoot curves allow-listed incl.
`snap`). `make probe`/`make snap` re-baseline the DOM signatures; diff them to see which scenes changed.
The judged quality is the before/after clip (`formats/scene/motion-test.json`).

## #131 — the music bed BUZZED because it was synthesized oscillators, and it was auto-selected

**What.** The default soundtrack read as a drone/buzz. The bed (`warm`/`calm`/`tense`) is not a recording
— it is stacked sine oscillators summed by `musicBed()` (core/audio-kit.mjs), with no percussion or real
instrument. Worse, `core/audio-select.js` auto-selected one of these synth beds for several profiles, so
a scene got the drone without asking.

**Root cause.** A synthesized pad has no beat and no timbre variation; summed sines ring as a buzz. It was
the wrong instrument for a bed, and nothing routed around it because the profile→bed map pointed straight
at it. Silence was already the engine default, but `music:"auto"` (and the `calm→music.wav` copy) reached
for the synth.

**Fix.** Nothing auto-selects a synth bed anymore. `core/audio-select.js` maps music moods onto REAL
royalty-free loops (`make music-pack` → assets/music/{lofi,chill,beat}.wav, Mixkit, no-attribution,
provenance in credits.json); restraint profiles map to silence. Dropped the `calm→music.wav` default so
no synth bed is ever the implicit soundtrack. Silence + crisp SFX is the default; a real beat is an opt-in
asset (and a real loop has a real beat, so `make beatsync` can finally snap cuts to it). The synth beds
stay available for anyone who names one explicitly, but they are no longer the default.

**Gate.** `make sfx-check` still holds the SFX duration classes. Music is gitignored/re-fetched, so the
repo redistributes nothing; `credits.json` records every source + licence (confirm music licence before
commercial release — it differs from the SFX licence).

## #132 — a bare bed NAME in `audio.music` shipped SILENT: the Go mixer and the validator disagreed on resolution

**What.** `vawe-identity.json` set `"music": "tense"` (a bare bed name) and played nothing — silent, with
no error. The validator reported it fine. Two independent resolution rules had drifted apart.

**Root cause.** (1) The Go mixer's `resolve()` joins `base + p` literally and appends NO extension, so the
bare name "tense" matched no file and dropped to silence. (2) `core/validate.mjs` DID accept it — it
checks `assets/music/<name>.wav` — but only when `audio.auto !== true`, and vawe-identity had `auto:true`
(the auto-SOUND-DESIGN flag, which has nothing to do with music). So the validator skipped the check that
would have caught it. Two resolvers, two different answers, and the gate abstained on the one scene that
needed it. Classic silent substitution — the failure mode the audio doctrine explicitly forbids.

**Fix.** Made the two agree. The Go mixer now resolves a bare bed name (no separator, no extension) to
`assets/music/<name>.wav` via the existing `resolve` fallback arg (internal/audio/audio.go) — a named bed
works, a real path still resolves directly. The validator no longer skips the music check on `auto:true`
and mirrors the mixer's rule exactly. Separately, vawe-identity was pointed at silence (it is the `linear`
profile — silence is the score — and "tense" was a retired synth drone), so the fix does not resurface a buzz.

**Gate.** `make validate` now warns on any `audio.music` that will not resolve, on every scene including
`auto:true` ones. The rule it checks is byte-for-byte the mixer's rule, so the two cannot drift again.
