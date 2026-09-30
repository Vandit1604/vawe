---
name: blur-out-dense
when: exiting a face, a card, or a dense grid of elements
holds: eye
answers: "why a dense or face-bearing layer should exit through defocus, not through a slide"
group: look
---
# Blur out when a slide would fight the content

Faces, cards and dense grids leave through focus, not through space. Sliding many elements at once
reads as chaos, not as an exit. A single simple shape can still slide.

Animate `filter: blur()` with opacity on the exit. Blur follows motion: a still thing never blurs,
so the blur runs only during the exit itself.
