#!/usr/bin/env node
// Runs after `vawe dev` renders: the top advice of the draft (slideshow score and attractors first) and, while a render of the film
// still runs, the exact wait command. Advice only: the exit code is always 0.
//   node harness/live/dev-end.mjs <page.html>
import fs from 'node:fs';
import path from 'node:path';
import { filmKeyOf } from '../lib/runlog.mjs';
import { slotsInUse } from '../lib/render-slots.mjs';
import { waitCommand } from '../lib/render-wait.mjs';
import { adviceOfDevNotes, topAdviceLines } from './plan-status.mjs';

const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (page) {
  const film = filmKeyOf(page);
  const notes = fs.existsSync(path.resolve('out', `${film}.dev.md`)) ? fs.readFileSync(path.resolve('out', `${film}.dev.md`), 'utf8') : '';
  const wait = waitCommand(page, slotsInUse());
  const lines = [...topAdviceLines(adviceOfDevNotes(notes), film), ...(wait ? [`a render is still running: ${wait}`] : [])];
  if (lines.length) console.log(`\n${lines.join('\n')}`);
}
