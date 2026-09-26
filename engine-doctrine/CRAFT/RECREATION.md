---
when: "recreating a specific reference video end to end (\"make ours look like this\"), or reflecting a real WEBSITE section by section"
answers: "the ordered loop: measure → capture → build (cinematic) → score → beat-sync → verify · one beat per section, in the site's order · the honest 1:1 ceiling"
group: story
---

# RECREATION: recreate a reference video, end to end

## AGENT SUMMARY

- Recreating a reference (or reflecting a live site) is an ordered loop: measure, capture, build,
  score, beat-sync, verify. Never guess from a memory of the reference.
- Capture real UI (`make media X=capture` / `make sections`); hand-write HTML only for connective tissue
  (hook, CTA, counters). Sample each beat's entrance and exit, never its settled middle frame.
- Checkable action: did you sample the reference's entrance and exit frames, not its settled middle
  frame, before authoring the beat?

You are handed a video ("make ours look like this") and there is no HTML to copy, a reference is
pixels, not a scene. This is the ordered loop that turns those pixels into a scene of ours that reads
like the same film. It ties together the measurement tools, the motion director, the capture pipeline,
the sound, and the beat-sync into one pass. Every step here was paid for by getting it wrong first;
the [`../MISTAKES.md`](../MISTAKES.md) numbers in the margin are the receipts.

> Study a reference the way an editor studies a cut: **measure it, name what it does, reproduce the
> intent**, never guess from a memory of it. [REFERENCE-STUDY.md](REFERENCE-STUDY.md) is the habit
> checklist; this doc is the ordered procedure that uses it.

## The loop

### 1. Break the reference down (measure, don't eyeball)
- **Map the beats.** `make media X=filmstrip VIDEO=ref.mp4` → a labelled contact sheet. One idea per beat;
  note the copy, layout, palette per beat.
- **You will sample the middle of the beat. Don't.** It is the single most repeated failure here: the
  middle shows the settled state and hides the motion that carries the craft, and for a
  continuously moving field it is the exact frame where a wrong speed looks right (#155). Sample
  the **entrance** (high fps, first ~0.5s): is the word oversized + blurred, settling (a dolly-in)?
  the **exit**: does it scale UP + blur to leave (a dolly-out)? a **zoomed crop of the text**: flat
  fill or a GRADIENT / colour-wave? For OUR renders, [`make dev-tool X=reveal`](../../harness/author/reveal.mjs)
  does this automatically per beat.
- **Measure the signature motion.** `make study-tool X=measure VIDEO=ref.mp4 FROM=… TO=…` → duration + nearest
  engine preset ([MEASURE.md](MEASURE.md)). A tight fit is an authorable number; a loose fit means it
  is not one tween (typing, two stacked tweens, a mask), re-author by intent.
- **Read the dominance by LOOKING, and know site ≠ film.** A brand's live site and its launch film can
  disagree: brew.new's *site* is dark-first, but its launch *film* rides cream product surfaces, so the
  film is cream-dominant. Sample the reference's own frames (`ffmpeg scale=1:1` per timestamp → a
  dark/light timeline); author the theme to the FILM you are recreating, not to whatever the homepage
  happens to be. Dominance is never a field (MISTAKES: dominance-by-looking).

### 2. Get the real material (capture, never approximate)

> **Reflecting a live SITE rather than a film? This step is the whole job.** Never rewrite a site's
> sections by hand; you'll lose its taste and ignore half its assets. Instead:
> 1. `make sections URL=… NAME=<brand>`: inventory every section (screenshot each + `sections.json`
>    with a stable selector + a ready `make media X=capture` command per block). **Look at the shots.**
> 2. Storyboard **one beat per section, in the site's order.** `make media X=capture` the real block → a crisp,
>    live `component` (target the UI cluster, e.g. `SEL='section:nth-of-type(2) [class*=illustration]'`,
>    so there's no duplicate headline over your kinetic one). Real logos, gradients, copy come free.
>    Only a true `<canvas>`/WebGL section can't DOM-capture → then use the section screenshot as a clipped
>    `image` layer with `ken`. Animate it OUR way (window / cut / camera / staggered parts); re-type copy
>    with an overlaid `type` layer, never by editing captured glyphs (purity + font faithfulness).
>    Preview any capture standalone first: `make preview HTML=<component>.json THEME=<brand>`.
> 3. Hand-write HTML **only** for connective tissue: hook, CTA, counters. Preview every hand fragment
>    before rendering: `make preview HTML=frag.html THEME=<brand>` → `/tmp/preview.png` (Read it, fix, repeat).

- **Inventory the site.** `make sections URL=… NAME=<brand>`: a screenshot + a ready `make media X=capture`
  command per section. **Look at the shots.**
- **Capture live UI.** `make media X=capture URL=… SEL='…' NAME=<brand> LABEL=<x>` lifts a real component into
  an offline, deterministic `{html,w,h}` (real logos, gradients, spacing, free and on-brand). Preview
  it standalone first: `make preview HTML=<component>.json THEME=<brand>` → read the PNG.
- **A dark capture goes on a dark surface, or re-type the copy.** A component captured from a dark
  site bakes light text; dropped on a light scene it turns invisible. Place it on a dark card/device
  frame (authentic: that is how the site shows it), or use the capture for the ASSETS only and re-type
  the copy in your own `type` layer. Never edit captured glyphs (purity + font faithfulness).
- **True `<canvas>`/WebGL sections can't DOM-capture** → use the section screenshot as a clipped `image`
  layer with `ken`, and animate it OUR way (window / cut / camera / staggered parts).

### 2b. Density: SHOW the product, don't state slogans (the biggest trap)
The failure that reads as "ours shows so little" is almost never too few cuts (measure it, a teaser
often cuts MORE than the reference). It is three things: (1) FRAME EMPTINESS, one word on a black field
carries a fraction of a full product frame; (2) TELLING not SHOWING, a claim beat ("On brand. Every
time.") with no on-screen proof; (3) UNDER-USING the real surfaces you captured. Rules:
- **Every claim beat is backed by the surface that proves it.** Revenue → the revenue UI; integrates →
  the ESP grid; on-brand → the collage. A claim with no artifact fails the value gate.
- **Big-type-on-black is a hook or a transition, never the whole film.** A launch film SHOWS the product.
- **Density = information per frame** (a real surface + a hero line + support), not cuts per second.
- **Use most of what you captured.** 15 surfaces captured and 1 used means the film substituted type for
  the product. Walk the product journey (prompt → generate → edit → send → integrate → results).
- **Longer is fine if every beat earns its time.** A dense 45s beats a hollow 20s; a boring 45s beats
  nothing. The bar is the value gate, per beat.

### 3. Build it (the aliveness the reference has, our primitives)
- **Centered + constant motion, NOT asymmetry.** The reference settles centered and stays in motion
  the whole time; the motion gives the dynamism, not an off-centre layout. Reach
  for the cinematic director: `make dev-tool X=cinematic D=<file> WRITE=1` adds a smooth camera push + a per-hero
  **dolly** (oversized → settle → bigger-out + motion-blur) derived from your own beats.
- **Smooth the camera.** One monotonic move, no reversals; `ease:"linear"` on interior camera
  keyframes (the default easeInOutCubic zeroes velocity at each keyframe and pulses, MISTAKES #128).
- **The premium type tells:** `gradient:{from,to,angle}` fill on heroes; `typing:true` for input beats;
  `preset:"colorWave"` for a per-word accent colour-wave. (See the map in REFERENCE-STUDY.md.)

### 4. Score it (sound is part of the recreation)
- `audio:{auto:true}` derives a cue per cut, seam and sting; add a bed (`audio.music`,
  `make media X=audio-bed`), `musicFade:{in,out}` and `musicDuck`. Every seam is cued (MISTAKES #129); typing
  uses the soft `key` voicing, not the sharp `press` (which stays for punch/flash hits).

### 5. Cut it TO the track (beat-sync)
- `make media X=beatmap MUSIC=<track>` detects the grid; `make media X=beatsync D=<file> MUSIC=<track> WRITE=1` snaps
  the cuts/transitions/seams/stings onto the nearest beat. A cut a few frames off the beat reads
  sloppy; on the beat it reads directed.

### 6. Verify against the reference (numbers, then eyes)
- `make dev-tool X=reveal D=<file>`: does every beat animate IN the way the reference's does (dolly direction,
  typing, colour-wave)? `make dev-tool X=beats D=<file> VS=<brand>`. Each beat beside its source. `make study-tool X=measure
  VIDEO=out/ours.mp4 EXPECT=<preset>`: does our render's motion match the number you measured off the
  reference? Then `make check GATE=audit` (overlap/contrast/safe-zone). Fix data, re-render, never ship unverified.
- **`make study REF=<reference.mp4> D=<file.json> MATCH=1`: does a beat MOVE the way the reference
  moves, not just resemble it in a still frame?** (`harness/media/match.mjs`.) Beats come from the
  film's own storyboard, or (with none) scene cuts detected in the reference itself. Per beat it writes
  a dense strip (reference row over render row, one column per sampled instant), a difference overlay
  (ffmpeg `blend=all_mode=difference`) and a mean SSIM (ffmpeg's `ssim` filter, both sides scaled to the
  render's own size), then ranks every beat worst-to-best in `out/match/<film>/match.md`. A beat scored
  against its own render reads near SSIM 1; a beat that diverges in timing or path reads low, and the
  strip/diff for that beat is where to look first. STEP=<seconds> sets the sample rate (default 0.1).
- **`LIGHT=1` with `MATCH=1`: does the beat carry the reference's LIGHT, not just its structure and
  average colour?** A recreation can score well on SSIM (same shapes moving) and on the mean-colour ΔE
  above (one averaged colour can hide a bright corner against a mostly dark frame) and still be wrong in
  the way a viewer notices first: measured on one recreation, the reference read 4-8x brighter with a
  diagonal field of light and the render was mostly black with a small glow spot bolted on. `LIGHT=1`
  adds a `light ΔE` column: the mean Lab distance between a 16x9 low-frequency light map (area-averaged
  IN LINEAR LIGHT, `harness/lib/light-map.mjs`) of the reference and of the render, one representative
  frame per beat.
- **`harness/media/light-fit.mjs`: fit a beat's light, not just measure it missing.** For a beat that
  scores badly on `light ΔE`, this FITS a replacement background on the engine's own light-field owner
  (`core/lightfield/index.js`'s `paintField`, a few large soft radial gradients as data: position,
  reach, colour, no hard edges, ever): a closed-form read of the reference's light map (brightness
  centroid for position, the most saturated bright cell for `bloom`, the furthest-in-colour lit cell for
  `mid`, the darker quartile for `deep`, the darkest cell for `ground`), then a bounded coordinate search
  over `spread`/`evenness`/`originX`/`originY` against the reference's own light map (never against the
  reference's fine detail, which this step is not trying to match), and one measured colour correction.
  It writes an `{"type":"html", ...}` background layer whose `html` cross-fades between the fitted keys
  purely as a function of `var(--t)` (a `min()`/`max()`/`clamp()` tent per key, never a CSS transition or
  animation): `node harness/media/light-fit.mjs --ref <reference.mp4> --start <s> --end <s> [--step 2]
  [--keys 4] --out <beat.lightfit.json> [--grid <compare.png>]`. Paste the written layer into the film;
  `--grid` writes the reference's light map stacked over the fit's own, to look at side by side. Run it
  again after any change to the fit and check the number moved the right way: a colour correction is
  measured, not assumed, and is kept only when it actually lowers the distance.
- **Measuring one element's move instead of guessing it from sparse frames:**
  `node harness/media/track.mjs <reference.mp4> --box x,y,w,h --from t0 --to t1 [--fps 10] [--thresh 128]
  [--dark]` (`harness/media/track.mjs`) crops the box, tracks the brightest (or, with `--dark`, darkest)
  region's centroid frame by frame, and prints `{t,x,y,scale,opacity}` keyframes plus a suggested ease
  (`easeInCubic`/`easeOutCubic`/`linear`, read off whether the move speeds up or slows down), ready to
  paste into `motion[]`. It is a brightness-threshold tracker, not a model: pick a box around one
  high-contrast subject (a cursor, a logo, a card) over a roughly flat ground.

## The honest ceiling
Two things bound 1:1 fidelity and are worth stating rather than faking:
- **The display font.** A reference's headline face is often a licensed/unpublished display type we
  don't have. Match it with the closest bundled face; do not pretend.
- **Proprietary source assets.** We don't have the brand's design files, but the shipped UI is on the
  live site, so `make media X=capture` closes most of this gap. What is a true `<canvas>` is a screenshot.

Everything else (the motion, the sound, the timing, the real product UI) is reproducible with the
loop above. When a reference does something with no primitive, that is the next primitive to build
(log it in MISTAKES.md), not a thing to approximate.
