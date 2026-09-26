#!/usr/bin/env node
// harness/media/match.mjs: REFERENCE MATCHING for a recreation. Where content-check.mjs asks "is this
// act as RICH as the reference's", this asks "does this beat MOVE the way the reference moves": a
// dense frame-by-frame strip (reference row over render row), a difference overlay and a mean SSIM,
// per beat, ranked worst-to-best in match.md. `make study REF=<video> D=<film.json> MATCH=1`.
//
// `LIGHT=1` adds one more column: a per-beat light-map ΔE (harness/lib/light-map.mjs), the LOW-
// FREQUENCY brightness and colour a beat reads at a glance, which SSIM and the colour ΔE below both
// miss (a mostly-black render against a reference that reads several times brighter can still score
// fine on structure and on one averaged colour). A beat that scores badly there is a candidate for
// `harness/media/light-fit.mjs`, which fits a replacement background off the same light map.
//
// BEATS, NEVER INVENTED (same reasoning as content-check.mjs): the film's own storyboard beats if
// `<film>.storyboard.md` exists, else scene cuts detected IN THE REFERENCE (ffmpeg select=gt(scene,0.3),
// shot-detect.mjs's own detectCuts: the same detector `make study` uses). Both timelines are assumed to
// share one clock: this compares a recreation against the reference it was built to match, not two
// unrelated films.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireTool, probeSize, probeFps } from '../lib/frame-forensics.mjs';
import { scratch } from '../lib/scratch.mjs';
import { detectCuts } from './shot-detect.mjs';
import { sampleFrames, tileGrid, blendDiff, ssimOf, gradeable, meanColorOf, labDeltaE } from '../../quality/gates/tile.mjs';
import { actsFromStoryboard, findStoryboard } from '../../quality/gates/content-check.mjs';
import { lightMap, lightMapDistance } from '../lib/light-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
// `make study REF=<x> D=<y> MATCH=1` is the DOCUMENTED invocation (engine-doctrine/CRAFT/RECREATION.md),
// and an agent that copies it verbatim into `node harness/media/match.mjs` (skipping `make`, common when
// debugging or scripting) passes `REF=<x>` and `D=<y>` as literal argv tokens, not `make` variables: an
// earlier agent hit exactly this and reported the flags "mismatched". Accepted here too, so the one line
// the doc teaches works both ways instead of only through `make`.
const KV = Object.fromEntries(argv.filter((a) => /^[A-Z_]+=/.test(a)).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const flag = (n, envKey, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : ((envKey && (KV[envKey] || process.env[envKey])) || d); };
const positional = argv.filter((a, i) => !a.startsWith('--') && !/^[A-Z_]+=/.test(a) && !(argv[i - 1] || '').startsWith('--'));
const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

const REF = KV.REF || positional[0] || process.env.REF;
const FILM = KV.D || positional[1] || process.env.D;
if (!REF || !FILM) die('usage: make study REF=<reference.mp4> D=<film.json> MATCH=1  '
  + '(or: node harness/media/match.mjs <ref.mp4> <film.json>)');
if (!fs.existsSync(REF)) die(`no such reference video: ${REF}`);

const STEP = Number(flag('--step', 'STEP', 0.1));   // dense strip: one sample every 0.1s, per the spec
const LIGHT = !!flag('--light', 'LIGHT', null);   // add each beat's light-map ΔE (harness/lib/light-map.mjs)

requireTool('ffmpeg');
requireTool('ffprobe');

const filmPath = path.resolve(ROOT, FILM);
if (!fs.existsSync(filmPath)) die(`no such film: ${FILM}`);
const slug = path.basename(filmPath).replace(/\.json$/, '');
const g = gradeable(filmPath);
// A DRAFT RENDER (`make dev`, 30fps) writes the SAME out/<slug>.mp4 a full `make video`/`make ship`
// does (renderOf names one path for both), so `gradeable`'s own freshness check already accepts either:
// it only refuses when the JSON is newer than whatever is there. The one thing it never did was say
// WHICH render it scored, so a fresh draft and a fresh final looked identical in the report; a friction
// this caused was an agent believing a draft was silently refused when it had in fact been scored.
if (!g.ok) die(`${g.why}. ${g.fix}, or \`make dev D=${FILM} --draft\` for a quick pass.`);
const mp4 = g.mp4;

const { width: W, height: H } = probeSize(mp4);
const fps = probeFps(mp4);
const renderKind = fps && fps <= 31 ? 'draft (--draft, ~30fps)' : 'final (~60fps)';
if (!W || !H) die(`${mp4} has no readable video stream.`);

// ── beats: the film's own storyboard first, the reference's own detected cuts otherwise ────────────
const sbPath = findStoryboard(filmPath, slug, ROOT);
let beats = sbPath ? actsFromStoryboard(fs.readFileSync(sbPath, 'utf8')) : null;
let beatsSource = sbPath ? `storyboard beats (${path.relative(ROOT, sbPath)})` : null;

// A storyboard that EXISTS but names no usable beat (a shape the parser does not read, or beats with
// no start/end) used to fall through to cut-detection with no word said about it: the report read
// "scene cut(s) detected in the reference" as if no storyboard had ever been written, and an author
// who had in fact written one had no way to learn it went unread.
if (sbPath && (!beats || !beats.length)) {
  console.log(`  ⚠ ${path.relative(ROOT, sbPath)} exists but named no usable beat (no \`## Beat N:\` `
    + 'heading and no beat table this parser reads), falling back to scene cuts detected in the reference.');
}

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

  // The light map: the LOW-FREQUENCY brightness/colour of one representative frame (the beat's
  // midpoint, off the same full-size tiles SSIM already used), not the beat's fine structure. A
  // recreation that is mostly black against a reference that reads 4-8x brighter can still score fine
  // on SSIM (both agree on shape) and even on the mean-colour ΔE above (one average can hide a bright
  // corner against a dark rest); this is the check neither of those is built to make.
  let lightDist = null;
  if (LIGHT) {
    const mid = Math.floor((pairs - 1) / 2);
    lightDist = lightMapDistance(lightMap(refTiles[mid]), lightMap(renderTiles[mid]));
  }

  results.push({ i: i + 1, label: b.label, start: b.start, end: b.end, samples: pairs,
    ssim: meanSsim, deltaE: meanDeltaE, combined, light: lightDist, strip: stripPath, diff: diffPath });
}
fs.rmSync(framesDir, { recursive: true, force: true });

const ranked = [...results].sort((a, b2) => (a.combined ?? -1) - (b2.combined ?? -1));
const rel = (p) => path.relative(ROOT, p);
const fmt = (v, d = 4) => (v != null ? v.toFixed(d) : 'n/a');
const lines = [
  `# match: ${slug} vs ${path.basename(REF)}`, '',
  `beats: ${beats.length} (${beatsSource}) · reference: ${REF} · render: ${rel(mp4)}, ${renderKind} · size ${W}x${H} · step ${STEP}s`, '',
  `| beat | window | samples | mean SSIM | colour ΔE | combined${LIGHT ? ' | light ΔE' : ''} | strip | diff |`,
  `|---|---|---|---|---|---|${LIGHT ? '---|' : ''}---|---|`,
  ...ranked.map((r) => `| ${r.i} (${r.label}) | ${r.start.toFixed(1)}-${r.end.toFixed(1)}s | ${r.samples} `
    + `| ${fmt(r.ssim)} | ${fmt(r.deltaE, 1)} | ${fmt(r.combined)}${LIGHT ? ` | ${fmt(r.light, 1)}` : ''} `
    + `| ${r.strip ? rel(r.strip) : 'n/a'} | ${r.diff ? rel(r.diff) : 'n/a'} |`),
  '',
  '_ranked worst-to-best by the combined score: mean SSIM (structure) averaged with a colour similarity',
  'derived from mean Lab ΔE (colour/light, so a dark frame can no longer coast on SSIM alone)._',
  ...(LIGHT ? ['',
    '_light ΔE (harness/lib/light-map.mjs): mean Lab distance between a 16x9 low-frequency light map of',
    'the reference and of the render, one representative frame per beat. Catches what the two scores',
    'above cannot: a render that is mostly black against a reference that reads several times brighter',
    'can still score well on structure and on a single averaged colour. `harness/media/light-fit.mjs`',
    'fits a replacement background for a beat that scores badly here._'] : []),
];
const mdPath = path.join(OUT_DIR, 'match.md');
fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);

console.log(`\n  MATCH · ${slug} vs ${path.basename(REF)}\n`);
console.log(`  scored: ${rel(mp4)}, ${renderKind}, ${W}x${H}`);
console.log(`  beats: ${beats.length} (${beatsSource})`);
for (const r of ranked)
  console.log(`  beat ${r.i} (${r.label}, ${r.start.toFixed(1)}-${r.end.toFixed(1)}s): ssim ${fmt(r.ssim)} · `
    + `ΔE ${fmt(r.deltaE, 1)} · combined ${fmt(r.combined)}${LIGHT ? ` · light ΔE ${fmt(r.light, 1)}` : ''}`);
console.log(`\n  ✓ wrote ${rel(mdPath)}`);
