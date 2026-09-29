// core/validate/content.mjs: the same `{{key}}` scan core/engine/expand.js resolveContentSlots runs
// at build, run here (pure, no mutation) so an unknown content key is a `make check GATE=validate` finding, not a
// render-time throw. Kept in sync by hand rather than imported both ways: expand.js is a build-time
// MUTATOR (it deletes `data.content` when done) and importing a mutator into a validator that must
// never rewrite the scene it grades is the wrong direction (core/validate/backgrounds.mjs junctionBindingErrors
// clones for the same reason); this file only ever reads.
import { isObj } from './util.mjs';

const CONTENT_TOKEN = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;

export function contentSlotErrors(cfg) {
  const out = [];
  if (!cfg || cfg.content == null) return out;
  if (!isObj(cfg.content)) { out.push('`content` must be an object of {key: value} pairs.'); return out; }
  const known = new Set(Object.keys(cfg.content));
  const check = (s, at) => {
    for (const m of s.matchAll(CONTENT_TOKEN)) {
      const key = m[1];
      if (!known.has(key))
        out.push(`${at} references content key "${key}" ({{${key}}}), which \`content\` does not have. `
          + `Known keys: ${[...known].join(', ') || '(none, content is empty)'}.`);
    }
  };
  const visit = (layer, at) => {
    if (!isObj(layer)) return;
    for (const k of ['text', 'html', 'src']) if (typeof layer[k] === 'string') check(layer[k], `${at}.${k}`);
    if (Array.isArray(layer.children)) layer.children.forEach((c, i) => visit(c, `${at}.children[${i}]`));
  };
  (cfg.layers || []).forEach((l, i) => visit(l, `layers[${i}]`));
  return out;
}
