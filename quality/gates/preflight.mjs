// preflight.mjs: the decisions that belong BEFORE the JSON, as a step that happened.
//
//   node quality/gates/preflight.mjs films/scene/x.json --record  # print the chain, record it
//   node quality/gates/preflight.mjs films/scene/x.json           # did it happen for THIS version?
//
// WHY. CLAUDE.md's authoring ladder numbers "compose from blueprints" and "see the whole arsenal" as
// steps 0 and 0a, and PRINTS them eleventh and twelfth, inside a section called "After writing a JSON".
// Both must happen before one exists. The census says what that costs: the {type:"beat"} mechanism is
// used by 2 of 153 scenes and 12 of 19 beats have zero users, so the instruction has been given for
// months and obeyed twice.
//
// The other half of the same problem is that engine-doctrine/CRAFT/README.md already carries a nine-step decision
// chain (beats, then the anchor, then the per-beat effect, then type/colour/layout, then density, then
// restraint, then sound), each step naming the guide that settles it and what it hands the next step.
// It is good, it is maintained, and an author who never opens it never sees it. A doc cannot make
// itself read; a step can.
//
// WHAT THIS IS NOT. It does not grade the answers, and it must not pretend to. It proves the chain was
// PUT IN FRONT OF SOMEBODY for this version of this scene, which is the same thing `make beats` proves
// about a contact sheet, using the same mechanism (harness/lib/receipt.mjs, stage-agnostic by design).
// Whether the decisions are any good is `make judge` and your eyes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { readReceipt, writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { nearestExemplars } from '../../harness/lib/exemplars.mjs';

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
if (!file) { console.error('usage: node quality/gates/preflight.mjs <scene.json> [--record]'); process.exit(2); }
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
  const F = gateFindings({ scene: file, indent: '  ' });
  F.fail('no-preflight', why, { fix: `make preflight D=${file}`, doc: 'engine-doctrine/CRAFT/README.md' });
  F.emit();
  console.log(`      The chain is nine decisions that each constrain the next, and skipping it is how a film`);
  console.log(`      ends up composed of whatever the author happened to remember. It costs one command:`);
  console.log(`        make preflight D=${file}`);
  console.log(`      read: engine-doctrine/CRAFT/README.md`);
  process.exit(1);
}

// ---- the chain, printed for THIS film ---------------------------------------------------------------
// Parsed out of engine-doctrine/CRAFT/README.md rather than restated. That table is maintained, it is the thing a
// human is told to read, and a second copy here would be the copy that goes stale.
function chain() {
  const p = path.join(repoRoot, 'engine-doctrine/CRAFT/README.md');
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
if (!rows.length) console.log('  (engine-doctrine/CRAFT/README.md has no decision table, so there is no chain to print)');
else {
  console.log(`  THE CHAIN. Each decision constrains the next, so they are made in this order:\n`);
  for (const r of rows) {
    console.log(`   ${r.n.padEnd(3)} ${strip(r.decide)}`);
    console.log(`       load ${strip(r.load)}`);
    console.log(`       ↳ hands on: ${strip(r.hands)}`);
  }
}

// ---- THE NOT LINE, DERIVED --------------------------------------------------------------------------
// AGENTS.md's brief asks for a NOT line "from memory", which excludes whatever the author happens to
// think of. The ledger already knows what recent films actually used (quality/gates/ledger.mjs `not`);
// asking it here, before the JSON is written, turns that memory into a line the author can paste.
{
  const r = spawnSync('node', [path.join(repoRoot, 'quality/gates/ledger.mjs'), 'not', scene.theme || ''],
    { encoding: 'utf8', cwd: repoRoot });
  const out = (r.stdout || '').trim();
  if (out) { console.log(`\n  THE NOT LINE, derived from what recent films already used:\n`); console.log(`   ${out}`); }
}

// ---- WHAT THIS FILM HAS NOT REACHED FOR --------------------------------------------------------
// The chain above says what to decide. This says which capability the film currently declines, and it
// is deliberately NOT a gate: `make check` already carries eight ratcheted codes, and the doctrine is
// that a gate is the last resort. A capability nobody knows exists is a discovery problem, and the
// answer to a discovery problem is to put the thing in front of the author at the moment they are
// deciding, not to refuse the film afterwards.
//
// Each row is a pure function of the scene, and each carries the share of the library in the same
// state, because "you could use depth" is advice and "44 of the 47 films with a camera move have every
// layer at z = 0" is a fact about the house. Re-derive the shares with `make census` and the counters
// beside it; they are quoted, so they go stale, and a stale share is the failure mode this repo logs
// most often.
const flat = (ls) => (ls || []).flatMap((L) => [L, ...flat(L.layers), ...flat(L.children)]);
const ALL = flat(scene.layers);
const REACH = [
  {
    when: () => (scene.camera || scene.cameraMove) && !ALL.some((L) => (L.modifiers || []).some((m) => m && m.plane != null)),
    say: 'DEPTH. This film moves the camera and every layer sits at z = 0, so the whole composition turns as one rigid pane.',
    how: '"depth": "back" on a layer stands it behind the picture plane (far · back · front · near, each a fraction of this film\'s lens). Parallax is a DIFFERENCE of depth and cannot exist while there is only one depth to have.',
    read: 'core/fx/plane.js  ·  make arsenal Q="depth"',
    share: '44 of the 47 films with a camera move are in this state, and 3 of 134 use depth at all.',
  },
  {
    when: () => !Array.isArray(scene.bg) || scene.bg.length <= 1,
    say: 'THE BACKDROP. One window paints the whole runtime, so the ground never turns with the film.',
    how: 'List the windows in the order the film turns and give none of them a from/to: the engine binds window i to the joint after it, so the cuts you already wrote own the numbers.',
    read: 'core/timeline/junctions.js',
    share: '112 of 134 films paint one window for their whole runtime.',
  },
  {
    when: () => scene.audio && scene.audio.silent === true && !scene.audio._why,
    say: 'SILENCE, undeclared. Mute is a device and this film does not say which one.',
    how: '"audio": { "silent": true, "_why": "…" }. The sound bridge, the unfinished sentence and music-led structure are all closed while the track is empty.',
    read: 'engine-doctrine/CRAFT/SOUND.md',
    share: '110 of 134 films ship mute and 13 of the 93 that declare it say why.',
  },
];
const missed = REACH.filter((r) => { try { return r.when(); } catch { return false; } });
if (missed.length) {
  console.log(`\n  NOT REACHED FOR. Each of these is available, costs one line, and this film declines it:\n`);
  for (const r of missed) {
    console.log(`   · ${r.say}`);
    console.log(`       ${r.how}`);
    console.log(`       read ${r.read}  ·  ${r.share}`);
  }
}

// ---- EXEMPLARS TO STUDY -------------------------------------------------------------------------
// The arsenal (below) ranks what the engine CAN do against this film. That answers "what is
// available", never "what does excellent look like". `examples.json`'s goldSet holds the films this
// repo is proudest of; `nearestExemplars` picks the 2-3 whose register is closest to what THIS film
// says it is, so an agent studying it has something to imitate, not only rules to avoid. Retrieval
// lives in harness/lib/exemplars.mjs so `make scaffold` composes from the SAME ranking (one owner).
const feelForExemplars = [scene.note, scene.spectacle && scene.spectacle.of, sb && fs.readFileSync(sb, 'utf8')]
  .filter(Boolean).join(' ');
const gold = nearestExemplars(feelForExemplars, 3);
if (gold.length) {
  console.log(`\n  EXEMPLARS TO STUDY. These are the films to reach toward, not rules to avoid:\n`);
  for (const g of gold) {
    console.log(`   · films/scene/${g.file}, ${g.register || g.teaches}: study it for ${g.teaches}`);
  }
}

// The arsenal, aimed at this film. `make arsenal Q="…"` finds directed motion, so
// listing them all again would be the same non-event. Rank them against what the film SAYS it is.
const feel = [scene.note, scene.spectacle && scene.spectacle.of, sb && fs.readFileSync(sb, 'utf8').slice(0, 600)]
  .filter(Boolean).join(' ');
if (feel.trim()) {
  const r = spawnSync('node', [path.join(repoRoot, 'harness/author/arsenal.mjs'), feel, '--n', '5'],
    { encoding: 'utf8', cwd: repoRoot });
  const out = (r.stdout || '').trim();
  if (out) { console.log(`\n  THE ARSENAL, ranked against what this film says it is:`); console.log(out.split('\n').slice(1).join('\n')); }
} else {
  console.log(`\n  No plan and no note, so the arsenal cannot be aimed at this film.`);
  console.log(`  Write the storyboard first, or search by hand: make arsenal Q="<the feeling>"`);
  // Aimed at nothing, the arsenal is 397 entries and a wall of names is the same non-event as printing
  // none. What is still worth showing with no plan to rank against is the part an author CANNOT have
  // searched for, because it did not exist last time they looked.
  const r = spawnSync('node', [path.join(repoRoot, 'harness/author/arsenal.mjs'), '--new'],
    { encoding: 'utf8', cwd: repoRoot });
  const out = (r.stdout || '').trim();
  if (out) console.log(`\n${out}`);
}

const rec = writeReceipt(STAGE, abs, { file: path.relative(repoRoot, abs), chain: rows.length });
console.log(`\n  ✓ preflight recorded${rec ? ` (${path.relative(repoRoot, receiptPath(STAGE, abs))})` : ''}.`
  + ` It goes stale the moment the scene changes, which is the point.\n`);
