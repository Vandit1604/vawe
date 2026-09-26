// tests/hooks/stage-say.test.mjs: the rule-brief lines this hook appends after the stage line, against
// a fixture film under tests/fixtures/films/stage-say/ (VAWE_FILMS_DIR points both stage-say.mjs and
// stageOf() at it for this run). A PRIVATE subdirectory, not the shared tests/fixtures/films/ every
// other suite writes fixtures into: stage-say.mjs picks its film by newest mtime across the whole
// FILMS_DIR (there is no file_path in its input to key off), so sharing a directory with a concurrently
// running suite writing its own fixtures makes this one pick up the WRONG film mid-run. Cleaned up in
// `after`.
// Set before stage.mjs (and the census.mjs it imports) resolves its SCENE_DIR at module load, so the
// in-process stageOf() call below and every subprocess spawned here agree on the same fixture directory.
process.env.VAWE_FILMS_DIR = 'tests/fixtures/films/stage-say';

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
fs.mkdirSync('tests/fixtures/films/stage-say', { recursive: true });
const { stageOf } = await import('../../quality/gates/stage.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILMS_DIR = process.env.VAWE_FILMS_DIR;
const NAME = 'craft-rules-stage-say-fixture';
const base = path.join(ROOT, FILMS_DIR, NAME);
const film = `${base}.json`;
const sb = `${base}.storyboard.md`;

// `approved:` is no longer required by any stage; it is kept here only so a film that still carries the
// field from before the approval stage was removed keeps parsing the same way (backward compatibility).
const SB = `---
message: "test film"
audience: "ci"
arc: "hook -> build -> payoff"
framework: "AIDA"
object: "a rect that survives every cut"
object_t0: "bottom-left, small"
object_states: "bottom-right, then top-right"
object_last: "top-right, held"
format: 1920x1080
theme: "themes/default.json"
duration: 9s
pace: "held, 3s/idea"
spectacle: "beat 3, the payoff figure, a hero count-up, the one loud moment"
not: "no centred text default"
approved: "ci-fixture"
---

## Beat 1: Hook (0s-3s)
- type: hook
- object: not born yet
- object_in: bottom-left@120x40
- object_out: bottom-right@120x40
- motion: [data-part="headline"]@slide-left:energy
- fragment: ${FILMS_DIR}/craft-rules-stage-say-fixture.hook.html
- onscreen: "the strong first line"
- mechanism: static headline
- becomes: the bare stage becomes a question
- why: open loop, pose the question the payoff answers
- duration: 3s

## Beat 2: Build (3s-6s)
- type: product_intro
- object: it arrives
- object_in: bottom-right@120x40
- object_out: top-right@120x40
- motion: .card@popIn:gravity
- onscreen: "what it is"
- mechanism: popIn card
- becomes: the question becomes a named thing
- why: name the thing
- duration: 3s

## Beat 3: Payoff (6s-9s)
- type: benefit_highlight
- object: held
- object_in: top-right@120x40
- object_out: top-right@120x40
- motion: .figure@fadeUp:cinematic
- onscreen: "the payoff figure"
- mechanism: hero count-up
- becomes: the named thing becomes the proven result
- why: land the result
- duration: 3s
`;

// Beat 2's `mechanism: popIn card` trips storyboard-check's plain-content blocker (added 2026-09-22,
// after this fixture): a beat that names a content noun with no real source on disk. This fixture
// beat is not a real card, so it takes the one waiver mechanism (AGENTS.md), the same door a real
// author uses, not a second excuse path.
fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9', duration: 9, layers: [],
  authoring: { allow: ['plain-content@Beat 2: Build (3s-6s)'],
    _why: { 'plain-content@Beat 2: Build (3s-6s)': 'fixture beat, no real UI to capture' } } }));
fs.writeFileSync(sb, SB);
const rulesState = path.join(ROOT, '.vawe-data/stage-say-rules-state.json');
const sessionState = path.join(ROOT, '.vawe-data/stage-say-session-state.json');
after(() => {
  for (const f of [film, sb, rulesState, sessionState]) { try { fs.unlinkSync(f); } catch { /* already gone */ } }
});

test('the fixture film really is at stage design (a fragment is planned and does not exist yet)', () => {
  assert.equal(stageOf(NAME).stage, 'design');
});

test('stage-say prints "design"-stage rule briefs, doc-qualified, at most 2 per category', () => {
  try { fs.unlinkSync(rulesState); } catch { /* first run of the suite: nothing to clear */ }
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, new RegExp(`${NAME} is at stage DESIGN`));
  const briefLines = out.split('\n').filter((l) => l.trim().startsWith('rule '));
  assert.ok(briefLines.length > 0, 'at least one always-applies design-stage rule should print');
  // design is a grouped stage (STAGE_CATEGORY_ORDER in harness/lib/craft-rules.mjs): capped per
  // category, not by one flat total, so motion-sized categories cannot crowd out the rest.
  const perCategory = new Map();
  for (const l of briefLines) {
    const category = l.trim().match(/^rule ([a-z-]+)\./)[1];
    perCategory.set(category, (perCategory.get(category) || 0) + 1);
  }
  for (const [category, count] of perCategory) assert.ok(count <= 2, `${category} exceeds its 2-per-category cap`);
  for (const l of briefLines) assert.match(l, /^\s*rule [a-z-]+\.[a-z0-9-]+: .+\(engine-doctrine\/.+\.md\)$/);
});

test('a second prompt in the same stage stays silent on the briefs (per film, per stage, per session)', () => {
  // the previous test already spoke design-stage briefs for this film and wrote the state file; a
  // repeat run in the same stage must still print the stage line every turn (that re-statement is the
  // whole point of the hook) but not the rule briefs again.
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, new RegExp(`${NAME} is at stage DESIGN`), 'the stage line still re-states every turn');
  const briefLines = out.split('\n').filter((l) => l.trim().startsWith('rule '));
  assert.equal(briefLines.length, 0, 'the same (film, stage) already spoke its briefs once');
});

test('a different stage for the same film speaks its briefs again', () => {
  fs.writeFileSync(rulesState, JSON.stringify({ film: NAME, stage: 'plan' }));
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')], { cwd: ROOT, encoding: 'utf8' });
  const briefLines = out.split('\n').filter((l) => l.trim().startsWith('rule '));
  assert.ok(briefLines.length > 0, 'the recorded stage was "plan", not the fixture\'s real "design": briefs speak again');
});

test('same session_id, unchanged stage: the stage block prints once, then stays silent', () => {
  const sid = 'stage-say-session-test-unchanged';
  try { fs.unlinkSync(sessionState); } catch { /* nothing to clear */ }
  const first = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  assert.match(first, /is at stage/, 'first prompt of a session always prints');
  const second = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  assert.doesNotMatch(second, /is at stage/, 'a repeat prompt in the same session and stage says nothing new');
});

test('a changed stage for the same session_id prints again', () => {
  const sid = 'stage-say-session-test-changed';
  try { fs.unlinkSync(sessionState); } catch { /* nothing to clear */ }
  execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  // Force a different remembered block for this session, standing in for a real stage change.
  fs.writeFileSync(sessionState, JSON.stringify({ [sid]: 'a stale block from a different stage' }));
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  assert.match(out, /is at stage/, 'the remembered block differs from the current one, so it prints again');
});

test('VAWE_STAGE_SAY=always ignores the session state and prints every time', () => {
  const sid = 'stage-say-session-test-always';
  try { fs.unlinkSync(sessionState); } catch { /* nothing to clear */ }
  const env = { ...process.env, VAWE_STAGE_SAY: 'always' };
  execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }), env });
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }), env });
  assert.match(out, /is at stage/, 'VAWE_STAGE_SAY=always bypasses the per-session dedupe');
});

test('--reset forgets a session, so the next prompt prints again', () => {
  const sid = 'stage-say-session-test-reset';
  try { fs.unlinkSync(sessionState); } catch { /* nothing to clear */ }
  execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  const silent = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  assert.doesNotMatch(silent, /is at stage/, 'same session, same stage: silent before the reset');
  execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs'), '--reset'],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ session_id: sid }) });
  assert.match(out, /is at stage/, '--reset (wired to PreCompact) forgets the session, so the block prints again');
});

test('no session_id on the payload: falls back to always-print rather than guessing', () => {
  try { fs.unlinkSync(sessionState); } catch { /* nothing to clear */ }
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')],
    { cwd: ROOT, encoding: 'utf8', input: '' });
  assert.match(out, /is at stage/, 'no key to dedupe on, so the reminder must never be silently dropped');
});

test('make next (quality/gates/next.mjs) is not rationed by the every-turn hook\'s state file', () => {
  // next.mjs RUNS the stage's command (real side effects), so this does not execute it; it asserts the
  // source carries no reference to stage-say's per-(film,stage) state file, i.e. printRuleBriefs() there
  // is unconditional, the way the plan requires ("make next keeps printing them every time").
  const src = fs.readFileSync(path.join(ROOT, 'quality/gates/next.mjs'), 'utf8');
  assert.doesNotMatch(src, /stage-say-rules-state/, 'next.mjs must not gate its briefs on stage-say\'s state file');
});
