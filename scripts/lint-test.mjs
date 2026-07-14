// lint-test.mjs — regression asserts for validate.mjs lintData (make lint-test). Each rule below maps
// to a bug that shipped this session and slipped every other gate; this pins that the rule still fires,
// so a future refactor can't silently un-catch it. Pure, no browser.
//   node scripts/lint-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintData } from './validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.error(`✗ ${msg}`); fail++; } else console.log(`✓ ${msg}`); };

// known-bad fixture must fire one of each rule
const bad = lintData(read('verify/fixtures/lint-bad.json'));
ok(bad.some((w) => /no "duration"/.test(w)), 'rule 1: missing-duration (the "+" that leaked 53s)');
ok(bad.some((w) => /typing.*markup/i.test(w)), 'rule 2: typing + <b>/<em> markup (shot-7 raw tags)');
ok(bad.some((w) => /colliding/.test(w)), 'rule 3: scene collision (Preferences↔agents overlap)');

// committed clean scene must stay silent (no false positives)
const clean = lintData(read('formats/scene/sample.json'));
ok(clean.length === 0, `clean sample.json is silent (got ${clean.length}: ${clean.join('; ') || 'none'})`);

console.log(fail ? `\nlint-test: ${fail} failed` : '\nlint-test: all pass');
process.exit(fail ? 1 : 0);
