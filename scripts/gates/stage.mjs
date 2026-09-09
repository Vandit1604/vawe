#!/usr/bin/env node
// scripts/gates/stage.mjs: WHERE IS THIS FILM, and what is the ONE next thing to do.
//
//   make stage D=formats/scene/<film>.json   ·   node scripts/gates/stage.mjs <film> [--json]
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
import { parseStoryboard, blocksOf, fieldIn, frontmatter } from '../author/storyboard-parse.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
    { id: 'plan', done: sbExists && gatePasses('scripts/gates/storyboard-check.mjs', p.sb),
      why: sbExists ? 'the storyboard exists and does not pass its own gate yet.' : 'there is no storyboard. Every role that writes into the film transcribes it, so a gap here becomes an invention further down.',
      next: sbExists ? `make storyboard-check SB=${path.relative(ROOT, p.sb)}` : `make scaffold OUT=${p.base}.json THEME=<theme> DUR=<seconds>` },
    { id: 'approval', done: !!approved,
      why: 'the plan passes and nobody has signed it off. Nothing is rendered until the plan is LOCKED and the user signs off.',
      next: `make studio D=${p.base}.json   (press 1 for the plan, then the USER runs /vawe-approve ${p.name})` },
    { id: 'design', done: sbExists && missingFrags.length === 0 && gatePasses('scripts/gates/frame-check.mjs', p.scene),
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make stage D=formats/scene/<film>.json'); process.exit(2); }
  const st = stageOf(arg);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(st, null, 2)); process.exit(0); }
  const line = st.order.map((id) => (id === st.stage ? `[${id}]` : id)).join(' → ');
  console.log(`\n  ${st.name} is at stage ${st.stage.toUpperCase()}`);
  console.log(`  ${line}`);
  console.log(`\n  why: ${st.why}`);
  console.log(`  do:  ${st.next}\n`);
}
