---
when: "about to write a new ambient shader, gradient, easing curve, noise function, SVG filter, texture, or plate footage, before writing one from scratch"
answers: "which external libraries are checked, MIT-clean and worth compiling from · which are non-commercial or unlicensed and study-only · how to wire a compiled shader into core/surfaces/shaders-ambient.js without breaking the registry"
group: reference
---

# External sources: search before you build

The rule this repo already applies to its own code (`AGENTS.md`, "finish the diagnosis before you
design the fix") extends outward here. Before writing a new shader, gradient, easing curve, or
texture, search whether the effect already exists, free to use, outside this repo.

## Why this exists

This engine ships 23 ambient shaders (`core/surfaces/shaders-ambient.js:29`). 18 have never been used
in a film. None can produce the light-ray look a reference needed, and we spent a day discovering that
[Radiant](https://github.com/pbakaus/radiant), 106 MIT-licensed shaders, held it already: `aurora-curtain`,
`aurora-veil`, `diamond-caustics`, `flow-field`, `chromatic-bloom`, none of which this engine's
registry currently has a name for. Compiling before building costs an hour. Discovering the gap after
a day of hand-rolling costs a day.

## How to read this table

Three columns matter most: licence, attribution, and ship status. **Verified** means the licence text
was opened, not inferred from a badge. **UNCLEAR** means the terms could not be pinned down; that is a
real answer, and the entry is marked study-only until someone opens the actual file. Nothing below was
recorded from a README claim alone.

## Safe to ship: permissive licence, verified

| source | url | licence (verified) | attribution | size | good for | not good for |
|---|---|---|---|---|---|---|
| Radiant | [github.com/pbakaus/radiant](https://github.com/pbakaus/radiant) | MIT (Copyright 2025 Paul Bakaus, LICENSE file read directly) | not required, appreciated | 106 GLSL shaders | volumetric/atmospheric looks this engine lacks: light rays, caustics, bloom, curtain auroras | shaders are WebGL2/single-pass demos, not pre-wired to a `(time, seed)` API; still needs the porting pass below |
| glsl-noise (hughsk) | [github.com/hughsk/glsl-noise](https://github.com/hughsk/glsl-noise) | MIT (Ashima Arts + Stefan Gustavson, LICENSE.md read directly) | copyright notice kept in the source file | ~6 functions: classic/simplex noise in 2D/3D/4D | a portable, reusable noise function to import into a NEW shader | this engine's shaders each hand-roll their own inline noise in one FRAG string; there is no shared noise import today, so this fills that gap directly |
| FastNoiseLite | [github.com/Auburn/FastNoiseLite](https://github.com/Auburn/FastNoiseLite) | MIT (Jordan Peck + contributors, LICENSE read directly) | copyright notice kept in the source file | one header, 5+ coherent noise types (Perlin, Simplex, Cellular, Value, ...) plus fractal layering, ports to GLSL | picking ONE noise family deliberately (cellular vs. simplex) instead of re-deriving fbm by hand each time, which is what `domainWarp` and `voronoi` do today | it is a generator library, not a drop-in shader; still needs porting |
| glsl-fast-gaussian-blur (Jam3) | [github.com/Jam3/glsl-fast-gaussian-blur](https://github.com/Jam3/glsl-fast-gaussian-blur) | MIT (verified via GitHub's license API, SPDX `MIT`) | copyright notice kept in the source file | a handful of optimized single/multi-pass blur kernels | this engine has no bloom or soft-glow primitive across `shaders-ambient.js`; a cheap separable blur is the missing half of any `chromatic-bloom`-style port | single-pass 2D convolution only, no volumetric scattering |
| d3-ease | [github.com/d3/d3-ease](https://github.com/d3/d3-ease) | BSD 3-Clause (Mike Bostock + Robert Penner, LICENSE read directly) | copyright notice kept in redistributed source | ~30 named easing functions (cubic, elastic, bounce, back, ...) | a canon set of easing shapes with known names, to check against before inventing a new curve | JS runtime functions, not CSS `cubic-bezier()` strings; values need re-deriving for a keyframe track |
| easing-js (danro, Penner port) | [github.com/danro/easing-js](https://github.com/danro/easing-js) | BSD (Robert Penner, 2001, LICENSE read directly) | copyright notice kept in redistributed source | ~30 easing equations, the original Penner set | same canon as d3-ease, JS-native | same limitation: not CSS curves |
| Radix Colors | [github.com/radix-ui/colors](https://github.com/radix-ui/colors) | MIT (Modulz/WorkOS, LICENSE read directly) | copyright notice kept in redistributed source | 30 colour scales x 12 steps, light + dark, APCA-checked contrast pairs | a systematic accessible-contrast palette to check against before hand-picking a theme colour | the scale STEPS are the asset; the brand hue itself still has to come from the film's own brief |
| Open Color | [github.com/yeun/open-color](https://github.com/yeun/open-color) | MIT (heeyeun, LICENSE read directly) | copyright notice kept in redistributed source | 13 hues x 10 shades | a smaller, simpler alternative to Radix when a film wants flat Material-era colour, not scale-based contrast | no dark-mode pairing built in, unlike Radix |
| Tailwind CSS default palette | [github.com/tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | MIT (Tailwind Labs, LICENSE read directly) | copyright notice kept in redistributed source | 22 hues x 11 shades | the most widely recognized web colour vocabulary; useful when a reflected brand already uses it | it is a build tool's default palette, not a designed system; treat as raw data, not taste |
| uiGradients | [github.com/ghosh/uiGradients](https://github.com/ghosh/uiGradients) | MIT (per repo README license link, LICENSE.md) | copyright notice kept in redistributed source | ~180 named two/three-stop CSS gradients | a fast check against before hand-tuning a gradient wash's stop colours | flat linear stops only, no mesh/blob geometry; does not replace `flow`/`aurora`'s blob math |
| Poly Haven | [polyhaven.com](https://polyhaven.com/license) | CC0 (public domain, verified on the license page) | none required, appreciated | thousands of HDRIs, PBR textures, and 3D models | environment plates and real-world textures (grain, fabric, concrete) this engine's shaders currently simulate rather than sample | large binary assets; this repo captures real assets via `make media X=capture`/`make media X=assets`, never a bare download, so this is a source to route through that pipeline, not to hotlink |

## Attribution required, but free to ship

| source | url | licence (verified) | attribution | size | good for | not good for |
|---|---|---|---|---|---|---|
| Pexels | [pexels.com/license](https://www.pexels.com/license/) | Pexels License (page read directly) | not legally required, appreciated | large stock photo/video library | b-roll plates and product-adjacent stock footage | cannot resell unaltered, cannot redistribute on a competing stock platform, cannot imply endorsement |
| Pixabay | [pixabay.com/service/license-summary](https://pixabay.com/service/license-summary/) | Pixabay Content License (page read directly) | not legally required, appreciated | large stock photo/video/vector/music library | same use as Pexels | cannot sell content standalone with no creative effort applied; brand/trademark content restricted from commercial use |
| Mixkit | [mixkit.co](https://mixkit.co/) | Mixkit Free License (per Mixkit's own license guide; two license tiers exist, "Free" and "Restricted", check per clip) | not required under the Free License | stock video, music, templates | commercial-use plates without attribution overhead, when the clip is tagged Free | the Restricted tier exists on the same site for non-commercial use only; verify the tier per download, not by assumption |
| Coverr | [coverr.co/license](https://coverr.co/license) | Coverr free license (page read directly) | required unless a paid Coverr+ subscription | stock video | b-roll plates | cannot resell or bundle into another stock/template service; explicitly forbids use to train AI models or build datasets |
| NASA image and media library | [nasa.gov/nasa-brand-center/images-and-media](https://www.nasa.gov/nasa-brand-center/images-and-media/) | US government work, public domain (per NASA's stated guidelines) | not legally required, NASA asks for acknowledgment as courtesy | large space/science imagery and footage archive | space, science, and scale plates with no licence risk | the NASA insignia and logotype are NOT public domain and are trademark-protected; commercial use must not imply NASA endorsement; identifiable people in footage carry separate privacy/publicity risk |

## Study-only: non-commercial, unlicensed, or unclear

Do not compile from these into a shipped film. They earn a place here because they are still useful
for reading technique and naming an effect before reimplementing its idea independently.

| source | url | licence (verified) | why study-only |
|---|---|---|---|
| LYGIA | [github.com/patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | Prosperity Public License 3.0.0 (LICENSE.md read directly) | free for noncommercial use and a 30-day commercial trial only; commercial use past 30 days needs a separate licence from the author. 600+ composable GLSL functions (SDFs, colour space conversions, lighting models), the deepest library found, but not cleared to ship in a commercial render without buying that licence |
| Shadertoy | [shadertoy.com](https://www.shadertoy.com) | CC BY-NC-SA 3.0 by default (per Shadertoy's own terms page); an individual author MAY opt into a different licence, stated on their shader | the default is NonCommercial, so treat every shader as NC unless its own page states otherwise; verify per shader, not per site |
| glslsandbox.com | [glslsandbox.com](http://glslsandbox.com) | platform code is MIT (`mrdoob/glsl-sandbox`); per-shader content licence is inconsistent and often unstated | thousands of user-submitted shaders with no reliable per-item licence; treat every shader here as UNCLEAR until its author states one |
| The Book of Shaders | [thebookofshaders.com](https://thebookofshaders.com) | "All rights reserved" (copyright notice read directly on the site) | not an open licence at all; excellent for learning technique (the fbm/domain-warp derivations this engine's `domainWarp` already draws on conceptually), but code must not be copied in |
| yoksel/svg-filters | [github.com/yoksel/svg-filters](https://github.com/yoksel/svg-filters) | UNCLEAR, no LICENSE file found in the repository | a large collection of named `feTurbulence`/`feDisplacementMap` SVG filter recipes with no stated reuse terms; useful to read for the filter graph shape, not to copy verbatim |

## Sources checked and rejected

- **Adobe Color** (color.adobe.com): a palette-picking tool, not a licensed asset library. Palettes users publish there carry no consistent licence; rejected as a source, not because of a bad licence, but because there is nothing here to verify.
- **CSS Gradient (cssgradient.io) and similar single-purpose gradient pickers**: tools, not asset collections; nothing to cite a licence against.
- **GSAP's easing set**: GSAP itself moved to a no-charge licence in 2024, but that licence governs the GSAP *library*, not a standalone data table of easing curves; out of scope here since it is a runtime dependency decision, not a reference source.

## Bringing a compiled shader into this engine

Appending one name to `AMBIENT_SHADERS` in `core/surfaces/shaders-ambient.js:29` is the only entry
point; the object's key order is the wire format (`core/surfaces/shaders-ambient.js:23`), because the
index of a name is the `u_fx` value the fragment shader branches on. A new shader is always **appended
at the end**, never inserted, or every scene already written that references a later index silently
points at the wrong effect.

The shader must be pure in `(time, seed)`. `renderFrame(n)` derives every frame from the frame number
alone (`core/surfaces/shaders-ambient.js:4`), so a ported shader may read `u_time` and `u_seed` but
must not depend on real wall-clock time, randomness outside the seed, or any per-session state.

Strip `u_mouse` or any pointer-following uniform. A render has no pointer: Radiant and most Shadertoy
ports drive parallax or highlight position off mouse coordinates, and that input has no meaning outside
a live canvas. Replace it with a slow deterministic drift driven by `u_time`, the same pattern every
existing member of `AMBIENT_SHADERS` already uses.

A new name needs `node quality/gates/schema-drift.mjs --write`, then a check of both places the
name has to land: `schema.layerProps.byType.shader` (the prop-name vocabulary, generated from
`core/registry/props.js`) and `films/scene/schema.json`'s `fields.layers.item.shader` enum (the
author-facing list `--write` regenerates from `AMBIENT_FX`). The gate refuses a write that would drop
an existing name; it does not refuse one that forgets to add a new one, so read the diff.

## What still has no external answer

No source found here settles what makes a shader look "premium" rather than "noise soup"; that
judgement is this engine's own (`core/surfaces/shaders-ambient.js:7-11`, the BEAUTY RECIPE comment).
Radiant and LYGIA supply raw material, not the palette and frequency discipline the engine already
enforces; a ported shader still needs a pass through that recipe, not just a compile.
