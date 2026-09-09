#!/usr/bin/env node
// Gate: flags docs/MISTAKES.md entries whose HEADINGS look like duplicates of an
// earlier entry. A property only knowable across the whole library (CLAUDE.md's
// own test for when a gate belongs): two verbatim duplicates and one restatement
// (#528 of #196/#280) shipped because nobody rereads a 540-entry file before
// appending. This is the reread, automated.
//
// Approach: pull each "## <num><punct> <title>" heading, tokenise the title,
// drop stopwords, and score every pair by Jaccard over the token set. Cheap
// (O(n^2) over ~550 headings is ~150k set intersections, well under a second)
// and dependency-free.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gateFindings } from '../../scripts/lib/findings.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISTAKES_PATH = path.join(__dirname, '..', '..', 'docs', 'MISTAKES.md');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'nor', 'for', 'yet', 'of', 'to',
  'in', 'on', 'at', 'by', 'with', 'from', 'into', 'over', 'under', 'is', 'was',
  'were', 'are', 'be', 'been', 'being', 'it', 'its', 'that', 'this', 'these',
  'those', 'as', 'than', 'then', 'not', 'no', 'never', 'one', 'two', 'own',
  'which', 'who', 'what', 'when', 'where', 'why', 'how', 'had', 'has', 'have',
  'did', 'does', 'do', 'a11y',
]);

// Pairs that would score high but are known-distinct entries (a deliberate
// cross-reference or update note, not a duplicate). Keyed by "loA-loB" (lower
// old-number first) with a one-line reason. Empty today: nothing in the current
// file needs it. Add here rather than lowering THRESHOLD to make a real flag go away.
const ALLOWLIST = new Set([]);

function parseEntries(text) {
  const lines = text.split('\n');
  const entries = [];
  const headingRe = /^## (#?)(\d+)\b\s*[.:\u2014·-]?\s*(.*)$/u;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (!m) continue;
    entries.push({ num: parseInt(m[2], 10), line: i + 1, title: m[3].trim(), heading: lines[i] });
  }
  return entries;
}

function tokenize(title) {
  const words = title
    .toLowerCase()
    .replace(/`/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w) && w.length > 1);
  return new Set(words);
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Calibration: swept THRESHOLD from 0.95 down to 0.35 over the current 527-entry
// file. The two verbatim duplicates this gate is modelled on scored a Jaccard of
// 1.0 (see the #468/#469 entry, which records that exact scan). Down to 0.5, zero
// pairs fire. Between 0.5 and 0.35 seven pairs appear, and every one of them is a
// genuinely distinct entry that just shares a recurring phrase ("the layout audit
// called X a collision", "the determinism net could not see X") or is an update
// note on its own entry (two "260" headings, one an amendment to the other).
// 0.75 sits with a wide margin above that noise floor and well under 1.0, so it
// catches a verbatim or near-verbatim re-filed heading without flagging distinct
// entries that happen to share vocabulary.
const THRESHOLD = 0.75;

function main() {
  const f = gateFindings();
  const text = readFileSync(MISTAKES_PATH, 'utf8');
  const entries = parseEntries(text);
  const tokens = entries.map((e) => tokenize(e.title));

  const hits = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const score = jaccard(tokens[i], tokens[j]);
      if (score < THRESHOLD) continue;
      const a = entries[i], b = entries[j];
      const key = [a.num, b.num].sort((x, y) => x - y).join('-');
      if (ALLOWLIST.has(key)) continue;
      hits.push({ a, b, score });
    }
  }

  if (hits.length === 0) {
    console.log(`mistakes-dupes: OK, no heading pairs >= ${THRESHOLD} Jaccard over ${entries.length} entries.`);
    f.emit();
    return;
  }

  hits.sort((x, y) => y.score - x.score);
  console.log(`mistakes-dupes: ${hits.length} suspect pair(s) at >= ${THRESHOLD} Jaccard:\n`);
  for (const { a, b, score } of hits) {
    f.fail('mistakes-dupe',
      `${score.toFixed(2)}  #${a.num} ${a.title} (line ${a.line})  ~  #${b.num} ${b.title} (line ${b.line})`,
      { at: `docs/MISTAKES.md:${a.line}`,
        fix: 'if a deliberate cross-reference, not a duplicate, add the pair to ALLOWLIST in this file with a reason' });
  }
  f.emit();
  process.exit(1);
}

main();
