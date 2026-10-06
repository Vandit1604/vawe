import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nextStep } from '../../harness/live/stage-say.mjs';

function film(html) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stage-'));
  fs.mkdirSync(path.join(root, 'films', 'f'), { recursive: true });
  fs.mkdirSync(path.join(root, 'out'));
  const page = path.join(root, 'films', 'f', 'page.html');
  fs.writeFileSync(page, html);
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
