// node harness/live/test/arsenal-nudge.test.mjs
//
// harness/live/arsenal-nudge.mjs, fed exactly as Claude Code's PostToolUse feeds it (stdin JSON,
// stderr on exit 2). Every test gets its own scratch ARSENAL_NUDGE_DATA_DIR so runs never share
// state with each other or with the real .vawe-data/ this hook writes at runtime.
//
// Probe file names are built with `.join('.')` rather than written as literal strings, because
// quality/gates/doc-refs.mjs checks every literal backticked path in the repo actually exists on
// disk, and these are throwaway fixtures created for the run, not permanent files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const HOOK = join(here, '..', 'arsenal-nudge.mjs');

function scratchDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'arsenal-nudge-test-'));
}

function run(input, dataDir) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ARSENAL_NUDGE_DATA_DIR: dataDir },
  });
  return { status: r.status, out: r.stderr };
}

const probeHtml = () => join(ROOT, 'films/scene', ['_arsenal-nudge-probe', 'html'].join('.'));
const probeBoard = () => join(ROOT, 'films/scene', ['_arsenal-nudge-probe', 'storyboard', 'md'].join('.'));
const probeJson = () => join(ROOT, 'films/scene', ['_arsenal-nudge-probe', 'json'].join('.'));

const CARET_HTML = '<div class="typing"><span class="caret">|</span></div>'
  + '<style>.caret{animation:blink 1s infinite}</style>';

const CURSOR_PATH_JSON = JSON.stringify({
  type: 'cursor', size: 40, start: 5.5, duration: 1.6,
  path: [{ t: 0, x: 980, y: 780 }, { t: 0.8, x: 1392, y: 617 }],
  clicks: [0.95],
});

const CURSOR_SNAPTO_JSON = JSON.stringify({
  type: 'cursor', size: 40,
  snapTo: [{ t: 0.5, id: 'install-btn', edge: 'center', dur: 0.6 }],
  clicks: [0.65],
});

const ORDINARY_CARD_JSON = JSON.stringify({
  type: 'card', x: 820, y: 400, w: 300, h: 120, html: '<div>hi</div>',
});

test('an arsenal Bash command is logged, silently', () => {
  const dir = scratchDir();
  const { status, out } = run({ tool_name: 'Bash', tool_input: { command: 'make arsenal Q="a terminal window"' } }, dir);
  assert.equal(status, 0, `expected silence, got:\n${out}`);
  const log = fs.readFileSync(path.join(dir, 'arsenal-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(log.length, 1);
  assert.equal(log[0].q, 'a terminal window');
});

test('a caret/typing HTML edit with no recent search nudges with real top names', () => {
  const dir = scratchDir();
  const { status, out } = run({ tool_name: 'Edit', tool_input: { file_path: probeHtml(), new_string: CARET_HTML } }, dir);
  assert.equal(status, 2);
  assert.match(out, /^search first: make arsenal Q="[^"]+" -> .+/m);
  // codeTyping is the real registry answer for this exact fixture (arsenal.mjs's own ranking).
  assert.match(out, /codeTyping/);
});

test('the same edit is silent once a matching search already ran', () => {
  const dir = scratchDir();
  run({ tool_name: 'Bash', tool_input: { command: 'make arsenal Q="typing caret cursor"' } }, dir);
  const { status, out } = run({ tool_name: 'Edit', tool_input: { file_path: probeHtml(), new_string: CARET_HTML } }, dir);
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('an edit with no device words is silent', () => {
  const dir = scratchDir();
  const { status, out } = run(
    { tool_name: 'Edit', tool_input: { file_path: probeHtml(), new_string: 'plain content, nothing device-shaped here' } },
    dir,
  );
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('a storyboard mechanism line can trigger the nudge too', () => {
  const dir = scratchDir();
  const board = '## Beat one\nmechanism: a blinking caret types out each character\n';
  const { status } = run({ tool_name: 'Edit', tool_input: { file_path: probeBoard(), new_string: board } }, dir);
  assert.equal(status, 2);
});

test('the rate limit holds: a second nudge-worthy edit on the same file within the window is silent', () => {
  const dir = scratchDir();
  const first = run({ tool_name: 'Edit', tool_input: { file_path: probeHtml(), new_string: CARET_HTML } }, dir);
  assert.equal(first.status, 2);
  const second = run({ tool_name: 'Edit', tool_input: { file_path: probeHtml(), new_string: CARET_HTML } }, dir);
  assert.equal(second.status, 0, `expected the rate limit to keep this silent, got:\n${second.out}`);
});

test('a hand-typed cursor path (no snapTo) nudges toward hover-click', () => {
  const dir = scratchDir();
  const { status, out } = run({ tool_name: 'Edit', tool_input: { file_path: probeJson(), new_string: CURSOR_PATH_JSON } }, dir);
  assert.equal(status, 2, `expected a nudge, got:\n${out}`);
  assert.match(out, /hover-click/);
});

test('a cursor already using snapTo (or the hover-click recipe) is silent', () => {
  const dir = scratchDir();
  const { status, out } = run({ tool_name: 'Edit', tool_input: { file_path: probeJson(), new_string: CURSOR_SNAPTO_JSON } }, dir);
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('an ordinary composed layer with plain x/y fields is silent', () => {
  const dir = scratchDir();
  const { status, out } = run({ tool_name: 'Edit', tool_input: { file_path: probeJson(), new_string: ORDINARY_CARD_JSON } }, dir);
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});
