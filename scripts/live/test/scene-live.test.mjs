// scene-live.test.mjs: the suggestion half of the bg finding. The finding itself is prose measured
// from the library and changes when the library does; what must hold is that the three names it offers
// are real presets, are ones the film does not already use, and do not churn between two saves of the
// same file. A suggestion that moves every save is noise an author learns to skip.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const HOOK = path.join(ROOT, 'scripts/live/scene-live.mjs');

const PRESET_NAMES = new Set(
  [...fs.readFileSync(path.join(ROOT, 'core/backgrounds/presets.js'), 'utf8')
    .matchAll(/\{\s*name:\s*'([^']+)',\s*blurb:/g)].map((m) => m[1]),
);

function run(scene, name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-live-'));
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(scene));
  // The hook only speaks about files under formats/scene/, so hand it a path there. It reads the file
  // off disk, so the temp copy is what it actually parses.
  const target = path.join(ROOT, 'formats/scene', `${name}.json`);
  fs.copyFileSync(file, target);
  try {
    execFileSync('node', [HOOK], { input: JSON.stringify({ tool_input: { file_path: target } }), stdio: ['pipe', 'pipe', 'pipe'] });
    return '';                                   // exit 0: the hook found nothing to say
  } catch (e) {
    return String(e.stderr || '');
  } finally {
    fs.rmSync(target, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const film = (bg) => ({
  module: 'scene', theme: 'vawe', duration: 6, bg,
  layers: Array.from({ length: 4 }, (_, i) => ({ type: 'text', text: `line ${i}`, start: i })),
});

function named(out) {
  const i = out.indexOf('Three of them:');
  if (i < 0) return [];
  return out.slice(i).split('\n').slice(1, 4).map((l) => l.trim().split(/\s+/)[0]).filter(Boolean);
}

// One window: the film gets the finding, and three real presets it is not already using.
const one = run(film([{ preset: 'paper' }]), '_t-scene-live-one');
const picks = named(one);
assert.equal(picks.length, 3, `expected three suggestions, got ${picks.length} in:\n${one}`);
for (const p of picks) {
  assert.ok(PRESET_NAMES.has(p), `"${p}" is not a real preset`);
  assert.notEqual(p, 'paper', 'suggested the preset the film already uses');
}

// Stable across saves: an author who saves twice must not be handed a different three.
assert.deepEqual(named(run(film([{ preset: 'paper' }]), '_t-scene-live-one')), picks,
  'the same film produced different suggestions on a second save');

// A film that already turns its background gets no bg finding at all, so no suggestions either.
const many = run(film([{ preset: 'paper', to: 2 }, { preset: 'ink', from: 2, to: 4 }, { preset: 'aurora', from: 4 }]),
  '_t-scene-live-many');
assert.ok(!many.includes('bg window for the whole runtime'),
  `a film with three windows should not be told it has one:\n${many}`);

console.log('✓ scene-live.test.mjs: the bg finding names three real unused presets, stable per film');
