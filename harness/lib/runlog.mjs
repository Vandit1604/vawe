import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PROCESS_ID = randomBytes(2).toString('hex');
const RUNS_SUFFIX = '.runs.jsonl';

function gitInfo() {
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], opts).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], opts).trim().length > 0;
    return { git: sha || null, dirty };
  } catch { return { git: null, dirty: false }; }
}

/** A film's key: its file name, or its folder name for a page (films/<name>/page.html). */
export function filmKeyOf(film) {
  const name = path.basename(String(film));
  if (name === 'page.html') return path.basename(path.dirname(path.resolve(String(film))));
  return name.replace(/\.(json|mp4|webm)$/, '').replace(/\.web$/, '').replace(/-draft(-[\d.]+-[\d.]+)?$/, '');
}

/** out/<film-key>.runs.jsonl for a scene path, a page path or a bare film name. */
export function runsPathFor(film) {
  return path.join('out', `${filmKeyOf(film)}${RUNS_SUFFIX}`);
}

// An Agent-tool subagent shares the session id and CLAUDE_PID with its parent (measured 2026-09-27), so
// only VAWE_AGENT names an agent. Without it the id is the session plus one random tag per process: it
// groups nothing across commands, and `namedAgent` tells it from a real name by the "#".
export function agentId() {
  if (process.env.VAWE_AGENT) return process.env.VAWE_AGENT;
  const session = process.env.CLAUDE_CODE_SESSION_ID;
  return `${session ? session.slice(0, 8) : 'shell'}#${PROCESS_ID}`;
}

/** The agent id when a person or a brief chose it (VAWE_AGENT), else null. Old records hold a CLAUDE_PID, which counts as a name. */
export const namedAgent = (agent) => (agent && !String(agent).includes('#') ? String(agent) : null);

/** appendRun(film, event): write one JSON line, the event's own fields after the common ones (harness/lib/run-events.mjs builds them). */
export function appendRun(film, event = {}) {
  const { git, dirty } = gitInfo();
  const line = {
    at: new Date().toISOString(),
    cmd: event.cmd || 'unknown',
    film: filmKeyOf(film),
    session: process.env.CLAUDE_CODE_SESSION_ID || null,
    agent: agentId(),
    model: process.env.VAWE_MODEL || null,
    git,
    dirty,
    ...event,
  };
  const out = runsPathFor(film);
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  fs.appendFileSync(out, JSON.stringify(line) + '\n');
  return line;
}

const parseRuns = (text) => text.split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

/** readRuns(film) -> every logged run, oldest first. A corrupt line is dropped, not thrown. */
export function readRuns(film) {
  const p = runsPathFor(film);
  return fs.existsSync(p) ? parseRuns(fs.readFileSync(p, 'utf8')) : [];
}

/** readAllRuns(dir) -> [{ film, runs }] for every <film>.runs.jsonl in dir, by film name. */
export function readAllRuns(dir = 'out') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(RUNS_SUFFIX)).sort()
    .map((f) => ({ film: f.slice(0, -RUNS_SUFFIX.length), runs: parseRuns(fs.readFileSync(path.join(dir, f), 'utf8')) }));
}
