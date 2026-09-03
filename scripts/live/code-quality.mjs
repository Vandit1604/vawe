#!/usr/bin/env node
// scripts/live/code-quality.mjs - tell the author about a tangled function while they are still in it.
//
// PostToolUse on Edit|Write. Exit 2 returns stderr to the model, so the feedback arrives at the moment
// the code was written rather than at push time. That timing is the whole point: a rule enforced at the
// end of a session gets satisfied by a waiver, and a rule enforced at the keystroke gets satisfied by
// writing a smaller function.
//
// IT ONLY EVER COMPLAINS ABOUT WHAT YOU MADE WORSE. The repo carries 334 known findings across 126
// files. Blocking every edit that touches an already-tangled file would make the hook noise, and noise
// is how a rule gets turned off. So this compares the file against verify/code-quality-baseline.json,
// the same ratchet scripts/gates/code-quality.mjs uses. Touching a bad file is fine. Making it worse is
// not, and fixing it is rewarded with silence.
//
// It is affordable because oxlint is Rust: a single file measures in a few milliseconds, and the whole
// repo in about 70. An ESLint-based version of this hook would add seconds to every edit and would be
// removed within a day.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const BASELINE = path.join(ROOT, 'verify/code-quality-baseline.json');
const BIN = path.join(ROOT, 'node_modules/.bin/oxlint');
const CFG = path.join(ROOT, '.oxlintrc.json');

// Only the rules about SHAPE. correctness findings are the linter's own business and are handled by the
// gate; interrupting an edit for an unused variable would be exactly the noise described above.
const SHAPE = new Set(['complexity', 'max-lines-per-function', 'max-depth', 'max-nested-callbacks', 'max-params']);

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file || !/\.m?js$/.test(file)) process.exit(0);
  if (!fs.existsSync(BIN) || !fs.existsSync(CFG)) process.exit(0);   // no toolchain, no opinion

  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || rel.startsWith('site/') || rel.includes('node_modules')) process.exit(0);

  const r = spawnSync(BIN, ['-c', CFG, '--format=json', rel], { cwd: ROOT, encoding: 'utf8' });
  let diags = [];
  try { diags = (JSON.parse(r.stdout).diagnostics || []); } catch { process.exit(0); }

  const found = diags
    .map((d) => ({ rule: (/eslint\(([^)]+)\)/.exec(d.code) || [, ''])[1], message: d.message,
                   line: d.labels && d.labels[0] ? d.labels[0].span.line : 0 }))
    .filter((d) => SHAPE.has(d.rule));
  if (!found.length) process.exit(0);

  let base = {};
  try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { /* no baseline yet */ }

  const counts = {};
  for (const d of found) counts[d.rule] = (counts[d.rule] || 0) + 1;

  const worse = Object.entries(counts).filter(([rule, n]) => n > (base[`${rel}::${rule}`] || 0));
  if (!worse.length) process.exit(0);   // touched a tangled file without making it worse

  const lines = [];
  for (const [rule, n] of worse) {
    const had = base[`${rel}::${rule}`] || 0;
    lines.push(`  ${rule}: was ${had}, now ${n}`);
    for (const d of found.filter((f) => f.rule === rule)) lines.push(`    ${rel}:${d.line}  ${d.message}`);
  }

  process.stderr.write(
    `This edit made ${rel} more tangled than it was.\n\n${lines.join('\n')}\n\n`
    + 'Split it so each function does one job. A function that needs a paragraph to describe what it\n'
    + 'does is usually two functions. Keep the comments, move each one with the code it explains.\n\n'
    + 'If the shape you wrote is genuinely right and the rule is wrong here, say so in your reply and\n'
    + 'run: make code-quality WRITE=1  (that accepts the new number as the line to hold).\n\n'
    + 'Refused by scripts/live/code-quality.mjs. Limits live in .oxlintrc.json.\n');
  process.exit(2);
});
