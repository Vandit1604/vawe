// node --test quality/gates/frame-check.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = join(here, 'frame-check.mjs');
const run = (args) => spawnSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8' });

// A hermetic fixture pair, written fresh per test rather than borrowed off a real film: the two checks
// below read the storyboard's `object:`/`threads:` promise against the assembled JSON, and a fixture
// under our own control is what proves the LOGIC rather than one film's current state.
function writeFixture({ name, storyboard, layers }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-check-test-'));
  const sbPath = path.join(dir, `${name}.storyboard.md`);
  const jsonPath = path.join(dir, `${name}.json`);
  fs.writeFileSync(sbPath, storyboard);
  fs.writeFileSync(jsonPath, JSON.stringify({ module: 'scene', aspect: '16:9', duration: 5, layers }, null, 2));
  return jsonPath;
}

const FRONT = (object) => `---
message: "test"
audience: "test"
arc: "hook"
framework: "FAB"
${object ? `object: "${object}"\n` : ''}format: 1920x1080
theme: "themes/vawe-film.json"
duration: 5s
pace: "held"
spectacle: "beat 1 · the only beat · nothing else · it is the whole film"
not: "no second beat"
---
`;

const fullBleedLayer = (id, start) => ({ id, type: 'html', src: 'x.html', start, duration: 2.5, track: 1, x: 0, y: 0, w: 1920, h: 1080 });

test('a promised object that no beat locates and the assembly never built: both findings fire', () => {
  const storyboard = FRONT('a lens') + `
## Beat 1: One (0s-2.5s)
- type: hook
- onscreen: "hello"
- why: opens the film
- duration: 2.5s

## Beat 2: Two (2.5s-5s)
- type: cta
- onscreen: "bye"
- why: closes the film
- duration: 2.5s
`;
  const json = writeFixture({ name: 'unbuilt-object', storyboard, layers: [fullBleedLayer('s1', 0), fullBleedLayer('s2', 2.5)] });
  const r = run([json]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /\[?object-is-placeholder\]?|no beat ever locates it/);
  assert.match(r.stdout, /frame-as-surface|every beat swaps the/);
});

test('the object placed as a literal rect, fill var(--accent): object-is-placeholder fires, frame-as-surface does not', () => {
  const storyboard = FRONT('a lens') + `
## Beat 1: One (0s-2.5s)
- type: hook
- onscreen: "hello"
- why: opens the film
- duration: 2.5s

## Beat 2: Two (2.5s-5s)
- type: cta
- onscreen: "bye"
- why: closes the film
- duration: 2.5s
`;
  const objectLayer = { id: 'object', type: 'rect', track: 5, x: 100, y: 100, w: 200, h: 200, fill: 'var(--accent)', radius: 4, start: 0, duration: 5 };
  const json = writeFixture({ name: 'placeholder-object', storyboard, layers: [fullBleedLayer('s1', 0), fullBleedLayer('s2', 2.5), objectLayer] });
  const r = run([json]);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /no beat ever locates it/);
  assert.doesNotMatch(r.stdout, /frame-as-surface/);
});

test('the object located per beat, narrative-only: neither finding fires even though every layer is full-bleed', () => {
  const storyboard = FRONT('a lens') + `
## Beat 1: One (0s-2.5s)
- type: hook
- onscreen: "hello"
- object: the lens, at rest
- why: opens the film
- duration: 2.5s

## Beat 2: Two (2.5s-5s)
- type: cta
- onscreen: "bye"
- object: the lens, settled
- why: closes the film
- duration: 2.5s
`;
  const json = writeFixture({ name: 'narrative-object', storyboard, layers: [fullBleedLayer('s1', 0), fullBleedLayer('s2', 2.5)] });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout);
});

test('no object promised at all: an all full-bleed, multi-beat film is not flagged', () => {
  const storyboard = FRONT(null) + `
## Beat 1: One (0s-2.5s)
- type: hook
- onscreen: "hello"
- why: opens the film
- duration: 2.5s

## Beat 2: Two (2.5s-5s)
- type: cta
- onscreen: "bye"
- why: closes the film
- duration: 2.5s
`;
  const json = writeFixture({ name: 'no-object', storyboard, layers: [fullBleedLayer('s1', 0), fullBleedLayer('s2', 2.5)] });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout);
});

test('a one-beat film with no continuous object: neither finding fires', () => {
  const storyboard = FRONT(null) + `
## Beat 1: Only (0s-5s)
- type: hook
- onscreen: "hello"
- why: it is the only beat
- duration: 5s
`;
  const json = writeFixture({ name: 'one-beat', storyboard, layers: [fullBleedLayer('s1', 0)] });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout);
});

test('a beat built from layers (`fragment: none, ...`) is not reported as a missing file', () => {
  const storyboard = FRONT(null) + `
## Beat 1: Card (0s-5s)
- type: hook
- onscreen: "hello"
- why: opens the film
- duration: 5s
- fragment: none, an image + text layer pair (card-bg, card-text)
`;
  const json = writeFixture({ name: 'fragment-none', storyboard, layers: [fullBleedLayer('s1', 0)] });
  const r = run([json]);
  assert.doesNotMatch(r.stdout + r.stderr, /names none/, r.stdout);
  assert.doesNotMatch(r.stdout + r.stderr, /fragment-missing|no such file exists/, r.stdout);
});
