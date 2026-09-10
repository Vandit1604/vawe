// harness/author/assemble-use.test.mjs: the `use:` general door (harness/lib/contract.mjs), end to
// end through assemble.mjs. Its own file, not appended to assemble.test.mjs: that file's first fixture
// already fails independent of this change (PRESERVED_FILM_FIELDS never names `cameraMove`, only
// `camera`, a pre-existing mismatch measured on ac0d66df before this change touched anything), and an
// assert.throws early in a script aborts every assertion after it. This file runs on its own so a
// use: regression is never masked by an unrelated pre-existing failure.
//   node harness/author/assemble-use.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const node = process.execPath;
const assemble = (f) => execFileSync(node, [path.join(ROOT, 'harness/author/assemble.mjs'), f], { encoding: 'utf8' });

// `use:`, the general door onto the arsenal corpus: one line per SCOPE (per-layer, bg window, audio
// cue, scene-level), one ambiguous name, one dedicated-field refusal.
{
  const dir5 = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-test-use-'));
  const film5 = path.join(dir5, 'v.json');
  const sb5 = path.join(dir5, 'v.storyboard.md');
  fs.writeFileSync(path.join(dir5, 'v.scene1.html'), '<div>a</div>');
  fs.writeFileSync(path.join(dir5, 'v.scene2.html'), '<div>b</div>');

  const SB5 = (useLines) => `---
message: "test film"
audience: "ci"
arc: "hook -> payoff"
framework: "AIDA"
object: "none"
format: 1920x1080
theme: "themes/default.json"
duration: 6s
pace: "held, 3s/idea"
spectacle: "beat 2"
not: "no centred text default"
---

## Beat 1: Hook (0s-3s)
- type: hook
${useLines.map((l) => `- use: ${l}\n`).join('')}- onscreen: "hi"
- becomes: a
- why: open
- duration: 3s

## Beat 2: Payoff (3s-6s)
- type: benefit_highlight
- onscreen: "the payoff"
- becomes: b
- why: land
- duration: 3s
`;

  // per-layer prop (filter), bg window (background preset), audio cue (motion voice), scene-level (energy)
  fs.writeFileSync(film5, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
  fs.writeFileSync(sb5, SB5(['neon', 'plain', 'pluck', 'calm']));
  assemble(film5);
  const scene5 = JSON.parse(fs.readFileSync(film5, 'utf8'));
  assert.equal(scene5.layers.find((l) => l.id === 'scene1').filter, 'neon', 'a per-layer use: (look "neon") writes onto its own beat\'s layer');
  assert.ok(scene5.bg.some((w) => w.preset === 'plain' && w.from === 0), 'a bg-scoped use: (background preset "plain") pushes a window at the beat\'s own start');
  assert.ok(scene5.audio.cues.some((c) => c.name === 'pluck' && c.t === 0), 'an audio-scoped use: (motion voice "pluck") pushes a cue at the beat\'s own start');
  assert.equal(scene5.energy, 'calm', 'a scene-level use: (energy "calm") is written once, at the top level');

  // a two-way ambiguous name is refused, naming both kinds, never guessed
  fs.writeFileSync(film5, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
  fs.writeFileSync(sb5, SB5(['bloom']));
  assert.throws(() => assemble(film5), (e) => {
    const msg = e.stderr ? e.stderr.toString() : String(e);
    return /names more than one kind/.test(msg) && /glow preset:bloom/.test(msg);
  }, 'a name that exists in more than one kind is refused, listing every kind:name choice');

  // a kind with its own dedicated field is refused, naming the field, never silently accepted as a second spelling
  fs.writeFileSync(film5, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
  fs.writeFileSync(sb5, SB5(['push in']));
  assert.throws(() => assemble(film5), (e) => {
    const msg = e.stderr ? e.stderr.toString() : String(e);
    return /already has a dedicated field/.test(msg) && /camera:/.test(msg);
  }, 'a camera word is refused with the dedicated camera: field named, not built as a second mechanism');

  fs.rmSync(dir5, { recursive: true, force: true });
  console.log('✓ assemble-use.test.mjs: use: writes a per-layer prop, a bg window, an audio cue and a scene-level field by scope, and refuses an ambiguous or dedicated-field name');
}
