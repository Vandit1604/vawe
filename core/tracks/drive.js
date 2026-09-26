// core/tracks/drive.js: AFTER EFFECTS EXPRESSIONS, AS DATA. Two of the three drivers live here,
// `wiggle` (seeded organic jitter) and `link` (the pick-whip: this property follows another layer's
// property, delayed for follow-through). The third, `loop` (loopOut over a layer's own keyframes), is
// a CLOCK decision and lives with the other clock warps, core/timeline/time.js `layerTime`, applied
// before this track ever sees the layer's `t`.
//
// Runs in the SAME per-frame track pass as everything else (core/tracks/index.js), right after
// `transform`, so it composes onto whatever the motion track just wrote exactly the way `idle` does:
// prepend a transform component onto el.style.transform, never replace it. That is what keeps a
// camera move, a `parts` reveal and a seek all agreeing with a driven layer: nothing here reads the
// DOM, only the frozen scene view (`scene.specOf`) and the layer's own numbers, so renderFrame(n)
// stays pure in n.
//
//   "drive": { "wiggle": { "prop": "rot", "freq": 1.5, "amp": 2 } }
//   "drive": { "link": { "from": "card-a.x", "mul": 1, "add": 0, "delay": 0.1 } }
//
// Both keys take one spec or an array of specs, so a layer can wiggle two properties at once. Only
// `x`, `y` (px) and `rot` (deg) are driven: what a wiggling camera shake or a follow-through pin ever
// needs, the same set `follow.js` and `fx/lag.js` already move.
import { noise } from '../motion/motion.js';
import { motionAt } from '../timeline/sequence.js';
import { defineRegistry, withBlurb, blurbsOf } from '../registry/registry.js';

export const slot = 'drive';
export const PROPS = { drive: {} };

const PROPS_DRIVEN = ['x', 'y', 'rot'];
const CHANNEL = { x: 'dx', y: 'dy', rot: 'rot' };

const name = (L) => `"${L.id || L.type || 'a layer'}"`;
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// wiggleAt: SEEDED, deterministic, safe for renderFrame(n). freq in Hz, amp in the property's own
// units (px for x/y, degrees for rot). `octaves` sums progressively finer, quieter copies of the same
// noise (each one doubles the frequency and halves the amplitude), the fractal-noise trick that keeps
// a single-octave wiggle from reading as one obvious sine wave.
function wiggleAt(t, { freq = 2, amp = 10, seed = 0, octaves = 1 } = {}) {
  let v = 0, a = amp, f = Math.max(0.001, freq);
  const n = Math.max(1, Math.min(6, Math.floor(octaves)));
  for (let o = 0; o < n; o++) { v += (noise(t * f, `${seed}:${o}`) * 2 - 1) * a; f *= 2; a *= 0.5; }
  return v;
}

function validateWiggle(spec, L) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec))
    throw new Error(`drive.wiggle on ${name(L)}: expected an object like { "prop": "rot", "freq": 1.5, `
      + `"amp": 2 }, got ${JSON.stringify(spec)}.`);
  if (!PROPS_DRIVEN.includes(spec.prop))
    throw new Error(`drive.wiggle on ${name(L)}: \`prop\` must be one of ${PROPS_DRIVEN.join(', ')}, `
      + `got ${JSON.stringify(spec.prop)}.`);
  for (const k of ['freq', 'amp', 'octaves'])
    if (spec[k] != null && typeof spec[k] !== 'number')
      throw new Error(`drive.wiggle on ${name(L)}: \`${k}\` must be a number, got ${JSON.stringify(spec[k])}.`);
  return spec;
}

function validateLink(spec, L) {
  if (!spec || typeof spec.from !== 'string' || !/^[^.]+\.[^.]+$/.test(spec.from))
    throw new Error(`drive.link on ${name(L)}: \`from\` is "<layerId>.<prop>", got `
      + `${JSON.stringify(spec && spec.from)}.`);
  const [id, sourceProp] = spec.from.split('.');
  if (!PROPS_DRIVEN.includes(sourceProp))
    throw new Error(`drive.link on ${name(L)}: property "${sourceProp}" in \`from\` must be one of `
      + `${PROPS_DRIVEN.join(', ')}.`);
  if (id === L.id) throw new Error(`drive.link on ${name(L)}: a layer cannot link to itself.`);
  for (const k of ['mul', 'add', 'delay'])
    if (spec[k] != null && typeof spec[k] !== 'number')
      throw new Error(`drive.link on ${name(L)}: \`${k}\` must be a number, got ${JSON.stringify(spec[k])}.`);
  const targetProp = spec.prop ?? sourceProp;
  if (!PROPS_DRIVEN.includes(targetProp))
    throw new Error(`drive.link on ${name(L)}: \`prop\` must be one of ${PROPS_DRIVEN.join(', ')}, got `
      + `${JSON.stringify(spec.prop)}.`);
  return { id, sourceProp, targetProp, mul: spec.mul ?? 1, add: spec.add ?? 0, delay: spec.delay ?? 0 };
}

// CHAINING, refused for the exact reason core/tracks/follow.js and core/fx/lag.js refuse it: this
// reads the leader's own KEYFRAMES, never a rendered pose, so a layer linking to a layer that is
// itself linked would report the leader's UNLINKED value and the follower would land at a place
// nothing is. Named as a cycle because that is the shape that would otherwise recurse forever; a
// straight non-cyclic chain is refused too, for the same reason lag.js refuses one: fix it by linking
// the layer at the head of the chain directly.
function resolveLinkSource(scene, L, link) {
  const lead = scene.specOf(link.id);
  if (!lead)
    throw new Error(`drive.link on ${name(L)}: no layer "${link.id}", known ids: ${scene.ids.join(', ')}.`);
  if (!Array.isArray(lead.motion) || !lead.motion.length)
    throw new Error(`drive.link on ${name(L)}: "${link.id}" has no \`motion\` track, so its `
      + `"${link.sourceProp}" never changes and there is nothing to follow.`);
  const leadLinks = asList(lead.drive && lead.drive.link);
  if (leadLinks.length)
    throw new Error(`drive.link cycle: ${name(L)} follows "${link.id}", and "${link.id}" is itself `
      + `linked (to "${leadLinks[0].from}"). This reads keyframes, not rendered poses, so "${link.id}" `
      + `would report its UNLINKED value and the follower would land at a place nothing is. Link `
      + `"${leadLinks[0].from.split('.')[0]}" directly, or give "${link.id}" the motion instead.`);
  return lead;
}

export function frame(ctx) {
  const { el, L, t, start, scene } = ctx;
  const spec = L.drive;
  if (!spec) return;
  let dx = 0, dy = 0, drot = 0;
  for (const raw of asList(spec.wiggle)) {
    const w = validateWiggle(raw, L);
    const v = wiggleAt(t - start, w);
    if (w.prop === 'x') dx += v; else if (w.prop === 'y') dy += v; else drot += v;
  }
  for (const raw of asList(spec.link)) {
    const link = validateLink(raw, L);
    const lead = resolveLinkSource(scene, L, link);
    const leadT = (t - link.delay) - (lead.start ?? 0);
    const pose = motionAt(lead.motion, leadT, lead.motionDelay);
    const v = pose[CHANNEL[link.sourceProp]] * link.mul + link.add;
    if (link.targetProp === 'x') dx += v; else if (link.targetProp === 'y') dy += v; else drot += v;
  }
  if (dx === 0 && dy === 0 && drot === 0) return;
  const base = el.style.transform && el.style.transform !== 'none' ? ' ' + el.style.transform : '';
  el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${drot.toFixed(2)}deg)${base}`;
}

// ---- THE VOCABULARY, so `make arsenal Q="…"` and the arsenal-check/word-action/discovery gates can
// see this the same way every other primitive is seen. `loop`'s own arithmetic lives in time.js
// (it warps the clock, not the transform), but it is one of three drivers an author picks between,
// so it is catalogued here, beside its siblings, rather than a second vocabulary of its own.
const DRIVER_KINDS = {
  wiggle: withBlurb('an AFTER EFFECTS EXPRESSION as data: deterministic seeded jitter on one property '
    + '(x/y in px, rot in deg), default 2Hz at 10 units, reseed to decorrelate two layers so they never '
    + 'wobble in lockstep', {}),
  link: withBlurb('the PICK-WHIP: this property copies another layer\'s own animated value every '
    + 'frame, `mul`/`add` rescale it and `delay` (in seconds, 0.1 is a normal follow-through lag) '
    + 'shifts when it arrives', {}),
  loop: withBlurb('LOOP OUT: past `to` seconds this layer\'s own keyframes repeat forever, `cycle` '
    + 'restarts at `from` (0 by default), `pingpong` bounces between them, `continue` just holds the '
    + 'last key the way an unlooped track already does', {}),
};

export const DRIVER_REGISTRY = defineRegistry('driver', DRIVER_KINDS, {
  blurbs: blurbsOf('driver', DRIVER_KINDS),
  aka: {
    wiggle: ['random jitter', 'seeded shake', 'organic wobble'],
    link: ['pick whip', 'expression link', 'follow a property'],
    loop: ['loop out', 'repeat keyframes forever', 'cycle the animation'],
  },
  slot: 'drive{}',
  catalog: {
    title: 'Drivers (expressions as data)',
    tag: 'per-layer',
    intro: 'The `drive` field on a layer: AFTER EFFECTS EXPRESSIONS, written as data instead of code, '
      + 'resolved fresh every frame so a seek and a forward render always agree. `wiggle` is a seeded '
      + 'jitter on one property, `link` is the pick-whip (this property copies another layer\'s own '
      + 'animated value, with an optional delay), and `loop` repeats this layer\'s own keyframes past a '
      + 'point instead of holding on the last one. `{ "drive": { "wiggle": { "prop": "rot", "freq": 1.5, '
      + '"amp": 2 } } }`',
    usage: (n, { j }) => (n === 'wiggle' ? j({ drive: { wiggle: { prop: 'rot', freq: 1.5, amp: 2 } } })
      : n === 'link' ? j({ drive: { link: { from: 'card-a.x', delay: 0.1 } } })
      : j({ drive: { loop: { mode: 'cycle', to: 1.4 } } })),
    preview: (n, { base, HERO }) => {
      if (n === 'wiggle') return base({ layers: [
        { ...HERO, text: 'wiggle', y: 400, drive: { wiggle: { prop: 'rot', freq: 1.5, amp: 6 } } },
      ] });
      if (n === 'link') return base({ layers: [
        { ...HERO, id: 'lead', text: 'lead', y: 260,
          motion: [{ t: 0, x: -420 }, { t: 5.4, x: 420, ease: 'linear' }] },
        { ...HERO, text: 'link', y: 560, drive: { link: { from: 'lead.x', delay: 0.15 } } },
      ] });
      return base({ layers: [
        { ...HERO, text: 'loop', y: 400, duration: 6,
          motion: [{ t: 0, y: 0 }, { t: 0.6, y: -140, ease: 'easeOutCubic' }, { t: 1.2, y: 0, ease: 'easeOutBounce' }],
          drive: { loop: { to: 1.2 } } },
      ] });
    },
  },
});
