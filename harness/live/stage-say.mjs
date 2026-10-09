#!/usr/bin/env node
// UserPromptSubmit hook: names the one next command for the page film edited most recently.
// Silent when no films/*/page.html changed in the last RECENT_MS, so a framework session sees nothing.
//   node harness/live/stage-say.mjs [--reset]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { movesTaken, boardFilled, motionFilled, boardChecks, spectacleOf } from '../lib/board.mjs';

export { boardFilled };

const RECENT_MS = 3 * 60 * 60 * 1000;
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

// A checkout rewrites mtimes, so only a page git sees as changed or new counts as being worked on.
function pages(root) {
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'films'], { cwd: root, encoding: 'utf8' });
  return (r.stdout || '').split('\n').map((l) => l.slice(3).trim())
    .filter((p) => p.endsWith('/page.html')).map((p) => path.join(root, p));
}

const hasWorlds = (page) => { try { return /\bdata-world=/.test(fs.readFileSync(page, 'utf8')); } catch { return false; } };

const TAKEN_FROM_MIN = 4;
const FRAME_PATH = /\.(png|jpe?g|webp)\b/i;

/** How many frames the brief's "Taken from" table names; null when the brief has no such section (an older film). */
export function takenFromCount(brief) {
  const section = brief.split(/^## /m).find((s) => s.startsWith('Taken from'));
  if (section === undefined) return null;
  return section.split('\n').filter((l) => l.startsWith('|') && FRAME_PATH.test(l.split('|')[1]) && !l.split('|')[1].trim().startsWith('[')).length;
}

const MOVES_MIN = 3;

/** How many moves the "Taken from" study names (rows of the "Moves taken" table past its header); null when the brief has no such table. */
export function movesTakenCount(brief) {
  return brief.includes('| move taken') ? movesTaken(brief).length : null;
}

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

export const RUNGS = ['builder', 'type', 'colour', 'depth', 'frame'];

export function missingRungs(design) {
  return RUNGS.filter((rung) => {
    const name = rung === 'colour' ? 'colou?r' : rung;
    return !new RegExp(`^\\W*(skill[ \\t]+${name}[ \\t]*:[ \\t]*\\S+.*:[ \\t]*\\S|skipped[ \\t]+${name}[ \\t]*:[ \\t]*\\S)`, 'im').test(design);
  });
}

/**
 * The one owner of the stage order (AGENTS.md, The loop). Each entry is the text of one command line; the verbs in
 * harness/cli/verbs.mjs print these after they run, so a verb and this hook never name different next steps.
 */
export const WAIT_WORK = "while it renders, fill the brief's Board and Motion pass rows if empty, Read the bin/vawe strip <page> --cuts grids, or prepare the critique notes";

export const SAY = {
  study: (name) => `bin/vawe refs list, bin/vawe refs frames <id>, Read the frames at full size, then fill "Taken from" in films/${name}/brief.md: ${TAKEN_FROM_MIN} to 6 frames, exact path and what you take`,
  moves: () => `bin/vawe strip <ref-id> --cuts on 2 reference films, Read every strip, then name ${MOVES_MIN} moves in "Taken from" (ref id, cut second)`,
  design: (name) => `write films/${name}/DESIGN.md and films/${name}/kit/ (format: skills/vawe-page/SKILL.md, example: films/examples/colour-sting/kit/)`,
  skills: (name, rungs) => `add to films/${name}/DESIGN.md one line per rung (${rungs.join(', ')}): "Skill <rung>: <slug>: what it decided", or "Skipped <rung>: <reason>"; list the skills with command npx -y ui-skills list`,
  states: (name, rel) => `build one static state per world in ${rel} from the kit, no motion yet, then bin/vawe frames ${rel}`,
  frames: (name, rel) => `bin/vawe frames ${rel}`,
  board: (name) => `fill "Board" in films/${name}/brief.md: rhythm, spectacle, a move per cut, sound`,
  dev: (name, rel) => `bin/vawe dev ${rel}`,
  motion: (name, rel) => `bin/vawe strip ${rel} --cuts and Read every cut at full size; for the spectacle second also bin/vawe onion ${rel} --at <s> and bin/vawe velocity ${rel} --at <s>; fix what reads flat`,
  motionRows: (name) => `write one row per cut in "Motion pass" in films/${name}/brief.md: what read flat, what you fixed`,
  critique: (name, rel) => `bin/vawe critique ${rel}`,
  judge: (name, rel, ref) => `VAWE_AGENT=judge-${name} bin/vawe judge ${rel} --struct --runs A,B${ref ? ` --ref ${ref}` : ''} in a fresh session, then fix the named seconds with bin/vawe dev ${rel} --from s --to s`,
  ship: (name, rel) => `bin/vawe ship ${rel}, then bin/vawe ship --status ${rel} --wait (one call blocks up to 9 minutes; run it once, not in parallel); ${WAIT_WORK}`,
};

export function nextStep(page, root = process.cwd()) {
  const name = path.basename(path.dirname(page));
  const rel = path.relative(root, page);
  const dir = path.dirname(page);
  const t = mtime(page);
  const draft = mtime(path.join(root, 'out', `${name}-draft.mp4`));
  const final = mtime(path.join(root, 'out', `${name}.mp4`));
  const framed = mtime(path.join(root, 'out', `${name}-frames.png`)) > t;
  const stripped = mtime(path.join(root, 'out', 'strip', name)) > draft;
  const brief = read(path.join(dir, 'brief.md'));
  const design = path.join(dir, 'DESIGN.md');
  const taken = takenFromCount(brief);
  const moves = movesTakenCount(brief);
  const early = !draft && !final && !framed;
  if (early && !brief) {
    return { name, next: `create films/${name}/brief.md: the ask, the message, the spectacle second, "Taken from", "Board" (bin/vawe new <other-name> writes the template to copy)`, why: `films/${name} has no brief.md` };
  }
  if (early && taken !== null && taken < TAKEN_FROM_MIN) {
    return { name, next: SAY.study(name), why: `Taken from not filled (${taken} named frames); it comes before the design files` };
  }
  if (early && moves !== null && moves < MOVES_MIN) {
    return { name, next: SAY.moves(), why: `${moves} moves named; motion is studied before the board` };
  }
  if (early && taken !== null && !mtime(design)) {
    return { name, next: SAY.design(name), why: 'the design system and the asset kit come before the states' };
  }
  const rungs = early && taken !== null ? missingRungs(read(design)) : [];
  if (rungs.length) {
    return { name, next: SAY.skills(name, rungs), why: `DESIGN.md has no Skill line for ${rungs.join(', ')}; one skill per rung is applied before the states (advice: a rung you skip needs a "Skipped <rung>: <reason>" line)` };
  }
  if (early && taken !== null && t <= mtime(design)) {
    return { name, next: SAY.states(name, rel), why: 'DESIGN.md is newer than the page; the states come before the frames and the motion' };
  }
  if (early && hasWorlds(page)) return { name, next: SAY.frames(name, rel), why: 'the frames come before the motion' };
  if (!draft && !final && boardFilled(brief) === false) {
    return { name, next: SAY.board(name), why: 'the board is a plan for time and comes after the states, before the motion' };
  }
  const boardAdvice = !draft && !final && boardFilled(brief) ? boardChecks(brief, spectacleOf(read(page))) : [];
  if (boardAdvice.length) {
    return { name, next: `check "Board" in films/${name}/brief.md (advice; a plan you keep on purpose needs no change), then ${SAY.dev(name, rel)}`, why: boardAdvice.map((l) => l.replace(/^board: /, '')).join('; ') };
  }
  if (draft < t && final < t) return { name, next: SAY.dev(name, rel), why: 'the page changed after its last draft' };
  if (final < t && !stripped) return { name, next: SAY.motion(name, rel), why: 'a draft exists; the motion pass comes before the critique (dev: overshoot-share, live-hold and seam-variety clean or waived with a reason)' };
  if (final < t && motionFilled(brief) === false) return { name, next: SAY.motionRows(name), why: 'the cuts are stripped; the Motion pass section is empty' };
  if (final < t) return { name, next: SAY.critique(name, rel), why: 'the motion pass is done; critique the draft in a fresh session, fix the named seconds, then bin/vawe ship' };
  return { name, next: SAY.critique(name, rel), why: 'the final is rendered; a fresh session judges it' };
}

function main() {
  if (process.argv.includes('--reset')) return;
  const root = process.cwd();
  const recent = pages(root).map((p) => ({ p, t: mtime(p) })).filter((x) => Date.now() - x.t < RECENT_MS).sort((a, b) => b.t - a.t);
  if (!recent.length) return;
  const s = nextStep(recent[0].p, root);
  console.log(`vawe: ${s.name}: ${s.why}.\n  next: ${s.next}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
