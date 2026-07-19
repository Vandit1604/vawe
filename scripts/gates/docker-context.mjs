// The Docker build context is the WORKING TREE, not the repo. .gitignore has no say in it. So a
// directory can be invisible in `git status`, absent from every review, and still be shipped to the
// daemon on every single build — which is exactly what assets/baked (67M of bake output) and
// assets/gen were doing, unreferenced by any COPY in the Dockerfile.
//
// This gate walks the tree the way BuildKit does, applying .dockerignore, and fails when the context
// exceeds a budget. It reports the biggest contributors so the fix is obvious rather than a hunt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Generous enough that ordinary growth does not trip it, tight enough that a whole asset directory
// slipping in does. The context was 15.8M when this was written.
const BUDGET_MB = 40;

// Compile one .dockerignore pattern. Docker's glob differs from .gitignore's in the way that bit us:
// a single star does NOT cross a slash, while a leading double-star segment matches ZERO or more
// directories, so a pattern like double-star + /node_modules must ALSO match a root-level
// node_modules. Building it as ".*" + "/node_modules" silently misses the root copy, and the gate
// then overcounts by the size of the entire dependency tree.
function compile(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') { i++; out += '(?:.*/)?'; } else out += '.*';
      } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return new RegExp('^' + out + '(?:/.*)?$');
}

function loadIgnore() {
  const file = path.join(repoRoot, '.dockerignore');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const negate = line.startsWith('!');
    rules.push({ rx: compile(negate ? line.slice(1) : line), negate });
  }
  return rules;
}

/** Last matching rule wins, mirroring Docker's own precedence. */
function ignored(rel, rules) {
  let hit = false;
  for (const r of rules) if (r.rx.test(rel)) hit = !r.negate;
  return hit;
}

function walk(dir, rules, rel = '', acc = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() || ignored(childRel, rules)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, rules, childRel, acc);
    else if (entry.isFile()) {
      const top = childRel.split('/')[0];
      acc.set(top, (acc.get(top) ?? 0) + fs.statSync(abs).size);
    }
  }
  return acc;
}

const bytes = walk(repoRoot, loadIgnore());
const total = [...bytes.values()].reduce((a, b) => a + b, 0);
const mb = total / 1e6;

console.log(`docker build context: ${mb.toFixed(1)}MB (budget ${BUDGET_MB}MB)`);
for (const [name, size] of [...bytes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`   ${(size / 1e6).toFixed(1).padStart(7)}MB  ${name}`);
}

if (mb > BUDGET_MB) {
  console.error(`\n✗ build context is ${mb.toFixed(1)}MB, over the ${BUDGET_MB}MB budget.`);
  console.error('  Add what the image does not COPY to .dockerignore. Remember that .gitignore does');
  console.error('  NOT apply here, so a gitignored directory still ships unless listed there too.');
  process.exit(1);
}
console.log('✓ within budget');
