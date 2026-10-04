import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, STEPS, readInputs, staleFiles, parseRule, ruleProblems, withContents, buildFiles } from '../../harness/dev/taste-build.mjs';
import { TASTE_CARD_REL } from '../../harness/lib/judge-prompt.mjs';
import { PEAK_DBFS } from '../../harness/lib/peak-limit.mjs';
import { RUN_TILES, TAIL_TILES } from '../../harness/lib/sheet-tiles.mjs';
import { RULES as DRAFT } from '../../harness/lib/draft-check.mjs';
import { BANDS } from '../../core/motion/presets.js';
import { LIMITS } from '../../harness/lib/ship-status.mjs';
import { STILL_SEC } from '../../harness/lib/still-limit.mjs';

const { rules } = readInputs();
const taste = (...p) => path.join(ROOT, 'taste', ...p);
const ids = new Set(rules.map((r) => r.id));

const mdFilesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? mdFilesUnder(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []));

test('taste/build and taste/README.md equal a fresh build', () => {
  assert.deepEqual(staleFiles(), [], 'run node harness/dev/taste-build.mjs and commit the result');
});

test('every rule file has every field, a kebab-case id equal to its file name, and a known step and check', () => {
  assert.ok(rules.length >= 60, `${rules.length} rules`);
  assert.equal(ids.size, rules.length);
  for (const r of rules) assert.deepEqual(ruleProblems(r), [], r.file);
  assert.ok(rules.every((r) => STEPS.includes(r.step)));
});

test('a rule with a missing field, a bad id, an unknown check or a printed line that is not a pair is reported', () => {
  const good = fs.readFileSync(taste('rules', 'stagger.md'), 'utf8');
  assert.deepEqual(ruleProblems(parseRule(good, 'stagger.md')), []);
  assert.match(ruleProblems(parseRule(good.replace(/^prevents: .*\n/m, ''), 'stagger.md')).join('\n'), /no "prevents"/);
  assert.match(ruleProblems(parseRule(good, 'other.md')).join('\n'), /differs from the file name/);
  assert.match(ruleProblems(parseRule(good.replace('check: group-landing', 'check: made-up'), 'stagger.md')).join('\n'), /not a known check id/);
  assert.match(ruleProblems(parseRule(good.replace(/^print-motion: .*$/m, 'print-motion: stagger everything'), 'stagger.md')).join('\n'), /do X, not Y/);
});

test('every row of MIGRATION.md names an existing rule, an existing craft doc, or a deletion with a reason', () => {
  const rows = fs.readFileSync(taste('MIGRATION.md'), 'utf8').split('\n').filter((l) => /^\| `?[A-Za-z]/.test(l) && !l.startsWith('| old '));
  assert.ok(rows.length > 100, `${rows.length} rows`);
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    assert.equal(cells.length, 3, row);
    const target = cells[2];
    if (target.startsWith('deleted:')) assert.ok(target.slice(8).trim().length > 3, row);
    else if (target.startsWith('craft:')) assert.ok(fs.existsSync(path.join(ROOT, target.slice(6).trim())), row);
    else for (const id of target.split(',').map((s) => s.trim().replace(/`/g, ''))) assert.ok(ids.has(id), `${row}: no rule "${id}"`);
  }
});

test('every rule file is reachable from the index and every rule link in taste/ points at a real rule', () => {
  const readme = fs.readFileSync(taste('README.md'), 'utf8');
  for (const id of ids) assert.ok(readme.includes(`(rules/${id}.md)`), id);
  for (const file of mdFilesUnder(taste())) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/\(\.\.\/rules\/([a-z0-9-]+)\.md\)|\(rules\/([a-z0-9-]+)\.md\)/g)) {
      assert.ok(ids.has(m[1] || m[2]), `${path.relative(ROOT, file)} links rule ${m[1] || m[2]}`);
    }
  }
});

test('a markdown file in taste/ over 100 lines starts with a contents list', () => {
  for (const file of mdFilesUnder(taste()).filter((f) => !f.includes(`${path.sep}rules${path.sep}`))) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.split('\n').length > 100) assert.match(text, /\nContents:\n- \[/, path.relative(ROOT, file));
  }
  assert.match(withContents(`# t\n${Array.from({ length: 101 }, (_, i) => (i % 50 ? 'x' : `## Head ${i}`)).join('\n')}`), /Contents:\n- \[Head 0\]\(#head-0\)/);
});

test('the judge reads taste/build/CARD.md, which holds every scored rule and the five anti-pattern frames', () => {
  const card = fs.readFileSync(path.join(ROOT, TASTE_CARD_REL), 'utf8');
  for (const r of rules.filter((x) => x.scored === 'yes')) assert.ok(card.includes(`### ${r.id}\n`), r.id);
  assert.equal((card.match(/!\[[A-E]-/g) || []).length, 5);
  for (const m of card.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) assert.ok(fs.existsSync(path.join(taste('build'), m[1])), m[1]);
});

test('limits.json agrees with the numbers the checks hold today', () => {
  const limits = JSON.parse(buildFiles(readInputs())['taste/build/limits.json']);
  assert.equal(limits['sound-level'].peak_dbfs, PEAK_DBFS);
  assert.equal(limits['sound-level'].lufs_low, DRAFT.lufsLow);
  assert.equal(limits['sound-level'].lufs_high, DRAFT.lufsHigh);
  assert.equal(limits['world-turns'].run_tiles_max, RUN_TILES);
  assert.equal(limits['world-turns'].tail_tiles_max, TAIL_TILES);
  assert.equal(limits['world-turns'].turn_seconds_max, LIMITS.worldSec);
  assert.equal(limits['live-hold'].still_limit_s, STILL_SEC);
  assert.equal(limits['readable-text-size'].cap_height_pct, DRAFT.capFrac * 100);
  assert.equal(limits['readable-text-size'].chrome_cap_height_pct, DRAFT.chromeCapFrac * 100);
  assert.deepEqual([BANDS.energy[0], BANDS.energy[1], BANDS.professional[1], BANDS.gravity[1], BANDS.cinematic[1]],
    ['energy_min_s', 'energy_max_s', 'professional_max_s', 'gravity_max_s', 'cinematic_max_s'].map((k) => limits['speed-bands'][k]));
});
