// harness/lib/skill-stages.test.mjs: house-rule self-check, no framework.
//   node harness/lib/skill-stages.test.mjs
import { skillStageIndex, skillsForStage } from './skill-stages.mjs';
import { STAGE_ORDER } from '../../quality/gates/stage.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const index = skillStageIndex();

// (a) At least one skill actually tagged: this catches a rename of `stage:` breaking every reader.
assert(index.length > 0, 'no skill declares a `stage:` at all, the frontmatter key may have moved');

// (b) Every stage this module hands back is one stage.mjs actually knows about, never a typo'd id
// silently accepted.
for (const { name, stage } of index) {
  assert(STAGE_ORDER.includes(stage), `${name}: "${stage}" is not one of ${STAGE_ORDER.join(', ')}`);
}

// (c) The known anchor: vawe-scene-authoring is assemble's skill, AGENTS.md's "first move, every
// time". If this breaks, either the skill's `stage:` line moved or the reader did.
assert(skillsForStage('assemble').includes('vawe-scene-authoring'),
  'vawe-scene-authoring should be tagged stage: assemble');

// (d) A stage nothing claims comes back empty, never throws.
assert(Array.isArray(skillsForStage('approval')), 'skillsForStage must return an array even for an unclaimed stage');

console.log(`skill-stages: ${index.length} skill(s) tagged, all pass. OK`);
