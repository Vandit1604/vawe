// harness/dev/no-emdash.mjs: refuse the em dash anywhere the repo writes prose.
//
//   node harness/dev/no-emdash.mjs           report every em dash in scope, exit 1 if any
//   node harness/dev/no-emdash.mjs --quiet   count only
//
// WHY THIS EXISTS. The house rule bans the em dash in code, comments, docs, commit messages and
// engine OUTPUT. The engine broke its own rule 7,345 times, error messages included, and it was
// noticed only when a docs page tried to quote a real error and could not do so without breaking
// the rule. A rule nothing checks is a rule that has already been repealed (engine-doctrine/MISTAKES.md #511).
//
// EN DASHES AND HYPHENS ARE FINE. An en dash in a number range is explicitly allowed and a hyphen is
// not a dash at all. Only U+2014 is matched here.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const EM = String.fromCharCode(0x2014);   // never write the literal here: this file is in scope
const QUIET = process.argv.includes('--quiet');

// The surfaces the rule covers: the JS engine, the Go render service, the MCP server, brand data, its
// tooling, and every markdown file. Nothing is "not yet reached" any more; the whole repo is in scope.
const SCOPE = [
  'core', 'blocks', 'scripts', 'harness', 'quality', 'generators', 'research', 'tools', 'formats', 'scene', 'films',
  'blueprints', 'cli', 'engine-doctrine', 'Makefile', '*.md', 'studio',
  'cmd', 'internal', 'mcp', 'themes', 'presets', 'registry',
];

// EXCLUSIONS, each one deliberate and each with its own reason. Nothing here is "too hard to fix";
// each is a different surface with its own owner and its own build. Exported so harness/live's
// write-time twin checks the same allowlist instead of growing its own copy.
export const EXCLUDE = [
  // Another codebase with its own build and its own pass. Handled separately.
  (f) => f.startsWith('site/') || f.startsWith('docs-site/'),
  // Vendored, not ours to rewrite: assets/vendor and any third-party bundle carried under a vendor/
  // directory, plus node_modules wherever it lands.
  (f) => f.startsWith('assets/vendor/') || f.includes('/vendor/') || f.includes('node_modules/'),
];

// engine-doctrine/MISTAKES.md USED TO carry the full prose of each entry, and an entry below #418 was exempted
// as history: rewriting it would have edited the record of what was written at the time. That record
// now lives in git, not in the working file: the migration to a three-line index
// (harness/author/mistakes-compact.mjs) rewrote every entry's lesson line fresh, so nothing in the
// current file is verbatim historical text any more. The exemption is gone; the whole file is held to
// the rule, same as everything else in SCOPE.
const MISTAKES = 'engine-doctrine/MISTAKES.md';

// Only run the CLI scan when this file is the entrypoint. harness/live's write-time twin imports EM
// and EXCLUDE above and must not pay for (or trigger) a repo-wide git grep just to reuse the matcher.
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
