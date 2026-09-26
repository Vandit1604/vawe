#!/usr/bin/env node
// harness/dev/ref-beat.mjs: run ONE beat of the reference loop (quality/refs/LOOP.md) and append the
// ledger line for it. Reuses only what exists: harness/media/light-fit.mjs for the beat's background,
// harness/media/match.mjs for the recreation score, harness/dev/verify.mjs for the hard numbers. This
// script owns none of those measurements itself, only the sequencing and the ledger write.
//
// Usage: node harness/dev/ref-beat.mjs REF=<ref-name> BEAT=<n> [D=<film.json>]
//   REF=<name>  a directory under quality/refs/<name>/ (source.mp4, beats.md)
//   BEAT=<n>    the beat number, matching a `## Beat <n>:` heading in beats.md
//   D=<file>    the film JSON built to match this beat. Omit it on the first pass: the script
//               fits the beat's light and stops there, naming the film to author next.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const KV = Object.fromEntries(argv.filter((a) => /^[A-Z_]+=/.test(a)).map((a) => {
  const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)];
}));
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

const REF = KV.REF || process.env.REF;
const BEAT = Number(KV.BEAT || process.env.BEAT);
const D = KV.D || process.env.D || null;
if (!REF || !Number.isFinite(BEAT)) die('usage: node harness/dev/ref-beat.mjs REF=<ref-name> BEAT=<n> [D=<film.json>]');

const refDir = path.join(ROOT, 'quality/refs', REF);
if (!fs.existsSync(refDir)) die(`no such reference: quality/refs/${REF} (make its beats.md first, per quality/refs/README.md)`);
const sourceMp4 = path.join(refDir, 'source.mp4');
if (!fs.existsSync(sourceMp4)) die(`quality/refs/${REF}/source.mp4 is missing (reference videos are local-only, never committed)`);
const beatsPath = path.join(refDir, 'beats.md');
if (!fs.existsSync(beatsPath)) die(`quality/refs/${REF}/beats.md is missing`);

// `## Beat <n>: <label>` heading, then a `- window: <start>-<end>s` line somewhere under it,
// same two facts `beats.md` is documented to carry (quality/refs/README.md).
function parseBeat(md, n) {
  const headingRe = new RegExp(`^##\\s*Beat\\s*${n}\\s*:\\s*(.*)$`, 'm');
  const hm = headingRe.exec(md);
  if (!hm) return null;
  const rest = md.slice(hm.index + hm[0].length);
  const nextHeading = rest.search(/^##\s*Beat/m);
  const body = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const wm = /-\s*window:\s*([\d.]+)\s*-\s*([\d.]+)\s*s/.exec(body);
  if (!wm) return null;
  return { label: hm[1].trim(), start: Number(wm[1]), end: Number(wm[2]) };
}

const beat = parseBeat(fs.readFileSync(beatsPath, 'utf8'), BEAT);
if (!beat) die(`beats.md names no "## Beat ${BEAT}:" heading with a "- window: s-s" line`);

fs.mkdirSync(path.join(refDir, 'study'), { recursive: true });
fs.mkdirSync(path.join(refDir, 'grid'), { recursive: true });
const lightfitOut = path.join(refDir, 'study', `beat${BEAT}.lightfit.json`);
const gridOut = path.join(refDir, 'grid', `beat${BEAT}.png`);

console.log(`\n▶ ref-beat: ${REF} beat ${BEAT} (${beat.label}, ${beat.start}-${beat.end}s)\n`);

console.log('--- light-fit ---');
execFileSync('node', ['harness/media/light-fit.mjs',
  '--ref', sourceMp4, '--start', String(beat.start), '--end', String(beat.end),
  '--out', lightfitOut, '--grid', gridOut], { cwd: ROOT, stdio: 'inherit' });

let matchRow = null, verifyOk = null, verifyText = '';
if (D) {
  console.log('\n--- match ---');
  const matchArgs = ['harness/media/match.mjs', sourceMp4, D, 'LIGHT=1'];
  let matchOut = '';
  try {
    matchOut = execFileSync('node', matchArgs, { cwd: ROOT }).toString();
  } catch (e) {
    matchOut = (e.stdout || '').toString() + (e.stderr || '').toString();
  }
  console.log(matchOut.trim());
  const slug = path.basename(D).replace(/\.json$/, '');
  const mdPath = path.join(ROOT, 'out/match', slug, 'match.md');
  if (fs.existsSync(mdPath)) {
    const rows = fs.readFileSync(mdPath, 'utf8').split('\n').filter((l) => l.startsWith(`| ${BEAT} `));
    if (rows.length) {
      const cells = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
      // | beat | window | samples | mean SSIM | colour ΔE | combined | light ΔE | strip | diff |
      matchRow = { ssim: Number(cells[3]), deltaE: Number(cells[4]), combined: Number(cells[5]), light: Number(cells[6]) };
    }
  }

  console.log('\n--- verify ---');
  try {
    execFileSync('node', ['harness/dev/verify.mjs', `D=${D}`, `REF=${sourceMp4}`], { cwd: ROOT, stdio: 'inherit' });
    verifyOk = true;
  } catch (e) {
    verifyOk = false;
    verifyText = ((e.stdout || '') + (e.stderr || '')).toString();
  }
}

// carry the previous pass's "after" forward as this pass's "before", per quality/refs/LOOP.md.
const ledgerPath = path.join(ROOT, 'quality/refs/ledger.jsonl');
const priorLines = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean) : [];
const priorForBeat = priorLines.map((l) => JSON.parse(l)).filter((r) => r.ref === REF && r.beat === BEAT);
const prior = priorForBeat[priorForBeat.length - 1] || null;

const entry = {
  ref: REF,
  beat: BEAT,
  label: beat.label,
  pass: (prior?.pass || 0) + 1,
  at: new Date().toISOString(),
  scores: { before: prior?.scores?.after ?? null, after: matchRow },
  judges: [],
  minutes: null,
  renders: D ? 1 : 0,
  tokens: null,
  friction: null,
};
fs.appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`);
console.log(`\n✓ wrote ${path.relative(ROOT, ledgerPath)} (pass ${entry.pass})`);

console.log('\n--- next ---');
if (!D) {
  console.log(`  no film yet: author a beat/scene using ${path.relative(ROOT, lightfitOut)} as the background`
    + ` layer, save it under quality/refs/${REF}/drafts/, then re-run with D=<that file>.`);
} else if (matchRow && matchRow.combined >= 0.70) {
  console.log(`  combined ${matchRow.combined.toFixed(2)} >= 0.70: get two fresh structured judges`
    + ' (make judge STRUCT=1 RUNS=A,B) before calling this beat done.');
} else {
  console.log(`  combined ${matchRow ? matchRow.combined.toFixed(2) : 'n/a'} < 0.70: fix the worst-scoring`
    + ' beat row in a separate worktree, then re-run this same command.');
}
if (verifyOk === false) console.log(`  verify reported a hard failure:\n${verifyText.trim()}`);
