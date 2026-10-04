#!/usr/bin/env node
// Runs the page-level draft checks on many pages, one at a time, without encoding a video, and writes which checks fired:
//   node harness/dev/check-sweep.mjs <out.json> <page.html>...
// It opens each page as `bin/vawe dev` does and calls probePage, so it reads the same motion records and layout samples.
// Waivers are ignored: the point is the raw firing rate of a check over a set of pages (the false-flag baseline).
import fs from 'node:fs';
import path from 'node:path';
import { resolveFrame, openPage, settle, probePage, readPageMeta } from '../media/render-page.mjs';
import { createChecks } from '../lib/check-runner.mjs';
import { motionLint, recordsFromBoxes, mergeRecords } from '../lib/motion-lint.mjs';
import { probeLayoutLint, namedText } from '../lib/layout-lint.mjs';
import { readBrief } from '../lib/brief-tables.mjs';

const SKIPPED = new Set(['contrast', 'spec', 'objects']);

/** The checks object of a draft without the screenshot and spec probes. */
function lightChecks(pagePath) {
  const base = createChecks({ pagePath, mode: 'draft', cache: false });
  return { ...base, run: (check, fn, settings) => (SKIPPED.has(check) ? undefined : base.run(check, fn, settings)) };
}

async function sweepOne(pagePath) {
  const frame = resolveFrame(pagePath, {});
  const { page, url, close } = await openPage(pagePath, frame, { final: false });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await settle(page);
    const dur = await page.evaluate(() => Number(document.querySelector('meta[name="duration"]')?.content) || 0);
    const { motion, probe } = await probePage(page, dur, pagePath, { checks: lightChecks(pagePath) });
    const records = motion.boxes ? mergeRecords(motion.records, recordsFromBoxes(motion.boxes)) : motion.records;
    const motionFound = motionLint({ records, scripted: motion.scripted && !motion.boxes });
    const layoutFound = probeLayoutLint(probe, namedText(readPageMeta(pagePath, 'message'), readBrief(pagePath)));
    return { page: pagePath, dur, fired: [...motionFound, ...layoutFound].map((f) => ({ code: f.code, rule: f.rule, at: +f.at.toFixed(2), what: f.what })) };
  } finally { await close(); }
}

async function main() {
  const [out, ...pages] = process.argv.slice(2);
  if (!out || !pages.length) { console.error('usage: node harness/dev/check-sweep.mjs <out.json> <page.html>...'); process.exit(2); }
  const results = [];
  for (const p of pages) {
    try { results.push(await sweepOne(p)); } catch (e) { results.push({ page: p, error: String(e.message).split('\n')[0], fired: [] }); }
    console.error(`${results.length}/${pages.length} ${path.basename(p)}: ${results.at(-1).error ?? (results.at(-1).fired.map((f) => f.code).join(' ') || 'clean')}`);
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
  process.exit(0);
}

main();
