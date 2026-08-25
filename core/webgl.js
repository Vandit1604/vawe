// core/webgl.js — the ONE place a WebGL context is asked for.
//
// WHY THIS EXISTS. Six modules called `canvas.getContext('webgl', …)` and four of them answered a null
// context the same way: `return { canvas, draw: () => {}, … }`. A no-op surface, returned silently.
//
// The failure that found it: a scene carrying 18 `shader` layers rendered COMPLETELY BLANK and exited
// 0. Browsers cap live WebGL contexts at around 16; past that `getContext` returns null, the layer
// stored an undefined surface, and `core/layers/canvas.js:50`'s `if (!s) return` swallowed it every
// frame. `make beats` produced seven blank beats and said nothing. Six layers per scene works, so
// nothing about the scene looked wrong.
//
// That is the accepted-then-ignored class this repo logs most, and the reason it survived is that the
// answer was written four times rather than once. So the refusal lives here, and the count it reports
// is only possible here — no single call site knows how many contexts the page already holds.
//
// THE HEADLESS CASE IS REAL AND IS NOT THIS. A machine with no GPU fails on the FIRST context, not the
// seventeenth, and a tool that only wants to read the DOM should not die because a decorative field
// cannot paint. So `glContext` distinguishes them: the first failure is reported as "no WebGL here",
// and a failure after others have succeeded is reported as the cap, with the number. Callers that can
// legitimately continue without paint pass `soft: true` and get null back — but they must then say so,
// rather than returning a surface whose `draw` does nothing.

let live = 0;          // contexts successfully created on this page
let lost = 0;          // contexts reported lost by the driver

/**
 * glContext(canvas, opts, where, { soft } = {}) → WebGLRenderingContext
 *   where — what is asking, named in the error: "shader layer", "sting", "raymarch surface".
 *   soft  — return null instead of throwing. For a caller that genuinely degrades (an overlay that
 *           may simply not paint), never for a layer whose whole job is the paint.
 */
export function glContext(canvas, opts, where = 'a WebGL surface', { soft = false } = {}) {
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (gl) {
    live++;
    // A lost context is the same blank frame arriving later, so it is worth counting rather than
    // discovering. The handler does not recover — recovery would mean a frame that differs depending
    // on when the loss happened, which renderFrame(n) purity forbids.
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost++; }, { once: true });
    return gl;
  }
  if (soft) return null;
  throw new Error(live === 0
    ? `${where}: this browser gave no WebGL context at all, and none has been created on this page. `
      + `Every generative field, sting, raymarch surface and three.js scene needs one, so the frame `
      + `would render blank. Run with a GPU-backed browser, or remove the layers that need WebGL.`
    : `${where}: the browser refused a WebGL context after ${live} were already live`
      + `${lost ? ` (${lost} since lost)` : ''}. Browsers cap concurrent contexts at roughly 16, and a `
      + `scene past that renders BLANK with no error — every layer beyond the cap silently paints `
      + `nothing. Use fewer WebGL-backed layers at once (shader · paint · raymarch · three · globe · `
      + `sting · seam), or split the beats so they do not co-exist.`);
}

/** What the page currently holds. For a gate or a boot-time check that wants to warn before the cap. */
export const glLive = () => ({ live, lost });
