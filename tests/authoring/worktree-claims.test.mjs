// tests/authoring/worktree-claims.test.mjs: the smallest check that fails if the overlap rule breaks.
//   node tests/authoring/worktree-claims.test.mjs
import assert from 'node:assert/strict';
import { scopesOverlap } from '../../harness/lib/worktree-claims.mjs';

function demo() {
  // Two workers both in harness/dev/: overlap.
  assert.equal(scopesOverlap(['harness/dev/**'], ['harness/dev/worktree.sh']).length, 1);
  // Disjoint subtrees: silence.
  assert.equal(scopesOverlap(['harness/dev/**'], ['core/layers/text.js']).length, 0);
  // A shared exact file: overlap.
  assert.equal(scopesOverlap(['AGENTS.md'], ['AGENTS.md']).length, 1);
  // No scope declared on either side: nothing to compare, no false alarm.
  assert.equal(scopesOverlap([], ['core/**']).length, 0);
  assert.equal(scopesOverlap(['core/**'], []).length, 0);
  // Sibling directories that merely share a prefix string are not the same subtree.
  assert.equal(scopesOverlap(['harness/dev/**'], ['harness/devtools/config']).length, 0);
  console.log('✓ worktree-claims.test.mjs: 6 assertions passed');
}

demo();
