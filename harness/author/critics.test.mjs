// harness/author/critics.test.mjs: the DECIDERS=1 brief must carry the worktree agent contract
// (docs/CRAFT/SUBAGENTS.md) with a real base sha, not a copy that can drift from the doc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoster, worktreeContract } from './critics.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Any small existing scene works; the roster only needs a readable JSON file.
const sceneFile = fs.readdirSync(path.join(repoRoot, 'formats/scene'))
  .find((f) => f.endsWith('.json') && fs.existsSync(path.join(repoRoot, 'formats/scene', f)));

test('worktreeContract reads a non-empty block from SUBAGENTS.md', () => {
  const contract = worktreeContract();
  assert.ok(contract && contract.length > 0);
  assert.match(contract, /Prove the base/);
  assert.match(contract, /Never write an `approved:` line/);
});

test('decider briefs carry the contract lines and a real sha', () => {
  assert.ok(sceneFile, 'need at least one formats/scene/*.json to build a roster against');
  const { roster, baseSha, contract } = buildRoster(`formats/scene/${sceneFile}`);
  assert.match(baseSha, /^[0-9a-f]{40}$/, 'base sha should be a real git sha, not a placeholder');
  assert.ok(contract);
  for (const d of roster) {
    assert.match(d.prompt, /Worktree agent contract/);
    assert.ok(d.prompt.includes(baseSha), `${d.name} brief should quote the base sha`);
    assert.match(d.prompt, /Prove the base/);
  }
});
