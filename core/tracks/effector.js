// core/tracks/effector.js: one travelling point, every child of the layer reacting to its distance.
//
// A TRACK AND NOT A `parts` MODE, and the line is the one core/tracks/index.js draws. `parts` builds a
// GSAP timeline once, at build time: an entrance, a stagger, an exit. That is the right shape for
// "each piece arrives", and it is the wrong shape for this, because an effector has no schedule at all.
// Every clone's transform is a function of where the point is NOW, so it has to be computed on every
// frame, for every child, which is exactly what a track is. The two compose: `parts` can bring the
// grid in and the effector can then wash across it.
//
// COORDINATES ARE THE LAYER'S OWN, with (0,0) at its top-left corner, because that is the space the
// children are laid out in and the author is placing the point among the children. An SVG child is
// measured in its own user space with getBBox, which is the space its `x`/`cx` were written in.
//
// WRITES ON THE CHILDREN, never on the layer element. The layer's own transform belongs to the motion
// track and its opacity to the clip envelope, and a track that wrote either from here would be the
// two-owners drift this codebase logs most.
import { effectorAt, effectorStyle } from '../motion/effector.js';

export const slot = 'effector';

export const PROPS = { effector: {} };

const DEFAULT_SELECT = '[data-clone], .clone';

// The child's centre in the layer's own coordinates. offsetLeft/offsetTop are LAYOUT, so they are
// unaffected by the transform this track writes a line later, and reading them every frame therefore
// cannot feed back into itself.
function centreOf(node) {
  if (typeof node.getBBox === 'function') {
    const b = node.getBBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }
  return [node.offsetLeft + node.offsetWidth / 2, node.offsetTop + node.offsetHeight / 2];
}

export function frame(ctx) {
  const { kit, el, L, t, start, end } = ctx;
  const E = L.effector;
  if (!E || t < start || t >= end) return;
  const targets = el.querySelectorAll(E.select || DEFAULT_SELECT);
  if (!targets.length) return;
  const drives = E.drives || { scale: 0.6 };
  const opts = {
    radius: E.radius ?? 300,
    falloff: E.falloff ?? 'smooth',
    sticky: E.sticky ?? 0,
    release: E.release ?? 'linear',
    overshoot: E.overshoot ?? 0,
    step: 1 / (kit.fps || 30),
  };
  const lt = t - start;
  for (const node of targets) {
    const [cx, cy] = centreOf(node);
    const st = effectorStyle(effectorAt(cx, cy, E.path, lt, opts), drives);
    node.style.transform = st.transform;
    if (st.opacity !== null) node.style.opacity = String(st.opacity);
  }
}
