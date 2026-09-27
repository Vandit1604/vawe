// Unit-tests the pre-push stamp decision (harness/dev/verify-tiers.sh's stamp_message_for) in
// isolation: no push, no push-guard, no site build. Full-tier pushes were dropping silently because
// GitHub cuts an idle SSH connection well before pre-push's ~40-minute VAWE_FULL=1 run finishes; `make
// verify-batch` moves that run out of the push entirely and writes a stamp pre-push reads instead. This
// only proves the READ side of that stamp: a real push is never invoked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const script = path.join(repoRoot, 'harness/dev/verify-tiers.sh');

function stampMessageFor(cwd, sha) {
  try {
    return execFileSync('sh', ['-c', `. "$1" && stamp_message_for "$2"`, '_', script, sha], { cwd, encoding: 'utf8' }).trim();
  } catch (e) {
    return e.stdout ? e.stdout.trim() : '';
  }
}

test('an unstamped commit gets no message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-stamp-'));
  assert.equal(stampMessageFor(dir, 'deadbeef'), '');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a stamped commit reports its verification time', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-stamp-'));
  const sha = 'cafef00d';
  fs.mkdirSync(path.join(dir, '.vawe-data/verified'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.vawe-data/verified', sha), '2026-09-27T00:00:00.000Z');
  const msg = stampMessageFor(dir, sha);
  assert.match(msg, /^verified by make verify-batch at 2026-09-27T00:00:00\.000Z$/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a stamp for a DIFFERENT sha does not leak onto this one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-stamp-'));
  fs.mkdirSync(path.join(dir, '.vawe-data/verified'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.vawe-data/verified', 'aaaa'), '2026-09-27T00:00:00.000Z');
  assert.equal(stampMessageFor(dir, 'bbbb'), '');
  fs.rmSync(dir, { recursive: true, force: true });
});
