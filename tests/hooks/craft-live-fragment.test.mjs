// node --test tests/hooks/craft-live-fragment.test.mjs
//
// The fragment branch of harness/live/craft-live.mjs, fed exactly as Claude Code's PostToolUse feeds
// it (stdin JSON, stderr on exit 2). Fixtures below use the REAL, current STAGEKIT block (buildKit(),
// the same generator `make stagekit` runs) rather than a hand-copied snapshot, so a change to the kit
// itself cannot leave this test proving something the kit no longer looks like.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';
import { buildKit } from '../../harness/lib/stagekit.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const HOOK = join(here, '../../harness/live', 'craft-live.mjs');

const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/vawe.json'), 'utf8'));
const { block: KIT_BLOCK } = buildKit(theme, resolveLook, isLightBg);

const run = (abs) => {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: abs } }), encoding: 'utf8',
    env: { ...process.env, VAWE_HOOK_FULL: '1' },   // assert against the full text, not the summary
  });
  return { status: r.status, out: r.stderr };
};

const writeFragment = (body) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-live-fragment-test-'));
  const abs = path.join(dir, '_fixture.frame.html');
  fs.writeFileSync(abs, body);
  return abs;
};

test('a fragment built only from kit classes, no hand-written shadow, is silent', () => {
  const abs = writeFragment(`<style>${KIT_BLOCK}</style>\n<div class="kit-root"><div class="kit-stage"><div class="kit-card">hi</div></div></div>\n`);
  const { status, out } = run(abs);
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('the pasted stage kit is never counted as the author\'s own CSS', () => {
  // The regression that made this test worth writing: seven fragments pasted the kit WITHOUT its
  // STAGEKIT markers, extractKitBlock returned null, and .kit-card's own box-shadow was reported as
  // two hand-written shadows on a fragment that has none (engine-doctrine/MISTAKES.md #594).
  const body = `<style>${KIT_BLOCK}</style>\n<div class="kit-root"><div class="kit-stage"><div class="kit-card">hi</div></div></div>\n`;
  assert.match(body, /STAGEKIT:start/, 'the fragment must carry the kit block with its markers');
  const abs = writeFragment(body);
  assert.equal(run(abs).status, 0);
});
