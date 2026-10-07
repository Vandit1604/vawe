# Depth parallax

**Use when** a camera move should have depth: the ground, the mid layer and the front layer move by
different amounts during one push, pull or whip, the way real distance does. The ground (soft light
blobs) moves least, the type moves as the camera, a card or chip in front moves most. A flat world with a
camera move reads as a zoom; with parallax it reads as a space.

```js
import { parallax } from '../../core/motion/presets.js';
// one camera move, each layer by its depth: 0.3 ground, 1 the camera, 1.8 front
parallax([[ground, 0.3], [mid, 1], [front, 1.8]], { kind: 'push', at: 0, duration: 2.4 });
// a pull back with the far words on their own layer
parallax([[ground, 0.4], [far, 0.7], [mid, 1]], { kind: 'pull', at: 2.9, duration: 1.4, from: 1.15 });
```

Sound: none; the depth is felt.

Each layer is a full-frame `position: absolute; inset: 0` element holding the things of one depth. A depth
`d` scales the move's change by `d` (a push to 1.12 becomes 1.036 for the ground and 1.216 for the front).
Keep the front layer's things inside the frame at the end of the move: at 1.8 a chip near the right edge
leaves it. Put the layers of one world under one wrapper and fly the wrapper too (a [scale-through](scale-through.md)),
because transforms on different elements compose.
