// core/safe.js — THE safe area. One definition, four consumers, no second opinion.
//
// WHY THIS EXISTS: "safe" was one word doing three different jobs, defined four times, and the four
// disagreed:
//   core/boot.js      min(W,H)*0.06 on every side          → PLACED content (pin/col/edge keywords)
//   core/tokens.css   240/580/60/180 keyed on data-orient  → drew the ?debug=safe overlay
//   verify/audit.mjs  60/240/900/1340                      → CHECKED content
//   verify/run.js     the same box again                   → checked it again
// So the engine placed `pin:"bottom"` 550px inside the zone the audit called unsafe, and `pin:"top"`
// and `pin:"right"` failed too. The engine told you where the bottom was and the gate failed you for
// being there. Worse, data-orient is just `width > height`, so 1:1 and 4:5 counted as "portrait" and
// inherited TikTok's caption strip: on a 1080x1080 square that reserved 76% of the height.
//
// THE FIX IS CONCEPTUAL, NOT ARITHMETIC. The four numbers could never be reconciled because they
// answer different questions:
//
//   1. MARGIN — don't let content kiss the frame edge. Aesthetic. A property of the CANVAS.
//   2. CHROME — TikTok paints a rail down the right and captions across the bottom. A property of the
//      DESTINATION, not of the shape. 9:16 for a website hero and 9:16 for TikTok are the same canvas
//      with completely different unusable regions.
//   3. ANCHOR — what `pin:"bottom"` resolves to.
//
// Conflating 1 and 2 under the word "portrait" is the bug. So safe CANNOT be derived from aspect
// alone: it needs to know where the video is going. A scene declares `destination`; the default is
// `web`, which means margin only, because most renders here are not going to a phone feed.
//
// THE INVARIANT: placement and checking read THIS function. `pin:"bottom"` resolves to the safe box's
// bottom edge, so an edge pin can never produce a safe-zone failure. That is the property the four
// tables could not have.

// What a ratio MEANS in pixels. This lives here, with the safe area, because the two are the same
// question asked twice ("how big is the frame" / "where inside it may content live") and answering
// them from two tables is precisely how the engine and its gate drifted apart. boot.js and
// verify/audit.mjs both import this; neither keeps a copy.
export const ASPECTS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350], '4:3': [1440, 1080] };

/**
 * sceneDims(cfg, key?) — the canvas a scene renders at, in pixels. An explicit key (an --aspect flag)
 * wins; else the scene's own `aspect`; else the legacy `orientation`; else portrait. A ratio the
 * ASPECTS table doesn't name is still honoured, sized to fit the long edge at 1920.
 *
 * WHY THIS IS HERE and not in each tool: the header above describes four copies of the SAFE box that
 * disagreed. The same thing had already happened one level down, to the question of how big the frame
 * is — eight call sites, three of which read `aspect` and five of which knew only about `orientation`.
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

// Chrome per destination, as fractions of the canvas (top/bottom of H, left/right of W) so a preset
// survives a canvas resize. `native` documents the aspect the platform actually serves; a preset is
// meaningless on any other canvas, which the audit reports rather than silently hiding.
//
// The 9:16 tiktok figures are this repo's existing portrait numbers (240/580/60/180 on 1080x1920)
// carried over as fractions, not new measurements: 240/1920, 580/1920, 180/1080. They are the only
// platform numbers here with any provenance. reels/shorts are conservative interpolations of the same
// shape and should be re-measured against the real apps before anyone trusts them for a launch.
export const DESTINATIONS = {
  // margin only — a website hero, an X/LinkedIn post, a docs clip. Nothing is painted over the frame.
  web: { native: null, top: 0, bottom: 0, left: 0, right: 0 },
  // Instagram/X feed: the player chrome sits OUTSIDE the media, so the whole frame is usable.
  feed: { native: null, top: 0, bottom: 0, left: 0, right: 0 },
  tiktok: { native: '9:16', top: 0.125, bottom: 0.302, left: 0, right: 0.167 },
  reels: { native: '9:16', top: 0.10, bottom: 0.22, left: 0, right: 0.14 },
  shorts: { native: '9:16', top: 0.08, bottom: 0.16, left: 0, right: 0.13 },
  // broadcast title-safe: the classic 90% box for displays that overscan.
  broadcast: { native: '16:9', top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
};

export const DESTINATION_NAMES = Object.keys(DESTINATIONS);

// safeArea(W, H, destination) → { x0, y0, x1, y1, margin, destination }
// The box legible content must stay inside. Chrome and margin are combined with max(), never summed:
// a platform's rail already includes the frame edge, so adding a margin on top would double-count it.
export function safeArea(W, H, destination = 'web') {
  const d = DESTINATIONS[destination];
  if (!d) throw new Error(`unknown destination "${destination}" — known: ${DESTINATION_NAMES.join(', ')}`);
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
// per line and a 64px one at 66px, so 1.05 is `line-height: normal` rounded UP — a band that is a
// pixel generous is a band, a band that is a pixel short is a near miss nobody sees.
export const CAPTION_LINES = 2;
const CAPTION_LEADING = 1.05;

// captionSkin(cfg) — which skin a scene's caption settings select. One mapping, read by anyone who
// needs the band, so `captionStyle` overriding `captionMode` is not re-guessed per caller
// (formats/scene/scene.js:909 is the renderer's own copy of this precedence).
export const captionSkin = (cfg = {}) =>
  cfg.captionStyle ? 'styled' : cfg.captionMode === 'pop' ? 'pop' : 'plain';

/**
 * captionBand(W, H, destination?, skin?, caps?) → { y0, y1, height, skin, destination, placed }
 * The horizontal strip a burnt-in caption occupies. Vertical only when nothing is placed: an
 * unplaced caption is centred and its width follows its text, so the useful keep-out is the strip.
 *
 * skin defaults to 'any', the UNION of the three skins — the widest strip a caption could occupy on
 * this canvas. Pass a named skin when the scene has declared one and the answer can be exact.
 *
 * `caps` is the scene's caption array WITH PLACEMENT ALREADY RESOLVED (core/boot.js resolveCoords
 * turns `pin` and the edge keywords into px; this function does no resolving of its own, because a
 * second copy of that grammar is how the four safe boxes drifted apart in the first place). Pass it
 * and the band becomes the union of where the captions ACTUALLY sit. Omit it and the answer is
 * exactly what it was before placement existed, which is why no existing caller moves.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. verify/audit.mjs reserves this strip and warns when other
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
  const d = DESTINATIONS[destination];
  if (!d) throw new Error(`unknown destination "${destination}" — known: ${DESTINATION_NAMES.join(', ')}`);
  return d.native ?? null;   // null still means "this destination serves any canvas"
};
