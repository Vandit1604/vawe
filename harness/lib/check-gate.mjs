import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;
const json = () => (env.JSON ? ['--json'] : []);
const stamp = () => (env.STAMP ? ['--stamp'] : []);
const write = () => (env.WRITE ? ['--write'] : []);
const list = () => (env.LIST ? ['--list'] : []);

// name -> the script + args; keep alphabetical, this is the only place the list is kept.
export const GATES = {
  'arsenal-check': () => ['quality/gates/arsenal-check.mjs', ...json()],
  'blocks-audit': () => ['quality/gates/blocks-audit.mjs', ...json()],
  'code-quality': () => ['quality/gates/code-quality.mjs', ...write(), ...json()],
  'consequence-lint': () => ['quality/gates/consequence-lint.mjs', ...write(), ...list(), ...json()],
  'coverage': () => ['quality/gates/coverage.mjs', ...json()],
  'craft-coverage': () => ['quality/gates/craft-coverage.mjs', ...json()],
  'dead-branch': () => ['quality/gates/dead-branch.mjs', ...json()],
  'discovery': () => ['quality/gates/discovery.mjs', ...json()],
  'doc-refs': () => ['quality/gates/doc-refs.mjs', ...json()],
  'docker-check': () => ['quality/gates/docker-context-check.mjs'],
  'docker-context': () => ['quality/gates/docker-context.mjs', ...json()],
  'docs-drift': () => ['quality/gates/docs-drift.mjs', ...json()],
  'feature-audit': () => ['quality/gates/feature-audit.mjs', ...json()],
  'generated-check': () => ['quality/gates/generated-check.mjs', ...write(), ...json()],
  'glyphs-audit': () => ['quality/gates/glyphs-audit.mjs', ...json()],
  'inert-check': () => ['quality/gates/inert-check.mjs', ...json()],
  'judge-census': () => ['quality/gates/ledger.mjs', 'census', ...json()],
  'lint-test': () => ['quality/gates/lint-test.mjs', ...json()],
  'mistakes-check': () => ['quality/gates/mistakes-dupes.mjs', ...json()],
  'no-emdash': () => ['harness/dev/no-emdash.mjs'],
  'output-contract': () => ['quality/gates/output-contract.mjs', ...json(), ...stamp()],
  'prop-probe': () => ['quality/gates/prop-probe.mjs', ...(env.PROP ? [env.PROP] : []), ...json()],
  'provenance': () => ['quality/gates/threshold-provenance.mjs', ...list(), ...stamp(), ...json()],
  'rule-length': () => ['quality/gates/rule-length.mjs', ...list(), ...stamp(), ...json()],
  'rung': () => ['quality/gates/rung.mjs', ...list(), ...stamp(), ...json()],
  'schema-check': () => ['quality/gates/schema-drift.mjs', ...json()],
  'scenes-json': () => ['scripts/site/scenes-json.mjs', ...write()],
  'seo-surface': () => ['quality/gates/seo-surface.mjs', ...json()],
  'sfx-check': () => ['quality/gates/sfx-audit.mjs', ...json()],
  'silent-check': () => ['quality/gates/silent-fallback.mjs', ...json()],
  'sim-audit': () => ['quality/gates/sim-audit.mjs', ...json()],
  'site-counts': () => ['quality/gates/site-counts.mjs', ...json()],
  'skill-check': () => ['quality/gates/skill-check.mjs', ...json()],
  'skill-reach': () => ['quality/gates/skill-reach.mjs', ...json()],
  'unused': () => ['quality/gates/unused.mjs', ...json()],
  'word-action': () => ['quality/gates/word-action.mjs', ...stamp(), ...json()],
};

export function run(name) {
  const build = GATES[name];
  if (!build) {
    console.error(`✗ make check GATE=${name}: no such gate. Known gates:\n  ${Object.keys(GATES).sort().join(' ')}`);
    return 2;
  }
  const [script, ...args] = build();
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { stdio: 'inherit', cwd: ROOT });
  return r.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) { console.error('usage: node harness/lib/check-gate.mjs <gate-name>   ·   make check GATE=<name>'); process.exit(2); }
  process.exit(run(name));
}
