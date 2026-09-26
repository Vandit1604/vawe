// quality/gates/backdrop-turn.mjs: does this film's backdrop change TONE across its own run, or does
// it hold one preset from the first frame to the last?
//
// engine-doctrine/CRAFT/rules/direction.json's `direction.world-turns` record has stood as
// `check: null` since the rules migration: "The backdrop changes tone per beat, or the film is a
// slide with effects on it" (engine-doctrine/RULES/world-turns.md), with nothing checking it.
// quality/gates/direction-floor.mjs's `no-bg-motion` is a NEIGHBOUR, not this rule: it asks whether
// the declared preset carries its OWN internal motion (drift, a period, anything but a flat colour),
// a fact about one window. This asks whether the film moves through more than one window at all, a
// fact about the film's own timeline, read nowhere else (confirmed by reading direction-floor.mjs
// bgMotion, quality/gates/backdrop-turn.test.mjs pins the distinction so the two do not collapse back
// into one check later).
//
// THE COMPARISON IS ENTIRELY WITHIN THE FILM. `scene.bg` is an array of windows, each an authored
// `{ preset, from, to, ... }`. Zero or one window, or every window sharing the same preset AND the
// same non-time options, means the tone never turns: the film held one backdrop the whole way and
// whatever moves on top of it is doing the film's only work. No external number decides this, only
// whether two of the film's own windows read the same or different.
//
// BLOCKS, wired into quality/gates/author-check.mjs's LADDER (tier: blocks). The owner reviewed the
// census this file already printed, 142 of 181 graded films firing, and confirmed it reads the library
// correctly rather than over-firing, then asked for it to stop a film. The standard
// `authoring.allow: ["backdrop-never-turns"]` + `_why` waiver is the only door out, same as every other
// blocking rule; no exemption list, no second mechanism. Untouched films are unaffected: author-check
// runs on changed scenes only (.github/workflows/scene-check.yml).
//
//   node quality/gates/backdrop-turn.mjs <scene.json>    (exits 1 if backdrop-never-turns fires)
//   node quality/gates/backdrop-turn.mjs                 (census: every films/scene/*.json, exits 0)
//   make check GATE=backdrop-turn [D=scene.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { population, SCENE_DIR, AUTHORED } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('.') && a.endsWith('.json'));

/** windowKey(w): everything about a bg window EXCEPT its time span, so two windows that paint the
 * same tone at different moments still compare equal. */
function windowKey(w) {
  const { from, to, ...rest } = w || {};
  return JSON.stringify(rest, Object.keys(rest).sort());
}

/** turns(scene): true when the film's own bg windows disagree with each other at least once. Null
 * (not gradeable) when the film declares no bg array to compare at all: some films paint their
 * backdrop through a layer instead, and this check has no subject there, never a false pass. */
export function turns(scene) {
  const bg = Array.isArray(scene.bg) ? scene.bg : (scene.bg ? [scene.bg] : null);
  if (!bg || bg.length === 0) return null;
  if (bg.length === 1) return false;
  const keys = new Set(bg.map(windowKey));
  return keys.size > 1;
}

function checkOne(f, quiet) {
  const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const scene = loadScene(structuredClone(raw));
  const name = path.basename(abs, '.json');
  const t = turns(scene);
  if (t === null) { if (!quiet) console.log(`  · ${name}: no bg[] declared, nothing to compare`); return null; }
  if (t === false) { if (!quiet) console.log(`  ✗ ${name}: backdrop-never-turns`); return true; }
  if (!quiet) console.log(`  ✓ ${name}: backdrop turns`);
  return false;
}

function main() {
  if (file) {
    const f = gateFindings({ scene: file });
    const fired = checkOne(file, true);
    if (fired === true) f.fail('backdrop-never-turns', 'the backdrop holds one preset for the whole film (direction.world-turns): either the tone turns somewhere, or this is a declared slide with effects on it.');
    else if (fired === null) console.log(`  · backdrop-turn · ${path.basename(file)}: no bg[] declared, not gradeable`);
    else console.log(`  ✓ backdrop-turn · ${path.basename(file)}`);
    f.emit();
    if (fired === true) process.exitCode = 1;
    return;
  }
  // AUTHORED, not every .json on disk. This census ran unfiltered once and reported "142 of 181
  // films never turn". films/scene holds 197 .json files and 42 of them are planned films: the rest
  // are catalogue tiles (`_catalog-1` through `_catalog-26`, one frozen frame per block), probes,
  // skill fixtures, plain twins, and sidecars that are not scenes at all (`*.intent.json`,
  // `*.cuts.json`, `hinge.vo.words.json`, `schema.json`, all of which the unfiltered run graded and
  // filed as "no bg[], not gradeable"). A catalogue tile is one held frame; its backdrop was never
  // going to turn, and harness/lib/census.mjs's own header calls grading one of those for motion
  // grading a paint chip for plot. Filtered, the real answer is 24 turn and 18 do not.
  //
  // This filter changes the CENSUS only. Blocking is per film, through author-check's LADDER, and
  // grades whatever film it is pointed at.
  const pop = population('backdrop-turn · corpus', { dir: SCENE_DIR, filter: AUTHORED, quiet: true });
  let fired = 0, graded = 0, ungraded = 0, unreadable = 0;
  for (const name of pop.names) {
    const rel = path.join(SCENE_DIR, name);
    let t;
    try { t = checkOne(rel, true); }
    catch (e) { unreadable++; console.log(`  ? ${name}: could not load (${e.message}), skipped`); continue; }
    if (t === null) ungraded++;
    else { graded++; if (t) fired++; }
  }
  console.log(`\n  backdrop-turn · ${pop.n} film(s), ${graded} graded (${ungraded} carry no bg[], ${unreadable} unreadable)`);
  console.log(`  backdrop-never-turns fires on ${fired} of ${graded} graded film(s)`);
  console.log(`  This census mode always exits 0. A single-scene run (node ${path.basename(import.meta.url)} <scene.json>) blocks in author-check's ladder.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
