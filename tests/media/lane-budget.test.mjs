// The lane count follows free memory and process slots, never exceeds cores - 1 or the cap, and is at least 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { laneBudget, LANE_MB, LANE_PROCS, MAX_LANES } from '../../harness/lib/lane-budget.mjs';
import { defaultWorkers } from '../../harness/media/render-page.mjs';

const roomy = { cpus: 16, freeMb: 100 * LANE_MB, freeProcs: 100 * LANE_PROCS };

test('plenty of room is limited by the cap', () => {
  assert.equal(laneBudget(roomy), MAX_LANES);
});

test('cores leave one for the renderer process', () => {
  assert.equal(laneBudget({ ...roomy, cpus: 4 }), 3);
});

test('free memory sets the lanes', () => {
  assert.equal(laneBudget({ ...roomy, freeMb: 2.5 * LANE_MB }), 2);
});

test('free process slots set the lanes', () => {
  assert.equal(laneBudget({ ...roomy, freeProcs: 3.2 * LANE_PROCS }), 3);
});

test('a starved machine still gets one lane', () => {
  assert.equal(laneBudget({ ...roomy, freeMb: 10, freeProcs: 0 }), 1);
});

test('defaultWorkers uses the budget, and 2 at most while another render runs', () => {
  assert.equal(defaultWorkers({}, () => false, () => 5), 5);
  assert.equal(defaultWorkers({}, () => true, () => 5), 2);
  assert.equal(defaultWorkers({}, () => true, () => 1), 1);
});
