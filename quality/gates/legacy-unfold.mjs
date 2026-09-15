#!/usr/bin/env node
// quality/gates/legacy-unfold.mjs · UN-fold the 562 machine-written `legacy:` waivers that
// legacy-fold.mjs wrote into individual scenes, replacing them with ONE ratchet number per code.
//
// WHY. legacy-fold.mjs solved "the manifest and the scene waiver are two systems" by writing the
// manifest's rows into `authoring.allow` + `_why` as `"legacy: grandfathered <date>, adopted <date>
// (...)"`. That satisfied author-check's 12-character `_why` floor 562 times without a person ever
// arguing for the break. The rule (a waiver needs a reason) is real; the reason it accepted was not
// one. 728 waiver entries across 174 films, 562 of them this boilerplate, is not 562 decisions. It is
// one script's decision, repeated, and invisible as a bulk number until counted directly.
//
// This script counts them, checks which ones still genuinely fire (`codeFiresOn`, the same check
// legacy-fold used to decide whether to write the row), deletes the boilerplate entries from every
// scene, and stamps the live-fire count into `quality/baselines/legacy-waiver-ratchet.json`, one
// number per code. The debt does not disappear: it becomes VISIBLE, and the number may only fall
// (`--stamp` lowers it when a film actually gets fixed; `quality/gates/waiver-drift.mjs --ratchet`
// fails if it climbs back up).
//
// A human-written `_why` (anything not starting with `legacy:`) is a decision and is left untouched.
//
//   node quality/gates/legacy-unfold.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY } from '../../harness/lib/census.mjs';
import { codesEmitted } from '../../harness/lib/finding-codes.mjs';
import { codeFiresOn } from '../../harness/lib/code-fires.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENE_DIR = path.join(repoRoot, 'films', 'scene');
const RATCHET = path.join(repoRoot, 'quality/baselines/legacy-waiver-ratchet.json');
const dryRun = process.argv.includes('--dry-run');

// Preserve the file's own indent rather than force a fixed one, same reasoning as legacy-fold.mjs.
function indentOf(raw) {
  const m = raw.match(/^\{\r?\n(\s+)\S/);
  return m ? m[1] : '  ';
}

// Codes no gate emits any more (waiver-drift.mjs's own RETIRED map). A waiver for one of these is
// dead weight regardless of who wrote the `_why`, so it is deleted here too, not just tallied.
const RETIRED = new Set(['no-visual-vocabulary', 'graphics-thin', 'text-only-beat', 'no-plan-for-craft']);

const emitted = codesEmitted();
const pop = population('legacy-unfold', { filter: LIBRARY, quiet: true });

let filmsTouched = 0, entriesRemoved = 0, deadRemoved = 0;
const liveFires = new Map();   // code -> count of scenes where it STILL fires (real debt)
const nowFixed = new Map();    // code -> count of scenes where it no longer fires (waiver was stale)

for (const name of pop.names) {
  const file = path.join(SCENE_DIR, name);
  const raw = fs.readFileSync(file, 'utf8');
  let d;
  try { d = JSON.parse(raw); } catch { continue; }
  const allow = d.authoring?.allow;
  const why = d.authoring?._why || {};
  if (!Array.isArray(allow) || !allow.length) continue;

  const keep = [];
  let changed = false;
  for (const code of allow) {
    if (RETIRED.has(code)) {
      changed = true; deadRemoved++; delete why[code];
      continue;
    }
    const reason = typeof why[code] === 'string' ? why[code] : '';
    if (reason.startsWith('legacy:')) {
      changed = true; entriesRemoved++; delete why[code];
      const stillFires = emitted.has(code) && codeFiresOn(code, file, d);
      const bucket = stillFires ? liveFires : nowFixed;
      bucket.set(code, (bucket.get(code) || 0) + 1);
      continue;
    }
    keep.push(code); // dead-not-in-RETIRED-but-also-not-legacy still passes through untouched here
  }
  if (!changed) continue;
  filmsTouched++;
  if (keep.length) d.authoring.allow = keep;
  else { delete d.authoring.allow; }
  if (d.authoring && Object.keys(why).length) d.authoring._why = why;
  else if (d.authoring) delete d.authoring._why;
  if (d.authoring && !Object.keys(d.authoring).length) delete d.authoring;
  if (!dryRun) {
    const hadTrailingNewline = raw.endsWith('\n');
    fs.writeFileSync(file, JSON.stringify(d, null, indentOf(raw)) + (hadTrailingNewline ? '\n' : ''));
  }
}

console.log(`legacy-unfold: ${filmsTouched} scene(s) touched${dryRun ? ' (dry run)' : ''}.`);
console.log(`  ${entriesRemoved} legacy: waiver entrie(s) removed.`);
console.log(`  ${deadRemoved} dead-code waiver entrie(s) removed (RETIRED: ${[...RETIRED].join(', ')}).`);

const codes = new Set([...liveFires.keys(), ...nowFixed.keys()]);
console.log('\n  code                            still fires   now fixed');
for (const c of [...codes].sort()) {
  console.log(`  ${c.padEnd(30)} ${String(liveFires.get(c) || 0).padEnd(13)} ${nowFixed.get(c) || 0}`);
}

// A MIGRATION WITH NOTHING TO MIGRATE MUST NOT TOUCH THE BASELINE. `liveFires` only grows when this
// run deletes a waiver, so once the migration has happened a second run counts zero and would stamp
// `{}`, wiping the debt to nothing and letting every future violation pass. That is the same silent
// shape this whole pass exists to remove, so it is refused here rather than checked somewhere else.
if (!dryRun && !entriesRemoved && !deadRemoved) {
  console.log('\n  nothing to unfold: no `legacy:` waiver is left in any scene.');
  console.log(`  The ratchet is left exactly as it is. It records the debt the migration exposed,`);
  console.log(`  and this script cannot re-derive it: it counts what it deletes, and there is nothing`);
  console.log(`  left to delete. Lower it with quality/gates/waiver-drift.mjs, which measures instead.`);
  process.exit(0);
}

const ratchet = Object.fromEntries([...liveFires.entries()].sort());
if (!dryRun) {
  fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
  fs.writeFileSync(RATCHET, `${JSON.stringify(ratchet, null, 1)}\n`);
  console.log(`\n  ratchet stamped: ${path.relative(repoRoot, RATCHET)}`);
} else {
  console.log(`\n  (dry run: ratchet not written) would stamp:`);
  console.log(JSON.stringify(ratchet, null, 1));
}
