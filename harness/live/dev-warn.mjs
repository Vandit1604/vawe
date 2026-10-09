#!/usr/bin/env node
// Runs before `vawe dev`: advises when the brief's Board is empty or still the template. Advice only: the exit code is always 0.
//   node harness/live/dev-warn.mjs <page.html>
import { readBrief } from '../lib/brief-tables.mjs';
import { boardFilled } from '../lib/board.mjs';

const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const brief = page ? readBrief(page) : null;
if (brief && boardFilled(brief) === false) {
  console.log('advice: the Board in the brief is empty. The Board comes before the motion: fill rhythm, spectacle, one move per cut, sound. The draft renders anyway.\n');
}
