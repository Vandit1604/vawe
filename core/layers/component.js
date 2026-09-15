// core/layers/component.js: a REAL UI capture (capture-component.mjs), or one PART of a captured
// animated scene (capture-scene.mjs), parts carry their own w/h and are re-animated here.
import { propsOf } from '../registry/props.js';

// The props are read off this signature (propsOf, core/props.js). No second list to drift from it.
export function build(kit, el, L, { src, part, w } = L) {
  let c = (kit.components && kit.components[src]) || { html: '<div style="color:#888">component not captured</div>', w: 900, h: 560 };
  if (part && c.parts) c = c.parts.find((pp) => pp.name === part) || { html: `<div style="color:#888">part ${part} missing</div>`, w: 600, h: 300 };
  const fit = (w || 1200) / Math.max(1, c.w);
  el.style.width = Math.round(c.w * fit) + 'px';
  el.style.height = Math.round(c.h * fit) + 'px';
  el.innerHTML = `<div class="hs-comp" style="width:${c.w}px;height:${c.h}px;transform:scale(${fit.toFixed(4)})">${c.html}</div>`;
  // THE INVARIANT: the captured root's box IS the component's box. c.w/c.h come from a border box
  // (getBoundingClientRect excludes margin), so a root margin offsets the content inside a box sized
  // without it and .hs-comp's overflow:hidden silently eats the difference. Enforced here as well as
  // at capture time so components already on disk heal without a re-capture (MISTAKES #43).
  const rootEl = el.firstElementChild?.firstElementChild;
  if (rootEl) rootEl.style.margin = '0';
}

export const PROPS = propsOf(build);

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "a REAL captured UI block (`make capture`), or one named part of a captured scene, scaled to fit `w`";
