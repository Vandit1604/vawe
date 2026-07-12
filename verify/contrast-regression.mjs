// contrast-regression.mjs — proves the layout audit CATCHES accent-<b>-on-accent-bg (the blue-on-blue
// bug that shipped once: emphasis vanished because its --em colour equalled the background). The
// fixture forces that exact case (emColor = the accent, over an accentPlain field); this asserts the
// audit hard-fails it. If this ever passes silently, the emphasis-contrast check has regressed.
//   node verify/contrast-regression.mjs      ·      make audit-test
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = 'verify/fixtures/emphasis-contrast.json';
let out = '';
try { out = execFileSync('node', ['verify/audit.mjs', fixture], { cwd: root, encoding: 'utf8' }); }
catch (e) { out = (e.stdout || '') + (e.stderr || ''); } // audit exits 1 on a HARD fail — that's the expected path

if (out.includes('[contrast]') && out.includes('invisible')) {
  console.log('✓ contrast regression: audit CATCHES invisible accent-on-accent emphasis (blue-on-blue)');
  process.exit(0);
}
console.error('✗ contrast regression FAILED: audit did NOT flag the invisible-emphasis fixture.\n');
console.error(out);
process.exit(1);
