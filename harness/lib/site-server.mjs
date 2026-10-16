// The site server that `vawe shot` and `vawe links` need: reuse a running one, or start site/ `npm run dev` for a localhost base and stop it afterwards.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { REPO_ROOT } from './render-harness.mjs';
import { scratch } from './scratch.mjs';

const SERVER_START_MS = 180000;

export async function reachable(url) {
  try { await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) }); return true; } catch { return false; }
}

const isLocal = (base) => /^https?:\/\/(localhost|127\.0\.0\.1)\b/.test(base);

/** Starts `npm run dev` of site/ on the base's port and waits for it; returns a stop function. The caller owns the child. */
async function startSite(base) {
  const port = new URL(base).port || '80';
  const logFile = scratch('site-server', `dev-${port}.log`);
  const log = fs.openSync(logFile, 'w');
  const child = spawn('npm', ['--prefix', 'site', 'run', 'dev', '--', '-p', port], { cwd: REPO_ROOT, detached: true, stdio: ['ignore', log, log] });
  const stop = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ } };
  process.on('exit', stop);
  const t0 = Date.now();
  while (Date.now() - t0 < SERVER_START_MS && child.exitCode === null) {
    if (await reachable(base)) return stop;
    await new Promise((r) => setTimeout(r, 1000));
  }
  stop();
  throw new Error(`the site server did not answer on ${base}; its log: ${logFile}`);
}

/** Runs `fn` with the site at `base` answering. A server this call started is stopped when `fn` ends. */
export async function withSite(base, fn) {
  let stop = null;
  if (!(await reachable(base))) {
    if (!isLocal(base)) throw new Error(`${base} does not answer`);
    console.log(`starting the site server on ${base} (it is stopped when this verb ends)`);
    stop = await startSite(base);
  }
  try { return await fn(); } finally { stop?.(); }
}
