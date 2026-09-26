#!/usr/bin/env node
// quality/gates/next.mjs: RUN THE ONE COMMAND THE STAGE NAMES. Nothing more.
//
//   make next D=films/scene/<film>.json   ·   node quality/gates/next.mjs <film>
//
// quality/gates/stage.mjs already knows which stage a film is in and stores the ONE command that moves
// it forward. Knowing that command is not running it: an agent still has to read it, notice it is a
// `make` invocation, and type it. This closes that gap and stops there.
//
// ONE COMMAND, NEVER A CHAIN. A `next` string sometimes carries a trailing note in parens, or a second
// step joined with ", then " (engine-doctrine/MISTAKES.md #591 is what happens when a whole ladder gets read as
// one instruction). Chaining here would make the same mistake in code: run the first command, stop, and
// let the NEXT invocation re-derive from disk. A step that did not really land then does not silently
// advance past.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { stageOf, ROOT } from './stage.mjs';
import { computeFeatures } from './craft-checklist.mjs';
import { rulesFor, briefLine } from '../../harness/lib/craft-rules.mjs';

/** Rule briefs for this film's stage/features. Never breaks the caller: a nudge, not a gate. */
function printRuleBriefs(st) {
  try {
    const scene = fs.existsSync(st.scene) ? JSON.parse(fs.readFileSync(st.scene, 'utf8')) : null;
    const sbText = fs.existsSync(st.sb) ? fs.readFileSync(st.sb, 'utf8') : null;
    const features = computeFeatures(scene, sbText);
    for (const r of rulesFor({ stage: st.stage, features })) console.log(`  ${briefLine(r)}`);
  } catch { /* rule briefs are a nudge; a broken loader must never break `make next` */ }
}

/** Strip a trailing parenthetical note or a chained second command, keep the one runnable command. */
export function firstCommand(next) {
  return next.split(/,\s*then\s+/i)[0].split(/\s{3,}\(/)[0].trim();
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make next D=films/scene/<film>.json'); process.exit(2); }

  const st = stageOf(arg);
  const cmd = firstCommand(st.next);
  console.log(`\n  ${st.name} is at ${st.stage.toUpperCase()}. Running:\n  ${cmd}\n`);
  if (st.skills.length) console.log(`  skill: ${st.skills.join(', ')}\n`);
  if (st.craftDocs.length) console.log(`  read: ${st.craftDocs.join(', ')}\n`);
  printRuleBriefs(st);
  const [bin, ...args] = cmd.split(/\s+/);
  const res = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
