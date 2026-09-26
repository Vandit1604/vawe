#!/usr/bin/env node
// harness/dev/job-status.mjs D=<film.json>: done/running/failed for `make ship`, so an agent that
// backgrounded a render never has to invent its own sleep loop or poll-with-while. `make ship` takes
// a mkdir lock per film (harness/dev/render-lock.sh) and tees its own log to a fixed path (Makefile's
// `ship` target); this reads both instead of adding a third mechanism. `make judge` is synchronous
// (it returns its rubric in the same call), so there is nothing to poll there: this only reports the
// last judge run this film has on record, from the same runs.jsonl `make ship` already writes to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runsPathFor } from '../lib/runlog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function flagOrArg(argv, name) {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.slice(name.length + 1) : null;
}

/** shipStatus(film) -> { state: 'running'|'done'|'failed'|'unknown', detail, mp4 } */
export function shipStatus(film) {
  const base = path.basename(film).replace(/\.json$/, '');
  const lockKey = film.replace(/[^A-Za-z0-9._-]/g, '_');
  const lockDir = path.join(ROOT, '.vawe-data/locks', `render-${lockKey}.lock`);
  const logFile = path.join('/tmp', `.vawe-render-${base}.log`);
  const mp4 = path.join(ROOT, 'out', `${base}.mp4`);

  if (fs.existsSync(lockDir)) {
    return { state: 'running', detail: `render lock held: ${path.relative(ROOT, lockDir)}`, mp4: null };
  }

  let log = '';
  try { log = fs.readFileSync(logFile, 'utf8'); } catch { /* no log yet: nothing has run */ }
  if (!log) return { state: 'unknown', detail: `no log at ${logFile}: this film has not been shipped yet`, mp4: null };

  const done = log.match(/✓ done → (\S+)\s+\(([\d.]+)s, (\d+) frames/);
  if (done) {
    return { state: 'done', detail: `${done[1]} (${done[2]}s, ${done[3]} frames)`, mp4: path.resolve(ROOT, done[1]) };
  }
  const tail = log.trim().split('\n').slice(-5).join('\n  ');
  return { state: 'failed', detail: `no "✓ done" in the log; last lines:\n  ${tail}`, mp4: fs.existsSync(mp4) ? mp4 : null };
}

/** lastJudge(film) -> the most recent runs.jsonl entry carrying a `judge` verdict, or null. */
export function lastJudge(film) {
  const p = path.join(ROOT, runsPathFor(film));
  let lines;
  try { lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean); } catch { return null; }
  for (let i = lines.length - 1; i >= 0; i--) {
    let rec; try { rec = JSON.parse(lines[i]); } catch { continue; }
    if (rec.judge) return rec;
  }
  return null;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const film = flagOrArg(argv, 'D') || argv.find((a) => !a.includes('='));
  if (!film) {
    console.error('usage: node harness/dev/job-status.mjs D=<film.json>');
    process.exit(2);
  }
  const s = shipStatus(film);
  console.log(`ship: ${s.state}${s.mp4 ? `  →  ${path.relative(ROOT, s.mp4)}` : ''}`);
  console.log(`  ${s.detail}`);
  if (s.state === 'running') {
    console.log(`  check with: node harness/dev/job-status.mjs D=${film}   (do not sleep, do not poll in a loop)`);
  }
  const j = lastJudge(film);
  console.log(j ? `judge: last recorded run ${j.at}` : 'judge: no run recorded yet');
  process.exit(s.state === 'failed' ? 1 : 0);
}
