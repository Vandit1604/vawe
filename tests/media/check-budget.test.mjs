// The draft checks on a fixture draft stay within the seconds stamped in quality/baselines/check-budget.json.
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
  try {
    await renderPage(PAGE, mp4, { fps: 30, workers: 1, checks });
    await videoChecks(mp4, PAGE, checks);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const seconds = Object.fromEntries(checks.seconds());
  if (process.env.STAMP) {
    const stamped = Object.fromEntries(Object.entries(seconds).map(([k, v]) => [k, +(v * STAMP_SLACK).toFixed(2)]));
    fs.writeFileSync(BUDGET, `${JSON.stringify({ fixture: PAGE, seconds: stamped }, null, 1)}\n`);
    return;
  }
  const { seconds: stamped } = JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  for (const [check, s] of Object.entries(seconds)) {
    const limit = (stamped[check] ?? 0) + ALLOWED_GROWTH_S;
    assert.ok(s <= limit, `check ${check} grew by ${(s - (stamped[check] ?? 0)).toFixed(1)} s; re-stamp if deliberate`);
  }
});
