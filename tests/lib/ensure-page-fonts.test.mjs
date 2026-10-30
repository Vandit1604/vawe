import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensurePageFonts } from '../../harness/lib/ensure-fonts.mjs';
import { REPO_ROOT } from '../../harness/lib/render-harness.mjs';

// A page in a folder of its own, outside this checkout; assets/fonts is served from this checkout.
function pageUsing(face) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-fonts-'));
  const page = path.join(dir, 'page.html');
  fs.writeFileSync(page, `<style>@font-face{font-family:A;src:url(assets/fonts/${face})}</style>`);
  return { dir, page };
}

test('a missing face runs the generator of this checkout once, even for a page elsewhere, and says so in one line', () => {
  const { dir, page } = pageUsing('ZzNoSuchFace.woff2');
  fs.mkdirSync(path.join(dir, 'assets', 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'fonts', 'ZzNoSuchFace.woff2'), 'x');
  const lines = [];
  const runs = [];
  assert.equal(ensurePageFonts(page, { run: (cmd, args, opts) => runs.push({ args, opts }), log: (l) => lines.push(l) }), true);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].args[0], path.join(REPO_ROOT, 'generators', 'media', 'fonts.mjs'));
  assert.equal(runs[0].opts.cwd, REPO_ROOT);
  assert.equal(lines.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('when this checkout holds every face, nothing runs and nothing prints', () => {
  const have = fs.readdirSync(path.join(REPO_ROOT, 'assets', 'fonts')).find((f) => f.endsWith('.woff2'));
  const { dir, page } = pageUsing(have);
  const lines = [];
  assert.equal(ensurePageFonts(page, { run: () => assert.fail('ran'), log: (l) => lines.push(l) }), false);
  assert.deepEqual(lines, []);
  fs.rmSync(dir, { recursive: true, force: true });
});
