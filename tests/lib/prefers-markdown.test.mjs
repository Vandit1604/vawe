import test from 'node:test';
import assert from 'node:assert/strict';
import { prefersMarkdown as site } from '../../site/lib/md/accept.ts';

const CASES = [
  [null, false],
  ['', false],
  ['*/*', false],
  ['text/html', false],
  ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
  ['text/markdown', true],
  ['text/markdown, text/html;q=0.5', true],
  ['text/markdown;q=0.5, text/html', false],
  ['text/markdown;q=0.5, */*', false],
  ['text/markdown, */*;q=0.1', true],
  ['text/markdown, text/*;q=0.1', true],
  ['text/markdown;q=0, */*', false],
  ['text/markdown;q=abc, */*;q=0.1', false],
  ['TEXT/MARKDOWN', true],
];

test('the site answers every Accept header as expected', () => {
  for (const [accept, want] of CASES) {
    assert.equal(site(accept), want, `site: ${accept}`);
  }
});
