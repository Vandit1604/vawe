#!/usr/bin/env node
// scripts/dev/family-coverage.mjs · does the labeled eval have a plain-English query for every family?
//
// WHY THIS EXISTS. Coverage of the SEARCH is closed: every entry carries a blurb (checkBlurb refuses a
// bare one at load) and the discovery ratchet is at 0. That guarantees a thing is IN the index. It does
// not guarantee the index answers the words a person actually types. The labeled eval in
// quality/gates/lib-test.mjs (PRESENT + PLAIN) is what measures that, and its blind spot is silent: a
// whole FAMILY can have no author-phrased query at all, so nobody ever checks that "a drifting colour
// background" reaches an `aurora`. This lists the families the eval never asks about.
//
// THE STANDING RULE this feeds (discovery.mjs check 5): every SEARCHABLE family must carry at least one
// labeled query that resolves to it confidently, the same way every entry must carry a blurb. A family
// that authors reach for by MECHANISM rather than by describing a look (an easing curve, a blend mode,
// a keyframe handle) is exempt, because there is no plain-English request for it to answer; those are
// still covered per-entry by scripts/dev/blurb-retrieval.mjs (their own words find them).
//
// The eval lives as inline arrays in lib-test.mjs. Importing that module would run the whole suite, so
// the two labeled arrays are read out of its SOURCE. That is a parse, and a parse can rot, so
// `evalWants` asserts it found a plausible number and the gate says so if it finds none.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from '../author/arsenal.mjs';
import { catalogued } from '../../core/registry/registry.js';
import { emitJson } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Families an author reaches for by mechanism or parameter, never by describing a look, so a
// plain-English golden query would be invented rather than real. Exempt from the family gate; still
// covered per-entry by blurb self-retrieval. Kept here, named and reviewable, rather than inferred: the
// judgement "nobody phrases this in prose" is a decision and belongs written down.
export const MECHANISM_NAMED = new Set([
  'easing', 'blend mode', 'icon',                 // also carry catalog `skip`; listed for one source of truth
  'camera dial', 'depth', 'interpolation mode', 'time remap', 'keyframe handle', 'stagger order',
  'effector drive', 'effector falloff', 'scramble charset', 'resample fx',
  // The registries themselves are named 'envelope anchor' / 'shadow direction' (core/lightfield/
  // options.js, defineRegistry's first arg), not 'lightfield envelope anchor' / 'lightfield shadow
  // direction': this set is matched against that exact kind string. The two entries carried the
  // longer, wrong spelling since they were written, invisible until W9's arsenal.mjs fix (core/
  // moved from three hardcoded directories to a real per-package walk) discovered
  // core/lightfield/options.js's registries for the first time and the mismatch finally mattered.
  'envelope anchor', 'envelope shape', 'field motion',
  'lightfield pattern', 'shadow direction',
]);

/** The two labeled arrays in lib-test.mjs, read from source: the (query, want) pairs the eval asserts. */
export function evalWants() {
  const src = fs.readFileSync(path.join(ROOT, 'quality/gates/lib-test.mjs'), 'utf8');
  const block = (marker) => { const i = src.indexOf(marker); if (i < 0) return ''; return src.slice(i, src.indexOf('];', i)); };
  const wants = new Set();
  for (const blk of [block('const PRESENT = ['), block('const PLAIN = ['), block('const FAMILY = [')]) {
    const re = /\[\s*(['"])(?:\\.|(?!\1).)*\1\s*,\s*(['"])((?:\\.|(?!\2).)*)\2\s*\]/g;
    let m; while ((m = re.exec(blk))) wants.add(m[3]);
  }
  return wants;
}

/** covered / uncovered / exempt families, from the live corpus and the live eval. */
export async function familyCoverage() {
  const all = await collect();
  // A name maps to EVERY family that has it, not the first one seen. `breathe` is an idle preset AND a
  // gsap effect, `fade` lives in four families: crediting only the first-seen would leave a family with
  // its own labeled query reported as uncovered, because a sibling family shares the entry's name. A
  // family is covered when one of ITS entries' names is a confident eval target, whichever else shares it.
  const kindsOf = new Map();
  const sizes = new Map();
  for (const e of all) {
    if (!kindsOf.has(e.name)) kindsOf.set(e.name, new Set());
    kindsOf.get(e.name).add(e.kind);
    sizes.set(e.kind, (sizes.get(e.kind) || 0) + 1);
  }
  // catalog `skip` is the other, code-owned half of the exemption (a self-describing family).
  const skip = new Set();
  for (const r of catalogued()) if (r.catalog && r.catalog.skip) skip.add(r.catalog.register || r.kind);
  const exempt = new Set([...MECHANISM_NAMED, ...skip]);

  const wants = evalWants();
  const covered = new Set();
  for (const w of wants) { const ks = kindsOf.get(w); if (ks) for (const k of ks) covered.add(k); }

  const families = [...sizes.keys()].sort();
  const uncovered = families.filter((k) => !covered.has(k) && !exempt.has(k)).map((k) => ({ family: k, size: sizes.get(k) }));
  return { families, covered, exempt, uncovered, sizes, wantCount: wants.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { families, covered, exempt, uncovered, wantCount } = await familyCoverage();

  if (process.argv.includes('--json')) {
    emitJson({
      families: families.length,
      wantCount,
      covered: [...covered].sort(),
      exempt: [...exempt].filter((k) => families.includes(k)).sort(),
      uncovered,
      ok: uncovered.length === 0,
    });
    process.exit(uncovered.length ? 1 : 0);
  }

  console.log(`\n  FAMILY COVERAGE · ${families.length} families · ${wantCount} labeled queries read from lib-test\n`);
  if (!wantCount) console.log('  ⚠ read ZERO queries from lib-test.mjs: the PRESENT/PLAIN parse has rotted.\n');
  console.log(`  covered by a golden query: ${covered.size}`);
  console.log(`  exempt (reached by mechanism, not description): ${[...exempt].filter((k) => families.includes(k)).length}`);
  if (uncovered.length) {
    console.log(`\n  ${uncovered.length} SEARCHABLE families with NO author-phrased query in the eval:`);
    for (const { family, size } of uncovered) console.log(`    ${family.padEnd(28)} ${size}`);
    console.log('\n  Each needs one plain-English query in PRESENT/PLAIN (quality/gates/lib-test.mjs) that');
    console.log('  resolves to it confidently. Fix a miss with `aka` at the write site, never by rewording.\n');
    process.exit(1);
  }
  console.log('\n  ✓ every searchable family is asked for in the eval\n');
}
