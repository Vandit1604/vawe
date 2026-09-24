// harness/lib/skill-stages.mjs: which skill serves THIS stage, read off the skills themselves.
//
// WHY THIS EXISTS. `make stage`/`make next` already name the one command a stage wants
// (quality/gates/stage.mjs). They did not name the one skill, so an agent that has not memorised
// AGENTS.md's skill router table authors a whole stage from habit instead of the doctrine that skill
// carries. A hand-kept second table (stage -> skill) would be exactly the kind of table this repo has
// been bitten by before (engine-doctrine/MISTAKES.md): it drifts the moment a skill is renamed, split,
// or reassigned, because nothing forces the two edits to happen together.
//
// So there is no second table. Each skills/*/SKILL.md names its OWN stage in a `stage:` frontmatter
// line (one of quality/gates/stage.mjs's STAGE_ORDER ids), and this module is the one place that reads
// it back. A skill with no `stage:` is cross-cutting on purpose (vawe-docs, vawe-launch, a vendored
// skill) and simply never surfaces here; that is not an error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE_ORDER } from '../../quality/gates/stage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKILLS_DIR = path.join(ROOT, 'skills');

function frontmatterField(text, key) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const line = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm').exec(m[1]);
  return line ? line[1].trim().replace(/^["']|["']$/g, '') : null;
}

/**
 * Every skills/<dir>/SKILL.md, as {name, stage, description, doc}. `stage` is null when the skill
 * declares none or declares one STAGE_ORDER does not know; `description` is the skill's own retrieval
 * text, the line Claude Code matches a request against.
 *
 * ONE FRONTMATTER READER. harness/author/arsenal.mjs searches skills by that description, and a second
 * parser for the same four lines is how the stage router and the search end up disagreeing about what
 * a skill says. The byte-0 anchor in frontmatterField is load-bearing for both.
 */
export function skillIndex() {
  const dirs = fs.existsSync(SKILLS_DIR)
    ? fs.readdirSync(SKILLS_DIR).filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
    : [];
  return dirs.map((dir) => {
    const rel = `skills/${dir}/SKILL.md`;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const stage = frontmatterField(text, 'stage');
    return {
      name: dir,
      stage: stage && STAGE_ORDER.includes(stage) ? stage : null,
      description: frontmatterField(text, 'description') || '',
      doc: rel,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Every skills/<dir>/SKILL.md that declares `stage:`, as {name, stage}. Skips a bad/missing stage. */
export function skillStageIndex() {
  return skillIndex().filter((s) => s.stage).map(({ name, stage }) => ({ name, stage }));
}

/** skillsForStage('direct') -> ['vawe-animation', 'vawe-camera', ...], sorted, [] when none claim it. */
export function skillsForStage(stage) {
  return skillStageIndex().filter((s) => s.stage === stage).map((s) => s.name);
}
