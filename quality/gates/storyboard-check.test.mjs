// quality/gates/storyboard-check.test.mjs: the film-vs-plan divergence check. Builds a real three-beat
// film with `assemble.mjs`, then asserts storyboard-check stays quiet on a clean build and NAMES the
// divergence once the storyboard or the built JSON is edited out from under it.
//   node quality/gates/storyboard-check.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-check-'));
const film = path.join(dir, 'v.json');
const sb = path.join(dir, 'v.storyboard.md');

const SB = (headlineKind) => `---
message: "test film"
audience: "ci"
arc: "hook -> build -> payoff"
framework: "AIDA"
object: "a rect that survives every cut"
object_t0: "bottom-left, small"
object_states: "bottom-right, then top-right"
object_last: "top-right, held"
format: 1920x1080
theme: "themes/default.json"
duration: 9s
pace: "held, 3s/idea"
spectacle: "beat 3, the payoff figure, a hero count-up, the one loud moment"
not: "no centred text default"
---

## Beat 1: Hook (0s-3s)
- type: hook
- object: not born yet
- object_in: bottom-left@120x40
- object_out: bottom-right@120x40
- motion: [data-part="headline"]@${headlineKind}:energy
- onscreen: "the strong first line"
- mechanism: ${headlineKind} headline
- becomes: the bare stage becomes a question
- why: open loop, pose the question the payoff answers
- duration: 3s

## Beat 2: Build (3s-6s)
- type: product_intro
- object: it arrives
- object_in: bottom-right@120x40
- object_out: top-right@120x40
- motion: .card@popIn:gravity
- onscreen: "what it is"
- mechanism: popIn card
- becomes: the question becomes a named thing
- why: name the thing
- duration: 3s

## Beat 3: Payoff (6s-9s)
- type: benefit_highlight
- object: held
- object_in: top-right@120x40
- object_out: top-right@120x40
- motion: .figure@fadeUp:cinematic
- onscreen: "the payoff figure"
- mechanism: hero count-up
- becomes: the named thing becomes the proven result
- why: land the result
- duration: 3s
`;

fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9' }));
fs.writeFileSync(sb, SB('slide-left'));
fs.writeFileSync(path.join(dir, 'v.scene1.html'), '<div><h1 data-part="headline">a</h1></div>');
fs.writeFileSync(path.join(dir, 'v.scene2.html'), '<div><div class="card">b</div></div>');
fs.writeFileSync(path.join(dir, 'v.scene3.html'), '<div><div class="figure">c</div></div>');

const node = process.execPath;
const run = (script, args) => execFileSync(node, [path.join(ROOT, script), ...args], { encoding: 'utf8' });
const check = () => {
  try { return { out: execFileSync(node, [path.join(ROOT, 'quality/gates/storyboard-check.mjs'), sb], { encoding: 'utf8' }), code: 0 }; }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), code: e.status }; }
};

run('harness/author/contract.mjs', [film]);
run('harness/author/assemble.mjs', [film]);

// ---- 1. a clean build: no divergence line -----------------------------------------------------
{
  const { out } = check();
  assert.doesNotMatch(out, /storyboard declares .* but the built scene/, 'a clean build reports no motion divergence');
  assert.doesNotMatch(out, /storyboard says the object/, 'a clean build reports no object divergence');
}

// ---- 2. break the storyboard: the built film still says slide-left, storyboard now says riseIn ----
{
  fs.writeFileSync(sb, SB('riseIn'));
  const { out } = check();
  assert.match(out, /beat "Hook": storyboard declares `\[data-part="headline"\]@riseIn` but the built scene's layer at 0s carries: \[data-part="headline"\]@slide-left/, 'the motion divergence names both the declared and the built kind');
  fs.writeFileSync(sb, SB('slide-left')); // restore
}

// ---- 3. break the built film's object track: the storyboard is unchanged and correct --------------
{
  const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
  const obj = scene.layers.find((l) => l.acrossBeats);
  obj.motion[1].x = 900; // storyboard says bottom-right (x=1670 offset); drift it
  fs.writeFileSync(film, JSON.stringify(scene, null, 1));
  const { out } = check();
  assert.match(out, /storyboard says the object leaves at bottom-right@120x40/, 'the object divergence names the storyboard\'s placement');
  assert.match(out, /but the built layer is at 965,975px/, 'and the built film\'s real px, so the fix is actionable from the message alone');
}

// ---- 4. break the built film's POSE (not its position): a size the storyboard promised got dropped --
{
  fs.writeFileSync(sb, SB('slide-left').replace('object_out: top-right@120x40\n- motion: .card@popIn:gravity', 'object_out: top-right@140x60/rot:8\n- motion: .card@popIn:gravity'));
  // beat 3 must now start at the same pose beat 2 ends at, or the chain itself breaks first
  const withBeat3 = fs.readFileSync(sb, 'utf8').replace('object_in: top-right@120x40\n- object_out: top-right@120x40', 'object_in: top-right@140x60/rot:8\n- object_out: top-right@140x60/rot:8');
  fs.writeFileSync(sb, withBeat3);
  run('harness/author/assemble.mjs', [film]); // rebuild with the OLD storyboard's pose (no rot/size) baked in... then drift the source and re-check without rebuilding
  const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
  const obj = scene.layers.find((l) => l.acrossBeats);
  // simulate a build that pre-dates the pose the storyboard NOW declares: strip w/h/rot back off the keys
  for (const k of obj.motion) { delete k.w; delete k.h; delete k.rot; }
  fs.writeFileSync(film, JSON.stringify(scene, null, 1));
  const { out } = check();
  assert.match(out, /storyboard says the object leaves sized 140x60/, 'a declared size the built key does not carry is named');
  assert.match(out, /storyboard says the object leaves rotated 8deg/, 'a declared rotation the built key does not carry is named');
  fs.writeFileSync(sb, SB('slide-left')); // restore
  run('harness/author/assemble.mjs', [film]);
}

// ---- 5. staging: a `trigger:` that names a real cause moves the next beat's start off a flat second --
{
  const causedSB = SB('slide-left').replace('## Beat 2: Build (3s-6s)\n- type: product_intro', '## Beat 2: Build (3s-6s)\n- type: product_intro\n- trigger: the headline finishes sliding into place');
  fs.writeFileSync(sb, causedSB);
  run('harness/author/assemble.mjs', [film]);
  const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
  const scene1 = scene.layers.find((l) => l.id === 'scene1');
  const scene2 = scene.layers.find((l) => l.id === 'scene2');
  // Resolved to a real second, not left as the string "scene1.end+0.05": quality/gates/beat-check and
  // harness/author/motion-director.mjs both read `layers[].start` as a number and mishandle a string
  // one (measured directly: one crashes), so `make assemble` resolves its own reference.
  assert.equal(typeof scene2.start, 'number', 'a caused junction is still a plain number, never an unresolved relative-start string');
  assert.equal(scene2.start, +(scene1.start + scene1.duration + 0.05).toFixed(3), 'a caused junction is staggered 0.05s AFTER the causing scene ends, real time inserted, nothing shrunk');
  const scene3 = scene.layers.find((l) => l.id === 'scene3');
  assert.equal(scene3.start, 6.05, 'beat 3\'s own junction is unstaged, but it still carries the ONE earlier stagger inserted before it (6s + 0.05s), not a second, independent clock');
  fs.writeFileSync(sb, SB('slide-left')); // restore
  run('harness/author/assemble.mjs', [film]);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ storyboard-check.test.mjs: a clean build is quiet, a broken motion plan, a broken object track, a dropped pose, and staging all behave');
