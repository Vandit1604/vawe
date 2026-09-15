// Vawe Company License 1.0: see LICENSE at the repository root.
// core/canvas-kind.js: what kind of context a canvas holds, answered WITHOUT asking for one.
//
// `canvas.getContext('2d')` is not a question, it is a CONSTRUCTOR. On a canvas that holds no context
// yet it creates one, and that canvas is then a 2D canvas for the life of the page: it composites
// differently, and it can never take a WebGL context afterwards. So a reader that "checks" a canvas
// this way changes the picture it was only meant to measure.
//
// That shipped. `frameSig` walked every canvas in the document with `cv.getContext('2d')` to decide
// which ones to sample, and the frameSig sweep runs on ONE tab (the meta tab), so that tab composited
// every later frame differently from the tabs that never swept: same DOM, same computed geometry to
// six decimals, different glyph pixels. Measured: with the compositor promotions still in place, the
// sweep alone moved the captured bytes of a frame. It is no longer load-bearing now that they are gone
// (engine-doctrine/MISTAKES.md #507), and it is fixed anyway, because a measurement that changes its subject is
// a defect whether or not today's page happens to show it.
//
// The kind is recorded where a context is actually created, once, for every caller including vendored
// code that never heard of this module. A canvas with no recorded kind holds no context, so it paints
// nothing and there is nothing to read off it.

const kinds = new WeakMap();

if (typeof HTMLCanvasElement !== 'undefined') {
  const raw = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
    const ctx = raw.call(this, type, ...rest);
    if (ctx && !kinds.has(this)) kinds.set(this, String(type));
    return ctx;
  };
}

/** The context type first created on this canvas ('2d', 'webgl', 'webgl2', …), or '' for none. */
export const canvasKind = (cv) => kinds.get(cv) || '';
