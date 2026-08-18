// scripts/gates/silent-fallback.mjs — is any named vocabulary still resolved with a silent default?
//
//   node scripts/gates/silent-fallback.mjs        ·        make silent-check
//
// WHY THIS IS A CHECK AND NOT FRAMEWORK. `core/registry.js` removes the ability to BUILD a registry with
// a fallback: `pick()` takes no such parameter. What it cannot do is stop somebody writing a fresh plain
// object and indexing it by hand. That part needs a reader.
//
// WHAT IT COST BEFORE IT EXISTED. Nine of these were found and removed in one week (docs/MISTAKES.md
// #354 #355 #360 #361). The most expensive was `vawe-identity.json`, this project's own identity film,
// which set `out:"blur"` on all eighteen of its layers: `blur` is a kinetic preset, the anim that leaves
// through blur is `defocus`, and `ANIM[name] || fade` meant the film's entire exit vocabulary had never
// once played as written. Nothing looked broken. Every frame rendered.
//
// THE RULE. A name-keyed lookup may answer ABSENCE with a documented default. It may not answer a
// WRONG NAME with one. Those are different questions and the whole class of bug is the code that
// answers them both the same way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCAN = ['core', 'formats/scene'];

// A lookup indexed by something that looks like a NAME, with a fallback. `[0]`/`[i]`/`[idx]` are
// positional and excluded: an index out of range is not a misspelling.
const PATTERN = /\b([A-Za-z_$][\w$]*)\s*\[\s*([A-Za-z_$][\w$.?]*)\s*\]\s*(\|\||\?\?)/;
const POSITIONAL = /^(i|j|k|n|idx|index|len|[0-9]+)$/;

// Each waiver states WHY, because an unexplained waiver list becomes the place the next real one hides —
// the same rule scripts/gates/arsenal-check.mjs applies to the catalogue.
const WAIVED = new Map(Object.entries({
  'core/audio-bridges.js:list[i]': 'positional: the i-th bridge in an array the caller already sized',
  'core/backgrounds.js:_pcache[key]': 'a memo cache keyed by dimensions, not a vocabulary — a miss BUILDS the value',
  'core/generators.js:o?.[k]': 'reads an author-supplied option bag against a declared schema; generators.js validates the schema separately',
  'core/generators.js:S.colour.fields[k]': 'as above, inside the same schema walk',
  'core/generators.js:base?.[key]': 'as above',
  'core/layers/vocabulary.js:typeProps[k]': 'a MEMBERSHIP test (`if (typeProps[k]) continue`), not a resolution — an absent key means "not this type\'s prop"',
  'core/lightfield/index.js:table[i]': 'positional: the i-th group in a table the caller built',
  'core/tracks/vars.js:v[name]': 'the per-channel map for `vars`; an absent channel legitimately falls to the scalar or `*`',
  'core/validate.mjs:RENAME[k]': 'a rename map: a key that is NOT renamed keeps its own name, which is the intended answer',
  'core/backgrounds.js:FX_PARAMS[t]': 'a preset with no declared parameters yields [] — "this fx takes no options", a real answer about absence',
  'core/backgrounds.js:FX_PARAMS[fx.type]': 'as above, inside applyBgOver',
  'core/knobs.js:fam[preset]': 'a preset with no knobs of its own yields [] and keeps only the family\'s shared ones',
  'core/looks.js:CORNERS[corner]': 'UNREACHABLE from a scene: `corner` is not a routed lookOpts knob, so assertKnobs already refuses it (#351). Only the in-repo recipes set it, and lib-test resolves every look',
  'core/looks.js:PASS_READS[passName]': 'a pass that reads no routed argument yields [] — absence, and the table is proved against behaviour by lib-test',
  'core/looks.js:KNOB_ROUTES[knob]': 'the knob was already validated by assertKnobs one call earlier; an unrouted knob cannot reach here',
  'formats/scene/scene.js:FX_DUR[spec.name]': 'a duration default for an effect that declares none. The NAME is validated by GSAP_EXIT_REGISTRY.pick immediately above',
  'formats/scene/scene.js:SEAM_CUE[s.fx]': 'the seam fx is validated where seams are parsed (#361), and lib-test asserts SEAM_CUE covers every SEAM_FX ("no silent seam")',
  'core/motion.js:EASINGS[name]': 'resolveEasing substitutes but PRINTS a warning first — announced, not silent (cleared in #355)',
}));

const findings = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!/\.(js|mjs)$/.test(e.name)) continue;
    if (rel.endsWith('core/registry.js')) continue;              // the primitive itself
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;        // a comment describing the bug is fine
      const m = PATTERN.exec(line);
      if (!m) return;
      const [, map, key] = m;
      if (POSITIONAL.test(key)) return;
      const id = `${rel}:${map}[${key}]`;
      if (WAIVED.has(id)) return;
      findings.push({ id, rel, line: i + 1, code: t.slice(0, 110) });
    });
  }
};
for (const d of SCAN) walk(d);

if (!findings.length) {
  console.log(`✓ silent-fallback: no unexplained name-keyed fallback in ${SCAN.join(' / ')}`);
  console.log(`  ${WAIVED.size} waived, each with a reason. A vocabulary resolves through core/registry.js,`);
  console.log('  which refuses a wrong name and keeps the default for an absent one.');
  process.exit(0);
}
console.error(`✗ silent-fallback: ${findings.length} name-keyed lookup(s) with a fallback and no stated reason:\n`);
for (const f of findings) console.error(`    ${f.rel}:${f.line}\n      ${f.code}`);
console.error(`\n  A wrong name must not resolve to a default. Either route it through defineRegistry`);
console.error(`  (core/registry.js) so it throws, or waive it in this file WITH A REASON if the key is`);
console.error('  positional, a cache, or a membership test rather than a vocabulary.');
process.exit(1);
