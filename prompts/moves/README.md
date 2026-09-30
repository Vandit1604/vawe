---
when: "you are about to write a text or panel entrance, a transition, an exit, a typing effect or an emphasis, and want the proven version instead of your first idea"
answers: "the built moves as CSS and WAAPI snippets an agent copies, grouped by job, each with its curve from curveToLinear and a 1 s clip"
group: reference
---

# prompts/moves/: proven moves to copy

Each move is one markdown file with a 10 to 40 line snippet and a 1 s clip next to it. Choose from
the clip, not the name. Copy the snippet into the page; the numbers are the ones that read well.
Every curve comes from `curveToLinear` in `core/motion/springs.js`, never from a hand-fitted
`cubic-bezier()`. The demo page each clip was rendered from is in `demo/`.

[LIBRARY.md](LIBRARY.md) lists every approved move in six groups, including the ones still to build.
This index lists the built ones, in the same groups.

## Reveal a title

| move | use when | snippet | clip |
|---|---|---|---|
| mask rise | a line of type enters from under an invisible edge; the mask box is tall enough for descenders | [mask-rise.md](mask-rise.md) | [mask-rise.mp4](mask-rise.mp4) |
| tracking collapse | a title or wordmark arrives: letters converge from wide tracking while the word sharpens | [tracking-collapse.md](tracking-collapse.md) | [tracking-collapse.mp4](tracking-collapse.mp4) |
| caret typing | a command, a prompt, a name typed in; the caret moves with each character then becomes the next element | [caret-typing.md](caret-typing.md) | [caret-typing.mp4](caret-typing.mp4) |
| letter stagger | a word lands letter by letter, 45 ms apart, on one exact curve | [letter-stagger.md](letter-stagger.md) | [letter-stagger.mp4](letter-stagger.mp4) |
| scale punch | the hero word hits from 1.4x and recoils on the overshoot curve; a full stop pops after it | [scale-punch.md](scale-punch.md) | [scale-punch.mp4](scale-punch.mp4) |
| split-flap resolve | a name or number is decided: each letter is a tile that flips through seeded glyphs on a hinge and locks left to right | [flap-resolve.md](flap-resolve.md) | [flap-resolve.mp4](flap-resolve.mp4) |
| word swap slot | one word in a held sentence rolls through 3 or 4 values and lands; the sentence reflows its width | [word-swap-slot.md](word-swap-slot.md) | [word-swap-slot.mp4](word-swap-slot.mp4) |
| blur word cascade | copy resolves word by word from blur with a slight rise; no mask, so nothing cuts a descender | [blur-word-cascade.md](blur-word-cascade.md) | [blur-word-cascade.mp4](blur-word-cascade.mp4) |

## Change between shots

| move | use when | snippet | clip |
|---|---|---|---|
| cut on motion | a moving shape carries the eye across a hard cut into a new scene | [cut-on-motion.md](cut-on-motion.md) | [cut-on-motion.mp4](cut-on-motion.mp4) |
| push with blur | a panel pushes in with a directional blur that follows its speed, set per frame | [push-blur.md](push-blur.md) | [push-blur.mp4](push-blur.mp4) |
| exit fast | the pair every beat needs: arrive fast and land soft, leave faster and shorter | [exit-fast.md](exit-fast.md) | [exit-fast.mp4](exit-fast.mp4) |
| chain beats | beats overlap: the next starts at 65% of the last and one element hands off (dot, bar, rule) | [chain-beats.md](chain-beats.md) | [chain-beats.mp4](chain-beats.mp4) |
| whip pan | the next shot is to the side: a fast sideways pan with a blur that follows its speed hides the seam | [whip-pan.md](whip-pan.md) | [whip-pan.mp4](whip-pan.mp4) |
| match cut | one shape crosses a scene change at the same place, size and angle and changes meaning (spinner ring, finished ring) | [match-cut.md](match-cut.md) | [match-cut.mp4](match-cut.mp4) |

## Point the eye

| move | use when | snippet | clip |
|---|---|---|---|
| word colour sweep | the accent runs word by word in reading order and stays on the target word | [word-sweep.md](word-sweep.md) | [word-sweep.mp4](word-sweep.mp4) |
| weight morph | one word gets heavier on a real variable-font axis; the glyphs reshape, nothing is scaled | [weight-morph.md](weight-morph.md) | [weight-morph.mp4](weight-morph.mp4) |
| marker highlight | a highlighter bar wipes behind one phrase and the text flips dark for contrast | [marker-highlight.md](marker-highlight.md) | [marker-highlight.mp4](marker-highlight.mp4) |
| underline draw | a line draws under the key word, left to right, fast in and slow out | [underline-draw.md](underline-draw.md) | [underline-draw.mp4](underline-draw.mp4) |
| bracket callout | corner brackets fly in and snap onto a word or a UI part with a small overshoot | [bracket-callout.md](bracket-callout.md) | [bracket-callout.mp4](bracket-callout.mp4) |

## Move the camera

No move is built yet. See [LIBRARY.md](LIBRARY.md).

## End a film

No move is built yet. See [LIBRARY.md](LIBRARY.md).

## Product moments

| move | use when | snippet | clip |
|---|---|---|---|
| clip expand | a panel or capture grows out of one point the eye is already on | [clip-expand.md](clip-expand.md) | [clip-expand.mp4](clip-expand.mp4) |

Re-render a clip after editing its demo: `bin/vawe moves --only <move>`.

Two rules the snippets already obey, so keep them when you adapt one: an exit keyframe has no
`from` (a `from` fills backwards over the entrance and hides it), and `var()` never goes inside the
`animation` shorthand (write the longhands; Chromium drops the whole declaration otherwise).
