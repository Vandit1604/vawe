import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRefs, resolveRef, verdict, reportLines, linksProblem } from '../../harness/media/links-math.mjs';

const HTML = `<a href="/blog">b</a> <a class="x" href='/moves#mask'>m</a> <a href="mailto:a@b.c">m</a>
<img src="/a.png" alt=""><link rel="stylesheet" href="/s.css"><h2 id="top">t</h2><a name="old"></a>`;

test('extractRefs reads links, assets and ids', () => {
  const r = extractRefs(HTML);
  assert.deepEqual(r.links, ['/blog', '/moves#mask', 'mailto:a@b.c']);
  assert.deepEqual(r.assets, ['/a.png', '/s.css']);
  assert.deepEqual([...r.ids].sort(), ['old', 'top']);
});

test('resolveRef drops non-web links and splits the hash and the origin', () => {
  assert.equal(resolveRef('mailto:a@b.c', 'http://h/x', 'http://h'), null);
  assert.deepEqual(resolveRef('/moves#mask', 'http://h/x', 'http://h'), { url: 'http://h/moves', hash: 'mask', external: false });
  assert.equal(resolveRef('https://other.dev/', 'http://h/x', 'http://h').external, true);
});

test('verdict tells ok, redirect and broken apart', () => {
  assert.equal(verdict({ status: 200 }).kind, 'ok');
  assert.deepEqual(verdict({ status: 308, location: '/b' }), { kind: 'redirect', why: '308 to /b' });
  assert.equal(verdict({ status: 404 }).kind, 'broken');
  assert.equal(verdict({ error: 'ECONNREFUSED' }).kind, 'broken');
});

test('reportLines puts broken first and always ends with the count', () => {
  const rows = [
    { url: 'http://h/r', kind: 'redirect', why: '308 to /b', from: new Set(['http://h/']) },
    { url: 'http://h/x', kind: 'broken', why: 'status 404', from: new Set(['a', 'b', 'c', 'd']) },
  ];
  const lines = reportLines({ rows, pages: 5, checked: 9 });
  assert.match(lines[0], /^broken \(1\)/);
  assert.match(lines[1], /<- a, b, c, \+1 more/);
  assert.match(lines.at(-1), /5 page\(s\) read, 9 distinct link\(s\) checked, 1 broken, 1 redirecting/);
});

test('linksProblem refuses a bad base and a bad max', () => {
  assert.match(linksProblem({ base: 'vawe.dev' }), /--base/);
  assert.match(linksProblem({ max: 0 }), /--max/);
  assert.equal(linksProblem({ base: 'https://vawe.dev', max: 10 }), null);
});
