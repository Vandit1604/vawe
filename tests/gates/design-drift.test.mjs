// node --test quality/gates/design-drift.test.mjs
//
// A hermetic fixture pair per test (a film json + its storyboard + one fragment, under a tmp
// "fixtures" folder), the same shape frame-check.test.mjs uses for the same D=<film> contract: this
// gate reads a real storyboard for its fragment list and a real film json for its theme, so a fixture
// under our own control proves the LOGIC rather than one film's current state.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const GATE = path.join(here, '../../quality/gates/design-drift.mjs');
const run = (args) => spawnSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });

const FRONT = `---
message: "test"
audience: "test"
arc: "hook"
framework: "FAB"
format: 1920x1080
theme: "themes/default.json"
duration: 3s
pace: "held"
spectacle: "beat 1 · the only beat · nothing else · it is the whole film"
not: "no second beat"
---
`;

function writeFixture({ name, fragmentHtml, designMd }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-drift-fixtures-'));
  const fragFile = path.join(dir, `${name}.frag.html`);
  fs.writeFileSync(fragFile, fragmentHtml);
  const jsonPath = path.join(dir, `${name}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ module: 'scene', aspect: '16:9', duration: 3, theme: 'default', layers: [] }, null, 2));
  const sbPath = path.join(dir, `${name}.storyboard.md`);
  fs.writeFileSync(sbPath, FRONT + `
## Beat 1: One (0s-3s)
- type: hook
- fragment: ${fragFile}
- onscreen: "hello"
- why: the only beat
- duration: 3s
`);
  if (designMd != null) fs.writeFileSync(jsonPath.replace(/\.json$/, '.design.md'), designMd);
  return jsonPath;
}

test('an undeclared size fires design-drift', () => {
  const json = writeFixture({
    name: 'undeclared-size',
    fragmentHtml: '<p style="font-size:53px;font-family:Anybody;color:#0f1620">Hi</p>',
    designMd: '---\ntype:\n  unrelated:\n    size: 20\n---\nnothing here declares 53.\n',
  });
  const r = run([json]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /\[design-drift\].*53px/);
});

test('the same size, once declared in design.md, is quiet', () => {
  const json = writeFixture({
    name: 'declared-size',
    fragmentHtml: '<p style="font-size:53px;font-family:Anybody;color:#0f1620">Hi</p>',
    designMd: '---\ntype:\n  custom:\n    size: 53\n---\n53 is this film\'s own size.\n',
  });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /\[design-drift\]/);
});

test('a value near a declared token hints instead of blocking', () => {
  const json = writeFixture({
    name: 'near-size',
    fragmentHtml: '<p style="font-size:54px;font-family:Anybody;color:#0f1620">Hi</p>', // 1px from the declared 53
    designMd: '---\ntype:\n  custom:\n    size: 53\n---\n53 is declared; 54 should only hint.\n',
  });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[design-token-hint\].*54px/);
});

test('a film with no design.md is silent: no browser launched, exit 0', () => {
  const json = writeFixture({
    name: 'no-design-md',
    fragmentHtml: '<p style="font-size:900px;color:#ff00ff">way off</p>',
    designMd: null,
  });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /\[design-drift\]/);
  assert.doesNotMatch(r.stdout, /\[design-token-hint\]/);
});

test('an <img> box is ignored, even wildly off every declared value', () => {
  const json = writeFixture({
    name: 'image-ignored',
    fragmentHtml: '<img src="/core/tokens.css" style="width:100px;height:100px;border-radius:99px;background:#ff00ff" />',
    designMd: '---\npalette:\n  ink: "#0a0a0a"\n---\nonly one colour declared.\n',
  });
  const r = run([json]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /\[design-drift\]/);
});

console.log('design-drift.test.mjs: see node --test output above for pass/fail');
