// contract.mjs CLI: `make contract D=<film>` — validate the per-beat continuous-object contract a
// storyboard carries (object_in/object_out on each beat, scripts/lib/contract.mjs). Standalone so a
// broken handoff is visible before `make scenes`/`make assemble` refuse to run it for you.
import fs from 'node:fs';
import path from 'node:path';
import { storyboardPathFor } from '../gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, edges } from '../lib/contract.mjs';

const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node scripts/author/contract.mjs <film.json>'); process.exit(1); }
const sbPath = storyboardPathFor(film);
if (!fs.existsSync(sbPath)) { console.error(`contract: no storyboard at ${sbPath} (run \`make scaffold\` first)`); process.exit(1); }

const sb = parseStoryboard(fs.readFileSync(sbPath, 'utf8'));
const { beats } = timeline(sb);
const errs = chainErrors(beats);

console.log(`contract · ${path.relative(process.cwd(), sbPath)} · ${beats.length} beat(s)`);
if (errs.length) {
  for (const e of errs) console.log(`  ✗ ${e}`);
  process.exit(1);
}
const chain = edges(beats);
if (!chain.length) {
  console.log('  (no continuous-object contract: no beat names object_in/object_out. Nothing to check.)');
  process.exit(0);
}
for (const e of chain) console.log(`  ✓ ${e.name} (${e.start}s-${e.end}s): ${e.in.placement}@${e.in.w}x${e.in.h} → ${e.out.placement}@${e.out.w}x${e.out.h}`);
console.log('  ✓ every handoff matches');
