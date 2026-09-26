#!/usr/bin/env node
// harness/media/match.mjs: REFERENCE MATCHING for a recreation. Where content-check.mjs asks "is this
// act as RICH as the reference's", this asks "does this beat MOVE the way the reference moves": a
// dense frame-by-frame strip (reference row over render row), a difference overlay and a mean SSIM,
// per beat, ranked worst-to-best in match.md. `make study REF=<video> D=<film.json> MATCH=1`.
//
// BEATS, NEVER INVENTED (same reasoning as content-check.mjs): the film's own storyboard beats if
// `<film>.storyboard.md` exists, else scene cuts detected IN THE REFERENCE (ffmpeg select=gt(scene,0.3),
// shot-detect.mjs's own detectCuts: the same detector `make study` uses). Both timelines are assumed to
// share one clock: this compares a recreation against the reference it was built to match, not two
// unrelated films.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireTool, probeSize } from '../lib/frame-forensics.mjs';
import { scratch } from '../lib/scratch.mjs';
import { detectCuts } from './shot-detect.mjs';
import { sampleFrames, tileGrid, blendDiff, ssimOf, gradeable, meanColorOf, labDeltaE } from '../../quality/gates/tile.mjs';
import { actsFromStoryboard, findStoryboard } from '../../quality/gates/content-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, envKey, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : ((envKey && process.env[envKey]) || d); };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

const REF = positional[0] || process.env.REF;
const FILM = positional[1] || process.env.D;
if (!REF || !FILM) die('usage: make study REF=<reference.mp4> D=<film.json> MATCH=1  '
  + '(or: node harness/media/match.mjs <ref.mp4> <film.json>)');
if (!fs.existsSync(REF)) die(`no such reference video: ${REF}`);

const STEP = Number(flag('--step', 'STEP', 0.1));   // dense strip: one sample every 0.1s, per the spec

requireTool('ffmpeg');
requireTool('ffprobe');

const filmPath = path.resolve(ROOT, FILM);
if (!fs.existsSync(filmPath)) die(`no such film: ${FILM}`);
const slug = path.basename(filmPath).replace(/\.json$/, '');
const g = gradeable(filmPath);
if (!g.ok) die(`${g.why}. ${g.fix}`);
const mp4 = g.mp4;

const { width: W, height: H } = probeSize(mp4);
if (!W || !H) die(`${mp4} has no readable video stream.`);

// ── beats: the film's own storyboard first, the reference's own detected cuts otherwise ────────────
const sbPath = findStoryboard(filmPath, slug, ROOT);
let beats = sbPath ? actsFromStoryboard(fs.readFileSync(sbPath, 'utf8')) : null;
let beatsSource = sbPath ? `storyboard beats (${path.relative(ROOT, sbPath)})` : null;

if (!beats || !beats.length) {
  const cutsDir = scratch('match', slug, '.cuts');
  const { cuts } = detectCuts(REF, cutsDir, 0.3, 0.4);
  fs.rmSync(cutsDir, { recursive: true, force: true });
  const { duration } = probeSize(REF);
  if (!(duration > 0)) die(`${REF} has no readable duration.`);
  const bounds = [0, ...cuts.map((c) => c.t), duration].filter((t, i, a) => i === 0 || t > a[i - 1]);
  beats = bounds.slice(0, -1)
    .map((t0, i) => ({ start: t0, end: bounds[i + 1], label: `shot ${i + 1}` }))
    .filter((b) => b.end - b.start > 0.05);
  beatsSource = `${cuts.length} scene cut(s) detected in the reference (select=gt(scene,0.3))`;
}
if (!beats.length) die('no beats: no storyboard and no detectable scene cuts in the reference.');

const OUT_DIR = flag('--out', null, path.join(ROOT, 'out', 'match', slug));
fs.mkdirSync(OUT_DIR, { recursive: true });
const framesDir = scratch('match', slug, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const MAX_SAMPLES = 60;   // ponytail: bounds a beat's ffmpeg call count; a longer beat samples coarser, not slower.
const THUMB_W = 240;      // strips/diffs are for a human to scan, not to measure; SSIM stays on the full-size tiles below.
const THUMB_H = Math.max(2, Math.round((THUMB_W * H) / W));

const results = [];
for (const [i, b] of beats.entries()) {
  const n = Math.min(MAX_SAMPLES, Math.max(1, Math.round((b.end - b.start) / STEP)));
  const span = { t0: b.start, len: b.end - b.start, n };
  // Full-size, "both scaled to the film's size": what SSIM measures against.
  const refTiles = sampleFrames(REF, span, path.join(framesDir, `b${i}_ref`), { tw: W, th: H });
  const renderTiles = sampleFrames(mp4, span, path.join(framesDir, `b${i}_out`), { tw: W, th: H });
  const pairs = Math.min(refTiles.length, renderTiles.length);
  if (!pairs) { results.push({ i: i + 1, label: b.label, start: b.start, end: b.end, samples: 0, ssim: null }); continue; }

  // Thumbnail-size, separately sampled: what the strip and the diff overlay show.
  const refThumbs = sampleFrames(REF, span, path.join(framesDir, `b${i}_refThumb`), { tw: THUMB_W, th: THUMB_H });
  const renderThumbs = sampleFrames(mp4, span, path.join(framesDir, `b${i}_outThumb`), { tw: THUMB_W, th: THUMB_H });
  const thumbPairs = Math.min(pairs, refThumbs.length, renderThumbs.length);
  const diffThumbs = Array.from({ length: thumbPairs },
    (_, k) => blendDiff(refThumbs[k], renderThumbs[k], path.join(framesDir, `b${i}_diff_${k}.png`)));

  const stripPath = path.join(OUT_DIR, `beat${i + 1}.strip.png`);
  tileGrid([...refThumbs.slice(0, thumbPairs), ...renderThumbs.slice(0, thumbPairs)],
    { cols: thumbPairs, tw: THUMB_W, th: THUMB_H, gap: 1, out: stripPath });
  const diffPath = path.join(OUT_DIR, `beat${i + 1}.diff.png`);
  tileGrid(diffThumbs, { cols: thumbPairs, tw: THUMB_W, th: THUMB_H, gap: 1, out: diffPath });

  const ssims = Array.from({ length: pairs }, (_, k) => ssimOf(refTiles[k], renderTiles[k])).filter((v) => v != null);
  const meanSsim = ssims.length ? ssims.reduce((a, v) => a + v, 0) / ssims.length : null;

  // Colour/light distance: SSIM rewards two frames agreeing on STRUCTURE, so a black frame against a
  // black-heavy reference scores well regardless of colour. deltaEs, off the same thumbnails the strip
  // already sampled, catches that: two frames of matching shape but wrong colour or brightness.
  const deltaEs = Array.from({ length: thumbPairs }, (_, k) => labDeltaE(meanColorOf(refThumbs[k]), meanColorOf(renderThumbs[k])))
    .filter((v) => v != null);
  const meanDeltaE = deltaEs.length ? deltaEs.reduce((a, v) => a + v, 0) / deltaEs.length : null;
  const colorSim = meanDeltaE != null ? Math.max(0, 1 - meanDeltaE / 100) : null;
  const parts = [meanSsim, colorSim].filter((v) => v != null);
  const combined = parts.length ? parts.reduce((a, v) => a + v, 0) / parts.length : null;

  results.push({ i: i + 1, label: b.label, start: b.start, end: b.end, samples: pairs,
    ssim: meanSsim, deltaE: meanDeltaE, combined, strip: stripPath, diff: diffPath });
}
fs.rmSync(framesDir, { recursive: true, force: true });

const ranked = [...results].sort((a, b2) => (a.combined ?? -1) - (b2.combined ?? -1));
const rel = (p) => path.relative(ROOT, p);
const fmt = (v, d = 4) => (v != null ? v.toFixed(d) : 'n/a');
const lines = [
  `# match: ${slug} vs ${path.basename(REF)}`, '',
  `beats: ${beats.length} (${beatsSource}) · reference: ${REF} · render: ${rel(mp4)} · size ${W}x${H} · step ${STEP}s`, '',
  '| beat | window | samples | mean SSIM | colour ΔE | combined | strip | diff |',
  '|---|---|---|---|---|---|---|---|',
  ...ranked.map((r) => `| ${r.i} (${r.label}) | ${r.start.toFixed(1)}-${r.end.toFixed(1)}s | ${r.samples} `
    + `| ${fmt(r.ssim)} | ${fmt(r.deltaE, 1)} | ${fmt(r.combined)} | ${r.strip ? rel(r.strip) : 'n/a'} | ${r.diff ? rel(r.diff) : 'n/a'} |`),
  '',
  '_ranked worst-to-best by the combined score: mean SSIM (structure) averaged with a colour similarity',
  'derived from mean Lab ΔE (colour/light, so a dark frame can no longer coast on SSIM alone)._',
];
const mdPath = path.join(OUT_DIR, 'match.md');
fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);

console.log(`\n  MATCH · ${slug} vs ${path.basename(REF)}\n`);
console.log(`  beats: ${beats.length} (${beatsSource})`);
for (const r of ranked)
  console.log(`  beat ${r.i} (${r.label}, ${r.start.toFixed(1)}-${r.end.toFixed(1)}s): ssim ${fmt(r.ssim)} · `
    + `ΔE ${fmt(r.deltaE, 1)} · combined ${fmt(r.combined)}`);
console.log(`\n  ✓ wrote ${rel(mdPath)}`);
