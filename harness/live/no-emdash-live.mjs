#!/usr/bin/env node
// harness/live/no-emdash-live.mjs - catch an em dash at write time, in the files pre-push does not scan.
//
// harness/dev/no-emdash.mjs is the backstop: it runs pre-push and blocks. Its SCOPE is a list of
// top-level directory names, matched as a git pathspec, so a nested directory that shares no top-level
// name with the list is invisible to it: `renderer/cmd` and `renderer/internal` are Go source, not the
// top-level `cmd`/`internal` the pathspec actually matches, so renderer/**.go is unscanned; same for
// `grammar/`, `recipes/`, `assets/` (non-.md). This hook exists ONLY for that gap: a file the pre-push
// scan will never reach. Everywhere pre-push already looks, this hook stays silent and lets push do its
// job once, instead of saying the same thing twice.
//
// IT ONLY SCANS WHAT THE EDIT WROTE. For a Write, that is the whole file. For an Edit, that is
// new_string: the file on disk already carries the edit by the time PostToolUse fires, so an em dash
// already sitting untouched elsewhere in the file is not this edit's business and is not reported.
import fs from 'node:fs';
import path from 'node:path';
import { EM, EXCLUDE, SCOPE } from '../dev/no-emdash.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// True when harness/dev/no-emdash.mjs's own git pathspec would already reach this file, the same
// prefix rule git uses for a bare directory-name pathspec: an exact match, or that name plus '/'.
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
  // Write hands the whole new file; Edit hands only new_string. Locate that slice inside the file on
  // disk so reported line numbers are real file lines, not offsets into a fragment.
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
