import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const agents = fs.readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');

test('AGENTS.md Shell tells an agent to render in the background and to edit with assertion', () => {
  const shell = agents.split('\n## Shell')[1].split('\n## ')[0];
  assert.match(shell, /start a long render in the background yourself/);
  assert.match(shell, /Edit with a tool that fails when the old text is missing/);
});

test('AGENTS.md says a waiver is for the point of the shot and the fix comes first', () => {
  assert.match(agents, /A waiver is for a break that is the point of the shot\. For any other break, try the fix first/);
});
