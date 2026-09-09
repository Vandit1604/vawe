#!/usr/bin/env node
// quality/gates/stage.mjs: WHERE IS THIS FILM, and what is the ONE next thing to do.
//
//   make stage D=formats/scene/<film>.json   ·   node quality/gates/stage.mjs <film> [--json]
//   make stage                                  · no film yet: the roster, and the one furthest from done
//   make stage Q="make a launch video for x"    · no film yet EITHER: what to even start
//
// Every stage below already had a command. What did not exist was anything that knew which stage a
// film was IN, so the order lived only in prose in AGENTS.md, and prose is a suggestion. An author who
// can quote the order still runs it backwards five hours into a session (docs/MISTAKES.md #591, #595).
//
// STATE IS DERIVED FROM ARTIFACTS, NEVER STORED. A state file drifts from the repo the moment someone
// deletes a fragment by hand, and then it is a confident liar. A storyboard that exists cannot lie
// about existing. The one thing not derivable is APPROVAL, which is a human act, so it is a line a
// human writes (`/vawe-approve`) and that scripts/live/stage-gate.mjs refuses to let an agent write.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseStoryboard, blocksOf, fieldIn, frontmatter } from '../../scripts/author/storyboard-parse.mjs';
import { population, LIBRARY } from '../../scripts/lib/census.mjs';
import { route } from '../../scripts/author/route.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Same order stageOf() builds S in. A second copy, not a derived one, because ranking the roster needs
// the order BEFORE any single film's stageOf() has run.
export const STAGE_ORDER = ['brief', 'plan', 'approval', 'design', 'assemble', 'direct', 'render', 'judge'];

/** Every path a film owns, resolved the same way author-check and studio resolve them. */
export function filePaths(arg) {
  const raw = String(arg || '').replace(/\.(json|storyboard\.md)$/, '');
  const base = raw.includes('/') ? raw : path.join('formats/scene', raw);
  const scene = path.join(ROOT, base + '.json');
  let named = null;
  try { const d = JSON.parse(fs.readFileSync(scene, 'utf8'));
    if (typeof d.storyboard === 'string') named = path.join(ROOT, d.storyboard); } catch { /* not written yet */ }
  const sb = [named, path.join(ROOT, base + '.storyboard.md')].find((f) => f && fs.existsSync(f)) || path.join(ROOT, base + '.storyboard.md');
  return { name: path.basename(base), base, scene, sb, brief: path.join(ROOT, base + '.brief.md'),
    mp4: path.join(ROOT, 'out', path.basename(base) + '.mp4') };
}

const gatePasses = (script, file) => {
  try { execFileSync(process.execPath, [path.join(ROOT, script), file], { encoding: 'utf8', stdio: 'pipe' }); return true; }
  catch { return false; }
};

// The stages, in order. Each names the ONE command that moves the film out of it. `done` is asked in
// order and the FIRST stage that is not done is where the film is: a film cannot be at `build` while
// its plan is unapproved, and expressing that as an ordered list rather than a set of flags is what
// makes skipping a stage unrepresentable rather than merely discouraged.
export function stageOf(arg) {
  const p = filePaths(arg);
  const sceneExists = fs.existsSync(p.scene);
  const scene = sceneExists ? (() => { try { return JSON.parse(fs.readFileSync(p.scene, 'utf8')); } catch { return null; } })() : null;
  const sbExists = fs.existsSync(p.sb);
  const sbSrc = sbExists ? fs.readFileSync(p.sb, 'utf8') : '';
  const sb = sbExists ? parseStoryboard(sbSrc) : null;
  const approved = sbExists ? frontmatter(sbSrc).field('approved') : null;
  const fragments = sbExists
    ? blocksOf(sbSrc).map((b) => (fieldIn(b, 'fragment') || '').split(/\s+\(/)[0].trim()).filter(Boolean)
    : [];
  const missingFrags = [...new Set(fragments)].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  const layers = (scene && Array.isArray(scene.layers) ? scene.layers : []).length;

  const S = [
    { id: 'brief', done: fs.existsSync(p.brief) || sbExists,
      why: 'nobody has asked what this film is about. A brief is five lines and any of them missing changes the film.',
      next: `make quiz NAME=${p.name} URL=<the product site>   (no site? docs/CRAFT/AUTHORING-WALKTHROUGH.md, and write ${path.relative(ROOT, p.brief)} by hand)` },
    { id: 'plan', done: sbExists && gatePasses('quality/gates/storyboard-check.mjs', p.sb),
      why: sbExists ? 'the storyboard exists and does not pass its own gate yet.' : 'there is no storyboard. Every role that writes into the film transcribes it, so a gap here becomes an invention further down.',
      next: sbExists ? `make storyboard-check SB=${path.relative(ROOT, p.sb)}` : `make scaffold OUT=${p.base}.json THEME=<theme> DUR=<seconds>` },
    { id: 'approval', done: !!approved,
      why: 'the plan passes and nobody has signed it off. Nothing is rendered until the plan is LOCKED and the user signs off.',
      next: `make studio D=${p.base}.json   (press 1 for the plan, then the USER runs /vawe-approve ${p.name})` },
    { id: 'design', done: sbExists && missingFrags.length === 0 && gatePasses('quality/gates/frame-check.mjs', p.scene),
      why: missingFrags.length
        ? `${missingFrags.length} fragment(s) the plan names do not exist yet: ${missingFrags.join(', ')}`
        : 'the fragments exist and do not match what their beats planned: run frame-check and read it.',
      next: missingFrags.length ? `node scripts/author/stagekit.mjs ${p.base}.json, then author each fragment: stage kit → the reference's grammar → the smallest useful ui-skills set (command npx -y ui-skills categories) → make preview HTML=<frag> THEME=<theme> → look at it` : `make frame-check D=${p.base}.json` },
    { id: 'assemble', done: layers > 0,
      why: 'the frames are approved and the scene JSON has no layers, so there is no film yet.',
      next: `make assemble D=${p.base}.json` },
    { id: 'direct', done: layers > 0 && (Array.isArray(scene.transitions) ? scene.transitions.length : 0) > 0,
      why: 'the layers exist and no cut does. Motion first, then transitions: a content-aware cut reads the velocity at the joint.',
      next: `make critics D=${p.base}.json DECIDERS=1   (motion, then transition, then sound, in that order)` },
    { id: 'render', done: fs.existsSync(p.mp4),
      why: 'the film is written and has never been rendered.',
      next: `make ship D=${p.base}.json` },
    { id: 'judge', done: false,
      why: 'rendered. The eye is the only step that SEES, and it is not optional.',
      next: `make judge D=${p.base}.json, then make ledger D=${p.base}.json` },
  ];
  const at = S.find((s) => !s.done) || S[S.length - 1];
  return { ...p, stage: at.id, why: at.why, next: at.next, order: S.map((s) => s.id),
    approved: approved || null, fragments: [...new Set(fragments)], missingFrags, layers, sbExists, sceneExists };
}

/**
 * Every film in the library, staged. Reuses scripts/lib/census.mjs's LIBRARY filter rather than a
 * second walk of formats/scene/: one owner for "which files count as a film" (docs/MISTAKES.md #391).
 * A film that errors while staging (unparseable storyboard, say) is reported, not thrown, because one
 * bad film should not blind the roster to the rest.
 */
export function roster({ all = false, cap = 12 } = {}) {
  const pop = population('stage roster', { filter: LIBRARY, quiet: true });
  // A LEADING UNDERSCORE IS THIS REPO'S SCRATCH CONVENTION, and 164 of the 176 films in this library
  // are probes: _catalog-1, _camera-blur-probe, _auto-orient. Listing them alphabetically puts every
  // throwaway ahead of every real film, so the front door opened on 176 rows of test scenes. A front
  // door that answers with the whole directory is not an answer. `--all` still prints everything.
  const names = all ? pop.names : pop.names.filter((f) => !path.basename(f).startsWith('_'));
  const rows = names.map((f) => {
    const base = f.replace(/\.json$/, '');
    try { const st = stageOf(base); return { name: st.name, stage: st.stage, next: st.next, ok: true }; }
    catch (err) { return { name: base, stage: 'error', next: String(err && err.message || err), ok: false }; }
  });
  rows.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const worst = rows.find((r) => r.ok) || rows[0] || null;
  // Furthest from done first, then capped: the rows that matter are the unfinished ones, and a film
  // already at judge needs no prompting. `total` counts what was found, `rows` is what is worth reading.
  const shown = all ? rows : rows.slice(0, cap);
  return { n: rows.length, total: pop.names.length, rows: shown, hidden: rows.length - shown.length, worst };
}

// Stage 1 has no film yet, so stageOf() has nothing to read. What DOES exist is the same deliverable
// router the planning skill uses (scripts/author/route.mjs), reachable so far only by an agent that
// already knew it existed. Q= runs it and states the same brief-stage answer stageOf() would once a
// storyboard exists: what this film is, and the one command that starts it.
function briefFor(q) {
  const matched = route(q);
  const next = `make quiz NAME=<name> URL=<the product site>   (no site? docs/CRAFT/AUTHORING-WALKTHROUGH.md)`;
  return { stage: 'brief', request: q, deliverable: matched.name, intake: matched.intake, next };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const qIdx = argv.indexOf('--q');
  const q = qIdx >= 0 ? argv[qIdx + 1] : null;
  const skip = qIdx >= 0 ? [qIdx, qIdx + 1] : [];
  const arg = argv.filter((a, i) => a !== '--json' && !skip.includes(i) && a).find((a) => !a.startsWith('--')) || process.env.D || null;

  if (q) {
    const b = briefFor(q);
    if (json) { console.log(JSON.stringify(b, null, 2)); process.exit(0); }
    console.log(`\n  "${q}" is at stage BRIEF: no film exists yet.`);
    console.log(`  deliverable: ${b.deliverable}`);
    console.log('  intake:');
    for (const line of b.intake) console.log(`    - ${line}`);
    console.log(`\n  do:  ${b.next}\n`);
    process.exit(0);
  }

  if (!arg) {
    const r = roster({ all: argv.includes('--all') });
    if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    const scratch = r.total - r.n;
    console.log(`\n  ${r.n} film(s)${scratch > 0 ? `, and ${scratch} scratch scene(s) not listed` : ''}\n`);
    for (const row of r.rows) console.log(`  ${row.stage.toUpperCase().padEnd(9)} ${row.name}`);
    if (r.hidden > 0) console.log(`\n  ...and ${r.hidden} further along. \`make stage --all\` lists every one.`);
    if (r.worst) console.log(`\n  furthest from done: ${r.worst.name} (${r.worst.stage.toUpperCase()})`
      + `\n  do:  ${r.worst.next}\n`);
    else console.log('');
    process.exit(0);
  }

  const st = stageOf(arg);
  if (json) { console.log(JSON.stringify(st, null, 2)); process.exit(0); }
  const line = st.order.map((id) => (id === st.stage ? `[${id}]` : id)).join(' → ');
  console.log(`\n  ${st.name} is at stage ${st.stage.toUpperCase()}`);
  console.log(`  ${line}`);
  console.log(`\n  why: ${st.why}`);
  console.log(`  do:  ${st.next}\n`);
}
