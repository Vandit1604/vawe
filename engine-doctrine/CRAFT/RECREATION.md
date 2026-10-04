---
when: "recreating a specific reference video end to end (\"make ours look like this\"), or reflecting a real website section by section"
answers: "the ordered loop: measure, capture, build, score, verify; one beat per section in the site's order; what to sample; the honest 1:1 ceiling"
group: story
---

# RECREATION: recreate a reference video, end to end

A reference is pixels, not a page. The loop below turns those pixels into a page that reads as the same
film. The commands and stops are in `skills/vawe-reference/SKILL.md` and `prompts/reference-rebuild.md`.
This page holds the judgement behind them.

## The loop

1. Measure: `bin/vawe spec <ref.mp4>` writes SPEC.md (cut list, light map, text timeline, curves).
   Mark every line KEEP or CHANGE before you write code.
2. Get the real material: capture real UI, never redraw it.
3. Build light first, then camera and depth of field, then type, then detail.
4. Verify: `bin/vawe compare --page <page> --ref <ref.mp4> --at t1,t2` while you build,
   `bin/vawe coverage <ours.mp4> --ref <ref.mp4>` and `bin/vawe critique --ref` as the done check.

## Measure, do not eyeball

- Sample the entrance (first 0.5 s at 12 fps), the exit (last 0.5 s) and a zoomed crop of the text.
  The settled middle frame hides the motion that carries the craft. For a continuously moving field it
  is the one frame where a wrong speed looks right (one background matched that way ran 2.5x too fast).
- A dense strip (about 10 fps) shows a build, an overlap or a held caret. A 1 fps sheet shows states and
  you invent the motion between them. See `REFERENCE-STUDY.md`.
- A tight measured fit (`MEASURE.md`) is a number you can author. A loose fit means the move is not one
  tween (typing, two stacked tweens, a mask): rebuild it by intent.
- Track one element with `node harness/media/track.mjs <ref.mp4> --box x,y,w,h --from t0 --to t1`
  (brightness-threshold centroid, one high-contrast subject on a flat ground).
- Dominance is by looking, and a brand's site is not its film. A dark-first site can launch with a
  cream film. Match the film you recreate, not the homepage.

## Reflecting a live site

Never rewrite a site's sections by hand: you lose its taste and half its assets. Screenshot each
section, plan one beat per section in the site's order, capture the real block (logos, gradients and
copy come free), and animate it your way. A dark capture goes on a dark surface, or you keep its assets
and set the copy again in your own type. A true `<canvas>` or WebGL section cannot be captured as DOM:
use its screenshot with a slow move. Hand-write HTML only for connective tissue: hook, CTA, counters.

## Density

"Ours shows so little" is rarely too few cuts. It is frame emptiness (one word on black), telling
instead of showing, and under-using the surfaces you captured. Back every claim beat with the surface
that proves it, and use most of what you captured. Big type on black is a hook or a transition, never the
film. Details: `taste/craft/show-dont-tell.md`, `taste/craft/density.md`.

## Light

A recreation can score well on SSIM and still be wrong in the way a viewer sees first. One measured
case: the reference read 4 to 8x brighter with a diagonal field of light, and the render was mostly
black with a small glow bolted on. Match the light map first (`harness/lib/light-map.mjs`, a 16x9
low-frequency map in linear light), and check it with `compare` before you touch type.

## Camera and sound

Keep the camera one monotonic move with no reversal, and use a linear interior ease: an eased chain
zeroes velocity at every key and pulses. Cut to the track: a cut a few frames off the beat reads
sloppy, on the beat it reads directed. Copy the reference audio when you have it (`taste/craft/sound.md`).

## The honest ceiling

Two things bound 1:1: the display font (match it with the closest bundled face, do not pretend) and
proprietary source assets (a capture of the live UI closes most of the gap). Everything else is
reproducible. When the reference does something no primitive covers, that is a framework finding: report
it, do not approximate it.
