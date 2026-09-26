// CAPTIONS: the two ways a caption line is accepted and then never seen.
//
// 1. OVERLAPPING WINDOWS. films/scene/scene.js draws `caps.find(c => t >= c.t0 && t < c.t1)`, ONE
//    element, FIRST match. Two captions that overlap are not two captions: the second is dropped for
//    the length of the overlap and nothing says so. That is the silent-substitution shape this repo
//    logs more than any other, and it costs one comparison to refuse.
// 2. A WINDOW THAT IS NOT A WINDOW. t1 <= t0 draws nothing, ever, at any frame.
//
// Placement is NOT checked here beyond its shape. Whether a pinned caption collides with a headline
// is a question about a rendered frame, so it belongs to `make check GATE=audit`, which reserves the band
// (core/layout/safe.js captionBand) and can see where the other layers actually landed.
import { isObj } from './util.mjs';

// The pins whose x-keyword is a real edge rather than 'center' (core/engine/boot.js PIN).
const H_PINS = ['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
  'thirds-tl', 'thirds-tr', 'thirds-bl', 'thirds-br', 'thirds-l', 'thirds-r'];

export function captionErrors(cfg) {
  const out = [];
  const caps = Array.isArray(cfg.captions) ? cfg.captions : [];
  if (!caps.length) return out;
  caps.forEach((c, i) => {
    if (!isObj(c)) return;
    const t0 = +c.t0, t1 = +c.t1;
    if (!isFinite(t0) || !isFinite(t1)) return;   // the schema reports a missing/NaN t0/t1
    // `align` and the shape of `words` are the schema's job (fields.captions.item), and duplicating
    // an enum here printed the same refusal twice under two wordings.
    if (t1 <= t0) out.push(`captions[${i}] window [${t0}, ${t1}] is empty (t1 must be > t0), it would never draw`);
    // A horizontal pin needs a box to pin. `top`, `bottom` and `center` only ask for a vertical
    // position and the stylesheet's box still applies, so those are complete on their own. `left`,
    // `right` and the corners are asking to move an edge, and a caption has no width until one is
    // declared, so the request cannot be honoured. core/engine/boot.js therefore leaves it alone, and this
    // says so out loud rather than letting the caption render where it always did.
    if (H_PINS.includes(c.pin) && c.w == null)
      out.push(`captions[${i}] pin "${c.pin}" moves a horizontal edge but the caption declares no w, `
        + 'add w (px or "45%"), or use pin "top" / "bottom" / "center", which need no box');
  });
  // Sorted by start, so one pass finds every overlap and the message names the pair in author order.
  const order = caps.map((c, i) => ({ i, c })).filter(({ c }) => isObj(c) && isFinite(+c.t0) && isFinite(+c.t1))
    .sort((a, b) => +a.c.t0 - +b.c.t0);
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1], cur = order[k];
    if (+cur.c.t0 < +prev.c.t1 - 1e-6)
      out.push(`captions[${cur.i}] starts at ${+cur.c.t0} while captions[${prev.i}] runs to ${+prev.c.t1}, `
        + 'the renderer draws the FIRST match and one caption element, so the later line is dropped for the overlap');
  }
  return out;
}
