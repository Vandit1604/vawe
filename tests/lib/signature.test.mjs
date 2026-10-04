import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DIALS } from '../../core/motion/signature.js';
import { EASE } from '../../core/motion/presets.js';
import { dialRanges, signatureSection, unchosenAdvice, signatureLine } from '../../harness/lib/signature.mjs';
import { measureMotion } from '../../harness/lib/motion-lint.mjs';
import { firedRules, firedLines, ROW_RULES } from '../../harness/lib/taste-steps.mjs';
import { DEFAULT_ROWS } from '../../harness/lib/acceptance.mjs';
import { draftRuleLines } from '../../harness/lib/runs-report.mjs';
import { digestText, DIGEST_WORDS_MAX, readInputs } from '../../harness/dev/taste-build.mjs';
import { starterPage } from '../../harness/cli/new.mjs';

const rec = (over) => ({ target: 0, label: 'h1', id: 'enter', props: ['translate', 'scale'], delay: 0, duration: 0.65, easing: EASE.land, kfEasings: [], opacity: null, from: '', fullFrame: false, decorative: false, ...over });

test('every dial has one owning rule, and its range is the first sentence of that rule', () => {
  const ranges = dialRanges();
  assert.deepEqual(ranges.map((d) => d.dial), DIALS);
  for (const d of ranges) {
    const rule = fs.readFileSync(d.file, 'utf8');
    assert.match(rule, new RegExp(`^dial: ${d.dial}$`, 'm'));
    assert.ok(rule.includes(d.range), `${d.dial}: range is in ${d.file}`);
  }
});

test('the brief block lists six dials with a range, points at the page meta and holds no chosen line', () => {
  const section = signatureSection();
  assert.equal(section.match(/^- (band|ease|stagger|seam|palette|thread) /gm).length, 6);
  assert.doesNotMatch(section, /chosen:/);
  assert.match(section, /Choose in the page: `<meta name="signature"/);
  assert.match(section, /^- band .*energy 0\.15 to 0\.3 s/m);
  assert.doesNotMatch(starterPage({}), /(?:band|ease|stagger|seam|palette|thread)=[^;"]/);
});

test('unchosen dials give one advice line that names them all', () => {
  assert.deepEqual(unchosenAdvice({ band: 'gravity', seam: 'wipe', thread: 'type' }),
    ['signature unchosen: ease, stagger, palette (choose in <meta name="signature">; ranges: brief.md)']);
  assert.deepEqual(unchosenAdvice(Object.fromEntries(DIALS.map((d) => [d, 'x']))), []);
});

test('measureMotion reads the band, the ease name and the stagger from the moves', () => {
  const records = [0, 0.05, 0.1].map((delay, i) => rec({ target: i, delay, duration: 0.4 })).concat(rec({ target: 9, id: 'enter-fade', props: ['opacity'], opacity: [0, 1], duration: 0.1 }));
  const browser = EASE.land.replace(/, /g, ' 0%, ');
  const m = measureMotion(records.map((r) => ({ ...r, easing: browser })));
  assert.deepEqual(m, { band: 'professional', ease: 'land', stagger: 50, medianS: 0.4 });
  assert.deepEqual(measureMotion([]), { band: null, ease: null, stagger: null, medianS: null });
  assert.equal(measureMotion([rec({ easing: 'inferred' })]).ease, null);
});

test('the dev line shows declared against measured for band, ease and stagger', () => {
  const line = signatureLine({ band: 'gravity', ease: 'land' }, { band: 'professional', ease: 'land', stagger: 50 });
  assert.equal(line, 'signature: band gravity (measured professional) · ease land (measured land) · stagger unchosen (measured 50 ms) · seam unchosen · palette unchosen · thread unchosen');
});

test('firedRules gives one entry per rule at its first second; firedLines names the rule file and its instead text', () => {
  const rows = [{ status: 'advice', metric: 'near-identical tail tiles', measured: '15', detail: ['the last tiles barely change'] }, { status: 'ok', metric: 'jerky steps', measured: '0', detail: [] }];
  const fired = firedRules([{ rule: 'stagger', at: 2.4, what: '3 elements land on one frame' }],
    ['world held 0.0-3.0 s (3.0 s)', 'text "x" at 1.0 s: cap height 4.0% of frame (rule readable-text-size asks 6%)', 'world held 4.0-8.0 s (4.0 s)'], rows);
  assert.deepEqual(fired.map((f) => [f.id, f.t]), [['world-turns', 0], ['readable-text-size', 1], ['stagger', 2.4], ['moving-tail', null]]);
  const lines = firedLines(fired);
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^ {2}@1\.0s .*\(rule readable-text-size, taste\/rules\/readable-text-size\.md\); instead: /);
  assert.equal(firedLines([]).length, 0);
});

test('every acceptance row a taste rule owns is a default row', () => {
  const metrics = new Set(DEFAULT_ROWS.map((r) => r.metric));
  for (const metric of Object.keys(ROW_RULES)) assert.ok(metrics.has(metric), metric);
});

test('runs show each draft\'s fired rules and, against the draft before, which were fixed and which still fire', () => {
  const dev = (at, ids) => ({ cmd: 'dev', at, fired: ids });
  const lines = draftRuleLines([dev('2026-10-05T10:00:00Z', ['stagger', 'world-turns']), { cmd: 'judge', at: '2026-10-05T10:05:00Z' }, dev('2026-10-05T10:10:00Z', ['world-turns']), dev('2026-10-05T10:20:00Z', []), { cmd: 'dev', at: '2026-10-05T10:30:00Z', fired: null }]);
  assert.deepEqual(lines, [
    'draft 1 10-05 10:00: fired stagger, world-turns',
    'draft 2 10-05 10:10: fired world-turns · fixed stagger · still world-turns',
    'draft 3 10-05 10:20: fired none · fixed world-turns · still none',
  ]);
});

test('the digest stays within its word cap, and the build fails with the overage past it', () => {
  const inputs = readInputs();
  assert.ok(digestText(inputs.rules, inputs.attractors).split(/\s+/).filter(Boolean).length <= DIGEST_WORDS_MAX);
  const fat = inputs.rules.map((r) => (r.digest ? { ...r, digest: `${r.digest} ${'word '.repeat(60)}` } : r));
  assert.throws(() => digestText(fat, inputs.attractors), /taste digest is \d+ words, \d+ over the 400 cap/);
});
