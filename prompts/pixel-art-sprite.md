---
when: "the look is a 16-bit sprite loop drawn on a logical canvas"
answers: "the strict canvas spec: logical resolution, fixed palette, state machine, pose parameters quantised to the grid, seek-pure particles"
group: reference
---

# Pixel-art sprite: a strict canvas spec

**Use when** the look is a 16-bit sprite: a character, a loop, a game moment. The strongest
"canvas as a pure function" prompt in the ecosystem is this shape: a logical resolution, a fixed
palette, a state machine, and pose parameters quantised to the grid.

**Length:** a loop of 2 to 8 seconds, or a beat of a longer film.

## The template

```
<inputs>
Ask me for: the character in one line, the four states of its loop (idle, charge, act, recover), the
logical resolution (128x96 by default), the palette size (about 24 colours), and the canvas.
</inputs>

<rendering>
Draw everything to an offscreen canvas at the fixed logical resolution, then blit to the frame
scaled by the largest integer factor that fits, centred, with imageSmoothingEnabled = false and CSS
image-rendering: pixelated. All drawing snaps to integer coordinates on the logical canvas: no
sub-pixel positions, no anti-aliasing, no gradients, no shadowBlur. Every pixel comes from the
palette; write the palette as a :root custom property list so the studio can edit it.
</rendering>

<character>
Build the character procedurally from filled rects and pixel runs, about 24x32 logical pixels, with
a two-shade body and a darker outline. Parameterise the pose (limb angles, a raise, a tilt, a sway).
Animate the parameters smoothly in t, then quantise to the grid each frame, so the motion reads at
8 to 12 fps pixel animation while the film renders at 60.
</character>

<animation>
A looping state machine: IDLE (a 2-frame bob) to CHARGE (a raise, a flicker, sparks spiral in) to
ACT (a burst, a projectile, a 1 to 2 pixel shake) to RECOVER (settle). Ease the pose parameters
between keyframes. Particles are a preallocated pool with positions computed from t and a per-particle
seed (rng(seed) from core/motion/springs.js), never stepped, so any frame renders alone. Each
particle steps its palette index from white to the accent to dark before it ends.
</animation>

<scene>
Minimal: a dark field, a few 1-pixel stars, a floor line. The silhouette must read. A 1-pixel rim
light from the accent on the character, brightest during ACT.
</scene>

<build>
One page: films/<name>/page.html, <meta name="duration">. window.seek(t) computes the state from t,
draws the logical canvas, blits. The loop's last frame equals its first. Sound:
<audio data-synth="sparkle" data-at="<charge>"> and "impact" on ACT.
</build>

<quality>
Crisp pixels at any frame size, a seamless loop, a readable silhouette. It should look like a
polished 16-bit sprite, not vector shapes scaled down.
</quality>
```

## Inputs to ask for

Character, states, resolution, palette size, canvas.

## Gotchas

- The renderer's subframe blur will smear a pixel sprite. Set the quantised motion so a pixel moves
  a whole step per authoring frame; the renderer's fractional frames then hold the same pixel.
- A particle system that "steps" each frame is not a function of t. Compute each particle's
  position from (t - birth) and its seed.
- Integer scaling only: 1080 / 96 is 11.25, so the sprite is scaled 11x and letterboxed by 12 px.
  Say so in the page, or the studio will ask why.

source: pattern from Majid Manzarpour's pixel-wizard prompt,
https://x.com/majidmanzarpour/status/2102476258948927543 (via
https://github.com/guanmo-ai/awesome-ai-motion, case 2102476258948927543, third-party text under
the list's THIRD_PARTY.md, so this is our own template in the same rendering/character/animation/
scene/quality shape, with the loop made seek-pure for the vawe renderer).
