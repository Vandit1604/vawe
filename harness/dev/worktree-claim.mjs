#!/usr/bin/env node
// harness/dev/worktree-claim.mjs: the CLI worktree.sh calls to record and clear a claim.
//   node harness/dev/worktree-claim.mjs add <name> <branch> [scope-glob ...]
//   node harness/dev/worktree-claim.mjs rm  <name>
//
// Scopes are OPTIONAL. A worktree with none declared just carries no overlap check, exactly like a
// brief that never wrote "you touch X" in prose today, no worse than the status quo. See
// harness/lib/worktree-claims.mjs for the storage and the overlap rule (warn, never block).
import { addClaim, removeClaim } from '../lib/worktree-claims.mjs';

const [cmd, name, ...rest] = process.argv.slice(2);
if (!cmd || !name) { console.error('usage: worktree-claim.mjs add|rm <name> [branch] [scope ...]'); process.exit(2); }

if (cmd === 'rm') { removeClaim(name); process.exit(0); }
if (cmd !== 'add') { console.error(`unknown command: ${cmd}`); process.exit(2); }

const [branch, ...scopes] = rest;
const overlaps = addClaim(name, { branch: branch || null, scopes });
if (overlaps.length) {
  console.warn(`\n⚠ ${name} declares a scope another live worktree also claims. Overlap is sometimes`);
  console.warn(`  correct (a read, a doc both touch); this warns, it does not block.`);
  for (const o of overlaps) console.warn(`    ${o.glob}  overlaps  ${o.against} (${o.branch || 'no branch'}): ${o.theirGlob}`);
}
