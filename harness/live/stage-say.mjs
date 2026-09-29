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

export function nextStep(page, root = process.cwd()) {
  const name = path.basename(path.dirname(page));
  const rel = path.relative(root, page);
  const t = mtime(page);
  const draft = mtime(path.join(root, 'out', `${name}-draft.mp4`));
  const final = mtime(path.join(root, 'out', `${name}.mp4`));
  if (draft < t && final < t) return { name, next: `make dev PAGE=${rel}`, why: 'the page changed after its last draft' };
  if (final < t) return { name, next: `make critique PAGE=${rel}`, why: 'a draft exists; critique it in a fresh session, fix the named seconds, then make ship' };
  return { name, next: `make critique PAGE=${rel}`, why: 'the final is rendered; a fresh session judges it' };
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
