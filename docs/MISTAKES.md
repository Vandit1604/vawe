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
**Fix:** keep both variants in `engine/assets/icons/` — light (`#f3f3f0`) for dark bgs, `-dark`
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

## Tool-accuracy note (see also: the survey in chat)

Tools are accurate for MECHANICAL/precise data (exact hexes, geometry, pixel histograms) and unreliable
for SEMANTIC judgment (dominance, which colour is text vs accent, what the hero means, is it plain or
patterned). Rule: **use tools to measure, use your eyes to judge.** Specifically:
- `make palette` — TRUST its dominance/bg/accent hexes; DON'T trust its `text` colour (thin strokes
  blend to gray). Read the body-text colour off the screenshot yourself.
- Any "what does this section mean / which is the hero / plain or textured" question — LOOK, don't infer
  from a script. That is exactly what mistakes #1 and #2 came from.
