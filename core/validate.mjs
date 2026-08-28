// core/validate.mjs, ENGINE CODE, not tooling: core/boot.js imports it, so the browser must be
// able to resolve it (it ships to the site with the rest of core/). The node:fs use below is a lazy
// dynamic import in the CLI branch and is never reached in a browser.
//
// (was) data + theme validation against a format's schema.json.
// Runs in TWO places: (1) core/boot.js boot() imports validateData/validateTheme and aborts the
// render pre-first-frame on bad data (clear message, no wasted frames); (2) `make validate` (the
// CLI main below) checks data files from the shell. Pure + browser-safe: no top-level node imports.
//
// Schema vocabulary (the authoring schema):
//   { type: string|number|boolean|array|object, label, default,
//     required?, hint?, min?, max?, enum?, minLength?, pattern?,  // scalars
//     minItems?, maxItems?, item?,                               // arrays (item = field map)
//     fields? }                                                  // objects (nested field map)
// `hint` is appended to the required/minItems error. "bg is required" tells an author a field is missing;
// it does not tell them what a good answer looks like, and a required field they cannot answer is a wall.
// Only fields PRESENT in the schema are checked; unknown data keys (module, audio, theme, …) pass.

import { onScreenText, glyphText } from './on-screen-text.js';
import { IDLE } from './idle.js';
import { themeErrors } from '../core/theme-contract.js';
// parseColor is handed to themeErrors so a palette value that is not a COLOUR is refused, not just an
// absent one. theme-contract.js stays import-free on purpose (node + browser); see its note.
import { parseColor, contrastRatio } from '../core/motion.js';
import { ASPECTS } from '../core/safe.js';
import { boundaryMechanism, lowerScene } from '../core/transitions-lower.js';
import { junctionTable, marksOf, bindWindowsToJunctions, bindMatchesToJunctions } from '../core/junctions.js';
import { resolveSpectacle } from '../core/spectacle.js';
import { beatGridPath } from '../core/beat-bind.js';
import { GSAP_FX, EXIT_FX, GSAP_REGISTRY, GSAP_EXIT_REGISTRY, DEPRECATED_FX, DEPRECATED_EXIT } from '../core/gsap-effects.js';
import { timeCssUsed } from '../core/sanitize-html.js';
import { EASINGS, isEasingName } from '../core/motion.js';
import { resolveSeconds, FEEL } from '../core/vocab.js';
import { bgPreset, bgOverErrors, bgOptKeys , BG_NAMES } from '../core/backgrounds.js';
import { KNOBS, knobsFor } from '../core/knobs.js';
import { mergePan } from './pan-resolve.mjs';
import { motionAt } from './sequence.js';

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
// nearest(val, options) → " Did you mean 'x'?" for the closest valid value (edit distance), else ''.
// Kills the "guessed a wrong preset/cut/fx name" trap: the error tells you the right one immediately.
function nearest(val, opts) {
  const ed = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return d[b.length]; };
  const s = String(val).toLowerCase();
  let best = null, bd = Infinity;
  for (const o of opts) { const d = ed(s, String(o).toLowerCase()); if (d < bd) { bd = d; best = o; } }
  return best && bd <= Math.max(2, Math.ceil(best.length / 3)) ? ` Did you mean '${best}'?` : '';
}
const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

// ---------- LAYOUT: a centring keyword needs something to centre ----------
// resolveCoords places a box of size `size` on a canvas line. With `w` unset that size is 0, so
// `x:"center"` puts the layer's LEFT EDGE on the centre line and `x:"right"` hangs it off the frame,
// silently, and only visibly wrong at some aspects. The audit has flagged this on the x axis for a
// while; the rule lives HERE now so it fails at `make validate` AND in boot (which imports this
// module) before a single frame renders, and so there is exactly one copy of it. Two copies is how
// the safe box and the canvas size each drifted into four (docs/MISTAKES.md #46).
//
// The Y axis is the same trap. It is enforced only where no honest estimate exists: a text layer's
// height is reliably ~size*1.2 and scenes have tuned around the current behaviour, so applying that
// estimate would MOVE shipped content. That is the deliberate "measure later" half, see ROADMAP.
const PIN_AXIS = {
  center: ['center', 'optical'], top: ['center', 'top'], bottom: ['center', 'bottom'],
  left: ['left', 'center'], right: ['right', 'center'],
  'top-left': ['left', 'top'], 'top-right': ['right', 'top'],
  'bottom-left': ['left', 'bottom'], 'bottom-right': ['right', 'bottom'],
  'thirds-tl': ['third1', 'third1'], 'thirds-tr': ['third2', 'third1'],
  'thirds-bl': ['third1', 'third2'], 'thirds-br': ['third2', 'third2'],
  'thirds-t': ['center', 'third1'], 'thirds-b': ['center', 'third2'],
  'thirds-l': ['third1', 'center'], 'thirds-r': ['third2', 'center'],
};
// keywords that SUBTRACT the layer's size, and are therefore meaningless without one
const NEEDS_SIZE = new Set(['center', 'optical', 'third1', 'third2', 'right', 'bottom']);
// types whose extent the engine can estimate from `size`, excluded from the y rule for now
const TEXTISH = new Set(['text', 'count']);

export function layoutErrors(cfg) {
  const out = [];
  // `panWith` names another layer's `id`, and the engine throws on a bad reference at BUILD time. That
  // is loud but late: the author has already rendered. Same class as a bad relative `start`, and cheap
  // to answer here, so the gate answers it. A pan source with no motion is the other half, the layer
  // would silently stop panning, which is exactly the failure the feature exists to remove.
  const ids = new Set((cfg.layers || []).filter((L) => isObj(L) && L.id).map((L) => L.id));
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.panWith !== 'string') return;
    const label = `layers[${i}] (${L.type || 'text'})`;
    if (!ids.has(L.panWith)) out.push(`${label}: panWith "${L.panWith}". No layer has that \`id\`. Known ids: ${[...ids].join(', ') || '(none, give the pan source an \`id\`)'}.`);
    else {
      const src = (cfg.layers || []).find((x) => isObj(x) && x.id === L.panWith);
      if (src === L) out.push(`${label}: panWith "${L.panWith}" is this layer itself.`);
      else if (typeof src.panWith === 'string') out.push(`${label}: panWith "${L.panWith}", which itself pans with "${src.panWith}". Point both at the ORIGIN so one track stays the source of truth.`);
      else if (!Array.isArray(src.motion) || !src.motion.length) out.push(`${label}: panWith "${L.panWith}", but that layer has no \`motion\` track to share.`);
    }
  });
  // `anchor` names another layer's `id`, and a name that matches nothing is skipped in SILENCE,
  // `resolveAnchors` does `const T = L.anchor && byId[L.anchor]; if (!T) continue;`, so a typo leaves the
  // layer at whatever x/y it happened to carry and the annotation quietly stops pointing at anything.
  // This is the identical shape `panWith` had, and `panWith` got a hard error for it while `anchor`,
  // three lines away in the same file, kept the silent skip (docs/MISTAKES.md #199).
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.anchor !== 'string' || ids.has(L.anchor)) return;
    out.push(`layers[${i}] (${L.type || 'text'}): anchor "${L.anchor}". No layer has that \`id\`, so the anchoring is skipped and this layer stays wherever its own x/y put it. Known ids: ${[...ids].join(', ') || '(none, give the target an `id`)'}.`);
  });

  // `gsap:{from,to}` was accepted for as long as it existed and never interpolated, it rendered a
  // layer flickering between its start and end poses. Removed, not repaired, because `motion` is a
  // real keyframe track and strictly stronger. A hard error rather than silence: an author reaching
  // for it has a moving layer in mind and deserves to be pointed at the thing that moves it (#208).
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || !isObj(L.gsap)) return;
    // GSAP's property names are not ours, so translate rather than echoing them back, a message that
    // suggests `"width":…` inside a motion key is telling the author to write the next silent no-op.
    const RENAME = { width: 'w', height: 'h', rotation: 'rot', rotate: 'rot', autoAlpha: 'opacity' };
    const g = L.gsap;
    const keys = [...new Set([...Object.keys(g.from || {}), ...Object.keys(g.to || {})])].map((k) => RENAME[k] || k);
    out.push(`layers[${i}] (${L.type || 'text'}): \`gsap\` is no longer a layer prop. It never interpolated under the seek model and rendered flicker. Use a \`motion\` track instead: "motion": [{"t":0,${keys.map((k) => `"${k}":…`).join(',')}}, {"t":${(L.duration ?? 2).toFixed(2)},${keys.map((k) => `"${k}":…`).join(',')},"ease":"easeOutCubic"}]. Keys take x, y, scale, rot, opacity, blur, w, h, track.`);
  });

  // A `w`/`h` key animates the layer's BOX, and there are exactly two ways it can be authored so that
  // it moves nothing at all. Both are answered here rather than at render, because both render clean.
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || !Array.isArray(L.motion)) return;
    const label = `layers[${i}] (${L.type || 'text'})${L.id ? ` #${L.id}` : ''}`;
    for (const p of ['w', 'h']) {
      if (!L.motion.some((k) => isObj(k) && k[p] != null)) continue;
      // (1) no base to animate FROM. The engine throws on this; saying it here means the author hears
      // it before spending a render, which is the whole job of this file.
      if (L[p] == null) out.push(`${label}: a motion key sets \`${p}\` but the layer declares no \`${p}\`, so there is no box to animate from. Give the layer its resting ${p === 'w' ? 'width' : 'height'}.`);
    }
    // (2) an IMAGE resized without cover-fit. core/layers/image.js only makes the <img> fill its
    // wrapper when the layer opted in via `radius` or `ken`; otherwise the img is sized in px and
    // stretching that box distorts the photograph. It renders, it just renders wrong.
    const boxed = L.motion.some((k) => isObj(k) && (k.w != null || k.h != null));
    if (boxed && L.type === 'image' && L.radius == null && !L.ken) {
      out.push(`${label}: animates its box but is an image with no \`radius\` and no \`ken\`, so the picture STRETCHES with the box instead of re-cropping inside it. Add \`radius\` (0 is fine) to switch it to cover-fit.`);
    }
  });

  // A motion track that REVERSES at speed is a snap, and no easing hides it: the layer is travelling one
  // way and the next frame throws it back the other. Measured on the RESOLVED track (pans merged in) by
  // SAMPLING AT 30fps, because neither of the cheaper tests works. Key-to-key average velocity calls an
  // eased arc a reversal, `rec2-gates`' dot swings 777px out and 525px back with easeInOutCubic on both
  // sides, so its velocity passes through zero at the turn and it is perfectly smooth. Peak acceleration
  // alone is no better: `creed-launch` hits 134 px/frame^2 accelerating in a straight line, harder than
  // the defect this exists to catch. Only direction-change AND magnitude together separate them.
  //
  // The defect: `cadence`'s button rode a shared pan to -512 while its own next key said -318, so it
  // jumped 194px right in two frames (126 px/frame^2 against the travel) and every gate stayed green
  // (docs/MISTAKES.md #194). The author cannot see the pan's accumulated value, so the arithmetic has to
  // be done for them.
  const FPS = 30, REV_ACCEL = 60;
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L)) return;
    let track = Array.isArray(L.motion) ? L.motion : null;
    if (typeof L.panWith === 'string') {
      const src = (cfg.layers || []).find((x) => isObj(x) && x.id === L.panWith);
      if (!isObj(src) || typeof src.panWith === 'string' || !Array.isArray(src.motion) || !src.motion.length) return;
      try { track = mergePan(L, src); } catch { return; }
    }
    if (!track || track.length < 3 || !track.every((k) => isObj(k))) return;
    const ts = track.map((k) => (typeof k.t === 'number' ? k.t : 0));
    const t0 = Math.min(...ts), t1 = Math.max(...ts);
    if (!(t1 - t0 > 2 / FPS)) return;
    const pts = [];
    for (let n = 0; n <= Math.ceil((t1 - t0) * FPS); n++) {
      const m = motionAt(track, t0 + n / FPS);
      pts.push([m.dx || 0, m.dy || 0]);
    }
    for (let n = 2; n < pts.length; n++) {
      const v1 = [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]];
      const v2 = [pts[n][0] - pts[n - 1][0], pts[n][1] - pts[n - 1][1]];
      if (v1[0] * v2[0] + v1[1] * v2[1] >= 0) continue;                  // same direction, accelerating, not snapping
      const accel = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
      if (accel < REV_ACCEL) continue;                                   // a settle reverses gently; let it
      const at = (t0 + n / FPS).toFixed(2);
      const label = `layers[${i}] (${L.type || 'text'}${L.id ? ` #${L.id}` : ''})`;
      out.push(`${label}: motion reverses at t=${at}s, moving (${v1[0].toFixed(0)}, ${v1[1].toFixed(0)})px/frame, then (${v2[0].toFixed(0)}, ${v2[1].toFixed(0)})px/frame the other way (${accel.toFixed(0)} px/frame\u00b2). That is a snap, not a move.${typeof L.panWith === 'string' ? ` This layer pans with "${L.panWith}", which has already carried it somewhere by then. Your own keys continue from THERE, not from the layer's origin. Peel off before the pan passes your destination.` : ' A settle should reverse gently; check the key before it.'}`);
      break;                                                             // one report per layer; the first is the cause
    }
  });

  // `becomes` is a claim about a BOUNDARY: this form ends and that one takes it over. If the incoming
  // layer does not start where the outgoing one ends, the handover happens over a gap or an overlap and
  // the match silently stops reading, which is the whole failure the feature exists to remove, so it is
  // checked rather than trusted.
  (cfg.layers || []).forEach((A, i) => {
    if (!isObj(A) || typeof A.becomes !== 'string') return;
    const label = `layers[${i}] (${A.type || 'text'}${A.id ? ` #${A.id}` : ''})`;
    if (!ids.has(A.becomes)) {
      out.push(`${label}: becomes "${A.becomes}". No layer has that \`id\`. Known ids: ${[...ids].join(', ') || '(none)'}.`);
      return;
    }
    const B = (cfg.layers || []).find((x) => isObj(x) && x.id === A.becomes);
    if (B === A) { out.push(`${label}: becomes itself.`); return; }
    if (isObj(B) && B.becomes === A.id) { out.push(`${label}: becomes "${B.id}", which becomes "${A.id}" back. One of them has to be the origin.`); return; }
    const aEnd = (typeof A.start === 'number' ? A.start : 0) + (typeof A.duration === 'number' ? A.duration : 0);
    const bStart = typeof B.start === 'number' ? B.start : 0;
    const gap = bStart - aEnd;
    if (Math.abs(gap) > 0.5) {
      out.push(`${label}: becomes "${B.id}", but "${B.id}" starts ${gap > 0 ? `${gap.toFixed(2)}s AFTER` : `${(-gap).toFixed(2)}s BEFORE`} this layer ends (${aEnd.toFixed(2)}s vs ${bStart.toFixed(2)}s). A handover reads as one form continuing only when the two meet; ${gap > 0 ? 'the frame is empty in between' : 'both are on screen at once'}. Line them up, or drop \`becomes\` and treat them as two shots.`);
    }
  });
  (cfg.layers || []).forEach((L0, i) => {
    if (!isObj(L0)) return;
    if (L0.anchor) return;                      // anchor overwrites x/y downstream
    const label0 = `layers[${i}] (${L0.type || 'text'}${typeof L0.text === 'string' ? ` "${onScreenText(L0.text).slice(0, 20)}"` : ''})`;
    // `aspects` is checked as the MERGED layer, once per declared aspect. An override that drops `w` while
    // keeping a centring keyword is the same trap, visible only at that one canvas, which is the
    // failure mode per-aspect overrides exist to prevent, so it cannot be the failure mode they add.
    const variants = [[L0, label0]];
    if (isObj(L0.aspects)) for (const [k, over] of Object.entries(L0.aspects)) {
      if (!ASPECTS[k]) { out.push(`${label0}: aspects."${k}" is not a known aspect. One of ${Object.keys(ASPECTS).join(', ')}`); continue; }
      if (!isObj(over)) { out.push(`${label0}: aspects."${k}" must be an object of layer props`); continue; }
      variants.push([{ ...L0, ...over }, `${label0} at "${k}"`]);
    }
    for (const [L, label] of variants) check(L, label, out);
  });
  return out;
}

function check(L, label, out) {
  {
    const pin = L.pin && PIN_AXIS[L.pin];
    const kwx = typeof L.x === 'string' ? L.x : (L.x == null && pin ? pin[0] : null);
    const kwy = typeof L.y === 'string' ? L.y : (L.y == null && pin ? pin[1] : null);
    const how = (kw, axis) => `${L.pin ? `pin:"${L.pin}"` : `${axis}:"${kw}"`}`;
    if (kwx && NEEDS_SIZE.has(kwx) && L.w == null && L.col == null)
      out.push(`${label}: ${how(kwx, 'x')} positions a box of width \`w\`, but \`w\` is unset (=0), so the layer's left edge lands on the ${kwx} line instead of the layer sitting on it. Set \`w\` (e.g. "88%") and \`align\`.`);
    if (kwy && NEEDS_SIZE.has(kwy) && L.h == null && !TEXTISH.has(L.type || 'text'))
      out.push(`${label}: ${how(kwy, 'y')} positions a box of height \`h\`, but \`h\` is unset (=0), so the layer's top edge lands on the ${kwy} line. Set \`h\`.`);
    // `dx`/`dy` are RELATIVE offsets, read only when the layer is anchored to another (scene.html:177).
    // Without `anchor` they are dead config that reads as an intended offset and silently does nothing,
    // which is how two pin-centred lines land on top of each other (they both ignore dy). Fail loudly.
    if ((L.dx != null || L.dy != null) && L.anchor == null)
      out.push(`${label}: \`dx\`/\`dy\` are offsets from an anchored layer and are IGNORED without \`anchor\` (they will not nudge a \`pin\`ned/\`x\`/\`y\` layer). To stack or offset here: set \`anchor\` (+ \`at\`), or put the lines in one text layer with \`<br>\`, or use \`pin\`/\`y\`.`);
  }
}

// validateData(schema, data) -> string[] of human-readable errors ([] = valid).
export function validateData(schema, data) {
  const errors = [];
  if (!schema || !isObj(schema.fields)) return errors; // no/blank schema → nothing to check
  walk(schema.fields, data || {}, '', errors);
  noEmdash(data, '', errors); // voice rule: no em-dashes in any on-screen copy (schema or not)
  errors.push(...easeErrors(data)); // engine-driven fields take an EASINGS name, not a GSAP one (#367)
  errors.push(...durationWordErrors(data || {})); // a timing slot's word must be one the engine knows
  errors.push(...layoutErrors(data || {})); // a centring keyword must have something to centre
  errors.push(...seamErrors(data || {}));   // seam windows must land inside the video
  errors.push(...transitionErrors(data || {})); // unified transitions must route to a real mechanism
  errors.push(...fxErrors(data || {}));     // named GSAP fx/fxOut must be real effects; no fxOut+out clash
  errors.push(...knobErrors(data || {}));   // a dial set on a preset that does not read it is dead config
  errors.push(...countEaseErrors(data || {})); // a counter must never overshoot its own value
  errors.push(...bgErrors(data || {}));     // each bg window names one backdrop, and can be rendered purely
  errors.push(...matchErrors(data || {})); // a match cut names two real layers and fits inside its shot
  errors.push(...htmlLayerErrors(data || {})); // hand-authored layers hit the same dead-CSS trap
  errors.push(...cssErrors(data || {}));    // css passthrough must not name a prop the engine rewrites every frame
  errors.push(...captionErrors(data || {})); // a caption the renderer would silently never draw
  errors.push(...idleErrors(data || {}, IDLE)); // a scaling idle re-rasterises glyphs every frame
  return errors;
}

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
// FOR and the reason core/idle.js exists. A scale re-rasterises. Only the second one is the bug.
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
export function idleErrors(cfg, IDLES = IDLE) {
  const out = [];
  const reg = IDLES;
  // Defaulting to the real registry rather than returning early on a missing one: an optional
  // argument that silently disables the whole check is a gate that passes because it never ran.
  if (!reg) return out;
  const scaling = scalingIdles(reg);
  if (!scaling.size) return out;
  // A group counts as text when its subtree carries text and no picture: scaling a card that holds a
  // photograph is a different decision, and a legitimate one.
  const isTextish = (L) => {
    if (!isObj(L)) return false;
    if (L.type === 'text' || L.type === 'count') return true;
    if (L.type !== 'group') return false;
    const kids = L.children || [];
    return kids.length > 0 && kids.every(isTextish);
  };
  (function walk(ls, path) {
    for (const [i, L] of (ls || []).entries()) {
      if (!isObj(L)) continue;
      const n = idleName(L.idle);
      if (n && scaling.has(n) && isTextish(L))
        out.push(`${path}[${i}] idle "${n}" scales, and this layer is text: a scale rewritten every frame `
          + 'rasterises every glyph again, so the edges crawl (it reads as a shimmer, never as motion). '
          + 'Use idle "drift", which translates the whole run, or move the scale to a wrapper that holds a picture.');
      if (L.children) walk(L.children, `${path}[${i}].children`);
    }
  })(cfg.layers, 'layer');
  return out;
}

// CAPTIONS: the two ways a caption line is accepted and then never seen.
//
// 1. OVERLAPPING WINDOWS. formats/scene/scene.js draws `caps.find(c => t >= c.t0 && t < c.t1)`, ONE
//    element, FIRST match. Two captions that overlap are not two captions: the second is dropped for
//    the length of the overlap and nothing says so. That is the silent-substitution shape this repo
//    logs more than any other, and it costs one comparison to refuse.
// 2. A WINDOW THAT IS NOT A WINDOW. t1 <= t0 draws nothing, ever, at any frame.
//
// Placement is NOT checked here beyond its shape. Whether a pinned caption collides with a headline
// is a question about a rendered frame, so it belongs to `make audit`, which reserves the band
// (core/safe.js captionBand) and can see where the other layers actually landed.
// The pins whose x-keyword is a real edge rather than 'center' (core/boot.js PIN).
const H_PINS = ['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
  'thirds-tl', 'thirds-tr', 'thirds-bl', 'thirds-br', 'thirds-l', 'thirds-r'];
export function captionErrors(cfg) {
  const out = [];
  const caps = Array.isArray(cfg.captions) ? cfg.captions : [];
  if (!caps.length) return out;
  caps.forEach((c, i) => {
    if (!isObj(c)) return;
    const t0 = +c.t0, t1 = +c.t1;
    if (!isFinite(t0) || !isFinite(t1)) return;   // the schema reports a missing/NaN t0/t1
    // `align` and the shape of `words` are the schema's job (fields.captions.item), and duplicating
    // an enum here printed the same refusal twice under two wordings.
    if (t1 <= t0) out.push(`captions[${i}] window [${t0}, ${t1}] is empty (t1 must be > t0), it would never draw`);
    // A horizontal pin needs a box to pin. `top`, `bottom` and `center` only ask for a vertical
    // position and the stylesheet's box still applies, so those are complete on their own. `left`,
    // `right` and the corners are asking to move an edge, and a caption has no width until one is
    // declared, so the request cannot be honoured. core/boot.js therefore leaves it alone, and this
    // says so out loud rather than letting the caption render where it always did.
    if (H_PINS.includes(c.pin) && c.w == null)
      out.push(`captions[${i}] pin "${c.pin}" moves a horizontal edge but the caption declares no w, `
        + 'add w (px or "45%"), or use pin "top" / "bottom" / "center", which need no box');
  });
  // Sorted by start, so one pass finds every overlap and the message names the pair in author order.
  const order = caps.map((c, i) => ({ i, c })).filter(({ c }) => isObj(c) && isFinite(+c.t0) && isFinite(+c.t1))
    .sort((a, b) => +a.c.t0 - +b.c.t0);
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1], cur = order[k];
    if (+cur.c.t0 < +prev.c.t1 - 1e-6)
      out.push(`captions[${cur.i}] starts at ${+cur.c.t0} while captions[${prev.i}] runs to ${+prev.c.t1}, `
        + 'the renderer draws the FIRST match and one caption element, so the later line is dropped for the overlap');
  }
  return out;
}

// The `html` LAYER has always had the same trap as the `html` background: CSS transition/animation is
// disabled engine-wide, so a hand-authored fragment that animates in the browser renders as a still and
// says nothing about it. Same check, same message, both places.
//
// A GROUP's children were invisible to this: the walk was a flat pass over cfg.layers, so the identical
// fragment was checked at the top level and unchecked one nesting deep. Nesting is not an exemption.
export function htmlLayerErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (L.type !== 'html') return;
    // ONE source per fragment, and at least one. `html` is the markup inline; `src` names a .html file
    // preloaded into the same place. Both is ambiguous rather than layered, and neither renders nothing.
    if (L.html != null && L.src != null)
      out.push(`${at} (html) declares BOTH \`html\` and \`src\`. A fragment has ONE source. \`html\` is the markup inline; \`src\` is the same markup in a file. Delete whichever is the leftover.`);
    if (L.html == null && L.src == null)
      out.push(`${at} (html) declares neither \`html\` nor \`src\`, so it renders an empty box. Put the markup inline in \`html\`, or point \`src\` at a .html fragment.`);
    if (L.html == null) return;
    const timeCss = timeCssUsed(L.html);
    if (timeCss) out.push(`${at} (html) uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Animate the layer with the engine's own motion (\`anim\`/\`motion\`/\`vars\`), or drive your CSS from a \`vars\` custom property.`);
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return out;
}

// CSS PASSTHROUGH. `css` on a layer reaches CSS the layer vocabulary does not name (a box gradient,
// `clip-path`, a layered `box-shadow`, `backdrop-filter`, `mask-image`, pseudo decoration), see
// core/layers/util.js's `applyCss`, which is the ONLY place that reads it, and reads it ONCE, at build
// time. That is exactly why a key the ENGINE rewrites every frame must be refused here rather than
// applied: a build-time write to `opacity`/`transform`/etc. is silently erased the instant the render
// advances past frame 0, and this repo's most-logged bug class is an accepted prop the engine then
// ignores (docs/MISTAKES.md #213, #369, #373, #375). Every refusal names the vocabulary that already
// owns the job, never just "no".
const OWNED_CSS = {
  opacity: 'written every frame from the enter/exit envelope (core/clips.js:220), use `anim` / `motion`',
  transform: 'written every frame by motion tracks and named entrances (core/clips.js, GSAP), use `motion`',
  animation: 'killed engine-wide (core/tokens.css:28, `* { animation: none !important }`) because a frame is seeked, not played, use `parts` for a seeked entrance into your own markup, or drive a value from `vars`',
  transition: 'killed engine-wide (core/tokens.css:28, `* { transition: none !important }`) for the same reason as `animation`, use `parts` or `vars`',
  position: 'the coordinate system the engine lays the layer out with (formats/scene/scene.js), use `x` / `y` / `w`',
  left: "written from the layer's `x` on every build (formats/scene/scene.js), set `x` instead",
  top: "written from the layer's `y` on every build (formats/scene/scene.js), set `y` instead",
  width: "written from the layer's `w`, and again by the type-specific builder, set `w` instead",
  height: "written from the layer's `h` by the type-specific builder (core/layers/*.js), set `h` instead",
  zIndex: "written every frame from the layer's stacking order (core/clips.js:150, driven by `track`), set `track` instead",
  pointerEvents: 'written every frame from the layer\'s on/off-window state (core/clips.js), there is no authoring override for it',
};

export function cssErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (!isObj(L.css)) return;
    for (const k of Object.keys(L.css)) {
      if (OWNED_CSS[k]) out.push(`${at}: css.${k} is engine-owned, ${OWNED_CSS[k]}.`);
    }
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  return out;
}

// EXTERNAL HTML, markup a scene NAMES but does not contain. Two kinds: a `src` fragment on an html
// layer or a bg window, and a CAPTURED component's markup. Both hit the same dead-CSS trap the inline
// `html` string has been checked for all along, and neither was ever looked at: `grep component` in this
// file returned nothing, while core/tokens.css:28 disables transition and animation for all three alike.
// Captured site UI carries hover transitions almost by definition, so this was the loudest silence here.
//
// `read(p)` returns a file's text or null, so this stays pure and browser-safe; only the CLI supplies one.
// A fragment is an ERROR (it is the author's own markup, held to the same bar as `html`). A capture is a
// WARN: the dead CSS was written by the site, not by us, and it costs a still, not a broken render.
export function externalHtmlErrors(cfg, read) {
  const out = [];
  const seen = new Set();
  const check = (src, at, level, pick) => {
    if (typeof src !== 'string' || seen.has(at + src)) return;
    seen.add(at + src);
    const text = read(src);
    if (text == null) return; // existence is asset-check's question, and the render's
    let markup;
    try { markup = pick(text); } catch (e) { out.push({ level: 'error', msg: `${at} "${src}" is unreadable, ${e.message}` }); return; }
    const timeCss = timeCssUsed(markup);
    if (timeCss) out.push({ level, msg: `${at} "${src}" uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Drive the motion from \`var(--t)\` / a \`vars\` custom property instead.` });
  };
  const asHtml = (t) => t;
  const asCapture = (t) => { const j = JSON.parse(t); return [j.html, ...(j.parts || []).map((p) => p && p.html)].filter((s) => typeof s === 'string').join('\n'); };
  const visit = (L, at) => {
    if (!isObj(L)) return;
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    if (L.type === 'html') check(L.src, `${at} (html)`, 'error', asHtml);
    if (L.type === 'component') check(L.src, `${at} (component)`, 'warn', asCapture);
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layer[${i}]`));
  (Array.isArray(cfg.bg) ? cfg.bg : []).forEach((b, i) => { if (isObj(b)) check(b.src, `bg[${i}]`, 'error', asHtml); });
  return out;
}

// MATCH CUTS. bindMatchesToJunctions refuses a match it cannot produce, and it does so at boot, which
// is sixty seconds and one ffmpeg pass after the author could have known. Run the same binder here, on
// a CLONE for the reason bgErrors gives just below: a validator that rewrites the object it is grading
// changes what every later check sees.
export function matchErrors(cfg) {
  if (!Array.isArray(cfg?.matches) || !cfg.matches.length) return [];
  const clone = lowerScene(structuredClone(cfg));
  try { bindMatchesToJunctions(clone, junctionTable(marksOf(clone))); } catch (e) { return [e.message]; }
  return [];
}

// The keys a bg WINDOW owns. Everything else that matches a preset parameter belongs under `opts`.
// Listed rather than derived: a window's own vocabulary is small and stable, and deriving it from the
// schema would make this check silently weaker the moment the schema grew a key.
const BG_WINDOW_KEYS = new Set(['preset', 'use', 'value', 'html', 'src', 'from', 'to', 't', 'tone', 'opts', 'mode', 'seed']);

// BACKGROUND WINDOWS. Two rules the schema walk cannot express, both about the hand-authored (`html`)
// backdrop introduced alongside the canvas presets.
export function bgErrors(cfg) {
  const out = [];
  // Windows that name no times at all are bound to the film's own joints, one each, in order
  // (core/junctions.js bindWindowsToJunctions). That needs one junction fewer than there are windows.
  // Checked HERE as well as at render because the render throw arrives 60 seconds and one ffmpeg pass
  // later, and the answer is the same either way. Lowered first: a scene written with the unified
  // `transitions` surface has no `cuts` key yet, and counting the raw form would refuse a film whose
  // cuts are real (docs/MISTAKES.md #358 is the same grammar, one layer up).
  const bgList = Array.isArray(cfg.bg) ? cfg.bg : [];
  if (bgList.length > 1 && bgList.every((b) => isObj(b) && b.from == null && b.to == null)) {
    // CLONED. lowerScene mutates and `delete`s `transitions` off what it is given, which is right for
    // the renderer (it lowers once, at the top) and wrong here: a validator that rewrites the object it
    // is grading changes what every later check sees, and the author's own data with it.
    const table = junctionTable(marksOf(lowerScene(structuredClone(cfg))));
    try { bindWindowsToJunctions(bgList, table, Number(cfg.duration) || Infinity); } catch (e) { out.push(e.message); }
  }

  // SPECTACLE, checked here because boot REFUSES it and this file did not. `resolveSpectacle` throws on
  // an unknown device, on a `spectacle.of` that names no layer id, and on a sting already sitting on the
  // moment. Every one of those is knowable from the JSON alone, so every one of them belongs in the
  // validator, and none of them was: a scene naming a subject that does not exist passed `make validate`
  // clean and then died at boot with a stack trace and no file name. Found by writing one.
  //
  // CLONED for the same reason as the binder above: resolveSpectacle attenuates amplitude dials and
  // appends a sting IN PLACE, and a validator must not rewrite the thing it is grading.
  if (isObj(cfg.spectacle)) {
    try { resolveSpectacle(structuredClone(cfg)); } catch (e) { out.push(e.message); }
  }
  bgList.forEach((b, i) => {
    if (!isObj(b)) return;
    const at = `bg[${i}]`;
    // ONE source per window. `html` paints in the DOM and `preset` paints on canvas; a window naming
    // both looks like a layered backdrop and is not one. The html wins and the preset is silently
    // dropped, which is the silent-substitution failure this codebase keeps paying for.
    // `src` is `html` in a file, so it belongs in the same one-source set: it does not layer over a
    // preset, and naming it beside `html` is the same ambiguity one level down.
    const sources = ['html', 'src', 'preset', 'use'].filter((k) => b[k] != null);
    if (sources.length > 1)
      // The message names the PAIR that actually collided. It used to explain html-versus-preset
      // whatever the conflict was, so `html` beside `src` was refused with a sentence about canvas
      // that had nothing to do with it. A gate that names the wrong cause costs more than silence.
      out.push(`${at} declares ${sources.map((s) => `\`${s}\``).join(' and ')}, a window has ONE backdrop. `
        + (b.html != null && b.src != null
          ? '`src` IS `html`, in a file, so naming both says the same backdrop twice and only one can win. Keep the file and drop the inline copy, or the other way round.'
          : '`html` and `src` paint in the DOM, `preset` and `use` paint on canvas; they do not layer. Split them into two windows (with `from`/`to`) if you want both in one video.'));
    const authored = b.html != null || b.src != null;
    if (!authored) {
      if (b.tone != null) out.push(`${at} sets \`tone\` but has no \`html\`, tone declares the lightness of a HAND-AUTHORED backdrop so the engine knows which text ink to default to. A preset's lightness is already known.`);
      // `opts` tunes the fx a preset is made of, so the vocabulary is PER PRESET: `liquid` takes
      // scale/speed/warp/edge0…, `paperDots` takes spacing/period/drift…. Anything else used to be
      // accepted by the schema, dropped by applyBgOver and never read, correct-looking JSON, unchanged
      // render (docs/MISTAKES.md #157). Say which keys this preset actually has.
      // A `use:"theme"` window names no preset here (it comes from themes/<name>.json), so it cannot be
      // resolved without the theme; applyBgOver throws on it at build time instead.
      // bgPreset now THROWS on an unknown preset (#361). The validator must REPORT a bad name, never
      // crash on one, so it only resolves a preset the registry knows, the enum check above has
      // already recorded the error for anything else.
      const bgKnown = BG_NAMES.includes(b.preset || 'paper');
      if (isObj(b.opts) && b.use == null && bgKnown)
        out.push(...bgOverErrors(bgPreset(b.preset || 'paper', b.value), b.opts, at));
      // ...AND THE SAME KEY ONE LEVEL UP. #157 made an unknown key INSIDE `opts` throw. Nothing checked
      // a real fx parameter written OUTSIDE it: `{"preset":"gradientWash","intensity":0.3}` is read by
      // formats/scene/scene.js:146 as `applyBgOver(spec, b.opts)` with `b.opts` undefined, so the whole
      // override is dropped and the film renders exactly as if the key were not there. That is the
      // identical failure the earlier fix was written for, at the level nobody looked at: I authored one
      // myself, changed the numbers twice, and got a byte-identical contact sheet both times before
      // reading the call site (docs/MISTAKES.md #327).
      if (b.use == null && bgKnown) {
        const known = new Set(bgOptKeys(bgPreset(b.preset || 'paper', b.value)));
        const stray = Object.keys(b).filter((k) => known.has(k) && !BG_WINDOW_KEYS.has(k));
        if (stray.length)
          out.push(`${at} sets ${stray.map((k) => `\`${k}\``).join(', ')} at the top level of the window, `
            + `where nothing reads ${stray.length > 1 ? 'them' : 'it'}. ${stray.length > 1 ? 'These are' : 'This is'} `
            + `a preset PARAMETER, and parameters live under \`opts\`: `
            + `{"preset":"${b.preset || 'paper'}", "opts": {${stray.map((k) => `"${k}": …`).join(', ')}}}. `
            + `Written where you have it, the render is unchanged and nothing says so.`);
      }
      return;
    }
    if (b.opts != null)
      out.push(`${at} sets \`opts\` on a hand-authored (\`html\`) backdrop, \`opts\` tunes the canvas fx a PRESET is built from, and an html window paints no fx, so nothing would read it. Style the fragment itself.`);
    const timeCss = b.html != null ? timeCssUsed(b.html) : null; // a `src` fragment is read off disk by fragmentFileErrors
    if (timeCss)
      out.push(`${at} uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Drive motion from \`var(--t)\` (seconds) or \`var(--p)\` (0→1 across this window) instead, e.g. \`transform: rotate(calc(var(--t) * 12deg))\`. Both are written every frame.`);
    if (b.tone == null)
      out.push(`${at} is hand-authored but declares no \`tone\` ("light" or "dark"). The engine cannot read the lightness out of your CSS, so a layer with no explicit \`color\` falls back to the theme's ink and may land white-on-white. Say which it is.`);
  });
  return out;
}

// NAMED GSAP EFFECTS: `fx` (entrance/loop/text) and `fxOut` (exit) reference stored effects by name.
// scene.html only console.warns on a typo (a warn the render swallows), so an unknown name shipped an
// unanimated layer silently. Catch it here, loudly, with a "did you mean" pointer. Also: `fxOut` and a
// motion `out` both drive the exit transform. A layer may declare only one, else they fight.
export function fxErrors(cfg) {
  const out = [];
  const layers = Array.isArray(cfg.layers) ? cfg.layers : [];
  const nameOf = (item) => (typeof item === 'string' ? item : (isObj(item) ? item.name : undefined));
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    // ASK THE REGISTRY, do not keep a second copy of what it knows. This used to import GSAP_FX and
    // re-implement the membership test, so the vocabulary lived in two places, the shape that made the
    // snap signature go blind (#159) and the silent-fallback gate miss its own blind spot (#363).
    // GSAP_REGISTRY.has() is the same knowledge, asked rather than duplicated. docs/MISTAKES.md #364.
    if (L.fx != null) {
      for (const item of (Array.isArray(L.fx) ? L.fx : [L.fx])) {
        const nm = nameOf(item);
        if (nm == null) { out.push(`layers[${i}].fx entry needs a name (string or {name})`); continue; }
        if (!GSAP_REGISTRY.has(nm)) out.push(`layers[${i}].fx "${nm}" is not a known effect.${nearest(nm, GSAP_FX)}`);
      }
    }
    if (L.fxOut != null) {
      const nm = nameOf(L.fxOut);
      if (nm == null) out.push(`layers[${i}].fxOut needs a name (string or {name})`);
      else if (!GSAP_EXIT_REGISTRY.has(nm)) out.push(`layers[${i}].fxOut "${nm}" is not a known exit.${nearest(nm, EXIT_FX)}`);
      if (L.out != null) out.push(`layers[${i}] declares both "out" and "fxOut", they both own the exit. Keep one.`);
    }
    // splitText (GSAP line reveal) re-wraps the layer AFTER the engine's own `split` already did, the two
    // splitters fight. splitText is line-level only; char/word stay with `split`.
    if (L.splitText != null && L.split != null) out.push(`layers[${i}] declares both "split" and "splitText". They both re-wrap the text. Use "split" for char/word, "splitText" for masked lines.`);
  });
  return out;
}

// A KNOB SET ON A PRESET THAT IGNORES IT. Same bug class as an unknown layer PROP, which
// core/layers/vocabulary.js has thrown on for a long time: a value written, accepted, and then read by
// nobody. The two were graded differently for no reason anybody could defend, the prop was refused at
// boot, the knob was a warning from `scripts/gates/knobs-audit.mjs` that only appeared if you ran it.
// So it moved here, beside every other refusal, and the gate kept only its manifest half.
//
// `knobsFor(family, preset)` (core/knobs.js) already answers which dials a preset reads; this is the
// wiring, not a second copy of that knowledge.
//
// WHERE IT REFUSES, AND WHERE IT DELIBERATELY STAYS QUIET. Only a preset core/knobs.js LISTS is
// graded. A preset with no manifest entry (`colorWave`, `shimmerWave`, `globe` today) is one the
// manifest has nothing to say about, and refusing a dial on the strength of a list that does not
// cover it is guessing, not checking. All three read real per-preset opts in core/type.js and
// core/three-fx.js, and grading them against `_shared` alone would refuse four shipped films for a
// hole in the manifest. Fill the manifest and they start being checked, with no change here.
const KNOB_SLOTS = [
  // `presetOpts` holds ONLY dials, so any key that is not one is dead, typos included.
  { family: 'kinetic', preset: (L) => L.preset, opts: (L) => (isObj(L.presetOpts) ? L.presetOpts : null), where: 'presetOpts' },
  // A three scene's dials sit on the LAYER, beside generic props (x, y, start…), so only a key that is
  // a real knob for a SIBLING scene can be called misused. Anything else is somebody's layout.
  { family: 'three', preset: (L) => L.three, opts: (L) => L, where: '', siblingsOnly: true },
];

export function knobErrors(cfg) {
  const out = [];
  const familyNames = (family) => {
    const names = new Set();
    for (const [p, list] of Object.entries(KNOBS[family] || {})) if (p !== '_shared') for (const k of list) names.add(k.name);
    return names;
  };
  const visit = (L, at) => {
    if (!isObj(L)) return;
    for (const slot of KNOB_SLOTS) {
      const preset = slot.preset(L);
      // The manifest must KNOW this preset; `_shared` alone is not knowledge of it (see above).
      if (typeof preset !== 'string' || !isObj(KNOBS[slot.family]) || !KNOBS[slot.family][preset]) continue;
      const opts = slot.opts(L);
      if (!isObj(opts)) continue;
      const legal = knobsFor(slot.family, preset);
      const names = new Set(legal.map((k) => k.name));
      const siblings = slot.siblingsOnly ? familyNames(slot.family) : null;
      for (const key of Object.keys(opts)) {
        if (names.has(key)) continue;
        if (siblings && !siblings.has(key)) continue;
        const site = slot.where ? `${at}.${slot.where}` : at;
        out.push(`${site} sets \`${key}\`, which the ${slot.family} preset "${preset}" does not read, it reads `
          + `${legal.map((k) => `\`${k.name}\``).join(', ')}. Written where you have it the render is unchanged and `
          + `nothing says so.${nearest(key, [...names])}`);
      }
    }
    (Array.isArray(L.children) ? L.children : []).forEach((C, j) => visit(C, `${at}.children[${j}]`));
    (Array.isArray(L.parts) ? L.parts : []).forEach((P, j) => visit(P, `${at}.parts[${j}]`));
    (Array.isArray(L.planes) ? L.planes : []).forEach((P, j) => visit(P, `${at}.planes[${j}]`));
  };
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}

// SEAM D range check: fx-name and dur bounds are enforced by the schema (enum + min); what the schema
// cannot express is that the window [t, t+dur] must fall INSIDE the video, else the outgoing/incoming
// beats are baked from clamped edge frames and the transition blends the wrong thing silently.
export function seamErrors(cfg) {
  const out = [];
  const seams = Array.isArray(cfg.seams) ? cfg.seams : [];
  if (!seams.length) return out;
  // effective duration: explicit, else the last layer's end (+0.4 tail), mirrors scene.html.
  let dur = typeof cfg.duration === 'number' ? cfg.duration : 0;
  if (!dur) for (const L of cfg.layers || []) { if (isObj(L) && typeof L.start !== 'string') dur = Math.max(dur, (L.start ?? 0) + (L.duration ?? 2)); }
  dur = +(dur + (typeof cfg.duration === 'number' ? 0 : 0.4)).toFixed(2);
  seams.forEach((s, i) => {
    if (!isObj(s)) return;
    const t = +s.t, d = +(s.dur ?? 0.5);
    if (!isFinite(t)) return; // schema reports the missing/NaN t
    if (t < 0) out.push(`seams[${i}] t must be ≥ 0 (got ${s.t})`);
    if (dur && t + d > dur + 1e-6) out.push(`seams[${i}] window [${t}, ${(t + d).toFixed(2)}] runs past the video (${dur}s), move it earlier or shorten dur`);
  });
  return out;
}

// UNIFIED TRANSITIONS: the fx must route to a real boundary mechanism (cut/seam/sting). The schema
// checks shape (at/dur/timing); only the router knows whether a name is a boundary transition at all,
// so a typo or a layer-only name (e.g. `pop`) used as a boundary is caught here, loudly, not silently.
// A duration slot may name a WORD instead of a number (core/vocab.js), and core/transitions-lower.js
// resolves it. That resolve THROWS on an unknown word, which is right at render and wrong as the first
// thing an author hears: the throw arrives from inside a lowering pass, out of one of eight workers.
// Caught here so the same refusal is a validation line, at the entry point, in a second.
const DUR_WORD_SLOTS = ['duration', 'enterDur', 'exitDur'];
export function durationWordErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    for (const k of DUR_WORD_SLOTS) {
      if (typeof L[k] !== 'string') continue;
      try { resolveSeconds(L[k]); } catch (e) { out.push(`${at}.${k}: ${e.message}`); }
    }
    if (isObj(L.transition) && typeof L.transition.dur === 'string') {
      try { resolveSeconds(L.transition.dur); } catch (e) { out.push(`${at}.transition.dur: ${e.message}`); }
    }
    (L.children || []).forEach((c, i) => visit(c, `${at}.children[${i}]`));
  };
  (cfg.layers || []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}

export function transitionErrors(cfg) {
  const out = [];
  const list = Array.isArray(cfg.transitions) ? cfg.transitions : [];
  list.forEach((T, i) => {
    if (!isObj(T)) { out.push(`transitions[${i}] must be an object`); return; }
    if (T.fx == null) return; // the schema reports the missing required `fx`/`at`
    try { boundaryMechanism(T.fx, T.mech); }
    catch (e) { out.push(`transitions[${i}]: ${e.message}`); }
  });
  return out;
}

// ON-SCREEN TEXT, out of a string that may be MARKUP. The rule moved to core/on-screen-text.js and is
// re-exported here so the existing importers keep working: it was the strictest of eight copies, and
// making it the only one is what closes docs/MISTAKES.md #214/#216/#217 in the consumers that still
// used the naive `/<[^>]+>/g` form. Every em-dash in ordinary copy is still caught, including inside
// `<b>`/`<em>`, whose TEXT survives.
export { onScreenText, glyphText } from './on-screen-text.js';

// Em-dashes are banned in all rendered text (brand voice rule). Checks the RENDERED text of every
// string VALUE in the data (schema labels are internal and exempt). Use a comma, period, or · instead.
function noEmdash(v, path, errors) {
  if (typeof v === 'string') {
    const seen = onScreenText(v);
    const at = seen.indexOf('\u2014');
    // Quote the RENDERED text around the offence, not the head of the source: an em-dash 900
    // characters into a fragment was reported with a 48-character snippet that did not contain it.
    if (at >= 0) errors.push(`${path || 'data'} contains an em-dash: "${seen.slice(Math.max(0, at - 24), at + 25).trim()}". Use , . or ·`);
  }
  else if (Array.isArray(v)) v.forEach((x, i) => noEmdash(x, `${path}[${i}]`, errors));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) { if (k === 'module' || k === 'theme') continue; noEmdash(x, path ? `${path}.${k}` : k, errors); }
}

// THIS ENGINE HAS TWO EASING VOCABULARIES and the field decides which one is in force. `parts[].ease`,
// `morph.ease`, `fx:{ease}`, `fxOut:{ease}`, `splitText.ease` and `motionPath.ease` are handed straight
// to gsap.fromTo, so they take GSAP names (`power2.inOut`). Everything else is driven by the engine's
// own interpolator and takes an EASINGS name. Both are correct, and a name from one in a field of the
// other is the #355 wrong-slot mistake, which is the single most-repeated defect in this log.
//
// resolveEasing now throws on an unknown name (#367), so this is not about catching it at all, it is
// about catching it in a second at author-check instead of mid-render on whichever frame first samples
// that key. The exclusion list below is the whole rule: get it wrong in the other direction and this
// invents findings on `showcase-lumen` and `showcase-type-labour`, which name GSAP eases correctly.
const GSAP_OWNED_EASE = new Set(['parts', 'morph', 'fx', 'fxOut', 'splitText', 'motionPath', 'physics']);
const EASE_KEYS = new Set(['ease', 'easing', 'settleEase']);
function easeNames(v, path, errors, underGsap = false) {
  if (Array.isArray(v)) return v.forEach((x, i) => easeNames(x, `${path}[${i}]`, errors, underGsap));
  if (!isObj(v)) return;
  for (const [k, x] of Object.entries(v)) {
    const at = path ? `${path}.${k}` : k;
    const gsap = underGsap || GSAP_OWNED_EASE.has(k);
    // `varsEase` takes a string OR a per-channel map, so check the leaves either way.
    const leaves = (EASE_KEYS.has(k) || k === 'varsEase')
      ? (typeof x === 'string' ? [x] : (isObj(x) ? Object.values(x).filter((s) => typeof s === 'string') : []))
      : [];
    if (!gsap) for (const nm of leaves) {
      // ASK THE RESOLVER'S OWN PREDICATE. This used to test `EASINGS[nm]` by hand, which is a second
      // copy of the membership rule, and the day feel words became resolvable, the copy would have
      // reported every one of them as unknown while the renderer accepted it. Same argument as #367.
      if (isEasingName(nm)) continue;
      errors.push(`${at}: unknown easing "${nm}". This field is driven by the engine's own interpolator, `
        + `so it takes an EASINGS name.${/^(power[0-4]|back|elastic|bounce|circ|expo|sine|steps|none|rough|slow)\b/.test(nm)
          ? ` "${nm}" is a GSAP ease, real here, but only on a GSAP-driven field (parts[].ease, morph.ease, fx:{ease}).`
          : nearest(nm, [...Object.keys(EASINGS), ...Object.keys(FEEL)])}`);
    }
    easeNames(x, at, errors, gsap);
  }
}
/** easeErrors(cfg) → messages[]. Exported so the exclusion list is testable on its own, it is the
 *  half of this rule that can rot silently, because getting it wrong reads as a stricter gate. */
export function easeErrors(cfg) { const out = []; easeNames(cfg, '', out); return out; }

// lintData(data) → warnings[]: authoring smells the schema can't express. Non-failing (CLI prints ⚠;
// boot never calls this). Each rule below maps to a real bug that shipped this session and slipped
// every existing gate. Pure. Scene layers only.

// The label the window, count and collision rules report a layer with. Three of the rules below share
// it, so it is declared once here rather than inside each.
const layerName = (L, i) => `layer[${i}] (${L.type || 'text'}${typeof L.text === 'string' ? ` "${onScreenText(L.text).slice(0, 24)}"` : ''})`;

function deprecatedEntranceWarns(data) {
  const warns = [];
  // A DEPRECATED entrance still renders, so it is a warning, not an error. It names its replacement,
  // because "deprecated" without one is just a scolding. The engine carries four vocabularies for an
  // entrance and these sixteen duplicate `anim` exactly. docs/MISTAKES.md #364.
  for (const [i, L] of (data.layers || []).entries()) {
    const names = L.fx == null ? [] : (Array.isArray(L.fx) ? L.fx : [L.fx]).map((x) => (typeof x === 'string' ? x : x && x.name));
    for (const nm of names) if (nm && DEPRECATED_FX[nm])
      warns.push(`layers[${i}].fx "${nm}" is deprecated, use ${DEPRECATED_FX[nm]}. It does the same thing, works on any layer type, and there are four vocabularies for an entrance already (#364).`);
    const outNm = L.fxOut == null ? null : (typeof L.fxOut === 'string' ? L.fxOut : L.fxOut.name);
    if (outNm && DEPRECATED_EXIT[outNm])
      warns.push(`layers[${i}].fxOut "${outNm}" is deprecated, use ${DEPRECATED_EXIT[outNm]} (#364).`);
  }
  return warns;
}

function becomesHandoverWarns(data) {
  const warns = [];
  // `becomes` overwrites the incoming layer's opening keys: during the handover the layer is not itself
  // yet, so `resolveBecomes` replaces everything it declared inside the window with the computed
  // open/settle pair. That is right, and it is DATA THE AUTHOR WROTE BEING DISCARDED, which has to be
  // said out loud rather than inferred from a source comment nobody reads while authoring.
  for (const [i, A] of (data.layers || []).entries()) {
    if (!isObj(A) || typeof A.becomes !== 'string') continue;
    const B = (data.layers || []).find((x) => isObj(x) && x.id === A.becomes);
    if (!isObj(B) || !Array.isArray(B.motion)) continue;
    const dur = Math.max(0.05, typeof A.becomesDur === 'number' ? A.becomesDur : 0.42);
    const lost = B.motion.filter((k) => isObj(k) && (typeof k.t === 'number' ? k.t : 0) <= dur + 1e-6);
    if (lost.length) {
      warns.push(`layers[${i}]${A.id ? ` #${A.id}` : ''}: becomes "${B.id}", and the handover takes ${dur}s, so ${lost.length} of "${B.id}"'s own motion key(s) at t≤${dur} (${lost.map((k) => `t=${k.t ?? 0}`).join(', ')}) are DROPPED and replaced by the computed match. Move them past ${dur}s, or shorten \`becomesDur\`.`);
    }
  }
  return warns;
}

function omittedKeyResetWarns(data) {
  const warns = [];
  // A key states what changes and says nothing about the rest, and `motionAt`/`cameraAt` read that
  // silence as IDENTITY, not as "unchanged" (core/sequence.js). That contract is deliberate and scenes
  // depend on it. A layer whose only `opacity` key sits at the end fades over the last segment precisely
  // because the keys before it read as opacity 1. But it means a track that declares a property, moves it
  // somewhere, and then stops mentioning it SNAPS it home, and nothing about the JSON looks wrong.
  //
  // So it is warned about rather than changed. Changing the reader was tried and measured: per-property
  // interpolation altered 19 scenes and made one film's button invisible throughout (#195). Splitting the
  // semantics so camera and layer tracks behave differently would be a worse trap than either. One
  // contract, stated out loud when it is about to bite. Only when the reset actually MOVES something.
  // A property dropped while it already sat at identity changes nothing and is not worth a word.
  {
    const IDENT = { x: 0, y: 0, scale: 1, rot: 0, opacity: 1, blur: 0, s: 1, rx: 0, ry: 0, p: 1600 };
    const scan = (keys, props, label) => {
      if (!Array.isArray(keys) || keys.length < 2) return;
      for (const pr of props) {
        const first = keys.findIndex((k) => isObj(k) && k[pr] != null);
        if (first < 0) continue;
        for (let i = first + 1; i < keys.length; i++) {
          if (!isObj(keys[i]) || keys[i][pr] != null) continue;
          const prior = keys.slice(0, i).reverse().find((k) => isObj(k) && k[pr] != null);
          if (prior && Math.abs(prior[pr] - IDENT[pr]) > 1e-9) {
            warns.push(`${label}: \`${pr}\` is ${prior[pr]} at t=${prior.t}, and the key at t=${keys[i].t} does not mention it. A key that omits a property RESETS it to ${IDENT[pr]}, it does not hold it. Restate \`${pr}\` on that key (and every later one) unless you mean it to snap back.`);
          }
          break;
        }
      }
    };
    const cam = Array.isArray(data.camera) ? data.camera : Array.isArray(data.cam) ? data.cam : null;
    if (cam) scan(cam, ['s', 'x', 'y', 'rx', 'ry', 'p'], 'camera');
    const walk = (ls) => (ls || []).forEach((L, i) => {
      if (!isObj(L)) return;
      scan(L.motion, ['x', 'y', 'scale', 'rot', 'opacity', 'blur'], `layers[${i}]${L.id ? ` #${L.id}` : ''}`);
      if (Array.isArray(L.children)) walk(L.children);
    });
    walk(data.layers);
  }
  return warns;
}

function inertPropWarns(data) {
  const warns = [];
  // A prop that is read only INSIDE a conditional on another prop does nothing when that other prop is
  // absent, and does it silently, which is the failure class this repo hates most. Three of them live
  // in the anchor/align code, and CLAUDE.md already describes two as things that "render silently"
  // rather than fixing them (docs/MISTAKES.md #199). `at` is skipped for blocks, where it is an
  // unrelated block param (`tapRipple` uses `at: 2.1` as a time), the prop is overloaded, and a check
  // that did not know that would have fired on innocent scenes.
  for (const [i, L] of (data.layers || []).entries()) {
    if (!isObj(L)) continue;
    const label = `layers[${i}]${L.id ? ` #${L.id}` : ''}`;
    // `elevation` writes an inset 1px ring as part of its depth stack, so `border` is DROPPED beside it
    // (core/layers/util.js). That is the right pixel answer. Two rings on one edge read as a mistake,
    // but it is a prop the author wrote being discarded without a word, and on a DARK surface the ring
    // it substitutes is rgba(255,255,255,0.06), which is not the visible 1px line the author asked for.
    // Said out loud rather than changed: 132 layers across this library already set both, and honouring
    // the border would restyle every one of them.
    if (L.border && L.elevation) {
      warns.push(`${label}: sets both \`border\` and \`elevation\`, and elevation wins. The border is DROPPED and replaced by elevation's inset ring (${L.on === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}). On a dark surface that ring is nearly invisible. Drop one: \`elevation\` for depth, or \`border\` + \`glow\` for a lit edge.`);
    }
    if (typeof L.at === 'string' && !L.anchor && L.type !== 'block') {
      warns.push(`${label}: \`at: "${L.at}"\` positions a layer against its \`anchor\`, and there is no \`anchor\`, so it is IGNORED and the layer sits at its own x/y. Add \`anchor: "<id>"\`, or drop \`at\`.`);
    }
    if (typeof L.at === 'string' && L.anchor && L.at.endsWith('center') && L.w == null) {
      warns.push(`${label}: \`at: "${L.at}"\` centres this layer on its anchor by subtracting half its OWN width, and it has no \`w\`, so it silently falls back to a plain left offset. Give it \`w\`.`);
    }
    if ((L.align === 'center' || L.align === 'right') && L.w == null && L.type !== 'block') {
      warns.push(`${label}: \`align: "${L.align}"\` aligns text inside the layer's box, and without \`w\` that box shrink-wraps the text, so the alignment does nothing. Give it \`w\`, or drop \`align\`.`);
    }
  }
  return warns;
}

function panWithRestWarns(data) {
  const warns = [];
  // `panWith` copies a track as DELTAS, so the x/y an author writes is where the layer STARTS and the
  // pan carries it somewhere else. That total is computable and appears nowhere: not in the layer, not
  // in the source, not in any error. Two separate bugs came from guessing it, the button snapping
  // 194px backwards (#194) and, in the very next edit, three dots parked 274px off the end of the word
  // they belong to. Both times the file read as intended. So the arithmetic is simply printed.
  // Only when the shift is big enough to matter: a pan that moves a layer a few px needs no announcing.
  {
    const REST_MIN = 24;
    for (const [i, L] of (data.layers || []).entries()) {
      if (!isObj(L) || typeof L.panWith !== 'string') continue;
      const src = (data.layers || []).find((x) => isObj(x) && x.id === L.panWith);
      if (!isObj(src) || typeof src.panWith === 'string' || !Array.isArray(src.motion) || !src.motion.length) continue;
      let track; try { track = mergePan(L, src); } catch { continue; }
      const end = Math.max(...track.map((k) => (typeof k.t === 'number' ? k.t : 0)));
      const at = motionAt(track, end);
      const dx = Math.round(at.dx || 0), dy = Math.round(at.dy || 0);
      if (Math.hypot(dx, dy) < REST_MIN) continue;
      const bx = typeof L.x === 'number' ? L.x : null, by = typeof L.y === 'number' ? L.y : null;
      warns.push(`layers[${i}]${L.id ? ` #${L.id}` : ''}: pans with "${L.panWith}", so its x/y is where it STARTS`
        + `${bx != null ? ` (${bx}${by != null ? `, ${by}` : ''})` : ''}. It comes to rest ${dx ? `${dx > 0 ? '+' : ''}${dx}px across` : ''}`
        + `${dx && dy ? ' and ' : ''}${dy ? `${dy > 0 ? '+' : ''}${dy}px down` : ''}`
        + `${bx != null ? `, at (${bx + dx}${by != null ? `, ${by + dy}` : ''})` : ''}. Place it by where it STARTS, not where you want it to land.`);
    }
  }
  return warns;
}

function missingWindowWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (1) MISSING WINDOW: a layer with no `duration` renders for the ENTIRE video (engine default). Almost
  //     always a slip (the "+" gutter that leaked for 53s). Full-bleed backdrops opt out with track:0.
  // A layer named as a match cut's OUTGOING form is retimed to end on the joint at boot
  // (core/junctions.js bindMatchesToJunctions), so writing a `duration` here would be the second copy
  // of the number the joint already owns. It does not render for the whole video and must not be told to.
  const matchFrom = new Set((Array.isArray(data?.matches) ? data.matches : []).map((m) => m && m.from).filter(Boolean));
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    if (L.duration == null && L.track !== 0 && !matchFrom.has(L.id)) warns.push(`${layerName(L, i)} has no "duration". Renders for the whole video. Add start+duration (or track:0 for an intentional backdrop).`);
  });
  return warns;
}

function countWindowWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (2b) countStart is LOCAL to the layer's own `start` (count.js: interpolate(t - start, [cs, cs+cd])),
  //      NOT an absolute scene time. Setting it to the wall-clock second the count should fire is the
  //      classic footgun: the animation window falls outside the layer's visible span, so the number
  //      freezes on its `from` value and the render is silently wrong (docs/MISTAKES.md #147). If
  //      countStart alone already meets/exceeds the layer's duration, the count can never animate.
  layers.forEach((L, i) => {
    if (!isObj(L) || L.type !== 'count') return;
    const dur = L.duration ?? 2, cs = L.countStart ?? 0, cd = L.countDur ?? 1.2;
    if (cs >= dur) warns.push(`${layerName(L, i)} has countStart ${cs} ≥ its duration ${dur}. countStart is LOCAL to the layer's start (t - start), not an absolute scene time. The count never animates and freezes at "from". Use a small local offset (e.g. countStart 0.2) and set the layer's own start to when it appears.`);
    else if (cs + cd > dur + 0.05) warns.push(`${layerName(L, i)} count window (countStart ${cs} + countDur ${cd} = ${(cs + cd).toFixed(1)}) runs past its duration ${dur}. The count-up gets cut off before it lands. Shorten countDur or lengthen duration.`);
  });
  return warns;
}

function sceneCollisionWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (3) SCENE COLLISION: two CONTENT layers overlapping in BOTH space and time, not in a
  //     containment/group/anchor relationship = one scene bleeding into the next (the Preferences↔agents
  //     overlap). Pure geometry; needs an explicit w to bound a box (numeric starts only).
  const CONTENT = new Set(['text', 'count', 'doc', 'image', 'group', 'board', 'html']);
  // MEASURE THE GLYPHS, NOT THE BOX THE AUTHOR ASKED FOR. On a rect, an image, an html layer or a
  // group, `w`/`h` size the element and the declared box IS what gets painted. On a TEXT layer they do
  // not: `w` is a WRAPPING width (`pin` centres a box, so a placed line has to declare one), `align`
  // decides where inside it the glyphs sit, and `h` is absent so the old estimate assumed one line.
  // So a 1200px-wide layer reading "Hi" was compared as a 1200px-wide object and collided with a
  // neighbour it comes nowhere near, while a layer whose copy wraps to four lines was compared as one.
  // Both are findings about the JSON, not about the film (docs/MISTAKES.md #214 and its recurrences).
  //
  // This file is pure and browser-safe, so there is no font to measure with. Estimate the run from the
  // STRING instead: a heavy sans averages roughly half an em per glyph, and 0.55 is deliberately on the
  // generous side because over-estimating the ink keeps real collisions reported. Markup contributes no
  // width, so it is stripped first.
  //
  // WIDTH ONLY. The obvious next step is to divide the run by `w` and give a wrapped line a taller box,
  // and it was written, measured and removed: at 0.55 em a short word in a narrow column reads as
  // wrapping when it does not, and the guessed second line reached down into the caption beneath it.
  // That added 11 collision warnings across the library, every one of them a heading that fits on its
  // line. A gate that manufactures a defect is worse than one that misses it (docs/MISTAKES.md #211,
  // and the retired typing rule), so the height stays the old single-line estimate: it under-states, and
  // under-stating can only drop a finding, never invent one.
  const ADVANCE = 0.55;                                  // average glyph advance, in em
  const LINE_HEIGHT = 1.04;                              // .hs-text in formats/scene/scene.css
  const TEXT_IS_NOT_ITS_BOX = new Set(['text', 'count']);
  const inkBox = (L) => {
    const size = L.size ?? 40;
    // GLYPHS, not words: this multiplies a character count by an average advance to guess how wide the
    // ink runs, so it must count what the DOM counts. onScreenText yields a space for a `<br>`, which
    // is right for reading and wrong here. It padded every emphasised line by a character per tag.
    const copy = typeof L.text === 'string' ? glyphText(L.text).trim()
      : L.value != null ? String(L.value) : null;
    if (!copy) return null;                              // nothing readable to measure: fall back to `w`
    const run = copy.length * size * ADVANCE;
    const lineW = Math.min(L.w, run);
    const x0 = L.align === 'center' ? L.x + (L.w - lineW) / 2
      : L.align === 'right' ? L.x + L.w - lineW
      : L.x;
    return { x0, x1: x0 + lineW };
  };
  const box = (L) => {
    if (typeof L.start === 'string' || L.x == null || L.y == null || L.w == null) return null;
    const ink = TEXT_IS_NOT_ITS_BOX.has(L.type || 'text') ? inkBox(L) : null;
    // 1.04 is the engine's own line-height for .hs-text (formats/scene/scene.css). The estimate used to
    // be 1.3, which is nobody's number: it gave every headline a box a quarter taller than the line the
    // renderer draws, and that phantom band under a title is what "collided" with the caption below it.
    const h = L.h != null ? L.h : (L.size ?? 40) * LINE_HEIGHT;
    const s = L.start ?? 0;
    return { x0: ink ? ink.x0 : L.x, y0: L.y, x1: ink ? ink.x1 : L.x + L.w, y1: L.y + h, s, e: s + (L.duration ?? 2) };
  };
  const cand = layers.map((L, i) => ({ L, i, b: isObj(L) && CONTENT.has(L.type || 'text') ? box(L) : null })).filter((o) => o.b);
  for (let a = 0; a < cand.length; a++) {
    for (let b = a + 1; b < cand.length; b++) {
      const A = cand[a], B = cand[b];
      if (A.L.group || B.L.group || (A.L.anchor && A.L.anchor === B.L.id) || (B.L.anchor && B.L.anchor === A.L.id)) continue;
      const t0 = Math.max(A.b.s, B.b.s), t1 = Math.min(A.b.e, B.b.e);
      if (t1 - t0 <= 0.3) continue; // time windows barely/never overlap
      const ix = Math.min(A.b.x1, B.b.x1) - Math.max(A.b.x0, B.b.x0);
      const iy = Math.min(A.b.y1, B.b.y1) - Math.max(A.b.y0, B.b.y0);
      if (ix <= 0 || iy <= 0) continue; // boxes disjoint in space
      const frac = (ix * iy) / Math.min((A.b.x1 - A.b.x0) * (A.b.y1 - A.b.y0), (B.b.x1 - B.b.x0) * (B.b.y1 - B.b.y0));
      // full containment (chip inside a card) is intentional; flag the PARTIAL-overlap band only.
      if (frac >= 0.3 && frac <= 0.95) warns.push(`${layerName(A.L, A.i)} and ${layerName(B.L, B.i)} overlap ~${Math.round(frac * 100)}% in space and ${(t1 - t0).toFixed(1)}s in time (t=${t0.toFixed(1)}-${t1.toFixed(1)}). A scene may be colliding with the next.`);
    }
  }
  return warns;
}

export function lintData(data) {
  return [
    ...deprecatedEntranceWarns(data),
    ...becomesHandoverWarns(data),
    ...omittedKeyResetWarns(data),
    ...inertPropWarns(data),
    ...panWithRestWarns(data),
    ...missingWindowWarns(data),
    // (2) TYPING + MARKUP: RETIRED, and the retirement is the point. This rule warned that `typing`
    //     reveals characters literally so `<b>`/`<em>` show as visible tags. That was true when it was
    //     written and stopped being true on 2026-07-24, when core/layers/text.js gained an HTML-safe
    //     typing path (`revealHtml`): the VISIBLE characters are counted and revealed while the tags stay
    //     intact, so an accent word types in ITS OWN COLOUR. The rule outlived the bug by a fortnight and
    //     went on telling authors to strip markup the engine handles correctly, a gate that manufactures
    //     a defect, which is worse than one that misses it, because the author pays by making the film
    //     plainer. docs/MISTAKES.md #85.
    //     Nothing replaces it: `stripLen`/`revealHtml` are exercised by `make lib-test`, and lint-test
    //     now pins that typed markup is SILENT so this cannot be reintroduced by reflex.
    ...countWindowWarns(data),
    ...sceneCollisionWarns(data),
  ];
}

function walk(fields, obj, path, errors) {
  for (const [key, spec] of Object.entries(fields)) {
    if (!isObj(spec)) continue;
    const val = obj?.[key];
    const at = `${path}${key}`;
    if (val == null) {
      if (spec.required) errors.push(`${at} is required${spec.hint ? `, ${spec.hint}` : ''}`);
      continue;
    }
    // `type` may be a union like "number|string" (relative coords: 40 or "50%"). Any member matches.
    if (spec.type && !spec.type.split('|').includes(typeOf(val))) {
      errors.push(`${at} must be a ${spec.type} (got ${typeOf(val)})`);
      continue; // type wrong → skip deeper checks
    }
    checkField(spec, val, at, errors);
  }
}

function checkField(spec, val, at, errors) {
  switch (spec.type) {
    case 'number':
      if (Number.isNaN(val)) errors.push(`${at} must be a number (got NaN)`);
      if (spec.min != null && val < spec.min) errors.push(`${at} must be ≥ ${spec.min} (got ${val})`);
      if (spec.max != null && val > spec.max) errors.push(`${at} must be ≤ ${spec.max} (got ${val})`);
      break;
    case 'string':
      if (spec.minLength != null && val.length < spec.minLength) errors.push(`${at} must be ≥ ${spec.minLength} chars`);
      if (spec.enum && !spec.enum.includes(val)) {
      // `block`/`comp` are BUILD-TIME sugar, not layer types. Reporting them as an unknown enum buries
      // the dedicated "run make expand" message under a list of 15 types that are all wrong answers.
      if (!(at.endsWith('.type') && (val === 'block' || val === 'comp')))
        errors.push(`${at} "${val}" is not valid.${nearest(val, spec.enum)} One of: ${spec.enum.join(', ')}`);
    }
      if (spec.pattern && !new RegExp(spec.pattern).test(val)) errors.push(`${at} must match /${spec.pattern}/ (got "${val}")`);
      break;
    case 'array':
      if (spec.minItems != null && val.length < spec.minItems) errors.push(`${at} needs ≥ ${spec.minItems} item(s) (got ${val.length})${spec.hint ? `, ${spec.hint}` : ''}`);
      if (spec.maxItems != null && val.length > spec.maxItems) errors.push(`${at} allows ≤ ${spec.maxItems} item(s) (got ${val.length})`);
      // A block/comp layer carries the BLOCK's props (a pointer's `to:{x,y}`, a kpiRow's `items:[…]`),
      // NOT the base layer schema, blocks-audit owns those. The unknown-prop pass already exempts
      // block/comp; this TYPE pass must too, or a valid block prop (`to` object vs the layer's `to`
      // number) fails and the scene cannot boot (this silently broke showcase-spot/flight). Same intent
      // as the note at the layers checkLayer pass below.
      if (isObj(spec.item)) val.forEach((el, i) => {
        if (isObj(el) && (el.type === 'block' || el.type === 'comp')) return;
        walk(spec.item, el, `${at}[${i}].`, errors);
      });
      break;
    case 'object':
      if (isObj(spec.fields)) walk(spec.fields, val, `${at}.`, errors);
      break;
  }
}

// validateTheme(theme): shape-check a theme spec. A data JSON MUST declare its theme (name or
// inline object). There is no default look (core/theme-contract.js). Inline objects are
// completeness-checked here; named themes are completeness-checked by the CLI below (it can read
// the file) and again at boot by applyTheme.
export function validateTheme(spec) {
  const errors = [];
  if (spec == null) return ['data.theme is required (a theme name or an inline theme object), no default look exists'];
  if (typeof spec === 'string') return errors;
  if (!isObj(spec)) return [`theme must be a string name or an object (got ${typeOf(spec)})`];
  errors.push(...themeErrors(spec, { parseColor, contrastRatio }).map((m) => `theme incomplete: ${m}`));
  if ('palette' in spec && !isObj(spec.palette)) errors.push('theme.palette must be an object');
  if ('type' in spec && !isObj(spec.type)) errors.push('theme.type must be an object');
  if ('vars' in spec && !isObj(spec.vars)) errors.push('theme.vars must be an object');
  if ('gradient' in spec && !Array.isArray(spec.gradient)) errors.push('theme.gradient must be an array of colors');
  if ('motion' in spec) {
    if (!isObj(spec.motion)) errors.push('theme.motion must be an object');
    else for (const k of ['bounce', 'settle', 'enter', 'durationScale', 'stagger']) {
      if (k in spec.motion && typeof spec.motion[k] !== 'number') errors.push(`theme.motion.${k} must be a number`);
    }
  }
  return errors;
}

// validateAll(schema, data): data errors + theme errors, combined.
export function validateAll(schema, data) {
  return [...validateData(schema, data), ...validateTheme(data?.theme)];
}

// ---------- CLI: `node core/validate.mjs [data.json ...]` (make validate) ----------
// No args → validate every formats/*/sample.json. Browser never runs this branch.
const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

  const strict = process.argv.includes('--strict'); // treat lint warnings as failures
  let targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  // No args used to mean "formats/*/sample.json", with one format, that is ONE file, while 60
  // authored scenes and every theme pack went unchecked. So a scene could carry an anim name that
  // never existed (silently resolving to fade) and a theme could be missing half the contract, for
  // as long as nobody happened to re-render it by hand. Default is now EVERY authored scene and
  // EVERY theme, because a validator nobody points at the real files validates nothing (#48).
  let themeTargets = [];
  if (targets.length === 0) {
    const fdir = path.join(root, 'formats');
    for (const fmt of fs.readdirSync(fdir)) {
      const dir = path.join(fdir, fmt);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const n of fs.readdirSync(dir)) {
        if (!n.endsWith('.json') || n === 'schema.json') continue;
        // only actual scenes: a formats/ dir also holds planning artifacts (*.intent.json carries
        // beats, not layers). "Declares a module" is the honest test for "the renderer would read it".
        const fp = path.join(dir, n);
        try { if (!JSON.parse(fs.readFileSync(fp, 'utf8')).module) continue; } catch { }
        // A scene authored with block/comp sugar is a SOURCE; `make expand` writes the renderable
        // <name>.expanded.json beside it, and that is what gets validated and rendered. Checking the
        // source too would report "un-expanded block" forever on a file that is correct as authored.
        if (!n.endsWith('.expanded.json') && fs.existsSync(fp.replace(/\.json$/, '.expanded.json'))) continue;
        targets.push(fp);
      }
    }
    targets.sort();
    const tdir = path.join(root, 'themes');
    if (fs.existsSync(tdir)) themeTargets = fs.readdirSync(tdir).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(tdir, n));
  }

  let failed = 0;

  // AUDIO registries, loaded live so the checks below cannot rot against the synth engine.
  // CUES is the ONLY valid cue-name set (core/audio-kit.mjs). Beds are the .wav files the mixer
  // resolves a `music` bed-name against (assets/music/). audio-kit imports node:fs, so this dynamic
  // import stays in the CLI branch and never reaches the browser.
  const { CUES } = await import('./audio-kit.mjs');
  const CUE_NAMES = Object.keys(CUES);

  // Anti-rot guard: the cue enum in schema.json is DISCOVERABILITY only (so authors + MCP can see the
  // valid names); CUES is the source of truth. If they drift, the schema lies, fail loudly to resync.
  try {
    const ss = readJSON(path.join(root, 'formats/scene/schema.json'));
    const el = ss?.fields?.audio?.fields?.cues?.item?.name?.enum || [];
    // Superset guard: every live CUE must be documented. The enum MAY also carry baked ALIASES
    // (whoosh/reveal/click/pop, scripts/media/audio-bake.mjs) that are not CUES keys, so only a CUE
    // the enum OMITS is drift, extra alias names are legal.
    const missing = CUE_NAMES.filter((n) => !el.includes(n));
    if (el.length && missing.length) { console.error(`✗ schema drift: formats/scene/schema.json audio.cues enum omits live CUES (${missing.join(', ')}), add them.`); failed++; }
  } catch { }

  for (const file of targets) {
    let data, schema;
    try { data = readJSON(file); } catch (e) { console.error(`✗ ${file}: unreadable JSON, ${e.message}`); failed++; continue; }
    const mod = data.module;
    const schemaPath = mod && path.join(root, 'formats', mod, 'schema.json');
    try { schema = schemaPath && fs.existsSync(schemaPath) ? readJSON(schemaPath) : null; } catch (e) { schema = null; }
    const errors = validateAll(schema, data);
    // build-time sugar must be expanded before render: the engine's layer registry has no
    // `block`/`comp` type, so a leftover one renders as NOTHING. Fail loud → run `make expand`.
    // UNKNOWN PROPS. The engine reads the props it knows and ignores the rest in silence, so
    // `fill` instead of `bg`, or `colour` instead of `color`, renders a layer that is quietly wrong
    // and gives the author nothing to search for. Two shipped scenes set `opacity` on a layer for
    // months with no effect whatsoever. Silence is the worst failure (docs/MISTAKES.md).
    //
    // Scoped deliberately:
    //   · `block`/`comp` layers carry the BLOCK's props, which this schema does not describe and
    //     must not police, blocks-audit owns those.
    //   · `_`-prefixed keys are authoring scratch (`_card`, `_img`) and are conventionally ignored.
    //   · group children are checked against the child schema PLUS the layer schema, because a child
    //     is built by the same builder as a top-level layer (kit.buildLeaf).
    if (schema && schema.fields && schema.fields.layers && schema.fields.layers.item) {
      const LI = Object.keys(schema.fields.layers.item);
      const CI = Object.keys((schema.fields.layers.item.children || {}).item || {});
      const CHILD_TYPES = ((schema.fields.layers.item.children || {}).item || {}).type?.enum || [];
      const checkLayer = (L, where, isChild) => {
        if (!isObj(L)) return;
        // The schema defines the child type enum and the ENGINE enforces it at boot, but nothing
        // checked it here: a `rect` child validated clean and then hard-failed the render with
        // "not valid. Did you mean 'text'?". Green validate followed by a boot crash is a worse
        // experience than either outcome alone, because the author trusts the first one.
        if (isChild && L.type != null && CHILD_TYPES.length && !CHILD_TYPES.includes(L.type)) {
          errors.push(`${where} type "${L.type}" is not valid as a group child, one of: ${CHILD_TYPES.join(', ')}.`);
        }
        if (L.type !== 'block' && L.type !== 'comp') {
          const known = isChild ? [...CI, ...LI] : LI;
          for (const k of Object.keys(L)) {
            if (k.startsWith('_') || known.includes(k)) continue;
            const near = known.filter((n) => n.toLowerCase() === k.toLowerCase()
              || (k.length > 3 && (n.startsWith(k.slice(0, 3)) || k.startsWith(n.slice(0, 3)))));
            errors.push(`${where} has unknown prop "${k}". The engine will ignore it silently.${near.length ? ' Did you mean: ' + near.slice(0, 3).join(' / ') + '?' : ''}`);
          }
        }
        for (const key of ['children', 'layers']) {
          if (Array.isArray(L[key])) L[key].forEach((c, j) => checkLayer(c, `${where}.${key}[${j}]`, true));
        }
      };
      (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => checkLayer(L, `layer[${i}]`, false));
    }

    // `resample` reads a raster. A layer that owns one (image · paint · shader) is sampled live; every
    // other type is BAKED out of the DOM once at boot (core/resample.js) and sampled as a still. The
    // two that CANNOT go either way are refused by name: `raymarch` and `three` own their own WebGL
    // context, and `video` a bitmap. None of the three serialises into the offscreen raster, so they
    // would bake a hole. The engine throws at build time; catching it here names the file and index.
    const RASTER = ['image', 'paint', 'shader'];
    const UNSAMPLABLE = ['raymarch', 'three', 'globe', 'video'];
    (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
      if (!isObj(L) || !L.resample) return;
      if (UNSAMPLABLE.includes(L.type))
        errors.push(`layer[${i}] has \`resample\` on a "${L.type}" layer. Its pixels live in a canvas or a video bitmap, which is not part of the DOM, so neither the live path nor the offscreen bake can read them. The pass would render nothing. Raster layers sample live (${RASTER.join(' · ')}); every other type is baked from its built DOM.`);
      else if (L.type === 'image' && (!L.w || !L.h))
        errors.push(`layer[${i}] resample on an image needs explicit w and h (the GL buffer is sized at build time).`);
      // ken is a CSS transform on the <img>; the texture is the img's pixels, which the transform
      // never touches. Rendering both would silently drop the ken. Refuse instead.
      if (L.type === 'image' && L.ken)
        errors.push(`layer[${i}] combines \`ken\` with \`resample\`, ken is a CSS transform and does not reach the sampled pixels, so it would be silently ignored. Pick one.`);
    });
    (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
      if (isObj(L) && (L.type === 'block' || L.type === 'comp'))
        errors.push(`layer[${i}] is an un-expanded ${L.type} ("${L.block || L.ref}"), run \`make expand D=${path.relative(root, file)}\` and render the .expanded.json.`);
    });
    // named themes: the CLI can read the file, so completeness-check it here (boot re-checks).
    if (typeof data.theme === 'string') {
      const tp = path.join(root, 'themes', data.theme + '.json');
      if (!fs.existsSync(tp)) errors.push(`theme "${data.theme}" not found (themes/${data.theme}.json)`);
      else { try { errors.push(...themeErrors(readJSON(tp), { parseColor, contrastRatio }).map((m) => `theme "${data.theme}" incomplete: ${m}`)); }
        catch (e) { errors.push(`theme "${data.theme}" unreadable: ${e.message}`); } }
    }
    // AUDIO. The Go mixer resolves music/vo/sfx at bake time and silently DROPS anything it cannot
    // find or does not know (a typo'd cue, a missing VO). Silence is the worst failure, so name each
    // problem here. Cue names + numeric ranges are enforced declaratively by the schema (its cue enum
    // is held in sync with the live CUES registry by the drift guard above); this covers the one thing
    // the schema cannot: files that must exist on disk.
    const audioWarns = [];
    // HTML the scene names but does not carry: `src` fragments and captured components. Node-only,
    // because it opens files; the browser's boot-time validate simply never reaches this branch.
    const readRef = (p) => {
      for (const b of [null, path.dirname(file), root]) {
        const abs = b == null ? (path.isAbsolute(p) ? p : null) : path.join(b, p.replace(/^\/+/, ''));
        try { if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return fs.readFileSync(abs, 'utf8'); } catch { }
      }
      return null;
    };
    const htmlFileWarns = [];
    for (const f of externalHtmlErrors(data, readRef)) (f.level === 'error' ? errors : htmlFileWarns).push(f.msg);
    if (isObj(data.audio)) {
      const A = data.audio;
      const bases = [path.dirname(file), root];
      const resolves = (p) => !!p && bases.some((b) => fs.existsSync(path.isAbsolute(p) ? p : path.join(b, p)));
      // music: a bed name or path must resolve or the bed drops to silence. A warning, not a failure:
      //     a scene can name a bed baked on another machine. `music:"auto"` is resolved at authoring
      //     time (`make audio-bed`), NOT at render, so an unresolved "auto" reaching the mixer = silence.
      const m = A.music;
      if (m === 'auto') {
        audioWarns.push(`audio.music:"auto" is unresolved, run \`make audio-bed D=… WRITE=1\` to bake the profile's bed in, or the mixer falls back to SILENCE.`);
      } else if (typeof m === 'string') {
        // `auto` is the auto-SOUND-DESIGN flag (derives SFX cues); it has NOTHING to do with music
        // resolution. Skipping the music check when auto:true is how vawe-identity's bare "tense" bed
        // shipped SILENT for so long (docs/MISTAKES.md #132). The mixer now resolves a bare bed name
        // to assets/music/<name>.wav, so mirror EXACTLY that here, the two must agree.
        const ok = resolves(m) || (!/[\\/]/.test(m) && !path.extname(m) && fs.existsSync(path.join(root, 'assets/music', m + '.wav')));
        if (!ok) audioWarns.push(`audio.music "${m}" will not resolve to a file. The mixer falls back to SILENCE. Use "auto", a real .wav path, or a bed name that exists under assets/music/ (run make audio / make music-pack).`);
      }
      // A CUE IDENTIFIES ITS SOUND EXACTLY ONE WAY. Since a cue may now be a synthesised `voice`
      // instead of a baked `name`, `name` is no longer unconditionally required in the schema, and a
      // schema cannot say "one of these two". So the rule lives here: neither is a cue that plays
      // nothing, and both is a cue whose author disagrees with themselves about which sound it is.
      const VOICES = schema?.fields?.audio?.fields?.cues?.item?.voice?.enum || [];
      for (const [i, c] of (Array.isArray(A.cues) ? A.cues : []).entries()) {
        if (!isObj(c)) continue;
        const hasName = typeof c.name === 'string' && c.name.trim();
        const hasVoice = typeof c.voice === 'string' && c.voice.trim();
        if (!hasName && !hasVoice)
          errors.push(`audio.cues[${i}] names no sound: give it a baked \`name\`, or a synthesised \`voice\` (${VOICES.join(', ')}).`);
        if (hasName && hasVoice)
          errors.push(`audio.cues[${i}] sets BOTH \`name\` ("${c.name}") and \`voice\` ("${c.voice}"). One cue is one sound: drop whichever you did not mean.`);
        if (hasVoice && VOICES.length && !VOICES.includes(c.voice))
          errors.push(`audio.cues[${i}].voice "${c.voice}" is not a voice the synth knows: ${VOICES.join(', ')}.`);
        if (c.params != null && (!isObj(c.params) || Object.values(c.params).some((v) => typeof v !== 'number')))
          errors.push(`audio.cues[${i}].params must be an object of NUMBERS; the synth reads them as numbers and a string would be dropped silently.`);
      }

      // Sound bridges (J/L-cuts). The SPAN is resolved in the browser, where the junctions live, and
      // throws there. Nothing is duplicated here, because a second copy of that arithmetic would
      // drift. What is checked here is the half the browser cannot see: whether the texture is on
      // disk. The mixer fails the render on a missing one, so this is an error, not a warning.
      for (const [i, b] of (Array.isArray(A.bridges) ? A.bridges : []).entries()) {
        const s = b?.sound;
        if (typeof s !== 'string' || !s.trim()) { errors.push(`audio.bridges[${i}].sound must name a bed, a cue, or a .wav path.`); continue; }
        const bare = !/[\\/]/.test(s) && !path.extname(s);
        const ok = resolves(s) || (bare && ['music', 'sfx'].some((d) => fs.existsSync(path.join(root, 'assets', d, s + '.wav'))));
        if (!ok) errors.push(`audio.bridges[${i}].sound "${s}" is not on disk (looked as a path, assets/music/${s}.wav, assets/sfx/${s}.wav). The render fails rather than dropping the bridge. Run make audio / make music-pack.`);
        if (!/^[a-z]+@\d+$/.test(String(b?.at ?? ''))) errors.push(`audio.bridges[${i}].at must be "<kind>@<index>" (cut@1 · seam@0 · sting@2 · junction@3), got ${JSON.stringify(b?.at)}.`);
      }
      // (b2) BEAT GRID. `audio.beatSync` moves real cut times at boot, and boot THROWS when the grid
      //      it names will not load, so catching it here turns a failed render into a named error at
      //      author time. Same posture as the spectrum sidecar below: an error, never a warning.
      try {
        const gp = beatGridPath(data);
        if (gp && !resolves(gp)) errors.push(`audio.beatSync names a beat grid that is not on disk: ${gp}, run \`make beatmap MUSIC=<the track>.wav\` to write it. The render fails rather than leaving the film unmatched.`);
      } catch (e) { errors.push(e.message); }
      // (c) VO + sidecars named but absent → the mixer skips them without a word. Fail instead.
      for (const k of ['vo', 'voWords', 'spectrum']) {
        if (typeof A[k] === 'string' && !resolves(A[k]))
          errors.push(`audio.${k} "${A[k]}" not found (looked in ${path.relative(root, path.dirname(file)) || '.'}/ and repo root). The mixer would silently drop it.`);
      }
    }

    if (errors.length) {
      failed++;
      console.error(`✗ ${path.relative(root, file)} (${mod || 'no module'})`);
      for (const e of errors) console.error(`    • ${e}`);
    } else {
      console.log(`✓ ${path.relative(root, file)} (${mod})`);
    }
    // lint warnings (non-failing unless --strict): authoring smells the schema can't express
    const warns = [...lintData(data), ...audioWarns, ...htmlFileWarns];
    if (warns.length) {
      if (strict) failed++;
      for (const w of warns) console.error(`    ⚠ ${w}`);
    }
  }
  // Themes are checked directly, not only via a scene that happens to name one. A pack sitting in
  // themes/ half-written is a landmine for whoever authors the next video against that brand.
  let themeFailed = 0;
  for (const tf of themeTargets) {
    let errs;
    try { errs = themeErrors(readJSON(tf), { parseColor, contrastRatio }); } catch (e) { errs = [`unreadable: ${e.message}`]; }
    if (errs.length) { themeFailed++; console.error(`✗ ${path.relative(root, tf)}`); for (const e of errs) console.error(`    • ${e}`); }
  }
  if (themeTargets.length) console.log(`themes: ${themeTargets.length - themeFailed} ok, ${themeFailed} incomplete`);
  failed += themeFailed;
  console.log(`\nvalidate: ${targets.length - (failed - themeFailed)} ok, ${failed} ${strict ? 'failed (incl. lint --strict)' : 'failed'}`);
  process.exit(failed ? 1 : 0);
}

// A COUNTER MUST NEVER OVERSHOOT. Overshoot is a claim about mass: a thing with weight passes its target
// and settles back. A number has no mass. `core/layers/count.js` runs the value through whatever ease it
// is handed, so a spring makes the count fly PAST its true figure and fall back, and for a few frames the
// film paints a number that is not true. `docs/MOTION-CRAFT.md` used to recommend exactly that, twice,
// for "a value that should feel physical (number, bar, camera)".
//
// This is a CONTENT rule wearing a motion rule's clothes: "use real, accurate figures" is the one line in
// CLAUDE.md's content philosophy that has no exceptions, and a rendered 1,900 on the way to 1,822 breaks
// it. Refused rather than warned for that reason. No shipped scene trips it, so this closes a trap rather
// than reporting a defect (docs/MISTAKES.md #385).
export function countEaseErrors(cfg) {
  // Declared INSIDE, not as a module const. This file is also a CLI, so its main block runs during
  // module evaluation; a const appended below it is still in the temporal dead zone when the main calls
  // through here, and every scene died with a ReferenceError instead of being validated.
  const OVERSHOOT_EASE = /spring|bounce|back|elastic/i;
  const out = [];
  const walk = (o, where) => {
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${where}[${i}]`));
    if (!isObj(o)) return;
    if (o.type === 'count' && typeof o.ease === 'string' && OVERSHOOT_EASE.test(o.ease))
      out.push(`${where}.ease "${o.ease}" overshoots, and a COUNT must not: the number would fly past `
        + `${o.to ?? 'its value'} and fall back, painting a figure that is not true for a few frames. `
        + `Overshoot is a claim about mass and a number has none. Use easeOutExpo or easeOutQuart, whose `
        + `deceleration IS the weight. (Springs are right on a motion/camera track, just not on a value.)`);
    for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`);
  };
  walk(cfg.layers, 'layers');
  return out;
}
