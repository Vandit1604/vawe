import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SCENE_DIR = process.env.VAWE_FILMS_DIR || 'films/scene';

const git = (args, cwd) => cp.execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

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
 * @param {string}   opts.dir    repo-relative directory (default films/scene)
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

export const isTemplate = (f) => /\.template\.json$/.test(f);

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

export const AUTHORED = (f, abs) => f !== 'schema.json' && !isTemplate(f) && !DERIVATIVE.test(f) && isSceneJSON(abs)
  && fs.existsSync(path.join(path.dirname(abs), `${path.basename(f, '.json')}.storyboard.md`));


export const POPULATIONS = [
  ['library', LIBRARY,
   'films a person authored and the engine can render on its own. THIS is what CLAUDE.md means by "the library".'],
  ['library+derivatives', LIBRARY_WITH_DERIVATIVES,
   'the above plus generated siblings (.expanded, .beatsync, …). What a sweep grading the RENDERABLE artifact walks.'],
  ['authored', AUTHORED,
   'library films with a .storyboard.md sidecar: a person actually planned this one, so a catalogue tile or a held-still demo is excluded. What a sweep grading MOTION walks, not "library".'],
  ['every scene file', (f) => f.endsWith('.json') && f !== 'schema.json' && !isTemplate(f),
   'every .json in films/scene bar the schema. Bigger than either population above and never the right answer to "how many films".'],
];

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
