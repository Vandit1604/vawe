// design-spec.mjs: THE ONE FILE a film's frames agree with. `<film>.design.md` is the film's own
// resolved design choices (a value here, never inline), laid over the theme's own numbers
// (core/registry/theme-contract.js resolveLook, the same values harness/lib/stagekit.mjs buildKit
// uses). No design.md, or an empty one, and a film has exactly the kit's tokens: nothing here narrows
// or replaces the kit, it only lets a film DECLARE the values it needs beyond it, once, in one place,
// instead of a literal repeated in every fragment.
//
// The frontmatter reader is the same one storyboards use (harness/author/storyboard-parse.mjs
// frontmatter): one `---\n...\n---` block at the top of the file. Its own `field()` only reads
// flat top-level scalars, so this file adds a small indented-YAML reader for the nested shape a
// design spec needs (palette map, type roles, radius/shadow/space maps, a surfaces list). No new
// dependency: js-yaml sits in node_modules only as someone else's transitive dependency, nothing in
// this repo imports it, and the shape design.md needs (two levels of maps, one flat list) does not
// earn one.
import fs from 'node:fs';
import path from 'node:path';
import { frontmatter } from '../author/storyboard-parse.mjs';
import { colorDistance } from '../../core/color/engine.js';

// A minimal indented map/list reader, built for exactly design.md's shape:
//   key: scalar
//   key:
//     nested: scalar
//   key:
//     - item
//     - item
// Comments (`# ...`) and blank lines are skipped. A quoted scalar loses its quotes; a bare number
// parses as a number so `size: 40` reads as 40, not `"40"`.
function parseScalar(v) {
  const unquoted = v.replace(/^["']|["']$/g, '');
  return /^-?\d+(\.\d+)?$/.test(unquoted) ? parseFloat(unquoted) : unquoted;
}

export function parseYamlLite(text) {
  const lines = String(text || '').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => ({ indent: l.match(/^ */)[0].length, text: l.trim() }));
  let pos = 0;
  function parseNode(indent) {
    if (pos >= lines.length || lines[pos].indent < indent) return {};
    if (lines[pos].text.startsWith('- ')) {
      const arr = [];
      while (pos < lines.length && lines[pos].indent === indent && lines[pos].text.startsWith('- ')) {
        arr.push(parseScalar(lines[pos].text.slice(2).trim()));
        pos++;
      }
      return arr;
    }
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const m = /^([^:]+):\s*(.*)$/.exec(lines[pos].text);
      if (!m) { pos++; continue; }
      const key = m[1].trim();
      const rest = m[2].trim();
      pos++;
      if (rest === '') obj[key] = (pos < lines.length && lines[pos].indent > indent) ? parseNode(lines[pos].indent) : {};
      else obj[key] = parseScalar(rest);
    }
    return obj;
  }
  return parseNode(lines.length ? lines[0].indent : 0);
}

const lower = (v) => String(v).toLowerCase();
const normalizePalette = (p) => Object.fromEntries(Object.entries(p || {}).map(([k, v]) => [k, lower(v)]));

/**
 * readDesignSpec(filmJsonPath) -> null, or { source, tokens }
 *   tokens: { palette:{name:hex}, type:{role:{family?,size,weight?,tracking?,lineHeight?}},
 *             radius:{name:px}, shadow:{name:css}, space:{name:px}, surfaces:[...] }
 * null when `<film>.design.md` does not exist next to the film JSON, or carries no frontmatter block:
 * both read as "this film adds nothing beyond the kit", the same thing.
 */
export function readDesignSpec(filmJsonPath) {
  const designPath = filmJsonPath.replace(/\.json$/, '.design.md');
  if (!fs.existsSync(designPath)) return null;
  const src = fs.readFileSync(designPath, 'utf8');
  const { present, head } = frontmatter(src);
  if (!present) return null;
  const raw = parseYamlLite(head);
  return {
    source: designPath,
    tokens: {
      palette: normalizePalette(raw.palette),
      type: raw.type || {},
      radius: raw.radius || {},
      shadow: raw.shadow || {},
      space: raw.space || {},
      surfaces: Array.isArray(raw.surfaces) ? raw.surfaces : [],
    },
  };
}

/**
 * legalSet(spec, kitValues) -> { fontSize, fontFamily, fontWeight, radius, shadow, color } of Set
 * kitValues is the kit's own baseline, in the same shape (each an array of raw values). `spec` may be
 * null (no design.md): the result is then exactly the kit's own values, as Sets.
 */
function baseLegalSet(kitValues) {
  const k = kitValues || {};
  return {
    fontSize: new Set((k.fontSize || []).map(Number)),
    fontFamily: new Set((k.fontFamily || []).map(String)),
    fontWeight: new Set((k.fontWeight || []).map(Number)),
    radius: new Set((k.radius || []).map(Number)),
    shadow: new Set((k.shadow || []).map(String)),
    color: new Set((k.color || []).map(lower)),
  };
}

function addTypeTokens(out, type) {
  for (const role of Object.values(type || {})) {
    if (role.size != null) out.fontSize.add(Number(role.size));
    if (role.family) out.fontFamily.add(String(role.family));
    if (role.weight != null) out.fontWeight.add(Number(role.weight));
  }
}

export function legalSet(spec, kitValues) {
  const out = baseLegalSet(kitValues);
  if (!spec) return out;
  const t = spec.tokens || {};
  addTypeTokens(out, t.type);
  for (const v of Object.values(t.radius || {})) out.radius.add(Number(v));
  for (const v of Object.values(t.shadow || {})) out.shadow.add(String(v));
  for (const v of Object.values(t.palette || {})) out.color.add(lower(v));
  return out;
}

/**
 * nearestToken(kind, value, spec) -> { name, value, delta } or null
 * kind: 'fontSize' | 'fontWeight' | 'radius' | 'shadow' | 'color'. Only searches tokens THIS film
 * declared (spec.tokens), because the point is naming which declared token a stray value is closest
 * to, so an author can reach for var(--kit-...) instead of the literal.
 */
const CANDIDATE_SOURCE = {
  fontSize: (t) => Object.entries(t.type || {})
    .filter(([, r]) => r && r.size != null)
    .map(([role, r]) => ({ name: `--kit-type-${role}-size`, value: Number(r.size) })),
  fontWeight: (t) => Object.entries(t.type || {})
    .filter(([, r]) => r && r.weight != null)
    .map(([role, r]) => ({ name: `--kit-type-${role}-weight`, value: Number(r.weight) })),
  radius: (t) => Object.entries(t.radius || {}).map(([name, v]) => ({ name: `--kit-radius-${name}`, value: Number(v) })),
  shadow: (t) => Object.entries(t.shadow || {}).map(([name, v]) => ({ name: `--kit-shadow-${name}`, value: String(v) })),
  color: (t) => Object.entries(t.palette || {}).map(([name, v]) => ({ name: `--kit-color-${name}`, value: lower(v) })),
};

function closest(candidates, delta) {
  let best = null;
  for (const c of candidates) {
    const d = delta(c);
    if (d == null) continue;
    if (!best || d < best.delta) best = { name: c.name, value: c.value, delta: d };
  }
  return best;
}

const NUMERIC_DELTA = (value) => (c) => Math.abs(c.value - Number(value));
const SHADOW_DELTA = (value) => (c) => (c.value === String(value) ? 0 : 1);
// core/color/engine.js#colorDistance is alpha-aware and shared with quality/gates/design-drift.mjs's
// own nearest-colour search, so a token declared `rgba(...)` can't read as a match for its opaque hex.
const COLOR_DELTA = (value) => (c) => {
  const d = colorDistance(value, c.value);
  return Number.isFinite(d) ? d : null;
};
const DELTA_FOR = { fontSize: NUMERIC_DELTA, fontWeight: NUMERIC_DELTA, radius: NUMERIC_DELTA, shadow: SHADOW_DELTA, color: COLOR_DELTA };

export function nearestToken(kind, value, spec) {
  if (!spec || !CANDIDATE_SOURCE[kind]) return null;
  const candidates = CANDIDATE_SOURCE[kind](spec.tokens || {});
  if (!candidates.length) return null;
  return closest(candidates, DELTA_FOR[kind](value));
}
