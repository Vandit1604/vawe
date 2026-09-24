#!/usr/bin/env node
// quality/gates/generated-check.mjs · is every generated file current?
//
// THE FAILURE THIS EXISTS FOR, and it is not hypothetical. `site/lib/arsenal.json` is derived from the
// registries by scripts/site/arsenal-json.mjs. Nobody ran it for weeks. It went 67 items stale and was
// still listing `thud`, a sound cue that had been deleted from the engine, so the website advertised a
// capability that no longer existed and `make arsenal` correctly could not find it. It surfaced only
// because a NEW gate happened to compare the two indexes. Nothing was checking the file itself.
//
// The repo already had this idea twice: `make craft-coverage` fails when the doc index is stale, and
// `make scenes-json` fails when the site's copy of a scene has drifted. Each was written after its own
// incident, each covers one artefact, and a third artefact simply had nobody. So this is the general
// form: run every generator, then ask git whether anything moved. A generator is the definition of
// what the file should contain, so "regenerate and diff" cannot go out of date the way a hand-written
// list of expected outputs would.
//
//   node quality/gates/generated-check.mjs           fail if any generated file is stale
//   node quality/gates/generated-check.mjs --write   regenerate and say what moved, exit 0
//
// It leaves the regenerated files IN PLACE on failure. The fix is then `git add`, not a second command
// to remember, which is the whole complaint that produced this file.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const write = process.argv.includes('--write');
// The printed line is rendered FROM the record (engine-doctrine/MISTAKES.md #401): each `stale` record's summary
// already carries the file/cmd detail a human reads, so the custom renderer prints it verbatim.
const f = gateFindings({ line: (r) => r.summary });

// [label, argv, the paths it owns]. A generator that writes outside its declared paths is a finding in
// itself: the diff below would report it and name a path this table does not list.
const GENERATORS = [
  ['effects catalogue', ['scripts/site/effects-catalog.mjs'],
    ['engine-doctrine/EFFECTS.md', 'site/lib/effects.json', 'site/lib/effects-counts.json', 'site/lib/effects-body.json']],
  ['arsenal index', ['scripts/site/arsenal-json.mjs'],
    ['site/lib/arsenal.json', 'site/lib/blocks.json']],
  ['doc map', ['quality/gates/doc-map.mjs', '--write'],
    ['engine-doctrine/INDEX.md', 'engine-doctrine/CRAFT/README.md']],
  // blocks/catalog/ + registry/ is 216 generated files with its own `--check` mode that nothing ran.
  // It went stale the same way arsenal.json did: block blurbs changed, the tree carried the old
  // `description`, and only an agent regenerating it by hand noticed 110 files were behind. A
  // generated tree with a checker nobody calls is a generated tree with no checker.
  ['registry', ['scripts/site/registry.mjs'], ['blocks/catalog', 'registry']],
  // The sitemap needs the docs URLs, and the site builds BEFORE docs-site exists in the Docker image
  // (see scripts/site/site-pages.mjs). So the list is generated here and committed, and this gate is
  // what stops it drifting the day someone adds or renames a docs page.
  ['site pages', ['scripts/site/site-pages.mjs'], ['site/lib/site-pages.json']],
  // Three pages claimed three different MCP tool counts on the same day (six, ten, four) against a
  // server registering eleven. site/CLAUDE.md's law is that site numbers are never typed; this is how
  // that one stops being typed.
  ['mcp tools', ['scripts/site/mcp-tools.mjs'], ['site/lib/mcp-tools.json']],
  // Reads site/lib/site-pages.json + site/lib/arsenal.json, so it must run after both are current.
  // Not a fix for AI-search visibility on its own (Google's guidance treats llms.txt as ineffective,
  // see scripts/site/llms-txt.mjs's header); registered here so it cannot go stale unnoticed either.
  ['llms.txt', ['scripts/site/llms-txt.mjs'], ['site/public/llms.txt']],
];

const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout || '';
// Only tracked files, and only the ones a generator claims. An untracked build artefact is not drift.
const dirty = (paths) => git('status', '--porcelain', '--', ...paths)
  .split('\n').map((l) => l.slice(3).trim()).filter(Boolean);

console.log('\n  GENERATED · run every generator, then ask git what moved');
const before = new Set(dirty(GENERATORS.flatMap(([, , p]) => p)));
if (before.size) {
  console.log(`  ~ ${before.size} generated file(s) were ALREADY modified before this ran, so they are`);
  console.log(`    excluded from the verdict: ${[...before].join(' ')}`);
}

let stale = [];
for (const [label, argv, paths] of GENERATORS) {
  try {
    execFileSync('node', argv, { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    console.error(`\n  ✗ ${label} (${argv[0]}) failed to run:\n${String(e.stderr || e.message).slice(0, 500)}`);
    process.exit(2);
  }
  const moved = dirty(paths).filter((p) => !before.has(p));
  if (moved.length) stale.push([label, argv[0], moved]);
  console.log(`  ${moved.length ? '✗' : '✓'} ${label.padEnd(18)} ${moved.length ? moved.join(' ') : 'current'}`);
}

if (!stale.length) { console.log('  ✓ every generated file matches its generator\n'); process.exit(0); }
if (write) {
  console.log(`\n  ✓ regenerated ${stale.reduce((n, s) => n + s[2].length, 0)} file(s). Commit them.\n`);
  process.exit(0);
}
for (const [label, cmd, moved] of stale) f.fail('generated-stale', `${label}: ${moved.join(' ')}   (${cmd})`, {
  fix: 'the files have been REGENERATED in place; review and commit them',
  doc: 'engine-doctrine/CRAFT/COMMAND-OUTPUT.md',
});
console.error(`\n  ✗ ${stale.length} generator(s) produce output that differs from what is committed.`);
f.emit();
console.error('\n    A stale generated file is a claim the engine no longer backs. site/lib/arsenal.json');
console.error('    went 67 items behind this way and kept advertising a sound cue that had been deleted.');
console.error('    The files have been REGENERATED in place, so the fix is to review and commit them.\n');
process.exit(1);
