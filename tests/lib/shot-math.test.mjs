import test from 'node:test';
import assert from 'node:assert/strict';
import { isFaviconUrl, isRequestNoise, parseWidths, parseTargets, problemLines, shotProblem, resolveTarget, shotName, viewportHeight } from '../../harness/media/shot-math.mjs';

test('parseWidths reads a comma list and refuses the rest', () => {
  assert.deepEqual(parseWidths('1440,390'), [1440, 390]);
  assert.equal(parseWidths('1440,wide'), null);
  assert.equal(parseWidths('100'), null);
});

test('shotProblem names the first fault', () => {
  assert.match(shotProblem({ targets: [] }), /missing <route/);
  assert.match(shotProblem({ targets: ['/'], w: 'x' }), /--w/);
  assert.match(shotProblem({ targets: ['/'], base: 'localhost' }), /--base/);
  assert.match(shotProblem({ targets: ['blog'] }), /not a route/);
  assert.equal(shotProblem({ targets: ['/', 'https://vawe.dev/blog', 'films/a/page.html'] }), null);
});

test('resolveTarget joins a route onto the base and keeps urls and files', () => {
  assert.deepEqual(resolveTarget('/blog', 'http://localhost:3080'), { kind: 'url', url: 'http://localhost:3080/blog' });
  assert.deepEqual(resolveTarget('https://vawe.dev/x', 'http://b'), { kind: 'url', url: 'https://vawe.dev/x' });
  assert.deepEqual(resolveTarget('films/a/page.html', 'http://b'), { kind: 'file', file: 'films/a/page.html' });
});

test('shotName is one slug per route and width', () => {
  assert.equal(shotName('/', 390), 'home-390.png');
  assert.equal(shotName('/blog/determinism/', 1440), 'blog-determinism-1440.png');
  assert.equal(shotName('https://vawe.dev/vs/remotion?x=1', 390), 'vs-remotion-x-1-390.png');
  assert.equal(shotName('/blog?view=list', 390), 'blog-view-list-390.png');
  assert.equal(shotName('films/my-film/page.html', 1920), 'my-film-page-1920.png');
});

test('a phone width gets a phone height', () => {
  assert.equal(viewportHeight(390), 844);
  assert.equal(viewportHeight(1440), 900);
});

test('problemLines names each problem, caps each list and counts the rest', () => {
  assert.deepEqual(problemLines({ errors: [], failed: [] }), []);
  assert.deepEqual(problemLines({ errors: ['boom'], failed: ['http://x/a.png (HTTP 404)'] }), ['  failed request: http://x/a.png (HTTP 404)', '  console error: boom']);
  const lines = problemLines({ errors: Array.from({ length: 13 }, (_, i) => `e${i}`), failed: [] });
  assert.equal(lines.length, 11);
  assert.equal(lines[9], '  console error: e9');
  assert.equal(lines[10], '  and 3 more console errors');
});

test('parseTargets splits a comma list', () => {
  assert.deepEqual(parseTargets('/,/blog'), ['/', '/blog']);
  assert.deepEqual(parseTargets(undefined), []);
});

test('a 404 is one line: the console copy and the favicon are not listed', () => {
  assert.equal(isRequestNoise('Failed to load resource: the server responded with a status of 404 (Not Found)'), true);
  assert.equal(isRequestNoise('boom: bad state'), false);
  assert.equal(isFaviconUrl('http://127.0.0.1:3000/favicon.ico'), true);
  assert.equal(isFaviconUrl('http://127.0.0.1:3000/gone.png'), false);
});
