import { parentPort, workerData } from 'node:worker_threads';

const { module, task, jobs, context, lane } = workerData;
const mod = await import(module);
const results = [];
for (const [i, item] of jobs) results.push([i, await mod[task](item, context, lane, i)]);
parentPort.postMessage(results);
