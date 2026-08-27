---
when: "recreating a specific reference video end to end (\"make ours look like this\")"
answers: "the ordered loop: measure → capture → build (cinematic) → score → beat-sync → verify · the honest 1:1 ceiling"
group: story
---

# RECREATION: recreate a reference video, end to end

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
- **Map the beats.** `make filmstrip VIDEO=ref.mp4` → a labelled contact sheet. One idea per beat;
  note the copy, layout, palette per beat.
- **You will sample the middle of the beat. Don't.** It is the single most repeated failure here: the
  middle shows the settled state and hides the motion that carries the craft (MISTAKES #124), and for a
  continuously moving field it is the exact frame where a wrong speed looks right (#155). Sample
  the **entrance** (high fps, first ~0.5s): is the word oversized + blurred, settling (a dolly-in)?
  the **exit**: does it scale UP + blur to leave (a dolly-out)? a **zoomed crop of the text**: flat
  fill or a GRADIENT / colour-wave? For OUR renders, [`make reveal`](../../scripts/author/reveal.mjs)
  does this automatically per beat.
- **Measure the signature motion.** `make measure VIDEO=ref.mp4 FROM=… TO=…` → duration + nearest
  engine preset ([MEASURE.md](MEASURE.md)). A tight fit is an authorable number; a loose fit means it
  is not one tween (typing, two stacked tweens, a mask), re-author by intent.
- **Read the dominance by LOOKING, and know site ≠ film.** A brand's live site and its launch film can
  disagree: brew.new's *site* is dark-first, but its launch *film* rides cream product surfaces, so the
  film is cream-dominant. Sample the reference's own frames (`ffmpeg scale=1:1` per timestamp → a
  dark/light timeline); author the theme to the FILM you are recreating, not to whatever the homepage
  happens to be. Dominance is never a field (MISTAKES: dominance-by-looking).

### 2. Get the real material (capture, never approximate)
- **Inventory the site.** `make sections URL=… NAME=<brand>`: a screenshot + a ready `make capture`
  command per section. **Look at the shots.**
- **Capture live UI.** `make capture URL=… SEL='…' NAME=<brand> LABEL=<x>` lifts a real component into
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
  the ESP grid; on-brand → the collage. A claim with no artifact fails the value gate (MISTAKES #129).
- **Big-type-on-black is a hook or a transition, never the whole film.** A launch film SHOWS the product.
- **Density = information per frame** (a real surface + a hero line + support), not cuts per second.
- **Use most of what you captured.** 15 surfaces captured and 1 used means the film substituted type for
  the product. Walk the product journey (prompt → generate → edit → send → integrate → results).
- **Longer is fine if every beat earns its time.** A dense 45s beats a hollow 20s; a boring 45s beats
  nothing. The bar is the value gate, per beat.

### 3. Build it (the aliveness the reference has, our primitives)
- **Centered + constant motion, NOT asymmetry.** The reference settles centered and stays in motion
  the whole time; the motion gives the dynamism, not an off-centre layout (MISTAKES #124/#125). Reach
  for the cinematic director: `make cinematic D=<file> WRITE=1` adds a smooth camera push + a per-hero
  **dolly** (oversized → settle → bigger-out + motion-blur) derived from your own beats.
- **Smooth the camera.** One monotonic move, no reversals; `ease:"linear"` on interior camera
  keyframes (the default easeInOutCubic zeroes velocity at each keyframe and pulses, MISTAKES #125).
- **The premium type tells:** `gradient:{from,to,angle}` fill on heroes; `typing:true` for input beats;
  `preset:"colorWave"` for a per-word accent colour-wave. (See the map in REFERENCE-STUDY.md.)

### 4. Score it (sound is part of the recreation)
- `audio:{auto:true}` derives a cue per cut, seam and sting; add a bed (`audio.music`,
  `make audio-bed`), `musicFade:{in,out}` and `musicDuck`. Every seam is cued (MISTAKES #126); typing
  uses the soft `key` voicing, not the sharp `press` (which stays for punch/flash hits).

### 5. Cut it TO the track (beat-sync)
- `make beatmap MUSIC=<track>` detects the grid; `make beatsync D=<file> MUSIC=<track> WRITE=1` snaps
  the cuts/transitions/seams/stings onto the nearest beat. A cut a few frames off the beat reads
  sloppy; on the beat it reads directed.

### 6. Verify against the reference (numbers, then eyes)
- `make reveal D=<file>`: does every beat animate IN the way the reference's does (dolly direction,
  typing, colour-wave)? `make beats D=<file> VS=<brand>`. Each beat beside its source. `make measure
  VIDEO=out/ours.mp4 EXPECT=<preset>`: does our render's motion match the number you measured off the
  reference? Then `make audit` (overlap/contrast/safe-zone). Fix data, re-render, never ship unverified.

## The honest ceiling
Two things bound 1:1 fidelity and are worth stating rather than faking:
- **The display font.** A reference's headline face is often a licensed/unpublished display type we
  don't have. Match it with the closest bundled face; do not pretend.
- **Proprietary source assets.** We don't have the brand's design files, but the shipped UI is on the
  live site, so `make capture` closes most of this gap. What is a true `<canvas>` is a screenshot.

Everything else (the motion, the sound, the timing, the real product UI) is reproducible with the
loop above. When a reference does something with no primitive, that is the next primitive to build
(log it in MISTAKES.md), not a thing to approximate.
