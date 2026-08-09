// core/layers/vocabulary.js — the COMPLETE set of props an author may write on one layer, assembled
// from the declarations (core/props.js) rather than listed anywhere, and the boot-time refusal built
// on top of it.
//
// A layer's vocabulary has two halves and both are declared:
//   · the TYPE half — what `rect` reads is not what `image` reads (core/layers/index.js LAYER_PROPS).
//   · the SHARED half — what EVERY layer reads whatever its type: the orchestrator's timing and
//     declared relationships, the twelve-track per-frame pipeline, the shared kit, boot's placement
//     grammar, the pan resolver, the modifier registry, and the unified transition sugar that is
//     lowered away before any builder runs.
// Six modules own the shared half and none of them owns the others, so the union is computed here,
// once, and BOTH the engine and `layer-props` read it from here. Two copies of this list is how the
// gate and the renderer would come to disagree about what the engine accepts, and a gate that
// disagrees with the renderer is worse than no gate.
//
// WHY THIS FILE IMPORTS A FORMAT. `formats/scene/props.js` is the scene orchestrator's own
// declaration, and the orchestrator reads layer props (timing, `becomes`, anchors, the GSAP hooks).
// There is no vocabulary without it. The import points down-stack the wrong way on purpose and is the
// only such edge in core/: the alternative is for the format to inject its declarations through
// createRenderer, which puts the completeness of the check in the caller's hands and makes an omitted
// argument look exactly like a layer with no orchestrator props. A missing declaration must be
// impossible, not merely unlikely.
import { mergeProps } from '../props.js';
import { PROPS as ORCHESTRATOR_PROPS } from '../../formats/scene/props.js';
import { TRACK_PROPS } from '../tracks/index.js';
import { PROPS as KIT_PROPS } from './util.js';
import { PROPS as BOOT_PROPS } from '../boot.js';
import { PROPS as PAN_PROPS } from '../pan-resolve.mjs';
import { PROPS as FX_PROPS } from '../fx/index.js';
import { PROPS as LOWER_PROPS } from '../transitions-lower.js';

export const SHARED_PROPS = Object.freeze(mergeProps(
  ORCHESTRATOR_PROPS, TRACK_PROPS, KIT_PROPS, BOOT_PROPS, PAN_PROPS, FX_PROPS, LOWER_PROPS));

// Levenshtein distance, iterative, one row of state. Small enough to keep here rather than reach for
// the copy in core/validate.mjs, which is CLI-and-boot validation and must not become a dependency of
// the renderer's hot path.
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const carry = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = carry;
    }
  }
  return row[b.length];
}

// The closest known prop, or null when nothing is close enough to be a useful guess. The threshold
// scales with the candidate's length so `bg` does not claim every two-letter typo in the file.
function nearest(word, known) {
  const w = word.toLowerCase();
  let best = null, bestD = Infinity;
  for (const k of known) {
    const d = editDistance(w, k.toLowerCase());
    if (d < bestD || (d === bestD && k < best)) { bestD = d; best = k; }
  }
  return best != null && bestD <= Math.max(2, Math.ceil(best.length / 3)) ? best : null;
}

// `_`-prefixed keys are an author's own annotations by long-standing convention (`_why`, `_card`) and
// are the one thing the engine is supposed to ignore. Everything else is either read or a bug.
const isAnnotation = (k) => k.startsWith('_');

// checkLayer — one layer, no recursion. `typeProps` is LAYER_PROPS[type]; the caller owns the
// registry, so this file does not import core/layers/index.js and there is no cycle.
//
// UNKNOWN, NOT INERT. A prop nothing declares is refused. A prop declared behind a guard the layer
// never sets (`preset` without `split`) is NOT refused here: it is a real prop that this layer will
// not reach, the fix is a missing enabler rather than a typo, and 22 of the 23 findings in the shipped
// library are of that shape. `make layer-props` reports those; a build must not die on them.
export function checkLayer(L, typeProps, where) {
  for (const k of Object.keys(L)) {
    if (isAnnotation(k) || typeProps[k] || SHARED_PROPS[k]) continue;
    const known = [...new Set([...Object.keys(typeProps), ...Object.keys(SHARED_PROPS)])].sort();
    const near = nearest(k, known);
    const t = L.type || 'text';
    throw new Error(`${where} (type "${t}"): unknown prop \`${k}\`.`
      + (near ? ` Did you mean \`${near}\`?` : '')
      + `\nNothing in the engine reads it, so it would be accepted and then ignored — the JSON looks `
      + `right and the render is wrong, which is the most expensive bug class in this repo.`
      + `\n\`${t}\` reads: ${Object.keys(typeProps).sort().join(', ') || '(nothing of its own)'}`
      + `\nplus the ${Object.keys(SHARED_PROPS).length} props every layer carries (timing · placement · `
      + `motion · modifiers). The whole vocabulary is formats/scene/schema.json layers.item, whose `
      + `layerProps block is generated from these same declarations.`);
  }
}

// checkLayerTree — a layer and every descendant, under the SAME rule. A group child is built by the
// same builder as a top-level layer (kit.buildLeaf), so it must be judged by the same vocabulary; the
// nested-group path does not go through buildLeaf at all, which is how nested groups have twice ended
// up silently supporting less than their leaves (docs/MISTAKES.md #69, #70). Walking the tree from
// one entry point means there is no second path to forget.
//
// `block` / `comp` / `beat` layers are build-time sugar carrying THEIR factory's props, not a
// primitive's. They are left alone here; core/layers/index.js refuses them by type with the message
// that names `make expand`.
const SUGAR_TYPES = new Set(['block', 'comp', 'beat']);

// The orchestrator builds one layer at a time and does not hand over its index, so name the layer by
// what an author can search the JSON for: its `id`, or a short excerpt of the content that identifies
// it. "layer[7]" from a stack trace is no help in a 60-layer file the author did not number.
const label = (L) => {
  if (L.id) return `layer "${L.id}"`;
  const hint = [L.text, L.src, L.d, L.html].find((v) => typeof v === 'string' && v.length);
  return hint ? `layer (${JSON.stringify(hint.slice(0, 40))})` : 'layer';
};

export function checkLayerTree(L, layerProps, where = label(L)) {
  if (!L || typeof L !== 'object') return;
  if (SUGAR_TYPES.has(L.type)) return;
  const typeProps = layerProps[L.type == null || L.type === '' ? 'text' : L.type];
  if (!typeProps) return;                       // unknown TYPE — index.js owns that refusal
  checkLayer(L, typeProps, where);
  if (Array.isArray(L.children))
    L.children.forEach((C, i) => checkLayerTree(C, layerProps, `${where}.children[${i}]`));
}
