// scripts/dev/complexity.mjs, where is this codebase hard to change?
//
//   node scripts/dev/complexity.mjs                 # the worst 30 functions
//   node scripts/dev/complexity.mjs --all           # every function over the threshold
//   node scripts/dev/complexity.mjs --json          # machine-readable
//   node scripts/dev/complexity.mjs core/layers     # limit to a subtree
//
// Cyclomatic complexity counts the branches through a function: decision points plus one. It is the
// minimum number of tests needed to touch every path, so it measures the SIZE OF THE JOB, not whether
// the code reads well. A 30-case switch scores 31 and is easy to follow; a 4-branch function with bad
// names scores 4 and is awful. Treat a high score as a question ("why does this branch so much?"),
// never as a verdict.
//
// It parses with the TypeScript compiler already installed under site/node_modules, so there is no new
// dependency and no regex guessing about what a brace means.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'site/'));
let ts;
try { ts = require('typescript'); } catch {
  console.error('✗ typescript not found under site/node_modules. Run `npm install` in site/.');
  process.exit(2);
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const showAll = args.includes('--all');
const roots = args.filter((a) => !a.startsWith('--'));
const SCAN = roots.length ? roots : ['core', 'blocks', 'scripts', 'harness', 'generators', 'research', 'tools', 'formats', 'scene', 'verify'];

const files = [];
const walk = (dir) => {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p); }
    else if (/\.m?js$/.test(e.name)) files.push(p);
  }
};
for (const r of SCAN) walk(path.join(ROOT, r));

// Every construct below is a place control can take a different route. `else` is deliberately absent:
// it is the path that already exists, so counting it would double every if.
const BRANCH = new Set([
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.CaseClause, ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement, ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement, ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression,
]);
const BIN = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken,
]);
const FN = new Set([
  ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression, ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration, ts.SyntaxKind.Constructor, ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

const nameOf = (node, sf) => {
  if (node.name) return node.name.getText(sf);
  const p = node.parent;
  if (p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name) return p.name.getText(sf);
  if (p && ts.isBinaryExpression(p) && p.left) return p.left.getText(sf).slice(0, 40);
  return '(anonymous)';
};

const rows = [];
for (const file of files) {
  let sf;
  try { sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); }
  catch { continue; }

  // A nested function is its own unit and is measured on its own, so its branches are NOT charged to
  // the parent. Charging them twice makes any file that uses a callback look catastrophic and hides
  // the function that is genuinely tangled.
  const measure = (fn) => {
    let c = 1, depth = 0, maxDepth = 0;
    const visit = (n, d) => {
      if (n !== fn && FN.has(n.kind)) return;               // a nested function counts separately
      if (BRANCH.has(n.kind)) { c++; }
      if (ts.isBinaryExpression(n) && BIN.has(n.operatorToken.kind)) c++;
      const nests = BRANCH.has(n.kind) && n.kind !== ts.SyntaxKind.CaseClause
        && n.kind !== ts.SyntaxKind.ConditionalExpression;
      const nd = nests ? d + 1 : d;
      if (nd > maxDepth) maxDepth = nd;
      ts.forEachChild(n, (k) => visit(k, nd));
    };
    ts.forEachChild(fn, (k) => visit(k, depth));
    return { c, maxDepth };
  };

  const seen = (n) => {
    if (FN.has(n.kind)) {
      const { line: l0 } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
      const { line: l1 } = sf.getLineAndCharacterOfPosition(n.getEnd());
      const { c, maxDepth } = measure(n);
      rows.push({ file: path.relative(ROOT, file), line: l0 + 1, name: nameOf(n, sf),
        complexity: c, lines: l1 - l0 + 1, depth: maxDepth });
    }
    ts.forEachChild(n, seen);
  };
  ts.forEachChild(sf, seen);
}

rows.sort((a, b) => b.complexity - a.complexity || b.lines - a.lines);

if (asJson) { console.log(JSON.stringify(rows.filter((r) => r.complexity > 10), null, 1)); process.exit(0); }

const band = (c) => c > 50 ? 'unholdable' : c > 20 ? 'hard to test' : c > 10 ? 'watch' : 'simple';
const tally = { simple: 0, watch: 0, 'hard to test': 0, unholdable: 0 };
for (const r of rows) tally[band(r.complexity)]++;

console.log(`\n  ${rows.length} functions in ${files.length} files under ${SCAN.join(' ')}\n`);
console.log(`  simple (1-10)        ${String(tally.simple).padStart(5)}   ${(tally.simple / rows.length * 100).toFixed(1)}%`);
console.log(`  watch (11-20)        ${String(tally.watch).padStart(5)}`);
console.log(`  hard to test (21-50) ${String(tally['hard to test']).padStart(5)}`);
console.log(`  unholdable (50+)     ${String(tally.unholdable).padStart(5)}\n`);

const show = showAll ? rows.filter((r) => r.complexity > 10) : rows.slice(0, 30);
console.log('   cx  lines depth  where');
for (const r of show) {
  console.log(`  ${String(r.complexity).padStart(3)}  ${String(r.lines).padStart(5)}  ${String(r.depth).padStart(4)}  ${r.file}:${r.line} ${r.name}`);
}
console.log('');
