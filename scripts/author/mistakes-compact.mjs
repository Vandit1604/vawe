// scripts/author/mistakes-compact.mjs: ONE-TIME migration, kept for the record.
//
// docs/MISTAKES.md was 17,797 lines and 569 entries. Nobody could read that; `mistakes.mjs`'s own
// header argued against compressing it, on the theory that the reasoning IS the value. The owner
// overruled that: a file nobody reads preserves nothing, so the working copy becomes a three-line
// index (title, the one-sentence lesson, what holds it now) and the full reasoning for every entry
// moves into git history, retrievable on demand by number.
//
// Run once: `node scripts/author/mistakes-compact.mjs`. It reads the CURRENT docs/MISTAKES.md,
// writes the compact version in place, and prints the archive hash to paste into mistakes.mjs's
// ARCHIVE_HASH constant (must be the commit made BEFORE this migration's own commit).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'docs/MISTAKES.md');

const ARCHIVE_HASH = execSync('/usr/bin/git rev-parse HEAD', { cwd: ROOT }).toString().trim();

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

const HEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
const heads = lines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);

// same shape as mistakes.mjs's own parser: a heading with no leading number is a method note /
// waiver list, kept verbatim (as one line, since it has no numbered "holds" to compute).
const entries = [];
for (let k = 0; k < heads.length; k++) {
  const i = heads[k];
  const end = k + 1 < heads.length ? heads[k + 1] : lines.length;
  const body = lines.slice(i + 1, end).join('\n').trim();
  const m = HEAD.exec(lines[i]);
  if (m) entries.push({ n: Number(m[1]), title: m[2].trim(), body });
  else entries.push({ n: null, title: lines[i].replace(/^## /, '').trim(), body });
}

const stripEmphasis = (s) => s.replace(/\*\*/g, '').replace(/__/g, '');
const noEmdash = (s) => s.replace(/\u2014/g, ', ');
// A fenced code block collapsed onto one line still opens with ``` at that line's start once
// written out, and nothing in a one-sentence lesson ever closes it: every line after it in the
// compact file reads as "inside a fence" to a markdown-aware gate. A lesson is prose, not a fence.
const noFence = (s) => s.replace(/```[\w-]*\s*/g, '').replace(/`{2,}/g, '`');

// Split on a period/bang/question-mark followed by space + a capital or backtick, which is the
// shape this doc's own prose uses at a sentence boundary; short enough to not chase every "e.g."
// A "sentence" that ends on a bare filename or code span ("`x.mjs`.") says nothing: keep pulling
// sentences until the result carries enough words to read as a lesson, or the text runs out.
const MIN_LEN = 40;
const SENTENCE = /^[\s\S]*?[.!?](?=\s+[A-Z0-9`"]|\s*$)/;
const firstSentence = (text) => {
  let rest = text.trim();
  let s = '';
  while (rest.length) {
    const m = rest.match(SENTENCE);
    const chunk = (m ? m[0] : rest).trim();
    s = s ? `${s} ${chunk}` : chunk;
    rest = m ? rest.slice(m[0].length).trim() : '';
    if (s.length >= MIN_LEN || !rest) break;
  }
  s = stripEmphasis(s).replace(/\s+/g, ' ');
  s = noEmdash(s);
  s = noFence(s).trim();
  if (!/[.!?]$/.test(s)) s += '.';
  if (s.length > 200) s = s.slice(0, 197).replace(/\s+\S*$/, '') + '...';
  return s;
};

const extractAfter = (body, re) => {
  const m = re.exec(body);
  if (!m) return null;
  return firstSentence(body.slice(m.index + m[0].length));
};

const lessonOf = (e) => {
  if (e.n == null) return firstSentence(e.body || e.title);
  return (
    extractAfter(e.body, /\*\*Root fix\.?\*\*\s*/) ||
    extractAfter(e.body, /\*\*Fix\.\*\*\s*/) ||
    extractAfter(e.body, /\*\*Fix:\*\*\s*/) ||
    extractAfter(e.body, /→\s*\*\*Gates?:\*\*\s*/) ||
    firstSentence(e.body)
  );
};

// "holds": every quality/gates/*.mjs or scripts/live/*.mjs that cites this entry by number, found
// by grep so this never drifts into a hand-kept second list. `mistakes-dupes.mjs` and its own test
// fixtures are excluded from being cited targets, not from citing: this is a straight text search.
const GATE_DIRS = ['scripts/gates', 'scripts/live'];
const gateFiles = [];
for (const d of GATE_DIRS) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.mjs')) gateFiles.push(path.join(d, f));
  }
}
const gateSources = gateFiles.map((f) => ({ f, text: fs.readFileSync(path.join(ROOT, f), 'utf8') }));

// A citation is either the named form or the bare parenthesised form used deliberately elsewhere in
// this repo; both must sit near the word MISTAKES or inside parens to avoid matching an unrelated
// `#N` (a CSS id, a GitHub issue number, a hex colour).
const holdsOf = (n) => {
  const near = new RegExp(`MISTAKES[^\\n]{0,40}#0*${n}\\b|#0*${n}\\b[^\\n]{0,10}MISTAKES|\\(#0*${n}\\)`);
  const owners = [];
  for (const { f, text } of gateSources) {
    const lines = text.split('\n');
    if (lines.some((l) => near.test(l))) owners.push(f);
  }
  return owners.length ? owners.join(', ') : 'none';
};

const header = `---
when: you hit something odd in the engine, or you just fixed one and must log it
answers: "the one-line index of past mistakes; the full reasoning lives in git history"
group: process
---

# MISTAKES.md: an index of lessons, not the essays

This used to be a 17,797-line, 569-entry diary. Nobody could read it end to end, so in practice
nobody read any of it, which defeated the point of a log meant to stop a repeat. Each entry below is
now three lines: the title, the one-sentence lesson, and what holds it today (a gate, a live check,
or "none" if it is still just a sentence someone has to remember).

The full write-up for any entry, root cause and all, still exists: it is git history as of
${ARCHIVE_HASH}. Read one with \`make mistakes N=<n> FULL=1\`. A citation elsewhere in the repo
(\`docs/MISTAKES.md #N\`) still resolves here by number; nothing renumbers.

New incidents: add a rule or a gate message first. Only add a line here if nothing else can hold
the lesson yet.

---

`;

// Some lessons name a tool or path that no longer exists, ON PURPOSE: the entry IS the record of its
// removal (a retired gate, a deleted scene, a moved file). doc-refs.mjs already has a waiver syntax
// for exactly this ("names a thing to say the thing is gone"); carried over verbatim from the archive
// rather than retyped, since retyping a list like this is how it goes stale.
const WAIVERS = src.split('\n')
  .filter((l) => l.includes('doc-refs-allow:'))
  .filter((l, i, a) => a.indexOf(l) === i) // dedupe, the archive states some twice for different entries
  .join('\n');

const body = entries.map((e) => {
  const title = e.n == null ? e.title : `${e.n}. ${e.title}`;
  const lesson = lessonOf(e);
  const holdsLine = e.n == null ? null : `holds: ${holdsOf(e.n)}`;
  const out = [`## ${noEmdash(stripEmphasis(title))}`, lesson];
  if (holdsLine) out.push(holdsLine);
  return out.join('\n');
}).join('\n\n');

const footer = WAIVERS ? `\n\n<!-- carried over from the archived file; doc-refs.mjs's own syntax for -->\n<!-- "this reference names a thing in order to record that the thing is gone" -->\n${WAIVERS}\n` : '\n';

fs.writeFileSync(FILE, header + body + footer);

console.log(`Migrated ${entries.length} entries. Archive hash: ${ARCHIVE_HASH}`);
console.log(`Paste that hash into scripts/author/mistakes.mjs's ARCHIVE_HASH constant.`);
