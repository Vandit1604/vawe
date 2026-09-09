#!/usr/bin/env node
// quality/gates/next.mjs: RUN THE ONE COMMAND THE STAGE NAMES. Nothing more.
//
//   make next D=formats/scene/<film>.json   ·   node quality/gates/next.mjs <film>
//
// quality/gates/stage.mjs already knows which stage a film is in and stores the ONE command that moves
// it forward. Knowing that command is not running it: an agent still has to read it, notice it is a
// `make` invocation, and type it. This closes that gap and stops there.
//
// ONE COMMAND, NEVER A CHAIN. A `next` string sometimes carries a trailing note in parens, or a second
// step joined with ", then " (docs/MISTAKES.md #591 is what happens when a whole ladder gets read as
// one instruction). Chaining here would make the same mistake in code: run the first command, stop, and
// let the NEXT invocation re-derive from disk. A step that did not really land then does not silently
// advance past.
//
// APPROVAL IS REFUSED, NOT RUN. It is the one stage whose next act is the user's signature
// (`/vawe-approve`), and scripts/live/stage-gate.mjs already refuses to let an agent write that line.
// Letting `make next` run "the thing that gets the user to approve" would make the irreducible human
// step into a thing an agent performs by proxy. There is no flag past this, same as that gate.
import { spawnSync } from 'node:child_process';
import { stageOf, ROOT } from './stage.mjs';

/** Strip a trailing parenthetical note or a chained second command, keep the one runnable command. */
export function firstCommand(next) {
  return next.split(/,\s*then\s+/i)[0].split(/\s{3,}\(/)[0].trim();
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make next D=formats/scene/<film>.json'); process.exit(2); }

  const st = stageOf(arg);
  if (st.stage === 'approval') {
    console.error(`\n  ${st.name} is at APPROVAL: the plan's sign-off, and only the user can give it.`);
    console.error('  Nothing here runs `/vawe-approve` on the user\'s behalf.');
    console.error(`\n  do:  make studio D=${st.base}.json   (press 1 for the plan)`);
    console.error(`  then ask the user to run:  /vawe-approve ${st.name}\n`);
    process.exit(1);
  }

  const cmd = firstCommand(st.next);
  console.log(`\n  ${st.name} is at ${st.stage.toUpperCase()}. Running:\n  ${cmd}\n`);
  const [bin, ...args] = cmd.split(/\s+/);
  const res = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
