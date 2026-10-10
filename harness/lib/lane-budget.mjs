// How many capture lanes (one Chrome each) this machine can carry right now.
// lanes = min(cores - 1, free memory / LANE_MB, free process slots / LANE_PROCS, MAX_LANES), at least 1.
import os from 'node:os';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// A software-composited 1080p Chrome measured about 1.5 GB resident and 7 processes idle (browser, crashpad handler, GPU, network, renderer, two utility) and a few more under WebGL; the crash flags do not remove the handler.
export const LANE_MB = 1500;
export const LANE_PROCS = 12;
// Measured on tracking-hud under load 21: 1, 2, 4, 6 lanes gave 2.5, 4.7, 6.4, 7.0 shots a second, so a sixth lane adds under 10% for 1.3 GB more.
export const MAX_LANES = 4;

export function laneBudget({ cpus, freeMb, freeProcs, cap = MAX_LANES }) {
  const byMem = Number.isFinite(freeMb) ? Math.floor(freeMb / LANE_MB) : Infinity;
  const byProcs = Number.isFinite(freeProcs) ? Math.floor(freeProcs / LANE_PROCS) : Infinity;
  return Math.max(1, Math.min(cpus - 1, byMem, byProcs, cap));
}

function availableMb() {
  if (process.platform === 'linux') {
    const m = fs.readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+) kB/m);
    return m ? Number(m[1]) / 1024 : os.freemem() / 2 ** 20;
  }
  if (process.platform !== 'darwin') return os.freemem() / 2 ** 20;
  const out = spawnSync('vm_stat', { encoding: 'utf8' }).stdout || '';
  const page = Number(out.match(/page size of (\d+) bytes/)?.[1] || 16384);
  const pages = (name) => Number(out.match(new RegExp(`^Pages ${name}:\\s+(\\d+)`, 'm'))?.[1] || 0);
  return ((pages('free') + pages('inactive') + pages('speculative') + pages('purgeable')) * page) / 2 ** 20;
}

function freeProcessSlots() {
  const limit = Number(spawnSync('sysctl', ['-n', 'kern.maxprocperuid'], { encoding: 'utf8' }).stdout) || Number(spawnSync('sh', ['-c', 'ulimit -u'], { encoding: 'utf8' }).stdout) || Infinity;
  const used = (spawnSync('ps', ['-U', String(os.userInfo().uid), '-o', 'pid='], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).length;
  return limit - used;
}

export function machineLanes(cap = MAX_LANES) {
  return laneBudget({ cpus: os.cpus().length, freeMb: availableMb(), freeProcs: freeProcessSlots(), cap });
}
