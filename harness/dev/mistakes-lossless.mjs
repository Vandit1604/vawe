#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FILE = 'engine-doctrine/MISTAKES.md';
const BASELINE = 'harness/dev/.mistakes-lossless-baseline.txt';

function extract(text) {
  const lines = [];

  for (const m of text.matchAll(/^## .+$/gm)) lines.push(`HEADING: ${m[0]}`);

  const fileLineRe = /\b[\w./-]+\.(?:js|mjs|ts|go|json|md|css|html)(?::\d+)+/g;
  for (const m of text.matchAll(fileLineRe)) lines.push(`FILELINE: ${m[0]}`);

  for (const m of text.matchAll(/#\d+/g)) {
    const idx = m.index;
    const start = text.lastIndexOf('.', idx) + 1;
    const nextPeriod = text.indexOf('.', idx);
    const end = nextPeriod === -1 ? text.length : nextPeriod + 1;
    const sentence = text.slice(start, end).replace(/\s+/g, ' ').trim();
    lines.push(`XREF: ${m[0]} :: ${sentence}`);
  }

  for (const m of text.matchAll(/^holds:.*$/gm)) lines.push(`HOLDS: ${m[0]}`);

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
