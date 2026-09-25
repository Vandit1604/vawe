// harness/lib/hook-report.mjs: shrink a live hook's message before it lands in the transcript.
//
// WHY. Every PostToolUse hook's stderr stays in the conversation forever and is re-read, as cached
// input, on every later request. code-quality.mjs, scene-live.mjs, craft-live.mjs, beat-surfacer.mjs
// and vocabulary.mjs each print a full argued case (one line per finding, sometimes one per oxlint
// diagnostic): a single tangled file can print 40+ lines. Measured from real transcripts, the median
// PostToolUse:Edit hook block runs about 17,000 characters. None of that needs to sit in the model's
// context: the fix is one edit away, argued once, in the file this writes.
//
// ONE OWNER for "shrink a hook message", used by every hook above instead of five copies of the same
// truncate-and-point logic. summarize() writes the FULL text to a report file under .vawe-data/
// (already gitignored), returns a short block naming the count, the top lines, and the file, and
// suppresses the block entirely when the same file already said the same thing (hashed, not compared
// by eye) so a hook does not repeat itself on every later edit to a file it already spoke about.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DATA_DIR = process.env.VAWE_HOOK_DATA_DIR || path.join(ROOT, '.vawe-data');
const REPORT_DIR = path.join(DATA_DIR, 'hook-reports');
const STATE = path.join(DATA_DIR, 'hook-report-state.json');
const HEAD_LINES = 5;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; }
}

function writeState(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s));
}

/**
 * summarize(hook, rel, full) -> the text to print, or null to print nothing (and exit clean).
 *
 * hook: the hook's own short name ("code-quality", "scene-live", ...), used as the report subfolder
 *   and half the dedupe key.
 * rel:  the file the finding is about, repo-relative, the other half of the dedupe key.
 * full: the complete message exactly as the hook used to print it to stderr.
 *
 * VAWE_HOOK_FULL=1 returns `full` unchanged and skips the dedupe check entirely, so the old,
 * un-shortened behaviour stays reachable for an A/B comparison.
 */
export function summarize(hook, rel, full) {
  if (process.env.VAWE_HOOK_FULL) return full;

  const hash = crypto.createHash('sha1').update(full).digest('hex').slice(0, 12);
  const key = `${hook}::${rel}`;
  const state = readState();
  if (state[key] === hash) return null;   // unchanged since the last time this hook spoke about rel
  state[key] = hash;
  writeState(state);

  const reportPath = path.join(REPORT_DIR, hook, `${rel.replace(/[/\\]/g, '__')}.txt`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, full);

  const lines = full.split('\n').filter((l) => l.trim());
  const head = lines.slice(0, HEAD_LINES);
  const rest = lines.length - head.length;
  const relReport = path.relative(ROOT, reportPath);
  const tail = rest > 0 ? [`  … ${rest} more line(s). Full text: ${relReport}`] : [`  Full text: ${relReport}`];
  return [...head, ...tail, '  (VAWE_HOOK_FULL=1 prints findings in full instead of writing this file)'].join('\n');
}
