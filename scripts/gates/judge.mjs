// scripts/gates/judge.mjs: the VISION JUDGE (prep half). Static gates (validate/critique/slop/audit) can't SEE
// composition or asset fidelity; this preps exactly what a vision model must look at + the criteria, and the
// agent-in-the-loop scores it. It renders the KEY frames (each beat's mid + hook + CTA) into one labeled
// sheet and writes the rubric (the brand house-style + the 7 craft dimensions + a verdict template). The
// AGENT then reads /tmp/judge/sheet.png against /tmp/judge/rubric.md and returns a PASS/FIX verdict.
//
// Usage: node scripts/gates/judge.mjs <scene.json|mp4> [--vs <brand>]   ·   make judge D=<file> [VS=<brand>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { writeReceipt } from '../lib/receipt.mjs';
import path from 'node:path';
import { beatsOf, evenSamples } from './beats-of.mjs';
import { frameTile, tileGrid, tileBox, baseOf, renderOf } from './tile.mjs';
import { craftRubric } from './rubric.mjs';

const inp = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
if (!inp) { console.error('usage: node scripts/gates/judge.mjs <scene.json|mp4> [--vs <brand>]'); process.exit(2); }

// resolve the rendered mp4 (from a scene JSON → out/<name>.mp4, or a direct mp4) + the scene for beats.
let mp4 = inp, scene = null;
if (inp.endsWith('.json')) {
  scene = JSON.parse(fs.readFileSync(inp, 'utf8'));
  mp4 = renderOf(inp);
}
if (!fs.existsSync(mp4)) { console.error(`✗ no rendered video at ${mp4}, render first (\`make video D=${inp}\`), then judge.`); process.exit(1); }
const brand = arg('--vs', scene?.theme && typeof scene.theme === 'string' ? scene.theme : '');

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
