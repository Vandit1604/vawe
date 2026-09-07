// scripts/gates/storyboard-check.test.mjs: the film-vs-plan divergence check. Builds a real three-beat
// film with `assemble.mjs`, then asserts storyboard-check stays quiet on a clean build and NAMES the
// divergence once the storyboard or the built JSON is edited out from under it.
//   node scripts/gates/storyboard-check.test.mjs
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
  try { return { out: execFileSync(node, [path.join(ROOT, 'scripts/gates/storyboard-check.mjs'), sb], { encoding: 'utf8' }), code: 0 }; }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), code: e.status }; }
};

run('scripts/author/contract.mjs', [film]);
run('scripts/author/assemble.mjs', [film]);

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

fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ storyboard-check.test.mjs: a clean build is quiet, a broken motion plan and a broken object track are both named');
