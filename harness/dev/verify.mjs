// harness/dev/verify.mjs: HARD NUMBERS about a render, no eye, no vision judgement. One agent
// scoring its own film PASS on 5/10 work is the failure this exists to close, the same shape
// HyperFrames closes by forcing an agent to paste the raw output of w2h-verify.mjs rather than
// summarize it. Print this block VERBATIM before `make judge` or `make look`; it is a report, never
// a gate that blocks craft. Exit non-zero ONLY on an objective failure (no render, or a referenced
// asset missing on disk); every other line is a measurement for the eye to weigh, not a verdict.
//
// Usage: node harness/dev/verify.mjs D=<film.json> [REF=<ref.mp4>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gradeable, renderOf, frameTile, meanColorOf, labDeltaE, baseOf } from '../../quality/gates/tile.mjs';
import { beatsOf, beatStarts } from '../../quality/gates/beats-of.mjs';
import { storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { gateFindings, readFindings } from '../lib/findings.mjs';
import { scratch } from '../lib/scratch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readArg(key) {
  const pref = `${key}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : process.env[key];
}

const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ffprobeDuration = (file) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', file]).toString().trim());

// every string in the scene that looks like an asset path, wherever it is nested (image src, icon
// name resolved to a file, clip layer source, ...). A false positive here (a plain word that happens
// to end .png) costs nothing: fs.existsSync on a non-path just reports missing, which is the honest
// answer for a string that was never a path.
function assetPaths(node, acc = new Set()) {
  if (typeof node === 'string') {
    if (/\.(png|jpe?g|svg|webp|gif|mp4|mov|wav|mp3)$/i.test(node)) acc.add(node);
  } else if (Array.isArray(node)) {
    for (const v of node) assetPaths(v, acc);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) assetPaths(v, acc);
  }
  return acc;
}

// 2/3: one real frame per beat (start/mid/end), luma from each, ΔE against REF at the same relative
// position in its own timeline when REF is given.
function beatExposure({ mp4, dur, declared, refArg, framesDir }) {
  const refDur = refArg && fs.existsSync(refArg) ? ffprobeDuration(refArg) : null;
  return declared.map((b, i) => {
    const next = declared[i + 1]?.start ?? dur;
    const t0 = b.start, t1 = Math.max(t0 + 0.05, next - 0.05);
    const tMid = Math.min(dur - 0.05, (t0 + t1) / 2);
    const lumas = [t0, tMid, t1].filter((t) => t >= 0 && t < dur).map((t) => {
      const f = frameTile(mp4, t, path.join(framesDir, `r${i}_${t.toFixed(2)}.png`), { tw: 64, th: 36 });
      const c = meanColorOf(f);
      return c ? luma(c) : null;
    }).filter((v) => v != null);
    const row = { i: i + 1, t0, t1, lumaMin: lumas.length ? Math.min(...lumas) : null, lumaMax: lumas.length ? Math.max(...lumas) : null };
    if (refDur != null) {
      const refT = Math.min(refDur - 0.05, Math.max(0, tMid * (refDur / dur)));
      const rf = frameTile(refArg, refT, path.join(framesDir, `ref${i}.png`), { tw: 64, th: 36 });
      const of = frameTile(mp4, tMid, path.join(framesDir, `out${i}.png`), { tw: 64, th: 36 });
      row.deltaE = labDeltaE(meanColorOf(rf), meanColorOf(of));
    }
    return row;
  });
}

function exposureLines(beatRows) {
  const lines = ['exposure range per beat (luma 0-255):'];
  for (const r of beatRows) {
    lines.push(`  beat ${r.i} @${r.t0.toFixed(1)}-${r.t1.toFixed(1)}s: ${r.lumaMin?.toFixed(0) ?? 'n/a'}-${r.lumaMax?.toFixed(0) ?? 'n/a'}`
      + (r.lumaMin != null && r.lumaMax != null ? ` (range ${(r.lumaMax - r.lumaMin).toFixed(0)})` : ''));
  }
  return lines;
}

function lightMapLines(beatRows, refArg) {
  if (!refArg) return ['light-map distance to reference: (no REF given, skipped)'];
  if (!fs.existsSync(refArg)) return [`light-map distance to reference: REF ${refArg} does not exist`];
  const deltaEs = beatRows.map((r) => r.deltaE).filter((v) => v != null);
  const mean = deltaEs.length ? deltaEs.reduce((a, v) => a + v, 0) / deltaEs.length : null;
  const lines = [`light-map distance to reference (mean ΔE, CIE76): ${mean != null ? mean.toFixed(1) : 'n/a'}`];
  for (const r of beatRows) lines.push(`  beat ${r.i}: ΔE ${r.deltaE != null ? r.deltaE.toFixed(1) : 'n/a'}`);
  return lines;
}

// 4: storyboard-first beats vs the storyboard-blind heuristic, aligned by index. A big offset means
// the plan and the render disagree about where beats fall.
function beatTimingLine(filmPath, declared, detected) {
  const sbPath = storyboardPathFor(filmPath);
  if (!fs.existsSync(sbPath)) {
    return `beat timing vs storyboard: no storyboard at ${path.relative(ROOT, sbPath)}, using heuristic `
      + `beats only (${detected.length} detected)`;
  }
  const n = Math.min(declared.length, detected.length);
  const offsets = Array.from({ length: n }, (_, i) => Math.abs(declared[i].start - detected[i]));
  const maxOffset = offsets.length ? Math.max(...offsets) : null;
  return `beat timing vs storyboard: storyboard declares ${declared.length} beat(s), heuristic detects `
    + `${detected.length}, max offset over shared beats ${maxOffset != null ? maxOffset.toFixed(2) : 'n/a'}s`;
}

// 5: every asset-shaped path anywhere in the scene, resolved against the film's own directory and the
// repo root, checked for existence. Missing is an objective failure: a scene that POINTS at a captured
// asset that is not on disk will render, badly, and grade clean everywhere else.
function assetUse(scene, filmPath) {
  const refs = [...assetPaths(scene)];
  const filmDir = path.dirname(filmPath);
  const resolveAsset = (p) => [p, path.join(filmDir, p), path.join(ROOT, p)].find((c) => fs.existsSync(c));
  const missing = refs.filter((p) => !resolveAsset(p));
  const line = `asset use: ${refs.length} referenced, ${refs.length - missing.length} present, ${missing.length} missing`
    + (missing.length ? `: ${missing.join(', ')}` : '');
  return { line, missing };
}

// 6/7: reuse quality/audit.mjs (clipped-text/clipped-component) and quality/gates/seams.mjs
// (seam-empty/seam-blank) rather than re-detecting either, the same reasoning quality/gates/judge.mjs
// already applies to fold audit.mjs findings into its rubric.
function runFindings(script, filmPath, tag) {
  const out = scratch('verify', `${tag}.json`);
  execFileSync(process.execPath, [path.join(ROOT, script), filmPath],
    { env: { ...process.env, VAWE_FINDINGS_OUT: out }, stdio: ['ignore', 'ignore', 'ignore'] });
  return readFindings(out) || [];
}

export function verify(filmArg, refArg) {
  const filmPath = path.resolve(filmArg);
  if (!fs.existsSync(filmPath)) throw new Error(`no such film: ${filmArg}`);
  const scene = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const mp4 = renderOf(filmPath);
  const ready = gradeable(filmPath, mp4);
  const lines = [`=== VERIFY: ${baseOf(mp4)} ===`];

  if (!ready.ok) {
    lines.push(`render: MISSING/STALE. ${ready.why}. fix: ${ready.fix}`, '=== END VERIFY ===');
    return { text: lines.join('\n'), ok: false, beats: [] };
  }

  const dur = ffprobeDuration(mp4);
  const declared = beatsOf(scene, dur, filmPath);       // storyboard-first (beats-of.mjs's own priority)
  const detected = beatStarts(scene, dur, null).beats;  // heuristic only, storyboard ignored

  lines.push(`frame coverage: ${declared.length} beat frame(s) inspected / ${dur.toFixed(1)}s `
    + `(1 per ${(dur / Math.max(1, declared.length)).toFixed(1)}s)`);

  const framesDir = scratch('verify', baseOf(mp4), 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true }); fs.mkdirSync(framesDir, { recursive: true });
  const beatRows = beatExposure({ mp4, dur, declared, refArg, framesDir });
  fs.rmSync(framesDir, { recursive: true, force: true });

  lines.push(...exposureLines(beatRows), ...lightMapLines(beatRows, refArg));
  lines.push(beatTimingLine(filmPath, declared, detected));

  const { line: assetLine, missing } = assetUse(scene, filmPath);
  lines.push(assetLine);

  const clipped = runFindings('quality/audit.mjs', filmPath, `${baseOf(mp4)}.audit`)
    .filter((f) => f.code === 'clipped-text' || f.code === 'clipped-component');
  lines.push(`text clipped at edges: ${clipped.length}`);

  const blankSeams = runFindings('quality/gates/seams.mjs', filmPath, `${baseOf(mp4)}.seams`)
    .filter((f) => f.code === 'seam-empty' || f.code === 'seam-blank');
  lines.push(`blank-seam count: ${blankSeams.length}`);

  lines.push('=== END VERIFY ===');
  const hardFail = missing.length ? [`missing asset(s): ${missing.join(', ')}`] : [];
  return { text: lines.join('\n'), ok: !hardFail.length, hardFail, beats: beatRows, dur };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const D = readArg('D') || process.argv.slice(2).find((a) => !a.includes('='));
  const REF = readArg('REF');
  if (!D) {
    console.error('usage: node harness/dev/verify.mjs D=<film.json> [REF=<ref.mp4>]');
    process.exit(2);
  }
  const f = gateFindings();
  let result;
  try { result = verify(D, REF); }
  catch (e) { console.error(`✗ ${e.message}`); f.fail('verify-error', e.message); process.exit(2); }
  console.log(`\n${result.text}\n`);
  if (!result.ok) {
    for (const msg of result.hardFail || []) f.fail('verify-fail', msg);
    process.exit(1);
  }
  process.exit(0);
}
