// tests/media/render-page-final-gate.test.mjs: a page whose folder declares a reference (the
// recreation starter writes `reference.json`) must not get a FINAL render past the required-motion
// check for free. Proves: refused with no stamp, passes once `see.mjs`'s pass stamps the page's
// current hash (harness/lib/motion-stamp.mjs), and passes on a fresh edit only via the page's own
// `authoring.allow` + `_why` waiver, never a second waiver channel.
//   node --test tests/media/render-page-final-gate.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeMotionStamp } from '../../harness/lib/motion-stamp.mjs';

function assertOk(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/render-page.mjs');
const STAMP_DIR = path.join(ROOT, '.vawe-data', 'motion-verified');

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="duration" content="0.2">
<style>*{margin:0}body{width:80px;height:60px;background:#000}
#box{position:absolute;width:10px;height:10px;background:#fff}</style>
</head><body><div id="box"></div>
<script>document.getElementById('box').animate([{transform:'translateX(0px)'},{transform:'translateX(60px)'}],{duration:200,fill:'both'});</script>
</body></html>`;

function writePage(tmp, extra = '') {
  const p = path.join(tmp, 'page.html');
  // The stamp store is shared and keyed on page content: a unique page per test keeps stamps apart.
  fs.writeFileSync(p, PAGE.replace('</body>', `${extra}<!-- ${path.basename(tmp)} --></body>`));
  return p;
}

let tmp;
test.beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'final-gate-test-')); });
test.afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

test('a page with no declared reference renders FINAL with no gate', () => {
  const pagePath = writePage(tmp);
  const out = path.join(tmp, 'out.mp4');
  execFileSync('node', [SCRIPT, pagePath, out, '--final'], { encoding: 'utf8' });
  assertOk(fs.existsSync(out) && fs.statSync(out).size > 0, 'ungated page must render');
});

test('a page declaring a reference, never checked, refuses FINAL', () => {
  const pagePath = writePage(tmp);
  fs.writeFileSync(path.join(tmp, 'reference.json'), JSON.stringify({ ref: 'refs/fake.mp4' }));
  const out = path.join(tmp, 'out.mp4');
  let threw = false, message = '';
  try {
    execFileSync('node', [SCRIPT, pagePath, out, '--final'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) { threw = true; message = String(e.stderr || e.message); }
  assertOk(threw, 'a never-checked recreation page must refuse a FINAL render');
  assertOk(/FINAL render refused/.test(message), `expected the refusal reason: ${message}`);
  assertOk(/vawe critique .* --ref refs\/fake\.mp4/.test(message), `expected the exact next command: ${message}`);
  assertOk(!fs.existsSync(out), 'a refused render must leave no output file');
});

test('stamping the page\'s current hash lets FINAL through, and an edit invalidates the stamp', () => {
  const pagePath = writePage(tmp);
  fs.writeFileSync(path.join(tmp, 'reference.json'), JSON.stringify({ ref: 'refs/fake.mp4' }));
  writeMotionStamp(pagePath);
  const hash = fs.readdirSync(STAMP_DIR).find((f) => true); // only entry from this run's stamp
  try {
    const out = path.join(tmp, 'out.mp4');
    execFileSync('node', [SCRIPT, pagePath, out, '--final'], { encoding: 'utf8' });
    assertOk(fs.existsSync(out) && fs.statSync(out).size > 0, 'a stamped page must render FINAL');

    // Edit the page: the OLD stamp (keyed on the old hash) no longer covers the new content.
    writePage(tmp, '<!-- edited -->');
    const out2 = path.join(tmp, 'out2.mp4');
    let threw = false;
    try { execFileSync('node', [SCRIPT, pagePath, out2, '--final'], { encoding: 'utf8', stdio: 'pipe' }); }
    catch { threw = true; }
    assertOk(threw, 'an edit must invalidate the stamp and refuse FINAL again');
  } finally {
    if (hash) fs.rmSync(path.join(STAMP_DIR, hash), { force: true });
  }
});

test('authoring.allow + _why in the page itself waives the gate, with no second mechanism', () => {
  const authoring = '<script type="application/json" id="authoring">'
    + '{"allow":["unverified-final"],"_why":{"unverified-final":"spike at 0.1 s: the box moves 60 px in a 0.2 s probe"}}</script>';
  const pagePath = writePage(tmp, authoring);
  fs.writeFileSync(path.join(tmp, 'reference.json'), JSON.stringify({ ref: 'refs/fake.mp4' }));
  const out = path.join(tmp, 'out.mp4');
  execFileSync('node', [SCRIPT, pagePath, out, '--final'], { encoding: 'utf8' });
  assertOk(fs.existsSync(out) && fs.statSync(out).size > 0, 'a waived page must render FINAL');
});

test('a waiver with no _why does not excuse the gate', () => {
  const authoring = '<script type="application/json" id="authoring">'
    + '{"allow":["unverified-final"]}</script>';
  const pagePath = writePage(tmp, authoring);
  fs.writeFileSync(path.join(tmp, 'reference.json'), JSON.stringify({ ref: 'refs/fake.mp4' }));
  const out = path.join(tmp, 'out.mp4');
  let threw = false;
  try { execFileSync('node', [SCRIPT, pagePath, out, '--final'], { encoding: 'utf8', stdio: 'pipe' }); }
  catch { threw = true; }
  assertOk(threw, 'a waiver with no reason must still block, same rule as a scene\'s authoring.allow');
});

test('a reason that names no place or measure does not excuse the gate', () => {
  const authoring = '<script type="application/json" id="authoring">'
    + '{"allow":["unverified-final"],"_why":{"unverified-final":"exploratory spike, not for ship"}}</script>';
  const pagePath = writePage(tmp, authoring);
  fs.writeFileSync(path.join(tmp, 'reference.json'), JSON.stringify({ ref: 'refs/fake.mp4' }));
  let message = '';
  try { execFileSync('node', [SCRIPT, pagePath, path.join(tmp, 'out.mp4'), '--final'], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { message = String(e.stderr || e.message); }
  assertOk(/FINAL render refused/.test(message), `the same vetting as every other waiver applies: ${message}`);
});
