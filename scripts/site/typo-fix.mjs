#!/usr/bin/env node
// scripts/site/typo-fix.mjs: set the UI copy of site sources through site/lib/typo.mjs.
//
//   node scripts/site/typo-fix.mjs [--write] <file.ts|tsx>...
//
// Without --write it prints each change. A string literal keeps its quote style; a nonbreaking space is
// written as an escape (a backslash-u00a0 in a string, &nbsp; in JSX text) so it stays visible in the source.
import fs from 'node:fs';
import { copyNodes, copyProblem, decode } from './typo-copy.mjs';
import { smartText } from '../../site/lib/typo.mjs';

const NBSP = String.fromCharCode(0xa0);
const BACKSLASH = String.fromCharCode(92);
const write = process.argv.includes('--write');

function literal(text, quote) {
  const escaped = text
    .split(BACKSLASH).join(BACKSLASH + BACKSLASH)
    .split(quote).join(BACKSLASH + quote)
    .split('\n').join(BACKSLASH + 'n')
    .split(NBSP).join(BACKSLASH + 'u00a0');
  return quote + escaped + quote;
}

function rewrite(node, source) {
  if (!copyProblem(node.text)) return null;
  const before = node.kind === 'jsx' ? decode(source.slice(node.start, node.end)) : node.text;
  const done = smartText(before, node.after);
  if (done === before) return null;
  if (node.kind === 'jsx') return done.split(NBSP).join('&nbsp;');
  if (node.kind === 'str') return literal(done, node.quote);
  return null;
}

for (const file of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const { source, nodes } = copyNodes(file);
  let out = source;
  let changed = 0;
  for (const node of [...nodes].reverse()) {
    const next = rewrite(node, source);
    if (next === null) continue;
    out = out.slice(0, node.start) + next + out.slice(node.end);
    changed++;
    if (!write) console.log(`${file}:${node.at}  ${source.slice(node.start, node.end).slice(0, 70)}`);
  }
  if (write && changed) fs.writeFileSync(file, out);
  console.log(`${file}: ${changed} change(s)`);
}
