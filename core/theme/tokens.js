// core/theme/tokens.js: a theme's `tokens` tree, resolved. Pure data + pure functions (no node imports,
// no DOM), same contract as core/registry/theme-contract.js: importable by node (validate, migrate) and
// the browser (boot.js) alike. The colour parser is INJECTED, not imported, for the same reason that
// file gives (see its header): re-implementing one here would be a second copy to drift.
//
// SHAPE: `tokens` nests groups freely; a node with both `$type` and `$value` is a TOKEN, anything else
// is a GROUP to recurse into. An alias is a string written exactly `"{group.token.path}"`. Follows the
// W3C Design Tokens (DTCG) shape, not the DTCG spec in full: this engine needs alias resolution, cycle
// refusal, and colour normalisation, and nothing else DTCG defines.
import { normalizeColor } from './color-oklch.js';

export const TOKEN_TYPES = ['color', 'gradient', 'dimension', 'number', 'duration', 'cubicBezier', 'fontFamily', 'shadow', 'asset'];

const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);
const isTokenNode = (n) => isObj(n) && Object.hasOwn(n, '$type') && Object.hasOwn(n, '$value');

const ALIAS_RE = /^\{([^{}]+)\}$/;
export const aliasPath = (s) => (typeof s === 'string' ? ALIAS_RE.exec(s)?.[1] ?? null : null);

// flattenTokens(tree) -> Map<"group.token", {type, value, description}>, every leaf token in the tree.
// A group with no tokens under it (only in a hand-authored file mid-edit) contributes nothing, not an
// error: an empty group is not a malformed one.
export function flattenTokens(tree, prefix = '', out = new Map()) {
  if (!isObj(tree)) return out;
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isTokenNode(node)) out.set(path, { type: node.$type, value: node.$value, description: node.$description });
    else if (isObj(node)) flattenTokens(node, path, out);
  }
  return out;
}

// resolveOne(path, flat, values, resolving, errors, {parseColor}): resolve one token path to its final
// primitive, memoised in `values`, cycle-checked via `resolving` (the DFS-in-progress set). Never
// throws: every failure is pushed to `errors` and the path resolves to `undefined`, so one bad token
// cannot abort resolving every other one (a validate run should report every problem in one pass, same
// posture as themeErrors/lookErrors in core/registry/theme-contract.js).
function resolveOne(path, flat, values, resolving, errors, opts) {
  if (values.has(path)) return values.get(path);
  const node = flat.get(path);
  if (!node) { errors.push(`token "${path}" does not exist`); return undefined; }
  if (resolving.has(path)) { errors.push(`token cycle: ${[...resolving, path].join(' -> ')}`); return undefined; }
  if (!TOKEN_TYPES.includes(node.type)) { errors.push(`token "${path}" has unknown $type "${node.type}" (known: ${TOKEN_TYPES.join(', ')})`); return undefined; }
  resolving.add(path);
  const resolved = resolveValue(node.type, node.value, path, flat, values, resolving, errors, opts);
  resolving.delete(path);
  values.set(path, resolved);
  return resolved;
}

// resolveValue: type-directed resolution of one $value. A bare alias string resolves through the SAME
// path as a literal; `gradient` is the one type whose $value is an array, each entry resolved the same
// way a `color` value would be (a stop may itself be an alias or a literal).
function resolveValue(type, raw, path, flat, values, resolving, errors, opts) {
  const resolveScalar = (v) => {
    const alias = aliasPath(v);
    if (alias != null) return resolveOne(alias, flat, values, resolving, errors, opts);
    return v;
  };
  if (type === 'gradient') {
    if (!Array.isArray(raw)) { errors.push(`token "${path}" ($type gradient) needs an array $value`); return undefined; }
    return raw.map((stop) => {
      const v = resolveScalar(stop);
      const hex = normalizeColor(v, opts);
      if (hex == null) errors.push(`token "${path}": gradient stop ${JSON.stringify(stop)} is not a colour`);
      return hex ?? v;
    });
  }
  const v = resolveScalar(raw);
  if (v === undefined) return undefined; // the alias already reported its own error
  if (type === 'color') {
    const hex = normalizeColor(v, opts);
    if (hex == null) errors.push(`token "${path}": ${JSON.stringify(v)} is not a colour`);
    return hex ?? v;
  }
  if (type === 'number' || type === 'dimension' || type === 'duration') {
    if (typeof v !== 'number') errors.push(`token "${path}" ($type ${type}) must resolve to a number, got ${JSON.stringify(v)}`);
    return v;
  }
  if (type === 'cubicBezier') {
    if (!Array.isArray(v) || v.length !== 4 || !v.every(Number.isFinite)) errors.push(`token "${path}" ($type cubicBezier) must resolve to [x1,y1,x2,y2]`);
    return v;
  }
  if (type === 'fontFamily' || type === 'asset') {
    if (typeof v !== 'string' || !v) errors.push(`token "${path}" ($type ${type}) must resolve to a non-empty string`);
    return v;
  }
  if (type === 'shadow') {
    if (typeof v !== 'string' || !v) errors.push(`token "${path}" ($type shadow) must resolve to a CSS shadow string`);
    return v;
  }
  return v;
}

// resolveTokens(tree, opts) -> { values: Map<path, resolved>, errors: string[] }. Never throws: see
// resolveOne. `opts.parseColor` is required to normalise a `color`/`gradient` token; omitted, every
// colour token fails to normalise and reports so (fail loud, not a silent pass-through of an unchecked
// string, same rule themeErrors follows when it is handed no parser at all).
// malformedTokens(tree): paths of nodes carrying only one of `$type`/`$value`. A `$` key marks an
// attempted token, so such a node is an authoring error, never a group to recurse into silently.
export function malformedTokens(tree, prefix = '', out = []) {
  if (!isObj(tree)) return out;
  for (const [key, node] of Object.entries(tree)) {
    if (!isObj(node)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (Object.hasOwn(node, '$type') !== Object.hasOwn(node, '$value')) out.push(path);
    else if (!isTokenNode(node)) malformedTokens(node, path, out);
  }
  return out;
}

export function resolveTokens(tree, opts = {}) {
  const flat = flattenTokens(tree);
  const values = new Map();
  const errors = malformedTokens(tree).map((path) => `token "${path}" needs both $type and $value`);
  for (const path of flat.keys()) resolveOne(path, flat, values, new Set(), errors, opts);
  return { values, errors };
}

// resolveRoleValue(raw, values, errors, opts): a `roles` entry is either an alias into `tokens`, or a
// LITERAL (an author skipping the tokens tree entirely for a one-off role, same escape hatch the DTCG
// example in the plan shows: `"ink": "#f4f4f0"`). A literal is resolved exactly like a token $value of
// inferred type: colour-shaped roles normalise through the same colour parser, everything else passes
// through unchanged (a font name, a number).
export function resolveRoleValue(raw, values, errors, opts, { colorish = false } = {}) {
  const alias = aliasPath(raw);
  if (alias != null) {
    if (!values.has(alias)) { errors.push(`role references token "${alias}", which does not exist`); return undefined; }
    return values.get(alias);
  }
  if (!colorish) return raw;
  const hex = normalizeColor(raw, opts);
  if (hex == null) { errors.push(`role value ${JSON.stringify(raw)} is not a colour`); return undefined; }
  return hex;
}
