// scripts/gates/ab-record.mjs — VALIDATE, AGGREGATE, REVEAL, PERSIST. The second half of the blind A/B.
//
// Usage: node scripts/gates/ab-record.mjs --name <slug>   ·   make ab-record NAME=<slug>
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const NAME = arg('name');
if (!NAME) die('usage: ab-record.mjs --name <slug>');
const dir = path.join('/tmp/ab', NAME);
if (!fs.existsSync(dir)) die(`no prepared experiment at ${dir} — run \`make ab …\` first.`);

const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
const vdir = path.join(dir, 'verdicts');
const files = (fs.existsSync(vdir) ? fs.readdirSync(vdir) : []).filter((f) => f.endsWith('.json')).sort();
// Refusing on an empty verdicts/ is what keeps the key sealed: there is no path through this script that
// reveals the arms before anyone has judged them.
if (!files.length) die(`no verdicts in ${vdir}. Spawn the judges on ${dir}/brief.md first — the key stays sealed until they have answered.`);

// ---------- shape validation ----------
// SUBAGENTS.md rule 2 says a critic returns a FIXED verdict shape. Enforced here rather than remembered:
// a verdict that drifts from the shape is not a soft finding to interpret, it is unusable data.
const SIDE = new Set(['LEFT', 'RIGHT']);
const WINNER = new Set(['LEFT', 'RIGHT', 'TIE']);
const problems = [];
const verdicts = [];
for (const f of files) {
  const p = path.join(vdir, f);
  const bad = (m) => problems.push(`${f}: ${m}`);
  let v; try { v = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { bad(`not valid JSON (${e.message})`); continue; }
  if (!v || typeof v !== 'object') { bad('not an object'); continue; }
  if (!Array.isArray(v.perBeat) || !v.perBeat.length) bad('perBeat must be a non-empty array');
  else v.perBeat.forEach((b, i) => {
    if (!Number.isFinite(b?.beat)) bad(`perBeat[${i}].beat must be a number`);
    if (!WINNER.has(b?.winner)) bad(`perBeat[${i}].winner must be LEFT|RIGHT|TIE, got ${JSON.stringify(b?.winner)}`);
    if (typeof b?.why !== 'string' || !b.why.trim()) bad(`perBeat[${i}].why must be a sentence`);
  });
  if (!['LEFT', 'RIGHT', 'NEITHER'].includes(v.graphicEarnsIt?.side)) bad('graphicEarnsIt.side must be LEFT|RIGHT|NEITHER');
  if (typeof v.graphicEarnsIt?.whatItEncodes !== 'string' || !v.graphicEarnsIt.whatItEncodes.trim()) bad('graphicEarnsIt.whatItEncodes must say what the picture means, in the judge\'s own words');
  if (!WINNER.has(v.overall?.winner)) bad('overall.winner must be LEFT|RIGHT|TIE');
  if (!['clear', 'narrow'].includes(v.overall?.margin)) bad('overall.margin must be clear|narrow');
  if (typeof v.overall?.why !== 'string' || !v.overall.why.trim()) bad('overall.why must be a sentence');
  if (v.worstFrame != null && !SIDE.has(v.worstFrame?.side)) bad('worstFrame.side must be LEFT|RIGHT');
  for (const s of ['LEFT', 'RIGHT']) if (!['yes', 'no'].includes(v.wouldShip?.[s])) bad(`wouldShip.${s} must be yes|no`);
  verdicts.push({ ...v, judge: String(v.judge ?? path.basename(f, '.json')) });
}
if (problems.length) {
  console.error(`\n✗ ${problems.length} malformed verdict field(s) — nothing recorded:\n`);
  for (const p of problems) console.error(`    ${p}`);
  console.error(`\n  Re-run the affected judge against ${dir}/brief.md. Do not hand-edit a verdict.\n`);
  process.exit(1);
}

// ---------- aggregate ----------
// On overall.winner only. Per-dimension 1-5 scores are a judge's REASON, uncalibrated between judges;
// averaging them across judges invents a precision none of them claimed. TIE abstains.
const votes = verdicts.map((v) => v.overall.winner);
const tally = { LEFT: 0, RIGHT: 0, TIE: 0 };
for (const w of votes) tally[w]++;
const decided = tally.LEFT + tally.RIGHT;
let winner = 'TIE', confidence = 'SPLIT';
if (tally.LEFT !== tally.RIGHT && decided > 0) {
  winner = tally.LEFT > tally.RIGHT ? 'LEFT' : 'RIGHT';
  const losing = Math.min(tally.LEFT, tally.RIGHT);
  confidence = losing === 0 && tally.TIE === 0 ? 'DECISIVE' : 'LEAN';
}
const winnerArm = winner === 'TIE' ? null : key.positions[winner].input;
const dissent = verdicts.filter((v) => v.overall.winner !== winner)
  .map((v) => ({ judge: v.judge, said: v.overall.winner, why: v.overall.why }));

// ---------- the show-don't-tell reading ----------
// This is why the loop exists. visual-vocabulary.mjs can prove a picture is on screen and is large; it
// says in its own closing lines that it cannot prove the picture EXPLAINS anything. A blind judge stating
// what the graphic means, without having been told what it was supposed to mean, is that measurement.
const encodings = verdicts.map((v) => ({ judge: v.judge, side: v.graphicEarnsIt.side, says: v.graphicEarnsIt.whatItEncodes }));

const record = {
  name: key.name, seed: key.seed, claim: key.claim, brand: key.brand,
  gatesTree: key.gatesTree, rows: key.rows,
  arms: ['LEFT', 'RIGHT'].map((side) => ({ position: side, ...key.positions[side], beats: key.beats[side] })),
  result: { winner, winnerArm, confidence, tally, dissent },
  graphicEarnsIt: encodings,
  wouldShip: Object.fromEntries(['LEFT', 'RIGHT'].map((s) => [key.positions[s].input, verdicts.map((v) => v.wouldShip[s])])),
  verdicts,
};
// content-addressed so a re-run of the same experiment is recognisably the same experiment
record.id = crypto.createHash('sha256').update(JSON.stringify([key.name, key.seed, key.positions, votes])).digest('hex').slice(0, 12);

const outDir = path.join(ROOT, 'verify', 'judged');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${NAME}.json`);
fs.writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);

// ---------- report ----------
const short = (p) => path.basename(String(p));
console.log(`\n  ab-record · ${NAME} · ${verdicts.length} verdict(s) · seed ${key.seed}`);
console.log(`  LEFT  = ${short(key.positions.LEFT.input)}`);
console.log(`  RIGHT = ${short(key.positions.RIGHT.input)}`);
console.log(`\n  votes: LEFT ${tally.LEFT} · RIGHT ${tally.RIGHT} · TIE ${tally.TIE}`);
console.log(`  → ${confidence}${winner === 'TIE' ? '' : `: ${winner} (${short(winnerArm)})`}`);
for (const d of dissent) console.log(`    dissent · judge ${d.judge} said ${d.said}: ${d.why}`);

console.log(`\n  the claim the author committed to: "${key.claim}"`);
console.log('  what the blind judges said the picture means:');
for (const e of encodings) console.log(`    judge ${e.judge} · ${e.side}: ${e.says}`);

console.log('\n  would ship:');
for (const s of ['LEFT', 'RIGHT']) console.log(`    ${short(key.positions[s].input)}: ${verdicts.map((v) => v.wouldShip[s]).join(' ')}`);

if (confidence === 'SPLIT') {
  console.log('\n  SPLIT — the judges cannot tell these apart. That is a result, not a failure to measure:');
  console.log('  the change is not perceptible. REVERT it, or make it bigger. Do NOT add a fourth judge;');
  console.log('  breaking a tie by adding voters manufactures a majority out of a real signal.');
} else if (confidence === 'LEAN') {
  console.log(`\n  LEAN — a dissent is recorded verbatim above. If you doubt it, re-run swapped:`);
  console.log(`      make ab A=… B=… NAME=${NAME}-swap CLAIM="${key.claim}" SEED=${Number(key.seed) + 1}`);
  console.log('  If the winner follows the ARM it is real; if it follows the POSITION the result is void.');
}
console.log(`\n  → ${path.relative(ROOT, outFile)}\n`);
