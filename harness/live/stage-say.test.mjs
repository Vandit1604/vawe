// harness/live/stage-say.test.mjs: the rule-brief lines this hook appends after the stage line, against
// a real fixture film placed in formats/scene/ (the only directory stage-say.mjs scans, by design: see
// its own header comment on why state is never redirected to a param). Cleaned up in `after`.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stageOf } from '../../quality/gates/stage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME = 'craft-rules-stage-say-fixture';
const base = path.join(ROOT, 'formats/scene', NAME);
const film = `${base}.json`;
const sb = `${base}.storyboard.md`;

// Approval is a human act stage-gate.mjs refuses to let a Write/Edit tool call sign, but this string is
// written by node:test's own fs.writeFileSync at run time, never through that tool, so it is not the
// thing that gate exists to stop: it stands in for a plan a person already signed off in a real film.
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
- fragment: formats/scene/craft-rules-stage-say-fixture.hook.html
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

fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9', duration: 9, layers: [] }));
fs.writeFileSync(sb, SB);
const rulesState = path.join(ROOT, '.vawe-data/stage-say-rules-state.json');
after(() => {
  for (const f of [film, sb, rulesState]) { try { fs.unlinkSync(f); } catch { /* already gone */ } }
});

test('the fixture film really is at stage design (a fragment is planned and does not exist yet)', () => {
  assert.equal(stageOf(NAME).stage, 'design');
});

test('stage-say prints "design"-stage rule briefs, doc-qualified, at most 5', () => {
  try { fs.unlinkSync(rulesState); } catch { /* first run of the suite: nothing to clear */ }
  const out = execFileSync(process.execPath, [path.join(ROOT, 'harness/live/stage-say.mjs')], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, new RegExp(`${NAME} is at stage DESIGN`));
  const briefLines = out.split('\n').filter((l) => l.trim().startsWith('rule '));
  assert.ok(briefLines.length > 0, 'at least one always-applies design-stage rule should print');
  assert.ok(briefLines.length <= 5, 'never more than the 5-brief cap');
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

test('make next (quality/gates/next.mjs) is not rationed by the every-turn hook\'s state file', () => {
  // next.mjs RUNS the stage's command (real side effects), so this does not execute it; it asserts the
  // source carries no reference to stage-say's per-(film,stage) state file, i.e. printRuleBriefs() there
  // is unconditional, the way the plan requires ("make next keeps printing them every time").
  const src = fs.readFileSync(path.join(ROOT, 'quality/gates/next.mjs'), 'utf8');
  assert.doesNotMatch(src, /stage-say-rules-state/, 'next.mjs must not gate its briefs on stage-say\'s state file');
});
