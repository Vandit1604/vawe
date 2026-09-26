#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { EM, EXCLUDE, SCOPE } from '../dev/no-emdash.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

function coveredByPush(rel) {
  return SCOPE.some((entry) => {
    if (entry === '*.md') return rel.endsWith('.md');
    if (entry === 'Makefile') return rel === 'Makefile' || rel.endsWith('/Makefile');
    return rel === entry || rel.startsWith(`${entry}/`);
  });
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw).tool_input || {}; } catch { process.exit(0); }
  const file = input.file_path || '';
  if (!file) process.exit(0);

  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || EXCLUDE.some((f) => f(rel))) process.exit(0);
  if (coveredByPush(rel)) process.exit(0);   // pre-push already scans this file; don't say it twice
  if (!fs.existsSync(file)) process.exit(0);

  const full = fs.readFileSync(file, 'utf8');
  const written = typeof input.content === 'string' ? input.content : input.new_string;
  if (typeof written !== 'string') process.exit(0);
  const at = typeof input.content === 'string' ? 0 : full.indexOf(written);
  if (at === -1) process.exit(0);   // couldn't locate the edit verbatim, say nothing rather than guess

  const before = full.slice(0, at);
  const startLine = before.split('\n').length;

  const hits = [];
  const segLines = written.split('\n');
  for (let i = 0; i < segLines.length; i++) {
    if (segLines[i].includes(EM)) hits.push({ line: startLine + i, text: segLines[i].trim() });
  }
  if (!hits.length) process.exit(0);

  const lines = hits.map((h) => `  ${rel}:${h.line}  ${h.text}`);
  process.stderr.write(
    'This edit wrote an em dash (U+2014).\n\n' + `${lines.join('\n')}\n\n`
    + 'Use a colon, a comma, a period, or parentheses instead, or split the sentence. The pre-push\n'
    + 'check (harness/dev/no-emdash.mjs) would block this later; fixing it now is cheaper.\n\n'
    + 'Refused by harness/live/no-emdash-live.mjs.\n');
  process.exit(2);
});
