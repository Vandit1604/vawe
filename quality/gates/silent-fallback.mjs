// quality/gates/silent-fallback.mjs: is any named vocabulary still resolved with a silent default?
//
//   node quality/gates/silent-fallback.mjs        ·        make silent-check
//
// WHY THIS IS A CHECK AND NOT FRAMEWORK. `core/registry/registry.js` removes the ability to BUILD a registry with
// a fallback: `pick()` takes no such parameter. What it cannot do is stop somebody writing a fresh plain
// object and indexing it by hand. That part needs a reader.
//
// WHAT IT COST BEFORE IT EXISTED. Nine of these were found and removed in one week (engine-doctrine/MISTAKES.md
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
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCAN = ['core', 'formats/scene'];
const f = gateFindings();

// A lookup indexed by something that looks like a NAME, with a fallback. `[0]`/`[i]`/`[idx]` are
// positional and excluded: an index out of range is not a misspelling.
// `\??\.?` before the bracket, because OPTIONAL CHAINING is the same lookup: `MAP?.[name] || dflt`
// hides exactly the bug this file exists to find. The first cut of this pattern could not match it,
// and three of the waivers below described `o?.[k]` code the gate had therefore never once seen,
// dead entries that made the list look inspected. A check green about what it cannot see is the
// defect this whole run was about, reproduced in the check written to catch it. engine-doctrine/MISTAKES.md #377.
const PATTERN = /\b([A-Za-z_$][\w$]*)\s*\??\.?\s*\[\s*([A-Za-z_$][\w$.?]*)\s*\]\s*(\|\||\?\?)/;
const POSITIONAL = /^(i|j|k|n|idx|index|len|[0-9]+)$/;

// Each waiver states WHY, because an unexplained waiver list becomes the place the next real one hides.
// The same rule quality/gates/arsenal-check.mjs applies to the catalogue.
const WAIVED = new Map(Object.entries({
  // ABSENCE answers, each true about the thing being asked:
  'core/backgrounds.js:_pcache[key]': 'a memo cache keyed by dimensions, not a vocabulary, a miss BUILDS the value',
  'core/backgrounds.js:FX_PARAMS[t]': 'a preset with no declared parameters yields [], "this fx takes no options"',
  'core/backgrounds.js:FX_PARAMS[fx.type]': 'as above, inside applyBgOver',
  'core/generators.js:base[key]': 'an author option bag walked against a declared schema, which generators.js validates separately',
  'core/junctions.js:data[key]': 'marksOf reads cuts/seams/stings off a lowered scene; a film with no seams has no `seams` key, and [] is the true answer',
  'core/knobs.js:fam[preset]': 'a preset with no knobs of its own keeps only the family\'s shared ones',
  'core/looks.js:PASS_READS[passName]': 'a pass that reads no routed argument yields [], and lib-test proves the table against behaviour',
  'core/prop-audit.js:LAYER_PROPS[type]': 'a SPARSE map keyed by layer TYPE: a type declaring no type-scoped props of its own (it reads only the shared set) has no entry, and {} is the true answer. The type NAME cannot be wrong here - core/layers/index.js refuses an unknown type before a layer is ever built',
  'core/captions.js:CAP_STYLE_SHAPE[name]': 'a SPARSE map: only four of the eighteen styles have a non-default shape, so an absent entry IS the answer ({unit:word, mode:line}). The NAME cannot be wrong here. Formats/scene/scene.js:742 throws on an unknown captionStyle before this is reached, and lib-test:992 locks the default in',
  'core/validate.mjs:KNOBS[family]': 'DEBT, not a safe default, and stated so rather than hidden: a family with no manifest entry is not graded AT ALL, which is exactly how `colorWave`, `shimmerWave` and the `globe` three scene escape knob validation while reading real per-preset opts. lib-test:2753 asserts that silence on purpose, because grading them against `_shared` alone would refuse four shipped films for a hole in core/knobs.js. Fix by FILLING THE MANIFEST (then delete this waiver and that assertion), never by widening the fallback',
  'core/tracks/vars.js:v[name]': 'the per-channel map for `vars`; an absent channel falls to the scalar or `*`, by design',
  // ALREADY VALIDATED one call earlier, so the wrong-name case cannot arrive here:
  // WAIVER REMOVED, and the reason it was wrong is worth keeping. It said `corner` is UNREACHABLE
  // from a scene, which was TRUE and not enough: the value comes from a LOOK DEFINITION, our own
  // data, and that is the one place a typo can live forever because no author will ever hit it and
  // report it. `leakGrad` now throws (engine-doctrine/MISTAKES.md #454). Judge a fallback by whether a WRONG
  // value can reach it, never by whether an AUTHOR can send one.
  'core/looks.js:KNOB_ROUTES[knob]': 'the knob was validated by assertKnobs one call earlier',
  'formats/scene/scene.js:SEAM_CUE[s.fx]': 'the seam fx is validated where seams are parsed (#361), and lib-test asserts SEAM_CUE covers every SEAM_FX',
}));

const findings = [];
const hit = new Set();   // which waivers actually matched something this run
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!/\.(js|mjs)$/.test(e.name)) continue;
    if (rel.endsWith('core/registry/registry.js')) continue;     // the primitive itself
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;        // a comment describing the bug is fine
      const m = PATTERN.exec(line);
      if (!m) return;
      const [, map, key] = m;
      if (POSITIONAL.test(key)) return;
      const id = `${rel}:${map}[${key}]`;
      if (WAIVED.has(id)) { hit.add(id); return; }
      findings.push({ id, rel, line: i + 1, code: t.slice(0, 110) });
    });
  }
};
for (const d of SCAN) walk(d);

// A waiver that matches NOTHING is worse than no waiver: it reads as "inspected and cleared" while the
// gate never saw the line at all. Three of these existed here, written for `o?.[k]`, which the first
// pattern could not match, and they are what made a real blind spot look considered. #363.
const stale = [...WAIVED.keys()].filter((k) => !hit.has(k));
for (const k of stale) f.fail('stale-waiver',
  `${k}: waiver matches nothing, it describes code this gate never saw, so it claims an inspection that did not happen`,
  { fix: 'either the code moved (update the key) or the pattern cannot see it (widen the pattern)' });

for (const hit_ of findings) f.fail('silent-fallback',
  `${hit_.rel}:${hit_.line}  ${hit_.code}`,
  { at: `${hit_.rel}:${hit_.line}`,
    fix: 'route it through defineRegistry (core/registry.js) so a wrong name throws, or waive it here WITH A REASON if the key is positional, a cache, or a membership test rather than a vocabulary' });

if (!f.count) console.log(`✓ silent-fallback: no unexplained name-keyed fallback in ${SCAN.join(' / ')}`);
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
