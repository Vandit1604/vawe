// A held frame reuses the capture before it, and the film is pixel-identical to one captured frame by
// frame. The control page keeps one timer pending, which turns reuse off. Needs Chrome.
//   node --test tests/media/render-reuse.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const page = (extra) => `<!doctype html><html><head><meta charset="utf-8"><meta name="duration" content="1">
<style>body{margin:0;background:linear-gradient(90deg,#0b1020,#1c2a48)}#box{position:absolute;left:200px;top:300px;width:300px;height:300px;background:#f80}</style></head>
<body><div id="box"></div><script>${extra}
document.getElementById('box').animate([{ translate: '0 0', opacity: 0.4 }, { translate: '600px 0', opacity: 1 }], { duration: 400, fill: 'both', easing: 'ease-out' });
</script></body></html>`;

const md5s = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('held frames reuse their capture and the pixels do not change', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-reuse-'));
  const render = async (name, extra) => {
    fs.mkdirSync(path.join(dir, name));
    const pagePath = path.join(dir, name, 'page.html');
    fs.writeFileSync(pagePath, page(extra));
    const out = path.join(dir, `${name}.mp4`);
    const r = await renderPage(pagePath, out, { fps: 30, workers: 1 });
    return { r, frames: md5s(out) };
  };
  try {
    const plain = await render('plain', '');
    const control = await render('control', 'setTimeout(() => {}, 1e9);');
    assert.ok(plain.r.reused >= 15, `reused ${plain.r.reused} of 30 frames, expected the held 0.4-1 s`);
    assert.equal(control.r.reused, 0);
    assert.deepEqual(plain.frames, control.frames);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
