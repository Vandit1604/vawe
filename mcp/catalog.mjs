// mcp/catalog.mjs. Read-only introspection: worked examples to learn from, and the full block +
// effect vocabulary. Nothing here fetches or writes; it reads the engine's own registries so the
// numbers can never drift from what actually ships.
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './pipeline.mjs';
import { KNOBS } from '../core/registry/knobs.js';

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

// WHAT IS IN HERE, for the tool DESCRIPTION rather than the tool's reply.
//
// A calling model sees every tool's description before it calls anything, and sees a tool's OUTPUT only
// if it decides to call it. So a description that says what a tool IS ("the full vocabulary") tells a
// model nothing about whether it is worth opening, and a model that never opens it authors as though
// the engine had none of this. That is the discovery failure this repo spent a day on, in the one place
// where the reader is a model rather than a person.
//
// Read from site/lib/effects.json, which `make effects` generates from the registries and
// `effects-json --check` verifies, so this cannot drift into a promise the engine does not keep. If the
// file is missing (a fresh clone before `make effects`), return null and the description falls back to
// its static sentence rather than inventing a number.
export function inventory() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(repoRoot, 'site/lib/effects.json'), 'utf8'));
    const top = [...d.list].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 6)
      .map((f) => `${f.count} ${f.title.toLowerCase()}`);
    return { total: d.total, families: d.families, top };
  } catch { return null; }
}

/** The full vocabulary, read live from the registries so a count can never lie. */
export async function capabilities() {
  const [{ LOOK_NAMES }, { PRESETS, PRESET_BLURBS }, { PRESENTATIONS, CUT_BLURBS }, { registersOf }, { CATALOG },
    { SHADER_FX }, { SEAM_FX, SEAM_BLURBS }, { ANIM_NAMES, ANIM_BLURBS },
    { GSAP_FX, EXIT_FX, GSAP_BLURBS, GSAP_EXIT_BLURBS }] = await Promise.all([
    import(path.join(repoRoot, 'core/looks/index.js')),
    import(path.join(repoRoot, 'core/type/type.js')),
    import(path.join(repoRoot, 'core/cuts/index.js')),
    import(path.join(repoRoot, 'quality/gates/craft-coverage.mjs')),
    import(path.join(repoRoot, 'blocks/catalog.mjs')),
    import(path.join(repoRoot, 'core/stings/index.js')),
    import(path.join(repoRoot, 'core/timeline/seams.js')),
    import(path.join(repoRoot, 'core/timeline/clips.js')),
    import(path.join(repoRoot, 'core/engine/gsap-effects.js')),
  ]);
  // A look's meaning is its REGISTER (the era it evokes), which is what an author picks between, and it
  // is already complete and gated in engine-doctrine/CRAFT/SELECTION.md §4.
  const REGISTERS = registersOf(fs.readFileSync(path.join(repoRoot, 'engine-doctrine/CRAFT/SELECTION.md'), 'utf8'));
  const blocks = CATALOG.filter((e) => !e.overlay);
  const families = [...new Set(blocks.map((e) => e.family))];
  // Names WITH their meanings. These three crossed the wire as bare strings while `blocks` right below
  // them carried a `blurb`, so a client learned what a block was and never what a look, a preset or a cut
  // is. The descriptions exist now (each beside its own registry), so shipping the name alone is a choice
  // to withhold them.
  return {
    looks: LOOK_NAMES.map((n) => ({ name: n, blurb: REGISTERS.look[n] || null })),
    presets: Object.keys(PRESETS).map((n) => ({ name: n, blurb: PRESET_BLURBS[n] || null })),
    cuts: Object.keys(PRESENTATIONS).map((n) => ({ name: n, blurb: CUT_BLURBS[n] || null })),
    // The rest of the transition and entrance vocabulary, which was still going over as nothing at all.
    // A caller choosing between `whipPan` and `crossWarp`, or between `rise` and `defocus`, had the names
    // and no way to tell them apart, so it picked by the sound of the word.
    stings: SHADER_FX.map((n) => ({ name: n, blurb: REGISTERS.sting[n] || null })),
    seams: SEAM_FX.map((n) => ({ name: n, blurb: SEAM_BLURBS[n] || null })),
    anims: ANIM_NAMES.map((n) => ({ name: n, blurb: ANIM_BLURBS[n] || null })),
    gsap: GSAP_FX.map((n) => ({ name: n, blurb: GSAP_BLURBS[n] || null })),
    gsapExits: EXIT_FX.map((n) => ({ name: n, blurb: GSAP_EXIT_BLURBS[n] || null })),
    blockFamilies: families,
    blocks: blocks.map((e) => ({ name: e.name, family: e.family, blurb: e.blurb })),
    knobs: KNOBS,
  };
}
