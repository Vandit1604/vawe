import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensurePageFonts } from '../../harness/lib/ensure-fonts.mjs';

function checkout() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-fonts-'));
  fs.mkdirSync(path.join(root, 'assets', 'fonts'), { recursive: true });
  const page = path.join(root, 'page.html');
  fs.writeFileSync(page, '<style>@font-face{font-family:A;src:url(assets/fonts/A.woff2)}</style>');
  return { root, page };
}

test('a missing face runs the generator once and says so in one line', () => {
  const { root, page } = checkout();
  const lines = [];
  const runs = [];
  assert.equal(ensurePageFonts(root, page, { run: (cmd, args) => runs.push(args), log: (l) => lines.push(l) }), true);
  assert.equal(runs.length, 1);
  assert.match(runs[0][0], /generators.media.fonts\.mjs$/);
  assert.equal(lines.length, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('when every face is there, nothing runs and nothing prints', () => {
  const { root, page } = checkout();
  fs.writeFileSync(path.join(root, 'assets', 'fonts', 'A.woff2'), 'x');
  const lines = [];
  assert.equal(ensurePageFonts(root, page, { run: () => assert.fail('ran'), log: (l) => lines.push(l) }), false);
  assert.deepEqual(lines, []);
  fs.rmSync(root, { recursive: true, force: true });
});
