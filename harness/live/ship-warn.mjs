#!/usr/bin/env node
// Runs before `vawe ship`: warns when the brief's Board or Motion pass is unfilled, when the Board's beats differ from the
// page's worlds, or when a move named in Taken from is in no cut. Advice only: the exit code is always 0.
//   node harness/live/ship-warn.mjs <page.html>
import { readBrief } from '../lib/brief-tables.mjs';
import { boardFilled, shipWarnings } from '../lib/board.mjs';
import { worldRows } from '../lib/timeline.mjs';

async function pageStarts(page) {
  try {
    const { readTimeline } = await import('../media/timeline.mjs');
    return worldRows((await readTimeline(page)).spans).map((w) => w.start);
  } catch {
    return null;
  }
}

async function main() {
  const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const brief = page ? readBrief(page) : null;
  if (!brief) return;
  const lines = shipWarnings(brief, boardFilled(brief) ? await pageStarts(page) : null);
  if (!lines.length) return;
  console.log(['warning: the brief is not done. The render goes on, but the judge reads the same brief:', ...lines.map((l) => `  - ${l}`),
    '  A plan you keep on purpose needs no change: write the reason in the brief instead.', ''].join('\n'));
}

main();
