// scripts/lib/census.mjs: ONE owner for "which files does this sweep walk, and can it see them all?"
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
        + `    sweep would have reported a confident green over a third of its subject (docs/MISTAKES.md #377).\n`
        + `    Fix: scripts/dev/worktree.sh add <name>, which copies the library in.`);
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
 * The library PLUS its generated siblings. The named opt-in for a sweep that grades the RENDERABLE
 * artifact rather than the authored film: an `.expanded.json` is what actually renders once a scene
 * carries block/beat sugar, so a check about what reaches the screen has to walk it.
 */
export const LIBRARY_WITH_DERIVATIVES = (f, abs) => f !== 'schema.json' && !isTemplate(f) && isSceneJSON(abs);

// Sweeps that deliberately walk NEITHER, named here so the next reader does not "fix" them into
// disagreeing again:
//   audit-scenes · paints-nothing · snap-scenes  audit the renderable artifact and skip the un-expanded
//                                                source, so they resolve source→expanded themselves.
//   unused                                       concatenates a text corpus of SHIPPED films: it drops
//                                                `_`-prefixed scratch, which the library keeps.
//   similarity · layer-props · feature-audit     carry their own extra exclusions (sample.json,
//                                                cuts-demo, un-parseable files) on top.
//   sfx-audit · snap-blocks                      different directory entirely: not scenes at all.
