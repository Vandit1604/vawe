// preflight.mjs: the decisions that belong BEFORE the JSON, as a step that happened.
//
//   node scripts/gates/preflight.mjs formats/scene/x.json --record  # print the chain, record it
//   node scripts/gates/preflight.mjs formats/scene/x.json           # did it happen for THIS version?
//
// WHY. CLAUDE.md's authoring ladder numbers "compose from blueprints" and "see the whole arsenal" as
// steps 0 and 0a, and PRINTS them eleventh and twelfth, inside a section called "After writing a JSON".
// Both must happen before one exists. The census says what that costs: the {type:"beat"} mechanism is
// used by 2 of 153 scenes and 12 of 19 beats have zero users, so the instruction has been given for
// months and obeyed twice.
//
// The other half of the same problem is that docs/CRAFT/README.md already carries a nine-step decision
// chain (beats, then the anchor, then the per-beat effect, then type/colour/layout, then density, then
// restraint, then sound), each step naming the guide that settles it and what it hands the next step.
// It is good, it is maintained, and an author who never opens it never sees it. A doc cannot make
// itself read; a step can.
//
// WHAT THIS IS NOT. It does not grade the answers, and it must not pretend to. It proves the chain was
// PUT IN FRONT OF SOMEBODY for this version of this scene, which is the same thing `make beats` proves
// about a contact sheet, using the same mechanism (scripts/lib/receipt.mjs, stage-agnostic by design).
// Whether the decisions are any good is `make judge` and your eyes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readReceipt, writeReceipt, receiptPath } from '../lib/receipt.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGE = 'preflight';

// READ-ONLY BY DEFAULT, and this is load-bearing rather than a preference. The ratchet runs a gate over
// the whole library to find out which films fail it (`codeFiresOn`), and it invokes it with the scene
// path and nothing else. The first cut of this file WROTE on that invocation, so adopting the rule
// certified all 134 films as having been through a chain none of them had seen, and reported "0
// grandfathered" because nothing could fail any more. A checker that certifies by accident is worse
// than no checker. So recording is explicit, and any tool that runs this the obvious way gets the
// harmless half.
const file = process.argv.find((a) => a.endsWith('.json'));
const record = process.argv.includes('--record');
const check = !record;
if (!file) { console.error('usage: node scripts/gates/preflight.mjs <scene.json> [--record]'); process.exit(2); }
const abs = path.resolve(repoRoot, file);
if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

let scene; try { scene = JSON.parse(fs.readFileSync(abs, 'utf8')); }
catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(2); }

// ---- --check: the gate half -----------------------------------------------------------------------
if (check) {
  const r = readReceipt(STAGE, abs);
  if (r.exists && !r.stale) { console.log(`  ✓ preflight ran for this version (${r.rel}).`); process.exit(0); }
  const why = r.stale
    ? `the scene has CHANGED since the preflight was run. The decisions were made against an older cut of this film.`
    : `this scene has never been through the decision chain.`;
  console.log(`  ✗ [no-preflight] ${why}`);
  console.log(`      The chain is nine decisions that each constrain the next, and skipping it is how a film`);
  console.log(`      ends up composed of whatever the author happened to remember. It costs one command:`);
  console.log(`        make preflight D=${file}`);
  console.log(`      read: docs/CRAFT/README.md`);
  process.exit(1);
}

// ---- the chain, printed for THIS film ---------------------------------------------------------------
// Parsed out of docs/CRAFT/README.md rather than restated. That table is maintained, it is the thing a
// human is told to read, and a second copy here would be the copy that goes stale.
function chain() {
  const p = path.join(repoRoot, 'docs/CRAFT/README.md');
  if (!fs.existsSync(p)) return [];
  const rows = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\|\s*(\d+[a-z]?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (m && m[1] !== '#') rows.push({ n: m[1], decide: m[2], load: m[3], hands: m[4] });
  }
  return rows;
}

const strip = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '');
const name = path.basename(file, '.json');
const sb = ['storyboard', 'lock'].map((k) => path.join(path.dirname(abs), `${name}.${k}.md`)).find((p) => fs.existsSync(p));

console.log(`\n  PREFLIGHT · ${file}`);
console.log(`  ${scene.duration || '?'}s · theme ${scene.theme || '?'} · ${(scene.layers || []).length} layer(s)`
  + ` · plan: ${sb ? path.relative(repoRoot, sb) : 'NONE'}\n`);

const rows = chain();
if (!rows.length) console.log('  (docs/CRAFT/README.md has no decision table, so there is no chain to print)');
else {
  console.log(`  THE CHAIN. Each decision constrains the next, so they are made in this order:\n`);
  for (const r of rows) {
    console.log(`   ${r.n.padEnd(3)} ${strip(r.decide)}`);
    console.log(`       load ${strip(r.load)}`);
    console.log(`       ↳ hands on: ${strip(r.hands)}`);
  }
}

// The arsenal, aimed at this film. `make blueprints` lists 19 beats and 12 have never been used, so
// listing them all again would be the same non-event. Rank them against what the film SAYS it is.
const feel = [scene.note, scene.spectacle && scene.spectacle.of, sb && fs.readFileSync(sb, 'utf8').slice(0, 600)]
  .filter(Boolean).join(' ');
if (feel.trim()) {
  const r = spawnSync('node', [path.join(repoRoot, 'scripts/author/arsenal.mjs'), feel, '--n', '5'],
    { encoding: 'utf8', cwd: repoRoot });
  const out = (r.stdout || '').trim();
  if (out) { console.log(`\n  THE ARSENAL, ranked against what this film says it is:`); console.log(out.split('\n').slice(1).join('\n')); }
} else {
  console.log(`\n  No plan and no note, so the arsenal cannot be aimed at this film.`);
  console.log(`  Write the storyboard first, or search by hand: make arsenal Q="<the feeling>"`);
}

const rec = writeReceipt(STAGE, abs, { file: path.relative(repoRoot, abs), chain: rows.length });
console.log(`\n  ✓ preflight recorded${rec ? ` (${path.relative(repoRoot, receiptPath(STAGE, abs))})` : ''}.`
  + ` It goes stale the moment the scene changes, which is the point.\n`);
