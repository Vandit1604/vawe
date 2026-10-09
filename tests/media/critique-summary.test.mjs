// tests/media/critique-summary.test.mjs: the grouped findings, the closing summary and the per-film output paths of `vawe critique`.
//   node --test tests/media/critique-summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filmKey, freshImages, groupFindingLines, summaryLines } from '../../harness/lib/critique-summary.mjs';
import { defaultOutDir } from '../../harness/media/see/core.mjs';
import { chooseRefs } from '../../harness/lib/refs.mjs';

const hold = (i) => ({ code: 'text-unreadable-hold', severity: 'warn', summary: `"w${i}" is still for 0.1s`, at: `${i}.0s`, fix: 'hold longer' });

test('thirty findings of one rule print as one line with the count and the first seconds', () => {
  const lines = groupFindingLines(Array.from({ length: 30 }, (_, i) => hold(i)));
  assert.equal(lines.length, 2);
  assert.match(lines[0], /\[text-unreadable-hold\] 30 findings at 0\.0s, 1\.0s, 2\.0s, 3\.0s and 26 more; first: "w0"/);
  assert.match(lines[1], /fix: hold longer/);
});

test('a rule with three findings or fewer prints each one', () => {
  const lines = groupFindingLines([hold(1), hold(2), { code: 'dead-stop', severity: 'warn', summary: 'stops' }]);
  assert.equal(lines.length, 3);
  assert.match(lines[2], /\[dead-stop\] stops/);
});

test('the summary counts findings by rule and lists every image path', () => {
  const lines = summaryLines([hold(1), hold(2), { code: 'dead-stop', severity: 'warn', summary: 's' }], ['/a/small.png', '/a/strip-1.png']);
  assert.ok(lines.includes('summary: 3 finding(s): text-unreadable-hold 2, dead-stop 1'));
  assert.deepEqual(lines.slice(-2), ['  /a/small.png', '  /a/strip-1.png']);
  assert.equal(summaryLines([], [])[1], 'summary: no findings');
});

test('two films with the same page.html name get different output folders', () => {
  assert.equal(filmKey('films/alpha/page.html'), 'alpha');
  assert.equal(filmKey('out/beta.mp4'), 'beta');
  assert.notEqual(defaultOutDir('films/alpha/page.html'), defaultOutDir('films/beta/page.html'));
  assert.match(defaultOutDir('films/alpha/page.html'), /see[\\/]alpha$/);
});

test('freshImages skips files older than the run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crit-'));
  fs.writeFileSync(path.join(dir, 'old.png'), 'x');
  fs.utimesSync(path.join(dir, 'old.png'), 1, 1);
  fs.writeFileSync(path.join(dir, 'strip-1.png'), 'x');
  assert.deepEqual(freshImages(dir, Date.now() - 5000), [path.join(dir, 'strip-1.png')]);
  fs.rmSync(dir, { recursive: true });
});

test('an unknown film type says what to add to the brief', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refs-'));
  fs.writeFileSync(path.join(dir, 'refs.json'), '[]');
  const r = chooseRefs({ dir, briefText: 'no template here', seconds: 5, routeRequest: () => null });
  assert.match(r.skipped, /add a line `Template: prompts\/<type>\.md` to brief\.md/);
  fs.rmSync(dir, { recursive: true });
});
