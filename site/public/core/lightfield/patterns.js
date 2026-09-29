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

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp100 = (v) => (v < 0 ? 0 : v > 100 ? 100 : v);

// The mound on a lit face, as gradient stops. A falloff shorter than 6% of the bar is a LINE, not a
// falloff: at a peak hard against one edge the old three-stop form drew a dark hairline in the last
// few percent, exactly where a flame's hottest edge belongs. So a stop that close to the peak is not
// drawn at all, and the face runs bright to that edge.
function mound(fp, fa, peak) {
  const stops = [];
  if (peak > 6) stops.push(`${fp(fa * 0.25)} 0%`);
  stops.push(`${fp(fa)} ${n(peak)}%`);
  if (peak < 94) stops.push(`${fp(fa * 0.1)} 100%`);
  return `linear-gradient(90deg,${stops.join(',')})`;
}

// The envelope, as one function of one number.
//
// `u` is where the element sits across the frame, 0 to 1. What comes back is its EXTENT, 0 to 1, a
// fraction of the frame it fills along its own axis. Every shape here is a plain curve in u, which
// is the whole reason a rising row of spikes and a dipping horizon of panels are one dial and not
// two features.
//
// THE ROUND HALF OF THE TABLE, and why sin was not already it. `arch` is a sine hump: it leaves the
// baseline at a finite slope and its shoulders sag. A circle leaves the baseline VERTICALLY, and that
// single difference is what the eye reads as a dome rather than as a bump. Everything below is built
// out of circular arcs or out of gaussians, so none of it is a polyline and none of it has a corner.
//
// One unit circular arc, in x running -1 to 1. Every point of the returned curve satisfies
// x*x + y*y = 1 exactly, so this is a circle and not a shape that resembles one.
const arc = (x) => (x <= -1 || x >= 1 ? 0 : Math.sqrt(1 - x * x));

// The largest value a curve reaches, scanned rather than guessed. `from` and `to` are documented as
// the extent at the curve's FLOOR and at its CEILING, and a shape whose ceiling is 0.81 quietly makes
// `to` mean something else. The scan is a fixed loop over a pure function, so it is as deterministic
// as the curve it measures.
const peakOf = (f) => {
  let m = 0;
  for (let i = 0; i <= 2000; i++) { const v = f(i / 2000); if (v > m) m = v; }
  return m;
};

// A crescent: one circular arc with a second, equal arc bitten out of it. The bite is offset along x,
// so the left side cancels to nothing and the right side keeps the whole of the first arc. Both edges
// are circles, which is what makes it a moon and not a wedge.
const BITE = 0.42;
const crescentRaw = (u) => { const x = 2 * u - 1; return Math.max(0, arc(x) - arc(x + BITE)); };

// A row of arcs: the unit semicircle repeated. An odd count puts one arc dead centre, so the row is
// symmetric about the middle of the frame the way `arch` and `circle` are.
const SCALLOPS = 5;
const scallops = (u) => { const t = u * SCALLOPS; return arc(2 * (t - Math.floor(t)) - 1); };

// Rolling ground: three gaussians of different widths at different places, summed. Gaussians have no
// edges at all, so the sum is smooth everywhere, and three unequal ones never repeat, which is what
// separates a landscape from a pattern.
const HILLS = [{ at: 0.19, w: 0.1, h: 0.78 }, { at: 0.5, w: 0.13, h: 1 }, { at: 0.82, w: 0.085, h: 0.62 }];
const hillsRaw = (u) => HILLS.reduce((s, g) => { const z = (u - g.at) / g.w; return s + g.h * Math.exp(-0.5 * z * z); }, 0);

const CRESCENT_PEAK = peakOf(crescentRaw);
const HILLS_PEAK = peakOf(hillsRaw);

const SHAPE = {
  full: () => 1,
  ramp: (u) => u,
  arch: (u) => Math.sin(Math.PI * u),
  valley: (u) => 1 - Math.sin(Math.PI * u),
  wave: (u) => 0.5 + 0.5 * Math.sin(2 * Math.PI * u),
  circle: (u) => arc(2 * u - 1),
  crescent: (u) => crescentRaw(u) / CRESCENT_PEAK,
  scallops,
  hills: (u) => hillsRaw(u) / HILLS_PEAK,
};

// `from` and `to` map the curve onto the extents the caller wants, and `from` above `to` runs it
// backwards, which is why there is no direction dial.
//
// The jitter draw is taken ONLY when jitter is non-zero. A draw taken unconditionally would shift
// the rng stream for every field that never asked for an envelope, and every committed preset would
// change without anyone touching it.
//
// WHERE THE SHAPE IS. `envelope.originX/originY` are a translation of the whole silhouette, in the
// same percent-of-frame units as `colour.originX/originY`, and 50/50 is the unmoved position, so a
// field that never asks for one is byte-identical to the field before these existed.
//
// originX slides the curve ACROSS: the sample point moves the other way, so raising it moves a dome's
// crest to the right. originY slides the silhouette's free edge DOWN the frame whichever end it grows
// from, which is why the sign follows `anchor`: adding extent to a bottom-anchored mass raises its
// top, and adding it to a top-anchored one lowers its bottom.
export function envelopeOf(opt) {
  const { kind, from, to, jitter, anchor, originX, originY } = opt.envelope;
  const curve = SHAPE[kind];
  const across = (originX - 50) / 100;
  const along = (anchor === 'top' ? originY - 50 : 50 - originY) / 100;
  return (u, r) => {
    const base = from + (to - from) * curve(clamp01(u - across)) + along;
    return clamp01(jitter === 0 ? base : base * (1 + jitter * span(r, -1, 1)));
  };
}

// The element's box along its own axis, from its extent and which end it grows from. The -2/104
// overscan is deliberate and older than the envelope: a bar that stops exactly at the frame edge
// shows a hairline of backdrop when the field drifts.
function extentBox(anchor, ext) {
  const h = 104 * ext;
  return anchor === 'top' ? `top:-2%;height:${n(h)}%` : `top:${n(102 - h)}%;height:${n(h)}%`;
}

// Taper: the element narrows towards its FREE end, the one the anchor is not holding. `taper` 0
// emits nothing at all, so a field that does not want it carries no clip-path.
function taperClip(anchor, taper) {
  if (taper === 0) return '';
  const tip = 1 - taper;
  const l = n(50 - 50 * tip), rr = n(50 + 50 * tip);
  const poly = anchor === 'top'
    ? `polygon(0% 0%,100% 0%,${rr}% 100%,${l}% 100%)`
    : `polygon(${l}% 0%,${rr}% 0%,100% 100%,0% 100%)`;
  return `;clip-path:${poly}`;
}

// Softness: the element fades out over the last `softness` of its own length, at the free end.
// A mask along the element's own axis, so it needs no filter and no second element, and it applies
// to a dark silhouette and a lit spike alike. 0 emits nothing.
function softMask(anchor, softness) {
  if (softness === 0) return '';
  // 0deg runs bottom to top, so an element anchored at the bottom keeps its base and loses its tip.
  const g = `linear-gradient(${anchor === 'top' ? 180 : 0}deg,#000 ${n(100 - 100 * softness)}%,transparent 100%)`;
  return `;-webkit-mask-image:${g};mask-image:${g}`;
}

// THE FIELD-WIDE SILHOUETTE, and why it is not a per-element dial.
//
// A landscape is ONE curve sampled per column. An envelope is ONE EXTENT PER ELEMENT. Those are not
// the same object, and no amount of softness, jitter or count turns the second into the first: a row
// of twelve panels each holding its own height is twelve boxes with steps between them, and the
// reference it was fitted to is a single continuous ridge with panel seams drawn OVER it. Two passes
// were spent turning the softness dial at that gap and both made the picture worse, because the dial
// blurs an edge and the thing that was wrong was the edge's owner.
//
// So `envelope.mass` hands the envelope to the FIELD instead of to the elements. The same curve, the
// same `from`, `to`, `kind` and `anchor`, sampled at a resolution the eye reads as continuous, with
// smooth noise riding on it in place of the per-element jitter. The elements then run the whole
// frame, which is what makes their seams full-height panel lines rather than the edges of boxes.
const COLS = 180;   // columns across the ridge. Fine enough that the steps are under half a percent.

// Smooth value noise on [0,1] from k control points, so the ridge wanders instead of following a
// formula. Smoothstep between points: linear interpolation puts a visible corner at every knot, and
// a corner in a horizon reads as a fold rather than as a hill.
function wobble(r, k) {
  const pts = Array.from({ length: k + 1 }, () => r());
  return (u) => {
    const x = clamp01(u) * k;
    const i = Math.min(k - 1, Math.floor(x));
    const t = x - i;
    return pts[i] + (pts[i + 1] - pts[i]) * (t * t * (3 - 2 * t));
  };
}

/**
 * fieldMass(opt, dark) -> cells | null
 *
 * The silhouette as one row of columns, in the multiply layer. Null when `mass` is 0, so a field
 * that never asked for a horizon carries no extra markup and no extra rng draw.
 */
export function fieldMass(opt, dark, group) {
  const { mass, jitter, anchor } = opt.envelope;
  if (mass === 0) return null;
  const r = rng(opt.seed ^ 0x11d6e);
  const env = envelopeOf({ ...opt, envelope: { ...opt.envelope, jitter: 0 } });
  const noise = wobble(r, 7);
  const amp = jitter * 0.45;
  const paint = dark(mass);
  const cells = [];
  for (let i = 0; i < COLS; i++) {
    const u = (i + 0.5) / COLS;
    const ext = clamp01(env(u, r) + (noise(u) - 0.5) * 2 * amp);
    // The column runs 12% past the frame at its anchored end. The layer is blurred as a whole, and a
    // mass that stops at the frame edge blurs into a bright hairline along it.
    const h = 104 * ext + 12;
    const box = anchor === 'top' ? `top:-12%;height:${n(h)}%` : `top:${n(102 - 104 * ext)}%;height:${n(h)}%`;
    cells.push({
      g: group,
      lit: false,
      // A hair over one column wide, or the seams between columns show as light through the mass.
      style: `left:${n((i / COLS) * 100)}%;width:${n(100 / COLS + 0.06)}%;${box};background:${paint}`,
    });
  }
  return cells;
}

// slats, a backlit blind. A narrow hard seam at each bar's trailing edge, and a soft mound of light
// across its face. All the vertical variation comes from the colour field beneath, so the bars read
// as a screen the light comes through, not as painted stripes.
function slats(opt, { dark, lit }) {
  const r = rng(opt.seed ^ 0x51a75);
  const { count, jitter } = opt.pattern;
  const { seam, sheen, seamWidth, peak: peakAt } = opt.shadow;
  const { anchor, taper, softness } = opt.envelope;
  const env = envelopeOf(opt);
  // The sign is the polarity: a negative seam is a bright line between lit panels rather than a
  // dark one between slats. The magnitude is the strength in both directions.
  const seamLit = seam < 0;
  const seamMag = Math.abs(seam);
  // The face takes the same treatment: a negative sheen makes the element a SILHOUETTE, drawn into
  // the multiply layer, so the elements are the dark thing and the gaps between them are the light.
  const faceLit = sheen >= 0;
  const sheenMag = Math.abs(sheen);
  const cells = [];
  const nominal = 100 / count;
  let x = -nominal;
  let g = 0;
  while (x < 101) {
    const w = nominal * (1 + jitter * span(r, -0.6, 1.4));
    // With a field-wide mass the envelope belongs to the FIELD, so the elements run the whole frame
    // and their seams become full-height panel lines. The draw is still taken, so a field keeps its
    // layout when the mass is turned on and off.
    const own = env(clamp01((x + w / 2) / 100), r);
    const ext = opt.envelope.mass > 0 ? 1 : own;
    const box = extentBox(anchor, ext) + taperClip(anchor, taper) + softMask(anchor, softness);

    // The seam. Narrow on purpose: a line you can point at is what reads as a hard edge, and a
    // ramp across the whole bar only dims the picture. Width is a FRACTION of the bar, so a dense
    // field gets fine seams and a sparse one gets broad ones. The 4/7..10/7 spread reproduces the
    // fixed 0.16..0.40 this used to carry, exactly, at the default seamWidth of 0.28.
    const sw = w * span(r, seamWidth * (4 / 7), seamWidth * (10 / 7));
    // A dial at 0 removes the thing. `sheen` already worked this way and `seam` did not: it had a
    // 0.06 floor, so seam 0 still painted a line nobody asked for, and a field of free-standing
    // spikes on black was unreachable.
    const sa = seamMag === 0 ? 0 : (0.06 + seamMag * 0.86) * span(r, 0.7, 1.25);
    const paint = seamLit ? lit : dark;
    // A dodge layer's no-op is opaque BLACK, never a transparent pixel: alpha on a dodge layer
    // lerps towards the source and desaturates.
    const clear = seamLit ? lit(0) : 'rgba(0,0,0,0)';
    if (sa > 0) cells.push({
      g,
      lit: seamLit,
      style: `left:${n(x + w - sw)}%;width:${n(sw)}%;${box};background:linear-gradient(90deg,${clear} 0%,${paint(sa * 0.45)} 46%,${paint(sa)} 100%)`,
    });

    // The face. It catches the light rather than reflecting a lamp, so it peaks somewhere across
    // the bar and falls off both ways. WHERE is `shadow.peak`: a blind is brightest just in from
    // the seam it trails, a flame is brightest at its trailing edge, and that is one number.
    // The +/-12 spread around it is the old fixed 22..46 exactly at the default of 34.
    const peak = clamp100(span(r, peakAt - 12, peakAt + 12));
    const fa = sheenMag * span(r, 0.45, 1.2);
    const fp = faceLit ? lit : dark;
    // A dial at 0 removes the thing, it does not emit an invisible copy of it. sheen 0 means no
    // face layer at all, so the blend never runs and the markup says what the options said.
    if (fa > 0) cells.push({
      g,
      lit: faceLit,
      // With no seam there is no line to leave room for, so the face is the whole bar. Leaving the
      // gap anyway would be a seam at zero strength, which is the thing the dial just removed.
      //
      // A LIT face gets the mound: light lands on it, peaks a little way in from the seam and falls
      // off both ways. A SILHOUETTE gets a flat fill, because it is not catching light, it is
      // blocking it, and a thing that blocks light is opaque all the way across. Given the mound, a
      // silhouette came out as a grey smudge that faded to a tenth of itself at both edges, which
      // is a lit surface drawn in black rather than an object in the way.
      style: `left:${n(x)}%;width:${n(sa > 0 ? w - sw : w)}%;${box};background:`
        + (faceLit ? mound(fp, fa, peak) : fp(fa)),
    });

    x += w;
    g++;
  }
  return { cells, mask: null };
}

// rings, concentric bands round a point, like light on water. The eye travels outwards from a point
// instead of across a grille.
// How far out the bands run, as a percentage of the box. Well past 100 on purpose: the outermost
// bands leave the frame, which is what stops the field reading as a bullseye centred on nothing.
const REACH = 260;

function rings(opt, { dark, lit }) {
  const r = rng(opt.seed ^ 0x21f65);
  const { count, jitter } = opt.pattern;
  const { seam, sheen } = opt.shadow;
  // Polarity applies here too: the alternating bands can cut dark or bright against the field.
  const seamLit = seam < 0;
  const seamMag = Math.abs(seam);
  const cx = span(r, 38, 56);
  const cy = span(r, 30, 62);
  const cells = [];
  // Bands grow outwards by a jittered step and each stays a comparable width. Growing the width
  // with the radius turns the field into a bullseye: the outer bands get so heavy they stop
  // modulating the light and start being the subject.
  //
  // THE STEP IS DERIVED FROM `count`, not fixed. It used to grow by a jittered 4-to-18 whatever the
  // caller asked for, so the loop's `size < 260` guard was the real limit and rings saturated at about
  // 42: every value above that was accepted and silently discarded, while the schema advertised 400.
  // That is the silent-substitution class this repo keeps paying for, and the playground found it
  // within minutes of existing (engine-doctrine/MISTAKES.md #272).
  let size = span(r, 4, 10);
  const step = (REACH - size) / count;
  for (let i = 0; i < count && size < REACH; i++) {
    const thick = (0.4 + jitter * 2.2) * span(r, 0.5, 1.7);
    const face = i % 2 === 0;
    const isLit = face ? sheen >= 0 : seamLit;
    const a = face ? Math.abs(sheen) * span(r, 0.4, 1.1)
      : (seamMag === 0 ? 0 : (0.05 + seamMag * 0.62) * span(r, 0.6, 1.25));
    if (a > 0) cells.push({
      g: i,
      lit: isLit,
      style: `left:${n(cx - size / 2)}%;top:${n(cy - size / 2)}%;width:${n(size)}%;height:${n(size)}%;border-radius:50%;border:${n(thick)}vmin solid ${isLit ? lit(a) : dark(a)}`,
    });
    size += step * span(r, 1 - jitter * 0.55, 1 + jitter * 0.55);
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
  const { taper, softness } = opt.envelope;
  const env = envelopeOf(opt);
  const seamLit = seam < 0;
  const seamMag = Math.abs(seam);
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
    const face = r() < 0.5;
    const isLit = face ? sheen >= 0 : seamLit;
    const a = face ? Math.abs(sheen) * span(r, 0.4, 1.15)
      : (seamMag === 0 ? 0 : (0.05 + seamMag * 0.58) * span(r, 0.55, 1.3));
    const paint = isLit ? lit(a) : dark(a);
    const clear = isLit ? lit(0) : 'rgba(0,0,0,0)';
    // A ray's extent is its LENGTH, and its position across the fan is the envelope's u. The bar is
    // drawn from the pivot outwards, so the free end is always the far one: `anchor` has nothing to
    // hold here and is not read.
    const own = env((ang + fan / 2) / fan, r);
    const ext = opt.envelope.mass > 0 ? 1 : own;
    if (a > 0) cells.push({
      g,
      lit: isLit,
      style: `left:${n(cx)}%;top:${n(cy)}%;width:${n(w)}vmax;height:${n(200 * ext)}vmax;margin-left:${n(-w / 2)}vmax;transform-origin:50% 0;transform:rotate(${n(ang + 180)}deg)`
        + taperClip('top', taper) + softMask('top', softness)
        + `;background:linear-gradient(180deg,${paint} 0%,${clear} 100%)`,
    });
    ang += deg;
    g++;
  }
  return { cells, mask: null };
}

export const BUILDERS = { slats, rings, shards };
