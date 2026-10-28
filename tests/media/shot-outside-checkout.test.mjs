import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { navigationProblem } from '../../harness/media/shot-math.mjs';

const SHOT = path.resolve('harness/media/shot.mjs');
const shot = (args) => spawnSync(process.execPath, [SHOT, ...args], { encoding: 'utf8' });

test('an HTTP error status or a Chrome error page is a problem with a reason', () => {
  assert.match(navigationProblem({ url: 'http://x/a.html', status: 404, finalUrl: 'http://x/a.html' }), /404/);
  assert.match(navigationProblem({ url: 'http://x/a.html', status: 200, finalUrl: 'chrome-error://chromewebdata/' }), /error page/);
  assert.equal(navigationProblem({ url: 'http://x/a.html', status: 200, finalUrl: 'http://x/a.html' }), null);
});

test('shot serves an html file that lives outside the checkout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-shot-'));
  try {
    fs.writeFileSync(path.join(dir, 'page.html'), '<!doctype html><title>x</title><body style="background:#123">hello</body>');
    const r = shot([path.join(dir, 'page.html'), '--w', '400', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /✓ .*400px wide/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('shot of a missing html file fails with exit 1 and a reason', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-shot-'));
  try {
    const r = shot([path.join(dir, 'missing.html'), '--w', '400', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /shot failed: .*404/);
    assert.doesNotMatch(r.stdout, /✓/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
