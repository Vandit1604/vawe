// core/tracks/util.js — the one thing two tracks share.

// The opacity already on the element, where ZERO IS A REAL VALUE. `parseFloat(x) || 1` was the idiom,
// and core/clips.js writes opacity with .toFixed(3) — so a layer at the tail of its fade becomes the
// string "0.000", parseFloat gives 0, `|| 1` reads that as "nothing set" and hands back FULL opacity.
// The layer flashes back to solid for the last frames of its own exit. Measured on cadence-film's app
// chrome: 0.057 at 4.80s, 0.007 at 4.90s, then 1.000 at 4.97s, one bright frame before it vanished.
// Every layer with a motion or prop track and a fade exit was exposed to it.
export const baseOpacity = (el) => { const v = parseFloat(el.style.opacity); return Number.isFinite(v) ? v : 1; };
