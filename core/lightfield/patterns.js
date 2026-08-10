// The three field structures.
//
// A pattern knows NOTHING about colour. It never sees a hex. It is handed two paint functions,
// `dark(a)` and `lit(a)`, and index.js decides what those mean, so `colour` and `pattern` stay
// genuinely separate dials rather than one dial wearing two names.
//
// Every cell says which of the two layers it belongs to, because the two jobs a pattern does are
// not the same job:
//
//   dark cells go into a MULTIPLY layer.     Multiplying by a grey scales all three channels by one
//                                            factor, so a seam gets darker without getting greyer.
//   lit cells go into a PLUS-LIGHTER layer.  It ADDS the light's own colour, so a lit face gets
//                                            brighter along the hue that is lighting it.
//
// Doing both with one `overlay` layer is what turned a crimson field brown: overlay pulls a
// mid-tone towards white on the light side and towards grey on the dark side, and it cannot be
// asked to stop.
//
// A cell also carries `g`, the group it moves with. A seam and the face beside it are one slat, so
// they take one motion, or the blind tears itself apart.
//
// A pattern returns { cells: [{ style, lit, g }], mask }. Nothing here reads the clock.

import { rng, span, n } from './rng.js';

// slats, a backlit blind. A narrow hard seam at each bar's trailing edge, and a soft mound of light
// across its face. All the vertical variation comes from the colour field beneath, so the bars read
// as a screen the light comes through, not as painted stripes.
function slats(opt, { dark, lit }) {
  const r = rng(opt.seed ^ 0x51a75);
  const { count, jitter } = opt.pattern;
  const { seam, sheen } = opt.shadow;
  const cells = [];
  const nominal = 100 / count;
  let x = -nominal;
  let g = 0;
  while (x < 101) {
    const w = nominal * (1 + jitter * span(r, -0.6, 1.4));
    const box = `top:-2%;height:104%`;

    // The seam. Narrow on purpose: a dark line you can point at is what reads as a hard edge, and a
    // ramp across the whole bar only dims the picture. Width is a FRACTION of the bar, so a dense
    // field gets fine seams and a sparse one gets broad ones.
    const sw = w * span(r, 0.16, 0.40);
    const sa = (0.06 + seam * 0.86) * span(r, 0.7, 1.25);
    cells.push({
      g,
      lit: false,
      style: `left:${n(x + w - sw)}%;width:${n(sw)}%;${box};background:linear-gradient(90deg,rgba(0,0,0,0) 0%,${dark(sa * 0.45)} 46%,${dark(sa)} 100%)`,
    });

    // The face. It catches the light rather than reflecting a lamp, so it peaks a little way in
    // from the seam and falls off both ways.
    const peak = span(r, 22, 46);
    const fa = sheen * span(r, 0.45, 1.2);
    // A dial at 0 removes the thing, it does not emit an invisible copy of it. sheen 0 means no
    // lit layer at all, so the blend never runs and the markup says what the options said.
    if (fa > 0) cells.push({
      g,
      lit: true,
      style: `left:${n(x)}%;width:${n(w - sw)}%;${box};background:linear-gradient(90deg,${lit(fa * 0.25)} 0%,${lit(fa)} ${n(peak)}%,${lit(fa * 0.1)} 100%)`,
    });

    x += w;
    g++;
  }
  return { cells, mask: null };
}

// rings, concentric bands round a point, like light on water. The eye travels outwards from a point
// instead of across a grille.
function rings(opt, { dark, lit }) {
  const r = rng(opt.seed ^ 0x21f65);
  const { count, jitter } = opt.pattern;
  const { seam, sheen } = opt.shadow;
  const cx = span(r, 38, 56);
  const cy = span(r, 30, 62);
  const cells = [];
  // Bands grow outwards by a jittered step and each stays a comparable width. Growing the width
  // with the radius turns the field into a bullseye: the outer bands get so heavy they stop
  // modulating the light and start being the subject.
  let size = span(r, 4, 10);
  for (let i = 0; i < count && size < 260; i++) {
    const thick = (0.4 + jitter * 2.2) * span(r, 0.5, 1.7);
    const isLit = i % 2 === 0;
    const a = isLit ? sheen * span(r, 0.4, 1.1) : (0.05 + seam * 0.62) * span(r, 0.6, 1.25);
    if (a > 0) cells.push({
      g: i,
      lit: isLit,
      style: `left:${n(cx - size / 2)}%;top:${n(cy - size / 2)}%;width:${n(size)}%;height:${n(size)}%;border-radius:50%;border:${n(thick)}vmin solid ${isLit ? lit(a) : dark(a)}`,
    });
    size += span(r, 4, 4 + 14 * jitter);
  }
  // The bands are hard-edged by construction. One radial mask turns them into light rather than ink.
  return { cells, mask: `radial-gradient(75% 80% at ${n(cx)}% ${n(cy)}%, #000 0%, rgba(0,0,0,0.45) 62%, transparent 100%)` };
}

// shards, a fan of rays from a pivot below the frame, like light through a gap. Angular, not
// orthogonal: the third structure exists so the set is not two variations on a grid.
function shards(opt, { dark, lit }) {
  const r = rng(opt.seed ^ 0x5ba2d);
  const { count, jitter } = opt.pattern;
  const { seam, sheen } = opt.shadow;
  const cx = span(r, 30, 62);
  const cy = span(r, 96, 122);
  const cells = [];
  const fan = 118; // degrees of sky the fan covers
  const step = fan / count;
  let ang = -fan / 2;
  let g = 0;
  while (ang < fan / 2) {
    const deg = step * (1 + jitter * span(r, -0.5, 1.5));
    const w = deg * 1.7; // the bar is drawn straight, so its width tracks its angle
    const isLit = r() < 0.5;
    const a = isLit ? sheen * span(r, 0.4, 1.15) : (0.05 + seam * 0.58) * span(r, 0.55, 1.3);
    const paint = isLit ? lit(a) : dark(a);
    const clear = isLit ? lit(0) : 'rgba(0,0,0,0)';
    if (a > 0) cells.push({
      g,
      lit: isLit,
      style: `left:${n(cx)}%;top:${n(cy)}%;width:${n(w)}vmax;height:200vmax;margin-left:${n(-w / 2)}vmax;transform-origin:50% 0;transform:rotate(${n(ang + 180)}deg);background:linear-gradient(180deg,${paint} 0%,${clear} 100%)`,
    });
    ang += deg;
    g++;
  }
  return { cells, mask: null };
}

export const BUILDERS = { slats, rings, shards };
