import test from 'node:test';
import assert from 'node:assert/strict';
import { workerMap } from '../../harness/lib/worker-map.mjs';
import { blobMoves } from '../../harness/lib/ref-measure/blobs.mjs';
import { detectMoves, frameMoves } from '../../harness/lib/ref-measure/blob-pool.mjs';


const JOB = new URL('../fixtures/square-job.mjs', import.meta.url).href;

test('workerMap: results come back in the order of the items, on threads or in this one', async () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  const expected = items.map((n) => n * n + 1);
  assert.deepEqual(await workerMap(JOB, 'square', items, { add: 1 }), expected);
  assert.deepEqual(await workerMap(JOB, 'square', items.slice(0, 3), { add: 1 }, { minPerWorker: 100 }), expected.slice(0, 3));
});

test('detectMoves: the threads give what a loop over frameMoves gives', async () => {
  const w = 64, h = 48, n = 40;
  const gray = new Uint8Array(w * h * n).fill(30);
  for (let f = 0; f < n; f++) for (let y = 10; y < 22; y++) for (let x = 4 + f; x < 16 + f; x++) gray[f * w * h + y * w + x] = 220;
  const jobs = Array.from({ length: n - 1 }, (_, i) => ({ f: i + 1, cam: { s: 1, dx: 0, dy: 0, r: 0 } }));
  const got = await detectMoves({ gray, w, h }, jobs);
  for (const job of jobs) assert.deepEqual(got.get(job.f), frameMoves(job, { gray, w, h }));
  const first = got.get(1);
  assert.equal(first.length, 1);
  assert.deepEqual(first[0], blobMoves(gray.subarray(0, w * h), gray.subarray(w * h, 2 * w * h), w, h)[0]);
  assert.equal(Math.round(first[0].vx), 1);
});
