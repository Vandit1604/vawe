// mcp/catalog.mjs — read-only introspection: worked examples to learn from, and the full block +
// effect vocabulary. Nothing here fetches or writes; it reads the engine's own registries so the
// numbers can never drift from what actually ships.
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './pipeline.mjs';
import { KNOBS } from '../core/knobs.js';

// A curated shortlist, not everything in formats/. Each teaches a different structure an author
// reaches for, and each is self-contained. Returning the JSON is safe: a scene is authoring guidance,
// and the vocabulary it uses is already public.
const EXAMPLES = [
  { name: 'looks', teaches: 'one held subject, one grade changing per beat; composite looks' },
  { name: 'ransom-intro', teaches: 'cutout ransom type, per-character treatment' },
  { name: 'gradient-showcase', teaches: 'a framed window with a changing background; image + ken' },
  { name: 'linear-launch', teaches: 'a full launch film: hook, build, proof, payoff, CTA' },
  { name: 'threadcite-open', teaches: 'a numbered how-it-works sequence with staggered cards' },
];

export function examples() {
  return EXAMPLES.filter((e) => fs.existsSync(path.join(repoRoot, 'formats/scene', `${e.name}.json`)));
}

export function example(name) {
  const clean = String(name || '').replace(/[^a-z0-9-]/gi, '');
  const file = path.join(repoRoot, 'formats/scene', `${clean}.json`);
  if (!EXAMPLES.some((e) => e.name === clean) || !fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

/** The full vocabulary, read live from the registries so a count can never lie. */
export async function capabilities() {
  const [{ LOOK_NAMES }, { PRESETS }, { PRESENTATIONS }, { CATALOG }] = await Promise.all([
    import(path.join(repoRoot, 'core/looks.js')),
    import(path.join(repoRoot, 'core/type.js')),
    import(path.join(repoRoot, 'core/cuts.js')),
    import(path.join(repoRoot, 'blocks/catalog.mjs')),
  ]);
  const blocks = CATALOG.filter((e) => !e.overlay);
  const families = [...new Set(blocks.map((e) => e.family))];
  return {
    looks: LOOK_NAMES,
    presets: Object.keys(PRESETS),
    cuts: Object.keys(PRESENTATIONS),
    blockFamilies: families,
    blocks: blocks.map((e) => ({ name: e.name, family: e.family, blurb: e.blurb })),
    knobs: KNOBS,
  };
}
