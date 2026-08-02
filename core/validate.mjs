// core/validate.mjs — ENGINE CODE, not tooling: core/boot.js imports it, so the browser must be
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

import { themeErrors } from '../core/theme-contract.js';
import { ASPECTS } from '../core/safe.js';
import { boundaryMechanism } from '../core/transitions-lower.js';
import { GSAP_FX, EXIT_FX } from '../core/gsap-effects.js';
import { timeCssUsed } from '../core/sanitize-html.js';
import { bgPreset, bgOverErrors } from '../core/backgrounds.js';
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
// `x:"center"` puts the layer's LEFT EDGE on the centre line and `x:"right"` hangs it off the frame —
// silently, and only visibly wrong at some aspects. The audit has flagged this on the x axis for a
// while; the rule lives HERE now so it fails at `make validate` AND in boot (which imports this
// module) before a single frame renders, and so there is exactly one copy of it. Two copies is how
// the safe box and the canvas size each drifted into four (docs/MISTAKES.md #46).
//
// The Y axis is the same trap. It is enforced only where no honest estimate exists: a text layer's
// height is reliably ~size*1.2 and scenes have tuned around the current behaviour, so applying that
// estimate would MOVE shipped content. That is the deliberate "measure later" half — see ROADMAP.
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
// types whose extent the engine can estimate from `size` — excluded from the y rule for now
const TEXTISH = new Set(['text', 'count']);

export function layoutErrors(cfg) {
  const out = [];
  // `panWith` names another layer's `id`, and the engine throws on a bad reference at BUILD time. That
  // is loud but late: the author has already rendered. Same class as a bad relative `start`, and cheap
  // to answer here, so the gate answers it. A pan source with no motion is the other half — the layer
  // would silently stop panning, which is exactly the failure the feature exists to remove.
  const ids = new Set((cfg.layers || []).filter((L) => isObj(L) && L.id).map((L) => L.id));
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.panWith !== 'string') return;
    const label = `layers[${i}] (${L.type || 'text'})`;
    if (!ids.has(L.panWith)) out.push(`${label}: panWith "${L.panWith}" — no layer has that \`id\`. Known ids: ${[...ids].join(', ') || '(none — give the pan source an \`id\`)'}.`);
    else {
      const src = (cfg.layers || []).find((x) => isObj(x) && x.id === L.panWith);
      if (src === L) out.push(`${label}: panWith "${L.panWith}" is this layer itself.`);
      else if (typeof src.panWith === 'string') out.push(`${label}: panWith "${L.panWith}", which itself pans with "${src.panWith}". Point both at the ORIGIN so one track stays the source of truth.`);
      else if (!Array.isArray(src.motion) || !src.motion.length) out.push(`${label}: panWith "${L.panWith}", but that layer has no \`motion\` track to share.`);
    }
  });
  // `anchor` names another layer's `id`, and a name that matches nothing is skipped in SILENCE —
  // `resolveAnchors` does `const T = L.anchor && byId[L.anchor]; if (!T) continue;`, so a typo leaves the
  // layer at whatever x/y it happened to carry and the annotation quietly stops pointing at anything.
  // This is the identical shape `panWith` had, and `panWith` got a hard error for it while `anchor`,
  // three lines away in the same file, kept the silent skip (docs/MISTAKES.md #199).
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.anchor !== 'string' || ids.has(L.anchor)) return;
    out.push(`layers[${i}] (${L.type || 'text'}): anchor "${L.anchor}" — no layer has that \`id\`, so the anchoring is skipped and this layer stays wherever its own x/y put it. Known ids: ${[...ids].join(', ') || '(none — give the target an `id`)'}.`);
  });

  // A motion track that REVERSES at speed is a snap, and no easing hides it: the layer is travelling one
  // way and the next frame throws it back the other. Measured on the RESOLVED track (pans merged in) by
  // SAMPLING AT 30fps, because neither of the cheaper tests works. Key-to-key average velocity calls an
  // eased arc a reversal — `rec2-gates`' dot swings 777px out and 525px back with easeInOutCubic on both
  // sides, so its velocity passes through zero at the turn and it is perfectly smooth. Peak acceleration
  // alone is no better: `creed-launch` hits 134 px/frame^2 accelerating in a straight line, harder than
  // the defect this exists to catch. Only direction-change AND magnitude together separate them.
  //
  // The defect: `cadence`'s button rode a shared pan to -512 while its own next key said -318, so it
  // jumped 194px right in two frames — 126 px/frame^2 against the travel — and every gate stayed green
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
      if (v1[0] * v2[0] + v1[1] * v2[1] >= 0) continue;                  // same direction — accelerating, not snapping
      const accel = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]);
      if (accel < REV_ACCEL) continue;                                   // a settle reverses gently; let it
      const at = (t0 + n / FPS).toFixed(2);
      const label = `layers[${i}] (${L.type || 'text'}${L.id ? ` #${L.id}` : ''})`;
      out.push(`${label}: motion reverses at t=${at}s — moving (${v1[0].toFixed(0)}, ${v1[1].toFixed(0)})px/frame, then (${v2[0].toFixed(0)}, ${v2[1].toFixed(0)})px/frame the other way (${accel.toFixed(0)} px/frame\u00b2). That is a snap, not a move.${typeof L.panWith === 'string' ? ` This layer pans with "${L.panWith}", which has already carried it somewhere by then — your own keys continue from THERE, not from the layer's origin. Peel off before the pan passes your destination.` : ' A settle should reverse gently; check the key before it.'}`);
      break;                                                             // one report per layer; the first is the cause
    }
  });

  // `becomes` is a claim about a BOUNDARY: this form ends and that one takes it over. If the incoming
  // layer does not start where the outgoing one ends, the handover happens over a gap or an overlap and
  // the match silently stops reading — which is the whole failure the feature exists to remove, so it is
  // checked rather than trusted.
  (cfg.layers || []).forEach((A, i) => {
    if (!isObj(A) || typeof A.becomes !== 'string') return;
    const label = `layers[${i}] (${A.type || 'text'}${A.id ? ` #${A.id}` : ''})`;
    if (!ids.has(A.becomes)) {
      out.push(`${label}: becomes "${A.becomes}" — no layer has that \`id\`. Known ids: ${[...ids].join(', ') || '(none)'}.`);
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
    const label0 = `layers[${i}] (${L0.type || 'text'}${typeof L0.text === 'string' ? ` "${L0.text.replace(/<[^>]+>/g, '').slice(0, 20)}"` : ''})`;
    // `aspects` is checked as the MERGED layer, once per declared aspect. An override that drops `w` while
    // keeping a centring keyword is the same trap, visible only at that one canvas — which is the
    // failure mode per-aspect overrides exist to prevent, so it cannot be the failure mode they add.
    const variants = [[L0, label0]];
    if (isObj(L0.aspects)) for (const [k, over] of Object.entries(L0.aspects)) {
      if (!ASPECTS[k]) { out.push(`${label0}: aspects."${k}" is not a known aspect — one of ${Object.keys(ASPECTS).join(', ')}`); continue; }
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
    // Without `anchor` they are dead config that reads as an intended offset and silently does nothing —
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
  errors.push(...layoutErrors(data || {})); // a centring keyword must have something to centre
  errors.push(...seamErrors(data || {}));   // seam windows must land inside the video
  errors.push(...transitionErrors(data || {})); // unified transitions must route to a real mechanism
  errors.push(...fxErrors(data || {}));     // named GSAP fx/fxOut must be real effects; no fxOut+out clash
  errors.push(...bgErrors(data || {}));     // each bg window names one backdrop, and can be rendered purely
  errors.push(...htmlLayerErrors(data || {})); // hand-authored layers hit the same dead-CSS trap
  return errors;
}

// The `html` LAYER has always had the same trap as the `html` background: CSS transition/animation is
// disabled engine-wide, so a hand-authored fragment that animates in the browser renders as a still and
// says nothing about it. Same check, same message, both places.
export function htmlLayerErrors(cfg) {
  const out = [];
  (Array.isArray(cfg.layers) ? cfg.layers : []).forEach((L, i) => {
    if (!isObj(L) || L.type !== 'html' || L.html == null) return;
    const timeCss = timeCssUsed(L.html);
    if (timeCss) out.push(`layer[${i}] (html) uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Animate the layer with the engine's own motion (\`anim\`/\`motion\`/\`vars\`), or drive your CSS from a \`vars\` custom property.`);
  });
  return out;
}

// BACKGROUND WINDOWS. Two rules the schema walk cannot express, both about the hand-authored (`html`)
// backdrop introduced alongside the canvas presets.
export function bgErrors(cfg) {
  const out = [];
  (Array.isArray(cfg.bg) ? cfg.bg : []).forEach((b, i) => {
    if (!isObj(b)) return;
    const at = `bg[${i}]`;
    // ONE source per window. `html` paints in the DOM and `preset` paints on canvas; a window naming
    // both looks like a layered backdrop and is not one — the html wins and the preset is silently
    // dropped, which is the silent-substitution failure this codebase keeps paying for.
    const sources = ['html', 'preset', 'use'].filter((k) => b[k] != null);
    if (sources.length > 1)
      out.push(`${at} declares ${sources.map((s) => `\`${s}\``).join(' and ')} — a window has ONE backdrop. \`html\` paints in the DOM and \`preset\` paints on canvas; they do not layer. Split them into two windows (with \`from\`/\`to\`) if you want both in one video.`);
    if (b.html == null) {
      if (b.tone != null) out.push(`${at} sets \`tone\` but has no \`html\` — tone declares the lightness of a HAND-AUTHORED backdrop so the engine knows which text ink to default to. A preset's lightness is already known.`);
      // `opts` tunes the fx a preset is made of, so the vocabulary is PER PRESET: `liquid` takes
      // scale/speed/warp/edge0…, `paperDots` takes spacing/period/drift…. Anything else used to be
      // accepted by the schema, dropped by applyBgOver and never read — correct-looking JSON, unchanged
      // render (docs/MISTAKES.md #157). Say which keys this preset actually has.
      // A `use:"theme"` window names no preset here (it comes from themes/<name>.json), so it cannot be
      // resolved without the theme; applyBgOver throws on it at build time instead.
      if (isObj(b.opts) && b.use == null)
        out.push(...bgOverErrors(bgPreset(b.preset || 'paper', b.value), b.opts, at));
      return;
    }
    if (b.opts != null)
      out.push(`${at} sets \`opts\` on a hand-authored (\`html\`) backdrop — \`opts\` tunes the canvas fx a PRESET is built from, and an html window paints no fx, so nothing would read it. Style the fragment itself.`);
    const timeCss = timeCssUsed(b.html);
    if (timeCss)
      out.push(`${at} uses CSS \`${timeCss}\`, which renders as a DEAD STILL: core/tokens.css disables transition and animation globally because both run on wall-clock, and a frame is seeked, not played. Drive motion from \`var(--t)\` (seconds) or \`var(--p)\` (0→1 across this window) instead, e.g. \`transform: rotate(calc(var(--t) * 12deg))\`. Both are written every frame.`);
    if (b.tone == null)
      out.push(`${at} is hand-authored but declares no \`tone\` ("light" or "dark") — the engine cannot read the lightness out of your CSS, so a layer with no explicit \`color\` falls back to the theme's ink and may land white-on-white. Say which it is.`);
  });
  return out;
}

// NAMED GSAP EFFECTS: `fx` (entrance/loop/text) and `fxOut` (exit) reference stored effects by name.
// scene.html only console.warns on a typo (a warn the render swallows), so an unknown name shipped an
// unanimated layer silently. Catch it here, loudly, with a "did you mean" pointer. Also: `fxOut` and a
// motion `out` both drive the exit transform — a layer may declare only one, else they fight.
export function fxErrors(cfg) {
  const out = [];
  const layers = Array.isArray(cfg.layers) ? cfg.layers : [];
  const nameOf = (item) => (typeof item === 'string' ? item : (isObj(item) ? item.name : undefined));
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    if (L.fx != null) {
      for (const item of (Array.isArray(L.fx) ? L.fx : [L.fx])) {
        const nm = nameOf(item);
        if (nm == null) { out.push(`layers[${i}].fx entry needs a name (string or {name})`); continue; }
        if (!GSAP_FX.includes(nm)) out.push(`layers[${i}].fx "${nm}" is not a known effect.${nearest(nm, GSAP_FX)}`);
      }
    }
    if (L.fxOut != null) {
      const nm = nameOf(L.fxOut);
      if (nm == null) out.push(`layers[${i}].fxOut needs a name (string or {name})`);
      else if (!EXIT_FX.includes(nm)) out.push(`layers[${i}].fxOut "${nm}" is not a known exit.${nearest(nm, EXIT_FX)}`);
      if (L.out != null) out.push(`layers[${i}] declares both "out" and "fxOut" — they both own the exit. Keep one.`);
    }
    // splitText (GSAP line reveal) re-wraps the layer AFTER the engine's own `split` already did — the two
    // splitters fight. splitText is line-level only; char/word stay with `split`.
    if (L.splitText != null && L.split != null) out.push(`layers[${i}] declares both "split" and "splitText" — they both re-wrap the text. Use "split" for char/word, "splitText" for masked lines.`);
  });
  return out;
}

// SEAM D range check: fx-name and dur bounds are enforced by the schema (enum + min); what the schema
// cannot express is that the window [t, t+dur] must fall INSIDE the video, else the outgoing/incoming
// beats are baked from clamped edge frames and the transition blends the wrong thing silently.
export function seamErrors(cfg) {
  const out = [];
  const seams = Array.isArray(cfg.seams) ? cfg.seams : [];
  if (!seams.length) return out;
  // effective duration: explicit, else the last layer's end (+0.4 tail) — mirrors scene.html.
  let dur = typeof cfg.duration === 'number' ? cfg.duration : 0;
  if (!dur) for (const L of cfg.layers || []) { if (isObj(L) && typeof L.start !== 'string') dur = Math.max(dur, (L.start ?? 0) + (L.duration ?? 2)); }
  dur = +(dur + (typeof cfg.duration === 'number' ? 0 : 0.4)).toFixed(2);
  seams.forEach((s, i) => {
    if (!isObj(s)) return;
    const t = +s.t, d = +(s.dur ?? 0.5);
    if (!isFinite(t)) return; // schema reports the missing/NaN t
    if (t < 0) out.push(`seams[${i}] t must be ≥ 0 (got ${s.t})`);
    if (dur && t + d > dur + 1e-6) out.push(`seams[${i}] window [${t}, ${(t + d).toFixed(2)}] runs past the video (${dur}s) — move it earlier or shorten dur`);
  });
  return out;
}

// UNIFIED TRANSITIONS: the fx must route to a real boundary mechanism (cut/seam/sting). The schema
// checks shape (at/dur/timing); only the router knows whether a name is a boundary transition at all,
// so a typo or a layer-only name (e.g. `pop`) used as a boundary is caught here, loudly, not silently.
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

// Em-dashes are banned in all rendered text (brand voice rule). Checks every string VALUE in the
// data (schema labels are internal and exempt). Use a comma, period, or · instead.
function noEmdash(v, path, errors) {
  if (typeof v === 'string') { if (v.includes('\u2014')) errors.push(`${path || 'data'} contains an em-dash (—): "${v.slice(0, 48)}…" — use , . or ·`); }
  else if (Array.isArray(v)) v.forEach((x, i) => noEmdash(x, `${path}[${i}]`, errors));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) { if (k === 'module' || k === 'theme') continue; noEmdash(x, path ? `${path}.${k}` : k, errors); }
}

// lintData(data) → warnings[]: authoring smells the schema can't express. Non-failing (CLI prints ⚠;
// boot never calls this). Each rule below maps to a real bug that shipped this session and slipped
// every existing gate. Pure. Scene layers only.
export function lintData(data) {
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
      warns.push(`layers[${i}]${A.id ? ` #${A.id}` : ''}: becomes "${B.id}", and the handover takes ${dur}s — so ${lost.length} of "${B.id}"'s own motion key(s) at t≤${dur} (${lost.map((k) => `t=${k.t ?? 0}`).join(', ')}) are DROPPED and replaced by the computed match. Move them past ${dur}s, or shorten \`becomesDur\`.`);
    }
  }

  // A key states what changes and says nothing about the rest, and `motionAt`/`cameraAt` read that
  // silence as IDENTITY, not as "unchanged" (core/sequence.js). That contract is deliberate and scenes
  // depend on it — a layer whose only `opacity` key sits at the end fades over the last segment precisely
  // because the keys before it read as opacity 1. But it means a track that declares a property, moves it
  // somewhere, and then stops mentioning it SNAPS it home, and nothing about the JSON looks wrong.
  //
  // So it is warned about rather than changed. Changing the reader was tried and measured: per-property
  // interpolation altered 19 scenes and made one film's button invisible throughout (#195). Splitting the
  // semantics so camera and layer tracks behave differently would be a worse trap than either. One
  // contract, stated out loud when it is about to bite. Only when the reset actually MOVES something —
  // a property dropped while it already sat at identity changes nothing and is not worth a word.
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
            warns.push(`${label}: \`${pr}\` is ${prior[pr]} at t=${prior.t}, and the key at t=${keys[i].t} does not mention it — a key that omits a property RESETS it to ${IDENT[pr]}, it does not hold it. Restate \`${pr}\` on that key (and every later one) unless you mean it to snap back.`);
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

  // A prop that is read only INSIDE a conditional on another prop does nothing when that other prop is
  // absent — and does it silently, which is the failure class this repo hates most. Three of them live
  // in the anchor/align code, and CLAUDE.md already describes two as things that "render silently"
  // rather than fixing them (docs/MISTAKES.md #199). `at` is skipped for blocks, where it is an
  // unrelated block param (`tapRipple` uses `at: 2.1` as a time) — the prop is overloaded, and a check
  // that did not know that would have fired on innocent scenes.
  for (const [i, L] of (data.layers || []).entries()) {
    if (!isObj(L)) continue;
    const label = `layers[${i}]${L.id ? ` #${L.id}` : ''}`;
    if (typeof L.at === 'string' && !L.anchor && L.type !== 'block') {
      warns.push(`${label}: \`at: "${L.at}"\` positions a layer against its \`anchor\`, and there is no \`anchor\` — so it is IGNORED and the layer sits at its own x/y. Add \`anchor: "<id>"\`, or drop \`at\`.`);
    }
    if (typeof L.at === 'string' && L.anchor && L.at.endsWith('center') && L.w == null) {
      warns.push(`${label}: \`at: "${L.at}"\` centres this layer on its anchor by subtracting half its OWN width, and it has no \`w\` — so it silently falls back to a plain left offset. Give it \`w\`.`);
    }
    if ((L.align === 'center' || L.align === 'right') && L.w == null && L.type !== 'block') {
      warns.push(`${label}: \`align: "${L.align}"\` aligns text inside the layer's box, and without \`w\` that box shrink-wraps the text — so the alignment does nothing. Give it \`w\`, or drop \`align\`.`);
    }
  }

  // `panWith` copies a track as DELTAS, so the x/y an author writes is where the layer STARTS and the
  // pan carries it somewhere else. That total is computable and appears nowhere: not in the layer, not
  // in the source, not in any error. Two separate bugs came from guessing it — the button snapping
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
        + `${bx != null ? ` (${bx}${by != null ? `, ${by}` : ''})` : ''} — it comes to rest ${dx ? `${dx > 0 ? '+' : ''}${dx}px across` : ''}`
        + `${dx && dy ? ' and ' : ''}${dy ? `${dy > 0 ? '+' : ''}${dy}px down` : ''}`
        + `${bx != null ? `, at (${bx + dx}${by != null ? `, ${by + dy}` : ''})` : ''}. Place it by where it STARTS, not where you want it to land.`);
    }
  }
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  const name = (L, i) => `layer[${i}] (${L.type || 'text'}${typeof L.text === 'string' ? ` "${L.text.replace(/<[^>]+>/g, '').slice(0, 24)}"` : ''})`;

  // (1) MISSING WINDOW — a layer with no `duration` renders for the ENTIRE video (engine default). Almost
  //     always a slip (the "+" gutter that leaked for 53s). Full-bleed backdrops opt out with track:0.
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    if (L.duration == null && L.track !== 0) warns.push(`${name(L, i)} has no "duration" — renders for the whole video. Add start+duration (or track:0 for an intentional backdrop).`);
  });

  // (2) TYPING + MARKUP — `typing` reveals characters LITERALLY, so <b>/<em> show as visible tags
  //     ("Block <b>7 to 11am</b>" bug). Drop the tags on typed text.
  layers.forEach((L, i) => {
    if (isObj(L) && L.typing && typeof L.text === 'string' && /<(b|em)\b/i.test(L.text)) warns.push(`${name(L, i)} uses "typing" with <b>/<em> markup — typing renders tags literally.`);
  });

  // (2b) countStart is LOCAL to the layer's own `start` (count.js: interpolate(t - start, [cs, cs+cd])),
  //      NOT an absolute scene time. Setting it to the wall-clock second the count should fire is the
  //      classic footgun: the animation window falls outside the layer's visible span, so the number
  //      freezes on its `from` value and the render is silently wrong (docs/MISTAKES.md #147). If
  //      countStart alone already meets/exceeds the layer's duration, the count can never animate.
  layers.forEach((L, i) => {
    if (!isObj(L) || L.type !== 'count') return;
    const dur = L.duration ?? 2, cs = L.countStart ?? 0, cd = L.countDur ?? 1.2;
    if (cs >= dur) warns.push(`${name(L, i)} has countStart ${cs} ≥ its duration ${dur}. countStart is LOCAL to the layer's start (t - start), not an absolute scene time — the count never animates and freezes at "from". Use a small local offset (e.g. countStart 0.2) and set the layer's own start to when it appears.`);
    else if (cs + cd > dur + 0.05) warns.push(`${name(L, i)} count window (countStart ${cs} + countDur ${cd} = ${(cs + cd).toFixed(1)}) runs past its duration ${dur} — the count-up gets cut off before it lands. Shorten countDur or lengthen duration.`);
  });

  // (3) SCENE COLLISION — two CONTENT layers overlapping in BOTH space and time, not in a
  //     containment/group/anchor relationship = one scene bleeding into the next (the Preferences↔agents
  //     overlap). Pure geometry; needs an explicit w to bound a box (numeric starts only).
  const CONTENT = new Set(['text', 'count', 'doc', 'image', 'group', 'board', 'html']);
  const box = (L) => {
    if (typeof L.start === 'string' || L.x == null || L.y == null || L.w == null) return null;
    const h = L.h != null ? L.h : (L.size ?? 40) * 1.3;
    const s = L.start ?? 0;
    return { x0: L.x, y0: L.y, x1: L.x + L.w, y1: L.y + h, s, e: s + (L.duration ?? 2) };
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
      if (frac >= 0.3 && frac <= 0.95) warns.push(`${name(A.L, A.i)} and ${name(B.L, B.i)} overlap ~${Math.round(frac * 100)}% in space and ${(t1 - t0).toFixed(1)}s in time (t=${t0.toFixed(1)}-${t1.toFixed(1)}) — a scene may be colliding with the next.`);
    }
  }
  return warns;
}

function walk(fields, obj, path, errors) {
  for (const [key, spec] of Object.entries(fields)) {
    if (!isObj(spec)) continue;
    const val = obj?.[key];
    const at = `${path}${key}`;
    if (val == null) {
      if (spec.required) errors.push(`${at} is required${spec.hint ? ` — ${spec.hint}` : ''}`);
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
      if (spec.minItems != null && val.length < spec.minItems) errors.push(`${at} needs ≥ ${spec.minItems} item(s) (got ${val.length})${spec.hint ? ` — ${spec.hint}` : ''}`);
      if (spec.maxItems != null && val.length > spec.maxItems) errors.push(`${at} allows ≤ ${spec.maxItems} item(s) (got ${val.length})`);
      // A block/comp layer carries the BLOCK's props (a pointer's `to:{x,y}`, a kpiRow's `items:[…]`),
      // NOT the base layer schema — blocks-audit owns those. The unknown-prop pass already exempts
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
// inline object) — there is no default look (core/theme-contract.js). Inline objects are
// completeness-checked here; named themes are completeness-checked by the CLI below (it can read
// the file) and again at boot by applyTheme.
export function validateTheme(spec) {
  const errors = [];
  if (spec == null) return ['data.theme is required (a theme name or an inline theme object) — no default look exists'];
  if (typeof spec === 'string') return errors;
  if (!isObj(spec)) return [`theme must be a string name or an object (got ${typeOf(spec)})`];
  errors.push(...themeErrors(spec).map((m) => `theme incomplete: ${m}`));
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
  // No args used to mean "formats/*/sample.json" — with one format, that is ONE file, while 60
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
  // valid names); CUES is the source of truth. If they drift, the schema lies — fail loudly to resync.
  try {
    const ss = readJSON(path.join(root, 'formats/scene/schema.json'));
    const el = ss?.fields?.audio?.fields?.cues?.item?.name?.enum || [];
    // Superset guard: every live CUE must be documented. The enum MAY also carry baked ALIASES
    // (whoosh/reveal/click/pop, scripts/media/audio-bake.mjs) that are not CUES keys, so only a CUE
    // the enum OMITS is drift — extra alias names are legal.
    const missing = CUE_NAMES.filter((n) => !el.includes(n));
    if (el.length && missing.length) { console.error(`✗ schema drift: formats/scene/schema.json audio.cues enum omits live CUES (${missing.join(', ')}) — add them.`); failed++; }
  } catch { }

  for (const file of targets) {
    let data, schema;
    try { data = readJSON(file); } catch (e) { console.error(`✗ ${file}: unreadable JSON — ${e.message}`); failed++; continue; }
    const mod = data.module;
    const schemaPath = mod && path.join(root, 'formats', mod, 'schema.json');
    try { schema = schemaPath && fs.existsSync(schemaPath) ? readJSON(schemaPath) : null; } catch (e) { schema = null; }
    const errors = validateAll(schema, data);
    // build-time sugar must be expanded before render — the engine's layer registry has no
    // `block`/`comp` type, so a leftover one renders as NOTHING. Fail loud → run `make expand`.
    // UNKNOWN PROPS. The engine reads the props it knows and ignores the rest in silence, so
    // `fill` instead of `bg`, or `colour` instead of `color`, renders a layer that is quietly wrong
    // and gives the author nothing to search for. Two shipped scenes set `opacity` on a layer for
    // months with no effect whatsoever. Silence is the worst failure (docs/MISTAKES.md).
    //
    // Scoped deliberately:
    //   · `block`/`comp` layers carry the BLOCK's props, which this schema does not describe and
    //     must not police — blocks-audit owns those.
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
          errors.push(`${where} type "${L.type}" is not valid as a group child — one of: ${CHILD_TYPES.join(', ')}.`);
        }
        if (L.type !== 'block' && L.type !== 'comp') {
          const known = isChild ? [...CI, ...LI] : LI;
          for (const k of Object.keys(L)) {
            if (k.startsWith('_') || known.includes(k)) continue;
            const near = known.filter((n) => n.toLowerCase() === k.toLowerCase()
              || (k.length > 3 && (n.startsWith(k.slice(0, 3)) || k.startsWith(n.slice(0, 3)))));
            errors.push(`${where} has unknown prop "${k}" — the engine will ignore it silently.${near.length ? ' Did you mean: ' + near.slice(0, 3).join(' / ') + '?' : ''}`);
          }
        }
        for (const key of ['children', 'layers']) {
          if (Array.isArray(L[key])) L[key].forEach((c, j) => checkLayer(c, `${where}.${key}[${j}]`, true));
        }
      };
      (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => checkLayer(L, `layer[${i}]`, false));
    }

    // `resample` binds the layer's OWN raster as a GL texture, so it only means anything on a layer
    // that has one. The engine throws at build time; catching it here names the file and index.
    const RASTER = ['image', 'paint', 'shader'];
    (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
      if (!isObj(L) || !L.resample) return;
      if (!RASTER.includes(L.type))
        errors.push(`layer[${i}] has \`resample\` on a "${L.type}" layer, which owns no pixels to sample — raster layers only (${RASTER.join(' · ')}).`);
      else if (L.type === 'image' && (!L.w || !L.h))
        errors.push(`layer[${i}] resample on an image needs explicit w and h (the GL buffer is sized at build time).`);
      // ken is a CSS transform on the <img>; the texture is the img's pixels, which the transform
      // never touches. Rendering both would silently drop the ken. Refuse instead.
      if (L.type === 'image' && L.ken)
        errors.push(`layer[${i}] combines \`ken\` with \`resample\` — ken is a CSS transform and does not reach the sampled pixels, so it would be silently ignored. Pick one.`);
    });
    (Array.isArray(data.layers) ? data.layers : []).forEach((L, i) => {
      if (isObj(L) && (L.type === 'block' || L.type === 'comp'))
        errors.push(`layer[${i}] is an un-expanded ${L.type} ("${L.block || L.ref}") — run \`make expand D=${path.relative(root, file)}\` and render the .expanded.json.`);
    });
    // named themes: the CLI can read the file, so completeness-check it here (boot re-checks).
    if (typeof data.theme === 'string') {
      const tp = path.join(root, 'themes', data.theme + '.json');
      if (!fs.existsSync(tp)) errors.push(`theme "${data.theme}" not found (themes/${data.theme}.json)`);
      else { try { errors.push(...themeErrors(readJSON(tp)).map((m) => `theme "${data.theme}" incomplete: ${m}`)); }
        catch (e) { errors.push(`theme "${data.theme}" unreadable: ${e.message}`); } }
    }
    // AUDIO. The Go mixer resolves music/vo/sfx at bake time and silently DROPS anything it cannot
    // find or does not know (a typo'd cue, a missing VO). Silence is the worst failure, so name each
    // problem here. Cue names + numeric ranges are enforced declaratively by the schema (its cue enum
    // is held in sync with the live CUES registry by the drift guard above); this covers the one thing
    // the schema cannot: files that must exist on disk.
    const audioWarns = [];
    if (isObj(data.audio)) {
      const A = data.audio;
      const bases = [path.dirname(file), root];
      const resolves = (p) => !!p && bases.some((b) => fs.existsSync(path.isAbsolute(p) ? p : path.join(b, p)));
      // music — a bed name or path must resolve or the bed drops to silence. A warning, not a failure:
      //     a scene can name a bed baked on another machine. `music:"auto"` is resolved at authoring
      //     time (`make audio-bed`), NOT at render, so an unresolved "auto" reaching the mixer = silence.
      const m = A.music;
      if (m === 'auto') {
        audioWarns.push(`audio.music:"auto" is unresolved — run \`make audio-bed D=… WRITE=1\` to bake the profile's bed in, or the mixer falls back to SILENCE.`);
      } else if (typeof m === 'string') {
        // `auto` is the auto-SOUND-DESIGN flag (derives SFX cues); it has NOTHING to do with music
        // resolution. Skipping the music check when auto:true is how vawe-identity's bare "tense" bed
        // shipped SILENT for so long (docs/MISTAKES.md #132). The mixer now resolves a bare bed name
        // to assets/music/<name>.wav, so mirror EXACTLY that here — the two must agree.
        const ok = resolves(m) || (!/[\\/]/.test(m) && !path.extname(m) && fs.existsSync(path.join(root, 'assets/music', m + '.wav')));
        if (!ok) audioWarns.push(`audio.music "${m}" will not resolve to a file — the mixer falls back to SILENCE. Use "auto", a real .wav path, or a bed name that exists under assets/music/ (run make audio / make music-pack).`);
      }
      // (c) VO + sidecars named but absent → the mixer skips them without a word. Fail instead.
      for (const k of ['vo', 'voWords', 'spectrum']) {
        if (typeof A[k] === 'string' && !resolves(A[k]))
          errors.push(`audio.${k} "${A[k]}" not found (looked in ${path.relative(root, path.dirname(file)) || '.'}/ and repo root) — the mixer would silently drop it.`);
      }
    }

    if (errors.length) {
      failed++;
      console.error(`✗ ${path.relative(root, file)} (${mod || 'no module'})`);
      for (const e of errors) console.error(`    • ${e}`);
    } else {
      console.log(`✓ ${path.relative(root, file)} (${mod})`);
    }
    // lint warnings (non-failing unless --strict) — authoring smells the schema can't express
    const warns = [...lintData(data), ...audioWarns];
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
    try { errs = themeErrors(readJSON(tf)); } catch (e) { errs = [`unreadable: ${e.message}`]; }
    if (errs.length) { themeFailed++; console.error(`✗ ${path.relative(root, tf)}`); for (const e of errs) console.error(`    • ${e}`); }
  }
  if (themeTargets.length) console.log(`themes: ${themeTargets.length - themeFailed} ok, ${themeFailed} incomplete`);
  failed += themeFailed;
  console.log(`\nvalidate: ${targets.length - (failed - themeFailed)} ok, ${failed} ${strict ? 'failed (incl. lint --strict)' : 'failed'}`);
  process.exit(failed ? 1 : 0);
}
