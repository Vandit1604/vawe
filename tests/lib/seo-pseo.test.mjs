import test from 'node:test';
import assert from 'node:assert/strict';
import { copyShare, hubProse, inbound, internalLinks, mainOf, markdownLinks, mdBody, repeats, textOf } from '../../harness/lib/pseo.mjs';

const PROSE = 'Each video component is one markdown file with a clip, the CSS snippet and notes on when to use it in a film.';

test('mainOf drops header and footer links', () => {
  const html = '<header><a href="/easing/land">x</a></header><main><a href="/easing/pop/">y</a></main><footer><a href="/about">z</a></footer>';
  assert.deepEqual([...internalLinks(mainOf(html))], ['/easing/pop']);
});

test('internalLinks keeps own-origin links and drops other hosts, hashes and queries', () => {
  const html = '<a href="https://vawe.dev/vs/lottie#t">a</a><a href="https://example.com/x">b</a><a href="/easing?x=1">c</a><a href="//cdn.test/y">d</a>';
  assert.deepEqual([...internalLinks(html)].sort(), ['/easing', '/vs/lottie']);
});

test('markdownLinks reads markdown links and href attributes', () => {
  const md = 'See [a](/video-components/x) and <a href="/easing/land">b</a> and [c](https://vawe.dev/about) and [d](https://other.dev/z).';
  assert.deepEqual([...markdownLinks(md)].sort(), ['/about', '/easing/land', '/video-components/x']);
});

test('hubProse counts prose outside cards and ignores script text', () => {
  const grid = '<main><h1>Hub</h1><script>var a = "one two three four five six seven eight nine ten eleven twelve thirteen"</script><ul><li><p>' + PROSE + '</p></li></ul><a href="/x"><p>' + PROSE + '</p></a></main>';
  assert.deepEqual(hubProse(grid), { paragraphs: 0, words: 0 });
  const withIntro = `<main><p>${PROSE}</p><p>Short.</p></main>`;
  assert.deepEqual(hubProse(withIntro), { paragraphs: 1, words: 23 });
});

test('textOf breaks words at block tags and not at inline tags', () => {
  assert.equal(textOf('<p>ab<span>cd</span></p><p>ef</p>'), 'abcd ef');
});

test('copyShare is 1 when the page holds the copy and low when it does not', () => {
  const md = '# T\n\n> description here\n\nCanonical: https://vawe.dev/x\n\nThe quick brown fox jumps over the lazy dog today.\n\n## Related\n\n- [a](https://vawe.dev/a)\n';
  const body = mdBody(md);
  assert.equal(copyShare(body, 'T The quick brown fox jumps over the lazy dog today.'), 1);
  assert.ok(copyShare(body, 'nothing alike at all in this page text here') < 0.2);
});

test('inbound lists only the given sources and skips self links', () => {
  const links = new Map([['/a', new Set(['/t1', '/t2'])], ['/b', new Set(['/t1', '/b'])], ['/idx', new Set(['/t1', '/t2'])]]);
  const out = inbound(links, ['/t1', '/t2'], ['/a', '/b']);
  assert.deepEqual(out.get('/t1'), ['/a', '/b']);
  assert.deepEqual(out.get('/t2'), ['/a']);
});

test('repeats names every item that shares a fingerprint with a sibling', () => {
  const items = [{ n: 'a', k: 1 }, { n: 'b', k: 1 }, { n: 'c', k: 2 }];
  const out = repeats(items, (i) => i.n, (i) => String(i.k));
  assert.deepEqual([...out.keys()].sort(), ['a', 'b']);
  assert.deepEqual(out.get('a'), ['b']);
});
