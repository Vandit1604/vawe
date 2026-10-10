---
when: "choosing a palette, a ground and an accent for a film"
answers: "build from one dominant · 60-30-10 · one scarce accent · contrast for video type · deploy-for-mood · gradient vs flat · encoder banding"
group: look
---

# COLOR: building a palette

Colours come from the brand or the brief ([palette-from-brand](../rules/palette-from-brand.md)): eyedrop real pixels, do not invent. If there is no brand and
the owner says "you choose", invent a beautiful palette on purpose. Never default to plain grey.
Declare the palette once, as `:root` custom properties in the page, and use only those.

## 0. Lazy defaults to question

Ask "is this a deliberate choice for this content, or am I defaulting?" before you use one:

- Gradient text (`background-clip: text`).
- Left-edge accent stripes on cards.
- Cyan on dark, purple-to-blue gradients, neon accents.
- Pure `#000` or `#fff`. Tint toward the accent hue ([palette-from-brand](../rules/palette-from-brand.md)).
- Identical card grids, everything centred with equal weight.

Two more rules:

- **Muted is fine. Flat is not.** Every frame needs one colour that pulls the eye. The accent must be
  visible, not a faint glow lost in compression: full saturation on the focal element
  ([accent-share](../rules/accent-share.md)).
- **A light canvas is not a dark one with the values swapped.** On dark, glows pop. On light, use bolder
  borders, stronger structure and full-saturation accent hits, and add texture to avoid the
  blank-slide feel. Do not switch to dark: build the light film on its own terms
  ([value-dominance](../rules/value-dominance.md)).

## 1. Decide dominance first, by looking

A white site gets a light-first film, a dark site a dark-first film ([value-dominance](../rules/value-dominance.md)). Look at the hero. Commit fully, no
50/50. Light-first: off-white ground, near-black ink, one vivid accent. Dark-first: a tinted near-black
ground (never `#000`), off-white text, one vivid accent.

## 2. Build from one seed

1. **Neutrals first.** Most of a frame is neutral: ground, surface, and three text levels (primary,
   secondary, dim).
2. **One accent, held scarce.** It is the smallest share: eyebrows, numerals, one rule per frame, the CTA. No frame
   lets it dominate by area ([accent-share](../rules/accent-share.md)).
3. **Semantic colours** (positive, negative) stay distinct from the brand accent.

The 60-30-10 interior-design rule is the picture to hold: a dominant neutral field, a secondary tone, a small
accent share. One clear focal colour, no soup.

## 3. Tints and shades without mud

- Rotate hue toward a neighbour as you go (toward yellow when lightening, blue or violet when
  darkening). Ramps stay alive.
- Raise saturation as lightness moves away from 50 %, or colours wash to grey.
- Tint the neutrals: a warm ink, a cool grey. Pure `#808080` reads dead.

## 4. Contrast: overshoot for video type

The WCAG floors and the video overshoot are in [text-contrast](../rules/text-contrast.md): motion, grain,
compression and busy backgrounds erode effective contrast. Emphasis on an accent-coloured ground must not use
the accent (blue on blue vanishes).

## 5. Deploy the palette for a mood

The colours are fixed; the mood comes from how you use them.

| The beat should feel | Do this |
|---|---|
| calm | mostly ground, accent once, high whitespace |
| tense, dramatic | deep ground, one muted accent, big value contrast on the hero |
| energetic | more saturated accent, used more often, light and dark flips between beats |
| trustworthy, technical | flat neutrals, accent only on the one thing that matters |
| warm, human | tinted neutrals, cream ground, softer contrast |

Value is the strongest mood lever (dark-first serious, light-first clean). Saturation is the energy dial.
Accent frequency is the excitement dial.

## 6. Gradient or flat

- Use a gradient or atmospheric ground on low-copy beats, go flat on high-copy and payoff beats, and use
  only a gradient the real brand has ([gradient-grain](../rules/gradient-grain.md)). Never put a gradient behind the thing
  the beat exists to land.
- **A full-screen linear gradient on a dark ground bands in the mp4.** h264 quantises a slow luminance
  ramp into steps, worst on a large area with a shallow slope. The browser and the draft still look
  clean. Prefer a radial, keep the ramp short, or break it with grain, dither or a dot texture. Grain is
  the cheapest fix, and it is what film did for the same reason ([gradient-grain](../rules/gradient-grain.md)).

## 7. Cohesion

One accent across the piece ([accent-share](../rules/accent-share.md)). Vary hue only inside the brand's family. Flip value (light to dark) for
drama: a value flip is itself a transition. Patterns are seasoning, not wallpaper.

Sources: Refactoring UI (colour systems, greys first); Material 3 (tonal palettes); WCAG 2.x 1.4.3 and
1.4.11; the 60-30-10 interior-design rule.
