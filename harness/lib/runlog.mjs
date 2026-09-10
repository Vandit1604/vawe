// harness/lib/runlog.mjs: ONE owner for the run log. Nothing else appends to out/<film>.runs.jsonl
// and nothing else reads it back, so the shape below is the only place the shape can drift.
//
// WHY. Today nothing records which checks ran on a film, which fired, what they blocked, which
// waivers excused what, or the judge verdict. When a render is bad the lead re-derives all of it by
// hand from scrollback that has already scrolled away. This is the observability Fowler's harness
// engineering and 12-factor agents both ask for: know what the harness actually did, not just what it
// printed.
//
// ONE LINE PER appendRun CALL, not one line per `make ship`. A single invocation touches several
// facts at different times (the static ladder finishes, then the render finishes, then later a human
// records a judge verdict), and holding all of them in one process until the end would mean the first
// fact is lost if a later step crashes. `make why` reads every line for a film and can still show them
// together because `at` orders them and `cmd` says which stage each line is.
//
// RECORD SHAPE (the only place it is written down):
//   {
//     at:      ISO timestamp
//     cmd:     "dev" | "check" | "ship" | "judge" | "author-check" | "content-check"
//     git:     short sha, or null outside a git repo
//     dirty:   bool, true if the worktree had uncommitted changes when this line was written
//     checks:  [{ name, ran, fired: n, blocked: bool, codes: [...], waived: [...] }]
//     render:  { file, frames, fps, ms } | null
//     content: <content-check summary> | null
//     judge:   { verdict, file } | null
//   }
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function gitInfo() {
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], opts).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], opts).trim().length > 0;
    return { git: sha || null, dirty };
  } catch { return { git: null, dirty: false }; }
}

/** out/<film-basename>.runs.jsonl for a scene path or bare film name. */
export function runsPathFor(film) {
  const base = path.basename(String(film)).replace(/\.json$/, '');
  return path.join('out', `${base}.runs.jsonl`);
}

/** appendRun(film, record): write one JSON line. Missing fields default to their empty shape. */
export function appendRun(film, record = {}) {
  const { git, dirty } = gitInfo();
  const line = {
    at: new Date().toISOString(),
    cmd: record.cmd || 'unknown',
    git,
    dirty,
    checks: record.checks || [],
    render: record.render || null,
    content: record.content || null,
    judge: record.judge || null,
  };
  const out = runsPathFor(film);
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  fs.appendFileSync(out, JSON.stringify(line) + '\n');
  return line;
}

/** readRuns(film) -> every logged run, oldest first. A corrupt line is dropped, not thrown. */
export function readRuns(film) {
  const p = runsPathFor(film);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}
