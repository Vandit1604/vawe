// node --test tests/gates/skill-split.test.mjs
//
// Proves the "lighter skills" shape (a small SKILL.md core + reference/*.md files it names) actually
// clears the two gates that check a skill at all: skill-check (frontmatter + size contract, on the
// CORE body only, reference files are not counted) and skill-reach (something routes to the skill).
// The fixture is a minimal version of what vawe-scene-authoring/vawe-camera/etc. now look like.
//
// The second half checks the real repo: every reference/*.md a real vawe-* SKILL.md links to must
// exist on disk (a dangling link is worse than no split at all, an author opens a 404), and none of
// the five skills this task split stayed over the word-count contract.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as skillCheck } from '../../quality/gates/skill-check.mjs';
import { run as skillReach } from '../../quality/gates/skill-reach.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/skill-split');

test('a core-plus-reference skill passes the frontmatter/size contract', () => {
  const { failing } = skillCheck({ root: FIXTURE });
  assert.deepEqual(failing, [], 'core-and-ref must not fail skill-check');
});

test('a core-plus-reference skill named from AGENTS.md is not reported unrouted', () => {
  const { unrouted } = skillReach({ root: FIXTURE });
  assert.deepEqual(unrouted, [], 'core-and-ref is routed from AGENTS.md');
});

test('a reference file the fixture core names actually exists', () => {
  const core = fs.readFileSync(path.join(FIXTURE, 'skills/core-and-ref/SKILL.md'), 'utf8');
  const refs = [...core.matchAll(/`(reference\/[\w.-]+\.md)`/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, 'fixture core must name at least one reference file');
  for (const rel of refs) {
    assert.ok(fs.existsSync(path.join(FIXTURE, 'skills/core-and-ref', rel)), `${rel} must exist`);
  }
});

const SPLIT_SKILLS = ['vawe-scene-authoring', 'vawe-review-loop', 'vawe-camera', 'vawe-name-the-effect', 'vawe-continuous-action'];

test('every skill this task split stays under the 1000-word core the task set', () => {
  for (const dir of SPLIT_SKILLS) {
    const text = fs.readFileSync(path.join(ROOT, 'skills', dir, 'SKILL.md'), 'utf8');
    const body = text.split('---').slice(2).join('---');
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    assert.ok(words < 1000, `${dir}/SKILL.md core is ${words} words, still over 1000`);
  }
});

test('every reference/*.md a split skill\'s core links to exists on disk', () => {
  for (const dir of SPLIT_SKILLS) {
    const skillDir = path.join(ROOT, 'skills', dir);
    const core = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const refs = [...core.matchAll(/`(reference\/[\w.-]+\.md)`/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, `${dir}/SKILL.md names no reference/*.md file`);
    for (const rel of refs) {
      assert.ok(fs.existsSync(path.join(skillDir, rel)), `${dir}/${rel} is linked but missing`);
    }
  }
});

test('engine-doctrine/CRAFT/FROM-GSAP.md exists with 10-15 GSAP-to-vawe pairs', () => {
  const text = fs.readFileSync(path.join(ROOT, 'engine-doctrine/CRAFT/FROM-GSAP.md'), 'utf8');
  const pairs = [...text.matchAll(/^## \d+\./gm)];
  assert.ok(pairs.length >= 10 && pairs.length <= 15, `expected 10-15 numbered pairs, found ${pairs.length}`);
});

test('vawe-scene-authoring core links to FROM-GSAP.md', () => {
  const core = fs.readFileSync(path.join(ROOT, 'skills/vawe-scene-authoring/SKILL.md'), 'utf8');
  assert.ok(core.includes('FROM-GSAP.md'), 'core skill must point authors at the GSAP translation doc');
});
