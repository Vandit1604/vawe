// Runs independent jobs on worker threads: the same results as a loop in one thread, in the order of `items`, only sooner.
import os from 'node:os';
import { Worker } from 'node:worker_threads';

export const MAX_WORKERS = 6;

/**
 * [await mod[task](item, context, lane)] for every item. `module` is the file URL of the module that exports `task`; `context` is copied to
 * each worker once (a SharedArrayBuffer in it is shared). `minPerWorker` keeps a short list in this thread, where a worker would cost more than it saves.
 */
export async function workerMap(module, task, items, context, { minPerWorker = 1 } = {}) {
  const workers = Math.min(MAX_WORKERS, Math.max(1, os.availableParallelism() - 2), Math.floor(items.length / minPerWorker));
  if (workers <= 1) {
    const mod = await import(module);
    const out = [];
    for (const [i, item] of items.entries()) out.push(await mod[task](item, context, 0, i));
    return out;
  }
  const lanes = Array.from({ length: workers }, (_, k) => items.map((item, i) => [i, item]).filter(([i]) => i % workers === k));
  const done = await Promise.all(lanes.map((jobs, lane) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker-map-lane.mjs', import.meta.url), { workerData: { module, task, jobs, context, lane } });
    worker.once('message', resolve);
    worker.once('error', reject);
  })));
  const out = new Array(items.length);
  for (const [i, result] of done.flat()) out[i] = result;
  return out;
}
