#!/usr/bin/env node
// quality/gates/gate-classification.mjs: GENERATE engine-doctrine/GATE-CLASSIFICATION.md, one row per
// gate under quality/gates/ that judges a FILM (takes a scene JSON, a storyboard, or a render).
//
// THE QUESTION THIS ANSWERS (the plan: gates-measure-the-result). vawe-flow-2.json is an approved film
// carried by one continuous camera travel with no cut. Four codes fired on it anyway, all for the same
// reason: each COUNTS a mechanism in the JSON (entries in `transitions[]`, background presets, `parts`
// on a parent group) rather than MEASURING the result those mechanisms are supposed to produce. Against
// that, `seam-snap.mjs` samples real luminance across the real rendered seam and passes the same film
// clean, because it looks at the pixels the mechanism was only ever a proxy for.
//
// So: does this gate read the scene JSON's DECLARED structure (mechanism), or the actual rendered
// output, mp4 or a live headless-DOM frame (result)? A third shape showed up reading the sources for
// this table and is reported rather than forced into the other two: some FILM_CHECKS gates check
// PROCESS (did a required step happen: preflight's receipt, a judge sheet, a waiver's hygiene) rather
// than the film's craft at all, and one (author-check.mjs) is an AGGREGATOR that spawns ~20 gates of
// every other kind and reports their union, so no single label fits it.
//
// HOW A GATE IS CLASSIFIED. Not by a generic regex over the source: a first pass tried that (does the
// word "pixel" appear, does "ffprobe" appear) and it was wrong on sight, because half these files SAY,
// in a comment, that they do NOT do the thing the keyword suggests: covered-move.mjs's own header says
// "not rendered pixels", beat-check.mjs's says "structural, not pixel-based", eye-trace.mjs's is titled
// "WHY NOT PIXELS". A keyword match cannot tell a gate's method from a gate's disclaimer about a method
// it deliberately does not use. So EVIDENCE is a specific, cited fact about that gate's own source: an
// import (`puppeteer`), a spawned binary (`ffprobe`/`ffmpeg`), a required precondition file
// (`out/<name>.mp4`), read from the file and quoted, not guessed from a word list. The table below
// holds that evidence explicitly, the same way harness/dev/gate-census.mjs's own FILM_CHECKS is a hand-
// kept dict of how each gate takes a film argument (its comment: "kept explicit here... because
// guessing that from source shape is exactly the kind of silent-drift heuristic this repo warns
// against"). What is GENERATED is the DOC: this script re-reads the source for every gate on disk,
// keeps only what still exists, flags any new FILM_CHECKS gate this table has not classified yet as
// UNCLASSIFIED rather than silently omitting it, and appends the CURRENT corrected fire/refuse numbers
// from a live `harness/dev/gate-census.mjs` run (or from GATE_CENSUS_JSON, for iteration).
//
//   node quality/gates/gate-classification.mjs             regenerate engine-doctrine/GATE-CLASSIFICATION.md
//   GATE_CENSUS_JSON=out/x.json node quality/gates/gate-classification.mjs   reuse a census already run
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FILM_CHECKS, REPO_CHECKS, LIBRARIES, OTHER_TOOLS, REPORTERS, allGateFiles } from '../../harness/dev/gate-census.mjs';
import { splitWaiver } from '../../harness/lib/waivers.mjs';
import { codesEmitted } from '../../harness/lib/finding-codes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DOC = path.join(ROOT, 'engine-doctrine', 'GATE-CLASSIFICATION.md');

// ---- what a gate reads, and why: one row per FILM_CHECKS key, evidence cited by file + quoted line ----
// kind: 'mechanism' (the declared scene JSON/storyboard only) | 'result' (the real rendered mp4, or a
// live headless-DOM frame probe) | 'process' (a required step happened, not the film's craft) |
// 'aggregator' (spawns gates of more than one kind and reports their union).
const CLASSIFY = {
  'asset-check.mjs': ['result', 'execFileSync(\'ffprobe\', …) on every referenced media asset: real bytes, not a declared path'],
  'audio-check.mjs': ['mechanism', 'reads scene.audio / scene.audio.auto as declared, never decodes a track'],
  'author-check.mjs': ['aggregator', 'spawns ~20 sub-gates (validate, beats, assets, plan-vs-render, sweep-static, …) of every other kind and reports their union; classify each sub-gate on its own row'],
  'beat-check.mjs': ['mechanism', 'own comment: "the test is structural, not pixel-based, and it comes in two tiers"'],
  'copy-check.mjs': ['mechanism', '"reads the on-screen text layers" as declared in the JSON'],
  'covered-move.mjs': ['mechanism', 'own comment: "not rendered pixels, and never judges html coverage"; resolves declared x/y/w/h in place'],
  'craft-checklist.mjs': ['mechanism', 'cross-references the scene\'s declared devices against doctrine frontmatter; no render'],
  'critique.mjs': ['mechanism', 'per-layer red-flag scan (placeholder words, static lists) over declared content, no render'],
  'designspec-check.mjs': ['mechanism', 'compares a layer\'s declared colour/font against the theme JSON: JSON-to-JSON, no render'],
  'direction-floor.mjs': ['mechanism', 'counts transitions[], background presets and parts/each on a parent group; the exact shape the plan\'s four wrong-fire codes come from'],
  'dissolve-check.mjs': ['mechanism', 'own comment: "this reads markup, not pixels"'],
  'draft-check.mjs': ['result', '"the checks that need real pixels and cannot be run on" the plan; requires out/<name>.mp4 to exist'],
  'edge-check.mjs': ['mechanism', 'computes declared scale/overscan geometry; no puppeteer, no ffprobe, no render read'],
  'eye-trace.mjs': ['mechanism', 'own heading: "WHY NOT PIXELS"; scores declared layer geometry, not a rendered frame'],
  'font-audit.mjs': ['result', 'imports puppeteer to measure real rendered glyphs'],
  'frame-check.mjs': ['mechanism', 'compares planned beats against timeline math computed from the declared JSON; no render'],
  'inspect.mjs': ['mechanism', 'checks mustShow/mustAnimate against declared layer presence + motion; needs a per-film .intent.json sidecar most films do not have'],
  'judge.mjs': ['result', 'renders key frames from the real out/<name>.mp4 via tile.mjs\'s gradeable/renderOf; the automated half is prep, the verdict is a human/agent reading real pixels'],
  'motion-floor.mjs': ['result', '"Requires out/<name>.mp4"; measures real changed-pixel regions between decoded frames'],
  'motion-split.mjs': ['result', 'imports puppeteer to screenshot the live rendered frame'],
  'pace-check.mjs': ['mechanism', 'duration/beat-count timing math from the declared JSON, no render'],
  'paints-nothing.mjs': ['result', 'imports puppeteer, calls the engine\'s renderFrame() in a real browser and samples real pixels'],
  'plan-vs-render.mjs': ['mechanism', 'own comment: "make judge... belongs to... the pixels, and your eyes" (i.e. not this gate); derives events purely from declared spans/motion keys/boundary arrays'],
  'preflight.mjs': ['process', 'checks a receipt (harness/lib/receipt.mjs) recording whether the decision chain was RUN for this version; never reads the film\'s craft'],
  'read-check.mjs': ['mechanism', 'word-count vs on-screen duration, both read from the declared JSON'],
  'seam-forensics.mjs': ['result', 'requireTool(\'ffprobe\') on the real rendered mp4'],
  'seam-snap.mjs': ['result', 'own comment: "It reads the real rendered pixels (not renderFrame)... Requires out/<name>.mp4"'],
  'storyboard-check.mjs': ['mechanism', 'checks the storyboard.md table for missing beats/fields; the authored PLAN, not the render'],
  'study-check.mjs': ['process', 'checks a REFERENCE STUDY\'s completeness (grammar/<name>.json + refs/<name>/pages.*); the census wires it a film NAME where its contract wants a studied reference NAME, a contract mismatch, not a film judgment'],
  'study-verify.mjs': ['result', 'draft-renders the film itself and studies the resulting mp4 against the scene\'s own declared ground truth'],
  'sweep-static.mjs': ['result', '"Requires out/<name>.mp4"; ffprobe + real frame-to-frame pixel diff'],
  'waiver-drift.mjs': ['process', 'own comment: "It never blocks"; reports waiver-sharing patterns across the library, not this film\'s craft'],
  'next.mjs': ['process', 'own comment: "RUN THE ONE COMMAND THE STAGE NAMES. Nothing more."; a status/dispatch tool, not a judgment'],
};

// ---- code -> owning gate, and code -> waiver count, so a gate's row can carry ITS waivers ----
function codeOwners() {
  const emitted = codesEmitted(); // Map<code, Set<file>>
  const owner = new Map();
  for (const [code, files] of emitted) {
    const gateFiles = [...files].filter((f) => f.startsWith('quality/gates/'));
    // author-check.mjs aggregates; prefer the sub-gate that actually owns the code, same rule
    // harness/lib/code-fires.mjs's gateForCode uses, so this table and that module never disagree.
    const preferred = gateFiles.find((f) => f !== 'quality/gates/author-check.mjs') || gateFiles[0];
    if (preferred) owner.set(code, path.basename(preferred));
  }
  return owner;
}

function waiversByGate() {
  const owner = codeOwners();
  const perCode = new Map(); // code -> { total, films: Set }
  const sceneDir = path.join(ROOT, 'films', 'scene');
  for (const file of fs.readdirSync(sceneDir).filter((f) => f.endsWith('.json'))) {
    let scene;
    try { scene = JSON.parse(fs.readFileSync(path.join(sceneDir, file), 'utf8')); } catch { continue; }
    const allow = scene?.authoring?.allow;
    if (!Array.isArray(allow)) continue;
    for (const entry of allow) {
      const { code } = splitWaiver(entry);
      if (!perCode.has(code)) perCode.set(code, { total: 0, films: new Set() });
      const c = perCode.get(code);
      c.total++; c.films.add(file);
    }
  }
  const perGate = new Map(); // gate basename -> { total, codes: Map<code,count> }
  for (const [code, { total, films }] of perCode) {
    const gate = owner.get(code);
    if (!gate) continue; // a waived code no known gate emits any more (waiver-drift's own RETIRED case)
    if (!perGate.has(gate)) perGate.set(gate, { total: 0, codes: new Map() });
    const g = perGate.get(gate);
    g.total += total;
    g.codes.set(code, (g.codes.get(code) || 0) + total);
    void films;
  }
  return perGate;
}

// ---- the corrected census: run it fresh, or reuse one already run (GATE_CENSUS_JSON) for iteration ----
function loadCensus() {
  const override = process.env.GATE_CENSUS_JSON;
  const tmp = override ? path.resolve(ROOT, override) : path.join(ROOT, 'out', `.gate-classification-census-${process.pid}.json`);
  if (!override) {
    console.error('  running harness/dev/gate-census.mjs for the corrected fire/refuse numbers (this renders nothing new, but runs every gate over every local authored film, so it is not instant)...');
    execFileSync('node', ['harness/dev/gate-census.mjs', '--json', path.relative(ROOT, tmp)], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  }
  const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  if (!override) fs.rmSync(tmp, { force: true });
  return data;
}

function main() {
  const files = allGateFiles();
  const filmGateSet = new Set(Object.keys(FILM_CHECKS));
  const census = loadCensus();
  const censusByFile = new Map(census.results.map((r) => [r.file, r]));
  const waivers = waiversByGate();

  const rows = [];
  const unclassified = [];
  for (const file of files) {
    if (!filmGateSet.has(file)) continue; // out of scope: doesn't judge a film (repo scan / library / other tool / reporter / unclassified in the census itself)
    const c = CLASSIFY[file];
    if (!c) { unclassified.push(file); continue; }
    const [kind, why] = c;
    const cen = censusByFile.get(file);
    const w = waivers.get(file);
    rows.push({
      file, kind, why,
      filmsRun: cen?.filmsRun ?? 0, filmsFired: cen?.filmsFired ?? 0,
      filmsRefused: cen?.filmsRefused ?? 0, filmsCouldNotRun: cen?.filmsCouldNotRun ?? 0,
      waived: w?.total ?? 0, waivedCodes: w ? [...w.codes.entries()].sort((a, b) => b[1] - a[1]) : [],
    });
  }
  rows.sort((a, b) => b.filmsRefused - a.filmsRefused || a.file.localeCompare(b.file));

  const outOfScope = files.filter((f) => !filmGateSet.has(f));
  const KIND_LABEL = { mechanism: 'MECHANISM', result: 'RESULT', process: 'PROCESS', aggregator: 'AGGREGATOR' };

  const lines = [];
  lines.push('---');
  lines.push('when: deciding whether a blocking gate is worth trusting, or picking which one to fix/reclassify/demote next');
  lines.push('answers: "for every gate under quality/gates/ that judges a FILM: does it measure a MECHANISM in the declared JSON or the RESULT in the rendered pixels (or neither: PROCESS/AGGREGATOR), its corrected fire/refuse rate, and how many films waive it"');
  lines.push('group: process');
  lines.push('---');
  lines.push('');
  lines.push('# GATE-CLASSIFICATION.md: mechanism, or result?');
  lines.push('');
  lines.push('_GENERATED by `node quality/gates/gate-classification.mjs`. Do not hand-edit; edit the CLASSIFY table in that');
  lines.push('file (each entry is evidence cited from the gate\'s own source, never a keyword guess) and regenerate._');
  lines.push('');
  lines.push('The thesis this table exists to check (`engine-doctrine/gates-measure-the-result` plan): a gate that COUNTS a');
  lines.push('mechanism in the JSON (an entry in `transitions[]`, a background preset, `parts` on a parent group)');
  lines.push('misfires on any film whose craft uses a different mechanism to reach the same result. A gate that MEASURES');
  lines.push('the result (real luminance across the real rendered seam, real changed pixels between real frames) does');
  lines.push('not. `vawe-flow-2.json` is the film that proved it: four MECHANISM codes fired on it wrongly, while');
  lines.push('`seam-snap.mjs`, a RESULT gate, passed it clean.');
  lines.push('');
  lines.push('**refused** = the gate ran and found a real problem. **no-run** = a precondition was absent (no render, no');
  lines.push('receipt, no reference, a timeout) and the gate never got to measure anything; both used to be counted as');
  lines.push('one "blocked" number (`harness/dev/gate-census.mjs`, before this table\'s Task 0). **waived** = an author');
  lines.push('wrote `authoring.allow` against a code this gate owns: the closest thing to a vote against the rule.');
  lines.push('');
  lines.push(`Corrected against ${census.films.length} locally authored film(s) (films/scene/*.json is gitignored, so this`);
  lines.push('number moves with the checkout; quote it alongside the percentages or they mean nothing).');
  lines.push('');
  lines.push('| gate | kind | why | run | fired | refused | no-run | waived |');
  lines.push('|---|---|---|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    lines.push(`| \`${r.file}\` | ${KIND_LABEL[r.kind]} | ${r.why} | ${r.filmsRun} | ${r.filmsFired} | ${r.filmsRefused} | ${r.filmsCouldNotRun} | ${r.waived} |`);
  }
  lines.push('');

  const withWaivers = rows.filter((r) => r.waived > 0);
  if (withWaivers.length) {
    lines.push('## Waived codes, by owning gate');
    lines.push('');
    for (const r of withWaivers) {
      lines.push(`- \`${r.file}\`: ${r.waivedCodes.map(([code, n]) => `${code} (${n})`).join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## Out of scope: reads neither a film nor a render');
  lines.push('');
  lines.push('Doc checks, registry drift, repo-wide hygiene, docker context. Correct as they are; this table is about');
  lines.push('gates that judge FILMS.');
  lines.push('');
  const label = (f) => (f.endsWith('.test.mjs') ? 'test file (run via lib-test.mjs, not censused directly)'
    : LIBRARIES.includes(f) ? 'library (no CLI)'
    : OTHER_TOOLS.includes(f) ? 'other tool (N-file/baseline/probe CLI)'
    : REPORTERS.includes(f) ? 'reporter (never fails)'
    : REPO_CHECKS.includes(f) ? 'repo-wide scan'
    : 'unclassified in gate-census.mjs itself (not in any of its FILM_CHECKS/REPO_CHECKS/LIBRARIES/OTHER_TOOLS/REPORTERS lists: add it there before trusting this census)');
  lines.push(`${outOfScope.length} file(s): ${outOfScope.map((f) => `\`${f}\` (${label(f)})`).join(', ')}`);
  lines.push('');

  if (unclassified.length) {
    lines.push('## UNCLASSIFIED');
    lines.push('');
    lines.push('These are wired into `harness/dev/gate-census.mjs`\'s FILM_CHECKS (they take a film and judge it) but this');
    lines.push('table has no evidenced row for them yet. Add one to the CLASSIFY table in');
    lines.push('`quality/gates/gate-classification.mjs`, cited from the file\'s own source, and regenerate.');
    lines.push('');
    for (const f of unclassified) lines.push(`- \`${f}\``);
    lines.push('');
  }

  const total = rows.length + outOfScope.length + unclassified.length;
  lines.push(`\n_${rows.length} film-judging gate(s) classified, ${outOfScope.length} out of scope, ${unclassified.length} unclassified: ${total} of ${files.length} file(s) under quality/gates/._\n`);

  fs.writeFileSync(OUT_DOC, lines.join('\n'));
  console.error(`  wrote ${path.relative(ROOT, OUT_DOC)}: ${rows.length} classified, ${outOfScope.length} out of scope, ${unclassified.length} unclassified`);
}

main();
