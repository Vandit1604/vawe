// tests/media/render-page.test.mjs: house-rule self-check, no framework.
//   node tests/media/render-page.test.mjs
//
// Proves harness/media/render-page.mjs on a tiny synthetic page: a plain render, a blur=3 render (the
// ffmpeg `tmix`+`select` single-pass blend this file exists for), and that a missing page fails LOUDLY
// (a caught, informative error) rather than writing a corrupt or empty mp4 and staying quiet about it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/render-page.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-page-test-'));
const htmlPath = path.join(tmp, 'page.html');
fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="duration" content="1">
<style>*{margin:0}body{width:320px;height:180px;background:#000}
#box{position:absolute;top:70px;left:0;width:40px;height:40px;background:#fff}</style>
</head><body><div id="box"></div>
<script>
document.getElementById('box').animate([
  { transform: 'translateX(0px)' },
  { transform: 'translateX(280px)' },
], { duration: 1000, fill: 'both' });
</script></body></html>`);

function ffprobeDuration(mp4) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
  return Number(out.trim());
}

try {
  // ── plain render (no blur) ──────────────────────────────────────────────────────────────────────
  const out1 = path.join(tmp, 'plain.mp4');
  const stdout1 = execFileSync('node', [SCRIPT, htmlPath, out1, '--fps', '10'], { encoding: 'utf8' });
  assert(/10 frame\(s\)/.test(stdout1), `expected a 10-frame summary line: ${stdout1}`);
  assert(fs.existsSync(out1) && fs.statSync(out1).size > 0, 'plain render must write a non-empty mp4');
  assert(Math.abs(ffprobeDuration(out1) - 1) < 0.2, `expected ~1s of video, got ${ffprobeDuration(out1)}`);
  console.log('✓ render-page.test.mjs: plain render wrote a playable 1s mp4');

  // ── blur=3 render: one ffmpeg pass blends 3 subframes per output frame ─────────────────────────────
  const out2 = path.join(tmp, 'blur.mp4');
  const stdout2 = execFileSync('node', [SCRIPT, htmlPath, out2, '--fps', '10', '--blur', '3'], { encoding: 'utf8' });
  assert(/blur=3 \(30 subframe/.test(stdout2), `expected the blur/subframe count in the summary: ${stdout2}`);
  assert(fs.existsSync(out2) && fs.statSync(out2).size > 0, 'blur render must write a non-empty mp4');
  assert(Math.abs(ffprobeDuration(out2) - 1) < 0.2, `expected ~1s of video, got ${ffprobeDuration(out2)}`);
  console.log('✓ render-page.test.mjs: blur=3 render wrote a playable 1s mp4 from one ffmpeg blend pass');

  // ── --from/--to windows the render to a slice instead of the whole page ────────────────────────────
  const out4 = path.join(tmp, 'window.mp4');
  const stdout4 = execFileSync('node', [SCRIPT, htmlPath, out4, '--fps', '10', '--from', '0.5', '--to', '1'], { encoding: 'utf8' });
  assert(/5 frame\(s\)/.test(stdout4), `expected a 5-frame summary line (0.5s at 10fps): ${stdout4}`);
  assert(Math.abs(ffprobeDuration(out4) - 0.5) < 0.2, `expected ~0.5s of video, got ${ffprobeDuration(out4)}`);
  console.log('✓ render-page.test.mjs: --from/--to rendered only the requested 0.5s window');

  // ── a missing page fails loudly, writes nothing ─────────────────────────────────────────────────
  const out3 = path.join(tmp, 'never.mp4');
  let threw = false, message = '';
  try {
    execFileSync('node', [SCRIPT, path.join(tmp, 'nope.html'), out3], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) { threw = true; message = String(e.stderr || e.message); }
  assert(threw, 'a missing page must fail (non-zero exit), not silently write an empty file');
  assert(/no such file/i.test(message), `expected the missing-file cause in stderr, got: ${message}`);
  assert(!fs.existsSync(out3), 'a failed render must leave no output file behind');
  console.log('✓ render-page.test.mjs: a missing page fails loudly and writes nothing');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('render-page.test.mjs: ok');
