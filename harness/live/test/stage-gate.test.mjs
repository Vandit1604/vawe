// node --test harness/live/test/stage-gate.test.mjs
//
// The three denials, and the writes that must stay allowed. Real films from films/scene/ through the
// real hook, exactly as Claude Code's PreToolUse feeds it. The allows matter as much as the denials: a
// gate that blocks legitimate work gets switched off, and then it enforces nothing.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test, { before, after } from 'node:test';
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

// THE FIXTURE IS BUILT, NOT BORROWED. These cases need a film whose plan passes and which nobody has
// signed, and that is a state a real film LEAVES the moment the user approves it: leaning on
// vawe-oblique broke all three the day it was signed. So the fixture is written here, under
// films/scene/ because the hook resolves a film's owner among the real films in that directory, and
// removed again afterwards.
const SB = 'films/scene/stage-gate-fixture.storyboard.md';
const FILM = 'films/scene/stage-gate-fixture.json';
const FRAG = 'films/scene/_stage-gate-fixture.hook.html';
// A second fragment on the SAME fixture film, named with the other convention (film-part, dash) so
// the naming-convention test does not have to borrow a real film off the roster: `hinge`, the fixture's
// old borrowed dash-convention example, never had a tracked storyboard, so it denied on `no-storyboard`
// the moment it stopped existing on the machine that wrote the test.
const FRAG2 = 'films/scene/_stage-gate-fixture-alt.html';
const abs = (rel) => path.join(ROOT, rel);
const FIXTURES = [SB, FILM, FRAG, FRAG2];

before(() => {
  fs.writeFileSync(abs(SB), [
    '---',
    'message: "A fixture film, so the denials have an unapproved plan to deny against."',
    'audience: "the test runner"',
    'threads: "one object, carried"',
    '---',
    '',
    '## 1. hook (0.0-2.0)',
    '- fragment: films/scene/_stage-gate-fixture.hook.html',
    '- onscreen: "one line"',
    '',
    '## 2. build (2.0-4.0)',
    '- fragment: films/scene/_stage-gate-fixture-alt.html',
    '- onscreen: "another line"',
    '',
  ].join('\n'));
  fs.writeFileSync(abs(FRAG2), '<div></div>\n');
  fs.writeFileSync(abs(FILM), JSON.stringify({ module: 'scene', layers: [] }, null, 1) + '\n');
  fs.writeFileSync(abs(FRAG), '<div></div>\n');
});
after(() => { for (const f of FIXTURES) { try { fs.unlinkSync(abs(f)); } catch { /* already gone */ } } });

test('the fixture film is unapproved, or these cases prove nothing', () => {
  assert.ok(fs.existsSync(abs(SB)));
  assert.doesNotMatch(fs.readFileSync(abs(SB), 'utf8'), /^approved\s*:/m);
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
  const r = run(FILM, JSON.stringify({ module: 'scene', layers: [{ type: 'text' }] }));
  assert.ok(r.denied);
  assert.match(r.reason, /not approved/);
  // the empty shell stays writable: it is not the film, it is the file the film will go in
  assert.equal(run(FILM, JSON.stringify({ module: 'scene', layers: [] })).denied, false);
});

test('a fragment no storyboard claims is denied, and one with a plan behind it is not', () => {
  assert.ok(run('films/scene/_nothing-claims-this.hook.html', '<div></div>').denied);
  assert.equal(run(FRAG, '<div></div>').denied, false);
});

test('both fragment naming conventions resolve to the right film', () => {
  // `_film.part.html` and `_film-part.html` both live in this repo. Splitting on a separator picks the
  // wrong film on one of them, which is why the hook looks the owner up instead of parsing it. Both
  // conventions are exercised against the built fixture (FRAG dot, FRAG2 dash), not a borrowed real
  // film: a real film's storyboard can be re-planned or unapproved at any time, and the fixture is
  // built for exactly this reason (see the comment above `SB`).
  assert.equal(run(FRAG, '<div></div>').denied, false);
  assert.equal(run(FRAG2, '<div></div>').denied, false);
});

test('a hook that exists to refuse must not permit by failing: malformed stdin denies, not allows', () => {
  const r = spawnSync('node', [HOOK], { encoding: 'utf8', input: 'not json' });
  assert.equal(r.status, 0, 'the hook always exits 0; it answers with JSON, it does not throw');
  const d = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(d.permissionDecision, 'deny');
  assert.match(d.permissionDecisionReason, /could not parse/);
});

test('nothing outside films/scene is this hook\'s business', () => {
  assert.equal(run('README.md', 'hi').denied, false);
  assert.equal(run('core/layers/text.js', 'export {}').denied, false);
});
