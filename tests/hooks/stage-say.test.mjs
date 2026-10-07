import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nextStep, takenFromCount, movesTakenCount, boardFilled } from '../../harness/live/stage-say.mjs';

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
  fs.writeFileSync(path.join(root, 'films', 'f', 'DESIGN.md'), '# d');
  assert.equal(nextStep(page, root).next, 'bin/vawe frames films/f/page.html');
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
  fs.writeFileSync(path.join(root, 'films', 'f', 'brief.md'), '## Board\n\n| beat | in s |\n|---|---|\n| s1 | 0 |\n');
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
  assert.equal(s.next, 'bin/vawe strip films/f/page.html --cuts');
  assert.match(s.why, /overshoot-share, live-hold and seam-variety/);
  fs.mkdirSync(path.join(root, 'out', 'strip', 'f'), { recursive: true });
  assert.equal(nextStep(page, root).next, 'bin/vawe critique films/f/page.html');
});
