// recipes/index.mjs: load recipes/recipes.json and refuse any entry that is not copied from a real film.
import { readFileSync } from 'node:fs';

const KINDS = ['spine', 'seam', 'enter', 'exit', 'camera', 'ground', 'cursor'];

export function checkRecipe(name, r) {
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}. See recipes/README.md.`); };
  if (!KINDS.includes(r.kind)) bad(`kind must be one of ${KINDS.join(', ')}, got ${JSON.stringify(r.kind)}`);
  if (typeof r.blurb !== 'string' || r.blurb.length < 20) bad('needs a blurb an author would search for');
  if (!Array.isArray(r.sources) || r.sources.length === 0)
    bad('has no sources. A recipe is measured off a real video, so it names the ref and the second');
  for (const s of r.sources)
    if (typeof s.ref !== 'string' || typeof s.t !== 'number') bad(`source ${JSON.stringify(s)} needs a ref and a numeric t`);
  if (!r.slots || typeof r.slots !== 'object') bad('needs slots, the ids and times an author hands it');
  for (const [p, spec] of Object.entries(r.params || {}))
    if (!spec || !('default' in spec)) bad(`param "${p}" has no measured default`);
  return r;
}

export const RECIPES = Object.freeze(Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(new URL('./recipes.json', import.meta.url), 'utf8')))
    .map(([n, r]) => [n, Object.freeze(checkRecipe(n, r))])));

export function pickRecipe(name) {
  if (Object.hasOwn(RECIPES, name)) return RECIPES[name];
  throw new Error(`no recipe "${name}". Known: ${Object.keys(RECIPES).join(', ')}.`);
}
