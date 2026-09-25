// node --test tests/gates/skill-reach.test.mjs
//
// Two fixtures, a bare tree with no .git of its own so skills() falls back to the directory walk:
// a skill AGENTS.md actually names (routed) beside one nothing but the generated index mentions
// (unrouted, the vawe-review-loop shape this gate exists to catch).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { run } from '../../quality/gates/skill-reach.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-reach-'));
  fs.mkdirSync(path.join(root, 'skills/routed-skill'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills/orphan-skill'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/routed-skill/SKILL.md'), '# routed-skill\ndoes the routed thing\n');
  fs.writeFileSync(path.join(root, 'skills/orphan-skill/SKILL.md'), '# orphan-skill\ndoes the orphan thing\n');
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Load **routed-skill** when the user asks for it.\n');
  fs.mkdirSync(path.join(root, 'engine-doctrine/CRAFT'), { recursive: true });
  fs.writeFileSync(path.join(root, 'engine-doctrine/CRAFT/ROUTING.md'), '# routing\nno rows yet\n');
  fs.writeFileSync(path.join(root, 'Makefile'), 'help:\n\t@echo ok\n');
  // the generated index: lists BOTH skills, same as doc-map.mjs's real output, so a hit here alone
  // must not count as routing.
  fs.writeFileSync(path.join(root, 'engine-doctrine/INDEX.md'),
    '| routed-skill | ... |\n| orphan-skill | ... |\n');
  return root;
}

test('a skill AGENTS.md names is routed, not reported', () => {
  const root = fixture();
  const { unrouted } = run({ root });
  assert.ok(!unrouted.some((u) => u.dir === 'routed-skill'), 'routed-skill must not be flagged');
});

test('a skill named only in the generated index is reported unrouted', () => {
  const root = fixture();
  const { total, unrouted } = run({ root });
  assert.equal(total, 2);
  assert.equal(unrouted.length, 1);
  assert.equal(unrouted[0].dir, 'orphan-skill');
  assert.deepEqual(unrouted[0].hits, ['engine-doctrine/INDEX.md'], 'the only hit is the pure index, not a router');
});
