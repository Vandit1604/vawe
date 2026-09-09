// scripts/gates/ledger-not.test.mjs: deriveNotLine, the ledger's forward query ("what has recent work
// leant on, so a new brief can exclude it by name"). Three cases: an empty ledger produces no line
// rather than a fabricated one; a corpus of one film excludes exactly what that film used; a mixed
// corpus only excludes what a strict majority of it agrees on.
//   node scripts/gates/ledger-not.test.mjs
import assert from 'node:assert/strict';
import { deriveNotLine } from './ledger.mjs';

const fp = (cats) => ({ theme: 'plinth', structure: [], vocab: [], layout: [], colors: [], cats });

// an empty ledger: no line, never a fabricated one
{
  const { pool, line } = deriveNotLine(undefined, []);
  assert.equal(pool.length, 0);
  assert.equal(line, null, 'nothing shipped yet must not invent a NOT line');
}

// a theme with no logged design at all: same as empty, scoped
{
  const entries = [{ file: 'a.json', theme: 'other', fp: fp({ bg: ['x'], entrance: [], exit: [], cut: [] }) }];
  const { pool, line } = deriveNotLine('plinth', entries);
  assert.equal(pool.length, 0);
  assert.equal(line, null);
}

// a corpus of ONE film: it is all the evidence there is, so its own vocabulary is what gets excluded
{
  const entries = [{
    file: 'a.json', theme: 'plinth',
    fp: fp({ bg: ['cobalt-wash'], entrance: ['slide-up'], exit: ['defocus'], cut: ['whipcrack'] }),
  }];
  const { line } = deriveNotLine('plinth', entries);
  assert.match(line, /cobalt-wash/, 'the one film\'s background preset must be named');
  assert.match(line, /slide-up/, 'the one film\'s entrance must be named');
  assert.match(line, /defocus/, 'the one film\'s exit must be named');
  assert.match(line, /whipcrack/, 'the one film\'s cut family must be named');
  assert.match(line, /1 logged design/, 'the corpus size must be stated, not left implicit');
}

// a mixed corpus: only what a STRICT MAJORITY agree on survives. Two films share bg + entrance + cut
// but disagree on exit, so exit is excluded from the line even though each exit was used once.
{
  const entries = [
    { file: 'a.json', theme: 'plinth', fp: fp({ bg: ['cobalt-wash'], entrance: ['slide-up'], exit: ['defocus'], cut: ['whipcrack'] }) },
    { file: 'b.json', theme: 'plinth', fp: fp({ bg: ['cobalt-wash'], entrance: ['slide-up'], exit: ['fade'], cut: ['whipcrack'] }) },
  ];
  const { line } = deriveNotLine('plinth', entries);
  assert.match(line, /cobalt-wash/);
  assert.match(line, /slide-up/);
  assert.match(line, /whipcrack/);
  assert.doesNotMatch(line, /defocus/, 'a value only ONE of two films used is not a majority, must not appear');
  assert.doesNotMatch(line, /fade/, 'same: the other film\'s lone exit must not appear either');
  assert.match(line, /2 logged design/);
}

console.log('✓ ledger-not.test.mjs: empty ledger, unmatched theme, a corpus of one, and a strict-majority mixed corpus all behave');
