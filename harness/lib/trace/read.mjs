import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

/** The rows of one transcript, streamed; a line that is not JSON is skipped. */
export async function* rowsOf(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try { yield JSON.parse(line); } catch { /* a cut-off last line */ }
  }
}

/** A cutoff in ms from an ISO date or a commit sha (its commit date); null for no cutoff. Throws on text that is neither. */
export function cutoffMs(spec, cwd = process.cwd()) {
  if (!spec) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(spec)) return Date.parse(spec);
  const r = spawnSync('git', ['show', '-s', '--format=%cI', spec], { cwd, encoding: 'utf8' });
  const ms = Date.parse((r.stdout || '').trim());
  if (r.status !== 0 || Number.isNaN(ms)) throw new Error(`not a date or a commit: ${spec}`);
  return ms;
}

function walk(dir, keep, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, keep, out);
    else if (e.name.endsWith('.jsonl') && keep(p)) out.push(p);
  }
  return out;
}

const isSubagent = (p) => p.includes(`${path.sep}subagents${path.sep}`);

/**
 * The transcript files to read. A file argument is taken as given; a directory argument adds every .jsonl below it;
 * `project` adds the sub-agent transcripts of a Claude Code project folder, and the main sessions when `main` is set.
 * A file last written before `sinceMs` cannot hold a row after it, so it is skipped.
 */
export function transcriptFiles({ inputs = [], project, sinceMs = null, main = false }) {
  const fresh = (p) => sinceMs === null || fs.statSync(p).mtimeMs >= sinceMs;
  const found = [];
  for (const input of inputs) {
    if (fs.statSync(input).isDirectory()) found.push(...walk(input, fresh));
    else found.push(input);
  }
  if (project) found.push(...walk(project, (p) => fresh(p) && (main || isSubagent(p))));
  return [...new Set(found)].sort();
}
