// quality/gates/transitions.mjs: does the film do the handoffs its Board planned? Advice, never a failing exit.
//
//   node quality/gates/transitions.mjs <page.html> [--mp4 <video>]    ·   vawe check transitions <page.html>
//
// Reads the Board's "handoff (family: object)" column (harness/lib/handoffs.mjs): cuts with no planned handoff, one family on
// adjacent cuts or more than twice, a plain fade or crossfade with no reason. With a video (--mp4, or out/<film>-draft.mp4 or
// out/<film>.mp4 when one exists) it also names a planned handoff that measures as a hard cut. Waive with a reason in the page's
// authoring block under the code `transitions`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { readBrief } from '../../harness/lib/brief-tables.mjs';
import { moveRows, boardFilled } from '../../harness/lib/board.mjs';
import { handoffAdvice, measuredAdvice } from '../../harness/lib/handoffs.mjs';
import { pageAuthoring } from '../../harness/lib/motion-stamp.mjs';
import { isWaived } from '../../harness/lib/waivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
const GRID_W = 160;

const [page, ...rest] = process.argv.slice(2).filter((a) => a !== '--json');
if (!page) { console.error('usage: transitions.mjs <page.html> [--mp4 <video>]'); process.exit(2); }
const flag = rest.indexOf('--mp4');
const name = path.basename(path.dirname(path.resolve(page)));
const video = flag >= 0 ? rest[flag + 1] : [`${name}-draft.mp4`, `${name}.mp4`].map((f) => path.join(ROOT, 'out', f)).find((f) => fs.existsSync(f));

const out = gateFindings();
const brief = readBrief(page);
if (boardFilled(brief ?? '') !== true) out.note('transitions', 'the Board is missing or not filled; nothing to check');
else if (isWaived(pageAuthoring(page), 'transitions')) out.note('transitions', 'waived in the page authoring block');
else {
  const rows = moveRows(brief);
  const lines = handoffAdvice(rows);
  if (video) {
    const { decode } = await import('../../harness/lib/ref-measure/decode.mjs');
    const { findTransitions } = await import('../../harness/lib/ref-measure/transition.mjs');
    const { probeSize } = await import('../../harness/lib/frame-forensics.mjs');
    const { scratch } = await import('../../harness/lib/scratch.mjs');
    const dir = scratch('transitions', `${process.pid}`);
    try {
      const { width, height } = probeSize(video);
      lines.push(...measuredAdvice(rows, findTransitions(decode(video, FPS, dir, width, height, GRID_W)), FPS));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  for (const l of lines) out.warn('transitions', l.replace(/^transitions: /, ''));
}
out.emit();
