// blobMoves for many frames at once, on worker threads (harness/lib/worker-map.mjs): each frame pair is independent.
import { workerMap } from '../worker-map.mjs';
import { blobMoves } from './blobs.mjs';
import { warp } from './camera.mjs';

const MIN_JOBS_PER_WORKER = 12;

/** The moves of frame f: A is frame f-1, warped by the camera when it moved. */
export function frameMoves({ f, cam }, { gray, w, h }) {
  const size = w * h;
  const B = gray.subarray(f * size, (f + 1) * size);
  const prev = gray.subarray((f - 1) * size, f * size);
  const still = cam.s === 1 && cam.dx === 0 && cam.dy === 0 && !cam.r;
  return blobMoves(still ? prev : warp(prev, B, w, h, cam), B, w, h);
}

/** Map of frame -> blob moves for jobs [{ f, cam }] of the decoded film V ({ w, h, gray }). */
export async function detectMoves(V, jobs) {
  const gray = new Uint8Array(new SharedArrayBuffer(V.gray.length));
  gray.set(V.gray);
  const moves = await workerMap(import.meta.url, 'frameMoves', jobs, { gray, w: V.w, h: V.h }, { minPerWorker: MIN_JOBS_PER_WORKER });
  return new Map(jobs.map((job, i) => [job.f, moves[i]]));
}
