// ---------- LAYOUT: a centring keyword needs something to centre ----------
// resolveCoords places a box of size `size` on a canvas line. With `w` unset that size is 0, so
// `x:"center"` puts the layer's LEFT EDGE on the centre line and `x:"right"` hangs it off the frame,
// silently, and only visibly wrong at some aspects. The audit has flagged this on the x axis for a
// while; the rule lives HERE now so it fails at `make validate` AND in boot (which imports this
// module) before a single frame renders, and so there is exactly one copy of it. Two copies is how
// the safe box and the canvas size each drifted into four (engine-doctrine/MISTAKES.md #46).
//
// The Y axis is the same trap. It is enforced only where no honest estimate exists: a text layer's
// height is reliably ~size*1.2 and scenes have tuned around the current behaviour, so applying that
// estimate would MOVE shipped content. That is the deliberate "measure later" half, see ROADMAP.
// PIN_AXIS used to be its own copy of the same 17-name table core/engine/boot.js resolves and
// films/scene/schema.json enumerates. It is now core/layout/safe.js PLACEMENT, the one table all
// three read; this file keeps the short local name only because `check()` below is written against it.
import { isObj } from './util.mjs';
import { onScreenText } from '../type/on-screen-text.js';
import { ASPECTS, PLACEMENT, ANCHOR_POINTS } from '../layout/safe.js';
import { motionAt } from '../timeline/sequence.js';
import { mergePan } from '../timeline/pan-resolve.mjs';

const PIN_AXIS = PLACEMENT;
// keywords that SUBTRACT the layer's size, and are therefore meaningless without one
const NEEDS_SIZE = new Set(['center', 'optical', 'third1', 'third2', 'right', 'bottom']);
// types whose extent the engine can estimate from `size`, excluded from the y rule for now
const TEXTISH = new Set(['text', 'count']);

function panWithWarnings(cfg, ids, out) {
  // `panWith` names another layer's `id`, and the engine throws on a bad reference at BUILD time. That
  // is loud but late: the author has already rendered. Same class as a bad relative `start`, and cheap
  // to answer here, so the gate answers it. A pan source with no motion is the other half, the layer
  // would silently stop panning, which is exactly the failure the feature exists to remove.
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.panWith !== 'string') return;
    const label = `layers[${i}] (${L.type || 'text'})`;
    if (!ids.has(L.panWith)) out.push(`${label}: panWith "${L.panWith}". No layer has that \`id\`. Known ids: ${[...ids].join(', ') || '(none, give the pan source an `id`)'}.`);
    else {
      const src = (cfg.layers || []).find((x) => isObj(x) && x.id === L.panWith);
      if (src === L) out.push(`${label}: panWith "${L.panWith}" is this layer itself.`);
      else if (typeof src.panWith === 'string') out.push(`${label}: panWith "${L.panWith}", which itself pans with "${src.panWith}". Point both at the ORIGIN so one track stays the source of truth.`);
      else if (!Array.isArray(src.motion) || !src.motion.length) out.push(`${label}: panWith "${L.panWith}", but that layer has no \`motion\` track to share.`);
    }
  });
}

function anchorRefWarnings(cfg, ids, out) {
  // `anchor` names another layer's `id`, and a name that matches nothing is skipped in SILENCE,
  // `resolveAnchors` does `const T = L.anchor && byId[L.anchor]; if (!T) continue;`, so a typo leaves the
  // layer at whatever x/y it happened to carry and the annotation quietly stops pointing at anything.
  // This is the identical shape `panWith` had, and `panWith` got a hard error for it while `anchor`,
  // three lines away in the same file, kept the silent skip (engine-doctrine/MISTAKES.md #199).
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || typeof L.anchor !== 'string' || ids.has(L.anchor)) return;
    out.push(`layers[${i}] (${L.type || 'text'}): anchor "${L.anchor}". No layer has that \`id\`, so the anchoring is skipped and this layer stays wherever its own x/y put it. Known ids: ${[...ids].join(', ') || '(none, give the target an `id`)'}.`);
  });
}

function gsapPropWarnings(cfg, out) {
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
}

function motionBoxWarnings(cfg, out) {
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
}

const FPS = 30, REV_ACCEL = 60;

// The resolved motion track for one layer, pan merged in, or null when there is nothing to sample.
// Kept apart from the sampler below so "which track do we measure" and "does it reverse" are two
// separate jobs instead of one function that both resolves data and reasons about it.
function resolvedTrack(cfg, L) {
  if (!isObj(L)) return null;
  let track = Array.isArray(L.motion) ? L.motion : null;
  if (typeof L.panWith === 'string') {
    const src = (cfg.layers || []).find((x) => isObj(x) && x.id === L.panWith);
    if (!isObj(src) || typeof src.panWith === 'string' || !Array.isArray(src.motion) || !src.motion.length) return null;
    try { track = mergePan(L, src); } catch { return null; }
  }
  if (!track || track.length < 3 || !track.every((k) => isObj(k))) return null;
  return track;
}

// Sample `track` at 30fps and return the [t, v1, v2, accel] of the first velocity reversal, or null.
function firstReversal(track) {
  const ts = track.map((k) => (typeof k.t === 'number' ? k.t : 0));
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (!(t1 - t0 > 2 / FPS)) return null;
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
    return { at: t0 + n / FPS, v1, v2, accel };
  }
  return null;
}

// The message for the first reversal found in a layer's resolved track, or null.
function motionSnapWarning(cfg, L, i) {
  const track = resolvedTrack(cfg, L);
  if (!track) return null;
  const rev = firstReversal(track);
  if (!rev) return null;
  const { at, v1, v2, accel } = rev;
  const label = `layers[${i}] (${L.type || 'text'}${L.id ? ` #${L.id}` : ''})`;
  return `${label}: motion reverses at t=${at.toFixed(2)}s, moving (${v1[0].toFixed(0)}, ${v1[1].toFixed(0)})px/frame, then (${v2[0].toFixed(0)}, ${v2[1].toFixed(0)})px/frame the other way (${accel.toFixed(0)} px/frame²). That is a snap, not a move.${typeof L.panWith === 'string' ? ` This layer pans with "${L.panWith}", which has already carried it somewhere by then. Your own keys continue from THERE, not from the layer's origin. Peel off before the pan passes your destination.` : ' A settle should reverse gently; check the key before it.'}`;
}

function motionSnapWarnings(cfg, out) {
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
  // (engine-doctrine/MISTAKES.md #194). The author cannot see the pan's accumulated value, so the arithmetic has to
  // be done for them.
  (cfg.layers || []).forEach((L, i) => {
    const msg = motionSnapWarning(cfg, L, i);
    if (msg) out.push(msg); // one report per layer; the first is the cause
  });
}

function becomesWarnings(cfg, ids, out) {
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
}

function check(L, label, out) {
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

// ANCHOR POINT: the same trap `check()` catches for a centring KEYWORD, one field over. `anchorPoint`
// shifts x/y to name a point OTHER than the box's top-left corner (core/engine/boot.js resolveLayerCoords
// bakes the shift in), and that shift needs the box's own w (for a centre/right point) and h (for a
// centre/bottom point, text excepted: TEXTISH gets the same size*1.2 estimate `check()` already grants).
// Caught here so a missing `w`/`h` is named before render, not read off a layer sitting at its own
// left/top edge with no visible sign why.
function anchorPointWarnings(cfg, out) {
  (cfg.layers || []).forEach((L, i) => {
    if (!isObj(L) || L.anchorPoint == null) return;
    const label = `layers[${i}] (${L.type || 'text'})`;
    const p = ANCHOR_POINTS[L.anchorPoint];
    if (!p) { out.push(`${label}: anchorPoint "${L.anchorPoint}" is not one of: ${Object.keys(ANCHOR_POINTS).join(', ')}.`); return; }
    const [fx, fy] = p;
    if (fx && L.w == null)
      out.push(`${label}: anchorPoint "${L.anchorPoint}" makes x the box's centre/right point, but \`w\` is unset (=0), so x still lands on the left edge. Set \`w\`.`);
    // core/engine/boot.js only estimates a height for `text` (size*1.2), not the rest of TEXTISH, so
    // this checks the narrower set that runtime actually grants rather than reusing TEXTISH verbatim.
    if (fy && L.h == null && !(L.type === 'text' && L.size != null))
      out.push(`${label}: anchorPoint "${L.anchorPoint}" makes y the box's centre/bottom point, but \`h\` is unset (and there is no \`size\` to estimate one from). Set \`h\`.`);
  });
}

function positionWarnings(cfg, out) {
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
}

export function layoutErrors(cfg) {
  const out = [];
  const ids = new Set((cfg.layers || []).filter((L) => isObj(L) && L.id).map((L) => L.id));
  panWithWarnings(cfg, ids, out);
  anchorRefWarnings(cfg, ids, out);
  gsapPropWarnings(cfg, out);
  motionBoxWarnings(cfg, out);
  motionSnapWarnings(cfg, out);
  becomesWarnings(cfg, ids, out);
  positionWarnings(cfg, out);
  anchorPointWarnings(cfg, out);
  return out;
}
