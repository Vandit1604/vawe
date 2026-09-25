#!/usr/bin/env node
// harness/live/code-quality.mjs - tell the author about a tangled function while they are still in it.
//
// PostToolUse on Edit|Write. Exit 2 returns stderr to the model, so the feedback arrives at the moment
// the code was written rather than at push time. That timing is the whole point: a rule enforced at the
// end of a session gets satisfied by a waiver, and a rule enforced at the keystroke gets satisfied by
// writing a smaller function.
//
// IT ONLY EVER COMPLAINS ABOUT WHAT YOU MADE WORSE. The repo carries 334 known findings across 126
// files. Blocking every edit that touches an already-tangled file would make the hook noise, and noise
// is how a rule gets turned off. So "worse" is measured against the LOWER of two numbers: the file's
// own count in quality/baselines/code-quality-baseline.json, and the count in the file as it stood at
// git HEAD, linted the same way. The baseline alone was not enough: 615 baseline entries were compiled
// once and never mean to be re-run after every rename or new file, so a file with real pre-existing
// debt but no baseline entry (an untracked-by-the-baseline file, count defaults to 0) tripped the hook
// on every touch, including a no-op. HEAD always has an entry for a tracked file, so it closes that
// gap; the baseline still wins when it is the stricter (lower) of the two, so debt already paid down
// there can never be re-borrowed by comparing against a laxer HEAD. A brand new file (no HEAD version)
// falls back to baseline-only, today's behaviour.
//
// It is affordable because oxlint is Rust: a single file measures in a few milliseconds, and the whole
// repo in about 70. An ESLint-based version of this hook would add seconds to every edit and would be
// removed within a day.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { summarize } from '../lib/hook-report.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const BASELINE = path.join(ROOT, 'quality/baselines/code-quality-baseline.json');
const BIN = path.join(ROOT, 'node_modules/.bin/oxlint');
const CFG = path.join(ROOT, '.oxlintrc.json');

// Only the rules about SHAPE. correctness findings are the linter's own business and are handled by the
// gate; interrupting an edit for an unused variable would be exactly the noise described above.
const SHAPE = new Set(['complexity', 'max-lines-per-function', 'max-depth', 'max-nested-callbacks', 'max-params']);

/** Run oxlint over one file's content, without touching the real working tree copy. */
function lintContent(rel, content) {
  const tmp = path.join(os.tmpdir(), `code-quality-live-${process.pid}-${path.basename(rel)}`);
  fs.writeFileSync(tmp, content);
  try {
    const r = spawnSync(BIN, ['-c', CFG, '--format=json', tmp], { cwd: ROOT, encoding: 'utf8' });
    let diags = [];
    try { diags = (JSON.parse(r.stdout).diagnostics || []); } catch { return []; }
    return diags
      .map((d) => ({ rule: (/eslint\(([^)]+)\)/.exec(d.code) || [, ''])[1], message: d.message,
                     line: d.labels && d.labels[0] ? d.labels[0].span.line : 0 }))
      .filter((d) => SHAPE.has(d.rule));
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const tally = (found) => {
  const counts = {};
  for (const d of found) counts[d.rule] = (counts[d.rule] || 0) + 1;
  return counts;
};

/** The file's content at git HEAD, or null for an untracked/new file. */
function headContent(rel) {
  const r = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file || !/\.m?js$/.test(file)) process.exit(0);
  if (!fs.existsSync(BIN) || !fs.existsSync(CFG)) process.exit(0);   // no toolchain, no opinion

  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || rel.startsWith('site/') || rel.includes('node_modules')) process.exit(0);
  if (!fs.existsSync(file)) process.exit(0);

  const found = lintContent(rel, fs.readFileSync(file, 'utf8'));
  if (!found.length) process.exit(0);
  const counts = tally(found);

  let base = {};
  try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { /* no baseline yet */ }

  const atHead = headContent(rel);
  const headCounts = atHead === null ? null : tally(lintContent(rel, atHead));

  // The allowed count per rule. A MISSING baseline entry means "never measured", not "zero": treating
  // it as zero is exactly what tripped the hook on every touch of a file the baseline never recorded.
  // So an absent entry defers entirely to HEAD. Only when the baseline DOES have an entry do the two
  // compete, and the lower wins, so neither source can raise the bar past what the other already
  // holds. No HEAD version (a new file) means baseline alone decides, unchanged from before.
  const allowed = (rule) => {
    const key = `${rel}::${rule}`;
    const hasBase = Object.prototype.hasOwnProperty.call(base, key);
    const fromHead = headCounts === null ? null : (headCounts[rule] || 0);
    if (!hasBase) return fromHead === null ? 0 : fromHead;
    if (fromHead === null) return base[key];
    return Math.min(base[key], fromHead);
  };

  const worse = Object.entries(counts).filter(([rule, n]) => n > allowed(rule));
  if (!worse.length) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total > 0) process.stderr.write(`${rel} carries ${total} pre-existing finding(s), unchanged.\n`);
    process.exit(0);
  }

  const lines = [];
  for (const [rule, n] of worse) {
    const had = allowed(rule);
    lines.push(`  ${rule}: was ${had}, now ${n}`);
    for (const d of found.filter((f) => f.rule === rule)) lines.push(`    ${rel}:${d.line}  ${d.message}`);
  }

  const full =
    `This edit made ${rel} more tangled than it was.\n\n${lines.join('\n')}\n\n`
    + 'Split it so each function does one job. A function that needs a paragraph to describe what it\n'
    + 'does is usually two functions. Keep the comments, move each one with the code it explains.\n\n'
    + 'If the shape you wrote is genuinely right and the rule is wrong here, say so in your reply and\n'
    + 'run: make code-quality WRITE=1  (that accepts the new number as the line to hold).\n\n'
    + 'Refused by harness/live/code-quality.mjs. Limits live in .oxlintrc.json.\n';

  const say = summarize('code-quality', rel, full);
  if (!say) process.exit(0);            // same finding as last time; already said, no need to repeat
  process.stderr.write(say + '\n');
  process.exit(2);
});
