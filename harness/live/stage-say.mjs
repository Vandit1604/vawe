#!/usr/bin/env node
// UserPromptSubmit hook: names the one next command for the page film edited most recently.
// Silent when no films/*/page.html changed in the last RECENT_MS, so a framework session sees nothing.
//   node harness/live/stage-say.mjs [--reset]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

export function nextStep(page, root = process.cwd()) {
  const name = path.basename(path.dirname(page));
  const rel = path.relative(root, page);
  const t = mtime(page);
  const draft = mtime(path.join(root, 'out', `${name}-draft.mp4`));
  const final = mtime(path.join(root, 'out', `${name}.mp4`));
  const framed = mtime(path.join(root, 'out', `${name}-frames.png`)) > t;
  const taken = takenFromCount(read(path.join(path.dirname(page), 'brief.md')));
  if (!draft && !final && !framed && taken !== null && taken < TAKEN_FROM_MIN) {
    return { name, next: `fill "Taken from" in films/${name}/brief.md: ${TAKEN_FROM_MIN} to 6 reference frames, exact path and what you take`, why: `Taken from not filled (${taken} named frames); it comes before the design files` };
  }
  if (!draft && !final && !framed && taken !== null && !mtime(path.join(path.dirname(page), 'DESIGN.md'))) {
    return { name, next: `write films/${name}/DESIGN.md and films/${name}/kit/`, why: 'the design system and the asset kit come before the states' };
  }
  if (!draft && !final && !framed && hasWorlds(page)) return { name, next: `bin/vawe frames ${rel}`, why: 'the frames come before the motion' };
  if (draft < t && final < t) return { name, next: `bin/vawe dev ${rel}`, why: 'the page changed after its last draft' };
  if (final < t) return { name, next: `bin/vawe critique ${rel}`, why: 'a draft exists; critique it in a fresh session, fix the named seconds, then bin/vawe ship' };
  return { name, next: `bin/vawe critique ${rel}`, why: 'the final is rendered; a fresh session judges it' };
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
