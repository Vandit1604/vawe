// quality/gates/slideshow.mjs: does the film read as a slideshow? Advice, never a failing exit.
//
//   node quality/gates/slideshow.mjs <page.html> [--mp4 <video>]    ·   vawe check slideshow <page.html>
//
// Combines what the harness already measures (harness/lib/slideshow.mjs): the animation records (entrances and exits per element), the
// world spans, and with a video (--mp4, or out/<film>-draft.mp4 or out/<film>.mp4) the detected cut kinds and the still runs. Prints a
// score out of 10 and each tell that fired, with its seconds and fix. The tells are in taste/craft/transitions.md "Banned (slideshow tells)".
// Waive with the code `slideshow` (or `slideshow@a-b`) in the page's authoring block; the reason names a second and a measured value.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { slideshowTells, NO_RECORDS_NOTE } from '../../harness/lib/slideshow.mjs';
import { worldRows } from '../../harness/lib/timeline.mjs';
import { pageAuthoring } from '../../harness/lib/motion-stamp.mjs';
import { isWaived } from '../../harness/lib/waivers.mjs';
import { resolveDuration } from '../../harness/media/page-duration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
const GRID_W = 160;

const [page, ...rest] = process.argv.slice(2).filter((a) => a !== '--json');
if (!page) { console.error('usage: slideshow.mjs <page.html> [--mp4 <video>]'); process.exit(2); }
const flag = rest.indexOf('--mp4');
const name = path.basename(path.dirname(path.resolve(page)));
const video = flag >= 0 ? rest[flag + 1] : [`${name}-draft.mp4`, `${name}.mp4`].map((f) => path.join(ROOT, 'out', f)).find((f) => fs.existsSync(f));

const { resolveFrame, openPage, settle, probePage } = await import('../../harness/media/render-page.mjs');
const { createChecks } = await import('../../harness/lib/check-runner.mjs');
const { sightedRecords } = await import('../../harness/lib/motion-lint.mjs');

async function measurePage() {
  const { page: tab, url, close } = await openPage(page, resolveFrame(page, {}), { final: false });
  try {
    await tab.goto(url, { waitUntil: 'load' });
    await settle(tab);
    const dur = await resolveDuration(page);
    const { motion, probe } = await probePage(tab, dur, page, { checks: createChecks({ pagePath: page, mode: 'draft', cache: false }) });
    return { duration: dur, records: sightedRecords(motion), worlds: worldRows(probe.worlds ?? []) };
  } finally { await close(); }
}

async function measureVideo(mp4) {
  const { decode } = await import('../../harness/lib/ref-measure/decode.mjs');
  const { findTransitions } = await import('../../harness/lib/ref-measure/transition.mjs');
  const { probeSize } = await import('../../harness/lib/frame-forensics.mjs');
  const { scratch } = await import('../../harness/lib/scratch.mjs');
  const { readFeatures, summarize } = await import('../../harness/media/scene-stats.mjs');
  const dir = scratch('slideshow', `${process.pid}`);
  try {
    const { width, height } = probeSize(mp4);
    return { transitions: findTransitions(decode(mp4, FPS, dir, width, height, GRID_W)), staticRuns: summarize(readFeatures(mp4)).static };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const out = gateFindings();
const authoring = pageAuthoring(page);
const measured = await measurePage();
const result = slideshowTells({ ...measured, ...(video ? await measureVideo(video) : {}), fps: FPS });
const live = result.tells.filter((t) => !isWaived(authoring, 'slideshow', t.at[0]));
if (live.length) {
  out.warn('slideshow', `score ${live.length}/${result.of}`);
  for (const t of live) out.warn(`slideshow-${t.code}`, `at ${t.at.slice(0, 6).join(', ')} s: ${t.what}`, { fix: t.fix });
} else out.note('slideshow', `score 0/${result.of}`);
if (result.skipped) out.note('slideshow-skipped', NO_RECORDS_NOTE);
out.emit();
