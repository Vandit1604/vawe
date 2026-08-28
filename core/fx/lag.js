// core/fx/lag.js: FOLLOW-THROUGH. This layer follows another layer's motion a frame or three LATE, and
// overruns its stop before settling back.
//
// The sixth recipe in docs/CRAFT/AFTER-EFFECTS-RECIPES.md, and the one the engine had no shape for at
// all. `stagger` is not this: stagger delays a whole ENTRANCE on a SIBLING, while follow-through makes
// one layer trail another's CONTINUOUS motion and ring past its resting pose. Richard Williams' manual
// version is "parent the trailing element, then shift its keys 1 to 3 frames later"; Dan Ebberts'
// expression adds the overrun, `v * amp * sin(freq*t*2pi) / exp(decay*t)`, defaults amp 0.05, freq 4,
// decay 8. Both are here, as one modifier.
//
//   "modifiers": [{ "lag": "card" }]
//   "modifiers": [{ "lag": { "of": "card", "delay": 3, "amp": 0.05, "freq": 4, "decay": 8 } }]
//
// A MOTION RELATIONSHIP BETWEEN TWO LAYERS is a new idea in this engine, and it is affordable for the
// same reason `follow` is: the leader's track is DATA, reachable through `scene.specOf`, so this reads
// the leader's KEYFRAMES rather than the leader's rendered element. Nothing has to have run first, the
// loop order does not matter, and the answer at t is the same on a cold DOM as a warm one.
//
// WHERE IT DIFFERS FROM `follow` (core/tracks/follow.js), because the two will be confused: `follow`
// pins one layer to another's live BOX, right now, with no delay. This carries the leader's OFFSET,
// late, and adds an overrun. Follow is a constraint; lag is a physics.
//
// THE CSS `translate` LONGHAND, for the reason core/fx/tilt.js gives for `rotate`: core/fx/index.js
// forbids a modifier from writing `transform` because the tracks own it and a modifier that appended
// would be appending to its own value from whichever frame ran last. `translate` is a separate property
// and the used transform is translate then rotate then scale then transform, so this composes outside
// everything the tracks write and is never read back.
//
// WRONG ON: a rigid board. A card, a chip and a screenshot do not drag, and one that does reads as
// jelly. Right on a label under a moving object, a shadow, a trailing token, a tail.
import { poseBack, velocityAt } from '../sequence.js';
import { FPS } from '../motion.js';

export const LAG_KEYS = ['of', 'delay', 'amp', 'freq', 'decay'];

// `delay` in FRAMES, because 1 to 3 frames is how the recipe is stated and how it stays right when the
// film is retimed. amp/freq/decay are Ebberts' own defaults.
const DEFAULTS = { delay: 2, amp: 0.05, freq: 4, decay: 8 };
const DELAY_MAX = 8;

const name = (L) => `"${L.id || L.type || 'layer'}"`;

export function resolve(spec, L) {
  const s = typeof spec === 'string' ? { of: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`lag on ${name(L)}: expected a layer id or an object like { "of": "card", `
      + `"delay": 2 }, got ${JSON.stringify(spec)}. Keys: ${LAG_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!LAG_KEYS.includes(k))
      throw new Error(`lag on ${name(L)}: unknown key "${k}", known: ${LAG_KEYS.join(', ')}.`);
  if (typeof s.of !== 'string' || !s.of)
    throw new Error(`lag on ${name(L)}: \`of\` names the LAYER THIS ONE TRAILS, by id. Got `
      + `${JSON.stringify(s.of)}.`);
  const out = { ...DEFAULTS, ...s };
  if (!Number.isFinite(out.delay) || !(out.delay > 0 && out.delay <= DELAY_MAX))
    throw new Error(`lag on ${name(L)}: \`delay\` is how many FRAMES behind the leader this layer runs, `
      + `above 0 and at most ${DELAY_MAX} (1 to 3 is the band the animators quote). Got `
      + `${JSON.stringify(out.delay)}.`);
  for (const k of ['amp', 'freq', 'decay'])
    if (typeof out[k] !== 'number' || !Number.isFinite(out[k]) || out[k] < 0)
      throw new Error(`lag on ${name(L)}: \`${k}\` must be a non-negative number, got ${JSON.stringify(out[k])}. `
        + `amp is the SIZE of the overrun as a fraction of the leader's velocity, freq how often it `
        + `wobbles, decay the friction that stops it. Ebberts' defaults are 0.05 / 4 / 8.`);
  return out;
}

export function build(kit, el, L, spec) {
  const { of } = resolve(spec, L);
  if (of === L.id)
    throw new Error(`lag on ${name(L)}: a layer cannot trail itself.`);
  if ((L.modifiers || []).some((m) => m && typeof m === 'object' && 'plane' in m))
    throw new Error(`lag on ${name(L)}: this layer also carries \`plane\`, and both write the CSS `
      + `\`translate\` longhand, so one of them would silently do nothing. Put the depth on the layer `
      + `this one trails instead, and it rides along.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { of, delay, amp, freq, decay } = resolve(spec, L);
  const lead = scene.specOf(of);
  if (!lead)
    throw new Error(`lag on ${name(L)}: no layer with id "${of}", known ids: ${scene.ids.join(', ')}.`);
  if (!Array.isArray(lead.motion) || !lead.motion.length)
    throw new Error(`lag on ${name(L)}: "${of}" has no \`motion\` track, so there is no continuous `
      + `motion to trail and this would render nothing. An entrance is not motion this can read: it is `
      + `composed by the clip pipeline. Give "${of}" keyed motion, or reach for \`follow\`, which pins `
      + `to a live box with no delay.`);
  // CHAINING, refused where the arithmetic would lie, exactly as core/tracks/follow.js refuses it. This
  // reads the leader's KEYFRAMES, which carry nothing another modifier wrote, so trailing a trailer
  // would follow the middle layer's UNLAGGED motion: a wrong answer rather than a missing one.
  if ((lead.modifiers || []).some((m) => m && typeof m === 'object' && 'lag' in m))
    throw new Error(`lag on ${name(L)}: "${of}" is itself lagging something. This reads keyframes, not `
      + `rendered poses, so "${of}" would report its UNLAGGED motion and the trail would land where `
      + `nothing is. Trail the layer at the head of the chain.`);
  const fps = (scene.clock && scene.clock.fps) || FPS;
  const lt = t - (lead.start ?? 0);
  const dt = delay / fps;
  // THE DELAYED POSE. Clamped at the leader's first key by poseBack, so before the leader has moved the
  // trailer sits exactly where it was authored rather than at an extrapolated pose.
  const p = poseBack(lead.motion, Math.max(0, lt), dt);
  // THE OVERRUN. Ebberts' decaying sine, measured from the leader's LAST keyframe on or before the
  // delayed time, and driven by the velocity arriving into that keyframe: the drag is the size of the
  // move that just stopped, which is why a slow move barely rings and a fast one does.
  const td = Math.max(0, lt - dt);
  let last = lead.motion[0].t;
  for (const k of lead.motion) if (k.t <= td && k.t > last) last = k.t;
  const tau = td - last;
  let ox = 0, oy = 0;
  if (tau > 0 && amp > 0) {
    const v = velocityAt(lead.motion, last, 1 / fps);
    const ring = amp * Math.sin(freq * tau * 2 * Math.PI) / Math.exp(decay * tau);
    ox = v.vx * ring; oy = v.vy * ring;
  }
  const x = p.dx + ox, y = p.dy + oy;
  el.style.translate = Math.abs(x) < 0.01 && Math.abs(y) < 0.01 ? 'none'
    : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
}
