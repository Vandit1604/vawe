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
    // The one signal the judge's self-recorded-PASS refusal reads (quality/gates/judge.mjs): which
    // Claude Code session made this run. Auto-captured, never passed by a caller, so it cannot be
    // spoofed by a call site forgetting to set it. Null outside Claude Code (a human's own shell).
    session: process.env.CLAUDE_CODE_SESSION_ID || null,
    git,
    dirty,
    checks: record.checks || [],
    render: record.render || null,
    content: record.content || null,
    judge: record.judge || null,
    knowledge: record.knowledge || null,
    refusal: record.refusal || null,
    craftLive: record.craftLive || null,
    sceneLive: record.sceneLive || null,
    wallMs: Number.isFinite(record.wallMs) ? record.wallMs : null,
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
