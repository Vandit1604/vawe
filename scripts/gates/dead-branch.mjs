// dead-branch.mjs — a branch that can never be taken, or two branches that do the same thing.
//
//   node scripts/gates/dead-branch.mjs      ·   make dead-branch
//
// `deploySuccess` shipped `i === last ? T.green : T.green` — a ternary whose arms are identical — next
// to a condition that was always true. Between them the cascade the block exists for was unreachable,
// and NO render gate could ever catch it: the output was valid, deterministic and wrong-by-omission.
// That is a linter's job, and this repo has one dependency and intends to keep it that way, so this is
// the cheap half done honestly rather than a linter added for one rule (docs/MISTAKES.md #81).
//
// WHAT IT CATCHES: `cond ? X : X`, where both arms are textually identical after normalising space.
// WHAT IT DOES NOT: a condition that is always true because of a variable defined three lines up
// (`const done = i < n-1` then `done || i === n-1`). That needs real dataflow analysis. Stated here
// rather than implied, because a gate whose limits are unwritten gets trusted past them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIRS = ['core', 'blocks', 'scripts', 'verify'];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(fp); }
    else if (/\.(mjs|js)$/.test(e.name)) files.push(fp);
  }
})(path.join(repoRoot, DIRS[0]));
for (const d of DIRS.slice(1)) { try { (function walk(x) {
  for (const e of fs.readdirSync(x, { withFileTypes: true })) {
    const fp = path.join(x, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(fp); }
    else if (/\.(mjs|js)$/.test(e.name)) files.push(fp);
  }
})(path.join(repoRoot, d)); } catch {} }

const norm = (s) => s.trim().replace(/\s+/g, ' ');
// a ternary's two arms, kept deliberately narrow: no nested ?/: inside either arm, so a complex
// expression is skipped rather than mis-parsed. Missing a real one is better than inventing one.
// `(?<!\?)\?(?!\?)` — a single `?`, never the `??` of a nullish coalesce. Without it, `a ?? 0 : 0`
// matched from the SECOND question mark and reported two identical arms that are not a ternary at all.
const TERNARY = /(?<!\?)\?(?!\?)\s*([^?:;{}]{1,90}?)\s*:\s*([^?:;{},)\n]{1,90})/g;
const balanced = (s) => (s.match(/'/g) || []).length % 2 === 0 && (s.match(/"/g) || []).length % 2 === 0
  && (s.match(/`/g) || []).length % 2 === 0 && (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;

const hits = [];
for (const fp of files) {
  if (fp.endsWith(path.join('gates', 'dead-branch.mjs'))) continue;   // this file quotes the pattern
  const src = fs.readFileSync(fp, 'utf8');
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;                            // comments quote examples
    for (const m of line.matchAll(TERNARY)) {
      const a = norm(m[1]), b = norm(m[2]);
      if (!a || !b || a !== b) continue;
      if (!balanced(a) || !balanced(b)) continue;
      hits.push({ file: path.relative(repoRoot, fp), line: i + 1, arm: a, text: norm(line).slice(0, 100) });
    }
  });
}

console.log(`── dead branch · ${files.length} source file(s)\n`);
if (!hits.length) { console.log('✓ no ternary has identical arms'); process.exit(0); }
for (const h of hits) console.log(`   ✗ ${h.file}:${h.line}  both arms are \`${h.arm}\`\n       ${h.text}`);
console.log(`\n✗ ${hits.length} branch(es) that cannot change the result. A render gate cannot see this:`);
console.log('  the output is valid, deterministic, and wrong by omission.');
process.exit(1);
