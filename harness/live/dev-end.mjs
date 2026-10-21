#!/usr/bin/env node
// Runs after `vawe dev` renders: the top advice of the draft (slideshow score and attractors first) and, while a render of the film
// still runs, the exact wait command, and the path of one full-size still (`vawe still`) to read. Advice only: the exit code is always 0.
//   node harness/live/dev-end.mjs <page.html>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { filmKeyOf, readRuns } from '../lib/runlog.mjs';
import { spectacleOf } from '../lib/board.mjs';
import { reviewStillSecond } from '../lib/worlds.mjs';
import { slotsInUse } from '../lib/render-slots.mjs';
import { waitCommand } from '../lib/render-wait.mjs';
import { adviceOfDevNotes, topAdviceLines } from './plan-status.mjs';

const STILL = path.resolve(import.meta.dirname, '../media/still.mjs');

function fullSizeStill(page, film) {
  const worlds = readRuns(film).filter((r) => r.cmd === 'dev' && !r.failed).at(-1)?.worlds;
  const at = reviewStillSecond(worlds, spectacleOf(fs.readFileSync(page, 'utf8')));
  if (at == null) return [];
  const out = path.resolve('out', `${film}-draft-full.png`);
  const r = spawnSync(process.execPath, [STILL, page, '--at', String(at), '--out', out], { encoding: 'utf8' });
  return r.status === 0 ? [`full-size still: ${r.stdout.trim().split('\n').at(-1).replace(/^✓ /, '')}`] : [];
}

const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (page) {
  const film = filmKeyOf(page);
  const notes = fs.existsSync(path.resolve('out', `${film}.dev.md`)) ? fs.readFileSync(path.resolve('out', `${film}.dev.md`), 'utf8') : '';
  const wait = waitCommand(page, slotsInUse());
  const lines = [...topAdviceLines(adviceOfDevNotes(notes), film), ...fullSizeStill(page, film), ...(wait ? [`a render is still running: ${wait}`] : [])];
  if (lines.length) console.log(`\n${lines.join('\n')}`);
}
