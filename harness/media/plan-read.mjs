// The plan of a page before any render: the plan findings (harness/lib/plan-findings.mjs) and the draft check's advice that the page alone
// shows (render-page.mjs probeAdvice: motion lint, slideshow tells, bar and layout lint), plus the held worlds of its data-world spans. One probe,
// no video, no render.
//   const { findings, advice } = await readPlanFindings(page, absPagePath, duration);   (an opened, loaded and settled page)
//   const { findings, advice } = await readPlan(absPagePath);                          (opens and closes the page)
import { openPage, probePage, readPageMeta, resolveFrame, settle, probeAdvice } from './render-page.mjs';
import { createChecks } from '../lib/check-runner.mjs';
import { readBrief, parseBriefTables, dropGuesses } from '../lib/brief-tables.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { planFindings } from '../lib/plan-findings.mjs';
import { heldWorlds } from '../lib/worlds.mjs';
import { NOTE_LINES } from '../lib/draft-check.mjs';

// contrast is the one probe that takes screenshots (3.2 s of a 4.1 s probe on a 10 s page); the plan reads no pixels.
const withoutContrast = (checks) => ({ ...checks, run: (check, fn, settings) => (check === 'contrast' ? null : checks.run(check, fn, settings)) });

/** { findings, advice } of an opened, loaded and settled page: findings are plan-findings records, advice the page-only draft advice lines. */
export async function readPlanFindings(page, pagePath, duration) {
  const { motion, probe } = await probePage(page, duration, pagePath, { checks: withoutContrast(createChecks({ pagePath, mode: 'draft', cache: false })) });
  const brief = readBrief(pagePath);
  const authoring = pageAuthoring(pagePath);
  const findings = planFindings({
    brief, duration, probe,
    words: dropGuesses(parseBriefTables(brief ?? '')).set.words,
    worlds: (probe.worlds ?? []).flatMap((w) => w.id.split('+')),
    authoring,
  });
  const held = heldWorlds(probe.worlds ?? [], undefined, authoring).map((p) => p.text);
  return { findings, advice: [...probeAdvice(pagePath, { probe, motion }), ...held].filter((l) => !NOTE_LINES.test(l)) };
}

/** Loads an opened page unless it is a warm tab that is loaded already. */
export async function loadOpened(opened) {
  if (opened.reused) return;
  await opened.page.goto(opened.url, { waitUntil: 'load' });
  await settle(opened.page);
  await opened.markWarm?.();
}

/** readPlanFindings of a page file: opens it at its own aspect, reads it and closes it. */
export async function readPlan(pagePath) {
  const opened = await openPage(pagePath, resolveFrame(pagePath), { warm: true, final: false });
  try {
    await loadOpened(opened);
    return await readPlanFindings(opened.page, pagePath, Number(readPageMeta(pagePath, 'duration')));
  } finally {
    await opened.close();
  }
}
