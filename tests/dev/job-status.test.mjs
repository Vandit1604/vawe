// tests/dev/job-status.test.mjs: harness/dev/job-status.mjs reads the render lock + the ship log
// `make ship` already writes, so an agent can poll a status instead of a sleep loop.
//   node --test tests/dev/job-status.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { shipStatus, lastJudge } from '../../harness/dev/job-status.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = 'films/scene/__job-status-fixture.json';
const base = '__job-status-fixture';
const lockKey = film.replace(/[^A-Za-z0-9._-]/g, '_');
const lockDir = path.join(repoRoot, '.vawe-data/locks', `render-${lockKey}.lock`);
const logFile = path.join('/tmp', `.vawe-render-${base}.log`);

test.after(() => {
  fs.rmSync(lockDir, { recursive: true, force: true });
  fs.rmSync(logFile, { force: true });
});

test('a held lock reports running', () => {
  fs.rmSync(logFile, { force: true });
  fs.mkdirSync(lockDir, { recursive: true });
  const s = shipStatus(film);
  assert.equal(s.state, 'running');
  fs.rmSync(lockDir, { recursive: true, force: true });
});

test('a log with the done marker reports done and the mp4 path', () => {
  fs.copyFileSync(path.join(repoRoot, 'tests/fixtures/job-status-done.log'), logFile);
  const s = shipStatus(film);
  assert.equal(s.state, 'done');
  assert.match(s.detail, /4\.2s, 126 frames/);
  assert.match(s.mp4, /__job-status-fixture\.mp4$/);
});

test('a log with no done marker and no lock reports failed', () => {
  fs.copyFileSync(path.join(repoRoot, 'tests/fixtures/job-status-failed.log'), logFile);
  const s = shipStatus(film);
  assert.equal(s.state, 'failed');
  assert.match(s.detail, /renderer crashed/);
});

test('no log at all reports unknown, not a crash', () => {
  fs.rmSync(logFile, { force: true });
  const s = shipStatus(film);
  assert.equal(s.state, 'unknown');
});

test('lastJudge is null with no runs.jsonl on record', () => {
  assert.equal(lastJudge('films/scene/__no-such-runs-file.json'), null);
});
