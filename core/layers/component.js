// core/layers/component.js — a REAL UI capture (capture-component.mjs), or one PART of a captured
// animated scene (capture-scene.mjs) — parts carry their own w/h and are re-animated here.
export const PROPS = { src: {}, part: {}, w: {} };

export function build(kit, el, L) {
  let c = (kit.components && kit.components[L.src]) || { html: '<div style="color:#888">component not captured</div>', w: 900, h: 560 };
  if (L.part && c.parts) c = c.parts.find((pp) => pp.name === L.part) || { html: `<div style="color:#888">part ${L.part} missing</div>`, w: 600, h: 300 };
  const fit = (L.w || 1200) / Math.max(1, c.w);
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
