// node --test tests/authoring/draft-e2e.test.mjs
//
// THE ONE PROOF THIS FEATURE EXISTS FOR: a brand-new name, no scene, no storyboard, no brief, gets a
// rendered draft and a contact sheet from ONE command (`make dev D=<file> DRAFT=1`), with zero
// refusals along the way. The fixture lives under tests/fixtures/, never films/scene/, so this suite
// never depends on or mutates real film content.
//
// VAWE_SERVE_ALL=1: the render server only serves core/ themes/ films/ assets/ .vawe-data/ by
// default (renderer/internal/scene/scene.go); a fixture path outside that allowlist needs the same
// escape hatch harness/dev/evals.mjs and bench.mjs already use for out-of-tree scenes.
//
// This spawns a real `make dev` (go build if needed, a real headless Chrome capture, real ffmpeg
// encode), so it is slow by nature, not by accident: it is the one test in the suite that has to be,
// because "zero refusals end to end" is not provable by unit-testing the refusal points in isolation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REL_DIR = 'tests/fixtures/draft-e2e';
const DIR = path.join(ROOT, REL_DIR);
fs.mkdirSync(DIR, { recursive: true });

const name = `smoke-${Date.now()}`;
const relScene = `${REL_DIR}/${name}.json`;
const scene = path.join(DIR, `${name}.json`);
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);
const beatsSheet = path.join('/tmp', 'beats', `${name}.png`);

after(() => {
  for (const f of [scene, mp4, beatsSheet, path.join('/tmp', 'reveal', `${name}.png`)]) {
    try { fs.unlinkSync(f); } catch { /* already gone, or never written */ }
  }
});

test('make dev D=<fresh name> DRAFT=1: scene, render and contact sheet, no refusals', { timeout: 180_000 }, () => {
  assert.ok(!fs.existsSync(scene), 'fixture must start with no scene, that is the whole scenario');

  const out = execFileSync('make', ['dev', `D=${relScene}`, 'DRAFT=1'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, VAWE_SERVE_ALL: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert.doesNotMatch(out, /permissionDecision.*deny|no-storyboard|denied|refus/i,
    'the draft path must clear the stage machine and its hooks with zero refusals');
  assert.match(out, /drafted .*smoke-\d+\.json/, 'draft-init must report writing the scene');
  assert.ok(fs.existsSync(scene), 'the minimal scene must exist on disk');
  assert.ok(fs.existsSync(mp4), 'the draft render must produce an mp4');
  assert.ok(fs.existsSync(beatsSheet), 'the contact (beat) sheet must be written');
  assert.match(out, new RegExp(beatsSheet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    'the contact-sheet path must be printed for the author to open');
});
