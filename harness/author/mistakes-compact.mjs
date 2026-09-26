import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(ROOT, 'engine-doctrine/MISTAKES.md');

const ARCHIVE_HASH = execSync('/usr/bin/git rev-parse HEAD', { cwd: ROOT }).toString().trim();

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

const HEAD = /^## (?:#)?(\d+)[.:) ]*\s*(.*)$/;
const heads = lines.map((l, i) => (/^## /.test(l) ? i : -1)).filter((i) => i >= 0);

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
const noFence = (s) => s.replace(/```[\w-]*\s*/g, '').replace(/`{2,}/g, '`');

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

const GATE_DIRS = ['quality/gates', 'harness/live'];
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
${ARCHIVE_HASH}. Read one with \`make arsenal MISTAKES=1 N=<n> FULL=1\`. A citation elsewhere in the repo
(\`engine-doctrine/MISTAKES.md #N\`) still resolves here by number; nothing renumbers.

New incidents: add a rule or a gate message first. Only add a line here if nothing else can hold
the lesson yet.

---

`;

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
console.log(`Paste that hash into harness/author/mistakes.mjs's ARCHIVE_HASH constant.`);
