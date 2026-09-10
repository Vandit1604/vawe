#!/usr/bin/env node
// harness/dev/js-parses.mjs: every browser-served .js file PARSES.
//
// WHY. The studio's 1,466-line UI was one exported template string until today. Splitting it into a
// real file left four backslash sequences escaped for the string literal: `/\\s+\\(/` meant `\s+\(`
// inside a template and is a SyntaxError as source. studio/ui/studio.js:143 threw at parse, so the
// whole file never ran and not one button in the studio had a handler.
//
// Nothing caught it. The merge was verified by curling the routes and reading HTTP 200, and a 200 says
// the bytes were served, never that they run. Serving is not parsing. This is the two-line difference.
//
//   node harness/dev/js-parses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Browser-served source, not node modules: core/ and formats/ are fetched and evaluated by the page,
// studio/ui/ is served to the studio shell. A .mjs under harness/ is node's problem and node reports it.
const ROOTS = ['core', 'formats/scene', 'studio/ui', 'blocks', 'blueprints'];
const SKIP = /node_modules|\.test\.mjs$/;

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
};
for (const r of ROOTS) { const d = path.join(ROOT, r); if (fs.existsSync(d)) walk(d); }

const bad = [];
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (err) {
    const msg = String(err.stderr || err.message).split('\n').filter(Boolean).slice(0, 3).join(' · ');
    bad.push([path.relative(ROOT, f), msg]);
  }
}

if (bad.length) {
  console.error(`\n  ✗ ${bad.length} served .js file(s) do NOT parse. A page cannot run what it cannot read.\n`);
  for (const [f, m] of bad) console.error(`    ${f}\n      ${m}`);
  console.error('\n  An HTTP 200 on the file proves it was SERVED, never that it RUNS.\n');
  process.exit(1);
}
console.log(`js-parses: ${files.length} served .js file(s) parse clean`);
