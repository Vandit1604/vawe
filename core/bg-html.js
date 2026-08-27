// core/bg-html.js. A HAND-AUTHORED living background: raw HTML/CSS as the backdrop, instead of a
// canvas preset.
//
// WHY this exists alongside the presets. `bgPreset` paints on canvas from a fixed vocabulary (gradients ·
// dots · aurora · metallic · softwash). That vocabulary is good and it is finite, and a backdrop the
// vocabulary cannot express had exactly one escape hatch: add another preset to the engine. Reflecting a
// real site (where the hero background IS hand-written CSS) hit that wall every time. This is the
// escape hatch, with the engine's contracts kept intact.
//
// DETERMINISM, which is the whole question for a hand-authored backdrop. A frame here is SEEKED, not
// played, across 8 parallel workers, so nothing may depend on elapsed wall-clock. That rules out CSS
// transition and animation, which core/tokens.css already disables engine-wide.
//
// What replaces them: `--t` (seconds into the video) and `--p` (0→1 across this bg's own window),
// written onto the element every frame and usable anywhere calc() is, transforms, gradient angles,
// colour mixes, offsets:
//   transform: rotate(calc(var(--t) * 12deg));
//   background: radial-gradient(40% 30% at calc(20% + var(--p) * 60%) 50%, …);
// Both are pure functions of t, so the same frame number always paints the same pixels.
//
// A CSS animation here would not error, it would silently render a still, so the authoring gate
// rejects it by name and points at `--t` (timeCssUsed() in core/sanitize-html.js).
import { sanitizeHtml, scopeStyles, htmlSource } from './sanitize-html.js';

// createBgHtml(root, windows) → a controller, or null when no window is hand-authored.
// One element per html window, built ONCE at build time and only shown/hidden per frame: rebuilding
// markup per frame would restart every CSS animation on it, which is the same class of bug as a
// frame() hook that leaves state behind.
export function createBgHtml(root, windows, table) {
  // `src` counts as hand-authored just as much as `html` does. Filtering on `w.html != null` dropped
  // every src-only window on the floor: preloadHtml fetched the file into the table and NOTHING read it,
  // so declaring a backdrop by path rendered no backdrop and said nothing. That shipped the same day the
  // `src` alternative did (docs/MISTAKES.md #264). htmlSource is the one resolver, so a layer and a
  // backdrop cannot disagree about which source wins.
  const html = windows.filter((w) => w.html != null || typeof w.src === 'string');
  if (!html.length) return null;
  const els = new Map();
  for (const w of html) {
    const el = document.createElement('div');
    el.className = 'hs-bghtml';
    // Same scoping as the html LAYER: `el` is this window's own wrapper, so the fragment's stylesheet
    // stops at its edge and two bg windows cannot fight over a class name (docs/MISTAKES.md #425).
    el.innerHTML = scopeStyles(sanitizeHtml(htmlSource(w, table, 'bg window')));
    root.insertBefore(el, root.firstChild); // behind the canvas and the camera
    els.set(w, el);
  }
  return {
    // Returns true when a hand-authored window owns time t, so the caller knows to hide the canvas.
    // `filmDur` is the scene's own length, and it is what a window with no explicit `to` ends at.
    // Without it `--p` was pinned to 0 for the whole film: the fallback `to` is the sentinel 1e9, so
    // `span < 1e9` was false and the guard returned 0, while this file's header promised "0 -> 1
    // across this bg's own window". One backdrop spanning the film is the COMMONEST shape there is,
    // so the variable was frozen exactly where it was most likely to be used, and a page written
    // against it rendered a still. docs/MISTAKES.md #353.
    frame(t, active, filmDur) {
      // EVERY element is written EVERY frame, including the inactive ones. An early return that leaves
      // a stale display/opacity on a window we are no longer in is precisely the glow×sceneUnits bug
      // (MISTAKES #152): pixels that depend on which frames were rendered before this one.
      for (const [w, el] of els) {
        const on = w === active;
        el.style.display = on ? 'block' : 'none';
        if (!on) continue;
        // `>= 1e9`, not `?? `: scene.js normalises every window to `to: b.to ?? 1e9` before we see it,
        // so `to` is NEVER nullish here and a `??` fallback can never fire. 1e9 is a sentinel meaning
        // "no end declared", and a sentinel that downstream code cannot tell from a real value is how
        // this stayed broken: the guard below tested `span < 1e9` and silently returned 0.
        const end = (w.to == null || w.to >= 1e9) ? (filmDur > 0 ? filmDur : 1e9) : w.to;
        const span = end - (w.from ?? 0);
        const p = span > 0 && span < 1e9 ? Math.min(1, Math.max(0, (t - (w.from ?? 0)) / span)) : 0;
        el.style.setProperty('--t', t.toFixed(4));
        el.style.setProperty('--p', p.toFixed(4));
      }
      return active != null && els.has(active);
    },
  };
}
