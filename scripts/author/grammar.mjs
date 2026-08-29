// scripts/author/grammar.mjs: what we have learned about how good films are BUILT.
//
//   node scripts/author/grammar.mjs            # the whole store, as one comparison table
//   node scripts/author/grammar.mjs <name>     # one film's full reading
//   make grammar [N=<name>]
//
// WHY THIS EXISTS. `make study` reads one reference and writes `grammar/<name>.json`. That is a fact
// per film. The question an author actually has is comparative: how long does a shot hold in work that
// reads well, how active is it, does the ground turn, what survives a cut. Answering that meant opening
// several JSON files and holding five numbers in your head, which is where a reading goes to die.
//
// IT REPORTS WHAT IS MISSING AS LOUDLY AS WHAT IS THERE. A grammar file with every judgement blank is
// a film that was measured and never read, and a table that quietly omitted those rows would present a
// corpus of three as a corpus of nine. That is the absence-read-as-a-pass shape scripts/lib/census.mjs
// exists for, so the unread films are counted in the header and listed at the end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'grammar');
const ONE = process.argv.slice(2).find((a) => !a.startsWith('--'));

let files = [];
try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort(); } catch { /* none yet */ }
if (!files.length) {
  console.log(`\n  No grammar yet. \`make study VIDEO=refs/<file>.mp4 NAME=<name>\` measures a reference and`);
  console.log(`  writes grammar/<name>.json, which is committed and outlives refs/.\n`);
  process.exit(0);
}

const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const read = (g) => (g.shots || []).filter((s) => s.onScreen).length;

if (ONE) {
  const g = all.find((x) => x.name === ONE);
  if (!g) { console.error(`✗ no grammar for "${ONE}". Have: ${all.map((x) => x.name).join(', ')}`); process.exit(2); }
  console.log(`\n  GRAMMAR · ${g.name}   ${g.measured.duration}s · ${g.measured.shots} shots · median ${g.measured.medianShot}s · ${g.measured.cutsPerMinute}/min`);
  console.log(`  ground   ${g.groundPattern}`);
  if (g.motionBand) console.log(`  motion   ${g.motionBand.lo} to ${g.motionBand.hi}  (the renderer prints this number for our films too)\n`);
  for (const s of g.shots) {
    console.log(`  ${String(s.i).padStart(2)}. ${String(s.t0).padStart(6)}s  ${String(s.len).padStart(5)}s  ${String(s.ground || '?').padEnd(5)} luma ${String(s.luma ?? '?').padStart(5)}  motion ${String(s.motion ?? '?').padStart(5)}  ${s.accent || ''}`);
    if (s.onScreen) console.log(`      on screen   ${s.onScreen}`);
    if (s.moves)    console.log(`      moves       ${s.moves}`);
    if (s.trigger)  console.log(`      triggers    ${s.trigger}`);
    if (!s.onScreen) console.log(`      (unread: measured, never watched)`);
    console.log('');
  }
  for (const [k, label] of [['threads', 'THREAD    '], ['spectacle', 'SPECTACLE '], ['takeaway', 'TAKEAWAY  ']])
    if (g[k]) console.log(`  ${label}${String(g[k]).replace(/\n/g, '\n            ')}\n`);
  process.exit(0);
}

const fullyRead = all.filter((g) => read(g) === (g.shots || []).length && g.takeaway);
console.log(`\n  GRAMMAR · ${all.length} reference film(s), ${fullyRead.length} of them actually read\n`);
console.log(`  ${'film'.padEnd(24)} ${'dur'.padStart(6)} ${'shots'.padStart(5)} ${'median'.padStart(7)} ${'/min'.padStart(5)}  ${'motion'.padStart(11)}  ground`);
for (const g of all) {
  const m = g.motionBand ? `${g.motionBand.lo}–${g.motionBand.hi}` : '?';
  const mark = read(g) === (g.shots || []).length && g.takeaway ? ' ' : '·';
  console.log(`${mark} ${g.name.padEnd(24)} ${String(g.measured.duration).padStart(5)}s ${String(g.measured.shots).padStart(5)} ${String(g.measured.medianShot).padStart(6)}s ${String(g.measured.cutsPerMinute).padStart(5)}  ${m.padStart(11)}  ${(g.groundPattern || '').slice(0, 44)}`);
}

// THE NUMBER THIS WHOLE STORE EXISTS TO PUT IN FRONT OF SOMEBODY. Our renderer prints the same motion
// figure beside every render, so the comparison is one scale, not two impressions.
const bands = all.map((g) => g.motionBand).filter(Boolean);
if (bands.length) {
  const lo = Math.min(...bands.map((b) => b.lo)), hi = Math.max(...bands.map((b) => b.hi));
  console.log(`\n  Across the store, a shot in work that reads well measures ${lo} to ${hi}.`);
  console.log(`  \`./bin/vawe <scene>\` prints the same figure for ours, so it is a target and not a feeling.`);
}
const unread = all.filter((g) => read(g) < (g.shots || []).length || !g.takeaway);
if (unread.length) {
  console.log(`\n  ${unread.length} film(s) are MEASURED AND NEVER READ. The numbers are real; nobody wrote down`);
  console.log(`  what causes what, which is the half a measurement cannot reach:`);
  for (const g of unread) console.log(`    ${g.name.padEnd(24)} ${read(g)}/${(g.shots || []).length} shots read${g.takeaway ? '' : ', no takeaway'}`);
  console.log(`\n  Fill them in grammar/<name>.json (onScreen · moves · trigger, then threads/spectacle/takeaway).`);
  console.log(`  A re-study merges them forward, so filling one in is not undone by measuring again.`);
}
console.log('');
