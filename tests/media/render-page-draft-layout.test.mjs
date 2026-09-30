// tests/media/render-page-draft-layout.test.mjs: house-rule self-check, no framework.
//   node tests/media/render-page-draft-layout.test.mjs
// A draft must show the final's layout, only smaller: renders a page laid out in px (a box at left
// 1500px, a keyframe translate of 800px) as a draft and as a final, downscales the final's frame to the
// draft's size and compares the two at the same time. Launches Chrome, so it is not part of the fast unit run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/render-page.mjs');
const PAGE = path.join(ROOT, 'tests/fixtures/pages/px-layout.html');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-page-draft-layout-'));
const [W, H] = [960, 540];
const FRAME = 5;
// Measured: 0.86 with the same layout (the final's dither and x264 preset), 10.07 when the draft lays out in a 960x540 CSS viewport.
const MAX_MEAN_DIFF = 3;

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

function grayFrame(mp4, scale) {
  const vf = `${scale ? `scale=${W}:${H}:flags=area,` : ''}select=eq(n\\,${FRAME})`;
  return execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', vf, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
}

try {
  const draft = path.join(tmp, 'draft.mp4');
  const final = path.join(tmp, 'final.mp4');
  execFileSync('node', [SCRIPT, PAGE, draft, '--fps', '10'], { encoding: 'utf8' });
  execFileSync('node', [SCRIPT, PAGE, final, '--final', '--fps', '10', '--blur', '1'], { encoding: 'utf8' });
  const a = grayFrame(draft, false);
  const b = grayFrame(final, true);
  assert(a.length === W * H, `the draft frame is not ${W}x${H} (${a.length} bytes)`);
  assert(b.length === a.length, `the downscaled final frame has ${b.length} bytes, the draft ${a.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  const mean = sum / a.length;
  assert(mean < MAX_MEAN_DIFF, `draft and downscaled final differ by mean ${mean.toFixed(2)} at frame ${FRAME}: the draft lays the page out differently`);
  console.log(`✓ render-page-draft-layout.test.mjs: draft matches the downscaled final (mean diff ${mean.toFixed(2)})`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
