// quality/gates/direction-floor-corpus.mjs: WHICH FILMS ARE "EXISTING" FOR THE AMBITION FLOOR.
//
// The owner's ruling on plain-slideshow / no-continuous-object (quality/gates/direction-floor.mjs):
// "Block only for new films." Nothing in the library breaks; the bar rises for new work. That needs a
// FILM-BY-FILM answer to "is this new", and it must not be a date: a timestamp rots and anyone can
// edit it. Git history cannot answer it either: films/scene/*.json is gitignored for almost the whole
// library (.gitignore:84), so most films were never committed at all and have no history to read.
//
// So this is a NAME CENSUS, stamped once, the same shape as every other ratchet under quality/
// baselines/ (output-contract.mjs, no-judge.mjs, blocking-findings-check.mjs) except keyed by FILM NAME
// rather than a scalar count. A count would let a deleted offender's slot be filled by a new film under
// a different name, silently passing; the owner ruled on FILMS, not a tally, so the baseline names them.
//
// HOW author-check.mjs USES THIS. A basename in the baseline is EXISTING: the two ambition codes still
// run and still print their finding, but the HARD_CODES step forgives a bare `authoring.allow` waiver
// on them exactly as it always has (51 of the library's films rely on this; do not re-litigate those,
// that is film work, not this gate's). A basename NOT in the baseline is NEW: HARD_CODES forgives only
// what direction-floor.mjs itself already honoured, a waiver backed by the storyboard's own `threads:`
// line (PLAN_BACKED_WAIVERS in direction-floor.mjs), so a fresh blank slideshow cannot buy its way out
// with a one-line `_why` the way the frozen library still can.
//
// FROZEN ON PURPOSE. `--stamp` is for the one-time adoption recorded in this file's own history.
// Running it again to fold a newly authored film back into "existing" defeats the ruling for that one
// film; a film earns existing status by being here before this baseline existed, not by being added to
// the file later. (A deliberate, owner-approved bulk migration, the same shape as legacy-fold.mjs, is
// the only legitimate reason to ever touch this file again, and it is a film decision, not a code one.)
//
//   node quality/gates/direction-floor-corpus.mjs [--stamp] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { population, LIBRARY, ROOT } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const BASELINE = path.join(ROOT, 'quality/baselines/direction-floor-corpus.json');

/** The frozen set of basenames this ambition floor already forgives on a bare waiver. Empty (nothing
 * grandfathered, everything is "new") when the baseline has never been stamped. */
export function knownFilms() {
  try { return new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8'))); }
  catch { return new Set(); }
}

const isMain = () => { try { return import.meta.url === `file://${fs.realpathSync(process.argv[1])}`; } catch { return false; } };

if (isMain()) {
  const pop = population('direction-floor corpus', { filter: LIBRARY, quiet: true });
  const known = knownFilms();
  const fresh = pop.names.filter((n) => !known.has(n));

  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, `${JSON.stringify([...pop.names].sort(), null, 1)}\n`);
    console.error(`\n  ✓ stamped ${pop.names.length} existing film(s) as the frozen ambition-floor corpus\n`);
    process.exit(0);
  }
  const line = `direction-floor corpus · ${known.size} known · ${pop.names.length} in the library now`
    + `${fresh.length ? ` · ${fresh.length} not yet in the baseline` : ''}`;
  const f = gateFindings({ line: (r) => `  ${r.summary}` });
  f.note('direction-floor-corpus', line);
  for (const n of fresh) f.note('direction-floor-corpus-new', `${n}: not in the frozen baseline, so the ambition floor's plan-backed rule applies to it`, { at: n });
  console.error('');
  f.emit();
  console.error('');
}
