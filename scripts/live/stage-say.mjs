#!/usr/bin/env node
// scripts/live/stage-say.mjs: a UserPromptSubmit hook that says, every turn, which stage the film in
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
// THE FILM IN FLIGHT is the most recently modified storyboard in formats/scene/, within a day. Not a
// stored "current film": that is a second source of truth, free to disagree with the repo, and this
// whole design refuses those (see scripts/gates/stage.mjs, state is derived).
import fs from 'node:fs';
import path from 'node:path';
import { stageOf, ROOT } from '../gates/stage.mjs';

const DAY = 24 * 60 * 60 * 1000;
const dir = path.join(ROOT, 'formats/scene');
let best = null;
for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
  if (!f.endsWith('.storyboard.md')) continue;
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
console.log('  Do that stage, not the one after it. `make stage D=formats/scene/'
  + `${st.name}.json\` re-reads this from the files on disk.`);
