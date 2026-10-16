// The plan findings of an opened page (harness/lib/plan-findings.mjs): the fast-tier probe of the draft check, with no video and no render.
//   const findings = await readPlanFindings(page, absPagePath, duration);
import { probePage } from './render-page.mjs';
import { createChecks } from '../lib/check-runner.mjs';
import { sightedRecords } from '../lib/motion-lint.mjs';
import { readBrief, parseBriefTables, dropGuesses } from '../lib/brief-tables.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { planFindings } from '../lib/plan-findings.mjs';

/** `page` is an opened, loaded and settled page; its worlds are the data-world ids the probe sampled. */
export async function readPlanFindings(page, pagePath, duration) {
  const { motion, probe } = await probePage(page, duration, pagePath, { checks: createChecks({ pagePath, mode: 'fast', cache: false }) });
  const brief = readBrief(pagePath);
  return planFindings({
    brief, duration, records: sightedRecords(motion), probe,
    words: dropGuesses(parseBriefTables(brief ?? '')).set.words,
    worlds: (probe.worlds ?? []).flatMap((w) => w.id.split('+')),
    authoring: pageAuthoring(pagePath),
  });
}
