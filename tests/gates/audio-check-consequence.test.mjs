// tests/gates/audio-check-consequence.test.mjs: audio-check.mjs's declaration findings used to split
// one sentence across `summary` and `fix` (the fix field held a continuation of the description, not
// an instruction: "...defaults `music` to the" / fix: "\"auto\" sentinel..."). A person reading the
// printed line never noticed, because this file's own `line()` callback concatenates them with an
// arrow; a tool reading the JSON record's `fix` field on its own got a broken sentence instead of a
// fix. This pins that each finding's `summary` is a complete sentence with its consequence, and `fix`
// is a short, separately-readable instruction, using VAWE_FINDINGS_OUT the way author-check reads it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = path.join(ROOT, 'quality/gates/audio-check.mjs');
const fixture = path.join(here, '../fixtures/audio-consequence.fixture.json');

function runOn(overrides) {
  const scene = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  Object.assign(scene.audio, overrides.audio || {});
  if (overrides.profile) scene.profile = overrides.profile;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-check-'));
  const scenePath = path.join(dir, 'film.json');
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
  const findingsOut = path.join(dir, 'findings.json');
  const r = spawnSync('node', [GATE, scenePath],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VAWE_FINDINGS_OUT: findingsOut } });
  let records = [];
  try { records = JSON.parse(fs.readFileSync(findingsOut, 'utf8')); } catch { /* no findings written */ }
  return records;
}

test('silence-without-a-reason: summary is a complete sentence, fix is a short instruction', () => {
  const records = runOn({});
  const r = records.find((x) => x.code === 'silence-without-a-reason');
  assert.ok(r, `expected silence-without-a-reason, got ${JSON.stringify(records)}`);
  assert.match(r.summary, /\.$/, 'summary should end mid-thought no longer, it is a full sentence now');
  assert.doesNotMatch(r.fix, /^[a-z"]/, 'fix should read as an instruction on its own, not a lowercase continuation of summary');
  assert.match(r.fix, /Write the one line/);
});

test('bed-unresolved (music:"auto"): summary states the consequence, fix names the command', () => {
  const records = runOn({ audio: { silent: undefined, music: 'auto' } });
  const r = records.find((x) => x.code === 'bed-unresolved');
  assert.ok(r, `expected bed-unresolved, got ${JSON.stringify(records)}`);
  assert.match(r.summary, /plays SILENCE/);
  assert.match(r.fix, /^Bake it in: {2}make audio-bed/);
});

test('bed-unresolved (implied by profile with no music): fires with the same shape', () => {
  const records = runOn({ audio: { silent: undefined }, profile: 'kinetic' });
  const r = records.find((x) => x.code === 'bed-unresolved');
  assert.ok(r, `expected bed-unresolved from an implied auto, got ${JSON.stringify(records)}`);
  assert.match(r.summary, /plays SILENCE/);
});

test('audio-block-produces-nothing: names every empty channel and the mixer\'s behaviour', () => {
  const records = runOn({ audio: { silent: undefined } });
  const r = records.find((x) => x.code === 'audio-block-produces-nothing');
  assert.ok(r, `expected audio-block-produces-nothing, got ${JSON.stringify(records)}`);
  assert.match(r.summary, /renders SILENT/);
});
