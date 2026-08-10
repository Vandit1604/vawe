---
when: you hit something odd in the engine, or you just fixed one and must log it
answers: "the numbered mistake→root-cause→fix→which-gate-catches-it log; the repo memory"
group: process
---

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
suggestion in `core/validate.mjs` for enum typos. Doctrine: when a default doesn't fit, CREATE or
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
- **`typing` + `<b>/<em>`** → typing revealed characters literally, so tags showed as text.
  **This rule is retired** — typing has been HTML-safe since 2026-07-24 and the warning went stale. See #85.
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
**The fix:** `"aspect": "16:9"` is now IN each scene. Plus a guard: `scripts/site/site-assets.mjs` records the
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
**Also found:** `make audio` (synth) and `make sfx-check` (recorded) write the same directory, so baking
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

Editing `core/surfaces/paint.js` for resample changed the off-window line that
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
the schema enums before `make schema-check` existed.

**Fix:** `make docs-drift`, registered in the mutation harness (37/37). Two narrow checks:
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

`make docs-drift` shipped hours earlier to stop ROADMAP.md listing shipped work as missing. It
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

**Fix:** the child enum is the full layer registry, and `make schema-check` now derives it from
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
another engine ("the transition IS the exit; exit-then-enter is BANNED") avoid it a different way.

Read the two sources before repeating either claim, because they are not the same shape and this file
said they were. **another engine's IS structural**: `TransitionSeries` subtracts the transition from both
neighbours and mounts both scenes at once, so a gap is not expressible. **another engine' is not.** The
rule exists exactly as quoted, but it lives in `skills/**/*.md` as LLM prompt text; none of its 88 lint
codes bans an exit tween, and the nearest one (`gsap_exit_missing_hard_kill`) assumes exits exist and
demands they carry a visibility kill so out-of-order seeking cannot strand stale state. What enforces
it is a division of authorship inside one workflow skill: a sub-agent is told it may never write an
exit, a separate injector owns every transition, and a `verify` script exits 1 unless each boundary is
cross-track with `overlap > 0`. That is arguably a better idea than a check, and it is still a check.
A hand-authored composition run through `another engine render` gets none of it.

The distinction matters here because "by construction" is the thing worth copying and a gate is not.
Checked against both repos on disk (`/Users/vandit/Developer/code/{another engine,another engine}`).

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

**Which gate catches it now.** `make schema-check` compares `seams.item.timing` against `TIMINGS` (a
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

## #133 — a `lottie` layer with a root-RELATIVE src silently rendered EMPTY (no warning)

**What.** A `lottie` layer with `src:"assets/lottie/x.json"` (no leading slash) showed nothing — an empty
box, no error. Same file with `src:"/assets/lottie/x.json"` rendered fine.

**Root cause.** `preloadLottie` fetched the src verbatim. Without a leading slash the URL resolved against
the scene HTML at `/formats/scene/` → `/formats/scene/assets/lottie/x.json` → 404, caught by a bare
`catch (e) {}` that swallowed it. So the animation data was never loaded and `lottie.js` degraded to its
"missing src → empty layer" path — silently. (The runtime global is fine: the vendored UMD exposes
`window.lottie` via globalThis; that was a red herring.)

**Fix.** `preloadLottie` now normalises a non-absolute src to root-relative (`'/' + p`) before fetching
and WARNS on a non-OK status or throw instead of swallowing it. Keyed by the original src so the build
lookup still matches. Mirrors how `preloadSpectrum` already normalised its sidecar path.

**Gate.** Console warning on any lottie src that won't resolve. (A hand-authored Bodymovin JSON —
assets/lottie/spinner-arc.json — now serves as a live proof that authoring + rendering both work.)

## 82. Named GSAP fx typos degraded silently; two splitters could fight

**What.** A layer `fx`/`fxOut` name that didn't match a registered effect only produced a
`console.warn` at render time — a warning the batch render swallows. So a typo (`"poprIn"`) shipped an
unanimated layer with no failure, the exact silent-substitution the doctrine forbids. Related: `fxOut`
and a motion `out` both drive the exit transform, and `splitText` (GSAP line reveal) re-wraps a layer
AFTER the engine's own `split` already did — either pairing fights itself, again with no error.

**Root cause.** Layer `fx` names are a free-form string in the schema (not an enum, because the list
lives in `core/gsap-effects.js`), so schema validation couldn't catch a bad name, and nothing else did.
The conflict pairs were simply never checked.

**Fix.** `validate.mjs` gained `fxErrors(cfg)`: it checks every `fx`/`fxOut` name against the real
`GSAP_FX`/`EXIT_FX` exports (with a `nearest()` "did you mean" pointer), and rejects a layer that
declares `out`+`fxOut` or `split`+`splitText` together. Boot + `make validate` both run it, so a typo
now fails LOUD before any frame renders.

**Gate.** `make validate` (and boot-time `validateData`) reject unknown/conflicting fx names. The effect
lists are derived from the code, so a new effect is instantly both usable and validatable.

## 83. resolveEasing swallowed unknown easing names

**What.** `resolveEasing(e)` was `EASINGS[e] || easeOutCubic` — any name it didn't recognise SILENTLY
became `easeOutCubic`. So a typo (`"eastOutQuart"`), or a GSAP-style name an author assumed worked
(`"power3.out"`), rendered a different curve than asked, with no error. The move still looked plausible,
which is the worst kind of wrong: you can't see that the easing you specified was ignored.

**Root cause.** The registry lookup had no "not found" branch — the `||` fallback doubled as both the
empty-input default and the unknown-name default, so the two cases were indistinguishable and neither warned.

**Fix.** `resolveEasing` now checks membership explicitly and WARNS once per unknown name (listing the
valid ones) before falling back. Empty/absent input still defaults quietly. No pixel change — the fallback
curve is unchanged; the only new behaviour is the warning.

**Doctrine.** We decided NOT to adopt GSAP's easing vocabulary: our curves are the same math (GSAP
`power2.out` = our `easeOutCubic`, `back.out` = `easeOutBack`), so aliasing its names would just be a
second vocabulary for identical curves. The easing reference in docs/MOTION-CRAFT.md ("which curve, what
it feels like") is written in OUR names; the warn points a GSAP name at its native equivalent.

**Gate.** `resolveEasing` warns on any unknown ease; `make lib-test` already asserts every registry curve
holds f(0)=0 / f(1)=1.

## 84. The validator's TYPE pass policed block layers it was meant to exempt

**What.** `showcase-spot.json` and `showcase-flight.json` — committed, block-based scenes — could not
boot: `layers[6].to must be a number (got object)`, `layers[15].items must be a string (got array)`.
A `pointer` block's `to:{x,y}` and a `kpiRow` block's `items:[…]` are correct BLOCK props, but they were
being checked against the base LAYER schema (where `to` is a number, `items` a string), so valid scenes
failed validation and the render aborted. Surfaced by the new whole-library `snap-all` sweep, which boots
every scene (`make validate` only checks one sample per format, so it never saw these).

**Root cause.** Two validation passes disagreed. The unknown-prop pass already skipped `type:"block"|"comp"`
(they carry the block's own props — blocks-audit owns them). The field-TYPE pass (`walk` over the layers
array) had no such guard, so it validated a block's props against the base layer schema. The intent was
documented ("blocks ... this schema does not describe and must not police") but only half-enforced.

**Fix.** `walk`'s array-item recursion now skips an element whose `type` is `block`/`comp`, matching the
unknown-prop pass. Both showcase scenes boot and render again; the full validate suite stayed green.

**Gate.** `make snap-all` boots EVERY scene, so a scene that fails validation shows up as `errored` in the
sweep instead of hiding until someone happens to render it.

## #134 — every authoring-QUALITY gate was opt-in and WARN-tier, so effect-soup passed everything that ran

**What.** An author could ship a maximal "lots of effects, no direction" video and pass every gate the
render flow actually ran. The only MANDATORY gates were framework-integrity (schema + purity); `make video`
auto-ran only `verify/audit.mjs`. The quality gates that catch weak direction — `critique` (8 of 10 rules
WARN), `motion-director` (effect-soup/continuity/pacing all WARN, exit 0), `judge` (opt-in, last) — were
never in an automatic ladder. This is the structural cause behind #15/#80: "the static gates can't SEE
composition, so my eye was the only gate and it blinked" — the eye was ALSO the only thing invoking the
gates.

**Root cause.** The gates existed but nothing chained them or required them. Doctrine (MOTION-CRAFT,
TASTE-RULES, the planning skill) told the author to run them; running them was optional, so under time
pressure they were skipped and the doctrine did nothing.

**Fix.** `scripts/gates/author-check.mjs` (`make author-check`) chains validate · critique · direct · slop ·
inspect into one command, and `make video` runs it before rendering unless `NOCHECK=1` (mirroring the
`NOAUDIT=1` escape). It blocks on the pre-existing hard fails PLUS four book-grounded motion tells added to
`motion-director.mjs` (`linear-motion`, `monotone-timing`, `enter-and-retreat`, and the surfaced
`effect-soup`). Deliberate breaks are waivable per-scene via `{"authoring":{"allow":[...]}}`. Principles +
sources now live in `docs/CRAFT/DIRECTION.md`; the from-scratch narrative in
`docs/CRAFT/AUTHORING-WALKTHROUGH.md`.

**Gate.** `make author-check` (mandatory via `make video`). The vision `make judge` step remains
agent-in-the-loop — a script cannot force an honest read — but it is now a NUMBERED mandatory step in
CLAUDE.md's "After writing a JSON", not a trailing "consult if needed".

## #135 — no from-scratch "author a good video" walkthrough existed, so a blank page regressed to priors

**What.** The taste knowledge was rich but scattered and index-linked. There was no single narrative that
carried one video from a bare brief to shipped, so authoring with no brand site (the hardest case) meant
inventing everything — which defaults to centered Inter on a blue gradient.

**Root cause.** The plan half of the from-scratch flow was canonical (planning skill Step 0.5); the
authoring-craft half was deliberately distributed across CRAFT/ with only TASTE.md as an index — good for
reference, bad for "do this, in this order" under a blank page.

**Fix.** `docs/CRAFT/AUTHORING-WALKTHROUGH.md` — the one front-to-back narrative, chaining the arsenal in
use-order (manufacture the four things → lock sheet → JSON in layering order → `make author-check` →
`make judge` → ledger → harvest). Routed from TASTE.md, CRAFT/README, AGENTS.md, and the planning skill.

**Gate.** `make craft-coverage` fails if a CRAFT guide is orphaned from the README index, so the two new
docs can't silently fall out of the routing.

## #136 — `make inspect` silently passed when no `.intent.json` sidecar existed

**What.** The per-beat value contract (inspect vs a `.intent.json` sidecar) printed "nothing to verify" and
exited 0 whenever the sidecar was absent — which is almost always. So the value gate was invisible: not
declaring a contract looked identical to passing one.

**Root cause.** Absence of an optional input was treated as success rather than as a missing check.

**Fix.** Within `make author-check`, a missing sidecar is surfaced as a visible WARN ("this scene declares
no per-beat value contract"), and `--strict`/`STRICT=1` treats it as a failure. Standalone `make inspect`
behavior is unchanged for scripted use.

**Gate.** `make author-check` (the WARN is part of its report).

## #137 — enforcement only gated the DOWNSIDE (slop); nothing forced ambition, so authoring stayed plain

**What.** With the full arsenal in hand (kinetic presets, GSAP char fx, camera, seams, dolly) AND the
anti-slop/direction gates, the first two passes at the TokenJam launch were a plain `rise`+`fade`
slideshow — and every gate passed them. The gates caught effect-soup (too much) and hollow beats, but
nothing caught "too plain / under-directed." An agent authoring from a blank JSON satisfices with the
safe default and never reaches for the range it has. The user had to push twice to get kinetic motion.

**Root cause.** The quality system had only an upper bound (`effect-soup`) and correctness/value gates.
There was no LOWER bound on ambition, and no codified "good beat" to start from — so directed motion was
re-derived each video and under-reached.

**Fix.** Two-part forcing function: (1) `blueprints/` — directed-motion BEAT factories (`{type:"beat"}`,
expanded by `make expand`) so kinetic reveals / count-ups / cascades / dashboard dives are the DEFAULT,
not re-derived; (2) `scripts/gates/direction-floor.mjs` (`make direction-floor`, in `author-check`) — the
inverse of effect-soup: reads the motion vocabulary and FAILS a plain slideshow. Directed now lives
between the soup ceiling and the ambition floor. Doctrine: `docs/CRAFT/BLUEPRINTS.md` + DIRECTION.md.

**Gate.** `make direction-floor` (mandatory via `author-check`); `make blueprints` primes the author.
Covered by `lint-test` (plain fixture FAILS, directed fixture PASSES; a beat emits kinetic layers).

## #138 — seams flashed BLACK on every white-first scene without an explicit bg window

**What.** The TokenJam launch flashed full black (measured luma 0) at every seam boundary — dissolve,
whipPan, cinematicZoom, flashWhite. The stage is white; the flash was pure black.

**Root cause.** A seam blends two rasterised stage snapshots. `stageToCanvas` only composited the bg
canvas when `useCanvasBg` was true, i.e. when the scene declared a `bg` window. A scene that relies on the
theme's `.hs-stage` CSS background (no `bg` array — `bgWins=[]`) rasterised `root` ALONE → a transparent
snapshot → the seam's WebGL composited transparent as BLACK. Invisible on dark themes (black ≈ bg), a hard
black flash on white-first ones. Silent: no gate looked at seam pixels.

**Fix.** `core/seams.js stageToCanvas` — in the no-canvas-bg branch, fill the theme base bg (read `--bg`
off `.hs-stage`, fall back to computed background-color, then `#fff`) BEFORE drawing the DOM, so the
snapshot matches the live frame. Pure (bake path, runs once). Fixes every white-first scene with seams,
not just this one; dark themes are unaffected (the fill is their dark `--bg`). `make probe` stays green.

**Gate.** Verified by frame-luminance at seam boundaries (was 0, now 255). A future seam-pixel gate could
assert no all-black frame appears where the theme bg is light; for now the fix is behavioural + logged.

## #139 — the killer per-frame effects were missing (border-beam, aurora, meteor, flash-bloom)

**What.** Videos read flat next to real motion-graphics because the premium web-motion vocabulary simply
did not exist in the engine: a light travelling a border, a drifting colour-mesh background, meteor
streaks, a one-shot glow swell. Authors defaulted to `rise`+`fade` because there was nothing else to reach
for, and EFFECTS.md (the arsenal catalog) had nothing to advertise.

**Root cause.** Not a bug — a coverage gap. The determinism model was (wrongly) assumed to be the blocker.
It is not: every one of these is a closed-form function of local time `t` (border-beam = conic angle
`f(t)`; aurora = sum-of-sines blob centres; meteor = ballistic progress `((offset + t/period) mod 1)`;
flash = an attack-decay envelope). No CSS `@keyframes`, no state, no `Math.random`/`Date` — so
`renderFrame(n)` stays pure and seek-safe. another engine (the reference) is itself fully deterministic and
gets all of these *because of* that model, not despite it.

**Fix.** `core/layers/beam.js` (new: border-beam + shine, DOM conic ring masked to the border, re-emitted
each frame + dataset-stamped). `core/paint-fx.js` +`aurora` (additive `lighter` radial blobs drifting on
detuned sines) +`meteor` (gradient-tail streaks, closed-form progress, echo drawn behind the head each
frame — never accumulated). `core/layers/glow.js` +`flashEnvelope()` and an `L.flash` mode (finite
attack→decay bloom, peak capped ≤0.45 per HF doctrine — a swell, not a strobe). All added to the schema
(paint enum + `flash`/`hues`/`headColor`/`length` props) and to the generated EFFECTS.md.

**Gate.** `make canvas-purity D=<scene>` proves aurora/meteor pixels are order-independent; `schema-drift`
(13 enums + 117 props) proves the schema paint enum tracks `PAINT_FX_NAMES` and the new props are all
defined; `make effects-check` proves EFFECTS.md lists them; `make lib-test` covers the pure helpers.

**Gate seam noted (not a regression).** `make probe M=<mod> D=<file>` silently IGNORES `D=` — it probes
the module's sample scene, never the passed file, so a specific scene's DOM-layer purity (beam/glow) is
not testable through `probe`. `canvas-purity` DOES honour `D`. beam/glow DOM purity is structurally safe
(pure in `t`, dataset-stamped, same contract as the shipped `glow.pulse`). A future `probe` could accept
`D` to close the seam; for now it is logged so the next author knows `probe`'s `D` is a no-op.

## #140 — `morph` was assumed to be TextMorph for EVERY layer type (svg shape-morph rendered as text)

**What.** A new `svg` layer with `morph:{to:"<path d>"}` (a true shape-morph) rendered the target path
STRING as on-screen text, and the shape never melted. The path `d` literally appeared as words in the
corner of the frame.

**Root cause.** `formats/scene/scene.js:151` ran `if (L.morph && window.gsap) buildMorph(el, L, ...)`
unconditionally. `buildMorph` (core/morph.js) is TextMorph: it rebuilds the element's children as glyph
spans of `morph.to`. So ANY layer carrying `morph` was hijacked into text, regardless of `L.type`. The
svg layer's own shape-morph in `svg.js frame()` then had nothing left to drive. Classic silent
substitution — the engine accepted the input and did the wrong thing without a word (CLAUDE.md: "silence
is the worst failure").

**Fix.** Type-guard the dispatch: `if (L.morph && L.type !== 'svg' && window.gsap) buildMorph(...)`. Text
and count layers still get TextMorph; svg owns its shape-morph. Pure (build-time routing), so
`renderFrame(n)` stays seek-safe; `make probe` green.

**Gate.** `make lib-test` covers the shape-morph maths (lerp endpoints, spin-returns-to-identity, closed
`d` output). The silent-substitution class itself has no static gate yet — it was caught by the mandatory
eyeball of a rendered frame (docs/JUDGE.md), which is exactly the backstop the static ladder can't be.

## #141 — camera library + logoReveal: two authoring traps found building the demo (fixed at the source)

**What.** Building the motion-showcase demo surfaced two ways an author gets a silently-wrong render:
1. `kineticHook` hardcoded the hero `word` at size 300 — a long word ("MOTION") overflowed the portrait
   canvas edge with no warning. **Fix (framework):** added a `wordSize` prop (default 300) so the beat
   scales to the word/canvas. Every author benefits.
2. `logoReveal`'s `mark`/`morphFrom` paths are in the layer's `viewBox` space (default "0 0 100 100"), NOT
   stage pixels. Authoring them in 1080-scale coords rendered the shape far outside its box → invisible,
   no error. **Fix (docs, until a gate exists):** the beat comment now states the coord space loudly and
   shows a fitting example; the `svg` layer silently accepting off-viewBox coords is a latent gate gap
   (a future check could warn when a path's bbox falls wholly outside its viewBox).

**Also cleaned:** `vawe-creative` referenced `formats/scene/tokenjam-launch.json`, deleted in this overhaul's
Phase 0 — repointed to `creed-launch.json` (a dangling doc ref trains authors to distrust the guidance).

**Verified.** motion-showcase renders the full new stack — aurora bg, kinetic hook, border-beam card,
logoReveal (shape-morph + bloom + wordmark), diveIn camera, ctaEnd — and passes `make author-check`
(validate·critique·direct·floor·slop all green).

## #142 — sleek surface library (Phase 5): two gate interactions worth knowing

**What.** Adding `blocks/sleek.mjs` (glassCard · meshPanel · spotlightCard · borderBeamCard · grainOverlay
· bento) surfaced two gate behaviours, both handled at the source:
1. `blocks-audit` read `grainOverlay`'s feTurbulence data-URI `width='100%25'` (URL-encoded "100%") as a
   BAKED STAT ("a figure no caller stood behind"). A true-positive-shaped false positive. **Fix:** the
   grain SVG uses explicit `140` px dims (its tile size), so there is no `%` literal to misread. Cleaner anyway.
2. A new grid block MUST have a generated poster+scene or `lib-test`'s registry check fails
   (`make blocks-scenes`). This is by design — the block site derives from the manifest — but it means
   adding a catalog row is a two-step: row + `make blocks-sync` (docs · json · scenes).

**Design rule enforced.** Sleek blocks hold only STATIC CSS; the one that MOVES (`borderBeamCard`) composes
the Phase-2 `beam` layer, not a CSS keyframe (which the determinism reset would freeze). `glassCard` needs a
living background (aurora/mesh/paint) to blur — documented in docs/CRAFT/SURFACES.md, where the build-HTML-first
loop and the design-spec + 8-visual-styles picker also live.

## #143 — a new valid prop (`fill`) silently disarmed a meta-gate that used it as its "unknown prop"

**What.** After adding `fill` as a real `svg`-layer prop, `gate-mutation`'s self-test "validate catches an
unknown prop" went red: it injected `fill` as its example of an obviously-bogus prop and asserted validate
flags `unknown prop "fill"`. Now that `fill` is legitimate, validate (correctly) accepts it, so the
must-fail mutation no longer fired — the meta-gate "stayed silent."

**Root cause.** A meta-test hardcoded a specific prop name as its stand-in for "any unknown prop." That name
was one edit away from becoming valid. `validate` itself was never weakened (a genuinely-unknown prop is
still rejected — verified directly).

**Fix.** Point the mutation at `notARealProp` — a name no layer will ever accept — and match on it. Added a
comment so the next person who adds a prop doesn't re-collide.

**Lesson.** When a gate uses a concrete token as a proxy for a whole class, pick one that cannot join the
class. Blast-radius of adding a schema prop includes the meta-gates that assume that prop is invalid.

## #144 — ported the another engine craft: seam-QA, anti-front-load floor, author-the-frame, the spec contract

**What.** Studied a real another engine-built promo (its storyboard, `frame.md` design spec, per-beat
HTML+GSAP compositions, rendered frames, and the build session trace) to find what set its output apart,
then ported the transferable lessons into our engine. Four concrete changes:

1. **Seam-aware QA gate** — `scripts/gates/seam-snap.mjs` (`make seam-check D=<file>`). Their hardest-won
   lesson: the worst render bugs (a black flash, a morph that reads as a collision) live INSIDE the
   transition overlap, where `make beats`/`make audit`/`make probe` all step over them. The gate pulls the
   frames straddling every transition out of the rendered mp4 and flags a luminance dip present at the seam
   but absent just outside it (theme-agnostic — compares to local neighbours). Would have caught #138
   automatically. Two-sided proof: fires on a synthetic black-flash mp4 (luma 0.000 vs 0.961), clean on the
   showcase. **Note:** they hit the exact same black-transition-flash bug we fixed as #138 — independent
   confirmation it is a real, easy-to-miss class.
2. **Anti-front-load + no-two-beats-alike floor checks** — `scripts/gates/direction-floor.mjs` now WARNs
   `front-loaded` (≥80% of reveals in the first 30% with a frozen back half — the "slideshow" failure they
   ban by name) and `motion-monotony` (≥5 kinetic lines all on one preset — "no two beats move alike").
   Beat-composed scenes spread reveals and mix presets, so they clear; a hand-authored front-load trips it.
3. **author-the-frame** (`docs/CRAFT/AUTHOR-THE-FRAME.md`) — their expressiveness edge is a beat authored as
   a bespoke HTML+SVG+GSAP file. Key finding: **our `seekAll` already seeks `window.__timelines`, the exact
   mechanism theirs uses** — we are not behind on the seek model. And a bespoke inline `<svg>` dataviz
   already renders as an `html` layer (static SVG survives sanitization) and stays pure. The one real gap is
   per-CHILD inline choreography; documented honestly, with why we do NOT open `<script>` in the untrusted
   html layer (a real past exploit read private files into a draft).
4. **The spec contract** (`docs/CRAFT/FRAME-SPEC.md`) — their `frame.md` (per-video design system) +
   `STORYBOARD.md` (scene-by-scene, each beat naming its blueprint with Reproduce/Adapt, its mechanism, its
   persuasion, and its emotion). Mapped every storyboard field to our vocabulary (themes · BEATS · EFFECTS.md
   · cuts), plus their reveal model (each cue its own window, back-50%) which #2 now enforces.

**Gate.** `make seam-check` (new, two-sided verified) · the floor's two new WARNs (verified fire + no
false-positive on beats) · `craft-coverage` (both new docs linked) · full battery green.

**The honest scorecard.** We now match another engine on MECHANISM (seeked-GSAP determinism, camera
coordinate-target-zoom, path-draw, count-up, morph, bespoke SVG). What set them apart was never the
engine — it was the CONTRACTS (spec + storyboard), the EDITING (held reads, bookends, cut rhythm), and
QAing the seams. Those are now ported as doctrine + gates, not just admired.

## #145 — ported the full another engine pipeline (Steps 0-6) as local-model tooling

**What.** Studied the authoritative another engine `product-launch-video` skill (its gated Step 0-6 pipeline)
and built our own version of all five adoptable pieces, offline / local-model only:

1. **Design-preset library + brand remix** (their Step 2) — `presets/*.json` (editorial · technical · bold ·
   warm) + `scripts/brand/theme-remix.mjs` (`make theme-remix PRESET=… BRAND=… BG=… ACCENT=…`). Maps a
   brand's base+accent onto the preset's roles and DERIVES the full 15-key palette (surfaces, line ladder,
   text ramp, accent tints) with contrast checks. Good coherent design in one command instead of hand-
   authoring every theme from pixels. Verified: remix → valid theme → coherent render.
2. **Local narration TTS** (their Step 3.1) — `scripts/media/tts.mjs` (`make tts`) on macOS `say` (on-device,
   offline, no key). Emits `<name>.vo.wav` + `<name>.vo.words.json`. KEY finding: the engine ALREADY mixes
   VO (audio.go `vo`/`voWords`, ducks music under speech) — only generation was missing. Verified: audible
   VO track (mean -21 dB) in the render.
3. **Storyboard-as-proposal gate** (their Step 3) — `scripts/gates/storyboard-check.mjs` (`make
   storyboard-check`) + `docs/CRAFT/STORYBOARD-TEMPLATE.md`. Enforces a one-sentence message + per-beat
   type/onscreen/WHY before any JSON. Two-sided verified.
4. **Gated orchestrator skill** — `.claude/skills/vawe-launch/SKILL.md`: the Step 0-6 flow adapted to our
   tools (capture → theme-remix → storyboard-check → tts → blueprints → seam-check/judge), user-gated at 0/3/6.
5. **Parallel per-beat authoring** (their Step 5) — `.claude/workflows/beats-parallel.mjs`: fan out one
   sub-agent per storyboard beat, each authors its layer fragment against the shared spec, merge into one
   scene. Opt-in (Workflow tool). Delivered as a ready capability.

**Framework fix found.** `make theme-remix BG=#hex` — the `#` was eaten as a shell comment, so the remix
silently fell back to preset base colours. Fixed by quoting the values in the Makefile recipe (`"$(BG)"`).
The kind of silent substitution the repo warns about — caught by reading the remix's echoed colours.

**Gate.** `theme-remix` self-validates against the theme contract; `storyboard-check` two-sided; `tts` output
verified in a render; full battery green; both new CRAFT docs linked (craft-coverage).

**The takeaway.** another engine' quality was never one magic feature — it was a *pipeline* (pick a vetted
design system, remix the brand in, storyboard with a why per beat, narrate, QA the seams). We now have that
pipeline end to end, local-only.

## #146 — theme-remix emitted an incomplete `bg` block; dark bg presets crashed the render

**What.** A theme from `make theme-remix` rendered fine on a plain ground but crashed the moment a scene
used a radial/aurora bg preset (`spotlight`, `constellation`, `mesh`, `deep`, …): `bgPreset` read
`P.deep[0]` of undefined. The remix only wrote `accent/tint/tint2/dotLight`; every bg preset also reads a
LIGHT and a DARK ground PAIR (`light`/`dark`/`deep`/`ink`/`darkMesh`/`paperBase`/`softBase`/`accentBase`).

**Root cause.** The remix's `bg` block was hand-listed, not derived to completeness — a silent gap that only
surfaced when a scene picked a preset needing the missing keys. Same class as an incomplete theme.

**Fix.** Derive the whole block: a light ground pair + a dark ground pair (both always present, so a scene
can pick ANY bg preset regardless of the theme's dominance), mapped onto every `*Base`/deep/dark/ink/
darkMesh/light key. Verified: the `glass` preset on a `spotlight` bg now renders (was a crash).

**Gate.** Caught by rendering a remixed theme with a dark bg preset (exactly the author-the-frame eyeball
step). A cheap future guard: `make theme-remix` could self-render a one-frame probe on a dark bg preset.

## #147 — dense per-child choreography (`parts`), so figures animate piece by piece by default

**What.** Our motion read flatter than another engine because a figure (a chart, a diagram) arrived as ONE
block — we animated at the layer level, they choreograph every child on a timeline (bar 1 grows, then bar
2, the line draws, dots pop). Added `parts`: a declarative per-child entrance stagger on ANY layer's
children (`html` inline-SVG, `group`, `svg`).

`{ "parts": [ {select:"rect",anim:"growUp",stagger:0.09}, {select:"polyline",anim:"drawOn",delay:1.3},
{select:"circle",anim:"popIn",delay:1.5} ] }` — one spec or an array (bars, THEN line, THEN dots).
Entrances: growUp/widen/popIn/fadeUp/riseIn/drawOn. Built as a paused GSAP tween that `seekAll` drives —
same mechanism as `fx`, so pure in n (probe green). NOT `<script>` in the untrusted html layer (that was a
real exploit surface); `parts` is the safe, declarative path that closes the density gap.

**Made it the DEFAULT, three ways:** the capability (dense is now a one-liner), the doctrine
(AUTHOR-THE-FRAME.md + the EFFECTS mechanism table say author figures this way), and the gate — the
direction-floor now warns `static-figure` when a 3+-child group or multi-shape SVG animates as one block.

**Gate.** `make probe` (parts are pure); `schema-drift` (new `parts` prop); the floor's `static-figure`
nudge two-sided verified; the Lumen demo's chart builds piece by piece. Small authoring gotcha logged in
passing: `countStart` is LOCAL to a layer's `start` (`t - start`), not absolute — a count scheduled at an
absolute time never fires.

## #148 — the composition path (per-beat GSAP timeline), and TWO framework bugs it surfaced

**What.** Adopted another engine' "one worker hand-writes a GSAP timeline per beat" model — but SAFELY. A
`composition` layer names a FIRST-PARTY builder in `core/compositions/index.js` (`{type:"composition",
comp:"pipelineFlow", props:{…}}`); the builder authors a bespoke multi-tween timeline (cards pop in,
connectors DRAW, a token TRAVELS each link, a check draws on) that `parts`/blueprints can't express. The
JSON carries only a NAME + DATA `props`; the code lives first-party, so untrusted MCP input can name a comp
and fill labels but cannot inject script (the inline-`<script>` exploit boundary holds). `seekAll` drives
the paused global timeline → pure in n (probe green). Every tween is a `fromTo` with `immediateRender:true`
(start values pinned; a `gsap.to(...immediateRender:false)` leaves the END value stuck on backward seek —
a render-order impurity); the travelling token appears/moves/vanishes in ONE keyframed `fromTo`; no colour
tween between two `var()` strings (GSAP can't interpolate them).

**Framework bug #1 (a REGRESSION, blast radius = every parts/comp scene).** `preloadGsap`
(core/preload.js) loads GSAP only when the scene JSON matches a trigger regex — and the boot→preload.js
extraction had dropped `parts` from that list (and my new `comp` was never in it). So a `parts`-only scene
loaded NO gsap and rendered UNANIMATED with no error — the silent-substitution failure. A figure that was
confirmed animating earlier had gone static. Root cause: the trigger list is a hand-copied second source of
truth that drifts from applyGsapHooks. Fix: added `parts|comp` to the regex + a comment tying it to
applyGsapHooks + composition.js. Verified: lumen's bars now scaleY in a stagger again (0.99→0.0).

**Framework bug #2 (served-prefix allowlist).** `internal/scene/scene.go` serves ONLY `core/ themes/
formats/ assets/` to the render page (a deliberate SSRF-ish boundary). A new top-level `compositions/` dir
404'd → the layer's module import threw → boot never signalled ready → the Go renderer timed out on EVERY
scene (while a plain static server booted fine, which is what isolated it). Fix: compositions are
browser-loaded ENGINE code, so they live under `core/compositions/` — inside the allowlist, no new served
prefix, boundary unchanged.

**Gate.** `make probe` (comp pure); `schema-drift` (new `composition` type + `comp`/`props` props);
direction-floor credits a `composition` as a directed technique; EFFECTS.md lists it; the
showcase-composition demo renders clean (seam-check clean, audit clean). The lesson worth keeping: the
gsap-trigger list and the served-prefix allowlist are both hand-maintained lists that a new feature must be
added to, and BOTH fail SILENTLY (unanimated render / boot timeout) rather than naming the cause.

## #149 — direction-floor nagged "no-camera" on scenes that HAVE a cameraMove (pre-expand blind spot)

**What.** The ambition floor credits a camera move by reading `d.camera` (the expanded keyframes), but the
floor runs PRE-expand (inside author-check, before `make expand`). A scene that adds a camera the sanctioned
way — the `cameraMove` sugar (core/camera-moves.js), e.g. `{"move":"slowPush","from":1,"to":1.04}` — still
tripped `[no-camera]` because the sugar hadn't been lowered to `d.camera` yet. So the gate asked for the
exact thing the author had already added. Hit twice (showcase-composition, tpot-launch).

**Fix.** direction-floor now also credits `d.cameraMove` directly: a cameraMove that names a `move` or
changes scale/position (from!==to, or a tx/ty target) counts as the `camera` technique. Two-sided verified
(a scene with a slowPush shows `camera×1` + no nag; a scene with no camera still nags). The lesson: a gate
that reads a POST-expand field must also recognize the PRE-expand sugar that produces it, or it fails the
author for doing the right thing.

## #150 — first-class scene-unit transitions (A slides out, B slides in) — the missing scene swap

**What.** Our beat boundaries read as a slideshow because the default `cuts` transform the WHOLE `cam` at
once (a camera bump), and beats were not units — layers attach flat to `cam`, so a boundary was 20 layers
independently fading, never "scene A leaves as B arrives." (another engine' best transitions are exactly this:
the whole outgoing scene slides off while the incoming slides in, as units.) We HAD real two-scene GPU
seams (core/seams.js) but doctrine reserved them for one payoff.

**Fix.** Opt-in `"sceneUnits": true`: partition layers into BEATS by the `cuts` times, wrap each beat's
layers in a `.hs-beat` div, and at each boundary move the OUTGOING wrapper (exit) against the INCOMING
wrapper (enter) as separate units — reusing the cutStyle PRESENTATIONS (slide/push/riseBlur/…), pure in n,
cheap CSS transform (no GPU). The wrapper owns the exit (per-layer exit fade suppressed, layer life
extended through the slide) so the scene slides as ONE, not slide+fade-per-layer.

**Two design learnings the render taught (via eyeballing, not a gate):**
1. **Window sits AFTER the cut** `[ct, ct+dur]`, not straddling it. Straddling meant the incoming beat's
   layers (which start at the beat boundary) weren't present yet, so an EMPTY beat slid in. Placing the
   window at/after ct makes the incoming beat's own start supply its content as it slides in.
2. **Whole-scene travel is the viewport width**, not the cut presets' ~220px per-layer nudge — else the two
   beats overlap in the centre instead of clearing the frame. `dist` defaults to `W` for scene units.

**Non-breaking (the whole risk).** Strictly opt-in: without the flag, layers attach flat to `cam` exactly
as before. `make snap-all`: 72 scenes IDENTICAL, 0 changed. Probe pure; seam-check clean; the demo
(showcase-scenecut) visibly swaps beats as units. The continuity gate (motion-director) now CREDITS
sceneUnits — the scene itself travels every cut, the strongest continuity there is.

## #151 — the produced baseline: force rich-by-default at the ENGINE, additively (go all-in like another engine)

**What.** The engine was capability-oriented (composition/parts/sceneUnits/camera all opt-in) so authors
defaulted to thin videos. Flipped it: `core/produce.js` `produceBaseline(data, theme)` runs once at BUILD
(core/boot.js, after theme resolve, before build) and INJECTS the universal produced motion into any scene
that didn't specify it — a living/brand-appropriate background (light brand → paperShapes, dark → aurora),
a gentle camera slowPush, and `sceneUnits` on cut films. Pure (mutates data once, pre-first-frame →
renderFrame stays deterministic). THEME-AWARE, ABSENT-ONLY (an explicit field is the opt-out), and
`"produced":false` disables the whole pass. Every video is now rich by default.

**Three hard-won constraints the render taught (each was a real break, caught by snap/probe/gate-mutation):**
1. **Never REWRITE an authored layer — only ADD.** The first version also auto-split bare headlines into
   kinetic word-reveals. That MUTATED layer structure and (a) broke a layer carrying a `motion` track
   (non-deterministic x→garbage) and (b) MASKED the audit's weak-headline contrast check (it measures the
   whole layer, not per-word units) — gate-mutation went red. Dropped it. Kinetic type is nudged by the
   floor, authored per-headline. The baseline is now strictly additive.
2. **Directed injections (camera, sceneUnits) SKIP already-choreographed scenes.** Injecting a camera or
   `sceneUnits` into a scene with per-layer `motion` tracks (which span beats, use absolute times) fought
   the tracks and the beat-wrapper model → non-determinism (motion-reel-v2). Guard: `choreographed` = any
   layer with a `motion` track → skip camera + sceneUnits.
3. **Gates judge the RAW scene, the engine produces at render.** Wiring produceBaseline INTO the gates
   masked the exact conditions they test (a "no-camera" mutation can't fire once the gate injects a camera)
   — gate-mutation red. Reverted. The gate coaches on what you WROTE; the engine fills the baseline. Two
   different jobs.

**Blast radius (accepted, engine-level forcing).** snap-all: 51 of 77 scenes now render richer (was
byte-identical); re-baselined. 0 quarantined, probe pure, gate-mutation 50/50, lib-test 421. Any scene
opts out per-field or with `"produced":false`.

## #152 — glow.frame() left a STALE inner value outside its window; sceneUnits exposed it as non-determinism

**What.** A `glow` layer with `flash`/`pulse`/`chromaCycle` inside a `sceneUnits` scene made 1/25 frames
render-order-dependent (probe red) — right at a scene-unit boundary. Root cause: `core/layers/glow.js`
`frame()` early-returned when `t` was outside `[start, start+L.duration)` and left `__glowInner`'s
opacity/filter at whatever the last frame set. Normally harmless — driveClips hides the layer outside its
window, so the stale inner is invisible. But sceneUnits EXTENDS a beat layer's visible window past
L.duration (it suppresses the per-layer exit so the WRAPPER can slide it out), so the layer is still shown
while glow.frame has stopped updating the inner → the stale value shows AND depends on which frame rendered
last → non-deterministic.

**Fix.** glow.frame() now sets the inner DETERMINISTICALLY for every t — no early return. Outside the
window it writes a fixed resting value (flash → 0, pulse → 1, chromaCycle → 0deg). Pure in t regardless of
render order or window extension. Pixels are unchanged (the layer is still hidden by driveClips where it
should be); only the DOM signature outside the window changes, so glow scenes re-baseline (snap).

**Lesson (general).** A `frame(el, L, t)` hook must set EVERY property it owns, every frame, as a pure
function of t — never early-return and leave state, because another feature (here sceneUnits' window
extension) can make "outside my window" visible. Isolated tests (glow alone, glow+sceneUnits with matching
windows) BOTH passed; only the extended-window combination triggered it. Reproduce with the exact interaction.

## #153 — the engine PICKED the background, so nobody ever designed one

**What.** `produceBaseline` injected a bg whenever a scene declared none: light brand → `dotmatrix`, dark
→ `aurora`. It shipped as a "rich by default" win, and it made the largest area of every frame the one
design decision no author ever made. It surfaced as "that is the worst bg I have ever seen" on a reel that
had simply inherited `paperShapes` — a preset whose 17-25s drift periods read as dead still in a 15s cut.
Nobody chose it, so nobody reviewed it.

**Fix.** `bg` is now required in `formats/scene/schema.json` (`required` + `minItems: 1`), and the
injection is gone from `core/produce.js`. The baseline still supplies MOTION (camera, sceneUnits); it no
longer supplies taste. Schema fields can now carry a `hint`, appended to the required/minItems error —
"bg is required" tells an author a field is missing without telling them what a good answer looks like,
and a required field you cannot answer is a wall.

**Migration lesson (separate, and the more reusable one).** The first pass migrated the 19 affected scenes
by `JSON.parse` → `JSON.stringify(…, 2)`, which reformatted every file: a 6-line change arrived as a
269-line diff that destroyed deliberate compact one-line layer formatting. It also wrote `plain` into all
19, silently stripping the living background those scenes had actually been rendering. Redone as a text
insert writing the value the injector WOULD have produced: 38 lines total, and all 78 scenes still snap
byte-identical. **A migration for a policy change should change policy, not bytes** — if the whole library
re-renders differently, the migration is a second, unreviewed change riding along with the first.

**Gate.** `gate-mutation` now proves the rule fires (a scene with `bg` removed must fail validate).

## #154 — hand-authored CSS animation renders a DEAD STILL, and said nothing

**What.** Building the hand-authored (`html`) background, the plan was to let authors write ordinary CSS
`@keyframes` on the grounds that `seekAll(t)` pauses and seeks every WAAPI animation each frame. The first
render came back with all six rays stacked at one angle and not moving. `core/tokens.css:28` disables
`animation` and `transition` globally with `!important` — correctly, since both run on wall-clock and a
frame here is seeked across 8 parallel workers, not played.

The bug is not the rule, it is the silence. This has been true for the `html` LAYER since it shipped: a
hand-authored fragment animates perfectly in a browser, renders as a still in the mp4, and the author has
no way to find out why.

**Fix.** `timeCssUsed()` in the new shared `core/sanitize-html.js` detects `animation` / `@keyframes` /
`transition`; validate rejects them by name in BOTH a bg window and an `html` layer, and the message names
what does work — `var(--t)` (seconds) and `var(--p)` (0→1 across the window), written every frame and
usable inside `calc()`. Two mutation fixtures.

**Lesson.** Verify the mechanism, do not reason about it. `seekAll` genuinely does seek WAAPI animations,
the reasoning was sound, and a global `!important` three files away made it irrelevant. One render answered
what an hour of reading the animation code would not have.

## #155 — judged a moving background on ONE still, and got the motion twice too fast

**What.** Recreating the first 5s of a reference film, the signature is a lime-on-black liquid field. I
built a `liquid` bg fx, compared ONE frame against ONE reference frame, saw folds and black valleys, and
called it a match. The user asked whether I had checked how the background *animates*. Pulling the same
four timestamps from both as a strip showed three things a still cannot: the motion was ~2.5x too fast,
the folds were about half the size they should be, and the field read as directional ribbons where the
reference has rounded lobes (a single `sin(ax+by)` is a plane wave; crossing two axes puts the crests at
intersections and gives lobes).

**Fix.** Retuned against the strip, not the still (speed 1 → 0.42, scale 2.4 → 1.25, crossed-wave field,
ramp rebalanced for the new distribution). Rule written into CLAUDE.md step 2a0: the background must be
deliberately animated, and its motion judged across 4+ frames side by side with the reference, before
any colour work.

**Lesson.** A still frame carries composition and colour and NOTHING about time. For anything that moves
continuously and fills the frame, the still is the least informative test available: it is exactly the
frame where a wrong speed looks right. Sample a strip. This generalises past backgrounds to any
continuous effect (shimmer, drift, grain crawl, camera).

## #156 — "check the beats" was a step in a list, so it got skipped

**What.** `make beats` has always been step 2 of the authoring ladder, and it is the step that catches the
things no static gate can see. It was also the easiest step to skip, because nothing failed when you did.
Two defects shipped through it in one week: `example-html-bg` had 0.4s of dead air mid-scene and ended on
an empty frame, and a recreated background was tuned against a single still.

**Fix, in two halves, because the check has two halves.**
- The part a machine can decide is now a blocking gate, `scripts/gates/beat-check.mjs`, wired into
  `author-check` as step `beats`: `dead-air`, `ends-on-nothing`, `empty-beat`, and a hand-authored `html`
  background whose markup names neither `var(--t)` nor `var(--p)` and therefore cannot move.
- The part only eyes can decide is enforced by a RECEIPT. `make beats` and `make reveal` record the
  scene's content hash in `verify/beats-seen/`; the gate warns (fails under `STRICT=1`) when the hash has
  moved since. It cannot make you look, but it can make not looking visible.

**Thresholds, honestly.** `dead-air` fires at 0.4s, not the 0.25s first tried: at 0.25s, 46 of 83 scenes
failed, because the house style uses a ~0.3s breath at beat boundaries and a ~0.3s cold open. 0.4s is the
line where a breath stops reading as deliberate, and it still catches the motivating case. A span already
owned by a declared cut/seam/sting is exempt. The whole-film `static-bg` rule is a WARN, not a FAIL:
blocking it failed 28 scenes including every white-first launch film, where a flat paper field is the
correct answer and the motion lives in the content.

**Debt, recorded rather than hidden.** Turning the gate on found 18 pre-existing true positives. They
carry an explicit `authoring.allow` waiver so the gate can block new work without breaking `make video`
for scenes it did not cause. A waiver there means "known, unfixed", not "fine".

## #157 — `anim: "none"` was a valid schema value the engine did not have

**What.** `"none"` is in the `anim` and `out` enums in `formats/scene/schema.json`, but it was never a key
in `ANIM` in `core/clips.js`, so `resolveAnim` fell through to `fade`. An author who wrote `out:"none"` to
stop a layer fading got a fade, silently. Found while recreating a reference where the headline had to
backspace away without fading; the workaround was `exitDur: 0`, which is a symptom, not a fix.

**Fix.** `"none"` is a real no-op entry in `ANIM` now.

**Lesson.** `schema-drift` compares the schema against the registries it copies, and it reported this enum
as in sync while it carried a value the engine could not honour. A gate that checks two lists agree does
not check that either list is true. The enum is the promise; the map is the delivery.

## #158 — four shipped scenes had been cross-fading against their own instructions

**What.** Fixing #157 (`anim:"none"` was a schema value the engine did not have) changed the output of
four tracked scenes: `showcase-cuts`, `brew-launch-act1`, `showcase-vawe`, `showcase-vawe-reel`. Every
diff is an `opacity` value, no transforms. These are the four scenes that actually AUTHORED `anim:"none"`,
and they had been getting the `fade` fallback all along. `showcase-cuts` says `anim:"none"` on 17 panels
precisely so the CUT does the transition, and it was cross-fading underneath the cut the whole time.

**The subtle half.** A style-only no-op was not enough. Opacity is written by `driveClips` OUTSIDE the
`ANIM` registry, so returning an empty style removed the MOVE and kept the FADE, which is the exact thing
the author asked to stop. `none` had to opt out of the opacity envelope too.

**And it broke purity first.** The first version returned `{}`, which quarantined two scenes as
non-deterministic. Cause: `fade(1)` returns `transform: 'none'`, so the old silent fallback had ALSO been
quietly satisfying the resting-key contract (#41). Remove the fallback and a transform written by the
exit half survived across out-of-order frames. `none` now writes `transform: 'none'` explicitly.

**Lesson.** A silent fallback is load-bearing by the time you find it. Deleting one is not a no-op: other
code has been leaning on its side effects, and here it was leaning on them for determinism. Expect a
"pure removal" of a fallback to change output, and diff the whole library rather than assuming it cannot.

## #159 — a gate went blind in a refactor and spent months shouting at everything

**What.** `layer-props` exists to catch the most expensive bug class in this repo: a prop the engine
accepts and then ignores, so the JSON looks right and the render is wrong. It built its "shared path"
prop set by regex-scanning a hardcoded file list whose first entry was `formats/scene/scene.html`.

Commit `fd397e1` split `scene.html` into `scene.html` + `scene.css` + `scene.js` and moved the whole
layer loop into the `.js`. The gate kept scanning the 20-line HTML shell, found no `L.foo` reads, and
its shared set collapsed to near-empty. From then on it reported `start`, `duration`, `motion`, `anim`,
`out`, `x`, `y` as dead on every layer in the repo: **1938 flagged props across 75 of 87 scenes.**
`core/clips.js` did not rescue it because clips reads DOM data-attributes, never `L.start`.

**Why nobody noticed.** `layer-props` is not in `author-check`, so nothing ran it in the normal loop.
And a gate that fails everything is indistinguishable from a gate nobody trusts: the output was pure
noise, so it got ignored rather than investigated. It was found only because one real question ("why
does it flag 21 props on a scene whose motion visibly works?") got followed instead of waved off.

**Fix.** The shared path is now named by DIRECTORY, not by file, so a future split cannot blind it. A
missing or empty shared source now exits 2 with "layer-props is blind" instead of blaming the scenes.
A sentinel self-check asserts `start`/`duration`/`motion`/`anim`/`out` were found in real source, and
the gate declares itself broken if they were not. Per-type delegation is derived from each builder's
own imports instead of a hand-kept table (which had also gone stale for `three`). 0 failures across 87
scenes, and proven still to fire on genuinely dead props.

**Two lessons.** A gate can fail by being too LOUD as easily as by being too quiet, and the loud
failure is worse, because it trains everyone to ignore it. And a gate that reads source by path is
coupled to the file layout: it must either be told the layout is gone, or derive it. The mutation
harness now carries a case that renames every `L.` in `scene.js` and asserts the gate reports itself
broken, which would have caught `fd397e1` the day it landed.

## #160 — every short film in the library was a slideshow, and nothing said so

**What.** Adding a structural test for slideshows (a film under 15s with cuts where no content layer both
survives a cut and changes across it) found that **18 of 18 eligible scenes trip it.** Not one short
cut-bearing film in `formats/scene/` has an object that carries through a cut. The grammar the
`vawe-continuous-action` skill teaches was, in practice, followed by nothing in the repo.

**Why it went unseen.** `direction-floor` measured how MUCH motion a scene had, never whether the motion
was CONNECTED. A film of six unrelated beats, each with a snappy entrance, clears an ambition floor
easily. Quantity of motion is not continuity of motion, and only the second makes a film read as one
thing happening.

**Fix.** The tell blocks, and the 18 carry explicit waivers so the gate holds new work without breaking
`make video` for scenes it did not cause. A waiver there means known and unfixed. Planning is gated at
the same time: a short storyboard that names no object in frontmatter fails outright, because the failure
starts in the plan, not the JSON.

**The honest limit.** This bans a STRUCTURE, not a mood. A film can carry a continuous object perfectly
and still be dull. And the tell is blind to a short film that declares no cuts at all: three fade-in
islands with no `cuts` array never becomes eligible. Widening it to infer boundaries from layer starts
fired on nearly every short scene including the good ones, so it was left out rather than smuggled in.

## #161 — the continuity skill was A/B tested, won on structure, and lost the hook

**What.** Rather than assume the new `vawe-continuous-action` skill worked, it was tested: same blank
brief ("a 6s launch film for a CLI that turns a screenshot into front-end code"), two agents, one
following the skill and one forbidden from reading it.

**Result on structure: the skill won clearly.** Its film makes the screenshot the SUBJECT. It is
captured, shrinks into the command line as the literal argument to `$ shotcode`, then unfolds into a
code editor whose typed JSX names the same headline the screenshot showed. It ends on the product
working. The control produced a sequence with a recurring prop: the pricing card persists across cuts,
but it is carried between shots rather than transforming, and the film closes on a wordmark end card.

**Result on the first second: the skill LOST.** Its opening frame is a bare screenshot with no words on
it, so a viewer does not know what they are looking at until the command line appears a second later.
The control opened on "Screenshot any UI." and won that second outright. CLAUDE.md has always required a
first-frame hook of twelve words or fewer; the continuous-object doctrine crowded it out, because the
skill said what the object must DO and never said the object still owes you a sentence.

**Fix.** Step 3b added to the skill: the continuity rule sits UNDER the house hook rule, not in place of
it. Either put the line on the object, or let the object be the sentence, and only when its t0 state is
self-evident to the audience.

**Two lessons.** A new rule competes with the existing rules for the author's attention, and the loudest
new rule wins; adding doctrine can therefore REMOVE craft elsewhere, and the only way to see that is to
run the thing and compare against a control. And note the control was already contaminated: the
`no-continuous-object` gate forced it to keep one layer alive across every cut, so this measured
skill-plus-gate against gate-alone. The gate alone bought continuity of a PROP. Only the skill bought a
subject that transforms.

## #162 — second A/B, the hard case: no product, no UI, nothing to capture

**What.** The continuity skill was tested again on the case built to break it: a service with NO app and
NO dashboard (humans negotiate your software contracts, you forward a quote and get a lower price).
"Show the product working" has nothing to point at. Same protocol: one agent following the skill, one
forbidden from reading it.

**The skill held, and Step 3b paid off.** Its object is the quote sheet itself: full size while the total
counts UP to the vendor's ask, shrunk into a `Fwd:` compose row as the attachment, then reopened at full
size out of a `Re:` from Tenor with a "Negotiated adjustment" line and the total counting DOWN. The
honest reinterpretation of step 4 was that the product's only real surface is the email thread, so it
showed that and refused to draw a dashboard for a product that has none. It opened on "Never sign the
first renewal quote.", six words, and the agent volunteered that its first instinct had been a wordless
opening frame: the fix from #161 caught exactly the failure it was written for.

**The control was decent and lost on two familiar counts:** it closed on a wordmark end card again, and
its opening headline was CLIPPED by the frame, a defect its own author missed while eyeballing frames.

**The skill's own advice was wrong in one place.** It recommends a carried background plus a hard cut as
the ellipsis. Followed literally, a root `blur` cut hid the object for six frames, which is the object
dying and being replaced: the skill breaking its own law. Now corrected in the skill, put the cut on
something else in the frame and let the object ride through it, and verify by stepping frames across the
boundary.

**Lesson.** Doctrine has bugs like code does, and they only surface when somebody follows it literally on
a brief it was not written against. Two briefs found two: a missing hook rule and a self-contradicting
ellipsis. Neither was visible by reading the skill.

## #163 — the slideshow ban never evaluated a single one of the three test films

**What.** A three-arm test on one brief: no skill and no gates, no skill with gates, and the skill. The
three-way read was clear and useful. The unconstrained arm produced five typographic cards, a number as
flat text and a wordmark end card, with no artifact on screen at any point. The gated arm produced a
quote card that persists and counts down. The skill arm produced a quote sheet that flies into a `Fwd:`
row and comes back out of a `Re:` revised, which is the only one of the three that shows the MECHANISM
of the service rather than asserting its result.

**The finding that matters more.** All three films declare `cuts: 0`, `seams: 0`, `transitions: 0`. The
`no-continuous-object` tell requires at least one declared boundary to become eligible, so it never
evaluated ANY of them. The ban shipped in #160 as "slideshows are banned by default" did not fire once
across three films, one of which is a textbook slideshow.

**Two corrections to the record.** The claim that the gate "forced the control to keep a layer alive"
holds only for the earlier shotcode brief, where that control did declare cuts and did say so. On this
brief the gate was silent, so the control's travelling card was its own doing, and what separated the
unconstrained arm from it was the REST of `author-check`, not the continuity tell.

**The hole is not theoretical.** It was already recorded as the honest limit of #160, and this test shows
an agent with no continuity pressure naturally lands in exactly the shape the gate cannot see. A film of
cross-faded islands never declares a cut. So the tell catches an author who cuts badly and misses an
author who never cuts at all, which is the more common way to write a slideshow.

**Lesson.** A gate's ELIGIBILITY condition is part of its coverage and deserves the same blast-radius
scrutiny as its firing condition. "18 of 18 eligible scenes trip it" says nothing about how many scenes
are eligible. The next version must infer boundaries from layer windows, and that needs its own
blast-radius pass, since the first attempt at inferring them fired on nearly every short scene.

## #164 — closing #163: boundaries are inferred now, and the ban is honestly scoped

**Fix.** `no-continuous-object-inferred` catches a short film that declares no cuts at all. An island
boundary is a moment where at least two content layers leave and at least two unrelated ones arrive, and
the layers standing through the junction do not outnumber either side. The existing spans-and-changes
logic then runs unchanged at those inferred times.

**The threshold is the whole rule, and it was measured.** At two-out-and-two-in: 4 scenes eligible, 1
trips, and it is the labelled slideshow. At one-out-and-one-in: 11 eligible, 6 trip, INCLUDING
`higgsfield-recreation`, the exemplar. At three: nothing is caught at all. Two is the only value that
catches the slideshow without failing the film the grammar was derived from. A rule resting on one integer
validated against four films is thin, which is why the inferred half WARNS rather than blocks (it does
block under `STRICT=1`). Failing a build over a cut the author never wrote is a bad error to be wrong about.

**What the tell still cannot see, stated so nobody trusts it further than it goes.** It measures that a
prop survives a junction and moves. It cannot tell a card that TRAVELS from a card that BECOMES the next
thing, and that difference is the actual grammar. Two of the four A/B films pass on exactly that
technicality: their object persists and moves without ever transforming into anything. The gate buys
continuity of a prop; only planning with the skill buys a subject.

**Method note worth keeping.** This was tunable at all because the A/B runs left a LABELLED SET behind:
two films known to have the grammar and two known to lack it. Threshold work without labelled examples is
guessing, and the earlier attempt that "fired on nearly every short scene" was exactly that.

## #165 — dead-air counted a black scrim and a 60px dot as "content on screen"

**Symptom.** `out/rec1-nogate.mp4` and `out/rec2-gates.mp4` hold a black frame at 6.5s with at most a
single dot on it. `beat-check`'s `dead-air` tell exists to fail exactly that, and both scenes passed.

**Root cause.** `dead-air` merged the `[start, start+duration)` window of every layer with `track !== 0`
and called any covered instant "content on screen". An open window is not the same as something in the
frame. Two layer kinds broke the equivalence and both were sitting in that gap:

- a **blackout** — `{"type":"rect","w":1920,"h":1080,"bg":"#000000"}` — which is a backdrop by function.
  It adds nothing to the frame; it paints over everything behind it. `track:0` is how the schema says
  "backdrop", but a scrim is authored as an ordinary layer, so the gate has to read the shape.
- a **speck** — a 60px loading dot, a 78px spinner — a garnish that cannot carry a 1920x1080 frame.

Removing either rule alone still leaves the hole covered, which is how it shipped: rec1's 6.38s-6.86s
gap was propped up by exactly one of each.

**Fix.** `content` now drops both. A blackout is a rect at or over the canvas on both axes with an opaque
bare-hex fill; a speck is a declared box under 8% of the canvas on both axes (under two thousandths of
its area). An undeclared box is an unknown size, not a small one, so it still counts.

**Blast radius, measured.** Across all 96 scenes in `formats/scene/`, exactly two verdicts change:
`rec1-nogate` (6.38s-6.86s) and `rec2-gates` (6.12s-6.85s). Both frames were pulled from the mp4 and
looked at: both are black plates with one dot. No shipped scene regresses.

**What it still cannot see.** `rec3-skill` renders the same empty plate at 6.5s and still passes: its
real gap is 0.27s, under the documented 0.4s breath threshold. That threshold was measured against 46
shipped scenes and was not loosened to catch one film.

**Gate.** Four cases in `make gate-test`: the blackout and the speck each failing on the SAME hole the
base `dead-air` case uses, plus the two mirrors (a readable rect DOES close a gap; a translucent
full-canvas scrim is not a blackout), so the rule cannot degrade into "rects never count" (#25).

**Lesson.** A timeline gate that counts windows is measuring the author's intent, not the render. Ask
what a layer PUTS in the frame, and remember that some layers subtract.

---

## #166 — a global `cut` blanked the whole frame, and the timeline gate called the hole a transition

**What.** `out/brew-launch.mp4` holds five consecutive empty frames across the punch cut at t=14.1, and
in `example-kinetic-type` the headline "MAKE" vanishes for four frames on every one of its five cuts.
Nothing was on screen but the backdrop. Every gate was green, including the one gate whose whole job is
"is there something on screen, all the way through".

**Root cause, part 1 — the engine.** `core/cuts.js` models a cut as A/B: the outgoing element plays
`exit`, the incoming plays `enter`, and `cutStyle` is strictly sequential (exit runs to completion, THEN
enter starts) because the two phases belong to two different elements. `formats/scene/scene.js`
`drawCameraAndCut` drove that same sequential pair onto ONE element, the camera root. On one root the two
halves stack in time instead of in space: opacity ramps 1 to 0 across the first half of the window and 0
to 1 across the second, and every layer is a child of that root. 18 of the 26 presentations bottom out at
`opacity: 0`, and the mask/clip ones (`wipe`, `iris`, `barn`, `letterbox`, …) hide the frame just as
completely through `clipPath`. `sceneUnits` (the two-wrapper path, `driveSceneUnits`) was always correct;
`core/produce.js` injects it for any cut film that is not already choreographed, which is why only the 8
choreographed cut films were affected and why this survived so long.

**Root cause, part 2 — the gate.** `scripts/gates/beat-check.mjs` exempted any `dead-air` hole a declared
cut/seam window touched, on the reading that "a transition is content, it just is not a layer". A
transition is a TREATMENT of what is already on screen. Over an empty frame it produces an empty frame.
The exemption was covering for a real modelling gap: under `sceneUnits` the engine DOES extend every
non-last-beat layer to `beatEnd + cutDur` (`setLayerTiming`), so those layers really are on screen across
the window, and the gate could not see it because it read the JSON spans instead of the renderer's.

**Fix.** `core/cuts.js` gains `soloCutStyle` for the single-root path: same closed-form styles, every
VISIBILITY channel (opacity, clip, mask) pinned at identity, so the transition rides on transform and
filter alone. A punch still punches (scale 1.12 + 10px blur), a blur dissolve still defocuses and
refocuses; the frame never empties. A style whose whole transition lives in the visibility channels would
then be a silent no-op, so `SOLO_BLIND` classifies them BY PROBING the presentations (not by a hand-list,
so a new style classifies itself) and `scene.js` refuses the combination loudly at boot, naming the two
ways out: `"sceneUnits": true`, or a style that moves. 10 of 26 styles are blind on this path (`fade` and
the 8 mask/clip reveals, plus `none`); none of the 8 shipped single-root films uses one.

`beat-check.mjs`: only a STING can close a hole now. Cuts and seams no longer exempt anything, and the
`sceneUnits` extension is modelled exactly instead. Removing the exemption alone produced two false
positives on `app-showcase` (content the wrapper really was holding); modelling the extension removed
both, and left 7 files across 4 films failing `dead-air` on genuine black frames, each verified by pulling
the frame at the flagged timestamp: `brew-launch` 21.1s, `brew-native` 17.45s, `example-product-promo`
6.9s / 10.7s / 13.9s, `example-swiss-grid` 10.8s. Those are real defects the gate had been forgiving; they
are not waived.

**Which gate now catches it.** `lib-test` asserts `soloCutStyle` never hides the frame, for every style
and every phase, and that `SOLO_BLIND` agrees with what actually moves. `gate-mutation` pins three cases:
a source mutation that stops `soloCutStyle` pinning the channels open (lib-test must speak), a cut over a
hole on the single-root path (`dead-air` must fire), and the mirror — `sceneUnits` really does carry a
layer across the cut, so the gate must stay quiet.

**Lesson.** A model that assumes two elements cannot be pointed at one element and expected to degrade
gracefully; it degrades into nothing, and nothing looks exactly like a black frame. And a gate exemption
written as a belief about the engine ("a transition fills its time") is a guess. Model what the engine
actually does, then there is nothing left to forgive.

## #167 — the storyboard promised a change, the film never built one, and every gate stayed green

**What.** The A/B test on the `becomes:` field returned a negative result, and the way it lost is the
finding. A blind judge picked the CONTROL arm: more demonstrations (7 to 4), higher information per
second, same underlying move on both sides (a crossfade inside a fixed box), so requiring the field
bought no technique. The treatment film's worst defect was a middle beat where the frame does not
change. Its storyboard carried a correct `becomes:` on exactly that beat. The author wrote the change
down, correctly, and then did not build it.

**Root cause.** Two documents, and nothing compared them. `storyboard-check` grades the plan against
ITSELF: are the beats timed, does each name what it becomes, does the last end on a change. Every one of
those passes on a plan for a film nobody built. `inspect` reads the scene, but at ONE instant per beat,
and only for copy and for "some layer here animates" — a beat that stalls for five seconds satisfies it
at the instant it samples. So a plan could promise a transformation at 5.8s, the JSON could put nothing
there, and the whole ladder was green.

**Fix.** `scripts/gates/plan-vs-render.mjs`, wired into `author-check` after `inspect` (it reads the same
`.intent.json` sidecar, which already carried `span` and `becomes`) and standalone as `make plan-check`.
It lines the plan's beat spans up against the film's clock. FAIL: `plan-overruns-render` (the plan
budgets a different length than the film runs, so every span below points at the wrong seconds),
`junction-is-static` (the plan promises a `becomes:` at a boundary and the render has no layer arriving
or leaving, no cut/seam/sting, no motion key within 0.5s of it). WARN: `held-through-the-change`,
`beat-holds-still`, `unplanned-junction`, `plan-has-no-spans`.

**The sharp tell.** `held-through-the-change` reads a hold the author WROTE rather than inferring one
from an absence: two consecutive motion keyframes carrying identical values. `{t:3.46, y:-82}` followed
by `{t:8.6, y:-82}` says in the author's own hand that this object does not move for 5.14 seconds. On the
A/B pair it flags the treatment film's stalled beat and passes the control, reproducing the blind judge's
verdict from static JSON.

**Two bugs in the gate's own first draft, both caught by running it on the film it was written for.**
(1) It treated "has a `motion` track" as continuous motion and exempted it. A track is keyframes with
HOLDS between them; both of that film's surfaces carry a 6-key track and both sit frozen inside it, so
the exemption swallowed the entire film and the gate passed it. (2) Once fixed it fired five times on
BOTH arms, including the control the judge praised for never sitting still, because ONE layer holding is
not the frame holding. The hold now only counts across the stretch of it where nothing else arrives or
leaves either. A gate that shouts at the good film is not a stricter gate, it is a broken one.

**Blast radius, and the model that made it safe.** `beat-check` had modelled the engine's timing rewrite
(`produce.js`'s `sceneUnits` injection, `scene.js`'s `beatEnd + cutDur` extension) inline. Rather than
fork it, that model moved to `scripts/gates/scene-timing.mjs` and both gates import it. Proven
behaviour-preserving: `beat-check`'s output is byte-identical on all 100 scenes.

**Which gate now catches it.** `gate-mutation` pins seven cases, one per tell plus the mirror (a film
that does what its plan said stays green), 101/101.

**Lesson.** A field that makes an author state their intent does not make them deliver it. Writing the
change down is not building it, and the gate that reads only the writing will say so approvingly. When
you add a planning artefact, the question is not whether the plan is well-formed; it is what compares
the plan to the thing it planned.

## #168 — six gate fixtures were passing on the fixture's own filename

**What.** Found while adding fixtures for #167. `gate-mutation` slugifies a case's name into the
fixture's filename, and every gate echoes the path it read. So a case named `plan-has-no-spans · …`
matching on `/plan-has-no-spans/` was satisfied by the echoed path alone. With the gate completely
silenced, all six new cases still ticked.

**Root cause.** The assertion matched a string the harness itself puts in the output, so it tested the
harness, not the gate. It bites hardest on `outputOnly` cases, where the exit code gives no independent
signal.

**Fix.** Anchor on the printed FINDING shape (`[plan-has-no-spans]`, `stub-why —`), which a filename
cannot produce. Six pre-existing cases sat on the same trap: audit `tiny-text` and `top-heavy`,
storyboard `becomes-is-a-preset`, `held-state-too-long`, `stub-why`, `partial-timeline`. All six still
pass once re-anchored, so those rules were genuinely firing. They were simply unprovable. A note at the
fixture-writing site records the hazard.

**Lesson.** A mutation harness proves a gate can fire only if its assertion is on something ONLY the gate
can emit. This is the same failure as #86 (a self-fulfilling check reports success forever), one level
up: the harness that exists to prove gates work had a hole in the same shape as the holes it hunts.

## #169 — the anti-slop detector read every ISO date as an `01 / 02 / 03` section scaffold

**What.** `make slop` failed `ab4-a-ledgerline` with `numbered-section-markers · Sequence: 01, 02, 03,
05, 06, 08`. The scene has no section markers. Those are the day fragments of the CSV rows it renders:
`2026-03-01,DD ACH TFR STRIPE PAYOUTS,...`.

**Root cause.** The rule matched `/\b(0[1-9]|1[0-2])\b/g` against the stripped text. `\b` is not enough
to say a number stands alone: in `2026-03-01` the `01` sits between a hyphen and a comma, and both are
word boundaries. Times (`12:05`), semver (`v1.02.3`) and decimals had the same hole. Any document about
dates or money tripped a rule about editorial scaffolding.

**Fix.** `(?<![\w\-/:.])(0[1-9]|1[0-2])(?![\w\-/:.])` in
`.claude/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs`. Verified both directions on
the same input: a real `01 About / 02 Process / 03 Pricing / 04 Contact` scaffold still yields
`01,02,03,04`; the CSV rows now yield nothing.

**Why it mattered more than one warning.** `make slop` has no waiver, and CLAUDE.md requires it clean
before a render. So a false positive is not noise, it is a wall: the only ways past it were to stop
rendering dates or to stop believing the gate. The second is what actually happens, and a gate people
have learned to ignore is worse than no gate.

**Lesson.** A rule that detects a PATTERN has to test that the pattern stands alone, not merely that its
characters appear. `\b` answers "is this a token" and never "is this token the whole thing". Any rule
keyed on bare small integers will meet dates, prices, versions and times before it meets a scaffold.

## #170 — the layout audit was the one gate you could not waive, so a deliberate composition failed it

**What.** `ledgerline-neon` marks its selected transaction row with a bloom instead of a card, which is
the whole point of the look: on a near-black ground a filled rectangle reads as a hole punched in the
screen, not as a highlight. `make audit` failed it HARD on `overlap`, 809x121px, between the row layer
and the CSV wall behind it.

**Root cause, in two parts.** The overlap check exempts a pair when an opaque surface is painted above
the lower one. Removing the card removed that surface, so the exemption had nothing to find, even though
the row's TEXT lands inside a 42px gap the wall reserves for it and nothing visible collides. Verified by
pulling frames at 0.00s, 0.43s, 1.00s and 1.90s and looking at them, not by reasoning about boxes.

The second part is the real bug. Every other gate in this repo honours `{"authoring":{"allow":[...]}}`.
`verify/audit.mjs` had no waiver mechanism at all, so this had exactly two outcomes: contort the scene
to satisfy a box check, or stop running the audit. Both are worse than the finding.

**Fix.** `verify/audit.mjs` reads `authoring.allow` the same way every other gate does. A waived issue is
still printed, tagged `○ (waived)`, and counted in its own column, because a gate that goes silent when
waived teaches you to waive. Checked across the library: no existing scene lists an audit kind in its
`allow`, so nothing else changes behaviour.

**Lesson.** An unwaivable gate is not a stricter gate. Every gate here encodes a rule with exceptions
that were not imagined when it was written, and the waiver is what keeps a real exception from turning
into either a mangled design or an abandoned gate. If a check can block, it needs a documented way to be
overruled, and the overruling needs to stay visible.

## #171 — a dissolve between two text states is illegible at its midpoint, and nothing checks it

**What.** Raised by the user as "settled states are good but during the animation things can be
calibrated better". Chasing it turned up the same defect in three separate places across two films:
`ledgerline-neon` at 5.75s (the merchant code resolving), `ab4-b-ledgerline` at 3.4s (the raw CSV line
handing off to the meta line) and again at ~9.0s (every row of the ledger cascade). In each case a
before-string and an after-string were cross-dissolved in place, so at the midpoint BOTH sat at roughly
half opacity, in two cases under 3.5px of blur, on top of each other. Legible before. Legible after.
Mush through the middle.

**Root cause.** A crossfade is the reflex for "A becomes B" and it is the wrong move for TEXT. Two
strings at 50% are not a transition, they are a double exposure. It survived because every gate and
every contact sheet samples SETTLED frames: `make beats` takes first/mid/last of a beat, `inspect` reads
one instant, and the judge sheet picks one frame per beat. All of them are at their best exactly where
this defect is at its least visible.

**Fix, in the films.** Replace the dissolve with a travelling WIPE: one box, both strings, clipped from
opposite sides by the same variable, with a read head at the seam. At every instant one side of the edge
is fully legible raw and the other is fully legible resolved, so no frame is ever mush. It is also
better as meaning: "reads every line" has a direction and a crossfade does not. In `ab4-b` the two
non-hero cases were fixed by sequencing instead of overlapping, the outgoing clearing before the
incoming starts.

**Which gate catches it. NONE, and that is the finding.** `make reveal` shows enter/exit arcs but samples
from layer starts, so a transition INSIDE an html layer driven by a CSS variable is invisible to it. The
signature is mechanical and cheap to detect in markup: two elements at the same position whose opacities
are complementary (`var(--x)` against `calc(1 - var(--x))`) where either also carries a `filter:blur`.
That is a real check and it is not built. Written down here so the next person does not rediscover it by
eye for a fourth time.

**Lesson.** Verify a TRANSITION at a frame where it is mid-flight. This repo already learned that once
(#77, a stagger that was inert and shipped because only settled frames were checked) and every sampling
tool it has still lands on settled frames by construction. A gate that samples where the motion is at
rest is a gate that cannot see motion.

## #172 — every film was type in a box, and no gate had an opinion about it

**What.** Raised by the user: "the another engine motion was using graphics to portray and explain
something. we are currently doing everything text in some data fillable thing." Measured across the
library: **52 of 93 shipped scenes carry no large pictorial layer at all.** `creed-launch` carries 19
pictorial layers and not one is large, because all 19 are logos. So the house pattern was shipping
icons and never shipping explanations, and it was nobody's decision.

All three Ledgerline cuts failed it. They state `-$18,431.06` and never show its shape, and a shape is
exactly what type cannot carry: you cannot read six numbers and see that rent is more than a third.

**Root cause.** The ladder had a gate for the words, the palette, the motion, the plan and the timeline,
and none for whether the film SHOWS anything. Worse, the cuts were dense with DECORATION (bloom,
scanlines, hairline rules, corner ticks, a glowing logo mark), which reads as visual richness while
carrying zero information. A film can be drowning in decoration and be showing the viewer nothing. That
is the same distinction CLAUDE.md already makes about backgrounds ("the background is decoration, it is
never information"), unnoticed one level up.

**Fix.** `scripts/gates/visual-vocabulary.mjs`, blocking, wired into `author-check` beside the ambition
floor and standalone as `make visuals`. FAIL `no-visual-vocabulary`. WARN `graphics-thin` and
`text-only-beat`. The load-bearing rule is SIZE: a pictorial layer type is necessary and nowhere near
sufficient, so a graphic only counts as carrying a beat at 8% of canvas or more, which is what separates
"there is an icon on screen" from "the picture is the point". Doctrine in
`docs/CRAFT/SHOW-DONT-TELL.md`, rule locked in CLAUDE.md.

**Three bugs in the gate, all found by using it rather than by reasoning about it.**
(1) It failed the very stacked bar written to satisfy it, because its bar detector matched only
`width:calc(...var())` and the chart animated with `transform:scaleX()`, which is the form an animator
reaches for first since it does not relayout. (2) It reported `no-visual-vocabulary` on
`{"type":"block","block":"lineChart"}`, a genuine chart, because blocks are sugar and the gate reads raw
JSON before `make expand`. That is worse than a missed finding: it pushes authors off the one route that
turns a number into a shape in a single line. The chart vocabulary is now DERIVED from
`blocks/charts.mjs` rather than retyped, because a gate that restates a vocabulary is the copy that goes
wrong. (3) `graphics-thin` strictly implied `text-only-beat`, so an author saw two findings for one
defect; they are now mutually exclusive.

**Lesson.** Decoration is not explanation, and a gate that counts pictorial LAYERS rather than pictorial
SUBJECTS cannot tell them apart. Ask of every beat what it would look like if the viewer could not read.

## #173 — the mutation harness edits tracked source in place with no lock

**What.** `gate-mutation` reported `conformance` failures that changed count between two identical runs
(2, then 1), which I had been carrying as a known intermittent flake. It is not a flake.

**Root cause.** The harness proves a gate can fire by MUTATING tracked source files in place, running the
gate, then restoring them. With two agents running the harness concurrently, one run restores the other
run's mutation as if it were the original. Both then see a file that does not match what they wrote.
`scripts/gates/conformance.mjs` and `core/clips.js` were both left transiently mutated during this
session before being restored with `git checkout`.

**Not fixed, and named so.** A single run with nothing else touching the repo is 105/105 clean. The
harness needs a lockfile, or it needs to mutate a copy rather than the tracked file. Neither is built.
Recorded so the next person does not spend the time re-diagnosing it as flakiness.

**Lesson.** "Intermittent" is a description of a symptom, never a diagnosis. A test that edits the
working tree is a shared mutable resource, and shared mutable resources do not fail randomly, they fail
concurrently.

## #174 — the crossfade-to-mud defect came straight back, in the film written to fix everything else

**What.** `ledgerline-shown` was built to replace explanatory sentences with visuals. Its merchant
resolve and its twenty cascade rows both cross-dissolved a before-string over an after-string in place,
so the midpoint of every one of them was two half-opacity strings on top of each other. That is #171,
verbatim, reintroduced by the same person who wrote #171, two commits later.

**Root cause.** Opacity is the reflex for "A becomes B" and the reflex does not read the changelog. #171
fixed three SITES; it did not change what a hand reaches for when writing the fourth. Writing the lesson
down demonstrably did not prevent the repeat, which is the actual finding here.

**Fix.** Both are wipes now: one box, two strings, clipped from opposite sides by the same variable,
with a read head at the seam. The amount, being five glyphs, swaps at a threshold instead, which is
never mud either.

**Which gate catches it. STILL NONE.** #171 already recorded that no gate sees this and named the
detectable signature (two elements at the same position with complementary opacities, one carrying a
blur). That check was not built, and the very next film shipped the defect twice. The cost of leaving a
known-detectable defect to human vigilance is now measured: one repeat per two commits.

**Lesson.** A MISTAKES entry is a record, not a control. When an entry names a mechanical signature and
the fix is a gate, writing the entry and skipping the gate buys nothing but the illusion of having
handled it. Build the check or expect the repeat.

## #175 — the mud detector, and the sixth instance it found immediately

**What.** #171 named a mechanically detectable defect and said the fix was a gate. #174 recorded that
skipping the gate cost one repeat within two commits. This is the gate.

`scripts/gates/dissolve-check.mjs`, blocking, wired into `author-check` and standalone as
`make dissolve`. For every pair of absolutely-positioned elements sitting at the SAME point inside one
html layer whose opacities are driven by the SAME variable, it evaluates both expressions across that
variable's whole range and measures for how much of it BOTH stay above 0.15 opacity. That is the defect
stated as a number rather than as a pattern to recognise: a linear pair overlaps for about 70% of the
range and is mud; a threshold swap crosses in a fortieth of it and is fine. The gate does not care which
form you wrote, only how long both are on screen.

**Why it is stated as a measurement and not a pattern match.** A pattern match on `1 - var(--x)` would
flag the correct threshold-swap fix and miss any dissolve written a slightly different way. Measuring
the overlap catches every spelling and clears every correct one. An element under a `clip-path` ancestor
is exempt outright, because a wipe is the fix and a gate that flags the fix teaches people to waive it.

**It found a sixth instance in its first run.** `ab4-a-ledgerline`, the paper cut, had the identical
blur-dissolve on its merchant resolve, 70% overlap. That film had a full craft pass done on it by eye,
frame by frame, and the defect was not seen. Two further scenes turned up in the sweep,
`ab2-skill-tenor` and `app-showcase.expanded`. Five of 102 scenes.

**And it found one I had just written.** `ledgerline-cyber` was flagged after I had already fixed its
merchant with a wipe: the AMOUNT was still a dissolve, `-6.75` against `-$6.75`, both visible for 70% of
the range. I fixed the conspicuous half of a defect and shipped the other half in the same edit.

**And the gate itself shipped the same class of bug.** Its CSS evaluator found `clamp()` with a regex
that allowed one level of nested parentheses. Substituting a variable adds a level, so
`clamp(0,calc((var(--n) - 0.5) * 40),1)`, the exact threshold-swap form the gate's own message
RECOMMENDS as the fix, could not be evaluated. Every clamped pair fell through to "unparseable" and was
passed over in silence. The gate was right about them by accident, and a clamped pair that WAS mud would
have been invisible. Found by the fixture agent, which noticed the recommended fix and the measured fix
were being cleared for different reasons. `clamp()` is now located by balancing parentheses, and a pair
the evaluator cannot read is COUNTED AND NAMED as unjudged rather than skipped, because a gate that goes
quiet about what it failed to look at is reporting green on its own blind spot. Across 102 scenes there
are now zero unjudged pairs.

**Lesson.** The value of a mechanical check is not that it knows something you do not. It is that it
does not get bored, does not fix the obvious instance and stop, and does not trust the pass it just did.
Every instance here was visible to anyone who pulled the right frame; six of them shipped anyway. And
the second lesson, from the gate's own bug: when a check cannot evaluate an input, that is a finding
about the check, not a pass for the input.

**Two false-positive classes found by running it on the library, both fixed.** It flagged pairs whose
opacities move the SAME way: two elements fading out together (`app-showcase.expanded`) and, in one
case, a pair carrying the IDENTICAL expression (`ab2-skill-tenor`), which cannot be a transition between
two states by construction. A crossfade needs one rising and one falling, so the check now requires the
two directions to have opposite sign. `app-showcase.json` was clean while `app-showcase.expanded.json`
was not, which places that one in block expansion rather than in any author's hand.

**All of it is now fixed rather than logged as debt.** Merchant resolves in `ab4-a-ledgerline` and
`ledgerline-neon` are wipes; amounts and the mostly-identical strings in `ab2-skill-tenor` are threshold
swaps, which is the right answer when only a word or a figure changes and a wipe would drag an edge
across characters that are not changing. Across 102 scenes: zero mud, zero unjudged pairs.


## #176 — the gate measured area as `w * h` and reported 0% with total confidence

**What.** `visual-vocabulary.mjs` decided whether a graphic was the SUBJECT of a beat by computing
`num(L.w,0) * num(L.h, num(L.w,0))`. Layers are not all sized by `w`/`h`: a `cursor` and a
`progressRing` take `size`, and an image routinely declares one axis and lets the other follow the
asset's own aspect. Every one of those measured 0% of frame and was printed as "a mark, not a subject".
`plinth-ad`'s hero figure is 67% of the canvas before clipping and was dismissed on exactly that line.

**Root cause, and why it is worth an entry for one flipped scene.** The wrong answer was stable,
deterministic, and stated with a percentage next to it. That is the same class as a gate reporting green
on a rule it never evaluated: the output looks like a measurement and is a guess. One scene flipping is
the blast radius, not the severity.

**Fix.** `boxOf(L)` in `scripts/gates/scene-timing.mjs` resolves size in five honest tiers: `explicit`,
`size`, `intrinsic` (read the asset's own header, PNG IHDR / JPEG SOFn / SVG viewBox, no dependencies),
`proxy` (one axis known, asset unresolvable, assume square and PRINT IT WITH A `~` so the guess is
visibly a guess), and `unknown` (area 0 plus a new `unmeasured-graphic` WARN naming the layer). The
unknown tier must never credit area, or a bare `{"type":"image","src":"x.png"}` buys a pass off nothing.
`canvasShare()` then clips the box to the frame before taking the share, because off-canvas pixels are
not the subject, and clipping is what makes the `proxy` guess safe to act on.

**A second bug, found while fixing the first, and worse.** The gate identified chart blocks by regexing
the exports of `blocks/charts.mjs` into a name list. That was wrong in both directions. It missed every
pictorial non-chart block (`phoneFrame`, `browserFrame`, `table`, `comparison`), and it admitted
`statBig`, which `blocks/charts.mjs:12-19` shows emits a `count` layer plus a text label. `statBig` is a
number set in type wearing a chart's name, i.e. precisely what this gate exists to catch, and naming it
in the allow-list would have let a scene pass on a big number. The name list is gone: the gate now CALLS
the factory and measures what it emits. A block earns its place by what it draws, never by what it is
called, and `statBig` now fails on its own merits. The advisory "try one of these blocks" list is
derived the same way, so the suggestion and the check can no longer disagree.

**Lesson.** Deriving a vocabulary from a registry beats hand-listing it (that part was right), but a
DERIVED NAME LIST is still a name list. The registry's own membership is not the property you care
about; what the thing does is. When a check can call the code instead of reading its label, call it.

## #177 — the tool for comparing two cuts could not hold two cuts

`judge.mjs` wrote its contact sheet and rubric to a bare `/tmp/judge`, and wiped that directory
unconditionally on every run. So judging a second film destroyed the first. Judging two cuts of one film,
which is the whole reason to run a vision judge during an edit, was impossible: by the time the second
sheet existed the first was gone, and the only way to compare was to remember.

**Root cause.** A single-shot tool written for a single-shot use, then relied on for a workflow. Nothing
about it failed loudly; it produced a correct sheet every time. The loss was silent and looked like
forgetfulness rather than like a bug, which is why it survived this long.

**Fix.** `/tmp/judge/<basename>/`. Every path the tool prints now names the film.

**The related duplication, fixed at the same time.** The beat clustering, the ffmpeg tiling graph, and
the craft rubric each existed twice (`judge.mjs` and `compare.mjs`) with small differences that were
accidents, not decisions. Extracted to `scripts/gates/beats-of.mjs`, `tile.mjs`, `rubric.mjs` before a
third caller (`ab.mjs`) could become a fourth copy. This matters more than tidiness: two arms of a
comparison sampled by two different beat models are not comparable, and the divergence would read as a
quality difference. `ab.mjs` accordingly refuses to mix models — if either arm is a bare mp4, BOTH arms
fall back to even spacing.

**Lesson.** An instrument used to compare two things must be able to hold two things at once. Check that
before trusting a comparison it produced.

## #178 — three ways to make a picture that isn't there, found in one afternoon

The show-don't-tell campaign's first two scenes each shipped a graphic that was, at some point, silently
not drawing. All three failures were invisible on a settled frame.

**1. `--p` exists only if the layer declares it.** A hand-authored svg drove six columns off
`clamp(0, calc((var(--p, 1) - i*0.08) * 4), 1)`. Every column rendered at full height from the first
frame. `--p` is not ambient: a layer must carry `vars`/`varsDur`/`varsDelay`/`varsEase`, which is exactly
what `blocks/kit.mjs`'s `sweep()` stamps on. Without them the fallback in `var(--p, 1)` wins and the
build renders permanently settled. `core/sanitize-html.js` said `--p` was "written every frame", which is
the sentence that cost the hour; it now says what actually writes it. The comment warning about silent
no-ops contained one.

**2. A seam blends two BAKED frames.** Closing a `dead-air` hole by pulling the next beat back across a
seam put one layer on both sides, so the seam blended it with itself at two camera scales: a ghost
duplicate headline that three blind judges independently named as the worst frame in the film. Every beat
must open just AFTER its seam does. `beat-check` was right (see #166) and I worked around it instead of
reading it.

**3. `count` chose its format from the value on screen.** A count to 2.5M spent most of its run as a
churning six-digit wall and then snapped to `2.4M`. The scale now comes from the target, which is fixed
for the whole run. Also fixes `motion-reel` and `showcase-count`.

**The pattern.** Every sampling tool in this repo lands on settled frames by construction, and all three
of these are invisible there. Two were found by a blind A/B judge and one by pulling four deliberate
mid-animation frames. Neither is optional any more for a beat that animates.

**Two gaps left open, named so they are not rediscovered.** An `html` layer ignores `h` at render, so
chart factories emit no height and `boxOf` falls back to squaring the width: a 1130-wide chart measured
~41% of frame when the truth is ~24%. Over-crediting, not under. And because the overlap lint reads
`w`/`h`, an html layer with no `h` is invisible to it, which is why the grid diagram was allowed to
collide with its own headline until a human looked.

## #179 — `var(--t)` worked on the background and did nothing on a layer

`core/bg-html.js:52` wrote `--t` every frame. Nothing wrote it on an html LAYER. So a hand-authored
fragment in a layer using `var(--t, 0)` fell back to its default and rendered a permanently dead still,
while `core/sanitize-html.js` — the file SHARED by the layer and the background, whose whole comment is a
warning about silent no-ops — told the author that `var(--t)` was the thing that works.

Documented input, silently ignored. **12 html layers across the library were already sitting on it**,
including `ledgerline-cyber`, `ledgerline-shown`, `showcase-lumen`, `app-showcase` and the frozen
`ab4-b-ledgerline`. Every one of them has been rendering a still where its author wrote motion.

**Fix.** `core/layers/html.js` now exports a `frame()` that sets `--t`. Pure in t, so `make probe` stays
green (25 sampled frames, identical DOM in any render order). Those 12 layers will animate on their next
render; that is the intended behaviour arriving late, not a regression, but it does mean their output
changes and should be looked at.

**Lesson.** A shared doc comment is a promise made on behalf of every caller of the shared code. This one
was true for one caller and false for the other, and the false half was the one an author would reach for.

## #180 — the fake waveform three judges believed

The beat-grid drawn under "on the beat." used `abs(sin(i * 1.7))` for its background bars, as filler
behind the real cut marks. Three blind judges each described it as the track's own amplitude envelope,
and one wrote that it "is uneven in the way real music is, which is what makes it read as a measurement
instead of an ornament."

It was measuring nothing. The bars are now the real RMS envelope of the first 12.5s of
`assets/music/beat.wav` in 60 buckets, and the marked buckets are the nearest bucket to each of the
film's five actual cut times, one per cut (a +/- window matched two adjacent buckets for the cut at 10.4s
and drew six marks for five cuts).

**Lesson, and it is the sharpest one in this campaign.** A decorative graphic that *looks* like data is
worse than no graphic at all: it does not merely fail to inform, it actively misinforms, and it passes
`visual-vocabulary` because that gate measures size and never truth. **A picture that will be believed
has to be true.** The only reason this was caught is that the blind judge is asked what the picture MEANS
rather than whether it looks good.

## #181 — the A/B sampler landed mid-entrance and three judges scored the still as broken

`showcase-vocabulary`'s A/B came back 3-0 for the new cut and `wouldShip: no` on BOTH arms, and all three
judges named the same worst frame: "'One' has landed and 'JSON.' is still arriving, clipped mid-glyph by
an invisible mask", "reads as broken layout rather than motion". One judge saw through it and wrote that
it lost that beat "only because the sampler caught LEFT in a transition".

That is a `riseClip` word reveal doing exactly what it is supposed to do, photographed halfway through.

**Root cause in the instrument.** `ab.mjs` used `beatsOf` only when BOTH arms carried a scene, and fell
back to even spacing otherwise. The campaign's own working cycle compares a kept `<name>.before.mp4`
against an edited scene, so the fallback was the normal path, and even spacing samples at fixed fractions
of the clock with no idea where a beat starts. `beatsOf` samples 55% into each beat precisely to clear
the entrance.

**Fix.** When only one arm has a scene, that scene's beat table is used for BOTH arms. One model applied
twice is not the same mistake as two models applied once, and the comment now says which is which.

**The standing limit, worth stating plainly.** Any still of a staggered reveal looks broken. A judge
scoring frames cannot always tell a mid-entrance sample from a defect, and the difference between
MISTAKES #178's real ghost and this false alarm is only visible by pulling several frames across the
entrance. `make reveal` exists for exactly that and should be read before trusting a beat-level verdict
about type.

## #182 — three gates were blind to motion authored in CSS, and one of them demanded it

`hero-site`'s new graphic is an inline `<svg>` whose every shape is a function of `var(--t)`: eighteen
bars, each with its own delay, that hold as raw numbers through beat 1 and grow into an easing curve
across the cut. Three gates read the markup and each drew a wrong conclusion from it.

- `direction-floor`'s **`no-continuous-object`** saw a layer crossing the cut and said none of the
  crossers "CHANGE there", because `poseAt` can only evaluate `motion` / `vars` / `ken` / typing. The
  layer changes more across that boundary than anything else in the film.
- `direction-floor`'s **`static-figure`** counted three-or-more SVG shapes and called them one block,
  when each shape carries its own offset in its own style attribute.
- `critique`'s **`transition-dip`** excluded any layer spanning most of the film as a watermark, so the
  one object holding the frame across the junction did not count as content, and the gate reported the
  stage EMPTY at the exact moment the spine was carrying it. **Two gates in the same ladder, one
  demanding a continuous object and the other refusing to see one.**

**Fixes.** `opaqueMotion` now admits an `html` layer whose markup references `var(--t)`, the same way it
already admits a `composition` whose clock it cannot read. `static-figure` clears markup carrying two or
more distinct `var(--t)`/`var(--p)` offsets, since one shared expression on every shape is still one
block. `transition-dip`'s persistence exclusion now keeps a spanning layer that DEPICTS something (the
shared `PICTORIAL` set) and covers 8%-90% of the canvas: big enough to be the subject, not big enough to
be wallpaper. Library-wide sweep: exactly the three scenes authored this campaign change verdict, and
nothing else moves.

`PICTORIAL`, `CHROME` and `htmlGraphic` moved from `visual-vocabulary.mjs` into `scene-timing.mjs`, the
shared model, because two gates now need one answer to "is this a picture".

**Lesson.** A gate that reads markup cannot see behaviour authored in CSS, and the honest response is to
credit what is declared and name the limit, not to fail what cannot be read. The new comment says it: a
strip that morphs across the cut and a clock ticking in a corner are indistinguishable to this check.

## #183 — the continuity gate passed a spine the renderer had already cut in half

Same film, worse failure. `hero-site` shipped its first render with the strip visible in beat 1 and gone
in beat 2, while `no-continuous-object` reported clean.

**Root cause.** `core/produce.js` turns `sceneUnits` on for any cut film with no choreographed `motion`
track, and `formats/scene/scene.js` then rewrites every non-last-beat layer to end with its beat so the
wrapper can slide the whole beat out as one unit. A layer authored across the cut is truncated at it.
Under beat wrapping **no continuous object is expressible at all**. `direction-floor` read the raw
`start`/`duration` (it never imported `scene-timing.mjs`, which models this exactly), saw a crosser, and
passed.

**Fix.** A cut film that wraps beats as units now fails **`beats-wrapped-as-units`** and is told the one
fact that unblocks it: set `"sceneUnits": false`. The existing `no-continuous-object` waivers cover the
new code, so no already-waived scene turns red. Two mutation cases pin it: the spine cases now declare
`sceneUnits: false` (they must be films that COULD have a spine), and a new case proves the precondition
fires. 110/110.

**Lesson.** The gate graded a film on a property the renderer had already made impossible, and the
message sent the author to go author harder. `scene-timing.mjs` exists so gates stop modelling the
renderer from memory; a gate that reasons about time and does not import it is a bug waiting.

## #184 — the layout audit forgave a headline it could not see

`ransom-intro` shipped a cut where the specimen sheet sat on the second line of `RANSOM NOTES`. Three
blind judges, independently, all named it: "the payoff title is unreadable". `make audit` said
`0 hard`, and `make video` exited 0 on the strength of that.

**Root cause, two holes with one symptom.** The overlap check compares
`[data-layer="critical"], .hs-layer.hs-text`, so an `html` layer is in neither set and no pair ever
existed. And even inside the pair loop the occlusion escape would have swallowed it: that escape reads
"an opaque surface is painted above the lower layer, therefore the lower layer was MEANT to be hidden",
which is right for a card over a board and exactly backwards for a film's own title. The escape's alpha
test also asked every element for its `background-color`; an SVG shape answers that question with
transparent, because it paints through `fill`. An inline `<svg>` covering a headline measured as air.

**Fix.** A new HARD finding, **`buried`**: for each `[data-layer="critical"]` layer (>=60px display
text), sample a 9x9 grid over its ink and hit-test each point; if more than 40% of it sits under opaque
paint, fail. Per-layer, not per-pair, so the answer does not depend on what type the covering layer
happens to be, and the paint test now reads `fill` on SVG nodes and `background-color` everywhere else.
The grid is 9x9 rather than 9x5 because the case that produced this measured 46% covered and a coarse
grid quantised it to exactly 40%, one point under its own bar. Findings are labelled by the ink's top
edge: a ransom headline has neither `id` nor `textContent`, so nothing else can name it, and two
headlines in one film would otherwise de-dupe into one.

**Lesson.** Every static gate in the ladder passed this frame and three judges failed it in one line.
A gate that treats "cannot be seen" as "meant to be hidden" cannot tell composition from collision;
ask instead what is covered, and whether the thing covered is the one the viewer must read.

## #185 — four contact-sheet writers shared one filename

`make beats`, `make reveal`, `seam-snap` and the layout audit each wrote a single fixed path and wiped
a single fixed scratch directory: `/tmp/beats.png`, `/tmp/reveal.png`, `/tmp/seams.png`,
`/tmp/audit/scene.png`. Every scene in the library audits as module `scene`, so that last one was one
file for all 101 of them.

**Why it matters now.** Two authors working at once each read a contact sheet of the other's film, and
the beats RECEIPT recorded that they had looked at their own. The gate designed to prove somebody looked
would confirm a look that never happened, which is the silent-substitution class this repo hates most.
`judge.mjs` was moved to `/tmp/judge/<scene>/` in this same campaign for exactly this reason; nobody
checked whether it had siblings. It had three.

**Fix.** Every sheet is named for its scene: `/tmp/beats/<name>.png`, `/tmp/reveal/<name>.png`,
`/tmp/seams/<name>.png`, `/tmp/audit/<name>.png`, each with its own scratch directory. The audit no
longer `rmSync`s its output directory on startup, so auditing a second scene stops destroying the first
overlay. Every doc, Makefile recipe and gate message that quoted the old path now quotes the new one.

**Lesson.** A tool that writes one global path is single-author by construction, and nothing says so.
The cost was invisible while one agent worked at a time and became a wrong answer the moment two did.

## #186 — the continuity gate printed an instruction that throws

#183 added `beats-wrapped-as-units`, which tells an author whose film wraps beats as units to set
`"sceneUnits": false`. For some films that instruction does not compile.

**Root cause.** `formats/scene/scene.js:157` REFUSES a cut whose whole transition lives in the
visibility channels (`iris`, `wipe`, everything in `core/cuts.js` `SOLO_BLIND`) unless `sceneUnits` is
true: one root can only transition through transform and filter, so a fade-or-mask cut would empty the
frame. Those films therefore MUST wrap beats, which means no continuous object is expressible in them
at all, and the gate's one piece of advice was the one thing they cannot do. An author following it
gets a thrown render.

**Fix.** The gate imports `SOLO_BLIND` from the renderer's own module rather than restating the list,
and when the film's cuts contain one it names the two routes that exist: move those seams to a style
that MOVES and then opt out, or waive deliberately. Three separate authors hit this trap in one
campaign, which is what made it visible.

**Lesson.** A gate that tells you what to do is making a claim about the renderer, and that claim needs
the same import discipline as any other. Advice restated from memory rots exactly like a duplicated
constant, except it fails at the author's desk instead of in a test.

**Still open.** The root cause is untouched: a layer cannot opt out of beat wrapping. The fix is a
layer-level flag that attaches to `cam` instead of its beat wrapper, which would unblock continuity for
every cut-heavy film. It changes shared render behaviour, so it needs `make probe` and a full `make
snap` sweep before it ships.

## #187 — a layer could not opt out of beat wrapping, so the doctrine's central rule was unauthorable

#183 and #186 both circled this without fixing it. Under `sceneUnits`, `formats/scene/scene.js` puts
every top-level layer inside its beat's wrapper and rewrites its duration to end at that beat's cut, so
the wrapper can slide the whole beat out as one unit. Nothing could survive a cut. The engine turns
`sceneUnits` on by default for any cut film with no choreographed `motion` track, and refuses to turn it
off for a film whose cuts include `iris` or `wipe`. So in a large class of films the continuous object
that `direction-floor` demands could not be written at all.

Three authors hit it in one campaign. One re-declared the same 6KB of SVG seven times, once per beat,
driven off the shared clock, to fake one persistent picture.

**Fix.** `"acrossBeats": true` on a layer. `beatIndexOf` returns null for it, which the two existing
call sites already handle: the layer attaches to `cam` rather than a wrapper, and `setLayerTiming`
leaves its authored duration and its own exit alone. Two lines of behaviour, because the seam was
already in the right place.

Proven by pixels, not by reading: the same scene rendered with and without the flag, sampling the
spine's box at 3.9s, 4.5s and 7.0s across a cut at 4.0s. Without it, 191744 lit pixels before the cut
and 0 after. With it, 191745 at all three.

`scene-timing.mjs` learned the flag too, or every gate reasoning about time would keep insisting the
layer had been truncated. `direction-floor` now names it as the fix, which let the SOLO_BLIND special
case from #186 be deleted: one answer, no exceptions. A mutation case pins the escape hatch open
(`acrossBeats lets a spine out of the beat wrapper`, must-pass), 111/111.

**Lesson.** Two gates had already been sharpened to describe this trap precisely, and both stopped at
describing it. A gate that can only say "you cannot do this here" is a bug report addressed to the
author instead of to the engine.

## #188 — 37 references to a custom property nothing defines

`core/boot.js` writes `--text-2`. Twenty-two files asked for `var(--text2)`. CSS answers an undefined
custom property by INHERITING, so every one of them painted whatever the parent happened to be, with no
error and no warning, and the design-spec lock passed them clean because a `var()` reference is not a
literal colour.

**Why it spread.** Three of the twenty-two were GENERATORS: `blueprints/beats.mjs`,
`scripts/author/showcase-build.mjs` and `scripts/site/rules-build.mjs`. Every blueprint dropped and every
showcase rebuilt minted the typo again. Fixing the scenes alone would have refilled the library on the
next `make blueprints`.

**Fix.** All 37 repointed, generators included. A new `dead-token` finding in the design-spec lock reads
every `var(--x)` in a scene and checks it against the tokens the ENGINE actually defines, derived rather
than restated: the `set('--x', …)` literals in `core/boot.js`, the declarations in `core/tokens.css`, the
resolved theme file's `vars` passthrough, per-layer `vars`, the per-frame `--t`/`--p`, and any property
the fragment declares inline itself. It names the nearest known token, so the message is the fix.

The sweep it enabled then found two more of the same shape, both camelCase against a kebab-case engine:
`var(--surface2)` in five files and `var(--lineStrong)` in two, one of them in `blueprints/kit.mjs`,
another generator. Library now reports zero. Two mutation cases pin it, one must-fail and one must-pass
for a fragment that declares its own property. 113/113.

**Two lessons.** Deriving the legal set from the engine is what made this checkable at all; a hand-copied
token list would have been a second thing to keep right. And a defect inside a generator is not one bug,
it is one bug per future invocation, so the first question about any repeated typo is which tool is
typing it.

## #189 — the renderer painted nothing rather than refusing, and looked like the lenient one

An authoring agent reported this as a gate bug: "`validate` fails any scene containing an un-expanded
block, but the renderer expands blocks itself, so the gate and the engine disagree." It removed the
blocks to get a green build and said plainly that this was a workaround.

The report was backwards, and only the pixels said so. `./bin/vawe` on a scene whose single layer was
`{"type":"block","block":"kpiRow",…}` exited 0 and produced an mp4 whose frames contained exactly ONE
distinct grey level. It had not expanded anything. `core/layers/index.js` dispatched
`REGISTRY[L.type] || text`, so any unknown type ran the TEXT builder, which paints nothing without a
`text` prop. `validate` was right; the renderer was wrong; and because the renderer was the one that
exited 0, it read as the reasonable one.

**Fix.** Dispatch goes through `pick(L)`. A missing `type` still means text, the documented default. A
type that is present and unknown throws and lists the registry. `block`, `comp` and `beat` are
build-time sugar (`scripts/author/expand-blocks.mjs`) and throw with the step that actually unblocks
you. The message deliberately does not name WHICH block it was: `schema-drift` guards the set of layer
props the engine reads, and those three are author-facing sugar the schema omits on purpose, so reading
one would widen the renderer's claimed surface for a nicer string. Watch the comments too: the drift
scanner does not strip them, so prose containing `L.` plus a prop name trips it.

**Blast radius, and what it exposed.** Six sources carry sugar. Five had a `.expanded.json` sibling
already, which is what ships; `motion-showcase` had none and an mp4 rendered from source, so three of
its six layers had been silently dropped and its shipped film was half a film. `make expand` gave it
one. `snap-scenes.mjs` was also snapshotting those sources directly, which means its baselines recorded
films with holes; it now snapshots the expanded sibling and skips the source with a printed reason. The
mutation fixture that named `showcase-count` was repointed at `showcase-count.expanded`.

**Two lessons.** A subagent's framework report is evidence, not a ruling: this one was confidently
inverted, and the only thing that settled it was counting grey levels in a frame. And of two components
that disagree, the one that exits 0 is not thereby the correct one; silence is the cheapest way to look
right.

## #190 — eight render workers starved raster, and words blinked out

A user watching `showcase-flight` said "words are flickering". Nothing in the ladder could see it.

**What it was.** One frame in roughly eight, the text band came back with the later columns missing and
the hook line falling off left to right. The DOM for those frames is correct: `make probe` passes on
this scene, including its out-of-order check. `make audit`, `seam-check` and the rest read JSON or DOM,
so all of them were structurally blind. The corruption is in RASTER, downstream of everything measured.

**How it was found.** Only by rendering the same scene twice: the bad frames MOVED, which proved
non-determinism. Then the shape of it: bad frames are near-identical to EACH OTHER (mean delta 0.2)
while differing from their neighbours by 8, and they recur every ~8 frames. The renderer runs
`min(NumCPU-1, 8)` capture browsers and hands frame *k* to worker *k mod N*, so an ~8-frame period is a
per-worker fingerprint.

**Four fixes that did not work**, all reverted, because a workaround that does not fix the thing is
worse than nothing: compositor determinism flags (`run-all-compositor-stages-before-draw`,
`disable-new-content-rendering-timeout`, `disable-checker-imaging`, `disable-threaded-animation`);
doubling the rAF settle wait from 2 frames to 4; capture-until-stable (read the surface twice, accept
only on agreement) — which failed informatively, because the two reads AGREE on the broken state, so
the compositor is holding it rather than the reader catching it mid-paint. `HeadlessExperimental.
beginFrame`, the API that would settle this at the source, does not exist in the new headless mode
Chrome 150 ships.

**The fix.** Render at 4 workers, not 8. Measured on `showcase-flight`: 8 gave 8-11 corrupted frames and
a different set each run, 4 gives zero, 1 gives zero. Each worker is a full browser capturing at ss×
supersample, and past about four of them raster cannot keep up with the draw.

**On the gate.** `make flicker-check` reads the encoded mp4 and finds frames that lose content both

> **Cut on 2026-08-05 in `cc2dfc2`**, with five other engine-only tools, on the ground that none had ever made a video better. The paragraph above describes what it did while it existed.
their neighbours carry. It separates this defect perfectly on the film it was built from, and swept over
the library it flagged 39 films, of which the first checked (`showcase-aspect`) produced the SAME five
frames at 4 workers as at 8: content, not corruption. So it is shipped as a diagnostic and deliberately
kept OUT of the ladder. A blocking gate that cries wolf on a third of the library teaches everyone to
skip it, which is worse than not having one.

**Lesson.** Every gate here reads the plan or the DOM, and this class of defect lives in neither. The
only instrument that found it was rendering twice and comparing, and the only reason anyone looked was
that a human watched the video.

## #191 — a card scaled about a box that did not exist yet

A viewer watching `showcase-composition` said the 3-6s stretch looked wrong. It did: each pipeline card
grew from small at a position it never occupies at rest, swinging left into place while its connector
had already drawn a stub into empty space. For about a second and a half the diagram read as broken.

**Root cause.** `pipelineFlow` entered each card with `scale: 0 → 1` about
`transform-box: fill-box; transform-origin: 50% 50%`. `fill-box` resolves against the element's own
bounding box, and this file's own header states the constraint that breaks it: **the layer is not in the
document at `build()` time**, because `formats/scene/scene.js` appends AFTER `renderer.build`. No box, no
origin — and `immediateRender: true` pins the tween's start value at exactly that moment. The comment
even cites this constraint two lines earlier as the reason the draw-on uses the `pathLength=1` trick
instead of `getTotalLength`. The same fact invalidated the scale origin and nobody joined them up.

**Fix.** Scale about the card's own centre stated in user units (`transform-box: view-box` plus an
explicit `transform-origin` in px). Both numbers are already computed at build time for the connector
geometry, so nothing needs a box. The same pattern appeared twice more in `numberFlow` and was fixed the
same way.

**Lesson.** Purity gates cannot help here: `make probe` passes, because the DOM is a pure function of t
either way. It is the wrong pure function. And a constraint written down in a file header protects only
the line that quotes it; the second place that depends on it fails silently.

## #192 — three craft decisions were opt-in, so the library never made them

`higgsfield-recreation` is the exemplar and the rest of the library does not move like it. Reading its
JSON against everyone else's, three of the differences were not taste at all — they were defaults
pointing the wrong way, and the evidence is the usage count.

**1. `easeInOutCubic` between every pair of motion keys.** That curve zeroes velocity at BOTH ends of a
segment, so a chain of closely-spaced keys accelerates and stops once per key and the move pulses. This
was already diagnosed and fixed for the CAMERA in #125; the per-layer default was left standing.
`motionAt` now interpolates linearly below `DENSE_KEY_SEC` (0.14s, ~4 frames) unless an `ease` is named.
Dense keys are a traced path, not a span with a shape. Two scenes change.

**2. `motionBlur` was opt-in, and across the entire library exactly ONE layer set it.** A default nobody
reaches for is not a default. Blur is physics: something crossing the frame in a few frames smears
whether or not the author remembered. It now applies itself above `AUTO_BLUR_FLOOR` (16px/frame).
13 scenes, 49 layers change.

**The first version of this was too strong and measurement caught it.** Auto mode reused the opt-in
shutter of 0.5, which peaked at the 24px cap on five `creed-launch` rects and put 18.3px on a moving
headline: dissolved, not smeared. Computed across the library BEFORE rendering anything, which cost
nothing. `AUTO_SHUTTER` is now 0.16, the value the exemplar's own author picked by eye for its fastest
layer, and the worst text case is 5.9px.

**3. Exits ran at the same speed as entrances**, because one symmetric constant was the only knob. An
entrance is an introduction; an exit is over. `theme.motion.exitRatio` moves that to the theme where a
brand's snap belongs. Defaults to `1`, so nothing changes until a theme opts in; `higgsfield` sets 0.45.

**What is NOT a default, stated so nobody tries.** Traced timings come from measuring a video. 73
hand-written keys per five seconds cost hours. Two-colours-and-no-third is a decision made once in a
theme. Turning any of those into an automatic behaviour would be cargo-culting the artefact instead of
the cause.

**Lesson.** "It is available, authors can use it" is how a capability stays unused. Before defending an
opt-in default, count the uses: one, in a hundred-film library, is the whole argument.

## #193 — a layer flashed back to solid on the last frames of its own fade

A viewer reported a flicker around 5s in `cadence-film`. Reading the opacity out of the DOM frame by
frame:

```
 4.80s  0.057      fading correctly
 4.90s  0.007      nearly gone
 4.97s  1.000   ← full opacity, one frame
 5.00s  0
```

**Root cause, and it is one falsy zero.** `core/clips.js` writes opacity with `.toFixed(3)`, so a layer
at the tail of its fade holds the STRING `"0.000"`. Two places in `formats/scene/scene.js` then composed
a motion or prop track's opacity onto it with `(parseFloat(el.style.opacity) || 1) * m.opacity`.
`parseFloat("0.000")` is `0`, which is falsy, so `|| 1` read it as "nothing set here" and handed back
FULL opacity. The layer became solid again for exactly the frames where its own fade had rounded to
zero, then vanished when the window closed.

**Fix.** `baseOpacity(el)` returns the parsed value whenever it is finite and only defaults to 1 when it
is not. Opacity through the same window is now monotonic: 0.057, 0.007, 0.002, 0, 0.

**Blast radius: 34 scenes** have a layer with a motion or `vars` track and a fading exit, which is the
whole exposed set. The fix can only make those frames darker, never brighter, so nothing that read
correctly changes.

**Why nothing caught it.** `make probe` compares the DOM across render orders and this was identical in
every order — deterministically wrong. `seam-check` looks for a luminance FLASH in a transition overlap
and this was a flash of one layer inside its own window, not at a declared boundary. `flicker-check`
measures whole-frame ink against both neighbours, and one faint bar returning at 4% of frame did not
clear its floor. A human watching the video found it.

**Lesson.** `x || default` is wrong for any quantity whose valid range includes zero, and opacity is the
canonical case. The bug survived because it only fires in a window three frames wide, at the end of a
fade, where nobody looks.

**Swept afterwards for the same class.** Every `x || <non-zero>` in `core/` and the scene renderer, and
every read-back off `dataset` / `style` / `getAttribute`. The result is worth recording because it is
mostly GOOD news: about fifteen hits and nearly all are correct guards against a degenerate value, not
falsy-zero bugs — `units.length || 1` and `rawMax || 1` guard a divide, `(seed >>> 0) || 1` guards an LCG
that degenerates at zero, `man.fps || 30` and `data.duration || 12` guard nonsense inputs. Every DOM
read-back is `|| ''` on a string, where empty is the right fallback. And layer props are read with `??`
throughout, which is why `opacity: 0` on a LAYER always worked; only the recomposition of an already
written style had the bug.

Two real ones, both in `core/audio-kit.mjs` and both internal rather than author-facing: `L.glideTime ||
0.1` turned "snap to the target" into a 100ms slide, and `L.decay || 0.1` overrode a zero decay. The
same line already read `L.peak ?? 0.1` correctly, so the distinction was known and applied unevenly.
Both now use `??`.

**No gate was added for this.** A source rule flagging `|| <non-zero>` would fire on all fifteen legitimate
guards to catch one bug, which is the `flicker-check` mistake (#190) again: a check that cries wolf gets
skipped, and then it protects nothing.


---

## #194 — a layer that peels off a shared pan continues from where the PAN left it

**What.** In `cadence`, the COMPOSE button rides the page via `panWith: "chrome"`, then peels off and
lifts to centre. On screen it snapped: for two frames at t=2.87s it jumped 194px back to the RIGHT after
travelling left for 0.7s. The user saw it as "not smooth". Every gate was green.

**Root cause.** `panWith` copies the source's track as deltas from the layer's own origin, and the
author's own keys are measured from that same origin. The resolved track read:

| local t | x |
|---|---|
| 1.38 | **-512** (last pan key) |
| 1.44 | **-318** (first own key) |

194px of backwards travel in 60ms, at 3244 px/s. The number `-318` was picked by reading the button's
position on screen; by then the pan had carried it to -512. Both numbers are in the same coordinate
system, but the pan's accumulated value appears NOWHERE in the JSON, so the author cannot see what
continues smoothly. Nothing about `-318` looks wrong when you read the file.

**Fix.** Two parts. The film peels at t=1.05 instead of 1.44, before the pan crosses its destination, so
the travel stays monotonic and decelerates 877 → 834 → 601 → 556 → 362 → 200 → 100 → 40. And
`peelTime()` in the new `core/pan-resolve.mjs` stops the source contributing once the layer states an
x/y of its own — a thing that has peeled off cannot still be dragged along by what it peeled off from.
Only x/y count as leaving, because x/y are the only properties a pan supplies; a `rot`-only key is the
layer doing its own thing WHILE it rides.

**Gate.** `layoutErrors` now samples every resolved track at 30fps and fails on a velocity REVERSAL of
≥60 px/frame². Two cheaper tests were tried and both are wrong: key-to-key average velocity calls an
eased arc a reversal (`rec2-gates`' dot swings 777px out and 525px back on easeInOutCubic, so its
velocity passes through zero at the turn and it is smooth), and peak acceleration alone is worse still
(`creed-launch` hits 134 px/frame² accelerating in a straight line, harder than the defect). Only
direction-change AND magnitude together separate them. One hit across 102 scenes, and it was real.

**Lesson.** A feature that composes two coordinate contributions must either show the author the sum or
do the arithmetic for them. `panWith` did neither, and the failure is invisible in review because the
JSON reads exactly as intended.

---

## #195 — a merged motion track must state the whole pose at every key it fabricates

**What.** Found while fixing #194, and worse than it: `cadence`'s spinner shuddered for 27 frames. Its
x ran 89 → 49 → 40 → 140 → 90 → 49 → 173 and its rotation ran 0 → 214 → 0 → 286 → 0 → 352.

**Root cause.** `motionAt` reads a track KEY TO KEY, so an omitted property is not "unchanged" — it is
identity (`k.x ?? 0`, `k.rot ?? 0`). That is a coherent contract, and scenes depend on it: the button's
only `opacity` key is at t=2.64, and it fades over the last segment precisely because the keys before it
are read as opacity 1. But `mergePan` interleaves two tracks, so every key it produces is missing
whatever the other track declared, and each one snapped that property to identity. Both halves were
wrong: the pan's keys carried `rot:0` (stamped from a `sticky` map built off `own[0]`), and the spinner's
own `rot`-only keys carried no x. The rotation and the travel fought each other from opposite ends.

**Fix.** Every key the merge produces now states the full pose. Fabricated pan keys take scale/rot/
opacity/blur from `motionAt(own, t)` — the layer's own track AT THAT INSTANT, not a constant. Spliced
own keys take x/y from the pan at that instant. The `sticky` map is deleted: it was a workaround for
this same bug that only ever worked because it was tested on a property that never animates.

**The fix I nearly shipped instead.** I first made `motionAt` interpolate PER PROPERTY, which is what
CSS and GSAP do and reads like the obviously-correct semantics. Sampling old against new across all 147
tracks said 19 scenes would change, and the worst was `higgsfield-recreation`'s button going INVISIBLE
for the entire film: with opacity declared only at t=2.64, "hold before the first declaration" pins it
at 0 from the start. The library's idiom is key-to-key and several scenes encode fades that way. Reverted
before rendering anything, and the blast-radius measurement is the only reason it was caught.

**Lesson.** The bug was in the code that FABRICATES keys, not in the code that reads them. Changing the
reader to accommodate bad keys would have been a much larger blast radius for a smaller fix — and
"obviously correct semantics" that contradict an established idiom break more than they repair. Measure
the blast radius before believing the elegant fix.

---

## #196 — two elements that mean the same thing, and the dead tail under both gates

**What.** `cadence`'s tail carried a pulse ring blooming out of the vanishing button AND a loading
spinner beside "Composing". For the twelve frames they overlapped, the frame held two expanding circles
and read as a duplicate. The user found it by watching; no gate said anything.

**Why no gate.** This is not a geometry problem. The two never meaningfully overlapped in space, so
`audit`'s overlap check had nothing to fire on. They collided in MEANING: the ring is the object's own
pulse, the waveform IS the work happening, and a spinner is the generic stand-in you reach for when you
have neither. Three things saying one word. No static gate can measure that, and this entry is not
proposing one — it is recording that the class exists and belongs to eyes.

**The second bug, created by the fix.** Cutting the spinner left the last 0.9s completely still: the
spinner had been the only moving thing there. Neither gate caught THAT either, and the reason is a real
gap worth naming. `beat-check` sees both remaining layers present and calls the span covered — it
detects a hole where the frame holds only the backdrop, not a span where everything present is frozen.
`motion-audit` does have a frozen-span check, but its threshold is 2s and this tail is 0.9s. A short
dead tail falls between the two, and a 5s film cannot afford 0.9s of it.

**Fix.** The waveform now draws until ~4.6s instead of ~4.08s, then settles for 0.4s. That fills the tail
with the thing the film is about — the music being written, one bar at a time — rather than with a
spinner that meant nothing. A held ending is right; a held ending that is a fifth of the runtime is not.

**Lesson.** Removing a redundant element can expose a hold that the element was hiding. When you cut
something, re-ask what was moving in the frames it occupied. And the honest note on coverage: both of
the defects here were found by a person watching the video, which is now true of every visual defect in
this session.

---

## #197 — multiPhase's "hold" leg panned the camera home

**Found by prediction, not by watching.** The method: take the bug shapes from #193-#196, enumerate every
site in the engine that has the same shape, and probe each one. First site checked, first hit.

**What.** `multiPhase` chains camera legs into one journey. Its own docstring describes the intended use
as "push → hold-with-drift → settle" and promises a hold leg "still creeps (never a dead freeze)". Given
exactly that input, the hold leg panned the camera 180px back to centre over 2 seconds — a move as large
as the push it was supposed to be holding after.

**Root cause.** `core/camera-moves.js:65`, one object literal:

```js
kf.push({ t, s: leg.s ?? kf[kf.length - 1].s, x: leg.x ?? 0, y: leg.y ?? 0, … });
```

`s` carries forward from the previous keyframe. `x` and `y` reset to identity. The correct idiom was
known and applied to one axis of three, which is the same tell as the `L.peak ?? 0.1` line in #193.

**Why nothing caught it.** No scene uses `multiPhase` — it is in `schema.json`, so it is author-facing,
but nothing in the library exercises it, and unused code cannot be caught by rendering. `lib-test` did
cover it, and the coverage is the interesting part: it asserted easing and determinism, and passed `s`
on every leg with no position at all. It tested the one input shape that works. A test written from the
same mental model as the code inherits its blind spot.

**Second face of #195.** The shape has two forms and looking for only one is how the first probe missed
this: (a) the generated key OMITS a property and the READER resets it — `mergePan`; (b) the generated key
STATES identity and the GENERATOR reset it — this. (b) is invisible to any structural check, because the
key is complete and well-formed and only the meaning is wrong. Probes must drive a generator with an
input whose correct answer is known independently ("a leg that mentions nothing changes nothing") and
check the behaviour, not the shape.

**The sweep around it.** 172 probes across every camera generator and every block factory: 1 hit, 165
clean, 6 skipped for needing props. That ratio is the honest result — the prediction method paid for
itself once and found nothing else in this class. `scripts/dev/predict.mjs` keeps the probes rerunnable,

> **Cut on 2026-08-05 in `cc2dfc2`.** The probes are no longer rerunnable; the ratio above is the result it produced while it existed.
and it was checked against a deliberately reintroduced bug to prove it fires.

---

## #198 — removing an element is not the same as replacing what it did

**What.** #196 cut a loading spinner from `cadence` because it collided with the pulse ring, then filled
the resulting still tail by stretching the waveform's draw-on. The user's verdict: "without the spinner
the video feels half baked. you cant just remove some element without thinking what it contributed."

Correct, and the distinction is worth writing down. The spinner contributed two separable things: a FORM
(a rotating circle, which collided) and a FUNCTION (the status line is live, this is still going).
Only the form was the problem. Cutting the element threw away the function, and stretching the waveform
replaced neither — it made sure nothing looked frozen, which is not the same as the line being alive.
"Composing" with nothing beside it is a label, not a state.

**Fix.** Keep the function, drop the form: three dots pulsing in sequence, which cannot be mistaken for
the ring because they are not round, and which read as the ellipsis of "Composing…" rather than as an
indicator parked next to it. The waveform went back to finishing at 4.08s, because a 0.9s settle on the
payoff is right when something else on the frame is alive — the stretch had only ever been compensation.

**Lesson.** Before removing anything, name what it contributed as FORM and as FUNCTION separately. If
only the form is at fault, the fix is a different form, not a deletion. And a hole filled with motion is
not a hole filled with meaning: "nothing looks frozen" is a much weaker property than "the frame still
says what it needs to".

**A second bug, in the fix.** The three dots were placed by where they should REST — and `panWith` means
the authored x is where a layer STARTS. They landed 274px off the end of the word. That is #194 exactly,
walked into by the author who had fixed #194 forty minutes earlier, on a feature whose trap he had just
written a gate for. The gate catches a reversal; it says nothing about resting position.

So `lintData` now simply prints the arithmetic for every panning layer: *"pans with 'gen', so its x/y is
where it STARTS (932, 520) — it comes to rest +246px across, at (1178, 520)."* The number was always
computable and appeared nowhere: not in the layer, not in the source, not in any error. Two bugs from
guessing it is enough evidence that people will keep guessing it.

---

## #199 — the silent-prop sweep: four conditionals that swallow an author's input

**Class E of the predicted-bug hunt.** A prop read only INSIDE a conditional on another prop does nothing
when that other prop is absent, and does it in silence. CLAUDE.md already described two of these as
things that "render silently" rather than treating them as bugs. Four found, all now spoken:

| what | was | now |
|---|---|---|
| `anchor` naming a layer that does not exist | skipped, layer stays at its own x/y | **hard error**, with the known ids listed |
| `at` without `anchor` | ignored | lint |
| `at: "…center"` with `anchor` but no `w` | silently falls back to a plain left offset | lint |
| `align: center/right` without `w` | box shrink-wraps, alignment does nothing | lint |

The `anchor` one is the sharp one. `resolveAnchors` does `const T = L.anchor && byId[L.anchor]; if (!T)
continue;` — the identical shape `panWith` had. `panWith` was given a hard error for it; `anchor`, three
lines away in the same file, kept the silent skip. Fixing one instance of a class and leaving its twin
untouched is how a class survives.

**What counting first saved.** The obvious `at`-without-`anchor` check would have fired on
`app-showcase.json`, where `tapRipple` takes `at: 2.1` as a TIME. The prop is overloaded, and a check
written from the anchor code alone would have called an innocent scene broken on its first run. Scoped
to anchor-vocabulary strings on non-block layers. Library sweep after: 2845 layers, 0 new hard failures,
1 new warning (`stripe.json`, a real `align: center` with no `w`).

---

## #200 — a frozen span is a fraction of the runtime, and the gate could not see inside a layer

**Class D: the gap between two gates' thresholds.** `motion-audit` warned on a frozen span over a flat
2s. `beat-check` sees a hole only where the frame holds nothing but the backdrop. `cadence` held a
perfectly still frame for 0.9s of 5s — a fifth of the film — and fell between them (#196). "Too long to
be still" is a proportion, not a constant, so the budget is now `15% of runtime, clamped to 0.6-2s`.

**And then the tighter threshold immediately produced a false positive**, which is the more useful half.
It flagged `cadence` as frozen from 3.1s to 3.9s — the exact seconds its waveform is drawing itself on,
bar by bar. The audit measured each element's bounding box, opacity and text, and an svg whose bars
scale on `var(--t)` changes none of the three. A layer can be busy inside its own box, and the gate was
blind to it.

So the row now carries a cheap fingerprint of descendant transforms (capped at 24 nodes, so a 90-layer
film stays affordable). Both directions were then proven: quiet on the fixed `cadence`, and firing on a
synthetic 5s film with a genuinely dead tail.

**Lesson.** Tightening a threshold without checking what the gate can actually SEE converts a miss into a
false alarm, and a gate that cries wolf gets waived and then protects nothing (#190). The threshold and
the measurement have to move together.

---

## Class B and Class C: what the hunt did NOT find

Recorded because a negative result from a systematic sweep is worth as much as a hit, and because the
next person to have this idea should know the yield.

**Class C (identity-vs-absent defaults)** has exactly two sites in the engine: `motionAt` and `cameraAt`,
both in `core/sequence.js`. `motionAt`'s contract is deliberate and load-bearing. `cameraAt` carries the
same shape, and **0 of 34** multi-key camera tracks in the library have a partial key, so it is a trap
nobody has stepped in. Splitting the semantics so camera and layer tracks behaved differently would be a
worse trap than either, so neither was changed — instead `lintData` now says out loud when a track drops
a property it had moved off identity. That warning found one real defect on its first run:
`rec3-skill`'s spinner reaches `rot: 1310` and its next key omits `rot`, so it whirls SIX FULL ROTATIONS
BACKWARDS in seven frames. Left in place: the scene is cited evidence in earlier entries.

**Class B (composed transforms)** produced one confirmed non-bug worth writing down, because the
reasoning looked airtight and was wrong. `resolveBecomes` reads the outgoing layer's last keyframe as a
raw object (`num(lastA.x, 0)`), which looked like #195 exactly: a fade-out key stating only `opacity`
would report x=0 and scale=1 instead of where the layer really ended. It is not a bug, because
`motionAt` at that same instant returns `norm(last)` — literally `last.x ?? 0`. The two agree BY
CONSTRUCTION. The layer genuinely does snap home there, the handover matches what is drawn, and the real
problem is the snap itself, which the #199 lint now reports. A probe comparing raw against resolved can
never fail; writing it is what showed that.

The one real `becomes` finding is a silent discard: keys the incoming layer declares inside the handover
window are dropped, correctly, and without a word. Now a lint.

**Yield of the whole hunt: 4 classes, 172 automated probes plus targeted checks, 3 real bugs
(`multiPhase` #197, the `anchor` silent skip, `rec3-skill`'s reversing spinner), 4 silent-input fixes,
1 gate blind spot, and 2 confidently-predicted bugs that did not exist.** The miss rate is the honest
headline: predicting bug shapes finds bugs of shapes already known, and every user-visible defect this
session still came from someone watching the video.

---

## #201 — four things between the capture tools and a real brand

All four found in the first twenty minutes of trying to make a film for an actual company, which is the
point: they had been in the repo for months and no amount of engine work would have surfaced them.

**1. The crawler announced itself as a robot.** `sections.mjs` used puppeteer's default User-Agent,
which says `HeadlessChrome`. ramp.com answers that with a markdown "Machine Version" of the page — no
`<section>` tags, no layout, no product UI, and an explicit "AI agent marketing program" offering a
$3,100 signup bonus to whatever agent is reading. With a real browser UA the same URL serves the real
page: 8 sections instead of 0. Reflecting a brand means capturing what a PERSON sees, so the crawler now
presents itself as one. (The inducement is noted and ignored: page content is data, not instructions.)

**2. Finding nothing printed a green tick.** `✓ 0 sections` with an empty storyboard under it. A crawl
that finds nothing has told you nothing; it now exits non-zero and lists the three things that actually
cause it.

**3. Every shot was taken through a newsletter modal.** Fixed-position furniture does not scroll away, so
ramp.com's product-newsletter modal sat on top of all eight sections AND would have been baked into
every `make capture` command the storyboard printed. Now dismissed before measuring: press Escape, click
close controls, then remove what is still covering the frame.

  My first version of that removal also took `position: sticky` — which is how a scrollytelling section
  PINS ITSELF while you scroll through it. It deleted the body of section 4 and the shot went from 1.1MB
  to 82KB of nothing. Overlays are `fixed`. Sticky is layout, and stripping it reflects a page nobody
  sees. Caught only because the section's name changed from `systems-that-never-spoke` to `section`.

  Re-crawling also left the previous run's files in place, because section filenames come from their
  headings and a changed page writes different names. `palette` then eyedropped a mix of two crawls.

**4. The eyedropper could not see a brand's accent, and that is backwards.** It reported "(none
saturated)" for Ramp, whose lime is the single most recognisable thing about it. Three compounding
causes, and the third was the real one:

  - it ranked candidates by how much of the page they cover — but an accent is what a brand spends
    SPARINGLY, so frequency-ranking looks for the opposite of one. It returned `#111605`: near-black
    antialiasing noise, technically saturated, completely invisible.
  - it sampled each section at 130px wide, where a button is 6 pixels and blends into the white beside it.
  - **it only returned the top 16 bins**, which on any white-first site are sixteen neutrals. The accent
    pass was choosing from a list the accent could never appear in. Ranking could not fix what was never
    in the list.

  Now: visible colours only (not near-black, not near-white), ranked by vividness weighted by presence,
  260px sample, 400 bins. Across all 8 captured brands it now returns the right accent for each.

**The lesson that outranks the four.** My memory said Ramp was yellow-and-black; the real site is
white-first with near-black text and a lime accent. My memory said Linear was indigo; its captured
sections are 2% lime. Both times the tool was right and recall was wrong, and a film authored from what
I "know about the brand" would have looked wrong in a way no gate could catch. Capture is not a
convenience in this workflow. It is the only source of truth about how a brand looks today.

---

## #202 — the rules audit: nine of thirty-four rules are not doing what they claim

`scripts/dev/rules-audit.mjs` asks every gate finding the three questions the gates ask films: does it

> **Cut on 2026-08-05 in `cc2dfc2`.** The audit below is the one run it produced. Nothing re-runs it now.
FIRE on real work, is it FIXED or waived when it does, and does anyone write down WHY. Run over 102
scenes and five static gates it found 34 findings and two distinct pathologies.

**DECORATIVE — engaged, then waved through more often than obeyed.**

| finding | waived | with a reason |
|---|---|---|
| `no-continuous-object` | 82% | **0 / 14** |
| `dead-air` | 100% | **0 / 12** |
| `ends-on-nothing` | 100% | **0 / 6** |
| `overlap` | 100% | 1 / 4 |
| `cut-families` | 100% | **0 / 4** |

Thirty-eight waivers between them and **one** written reason. The doctrine says a waiver is a deliberate
exception with a stated cause; in practice it is a keyword that makes a gate stop talking.

**IGNORED — the pathology hiding behind a clean waiver count.** A waiver is a decision someone had to
type. A WARNING is free to skip, so a warning nobody acts on accumulates in silence and looks healthy in
every count:

| finding | fires on |
|---|---|
| `no-camera` | **63 / 102 scenes (62%)** |
| `no-transition` | 45 (44%) |
| `low-vocab` | 36 (35%) |
| `no-bg-motion` | 34 (33%) |

A warning that fires on nearly two thirds of the library is not a signal, it is wallpaper. The real cost
is not the films it failed to improve, it is that it trains every author to scroll past warnings, which
is exactly how the ones that matter get missed.

**The one genuine correction to an earlier claim.** I said `no-visual-vocabulary` was the repo's #1 rule
"waived 29 times and therefore decorative". It is waived 29 times, and **29 of 29 carry a written
reason** — the only finding in the library where every waiver was justified. It is the healthiest rule
here, not the sickest, and the earlier framing was wrong.

**Zero SILENT findings.** Nothing in the ruleset is dead. Every rule fires or is waived somewhere, which
is a genuinely good result and worth saying next to the bad ones.

**A gate bug found on the way.** `slop.mjs` waits for `__engineReady === true || __engineError` and then
assumes ready, so a scene that fails to boot produced `Cannot read properties of undefined (reading
'renderFrame')` — true, useless, and hiding a perfectly good engine message underneath
(`layer type "block" is build-time sugar, run make expand`). It exits non-zero, so it fails loudly
rather than silently, but the message named the symptom instead of the cause. Now it surfaces the
engine's own error.

**What this does not measure.** Whether a rule is TRUE. It measures whether a rule is ALIVE. Truth needs
the A/B judge, and `becomes:` remains the precedent: tested, beaten by its own control, and kept with an
honest note about what it does not buy.

---

## #203 — the library was already disposable, and I nearly deleted it permanently

**What happened.** Asked to clear out the scene library so the rules stop being calibrated against it,
I triaged 108 scenes into keep/drop and said, in as many words, that deletion was safe because "git
history keeps every one of them, so this is one `git revert` away from undone."

Then `git rm` refused most of the list. **68 of 109 scene files are UNTRACKED.** For those, deletion
would have been permanent, and the only thing that stopped it was a tool declining a bad argument. I
asserted recoverability and checked it afterwards, which is the wrong order for the one property that
makes a destructive action safe.

Nineteen tracked files were staged for deletion before the error surfaced; all restored, tree clean.

**What the failure revealed, which was worth more than the task.** `.gitignore:49` already ignores
`formats/scene/*.json` behind an explicit allowlist, and says why:

> Video/data instances are NOT the framework (framework = scene.html + schema.json + sample.json).

The repo had already made this decision. There is a deliberate, documented split between the ~41
allowlisted scenes that ARE the project and the rest, which is local scratch no clone has ever seen.
"Delete the library" was mostly a request to clear a directory that was never in the repository.

**It also invalidates the numbers in #202, in the direction that matters.** That audit swept 102
scenes and reported waiver rates over all of them. Rescoped to tracked scenes only, the picture is
sharper and worse:

| finding | over 102 scenes | over 37 TRACKED scenes |
|---|---|---|
| `no-camera` | 62% | **78%** |
| `no-continuous-object` waived | 82%, 0/14 reasoned | 86%, **0/6** reasoned |
| `dead-air` waived | 100%, 0/12 | 100%, **0/3** |
| `no-visual-vocabulary` waived | 46%, 29/29 reasoned | 50%, **9/9** reasoned |

The tool now defaults to tracked scenes (`--all` for the old behaviour). Auditing untracked scratch
measures one laptop, not the project.

**The fix that came out of it.** `author-check` now FAILS a waiver with no written reason. Nothing
judges whether the reason is good — it cannot. It makes waiving cost one sentence, and the cost is the
whole mechanism: it turns a reflex back into a decision, and a bad reason written down is reviewable in
a way that silence is not. Ten tracked scenes fail on this alone, which is the intended consequence.

**Lesson.** Verify reversibility BEFORE promising it, not after. And read `.gitignore` before proposing
to delete anything: it is the file where a repo records which of its contents it considers disposable,
and this one had the answer written down the whole time.

---

## #204 — rendering at 60fps silently threw away motion blur

**Found by a question, not a gate.** Asked whether we can render at 60fps, I checked instead of
answering. We can: `-fps 60` produces `r_frame_rate=60/1`, 300 frames for a 5s film, duration exactly
5.000s, and the `FPS = 30` in `core/motion.js` is only a fallback for when the renderer passes no
`fps` param. That part was already right.

**What was not.** Auto motion blur measures how far a layer moves in ONE FRAME (`motionAt(t) -
motionAt(t - 1/fps)`), which is correctly fps-aware, and then compares it against
`AUTO_BLUR_FLOOR = 16`. Sixteen WHAT. Pixels per frame — a unit that sounds frame-rate-neutral and is
the opposite of it:

| | peak motion | floor | frames blurred |
|---|---|---|---|
| 30fps | 29.2 px/frame | 16 | 15 |
| 60fps | 14.6 px/frame | 16, **never reached** | **0** |
| 60fps, fixed | 14.6 px/frame | 8.0 | 33 |

The same physical motion covers half the pixels per frame at 60fps, drops under a floor expressed in
per-frame units, and auto blur stops engaging entirely. `cadence`'s button peel — the fastest move in
the film, the one the blur exists for — would have rendered completely unblurred, and nothing would
have said a word. Rendering at 60 for smoothness threw away the thing that makes fast motion read.

**Fix.** The floor is now `AUTO_BLUR_FLOOR_PER_SEC = 480`, divided by the frame rate at use. 33 frames
at 60fps is the same half-second of wall clock as 15 at 30, so the rule now means the same thing at any
frame rate instead of accidentally meaning "twice as strict at 60".

**Lesson, and it is the third instance this session.** A constant whose NAME omits its unit invites
exactly this: `AUTO_BLUR_FLOOR = 16` reads as a property of motion and is a property of a frame rate.
The same shape as `x: leg.x ?? 0` carrying forward on one axis of three (#197), and `L.glideTime || 0.1`
treating zero as absent (#193). Units and identity values are where this engine's silent bugs live.

**Why no gate catches it.** Every gate runs at 30fps, which is the one rate where the bug is invisible.
A gate that only ever tests the default cannot find a defect in the non-default, and this is the whole
class: `multiPhase` was broken for its entire life because no scene used it, and this was broken for
every 60fps render because nothing renders at 60.

---

## #205 — the 60fps default, and the two gates that would have read it wrong

**The policy.** A final render is 60fps, an iteration render is 30. They are two different jobs: while
authoring you re-render constantly and want the loop short, and 30 halves both capture and encode; what
ships wants the smoothness, and product/UI motion in particular reads noticeably better at 60 (the Arc
reference films are 60). Implemented in `internal/render/render.go` rather than the Makefile, so it is
true for anyone running `./bin/vawe` directly and not only for people who go through `make`. Precedence
is unchanged: an explicit `-fps` wins, then the scene's own `fps`, then the draft split.

This was only safe to automate because #204 landed first. Until the auto-blur floor was expressed per
SECOND, the same scene rendered at 60 silently lost its motion blur entirely — so a "smoother" final
would have been quietly worse than the draft it was signed off from, in a way nobody could have traced.

**What changing the default exposed.** Two gates read the encoded mp4 and assumed 30fps:

- `seam-snap.mjs` had `const fps = 30`, and every use of it converts a TIME into a FRAME NUMBER. On a
  60fps final it would seek to **half the intended timestamp** and inspect frames with no relationship
  to the seam — then report the seam clean, having looked at the wrong side of it. Silent, and worse
  than no check at all, because a green seam-check is the cheapest reassurance in the ladder.
- `flicker-check.mjs` used `i / 30` to label findings, which would have sent whoever read one to the
  wrong second of the film.

Both now read `r_frame_rate` from the file. Verified against the same scene encoded at both rates.

**The pattern, stated once because it has now happened three times in a day.** A constant that encodes
an assumption about the environment rather than about the thing being measured: `AUTO_BLUR_FLOOR = 16`
(px per frame), `const fps = 30`, `i / 30`. Each was correct when there was only one frame rate, and
each became a silent lie the moment there were two. The general rule this repo should hold: **if a
number's meaning depends on a setting, read the setting; do not hard-code the value it usually has.**

## #206 — the engine could move a box and scale a box, but never resize one

**What.** Recreating `refs/arc-zero-chrome.mp4` (a browser whose chrome dissolves while the photo grid
underneath reflows to fill the space it gave up) turned out to be impossible, not hard. The per-layer
motion track interpolates `x, y, scale, rot, opacity, blur` and nothing else, and
`formats/scene/scene.js:412` — `if (L.w != null) el.style.width = L.w + 'px'` — was the ONLY place a
layer's width was ever written, once, at build time. A layer's box was fixed for the film's whole life.

**Root cause.** Never decided; never noticed. Nothing in the vocabulary named the difference between
magnifying a layer (`scale`, which enlarges everything drawn inside it) and resizing the frame its
content lives in (which lets the content re-fit). Only the first existed, so the second read as covered.

**Why it matters more than one reference.** A collapsing sidebar, an expanding card, a reflowing grid,
any FLIP transition: all of them are box changes, and all of them are ordinary product motion design.
An author hitting this had two outs and both are failures the doctrine already bans — scale the layer
(the photographs stretch) or cross-fade two layouts (a slideshow across a cut). The gap did not produce
a bug report, it produced films that quietly did not attempt the move.

**Fix.** `w`/`h` are keyable. `core/sequence.js` gains `resolveBoxes()` and `motionAt` returns `w`/`h`.

The contract is the whole design, and it is where #195 nearly repeated. Every other keyed property has
a constant identity (an omitted `x` means 0, and 0 means "where it was authored"). A WIDTH has no such
constant: identity for `w` is the layer's own `w`, which a pure evaluator cannot know. Left inside
`motionAt`, an omitted `w` could only mean "hold the neighbour" — a second, different interpretation
rule, in the exact file where a second rule already cost a day. So `resolveBoxes()` fills every key on
a box-animating track from the layer, ONCE, with the layer in hand, and `motionAt` keeps one rule: both
endpoints state the value or neither does. A track that never mentions `w` is untouched.

Applied on EVERY frame, not only inside the layer's window. The transform can live inside the window
because `driveClips` rewrites it from scratch each frame; width is a layout property nothing else
touches, so a value left behind by a later frame would survive a seek backwards and a warm render would
disagree with a cold one. Verified: `probe-purity scene formats/scene/zerochrome.json` clean.

**Two ways it can silently do nothing, both answered at validate rather than at render:**
- a key sets `w` on a layer with no base `w` — no box to animate from (the engine throws; the gate says
  it first, before a render is spent).
- an `image` resized without cover-fit: `core/layers/image.js` only makes the `<img>` fill its wrapper
  when the layer opted in via `radius` or `ken`. Otherwise the photograph STRETCHES with the box. It
  renders, it just renders wrong, which is the silent-substitution class this repo hates most.

**Gate gaps the feature exposed — three gates were confidently wrong about a film they passed.**
- `linear-motion` flagged 27 flat moves. All 27 were HOLD keys: two identical keyframes with `linear`
  between them, written that way precisely so nothing drifts across the pause. The rule was a blind
  recursive walk for `ease:"linear"` that never asked whether the key changes anything. Fixed in
  `scripts/author/motion-director.mjs`: a motion-track key counts only if it differs from its
  predecessor. Telling an author to ease a hold would put a drift into a frame meant to be locked.
- `boxOf` (`scripts/gates/scene-timing.mjs`) read the authored resting size, so every gate downstream
  called each tile of a reflowing grid "a mark, not a subject" while it filled a third of the frame.
  Now takes the LARGEST box the track ever states, because every question downstream (safe area,
  overlap, is it the subject) is a worst-case question.
- `direction-floor` still cannot see a box track at all: it reported `front-loaded`, "the back half is
  frozen", about a half containing the film's second-largest motion, and `plain-slideshow` needed a
  waiver for a film with no cuts and one continuous object — the exact thing the doctrine asks for.
  NOT fixed, waived with that reason written down. The floor counts presets and cuts; a film whose
  motion is entirely keyed is invisible to it. That is the next gate to fix, and it is a real one.

**Also caught, and it is the older lesson.** The first cut picked the easing by reasoning about the
measured shape ("short ramp, long decay, that is `settle`") and was visibly wrong: it spent the whole
0.35s budget in the first 40% and then held still. `make measure refs/arc-zero-chrome.mp4 0.467 0.817`
fits the curve against every easing the engine has and answers `brake` (residual 0.032). The tool
existed, `docs/CRAFT/RECREATION.md` step 1 says to run it, and reasoning about the numbers felt enough.
It was not. **Fit the curve; do not name it.**

## #207 — depth was a number, not a track, so nothing could pass behind anything

**What.** Studying a reference (a ribbon sweeping around a photograph, in front on the near side of its
arc and behind on the far side) found the same shape as #206 one property over. `track` is the z-order,
`core/clips.js:83` writes `zIndex` from it on every frame, and it was read from a `data-track` attribute
stamped once at build. A layer could be entirely in front of another or entirely behind it, forever.

**Why it matters.** Occlusion crossing mid-shot is what makes a flat composite read as space. Without
it the only ways to fake the shot are to cut on the crossing (which the reference does not do, and
which throws away the continuity) or to draw two copies and cross-fade them.

**Fix.** `track` is keyable, on the same contract as `w`/`h` (#206) — `resolveKeyedProps` fills a keyed
property from the layer once, up front, so `motionAt` keeps ONE interpretation rule. `resolveBoxes` was
renamed to `resolveKeyedProps` since it no longer only does boxes; `LAYER_OWNED` names the three.

One difference, and it is the reason to write the fill per-property rather than generically: `track`
ALWAYS has an identity, because scene.js already defaults a layer's z-order to its index in the array.
So keying depth on a layer that never declared `track` is ordinary and fills from the index, whereas
keying `w` on a layer with no `w` has nothing to animate from and throws. Applied rounded, because
z-index is an integer, and after driveClips, which rewrites zIndex from the static attribute on every frame.

**The test was wrong before the feature was.** The first proof render put the ring at radius 390 around
a 620x400 photo, so the two shapes barely grazed at the corners and there was nothing to occlude. Both
frames looked identical and the feature looked broken. Tightening the ring to radius 300 — so it
genuinely passes through the photo's area — showed the crossing immediately. A test that cannot fail
tells you nothing when it passes and lies to you when it does not.

**Found on the way, and it is the workaround-is-a-bug-report class.** `core/layers/svg.js` set
`stroke-width` ONLY inside `if (L.draw)`, so a stroked path that was not also drawing itself on took
the browser default of 1px silently. The only way to get a thick static stroke was `draw:{weight:30}`
for the side effect — structurally identical to the `ken:{from:1,to:1}`-for-a-border-radius hack
CLAUDE.md names. `strokeWidth` now works on any stroked path; `draw.weight` still wins when both are
set, so no existing scene moves. Blast radius: zero scenes used either.

## #208 — a documented layer feature that never once worked, and I claimed the gap it left was a wall

**What.** I wrote in #206 that reflowing a grid was "impossible, not hard". Challenged on it, I checked
instead of arguing, and the truth is worse than the claim. `gsap:{from,to,dur,ease}` WAS a documented
layer prop, the schema called it "Deterministic (seeked per frame)", and it accepted `width` happily.
So a path existed. It just produced garbage.

Sampled every 0.1s, a layer tweening `x` from 0 to 1500 over 1.6s rendered:

    t=0.00 x=100   t=0.10..0.90 x=-4 (off frame)   t=1.00 x=100
    t=1.10 x=1556  t=1.20 x=100   t=1.30 x=1592    t=1.40 x=100   t=1.50 x=1600

Not an interpolation. Flicker between unrelated poses, alternating frame to frame, with no error.

**Why nobody knew.** Zero scenes in the library use it. It is the SILENT verdict `rules-audit.mjs`
gives a rule that never fires: perfect prevention and dead weight look identical from outside, and here
it was the second. A feature can rot exactly like a rule, and nothing in the ladder was watching.

**Fix: removed, not repaired.** `motion` does everything it claimed and strictly more — a real
keyframe track with holds, reversals and per-key easing, evaluated by a pure function of t. Keeping a
second, weaker, broken way to do the same thing is worse than having one. Rejected at validate with a
message that translates the author's GSAP property names into ours (`width`→`w`, `rotation`→`rot`),
because a suggestion telling them to write `"width"` inside a motion key is the next silent no-op.

**The claim, corrected.** Not "impossible". The accurate statement about #206 is: **there was no way to
EXPRESS a reflow as motion, and the one escape hatch that accepted it rendered it wrong in silence.**
That is a worse defect than an honest gap, and stating it as a wall made the engine sound better than
it was. The `{html}` layer driven by `var(--t)` genuinely could have done it, at the cost of leaving
the layer system entirely — no cover-fit, no geometry for the audit, invisible to every gate.

**The lesson is about how I checked.** I inferred "no primitive" from reading `motionAt` and stated it
as "no way". Reading the evaluator proves what the evaluator does, never what the engine accepts. The
question "can a user get this today?" is answered by trying it, and trying it took one render.

## #209 — four lossless compressions per frame, for a lossy file

**What.** A 14.6s film took 434s to render and nobody knew where the time went. Profiling it
(`VAWE_PROFILE=1`, added for this) gave the answer in one table:

    renderFrame (paint)      1.3 ms/frame   0.1%
    rAF settle wait         17.7 ms/frame   0.8%
    screenshot + transfer  1103.8 ms/frame  52.5%
    downsample (Go)         978.8 ms/frame  46.6%
    write to disk            0.7 ms/frame   0.0%

**Drawing the frame was 0.1% of the render. Getting it out was 99%.** And both dominant phases were the
same work: Chrome PNG-encoded 8.3 megapixels, Go PNG-decoded them, box-averaged, PNG-encoded again, and
ffmpeg PNG-decoded a fourth time — four lossless compressions per frame, on data whose destination is a
3MB lossy h264.

**Root cause.** Never decided. PNG is the obvious screenshot format and `image/png` is the obvious way
to read one, and each choice was locally reasonable. Nothing measured the pipeline end to end, so the
cost compounded silently across four independent stages.

**Fix.** Capture JPEG q95 (526 → 80 ms/frame at 3840x2160, 6.6x) and hand the supersample resolve to
ffmpeg's `scale=flags=area` — which IS the ss×ss box filter the Go loop implemented, so it is the same
operation rather than an approximation of it. Go now never touches a pixel.

    434s → 45s wall (9.6x) · 1721s → 131s CPU (13x, so much cooler) · 2.6GB → 556MB intermediate

Quality held where it counts, and the temporal test is the one that mattered: on `showcase-flight`
(eight text layers over a full-frame SVG) shimmer is **1.02x** the old pipeline, where dropping
supersampling to ss=1 — the obvious "just make it faster" move — measured **1.60x**. So the new
pipeline is not a speed-for-quality trade; it is strictly better than the trade it replaces.

**Gated on a determinism test, before any of it was written.** Chrome's JPEG output is byte-identical
across repeats AND across separate browser instances. Had it not been, `renderFrame(n)` purity and
dedup's anchor byte-equality would both have needed weakening, and that would have been a reason not to
do this rather than a detail to paper over.

**Alpha stays PNG,** because JPEG has no alpha channel and the transparent export exists for the alpha
channel. `CaptureExt()` is exported so the encoder asks the capturer what it produced instead of
re-deriving the condition — two copies that can disagree is how the encoder ends up looking for
`%05d.png` in a directory of `.jpg` at the last step of a ten-minute render.

**The lesson is about the three wrong guesses that preceded the profiler.** I blamed PNG-vs-JPEG
(partly right, unmeasured), then the `At()` interface call in the downsample loop (right that it was
hot, wrong that it dominated — it was 14%), and I "verified" that second fix with a byte-identical mp4
hash. The hash was identical because the code **never ran**: the fast path guarded on `*image.NRGBA`
and Chrome produces `*image.RGBA`. An identical output proved non-execution and I read it as proof of
correctness. The profile now prints a fast/slow path count so that cannot happen silently again.
**Profile before optimising, and make every fix able to report that it fired.**

## #210 — an html layer's `h` was accepted, set, and then ignored by everything inside it

**What.** `{"type":"html","h":580}` rendered a 310px card. The layer element really was 580 tall, so
nothing looked broken from the outside; the content inside it was 310. Twenty-one scenes in this library
declare `h` on an html layer and every one of them had been quietly getting content height instead.

**Root cause.** `core/layers/html.js` set `width` from `L.w` and never set `height` from `L.h`, and the
`.hs-html` wrapper it injects between the layer and the author's markup had no height of its own. So
hand-authored CSS saying `height:100%` resolved against an auto-height parent, which in CSS computes to
`auto`, and collapsed to its own content height. Both halves were needed; fixing either alone does
nothing.

**Fix.** `build()` now sets `height` from `L.h` alongside `width`, and the wrapper carries
`height:100%`. That is deliberately a no-op when the layer declares no height (100% of auto is auto), so
it changes the render only for layers that DID state a box, which is exactly the broken case. `make
probe` clean, `scene-snap` identical.

**Class.** Silent substitution, the one this file keeps coming back to. Documented input accepted and
discarded. The gate that would have caught it does not exist: nothing compares what a layer asked its box
to be against what its contents actually occupy.

## #211 — the layout audit measured a rotating layer's empty corners, not the ink it draws

**What.** A ribbon layer, an arc inscribed in a square box, failed the safe-zone audit at every rotation.
Nothing visible ever came near the frame edge. Satisfying the gate meant shrinking the ring by 40%, past
the hero it was supposed to orbit and across the wordmark, so the film got visibly worse to make a
measurement happy.

**Root cause, in three parts, and only fixing all three worked.**
1. `inkRect()` returned `null` for anything containing an `<svg>`, on the stated assumption that
   "replaced content: the element box IS the ink". True of an `<img>`; false of an inline `<svg>`, whose
   geometry is usually inscribed in the box. Empty corners still rotate: a 1000px square turned 45
   degrees sweeps 1414px while nothing visible moves.
2. The safe check used ink HORIZONTALLY and the border box VERTICALLY. That policy is justified entirely
   by text metrics (vertical text ink includes half-leading, which is not glyphs). A path's vertical
   extent is real ink, so for geometry the justification evaporates and the box discarded half the fix.
3. `getBBox()`+`getScreenCTM()` and `getBoundingClientRect()` both return the AABB of the shape's
   bounding RECTANGLE once rotated, which over-bounds a curve badly: a semicircle whose ink stopped 255px
   from the top measured 139px ABOVE it, a 394px error. Only sampling the outline
   (`getPointAtLength`, fixed count, deterministic) gives the real bound.

**Fix.** `verify/audit.mjs` samples SVG outlines for a true rotated bound, uses geometry ink on both
axes, and CLAMPS the result to the border box. The clamp is not optional: unclamped, an svg whose stroke
spills past its element GREW the measured rect and turned `showcase-cuts` from 0 hard failures into 7.
Verified across the whole scene library: exactly two scenes change, both FAIL to PASS, both the rotating
ring. Zero regressions.

**Class.** Gate gap, and the expensive kind. A gate that measures the wrong thing does not merely miss
defects, it manufactures them, and the author pays by deforming a good design until the number moves. The
tell was that the only fix available was to make the film worse. When satisfying a gate requires that,
suspect the gate.

## #212 — the script gate called kinetic typography an echo

**What.** A film whose on-screen words ARE the spoken line failed `channels-echo` on 4 of its 5 beats.
The gate was reading a deliberate form as a defect, and the only way to satisfy it was to stop making
that kind of film.

**Root cause.** `channels-echo` assumes the two word channels do different jobs: narration explains, cards
label. That is true of most films here and false of kinetic typography, where the type IS the read and the
craft lives in how the spoken line lands on screen. The rule was applied per beat, so it could not tell a
beat that forgot to say something from a film whose whole form is saying it.

**Fix.** The distinction is frequency, and it is the one a human makes without thinking. ONE beat echoing
its card is a mistake; EVERY beat echoing is a form. `scripts/author/script.mjs` now detects the kinetic
case (>=60% of beats near-identical, >=3 beats) and switches the question instead of dropping it: when the
type carries the read, the picture is the only other channel the film has, so it checks
`picture-restates-words` — the beat's picture may not simply be a drawing of its own sentence. Verified
both ways: one echoing beat among distinct ones still fails; a wholly kinetic film passes and is asked the
harder question. `gate-mutation` 119/119.

**Class.** Gate gap, same shape as #211. The tell was identical: satisfying the gate required abandoning
something known to be good. A rule that is right for the common case and silent about the existence of
others will punish exactly the films that are trying something.

## #213 — a rect's `fill` was accepted and thrown away, because the unknown-prop check is type-agnostic

**What.** `{"type":"rect","fill":"#d33"}` rendered white. The colour was simply discarded, and a pushpin
meant to be red came out as a white square.

**Root cause, two layers deep.** `core/layers/rect.js` reads `L.bg`; nothing reads `L.fill`. That alone
would be caught, because `core/validate.mjs` DOES have an unknown-prop check with did-you-mean. It did not
fire, because that check tests keys against ONE flat list of every layer prop in the schema rather than
against the props of THIS layer's type. `fill` is real on `svg`, so it counts as known everywhere, and a
prop that is meaningful on one type passes silently on a type that ignores it.

**Fix.** `rect` now honours `fill` as an alias for `bg`. Where an input is unambiguous, making it work
beats adding an error: `fill` is the obvious name for the colour inside a shape and it is the real name on
`svg`, so authors will keep reaching for it. `scene-snap` identical, `make probe` clean.

**Still open, and worth naming.** The type-agnostic unknown-prop check remains. Every prop that is valid on
some layer type is silently accepted on all of them, so this class can recur with any of them
(`stroke` on a rect, `radius` on a text, `ken` on an svg). The fix is a per-type known-list, which needs
the schema to carry per-type props; it was not attempted here because it would touch every layer type at
the tail of a long session.

## #214 — the layout audit called a label on a card a collision

**What.** A hand-authored card with three rows placed on it failed `overlap` on every frame. The rows were
exactly where they were meant to be.

**Root cause.** The overlap check compares TEXT inks, and its own comment states the rule it means to
enforce: "two TEXT boxes overlapping is a defect; text over a SHAPE is design (a chip on a rect, a label on
a card)". But `html` layers are classed `hs-text`, so a card counted as a text box the size of the whole
card and collided with every label deliberately placed on it. The first attempt to exclude painted
surfaces did not fire either, because an `html` layer renders as
`.hs-layer > .hs-html > <the author's card>` and the background lives on the innermost div, so testing the
layer element returned transparent every time.

**Fix.** `verify/audit.mjs` now treats a layer as a SURFACE when it, or any descendant filling at least 85%
of it, paints a background, and excludes surfaces from the text-overlap set. It also stops counting
`<style>` and `<script>` source as an element's text, which is what made a stylesheet-carrying card look
like a text layer in the first place.

**Verified per the doctrine.** Diffed across the whole library: five scenes change, every one of them
DOWN by exactly one finding, none up. Spot-checked `ab2-skill-tenor` independently: the removed finding was
a 680x500 painted card against the `$349k` label on it, overlap 592x61. A label on a card.

**Class.** Gate gap. Note the shape it shares with #211 and #212: in all three the rule was right and the
MEASUREMENT did not match it, and in all three the tell was that satisfying the gate meant making the film
worse. Three of the last four framework findings are the gate measuring the wrong unit.

## #215 — a single `--aspect` silently overwrote the render it was not asked to replace

**What.** `./bin/vawe scene.json --aspect 9:16` on a 16:9 scene wrote `out/<name>.mp4` — the same
path the scene's own-aspect render uses. The 16:9 film was replaced by a 9:16 one under an identical
filename, with a success line that looked completely normal. The only way to notice was to open it.

**Root cause.** `cmd/render/main.go` gated the aspect tag on `len(aspects) > 1`. Rendering several
aspects at once obviously needs distinct names, so that case was handled; rendering exactly one
non-native aspect looked like "just a render" and inherited the plain name. The flag that changes the
shape of the output did not change the name of the output.

**Fix.** Tag whenever `--aspect` is passed at all. An explicit `--out` still wins, because naming the
file is the author's call.

**Class.** Silent substitution, and the most expensive variety: the destructive kind. Elsewhere this
class discards input (#210 an html layer's `h`, #213 a rect's `fill`). Here it discarded a
previously-rendered deliverable. Worth stating as a rule: **a flag that changes what the output IS
must change what the output is CALLED.**

## #216 — the audit read a stylesheet as glyphs and called it clipped text

**What.** A frosted glass pane failed `clipped-text` with "mask is 287px too short for the glyphs" and a
reported content of `.g{position:rela`. Nothing was clipped. Nothing was even text.

**Root cause.** A hand-authored `html` layer carries its CSS inline, and the check read `el.textContent`,
which includes `<style>` source. The layer legitimately sets `overflow:hidden` (a rounded pane must clip
its own corners), so the scrollHeight of the invisible stylesheet text became a clipping report.

**Fix.** The check now uses the shared `inkText()` helper, which walks text nodes and rejects anything
inside `style` or `script`.

**Class, and the part worth remembering.** This is #214 again, in a second consumer. That entry
introduced `inkText()` for the OVERLAP check and left every other consumer of `textContent` alone,
so the same stylesheet went on being read as content one check further down. A fix applied at one call
site instead of at the rule is half a fix, and the half that is missing looks identical to the half that
is done until something trips it. Library diff after the change: zero scenes change.

## #217 — the same stylesheet-as-text bug, in a third and fourth consumer

**What.** A frosted pane failed the SAFE-ZONE check, reported against the content
`/* Near-opaque on `, which is a fragment of its own CSS comment.

**Root cause.** `carriesContent()` decides whether a layer earns a safe check at all, and it walked text
nodes with no filter, so a hand-authored `html` layer's inline stylesheet counted as content. Two other
consumers had it too: `tiny-text` (a `<style>` block has a font-size, so it read as unreadably small
text) and the image probe's emptiness test.

**Fix.** All of them read the shared `inkText()` now.

**Class, and why this entry exists at all.** This is the THIRD time. #214 found it in the overlap check
and fixed that call site. #216 found it in clipped-text, fixed that call site, and its own writeup said
"a fix applied at one call site instead of at the rule is half a fix". Then this pass found three more.
The lesson had been written down twice and applied zero times, because writing a rule and obeying it are
different acts, and only the second one is work.

CLAUDE.md now carries "fix the rule, not the call site: grep every consumer before you close it", added
in the same session and, notably, added BEFORE this instance was found. The rule was followed here only
because the failure happened to recur immediately. Library diff after the change: zero scenes change.

## #218 — a modifier slot was nearly added to a prop that was already taken

**What.** The plan in `docs/audits/NEXT.md` named the new per-layer modifier slot `fx`, with the example
`{"type":"image","fx":[{"occlude":"cardId"},{"shadow":"key"}]}`. `L.fx` was already the named-GSAP-effect
slot, and had been since `core/gsap-effects.js` shipped.

**Root cause.** The name was chosen from what the feature IS rather than from what the prop space already
holds, and nothing in the plan step reads the prop space. Shipping it would have put two dispatch tables in
one array, told apart by whether an object carries a `name` key, and would have silently changed two live
behaviours: `formats/scene/scene.js:576` gates kinetic-unit animation on `!L.fx`, so a layer carrying a
modifier would have lost its split-text reveal; and `applyGsapHooks` (`formats/scene/scene.js:292`) warns
"unknown GSAP effect" for any item the effect registry does not know, so every modifier would have printed
a warning about an effect nobody asked for. `L.fxOut` is the exit half of the same slot and would have had
the same problem one prop over. The example was wrong a second way: `{"shadow":"key"}` implies named
lights, and the scene has ONE light (`lighting: {x, y, intensity?}`).

**Fix.** The slot is `modifiers` (`core/fx/index.js:13-18` states why, next to the registry it names).
`NEXT.md` items 2 and 3 now carry what shipped instead of what was planned.

**Which gate catches it.** None catches a name collision directly, and none can: two meanings in one prop
is a design fact, not a value. What is now gated is the half that CAN be measured — `schema-drift` compares
the schema's modifier keys against `FX_TYPES` in both directions, so a modifier the schema does not know,
and a schema key no modifier implements, are both a failure.

**Class.** Caught by reading the code before writing any, which is the only thing that catches this class.
Worth stating plainly: a plan written in one session and executed in another names props from memory, and
memory does not hold a 161-prop namespace.

## #219 — the scene's light was going to be handed to every layer unvalidated

**What.** `scene.light` is read by `core/fx/shadow.js` to aim every shadow. The obvious construction,
`Object.freeze({ ...data.lighting })`, accepts `{"x": 540, "Y": 120}` and yields `{x: 540, y: undefined}`.

**Root cause.** A spread copies whatever is there. Every shadow in the film would then have pointed away
from `(540, NaN)`, which resolves to a single fixed direction for every layer — the exact look the feature
exists to replace, and one that reads as a deliberate style rather than a typo. Nothing downstream can tell
the difference, because a shadow has no correct value to be compared against.

**Fix.** `formats/scene/scene.js:464-481` validates `lighting` before freezing it: object shape, the key set
`x`/`y`/`intensity`, finite numbers, non-negative intensity, each with a message naming the canvas size.
The schema carries the same `fields`, so a mistyped key fails validation before the render starts and fails
again at build if it arrives some other way.

**Which gate catches it.** `validate` (from the schema) and the runtime check. Both, on purpose: the schema
is what an author's editor sees, the runtime check is what an MCP caller hits.

**Class.** Silent substitution, caught before shipping rather than after. The tell is the one this file
keeps recording: an input where every value is plausible and no value is verifiable.

## #220 — the 3D spike proved a construction and said nothing about how the engine is assembled

**What.** Phase 0 concluded "the camera must sit on the layers' DIRECT parent, because any intervening
element flattens the 3D context". That is correct, and it is not enough to write the modifier: in this
engine a layer has THREE possible direct parents, and the spike has one.

**Root cause.** `scripts/dev/spike-3d.mjs` builds a stage and puts boxes in it. Case H (`wrapPlain`,
line 76) is what identified the real rule, and it identified it in a two-element tree. The engine puts a
layer under `#cam`, or under the per-beat `.hs-beat` wrapper that exists only in a `sceneUnits` scene
(`formats/scene/scene.js:236`), or under the group element when it is a group child. A camera written on
`#cam` alone is therefore flattened for every layer in any scene that uses scene units, which is most of
them, and flattened means the tilt still rotates and simply stops being projected — no error, a visibly
flatter frame.

**Fix.** `core/fx/tilt.js` writes the camera on `el.parentNode`, whatever that turns out to be, at frame
time (see #221 for why not at build).

**Which gate catches it.** None, and that is worth saying: a flattened 3D context renders, so every gate
stays green. It was found by asking what `parentNode` is in each of the engine's assembly paths.

**Class, and the general lesson.** A spike proves a construction in isolation. It says nothing about how
many elements the real engine puts between the two the spike had, and that count is usually the whole
problem. Read the spike's conclusion as "this works when X is the parent", never as "X is the parent".

## #221 — what a modifier may not assume at build time: no parent, and no wrapper

**What.** Two constraints, one cause, found while writing the first modifiers. A modifier's `build()`
cannot touch its parent, and it cannot insert a wrapper element around what it modifies.

**Root cause.** Both follow from WHEN `buildFx` runs. `core/layers/index.js:67` runs the primitive's
`build()` and then `buildFx`, and every caller appends afterwards: a top-level layer is built at
`formats/scene/scene.js:419` and appended at `:425`, and `addGroupChild` calls `buildLeaf`
(`core/layers/util.js:243`) and appends the leaf at `:251`. So `el.parentNode` is `null` inside every
modifier's `build()`, for top-level layers and group children alike. Anything parent-facing has to run in
`frame()`, where the tree is complete.
A wrapper fails for the neighbouring reason: `buildFx` runs BEFORE `splitText`, `ransomStyle`, `circleText`
and `decorate` (`formats/scene/scene.js:427-439`), all of which rewrite or append children. A
modifier-inserted wrapper would be split into per-character spans, re-wrapped, or simply bypassed by the
overlay divs `decorate` appends, depending on which of the four the layer happens to use.

**Fix.** Stated in the contract at `core/fx/index.js:43-58` and obeyed by all four modifiers. `tilt` is the
case that would have needed a wrapper and does not, and the reason is precise: CSS `rotate` is a separate
property from `transform` (Transforms Level 2), the engine writes it nowhere, and the used transform is
`translate · rotate · scale · transform`. So the tilt composes into the same matrix the tracks build
without ever being read back by them. Measured, not assumed: the projected corners land on those of
`rotateX(a) rotateY(b) rotateZ(c)` to 0.0px.

**Which gate catches it.** `make probe` catches the consequence of getting the second half wrong — a
modifier whose element is rebuilt by a later pass produces a frame that depends on what ran before it, and
probe compares the DOM across render orders. Nothing catches the first half; `parentNode` is simply null
and a modifier reading it throws on the spot, which is the acceptable outcome.

**Class.** Not a bug that shipped. It is the shape of this engine's build phase, written down because it is
invisible from inside a modifier file and both halves are one-line mistakes.

## #222 — two tilted siblings under one parent resolved last-writer-wins, and one silently lost its lens

**What.** `perspective` and `perspective-origin` are written on the layers' shared parent, so they are the
scene's camera, not the layer's. Two siblings that each ask for a different `dist` or `origin` are two
cameras on one element. CSS resolves that by taking whichever was written last, and the other layer is
projected through a lens it did not ask for, with nothing said.

**Root cause.** The property is per-parent and the spec that names it is per-layer, so the conflict is
structurally invisible from the place it is authored. Every value involved is valid on its own.

**Fix.** `core/fx/tilt.js:130-137` makes it a hard error: a layer writing a camera onto a parent that
already carries a different one throws, naming both values and the two ways out (agree on one `dist`, or
move one layer into a group of its own, which gives it a parent of its own).

**Which gate catches it.** The throw itself, at frame time, before a single frame is captured — plus
`gate-mutation`, which pins that the error fires.

**Class.** The silent-conflict variant of silent substitution. Elsewhere in this file the engine discards
an input (#210, #213); here CSS picks one of two valid inputs and discards the other. Same result, and
harder to see, because the discarded layer still tilts. It just tilts through the wrong camera.

## #223 — a 404's body was parsed as the scene, and a file nobody opened was blamed for its contents

**What.** Two error messages, both naming the wrong cause, both current until this pass.

```
$ ./bin/vawe scratchpad/x.json --draft     # a real file, outside the served roots
✗ render failed: scene error: SyntaxError: Unexpected token 'o', "not found" is not valid JSON

$ ./bin/vawe /tmp/definitely-not-here.json # a file that does not exist at all
✗ /tmp/definitely-not-here.json has no "module" field — add one … or pass --module
```

The first scene is valid JSON. The second has no fields at all, because it has no bytes.

**Root cause, and it is one rule in two languages.** A failed read was made indistinguishable from a
successful read of unusable content.
· Browser side: `core/boot.js` did `await (await fetch(dataUrl)).json()`. A non-OK response still has a
  body, and `internal/scene/scene.go:87` answers everything outside the served prefix set with the literal
  text `not found`. `res.json()` parsed that text and reported the first character of the refusal as a
  syntax error in the author's file.
· Go side: `moduleOf` returned `""` on a read error, which is the same value it returns for a file that
  parses fine and declares no module. The caller could only see the `""` and complained about the field.
  `videoGrain` had the identical shape one line above it.

**Fix, at the rule.** `core/preload.js` gains `fetchJson(url, what)` and it is now the ONLY place a JSON URL
becomes an object in the engine: it separates "the request failed", "the server refused it" (with the served
roots named) and "the file really is malformed". `core/boot.js` uses it for the scene data and the schema,
and the two remaining unchecked fetches (`preloadThree`'s typeface, `preloadRansomSprites`'s manifest) were
converted too; the six that already tested `r.ok` were left alone. `moduleOf` returns `(string, error)`, and
`cmd/render/main.go` stats the path before any reader touches it, so "no such file" and "not valid JSON" are
their own messages. `internal/scene` exports `Allowed`/`Served`/`ServeAll` and `internal/render` refuses an
unservable scene before it starts a browser, naming the roots and the way out.

**Which gate catches it.** None yet, and the honest reason is that these are error PATHS: no scene library
exercises them, and every gate here measures a render that works. What now stands in for a gate is that the
three outcomes have three different messages, so the next report names its own cause.

**Class, and the shape it shares.** This is #214 → #216 → #217 a fourth time, in a different file pair: one
primitive misread (a non-OK response is not content; a zero value is not an answer), used at several call
sites, fixed at the rule and cleared at every consumer rather than patched where it was noticed.

## #224 — `--alpha` exported a fully opaque overlay, and every downstream flag on that path was wrong too

**What.** `./bin/vawe <scene> --alpha` printed `· alpha`, exited 0, and wrote a file whose alpha channel
was 255 on every pixel of every frame. The same code shipped three more wrong deliverables beside it:
`--alpha --out x.mp4` wrote an mp4 with the channel stripped, `--bg` composited over a background video
that was 100% hidden, and `--watermark` was dropped on both paths. Nothing warned on any of them.

```
$ ./bin/vawe formats/scene/zerochrome.json --draft --alpha
$ ffmpeg -c:v libvpx-vp9 -i out/zerochrome.webm \
    -vf "format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-" -f null -
lavfi.signalstats.YMIN=255     # one unique value across all 90 frames
```

**Root cause, four of them, each hiding the next.**
· `bg` is a required field with `minItems: 1`, so every valid scene paints a backdrop, and
  `formats/scene/scene.js` paints it onto a `<canvas>`. The only alpha handling in the engine was
  `core/tokens.css:44`, a `background: transparent` rule. A CSS background cannot clear canvas pixels,
  and `grep -n alpha formats/scene/scene.js` returned nothing: the one module that paints the backdrop
  never read the flag.
· `cmd/render/main.go` computed `.webm` for the alpha path and then discarded it whenever `--out` was
  given. MP4 has nowhere to put VP9 alpha, so ffmpeg dropped the plane and said nothing.
· `encode.Composite` decoded the overlay with ffmpeg's default vp9 decoder, which cannot read the alpha
  side data WebM stores the plane in and hands back `yuv420p` with no complaint. This one was NOT in the
  audit and only appeared once the first fix landed: the composite went from "background hidden" to
  "background black", which reads as a file that failed to load rather than a channel that was dropped.
· `render.Render` returns inside `if transparent` before `o.Watermark` is ever read, and neither
  `encode.VideoAlpha` nor `encode.Composite` took a watermark argument.

**Fix.** `formats/scene/scene.js` reads the `alpha` class `core/boot.js` already sets and suppresses both
backdrops, the canvas and the hand-authored `bgHtml`. `cmd/render/main.go` refuses an `--out` the channel
cannot survive, naming the `.webm` to use instead. `encode.Composite` forces `-c:v libvpx-vp9` on the
overlay input. `VideoAlpha` and `Composite` take a watermark and overlay it, the alpha export into its own
transparent frame and the composite onto the finished picture.

**And where it cannot be fixed, it refuses.** Suppressing the backdrop is not a promise of transparency:
a scene can cover its own canvas with a full-bleed rect, image or paint field, and the failure looks
exactly like success. `scene.TransparentPixels` samples the captured frames before anything is encoded,
and `render.Render` names the flag it cannot honour and stops. It fails only when EVERY sampled frame is
fully opaque, which is the unambiguously broken case and the one this bug produced; a scene that covers
the frame for part of its run is a design, not a defect.

**Which gate catches it.** The refusal itself, on the frames, before the encode. There is no library
scene using either flag, so nothing else would.

**Class.** Silent substitution, four deep, and the reason it survived is in the audit's own note about
itself: three rounds read code and none compared rendered pixels against the scene that produced them.
Every stage of this reported success. The channel was only ever visible in `alphaextract`.

## #225 — the watermark was drawn at twice the frame size and clipped, on every render that was not a draft

**What.** `encode.Video` built `[1:v][0:v]scale2ref[wm][base]`, sizing the sheet against `[0:v]`, the RAW
captured frame. Every non-draft render supersamples 2x, so the sheet was built at 2160x3840, the frame was
scaled down under it, and `overlay=0:0` kept the sheet's top-left quarter. Draft looked correct by
accident: `ss=1` inserts no scale, so the raw frame IS the final frame there.

**Root cause.** The chain asserted an order it did not have. The comment above it said the watermark
"applies at final size"; the scale was written into the branch AFTER the reference was taken.

**Fix.** `internal/encode/encode.go` scales the base first and sizes the sheet against the result. The
chain is now built by `watermarkChain`, split out so its shape can be asserted without an ffmpeg run.

**Which gate catches it.** `internal/encode/encode_test.go`, the first test in the package. It pins that
the scale precedes `scale2ref` and that the reference is the scaled frame.

**Class.** Not silent substitution: the engine did what it was told, and what it was told was wrong. The
reason it lasted is the same one as #224 though. No gate renders a watermarked frame, `go test ./...` had
no test in `encode`, `render` or `queue`, and the only instrument that could see it was a human opening
the file. The MCP server ships free previews down exactly this path.

## #226 — a nested group's modifiers were built by nobody, and only half of each one ran

**What.** `{"type":"group", "modifiers":[…]}` nested inside another group ran its modifiers' `frame()`
and never their `build()`. `mixBlend`, which is build-only, therefore did nothing at all: accepted,
validated, and silently scoped to nothing. `tilt` half-worked, because its validation lives in `build()`
and its writes live in `frame()`, so a malformed spec was caught one pass later than it should be.

**Root cause.** `buildFx` was reachable through exactly one door, `kit.buildLeaf`, and
`core/layers/util.js` calls that only in the `!isGroup` branch — a nested group is laid out by
`addGroupChild` itself and never goes through a primitive's builder. The per-frame half had no such
gate: `scene.js` drives every entry in `extra`, and nested groups are in it. So the two halves of the
same registry disagreed about whether a nested group is a layer, and the disagreement was invisible
because the half that ran is the half that draws.

**Fix.** `core/layers/index.js:74` injects `kit.buildFx` beside `kit.buildLeaf`, and
`core/layers/util.js:243` calls it for the group branch. If the injection is ever missing, a nested group
carrying `modifiers` throws instead of skipping — the one outcome this must never have again.

**Which gate catches it.** Nothing did, and that is the point: `schema-drift` proves the schema and the
registry agree on the modifier VOCABULARY and cannot see which code paths dispatch it. The throw is now
the instrument. `conformance` is the gate shaped to catch this class (it already compares top-level and
group-child construction prop by prop) and extending it to modifiers is the durable fix.

**Class.** Silent non-application, the worst shape in this file, made worse by being half-silent: the
frame half ran, so the layer looked touched.

## #227 — "a group child has no box" was a conclusion drawn from the authored x/y

**What.** `scene.boxOf` returned null for every group child, so `occlude` and `shadow` refused on one and
said so in three files' worth of comments. The stated reason — a child's x/y are relative to a flex or
grid box only layout knows — is true about the AUTHORED coordinates and says nothing about the child,
which is laid out and therefore measurable.

**Root cause.** The measurement was assumed to be a per-frame DOM read, which the frame loop may not do
(a neighbour's rect is whatever the previous frame left there). It is not: a child's offset INSIDE its
group does not depend on `t`. Only the group moves. So one measurement at build plus the group's own
per-frame box is a complete answer, arrived at exactly the way top-level boxes already are.

**Fix.** `formats/scene/scene.js` measures each identified child once at build as a delta from its
top-level ancestor's rect (rects, not an `offsetLeft` chain — `offsetParent` skips a statically
positioned nested group and the chain silently reports the offset from two levels up), then composes it
with the ancestor's per-frame box, scaling and rotating about the group's centre. `boxOf` now answers for
any layer with an id at any depth, `specOf`/`ids` cover them, and the refusals in `occlude`/`shadow` are
gone. ONE case keeps the null and names itself: a group whose motion track keys `w`/`h` reflows its
children, so the build-time offsets are stale. `mixBlend` is refused on a child for an unrelated and
unfixable reason (CSS blends against the nearest stacking context, and every timed element carries a
transform, so a group is always one).

**Which gate catches it.** `make probe` is the one that matters — it would fail immediately if the box
were measured inside the loop instead of at build. `make snap-all` proves the change is inert on the
library: 51 identical, 30 changed, 3 quarantined, unchanged from before.

**Class.** Not silent substitution. A correct diagnosis with the wrong conclusion attached, copied into
four files as settled fact, where each copy made the next one look better established.

## #228 — the per-frame pipeline's order was the order of nine statements, and three of them were load-bearing in ways nothing said

**What.** Everything a layer does on a frame lived as statements in `updateLayer`, one ~140-line
function in `formats/scene/scene.js`. The composition order — which job may overwrite whose transform,
which must compose onto it — was the reading order of that function and nothing else. Adding any
cross-cutting per-frame behaviour meant editing the right paragraph of a 940-line file, with only a
neighbouring comment to say which paragraph was right.

**Root cause.** The repo already had the pattern that fixes this and had applied it twice (`core/layers/`,
`core/fx/`), but both are registries of things an AUTHOR names. The pipeline is a registry of things the
ENGINE always runs, and nobody had noticed that is the same shape.

**Fix.** `core/tracks/` — one file per job exporting `slot` and `frame()`, with the running order in a
single `SLOTS` list resolved ONCE at module load into a flat array of functions. A slot holds exactly
one track; a duplicate, an unknown slot name and an unclaimed slot are all hard errors at load. Named
slots rather than integer priorities (which invite `order: 45` and explain nothing) and rather than
before/after edges (which only give a PARTIAL order, so two unrelated tracks would still run in
whatever sequence the sort emitted — the same implicit ordering, harder to read).

**What extracting it exposed.** Three dependencies that existed only as adjacency:

1. **The primitive's own `frame()` runs in the MIDDLE of the pipeline, and both sides matter.** It was
   the fourth of nine statements, described in its comment as a different kind of thing from its
   neighbours. `core/layers/cursor.js` writes `el.style.transform` outright, so it is entitled to
   discard the cut kit's transform, which it can only do by running after it; and the `spin`, `react`
   and `transform` tracks compose onto whatever transform is there, which is the only reason a cursor's
   path reaches the screen at all. Move that one call either way and both break, silently.
2. **`react` and `transform` COMPOUND on opacity and COLLIDE on blur.** Both write
   `baseOpacity(el) * value`, so a layer with both gets the product — correct, and unwritten. But the
   motion track strips every `blur()` off `filter` and rewrites it from its own numbers, so on any
   layer with a motion track `react: { prop: "blur" }` is computed and then thrown away. Preserved
   exactly (this is a refactor), and now recorded in `core/tracks/react.js` as a defect with a name.
3. **`box` is the one track that deliberately runs OUTSIDE the layer's window.** Width is a layout
   property nothing else rewrites, so a value left by a later frame survives a seek backwards and a
   warm render disagrees with a cold one. Every other track checks the clock. `docs/animation.html`
   said the opposite — "outside its window, nothing else runs" — as its first pipeline step.

**Which gate catches it.** `make probe` is the one that matters and would fail immediately if a track
kept state between frames. `make snap-all` proves the extraction is inert on the library: 51 identical,
30 changed, 3 quarantined, scene for scene unchanged from before. Render time across six runs each is
5.20s before, 5.16s after — the order is resolved at load and the per-frame cost is one indexed array
read, which is what a statement list cost too.

**Class.** Not a wrong pixel. Knowledge that existed only as the physical arrangement of code, where
any edit that looked harmless could destroy it without a gate having anything to compare against.

## #229 — schema-drift had been reading a 20-line shell and calling it the engine

**What.** `scripts/gates/schema-drift.mjs` asserts every layer prop the engine reads is defined in
`schema.json`. It scanned `formats/scene/scene.html` plus `core/layers/*.js`. `scene.html` is a 20-line
document that imports `scene.js`, and it contains ZERO `L.<prop>` reads. So every prop read only by the
orchestrator — `cut`, `vars`, `varsDur`, `varsEase`, `react`, `motionBlur`, `borderTrail`, `circle`,
`becomes`, `panWith` among them — was outside the gate for as long as the split has existed, and the
gate printed a green line with a count each time.

**Root cause.** A hand-written list of file paths, correct on the day it was written, describing an
arrangement of the code rather than a property of it. Exactly what this gate exists to stop the SCHEMA
doing to the registries.

**Found by.** The track extraction (#228). Moving thirty props out of `scene.js` and into
`core/tracks/*.js` should have changed the count and did not, which is what gave it away — the props
had never been in view, so moving them changed nothing.

**Fix.** The scan is now the orchestrator (`scene.js`, and `scene.html` for as long as it may hold
anything) plus the three registry DIRECTORIES walked whole: `core/layers`, `core/fx`, `core/tracks`. A
layer prop is read by the thing that draws a layer, the thing that modifies one, or the pipeline that
composes one, and each is one file per entry in a directory, so a walk cannot go stale the way the list
did. Count 130 → 163, and all 33 newly-visible props were already in the schema: the gate gains
coverage without inventing a single finding. Deliberately NOT all of `core/` — the first attempt was,
and `core/audio-kit.mjs` builds a synth voice out of a local `L` with `attack`/`decay`/`waveform`,
which reported 17 phantom drifts.

**Which gate catches it.** Itself, now, and it is still proven able to fail: removing one prop from
schema.json reports exactly that prop. `gate-mutation` stays 125/125.

**Class.** A gate measuring the wrong thing and reporting success about it — worse than no gate,
because the green line is evidence to the next reader.

## #230 — four layer types were one primitive in four copies, and the copies had already drifted apart

**What.** `paint`, `shader`, `raymarch` and `three` each had their own file in `core/layers/`, and each
said in its own header that it mirrored `shader.js` "exactly". They did the same five things: size a
canvas to the layer box, build a drawing instance once, redraw from LOCAL time, clear when off-window,
and stamp `el.dataset.st` so the renderer's static-frame dedup can see a canvas-only change. Only the
draw call differed.

**Root cause.** Copying a file is the cheapest way to add a primitive and the most expensive way to own
one. Nothing enforced the "exactly", so each copy aged on its own.

**What the drift had already cost.** Four defects, none of which any gate could see, because a gate
compares a scene against the engine and every copy WAS the engine:

1. **An unknown `shader` name drew an empty canvas, silently.** `core/shaders-ambient.js` resolves the
   name to a uniform index and `if (idx < 0) return;`. `shader.js` never validated, where `raymarch.js`
   and `three.js` both did. `validate` rejects the scene, so the renderer was the lenient one — the
   argument `core/layers/index.js` already makes about an unknown layer TYPE, unapplied one level down.
2. **`resample` on a `raymarch` or `three` layer was accepted and ignored.** Neither called
   `attachResample`, and `core/resample.js` only knew how to find a `paint` or `shader` canvas, so its
   "fail loud, this type owns no raster" branch never ran for the two types that reach it. The docs
   said "a validation error, never a silent no-op" and it was a silent no-op.
3. **`paint` validated its effect name in `frame()`,** so a typo threw on the first drawn frame instead
   of at build — the exact thing `core/fx/index.js` argues against, one file over.
4. **`shader` styled its canvas at the UNROUNDED `L.w`** while sizing the buffer at the rounded one, so
   a fractional width would have displayed the buffer at a size it is not. No scene has one.

**Fix.** `core/layers/canvas.js` is the one primitive; `core/surfaces/` is a registry of backends in the
shape of `core/layers/`, `core/fx/` and `core/tracks/` — a `REGISTRY`, an exported `SURFACE_TYPES`, a
`pick()` that hard-errors naming the known set, and a module-load check that every backend supplies all
five things the primitive calls. A backend owns PIXELS only. All four defects above are fixed once, and
cannot recur in three places.

**The names did not move.** `paint`, `shader`, `raymarch` and `three` are author-facing types in 101
scenes, so they stay four entries in `LAYER_TYPES`, bound to the shared primitive at module load. There
is no `canvas` type and no `surface` prop. The alternative — one type with a `surface` field plus three
aliases — buys nothing an author can use and costs every scene in the library.

**Which gate catches it.** `make snap-all` is scene-for-scene unchanged (51 identical · 30 changed · 3
quarantined · 0 errored · 17 no-baseline), and `make probe` and `scene-snap` are clean. But snap-all
compares a DOM SIGNATURE, and these four types put their whole output where the DOM cannot see it —
the blind spot that let an opaque `--alpha` export survive three audit rounds. So the pixels were hashed
directly: every `<canvas>` in 9 scenes at full resolution, 24 frames each, before and after — identical,
and identical across two runs of the same tree first, so the comparison means something.
`make canvas-purity` passes on the paint demo and on `motion-reel` (8 canvases, raymarch + three +
shader + paint). `gate-mutation` stays 125/125, and its `canvas-purity` case now anchors on the shared
off-window clear, so deleting it fails all four types instead of one.

**Class.** Duplication as an architecture. Not a wrong pixel on the day it was written, and four
independent wrong behaviours by the time anyone counted.

## #231 — schema-drift read `L.` and `C.` but not `LL.`, which the gate next to it had matched all along

**What.** `scripts/gates/schema-drift.mjs` collects the layer props the engine reads with
`/\b[LC]\.(\w+)/`. A layer under the inner name `LL` — the convention when `L` is already taken, used by
`core/three-fx.js` since it shipped — matched nothing. `scripts/gates/layer-props.mjs` has matched
`(?:LL?|C)` since IT shipped, and says so in a comment two lines long.

**Found by.** #230. Moving the per-frame draws into `core/surfaces/`, where the frame's layer arrives as
`LL`, dropped the count from 163 to 162: `spin` had no other reader anywhere in the scanned tree.

**Fix.** The same pattern the neighbouring gate uses. Count 163 → 164: `seed` and `spin` come back, and
`resample` is new because the shared primitive now reads it to refuse it (#230, defect 2). No scene
changed verdict, and every prop is still defined in the schema — coverage, not a finding.

**Class.** Two gates asking the same question of the same source with different eyes, and the narrower
one reporting a number as if it were the answer.

## #232 — a gate followed a builder's imports one hop up, but never sideways

**What.** `layer-props.mjs` decides which props a type honours by reading its builder AND the core
modules the builder imports, because a builder hands the whole layer on (`paint` → `PAINT_FX`, `three` →
`core/three-fx.js`). It matched `from '../x.js'` only. A builder importing a SIBLING was invisible.

**Found by.** #230. `core/surfaces/palette.js` holds the `L.colors` read that `shader.js` and
`raymarch.js` had each copied, and the moment it was one file over instead of inline, `colors` on a
raymarch layer was reported as a prop nothing reads — while the render honoured it.

**Fix.** Resolve both relative forms against the importing file's own directory. Also: a layer type
whose source resolves to nothing now reports the GATE as blind and exits 2, instead of quietly giving
that type an empty prop set and calling every prop on it dead. That is the failure mode this file
already guards for its shared scan, on the one path that had no guard.

**Class.** A rule written for the arrangement of the code on the day (`everything is one flat
directory`) rather than for the property it was checking (`follow where the props go`).

---

## #233 — the camera scaled a finished picture and called it a push

**What.** `tilt` shipped and a card could lean, but no camera move could get past it. Pan the camera 300px
across a card tilted 30 degrees and the card's projected shape changed by **0.00%** — it slid and it grew
and it never turned. Every vanishing point in the frame travelled with its own layer. Measured on the
engine's real CSS in `scripts/dev/spike-dolly.mjs`, and again as an A/B render either side of the fix: the
old engine holds the card's width/height at 0.905 · 0.907 · 0.908 · 0.906 across the whole move.

**Root cause.** `perspective` sat on `#cam` and the camera's own `s/x/y` sat on that same `#cam`, as a 2D
transform. So the projection was finished before the camera moved, and the camera was moving a
photograph of the scene rather than standing in it. This is #59's lesson applied one level too high: #59
correctly moved the lens off the layers and onto the thing that contains them, and then the camera was
put on that same element, where it does not compose with the lens at all.

**The second half, which is a naming failure and the reason this took a design round.** The obvious repair
is a `z` keyframe key beside `s`. That is wrong, and it is the shape `core/fx/index.js` already names:
one idea wearing several costumes. Under a lens of focal length `p`, a camera at distance `d` magnifies
the canvas plane by `p/d` — so a magnification and a depth are ONE number in two units, and `s` was never
a scale sitting beside depth. It WAS the depth, written in the unit an author frames in, and implemented
as a scale. A `z` beside it would have been two knobs for one idea that disagree with each other the
moment anything in the frame is tilted.

**Fix.** One camera model — position (`x`, `y`, `s`), orientation (`roll`, `rx`, `ry`), lens (`p`) — with
two provably equivalent emissions. Where nothing leaves the canvas plane every point is at z=0 and the
perspective projection collapses exactly to the affine `scale(s) translate(x,y)`, which is still what gets
written, for #59's reason: a 3D transform changes rasterisation even when it changes no geometry. Where
anything DOES leave the plane the engine builds a rig — lens on `#root`, `#cam` inside it in
`preserve-3d`, layer rotations composing into one 3D space. `dollyZ(s, lens)` is the whole conversion and
`roll` is the one axis that genuinely did not exist. `tilt` at top level stops writing a lens of its own
(a second projection leans a card about twice as hard as asked) and hands its `dist` and `origin` to the
stage, so nothing an author wrote is dropped.

**Which gate catches it.** `scripts/dev/spike-dolly.mjs` — and it asserts the NEGATIVE as well as the
positive, which is what makes it a gate rather than a demo: the flat emission must be pixel-identical to
the rig at rest, and it must be *unable* to move a vanishing point. A spike that only checked the new path
would have passed against the old engine too. `lib-test` round-trips `dollyZ` back through the projection.

**Class.** Twice in one file now: a measurement taken at the wrong level (#59 found the lens one level too
low, this found the camera one level too high), and a knob whose NAME had drifted from what it was —
`s` was called a scale for long enough that adding depth looked like adding a key.

---

## #234 — a blocking gate squared a layer, and so passed the one defect it existed to catch

**What.** `visual-vocabulary` decided whether a film SHOWS anything or is only type, by measuring how
much of the canvas each pictorial layer covered. `boxOf` in `scripts/gates/scene-timing.mjs` had four
tiers, and the fourth was `proxy`: a layer declaring only one axis, with no readable intrinsic aspect,
was **squared** — `w` became `h`. A 590x18 decorative underline was therefore measured as 590x590 and
credited with about a tenth of the frame. The gate whose entire purpose was to tell a mark from a
picture handed a pass to a hairline, and did it on a BLOCKING tier.

**Root cause, and it is not the arithmetic.** The tier was added honestly, to stop a real hero image
(`h:1440`, no `w`) being dismissed as a mark, and its comment said `proxy` "marks a guess as a guess".
It does not. Downstream the guess was multiplied into an area and compared against a threshold, and no
consumer branched on `how`. A value labelled uncertain that every caller treats as certain is not a
guess, it is a wrong number wearing a disclaimer. **A gate may not invent the one quantity it exists to
measure.** If the box is not knowable from the JSON, the honest answer is zero and the honest place to
get a real one is the rendered DOM.

**Why the gate was deleted rather than fixed.** Making the measurement true would have made the rule
true, and the true rule then failed about 52 of the shipped films. It was already waived by 30 of 130.
A rule that can only hold by being waived by a quarter of the library has been repealed already; the
only question is whether anyone writes that down. `docs/TASTE.md` now does, along with the three things
that must be true before it or anything like it comes back.

**Fix.** The `proxy` tier is gone: `boxOf` returns `{w:0,h:0,how:'unknown'}` for a single-axis layer
with no intrinsic aspect. `critique` was the other consumer (`carries`) and is strictly more honest for
it — it now credits no layer whose box it cannot read. The gate, its four `gate-mutation` cases, its
`make` target, its ladder step and its three waiver codes are removed from the tree, and
`waiver-drift` names those codes as DEAD WAIVERS so a stale one cannot read as a live argument.

**Which gate catches it.** None, and that is the point worth carrying. `gate-mutation` proved this gate
could FIRE, and it fired correctly on all four fixtures, because every fixture declared both axes. A
mutation harness proves a gate is wired up; it cannot prove the gate measures the right thing. The
fixture that would have caught this is a single-axis decorative layer, and nobody wrote it because the
helper looked obviously right. **When you pin a gate, pin the shape its measurement is worst at.**

**Class.** Same as #211 and #216: a measurement bug, not a rule bug. Also the second time a helper's
default has quietly substituted a plausible value for a missing one (#214). Grep for the helper, not
the call site.

---

## #235 — a determinism sweep reported regressions that had not happened, because it shared one browser

**What.** `make snap-all` drives every scene through Chrome and diffs a DOM signature against a
baseline. Run twice, back to back, against a tree nobody had touched, it returned `identical: 50 /
changed: 31` and then `identical: 49 / changed: 32`. Three scenes moved between the two verdicts across
runs: `showcase-intro` by 9 findings, `example-kinetic-type.beatsync` by 17 (as `cam.opacity: 1 →
0.002`), `linear-launch` by 238. Every one of them is stable when snapshotted on its own, six times in
a row. The gate that exists to prove nothing changed was the thing changing.

**Root cause.** The sweep launched ONE browser and pushed ~100 scenes through it. A long-lived Chrome
under accumulating pressure evicts decoded images and canvas backing stores, so a scene rendered thirty
pages into the sweep is not rendering under the conditions a fresh page gives it. The scene was never
the variable; how much the browser had already done was. Nothing in the report said so, so the reader
was left to decide which of two numbers was the truth, and neither was.

**Fix.** `scripts/gates/snap-scenes.mjs` recycles the browser every 10 scenes. That puts the sweep in
the same conditions as the single-scene gate, which is the run everyone already trusts, and costs one
Chrome launch per batch against a sweep measured in minutes.

**Which gate catches it.** The sweep catches itself now: run it twice and the verdict has to match.
That is the only real test for a gate of this shape, and it had never been run.

**Class.** A harness whose own environment was an uncontrolled input. Related to the purity doctrine the
engine already applies to `renderFrame(n)`: the renderer was pure all along, and the measuring apparatus
was not.

## #236 — a factual finding was filed in the taste bucket, and a cull carried it out of sight

`beats-wrapped-as-units` (added by #183) told an author that the engine was truncating their layers at
every beat boundary and named the one flag that stops it. It lived in `direction-floor`. When the taste
gates went opt-in (`docs/TASTE.md`, 2026-08), `direction-floor` stopped running by default and the
warning went silent with it. Authors have been hitting the truncation with nothing said since.

**Root cause.** The finding was correct and it was in the wrong gate. It is not a house-style opinion:
`core/produce.js` turns `sceneUnits` on for any cut film with no choreographed `motion` track, and
`formats/scene/scene.js` then rewrites every non-last-beat layer to end with its own beat. A layer
authored across a cut renders shorter than its JSON says. That is a fact about the render, checkable
without agreeing with anybody's taste, and it was grouped with the rules about whether a film is *good*
purely because it was written next to them. When the whole group was switched off for being fitted to a
library the doctrine calls debt, one member of the group was not an opinion at all.

**Fix.** Moved to `scripts/gates/beat-check.mjs`, which is always on, walks the clock rather than the
layer list, and already owns `dead-air` — the same class of finding, the same reader. It now fires only
on REAL truncation: a layer whose engine end (`scene-timing.mjs` `unitEnd`) is EARLIER than its authored
end, so a wrapped film that never wrote a layer across a cut stays quiet. It **warns** rather than fails.
The truncation is a fact; whether it is a defect depends on whether the author meant the layer to live
past the cut, and a gate cannot know that. Two scenes in the library trip it (`search-demo`, a block
authored 0.05s to 9.05s that renders to 5.50s; `three-showcase`, a caption authored to 11.00s that
renders to 4.10s), and both are genuine silent truncations nothing had ever reported.

`direction-floor` keeps the STRUCTURAL half, which is a different statement: a layer the wrapper confines
to its own beat is not a spine candidate at all, so `spineCandidates` now excludes it. That closes the
hole #183 opened at the other end — the old code short-circuited on the whole film, so a film with a
wrapped "crosser" could still be graded off raw `start`/`duration` in some shapes. One blocking code
(`no-continuous-object`) instead of two, which means every existing waiver keeps working unchanged;
`CONTINUITY_ALIASES` drops to one entry. Three new mutation cases pin the beat-check finding in all
three directions (it fires · `acrossBeats` silences it · a film whose layers stay inside their beats is
quiet), because a WARN-tier false positive is invisible to an exit code. 125/125. Library sweep before
and after: 0 scenes changed verdict.

**Lesson.** When a group of gates is culled, sort them by what they MEASURE, not by where the code sits.
The question to ask of every finding in the group is whether two people who disagree about taste would
still agree it is true. If they would, it is not a taste gate, and switching it off does not remove an
opinion — it removes a fact.

## #237 — sound by default was never decided, it was inherited from a bug fix

90 of 136 scenes set `audio.silent: true` and 20 more named no `audio` block at all. Not one of the 90
stated a reason. Five films in six ship mute.

**Root cause.** The mixer once auto-discovered any `assets/music.wav` and put a bed under everything.
Making music opt-in was the correct fix for that bug. "Opt-in" was then written into `SOUND.md` as
"silence is the default", and the doctrine outlived the fix by a year. A correct fix hardened into a
rule nobody re-examined, and it closed an entire structural register by habit: the sound bridge,
music-led structure and the unfinished sentence all need audio (`docs/CRAFT/FILM-STRUCTURE.md`).

The half that survives is true and worth keeping: a film must read with the sound off. The half that
never followed from it is "therefore ship it mute".

**Two supporting untruths went unnoticed throughout.** `schema.json` claimed "All sound is SYNTHESIZED,
never licensed" while the beds are downloaded third-party tracks. And every entry in `credits.json`
read `licenceVerified: false` with the note "confirm terms before commercial release". Nobody had.

**Fix.** Doctrine reversed. `audio._why` added, matching `authoring._why` including its 12-character
floor. Terms actually read and recorded in `assets/README-LICENCE.md`, which previously covered only
gradients and ransom sprites.

**Gate.** `make audio-check` — blocks under `STRICT=1` on `silent-by-omission`,
`silence-without-a-reason`, `audio-block-produces-nothing` and `bed-missing`; warns on
`bed-provenance-unknown` and `bed-licence-unverified`, neither of which anything checked before. It is
deliberately NOT in `author-check`: 90 scenes turning red at once produces reflex waivers, and a rule
waived by reflex is repealed.

It found three live defects on its first run: `argus-launch.json` names a bed that does not exist and
renders silent while claiming one, `motion-test.json` carries an empty `audio: {}` that reads sounded,
and `vawe-launch.json`'s bed has no provenance entry at all.

---

## #238 — the only continuity the engine could express was visual, so every film had to carry a prop

**What.** `direction-floor` blocks a short film on `no-continuous-object`: something must survive a cut
and change across it. Every answer the engine could express was a picture — a prop that travels, a
camera that moves, a match cut, a box whose `w` and `h` are keyed. Eighteen films in the library carry
a waiver, and three consecutive ones were the same rectangle changing size.

There is a cheaper answer, and film has used it since the 1930s: run a sound under the cut. A J-cut
starts the next shot's sound before its picture; an L-cut lets the last shot's sound run under the new
one. Either one holds two visually unrelated beats together and costs the picture nothing.

**Root cause.** The audio model had no way to say it. A cue is a point event at a time `t` and a bed is
one continuous file, so "start this texture 0.4s before the cut and cross it under" had no shape to be
written in. Nobody had noticed, because the doctrine said ship it mute (#237), and a device you cannot
use is a device you stop proposing. `docs/CRAFT/FILM-STRUCTURE.md` catalogues four families of
structural device and one of them is aural: the engine was locked out of a quarter of the vocabulary by
a missing field.

**Fix.** `audio.bridges` — a span of sound hung off a NAMED junction, `core/audio-bridges.js` resolving
it in the browser (the only place that knows where the film's cuts are) into seconds, and
`internal/audio/audio.go` laying it down with an equal-power crossfade at both ends and an optional
duck of the music bed on the mirrored curve. The junction is named (`cut@1`, `seam@0`, `sting@2`,
`junction@3`), never timed, because a hand-written `t: 4.37` goes wrong silently the moment a beat is
retimed — the same rot the scene marks were introduced to stop.

**Why it fails loudly rather than degrading.** A missing music bed drops to silence with a warning,
because `assets/music/` is gitignored and a fresh clone legitimately has none. A missing BRIDGE source
fails the render outright, because the film's continuity is the thing hanging off it: a bridge that
never plays is not a quieter film, it is a different one. A junction the film does not have names every
junction it does. A `lead` reaching back past the previous junction is refused rather than clipped.

**Gate.** `make lib-test` covers the resolver's refusals (18 assertions, most of them about what it
will not accept); `go test ./internal/audio/` proves a J-cut is audible before its junction, an L-cut
after it, that `duck` really pulls the bed down, that a missing source errors, and that an empty bridge
list mixes byte-identically to no bridge list. `make validate` checks the one thing the browser cannot:
that the texture is on disk. `make audio-check` counts a bridges-only film as sounded.

**Still open.** `direction-floor` reads layers, so a film held together purely by sound still trips
`no-continuous-object` and needs a waiver. The gate would have to reason about junctions to see it.


---

## 86. The design-spec lock knew three type roles; the engine has four

**What happened.** `onefilm` sets `"font": "num"` on its count layer, which is what the vawe theme's
`type.num` (JetBrains Mono) exists for: tabular figures under a rolling number. `make designspec-check`
reported it as off-spec — *font "num" is not a theme role (sans/serif/mono)* — and told the author to
map it to a role, which it already is.

**Root cause.** `scripts/gates/designspec-check.mjs` hard-coded `ROLES = ['sans','serif','mono']`. The
engine has had four roles the whole time and says so in four places: `core/theme-contract.js` lists
`['sans','num','serif','mono']`, `core/boot.js` emits `--font-num`, `core/layers/util.js` dispatches on
`L.font === 'num'`, and the scene schema's `font` enum includes it. Every shipped theme sets it. The
gate restated the list by hand instead of deriving it, and the hand copy was short by one.

**Why it matters more than one warning.** The only way to clear this finding is to move the numbers off
the numeric face, which is a worse film. Same shape as #85: a gate that measures the wrong thing does
not miss defects, it manufactures them, and the author pays in design.

**Fix (framework).** `ROLES` extended to the engine's four, and the message names all four so the next
author is told the truth about what is legal.

**Blast radius.** Two scenes in the library use `font: "num"` (`ab3-nogate-tenor`, `onefilm`), three
layers between them. Both go from one spurious `off-font` warning to none; nothing else changes, and no
scene moves in either direction on pass/fail.

**The general rule.** A gate that restates an engine list by hand is a second source of truth. Derive
it, or the day the engine grows a fifth role the gate starts arguing against it.

---

## #239 — the provenance table described a file that was no longer there, and could not survive a clone

**What.** `assets/music/credits.json` recorded `calm` as Mixkit track 127, a 133-second ambient loop.
The `calm.wav` on disk is a 8-second synthesized drone. The licence record pointed at the wrong file.

**Root cause.** Two writers, one namespace, and only one of them recorded anything. `make music`
downloads a track and writes a credits row; `make audio` (`scripts/media/audio-bake.mjs`) bakes
`calm`/`warm`/`tense` from parameters into the same directory and wrote no row at all. Baking over a
downloaded bed therefore left the previous entry standing, describing a file that had been replaced.
`warm` and `tense` had no entry at all, which is how `make audio-check` came to report
`bed-provenance-unknown` against a bed that is provably licence-free.

A licence record for the wrong file is worse than no record: `bed-provenance-unknown` is a question,
and a stale entry is a wrong answer that stops anyone asking.

**Second half of the same failure.** `.gitignore` excluded `assets/music/` wholesale, so credits.json —
which is not audio and carries no licence problem — could not survive a clone, while `docs/CRAFT/SOUND.md`
instructed authors to record provenance in it *before* a track goes under a film. The sfx directory next
to it had already got this right (`assets/sfx/*.wav`, with its credits tracked); music had not.

**Fix.** `audio-bake.mjs` writes a credits row for every bed it bakes — generated-by, no licence,
verified true — and says out loud when it is correcting an entry that claimed a download. `.gitignore`
narrowed to `assets/music/*` with `!assets/music/credits.json`, so the provenance travels with the repo
and the tracks still do not.

**Blast radius.** Re-baking the three beds produced byte-identical files (checked by md5 before and
after), so no mix changed. Only credits.json moved.

---

## #240 — beat wrapping discarded the authored `duration`, and the DOM kept no record of it

**What.** Under `sceneUnits`, `formats/scene/scene.js` rewrote every non-last-beat layer's
`data-duration` to `beatEnd + cutDur`. A layer authored `duration: 2.0` inside a beat running to 9.4s
emitted `data-duration: 9.8`. The rewrite REPLACES; it does not take the shorter of the two. `tpot-launch`
holds thirteen layers on screen past the point they were written to leave, one of them for 4.73s.

**Root cause.** Silent substitution, the class this file logs most often. The rewrite is real and
load-bearing: the beat wrapper owns the exit slide, so `driveClips` has to keep the layer alive through
it or the layer vanishes mid-move. But `data-duration` was the ONLY record of a layer's timing in the
rendered document, so the moment the engine overwrote it the author's number was gone. Every tool that
reports timing off the DOM — `make studio`'s timeline first — therefore drew the rewritten window and
called it the layer. The picture agreed with the render and quietly overruled the JSON, which is exactly
the shape that makes a substitution invisible: nothing disagrees, so nothing looks wrong.

`beats-wrapped-as-units` (#183) covered the other direction, a layer authored ACROSS a cut and cut short
at it. Extension had no finding at all.

**Fix.** Separate what renders from what is reported, rather than change what renders.

- `scene.js` writes `data-authored-duration` alongside the rewrite. `data-duration` still carries what
  `driveClips` needs, so no frame moves; the author's number now survives into the document.
- `make studio` reads it and draws the authored window solid with the wrapper's extension hatched, so
  the bar says "authored to here, held to there" instead of one flat claim.
- `beat-check` gained `beats-held-open` (WARN). It reports the EXCESS only — how long the layer is held
  past its authored end and before its beat even starts leaving — because carrying a layer through its
  own cut window is the wrapper's documented job. The threshold is `DEAD_AIR`, the 0.4s this gate
  already calls the line where a held frame stops reading as a breath.
- `scene-timing.mjs` gained `unitCut(L)`; `unitEnd` is now defined off it. One model, two questions.

**Blast radius.** `snap-all` unchanged. Four scenes gain the new WARN (`tpot-launch`, `chromatic`,
`showcase-scenecut`, `paint-demo`); none changes verdict, and the 0.4s floor is what keeps the other
nineteen wrapped films quiet. Reading `beats-held-open` on every wrapped layer would have fired on most
of the library and meant nothing.

**Not fixed here, and deliberately.** Holding a layer 4.73s past its authored end is arguably a RENDER
defect, not only a reporting one — the honest rewrite would be `max(authored, beatEnd + cutDur)` only
for layers that reach their beat's cut, and would restore the exit fade for the ones that do not. That
changes pixels in nineteen shipped scenes, which is a far bigger change than a silent-substitution bug
warrants in the same pass. The gate now names every scene it would touch.

---

## #241 — `make studio` showed a blank stage for a scene whose exact error was one property away

**What.** A scene with `cuts[0].style: "cut"` opened the studio on an empty stage and a readout stuck at
`frame 0 / 0`, with no message anywhere. `core/validate.mjs` had already produced the reason — *cuts[0].style
"cut" is not valid. Did you mean 'cube'?* — and `core/boot.js` had parked it on `window.__engineError`.

**Root cause.** `ready()` polled `__engineReady` and nothing else, forever. A failed boot and a slow load
therefore produced the identical picture, and the one state that needs a message was the one with none.

**Fix.** `ready()` checks `__engineError` first and paints it into a card over the stage, verbatim,
with the readout saying `scene did not load`. A 20s deadline covers the third case, where neither flag
ever arrives because the page died before boot could report.

---

## #242 — `buried` called a fully visible graphic 100% covered, because an ink rect was read raw (a fourth #211/#214/#216/#217)

**What.** `make audit D=formats/scene/playhead.json` hard-failed four times with
`[buried] f324/330/341/360 headline@y342 — 100% under an opaque layer`. No headline in the film has ink
anywhere near y=342; the two beat-4 headlines sit at 223 and 393, and the frame shows the title as the
cleanest thing in the picture. The author who hit it could not reproduce it by hand and, correctly,
refused to deform the film to clear it.

**Root cause, two faults compounding.**

1. **An ink rect in the wrong place, read unclamped.** `shapeInk` maps an svg path's points through
   `getScreenCTM()`. Chromium does **not** compose that matrix through a 3D rig, and the engine puts the
   stage on one for any camera `s` zoom (a translateZ under `perspective`) and again for a layer
   `tilt`. playhead's tick svg really draws at (408,898) 288x73; its screen CTM maps the same paths to
   (150,341) 123x29, a rect on the far side of the frame and the source of the y=342 in the message.
   The safe-zone walk had a clamp for exactly this, added by **#211** after an unclamped svg bound
   turned showcase-cuts from 0 hard failures into 7. The clamp lived at that ONE call site. `buried`
   read `inkRect` raw and inherited the whole bug.
2. **A dead guard.** `buried` asks `stack.findIndex(e => e === el || el.contains(e) || e.contains(el))`
   and skips the sample when the answer is -1, commented "not painted here at all: outside the ink".
   `e.contains(el)` also matches every **ancestor**, `#cam`, `.hs-stage`, `body`, and those sit in the
   stack at every point on the frame. The guard could never fire. So the check sampled 81 points of
   empty canvas, found the white card that genuinely is painted there, and reported the layer buried.

**This is the fourth time the same shape has been logged.** #214 (`textContent` counts `<style>` source)
was fixed in the overlap check and left in the clipped-text check, where it came back as #216, then #217.
#211 is the same story for the ink clamp. Every one was a measuring rule fixed at a call site while
another consumer kept reading it raw.

**Fix.** The clamp now lives **inside `inkRect`** (`clampToBox`), so an ink rect can only ever shrink the
element's border box and falls back to the box when the intersection is empty, for every consumer,
present and future. The safe-zone call site's private copy is deleted. The identity test drops
`e.contains(el)` in both places that had it: `buried`'s `mine`, and the overlap occlusion escape's
`at()`, where inflating the index made the opaque-surface forgiveness fire far more often than written.
`buried` also gained the layer-index identity the safe walk already uses. Labelling it by the ink's `y`
meant a headline drifting one pixel between sampled frames reported as four separate bugs.

**Cleared, not fixed.** `bgFor` and `onOwnFill` also call `p.contains(el)`, as a *skip* condition, to
ignore one's own ancestors. That use is correct. `stageRotated` is correct as written: it drops
overlap/tight only for a **rotation**, and a z-translate under perspective is a uniform scale that
leaves axis-aligned boxes axis-aligned, so `getBoundingClientRect` stays trustworthy there.

**Which gate catches it now.** `node scripts/gates/gate-mutation.mjs` carries both halves (129 cases):
a headline under a solid panel that must still FAIL, and, per **#234**, the shape the measurement is
worst at: an svg on a 3D camera rig with a tilt, plus a white rect parked where the bad CTM points,
which must PASS. Reverting the clamp makes the second case fire again on a frame holding nothing but a
visible blue tick.

**Blast radius.** `make audit` over all 148 scenes, before and after: byte-identical except playhead,
5 hard to 1. The four buried findings were the only ones in the library and all four were false.
---

## 85. A validator rule outlived the bug it was written for, and started inventing one

**What happened.** Authoring `onefilm`, every typed line in the file column carried `<b>` around its
JSON value so the value read in ink against a grey key. `make validate` warned four times: *uses
"typing" with `<b>`/`<em>` markup — typing renders tags literally*. The render showed the opposite: the
values typed in correctly, in colour, no tags on screen.

**Root cause.** Two commits, in this order. `core/validate.mjs` grew rule (2) of `lintData` on
2026-07-16, when typing really did take the `textContent` path and spat tags out as glyphs. Then
`8f1bde9` (2026-07-24) gave `core/layers/text.js` an HTML-safe typing path: `stripLen` counts only
visible characters and `revealHtml` walks the tree revealing that many, so markup survives and an
accent word types in its own colour. Nobody went back for the warning. It stayed correct-sounding and
wrong for a fortnight.

**Why this is worse than a missed defect.** A gate that misses something costs you the thing it missed.
A gate that reports a defect that is not there costs you the fix: the obvious response is to delete the
markup, which makes every typed line one flat colour. The gate does not merely fail to help, it argues
for a plainer film, and it argues in the voice of the engine. This is the shape CLAUDE.md means by
"when satisfying a gate requires making the film worse, suspect the gate".

**Fix (framework).** Rule (2) removed from `lintData`, with the history left in place as a comment so it
is not re-added from memory. `scripts/gates/lint-test.mjs` pinned the other way round: the known-bad
fixture, which still carries a typed `<b>` line, must produce NO such warning.

**Blast radius.** Warnings only — `lintData` never touches a frame, so no render changes. The whole
scene library was re-validated before and after: the only difference is four fewer warnings on
`onefilm` and none anywhere else.

**The general rule this belongs to.** A gate is a claim about the engine, and it needs to be re-checked
when the engine changes. The feature commit is where the stale rule was cheap to find; grep the gates
for the behaviour you just changed before you close the PR.

---

## 87. The layout audit read a rotated stage as if it were flat, and manufactured collisions

**What happened.** `onefilm`'s beat 5 is its only camera move: the stage tilts and pushes so the file
and its results are seen on a plane from an angle. `make audit` failed it with
`[overlap] hs-layer ✕ hs-layer — 702x7px` on a frame where nothing on screen touches anything. Fixing
the reported pair moved the failure to the next pair down the file. Spreading the layout far enough to
clear the check would have cost about 25px of line pitch and the density the frame was rebuilt to get.

**Root cause.** The moment a camera keys `rx`, `ry` or `roll` (or any layer tilts), the engine promotes
`#cam` into a `preserve-3d` rig. From then on `getBoundingClientRect` returns the **axis-aligned bound
of a projected quad**, not the shape. A 700px hairline rolled 3 degrees reports a box 80px tall. Two
file lines a comfortable 88px apart report boxes that intersect. The `overlap`/`tight` pair loop
compares exactly those numbers, so it fires hardest on the frames where a film is doing its most
deliberate camera work.

The same misreading had a second consumer. `camMoving`, which exempts the safe-zone check during
cinematography, tested only `x`, `y` and `s` — so a roll-only or `orbit` move was classified as a still
frame and its inflated boxes were reported as content leaving the safe area. One bad assumption, two
call sites, and only one of them was symptomatic today (CLAUDE.md: fix the rule, not the call site).

**Fix (gate).** `verify/audit.mjs`:
1. `stageRotated` reads `#cam`'s computed transform and checks the six off-diagonal terms of the
   `matrix3d`. A pure translate/scale leaves them zero, so a flat film is checked exactly as before.
   When it is true the `overlap`/`tight` pair loop is skipped, and only that loop: those two are the
   rules that read an intersection of two boxes, and a projected quad's AABB carries no information
   about whether two shapes intersect. `safe`/`clipped`/`contrast` still run, because they ask about one
   box against the frame, where an over-bound only ever fails safe.
2. `camMoving` now compares every camera key (`x y s rx ry roll p`), not three of them.

Read the rig rather than re-deriving it from the JSON: a top-level `tilt` builds the rig with no camera
keys at all, so a JSON-side test would have missed it.

**What this gives up, stated.** On a rotated frame the audit no longer catches a genuine text-on-text
collision. That is the honest trade: it could not distinguish one from a false positive there, and it
was reporting the false positives at a rate of several per camera move.

**Blast radius.** Every scene declaring `rx`/`ry`/`roll`/`cameraMove`/`orbit` (14 of them) audited before
and after. Only `onefilm` changed: FAIL to PASS. Every other scene, passing and failing alike, kept its
exact verdict.

**Found while reading, not fixed here.** The pair loop's occlusion escape asks whether both elements are
painted at the intersection centre using `elementsFromPoint`, but its `at()` helper accepts
`e.contains(el)` — and `#cam`, the stage and `<body>` contain every layer. So the "one of them is not
even painted here" branch can never be reached. Narrowing it would change overlap behaviour on every
scene in the library and needs its own before/after sweep.

---

## #243 — a layer the engine animated for 12.7s and never drew: an overlay bar behind a tilted capture

**What.** `playhead.json` declares its continuous object as one vertical bar: a text caret at 0s, the
studio playhead from 3.3s, the leading edge of a render fill at 14s. The storyboard is built on it and
names it as the reason the film needs no continuity waiver. In the rendered mp4 the bar is **invisible
from 3.28s to 16.0s**, 12.7 of 16 seconds. Proved by pixel count, not by eye: the layer was recoloured
magenta and every sampled frame from f108 to f470 returned **zero** magenta pixels. Delete the captured
timeline and the same layer draws 3133 pixels at the same frame, so it is occlusion, not a missing
layer.

**Root cause.** The scene runs the 3D rig (`tilt` on the layers, `plane` on two of them). Inside a
`transform-style: preserve-3d` container the browser paints by 3D position, so **document order and
`z-index` stop deciding anything.** The captured `#tl` component is 1440px wide and tilted 18 degrees
about its own centre, which sweeps its surface through roughly +/-222px of depth; the 9px bar tilts
about its own centre and stays at z ~ 0. Everywhere left of the component's centre the captured surface
is nearer the eye, so it paints over the bar.

Three fixes that do NOT work, each tested rather than assumed:
- `track` (the z-order knob, `core/clips.js:83`) — z-index is ignored under preserve-3d. Still hidden.
- `plane` — 150/300/600 hidden; 450 visible but projected to x 66..84 when the lane it must sit on is
  at x 305..317. Depth magnifies and displaces, so it cannot be used as a paint-order lever.
- a `group` wrapping the component and the bar — still hidden.

**Fix (authoring, and it is the general answer).** Make the overlay **coplanar** with the surface it
overlays: a `group` with the component's exact box and the same `tilt`, carrying the bar as a child.
Coplanar quads do not cross, so paint order decides again and the later layer wins. Measured: a
1440x368 rect at the component's box with the same tilt paints 543656 pixels over it. As a bonus the
bar now takes the same perspective as the lanes it points at, which no separately-tilted layer can.

**What made this invisible to every gate, which is the part worth keeping.**
`no-continuous-object` saw a layer surviving the cut and moving. `direction-floor` counted it in
`motionTrack x2`. `audit` measured its box, found it inside the safe area, and passed it. `beat-check`
counted it as content. Seven gates were green on a layer that contributed no pixels at all. Every one of
them reads the DOM or the JSON; none asks the only question that mattered, **did this layer put any ink
on the frame.** That gate does not exist yet and should: render N frames, and for each layer that
declares a visible box, report any that never contribute a pixel over their whole window. It is the
`buried` check generalised from "under an opaque layer" to "not painted at all", and unlike `buried` it
needs no heuristic — a layer drawing nothing for its entire life is never intentional.

**Blast radius.** Any scene that puts a marker, cursor, highlight or callout on top of a captured
component under the 3D rig. `grep -l '"tilt"' formats/scene/*.json` is the candidate set; this film is
the one confirmed instance, and it was confirmed only because the storyboard promised the bar loudly
enough that its absence was noticeable.

## #244 — `layer-props` was inverted: 1482 false alarms and ~66 real misses, because it looked for reads instead of asking for them (a fourth #229/#232/#242, and the same shape as #214/#216/#217)

`make layer-props` reported **1482 props "accepted and dropped"** — the failure CLAUDE.md names as the
most expensive in this repo. Every one of the 1482 was a false alarm. 1454 were read in `core/tracks/`,
a registry directory created the day it started shouting; 26 in `core/pan-resolve.mjs`, a `.mjs` outside
every registry directory; 2 in a file it did scan, under a variable named `A` instead of `L`.

Meanwhile it missed the class it exists for. Six props fire only behind another prop — `preset` needs a
split (`core/tracks/units.js:13`), `dist` needs a `cut` or a split, `motionBlur` needs a `motion` track —
and 23 authored layers set one without its enabler. Those render exactly as if the prop were absent, and
the gate called every one of them live while shouting about the ones that worked.

**Root cause: a static scanner over a moving file tree.** The scan surface was a hardcoded four-file list
plus one hop of each builder's *relative* imports. That list is a map of where the engine lived on the day
it was written, and this engine keeps moving — three registries landed in one day. Each earlier fix widened
the scan by exactly the shape that had just broken (#232 followed `../` but never a sibling; #229 scanned a
20-line shell after a file split) and each was overtaken by the next move. Widening a scan cannot outrun a
refactor.

**Fix: every module that reads `L.<prop>` declares it, beside the read** (`core/props.js` is the contract;
`core/layers/index.js` exports `LAYER_PROPS`, `core/tracks/index.js` `TRACK_PROPS`, `core/surfaces/index.js`
`SURFACE_PROPS`, the same "gates derive, never restate" contract `LAYER_TYPES` already had). The gate is a
set difference against those statements, so a new directory cannot open a blind spot: a declaration travels
in the file that does the reading. The guard is declared too — `preset: { when: 'split' }` — which is what
lets the gate tell "nothing reads this" from "nothing reads this **here**".

**The gate now catches (verified by mutation, `gate-mutation` 132/132):** deleting a `PROPS` entry for a
prop a scene uses; deleting one read only inside `core/tracks/`, the exact shape that was invisible (#234);
gutting the shared declarations, which reports the gate blind rather than blaming 4369 layers; and a
`preset` with no `split`, both directions.

**What it still cannot do, stated rather than discovered.** A declaration can drift from the read beside
it. Nothing proves that `PROPS` and the code in the same file agree — `make conformance` boots a real page
and is the place that check belongs. And one declaration is deliberately NOT beside its read:
`formats/scene/props.js`, because `formats/scene/scene.js` imports by absolute specifier and no node gate
can load it.

**Found on the way, by the new gate and not the old one:** `src` on an `svg` layer is read by nothing
(`core/layers/svg.js` takes `d`/`viewBox`); the old scan hid it behind the shared kit's `C.src`. And
`dist`/`dir` beside an `anim` do nothing at all — `core/clips.js` drives an entrance from
`data-anim` alone and has no distance or direction knob — which is 13 layers across four shipped films
believing they tuned a slide they did not.

## #245 — `make reveal` reported a contact sheet it had not written, and stamped a receipt for it

**What happened.** `make reveal D=formats/scene/playhead.json` printed
`✓ reveal · 5 beats … → /tmp/reveal/playhead.png` and exited 0. No such file existed, anywhere.
`make beats` wrote its sheet from the same repo, the same run, without complaint.

**Root cause, two of them stacked.** `scripts/author/reveal.mjs` decided where to put its work twice
and disagreed with itself: the frames directory was built through `CLAUDE_JOB_DIR` (line 77) and the
sheet path was the literal `/tmp/reveal/${SLUG}.png` (line 133). With a job dir set, `mkdirSync` created
`$CLAUDE_JOB_DIR/tmp/reveal/`, `/tmp/reveal/` was never created, and ffmpeg could not open its output.
It said so on stderr — into a `spawnSync` whose status the file never read. Four ffmpeg calls in that
file dropped their result on the floor. `beats.mjs` was immune only by accident: it hard-codes both
halves, so its two literals happen to agree.

**Why it was worse than a missing file.** The run ended by calling `writeSeenReceipt`, so the review
receipt that exists to prove somebody LOOKED at this version of the scene was stamped for an image that
was never written. A gate designed to catch "the author skipped the sheet" was satisfied by a sheet
nobody could open.

**The fix.** `scripts/lib/scratch.mjs` — one `scratch(...parts)` that resolves against a single base and
guarantees the parent exists, and one `ffmpegOrDie(args, out, what)` that throws on a non-zero status
AND on a zero status that produced no file. `reveal.mjs` takes both, so the receipt is now unreachable
unless the sheet exists. Verified: the sheet now lands and the printed path is the real one.

**Fixed at the rule, not the call site.** Grepped every `CLAUDE_JOB_DIR` consumer.
`filmstrip.mjs` and `measure-motion.mjs` were already correct (one base, and filmstrip checks ffmpeg's
status). `transition-preview.mjs` had the identical split — job-dir frames, a `/tmp/transition-preview.png`
literal — and survived only because `/tmp` itself always exists. It now uses the same helper.

**Lesson:** a tool that prints a path is asserting the file is there. Any `spawnSync` whose output
another line then claims as a result must check its status and its artifact, or the tool's success
message is decoration.

## #246 — the film's declared subject was not drawn for seven frames, at the exact moment it hands off

**What happened.** `playhead.json`'s whole spine is ONE vertical mark the viewer tracks from caret to
playhead to render fill. Painted magenta and counted, the mark was absent from every frame between
3.05s and 3.28s — the caret blinked out and a different, taller bar popped in at the surface's left edge
a fifth of a second later. On screen it reads as a pop, not a hand-off.

**Root cause.** Under the 3D rig, painting is by DEPTH, not by layer order. The caret was a top-level
rect at z = 0; the hero surface is a 1440px capture tilted 18° about y, so the near half of that plane
stands in front of z = 0 and swallowed the caret as the camera dolly swept the capture's projected
footprint over it. The bar was immune for a reason that did not generalise: it lives inside `phbar`, a
group placed at the capture's exact box and tilt, so the two quads are coplanar and DOM order decides.
The earlier fix (MISTAKES on the coplanar group) had rescued the second half of the subject and left the
first half at z = 0.

**What was tried and rejected.** `plane` depth on the caret does clear the occlusion (z = 400 restores
every frame), but depth is a real projection: the layer's size and its distance from the vanishing point
both change, and the factor moves with the camera dolly (measured 1.60 → 1.43 across the dive). No
constant compensation exists, so the caret could not be pushed forward without re-authoring the move
against a moving target.

**The fix.** The caret and the bar are now ONE layer, inside the coplanar group, resizing from the
caret's box to the playhead's box with keyed `w`/`h`. That is what the film always claimed to be. The
hand-off is pixel-exact by construction rather than by two layers being aimed at each other — measured,
the merged mark passes through the old junction at x 292–300 continuously, and the old two-layer version
had the caret ending at x 374–384 h 204 while the bar began at x 291–300 h 300, an 85px jump the
occlusion had been hiding.

**Which gate catches it: none of them, and that is the finding.** `validate`, `beat-check`, `critique`,
`direct`, `direction-floor`, `dissolve`, `slop`, `designspec`, `copy`, `assets`, `audit` and
`seam-check` were all green on the broken film, before and after. `beat-check` proves the timeline has
no hole, which is a statement about layers being SCHEDULED, not about pixels being drawn. Nothing in
the ladder renders the declared subject and looks for it. `scripts/dev/bar-probe.mjs` is that check:
recolour the named subjects to a colour used nowhere else, render, and count. It reports a per-sample
count and bounding box and exits non-zero on any empty frame.

**Lesson:** "the layer is in the scene and its window covers this second" is not "the viewer can see
it". Under a rig with any tilt or depth, occlusion is a rendering outcome no schema check can predict,
so the only honest proof is a pixel count on a render.

## #247 — the dead-CSS check had three blind spots, and each one was a place hand-written CSS actually lives

**What happened.** `core/tokens.css` disables `transition` and `animation` engine-wide, so hand-authored
CSS motion renders a dead still and says nothing. The authoring gate has named that by hand since the
`html` background shipped. It was reading roughly a third of the markup it was written to cover.

Three holes, found while giving `html` layers a file form:

- **A captured component was never read at all.** `grep component core/validate.mjs` returned nothing,
  while every `make capture` result is site CSS lifted wholesale. One of the 21 components on disk
  carries 30 `@keyframes` blocks that have never run and never will.
- **A group child was exempt.** `htmlLayerErrors` walked `cfg.layers` flat, so the identical fragment
  was checked at the top level and unchecked one level of nesting down.
- **`style="transition:opacity .3s"` did not match.** The regex anchored on `^`, `;`, `{` or
  whitespace, which is every stylesheet rule and no inline attribute — and an attribute is how
  hand-written markup and captured UI write this most of the time.

**Root cause.** The check was written for one caller, then copied to a second, and the question "what
else is hand-authored markup?" was never asked. The anchor came from thinking in stylesheets, because
the fragment that prompted it was a `<style>` block.

**The fix.** One recursive walk over layers and their children; a node-only pass that opens what a scene
NAMES but does not carry (`src` fragments, captured component JSON) and runs the same check on it; and a
quote added to the anchor. A fragment is an error, a capture is a warning — the site wrote that CSS, not
us, and it costs a still, not a broken render. Pinned in `gate-mutation` in both directions.

**Lesson:** the same as #214/#216/#217 and #244, in a smaller place. A measurement bug is never at one
call site. Before closing one, list every kind of input the rule claims to cover and prove each is
reached — "hand-authored markup" turned out to mean four things and the check saw one and a half.

## #248 — a missing fragment would have been a grey box, so it throws instead

**What happened.** Hand-authored HTML could only be an escaped string inside the scene JSON: 130
fragments across 53 scenes, one of them 127,467 characters on a single line, none of them readable,
diffable, lintable or previewable. Giving them a file form (`{"type":"html","src":"…"}`) meant deciding
what happens when the file is not there, and every existing loader in `core/preload.js` answers that the
same way: `console.warn`, then an empty box or a grey 900×560 placeholder.

**Root cause of the temptation.** The degrade-quietly default is right for what it was written for. A
missing photo still leaves a film, so warning and carrying on gets the author a render they can look at.
That reasoning does not survive the change of subject: an `html` layer IS the beat, and an `html`
background is the whole frame, so there is nothing left to degrade to. The placeholder would have been a
grey rectangle where the film was.

**The fix.** `preloadHtml` throws, naming the path and the roots the render server serves — the message
shape `fetchJson` already produces. The render stops before the first frame. The loader is TYPED off
`type === "html"` like `preloadLottie`, not sniffed for path-shaped strings like `preloadComponents`,
whose sniff is why an unrelated `.json` path in a scene gets fetched as a component. `html` and `src`
together is a validation error, and `.html` is now an extension `asset-check` looks for, so the absence
is caught statically as well as at render.

**Lesson:** "how should this fail?" is a per-asset question, not a house style. Ask what is left on
screen when the asset is missing. If the answer is "the beat", nothing degrades gracefully and the only
honest option is to stop.

## #249 — two gate runs at once deleted a guard from the engine and left it deleted

**What happened.** `gate-mutation`'s source cases edit tracked engine files in place: write the mutation,
run the gate, write the original back. Two runs overlapped (two agents, one checkout). The second read
`core/layers/canvas.js` while the first had it mutated, kept that text as "the original", and restored
it — permanently deleting the off-window `s.clear()` that #41 and #64 exist to protect.

**Why it was nearly invisible.** The deletion was invisible to every gate: off-window canvas pixels sit
at opacity 0, so nothing renders differently. The only symptom was `gate-mutation` reporting its own
canvas-purity fixture as STALE on the next run, which reads as a maintenance chore rather than as
"a guard has just been removed from the engine". It was found by `git status`.

**The fix.** An exclusive lock (`verify/fixtures/.gate-mutation.lock`, `wx`), so a second run refuses and
says why. Plus an `exit`/`SIGINT`/`SIGTERM` restore for every file currently mutated, which is the same
hole in the single-run case: a Ctrl-C mid-case left the mutation in the tree with nothing to put it back.

**Lesson:** a tool that edits tracked source is a tool that can corrupt the checkout, and "it always
restores" is only true for the paths that reach the restore. Agents run gates in parallel now, so
serialise anything that writes to a shared file, and run `git status --short` before believing a tree.

## #250 — the anti-pattern detector reports "clean" when it cannot run

**What happened.** Wiring `impeccable`'s detector into `make preview` (approval stop 1b), the first
result on every fragment and on `docs/animation.html` was zero findings and exit 0. The detector was not
finding nothing. Its static-HTML engine needs `htmlparser2`, `css-select`, `css-tree` and `domutils`,
none of which this repo carries, and its `catch` falls back to a regex pass that reports almost nothing.

**Why it matters here.** An approval stop is exactly where a green result gets believed. "Checked and
clean" and "could not check" are opposite answers and they printed the same characters.

**The fix.** `make preview` uses the BROWSER engine instead, against the page it has already opened in
puppeteer to take the screenshot — full rule set, real computed styles, no new dependency. When the
detector cannot be reached at all, the preview says SKIPPED and says why, in the words "unchecked, not
clean".

**Lesson:** every fallback should be asked what its output looks like when it fires. A degraded path
that produces the same shape of answer as the healthy one is not a fallback, it is a lie with a
try/catch around it.

## #250 — the guard against a destructive command matched the prose describing it, twice

**What happened.** A `PreToolUse` hook was written to refuse the four git commands that had already
destroyed work in this repo with several agents in one tree. It blocked its own first commit: the commit
message, inside a heredoc, described the command it bans, and the check ran the pattern over the whole
command string. The fix for that was then blocked too, because the replacement text quoted the same
literal. Then the test run was blocked, because the cases sat in a quoted list in the shell command.
Three self-blocks, all the same misread.

**Root cause.** The check read the SOURCE TEXT of a shell command instead of the commands that text
would run. A heredoc body, a quoted string and a grep pattern are all data, and none of them is a
command position. This is the same measurement error as #214 (`<style>` source counted as glyphs), #216
and #217 — a gate reading the representation rather than the thing.

**Fix.** `commandsIn()` in `.claude/hooks/no-blanket-git.mjs` strips heredoc bodies and quoted literals,
splits on command positions (`;`, newline, `&&`, `||`, `|`) and anchors every pattern with `^`, so a
match can only land where the shell would actually run something.

**And the second half, which is what stops a fourth round:** the hook file names none of the commands it
bans. Every pattern is written with `\s+` between the words and every label is a description, so editing
the hook through a shell cannot trip the installed copy of itself. A guard whose own source is a
tripwire is unmaintainable.

**Which gate catches it.** `node .claude/hooks/test/no-blanket-git.test.mjs` — 17 cases, 8 real forms
that must block and 9 that must not, five of which are the exact prose forms that caused the self-blocks.
The cases live in a JSON file rather than in the test source, for the same reason.

## #251 — the schema and the engine compared layer props BY NAME, so a name could mean two things

**What.** `schema-drift` asserted "every prop the engine reads is defined somewhere in
`schema.json`". `layers.item` is a FLAT map of 193 names, so the check could only ask whether a name
appeared anywhere in the file. `src` is already defined there for `image` and `component`. A third
meaning of `src` on a different type would therefore have passed the gate in silence, and so would a
prop that moved from one type to another.

**Root cause.** A name is not a fact about a layer. The fact is a name ON A TYPE, and the schema had
no place to write that down, so the gate had nothing type-scoped to compare against.

**Fix.** `formats/scene/schema.json` now carries a generated `layerProps` block, written by
`node scripts/gates/schema-drift.mjs --write` from the `PROPS` declarations and checked in. It is
type-scoped (`byType.<type>` plus a `shared` list) and the gate fails when the committed block
differs from what the declarations produce. The hand-written `layers.item` docs stay: they carry the
labels, types and enums no declaration can, and the gate now compares the two sets BOTH ways.

**Which gate catches it.** `make schema-check` — `layerProps in sync` and
`layers.item documents exactly the N prop(s) the engine declares`.

---

## #252 — `hue` was live in the engine and missing from the schema, because the scan only matched `L.`

**What.** A `paint` aurora layer reads `hue` (one hue for every blob, overriding the per-blob `hues`
list). The schema documented `hues` and not `hue`, so `make validate` reported
`unknown prop "hue" — the engine will ignore it silently` for a prop the engine honours. The gate
that exists to catch exactly this reported green for as long as the prop has existed.

**Root cause.** `schema-drift` found engine props by regex for `L.<prop>` / `LL.<prop>` / `C.<prop>`.
`core/paint-fx.js` receives the layer under the name `o` (the paint surface passes the layer straight
through as the options bag), so `o.hue` matched nothing. The regex is a guess about variable names,
and a guess about variable names goes stale the same way the file list before it did.

**Fix.** The comparison is now against the DECLARATIONS, which `core/paint-fx.js` has always carried
(`export const PROPS = { …, hue: {}, hues: {}, … }`). `hue` is documented in `schema.json`.

**Which gate catches it.** `make schema-check` — "the engine declares N layer prop(s) that
layers.item does not document".

---

## #253 — `transition` was documented, read, and declared by nothing

**What.** `layers[].transition` (the unified `{ in, out, dir, dur }` sugar) is read by
`core/transitions-lower.js`, which lowers it to `anim` / `out` / `dir` / `enterDur` / `exitDur` and
deletes it before any builder runs. No module declared it, so the derived vocabulary could not
account for a prop the schema advertised and the engine honours.

**Root cause.** The declaration contract was applied to the four registry directories and the
orchestrator. A prop consumed by a lowering pass BEFORE the registry sees the layer belongs to
neither, and nothing said so.

**Fix.** `core/transitions-lower.js` exports `PROPS = { transition: {} }` beside the read, and
`core/layers/vocabulary.js` merges it into the shared half.

**Which gate catches it.** `make schema-check` — "layers.item documents N prop(s) no module
declares".

---

## #254 — an unknown prop on a layer was accepted and then ignored, at render time

**What.** `{"type":"rect","colour":"#f00"}` rendered a rect with no colour, exit 0, no warning. The
CLI `make validate` had an unknown-prop pass, but it (a) ran only from the shell, never at boot, and
(b) compared against the FLAT `layers.item` map, so `src` on a `rect` passed.

**Root cause.** Silent substitution. The renderer read the props it knew and let the rest go by.

**Fix.** `core/layers/vocabulary.js` assembles the complete vocabulary from the declarations, and
`createRenderer(...).build()` walks the layer and every descendant and THROWS on a prop nothing
declares, naming the layer, the type, the prop and the nearest known prop by edit distance. The walk
runs from the one entry point the orchestrator calls, so a nested group (which never goes through
`kit.buildLeaf`) is judged by the same rule as a leaf — the gap behind #69 and #70.

A prop declared behind a guard the layer does not satisfy (`preset` without `split`) is NOT refused:
that is a real prop with a missing enabler, `make layer-props` already reports it, and 22 of the 23
findings in the shipped library are of that shape. A build must not die on them.

**Which gate catches it.** The renderer itself. `make beats` / `make video` / any render stops with
`SCENE ERROR: layer "…" (type "…"): unknown prop \`…\`. Did you mean \`…\`?`.

---

## #255 — the gate and the renderer each built their own copy of "what the engine accepts"

**What.** `scripts/gates/layer-props.mjs` assembled the shared prop union from six imports. Phase 3
needed the same union inside the engine. Two unions from the same six sources agree on the day they
are written and are free to diverge afterwards, and a gate that disagrees with the renderer is worse
than no gate: it either blesses a scene the renderer will refuse, or refuses one the renderer would
have drawn.

**Fix.** One union, `SHARED_PROPS` in `core/layers/vocabulary.js`. The renderer and the gate both
read it from there.

## #256 — the docs named commands and files the repo did not have, and two gates that would have said so were red and ignored

**What.** `docs/MISTAKES.md` told an author to run `make schema-drift`, `make roadmap-drift`,
`make sfx` and `make flicker-check`. None of the four exist. `docs/PRIMITIVES.md`,
`docs/DESIGN-DATABASE.md` and `docs/LAUNCH-VIDEO-GUIDE.md` all opened the brand workflow with
`make brandkit`, a target removed with the templates, and one of them wrote it inside the fenced
block an author copies first. `docs/ROADMAP.md` said `core/shaders.js` "already has this path" and
that a pattern was "proven twice over by `core/layers/shader.js` and `core/layers/paint.js`"; all
three moved in a rename two refactors ago. `docs/CRAFT/BLUEPRINTS.md` named a deleted scene as its
worked example. 111 usage strings inside `scripts/**` printed `node scripts/<name>.mjs` after the
scripts moved into `scripts/author|brand|gates|media|site/`, so the message a tool prints when you
get its arguments wrong named a path that had not existed for months.

Worse than any single one: `docs/JUDGE.md`, `docs/CRAFT/SUBAGENTS.md` and
`docs/CODEMAPS/DOC-DISCOVERY.md` all stated that the blind A/B judge "was never written". Git says it
shipped on 2026-07-29 in `05a5123` and was cut on 2026-08-05 in `cc2dfc2`, in a commit that removed
six tools on the ground that none had ever made a video better. The three docs were rewritten on
2026-08-09, four days after the removal, by someone who found a dangling link and inferred the wrong
history from it.

**Root cause, one for all of it.** Nothing checked whether a doc pointed at a real thing. The two
checks that come closest each own a slice: `craft-coverage` resolves markdown links inside
`docs/CRAFT/`, `doc-map` resolves markdown links to `.md` files repo-wide. Neither reads a `make`
command, a backticked source path, a link to a non-markdown file, a Makefile recipe, or a usage
string. A doc is read as an instruction, so an instruction that fails teaches the author to distrust
the whole file, which is the expensive part.

The false history has its own cause worth naming: **a dangling reference does not say which of two
things happened.** "Never built" and "built and then cut" leave identical evidence in the tree, and
they are opposite facts about the project. Guessing turned a decision into an oversight, in three
places, permanently, unless someone ran `git log`.

**Fix.** `scripts/gates/doc-refs.mjs` (`make doc-refs`), wired into `make review`. Four rules:
every `make <target>` a doc names exists; every repo path a doc cites exists; every Makefile recipe
runs a script that exists; every `node <script>` printed or documented inside a source file exists.
Scan surface is `git ls-files`, never a hardcoded array. A doc may waive one reference with
`<!-- doc-refs-allow: <ref> · <reason> -->` when it names a thing in order to say the thing is gone.

**Also fixed in the same pass.** `site-counts` was red on six figures and is green.
`dead-branch` scanned four hardcoded directories, which is a map of where the code lived the day it
was written; it now discovers its surface from `git ls-files`, which immediately found two dead
bindings in `formats/scene/scene.js`, a file it had never read.

**What the gate cannot do.** It cannot see an un-backticked command, and it will not judge a bare
filename with no directory in it (`linear-30.json` in CLAUDE.md was wrong for months and only a human
caught it). It proves a name resolves. It cannot prove the sentence around the name is true.

---

## #257 — the gates measured the box the author asked for, not the ink the frame carries (a fifth #214)

**What.** Four separate reproductions, all in gates, all the same shape.

1. A text layer 1200px wide reading "Hi" hard-failed `overlap 400x50px` against a neighbour whose
   glyphs start 700px away. Nothing on screen touches. `pin` centres a box, so a placed line HAS to
   declare a `w`, and that `w` is a wrapping width the copy does not fill.
2. `make validate` reported `layers[4].html contains an em-dash` and quoted
   `/* frosted pane — near-opaque */`. That is a CSS comment inside an `html` layer's inline
   stylesheet. It is not on-screen text, and the rule is "no em-dash in on-screen text".
3. A `group` declaring `h:400` around a 30px label reported its extent as
   `[safe] hs-group "small" — (200,800,266,1200)` and hard-failed the safe zone on 360px of empty
   air. `h` sizes the element; nothing need be painted in it.
4. `[contrast] "02 · motion, GPU-p" — 30px 1.1:1` on `motion-reel-v2` f530, and three more like it on
   `zerochrome` f55. All false. The caption is grey on the near-black field and perfectly legible; the
   probe sampled the backdrop at the CENTRE of the layer's declared box, which for a left-aligned line
   is empty slack sitting over a completely different surface (a purple gradient card).

**Root cause, one rule read wrongly in five places.** A layer's `w`/`h` is a request. On a rect, an
image or a component the engine honours it as the painted size, so there the box IS the ink. On a
text layer `w` is a wrap width and `align` decides where inside it the glyphs land; on a `group` `h`
is a container height; on an `html` layer neither is the content. Every check that formed a verdict
from `getBoundingClientRect()` was therefore answering a question about the JSON.

Two of the five were once correct and expired:

- The safe-zone walk deliberately used the INK horizontally and the BOX vertically, because a text
  ink is a line box that can overhang the border box by the font's half-leading. #242 moved
  `clampToBox` INSIDE `inkRect`, so an ink rect is now always a subset of the border box and the
  overhang is impossible. The clamp made the axis split obsolete and left it standing, and that
  leftover is the whole of defect 3.
- The scene-collision lint estimated a text layer's height as `size * 1.3`. The engine sets
  `line-height: 1.04` on `.hs-text` (`formats/scene/scene.css`). 1.3 is nobody's number: it gave every
  headline a phantom band a quarter of a line deep, and that band is what "collided" with the caption
  under it.

**Fix.**

- `verify/audit.mjs`: the ink helpers (`paintsBox` … `inkRect`) move above their consumers, and
  `info` (which feeds overlap · tight · top-heavy · display-type contrast · image contrast) is built
  from the clamped ink rather than the border box. The safe-zone walk uses the ink on BOTH axes. Both
  contrast probes (`checkSpan` and the per-element loop) sample the backdrop under the glyphs. Because
  `inkRect` is clamped, an ink rect can only ever shrink a measured box, so overlap · tight · safe can
  only lose a finding, never gain one.
- `verify/audit.mjs`: the display-type (7:1) rule judged the single largest text on the frame. The bar
  is a fact about how big type reads against a field, so it belongs to every element that IS big type.
  Picking a winner meant a headline's verdict was decided by whether it had a bigger neighbour: an
  80px headline at 3.3:1 was a hard `weak-headline` alone on the frame and reported by nothing at all
  once a 90px sibling arrived.
- `core/validate.mjs`: `noEmdash` now reads `onScreenText(s)`, which strips `<style>`/`<script>`
  blocks, HTML comments and tags (so attributes go too) before looking. The tag pattern requires a
  letter straight after `<`, so plain prose and `<b>`-marked copy are untouched. The message quotes the
  RENDERED text around the offence instead of the first 48 characters of source, which for a long
  fragment did not contain it.
- `core/validate.mjs`: the scene-collision lint derives a text layer's box from the STRING (glyph count
  times size times an average advance of 0.55em, clamped to `w`, placed by `align`) instead of from
  `w`, and uses the engine's own 1.04 line-height. Width only: dividing the run by `w` to guess a
  wrapped line was written, measured and removed, because at 0.55em a short word in a narrow column
  reads as wrapping when it does not, and the guessed second line reached into the caption below and
  added 11 warnings about headings that fit. A gate that manufactures a defect is worse than one that
  misses it, so the height under-states.

**Every consumer, fixed or cleared.** `getBoundingClientRect` in `verify/audit.mjs`, all 16:

| Site | Verdict |
|---|---|
| `paintsOwnBox` (x2) | cleared: a ratio of two boxes, asking "does a child FILL this layer" |
| `svgInk` others | cleared: `<text>/<image>/<use>` have no outline to sample; the box is the honest fallback |
| `clampToBox` | cleared: the clamp target IS the border box by definition |
| `inkRect` Range | cleared: that call IS the ink |
| `els` filter | cleared: an existence guard, not a measurement |
| `info` | **fixed** |
| safe-zone walk | **fixed** |
| tiny-image | cleared: an `<img>`'s box IS its raster |
| tiny-text width guard | cleared: an existence guard |
| `buried` | cleared: already `inkRect(el) || box`, fixed by #242 |
| per-element contrast | **fixed** (probe point) |
| `checkSpan` | **fixed** (probe point; it is handed a whole LAYER when the layer is headline-scale) |
| `overlayFn` | cleared with a caveat: it draws the debug overlay, not a verdict. It still outlines border boxes, so the overlay is now looser than the rule. Worth aligning. |

`textContent` in `verify/audit.mjs`, all 4 remaining: safe-zone label, `buried` label, per-element
contrast label and `checkSpan`'s emptiness test are now `inkText`. The last of those was a GATE, not
just a label, and `checkSpan` is called with a whole layer, so a layer carrying only an inline
stylesheet passed its emptiness test on its own CSS source.

Declared geometry outside the audit: `scripts/gates/scene-timing.mjs` reads `L.w`/`L.h` on RECTS
(cleared: for a rect the declaration IS the paint), `scripts/gates/critique.mjs` and
`direction-floor.mjs` read `l.size` as an authoring signal rather than a geometric verdict (cleared),
`snap-signature.mjs` and `motion-audit.mjs` use `textContent` as a fingerprint or a label (cleared).
`core/validate.mjs` `layoutErrors` is a rule ABOUT the declaration ("a centring keyword with nothing
to centre") and is correct by nature (cleared).

**Library diff, 149 scenes.** 125 identical. 16 finding lines removed, 24 added. Verdicts:
70 FAIL→FAIL, 35 OK→OK, 35 WARN→WARN, 7 CRASH→CRASH (non-scene sidecars, unchanged), plus two moves:

- `example-product-promo.beatsync.json` WARN → FAIL, `[weak-headline] "free at your.app" 56px at 2.9:1`.
  Not a new defect: `example-product-promo.expanded.json`, the SAME film, already emitted that exact
  line and already hard-failed on it in the before run. The beatsync cut escaped only because a bigger
  text happened to share frame 469. The bug was its absence.
- `showcase-aspect.json` OK → WARN, `top-heavy`. Warn tier. The composition rule now measures where
  the glyphs end rather than where the declared boxes end, so the dead bottom is reported honestly.

`make validate`: 131 ok / 3 failed before and after (the 3 are missing VO/spectrum files, untouched).
Collision warnings 52 → 43; 14 false ones dropped, 5 pairs surfaced that the "full containment is
intentional" escape had been hiding, because two stacked lines sharing one declared `w` looked like a
chip inside a card.

`node scripts/gates/scene-snap.mjs scene`: IDENTICAL, 25 frames. No rendering changed.
`make probe`, `make lib-test` (577), `make lint-test`, `make schema-check`, `make audit-test`: pass.

**Which gate now catches it.** `verify/measure-regression.mjs`, run by `make audit-test`. Three
fixtures, one per reproduction, each of which hard-failed the audit before the fix and is asserted
clean (or, for the headline case, asserted to fire on the SECOND headline) after it. Verified by
reverting `verify/audit.mjs` to HEAD: all three assertions fail. `make lint-test` gains the matching
assertion for the validator: declared boxes that overlap only in empty slack must stay silent.

`verify/fixtures/lint-bad.json` had to change, and that is worth saying plainly rather than burying.
Its collision pair was "scene A body" / "scene B body", two 12-character lines at 40px in 800px boxes,
300px apart. Measured honestly they are about 264px wide and do not touch: the fixture pinned a FALSE
POSITIVE. The copy is now long enough to fill the boxes, so the fixture pins a collision that would be
on screen.

**Class.** Gate gap, and the fifth logged instance of one rule. #214 found `<style>` source counted as
glyphs in the overlap check and fixed that call site; #216 was the same bug in clipped-text; #217 was
two more consumers; #242 was the ink clamp living at one call site while `buried` read it raw. The
shape is always the same: a measurement primitive is corrected where it was noticed and left alone
everywhere else, and the untouched half looks exactly like the finished half until something trips it.
The counter-measure that was missing every time is not a comment. It is a test that fails on the old
code, which is why this entry ships with one.

## #258 — a load-bearing comment claimed the capture was byte-stable, and it never was

> **CORRECTED by #267. The conclusion below is wrong where it matters.** This entry says the variance
> is "rasteriser jitter, and it is invisible". Most of it was Chrome's deferred image decode dropping
> WHOLE IMAGES out of frames: two runs of the same code, and one is missing two of three product
> screenshots. The method lesson below still stands and in fact indicts this entry twice over. It says
> "look at the pixels before theorising about them", and it was written from ONE crop of ONE frame,
> chosen at the median rather than the worst. Looking is necessary and not sufficient: look at the
> WORST case, or you will generalise from the quietest evidence you happened to sample.


**What.** `internal/scene/scene.go` said the JPEG capture was "verified byte-stable across repeats AND
across separate browser instances, which is what dedup's anchor equality and renderFrame(n) purity both
depend on." Measured on `brew-launch`, two renders of identical code differ on **1078 of 1890 captures**
with four workers and **373 of 1890** with one.

**What the difference actually is, which took three wrong guesses to find out.** 0.001% to 0.007% of
pixels, a max delta of about 45 on a 0-255 scale, sitting on the anti-aliased edge of a card's rounded
corner. Nothing is missing and nothing has moved. It is rasteriser jitter, and it is invisible.

**Why the wrong guesses happened, which is the useful part.** The first test compared mp4 hashes. Two
runs of identical code hash differently, because the container is not reproducible, so that test could
never have said anything. The second compared decoded frames and found the difference was real. The
third found the differing frames were two contiguous runs that lined up with the film's two `component`
layers, and concluded the cause was component images racing the capture. That was a good inference and
it was wrong: the frames were never LOOKED AT. One crop of one frame settled in seconds what three
rounds of reasoning got wrong. **Look at the pixels before theorising about them.**

**What is true and what is not.**

- Dedup is fine, by design rather than by luck. Its anchor check re-shoots inside the SAME browser and
  tolerates 0.05% of pixels, an order of magnitude above what was measured.
- `renderFrame(n)` purity is a claim about the DOM. That is what `make probe` compares, and it holds.
  It was never a claim about bytes, and the deleted comment made it sound like one.
- A green `make probe` therefore does not mean two renders produce the same picture bytes. It means
  they produce the same document.

**Fix.** The comment is replaced with the measurement. `VAWE_KEEP_FRAMES=1` keeps the captured frames
so anyone can re-measure this: without it the frames are deleted on exit, and nobody could tell a
non-deterministic draw from a non-deterministic encode.

**Still open.** The gap between 373 (one worker) and 1078 (four) is cross-worker variance, a second
cause that has not been diagnosed. It is the same shape and the same magnitude, so it is very likely
the same rasteriser jitter across processes, but that is a guess and it is written down as one.

## #259 — a captured component's images were never preloaded, and they are somebody else's CDN

**What.** `preloadImages` in `core/boot.js` walks the SCENE DATA for image paths, and its own comment
says why it exists: "without this the Go renderer can screenshot a frame mid-download, so the image is
missing on some frames." A captured component's `<img>` tags are not in the scene data. They arrive
inside the component's own HTML, fetched separately by `preloadComponents`. So the one preloader written
to prevent mid-download captures never looked where these images live. `brew-launch` carries **16** of
them, and every one is a live `https://brew.new/...` URL fetched from a third-party CDN at render time.

**Found while chasing #258, and it was NOT the cause of #258.** Preloading them changed the frame count
not at all. It is logged and fixed on its own merits: the race is real, the engine guards against
exactly this race everywhere else, and a render that depends on how fast someone else's CDN answers is
not deterministic in any useful sense.

**The first fix did not fire, and the reason is worth keeping.** It matched `<img ... src="...">` with a
regex. A captured `src` is attribute TEXT, so it carries HTML entities: these URLs read
`?url=...&amp;w=1200&amp;q=70`, and fetching that literal string asks for a different URL than the one
the browser resolves. It preloaded 16 URLs that were not the ones being drawn. `preloadEmbeddedImages`
now uses `DOMParser`, which builds an inert document, so reading `.src` resolves and decodes entities
without fetching anything. Verified by instrumenting it: 16 URLs, entities decoded.

**Still open, and larger than the race.** Capturing a component should INLINE its images, as
`core/seams.js` already does for fonts. Until it does, every film built on captured UI re-downloads
someone else's assets on every render, and would render differently offline.

## #260 — `_lightfall.html` moves at frame rates against a clock measured in seconds

**What.** `formats/scene/_lightfall.html` drives every value off `sin(var(--t) * f + p)` with `f`
between 0.04 and 0.33. `core/bg-html.js` writes `--t` as **seconds into the video**, not frames. Over
a 10 second film the whole-field breathe advances 0.41 radians, about one fifteenth of a cycle, and
the per-slat shimmer advances under a third of a cycle. The backdrop is very close to a still.

**Root cause.** The frequencies read as if they were tuned against a frame counter. At 30fps they
would be right: 0.041 rad per frame is one cycle every five seconds. The author never watched the
motion across frames, which `CLAUDE.md` rule 2a0 exists to prevent.

**Fix.** Not applied. `_lightfall.html` was out of scope for this pass and is hand-baked, so there is
nothing to fix but the 58 literals. `core/lightfield/` sets its rate from one named constant,
`RATE = 0.62` radians per second at `speed: 1`, so the unit is stated once and cannot be guessed at.
Regenerating `_lightfall.html` through the generator would close it.

**Which gate catches it.** None. `direction-floor` checks that a hand-authored backdrop *mentions*
`var(--t)`; it cannot tell a field that moves from a field whose coefficient makes it stand still.
A gate could: evaluate each `sin(var(--t) * f + …)` over the film's own duration and warn when the
total phase travelled is under about half a cycle.

---

## #261 — `make preview` is the wrong page for a full-bleed fragment

**What.** `scripts/author/preview-fragment.mjs` puts the fragment in `#frag { width: 1400px }`
centred in a flex stage. A backdrop fragment is `position:absolute;inset:0`, so it sizes itself
against that box and the preview shows a 1400px strip, not the frame. Nothing warns.

**Root cause.** The preview page was built for cards and hero blocks, which are content-sized. A
full-bleed field is the other kind of fragment and there was no page for it.

**Fix.** `scripts/author/lightfield-shot.mjs` gives one: a stage at the exact output size with `--t`
set explicitly. A better fix would be a `--full` flag on `make preview` that drops the 1400px box and
sets `--t`, so every author gets it rather than every author writing their own.

**Which gate catches it.** None, and this is a looks-fine failure: the preview renders, it just
renders the wrong thing.

## #262 — a fidelity metric that averages away the thing it is grading

**What.** `lightfield-compare.mjs` graded a generated field against a reference on a 24x14 block
grid. It reported 7.1% mean error and every pass looked green. Side by side with the reference the
field was visibly mushy: its striping amplitude measured 0.77x, and the bars are the subject.

**Root cause.** Downsampling to 24x14 is the RIGHT way to judge a colour field, because it cancels
the pattern's phase. That is also exactly why it cannot see the pattern. One number was being asked
two questions, and it answered the one it could.

**Fix.** `scripts/author/lightfield-metrics.mjs` now defines both, once, and both are printed:
`blockError` for the colour field, `striping` for the pattern (`edge`, the mean absolute horizontal
step; `swing`, the RMS of a row minus its own 21 pixel moving average, which is the amplitude of the
bars with the field subtracted out). `lightfield-fit.mjs` fits the layout on the first and the
pattern's contrast on the second, and once the pattern is in play every pass is scored on one
combined cost. Alternating two objectives lets a later pass spend what an earlier one earned: an
intermediate run took the striping to 10.8 and then a layout pass handed back 10.2.

**Which gate catches it.** The compare tool itself, now that it prints `gen/ref` for both numbers.
The general lesson is worth more than the fix: when a measurement deliberately discards a dimension,
it cannot be the pass mark for anything in that dimension, and a green number is then evidence of
nothing.

---

## #263 — four abandoned search processes, all appending to one log

**What.** A long fit was launched, superseded, and relaunched several times. `pkill -f` did not
account for every one, so four `lightfield-fit.mjs` processes ran at once. Two were appending to the
same log file, which made the log read as if a single run had stalled, and all four shared the CPU,
which made every one of them slow. Twenty minutes were spent reading a log that two writers were
interleaving.

**Root cause.** A background search with no lock and no identity. Nothing stopped a second run
writing where the first was writing.

**Fix.** Not applied in code. The working practice is: one search at a time, verify with
`pgrep -fl` before relaunching, and give each run its own log path. A real fix would be an exclusive
lock on the log file, so a second run refuses to start rather than corrupting the first one's output.

**Which gate catches it.** None. Worth knowing because the failure looks exactly like a slow run.

## #264 — a backdrop declared by `src` rendered nothing, and said nothing, the day `src` shipped

**What.** `{"bg": [{"t": 0, "src": "formats/scene/_lightfall.html"}]}` painted no backdrop. The file was
found, fetched and stored: `preloadHtml` handles the bg case explicitly and puts the text in
`window.__html`. Then `core/bg-html.js` selected its windows with `windows.filter((w) => w.html != null)`,
so a window carrying only `src` was dropped on the floor and nothing was ever read back out of the table.

**Root cause.** The feature was built in two halves that were never joined. The loader learned about
`src`; the renderer did not. `core/sanitize-html.js` already exports `htmlSource(o, table, where)`, whose
own comment says it exists so "a layer and a backdrop cannot drift on which source wins" — and the
backdrop never called it. The layer half did.

**How it hid.** The scene still rendered. A film with no backdrop is a valid film, `validate` passes,
`probe` passes, `scene-snap` passes, and the only symptom is a frame that is emptier than the author
meant. This is the silent-substitution class again, and it is the fourth entry in this file where a
`filter` on the OLD spelling of a field outlived the field gaining a second spelling.

**Fix.** `createBgHtml` takes the table and resolves through `htmlSource`, so both halves of the feature
use one resolver. `formats/scene/_lightfall-test.json` and `_arcfall-test.json` now declare their
backdrops by `src`, which makes them the standing test: if this regresses, both render blank.

**What it was worth beyond the bug.** Those two scenes each carried a duplicate inline copy of the
fragment. **17,349 bytes to 398, and 14,316 to 405.** A fragment kept in one place can be previewed,
diffed and linted; the same fragment escaped into a JSON string cannot.

## #265 — the one-source rule explained a collision it was not looking at

**What.** A bg window naming both `html` and `src` was refused with: "`html` paints in the DOM and
`preset` paints on canvas; they do not layer." Neither `preset` nor canvas was involved. The rule
correctly checks four keys and the message only ever described one pair of them.

**Why it matters more than it reads.** An author who is told the wrong reason goes and looks in the
wrong place. `html` beside `src` is the easiest of these to fix and the message pointed at a subsystem
that had nothing to do with it. A gate that names the wrong cause costs more than a gate that says
nothing, because it is trusted.

**Fix.** The message now names the pair that actually collided: `src` IS `html` in a file, so keep one.
Verified on both branches.

## #260 update — the two hand-authored backdrops moved at frame rates against a clock in seconds

Fixed in the same pass. Every `var(--t) * K` coefficient in `_lightfall.html` (86 terms) and
`_arcfall.html` (40 terms) was authored as if `--t` counted frames; `core/bg-html.js` writes SECONDS.
Over a 10s film the slowest term travelled 0.40 radians in one and **0.19** in the other, so both were
stills wearing motion. Rescaled by 30, which restores the author's intended pace exactly at 30fps.

Judged the way rule 2a0 demands, across four timestamps rather than on one still: both now visibly
drift and breathe, and neither flickers.

## #261 closed in part, and one half of it is still open

**Two real defects in `make preview`, both fixed.**

**One: the preview never set `--t`.** The frame clock is written by `core/bg-html.js` every frame, in
seconds. The preview page never declared it, so every `calc(... var(--t) ...)` was INVALID and Chrome
dropped the whole declaration. A time-driven fragment therefore previewed as a different picture, with
nothing said. Confirmed by fixing it: with `--t` set, the left half of `_lightfall` matches the rendered
film bar for bar, and without it the bars sit elsewhere. `--t <seconds>` is now a flag, which is also how
you check that a backdrop moves at all rather than trusting one still.

**Two: a full-bleed fragment previewed as a strip.** `#frag` declared a width and no height, so a child
at `position:absolute; inset:0` collapsed to zero. Detected from the markup rather than declared, because
the author of a backdrop should not have to know this tool internal layout, and the choice is PRINTED on
every run so it is never silent.

**Still open, and stated rather than guessed.** A full-bleed field still paints only the left 1080px of
1920 in the preview, where the film fills the frame. It is a PAINT problem, not a layout one, and that is
measured rather than assumed: all 42 bars are in the DOM, at correct percentage positions, spanning x=-23
to x=2029. Three hypotheses were tested and all three were WRONG: a compositor raster race (a double
requestAnimationFrame barrier was already there), `will-change` layer promotion (overriding it to `auto`
changed the coverage by 0.0%), and the supersample the render path uses (deviceScaleFactor 2 changed
nothing). Coverage is 53.6% in every case, and 1080/1920 is 56.25%, which is close enough to be a clue
and was not enough to find it.

Logging it unfinished on purpose. Three eliminated hypotheses are worth more to whoever picks this up
than a fourth guess dressed as a conclusion, and the two fixes above stand on their own measurements.

## #266 — a capture localizer that only recognised an asset by its file extension

**What.** `formats/scene/brew-launch.json` re-downloaded five email previews and three product
screenshots from `brew.new` on every render. The film was not reproducible, degraded silently when the
CDN was slow or unreachable, and would have changed if brew edited those images. Sixteen `<img>` tags
across four captures were affected, plus nine on `linear.app`.

**Root cause, three faults in one line of `capture-component.mjs`.** The script already tried to
localize. It collected URLs with `/https?:\/\/[^"')\s]+/g` over the raw html and kept only those
matching `/\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i`.

1. The filter demanded the extension be followed by `?` or end-of-string.
   `…image?url=…preview.png&w=1200&q=70` has the extension mid-query, so every brew asset was skipped
   and no message said so. Linear's `imagedelivery` URLs carry no extension at all.
2. The scan read attribute TEXT, where `&` is stored as `&amp;`. Even a URL that passed the filter was
   fetched as a different URL than the browser resolves. `core/preload.js` records the identical
   mistake being made and corrected in `preloadEmbeddedImages`.
3. It was a scan for URLs, not for asset references. `http://www.w3.org/2000/svg` in an `xmlns` and
   `<a href="https://reddit.com/…">` are both URLs and neither is an asset. The filter hid this by
   accident, and any widening of the filter would have started fetching namespaces.

**Fix.** `scripts/brand/localize-assets.mjs`. One tokenizer finds asset references BY CONTEXT, from a
table of (tag, attribute) pairs: `img`/`source` `src` and `srcset`, `video` `src` and `poster`,
`audio`/`track` `src`, SVG `image`/`use` `href` and `xlink:href`, the legacy `background` attribute,
`url()` inside a `style` attribute, and `url()` inside a `<style>` block. Entities are decoded before
the fetch. Downloads are identified by MAGIC BYTES, so a CDN that answers a hotlink with a 200 and an
HTML error page cannot be written to disk as `<hash>.png` and render as a broken card. Hyperlinks,
namespaces, `data:` URIs and `#fragment` references are never fetched.

**Why files beside the JSON and not `data:` URIs.** `core/seams.js` inlines fonts as `data:` because a
`url()` cannot resolve at all inside the isolated SVG raster; that is a rendering constraint, not this
one. Ours is a network dependency and a local file removes it just as completely, matches the `media/`
convention already on disk, dedupes an asset shared by two captures, and avoids inflating by a third a
JSON that every render worker parses.

**The identical bug next door.** `capture-scene.mjs` produces the same kind of html and never localized
anything. Both scripts now call `localizeCapture`.

**What now catches it.** A capture whose asset will not download FAILS and is not written, naming each
URL (`--allow-remote` is the deliberate escape hatch). `node scripts/brand/localize-assets.mjs` reports
the debt across every capture on disk; `--write` clears it. A capture that still carries a remote URL
keeps rendering, and `preloadEmbeddedImages` now warns once per remote URL, so the dependency shows in
the render log instead of only in a frame.

**Limit worth knowing.** A component inside a `seam` bake still renders its images blank
(`core/seams.js:371`). That limitation applies to every `image` layer too, so a component is not
special; curing it means teaching `seams.js` to inline what it rasterises.

**Two things found alongside it, both worth their own attention.**

`assets/brands/**` is gitignored, so the repaired captures did not travel with the merge and the fix
had to be re-run in the working tree. Code and the data it repairs living on opposite sides of
`.gitignore` means a merged fix can leave the debt in place, and the CLI is what makes that visible:
`node scripts/brand/localize-assets.mjs` reports, `--write` clears.

`scene-snap` moved 40 caption boxes by 3px on one run and has been stable since, on a scene containing
no `component` layer at all, so it cannot be this change. The likely cause is a cold browser font cache
on the first run, which would mean the snapshot baseline depends on cache warmth. Not chased here, and
recorded so the next person does not mistake it for their own regression.


## #267 — Chrome painted a blank placeholder where a captured component's images should be, and the screenshot kept it

**What.** Two 4-worker renders of `formats/scene/brew-launch.json`, identical code, differed on **925
of 1890 frames**. Not by a rounding error: the median differing frame moved **0.37% of its pixels**,
the worst moved **17.0%** with a **max channel delta of 189**, and what was different was **whole
product screenshots present in one render and absent in the other**. #258 called this class "rasteriser
antialiasing on a border radius, 0.001% to 0.007% of pixels, invisible". For the 4-worker gap that was
wrong. It is missing content, and it ships in the mp4.

**How it was found, and it was one crop again.** `scripts/dev/framediff` ranked the differing frames
by pixel count and wrote the worst four as stacked crops of the same region from both runs. Frame 856
showed three feature cards, each with a product screenshot, in run A; in run B two of the three cards
had lost their screenshot entirely while keeping their heading and body copy. Nothing else needed
arguing after that. This is the second time in two days that one crop settled what three rounds of
reasoning about frame indices could not.

**Root cause.** Chrome defers image decoding off the raster thread ("checker imaging") and paints a
blank placeholder until the decode lands, and the compositor may draw a frame before every stage has
finished. Neither is visible to anything the capture can ask:

- `renderFrame(n)` has returned.
- The double `requestAnimationFrame` has fired.
- `document.images` all report `complete && naturalWidth > 0`. An audit added for this, printing every
  frame where any image was not ready, printed **nothing** across a whole render while the render was
  still dropping screenshots.

So the capture had no signal at all, and simply screenshotted the placeholder.

**Why four workers cost four times as much.** The failure is a race against wall time, and every worker
browser runs it independently. Measured on the entrance of a three-card beat, sampling the mean
luminance of one card's region per frame:

```
frame  worker  Y      frame  worker  Y
853    w1      13     853    w3      13     <- card region empty
854    w3      14     854    w1      14
855    w0      15     855    w3      76     <- correct
856    w1      94     856    w0      14
857    w2      14     857    w2      14
858    w3     126     858    w1     126
      run A                    run B
```

The correct curve is 36, 57, 76, 94, 111, 126. In both runs each worker's **first** frame in the
entrance window is blank and its later frames are right, so four workers lose four frames and one
worker loses one. That is the whole 373-to-1078 gap: the same defect, paid once per browser.

**What did not fix it, and it is worth knowing.**

- **A warm sweep.** Every worker ran `renderFrame(f)` over the entire timeline before capturing, so no
  layer could be seen for the first time during a kept frame. The blank frames stayed. The defect is
  not first attach; it is raster.
- **Waiting longer.** Running `renderFrame` + a double rAF twice before the screenshot turned "always
  blank on first visit" into "sometimes blank on first visit". It moves the odds. It cannot close a
  race.

**Fix.** Two Chrome flags in `allocOpts`, `internal/scene/scene.go`:

```go
chromedp.Flag("disable-checker-imaging", true),
chromedp.Flag("run-all-compositor-stages-before-draw", true),
```

The entrance window then produces the exact ramp 36, 57, 76, 94, 111, 126 with no holes, and the
whole-render difference between two renders falls from **925 differing frames to 250**, worst case
from **17.0% of pixels to 1.8%**. Measured cost: none. Two timed renders, 76s with the flags against
84s without, on a loaded machine; the flags are not the expensive part of a capture.

**Which gate catches it.** None, and that is honest rather than fixed. `make probe` compares the DOM
and stays green through all of this, because the DOM was always right. The tool below is what catches
it, and someone has to run it.

## #268 — the worker that drew a frame was decided by a race, so no two renders could be compared

**What.** Capture workers pulled from one shared job channel, so frame 856 was drawn by a different
browser in every render. Verified: the dedup representative map was byte-identical between two runs
and the worker column was not.

**Why it matters even though it changed no pixel by itself.** It is the amplifier's accomplice. It
makes every measurement of the kind above impossible, because a frame that differs between two runs
could always be blamed on "a different browser drew it", and there was no way to rule that out.

**Fix.** The jobs are dealt round-robin before any browser starts (`perWorker[i%workers]`), not raced
for. Same balanced interleave, decided once. Two renders now produce byte-identical frame maps, which
is what let the residue below be attributed with confidence.

## #269 — still open: a second cause, and it is not antialiasing either

With the raster race closed and the worker assignment fixed, **250 of 1890 frames still differ between
two renders**, and the frame map is identical, so the *same browser* drew each of those frames in both
runs. The residue is therefore nothing to do with workers, and it is what #258 measured as 373 at one
worker.

**It is two things, not one.** The 250 frames sit in two spans and three strays:

| span | frames differing | typical ratio | typical max delta |
|---|---|---|---|
| 666-834 | 125 | 0.005% to 0.6% | 14 |
| 1098-1259 | 122 | ~1.8% | ~150 |
| 105, 149, 153 | 3 | tiny | tiny |

The first span is the small, plausibly-invisible class #258 described. The second is not: it is
consistent across 122 frames of one beat, at the same magnitude every time, which is a systematic
difference rather than noise.

**It is bigger than #258 recorded.** Median differing frame moves 0.47% of its pixels; the worst moves
1.8% with a max channel delta of 171. Looking at the worst frame (1105): the content is identical, and
the whole integrations grid sits about **60 supersampled pixels higher** in one run than the other,
under a headline that has not moved. That is a position difference of roughly 30 output pixels on a
single frame mid-entrance. It is not a rounded corner and it is not invisible; on a slide-in it would
read as a stutter.

The shape of it points at motion driven by wall time rather than by frame number: something is eased
toward its target by the browser after `renderFrame(n)` has set it, and the double rAF advances it by
an unpredictable amount. That is a hypothesis. It has not been proven, and the fix would live in
`core/` or `scene.html`, which this branch does not touch.

**What #258 should be corrected to say.** "The 373 is understood and closed, it is invisible
antialiasing" is not supported. One crop of one frame was used to characterise 373 frames, and the
worst of them are two orders of magnitude larger than the number that crop produced. The class is open.

## How to re-measure any of this

```bash
VAWE_KEEP_FRAMES=1 VAWE_FRAME_MAP=/tmp/mapA.txt ./bin/vawe formats/scene/brew-launch.json
cp -R "$(printf %s "$TMPDIR")frames_brew-launch" /tmp/runA
# repeat for run B
go run ./scripts/dev/framediff -a /tmp/runA -b /tmp/runB \
  -mapa /tmp/mapA.txt -mapb /tmp/mapB.txt -crops /tmp/crops -csv /tmp/diff.csv
```

`-crops` writes the worst frames as the two runs' versions of the differing region, stacked. **Read
them.** Every wrong conclusion in this family came from reasoning about frame numbers instead.

**Verified independently after merge, and the numbers are better than the agent measured.** Two fresh
4-worker renders on main: frame maps byte-identical, **100 of 1890 frames differ**, ratio median
0.00025% and max **0.00207%**, max channel delta **8**. The worst remaining frame is the "Brew"
wordmark, and the two versions are indistinguishable: glyph-edge antialiasing.

**The 122-frame span above did NOT reproduce** in that pair of runs. One pair of runs is not proof it
is gone, and it is left recorded rather than closed. What is settled is the deferred-decode defect,
which is real, which was losing whole product screenshots, and which is fixed.


## #270 — two passes tuned the wrong half, because each inherited the last one's ceiling

**What.** The lightfield reference reproduction was washed out. Pass one concluded "the ceiling is the
blend mode". Pass two inherited that, split the composite into seam and sheen, improved the aggregate,
and left the colour untouched: mean green stayed +7.8 and the magenta sample got WORSE, from dE 36.7 to
59.1, while the block error improved.

**Root cause of the miss, which is a method and not a bug.** Nobody measured the halves separately. One
command settles it: render the colour field with `shadow.seam 0 --shadow.sheen 0`, so nothing composites
over the ramp, and it is ALREADY brown at g +6.6, b -8.3, chroma 0.91x, within noise of the finished
field. The composite was never losing the saturation. Two passes of work went into the half that was
innocent, on the strength of a sentence written by the first pass and quoted by the second.

**The fix, once the right half was named.** Green high with blue low is a HUE error, and `saturate()`
cannot add blue: sweeping `vivid` to 1.75 drove chroma to 1.32x and every sample dE through the roof,
which is what rules a knob out rather than an opinion about it. Three stops moved.

| | before | after |
|---|---|---|
| sample mean dE | 27.5 | **12.7** |
| deep red | 22.9 | **5.7** |
| magenta | 59.1 | **26.3** |
| bloom | 20.1 | **11.0** |
| block error | 17.71 | **16.58** |

**The ceiling that IS real, stated rather than hidden.** Chroma stays at 0.90x. The shortfall is not
uniform across the field, so the one global control cannot close it without breaking every hue that is
now right. That is a different claim from "the blend mode is the ceiling", and it is one a measurement
supports.

**The transferable rule.** A ceiling reported by a previous pass is a hypothesis, not a finding. Before
inheriting one, run the cheapest experiment that could refute it. Here that experiment was two flags and
four seconds, and it moved every number on the board.

## #272 — the playground found two engine bugs in its first hour, which is the argument for it

The generator playground went up so people could turn the dials in a browser. Its first interaction
test found both of these, and neither was visible from any gate.

**`count` was accepted and discarded above about 42.** `rings` grew each band by a fixed jittered step
and stopped at a hard reach, so the loop's `size < 260` guard was the real limit, not the caller's
`count`. The schema advertised `min 1, max 400`. Measured: 8 to 40 drew what you asked, 60 drew 42,
120 drew 42, 400 drew 42. Every value above the cap was taken and thrown away, silently, which is the
most-logged bug class in this file.

Fixed by deriving the step FROM count, so the whole declared range means something: 400 now draws 400.
Then checked the other two builders rather than closing at the call site, because that is the #214
recurrence: `slats` and `shards` both scale properly and neither needed a change.

**The preset that exposed it had been fitted against the bug.** `tide` says `count: 120` and had always
drawn 42. Its real 120 rings read better than the 42 did, so the preset stands as written, and now what
it says is what it draws.

**`will-change` on every element made the picture never settle.** A field carries up to 400 elements and
each one carried `will-change:transform,opacity`, so Chrome was asked for 400 compositor layers. It
cannot keep that many rastered, so it cycles which ones it paints: consecutive screenshots 90ms apart
differed forever, the PNG oscillating between 200K and 270K. With the hint removed the same field is
byte-identical from the eighth attempt on. **A promotion hint the browser cannot honour is worse than
none**, and this is the same family as #267, where deferred raster cost whole product screenshots.

**TESTED, and it is not the explanation. Do not spend the experiment again.**
`formats/scene/scene.css:16` puts `will-change: transform, opacity, filter` on EVERY `.hs-layer`, which
is the same hint at scene scale, so it was the obvious suspect for #269's residual. Two renders with it
and two without, `brew-launch`, same machine:

| | frames differing | median ratio | median max-delta |
|---|---|---|---|
| with (as shipped) | 110 | 0.00104% | 5 |
| without | **85** | **0.17693%** | **12** |

Fewer frames differ and the ones that do differ MORE, which is not a win, and every magnitude here is
tiny (worst frame 0.2% of pixels, max channel delta 16). The measurement's own noise is the size of the
effect: an earlier pair of runs on unchanged code gave 100 rather than 110. So `scene.css` is unchanged,
deliberately. Changing shipped behaviour on evidence this weak is how a gate invents findings.

What is still true: the lightfield case was unambiguous (never settles versus byte-identical from the
eighth attempt), because 400 promoted layers is a different order of magnitude from a scene's dozen.
The residue in #269 remains unexplained.

## #273 — a screenshot taken at `load` is a picture of the browser's timing

`stableShot` (`scripts/author/lightfield-render.mjs`) shoots until two consecutive frames are
byte-identical, and throws when that never happens. Before it, `tide` "spent a day looking broken when
only its portrait was": a blended, masked field can return a valid, correctly-sized, almost-black PNG
because the compositor handed back a frame before everything rastered. Every fidelity number measured
off such a shot is a measurement of Chrome, not of the generator.

Waiting longer is not the fix and #267 already proved it: there, waiting turned "always wrong" into
"sometimes wrong" and settled nothing. Waiting for the picture to STOP CHANGING is a different claim
and a checkable one.

**And it threw immediately, on `tide`, which is how #272's `will-change` bug was found.** A tool that
fails loudly on the first thing it is pointed at has earned its place.

## The block option contract, and two dead props it exposed

70 block families now declare what they accept (`blocks/schema.mjs`, gate `scripts/gates/block-schema.mjs`).
A JS default is a value; a schema entry is a contract, and only a contract can make a control or refuse a
caller. Reading 70 factories closely enough to declare them found the following.

## #274 — `loadingBar` accepts `color` and never reads it

**What.** `blocks/dev.mjs`:

```js
export function loadingBar({ …, color = T.greenBright, settle = T.green, label, done = true } = {})
```

The fill paints with `settle`. `color` appears nowhere in the body except as the property NAME
`color:` on unrelated text layers. A caller that sets `color` gets the default green fill and no
message.

**Root cause.** The comment above the factory records that the fill used to be an entrance and was
rewritten to be driven. The rewrite dropped the reference and kept the parameter. Nothing checks that
a destructured parameter is read, so the signature kept documenting an option that had stopped
existing.

**Class.** Framework bug, and the repo's own worst one: silent substitution. The engine accepts input
and then ignores it.

**Fix, when someone takes it.** Either paint the fill with `color` and let `settle` be the landed
state it is named for, or delete the parameter. Do not leave both.

**What catches it now.** Nothing automatic. `scripts/gates/block-schema.mjs` lists it in `OMIT` with
that reason, so it is visible and named rather than silently absent from the option table. A real
check would be a dead-parameter rule over the factory bodies, which is a natural extension of
`blocks-audit.mjs` and is not in this pass.

## #275 — `toast` accepts `body` and never renders it

**What.** `blocks/ui.mjs`. The file's own comment says the alert family (`notification` · `toast` ·
`callout` · `banner`) "now shares ONE vocabulary: `title` and `body`". `notification` renders `body`.
`toast` destructures it and draws `message`, `action` and the icon only.

It is worse in the stacked form: `toast({items})` recurses into the single-card form passing
`body: it.body`, so a caller who fills in bodies for three stacked snackbars sees three snackbars with
no bodies and no warning.

**Root cause.** The shared vocabulary was adopted by adding the name to the signature. Adding a name
is not adopting a vocabulary; rendering it is.

**Class.** Framework bug. Same silent-substitution class as #1, and it is the more surprising of the
two because the surrounding comment promises the opposite.

**Fix, when someone takes it.** Render `body` under the message, as `notification` does, or drop it
from both the signature and the `items` row and correct the comment.

**What catches it now.** As above: `OMIT` in `scripts/gates/block-schema.mjs`, plus an explicit note
in the `UI_SCHEMAS.toast` table saying why there is no dial for it.

## #276 — A range that was tighter than the shipped catalog

**What.** The first draft of `CORE_SCHEMAS.splitScreen.h` set `min: 100`, reasoning from the
container's own geometry. The catalog's own `splitScreen` row ships `h: 96`, a two-row split of two
`listRow` panes, which is correct and normal.

**Root cause.** The range was derived from what the block looks like at its default size instead of
from what the block does. In a row split, `h` only feeds the divider and the pip inset, so a short
split is legitimate; only a column split has to clear the gap.

**Class.** Gate gap, caught before it shipped, and worth logging because it is the failure mode
CLAUDE.md warns about directly: a gate that measures the wrong thing manufactures defects, and the
author pays by deforming a good design until the number moves. The check that caught it is the one
that runs every catalog example through its own table, which is the cheapest way to keep a declared
range honest.

**What catches it now.** `scripts/gates/block-schema.mjs`, `catalog-fails-schema`.

## #277 — Ranges that could not be derived, and are wide on purpose

Recorded so nobody reads a wide bound as a considered one:

- `statBig.to` / `statBig.from` / `statCard.to` / `statCard.from`: `±1e12`. A count layer renders any
  finite number and compacts above 1e6. There is no engine floor or ceiling to find.
- `installCard.ratings`, `avatarStack.extra`, `reactionBar[].count`: `0 .. 1e9`. Sanity bounds, not
  measured ones.
- `activeFrom` / `activeTo` / `active` on `tabBar` and `stepFlow`, and `searchEngine.clickIndex`:
  `0 .. 20`. The factories clamp these to the real item count themselves, so the declared ceiling is a
  sanity bound over a value the code already makes safe.
- `anim` and `enterDur` on `card`, `codeBlock` and the three sleek surfaces: `anim` is declared `str`
  rather than `enum` because its vocabulary is the ENGINE's animation registry, which lives outside
  `blocks/`. An enum copied by hand here would be a fourth copy of a list that already drifts. If the
  engine ever exports its animation names, this should become an enum reading that export, the way
  `codeBlock.theme` reads `CODE_THEMES` and `callout.tone` reads `TONE_NAMES`.

## #275 — the deploy failed on a directory `.dockerignore` excluded, and nothing local could see it

**What.** Adding the playground meant the image needed `blocks/`. The Dockerfile copied it, every gate
passed, the site built locally, and the deploy failed in 16 seconds:

```
ERROR: failed to compute cache key: "/blocks": not found
Dockerfile:31  >>> COPY blocks ./blocks
```

`.dockerignore` listed `blocks`. The repo has the directory, so nothing on this machine could tell.

**And I verified the wrong thing before pushing.** I replayed the Dockerfile's own COPY lines into an
empty tree and ran the publish step there, which passed, because copying from the filesystem never
consults `.dockerignore`. A simulation that skips the one file that decides the answer is not a
simulation of anything. This is the session's recurring lesson in a new costume: measure the thing, not
a convenient stand-in for it.

**A second, larger bug found while looking at the deployed site rather than the local one.**
`scene.html` loads `/formats/scene/scene.js` and `scene.css` by absolute path, and `site-engine.mjs`
shipped only the html. **Both were 404 in production**, so `/editor` and the live previews on `/blocks`
had been loading a page whose engine never started, behind a 200. It worked locally because those files
were already in `public/` from an earlier copy. The publish step reads the directory now instead of
listing two files, and the Dockerfile copies the directory rather than two paths out of it.

**The precedent was already in the file that caused it.** `.dockerignore` carries a comment saying
`docs-site` had been listed there, so the build could not see it and `/docs` could never have worked in
production. Same file, same mistake, one directory over, with the explanation sitting three lines above.

**Fix.** `scripts/site/docker-context-check.mjs` (`make docker-check`, in `make review`): read the
Dockerfile's COPY lines, apply `.dockerignore`, and fail on anything the build asks for that the context
will not carry. No Docker needed, runs in milliseconds.

**Its second version measured the wrong thing, and that is the real lesson here.** It asked the
FILESYSTEM whether a file exists. The build context is a GIT CLONE. Six pictures named by published
scenes sat on the developer's disk, were copied by the Dockerfile, were re-included by `.dockerignore`,
and were simply not on the server, because `assets/brands/**` is gitignored and they had never been
committed. The four marks that DO ship were force-added at some point, which made the mechanism look
proven. Existence is asked of `git ls-files` now.

That is three times in one session: a stand-in measured instead of the thing. An mp4 hash instead of the
frames. A filesystem copy instead of `.dockerignore`. A filesystem check instead of the clone. Each time
the stand-in agreed with the truth right up until it mattered.

**And the deploy had been failing for twelve days before any of today's work**, since the commit that
added the scene-asset check on 2026-07-17. That check is correct and it fails the build for the right
reason; nothing ever told anyone, because a red deploy in Coolify does not reach the repo.

**Its first version invented a finding**, reporting `assets/brands`, which has been deploying for
months: the directory is ignored and four marks under it are re-included by `!` rules, so COPY carries
exactly those four. Fixed before shipping, because a gate that cries wolf about working code is worse
than no gate. Pinned both ways: with `blocks` restored to `.dockerignore` it fails and names it; without
it, all 15 COPY sources pass.

## A. A fidelity metric that samples only the lit half

**What happened.** The `ref` preset scored a mean sample distance of 12.7 against
`refs/lightfield-ref.jpg`, every other number agreed, and the human who asked for it said it did not
match. The reference's shadows are cool: `rgb(0,2,11)` navy down the right third, `rgb(23,12,35)`
violet in the dark lower left. The render's were `rgb(11,4,4)` and `rgb(83,5,12)`, both warm.

**Root cause.** All four sample points had been chosen in bright areas, because that is where a
palette is easiest to read. Everything else the tool printed was a mean over the whole frame, and a
mean over a mostly-lit picture is a report on the lit part. There was no number anywhere that could
come out wrong when the shadows were wrong.

**Why the fix was not obvious.** Adding shadow sample points would have fixed this image and nothing
else, because a sample point is a coordinate and coordinates do not transfer between references.

**Fix.** `lightfield-compare.mjs` now cuts the frame into an 8x5 grid and splits the cells into
shadow, mid and highlight bands using the REFERENCE's luma, never the render's, so a field that lost
its shadows cannot redefine what a shadow is and then pass. Each band reports dE, its worst cell, and
warmth as `r - b` for both pictures. Warmth is reported because dE cannot tell a violet miss from a
green one, and warm-versus-cool is the axis an eye grades a shadow on.

**The number that proves the old number was empty.** After the defect was fixed, the mean sample
distance went from 12.7 to 12.4. It never had an opinion. The shadow band's warmth error went from
+14.8 to +6.5, and the right-edge sample from `#050403` (r-b +1.5, warm) to `#06060d` (r-b -7.1),
against a reference at -9.0.

**Which gate now catches it.** `lightfield-compare.mjs`, TONAL BANDS. Every mean is printed beside
its worst cell.

**The general rule.** This is `docs/MISTAKES.md` #262 in a third costume. A metric that averages, or
that samples where the subject is easy to read, cannot see the defect it was written to catch. When a
human rejects something every number passed, the first suspect is the sampling, not the render.

---

## B. One colour role doing two jobs, and the measurement that proved it

**What happened.** The obvious fix for warm shadows was to make `ground`, the colour the light falls
away into, violet. It made the temperature right and the picture worse.

| `ground` | shadow band warmth error | shadow band dE | brightest mid cell, r-b |
|---|---|---|---|
| `#000202` | +14.8 | 28.0 | 133 |
| `#12082a` | -2.6 | **42.2** | **55** |

**Root cause.** `ground` is not only the backdrop. It is also the far stop of the body gradient,
mixed with `deep` at 35% and 70% across the frame, so a violet ground drags the LIT field violet too.
One name, two jobs, and the two jobs want different colours.

**Fix.** A new role, `colour.shade`: ambient fill, blended with `screen`, sitting above the colour
field and below the pattern because fill is light and the blind occludes it like any other light.
Screen lifts black to exactly that colour and leaves white exactly white, which is the physical
reason real photographs have warm light and cool shadows at once. `#000000` is the exact identity, so
the dial removes itself at its default and emits no layer.

**What it does not do.** It cannot fix a region that is red because of where the blobs are. The worst
cell in `ref` is unchanged: `#1a0818` in the reference against `#5c0817` here, because the `deep`
blob genuinely sits in that corner.

**The general rule.** When a dial fixes the thing you asked about and breaks two things you did not,
check how many jobs it has. A role used in two places is not a dial, it is a coupling.

---

## C. A constant fitted to one image, imposed on every image after it

**What happened.** Two of three reference photographs came out with three hard-edged ellipses across
them that nothing in the palette could hide.

**Root cause.** How fast a bloom lobe fades was a module constant, `RAMP = { mid: 0.85, pos: 30, end:
80 }`, and it carried a comment saying it was deliberate and measured: on `refs/lightfield-ref.jpg` a
tight ramp scored 18.13 where a gentle one scored 18.60. That comment was true. That image really
does have lobes with edges you can point at. The constant was correct and the generalisation was
never made, so every later field inherited one photograph's lighting.

**Fix.** `colour.spread`, 0 to 1, where 0 is the fitted ramp exactly and 1 melts the lobes into one
mass. The field the constant was chosen for does not move by a byte.

**The general rule.** A fitted constant is a fitted constant even when the comment above it is
excellent. The comment records that it measured better THERE; it is not evidence about anywhere else.
When a generator can only draw one picture, look first at whatever was measured once and then frozen.

---

## D. A prominence filter with a fixed pass count

**What happened.** The new band-counting metric reported 292 bands for a picture with twelve panels.

**Root cause.** It counts local maxima in a column-luma profile and collapses the extrema chain until
every remaining swing clears a prominence floor, and the collapse loop was written
`for (let pass = 0; pass < 64; pass++)`. A profile made of solid silhouettes has flat plateaus, a flat
plateau throws off hundreds of near-equal extrema, and 64 passes left most of them in. The loop hit
its cap and returned a number as if it had finished.

**Fix.** Bound the loop by the number of extrema, which is the real bound, since each pass removes
two. The same picture then reported 10 against the reference's 12.

**The general rule.** An iteration cap that can be reached in normal use is a silent wrong answer.
Bound a loop by the thing that makes it terminate, or make hitting the bound loud.

---

## Also found, not fixed

`scripts/author/lightfield-fit.mjs` imported `open`, `W` and `H` from `lightfield-render.mjs`, which
exported none of them, so the tool could not run at all and nothing said so. `open()` now exists (one
browser, many option sets, one screenshot decoded at every requested size) and `lightfield-shot.mjs`
shares its page shell rather than writing a second copy: two pages is two pictures the moment either
copy is edited. The rest of `lightfield-fit.mjs` has not been re-run end to end and its cost function
still has no shadow term.

The `make lightfield` loop hardcodes `for p in ref tide fern` and does not know about the two new
presets. The Makefile was out of this pass's territory.

## #276 — the silhouette is per-element, and the reference's is one landscape

Attempted and reverted, twice, and recorded so the next attempt starts past it. `colonnade` reproduces
ref-b's panels, hairlines and bloom, and its dark masses are separate rounded boxes where the reference
has one continuous undulating ridge with the panel seams drawn OVER it.

`envelope.softness` fades an element along its own axis, which cannot curve a top edge: the shape stays
a rectangle and a row of them reads as a bar chart. Making the mask radial rounded the tops and bit dark
notches out of the base, because the ellipse curves the anchored end too. Making the ellipse taller
fixed the notches and flattened the fade back into hard rectangles, which is where it started.

**The gap is structural, not parametric.** A landscape is one curve sampled per column; an envelope is
one extent per element. No value of a per-element dial produces the first from the second. Whoever picks
this up should add a field-wide silhouette that elements are drawn against, rather than turn softness up
again.


## #277 — the randomiser could roll an illegal pair, and the person clicking got the blame

**What.** `lightfield` refuses a dial the chosen structure cannot express: `rings` has no seam WIDTH and
no left-to-right axis, so `shadow.seamWidth` and `envelope` on a ring field throw and name the patterns
that do take them. That is the right design and it is a declared table, `HONOURS`.

Then the playground grew a randomiser, and a per-section roll that changes `pattern.kind` while
`shadow.seamWidth` sits at a slats-only value produces exactly that illegal pair. The user clicked a
button and got an error about a combination they never chose.

**Fix, derived rather than invented.** `normalise(opts)` is the repair the table was always able to
drive: every field the chosen structure cannot honour goes back to its declared default, and nothing
else is touched. It is not a silent substitution, because the value being dropped is one the structure
has no way to express. The registry carries it as an optional `normalise`, and the page routes EVERY
option change through it, so a dial, a preset, a roll and a section roll cannot differ on this.

`resolve` gained a `skipHonours` flag for one caller only: `normalise` has to fill and range-check
BEFORE the cross-field rule, because that rule is the thing it is repairing. It re-runs the real check
at the end, so a wrong repair table fails loudly instead of shipping a bad option set.

**The general lesson.** A generator that validates strictly needs a way to say what a plausible input
SHOULD have been, or every caller that composes options mechanically has to learn its private rules.
Strictness without repair pushes the work onto whoever is least able to do it.

## #278 — the playground did not fit on a screen, measured

Before, on the live page: 2.4 screens at 1440x900, 2.7 at 1280x800, 3.1 on a phone, and **the preview
started 455px down and ended at 914px against a 900px viewport**, so the thing the page exists for was
never fully visible. The panel was one unbroken 1442px column of 28 rows, so the DOCUMENT grew to
whatever the tallest generator needed.

After: **1.4 screens**, preview 251px to 851px, entirely above the fold. The fix is that the panel
scrolls inside itself rather than growing the page, which is the shape `.ed-main` on /editor already
used. Buttons went 5 to 2: three copy buttons of equal weight made someone choose before they knew the
difference, so `copy options` is the button and the other two are one keystroke away, and `reset` went
because picking a preset already resets and the chips are always on screen.

Also: a backdrop has no intrinsic ratio, so an injected field fills the row instead of sitting in a
16:9 box with dead space under it. A scene preview keeps its aspect, because a film does have one.

**Two things the measurement caught that the eye did not.** Filling the row is right BESIDE a panel and
wrong ABOVE one: stacked on a phone the clamp resolved to 544px of preview and pushed the page back to
3.1 screens, worse than before the change. Height is a share of the viewport under 900px now. And the
`pill` header variant is positioned ABSOLUTELY, to float over a hero band this page does not have, so it
landed on top of the first heading. A header in flow cannot collide with the content under it.

**Then `primary` on eight dials took it the rest of the way**: 28 controls to 8, panel 1442px to 624px,
1.2 screens on a laptop and 1.8 on a phone. It is declared rather than inferred, and a generator that
declares none still shows everything, which is right for the 63 of 71 with eight controls or fewer.

**And the page went dark**, because the generators are dark light-fields and a white frame fights its
own picture. Token-level: the route redefines `--bg`, `--surface`, `--ink` and friends on one wrapper,
so the header, the panel and every input follow without a single component being overridden.

**Blocks left the playground.** 70 families with declared schemas is a good contract and a bad picker:
a block is a scene fragment rather than a picture, so previewing one boots a whole scene, and 71 entries
buried the one thing people came to turn. The schemas and their gate stay; `blocks/` came back out of
the image and the Dockerfile, which is 260K and one COPY line fewer.

## #279 — one score for five looks could not say which one was wrong

`lightfield` was one generator with five presets and ONE fidelity number, taken against one photograph.
That number read 12.7 while a human said "that is not it", and even if it had been right it could not
have named the look that regressed, because four of the five were never measured at all.

**Each look is its own registry entry now**, with its own reference. One implementation underneath: a
look is a name, a preset, a reference, and a NARROWED VIEW of the same schema, and the narrowing comes
from the generator's own `HONOURS` table rather than a second list.

The first run says what five presets behind one average never could:

| look | block error | shadow warmth vs reference |
|---|---|---|
| blinds | 20.0 | +11.3 |
| **ember** | **64.2** | +4.4 |
| colonnade | 27.3 | +9.7 |
| tide | no reference | |
| fern | no reference | |

`ember` is three times the error of `blinds` and was invisible inside a single mean. A look with no
reference is REPORTED as such and not scored, because scoring against nothing is how a green tick gets
attached to a picture nobody has compared.

**Narrowing also removes the bug class rather than catching it.** A `rings` look does not show
`shadow.seamWidth`, so the illegal pair that used to throw in someone's face (#277) cannot be built.
`normalise` stays as the backstop for the paths that still can.

## #281 — the library is the page, and the cards are the real thing

The playground picked a generator from a dropdown, which is fine for one and useless for twenty-seven.
It is a wall of cards now: browse, open one, turn its dials, go back. Two states rather than one,
because a grid PLUS a full-size preview PLUS a panel put the preview back below the fold at 486px, which
is the exact thing the page had just been fixed for. Measured after: the library is 900px on a 900px
screen, one screen exactly, and the tuner is 1.25.

**Every card renders the actual generator**, still, at card size. Not a poster. A poster is a second
artefact that has to be kept in step with the code, and the last time this repo had one of those,
site/public sat 77 files behind core/ and nobody could tell (#271). A field is a handful of gradients,
so a wall of them costs almost nothing, and none of them animates.

The honest cost: `fern` is a genuinely dark look, so its card is nearly black and says little. That is
the real picture, and faking a brighter one would make the library lie about what you are picking.

## #280 — a preview that animates cannot be judged

The playground drove `--t` from a rAF loop, so the field was always moving. A moving picture is the one
thing you cannot compare to a still reference, and the page exists to be looked at closely.

It writes `--t` ONCE now, and the clock is a slider parked at zero. Nothing moves until it is dragged.
That keeps `motion.kind` honest: freezing alone would have left it a dial with no visible effect, which
is the silent-substitution shape this repo logs more than any other. Verified rather than assumed: the
markup is byte-identical 700ms apart and `--t` reads 0.000.

---

## Waivers for `doc-refs`

`make doc-refs` checks that every command and path a doc names exists. This file is the one place
that legitimately names things the repo does not have, because several entries record a tool being
DELETED, and the entry has to say what was deleted. A waiver here means the sentence is true and the
thing is gone on purpose. It never means a reference was not worth fixing: the nine that were merely
stale were corrected instead.

<!-- doc-refs-allow: make schema-drift · #256 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: make roadmap-drift · #256 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: make sfx · #256 quotes the stale name it was chartered to correct -->
<!-- doc-refs-allow: make brandkit · #256 quotes a target removed with the templates -->
<!-- doc-refs-allow: core/shaders.js · #256 quotes a path that moved two refactors ago -->
<!-- doc-refs-allow: core/layers/shader.js · #256 quotes a path that moved into core/surfaces/ -->
<!-- doc-refs-allow: core/layers/paint.js · #256 quotes a path that moved into core/surfaces/ -->
<!-- doc-refs-allow: make visuals · #NNN records a gate that was later culled -->
<!-- doc-refs-allow: scripts/gates/visual-vocabulary.mjs · the entry records this gate's own deletion -->
<!-- doc-refs-allow: make flicker-check · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/predict.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: scripts/dev/rules-audit.mjs · cut in cc2dfc2 with five other engine-only tools -->
<!-- doc-refs-allow: formats/scene/tokenjam-launch.json · the entry records this scene's deletion -->
