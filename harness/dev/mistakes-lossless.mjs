#!/usr/bin/env node
// Extracts the load-bearing facts from docs/MISTAKES.md so an edit pass can be
// proven lossless: every file:line, every #<number> cross-reference (with the
// clause naming what it was about), every holds: line, every heading, and a
// count of every number that appears. Run before editing, save the output,
// run again after, diff. An empty diff is the only acceptable result.
//
// Usage:
//   node harness/dev/mistakes-lossless.mjs            # print extraction to stdout
//   node harness/dev/mistakes-lossless.mjs --diff      # compare against a saved baseline
//   node harness/dev/mistakes-lossless.mjs --save      # save current extraction as baseline

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILE = 'docs/MISTAKES.md';
const BASELINE = 'harness/dev/.mistakes-lossless-baseline.txt';

function extract(text) {
  const lines = [];

  // Headings (mistakes-dupes compares these; must be byte-identical).
  for (const m of text.matchAll(/^## .+$/gm)) lines.push(`HEADING: ${m[0]}`);

  // file:line references, e.g. core/layout/safe.js:35
  const fileLineRe = /\b[\w./-]+\.(?:js|mjs|ts|go|json|md|css|html)(?::\d+)+/g;
  for (const m of text.matchAll(fileLineRe)) lines.push(`FILELINE: ${m[0]}`);

  // #<number> cross-references, with the sentence they appear in (the clause
  // naming what the referenced entry was about is usually in the same sentence).
  for (const m of text.matchAll(/#\d+/g)) {
    const idx = m.index;
    const start = text.lastIndexOf('.', idx) + 1;
    const nextPeriod = text.indexOf('.', idx);
    const end = nextPeriod === -1 ? text.length : nextPeriod + 1;
    const sentence = text.slice(start, end).replace(/\s+/g, ' ').trim();
    lines.push(`XREF: ${m[0]} :: ${sentence}`);
  }

  // holds: lines
  for (const m of text.matchAll(/^holds:.*$/gm)) lines.push(`HOLDS: ${m[0]}`);

  // Every number, with occurrence count.
  const numCounts = new Map();
  for (const m of text.matchAll(/\b\d[\d,]*\.?\d*\b/g)) {
    numCounts.set(m[0], (numCounts.get(m[0]) || 0) + 1);
  }
  for (const [num, count] of [...numCounts.entries()].sort()) {
    lines.push(`NUM: ${num} x${count}`);
  }

  return lines;
}

function main() {
  const args = process.argv.slice(2);
  const text = readFileSync(FILE, 'utf8');
  const extracted = extract(text).join('\n') + '\n';

  if (args.includes('--save')) {
    writeFileSync(BASELINE, extracted);
    console.log(`saved baseline: ${BASELINE}`);
    return;
  }

  if (args.includes('--diff')) {
    if (!existsSync(BASELINE)) {
      console.error(`no baseline at ${BASELINE}; run with --save first`);
      process.exit(1);
    }
    writeFileSync('/tmp/mistakes-lossless-current.txt', extracted);
    try {
      execSync(`diff ${BASELINE} /tmp/mistakes-lossless-current.txt`, { stdio: 'inherit' });
      console.log('LOSSLESS: no difference');
    } catch (e) {
      process.exit(e.status || 1);
    }
    return;
  }

  process.stdout.write(extracted);
}

main();
