// make-help.mjs: `make list` and `make help` read straight from the Makefile itself, so this can
// never drift from the real target list the way a hand-kept catalog would (this repo has already
// paid for that mistake more than once - see engine-doctrine/MISTAKES.md on generated artefacts nobody re-ran).
//
// W11: 207 targets, no way to see which of ten PHASES a target belongs to, and seven separate
// discovery commands for one question ("what can I search for"). This is the phase half: every real
// target line in the Makefile carries a `## [phase] one-line help` comment (the convention this file
// reads), and `make list` prints them grouped instead of the Go binary's `--list` (moved to `make
// formats`). `make lib-test` imports `untagged()` below so a new target with no phase fails the build,
// the way `checkBlurb` refuses an entry with no blurb: the ratchet holds at the write site, not a gate
// that runs later and only promises to notice.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const PHASES = [
  ['preflight', 'the decisions that belong BEFORE the JSON'],
  ['dev', 'the iteration loop: author and look at a scene'],
  ['check', 'gate a scene, zero or blocking consequence'],
  ['ship', 'render for real'],
  ['judge', 'the eye, mandatory post-render'],
  ['ledger', 'cross-video memory: has this look shipped before'],
  ['study', 'reference material and the film-history record'],
  ['engine', 'the render engine and its vocabulary, not one film'],
  ['site', 'what vawe.dev publishes'],
  ['maintenance', "the repo's own health, not any one film"],
];
const PHASE_NAMES = new Set(PHASES.map(([p]) => p));

// A real target line: `name:` (not `name:=`) at column 0, not a recipe line (tab-indented) and not
// `.PHONY`. Matches the same shape the W11 tagging pass wrote, so this is the read side of one
// convention rather than a second, looser parser that could disagree with it.
const TARGET_RE = /^([A-Za-z][A-Za-z0-9_.-]*)\s*:(?!=)(.*)$/;
const TAG_RE = /##\s*\[(\w+)\]\s*(.*)$/;

export function collectTargets(makefilePath = path.join(repoRoot, 'Makefile')) {
  const lines = fs.readFileSync(makefilePath, 'utf8').split('\n');
  const targets = [];
  for (const line of lines) {
    if (line.startsWith('\t')) continue;
    const m = line.match(TARGET_RE);
    if (!m || m[1] === 'PHONY') continue;
    const tag = m[2].match(TAG_RE);
    targets.push({
      name: m[1],
      phase: tag ? tag[1] : null,
      help: tag ? tag[2].trim() : null,
    });
  }
  return targets;
}

// Every phase named on a target must be one of the ten declared above: a typo'd phase is as silent a
// failure as no phase at all, and would otherwise just print under its own heading forever.
export function untagged(targets = collectTargets()) {
  return targets.filter((t) => !t.phase || !PHASE_NAMES.has(t.phase));
}

export function printGrouped(targets = collectTargets()) {
  console.log('\n  make <target> [ARGS...]  ·  the spine, in order:\n');
  console.log(`  ${PHASES.map(([p]) => p).join(' → ')}\n`);
  const byPhase = new Map(PHASES.map(([p]) => [p, []]));
  for (const t of targets) if (byPhase.has(t.phase)) byPhase.get(t.phase).push(t);
  for (const [phase, blurb] of PHASES) {
    const rows = byPhase.get(phase).sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) continue;
    console.log(`  ${phase.toUpperCase()}  ·  ${blurb}`);
    for (const t of rows) console.log(`    ${t.name.padEnd(20)} ${t.help || ''}`);
    console.log('');
  }
  const bad = untagged(targets);
  if (bad.length) {
    console.log(`  ${bad.length} target(s) carry no valid [phase] tag (make lib-test fails on this):`);
    console.log(`    ${bad.map((t) => t.name).join(', ')}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    // The phase-coverage half of `make lib-test` (W11): a target with no phase, or a phase not in
    // the declared ten, fails the build instead of quietly missing from `make list` forever.
    const bad = untagged();
    if (bad.length) {
      console.error(`✗ ${bad.length} Makefile target(s) with no valid ## [phase] tag: ${bad.map((t) => t.name).join(', ')}`);
      process.exit(1);
    }
    console.log(`✓ every Makefile target carries a [phase] tag (${collectTargets().length} total)`);
    process.exit(0);
  }
  printGrouped();
}
