// quality/gates/judge.mjs: the VISION JUDGE (prep half). Static gates (validate/critique/slop/audit) can't SEE
// composition or asset fidelity; this preps exactly what a vision model must look at + the criteria, and the
// agent-in-the-loop scores it. It renders the KEY frames (each beat's mid + hook + CTA) into one labeled
// sheet and writes the rubric (the brand house-style + the craft rubric (11 dimensions + 2 checks) + a verdict template). The
// AGENT then reads /tmp/judge/sheet.png against /tmp/judge/rubric.md and returns a PASS/FIX verdict.
//
// Usage: node quality/gates/judge.mjs <scene.json|mp4> [--vs <brand>]   ·   make judge D=<file> [VS=<brand>]
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { writeReceipt, readReceipt } from '../../harness/lib/receipt.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beatsOf, evenSamples } from './beats-of.mjs';
import { frameTile, tileGrid, tileBox, baseOf, renderOf, gradeable } from './tile.mjs';
import { craftRubric } from './rubric.mjs';
import { gateFindings, readFindings } from '../../harness/lib/findings.mjs';
import { appendRun, readRuns } from '../../harness/lib/runlog.mjs';
import { JUDGE_CODES, isJudgeCode, parseFix } from '../../harness/lib/judge-codes.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// sha256 of the RENDERED FILE ITSELF, not the scene JSON. receipt.mjs's own hash already covers the
// scene changing; this covers the render changing under an unchanged scene (a re-render on a fixed
// encoder, a swapped-out asset, a different worktree's `out/`). A receipt that ignores it can outlive
// the exact video it claims to have looked at, which is the stale-artefact class this repo has hit
// before. Missing/unreadable mp4 hashes to null rather than throwing: the caller already refused a
// missing render via `gradeable` before this ever runs.
const renderHashOf = (file) => { try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch { return null; } };

// judge.mjs is a PREP step, not a pass/fail check: its product is a rendered sheet + rubric for the
// agent to score, so there is nothing to emit under --json when it succeeds. The one real finding is
// "cannot prep" (bad usage, or a stale/missing render), which --json now has a record for.
const f = gateFindings();
const inp = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
// every occurrence of a repeated flag, in order: `--fix a@1 --fix b@2` -> ['a@1', 'b@2'].
const argAll = (k) => process.argv.reduce((acc, v, i) => (v === k ? [...acc, process.argv[i + 1]] : acc), []);
if (!inp) {
  console.error('usage: node quality/gates/judge.mjs <scene.json|mp4> [--vs <brand>]');
  f.fail('judge-usage', 'usage: node quality/gates/judge.mjs <scene.json|mp4> [--vs <brand>]');
  process.exit(2);
}

// resolve the rendered mp4 (from a scene JSON → out/<name>.mp4, or a direct mp4) + the scene for beats.
let mp4 = inp, scene = null;
if (inp.endsWith('.json')) {
  scene = JSON.parse(fs.readFileSync(inp, 'utf8'));
  mp4 = renderOf(inp);
}
// A STALE RENDER IS THE ANSWER TO THE PREVIOUS QUESTION, and it grades clean. `gradeable` asks both
// halves: is there a video, and was it made after the film was last edited.
const ready = gradeable(inp, mp4);
if (!ready.ok) {
  console.error(`✗ ${ready.why}.\n  fix: ${ready.fix}`);
  f.fail('judge-not-ready', ready.why, { fix: ready.fix });
  process.exit(1);
}
const brand = arg('--vs', scene?.theme && typeof scene.theme === 'string' ? scene.theme : '');

// RECORD THE VERDICT (taste loop, phase 1+4). The prep run below produces the sheet and writes a
// "looked at this content" receipt. But looking is not judging: the receipt that gates `ledger-add`
// must carry the agent's actual verdict. So `--verdict PASS|FIX` records it against THIS render (the
// `gradeable` check above already refused a stale one), and PASS is the film's definition of done: the
// eye scored every frame and had nothing left to fix. FIX records that the loop is not converged, so
// the receipt does not read as done. This is the honest limit stated in the plan: the score is the
// agent's, written down, not something a script can verify, and the critic panel cross-checks it.
const verdictArg = arg('--verdict', null);
if (verdictArg) {
  const v = String(verdictArg).toUpperCase();
  if (v !== 'PASS' && v !== 'FIX') { console.error('--verdict must be PASS or FIX'); process.exit(2); }
  // A verdict may only be recorded against a sheet THIS tool actually produced for THIS cut. Without
  // this, `--verdict PASS` could be called first, with no sheet ever rendered and nothing ever looked
  // at, and ledger-add would accept it. So require a prior, non-stale prep receipt whose sheet exists on
  // disk (the prep branch below runs ffprobe + renders the frames, so a garbage mp4 cannot have produced
  // one). This cannot prove the agent LOOKED, a script never can, but it forces the real render of the
  // frames the agent is meant to score, and the critic panel cross-checks the eye.
  const prep = readReceipt('judge', inp);
  const sheet = prep.exists && prep.receipt && prep.receipt.sheet;
  if (!prep.exists || prep.stale || !sheet || !fs.existsSync(sheet)) {
    console.error(`✗ no sheet to judge${prep.exists && prep.stale ? ' for this cut (the prep is for an older edit)' : ''}. Run \`make judge D=${inp}\` first to render the key frames, LOOK at them against the rubric, then record the verdict.`);
    process.exit(1);
  }
  // The prep receipt's own render hash must still match `out/<name>.mp4` on disk RIGHT NOW: the scene
  // JSON hash alone cannot catch a re-render that changed the video without touching the JSON (a
  // reprint on a different machine, a corrupted/truncated write). Without this, `--verdict PASS` could
  // be recorded against a sheet made from a video that is no longer the one sitting in out/.
  const renderHash = renderHashOf(mp4);
  if (!renderHash || prep.receipt.renderHash !== renderHash) {
    console.error(`✗ ${mp4} has changed since the sheet was made (its content no longer matches). Re-run \`make judge D=${inp}\` first.`);
    process.exit(1);
  }
  // The judge is meant for a SEPARATE agent (engine-doctrine/JUDGE.md: "the PASS is not the author's
  // to self-record"). The one signal the harness actually has for "which agent" is the Claude Code
  // session id (runlog.mjs stamps every run with it). If the session recording this PASS is the same
  // one that produced the render being judged, refuse: a FIX still records, since only PASS claims the
  // independent eye agreed.
  if (v === 'PASS') {
    const thisSession = process.env.CLAUDE_CODE_SESSION_ID || null;
    const authorRun = readRuns(inp).slice().reverse().find((r) => r.render);
    const authorSession = authorRun && authorRun.session;
    if (thisSession && authorSession && thisSession === authorSession) {
      console.error(`✗ refused: this PASS would be self-recorded. Session ${thisSession} both rendered ${path.basename(mp4)} and is now trying to pass it. Hand ${sheet} and its rubric to a fresh agent/session that did not author this film, and record PASS from there.`);
      f.fail('judge-self-recorded', 'a PASS was attempted by the same session that rendered this cut', { fix: 'record PASS from a separate agent/session' });
      process.exit(1);
    }
  }
  // --fix <code>@<beat>, repeated: the structured replacement for the free-text --fixes string
  // (engine-doctrine/JUDGE.md's own complaint: a finding written as a sentence can never become a
  // rule, because nothing parses it). Each one is a record, {code, beat}, checked against the closed
  // set in harness/lib/judge-codes.mjs so a typo cannot silently mint a new dimension. An unknown code
  // is refused here (a determinism concern), but a FIX verdict still records and the film still ships:
  // this gate asks whether the eye ran, never whether it liked what it saw.
  const rawFixes = argAll('--fix');
  const fixRecords = rawFixes.map(parseFix);
  const bad = fixRecords.find((r) => !isJudgeCode(r.code));
  if (bad) {
    console.error(`✗ "${bad.code}" is not a judge fix code. Valid codes: ${JUDGE_CODES.join(', ')}`);
    f.fail('judge-bad-code', `"${bad.code}" is not a judge fix code`, { fix: `use one of: ${JUDGE_CODES.join(', ')}` });
    process.exit(2);
  }
  for (const { code, beat } of fixRecords) f.warn(code, `beat ${beat}: flagged by the eye`, { beat });

  // Backward compatible for one release: free-text --fixes still records and still ships, and the
  // caller is told what replaces it rather than left to find --fix by reading this file.
  const fixesProse = arg('--fixes', '');
  if (fixesProse) console.error('  note: --fixes is free text and will not be parsed. Use --fix <code>@<beat> (repeated) instead.');

  writeReceipt('judge', inp, {
    verdict: v, fixes: fixRecords.length ? fixRecords : fixesProse, sheet, renderHash, mp4,
    at: new Date().toISOString().slice(0, 10),
  });
  // Logged here, and only here: this is the agent's actual verdict, written down after the eye looked,
  // never a verdict the prep step invents for itself (engine-doctrine/MISTAKES.md, judge PASS is never self-recorded).
  appendRun(inp, { cmd: 'judge', judge: { verdict: v, file: sheet } });
  const fixSummary = fixRecords.length
    ? ` (${fixRecords.map((r) => `${r.code}@${r.beat}`).join(', ')})`
    : (fixesProse ? ` (${fixesProse})` : '');
  console.log(v === 'PASS'
    ? `  ✓ judge verdict recorded: PASS. The eye is satisfied, this cut is done (make ledger-add D=${inp}).`
    : `  ✓ judge verdict recorded: FIX${fixSummary}. Fix it, re-render, and re-judge before shipping. The loop is not done until the eye stops finding fixes.`);
  process.exit(0);
}

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]).toString().trim());
const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4]).toString().trim().split(',').map(Number);
const landscape = dims[0] >= dims[1];
const { tw: TW, th: TH } = tileBox(landscape);

// KEY frames: the film's own storyboard beat table when it has one (harness/author/storyboard-parse.mjs),
// else the layer-start clustering fallback (beats-of.mjs). `inp` is the scene JSON path when `scene` is
// set, so the storyboard beside it (`<file>.storyboard.md`) is checked first.
const mids = scene ? beatsOf(scene, dur, inp) : evenSamples(dur);

// Per-scene directory. It used to be a bare /tmp/judge wiped on every run, so judging a second film
// destroyed the first, which makes comparing two cuts, the entire point of a judging campaign, impossible.
const dir = path.join('/tmp/judge', baseOf(mp4));
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const tiles = mids.map((m, i) => frameTile(mp4, m.t, path.join(dir, `f${String(i).padStart(2, '0')}.png`),
  { tw: TW, th: TH, label: m.label }));
tileGrid(tiles, { cols: landscape ? 2 : 3, tw: TW, th: TH, out: `${dir}/sheet.png` });

// MEASURED FINDINGS, HANDED TO THE EYE. quality/audit.mjs measures 18 kinds of pixel defect (overlap,
// clipped text, off-frame, low contrast, ...) against these SAME rendered frames, and
// sweep-static.mjs measures whether the pixels ever move; `make ship` already pays for both and neither
// one's output ever reached this rubric, so the agent scored against a blank card next to findings a
// script had already made (one real overlap shipped this way). Reuse VAWE_FINDINGS_OUT, the channel
// every gate already writes structured records to (harness/lib/findings.mjs), rather than re-parsing
// either script's prose or inventing a second findings channel. Only for a scene JSON input: both
// scripts need one, so an mp4-only `judge <file>.mp4` run still preps a sheet with no measured findings.
const runFindings = (script, args) => {
  const out = path.join(dir, `.findings-${path.basename(script, '.mjs')}.json`);
  spawnSync(process.execPath, [path.join(repoRoot, script), ...args],
    { encoding: 'utf8', env: { ...process.env, VAWE_FINDINGS_OUT: out } });
  return readFindings(out) || [];
};
const measured = scene
  ? [...runFindings('quality/audit.mjs', [inp]), ...runFindings('quality/gates/sweep-static.mjs', [inp])]
  : [];

fs.writeFileSync(`${dir}/rubric.md`, craftRubric({
  name: path.basename(mp4), frames: tiles.length, landscape, brand, dir, findings: measured,
}));

console.log(`\n  judge · ${path.basename(mp4)} · ${tiles.length} key frames · brand: ${brand || '(none)'}`);
console.log(`  → sheet:  ${dir}/sheet.png`);
console.log(`  → rubric: ${dir}/rubric.md  (house-style + 11 craft dimensions + 2 checks + verdict template)`);
console.log(`  → measured: ${measured.length} finding(s) from audit.mjs + sweep-static.mjs, folded into the rubric`);
console.log(`\n  AGENT: Read ${dir}/sheet.png AGAINST the rubric, score each frame per dimension, return PASS/FIX + fixes.`);
// Same contract as the beats receipt: producing the sheet for THIS scene content is the checkable
// proxy for having looked at it. Editing the scene withdraws it, which is the whole point. renderHash
// pins it to THIS render's bytes too, so `--verdict` above can refuse a video that moved under it.
writeReceipt('judge', inp, { sheet: `${dir}/sheet.png`, renderHash: renderHashOf(mp4), mp4 });
console.log(`  Be adversarial: this is the gate that SEES what validate/critique/slop/audit cannot.\n`);
