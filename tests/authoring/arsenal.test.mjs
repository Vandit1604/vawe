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
import { collect, rankQuery } from '../../harness/author/arsenal.mjs';

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

// CRAFT RULES: engine-doctrine/CRAFT/rules/*.json should be PULLABLE by search, not only pushed by a hook. A
// query matching a known rule's own brief must come back as kind "rule" with that rule's id, so an
// agent can `make arsenal Q="..."` a rule the same way it searches for an effect.
{
  const rule = all.find((e) => e.kind === 'rule' && e.name === 'motion.caption-safe-strip');
  assert.ok(rule, 'expected a "rule" entry for motion.caption-safe-strip; craft rules never loaded into the corpus');
  const { results } = rankQuery(all, 'captions inside its safe strip', { n: 20 });
  const found = results.find((e) => e.kind === 'rule' && e.name === 'motion.caption-safe-strip');
  assert.ok(found, `query on a rule's own brief should surface it; got [${results.map((e) => e.name).join(', ')}]`);
  console.log('arsenal.test.mjs: OK (a query on a craft rule\'s brief returns kind "rule" with its id)');
}

// THE DEADLOCK GUARD. arsenal.mjs runs a top-level `await collect()`, and a STATIC import chain back
// into arsenal.mjs from a module it loads hangs the process forever ("unsettled top-level await",
// exit 13, engine-doctrine/MISTAKES.md). Both the plain CLI and --for must still exit cleanly now that craft-rules
// is in the corpus.
{
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const repoRoot = new URL('../..', import.meta.url).pathname;
  // `--for` only needs a parseable scene to walk, so a throwaway minimal one stands in for a real film.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arsenal-for-test-'));
  const film = path.join(dir, 'v.json');
  fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9', duration: 3,
    layers: [{ type: 'text', text: 'x', size: 80, start: 0, duration: 3 }] }));
  execFileSync(process.execPath, ['harness/author/arsenal.mjs', 'caret'], { cwd: repoRoot, stdio: 'pipe' });
  execFileSync(process.execPath, ['harness/author/arsenal.mjs', '--for', film],
    { cwd: repoRoot, stdio: 'pipe' });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('arsenal.test.mjs: OK (CLI query and --for both exit 0, no deadlock)');
}
