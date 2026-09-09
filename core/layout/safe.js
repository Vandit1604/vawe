// core/safe.js: THE safe area. One definition, four consumers, no second opinion.
//
// WHY THIS EXISTS: "safe" was one word doing three different jobs, defined four times, and the four
// disagreed:
//   core/boot.js      min(W,H)*0.06 on every side          → PLACED content (pin/col/edge keywords)
//   core/tokens.css   240/580/60/180 keyed on data-orient  → drew the ?debug=safe overlay
//   quality/audit.mjs  60/240/900/1340                      → CHECKED content
//   verify/run.js     the same box again                   → checked it again
// So the engine placed `pin:"bottom"` 550px inside the zone the audit called unsafe, and `pin:"top"`
// and `pin:"right"` failed too. The engine told you where the bottom was and the gate failed you for
// being there. Worse, data-orient is just `width > height`, so 1:1 and 4:5 counted as "portrait" and
// inherited TikTok's caption strip: on a 1080x1080 square that reserved 76% of the height.
//
// THE FIX IS CONCEPTUAL, NOT ARITHMETIC. The four numbers could never be reconciled because they
// answer different questions:
//
//   1. MARGIN, don't let content kiss the frame edge. Aesthetic. A property of the CANVAS.
//   2. CHROME, TikTok paints a rail down the right and captions across the bottom. A property of the
//      DESTINATION, not of the shape. 9:16 for a website hero and 9:16 for TikTok are the same canvas
//      with completely different unusable regions.
//   3. ANCHOR, what `pin:"bottom"` resolves to.
//
// Conflating 1 and 2 under the word "portrait" is the bug. So safe CANNOT be derived from aspect
// alone: it needs to know where the video is going. A scene declares `destination`; the default is
// `web`, which means margin only, because most renders here are not going to a phone feed.
//
// THE INVARIANT: placement and checking read THIS function. `pin:"bottom"` resolves to the safe box's
// bottom edge, so an edge pin can never produce a safe-zone failure. That is the property the four
// tables could not have.
//
// AT REST. The invariant is about the box, and the box is where content is PLACED; a camera then
// moves what was placed. Any zoom above 1 carries a safe-edge layer out of the safe box, and the
// engine's own default push is one (`core/engine/produce.js`). See MAX_ZOOM below for the arithmetic, for
// the line that genuinely cannot be crossed, and for who owns which half of it.

import { defineRegistry } from '../registry/registry.js';

// What a ratio MEANS in pixels. This lives here, with the safe area, because the two are the same
// question asked twice ("how big is the frame" / "where inside it may content live") and answering
// them from two tables is precisely how the engine and its gate drifted apart.
//
// A REGISTRY, AND THE VALUE IT CARRIES IS THE PIXELS. Every other vocabulary here maps a name to an
// implementation; this one maps a name to `[w, h]`, which is what boot.js and quality/audit.mjs read.
// That is what a registry's `entries` map already is, so ASPECTS below IS the entries map: the object
// keeps its shape, its keys and its values, and nothing that reads it changes.
//
// What it buys is the blurb. The five ratios reached `make arsenal` with none, so `Q="vertical for a
// phone"` did not reach `9:16` and an author had to already know the notation to find the canvas. The
// catalogue's line was "a ratio is its own definition", which is true of the arithmetic and false of
// the question a person is actually asking, which is never about arithmetic: it is about where the
// film is watched.
export const ASPECT_REGISTRY = defineRegistry('output target', {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '4:3': [1440, 1080],
}, {
  slot: 'aspect',
  blurbs: {
    '16:9': 'wide landscape, the desktop shape: a website hero, a YouTube upload, a deck slide, anything watched on a laptop',
    '9:16': 'tall and vertical, the whole phone screen edge to edge: TikTok, Reels, Shorts, a story',
    '1:1': 'a square, equal on both sides: the feed post that crops the same everywhere it is shown',
    '4:5': 'the tall feed post: Instagram portrait, more height than a square without taking the whole phone',
    '4:3': 'boxy landscape, the old television and slide-projector shape: archive footage, a retro monitor',
  },
  catalog: {
    title: 'Output targets',
    tag: 'canvas',
    intro: '`aspect` picks the CANVAS. Five ratios; a ratio not named here is still honoured, sized to fit the long edge at 1920. WHERE the film is watched is the other half of the question and has its own section, Destinations: 9:16 for a website hero and 9:16 for TikTok are the same canvas, and only one of them has buttons painted down the right. One definition: `core/layout/safe.js`.',
    usage: (n, { j }) => j({ module: 'scene', aspect: n }),
    noPreview: 'an aspect is a property of the canvas, not something that animates. Render at it, or `make audit M=<file> ASPECT=all`.',
  },
});

// The name → pixels table itself, which is the registry's own entries map. boot.js and
// quality/audit.mjs both import this; neither keeps a copy.
export const ASPECTS = ASPECT_REGISTRY.entries;

/**
 * sceneDims(cfg, key?): the canvas a scene renders at, in pixels. An explicit key (an --aspect flag)
 * wins; else the scene's own `aspect`; else the legacy `orientation`; else portrait. A ratio the
 * ASPECTS table doesn't name is still honoured, sized to fit the long edge at 1920.
 *
 * WHY THIS IS HERE and not in each tool: the header above describes four copies of the SAFE box that
 * disagreed. The same thing had already happened one level down, to the question of how big the frame
 * is: eight call sites, three of which read `aspect` and five of which knew only about `orientation`.
 * Since scenes declare `aspect` and almost none declare `orientation`, those five silently rendered
 * every landscape scene into a 1080x1920 portrait viewport and cropped it: `make frame`, `make beats`,
 * `make slop`, `make motion` and `make snap` were all judging a canvas the renderer never produces.
 * Nothing failed, because a cropped viewport is a perfectly stable, perfectly deterministic wrong
 * answer. Dimensions and the safe area are the same question asked twice; both live here (MISTAKES #46).
 */
export function sceneDims(cfg = {}, key = '') {
  const named = key || (typeof cfg.aspect === 'string' ? cfg.aspect : '');
  if (named && ASPECTS[named]) return ASPECTS[named];
  if (named.includes(':')) {
    const [aw, ah] = named.split(':').map(Number);
    if (aw && ah) {
      if (aw === ah) return [1080, 1080];
      return aw > ah ? [1920, Math.round(1920 * ah / aw)] : [Math.round(1920 * aw / ah), 1920];
    }
  }
  return (cfg.orientation === 'landscape' || cfg.orient === 'landscape') ? [1920, 1080] : [1080, 1920];
}

// The bleed margin, as a fraction of the SHORT edge, so it reads the same at any ratio. 0.06 is the
// value core/boot.js already used to place with; keeping it means this change moves no existing pixel.
export const MARGIN = 0.06;

/**
 * MAX_ZOOM: the largest uniform zoom the margin can absorb before edge-pinned content is CROPPED.
 *
 * WHY THIS IS HERE. `MARGIN` is 0.06, and any authored zoom carries a safe-edge layer toward the frame
 * edge; this constant is the point past which the frame edge eats it. The engine used to inject a
 * `slowPush` to 1.06 into every camera-less scene, which made the relationship between these two 0.06s
 * load-bearing on every film; that injection is gone (a still subject should not zoom), but the ceiling
 * still bounds any push an AUTHOR writes, so cropped pixels never ship (docs/MISTAKES.md #454, #458).
 *
 * The arithmetic, once, so it is not re-derived: `#cam` scales about the centre of the viewport, so a
 * point at the safe edge sits `dim * (0.5 - MARGIN)` from that centre and lands at `dim * (0.5 -
 * MARGIN) * s`. It reaches the frame edge, `dim * 0.5`, at `s = 0.5 / (0.5 - MARGIN)`.
 *
 * THE SAFE BOX IS A PLACEMENT BOX, READ AT REST, and that is the honest reading of the invariant
 * below. ANY zoom above 1 carries a safe-edge layer out of the safe box: at 1.06 on 1920x1080 it ends
 * 28px past the line. That is not a defect the margin can be widened out of, because the overshoot
 * scales with the margin it is eating. It is why `quality/audit.mjs` grades the safe zone in scene
 * space AND screen space and reports only when the two agree (#454). What this constant guards is the
 * harder line: past `MAX_ZOOM` the same layer is off the FRAME, cropped, and no reading of any space
 * makes that acceptable.
 */
export const MAX_ZOOM = 0.5 / (0.5 - MARGIN);

// Chrome per destination, as fractions of the canvas (top/bottom of H, left/right of W) so a preset
// survives a canvas resize. `native` documents the aspect the platform actually serves; a preset is
// meaningless on any other canvas, which the audit reports rather than silently hiding.
//
// The 9:16 tiktok figures are this repo's existing portrait numbers (240/580/60/180 on 1080x1920)
// carried over as fractions, not new measurements: 240/1920, 580/1920, 180/1080. They are the only
// platform numbers here with any provenance. reels/shorts are conservative interpolations of the same
// shape and should be re-measured against the real apps before anyone trusts them for a launch.
export const DESTINATIONS = {
  // margin only: a website hero, an X/LinkedIn post, a docs clip. Nothing is painted over the frame.
  web: { native: null, top: 0, bottom: 0, left: 0, right: 0 },
  // Instagram/X feed: the player chrome sits OUTSIDE the media, so the whole frame is usable.
  feed: { native: null, top: 0, bottom: 0, left: 0, right: 0 },
  tiktok: { native: '9:16', top: 0.125, bottom: 0.302, left: 0, right: 0.167 },
  reels: { native: '9:16', top: 0.10, bottom: 0.22, left: 0, right: 0.14 },
  shorts: { native: '9:16', top: 0.08, bottom: 0.16, left: 0, right: 0.13 },
  // broadcast title-safe: the classic 90% box for displays that overscan.
  broadcast: { native: '16:9', top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
};

// The blurbs are read off the table above and say the NUMBERS, because that is the whole question an
// author has: which platform eats which edge. The catalogue used to fold the destinations in with the
// aspect ratios under one `skip` line ("an aspect or a platform"), so nothing anywhere told a reader
// that tiktok paints a rail down the right at 16.7% of the width and shorts does not. A single line
// covering two vocabularies is how a real difference becomes invisible.
const DESTINATION_BLURBS = {
  web: 'no platform chrome at all: the whole frame is usable and only the 4% margin applies. A site hero, an X or LinkedIn post, a docs clip',
  feed: 'Instagram and X in-feed, where the player furniture sits OUTSIDE the media, so nothing is painted over the picture and only the margin applies',
  tiktok: 'the tightest phone target: a rail down the RIGHT at 16.7% of the width for the action buttons, 12.5% off the top and 30.2% off the bottom for the caption and handle. Serves 9:16',
  reels: 'Instagram Reels on 9:16: a 14% right rail, 10% off the top, 22% off the bottom. Looser than tiktok, tighter than shorts',
  shorts: 'YouTube Shorts on 9:16, the most generous phone target: a 13% right rail, 8% off the top, 16% off the bottom',
  broadcast: 'the classic title-safe 90% box, 5% off every edge, for displays that overscan',
};

// A registry, so the section writes itself and safeArea below has one refusal rather than a hand-typed
// list of names beside the table it already reads.
export const DESTINATION_REGISTRY = defineRegistry('destination', DESTINATIONS, { slot: 'destination', blurbs: DESTINATION_BLURBS,
  catalog: {
    title: 'Destinations (platform safe area)',
    tag: 'canvas',
    intro: '`"destination": "<name>"`. WHERE the film is watched, which decides the SAFE AREA inside the canvas. It is a different question from `aspect`: 9:16 for a website hero and 9:16 for TikTok are the same canvas, and only one of them has buttons painted down the right. Chrome and margin combine with max(), never summed. `make audit` measures every layer against this box. One definition: `core/layout/safe.js`.\n\nThe tiktok figures are this repo\'s own portrait numbers carried over as fractions and are the only platform numbers here with any provenance; reels and shorts are conservative interpolations of the same shape and should be re-measured against the real apps before a launch trusts them.',
    usage: (n, { j }) => j({ module: 'scene', aspect: '9:16', destination: n }),
    noPreview: 'a safe area is a property of the canvas, not something that animates. `make audit M=<file> ASPECT=all` is how you see it, as a measurement against your own layers.',
  },
});

export const DESTINATION_NAMES = DESTINATION_REGISTRY.names;

// safeArea(W, H, destination) → { x0, y0, x1, y1, margin, destination }
// The box legible content must stay inside. Chrome and margin are combined with max(), never summed:
// a platform's rail already includes the frame edge, so adding a margin on top would double-count it.
export function safeArea(W, H, destination = 'web') {
  const d = DESTINATION_REGISTRY.pick(destination);
  const margin = Math.round(Math.min(W, H) * MARGIN);
  const inset = (frac, dim) => Math.max(margin, Math.round(dim * frac));
  return {
    x0: inset(d.left, W),
    y0: inset(d.top, H),
    x1: W - inset(d.right, W),
    y1: H - inset(d.bottom, H),
    margin,
    destination,
  };
}

// ── PLACEMENT: the named position vocabulary a layer's `pin` (and a caption's) writes ─────────────
// This was the `PIN` table, copied by hand three times: core/engine/boot.js (the one that actually
// resolves it), core/validate/validate.mjs (the degenerate-pin check) and the `pin` enum in
// formats/scene/schema.json. That is the exact drift this file's own header warns about, just for a
// second question ("where does a name land") instead of the first one ("how big is the frame"). One
// table now; the three consumers read it.
//
// SAME SHAPE AS `ASPECT_REGISTRY` ABOVE, on purpose: the value is plain data (an `[xKeyword, yKeyword,
// widthFraction?]` tuple), not a function. Resolving a keyword into pixels stays core/engine/boot.js's
// job (`resolveCoords`'s own `kw()`/`num()`), the same way choosing pixels for an aspect stays
// `sceneDims`'s job; this registry's only purchase is the name, the blurb and the catalogue entry.
//   xKeyword / yKeyword: 'center' | 'optical' | 'third1' | 'third2' | 'left' | 'right' | 'top' |
//     'bottom' | 'text-band' | null (axis untouched, left to the author). Resolved against the SAFE
//     BOX for every keyword except centre/optical/thirds, which read the CANVAS (boot.js explains why).
//   widthFraction: an optional 0..1 slice of the safe box's width, applied only when the layer does
//     not already declare its own `w`. Absent means "no opinion", same as the 15 classic pins have
//     always had: `pin:"left"` alone was never enough to give a text layer a width.
export const PLACEMENT = {
  center: ['center', 'optical'], top: ['center', 'top'], bottom: ['center', 'bottom'],
  left: ['left', 'center'], right: ['right', 'center'],
  'top-left': ['left', 'top'], 'top-right': ['right', 'top'],
  'bottom-left': ['left', 'bottom'], 'bottom-right': ['right', 'bottom'],
  'thirds-tl': ['third1', 'third1'], 'thirds-tr': ['third2', 'third1'],
  'thirds-bl': ['third1', 'third2'], 'thirds-br': ['third2', 'third2'],
  'thirds-t': ['center', 'third1'], 'thirds-b': ['center', 'third2'],
  'thirds-l': ['third1', 'center'], 'thirds-r': ['third2', 'center'],
  // The de-facto anchors every launch film already hand-types as pixels: `x:160, w:1600` three times
  // in blueprints/kit.mjs, the same margin in scripts/author/scaffold.mjs, and the y:1010 accent rule
  // the scaffold's continuous object sits on. Named here so a film can ask for them at any of the five
  // aspects instead of the one 1920x1080 stage those constants were measured against. Nothing calls
  // these yet (blueprints/kit.mjs and scaffold.mjs still write their own numbers, deliberately, so this
  // commit changes no rendered frame); a later pass points those call sites here.
  stage: ['left', null, 1],       // the full-width content column between the left and right safe edges
  'text-band': [null, 'text-band'], // roughly two-thirds down the safe box, where a headline/sub sits
  'lower-band': ['left', 'bottom'], // the stage's left edge, flush to the safe bottom: a closing rule
};

export const PLACEMENT_REGISTRY = defineRegistry('placement', PLACEMENT, {
  slot: 'pin',
  blurbs: {
    center: 'dead centre of the canvas, vertically at the optical centre rather than the exact middle',
    top: 'horizontally centred, pinned to the top edge of the safe area',
    bottom: 'horizontally centred, pinned to the bottom edge of the safe area',
    left: 'pinned to the left safe edge, vertically centred',
    right: 'pinned to the right safe edge, vertically centred',
    'top-left': 'pinned into the top-left corner of the safe area',
    'top-right': 'pinned into the top-right corner of the safe area',
    'bottom-left': 'pinned into the bottom-left corner of the safe area',
    'bottom-right': 'pinned into the bottom-right corner of the safe area',
    'thirds-tl': 'lands on the upper-left rule-of-thirds power point',
    'thirds-tr': 'lands on the upper-right rule-of-thirds power point',
    'thirds-bl': 'lands on the lower-left rule-of-thirds power point',
    'thirds-br': 'lands on the lower-right rule-of-thirds power point',
    'thirds-t': 'centred horizontally, sat on the upper third line',
    'thirds-b': 'centred horizontally, sat on the lower third line',
    'thirds-l': 'vertically centred, sat on the left third line',
    'thirds-r': 'vertically centred, sat on the right third line',
    stage: 'the full-width content column between the left and right safe margins, at any aspect ratio: kit.mjs\'s hand-typed x:160/w:1600 anchor, portable',
    'text-band': 'the horizontal strip roughly two-thirds down the frame where a headline or a sub-line usually sits',
    'lower-band': 'a thin strip near the bottom safe edge, left-anchored: where a closing rule or a small persistent label sits',
  },
  catalog: {
    title: 'Placement',
    tag: 'pin',
    intro: '`"pin": "<name>"` on a layer or a caption. An aspect-portable position, resolved against the safe box (`core/layout/safe.js safeArea`) rather than a hand-typed pixel, so the same JSON lands correctly at any of the five canvases. `stage`/`text-band`/`lower-band` are the de-facto anchors this repo already hand-types as 1920px pixels; use them instead of a new magic number.',
    usage: (n, { j }) => j({ pin: n }),
    noPreview: 'a placement is a position, not a motion: see it with `make audit M=<file> ASPECT=all`, which checks every name against the safe box at every aspect and destination.',
  },
});

// ── THE CAPTION BAND ────────────────────────────────────────────────────────────────────────────
// A burnt-in caption owns real estate, and nothing stopped a headline landing on it. The band belongs
// HERE, next to safeArea, for the reason the header gives: where a caption sits is a property of the
// DESTINATION, not of the shape. formats/scene/scene.css pins `.hs-cap` with
// `bottom: max(<skin offset>, var(--safe-bottom))`, and core/boot.js:325 writes --safe-bottom from
// safeArea(). So the band reads the same numbers the caption itself is placed against; a second table
// would drift from the CSS exactly the way the four safe boxes drifted from each other.
//
// The skins are scene.css verbatim. `plain` is captionMode sentence/word; `pop` is captionMode "pop";
// `styled` is any captionStyle (it rides the pop layout and adds the scrim plate's padding).
export const CAPTION_SKINS = {
  plain:  { bottomPx: 300, bottomFrac: 0,    fontPx: 46, padPx: 0 },
  pop:    { bottomPx: 0,   bottomFrac: 0.12, fontPx: 64, padPx: 0 },
  styled: { bottomPx: 0,   bottomFrac: 0.12, fontPx: 64, padPx: 14 },
};

// How many caption lines the band reserves. TWO, because that is what a burnt-in caption is written
// to be, and a band sized for the longest line a scene could hold would reserve a third of the frame
// and stop being a keep-out anyone respects. Measured at 1080x1920: a 46px caption lays out at 48px
// per line and a 64px one at 66px, so 1.05 is `line-height: normal` rounded UP, a band that is a
// pixel generous is a band, a band that is a pixel short is a near miss nobody sees.
export const CAPTION_LINES = 2;
const CAPTION_LEADING = 1.05;

// captionSkin(cfg), which skin a scene's caption settings select. One mapping, read by anyone who
// needs the band, so `captionStyle` overriding `captionMode` is not re-guessed per caller
// (formats/scene/scene.js:909 is the renderer's own copy of this precedence).
export const captionSkin = (cfg = {}) =>
  cfg.captionStyle ? 'styled' : cfg.captionMode === 'pop' ? 'pop' : 'plain';

/**
 * captionBand(W, H, destination?, skin?, caps?) → { y0, y1, height, skin, destination, placed }
 * The horizontal strip a burnt-in caption occupies. Vertical only when nothing is placed: an
 * unplaced caption is centred and its width follows its text, so the useful keep-out is the strip.
 *
 * skin defaults to 'any', the UNION of the three skins. The widest strip a caption could occupy on
 * this canvas. Pass a named skin when the scene has declared one and the answer can be exact.
 *
 * `caps` is the scene's caption array WITH PLACEMENT ALREADY RESOLVED (core/boot.js resolveCoords
 * turns `pin` and the edge keywords into px; this function does no resolving of its own, because a
 * second copy of that grammar is how the four safe boxes drifted apart in the first place). Pass it
 * and the band becomes the union of where the captions ACTUALLY sit. Omit it and the answer is
 * exactly what it was before placement existed, which is why no existing caller moves.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. quality/audit.mjs reserves this strip and warns when other
 * content lands in it. The moment a caption can be pinned to the top, a band that still describes
 * the bottom is wrong in both directions at once: it holds empty space nothing needs, and it misses
 * the collision that is really there. A keep-out that reports the wrong strip is worse than none.
 */
export function captionBand(W, H, destination = 'web', skin = 'any', caps = []) {
  const safe = safeArea(W, H, destination);       // throws on an unknown destination, once, here
  const chromeBottom = H - safe.y1;
  const names = skin === 'any' ? Object.keys(CAPTION_SKINS) : [skin];
  if (names.some((k) => !CAPTION_SKINS[k]))
    throw new Error(`unknown caption skin "${skin}". Known: ${Object.keys(CAPTION_SKINS).join(', ')}, or "any"`);
  const bandHeight = (fontPx, padPx) => CAPTION_LINES * Math.ceil(fontPx * CAPTION_LEADING) + 2 * padPx;
  let y0 = Infinity, y1 = -Infinity;
  const eat = (top, bottom) => { y0 = Math.min(y0, top); y1 = Math.max(y1, bottom); };

  const list = Array.isArray(caps) ? caps : [];
  const placed = list.filter((c) => c && typeof c.y === 'number');
  for (const c of placed) {
    // A placed caption's own size decides its band, because `size` is per caption and a 120px line
    // reserves nearly twice what the skin's 64px does.
    const s = CAPTION_SKINS[names[0]] || CAPTION_SKINS.styled;
    eat(c.y, c.y + bandHeight(c.size || s.fontPx, s.padPx));
  }
  // The stylesheet's own band still applies whenever ANY caption places nothing, and when the scene
  // places nothing at all. Both cases go through the identical arithmetic this function always used.
  if (placed.length < list.length || !list.length) {
    for (const k of names) {
      const s = CAPTION_SKINS[k];
      // The CSS max(): the skin's own offset, or the platform's chrome when that is deeper.
      const bottom = H - Math.max(s.bottomPx, Math.round(H * s.bottomFrac), chromeBottom);
      eat(bottom - bandHeight(s.fontPx, s.padPx), bottom);
    }
  }
  return { y0, y1, height: y1 - y0, skin, destination, placed: placed.length };
}

// The aspect a destination serves, or null for the canvas-agnostic ones. A caller can use this to say
// "you asked for tiktok chrome on a 16:9 canvas" out loud instead of quietly producing a strange box.
// `(DESTINATIONS[d] || {}).native ?? null` until now, so an UNKNOWN destination returned the same
// `null` as a destination that legitimately has no fixed aspect (web/feed) - the one input validated
// two different ways nine lines apart from safeArea, which throws. docs/MISTAKES.md #360.
export const nativeAspect = (destination) => {
  const d = DESTINATION_REGISTRY.pick(destination);
  return d.native ?? null;   // null still means "this destination serves any canvas"
};

// ── THE FRAME OBJECT ────────────────────────────────────────────────────────────────────────────
// One object, built once at boot, carrying every answer about the canvas an effect could need: how
// big it is, which ratio it is, where it is going, and where content may live. It exists because an
// effect author had no way to ask any of those questions, createKit() carried theme and ink and no
// frame at all, so block factories hardcoded 1920 and the diveIn headroom guard could only fire when
// a caller remembered to pass the size.
//
// THE LAW: nothing computes the frame twice. Everything RECEIVES this object. Two callers deriving
// the same box independently is exactly how the four safe boxes in the header above drifted apart.
export function frameOf(cfg = {}, aspectKey = '') {
  // Pixel dimensions win when a caller already has them (a view built outside boot knows its W and H
  // and no ratio string reproduces 1440x1080 exactly). Everyone else names a ratio and gets the table.
  const [W, H] = (Number(cfg.W) > 0 && Number(cfg.H) > 0)
    ? [Number(cfg.W), Number(cfg.H)] : sceneDims(cfg, aspectKey);
  const destination = cfg.destination || 'web';
  const aspect = aspectKey || (typeof cfg.aspect === 'string' ? cfg.aspect : (W > H ? '16:9' : '9:16'));
  return Object.freeze({ W, H, aspect, destination, safe: safeArea(W, H, destination) });
}

// ── SETTLED, NOT MID-FLIGHT ─────────────────────────────────────────────────────────────────────
// A layer that SLIDES IN from off-frame is a legitimate entrance; a layer that SETTLES off-frame is a
// bug. Grading the first produces constant false failures, which is what quality/audit.mjs learned
// (docs/MISTAKES.md #376): it grades only ARRIVED content, through midMove() and ARRIVED, after
// grading mid-entrance boxes reported a correct frame as broken.
//
// This is that same rule, read from the JSON instead of from the DOM, and the numbers are audit.mjs's
// own. midMove() calls a layer moving until `start + enter + 0.06`, and again from
// `start + duration - exitDur - 0.06` when it has a MOVING `out` (a default exit fades in place and
// keeps the box on its mark). Its fallbacks for an unset attr are 0.45 enter and 0.4 exit. There is
// one definition of "arrived" in this engine: change these together with audit.mjs or not at all.
export const ARRIVED_PAD = 0.06;
export const DEFAULT_ENTER = 0.45, DEFAULT_EXIT_DUR = 0.4;

// settleWindow(L) → { t0, t1 } the seconds a layer is at rest, or null when it never comes to rest.
export function settleWindow(L = {}) {
  const st = Number(L.start ?? 0) || 0;
  const en = L.split ? 0 : (L.enterDur != null ? Number(L.enterDur) : DEFAULT_ENTER);
  const du = L.duration != null ? Number(L.duration) : Infinity;
  const exD = L.exitDur != null ? Number(L.exitDur) : DEFAULT_EXIT_DUR;
  const t0 = st + en + ARRIVED_PAD;
  const t1 = du === Infinity ? Infinity : (L.out ? st + du - exD - ARRIVED_PAD : st + du);
  return t1 > t0 ? { t0, t1 } : null;
}

export const isSettled = (L, t) => { const w = settleWindow(L); return !!w && t >= w.t0 && t <= w.t1; };

/**
 * outOfFrame(L, frame, t?) → null | { type, id, box, frame, over, at }
 * Does this layer's SETTLED box hang outside the canvas, and by how much? It answers null for
 * everything that is not a verdict: an unplaced layer (the stylesheet owns it), a layer that never
 * settles, and any time inside an entrance or a moving exit. Coordinates must already be px, this
 * reads what resolveCoords produced and resolves nothing of its own, because a second copy of the
 * placement grammar is how the boxes in the header drifted apart.
 */
export function outOfFrame(L, frame, t = null) {
  if (!L || !frame) return null;
  if (typeof L.x !== 'number' && typeof L.y !== 'number') return null;
  const win = settleWindow(L);
  if (!win) return null;
  const at = t == null ? win.t0 : t;
  if (at < win.t0 || at > win.t1) return null;     // mid-entrance / mid-exit is motion, not a verdict
  const x = typeof L.x === 'number' ? L.x : 0, y = typeof L.y === 'number' ? L.y : 0;
  const w = typeof L.w === 'number' ? L.w : 0;
  // Same height fallback resolveCoords uses for `pin:"bottom"`: a text layer rarely declares `h`.
  const h = typeof L.h === 'number' ? L.h
    : ((L.type == null || L.type === 'text') && L.size ? L.size * 1.2 : 0);
  const over = {
    left: Math.max(0, Math.round(-x)), top: Math.max(0, Math.round(-y)),
    right: Math.max(0, Math.round(x + w - frame.W)), bottom: Math.max(0, Math.round(y + h - frame.H)),
  };
  if (!(over.left || over.right || over.top || over.bottom)) return null;
  return { type: L.type || 'text', id: L.id || L.name || null, box: { x, y, w, h },
    frame: { W: frame.W, H: frame.H }, over, at: +at.toFixed(3) };
}

// REPORT ONLY, and deliberately so. A rule that turns shipped scenes red is a regression until every
// one of them is proven a real defect, so this prints and never throws. Whether it ever refuses is a
// decision for a human holding the library-wide count, not for this function.
export const boundsCheckOn = () => !!(globalThis.__FRAME_BOUNDS_CHECK
  ?? (typeof process !== 'undefined' && process.env && process.env.FRAME_BOUNDS === '1'));

export function reportBounds(layers, frame, log = console.warn) {
  const out = [];
  for (const L of layers || []) {
    const f = outOfFrame(L, frame);
    if (!f) continue;
    out.push(f);
    const by = Object.entries(f.over).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}px`).join(', ');
    log(`[frame-bounds] ${f.type}${f.id ? ` "${f.id}"` : ''} settles at ${f.box.x},${f.box.y} `
      + `${f.box.w}x${f.box.h} · outside the ${f.frame.W}x${f.frame.H} frame by ${by} (t=${f.at}s)`);
  }
  return out;
}
