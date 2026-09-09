#!/usr/bin/env node
// scripts/author/approve.mjs: write the USER's signature onto a film's plan.
//
//   /vawe-approve <film>          (the slash command, which is how a human runs it)
//   node scripts/author/approve.mjs <film> [--revoke]
//
// The one piece of state in this pipeline that cannot be derived from artifacts, because it is not a
// fact about the repo, it is a decision by a person. It lives in the storyboard's own frontmatter so
// it travels with the plan it approves and shows up in any diff of it.
//
// An agent calling this directly is not the hole it looks like. The deny in scripts/live/stage-gate.mjs
// covers the write an agent would actually reach for, and a script a user is told to run is a
// different act from an edit an agent makes while writing something else. The gate that matters is
// that the plan was SHOWN and a person said yes; nothing in a repo can prove that happened, so this
// records it rather than pretending to enforce it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!arg) { console.error('usage: node scripts/author/approve.mjs <film>   (or /vawe-approve <film>)'); process.exit(2); }
const revoke = process.argv.includes('--revoke');

const base = arg.replace(/\.(json|storyboard\.md)$/, '');
const sb = [base + '.storyboard.md', path.join('formats/scene', path.basename(base) + '.storyboard.md')]
  .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
if (!sb) { console.error(`no storyboard for "${arg}". Looked for ${base}.storyboard.md and formats/scene/${path.basename(base)}.storyboard.md`); process.exit(1); }

// A plan that does not pass its own gate is not a plan yet, and approving one would make the signature
// worthless. This is the only precondition, and it is the gate's verdict, not a second opinion.
try { execFileSync(process.execPath, [path.join(ROOT, 'quality/gates/storyboard-check.mjs'), sb], { stdio: 'pipe' }); }
catch (e) {
  console.error(`${path.relative(ROOT, sb)} does not pass storyboard-check, so there is nothing to approve yet.\n`);
  console.error(String(e.stdout || e.stderr || '').trim().split('\n').slice(-12).join('\n'));
  process.exit(1);
}

const src = fs.readFileSync(sb, 'utf8');
if (!/^---\n[\s\S]*?\n---/.test(src)) { console.error('that storyboard has no frontmatter block to sign.'); process.exit(1); }
const stripped = src.replace(/^approved\s*:.*\n/m, '');
if (revoke) {
  fs.writeFileSync(sb, stripped);
  console.log(`  approval removed from ${path.relative(ROOT, sb)}`);
} else {
  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(sb, stripped.replace(/^---\n/, `---\napproved: ${stamp}\n`));
  console.log(`  ✓ ${path.relative(ROOT, sb)} approved ${stamp}`);
}
const st = execFileSync(process.execPath, [path.join(ROOT, 'quality/gates/stage.mjs'), path.basename(base)], { encoding: 'utf8' });
console.log(st);
