import test from 'node:test';
import assert from 'node:assert/strict';
import { rebaseDecision, pushErrorText, keepAliveSsh } from '../../harness/lib/land.mjs';

test('a branch that contains origin/main skips the rebase', () => {
  assert.equal(rebaseDecision({ headInMain: false, containsMain: true }), 'skip');
});

test('a branch behind origin/main is rebased', () => {
  assert.equal(rebaseDecision({ headInMain: false, containsMain: false }), 'rebase');
});

test('a branch already in origin/main is reported as merged, even when it also contains main', () => {
  assert.equal(rebaseDecision({ headInMain: true, containsMain: true }), 'merged');
  assert.equal(rebaseDecision({ headInMain: true, containsMain: false }), 'merged');
});

test('pushErrorText returns the ssh error, not the CI status line the hook prints last', () => {
  const out = [
    '✗ e2e FAILED in 4.1s',
    'client_loop: send disconnect: Broken pipe',
    'fatal: the remote end hung up unexpectedly',
    'error: failed to push some refs to github.com:Vandit1604/vawe.git',
    'CI: main is red (3 failing checks)',
  ].join('\n');
  const text = pushErrorText(out);
  assert.match(text, /Broken pipe/);
  assert.match(text, /remote end hung up/);
  assert.doesNotMatch(text, /CI: main is red/);
});

test('pushErrorText keeps a rejection and a hook block', () => {
  const out = ' ! [rejected]        HEAD -> main (fetch first)\npre-push blocked: e2e failed.\n';
  assert.equal(pushErrorText(out), ' ! [rejected]        HEAD -> main (fetch first)\npre-push blocked: e2e failed.');
});

test('pushErrorText falls back to the last three lines when nothing looks like an error', () => {
  assert.equal(pushErrorText('a\nb\nc\nd\n'), 'b\nc\nd');
});

test('keepAliveSsh adds the keep-alive to the configured command and leaves the user\'s own keep-alive alone', () => {
  assert.equal(keepAliveSsh('', ''), 'ssh -o ServerAliveInterval=20 -o ServerAliveCountMax=60');
  assert.match(keepAliveSsh('', 'ssh -i key'), /^ssh -i key -o ServerAliveInterval=20/);
  assert.equal(keepAliveSsh('ssh -o ServerAliveInterval=5'), 'ssh -o ServerAliveInterval=5');
  assert.match(keepAliveSsh('ssh -F cfg', 'ssh -i other'), /^ssh -F cfg -o/);
});
