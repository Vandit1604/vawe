import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readAllRuns } from '../../harness/lib/runlog.mjs';
import { tasteReport, tasteLines, verdictOf, MAX_LINES } from '../../harness/lib/taste-report.mjs';

const dev = (at, fired, signature = {}) => ({ at, cmd: 'dev', wallS: 5, signature, measured: {}, rules_fired: fired.map((id) => ({ id, value: 'x', t: 1 })) });
const judge = (at, total, extra = {}) => ({ at, cmd: 'judge', stage: 'draft', verdict: 'FIX', scores: { a: total / 2, b: total / 2 }, notes: [], waivers: [], sameness: null, template: null, ...extra });
const fail = (rule) => ({ rule, t: 1, verdict: 'fail' });

const FILMS = {
  alpha: [
    dev('2026-10-01T01:00:00Z', ['r-keep', 'r-check', 'r-noisy', 'attractors'], { band: 'professional', ease: 'land' }),
    judge('2026-10-01T02:00:00Z', 10, { notes: [fail('r-keep'), fail('r-check')], waivers: [{ code: 'r-noisy', earned: true }], sameness: { sibling: true, films: ['beta'], shared: 'the ring' }, template: { tell: true, t: 2 } }),
    dev('2026-10-01T03:00:00Z', ['r-check', 'r-noisy'], { band: 'professional', ease: 'land' }),
    judge('2026-10-01T04:00:00Z', 13, { notes: [fail('r-check')], waivers: [{ code: 'r-noisy', earned: true }], sameness: { sibling: true, films: ['beta'], shared: 'the ring' }, template: { tell: true, t: 3 } }),
    dev('2026-10-01T05:00:00Z', ['r-check'], { band: 'professional', ease: 'land' }),
  ],
  beta: [
    dev('2026-10-02T01:00:00Z', ['r-contra'], { band: 'professional', ease: 'settle' }),
    judge('2026-10-02T02:00:00Z', 10, { sameness: { sibling: true, films: ['alpha'], shared: 'the ring' } }),
    dev('2026-10-02T03:00:00Z', ['r-contra'], { band: 'professional', ease: 'settle' }),
    judge('2026-10-02T04:00:00Z', 11),
  ],
  gamma: [
    { at: '2026-09-01T01:00:00Z', cmd: 'render', render: { file: 'out/gamma-draft.mp4', ms: 20000 } },
    { at: '2026-09-01T02:00:00Z', cmd: 'judge', judge: { verdict: 'FIX', overall: 6 } },
    dev('2026-09-01T03:00:00Z', []),
  ],
  delta: [dev('2026-10-03T01:00:00Z', [], { band: 'gravity', ease: 'land' })],
};

const IDS = ['r-keep', 'r-check', 'r-noisy', 'r-contra', 'r-dead', 'r-never'];

function reportFor(films = FILMS, options = { ruleIds: IDS }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taste-'));
  for (const [film, runs] of Object.entries(films)) fs.writeFileSync(path.join(dir, `${film}.runs.jsonl`), `${runs.map((r) => JSON.stringify(r)).join('\n')}\nnot json\n`);
  try { return tasteReport(readAllRuns(dir), options); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const row = (report, id) => report.rows.find((r) => r.id === id);

test('each verdict: keep, check, noisy by waiver, noisy by the judge, dead', () => {
  const r = reportFor();
  assert.deepEqual(['r-keep', 'r-check', 'r-noisy', 'r-contra'].map((id) => row(r, id).verdict), ['keep', 'check', 'noisy', 'noisy']);
  assert.deepEqual(r.dead, ['r-dead', 'r-never']);
  assert.equal(row(r, 'r-dead'), undefined);
});

test('fired, fixed in the next draft, waived and the score change after a fix', () => {
  const r = reportFor();
  assert.deepEqual([row(r, 'r-keep').fired, row(r, 'r-keep').films, row(r, 'r-keep').fixed, row(r, 'r-keep').opps, row(r, 'r-keep').rate, row(r, 'r-keep').gain], [2, 1, 1, 1, 1, 3]);
  assert.deepEqual([row(r, 'r-check').fired, row(r, 'r-check').fixed, row(r, 'r-check').opps, row(r, 'r-check').gain], [5, 0, 2, null]);
  assert.deepEqual([row(r, 'r-noisy').waived, row(r, 'r-noisy').earned], [1, 1]);
});

test('verdictOf: a rule needs both a fix rate and a gain to be kept, and one judge answer is not a contradiction', () => {
  const s = (over) => ({ fired: 4, films: new Set(['a', 'b']), opps: 2, fixed: 2, deltas: [], waived: new Set(), earned: 0, confirmed: 0, contradicted: 0, ...over });
  assert.equal(verdictOf(s({}), 2), 'keep');
  assert.equal(verdictOf(s({}), null), 'check');
  assert.equal(verdictOf(s({}), -1), 'check');
  assert.equal(verdictOf(s({ fixed: 0 }), 2), 'check');
  assert.equal(verdictOf(s({ contradicted: 1 }), 2), 'keep');
  assert.equal(verdictOf(s({ fired: 0 }), 2), 'dead');
});

test('variety: the distribution and the concentration of each dial, from dev events and the page meta', () => {
  const r = reportFor({ ...FILMS, epsilon: [{ at: '2026-10-04T01:00:00Z', cmd: 'ship', verdict: 'PASS' }] }, { ruleIds: IDS, readMeta: (film) => (film === 'epsilon' ? 'band=cinematic; ease=land' : null) });
  const band = r.variety.find((v) => v.dial === 'band');
  assert.deepEqual([band.values, band.films, band.share, band.flag], [{ professional: 2, cinematic: 1, gravity: 1 }, 4, 0.5, false]);
  const ease = r.variety.find((v) => v.dial === 'ease');
  assert.deepEqual([ease.values, ease.share, ease.flag], [{ land: 3, settle: 1 }, 0.75, true]);
  assert.equal(r.variety.find((v) => v.dial === 'seam').films, 0);
});

test('siblings come out as one pair however many films name each other, with the shared trait', () => {
  assert.deepEqual(reportFor().sameness, [{ films: ['alpha', 'beta'], shared: 'the ring' }]);
});

test('attractor hits by day and template tells by film', () => {
  const r = reportFor();
  assert.deepEqual(r.attractors, [{ day: '2026-10-01', n: 1 }]);
  assert.deepEqual(r.template, [{ film: 'alpha', n: 2 }]);
});

test('bar counts wins and losses per dial from the latest judge of each film that had them', () => {
  const bar = (...w) => ['text', 'colour', 'motion'].map((dial, i) => ({ ref: 'R', dial, winner: w[i] }));
  const r = reportFor({
    one: [judge('2026-10-01T01:00:00Z', 10, { bar: bar('R', 'R', 'R') }), judge('2026-10-01T02:00:00Z', 10, { bar: bar('ours', 'R', 'R') })],
    two: [judge('2026-10-01T03:00:00Z', 10, { bar: bar('ours', 'ours', 'R') })],
    three: [judge('2026-10-01T04:00:00Z', 10)],
  });
  assert.deepEqual(r.bar, { films: 2, dials: { text: { won: 2, lost: 0 }, colour: { won: 1, lost: 1 }, motion: { won: 0, lost: 2 } } });
  assert.ok(tasteLines(r).some((l) => l === 'bar (latest judge per film, ours against reference films, 2 films): text won 2 lost 0, colour won 1 lost 1, motion won 0 lost 2'));
  assert.ok(tasteLines(reportFor({})).some((l) => l.startsWith('bar: no judge run')));
});

test('old records without rule, signature or note fields are tolerated and counted', () => {
  const r = reportFor();
  assert.deepEqual(r.counts, { films: 4, drafts: 8, draftsWithRules: 7, judges: 5, judgesWithNotes: 4 });
  assert.doesNotThrow(() => reportFor({ old: [{ at: '2026-01-01T00:00:00Z', cmd: 'dev' }, { at: '2026-01-01T00:01:00Z', cmd: 'judge' }, { at: 'x', note: 'odd' }] }));
  assert.ok(tasteLines(reportFor({})).join('\n').includes('0 films'));
});

test('the text report stays under the line cap however many rules fired, and keeps the dead rules to one line', () => {
  const many = Array.from({ length: 80 }, (_, i) => `rule-${String(i).padStart(2, '0')}`);
  const lines = tasteLines(reportFor({ big: [dev('2026-10-01T01:00:00Z', many), dev('2026-10-01T02:00:00Z', [])] }, { ruleIds: [...many, ...Array.from({ length: 60 }, (_, i) => `idle-${i}`)] }));
  assert.ok(lines.length <= MAX_LINES, `${lines.length} lines`);
  assert.equal(lines.filter((l) => l.startsWith('dead')).length, 1);
  assert.ok(lines.some((l) => /more rules \(use --json\)/.test(l)));
  const small = tasteLines(reportFor());
  assert.ok(small.some((l) => /^r-keep +2 +1 +1\/1 +100% +0 +0 +\+3 +keep/.test(l)));
  assert.ok(small.some((l) => l.startsWith('ease') && l.includes('67% !')));
  assert.ok(small.includes('alpha ~ beta: the ring'));
});
