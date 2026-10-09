// The preview daemon stays up while a render holds a tab in it. A final's lanes use their own browsers,
// so the render's own page sat idle in the daemon, the daemon quit after its idle limit, and the audio
// step after capture failed with "Attempted to use detached Frame". Needs Chrome and ffmpeg.
//   node --test tests/media/preview-idle-live-tab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderPage } from '../../harness/media/render-page.mjs';
import { openPreview } from '../../harness/media/preview-server.mjs';

const PAGE = 'tests/fixtures/pages/idle-daemon-audio.html';
process.env.VAWE_PREVIEW_IDLE_MS = '1500';

test('an open tab keeps the preview daemon alive past its idle limit', async () => {
  const held = await openPreview(PAGE, { final: true });
  try {
    assert.ok(held.persistent, 'the page is in the shared daemon');
    await held.page.goto(held.url, { waitUntil: 'load' });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    assert.equal(await held.page.evaluate(() => 1 + 1), 2);
  } finally { await held.close(); }
});

test('a 2-lane final with page audio succeeds while the daemon idles', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-idle-'));
  try {
    const mp4 = path.join(dir, 'a.mp4');
    const r = await renderPage(PAGE, mp4, { final: true, fps: 60, blur: 1, durArg: 2, audio: true, workers: 2 });
    assert.equal(r.frames, 120);
    assert.equal(r.audio, true);
    assert.ok(fs.statSync(mp4).size > 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
