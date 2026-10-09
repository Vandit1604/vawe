import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SAY, WAIT_WORK, nextStep,takenFromCount, movesTakenCount, boardFilled, missingRungs } from '../../harness/live/stage-say.mjs';

function film(html, brief = '## Look\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stage-'));
  fs.mkdirSync(path.join(root, 'films', 'f'), { recursive: true });
  fs.mkdirSync(path.join(root, 'out'));
  const page = path.join(root, 'films', 'f', 'page.html');
  fs.writeFileSync(page, html);
  if (brief) fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), brief);
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(page, old, old);
  return { root, page };
}

test('a filled board that fails a check is named before the first draft, as advice', () => {
  const { root, page } = film('<meta name="spectacle" content="3"><p>x</p>');
  const filled = '## Board\n\n| beat | in s | hold s | cut out s (length) |\n|---|---|---|---|\n| s1 | 0 | 1 | 0.6 |\n| s2 | 1 | 1 | 0.6 |\n\nSpectacle: the big moment at 7 s.\n\n| cut | move |\n|---|---|\n| s1 to s2 | whip |\n\n| at s | voice | gain dB | for |\n|---|---|---|---|\n| 0 | bed, loop | -20 | all |\n';
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), filled);
  const s = nextStep(page, root);
  assert.match(s.why, /all 2 cuts last 0\.6 s/);
  assert.match(s.why, /Spectacle is at 7 s but/);
  assert.match(s.next, /bin\/vawe dev films\/f\/page\.html/);
});

test('a page with worlds and no frames sheet or draft names bin/vawe frames', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  const s = nextStep(page, root);
  assert.equal(s.next, 'bin/vawe frames films/f/page.html');
  assert.match(s.why, /frames come before the motion/);
});

test('an empty Taken from table says so before any design file; four named frames move on to DESIGN.md, then the frames', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  const brief = path.join(root, 'films', 'f', 'brief.md');
  fs.writeFileSync(brief, '## Taken from\n\n| frame (exact path) | what you take |\n|---|---|\n| [path/to/frame.png] | [ground] |\n\n## Look\n');
  assert.match(nextStep(page, root).why, /Taken from not filled/);
  assert.equal(takenFromCount(fs.readFileSync(brief, 'utf8')), 0);
  const rows = [1, 2, 3, 4].map((n) => `| ~/.vawe/refs/frames/a/s${n}.png | ground |`).join('\n');
  fs.writeFileSync(brief, `## Taken from\n\n| frame | take |\n|---|---|\n${rows}\n\n## Look\n`);
  assert.match(nextStep(page, root).next, /DESIGN\.md/);
  const design = path.join(root, 'films', 'f', 'DESIGN.md');
  fs.writeFileSync(design, '# d');
  assert.match(nextStep(page, root).why, /no Skill line for builder, type, colour, depth, frame/);
  fs.writeFileSync(design, '# d\n\nSkill builder: leonxlnx/soft-skill: card and row styles\nSkill colour: pbakaus/colorize: one accent\nSkipped type: one face already set\n');
  assert.match(nextStep(page, root).why, /no Skill line for depth, frame/);
  fs.writeFileSync(design, '# d\n\nSkill builder: a: x\nSkill type: b: x\nSkill colour: c: x\nSkipped depth: flat film\nSkill frame: vawe rules: one line, three things\n');
  assert.match(nextStep(page, root).next, /^build one static state per world in films\/f\/page\.html from the kit/);
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(page, later, later);
  assert.equal(nextStep(page, root).next, 'bin/vawe frames films/f/page.html');
});

test('a Skipped line needs a reason, and a Skill line needs a slug and a decision', () => {
  assert.deepEqual(missingRungs('Skipped type:\nSkill depth: slug\n'), ['builder', 'type', 'colour', 'depth', 'frame']);
  assert.deepEqual(missingRungs('Skill color: pbakaus/colorize: one accent\n'), ['builder', 'type', 'depth', 'frame']);
});

test('a brief with no Taken from section (an older film) is not nagged', () => {
  assert.equal(takenFromCount('## Look\n'), null);
});

test('a frames sheet newer than the page moves the next step on to the draft', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  fs.writeFileSync(path.join(root, 'out', 'f-frames.png'), '');
  assert.equal(nextStep(page, root).next, 'bin/vawe dev films/f/page.html');
});

test('a page without worlds, or with a draft already, keeps the draft step', () => {
  const plain = film('<p>x</p>');
  assert.equal(nextStep(plain.page, plain.root).next, 'bin/vawe dev films/f/page.html');
  const { root, page } = film('<section data-world="s1"></section>');
  fs.writeFileSync(path.join(root, 'out', 'f-draft.mp4'), '');
  fs.utimesSync(path.join(root, 'out', 'f-draft.mp4'), new Date(Date.now() - 120000), new Date(Date.now() - 120000));
  assert.equal(nextStep(page, root).next, 'bin/vawe dev films/f/page.html');
});

test('a film with no brief.md is told what to create, not to fill a brief it lacks', () => {
  const { root, page } = film('<section data-world="s1"></section>', '');
  const s = nextStep(page, root);
  assert.match(s.next, /^create films\/f\/brief\.md/);
  assert.match(s.why, /has no brief\.md/);
});

const FRAMES = [1, 2, 3, 4].map((n) => `| ~/.vawe/refs/frames/a/s${n}.png | ground |`).join('\n');
const MOVES = (rows) => `| move taken | ref id | cut s |\n|---|---|---|\n${rows}\n`;

test('three named moves are needed before the design files; a placeholder row does not count', () => {
  const brief = (rows) => `## Taken from\n\n| frame | take |\n|---|---|\n${FRAMES}\n\n${MOVES(rows)}\n## Look\n`;
  const { root, page } = film('<section data-world="s1"></section>', brief('| [move name] | [ref id] | [s] |'));
  assert.equal(movesTakenCount(brief('| [move name] | [ref id] | [s] |')), 0);
  assert.match(nextStep(page, root).next, /bin\/vawe strip <ref-id> --cuts/);
  const three = '| push | abc | 2.4 |\n| whip | abc | 5 |\n| match cut | def | 8 |';
  assert.equal(movesTakenCount(brief(three)), 3);
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), brief(three));
  assert.match(nextStep(page, root).next, /DESIGN\.md/);
  assert.equal(movesTakenCount('## Taken from\n\nold\n'), null);
});

test('after the frames, an unfilled Board is the next step; a filled one moves on to the draft', () => {
  const placeholder = '## Board\n\n| beat | in s |\n|---|---|\n| [s1] | [0] |\n\n## Look\n';
  const { root, page } = film('<section data-world="s1"></section>', placeholder);
  fs.writeFileSync(path.join(root, 'out', 'f-frames.png'), '');
  assert.equal(boardFilled(placeholder), false);
  assert.match(nextStep(page, root).next, /fill "Board"/);
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), '## Board\n\n| beat | in s | hold s | cut out s (length) |\n|---|---|---|---|\n| s1 | 0 | 1 | 0.3 |\n| s2 | 1 | 1 | 1.2 |\n\nSpectacle: at 7.\n\n| cut | move |\n|---|---|\n| s1 to s2 | whip |\n\n| at s | voice | gain dB | for |\n|---|---|---|---|\n| 0 | bed, loop | -20 | all |\n');
  assert.equal(nextStep(page, root).next, 'bin/vawe dev films/f/page.html');
  assert.equal(boardFilled('## Look\n'), null);
});

test('a fresh draft names strip --cuts before critique; once the strips exist it names critique', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  const draft = path.join(root, 'out', 'f-draft.mp4');
  fs.writeFileSync(draft, '');
  const later = new Date(Date.now() - 1000);
  fs.utimesSync(draft, later, later);
  const s = nextStep(page, root);
  assert.match(s.next, /^bin\/vawe strip films\/f\/page\.html --cuts and Read every cut/);
  assert.match(s.why, /overshoot-share, live-hold and seam-variety/);
  fs.mkdirSync(path.join(root, 'out', 'strip', 'f'), { recursive: true });
  assert.equal(nextStep(page, root).next, 'bin/vawe critique films/f/page.html');
});

test('a stripped draft with an empty Motion pass names the rows to write; a filled one names critique', () => {
  const empty = '## Motion pass\n\n| cut | what read flat | what I fixed |\n|---|---|---|\n| [s1 to s2] | [x] | [y] |\n';
  const { root, page } = film('<section data-world="s1"></section>', empty);
  fs.writeFileSync(path.join(root, 'out', 'f-draft.mp4'), '');
  const later = new Date(Date.now() - 1000);
  fs.utimesSync(path.join(root, 'out', 'f-draft.mp4'), later, later);
  fs.mkdirSync(path.join(root, 'out', 'strip', 'f'), { recursive: true });
  assert.match(nextStep(page, root).next, /write one row per cut in "Motion pass"/);
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), empty.replace('[s1 to s2] | [x] | [y]', 's1 to s2 | flat | pushed'));
  assert.equal(nextStep(page, root).next, 'bin/vawe critique films/f/page.html');
});

test('the motion step names onion and velocity for the spectacle', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  fs.writeFileSync(path.join(root, 'out', 'f-draft.mp4'), '');
  const later = new Date(Date.now() - 1000);
  fs.utimesSync(path.join(root, 'out', 'f-draft.mp4'), later, later);
  assert.match(nextStep(page, root).next, /strip films\/f\/page\.html --cuts.*onion.*velocity/);
});

test('the ship step names the work for the wait', () => {
  assert.match(WAIT_WORK, /Board and Motion pass rows.*strip <page> --cuts.*critique notes/);
  assert.match(SAY.ship('f', 'films/f/page.html'), /--wait \(one call blocks up to 9 minutes; run it once, not in parallel\); while it renders, fill/);
});

test('dev advises, never blocks, while the Board is the template', () => {
  const { root, page } = film('<p>x</p>', '## Board\n\n| beat | in s |\n|---|---|\n| [s1] | [0] |\n');
  const run = () => spawnSync(process.execPath, [path.resolve('harness/live/dev-warn.mjs'), page], { encoding: 'utf8' });
  const empty = run();
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /The Board comes before the motion: fill rhythm, spectacle, one move per cut, sound/);
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), '## Board\n\n| beat | in s |\n|---|---|\n| s1 | 0 |\n');
  assert.equal(run().stdout, '');
});

test('after a draft the next step follows what is done: strips under any out/strip/<name>* folder, Motion pass rows, critique, then ship', () => {
  const { root, page } = film('<section data-world="s1"></section>');
  const out = (f) => path.join(root, 'out', f);
  const now = Date.now();
  const draft = out('f-draft.mp4');
  fs.writeFileSync(draft, '');
  fs.utimesSync(draft, new Date(now - 30000), new Date(now - 30000));
  assert.equal(nextStep(page, root).stage, 'motion');
  fs.mkdirSync(out('strip/f-cut-3.1'), { recursive: true });
  const brief = path.join(root, 'films', 'f', 'brief.md');
  fs.writeFileSync(brief, '## Motion pass\n\n| cut | what read flat | fixed |\n|---|---|---|\n| [cut] | [x] | [y] |\n');
  assert.equal(nextStep(page, root).next, SAY.motionRows('f'));
  fs.writeFileSync(brief, '## Motion pass\n\n| cut | what read flat | fixed |\n|---|---|---|\n| s1 | too slow | shortened |\n');
  assert.equal(nextStep(page, root).stage, 'critique');
  fs.writeFileSync(out('f.runs.jsonl'), `${JSON.stringify({ cmd: 'verb', verb: 'critique', exitCode: 0, at: new Date(now).toISOString(), start: new Date(now).toISOString() })}\n`);
  const s = nextStep(page, root);
  assert.equal(s.stage, 'ship');
  assert.equal(s.next, SAY.ship('f', 'films/f/page.html'));
});
