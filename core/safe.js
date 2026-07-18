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

// The aspect a destination serves, or null for the canvas-agnostic ones. A caller can use this to say
// "you asked for tiktok chrome on a 16:9 canvas" out loud instead of quietly producing a strange box.
export const nativeAspect = (destination) => (DESTINATIONS[destination] || {}).native ?? null;
