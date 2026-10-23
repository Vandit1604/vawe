import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { browserLog, stateFile } from '../../harness/media/preview-server.mjs';

test('the Chrome log of each daemon sits next to its state file', () => {
  for (const final of [true, false]) {
    assert.equal(path.dirname(browserLog(final)), path.dirname(stateFile(final)));
    assert.equal(browserLog(final), stateFile(final).replace(/\.json$/, '.log'));
  }
  assert.notEqual(browserLog(true), browserLog(false));
});
