// quality/gates/inert-check.mjs: a mechanism that is wired and does nothing, found by machine.
//
//   node quality/gates/inert-check.mjs           ·   make inert-check
//   node quality/gates/inert-check.mjs --json
//
// WHY THIS EXISTS. Six defects this repo shipped this week share one shape: a gate, a hook or a
// generator existed, looked correct on inspection, and did nothing, and nothing reported the
// inertness. coverage.mjs crashed for six days in neither the Makefile's callers nor CI.
// audit-scenes.yml failed five weeks into nobody's inbox. arsenal-nudge.mjs's own watch list
// cancelled its own trigger. direction-floor.mjs was demoted to warn-only after failing 38 of 130
// films. snap-scenes.mjs's baseline directory holds one digest, nothing to diff. SOUND.md's worked
// example taught the form the doc text said was obsolete.
//
// Five of those are fixed. This does not re-fix them; it is the check that would have FOUND them,
// so the sixth one is found by a machine instead of a postmortem. It has four sections, run
// independently, each printed with the reasoning that told a deliberate exclusion from an accidental
// one, because an audit that cannot tell those apart cries wolf and gets ignored, which is the exact
// failure this exists to prevent.
//
//   1. STANDING GATES UNREACHED: a Makefile target that calls a quality/gates/*.mjs check, needs no
//      per-file argument, and is named in neither .githooks/pre-push nor any .github/workflows/*.yml.
//   2. GENERATORS THAT CAN GO QUIET: a script under scripts/site/ or generators/ that derives a list
//      by parsing another file (regex, not a typed import) and writes it with no guard against
//      writing an empty result.
//   3. SCHEDULED WORKFLOWS NOBODY POLLS: a `schedule:` workflow whose filename is not named by any
//      script that reports CI status (the class audit-scenes.yml was, before it was fixed).
//   4. BASELINES GIT CANNOT SHIP: a quality/baselines/* path `git check-ignore` accepts, which means
//      a CI checkout starts every comparison from empty.
//
// WHAT THIS DOES NOT DO. It does not read doc prose against its own worked examples (case 6): that
// judgement call is why the report for this audit does it by hand instead of claiming a heuristic
// that would either miss the real ones or flag every relative-time literal in the repo.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rel = (p) => path.relative(ROOT, p);
const read = (p) => fs.readFileSync(p, 'utf8');

// ---------------------------------------------------------------------------------------------
// 1. standing gates the Makefile can run with no per-file argument, absent from pre-push and CI.
// ---------------------------------------------------------------------------------------------

// A target recipe may reference a Make variable and still be a STANDING (repo-wide) check: these
// are flags with a working default (off), never a required positional argument. Anything else
// ($(D), $(NAME), $(SCENE), $(M) when required, $(SB), $(REF), $(URL), $(ARGS), $(BLOCK), $(P)...)
// makes the target per-file, and per-file targets are reached through author-check / scene-check.yml
// by construction, not by being named here.
const OPTIONAL_FLAGS = new Set(['JSON', 'WRITE', 'STRICT', 'TASTE', 'SAVE', 'LIST', 'STAMP', 'TOP']);

// Targets that call a gate but are not an INDEPENDENT check on top of one already covered: a
// write-mode twin of a covered target, a ratchet-stamp twin, a human dashboard that composes other
// (separately covered) gates, or a generator (its output is covered by generated-check, which runs
// every generator and diffs). Each is named with the reason, not silently dropped, because a
// reviewer who cannot see why an exclusion happened cannot tell it apart from a miss.
const NOT_INDEPENDENT = {
  'schema-write': 'write-mode twin of schema-check, which is covered',
  'storyboard-decide-ratchet': 'ratchet-stamp twin of storyboard-check',
  'waiver-ratchet': 'ratchet-stamp twin of a gate this audit does not independently track',
  'doc-index': 'a generator (regenerates INDEX.md), covered by generated-check, which runs every generator and diffs',
  'gate-classification': 'a generator (regenerates GATE-CLASSIFICATION.md), covered by generated-check',
  'review': 'a human dashboard that composes lib-test + audit + an overlay sheet, not an independent check',
  'compare': 'a dev picker over ARGS, not a check',
  'code-quality-top': '--top read-mode of code-quality, which is covered',
};

// Targets that are deliberately out of CI because the content they check is gitignored: a fresh
// clone cannot see what they need to mean anything, and each says so where it is invoked. Listed
// with the doc that makes the exclusion legible, not just the name, so a reviewer can re-check the
// claim instead of taking this file's word for it.
const DELIBERATE_GITIGNORED = {
  coverage: '.githooks/pre-push: films/scene/*.json is gitignored, a CI clone sees a fraction of the library',
  'doc-refs': '.github/workflows/gates.yml: same reason, resolves scene paths a clone will never have',
  'no-judge': 'operates on films/scene/*.json renders, the same gitignored population as coverage',
};

function makeTargets() {
  const mk = read(path.join(ROOT, 'Makefile'));
  const targets = {};
  let cur = null;
  for (const line of mk.split('\n')) {
    const m = /^([A-Za-z0-9_.-]+):(?!=)/.exec(line);
    if (m && !line.startsWith('\t')) { cur = m[1]; targets[cur] ??= []; }
    else if (line.startsWith('\t') && cur) targets[cur].push(line);
  }
  return targets;
}

function standingGateTargets() {
  const targets = makeTargets();
  const out = [];
  for (const [name, body] of Object.entries(targets)) {
    const joined = body.join('\n');
    const gates = [...joined.matchAll(/quality\/gates\/([a-zA-Z0-9_-]+)\.mjs/g)].map((m) => m[1]);
    if (!gates.length) continue;
    const vars = [...joined.matchAll(/\$\(([A-Z_]+)\)/g)].map((m) => m[1]);
    const requiresArg = vars.some((v) => !OPTIONAL_FLAGS.has(v));
    if (requiresArg) continue;
    out.push({ target: name, gates: [...new Set(gates)] });
  }
  return out;
}

function reachedGateNames() {
  const reached = new Set();
  const prepush = read(path.join(ROOT, '.githooks/pre-push'));
  for (const m of prepush.matchAll(/quality\/gates\/([a-zA-Z0-9_-]+)\.mjs/g)) reached.add(m[1]);
  // pre-push and CI both also reach gates through `make <target> <target> ...` lines: resolve those
  // through the same target table so a target-name match counts the gates it actually runs.
  const table = makeTargets();
  const resolveMakeLine = (text) => {
    for (const m of text.matchAll(/\bmake\s+((?:[a-zA-Z0-9_-]+\s*)+)/g)) {
      for (const tok of m[1].trim().split(/\s+/)) {
        if (table[tok]) for (const g of table[tok].join('\n').matchAll(/quality\/gates\/([a-zA-Z0-9_-]+)\.mjs/g)) reached.add(g[1]);
      }
    }
  };
  resolveMakeLine(prepush);
  const wfDir = path.join(ROOT, '.github/workflows');
  for (const f of fs.readdirSync(wfDir)) {
    if (!f.endsWith('.yml')) continue;
    const text = read(path.join(wfDir, f));
    for (const m of text.matchAll(/quality\/gates\/([a-zA-Z0-9_-]+)\.mjs/g)) reached.add(m[1]);
    resolveMakeLine(text);
  }
  return reached;
}

function section1(f) {
  const reached = reachedGateNames();
  const standing = standingGateTargets();
  const unreached = [];
  for (const { target, gates } of standing) {
    if (target in NOT_INDEPENDENT) continue;
    const missing = gates.filter((g) => !reached.has(g));
    if (!missing.length) continue;
    if (target in DELIBERATE_GITIGNORED) {
      console.log(`  · ${target} (${missing.join(', ')}): deliberately out. ${DELIBERATE_GITIGNORED[target]}`);
      continue;
    }
    unreached.push({ target, gates: missing });
  }
  for (const { target, gates } of unreached) {
    f.fail('gate-unreached',
      `\`make ${target}\` (${gates.map((g) => `${g}.mjs`).join(', ')}) is in the Makefile, needs no ` +
      'per-file argument, can exit non-zero, and is named in neither .githooks/pre-push nor any ' +
      '.github/workflows/*.yml. Nobody runs it unless they remember to type it by hand.',
      { at: `Makefile:${target}` });
  }
  return unreached;
}

// ---------------------------------------------------------------------------------------------
// 2. generators that parse another file and can write an empty or partial result without failing.
// ---------------------------------------------------------------------------------------------

function generatorFiles() {
  const dirs = ['scripts/site', 'generators/media', 'generators/ransom', 'generators/sim'];
  const out = [];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      if (name.endsWith('.mjs') && !name.endsWith('.test.mjs')) out.push(path.join(full, name));
    }
  }
  return out;
}

function section2(f) {
  const listHits = [];   // matchAll: extracts MANY records from foreign text (mcp-tools.mjs's own shape)
  const fieldHits = [];  // .match(...)?.[1] ?? '' : one required field, defaulted to empty on a miss
  for (const file of generatorFiles()) {
    const src = read(file);
    if (!/writeFileSync/.test(src)) continue;
    const guarded = /if\s*\(\s*!.*\.length\s*\)[\s\S]{0,500}process\.exit\(1\)/.test(src)
      || /\.length\s*===?\s*0\s*\)[\s\S]{0,500}process\.exit\(1\)/.test(src);
    if (/matchAll\(/.test(src) && /readFileSync/.test(src) && !guarded) listHits.push(rel(file));
    // A single `.match(...)` whose miss falls back to '' or null rather than failing: the field
    // goes quietly blank in the written output instead of stopping the generator.
    if (/\.match\(\/[^/]*\/[a-z]*\)[\s\S]{0,150}(\?\?|:)\s*(''|null|"")/.test(src)) fieldHits.push(rel(file));
  }
  for (const file of listHits) {
    f.fail('generator-list-unguarded',
      `${file} extracts a LIST of records from another file's text with matchAll() and writes it ` +
      'with writeFileSync, with no guard that refuses to write an empty result when the match count ' +
      'is zero. If the source shape changes, it writes a quiet empty list instead of stopping, the ' +
      'failure mode scripts/site/mcp-tools.mjs names in its own header and guards against.',
      { at: file });
  }
  for (const file of fieldHits) {
    f.warn('generator-field-unguarded',
      `${file} reads one required field with a single .match() and falls back to an empty value on ` +
      'a miss instead of failing. Milder than a whole list going quiet, but the same shape: the ' +
      "source's format can drift and the generator will not say so.",
      { at: file });
  }
  return [...listHits, ...fieldHits];
}

// ---------------------------------------------------------------------------------------------
// 3. scheduled workflows nobody polls the result of.
// ---------------------------------------------------------------------------------------------

function section3(f) {
  const wfDir = path.join(ROOT, '.github/workflows');
  const scheduled = [];
  for (const name of fs.readdirSync(wfDir)) {
    if (!name.endsWith('.yml')) continue;
    const text = read(path.join(wfDir, name));
    if (/^\s*schedule:/m.test(text)) scheduled.push(name);
  }
  // Every script that names a workflow file, anywhere in the repo (outside the workflow files
  // themselves), counts as "polls" or "reports on" that workflow: ci-status.mjs's WORKFLOW constant
  // is exactly this shape.
  const SELF = fileURLToPath(import.meta.url);
  const pollers = cp.execFileSync('grep', ['-rl', '--include=*.mjs', '--include=*.sh',
    '-e', scheduled.map((s) => s.replace('.', '\\.')).join('\\|'), ROOT], { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((p) => p !== SELF);
  const hits = [];
  for (const wf of scheduled) {
    const named = pollers.some((p) => read(p).includes(wf));
    if (!named) hits.push(wf);
  }
  for (const wf of hits) {
    f.warn('schedule-unpolled',
      `.github/workflows/${wf} runs on a schedule and no script in the repo names this file, so ` +
      'nothing reports its run status anywhere but GitHub\'s own default email, the exact channel ' +
      'that let a scheduled job fail for five weeks unseen before. harness/dev/ci-status.mjs exists ' +
      'for this and only ever asks about gates.yml.',
      { at: `.github/workflows/${wf}` });
  }
  return hits;
}

// ---------------------------------------------------------------------------------------------
// 4. baselines a CI checkout can never see.
// ---------------------------------------------------------------------------------------------

function section4(f) {
  // Files currently on disk: catches a baseline nobody has generated yet in a fresh clone too, not
  // only ones this checkout happens to hold, by reading .gitignore's OWN pattern lines under
  // quality/baselines/ rather than only asking git about files that already exist here.
  const gi = read(path.join(ROOT, '.gitignore'));
  const patterns = [...gi.matchAll(/^(!?)(quality\/baselines\/\S+)\s*$/gm)]
    .filter(([, neg]) => !neg) // a `!path` line UN-ignores; it is the exception, not the finding
    .map(([, , p]) => p);
  for (const p of patterns) {
    f.note('baseline-gitignored',
      `.gitignore excludes ${p}: a fresh CI checkout starts any comparison against it from empty. ` +
      'Correct when the gate that owns it says so in its own header (snap-scenes.mjs does, at ' +
      'length, for quality/baselines/snap/*); worth a second look wherever it does not.',
      { at: '.gitignore' });
  }
  return patterns;
}

// ---------------------------------------------------------------------------------------------

console.log('── inert-check · a mechanism that is wired and does nothing\n');

const f = gateFindings({ line: (r) => `   ${r.at}\n       ${r.summary}` });

console.log('1. standing gates absent from pre-push and CI (deliberate exclusions shown inline):');
const s1 = section1(f);
if (!s1.length) console.log('   none');

console.log('\n2. generators that parse text and can write empty output unguarded:');
const s2 = section2(f);
if (!s2.length) console.log('   none');

console.log('\n3. scheduled workflows nobody polls:');
const s3 = section3(f);
if (!s3.length) console.log('   none');

console.log('\n4. baselines a CI checkout can never see (informational, not a failure by itself):');
const s4 = section4(f);
if (!s4.length) console.log('   none');

console.log();
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
