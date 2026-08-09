// The three field structures.
//
// A pattern knows NOTHING about colour. Every cell it emits paints white or black at some alpha,
// and the layer above composites with `overlay`, so white brightens whatever hue is beneath and
// black deepens it. That is why the same pattern works on any palette, and why `colour` and
// `pattern` are genuinely separate dials rather than one dial wearing two names.
//
// A pattern returns { cells: [{ style }], mask } and nothing else. Motion is bolted on afterwards
// by index.js. Nothing here reads the clock.

import { rng, span, n } from './rng.js';

const white = (a) => `rgba(255,255,255,${n(a)})`;
const black = (a) => `rgba(0,0,0,${n(a)})`;
const clear = (light) => (light ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');

// slats, a backlit blind. Vertical bars of unequal width, each with a lit leading edge that falls
// away to a dark trailing edge. All the vertical variation comes from the colour field beneath, so
// the bars read as a screen the light is coming through, not as painted stripes.
function slats(opt) {
  const r = rng(opt.seed ^ 0x51a75);
  const { count, jitter } = opt.pattern;
  const relief = opt.shadow.relief;
  const cells = [];
  // Lay the bars out by walking across the frame, so widths can differ without leaving holes.
  const nominal = 100 / count;
  let x = -nominal;
  while (x < 101) {
    const w = nominal * (1 + jitter * span(r, -0.6, 1.4));
    // A blind mostly SUBTRACTS. The lit edge is narrow and weak on purpose: white in `overlay`
    // pulls every channel towards white, so a generous highlight turns a vivid red field brown.
    // The brightness belongs to the colour field; the pattern's job is to cut it.
    const hi = (0.04 + relief * 0.14) * span(r, 0.4, 1.15);
    const lo = (0.10 + relief * 0.70) * span(r, 0.6, 1.35);
    const edge = span(r, 8, 26); // where the lit edge has finished falling off, in % of the bar
    cells.push({
      style: `left:${n(x)}%;top:-2%;height:104%;width:${n(w)}%;background:linear-gradient(90deg,${white(hi)} 0%,${clear(true)} ${n(edge)}%,${clear(false)} ${n(edge + 10)}%,${black(lo)} 100%)`,
    });
    x += w;
  }
  return { cells, mask: null };
}

// rings, concentric bands round the bloom, like light through water. Same alpha vocabulary,
// completely different structure: the eye travels outwards from a point instead of across a grille.
function rings(opt) {
  const r = rng(opt.seed ^ 0x21f65);
  const { count, jitter } = opt.pattern;
  const relief = opt.shadow.relief;
  const cx = span(r, 38, 56);
  const cy = span(r, 30, 62);
  const cells = [];
  // Rings grow outwards by a jittered step, and each band stays a comparable width. Growing the
  // width with the radius instead turns the field into a bullseye: the outer bands get so heavy
  // they stop modulating the light and start being the subject.
  let size = span(r, 4, 10);
  for (let i = 0; i < count && size < 260; i++) {
    const thick = (0.4 + jitter * 2.2) * span(r, 0.5, 1.7);
    const lit = i % 2 === 0;
    const a = (lit ? 0.06 + relief * 0.26 : 0.09 + relief * 0.50) * span(r, 0.6, 1.25);
    cells.push({
      style: `left:${n(cx - size / 2)}%;top:${n(cy - size / 2)}%;width:${n(size)}%;height:${n(size)}%;border-radius:50%;border:${n(thick)}vmin solid ${lit ? white(a) : black(a)}`,
    });
    size += span(r, 4, 4 + 14 * jitter);
  }
  // The rings are hard-edged by construction. One radial mask turns them into light rather than ink.
  return { cells, mask: `radial-gradient(75% 80% at ${n(cx)}% ${n(cy)}%, #000 0%, rgba(0,0,0,0.45) 62%, transparent 100%)` };
}

// shards, a fan of rays from a low pivot, like light through a gap. Angular, not orthogonal:
// the third structure exists so the set is not two variations on a grid.
function shards(opt) {
  const r = rng(opt.seed ^ 0x5ba2d);
  const { count, jitter } = opt.pattern;
  const relief = opt.shadow.relief;
  const cx = span(r, 30, 62);
  const cy = span(r, 96, 122); // the pivot sits below the frame, so the rays open upwards
  const cells = [];
  const fan = 118; // degrees of sky the fan covers
  const step = fan / count;
  let ang = -fan / 2;
  while (ang < fan / 2) {
    const deg = step * (1 + jitter * span(r, -0.5, 1.5)); // angular width of this ray
    const w = deg * 1.7; // the bar is drawn straight, so its width tracks its angle
    const lit = r() < 0.5;
    const a = (lit ? 0.06 + relief * 0.26 : 0.09 + relief * 0.50) * span(r, 0.55, 1.3);
    const paint = lit ? white(a) : black(a);
    cells.push({
      style: `left:${n(cx)}%;top:${n(cy)}%;width:${n(w)}vmax;height:200vmax;margin-left:${n(-w / 2)}vmax;transform-origin:50% 0;transform:rotate(${n(ang + 180)}deg);background:linear-gradient(180deg,${paint} 0%,${lit ? clear(true) : clear(false)} 100%)`,
    });
    ang += deg;
  }
  return { cells, mask: null };
}

export const BUILDERS = { slats, rings, shards };
