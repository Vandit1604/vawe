// The option contract, and the only place that decides what a valid field is.
//
// Every rule lives in one table so the checker is one loop and the error messages are uniform.
// Nothing is ever silently dropped or silently replaced: an unknown key, an out-of-range number
// or a malformed colour throws and names itself. That is deliberate. A generator that quietly
// ignores `patern:` hands you a field you did not ask for and no way to find out why.

import { isHex } from './colour.js';

export const PATTERNS = ['slats', 'rings', 'shards'];
// How an element's extent varies with where it sits. `full` is the no-op: every element runs the
// whole frame, which is what a blind does.
// The last four are built from circular arcs and gaussians rather than from sines, and they are here
// because `arch` is the only round thing the table had and a sine hump is not a dome: it leaves the
// baseline at a finite slope and its shoulders sag. `circle` leaves it vertically.
export const SHAPES = ['full', 'ramp', 'arch', 'valley', 'wave',
  'circle', 'crescent', 'scallops', 'hills'];
// Which edge an element grows from. An envelope is a horizon, and a horizon has a side.
export const ANCHORS = ['bottom', 'top'];
// Light rarely leaves along an axis. The corners are here because a frame that darkens down AND
// right at once is ordinary, and no edge keyword can say it.
// `center` is away in EVERY direction at once. The two paired names are away along ONE axis and not
// at all along the other, which is the shape a low sun makes: a lit band with darkness above and
// below it and nothing taken off the sides.
//
// Measured on refs/ref-b.png, which is that picture. Under `center` the render was 27 units too
// bright at the top edge and 16 too dark at the left edge in the same frame, because a radial fall
// cannot darken the top without darkening the sides by more. No value of `depth` or `softness` fixes
// that, and no existing keyword says it: `top` and `bottom` each darken one end and leave the other
// lit. It is a SHAPE that was missing from the vocabulary, not a number that was wrong.
export const DIRECTIONS = ['left', 'right', 'top', 'bottom', 'center',
  'top-and-bottom', 'left-and-right',
  'top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const MOTIONS = ['still', 'drift', 'breathe', 'shimmer'];

// LIGHTFIELD_BLURBS: one line per name in the five vocabularies above, next to the vocabularies
// themselves (the `blurb` pattern of blocks/catalog.mjs). Consumed by the generated docs table and by
// any catalog/MCP surface; a name with no blurb, or a blurb with no name, is a bug the catalog reports.
// The text is the per-entry prose of docs/LIGHTFIELD.md and of the comments above, moved rather than
// rewritten, so there is one wording of each fact.
// `top` and `bottom` are BOTH an anchor and a direction, and one flat table has one row per name, so
// those two blurbs say both meanings.
export const LIGHTFIELD_BLURBS = {
  // pattern: the structure of the field
  slats: 'a backlit blind: vertical bars of unequal width, each with a lit leading edge falling to a dark trailing edge, the eye travels across',
  rings: 'concentric bands round a point, like light on water, the eye travels outwards',
  shards: 'a fan of rays from a pivot below the frame, the eye travels up and out',
  // envelope shape: each element's extent as a curve in where it sits
  full: 'the no-op envelope, 1 everywhere: every element runs the whole frame, which is what a blind does',
  ramp: 'a straight climb across the row, so the extents rise steadily from one side to the other',
  arch: 'a sine hump. It leaves the baseline at a finite slope and its shoulders sag, so it reads as a bump, not a dome',
  valley: 'the sine hump run upside down: a dip in the middle with both ends tall',
  wave: 'sinusoidal wave across units',
  circle: 'the unit semicircular arc, which leaves the baseline UPRIGHT. A symmetric dome, a planet limb, an eclipse',
  crescent: 'one circular arc with a second equal arc bitten out of it. A moon horn: empty on one side, a concave inner edge, a point at the tip',
  scallops: 'the same semicircle repeated five times. Odd, so one arc sits centred. A scalloped horizon when shallow, an arcade when tall',
  hills: 'three gaussians of unequal width and height summed, rolling ground: three summits with soft saddles between them',
  // anchor (which edge an element grows from) · direction (which way "away" is)
  bottom: 'as an anchor, the element grows up from the bottom edge and its free end is the top; as a direction, away is downward',
  top: 'as an anchor, the element hangs down from the top edge and its free end is the bottom; as a direction, away is upward',
  left: 'a linear fall away to the left. A direction and no centre, so only the move along it reaches the fall',
  right: 'a linear fall away to the right, the default bearing',
  center: 'a radial: away in EVERY direction at once, so no edge can darken without the others darkening too',
  'top-and-bottom': 'a lit band across the middle with darkness above and below it and nothing taken off the sides, the shape a low sun makes',
  'left-and-right': 'a lit vertical band with darkness at both sides and nothing taken off the top or bottom',
  'top-left': 'a diagonal fall away to the top left, light rarely leaves along an axis, and no edge keyword says this',
  'top-right': 'a diagonal fall away to the top right, light rarely leaves along an axis, and no edge keyword says this',
  'bottom-left': 'a diagonal fall away to the bottom left, light rarely leaves along an axis, and no edge keyword says this',
  'bottom-right': 'a diagonal fall away to the bottom right, light rarely leaves along an axis, and no edge keyword says this',
  // motion: how the field lives against the frame clock
  still: 'nothing moves: the output reads no clock at all',
  drift: 'the field travels as one body, the cells holding station against each other',
  breathe: 'idle breathe',
  shimmer: 'the cells slide against each other, so the seams open and close',
};

// kind: int | unit (a 0..1 dial) | signed (a -1..1 dial) | num | hex | enum | group
export const SCHEMA = {
  seed: { kind: 'int', min: 0, max: 4294967295, def: 3449610, primary: true },

  colour: {
    kind: 'group',
    fields: {
      // The hot core of the light. Read the field from here outwards.
      bloom: { kind: 'hex', def: '#ee7c56', primary: true },
      // The second colour, opposite the bloom. This is what stops a field being one hue.
      mid: { kind: 'hex', def: '#c22d45', primary: true },
      // The saturated body the light sits in.
      deep: { kind: 'hex', def: '#851b08', primary: true },
      // What the light falls away into. Usually near black.
      //
      // `ground` is the FAR STOP OF THE BODY GRADIENT as well as the backdrop, so it is not free to
      // be the shadow colour: it is mixed with `deep` at 35% and 70% across the frame, and a violet
      // ground drags the lit body violet too. Measured, on the reference: pushing ground from
      // #000202 to #12082a took the shadow band's temperature error from +14.4 to -2.6, which is
      // the fix, and the shadow band's dE from 27.7 to 42.2 and the mid band's brightest cell from
      // r-b 133 to 55, which is the picture falling apart. That is why `shade` exists below.
      ground: { kind: 'hex', def: '#000202', primary: true },
      // AMBIENT FILL, and the reason real shadows are cool while the sunlit parts stay warm.
      //
      // A field lit by one warm source has warm shadows, because a shadow here is just less of the
      // same hue. Photographs almost never look like that: the key light is warm and a faint cold
      // skylight fills everything it does not reach, so the dark end of the picture goes blue or
      // violet while the lit end is untouched. That is one operation, SCREEN, with a very dark
      // colour: it lifts black to exactly this colour and leaves white exactly white, which is what
      // "fill" means and what no combination of the four roles above could say.
      //
      // Black is the EXACT no-op (screen(x, 0) = x), so the dial removes itself at its default and
      // the markup says what the options said. The colour's own darkness is its strength, so there
      // is no second amount dial to keep in step with it.
      shade: { kind: 'hex', def: '#000000' },
      // THE LIGHT THAT COMES THROUGH THE PATTERN, rather than off it.
      //
      // `sheen` is COLOR-DODGE, which SCALES what is behind an element, and 1.5 times black is
      // black. So wherever the field has fallen away, the pattern stops existing: a blind cannot be
      // seen against a black wall. Every real backlit blind can, because some light passes through
      // it everywhere, and it is usually a different, cooler light than the one making the bloom.
      //
      // MEASURED, on refs/lightfield-ref.jpg. In the darkest third of that photograph the striping
      // is STRONGER than in the frame as a whole: edge 4.22 and swing 14.52 against 3.26 and 10.70.
      // The render's same third had edge 1.60 and swing 5.35, under half the frame's own average,
      // and it is plainly featureless black next to the reference's ranks of cool grey slats.
      //
      // NO EXISTING DIAL REACHES IT, and that is why this is a role and not a preset value. `shade`
      // is the obvious candidate and it fails by construction: SCREEN lifts the faces and the gaps
      // between them by the same amount, so brightening it raised the third's mean luma from 29.7
      // to 49.6 (the reference is 27.1) and moved the swing from 5.35 only to 6.67. It floods the
      // dark long before the bars arrive. Amplitude on a near-black base needs an ADDITIVE term on
      // the faces alone, which is what this is.
      //
      // The colour's own brightness is its strength, exactly as with `shade`, so there is no second
      // amount dial to keep in step with it. Black is the exact no-op: plus-lighter adds nothing, so
      // the default emits no layer at all.
      through: { kind: 'hex', def: '#000000' },
      // How much the FINISHED field is saturated. 1 leaves it exactly alone.
      //
      // This exists to undo a property of the construction, not to season it to taste. Stacking
      // translucent light means every mid-tone is an sRGB composite of two hues, and an sRGB
      // composite always lands on the straight line between them while real light rides above it:
      // halfway from #ee7c56 to #851b08 the compositor gives #ba4c2f and the reference image has
      // #b52a1a. Measured against the reference, 1.15 takes the field's chroma from 0.82x to 0.93x
      // AND improves the block error, which is the shape of a correction rather than a preference.
      //
      // It is an OPTION and not a constant because on an already-saturated palette it overshoots,
      // and because a hidden multiplier would mean the bloom you typed is not the bloom you get.
      vivid: { kind: 'num', min: 0.5, max: 2, def: 1.15 },
      // How far a lobe of light reaches before it dies, as a stretch of its own falloff.
      //
      // This was a CONSTANT, and it was fitted to one photograph. That image really does have
      // separate lobes with edges you can point at, so the ramp holds 0.85 out to 30% and finishes
      // by 80%, and it measured better than a gentle one. On any reference whose light is one broad
      // mass, the same ramp draws three hard ellipses and no palette can hide them: it is the single
      // thing that stopped a field of flame and a field of evening sky, and both showed it as
      // circles nobody asked for.
      //
      // 0 is the fitted ramp exactly, so the field that constant was chosen for does not move.
      spread: { kind: 'unit', def: 0 },
      // WHERE THE LIGHT IS, as a percentage across and down the frame.
      //
      // The blob layout underneath was fitted to one photograph and then imposed on every field
      // after it: the bloom cluster is drawn high, the mid below it and the deep body against the
      // left edge, whatever palette you hand it. So a generator advertised as general could only
      // ever light a picture from the top, and a reference lit from the bottom right was
      // unreachable by any seed. Four million layouts were searched for one and none existed,
      // because the search was over jitter inside a fixed frame rather than over the frame.
      //
      // The pair moves the bloom cluster and the mid with it, rigidly. It does NOT move `deep`:
      // that is the body the light sits in, not part of the light, and it stays the large soft mass
      // against one edge. A value outside the frame is legal and useful, because a light source is
      // often just off the picture.
      //
      // The defaults are the CENTRES of the fitted ranges, so they shift nothing and the field that
      // layout was chosen for does not move.
      originX: { kind: 'num', min: -50, max: 150, def: 50 },
      originY: { kind: 'num', min: -50, max: 150, def: 12.5 },
      // HOW MANY LOBES THE BLOOM CLUSTER HAS.
      //
      // This was the number 3, written into the array literal in index.js, and it was fitted to the
      // same photograph everything else here was fitted to. `colour.spread` was the same class of bug
      // one level up: a constant chosen for one image and then imposed on every field after it.
      //
      // The count decides what KIND of light this is, and no other dial can say it. One lobe is a
      // torch. Three large ones overlap into a single soft mass with a round edge you can point at,
      // which is a spotlight on a curtain. Six or eight smaller ones make a field that flows, with
      // dark lanes between the regions, which is what a photograph of light in a room looks like.
      //
      // The cluster keeps the same TOTAL area whatever the count: each lobe's size is scaled so the
      // series' nominal area matches the fitted three's. So this dial spends light differently and
      // never adds more of it, and a field cannot be brightened by asking for more lobes.
      //
      // 3 is the fitted cluster exactly, so the fields that number was chosen for do not move.
      lobes: { kind: 'int', scale: 'log', min: 1, max: 12, def: 3 },
      // HOW EVENLY THOSE LOBES ARE SPREAD ACROSS THE FRAME.
      //
      // `lobes` alone cannot make a broad band, and that is worth being precise about. Every lobe
      // draws its position independently, so a cluster is lumpy however many lobes it has: pile up a
      // few independent draws and you get humps with dips between them. Measured on ref-b, the
      // fitted three put a dip at 56% of the width where the reference's horizontal profile is flat
      // from 25% to 75%, and adding lobes at random positions moved the dips around rather than
      // filling them.
      //
      // 0 draws every lobe anywhere in the span, which is the fitted behaviour. 1 gives each lobe
      // its own equal band of the frame, so the cluster covers the width instead of clumping in part
      // of it. Between them the band opens up towards the full span.
      //
      // It is x only. Both references put their light in a horizontal BAND, so spreading the cluster
      // vertically as well would work against the thing this is for.
      evenness: { kind: 'unit', def: 0 },
      // Anything the four roles cannot name, as an ordered list, laid over them in the order given.
      // The roles stay the whole API for a simple field: this is empty by default and most palettes
      // never touch it. The reference needs it, because it carries a dark magenta lane between two
      // orange lobes and a blue corner, and neither is a bloom, a mid, a deep or a ground.
      extra: { kind: 'hexlist', max: 4, def: [] },
    },
  },

  shadow: {
    kind: 'group',
    fields: {
      // How far into darkness the far side goes. 0 emits no shadow layer at all, which is what the
      // reference wants: its colour field already drains to the ground on the right, and a second
      // fall on top of that measured WORSE against the real image.
      depth: { kind: 'unit', def: 0 },
      // How gradual that fall is. 0 is an edge you can point at, 1 crosses the whole frame.
      softness: { kind: 'unit', def: 0.3 },
      // Which way the light falls off.
      direction: { kind: 'enum', of: DIRECTIONS, def: 'bottom' },
      // WHERE THE SHADOW IS, as a percentage across and down the frame.
      //
      // `direction` is eleven keywords and a keyword is a BEARING, not a place: it says which way the
      // dark lies and never how far off centre it sits. So the light could be moved anywhere in the
      // frame with `colour.originX/originY` and the shadow it casts stayed pinned to the middle, and
      // the two halves of one picture were asked for in two different languages.
      //
      // Same name, same units, same meaning: percent of the frame, 50/50 unmoved, off-frame legal.
      // What it reaches depends on the shape `direction` names, and that is a property of the shapes
      // rather than of this dial:
      //   `center`           the radial's centre. The whole vector lands.
      //   the paired names   the middle of the lit band moves along the axis the fall runs on.
      //   the eight bearings the fall BEGINS earlier or later along its own axis, and the vignette
      //                      under it takes the whole vector. A one-way linear fall has no across,
      //                      so the component at right angles to it can only move the vignette.
      //
      // Defaults are the unmoved position, so no committed field moves.
      originX: { kind: 'num', min: -50, max: 150, def: 50 },
      originY: { kind: 'num', min: -50, max: 150, def: 50 },
      // WHAT THE LIT HALF OF THE PATTERN IS: a surface catching light, or a source making it.
      //
      // `reflected` is COLOR-DODGE. It scales the field under an element up by one factor per pixel,
      // so a lit face brightens along the hue that is lighting it and black stays black: light that
      // is not behind the blind cannot come through it. That is right for a blind, a colonnade and a
      // wall, and it is why dodge replaced plus-lighter here in the first place.
      //
      // It is also a CEILING, and the ceiling is the whole reason this dial exists. Dodge is clamped
      // at about 1.5x, and 1.5 times black is black, so no combination of sheen, seam, palette and
      // seed can draw a bright mark on a dark ground. A flame, a filament, a neon line and a star are
      // all that picture, and all of them were unreachable: the field of flame came out as a lit
      // field with black teeth in it, the tonal inverse of its own reference, and three passes of
      // dial-turning could not have fixed it because the missing thing was not a dial value.
      //
      // `emitted` is PLUS-LIGHTER in the light's own colour. An element ADDS `colour.bloom` at the
      // strength `sheen` asks for, so it is bright against black and clips to white where the field
      // beneath it is already hot, which is exactly how a hot core reads. The two are one word apart
      // because they are one question: does this element take light, or give it?
      light: { kind: 'enum', of: ['reflected', 'emitted'], def: 'reflected' },
      // The two halves of the pattern's contrast, and they are two dials because they are two jobs.
      // `seam` is the line BETWEEN elements: it multiplies, so it darkens without desaturating.
      // `sheen` is the light ON an element's face: it adds the bloom colour, so it brightens along
      // the hue instead of towards white. One combined `relief` could not raise the seams without
      // dimming the picture, which is what made the first pass brown and soft at the same time.
      //
      // SEAM IS SIGNED, and the sign is the polarity. A gap between two slats is dark because the
      // light is behind them; a gap between two lit panels is BRIGHT because the light is between
      // them, and both are ordinary pictures. So a NEGATIVE seam draws the same line into the dodge
      // layer instead of the multiply layer, and one pattern serves a backlit blind and a lit
      // colonnade. The magnitude is the strength either way, and 0 emits no seam cell at all, the
      // same contract `sheen` already had.
      seam: { kind: 'signed', def: 0.5 },
      // How wide that line is, as a fraction of the element it trails. A fraction, not a length, so
      // a dense field gets fine seams and a sparse one gets broad ones without touching this.
      //
      // It is a dial and not a constant because polarity alone cannot draw the second picture: a
      // bright seam at the old fixed 16-40% of an 11-panel field is a bright BAND a tenth of the
      // frame wide, and what a lit colonnade actually shows is a hairline. The default reproduces
      // the old fixed range exactly.
      seamWidth: { kind: 'unit', def: 0.28 },
      // WHERE THE LIGHT LANDS ACROSS AN ELEMENT'S FACE, as a percentage from its leading edge.
      //
      // It was a constant, 22 to 46, and that constant is a statement about one photograph: a
      // backlit blind is brightest a little way in from the seam it trails, because the seam is the
      // slat's own shadow. A field of flame is the other way round. Each wedge is dark at its
      // leading edge and climbs to a hot line at its trailing one, and no combination of polarity,
      // taper and envelope can say that, because the mound was nailed to the left of every element.
      // With the mound fixed, every lit field this generator could reach was lit from the same side.
      //
      // The default is the midpoint of the old fixed range, and the +/-12 spread around it is the
      // old range exactly, so the field that constant was chosen for does not move.
      peak: { kind: 'num', min: 0, max: 100, def: 34 },
      // SHEEN IS SIGNED FOR THE SAME REASON, and the two signs together are what make one pattern
      // reach two opposite pictures. A backlit blind is bright faces cut by dark seams; a colonnade
      // against a bright sky is dark SILHOUETTES separated by bright gaps. That is not a second
      // structure, it is the same structure with both polarities flipped, and without a negative
      // sheen the elements can only ever be the lit thing. 0 still emits no face layer at all.
      sheen: { kind: 'signed', def: 0.8 },
    },
  },

  // The silhouette of each element as a function of WHERE IT SITS.
  //
  // Two references asked for what looked like two features: a row of spikes whose heights climb
  // from left to right, and a row of panels whose light stops at a soft horizon that dips in the
  // middle. They are one thing. Each element has an extent, that extent is a function of the
  // element's position across the frame, and the only differences are the function, which end the
  // element grows from, and whether it narrows as it goes.
  envelope: {
    kind: 'group',
    fields: {
      // The function. `full` is 1 everywhere, so the default envelope is no envelope.
      //
      // `circle` is an exact semicircular arc, symmetric about the middle. The four round kinds are
      // not reachable by turning the five that came before them: `from` above `to` already gives the
      // upside-down version of any curve, so a round valley is `circle` run backwards and is not a
      // separate kind, while a crescent, a row of arcs and a range of hills are shapes no pair of
      // endpoints can produce.
      kind: { kind: 'enum', of: SHAPES, def: 'full' },
      // The extent at the function's floor and at its ceiling. `from` above `to` runs the shape
      // backwards, which is why there is no separate direction dial.
      from: { kind: 'unit', def: 0 },
      to: { kind: 'unit', def: 1 },
      // How much each element wanders off the curve. 0 is a clean edge, 1 is a ragged one.
      jitter: { kind: 'unit', def: 0 },
      // Which edge the element grows from. The far end is the one that tapers.
      anchor: { kind: 'enum', of: ANCHORS, def: 'bottom' },
      // How much the element narrows towards its far end. 0 is a bar, 1 is a spike ending in a
      // point. This is the cross-axis half of the same silhouette, which is why it lives here and
      // not beside `count`: it narrows towards whichever end `anchor` says is free.
      taper: { kind: 'unit', def: 0 },
      // HAND THE ENVELOPE TO THE FIELD INSTEAD OF TO THE ELEMENTS, at this strength. 0 emits nothing
      // and every element keeps its own extent, which is everything above.
      //
      // A landscape is one curve sampled per column; an envelope is one extent per element. A row of
      // twelve panels each holding its own height is twelve boxes with steps between them, and the
      // reference this was written for is a single continuous ridge with panel seams drawn OVER it.
      // Softness cannot close that gap, because softness blurs an edge and what was wrong was who
      // owned the edge. Two passes were spent on that dial and both made the picture worse.
      //
      // Above 0 the same curve is drawn once, across the whole frame, at a resolution the eye reads
      // as continuous, with smooth noise riding on it in place of the per-element jitter. The
      // elements then run the whole frame, so their seams are full-height panel lines rather than
      // the edges of boxes. The number is the mass's opacity: a ridge can be a black cut-out or a
      // haze on the horizon.
      mass: { kind: 'unit', def: 0 },
      // WHERE THE DARK IS, as a percentage across and down the frame.
      //
      // The silhouette had no position at all. `from` and `to` say how TALL it is and `kind` says
      // what SHAPE it is, and between them there was no way to say that the dome sits three quarters
      // of the way across, or that the ridge sits low. An author could only reach for `kind`, and a
      // shape chosen because it happens to peak in the right place is a shape chosen for the wrong
      // reason.
      //
      // Same name, same units and same meaning as `colour.originX/originY`, because they answer the
      // same question about the other half of the picture: `colour` places the LIGHT and this places
      // the MASS. Percent of the frame, 50/50 unmoved, off-frame values legal because half a dome is
      // an ordinary horizon. Raising `originY` always moves the silhouette's free edge DOWN the
      // frame, whichever edge `anchor` holds.
      //
      // The defaults are exactly the unmoved position, so every field written before these existed
      // draws the same picture.
      originX: { kind: 'num', min: -50, max: 150, def: 50 },
      originY: { kind: 'num', min: -50, max: 150, def: 50 },
      // How sharply the extent ENDS. 0 stops dead, 1 fades over the element's whole length.
      //
      // An extent with a hard end is a bar chart. Both references that needed an envelope end soft:
      // a flame's tip glows out rather than stopping, and a hill against a bright sky is a blurred
      // edge, not a rectangle. Fading is a mask along the element's own axis, so it costs no filter
      // and no second element, and it fades whichever end `anchor` left free. 0 emits nothing.
      softness: { kind: 'unit', def: 0 },
    },
  },

  pattern: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: PATTERNS, def: 'slats' },
      // How many elements across the field.
      count: { kind: 'int', scale: 'log', min: 1, max: 400, def: 62 },
      // How unequal they are. 0 is a ruler, 1 is a thicket.
      jitter: { kind: 'unit', def: 0.55 },
    },
  },

  motion: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: MOTIONS, def: 'shimmer' },
      // Cycles per second, roughly. Motion is driven off var(--t), the engine frame clock.
      speed: { kind: 'num', min: 0, max: 4, def: 1 },
      // How big the move is, as a multiple of the preset's own size.
      amount: { kind: 'num', min: 0, max: 4, def: 1 },
    },
  },
};

class LightfieldError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'LightfieldError';
  }
}

const fail = (msg) => {
  throw new LightfieldError(msg);
};

const list = (xs) => xs.map((x) => `"${x}"`).join(', ');

function checkUnknown(given, allowed, at) {
  for (const key of Object.keys(given)) {
    if (!allowed.includes(key)) {
      fail(`lightfield: unknown option ${at}${key}. Valid keys here: ${list(allowed)}.`);
    }
  }
}

function checkValue(rule, value, at) {
  switch (rule.kind) {
    case 'hex':
      if (!isHex(value)) fail(`lightfield: ${at} must be a 6-digit hex colour like "#ee7c56". Got ${JSON.stringify(value)}.`);
      return value;
    case 'hexlist':
      if (!Array.isArray(value)) fail(`lightfield: ${at} must be an array of 6-digit hex colours. Got ${JSON.stringify(value)}.`);
      if (value.length > rule.max) fail(`lightfield: ${at} takes at most ${rule.max} colours. Got ${value.length}.`);
      value.forEach((v, i) => {
        if (!isHex(v)) fail(`lightfield: ${at}[${i}] must be a 6-digit hex colour like "#ee7c56". Got ${JSON.stringify(v)}.`);
      });
      return [...value];
    case 'enum':
      if (!rule.of.includes(value)) fail(`lightfield: ${at} must be one of ${list(rule.of)}. Got ${JSON.stringify(value)}.`);
      return value;
    case 'int':
      if (!Number.isInteger(value)) fail(`lightfield: ${at} must be a whole number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`lightfield: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    case 'unit':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number from 0 to 1. Got ${JSON.stringify(value)}.`);
      if (value < 0 || value > 1) fail(`lightfield: ${at} must be between 0 and 1. Got ${value}.`);
      return value;
    case 'signed':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number from -1 to 1, where the sign is the polarity. Got ${JSON.stringify(value)}.`);
      if (value < -1 || value > 1) fail(`lightfield: ${at} must be between -1 and 1. Got ${value}.`);
      return value;
    case 'num':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`lightfield: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    default:
      return value;
  }
}

// Check the given options against the table and return a fully filled, key-ordered copy.
// Key order is fixed by the table, so two equal option sets always serialise the same way.
export function resolve(given = {}, skipHonours = false) {
  if (given === null || typeof given !== 'object' || Array.isArray(given)) {
    fail(`lightfield: options must be a plain object. Got ${JSON.stringify(given)}.`);
  }
  checkUnknown(given, Object.keys(SCHEMA), '');

  const out = {};
  for (const [key, rule] of Object.entries(SCHEMA)) {
    if (rule.kind !== 'group') {
      out[key] = key in given ? checkValue(rule, given[key], key) : rule.def;
      continue;
    }
    const sub = given[key];
    if (sub !== undefined && (sub === null || typeof sub !== 'object' || Array.isArray(sub))) {
      fail(`lightfield: ${key} must be an object with keys ${list(Object.keys(rule.fields))}. Got ${JSON.stringify(sub)}.`);
    }
    checkUnknown(sub || {}, Object.keys(rule.fields), `${key}.`);
    out[key] = {};
    for (const [k, r] of Object.entries(rule.fields)) {
      out[key][k] = sub && k in sub ? checkValue(r, sub[k], `${key}.${k}`) : r.def;
    }
  }
  if (!skipHonours) checkHonoured(out);
  return out;
}

// Which patterns honour which optional dial.
//
// A dial that only some structures can use is the silent-substitution trap this file exists to
// close: `rings` has no seam WIDTH and no left-to-right axis, so it cannot honour `seamWidth` or
// `envelope`, and quietly accepting them would hand back a field the caller did not ask for with no
// way to find out why. One table, one loop, and the error names the dial AND the patterns that do
// take it.
// A whole group, or one leaf inside it, and who takes it.
export const HONOURS = [
  { at: 'shadow.seamWidth', by: ['slats'] },
  // Only slats draw a face with a mound on it. A ring's face is a border and a shard's runs along
  // its length, so neither has a leading edge for the light to land a given distance in from.
  { at: 'shadow.peak', by: ['slats'] },
  // Rings have no axis to run an envelope along: a band's position is a radius, not a place in a
  // row, so `from` and `to` would have nothing to interpolate between.
  { at: 'envelope', by: ['slats', 'shards'] },
  // A shard grows from a pivot outwards, so its far end is always the far end and there is no
  // second choice for the anchor to make.
  { at: 'envelope.anchor', by: ['slats'] },
];

// Is this option still exactly what the schema would have given it?
function atDefault(out, at) {
  const [group, leaf] = at.split('.');
  const rule = SCHEMA[group];
  if (leaf) return out[group][leaf] === rule.fields[leaf].def;
  return Object.entries(rule.fields).every(([k, r]) => out[group][k] === r.def);
}

// normalise(opts) -> a valid option set from a plausible one.
//
// `resolve` REFUSES a dial the chosen structure cannot honour, which is right: quietly accepting it
// hands back a field nobody asked for. But a caller that picks a structure at random, like the
// playground's randomiser, then has to know the table to avoid making an illegal pair. It should not:
// the table is here, so the repair is here too. Every field a structure cannot honour goes back to its
// declared default, and nothing else is touched.
//
// This is the one legitimate reset. It is not a silent substitution, because the value being dropped
// is one the structure has no way to express.
export function normalise(given) {
  // Fill and range-check WITHOUT the cross-field rule, because that rule is the thing being repaired:
  // calling the strict resolver first would throw on exactly the input this function exists to accept.
  const out = resolve(given, true);
  const kind = out.pattern.kind;
  for (const rule of HONOURS) {
    if (rule.by.includes(kind)) continue;
    const [group, leaf] = rule.at.split('.');
    const spec = SCHEMA[group];
    if (leaf) out[group][leaf] = spec.fields[leaf].def;
    else for (const [k, r] of Object.entries(spec.fields)) out[group][k] = r.def;
  }
  checkHonoured(out);   // it must now pass the real rule, or the repair table is wrong
  return out;
}

function checkHonoured(out) {
  const kind = out.pattern.kind;
  for (const rule of HONOURS) {
    if (rule.by.includes(kind) || atDefault(out, rule.at)) continue;
    fail(`lightfield: pattern.kind "${kind}" does not honour ${rule.at}. `
      + `Only ${list(rule.by)} do. Leave ${rule.at} at its default or change the pattern.`);
  }
}

export { LightfieldError };
