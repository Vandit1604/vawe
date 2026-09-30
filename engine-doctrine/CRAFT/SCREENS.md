---
when: you are about to author a product screen (an editor, a results grid, a dashboard, a chat, a card) for a film, or a screen previews as a grey box, with tiny type, or with something clipped
answers: "why a product screen is designed for the video, not a plain mock; the measured numbers; the checks for size, clipping and images"
group: look
---

# Product screens: designed for the video, not a plain mock

The owner's ruling: use a design harness to build beautiful mocks, not plain by default. Invent colours
and themes when asked. A product screen in a film is designed. A capture of the real product beats a
mock (`AGENTS.md`: no fake product UI); this page is for the screen you must build.

## Why a mock fails

A hand-written mock defaults to a grey window, small type and a sparse grid, because that is what "a UI"
looks like in training data. The reference film (madera) does the opposite, measured per act:

| act | fill (madera / first mock) | detail | photo |
|---|---|---|---|
| results | 0.71 / 0.17 | 13.3 / 5.9 | 0.22 / 0.05 |
| cards | 0.34 / 0.15 | 12.2 / 4.7 | 0.28 / 0.06 |

Its screens have large type, few elements, real imagery and the subject filling the frame.

## The rules

- One focal element per screen (the prompt in an editor, the hero tile in a grid). A named domain
  signature beats a generic dashboard template.
- Fill most of the frame. Display-size type: nothing under 28 px at 1920 wide.
- Real images shown whole. Set each cell to the source's own aspect ratio so `object-fit: cover` neither
  crops nor letterboxes. A crop that cuts the stills' own on-screen text reads as a bug.
- Colour from theme tokens (`var(--...)`), one accent. A dark capture goes on a dark surface.
- Use a relative `<img src>` with care: it resolves against the page that loads it, not the fragment.
- Theme source: a brand site gives the theme. A prompt with no brand means ask. "You choose" means
  invent one (`skills/impeccable/scripts/palette.mjs` seeds a colour and a mood), never fall back to plain.
- Take principles from the smallest useful ui-skills set, never its font or colour defaults. The local
  theme's tokens win.
- Every claim in on-screen copy must be true. A results title that said "six films shipped this week"
  when nobody had was replaced with the storyboard's own copy.

## Check the laid-out page, not the source

Fill and detail statistics cannot see composition: a title cut in half and a title fully on screen can
score the same. A percentage width, a grid track and an `object-fit` crop resolve only after layout. So
render the fragment and read each element's real box against the frame and the safe margin
(0.06 of the short edge, 65 px at 1080p). Outside the frame is a
defect. Inside the margin is a warning. One first draft passed the statistics while a title ran 13 px
past the top edge and the bottom row ran off the frame. Look at the frame, then measure.
