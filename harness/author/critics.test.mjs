// harness/author/critics.test.mjs: the DECIDERS=1 brief must carry the worktree agent contract
// (docs/CRAFT/SUBAGENTS.md) with a real base sha, not a copy that can drift from the doc.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoster, worktreeContract } from './critics.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Any small existing scene works; the roster only needs a readable JSON file.
const sceneFile = fs.readdirSync(path.join(repoRoot, 'formats/scene'))
  .find((f) => f.endsWith('.json') && fs.existsSync(path.join(repoRoot, 'formats/scene', f)));

test('worktreeContract reads a non-empty block from SUBAGENTS.md', () => {
  const contract = worktreeContract();
  assert.ok(contract && contract.length > 0);
  assert.match(contract, /Prove the base/);
  assert.match(contract, /Never write an `approved:` line/);
});

test('decider briefs carry the contract lines and a real sha', () => {
  assert.ok(sceneFile, 'need at least one formats/scene/*.json to build a roster against');
  const { roster, baseSha, contract } = buildRoster(`formats/scene/${sceneFile}`);
  assert.match(baseSha, /^[0-9a-f]{40}$/, 'base sha should be a real git sha, not a placeholder');
  assert.ok(contract);
  for (const d of roster) {
    assert.match(d.prompt, /Worktree agent contract/);
    assert.ok(d.prompt.includes(baseSha), `${d.name} brief should quote the base sha`);
    assert.match(d.prompt, /Prove the base/);
  }
});

// A design-stage fixture: one beat plans a fragment that does not exist yet, so stageOf lands on
// `design` (see harness/live/stage-say.test.mjs for the same trick), which is where motion.json's
// always-applying rules (state-the-canvas, svg-inline, video-scale, banned-defaults) fire.
//
// stageOf's own path resolution (quality/gates/stage.mjs filePaths) joins every base path onto the repo
// ROOT with `path.join`, which does not reset on an already-absolute segment, so a scene living purely
// under a tmpdir resolves to a nonsense nested path. The fixture has to live under formats/scene/ for
// stageOf to read it correctly, same as the other rule-brief fixtures; cleaned up in `after`.
test('a decider hears only its own role\'s rule categories, never another role\'s or every category at once', () => {
  const NAME = 'critics-rules-fixture';
  const base = path.join(repoRoot, 'formats/scene', NAME);
  const film = `${base}.json`;
  const sb = `${base}.storyboard.md`;
  after(() => { for (const f of [film, sb]) { try { fs.unlinkSync(f); } catch { /* already gone */ } } });
  fs.writeFileSync(film, JSON.stringify({ module: 'scene', theme: 'default', aspect: '16:9', duration: 9, layers: [] }));
  fs.writeFileSync(sb, `---
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
approved: "ci-fixture"
---

## Beat 1: Hook (0s-3s)
- type: hook
- object: not born yet
- object_in: bottom-left@120x40
- object_out: bottom-right@120x40
- motion: [data-part="headline"]@slide-left:energy
- fragment: formats/scene/${NAME}.hook.html
- onscreen: "the strong first line"
- mechanism: static headline
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
`);
  // buildRoster/stageOf join their argument onto ROOT with path.join, which does not reset on an
  // already-absolute segment, so the RELATIVE form is what they expect, same as every real caller
  // (`node harness/author/critics.mjs formats/scene/x.json`).
  const { roster } = buildRoster(`formats/scene/${NAME}.json`);
  const scene = roster.find((r) => r.name === 'scene');
  const motion = roster.find((r) => r.name === 'motion');
  const sound = roster.find((r) => r.name === 'sound');
  // `scene`'s categories (layout/imagery/typography/colour/content) hold no motion.json records yet,
  // so its brief carries no "Craft rules" block at all: proof it never fell back to every category.
  assert.doesNotMatch(scene.prompt, /Craft rules for this role/);
  assert.match(motion.prompt, /Craft rules for this role \(motion, camera\):/);
  assert.match(motion.prompt, /rule motion\./);
  assert.doesNotMatch(sound.prompt, /rule motion\./, 'sound must not see motion\'s rules');
});
