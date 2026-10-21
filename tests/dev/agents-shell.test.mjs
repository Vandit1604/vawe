import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const agents = fs.readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');

test('AGENTS.md Shell tells an agent to render in the background and to edit with assertion', () => {
  const shell = agents.split('\n## Shell')[1].split('\n## ')[0];
  assert.match(shell, /render longer than a minute in the background/);
  assert.match(shell, /Edit tool, or with a replace that asserts the old text exists/);
});

test('AGENTS.md says a waiver is for the point of the shot and the fix comes first', () => {
  assert.match(agents, /A waiver is for a break that is the point of the shot: .*try the fix first/);
});
