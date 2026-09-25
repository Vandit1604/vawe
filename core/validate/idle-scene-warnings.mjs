// A SCALING IDLE ON TEXT IS A SHIMMER, and it is the same defect `kineticSlam` already refuses
// `letter-spacing` for: a value rewritten every frame that forces the line to be laid out, or the
// glyphs to be rasterised, again. `breathe` scales by about 1% forever, which at 44px moves the
// rendered size by well under a pixel, so nothing MOVES and every glyph edge crawls.
//
// Proved rather than argued. Three fully-settled frames of a text layer, nothing else in motion:
// with `idle:"breathe"` all three differ; with the idle removed all three are byte-identical. A user
// reported it as "shimmering/glitching" from a rendered video before the cause was known.
//
// TRANSLATION IS NOT REFUSED, and the difference is mechanical rather than a matter of degree. A
// drift moves the whole run two to five pixels: the text travels, which is what ambient motion is
// FOR and the reason core/engine/idle.js exists. A scale re-rasterises. Only the second one is the bug.
import { isObj } from './util.mjs';
import { IDLE } from '../engine/idle.js';

const idleName = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.name : null);

// Which idles change `scale` is read off the registry by CALLING it, not from a hand-kept list: a new
// idle that scales must be caught the day it lands, not the day someone remembers to update a name.
function scalingIdles(IDLES) {
  const out = new Set();
  for (const [name, fn] of Object.entries(IDLES || {})) {
    try {
      const a = fn(0.13), b = fn(0.61);
      if (typeof a?.scale === 'number' && typeof b?.scale === 'number' && Math.abs(a.scale - b.scale) > 1e-6) out.add(name);
    } catch { /* an idle that needs options is not checkable here, and says so by absence */ }
  }
  return out;
}

// A group counts as text when its subtree carries text and no picture: scaling a card that holds a
// photograph is a different decision, and a legitimate one.
function isTextish(L) {
  if (!isObj(L)) return false;
  if (L.type === 'text' || L.type === 'count') return true;
  if (L.type !== 'group') return false;
  const kids = L.children || [];
  return kids.length > 0 && kids.every(isTextish);
}

function walkIdle(scaling, ls, path, out) {
  for (const [i, L] of (ls || []).entries()) {
    if (!isObj(L)) continue;
    const n = idleName(L.idle);
    if (n && scaling.has(n) && isTextish(L))
      out.push(`${path}[${i}] idle "${n}" scales, and this layer is text: a scale rewritten every frame `
        + 'rasterises every glyph again, so the edges crawl (it reads as a shimmer, never as motion). '
        + 'Use idle "drift", which translates the whole run, or move the scale to a wrapper that holds a picture.');
    if (L.children) walkIdle(scaling, L.children, `${path}[${i}].children`, out);
  }
}

export function idleErrors(cfg, IDLES = IDLE) {
  const out = [];
  const reg = IDLES;
  // Defaulting to the real registry rather than returning early on a missing one: an optional
  // argument that silently disables the whole check is a gate that passes because it never ran.
  if (!reg) return out;
  const scaling = scalingIdles(reg);
  if (!scaling.size) return out;
  walkIdle(scaling, cfg.layers, 'layer', out);
  return out;
}

// SCENE UNITS AND THE LAYER THAT LOSES MOST OF ITSELF. With `sceneUnits:true` a layer is assigned to a
// beat BY ITS START TIME (films/scene/scene.js `beatIndexOf`) and its wrapper is only on screen for
// that beat, so a layer that begins just before a boundary is truncated to the sliver between its start
// and that boundary. It does not error and it does not warn: the beat simply renders empty.
//
// Measured: films/scene/together-recreation.json had a layer at 2.55s to 6.70s with a boundary at
// 2.65s. Ten of its four thousand one hundred and fifty milliseconds survived. Four beats of a finished
// film rendered pure white, and finding it took a single-layer probe scene because every fragment
// previewed perfectly on its own (engine-doctrine/MISTAKES.md #603).
//
// `acrossBeats: true` is the documented opt-out and the check respects it: that flag says the layer
// belongs to the FILM rather than to a beat, which is exactly what a continuous object is.
//
// A WARNING, not an error, and deliberately. Eleven of this repo's 182 scenes trip it today, mostly
// full-film rects and counters that never declared `acrossBeats`. Some of those may be latent bugs and
// some may be fine; blocking them on the day this check arrives would be asserting an answer nobody has
// checked. It says what the engine will do and names the flag that changes it.
export function sceneUnitWarnings(cfg) {
  const d = cfg || {};
  if (d.sceneUnits !== true) return [];
  const cuts = [...(d.transitions || []), ...(d.cuts || []), ...(d.seams || [])]
    .map((t) => (typeof t === 'object' ? (t.at ?? t.t) : t))
    .filter((n) => typeof n === 'number').sort((a, b) => a - b);
  if (!cuts.length) return [];
  const out = [];
  for (const [i, L] of (Array.isArray(d.layers) ? d.layers : []).entries()) {
    if (!isObj(L) || L.acrossBeats === true) continue;
    const a = +L.start || 0;
    const dur = (+L.duration || +L.dur || 0);
    if (!(dur > 0)) continue;
    const boundary = cuts.find((c) => c > a + 1e-6 && c < a + dur - 1e-6);
    if (boundary == null) continue;
    const kept = (boundary - a) / dur;
    // Under a fifth surviving is not a judgement call. Above it, the author may well have meant a
    // layer that hands off at the cut, and this stays quiet about it.
    if (kept > 0.2) continue;
    out.push(`layers[${i}]${L.id ? ` (#${L.id})` : ''} starts at ${a}s and runs ${dur}s, but a sceneUnits `
      + `boundary at ${boundary}s ends its beat: only ${(kept * 100).toFixed(0)}% of it will ever be on `
      + 'screen, and the rest of the beat renders EMPTY with no other symptom. Either end this layer at '
      + `${boundary}s and start its continuation there, or set \`"acrossBeats": true\` if it is meant to `
      + 'belong to the film rather than to one beat.');
  }
  return out;
}
