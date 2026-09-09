// quality/gates/judge.mjs: the VISION JUDGE (prep half). Static gates (validate/critique/slop/audit) can't SEE
// composition or asset fidelity; this preps exactly what a vision model must look at + the criteria, and the
// agent-in-the-loop scores it. It renders the KEY frames (each beat's mid + hook + CTA) into one labeled
// sheet and writes the rubric (the brand house-style + the 7 craft dimensions + a verdict template). The
// AGENT then reads /tmp/judge/sheet.png against /tmp/judge/rubric.md and returns a PASS/FIX verdict.
//
// Usage: node quality/gates/judge.mjs <scene.json|mp4> [--vs <brand>]   ·   make judge D=<file> [VS=<brand>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { writeReceipt, readReceipt } from '../lib/receipt.mjs';
import path from 'node:path';
import { beatsOf, evenSamples } from './beats-of.mjs';
import { frameTile, tileGrid, tileBox, baseOf, renderOf, gradeable } from './tile.mjs';
import { craftRubric } from './rubric.mjs';
import { gateFindings } from '../lib/findings.mjs';

// judge.mjs is a PREP step, not a pass/fail check: its product is a rendered sheet + rubric for the
// agent to score, so there is nothing to emit under --json when it succeeds. The one real finding is
// "cannot prep" (bad usage, or a stale/missing render), which --json now has a record for.
const f = gateFindings();
const inp = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
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
  const fixes = arg('--fixes', '');
  writeReceipt('judge', inp, { verdict: v, fixes, sheet, at: new Date().toISOString().slice(0, 10) });
  console.log(v === 'PASS'
    ? `  ✓ judge verdict recorded: PASS. The eye is satisfied, this cut is done (make ledger-add D=${inp}).`
    : `  ✓ judge verdict recorded: FIX${fixes ? ` (${fixes})` : ''}. Fix it, re-render, and re-judge before shipping. The loop is not done until the eye stops finding fixes.`);
  process.exit(0);
}

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]).toString().trim());
const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4]).toString().trim().split(',').map(Number);
const landscape = dims[0] >= dims[1];
const { tw: TW, th: TH } = tileBox(landscape);

// KEY frames: each beat's MID (beats = layer-start clusters, like critique) + always the hook and the CTA.
const mids = scene ? beatsOf(scene, dur) : evenSamples(dur);

// Per-scene directory. It used to be a bare /tmp/judge wiped on every run, so judging a second film
// destroyed the first, which makes comparing two cuts, the entire point of a judging campaign, impossible.
const dir = path.join('/tmp/judge', baseOf(mp4));
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const tiles = mids.map((m, i) => frameTile(mp4, m.t, path.join(dir, `f${String(i).padStart(2, '0')}.png`),
  { tw: TW, th: TH, label: m.label }));
tileGrid(tiles, { cols: landscape ? 2 : 3, tw: TW, th: TH, out: `${dir}/sheet.png` });

fs.writeFileSync(`${dir}/rubric.md`, craftRubric({
  name: path.basename(mp4), frames: tiles.length, landscape, brand, dir,
}));

console.log(`\n  judge · ${path.basename(mp4)} · ${tiles.length} key frames · brand: ${brand || '(none)'}`);
console.log(`  → sheet:  ${dir}/sheet.png`);
console.log(`  → rubric: ${dir}/rubric.md  (house-style + 7 craft dimensions + verdict template)`);
console.log(`\n  AGENT: Read ${dir}/sheet.png AGAINST the rubric, score each frame per dimension, return PASS/FIX + fixes.`);
// Same contract as the beats receipt: producing the sheet for THIS scene content is the checkable
// proxy for having looked at it. Editing the scene withdraws it, which is the whole point.
writeReceipt('judge', inp, { sheet: `${dir}/sheet.png` });
console.log(`  Be adversarial: this is the gate that SEES what validate/critique/slop/audit cannot.\n`);
