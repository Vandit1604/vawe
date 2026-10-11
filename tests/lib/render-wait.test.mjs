import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsOfFilm, waitingLine, resultAfter, waitForFilm } from '../../harness/lib/render-wait.mjs';
import { VERBS } from '../../harness/cli/verbs.mjs';

const slot = (who, kind = 'draft', start = '2026-10-11T10:00:00.000Z') => ({ who, kind, start, pid: 1 });
const run = (at, verb, exitCode = 0, extra = {}) => ({ at, cmd: 'verb', verb, exitCode, error: null, durationS: 12.3, ...extra });

test('slotsOfFilm matches a page path, an mp4 path and a film name', () => {
  const slots = [slot('brindle'), slot('billhook')];
  assert.equal(slotsOfFilm('films/brindle/page.html', slots).length, 1);
  assert.equal(slotsOfFilm('out/brindle-draft.mp4', slots).length, 1);
  assert.equal(slotsOfFilm('billhook', slots)[0].who, 'billhook');
  assert.equal(slotsOfFilm('nobody', slots).length, 0);
});

test('waitingLine names the kind and the age of the oldest slot', () => {
  const now = Date.parse('2026-10-11T10:01:05.000Z');
  assert.equal(waitingLine('brindle', [slot('brindle', 'draft')], now), 'vawe wait: brindle has a draft render running, 65s in');
});

test('resultAfter returns the footer of the newest verb run after the mark and skips wait runs', () => {
  const runs = [run('2026-10-11T10:00:00Z', 'dev'), run('2026-10-11T10:05:00Z', 'wait'), { at: '2026-10-11T10:06:00Z', cmd: 'ship' }];
  assert.equal(resultAfter(runs, ''), 'vawe: dev ok in 12.3s');
  assert.equal(resultAfter(runs, '2026-10-11T10:00:00Z'), null);
  assert.equal(resultAfter([run('2026-10-11T10:00:00Z', 'dev', 1, { error: 'exit 1: boom' })], ''), 'vawe: dev FAILED (exit 1: boom) in 12.3s');
});

test('waitForFilm waits for the slot, logs one progress line a minute, then reads the result the verb logs', async () => {
  let t = 0;
  const lines = [];
  const slots = () => (t < 150_000 ? [slot('brindle', 'draft', new Date(0).toISOString())] : []);
  const runs = () => (t >= 160_000 ? [run('2026-10-11T10:00:00Z', 'dev')] : []);
  const sleep = async (ms) => { t += ms * 10; };
  const out = await waitForFilm('brindle', { capMs: 540_000, progressMs: 60_000, slots, runs, now: () => t, sleep, log: (l) => lines.push(l) });
  assert.deepEqual(out, { running: false, result: 'vawe: dev ok in 12.3s' });
  assert.equal(lines.length, 3, 'the first line plus one per minute: 60 s and 120 s');
  assert.match(lines[0], /waiting up to 540s/);
});

test('waitForFilm stops at the cap with running true, and returns the last result at once when nothing runs', async () => {
  let t = 0;
  const sleep = async (ms) => { t += ms * 100; };
  const busy = await waitForFilm('brindle', { capMs: 5_000, progressMs: 60_000, slots: () => [slot('brindle')], runs: () => [], now: () => t, sleep, log: () => {} });
  assert.deepEqual(busy, { running: true, result: null });
  const idle = await waitForFilm('brindle', { capMs: 5_000, progressMs: 60_000, slots: () => [], runs: () => [run('2026-10-11T10:00:00Z', 'dev')], now: () => t, sleep, log: () => {} });
  assert.deepEqual(idle, { running: false, result: 'vawe: dev ok in 12.3s' });
});

test('the wait verb runs ship-job wait with the film', () => {
  const wait = VERBS.find((v) => v.name === 'wait');
  assert.deepEqual(wait.build({}, ['films/x/page.html']), [{ script: 'harness/media/ship-job.mjs', args: ['wait', 'films/x/page.html'] }]);
});
