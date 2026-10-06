import test from 'node:test';
import assert from 'node:assert/strict';
import { pageLook, writeLook, firstFamily, FROM_PAGE } from '../../harness/lib/page-look.mjs';

const page = `<style>
  @font-face { font-family: "Anybody"; src: url(a.woff2); }
  :root { --ground: #16151A /* chosen */; --ink: rgb(250, 250, 250); --accent: #0a87ff; --beat-1: 0s; }
</style>`;

test('pageLook reads the :root colours by role and the face of the largest text, else the @font-face family', () => {
  assert.deepEqual(pageLook(page, { family: 'Fraunces', weight: '700' }), { ground: '#16151a', ink: 'rgb(250, 250, 250)', accent: '#0a87ff', typeface: 'Fraunces, weight 700' });
  assert.deepEqual(pageLook(page), { ground: '#16151a', ink: 'rgb(250, 250, 250)', accent: '#0a87ff', typeface: 'Anybody' });
  assert.deepEqual(pageLook('<p>no root</p>'), {});
  assert.equal(firstFamily('"Fraunces", sans-serif'), 'Fraunces');
});

const brief = `## Look

- look: dark and precise
- ground: #8c8c8c, the starter's grey placeholder (guess: change me)
- ink: #fafafa, written by the author
- accent: none yet (guess: change me)
- typeface: Fraunces, weight 700 (guess: change me)
- cap height: 10% (guess: change me)
`;

test('writeLook replaces only guess lines that disagree with the page, and keeps the author lines', () => {
  const look = { ground: '#16151a', ink: '#000000', accent: '#0a87ff', typeface: 'Fraunces, weight 700' };
  const { text, written } = writeLook(brief, look);
  assert.deepEqual(written, ['ground', 'accent']);
  assert.ok(text.includes(`- ground: #16151a ${FROM_PAGE}\n`));
  assert.ok(text.includes('- ink: #fafafa, written by the author\n'));
  assert.ok(text.includes('- typeface: Fraunces, weight 700 (guess: change me)'));
  assert.ok(text.includes('- cap height: 10% (guess: change me)'));
});

test('writeLook refreshes a line it wrote before and is stable on the second run', () => {
  const once = writeLook(brief, { ground: '#16151a' }).text;
  assert.deepEqual(writeLook(once, { ground: '#16151a' }).written, []);
  assert.deepEqual(writeLook(once, { ground: '#ffffff' }).written, ['ground']);
});
