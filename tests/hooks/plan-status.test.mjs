import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPlanState } from '../../harness/live/dev-warn.mjs';
import { planStatusLines, topAdviceLines, adviceOfDevNotes, banLines, STATUS_MAX_LINES } from '../../harness/live/plan-status.mjs';

const DIGEST = fs.readFileSync(path.resolve('taste/build/DIGEST.md'), 'utf8');
const IDEAS = '## Ideas\n\n| at | meaning | i1 | i2 | i3 | i4 | chosen | why |\n|---|---|---|---|---|---|---|---|\n| s1 | m | literal: a cake, 0.1 | metaphor: warmth, 0.2 | reversal: unbaking, 0.3 | scale-shift: a crumb, 0.4 | 2 | because it is less typical |\n\n';
const IDEAS_EMPTY = '## Ideas\n\n| at | meaning | i1 | i2 | i3 | i4 | chosen | why |\n|---|---|---|---|---|---|---|---|\n| [s1] | [m] | [a] | [b] | [c] | [d] | [n] | [because] |\n\n';
const BOARD = '## Board\n\n| beat | in s |\n|---|---|\n| s1 | 0 |\n\n';
const BOARD_EMPTY = '## Board\n\n| beat | in s |\n|---|---|\n| [s1] | [0] |\n\n';
const TAKEN = `## Taken from\n\n| frame | gives |\n|---|---|\n${[1, 2, 3, 4].map((i) => `| refs/a/${i}.png | x |`).join('\n')}\n\n`;
const TAKEN_EMPTY = '## Taken from\n\n| frame | gives |\n|---|---|\n| [path.png] | [x] |\n\n';
const RUNGS = ['builder', 'type', 'colour', 'depth', 'frame'].map((r) => `Skill ${r}: some-skill: decided it`).join('\n');

function film({ brief, design = null }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-plan-'));
  fs.mkdirSync(path.join(root, 'films', 'f'), { recursive: true });
  fs.mkdirSync(path.join(root, 'out'));
  fs.mkdirSync(path.join(root, 'taste', 'build'), { recursive: true });
  fs.writeFileSync(path.join(root, 'taste', 'build', 'DIGEST.md'), DIGEST);
  const page = path.join(root, 'films', 'f', 'page.html');
  fs.writeFileSync(page, '<p>x</p>');
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), brief);
  if (design) fs.writeFileSync(path.join(root, 'films', 'f', 'DESIGN.md'), design);
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(page, old, old);
  return { root, page };
}

const status = ({ root, page }) => planStatusLines(readPlanState(page, root));

test('an empty film: at most 8 lines, the skill file per empty stage, the ban lines and exactly one next', () => {
  const lines = status(film({ brief: TAKEN_EMPTY + IDEAS_EMPTY + BOARD_EMPTY }));
  assert.ok(lines.length <= STATUS_MAX_LINES, lines.join('\n'));
  assert.match(lines[0], /^plan of f: \d+ open/);
  assert.match(lines.join('\n'), /the brief Board is empty: skills\/vawe-transitions\/SKILL\.md/);
  assert.match(lines.join('\n'), /the Ideas ledger is empty: skills\/vawe-transitions\/SKILL\.md/);
  assert.equal(lines.filter((l) => l.startsWith('ban: ')).length, 2);
  assert.match(lines.join('\n'), /ban: No tells unless the brief asks/);
  assert.match(lines.join('\n'), /slideshow tells: taste\/craft\/transitions\.md/);
  assert.equal(lines.filter((l) => l.startsWith('next: ')).length, 1);
  assert.match(lines.at(-1), /^next: /);
});

test('a half-filled film names only what is still open', () => {
  const text = status(film({ brief: TAKEN + IDEAS + BOARD })).join('\n');
  assert.doesNotMatch(text, /Board is empty|Ideas ledger is empty|reference study/);
  assert.match(text, /DESIGN\.md has no line for builder, type, colour, depth, frame: skills\/vawe-page\/SKILL\.md/);
  assert.match(text, /no storyboard run: bin\/vawe storyboard films\/f\/page\.html/);
});

test('a full film is quiet', () => {
  const f = film({ brief: TAKEN + IDEAS + BOARD, design: RUNGS });
  fs.writeFileSync(path.join(f.root, 'out', 'f-frames.png'), '');
  fs.writeFileSync(path.join(f.root, 'out', 'f.runs.jsonl'), `${JSON.stringify({ cmd: 'verb', verb: 'storyboard', exitCode: 0 })}\n`);
  assert.deepEqual(status(f), []);
});

test('after a draft the pre-draft items are dropped and an empty Board still warns', () => {
  const f = film({ brief: TAKEN + IDEAS + BOARD_EMPTY });
  fs.writeFileSync(path.join(f.root, 'out', 'f-draft.mp4'), '');
  const text = status(f).join('\n');
  assert.match(text, /the brief Board is empty/);
  assert.doesNotMatch(text, /storyboard|frames|DESIGN/);
});

test('the block is capped: many open items and findings stay inside 8 lines and count the rest', () => {
  const lines = planStatusLines({
    name: 'f', rel: 'films/f/page.html', brief: TAKEN_EMPTY + IDEAS_EMPTY + BOARD_EMPTY, design: '', early: true, frames: 'none', storyboardRan: false,
    findings: Array.from({ length: 30 }, (_, i) => `finding ${i}`), digest: DIGEST, next: 'bin/vawe frames films/f/page.html',
  });
  assert.ok(lines.length <= STATUS_MAX_LINES);
  assert.match(lines.join('\n'), /- \+4 more: /);
  assert.match(lines.join('\n'), /\(\+29 more: bin\/vawe storyboard films\/f\/page\.html\)/);
  assert.match(lines.at(-1), /^next: /);
});

test('an attractor finding comes before the plan findings', () => {
  const lines = planStatusLines({ name: 'f', rel: 'p', brief: BOARD_EMPTY, design: '', early: false, frames: 'ok', storyboardRan: true, findings: ['stagger gap', 'attractor: ring'], digest: DIGEST, next: 'x' });
  assert.match(lines.find((l) => l.startsWith('  plan: ')), /attractor: ring/);
});

test('the bans the page shows come first: the slideshow score in the head, two lines with their doc, the rest counted for the storyboard', () => {
  const page = [
    'rule stagger @5.12s stagger-gap: 2 elements start 20 ms apart, under the 30 ms floor; fix: stagger(els) from core/motion/presets.js: 30 to 80 ms apart',
    'slideshow: score 2/10',
    'slideshow: same-entrance at 0.7 s: 17 of 17 elements enter with one move (blur + moves up + scale in). Fix: vary the moves of the hero, the support and the detail; stagger them',
    'slideshow: swap-no-carry at 2.3, 5 s: 2 of 2 cuts swap the whole frame with no element carried across. Fix: name a handoff object that leaves A and starts B (taste/craft/transitions.md families)',
    'world held s2 2-5.5 s (3.5 s, limit 2 s)',
  ];
  const lines = planStatusLines({ name: 'f', rel: 'films/f/page.html', brief: BOARD_EMPTY, design: '', early: false, frames: 'ok', storyboardRan: true, findings: [], page, digest: DIGEST, next: 'x' });
  assert.ok(lines.length <= STATUS_MAX_LINES);
  assert.equal(lines[0], 'plan of f: 5 open, slideshow 2/10, the draft renders anyway');
  assert.equal(lines[1], '  page: same-entrance at 0.7 s: 17 of 17 elements enter with one move (blur + moves up + scale in). Fix: vary the moves of the hero, the support and the detail; stagger them (taste/craft/transitions.md)');
  assert.equal(lines[2], '  page: swap-no-carry at 2.3, 5 s: 2 of 2 cuts swap the whole frame with no element carried across. Fix: name a handoff object that leaves A and starts B (taste/craft/transitions.md)');
  assert.equal(lines[3], '  page: +2 more before the render: bin/vawe storyboard films/f/page.html');
  assert.match(lines[4], /the brief Board is empty/);
  const clean = { name: 'f', rel: 'p', brief: TAKEN + IDEAS + BOARD, design: RUNGS, early: false, frames: 'ok', storyboardRan: true, digest: DIGEST, next: 'x' };
  assert.deepEqual(planStatusLines({ ...clean, page: [] }), []);
  assert.match(planStatusLines({ ...clean, page: [page[0]] })[1], /^ {2}page: rule stagger .* \(taste\/rules\/stagger\.md\)$/);
});

test('the ban lines come from the digest, not from a copy', () => {
  assert.deepEqual(banLines(''), []);
  assert.match(banLines(DIGEST)[0], /^ban: No tells unless the brief asks/);
});

test('the top advice of a draft puts the slideshow score and the attractor first, then counts the rest', () => {
  const notes = ['# f draft', '', '## Draft check', '', 'draft check:', 'advice: blank frame 1-2 s', 'advice: transitions: no planned handoff', 'advice: slideshow: same-entrance at 1 s', 'advice: attractor: direction A', 'advice: slideshow: score 2/10', 'advice: static window', '(advice only)', '', '## Signature'].join('\n');
  const lines = topAdviceLines(adviceOfDevNotes(notes), 'f');
  assert.deepEqual(lines.slice(1, 4).map((l) => l.replace('  advice: ', '')), ['slideshow: score 2/10', 'attractor: direction A', 'slideshow: same-entrance at 1 s']);
  assert.equal(lines.at(-1), '  +3 more in out/f.dev.md');
  assert.deepEqual(topAdviceLines([], 'f'), []);
});

test('dev-warn prints the status on a real page and exits 0', () => {
  const r = spawnSync(process.execPath, [path.resolve('harness/live/dev-warn.mjs'), 'films/examples/colour-sting/page.html'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.trim().split('\n').length <= STATUS_MAX_LINES);
});
