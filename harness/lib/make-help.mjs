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

// `make help`'s fast path only, brief to rendered film, the stage table's own order (AGENTS.md "THE EIGHT STAGES"); `make list` still prints all 200+, this is the twelve an agent needs first.
export const FAST_PATH = [
  'stage', 'next', 'quiz', 'ideate', 'studio', 'preview', 'dev',
  'probe-frame', 'check', 'ship', 'judge', 'arsenal', 'regen',
];

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

// Every phase named on a target must be one of the ten declared above: a typo'd phase is as silent a failure as no phase at all, and would otherwise just print under its own heading forever.
export function untagged(targets = collectTargets()) {
  return targets.filter((t) => !t.phase || !PHASE_NAMES.has(t.phase));
}

export function printFast(targets = collectTargets()) {
  const byName = new Map(targets.map((t) => [t.name, t]));
  console.log('\n  make <target> [ARGS...]  ·  the fast path, brief to rendered film:\n');
  console.log('  first preview of a brand-new name, no plan yet? make dev D=<file> DRAFT=1\n');
  for (const name of FAST_PATH) {
    const t = byName.get(name);
    console.log(`    ${name.padEnd(14)} ${t ? (t.help || '') : '(missing from Makefile)'}`);
  }
  console.log('\n  everything else: make list\n');
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
    const bad = untagged();
    if (bad.length) {
      console.error(`✗ ${bad.length} Makefile target(s) with no valid ## [phase] tag: ${bad.map((t) => t.name).join(', ')}`);
      process.exit(1);
    }
    console.log(`✓ every Makefile target carries a [phase] tag (${collectTargets().length} total)`);
    process.exit(0);
  }
  if (process.argv.includes('--fast')) printFast();
  else printGrouped();
}
