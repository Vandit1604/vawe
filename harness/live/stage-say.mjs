#!/usr/bin/env node
// harness/live/stage-say.mjs: a UserPromptSubmit hook that says, every turn, which stage the film in
// flight is at and the ONE next command.
//
// THIS IS THE CONTEXT-ROT FIX, and it is the half a gate cannot do. A gate refuses a wrong write; it
// cannot tell you the right one is available. The order was in AGENTS.md the whole time, read once at
// session start and then buried under a few hundred messages. Measured elsewhere and matching what
// happened here: reasoning quality degrades as input length grows, and for long-running agents the
// effect compounds with every step, so a rule read once is a rule that fails late in the work. Its
// stdout is injected as context, so the order is RE-STATED each turn instead of recalled.
//
// SILENT UNLESS A FILM IS IN FLIGHT, and one line when it speaks. A hook that talks every turn is a
// hook whose output stops being read, which would leave the rule exactly where it started.
//
// THE FILM IN FLIGHT is the most recently modified storyboard in films/scene/, within a day. Not a
// stored "current film": that is a second source of truth, free to disagree with the repo, and this
// whole design refuses those (see quality/gates/stage.mjs, state is derived).
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../../quality/gates/stage.mjs';
import { computeFeatures } from '../../quality/gates/craft-checklist.mjs';
import { rulesFor, briefLine, STAGE_CATEGORY_ORDER } from '../lib/craft-rules.mjs';
import { appendRun } from '../lib/runlog.mjs';

const DAY = 24 * 60 * 60 * 1000;
const dir = path.join(ROOT, 'films/scene');
let best = null;
for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
  if (!f.endsWith('.storyboard.md')) continue;
  // Same scratch convention roster() already applies (quality/gates/stage.mjs): a leading underscore
  // marks a throwaway rig fixture, never a film, so it must not be announced as one in flight.
  if (f.startsWith('_')) continue;
  const m = fs.statSync(path.join(dir, f)).mtimeMs;
  if (Date.now() - m > DAY) continue;
  if (!best || m > best.m) best = { m, film: f.slice(0, -'.storyboard.md'.length) };
}
if (!best) process.exit(0);

let st;
try { st = stageOf(best.film); } catch { process.exit(0); }
// Nothing to say about a film that is finished, and nothing to say twice: the gate speaks when a write
// is wrong, this speaks when a stage is open.
if (st.stage === 'judge') process.exit(0);

console.log(`vawe: ${st.name} is at stage ${st.stage.toUpperCase()} (${st.order.join(' → ')}).`);
console.log(`  ${st.why}`);
console.log(`  next: ${st.next}`);
// The skill(s) that stage wants, read off skills/*/SKILL.md's own `stage:` frontmatter
// (harness/lib/skill-stages.mjs), not a second hand-kept table.
if (st.skills.length) console.log(`  skill: ${st.skills.join(', ')}`);
console.log('  Do that stage, not the one after it. `make stage D=films/scene/'
  + `${st.name}.json\` re-reads this from the files on disk.`);

// Rule briefs for this film's own stage and features, but only ONCE per (film, stage): printed on
// every turn, these would be exactly the always-loaded context Update 1 (the anti-bloat policy in
// .claude/plans/craft-rules-into-harness.plan.md) argues against, on top of the stage line above,
// which already re-states every turn on purpose. A tiny state file remembers the last (film, stage)
// this hook spoke the briefs for; a repeat prompt in the same stage stays silent, and moving to a new
// stage (or a new film) speaks again. `make next` (quality/gates/next.mjs) is a deliberate, one-shot
// command an author runs on purpose, so it always prints its briefs; only this every-turn hook rations.
const RULES_STATE = path.join(ROOT, '.vawe-data/stage-say-rules-state.json');
function alreadySpoke(film, stage) {
  try {
    const s = JSON.parse(fs.readFileSync(RULES_STATE, 'utf8'));
    return s.film === film && s.stage === stage;
  } catch { return false; }
}
function markSpoke(film, stage) {
  try {
    fs.mkdirSync(path.dirname(RULES_STATE), { recursive: true });
    fs.writeFileSync(RULES_STATE, JSON.stringify({ film, stage }));
  } catch { /* best effort: a state-file write failure only costs a repeated brief, never a crash */ }
}

// Never let a bad/missing rules file break the hook: this line is a nudge, not a gate, and a hook that
// can crash the prompt is worse than one that silently says nothing this one time.
try {
  if (!alreadySpoke(best.film, st.stage)) {
    const scene = fs.existsSync(st.scene) ? JSON.parse(fs.readFileSync(st.scene, 'utf8')) : null;
    const sbText = fs.existsSync(st.sb) ? fs.readFileSync(st.sb, 'utf8') : null;
    const features = computeFeatures(scene, sbText);
    // A stage AGENTS.md gives an order for (direct: motion/transitions/sound, etc.) prints by that
    // order, 2 lines and 320 chars per category, so motion cannot crowd out transitions and sound at
    // the same stage. A stage with no named order keeps the old flat cap/budget.
    const order = STAGE_CATEGORY_ORDER[st.stage];
    const { rules, dropped } = order
      ? rulesFor({ stage: st.stage, features, categories: order, capPerCategory: 2, maxCharsPerCategory: 320, withReceipt: true })
      : rulesFor({ stage: st.stage, features, withReceipt: true });
    for (const r of rules) console.log(`  ${briefLine(r)}`);
    markSpoke(best.film, st.stage);
    // The receipt: what the author was actually shown vs. what existed and was not (and why). Logged
    // once per (film, stage) transition, the same gate as markSpoke above, not once per turn: this hook
    // fires on every keystroke and `runlog.mjs` wants one line per fact, not one per prompt.
    try {
      appendRun(best.film, {
        cmd: 'stage-say',
        knowledge: { stage: st.stage, shown: rules.map((r) => r.id), dropped },
      });
    } catch { /* the receipt is a nudge too; never let a log failure touch the printed briefs above */ }
  }
} catch { /* rule briefs are a nudge; a broken loader must never break this hook */ }
