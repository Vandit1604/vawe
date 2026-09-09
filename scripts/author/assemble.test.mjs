// scripts/author/assemble.test.mjs: assemble owns what it GENERATES (html layers by `id: scene<N>`,
// the one continuous-object layer by `id: object`) and nothing else. A hand-authored layer or
// film-level field it has no vocabulary for survives a re-assemble byte-identically, is REPORTED by
// name, and is WARNED about once its time window no longer lands inside the film.
//   node scripts/author/assemble.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-test-'));
const film = path.join(dir, 'v.json');
const sb = path.join(dir, 'v.storyboard.md');

const SB = (beat3) => `---
message: "test film"
audience: "ci"
arc: "hook -> build -> payoff"
framework: "AIDA"
object: "none"
format: 1920x1080
theme: "themes/default.json"
duration: 9s
pace: "held, 3s/idea"
spectacle: "beat 3"
not: "no centred text default"
---

## Beat 1: Hook (0s-3s)
- type: hook
- object: not born yet
- onscreen: "hi"
- mechanism: none
- becomes: a
- why: open
- duration: 3s

## Beat 2: Build (3s-6s)
- type: product_intro
- object: it arrives
- onscreen: "what"
- mechanism: none
- becomes: b
- why: name
- duration: 3s
${beat3 ? `
## Beat 3: Payoff (6s-9s)
- type: benefit_highlight
- object: held
- onscreen: "the payoff"
- mechanism: none
- becomes: c
- why: land
- duration: 3s
` : ''}`;

fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
fs.writeFileSync(sb, SB(true));
fs.writeFileSync(path.join(dir, 'v.scene1.html'), '<div>a</div>');
fs.writeFileSync(path.join(dir, 'v.scene2.html'), '<div>b</div>');
fs.writeFileSync(path.join(dir, 'v.scene3.html'), '<div>c</div>');

const node = process.execPath;
const assemble = () => execFileSync(node, [path.join(ROOT, 'scripts/author/assemble.mjs'), film], { encoding: 'utf8' });

try {
  // ---- 1. a first build: every html layer stamped id: scene<N>, nothing to preserve --------------
  {
    const out = assemble();
    assert.match(out, /no hand-authored layers to preserve/, 'a fresh build has nothing to own but its own layers');
    const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
    assert.deepEqual(scene.layers.map((l) => l.id), ['scene1', 'scene2', 'scene3'], 'every generated html layer is stamped id: scene<N>');
  }

  // ---- 2. hand-add a layer and a film-level field assemble cannot derive --------------------------
  {
    const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
    scene.layers.push({ id: 'handAdded', type: 'count', to: 40, start: 6, duration: 3, track: 3, x: 0, y: 0, w: 200, h: 100 });
    scene.cameraMove = { move: 'slowPush' };
    fs.writeFileSync(film, JSON.stringify(scene, null, 1) + '\n');
  }

  // ---- 3. TWICE IN A ROW: both the hand-added layer and cameraMove survive BYTE-IDENTICALLY --------
  const out2 = assemble();
  assert.match(out2, /preserved film-level field\(s\): cameraMove/, 'the report names the preserved film-level field');
  assert.match(out2, /preserved 1 hand-authored layer\(s\).*handAdded/, 'the report names the preserved layer by id');
  const afterRun1 = fs.readFileSync(film, 'utf8');

  const out3 = assemble();
  const afterRun2 = fs.readFileSync(film, 'utf8');
  assert.equal(afterRun2, afterRun1, 'a second assemble with nothing changed reproduces the file BYTE-IDENTICALLY');
  assert.doesNotMatch(out3, /STALE/, 'nothing has gone stale yet: the hand-added layer still lands inside the film');

  const scene2 = JSON.parse(afterRun2);
  assert.deepEqual(scene2.cameraMove, { move: 'slowPush' }, 'cameraMove round-trips exactly');
  assert.ok(scene2.layers.find((l) => l.id === 'handAdded'), 'the hand-added layer is still in layers[]');

  // ---- 4. delete beat 3: the now-stale preserved layer is NAMED, not silently carried -------------
  fs.writeFileSync(sb, SB(false));
  const out4 = assemble();
  assert.match(out4, /STALE/, 'a beat deletion that strands a preserved layer is reported');
  assert.match(out4, /"handAdded" spans 6s.*9s, outside the new film \(0s.*6s\)/, 'the stale warning names the layer and its now-out-of-bounds window');
  assert.match(out4, /"scene3" spans/, 'the orphaned scene3 fragment (its beat is gone, its id no longer owned) is also named as stale');

  const scene3 = JSON.parse(fs.readFileSync(film, 'utf8'));
  assert.equal(scene3.duration, 6, 'the film shrank to the two remaining beats');
  assert.ok(scene3.layers.find((l) => l.id === 'handAdded'), 'the stale layer is still PRESERVED, not dropped: naming beats silent loss');
  assert.ok(scene3.layers.find((l) => l.id === 'scene3'), 'the orphaned fragment layer is preserved too, for the same reason');

  console.log('✓ assemble.test.mjs: html/object layers are owned by id, a hand-authored layer and cameraMove survive a byte-identical round trip, and a beat deletion names the layer it strands');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---- (b) object: <name> -> <source> draws the source's own layer type, not the placeholder rect ----
{
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-test-object-'));
  const film2 = path.join(dir2, 'v.json');
  const sb2 = path.join(dir2, 'v.storyboard.md');
  fs.writeFileSync(film2, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
  fs.writeFileSync(path.join(dir2, 'v.objsrc.html'), '<div>bar</div>');
  fs.writeFileSync(path.join(dir2, 'v.scene1.html'), '<div>a</div>');
  fs.writeFileSync(path.join(dir2, 'v.scene2.html'), '<div>b</div>');
  const objSrcAbs = path.join(dir2, 'v.objsrc.html');
  fs.writeFileSync(sb2, `---
message: "test film"
audience: "ci"
arc: "hook -> payoff"
framework: "AIDA"
object: "the input bar -> ${objSrcAbs}"
format: 1920x1080
theme: "themes/default.json"
duration: 6s
pace: "held, 3s/idea"
spectacle: "beat 2"
not: "no centred text default"
---

## Beat 1: Hook (0s-3s)
- type: hook
- object_in: center@100x40
- object_out: center@100x40
- onscreen: "hi"
- becomes: a
- why: open
- duration: 3s

## Beat 2: Payoff (3s-6s)
- type: benefit_highlight
- object_in: center@100x40
- object_out: center@100x40
- onscreen: "the payoff"
- becomes: b
- why: land
- duration: 3s
`);
  execFileSync(node, [path.join(ROOT, 'scripts/author/assemble.mjs'), film2], { encoding: 'utf8' });
  const scene = JSON.parse(fs.readFileSync(film2, 'utf8'));
  const obj = scene.layers.find((l) => l.id === 'object');
  assert.equal(obj.type, 'html', 'a declared .html object source draws as an html layer, not a rect');
  assert.equal(obj.src, path.relative(ROOT, objSrcAbs), 'src is the repo-relative path to the declared source');
  assert.equal(obj.fill, undefined, 'the rect-only `fill` prop does not survive onto the real layer type');
  fs.rmSync(dir2, { recursive: true, force: true });
  console.log('✓ assemble.test.mjs: a declared object: source draws as its own layer type');
}

// ---- (c) two consecutive beats naming the same fragment: merge into ONE layer, not two -------------
{
  const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-test-shared-'));
  const film3 = path.join(dir3, 'v.json');
  const sb3 = path.join(dir3, 'v.storyboard.md');
  fs.writeFileSync(film3, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
  fs.writeFileSync(path.join(dir3, 'shared.html'), '<div>card</div>');
  fs.writeFileSync(sb3, `---
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
- fragment: shared.html
- onscreen: "hi"
- becomes: a
- why: open
- duration: 3s

## Beat 2: Payoff (3s-6s)
- type: benefit_highlight
- fragment: shared.html
- onscreen: "the payoff"
- becomes: b
- why: land
- duration: 3s
`);
  execFileSync(node, [path.join(ROOT, 'scripts/author/assemble.mjs'), film3], { encoding: 'utf8' });
  const scene = JSON.parse(fs.readFileSync(film3, 'utf8'));
  assert.deepEqual(scene.layers.map((l) => l.id), ['scene1'], 'two beats sharing one fragment file assemble into ONE layer, never two');
  const layer = scene.layers[0];
  assert.equal(layer.duration, 6, 'the merged layer spans both beats, start to the last beat\'s end');
  assert.equal(layer.acrossBeats, true, 'a layer spanning more than its own beat must opt out of the per-beat unit wrapper');
  fs.rmSync(dir3, { recursive: true, force: true });
  console.log('✓ assemble.test.mjs: two consecutive beats sharing a fragment: file merge into one layer');
}
