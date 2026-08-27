// scripts/dev/no-emdash.mjs: refuse the em dash anywhere the repo writes prose.
//
//   node scripts/dev/no-emdash.mjs           report every em dash in scope, exit 1 if any
//   node scripts/dev/no-emdash.mjs --quiet   count only
//
// WHY THIS EXISTS. The house rule bans the em dash in code, comments, docs, commit messages and
// engine OUTPUT. The engine broke its own rule 7,345 times, error messages included, and it was
// noticed only when a docs page tried to quote a real error and could not do so without breaking
// the rule. A rule nothing checks is a rule that has already been repealed (docs/MISTAKES.md #489).
//
// EN DASHES AND HYPHENS ARE FINE. An en dash in a number range is explicitly allowed and a hyphen is
// not a dash at all. Only U+2014 is matched here.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EM = String.fromCharCode(0x2014);   // never write the literal here: this file is in scope
const QUIET = process.argv.includes('--quiet');

// The surfaces the rule covers today: the JS engine, its tooling, and every markdown file.
const SCOPE = ['core', 'blocks', 'scripts', 'formats', 'verify', 'blueprints', 'cli', 'docs', 'Makefile', '*.md'];

// NOT YET IN SCOPE, and named out loud rather than left silent. These carry the character too and were
// out of the first pass. Add one to SCOPE when it has been cleaned; the count prints on every run so
// the debt cannot go quiet.
const PENDING = ['cmd', 'internal', 'mcp', 'themes', 'presets', 'registry'];

// EXCLUSIONS, each one deliberate. Nothing here is "too hard to fix"; each is a different surface.
const EXCLUDE = [
  // Another codebase with its own build and its own pass. Handled separately.
  (f) => f.startsWith('site/') || f.startsWith('docs-site/'),
  // Vendored, not ours to rewrite.
  (f) => f.startsWith('node_modules/') || f.includes('/vendor/'),
];

// docs/MISTAKES.md is a LOG. Entries below #400 are history: rewriting them would edit the record of
// what was written at the time. Only entries from #400 on are held to the rule.
const MISTAKES = 'docs/MISTAKES.md';
const HISTORY_BEFORE = 400;

function historyLines(text) {
  const out = new Set();
  let inHistory = false;
  text.split('\n').forEach((line, i) => {
    const m = /^##\s+#?(\d+)\b/.exec(line);          // both "## #487:" and the older "## 83."
    if (m) inHistory = Number(m[1]) < HISTORY_BEFORE;
    if (inHistory) out.add(i + 1);
  });
  return out;
}

const raw = execSync(`git grep -nI '${EM}' -- ${SCOPE.map((s) => `'${s}'`).join(' ')} || true`,
  { encoding: 'utf8', maxBuffer: 64 << 20 });

const hits = [];
let skippedHistory = 0;
let history = null;
for (const line of raw.split('\n')) {
  if (!line) continue;
  const m = /^([^:]+):(\d+):(.*)$/s.exec(line);
  if (!m) continue;
  const [, file, no, text] = m;
  if (EXCLUDE.some((f) => f(file))) continue;
  if (file === MISTAKES) {
    history ??= historyLines(readFileSync(MISTAKES, 'utf8'));
    if (history.has(Number(no))) { skippedHistory++; continue; }
  }
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
const pending = execSync(`git grep -cI '${EM}' -- ${PENDING.map((s2) => `'${s2}'`).join(' ')} || true`,
  { encoding: 'utf8', maxBuffer: 8 << 20 }).trim().split('\n').filter(Boolean).length;
console.log(`no-emdash: clean (${skippedHistory} left in ${MISTAKES} entries below #${HISTORY_BEFORE}, `
  + 'which are the historical record and out of scope)');
if (pending) console.log(`no-emdash: ${pending} file(s) still carry it in ${PENDING.join(', ')}, `
  + 'which no pass has reached yet. Not a failure, a debt.');
