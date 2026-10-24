import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mergeLock } from '../../harness/dev/merge-lock.mjs';
import { ensureHooks, gitAt } from '../../harness/lib/git-hooks.mjs';

const DRIVER = path.resolve('harness/dev/merge-lock.mjs');
const entry = (hash) => ({ hash, crf: 20 });

test('mergeLock: a key changed on one side wins, both changed takes B, keys come out sorted', () => {
  const base = { a: entry('a0'), b: entry('b0'), c: entry('c0') };
  const ours = { a: entry('a1'), b: entry('b0'), c: entry('c1'), z: entry('z1') };
  const theirs = { a: entry('a0'), b: entry('b2'), c: entry('c2'), m: entry('m2') };
  const merged = mergeLock(base, ours, theirs);
  assert.deepEqual(Object.keys(merged), ['a', 'b', 'c', 'm', 'z']);
  assert.deepEqual(merged, { a: entry('a1'), b: entry('b2'), c: entry('c2'), m: entry('m2'), z: entry('z1') });
});

test('the driver reads %O %A %B, writes %A with indent 2 and exits 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-lock-'));
  const write = (n, o) => { fs.writeFileSync(path.join(dir, n), JSON.stringify(o)); return path.join(dir, n); };
  const [o, a, b] = [write('O', { x: entry('x0') }), write('A', { x: entry('x1') }), write('B', { x: entry('x0'), y: entry('y1') })];
  execFileSync(process.execPath, [DRIVER, o, a, b]);
  assert.equal(fs.readFileSync(a, 'utf8'), `${JSON.stringify({ x: entry('x1'), y: entry('y1') }, null, 2)}\n`);
});

test('git merges two branches that each render a different clip, with no conflict', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-lock-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  ensureHooks(gitAt(dir));
  git('config', 'merge.vawe-lock.driver', `node ${DRIVER} %O %A %B`);
  fs.writeFileSync(path.join(dir, '.gitattributes'), 'clips.lock.json merge=vawe-lock\n');
  const lock = (o) => fs.writeFileSync(path.join(dir, 'clips.lock.json'), `${JSON.stringify(o, null, 2)}\n`);
  lock({ a: entry('a0') });
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'other');
  lock({ a: entry('a0'), b: entry('b1') });
  git('commit', '-q', '-am', 'other');
  git('checkout', '-q', 'main');
  lock({ a: entry('a1') });
  git('commit', '-q', '-am', 'main');
  git('merge', '-q', '--no-edit', 'other');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'clips.lock.json'), 'utf8')), { a: entry('a1'), b: entry('b1') });
});

test('ensureHooks registers the driver once and keeps one someone set', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-lock-cfg-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  ensureHooks(gitAt(dir));
  const driver = () => execFileSync('git', ['config', '--get', 'merge.vawe-lock.driver'], { cwd: dir, encoding: 'utf8' }).trim();
  assert.equal(driver(), 'node harness/dev/merge-lock.mjs %O %A %B');
  execFileSync('git', ['config', 'merge.vawe-lock.driver', 'mine'], { cwd: dir });
  ensureHooks(gitAt(dir));
  assert.equal(driver(), 'mine');
});
