import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendRun, readRuns, readAllRuns, agentId, namedAgent } from '../../harness/lib/runlog.mjs';
import { newEvent, devEvent, judgeEvent, shipEvent } from '../../harness/lib/run-events.mjs';
import { selfRecordCheck } from '../../harness/lib/judge-self-record.mjs';
import { filmLines, allRows, modelRows, allLines, normalize } from '../../harness/lib/runs-report.mjs';
import { jobLogPath, shipVerdict } from '../../harness/lib/ship-status.mjs';

const ROWS = [
  { metric: 'a', status: 'ok' },
  { metric: 'b', status: 'advice' },
  { metric: 'c', status: 'not measured' },
];

function inTempDir(env, fn) {
  const cwd = process.cwd();
  const saved = {};
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; if (env[k] === null) delete process.env[k]; else process.env[k] = env[k]; }
  process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-runlog-')));
  try { return fn(); } finally {
    process.chdir(cwd);
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

test('event shapes: new, dev, judge, ship carry only their own fields', () => {
  assert.deepEqual(newEvent({ template: 'prompts/a.md', length: 5, answered: new Set(['show']), guessed: ['words'] }),
    { cmd: 'new', template: 'prompts/a.md', length: 5, answered: ['show'], guessed: ['words'] });
  assert.deepEqual(devEvent({ tier: 'draft', wallS: 31.44, captureS: 18.04, checks: [['contrast', 3.14], ['spec', 2]], cache: { hit: 1, miss: 2 }, rows: ROWS }),
    { cmd: 'dev', tier: 'draft', wallS: 31.4, captureS: 18, checksS: { contrast: 3.1, spec: 2 }, cache: { hit: 1, miss: 2 }, acceptance: { green: 1, measured: 2, red: ['b'] } });
  assert.equal(devEvent({ tier: 'fast', wallS: 1, captureS: 1, checks: [], cache: { hit: 0, miss: 0 }, rows: null }).acceptance, null);
  assert.deepEqual(judgeEvent({ stage: 'draft', verdict: 'FIX', scores: { hook: 9, motion: 6 }, anchor: [{ yes: true }, { yes: false }], ledger: { fixed: 1, partly: 0, still: 2, unmarked: 0, new: 1 }, seconds: 30.2 }),
    { cmd: 'judge', stage: 'draft', verdict: 'FIX', scores: { hook: 9, motion: 6 }, anchorYes: 1, anchorTotal: 2, ledger: { fixed: 1, partly: 0, still: 2, unmarked: 0, new: 1 }, seconds: 30.2 });
  assert.deepEqual(shipEvent({ verdict: 'PASS', renderS: 120.04, acceptance: { green: 5, measured: 5, red: [] } }),
    { cmd: 'ship', verdict: 'PASS', renderS: 120, acceptance: { green: 5, measured: 5, red: [] } });
  assert.equal(shipEvent({ renderS: 1 }).verdict, null);
});

test('appendRun stamps the common fields; VAWE_AGENT and VAWE_MODEL are read from the environment', () => {
  inTempDir({ VAWE_AGENT: 'judge-x', VAWE_MODEL: 'sonnet', CLAUDE_CODE_SESSION_ID: 'abcdef123456' }, () => {
    const line = appendRun('films/demo/page.html', shipEvent({ verdict: null, renderS: 2 }));
    assert.equal(line.film, 'demo');
    assert.equal(line.agent, 'judge-x');
    assert.equal(line.model, 'sonnet');
    assert.equal(line.session, 'abcdef123456');
    assert.equal(typeof line.dirty, 'boolean');
    assert.ok(Date.parse(line.at) > 0);
    assert.equal(readRuns('demo').length, 1);
    assert.ok(!('content' in line) && !('craftLive' in line) && !('sceneLive' in line) && !('knowledge' in line));
  });
});

test('without VAWE_AGENT the agent is the session plus one tag per process; the model is null', () => {
  inTempDir({ VAWE_AGENT: null, VAWE_MODEL: null, CLAUDE_CODE_SESSION_ID: 'abcdef123456' }, () => {
    assert.match(agentId(), /^abcdef12#[0-9a-f]{4}$/);
    assert.equal(agentId(), agentId());
    assert.equal(namedAgent(agentId()), null);
    assert.equal(appendRun('demo', { cmd: 'dev' }).model, null);
  });
});

test('selfRecordCheck: the same named agent in the same session is refused, a fresh named judge is not', () => {
  inTempDir({ VAWE_AGENT: 'author', CLAUDE_CODE_SESSION_ID: 's1' }, () => {
    appendRun('demo', { cmd: 'dev' });
    assert.equal(selfRecordCheck('demo').selfRecorded, true);
    process.env.VAWE_AGENT = 'judge-demo';
    assert.equal(selfRecordCheck('demo').selfRecorded, false);
    delete process.env.VAWE_AGENT;
    assert.equal(selfRecordCheck('demo').selfRecorded, true);
  });
});

test('ship job logs live in out/ship-jobs, named by the job id', () => {
  assert.equal(jobLogPath('demo-lx4k'), path.join('out', 'ship-jobs', 'demo-lx4k.log'));
});

test('shipVerdict: PASS needs the judge and every acceptance row, no judge gives null', () => {
  assert.equal(shipVerdict({}), null);
  assert.equal(shipVerdict({ verdict: ['judge: PASS'], acceptance: { allGreen: true } }), 'PASS');
  assert.equal(shipVerdict({ verdict: ['judge: PASS'], acceptance: { allGreen: false } }), 'FIX');
  assert.equal(shipVerdict({ verdict: ['judge: FIX'] }), 'FIX');
});

const NOW = Date.parse('2026-10-01T12:00:00Z');
const OLD = { at: '2026-09-29T10:00:00.000Z', cmd: 'render-page', agent: '72334', render: { file: '/x/out/demo-draft.mp4', frames: 90, fps: 30, ms: 20000 }, judge: null, content: null, wallMs: null };
const OLD_JUDGE = { at: '2026-09-29T10:05:00.000Z', cmd: 'judge', agent: '72334', judge: { verdict: 'FIX', file: 'x.png' } };
const NEW = [
  { at: '2026-09-30T09:00:00.000Z', cmd: 'dev', agent: 'writer', model: 'sonnet', wallS: 30, captureS: 18, acceptance: { green: 9, measured: 12, red: ['a'] } },
  { at: '2026-09-30T09:10:00.000Z', cmd: 'judge', stage: 'draft', agent: 'judge-demo', model: 'sonnet', verdict: 'FIX', scores: { hook: 9, motion: 6, type: 8 }, seconds: 28 },
  { at: '2026-09-30T09:20:00.000Z', cmd: 'dev', agent: 'writer', model: 'sonnet', wallS: 20, acceptance: { green: 12, measured: 12, red: [] } },
  { at: '2026-09-30T09:30:00.000Z', cmd: 'judge', stage: 'draft', agent: 'judge-demo', model: 'sonnet', verdict: 'PASS', scores: { hook: 9, motion: 9, type: 9 }, seconds: 27 },
  { at: '2026-09-30T10:00:00.000Z', cmd: 'ship', agent: 'writer', model: 'sonnet', verdict: 'PASS', renderS: 140, acceptance: { green: 12, measured: 12, red: [] } },
];

test('normalize reads an old render record as a draft and an old verdict as a judge', () => {
  assert.deepEqual([normalize(OLD).cmd, normalize(OLD).seconds, normalize(OLD).agent], ['dev', 20, null]);
  assert.deepEqual([normalize(OLD_JUDGE).cmd, normalize(OLD_JUDGE).verdict, normalize(OLD_JUDGE).stage], ['judge', 'FIX', 'manual']);
});

test('runs <film>: old and new records mix, one row each in time order, then the summary', () => {
  const lines = filmLines('demo', [...NEW, OLD_JUDGE, OLD].reverse());
  assert.equal(lines.length, 1 + 1 + 7 + 0);
  assert.match(lines[1], /^09-29 10:00\s+dev\s+-\s+20\s+-\s+-$/);
  assert.match(lines[4], /judge\s+judge-demo\s+28\s+-\s+FIX total 23 \(motion 6\) \[draft\]/);
  assert.match(lines.at(-1), /^drafts 3 · median draft 20 s · PASS after 3 judge rounds · first judged total 23$/);
  assert.deepEqual(filmLines('none', []), ['none: no runs logged']);
});

test('runs <film>: a film with no judged PASS says so', () => {
  assert.match(filmLines('demo', NEW.slice(0, 2)).at(-1), /no PASS yet · first judged total 23$/);
});

test('runs --all: one row per film in the last 30 days, medians per model, at most 40 lines', () => {
  const films = [{ film: 'demo', runs: NEW }, { film: 'old', runs: [{ ...OLD, at: '2026-07-01T00:00:00.000Z' }] }, { film: 'legacy', runs: [OLD] }];
  const rows = allRows(films, NOW);
  assert.deepEqual(rows.map((r) => r.film), ['demo', 'legacy']);
  assert.deepEqual([rows[0].drafts, rows[0].medianDraftS, rows[0].firstTotal, rows[0].bestTotal, rows[0].passed, rows[0].model], [2, 25, 23, 27, true, 'sonnet']);
  const models = modelRows(rows);
  assert.deepEqual(models, [{ model: 'sonnet', films: 1, medianDrafts: 2, medianDraftS: 25, medianFirstTotal: 23, passed: 1 }]);
  const lines = allLines(rows, models);
  assert.match(lines[1], /^demo\s+2\s+25\s+23\s+27\s+yes\s+sonnet$/);
  assert.ok(lines.some((l) => l.startsWith('sonnet')));
  const many = Array.from({ length: 80 }, (_, i) => ({ film: `f${i}`, runs: [{ ...NEW[0], at: `2026-09-30T09:${String(i % 60).padStart(2, '0')}:00.000Z` }] }));
  const manyRows = allRows(many, NOW);
  assert.ok(allLines(manyRows, modelRows(manyRows)).length <= 40);
  assert.deepEqual(allLines([], []), ['no films with runs in the last 30 days']);
});

test('readAllRuns lists every <film>.runs.jsonl and drops a corrupt line', () => {
  inTempDir({ VAWE_AGENT: null }, () => {
    appendRun('a', { cmd: 'dev' });
    fs.appendFileSync(path.join('out', 'a.runs.jsonl'), 'not json\n');
    appendRun('b', { cmd: 'new' });
    assert.deepEqual(readAllRuns('out').map((f) => [f.film, f.runs.length]), [['a', 1], ['b', 1]]);
  });
});

test('filmKeyOf: a draft, a windowed draft, a final and its web copy all key to the film', async () => {
  const { filmKeyOf } = await import('../../harness/lib/runlog.mjs');
  for (const f of ['out/x-draft.mp4', 'out/x-draft-2-6.5.mp4', 'out/x.mp4', 'out/x.web.mp4', 'films/x/page.html', 'x-draft']) assert.equal(filmKeyOf(f), 'x', f);
});
