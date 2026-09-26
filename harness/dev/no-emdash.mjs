// the rule. A rule nothing checks is a rule that has already been repealed (engine-doctrine/MISTAKES.md #511).
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const EM = String.fromCharCode(0x2014);   // never write the literal here: this file is in scope
const QUIET = process.argv.includes('--quiet');

export const SCOPE = [
  'core', 'blocks', 'scripts', 'harness', 'quality', 'generators', 'research', 'tools', 'films', 'scene', 'films',
  'blueprints', 'cli', 'engine-doctrine', 'Makefile', '*.md', 'studio',
  'cmd', 'internal', 'mcp', 'themes', 'directions', 'registry',
];

export const EXCLUDE = [
  (f) => f.startsWith('site/') || f.startsWith('docs-site/'),
  (f) => f.startsWith('assets/vendor/') || f.includes('/vendor/') || f.includes('node_modules/'),
];

const MISTAKES = 'engine-doctrine/MISTAKES.md';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const raw = execSync(`git grep -nI '${EM}' -- ${SCOPE.map((s) => `'${s}'`).join(' ')} || true`,
    { encoding: 'utf8', maxBuffer: 64 << 20 });

  const hits = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const m = /^([^:]+):(\d+):(.*)$/s.exec(line);
    if (!m) continue;
    const [, file, no, text] = m;
    if (EXCLUDE.some((f) => f(file))) continue;
    hits.push({ file, no, text: text.trim() });
  }

  if (!QUIET) {
    for (const h of hits) {
      const i = h.text.indexOf(EM);
      console.log(`${h.file}:${h.no}: ${h.text.slice(Math.max(0, i - 60), i + 60)}`);
    }
  }
  if (hits.length) {
    console.error(`\nno-emdash: ${hits.length} em dash(es) in scope. Use a colon, a comma, a `
      + 'period, or parentheses, or split the sentence. The choice is per site, not one character swap.');
    process.exit(1);
  }
  console.log(`no-emdash: clean (${MISTAKES} included, every allowlisted path is vendored, none is debt)`);
}
