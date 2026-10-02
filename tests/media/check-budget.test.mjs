// The draft checks on a fixture draft stay within the seconds stamped in quality/baselines/check-budget.json, scaled by
// how much slower this run's own capture of the fixture was than the stamped one: a loaded machine slows both alike.
// Needs Chrome and ffmpeg. Re-stamp after a deliberate change: STAMP=1 node --test tests/media/check-budget.test.mjs
//   node --test tests/media/check-budget.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderPage, videoChecks } from '../../harness/media/render-page.mjs';
import { createChecks } from '../../harness/lib/check-runner.mjs';

const PAGE = 'tests/fixtures/pages/word-at-2-5.html';
const BUDGET = path.resolve('quality/baselines/check-budget.json');
const ALLOWED_GROWTH_S = 1;
const STAMP_SLACK = 1.5;

test('the checks of a fixture draft stay within their stamped seconds', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-budget-'));
  const mp4 = path.join(dir, 'fixture-draft.mp4');
  const checks = createChecks({ pagePath: PAGE, mode: 'full', cache: false });
  let captureS;
  try {
    captureS = (await renderPage(PAGE, mp4, { fps: 30, workers: 1, checks })).captureMs / 1000;
    await videoChecks(mp4, PAGE, checks);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const seconds = Object.fromEntries(checks.seconds());
  if (process.env.STAMP) {
    const stamped = Object.fromEntries(Object.entries(seconds).map(([k, v]) => [k, +(v * STAMP_SLACK).toFixed(2)]));
    fs.writeFileSync(BUDGET, `${JSON.stringify({ fixture: PAGE, captureS: +captureS.toFixed(2), seconds: stamped }, null, 1)}\n`);
    return;
  }
  const { seconds: stamped, captureS: stampedCapture } = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  const load = Math.max(1, captureS / stampedCapture);
  for (const [check, s] of Object.entries(seconds)) {
    const limit = (stamped[check] ?? 0) * load + ALLOWED_GROWTH_S;
    assert.ok(s <= limit, `check ${check} took ${s.toFixed(1)} s, over ${limit.toFixed(1)} s (stamped ${stamped[check] ?? 0} s, this capture ${load.toFixed(1)}x the stamped one); re-stamp if deliberate`);
  }
});
