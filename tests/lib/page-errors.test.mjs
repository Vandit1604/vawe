import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { watchPageErrors, pageErrorLines } from '../../harness/lib/page-errors.mjs';

const request = (type, url, errorText) => ({ resourceType: () => type, url: () => url, failure: () => ({ errorText }) });

test('pageErrorLines names the page, the source file and the message', () => {
  const lines = pageErrorLines([{ message: 'boom', source: 'http://127.0.0.1:4000/films/a/lib/x.js:12:3' }], 'films/a/page.html');
  assert.deepEqual(lines, ['films/a/page.html: films/a/lib/x.js: boom']);
});

test('pageErrorLines leaves out an unknown source', () => {
  assert.deepEqual(pageErrorLines([{ message: 'boom', source: null }], 'p.html'), ['p.html: boom']);
});

test('watchPageErrors keeps script 404s and thrown errors, and ignores a missing image', () => {
  const page = new EventEmitter();
  const events = watchPageErrors(page);
  page.emit('response', { status: () => 404, url: () => 'http://h/films/a/missing.js', request: () => request('script') });
  page.emit('response', { status: () => 404, url: () => 'http://h/films/a/missing.png', request: () => request('image') });
  page.emit('requestfailed', request('script', 'http://h/films/a/gone.js', 'net::ERR_FAILED'));
  const e = new Error('seek is not defined');
  e.stack = 'ReferenceError: seek is not defined\n    at http://h/films/a/page.html:9:1';
  page.emit('pageerror', e);
  assert.deepEqual(pageErrorLines(events, 'p.html'), [
    'p.html: films/a/missing.js: HTTP 404',
    'p.html: films/a/gone.js: request failed (net::ERR_FAILED)',
    'p.html: films/a/page.html: seek is not defined',
  ]);
});
