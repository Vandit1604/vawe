// core/tracks/idle.js — the idle track: ambient motion across a layer's SETTLED MIDDLE, so a held
// frame can be alive without the author hand-keying a motion track for it. The generators, the
// envelope and the reason any of this exists are core/idle.js; this file is where they meet an element.
//
// Runs AFTER `transform` (the motion track) and before `post` (the modifiers): the idle is a small
// thing added to whatever choreography the layer already has, never a replacement for it. A layer with
// a keyed motion track and an idle gets both, with the idle riding outside.
import { enterDurOf, exitDurOf } from '../clips.js';
import { idleAt, idlePhase, idleTransform, normalizeIdle, settledGain } from '../idle.js';

export const slot = 'idle';

// `idle` is read unconditionally: absence is the default (`none`), which is the whole parity guarantee.
export const PROPS = { idle: {} };

// The layer's resolved spec and its phase, taken ONCE per element rather than once per frame: this
// runs for every layer on every frame of every render, and both answers are fixed at build.
// `undefined` means "not looked yet" and `null` is the real answer "this layer has no idle", so a
// scene with the default off pays one property read per layer per frame and nothing else.
//
// The phase is keyed on what identifies the layer to a human — its `id`, or its content and where it
// sits. Two layers breathing in lockstep read as one mechanism driving both, and the same layer must
// breathe identically on every render and in every worker, so the offset is hashed, never drawn.
const idleOf = (kit, el, L) => {
  if (el.__hsIdleSpec === undefined) {
    // Per-layer wins over the scene default, and `idle: "none"` on a layer is how you opt ONE layer
    // out of a film that opted everything in. `!== undefined` and not a truthiness test, because
    // `false` and `"none"` are meaningful values that must beat the default rather than fall to it.
    el.__hsIdleSpec = normalizeIdle(L.idle !== undefined ? L.idle : kit.idle);
    el.__hsIdlePhase = idlePhase(L.id ?? `${L.type ?? 'text'}:${L.text ?? L.src ?? ''}:${L.x ?? 0},${L.y ?? 0}:${L.start ?? 0}`);
  }
  return el.__hsIdleSpec;
};

export function frame(kit, el, L, units, t, f, start, end) {
  const spec = idleOf(kit, el, L);
  if (!spec) return;

  const u = t - start;
  const g = t >= start && t < end
    ? settledGain(u, { dur: end - start, enterDur: enterDurOf(el), exitDur: exitDurOf(el) })
    : 0;
  const add = g > 0 ? idleTransform(idleAt(spec, u, el.__hsIdlePhase), g) : '';

  // AUTHORITATIVE, and this is the part that is not obvious. Most entrances rewrite `transform` from
  // scratch on every frame, so composing onto whatever is on the element is safe. `wipe`, `iris` and
  // `clock` do not — they write clipPath and never touch transform — so on one of those layers the
  // string sitting on the element is the one THIS track wrote on whichever frame the worker rendered
  // before, and frames render out of order. Composing onto that would stack idle onto idle and make
  // frame N depend on frame N-1, which is defect #41's exact shape.
  //
  // So the base is stashed beside the output it produced. If the element still holds that exact
  // output, nothing else wrote transform this frame and the stashed base is still the truth; anything
  // else on the element is a fresh write from driveClips or an earlier track. Every frame writes,
  // including the frames that contribute nothing, so a settled frame cannot inherit a held one.
  const prior = el.__hsIdle;
  const cur = el.style.transform || '';
  const base = prior && cur === prior.out ? prior.base : cur;
  el.style.transform = add ? (base && base !== 'none' ? `${add} ${base}` : add) : base;
  // READ BACK, do not store what was written. CSSOM re-serialises an inline transform on the way in
  // (`scale(1.000000)` comes back as `scale(1)`), so the string handed to the setter never equals the
  // string the getter returns, the comparison above could never fire, and every frame took the
  // PREVIOUS frame's idle as its base and added to it — a drift that walked 300px off its layout by
  // the end and did it differently depending on which frames a worker had already rendered. Storing
  // the browser's own spelling is what makes the two sides of the comparison the same language.
  el.__hsIdle = { out: el.style.transform, base };
}
