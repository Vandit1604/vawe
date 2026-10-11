// vawe.onFrame exists before any page script, so a page that never imports core/engine/page-api.js renders.
//   node --test tests/media/on-frame-without-import.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../harness/media/render-page.mjs');
const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="duration" content="0.2">
<style>*{margin:0}body{width:80px;height:60px;background:#000}#box{position:absolute;width:10px;height:10px;background:#fff}</style>
</head><body><div id="box"></div>
<script>vawe.onFrame((t) => { document.getElementById('box').style.left = (t * 300) + 'px'; });</script>
</body></html>`;

test('a page using vawe.onFrame with no page-api import renders a draft', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'on-frame-'));
  try {
    const page = path.join(tmp, 'page.html');
    const out = path.join(tmp, 'out.mp4');
    fs.writeFileSync(page, PAGE);
    execFileSync('node', [SCRIPT, page, out], { encoding: 'utf8', stdio: 'pipe' });
    assert.ok(fs.statSync(out).size > 0);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
