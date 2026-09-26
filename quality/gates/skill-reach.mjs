// quality/gates/skill-reach.mjs: is every skills/*/SKILL.md actually ROUTED to, by something an
// agent reads before it would need it?
//
//   node quality/gates/skill-reach.mjs      ·   make check GATE=skill-reach
//
// WHY THIS EXISTS. `make check GATE=doc-refs` checks that a doc link resolves; `make check GATE=discovery` checks that a
// registry entry can be found through the search corpus. Neither checked whether a SKILL could be
// found at all. `vawe-review-loop` carried the judge loop's stopping rule (STOP-done ·
// STOP-converged · STOP-hand-it-back) and nothing pointed at it: not AGENTS.md's skill router table,
// not `engine-doctrine/CRAFT/ROUTING.md`, not another skill. A skill nobody routes to is a skill
// nobody loads, which for Claude Code (autoloaded only by description match) or a by-hand reader
// (who opens a doc only when something told them to) is the same failure as not having written it.
//
// WHAT COUNTS AS ROUTED. AGENTS.md, `engine-doctrine/CRAFT/ROUTING.md`, the Makefile, or another
// skill's SKILL.md naming the skill's directory. `engine-doctrine/INDEX.md` and
// `skills/vawe-docs/SKILL.md` do NOT count: both are GENERATED, mechanically listing every skill
// under `CRAFT_ALSO` in `doc-map.mjs` regardless of whether an agent is ever told to open it, so a
// skill would show up there even freshly written and unrouted. Counting them would make this gate
// unable to ever fail, which is the same silent gap `make check GATE=discovery` closed for registries that only
// the catalogue, never the search corpus, could see.
//
// Pure: reads files, no render, no network.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Generated, so a skill named only here has been indexed, not routed. Named explicitly rather than
// derived, so a future generated view has to be added here on purpose, not discovered by surprise.
const PURE_INDEX = new Set(['engine-doctrine/INDEX.md']);

const read = (root, rel) => {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
};

/** Every skills/<dir>/SKILL.md, as {dir, file}. Discovered from the tree, never listed, so a skill
 *  added tomorrow is in scope tomorrow. `git ls-files` when the root is a git repo (the real
 *  library, where an untracked draft skill should not yet be judged); a plain directory walk
 *  otherwise, which is what lets a test point this at a bare fixture tree with no .git of its own. */
function skills(root) {
  if (fs.existsSync(path.join(root, '.git'))) {
    const ls = cp.execSync("git ls-files 'skills/*/SKILL.md'", { cwd: root }).toString().trim();
    return (ls ? ls.split('\n') : []).map((file) => ({ dir: file.split('/')[1], file }));
  }
  const dirs = fs.existsSync(path.join(root, 'skills')) ? fs.readdirSync(path.join(root, 'skills')) : [];
  return dirs
    .filter((dir) => fs.existsSync(path.join(root, 'skills', dir, 'SKILL.md')))
    .map((dir) => ({ dir, file: `skills/${dir}/SKILL.md` }));
}

/** run({root}) -> {total, unrouted}. `root` defaults to this repo, and is the injection point a test
 *  uses to point the gate at a small fixture tree instead of the real 18-skill library. */
export function run({ root = ROOT } = {}) {
  const all = skills(root);
  // The search surface: AGENTS.md, the routing table, the Makefile, and every skill's own SKILL.md
  // (including the generated ones, so PURE_INDEX below is what excludes their hits, not their
  // absence from this list).
  const sources = [
    'AGENTS.md',
    'engine-doctrine/CRAFT/ROUTING.md',
    'engine-doctrine/INDEX.md',
    'Makefile',
    ...all.map((s) => s.file),
  ];
  const text = new Map(sources.map((rel) => [rel, read(root, rel)]));

  const unrouted = [];
  for (const { dir, file } of all) {
    const NAME = new RegExp(`\\b${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const hits = sources.filter((rel) => rel !== file && NAME.test(text.get(rel)));
    const real = hits.filter((rel) => !PURE_INDEX.has(rel));
    if (!real.length) unrouted.push({ dir, file, hits });
  }
  return { total: all.length, unrouted };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { total, unrouted } = run();
  const f = gateFindings();
  console.log(`── skill reach · ${total} skill(s)\n`);
  if (!unrouted.length) console.log('✓ every skill is routed from AGENTS.md, engine-doctrine/CRAFT/ROUTING.md, the Makefile, or another skill');
  for (const u of unrouted) {
    const seenOnly = u.hits.length ? ` (named only in ${u.hits.join(', ')}, a generated index, not a router)` : '';
    const msg = `${u.dir}: nothing routes to it${seenOnly}. Add it to AGENTS.md's skill router table or engine-doctrine/CRAFT/ROUTING.md, or name it from the skill that should hand off to it.`;
    console.log(`   ✗ ${u.file}  ${msg}`);
    f.fail('skill-unrouted', msg, { at: u.file });
  }
  if (unrouted.length) {
    console.log(`\n✗ ${unrouted.length} skill(s) nothing points at. A skill nobody routes to is a skill nobody loads.`);
  }
  process.exit(unrouted.length ? 1 : 0);
}
