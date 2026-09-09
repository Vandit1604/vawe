// core/prop-audit.js: refuse a layer prop that was WRITTEN and never READ.
//
// The bug class (docs/MISTAKES.md #428, #424): an author sets a real, documented prop, the engine
// accepts it, no code consults it, and a still frame comes out with nothing to say why. The static
// vocabulary check (core/layers/vocabulary.js) cannot see this. Statically `bg` IS read, by
// group.js, rect.js and text.js, through kit.chipBox. #428 was that the builder for THIS type never
// reached for it. Only a per-LAYER record of what was actually read answers that.
//
// Same idea as `paramsOf` (core/camera-moves.js:216), which refuses an unknown camera parameter by
// reading the generator's OWN signature so no table can drift, generalised from parameters to props.
// There is no list of props here and none to maintain: the layer object itself is the list, and a
// prop that does not exist yet is covered on the day it is written.

const READS = new WeakMap();

// watchProps: wrap a layer (and its children, depth-first, so wrapping a child is not itself
// recorded as a read of `children`) in a Proxy that records every string key read off it.
export function watchProps(L) {
  if (!L || typeof L !== 'object' || Array.isArray(L)) return L;
  if (Array.isArray(L.children)) L.children = L.children.map(watchProps);
  const reads = new Set();
  const p = new Proxy(L, {
    get(t, k, r) { if (typeof k === 'string') reads.add(k); return Reflect.get(t, k, r); },
  });
  READS.set(p, reads);
  return p;
}

// `_`-prefixed keys are the author's own annotations, the one thing the engine is meant to ignore
// (same convention as core/layers/vocabulary.js).
const AUDITED = (k) => !k.startsWith('_');

// Every watched layer in the tree, parents before children.
export function watchedTree(p, out = []) {
  if (!p || typeof p !== 'object') return out;
  if (READS.get(p)) out.push(p);
  const kids = Object.getOwnPropertyDescriptor(p, 'children')?.value;
  if (Array.isArray(kids)) for (const c of kids) watchedTree(c, out);
  return out;
}

// ---- WHAT THIS AUDIT IS RESPONSIBLE FOR, and why it is not everything ----
//
// A layer object is read in three phases and only one of them is inside the window this record covers:
//   · BOOT, before the scene orchestrator sees the data (core/boot.js resolves the placement grammar).
//   · BUILD, which is `buildLayer`: the pre-passes, the primitive's build(), the kit, decorate().
//   · FRAME, `renderFrame(n)`: the twelve-track pipeline, the modifier registry, each type's frame().
//
// Only BUILD is deterministic to check. A real render runs about eight parallel workers and each draws
// a SUBSET of the frames, so a read set accumulated across frames is partial and partial in a different
// way per worker. A gate whose verdict depends on which worker saw which frame is worse than no gate,
// and `renderFrame(n)` purity is this engine's central contract. Sampling a few frames instead trades
// that for a check that misses whatever it did not sample. So the record is snapshotted at the end of
// BUILD, and the props the other two phases read are exempt.
//
// THAT EXEMPTION IS DERIVED, NEVER TYPED. Every module already declares the props it reads, beside the
// read (core/props.js). The six modules that read outside the build window declare their own sets; the
// kit is the build window's own vocabulary; and a layer TYPE that exports `frame` cannot say which of
// its props are read there, so a type's own declarations are exempt too. What is left, the props the
// kit reads and this type does not declare, is exactly the surface #428 lived on: `bg`, `border`,
// `radius`, `shadow`, `elevation` and `pad`, advertised on every layer, painted by `kit.chipBox`, and
// consulted by `html` never.
//
// A STATIC CHECK CANNOT REPLACE THIS. Statically `bg` IS read, by group.js and rect.js and text.js.
// The bug was that the builder for one type never reached for it, and only a per-layer runtime record
// can tell those apart.
import { LAYER_PROPS } from '../layers/index.js';
import { SHARED_PROPS } from '../layers/vocabulary.js';
import { PROPS as KIT_PROPS } from '../layers/util.js';
import { PROPS as ORCHESTRATOR_PROPS } from '../../formats/scene/props.js';
import { TRACK_PROPS } from '../tracks/index.js';
import { PROPS as BOOT_PROPS } from '../engine/boot.js';
import { PROPS as PAN_PROPS } from '../layout/pan-resolve.mjs';
import { PROPS as FX_PROPS } from '../fx/index.js';
import { PROPS as LOWER_PROPS } from '../transitions/lower.js';

const OUTSIDE_BUILD = new Set([ORCHESTRATOR_PROPS, TRACK_PROPS, BOOT_PROPS, PAN_PROPS, FX_PROPS, LOWER_PROPS]
  .flatMap((s) => Object.keys(s)));

// THE DRIFT GUARD. The partition above names the six modules a second time, core/layers/vocabulary.js
// names them first, to build SHARED_PROPS. Two lists of the same thing is how a gate and the renderer
// come to disagree, so the day a seventh module joins the shared vocabulary and not this line, this
// throws at boot instead of quietly widening what the audit will refuse.
{
  const orphan = Object.keys(SHARED_PROPS).filter((k) => !OUTSIDE_BUILD.has(k) && KIT_PROPS[k] === undefined);
  if (orphan.length)
    throw new Error(`core/prop-audit.js: ${orphan.join(', ')} joined the shared layer vocabulary `
      + `(core/layers/vocabulary.js) without being classified build-phase or not here. Add its module `
      + `to OUTSIDE_BUILD, or to the kit's own declarations if the read happens during build.`);
}

const auditedFor = new Map();
// The props THIS type must consume during build: the kit's own vocabulary, minus anything a later
// phase reads, minus anything the type declares for itself (a type that exports `frame` reads some of
// its own props there, and a declaration cannot say which).
export function auditedProps(type) {
  let s = auditedFor.get(type);
  if (!s) {
    const own = LAYER_PROPS[type] || {};
    s = new Set(Object.keys(KIT_PROPS).filter((k) => !OUTSIDE_BUILD.has(k) && own[k] === undefined));
    auditedFor.set(type, s);
  }
  return s;
}

// auditLayer: refuse a prop this layer's build accepted and never read. Called the instant one
// layer's build finishes, so the verdict is a function of that layer alone.
const labelOf = (L) => {
  if (L.id) return `layer "${L.id}"`;
  const hint = [L.text, L.src, L.d, L.html].find((v) => typeof v === 'string' && v.length);
  return hint ? `layer (${JSON.stringify(hint.slice(0, 40))})` : 'layer';
};

// deadProps: the decision itself, and the only copy of it. `audited` is the set of names this caller
// is asking about, so the prober (quality/gates/prop-probe.mjs) can ask about a prop this audit's own
// scope excludes without owning a second version of the rule.
export function deadProps(p, audited) {
  const reads = READS.get(p);
  if (!reads) return [];
  return Object.keys(p).filter((k) => AUDITED(k) && audited.has(k) && !reads.has(k));
}

export function auditLayer(p, label = labelOf(p)) {
  const reads = READS.get(p);
  if (!reads) return;
  const type = p.type == null || p.type === '' ? 'text' : p.type;
  // THE PROBER'S SINK. A render never sets this. prop-probe.mjs does, before the scene boots, because
  // it needs every death in one run rather than the first one, and it judges each layer AFTER a frame
  // has been drawn (a type's own props are read in frame(), which is why this audit cannot see them).
  if (globalThis.__PROP_PROBE) { globalThis.__PROP_PROBE.push({ layer: p, type, label }); return; }
  const audited = auditedProps(type);
  const dead = deadProps(p, audited);
  if (!dead.length) return;
  throw new Error(`${label} (type "${type}"): ${dead.map((k) => `\`${k}\``).join(', ')} `
    + `${dead.length === 1 ? 'was' : 'were'} set and never read while this layer was built.\n`
    + `The prop is real and the schema advertises it. Nothing in the \`${type}\` builder reached for `
    + `it, so it would be accepted and then ignored and the frame would come out with nothing to say `
    + `why (docs/MISTAKES.md #428).\n`
    + `Either the builder should consume it (these are the box props kit.chipBox paints, text, rect, `
    + `group and html all call it), or the layer should not carry it.`);
}
