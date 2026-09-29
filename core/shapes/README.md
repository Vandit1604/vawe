# core/shapes

Shared shapes for hand-written three.js pages.

## star.js

A thin 4-point star with concave sides on its own transparent canvas.

```js
import * as THREE from 'three';
window.THREE = THREE;
import '../../core/engine/page-api.js';           // installs window.vawe.three
import { createStar } from '../../core/shapes/star.js';

const star = createStar(canvas, { look: 'glass' });
star.draw({ x: 960, y: 540, size: 400, spin: 0.5, tilt: 0.3, opacity: 1, blur: 0 });
```

`createStar(canvas, { depth = 0.08, bevel = 0.02, look = 'glass', tint })` returns `{ draw, mesh }`.

- `canvas`: set `width` and `height` first (for example 1920 x 1080). Stack one canvas per star.
- `depth`, `bevel`: thickness and edge round, in units where the star is 2 wide. Thin is the default.
- `look`: `glass` (pale, translucent), `chrome` (grey metal), `iridescent` (lavender with a thin-film sheen). Each has a soft dark centre.
- `tint`: a hex colour that replaces the look's own.
- `draw({ x, y, size, spin, tilt, opacity, blur })`: `x`, `y` are the centre in canvas px, `size` is the full width in px (0 hides it), `spin` and `tilt` are radians about y and x, `blur` is CSS px.
- `mesh`: the three.js mesh, for material dials such as `mesh.material.roughness`.

`draw` poses the star from its arguments only. Call it once per seek.

Check it against a reference with `vawe compare --page tests/fixtures/pages/star.html --ref <ref.mp4> --at 0.5,7.5`.
