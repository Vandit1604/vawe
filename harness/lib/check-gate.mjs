// `vawe check <name> [args]`: runs one gate. This table is the only list of gates; the args after the
// name go to the gate script unchanged (a page path, --json, --stamp).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { closest } from '../cli/parse.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const GATES = {
  'anim-traps': 'quality/gates/anim-traps.mjs',
  'code-quality': 'quality/gates/code-quality.mjs',
  'doc-refs': 'quality/gates/doc-refs.mjs',
  'impeccable': 'skills/impeccable/scripts/detect.mjs',
  'mistakes-check': 'quality/gates/mistakes-dupes.mjs',
  'no-emdash': 'harness/dev/no-emdash.mjs',
  'page-check': 'quality/gates/page-check.mjs',
  'provenance': 'quality/gates/threshold-provenance.mjs',
  'rule-length': 'quality/gates/rule-length.mjs',
  'seo-surface': 'quality/gates/seo-surface.mjs',
  'skill-reach': 'quality/gates/skill-reach.mjs',
};

export function run(name, args = []) {
  const script = GATES[name];
  if (!script) {
    const guess = closest(name, Object.keys(GATES));
    console.error(`vawe check: unknown gate ${name}; valid: ${Object.keys(GATES).join(' ')}${guess ? `; did you mean ${guess}?` : ''}`);
    return 2;
  }
  // Node's default 1 MiB capture limit killed gates with long output and hid the cause.
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: 'utf8', cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const status = r.status ?? 1;
  if (!args.includes('--json')) {
    const failing = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => l.includes('✗'));
    console.log(status === 0
      ? `✓ ${name}: passed`
      : `✗ ${name}: ${failing.length || 1} failed: ${(failing[0] || (r.error ? `could not run: ${r.error.message}` : `exited ${status}`)).trim()}`);
  }
  return status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [name, ...args] = process.argv.slice(2);
  if (!name) {
    console.log(`gates: ${Object.keys(GATES).join(' ')}`);
    process.exit(0);
  }
  process.exit(run(name, args));
}
