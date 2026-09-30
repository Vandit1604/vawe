---
when: "you are about to write a text or panel entrance, a transition, an exit, or a typing effect, and want the proven version instead of your first idea"
answers: "seven moves as CSS and WAAPI snippets an agent copies, each with its curve from curveToLinear and a 1 s clip"
group: reference
---

# prompts/moves/: proven moves to copy

Each move is one markdown file with a 10 to 30 line snippet and a 1 s clip next to it. Choose from
the clip, not the name. Copy the snippet into the page; the numbers are the ones that read well.
Every curve comes from `curveToLinear` in `core/motion/springs.js`, never from a hand-fitted
`cubic-bezier()`. The demo page each clip was rendered from is in `demo/`.

| move | use when | snippet | clip |
|---|---|---|---|
| caret typing | a command, a prompt, a name typed in; the caret moves with each character then becomes the next element | [caret-typing.md](caret-typing.md) | [caret-typing.mp4](caret-typing.mp4) |
| mask rise | a line of type enters from under an invisible edge; the mask box is tall enough for descenders | [mask-rise.md](mask-rise.md) | [mask-rise.mp4](mask-rise.mp4) |
| clip expand | a panel or capture grows out of one point the eye is already on | [clip-expand.md](clip-expand.md) | [clip-expand.mp4](clip-expand.mp4) |
| letter stagger | a word lands letter by letter, 45 ms apart, on one exact curve | [letter-stagger.md](letter-stagger.md) | [letter-stagger.mp4](letter-stagger.mp4) |
| cut on motion | a moving shape carries the eye across a hard cut into a new scene | [cut-on-motion.md](cut-on-motion.md) | [cut-on-motion.mp4](cut-on-motion.mp4) |
| push with blur | a panel pushes in with a directional blur that follows its speed, set per frame | [push-blur.md](push-blur.md) | [push-blur.mp4](push-blur.mp4) |
| exit fast | the pair every beat needs: arrive fast and land soft, leave faster and shorter | [exit-fast.md](exit-fast.md) | [exit-fast.mp4](exit-fast.mp4) |

Re-render a clip after editing its demo:
`node harness/media/render-page.mjs prompts/moves/demo/<move>.html prompts/moves/<move>.mp4 --w 640 --h 360`.

Two rules the snippets already obey, so keep them when you adapt one: an exit keyframe has no
`from` (a `from` fills backwards over the entrance and hides it), and `var()` never goes inside the
`animation` shorthand (write the longhands; Chromium drops the whole declaration otherwise).
