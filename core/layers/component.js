// core/layers/component.js — a REAL UI capture (capture-component.mjs), or one PART of a captured
// animated scene (capture-scene.mjs) — parts carry their own w/h and are re-animated here.
export function build(kit, el, L) {
  let c = (kit.components && kit.components[L.src]) || { html: '<div style="color:#888">component not captured</div>', w: 900, h: 560 };
  if (L.part && c.parts) c = c.parts.find((pp) => pp.name === L.part) || { html: `<div style="color:#888">part ${L.part} missing</div>`, w: 600, h: 300 };
  const fit = (L.w || 1200) / Math.max(1, c.w);
  el.style.width = Math.round(c.w * fit) + 'px';
  el.style.height = Math.round(c.h * fit) + 'px';
  el.innerHTML = `<div class="hs-comp" style="width:${c.w}px;height:${c.h}px;transform:scale(${fit.toFixed(4)})">${c.html}</div>`;
}
