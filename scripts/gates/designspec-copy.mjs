// scripts/gates/designspec-copy.mjs — run OUR anti-slop rules over a scene's words and its markup.
//
//   node scripts/gates/designspec-copy.mjs <scene.json> [--strict]
//   node scripts/gates/designspec-copy.mjs --self-test        # every rule must fire on its own sample
//   node scripts/gates/designspec-copy.mjs --census           # the whole library, one line each
//
// The rules and the reasoning live in scripts/lib/designspec-rules.mjs. This file is only the runner: it
// decides WHAT text to hand them, which for a scene is two things the vendored detector never saw
// together — the on-screen copy, and the hand-authored HTML fragments the scene NAMES.
//
// The second half only became possible when the fragments moved out of the JSON into files. While the
// markup was one escaped 18,845-character string, nothing could read it.
//
// WARN by default. A copy tell is an argument, not a fact, and a gate that blocks on an argument
// teaches the author to waive rather than to think. `--strict` blocks; `{"authoring":{"allow":[…]}}`
// waives a deliberate one by rule id.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RULES, runRules } from '../lib/designspec-rules.mjs';
import { plain } from '../lib/text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const file = argv.find((a) => !a.startsWith('--'));

// EVERY RULE PROVES ITSELF BEFORE IT IS TRUSTED. `fires` must produce a finding and `clean` must not.
// The second half is the one that matters: a rule that flags everything is not a strict rule, it is a
// broken one, and it is exactly how 21 false findings shipped (docs/MISTAKES.md #324).
if (argv.includes('--self-test')) {
  let bad = 0;
  console.log(`\n  designspec copy rules · self-test · ${RULES.length} rule(s)\n`);
  for (const r of RULES) {
    const sample = (v) => (typeof v === 'string' ? plain(v) : v);
    const fired = r.test(sample(r.fires));
    const quiet = r.test(sample(r.clean));
    const ok = !!fired && !quiet;
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.id.padEnd(26)} fires:${fired ? 'yes' : 'NO '}  clean:${quiet ? 'FIRED' : 'quiet'}`);
    if (!fired) console.log(`      its own \`fires\` sample produced nothing: ${JSON.stringify(r.fires)}`);
    if (quiet) console.log(`      its \`clean\` sample was flagged (${quiet}): ${JSON.stringify(r.clean)}`);
  }
  console.log(bad ? `\n  ✗ ${bad} rule(s) cannot demonstrate themselves\n` : '\n  ✓ every rule fires on its sample and stays quiet on its counter-sample\n');
  process.exit(bad ? 1 : 0);
}

/** A scene's words plus the markup it names. Fragments are read off `type:"html"` layers and bg
 *  windows — the same rule core/preload.js uses, not every path-shaped string. */
function subjectText(p) {
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const parts = [];
  const srcs = new Set();
  const walk = (a) => { for (const l of Array.isArray(a) ? a : []) {
    if (!l || typeof l !== 'object') continue;
    if (typeof l.text === 'string') parts.push(plain(l.text));
    if (typeof l.html === 'string') parts.push(plain(l.html));
    if (l.type === 'html' && typeof l.src === 'string') srcs.add(l.src);
    if (l.children) walk(l.children);
  } };
  walk(d.layers);
  for (const b of Array.isArray(d.bg) ? d.bg : []) if (b && typeof b === 'object') {
    if (typeof b.html === 'string') parts.push(plain(b.html));
    if (typeof b.src === 'string') srcs.add(b.src);
  }
  for (const rel of [...srcs].sort()) {
    try { parts.push(plain(fs.readFileSync(path.join(ROOT, rel), 'utf8'))); }
    catch { /* existence is asset-check's question */ }
  }
  // Kept as UNITS, never joined. A joined blob let one pattern match across eight layers on the first
  // census run; scope now lives on the rule (see runRules in scripts/lib/designspec-rules.mjs).
  return { units: parts, scene: d, allow: d.authoring?.allow || [], fragments: srcs.size };
}

const scenes = () => cp.execSync("git ls-files 'formats/scene/*.json'", { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter((f) => f && !/intent|expanded/.test(f));

if (argv.includes('--census')) {
  console.log(`\n  designspec copy rules · census · ${RULES.length} rule(s) over the committed library\n`);
  let hit = 0;
  for (const f of scenes()) {
    const s = subjectText(path.join(ROOT, f));
    const found = runRules(s.units, { allow: s.allow, scene: s.scene });
    if (!found.length) continue;
    hit++;
    console.log(`  ${f.split('/').pop().replace('.json', '').padEnd(30)} ${found.map((x) => `[${x.id}] ${x.snippet}`).join('\n' + ' '.repeat(33))}`);
  }
  console.log(`\n  ${hit} of ${scenes().length} scene(s) with a finding\n`);
  process.exit(0);
}

if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/gates/designspec-copy.mjs <scene.json> [--strict] | --self-test | --census');
  process.exit(2);
}
const s = subjectText(file);
const found = runRules(s.units, { allow: s.allow, scene: s.scene });
console.log(`\n  designspec copy rules · ${file}  (${RULES.length} rule(s) · ${s.fragments} fragment(s) read)`);
if (!found.length) { console.log('  ✓ no copy tells\n'); process.exit(0); }
for (const f of found) {
  console.log(`    ~ [${f.id}] ${f.snippet}`);
  console.log(`        → ${f.why}`);
}
console.log(strict ? `\n  ✗ designspec copy rules (strict)\n` : `\n  Keep a deliberate one with {"authoring":{"allow":["${found[0].id}"]}}.\n`);
process.exit(strict ? 1 : 0);
