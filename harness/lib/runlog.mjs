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
//     checks:  [{ name, ran, fired: n, blocked: bool, codes: [...], waived: [...], wallMs? }]
//     render:  { file, frames, fps, ms, wallMs? } | null
//     content: <content-check summary> | null
//     judge:   { verdict, file } | null
//     wallMs:  how long THIS step (this appendRun call) took, real wall-clock time, or null if
//              the caller never measured it. `render.ms` above is the VIDEO's length, not the time
//              spent rendering it; `wallMs` fields (here, on `render`, and per entry in `checks`) are
//              the actual timings, added so `make timings` can answer "how long did this take" without
//              re-deriving it from scrollback.
//     knowledge: { stage, shown: [ruleId,...], dropped: [{id,category,reason},...] } | null
//              the craft-rule knowledge a live hook (harness/live/stage-say.mjs) surfaced to the author
//              for this film's stage: which rule ids it printed, and which it had but did not, each with
//              why (feature-not-matched / over-cap / over-char-budget, see craft-rules.mjs's rulesFor).
//              Nothing recorded this before: a rule could be filtered out by a hard cap and nobody could
//              later tell "the author was never told" from "the author was told and ignored it". Logged
//              ONCE per (film, stage) transition, the same cadence stage-say already dedupes its own
//              print at, not once per turn: this hook runs on every keystroke and a line-per-turn write
//              would be the exact noise runlog's own one-line-per-fact rule exists to avoid.
//     refusal: { rule, file, reason } | null
//              a PreToolUse DENY from harness/live/stage-gate.mjs: which rule fired
//              (no-storyboard), the file it refused, and the
//              reason it printed back to the model. A refusal that leaves no record means nobody can
//              later ask how often the harness blocks, for what, or whether a given block was right.
//              Logged EVERY time: unlike a nudge that fires on every keystroke, a deny fires only on
//              the one write each rule exists to stop, so one line per refusal is already the sparse
//              cadence runlog wants, with no extra dedupe needed.
//     craftLive: { file, shown: [ruleId,...], withheld: [ruleId,...] } | null
//              harness/live/craft-live.mjs runs several independent, syntactic checks on one saved
//              scene/fragment and prints only the ones that fired. `shown` is what printed; `withheld`
//              is every other check IN THE SAME FAMILY (scene or fragment) that ran clean on this same
//              save. That is the fact nothing recorded before: a check that never fires leaves no trace
//              distinguishing "never violated" from "never run". Logged only when the hook actually
//              speaks (shown.length > 0), the same gate its own console.error already uses: the hook is
//              silent on a fine file, so this adds no line where it was already quiet.
//     sceneLive: { file, shown: [ruleId,...], withheld: [ruleId,...] } | null
//              the same shape as `craftLive`, for harness/live/scene-live.mjs's own four independent
//              checks (pictorial %, hand-keyed motion, single bg window, unjustified audio.silent).
//              Same reasoning, same cadence: logged only when the hook speaks.
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
