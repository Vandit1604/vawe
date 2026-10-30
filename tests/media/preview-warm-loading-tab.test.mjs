// A warm tab that is still loading throws "Requesting main frame too early!" on url(); takeWarmPage must treat it as not reusable.
//   node --test tests/media/preview-warm-loading-tab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { takeWarmPage, WARM_HASH } from '../../harness/media/preview-server.mjs';

test('a tab whose url() throws is skipped and a new page is opened', async () => {
  const loading = { url() { throw new Error('Requesting main frame too early!'); }, isClosed: () => false, close: async () => assert.fail('closed a tab that is loading') };
  const fresh = { fresh: true };
  const browser = {
    targets: () => [{ type: () => 'page', url: () => `http://x/p.html${WARM_HASH}`, page: async () => loading }],
    newPage: async () => fresh,
  };
  const got = await takeWarmPage(browser, `http://x/p.html${WARM_HASH}`, 'sig');
  assert.deepEqual(got, { page: fresh, reused: false });
});
