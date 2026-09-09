// node --test scripts/live/test/stage-gate.test.mjs
//
// The three denials, and the writes that must stay allowed. Real films from formats/scene/ through the
// real hook, exactly as Claude Code's PreToolUse feeds it. The allows matter as much as the denials: a
// gate that blocks legitimate work gets switched off, and then it enforces nothing.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const HOOK = join(here, '..', 'stage-gate.mjs');

function run(rel, content = '') {
  const r = spawnSync('node', [HOOK], { encoding: 'utf8',
    input: JSON.stringify({ tool_input: { file_path: path.join(ROOT, rel), content } }) });
  assert.equal(r.status, 0, 'the hook always exits 0; it answers with JSON, it does not throw');
  if (!r.stdout.trim()) return { denied: false, reason: '' };
  const d = JSON.parse(r.stdout).hookSpecificOutput;
  return { denied: d.permissionDecision === 'deny', reason: d.permissionDecisionReason || '' };
}

// The film these cases lean on has a storyboard that passes and is NOT approved, which is the state
// every one of the three rules is about. Asserted, so a later approval turns this into a clear failure
// rather than three silently vacuous tests.
const SB = 'formats/scene/vawe-oblique.storyboard.md';
test('the fixture film is unapproved, or these cases prove nothing', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SB)));
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, SB), 'utf8'), /^approved\s*:/m);
});

test('an agent may not sign off a plan', () => {
  const r = run(SB, '---\napproved: 2026-09-09\nmessage: "x"\n---');
  assert.ok(r.denied);
  assert.match(r.reason, /\/vawe-approve/);
});

test('a storyboard is otherwise always writable, since it is the way out of every other denial', () => {
  assert.equal(run(SB, '---\nmessage: "a new plan"\n---').denied, false);
});

test('layers may not be written into an unapproved film', () => {
  const r = run('formats/scene/vawe-oblique.json', JSON.stringify({ module: 'scene', layers: [{ type: 'text' }] }));
  assert.ok(r.denied);
  assert.match(r.reason, /not approved/);
  // the empty shell stays writable: it is not the film, it is the file the film will go in
  assert.equal(run('formats/scene/vawe-oblique.json', JSON.stringify({ module: 'scene', layers: [] })).denied, false);
});

test('a fragment no storyboard claims is denied, and one with a plan behind it is not', () => {
  assert.ok(run('formats/scene/_nothing-claims-this.hook.html', '<div></div>').denied);
  assert.equal(run('formats/scene/_vawe-oblique.hook.html', '<div></div>').denied, false);
});

test('both fragment naming conventions resolve to the right film', () => {
  // `_film.part.html` and `_film-part.html` both live in this repo. Splitting on a separator picks the
  // wrong film on one of them, which is why the hook looks the owner up instead of parsing it.
  assert.equal(run('formats/scene/_vawe-oblique.frame.html', '<div></div>').denied, false);
  assert.equal(run('formats/scene/_hinge-hook.html', '<div></div>').denied, false);
});

test('nothing outside formats/scene is this hook\'s business', () => {
  assert.equal(run('README.md', 'hi').denied, false);
  assert.equal(run('core/layers/text.js', 'export {}').denied, false);
});
