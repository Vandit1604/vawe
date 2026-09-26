#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from '../author/arsenal.mjs';
import { catalogued } from '../../core/registry/registry.js';
import { emitJson } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const MECHANISM_NAMED = new Set([
  'easing', 'blend mode', 'icon',                 // also carry catalog `skip`; listed for one source of truth
  'camera dial', 'depth', 'interpolation mode', 'time remap', 'keyframe handle', 'stagger order',
  'effector drive', 'effector falloff', 'scramble charset', 'resample fx',
  'envelope anchor', 'envelope shape', 'field motion',
  'lightfield pattern', 'shadow direction',
]);

/** The two labeled arrays in lib-test.authoring.test.mjs, read from source: the (query, want) pairs the eval asserts. */
export function evalWants() {
  const src = fs.readFileSync(path.join(ROOT, 'tests/authoring/lib-test.authoring.test.mjs'), 'utf8');
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
  const kindsOf = new Map();
  const sizes = new Map();
  for (const e of all) {
    if (!kindsOf.has(e.name)) kindsOf.set(e.name, new Set());
    kindsOf.get(e.name).add(e.kind);
    sizes.set(e.kind, (sizes.get(e.kind) || 0) + 1);
  }
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
  if (!wantCount) console.log('  ⚠ read ZERO queries from lib-test.authoring.test.mjs: the PRESENT/PLAIN parse has rotted.\n');
  console.log(`  covered by a golden query: ${covered.size}`);
  console.log(`  exempt (reached by mechanism, not description): ${[...exempt].filter((k) => families.includes(k)).length}`);
  if (uncovered.length) {
    console.log(`\n  ${uncovered.length} SEARCHABLE families with NO author-phrased query in the eval:`);
    for (const { family, size } of uncovered) console.log(`    ${family.padEnd(28)} ${size}`);
    console.log('\n  Each needs one plain-English query in PRESENT/PLAIN (tests/authoring/lib-test.authoring.test.mjs) that');
    console.log('  resolves to it confidently. Fix a miss with `aka` at the write site, never by rewording.\n');
    process.exit(1);
  }
  console.log('\n  ✓ every searchable family is asked for in the eval\n');
}
