// harness/author/arsenal.test.mjs: the runnable self-check that `make arsenal` can actually find the
// blocks that already type with a caret.
//
// WHY. Measured before this landed: `make arsenal Q="caret"` and `Q="typing caret"` both returned only
// `typeOn`, `text` and `type`. Four blocks that already type a caret in (`terminal`, `terminalPro`,
// `terminalHtml`, `codeTyping`) were invisible, because their catalog blurbs say "text cursor" or
// "types itself" and the search has no stemming to connect that wording to the word an author types.
// The fix is the catalog's own `aka` field (blocks/catalog.mjs), read by the block adapter in
// arsenal.mjs; this guards that the wiring stays connected, not the words in any one blurb.
//   node harness/author/arsenal.test.mjs
import assert from 'node:assert/strict';
import { collect, rankQuery } from './arsenal.mjs';

const all = await collect();

const CARET_BLOCKS = ['terminal', 'terminalPro', 'terminalHtml', 'codeTyping'];

for (const query of ['caret', 'typing caret']) {
  // n:50 is wide enough that everything scoring above 0 for these two words comes back, the same list
  // `make arsenal` prints, so this asserts what an author actually sees rather than an internal shape.
  const { results } = rankQuery(all, query, { n: 50 });
  const found = new Set(results.map((e) => e.name));
  for (const name of [...CARET_BLOCKS, 'text']) {
    assert.ok(found.has(name), `Q="${query}" should surface "${name}"; got [${[...found].join(', ')}]`);
  }
}

console.log('arsenal.test.mjs: OK (caret/typing queries surface all typed-caret blocks + text)');
