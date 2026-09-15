// harness/lib/census.mjs: ONE owner for "which files does this sweep walk, and can it see them all?"
//
// THE BUG CLASS THIS CLOSES: absence read as a pass. A tool walks a population, finds nothing because
// it was looking at nothing, and prints a green tick. `make slop` ran 41 rules over a DOM dump carrying
// evidence for three of them and reported its silence as a pass on the whole library, for months.
// #377: a gate in a bare worktree walked 41 scenes instead of 149 and printed a confident green.
// This is NOT the silent-substitution class. A substitution renders the wrong thing; this renders
// CONFIDENCE, and confidence is the harder failure to notice because nothing looks wrong.
//
// Two parts, and the second is what makes it more than a print statement:
//   1. state N, unmissably, on every sweep. `waiver-drift` already did, and CLAUDE.md can quote its
//      number precisely BECAUSE it is printed. Everything else copies that.
//   2. refuse a population this checkout should not have. Not against a hardcoded floor, that goes
//      stale the day somebody adds a scene, but against what the repo demonstrably holds.
//
// THE HONEST COMPLICATION, and getting it right IS the job. A fresh clone legitimately sees ~36 scenes
// of 135: films are gitignored on purpose (.gitignore:61), and CLAUDE.md has a section saying so. So
// "small" is not "broken". Fire in the strict direction and every contributor's first run breaks; fire
// in the lax direction and the bug is back. The two signals below are the only ones that separate a
// small checkout from a blind tool, and neither one carries a number a human chose:
//
//   ANCHOR   a linked worktree shares a .git with a main checkout that is right there on disk. If main
//            holds more of this population than we do, we are blind and main proves it. A fresh clone
//            is not a linked worktree, so it is never compared and never fires. That is #377 exactly.
//   TRACKED  every git-tracked file in the directory must exist on disk. A checkout missing its own
//            tracked files is broken however small it is, and no gitignore explains it.
//
// And the third part is structural rather than checked: sweeps enumerate through here, so no sweep
// sources its population from `git ls-files` again. Three did, and on main they walked 40 scenes of 135
// while the other 95 sat unread in the same directory.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SCENE_DIR = 'formats/scene';

const git = (args, cwd) => cp.execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// The main checkout behind a linked worktree, or null when this IS the main checkout (a clone, a
// tarball, CI). `--git-common-dir` is the shared .git; its parent is the checkout that owns everything.
function anchorRoot() {
  try {
    const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], ROOT).trim();
    const own = git(['rev-parse', '--path-format=absolute', '--git-dir'], ROOT).trim();
    if (!common || common === own) return null;
    const main = path.dirname(common);
    return main !== ROOT && fs.existsSync(path.join(main, SCENE_DIR)) ? main : null;
  } catch { return null; }
}

const listing = (root, dir, ext, filter) => {
  let names;
  try { names = fs.readdirSync(path.join(root, dir)).sort(); } catch { return null; }
  return names.filter((f) => f.endsWith(ext) && filter(f, path.join(root, dir, f)));
};

/**
 * Enumerate a population, state N, and refuse one this checkout should not have.
 *
 * @param {string}   what        label for the printed line ("waiver census")
 * @param {object}   opts
 * @param {string}   opts.dir    repo-relative directory (default formats/scene)
 * @param {string}   opts.ext    file extension that makes a file a candidate (default .json)
 * @param {function} opts.filter (name, absPath) => boolean: the SWEEP'S OWN rule for what counts.
 *                               Applied identically to this checkout and to the anchor, so a tool that
 *                               excludes sidecars is compared against a count that excludes them too.
 * @param {boolean}  opts.quiet  suppress the printed line (the caller prints N its own way)
 * @param {boolean}  opts.soft   return `{ blind: <reason> }` instead of exiting. For a sweep whose count
 *                               is DISPLAY ONLY inside a larger tool: killing the whole run over a
 *                               census nobody was going to act on is worse than saying the census is
 *                               blind and carrying on. A soft caller MUST print `blind` where it would
 *                               have printed the number: swallowing it puts the confident green back.
 * @returns {{names: string[], n: number, dir: string, root: string, line: string, blind: string|null}}
 *
 * Exits 3 rather than throwing: every caller is a CLI gate, and a sweep that cannot see its subject has
 * no verdict to return. Reporting the gap and continuing would be the bug wearing a warning label.
 */
export function population(what, { dir = SCENE_DIR, ext = '.json', filter = () => true, quiet = false, soft = false } = {}) {
  const names = listing(ROOT, dir, ext, filter);
  const stop = (why) => { if (soft) return why; refuse(what, why); };
  if (names === null) {
    const why = `${dir}/ does not exist in this checkout.`;
    if (!soft) refuse(what, why);
    return { names: [], n: 0, dir, root: ROOT, line: `${what} · unavailable`, blind: why };
  }

  const line = `${what} · ${names.length} file(s) in ${dir}`;
  if (!quiet) console.log(`\n  ${line}\n`);

  let blind = null;
  const missing = trackedButAbsent(dir, ext);
  if (missing.length) {
    blind = stop(`${missing.length} git-tracked file(s) in ${dir}/ are absent from disk `
      + `(${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''}).\n`
      + `    A checkout missing its own tracked files is broken. Nothing in .gitignore explains this.`);
  }

  const anchor = anchorRoot();
  if (!blind && anchor) {
    const theirs = listing(anchor, dir, ext, filter) || [];
    if (theirs.length > names.length) {
      blind = stop(`this worktree sees ${names.length} of the ${theirs.length} in ${anchor}/${dir}.\n`
        + `    A worktree checks out TRACKED files only and most of this library is gitignored, so the\n`
        + `    sweep would have reported a confident green over a third of its subject (engine-doctrine/MISTAKES.md #391).\n`
        + `    Fix: harness/dev/worktree.sh add <name>, which copies the library in.`);
    }
  }
  return { names, n: names.length, dir, root: ROOT, line, blind: blind || null };
}

function trackedButAbsent(dir, ext) {
  let tracked;
  try { tracked = git(['ls-files', '--', `${dir}/*${ext}`], ROOT).split('\n').filter(Boolean); } catch { return []; }
  return tracked.filter((rel) => !fs.existsSync(path.join(ROOT, rel))).map((rel) => path.basename(rel));
}

function refuse(what, why) {
  console.error(`\n  ✗ ${what}: BLIND SWEEP, ${why}\n`
    + `    Refusing rather than reporting a pass over a population this tool cannot see.\n`);
  process.exit(3);
}

// A `.template.json` holds mustache placeholders, so it is not JSON and never was a video. Reading one
// threw out of two sweeps and killed them entirely: `make features` and the pace census both exited on a
// stack trace instead of a verdict, which is this bug class in its loudest form.
export const isTemplate = (f) => /\.template\.json$/.test(f);

// ONE definition of "the library", because there were two. `waiver-drift` excluded sidecars and printed
// 135; `audio-check` did not and printed 150. Same repo, same day, two numbers for one thing, and
// CLAUDE.md quotes both as the size of the library. The doc comment at the top of this file already
// argued the principle (a sweep that excludes sidecars must be compared against a count that excludes
// them too) and left every caller to restate it, so every caller restated it differently.
//
// A FILM is a file in formats/scene that a person authored and the engine can render on its own:
const DERIVATIVE = /\.(animatic|intent|expanded|beatsync|captioned|directed)\./;
const isSceneJSON = (abs) => { try { return JSON.parse(fs.readFileSync(abs, 'utf8'))?.module === 'scene'; } catch { return false; } };

/** The library. Pass as `filter` to population(). This is the number CLAUDE.md means. */
export const LIBRARY = (f, abs) => f !== 'schema.json' && !isTemplate(f) && !DERIVATIVE.test(f) && isSceneJSON(abs);

/**
 * The library PLUS its generated siblings (`.beatsync`, `.captioned`, `.directed`, …). The named
 * opt-in for a sweep that grades every renderable artifact, derivatives included. `.expanded.json` is
 * matched here for a stray leftover only: `block`/`beat`/`comp` sugar now expands at LOAD time
 * (core/engine/expand.js), so nothing generates that suffix any more and a source scene IS the renderable one.
 */
export const LIBRARY_WITH_DERIVATIVES = (f, abs) => f !== 'schema.json' && !isTemplate(f) && isSceneJSON(abs);

// LIBRARY keeps every source scene, including one this population exists to pull out: a still-tile
// catalogue (`_catalog-1.json` .. `_catalog-26.json`, one frozen frame per block) and a feature demo
// whose whole job is to hold one thing still so you can look at it (`example-metallic-bg`,
// `aspects-demo`). Neither was ever authored as a FILM, so grading either for motion is grading a paint
// chip for plot. A `.storyboard.md` sidecar is the signal a film was actually planned by a person
// (waiver-drift already treats its absence as `no-storyboard`), and a catalogue tile or a demo never
// gets one. Measured on this checkout the same day: LIBRARY (177 films) read 101 as zero motion;
// AUTHORED (41 films) read 4. The 177-film number is not "the library moving less"; it is the population
// including 60-odd files that were never supposed to move. Any sweep that grades MOTION walks this, not
// LIBRARY: `quality/gates/direction-floor.mjs`'s `libraryProfile()`, and the motion codes
// (`no-authored-motion`, `plain-slideshow`, `static-bg`) `quality/gates/waiver-drift.mjs --ratchet`
// re-measures. A non-motion sweep (waiver-drift's own census, `library-stats.mjs`, `unused.mjs`, …)
// stays on LIBRARY: whether a film waives a rule or carries a beat blueprint has nothing to do with
// whether a person planned it, and narrowing those to AUTHORED would just as wrongly shrink the count.
export const AUTHORED = (f, abs) => f !== 'schema.json' && !isTemplate(f) && !DERIVATIVE.test(f) && isSceneJSON(abs)
  && fs.existsSync(path.join(path.dirname(abs), `${path.basename(f, '.json')}.storyboard.md`));

// Sweeps that deliberately walk NEITHER, named here so the next reader does not "fix" them into
// disagreeing again:
//   audit-scenes · paints-nothing · snap-scenes  walk LIBRARY directly: a source scene renders on its
//                                                own now (block/beat/comp expand at load), so there is
//                                                no derivative to resolve to.
//   unused                                       concatenates a text corpus of SHIPPED films: it drops
//                                                `_`-prefixed scratch, which the library keeps.
//   similarity · layer-props · feature-audit     carry their own extra exclusions (sample.json,
//                                                cuts-demo, un-parseable files) on top.
//   sfx-audit · snap-blocks                      different directory entirely: not scenes at all.
//   MOTION sweeps (see AUTHORED above)           walk AUTHORED, not LIBRARY, because LIBRARY still
//                                                carries catalogue tiles and held-still demos.

// ---------- the populations, by NAME, so a doc can quote one ----------
//
// The code had one owner for "the library" and the DOCS still did not, because there was no way to
// ASK. Four numbers were all true of this checkout on the same afternoon and meant different things:
// 134 (the library), 136 (a hand-rolled walk that forgot two derivative suffixes), 106 (what the
// snapshot net sweeps) and 161 (every .json in the directory). Each got quoted somewhere as "the
// library", including on the architecture page written the same day, which is the tell: the person
// with the definitions in front of them still produced a fifth number by hand.
//
// So the fix is not another definition. It is making the existing ones REACHABLE:
//
//   node harness/lib/census.mjs      (make census)
//
// Quote a NAME in prose and print the number here. A number typed into a doc is a copy with no owner,
// and this repo has already logged eight of those going stale across five files.
export const POPULATIONS = [
  ['library', LIBRARY,
   'films a person authored and the engine can render on its own. THIS is what CLAUDE.md means by "the library".'],
  ['library+derivatives', LIBRARY_WITH_DERIVATIVES,
   'the above plus generated siblings (.expanded, .beatsync, …). What a sweep grading the RENDERABLE artifact walks.'],
  ['authored', AUTHORED,
   'library films with a .storyboard.md sidecar: a person actually planned this one, so a catalogue tile or a held-still demo is excluded. What a sweep grading MOTION walks, not "library".'],
  ['every scene file', (f) => f.endsWith('.json') && f !== 'schema.json' && !isTemplate(f),
   'every .json in formats/scene bar the schema. Bigger than either population above and never the right answer to "how many films".'],
];

// A COUNT ON A DEVELOPER MACHINE IS NOT A COUNT ON A CLONE, and saying so is half the point of this
// output. Films are gitignored on purpose (.gitignore:61: a video instance is not the framework), so a
// fresh checkout legitimately sees roughly a third of these numbers with nothing broken. Printing the
// tracked share beside the total is what stops the next reader reading a smaller number as a fault.
const trackedCount = (dir, names) => {
  try {
    const set = new Set(git(['ls-files', '--', `${dir}/*.json`], ROOT).split('\n').filter(Boolean).map((r) => path.basename(r)));
    return names.filter((f) => set.has(f)).length;
  } catch { return null; }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`\n  CENSUS · ${SCENE_DIR}\n`);
  for (const [name, filter, why] of POPULATIONS) {
    const names = listing(ROOT, SCENE_DIR, '.json', filter) || [];
    const tracked = trackedCount(SCENE_DIR, names);
    console.log(`  ${String(names.length).padStart(4)}  ${name}`);
    console.log(`        ${why}`);
    if (tracked !== null) console.log(`        ${tracked} of them are git-tracked, so a fresh clone sees ${tracked}.`);
    console.log('');
  }
  console.log(`  Quote a NAME in prose, and print this to get the number. A number typed into a doc is a`);
  console.log(`  copy with no owner.\n`);
}
