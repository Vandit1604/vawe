import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('a brief that cannot be read for a reason other than a missing file stops the verb with that error', () => {
  const dir = path.join(ROOT, 'films', `zz-brief-eisdir-${process.pid}`);
  fs.mkdirSync(path.join(dir, 'brief.md'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.html'), '<!doctype html><title>x</title>');
  try {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'bin/vawe'), 'critique', path.relative(ROOT, path.join(dir, 'page.html'))], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /EISDIR/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(path.join(ROOT, 'out', `${path.basename(dir)}.runs.jsonl`), { force: true });
  }
});
