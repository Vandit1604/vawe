// site-assets.mjs: the ONE way engine renders become site assets.
//
// out/<scene>.mp4  →  site/public/assets/<path>.mp4 (+ .jpg poster)
//
// This step used to be hand-run ffmpeg, so the site drifted from the scenes it claims to show.
// The manifest below is the contract: every video on the site names the scene it came from and
// the width it ships at. Re-run after re-rendering any scene.
//
//   node scripts/site/site-assets.mjs                 # encode from existing out renders
//   node scripts/site/site-assets.mjs --render        # render every scene first, then encode
//   node scripts/site/site-assets.mjs --only films    # limit to one group
//   node scripts/site/site-assets.mjs --check         # report staleness, write nothing
//
// Width is the ONLY size knob: height is derived from the source so the aspect ratio is never
// altered here. Cropping a composed frame would destroy the composition the engine just laid out.
//
// Widths are ~2x the CSS width the layout gives each video, because most viewers are on a 2x
// display: a 1x encode is visibly upscaled there (the homepage hero clip was being blown up 2.01x).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'out');
const PUB = path.join(root, 'site', 'public', 'assets');

// scene = films/scene/<scene>.json → out/<render>.mp4 → site/public/assets/<dest>
// poster = seconds into the clip to grab the still (pick a frame that reads at a glance).
// ar     = the ratio the SITE LAYOUT expects. Asserted against the real render, because a scene
//          that renders the wrong shape otherwise encodes and ships silently (it did: a missing
//          `aspect` made six scenes default to portrait and overwrite their landscape assets).
const MANIFEST = [
  // group      scene                render                    dest                        width  poster  ar
  ['hero',   'hero-site',          'hero-site',              'hero.mp4',                   1920, 2.0, 16 / 9],

  // The hero/footer bookend band. The ONLY contentless scene: no text, no blocks, no stings.
  // Every other entry in this table demonstrates a capability and therefore has words in it,
  // which behind a headline read as drifting smudges. Narrow (1280) because the page blurs it
  // to 30px and multiplies it over cobalt. It is judged on luminance movement, not detail.
  ['hero',   'site-backdrop',      'site-backdrop',          'backdrop.mp4',               1280, 1.0, 16 / 9],

  // homepage gallery strip, same scenes as the showcase rows, smaller
  // The `big` cell spans both columns, so it is the only one that renders near full width and the
  // only one encoded at 1920. Everything under it sits in a half-column: 1120 is already generous.
  // Keep the non-big count EVEN: the grid is two up, and an odd tail leaves a hole in the last row.
  ['strip',  'looks',              'looks',                  'looks.mp4',                  1920, 13.2, 16 / 9],
  ['strip',  'showcase-stings',    'showcase-stings',        'stings.mp4',                 1120, 4.0, 16 / 9],
  ['strip',  'showcase-type',      'showcase-type',          'type.mp4',                   1120, 3.0, 16 / 9],
  ['strip',  'showcase-cuts',      'showcase-cuts',          'cuts.mp4',                   1120, 2.0, 16 / 9],

  // showcase capability rows
  ['showcase', 'showcase-type',    'showcase-type',          'showcase/type.mp4',          1280, 3.0, 16 / 9],
  ['showcase', 'showcase-cuts',    'showcase-cuts',          'showcase/cuts.mp4',          1280, 2.0, 16 / 9],
  ['showcase', 'showcase-stings',  'showcase-stings',        'showcase/stings.mp4',        1280, 4.0, 16 / 9],
  ['showcase', 'showcase-data',    'showcase-data',          'showcase/data.mp4',          1280, 5.0, 16 / 9],
  ['showcase', 'showcase-ui',      'showcase-ui',            'showcase/ui.mp4',            1280, 5.0, 16 / 9],
  // Poster seconds are chosen for the frame, not the midpoint: looks posters on `thermal` (t=13.2),
  // the one beat that reads as colour at thumbnail size.
  ['showcase', 'looks',            'looks',                  'showcase/looks.mp4',         1280, 13.2, 16 / 9],
  ['showcase', 'gradient-showcase','gradient-showcase',      'showcase/gradients.mp4',     1280, 5.0, 16 / 9],
  // ditherkit opens on the dithered chart and spends its middle in a near-black transition, so a
  // midpoint poster would ship an almost empty still. 6.0 is the chart.
  ['showcase', 'ditherkit',        'ditherkit',              'showcase/dither.mp4',       1280, 6.0, 16 / 9],

  // the aspect trio: one scene, three ratios. Each box on the page carries the TRUE ratio.
  ['aspect', 'showcase-aspect',    'showcase-aspect.16x9',   'showcase/aspect-169.mp4',     800, 2.0, 16 / 9],
  ['aspect', 'showcase-aspect',    'showcase-aspect.9x16',   'showcase/aspect-916.mp4',     360, 2.0, 9 / 16],
  ['aspect', 'showcase-aspect',    'showcase-aspect.1x1',    'showcase/aspect-11.mp4',      520, 2.0, 1],

  // launch films. Two rows here used to be pixel recreations of other companies' marketing pages and
  // were converted into fillable TEMPLATES (docs: CREDITS.md · "Third-party brands"). saas-hero-launch
  // is authored with `{type:"block"}` sugar, which now expands at LOAD time (core/engine/expand.js) rather
  // than a separate `make expand` step, so it renders straight off the source file.
  // Posters are chosen for the frame, not the midpoint: 28s is the saas film's number-and-chart beat,
  // 9s is the tour's issue board. A 3s poster on either is a headline on an empty field.
  ['films',  'saas-hero-launch', 'saas-hero-launch', 'films/saas-hero-launch.mp4', 1280, 28.0, 16 / 9],
  ['films',  'product-feature-tour', 'product-feature-tour', 'films/product-feature-tour.mp4', 1280, 9.0, 16 / 9],
  ['films',  'argus-launch',       'argus-launch',           'films/argus-launch.mp4',     1280, 3.0, 16 / 9],
  ['films',  'preface-launch',     'preface-launch',         'films/preface-launch.mp4',   1280, 25.6, 16 / 9],
  ['films',  'threadcite-open',    'threadcite-open',        'films/threadcite-open.mp4', 1280, 8.0, 16 / 9],
  ['films',  'plinth-ad',          'plinth-ad',              'films/plinth-ad.mp4',       1280, 12.0, 16 / 9],
];

// showcase-aspect is the one scene that intentionally renders three ratios in one pass.
const MULTI_ASPECT = { 'showcase-aspect': '16:9,9:16,1:1' };

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const only = val('--only');
const DRY = has('--check');

const sh = (cmd, a) => execFileSync(cmd, a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const probe = (f) => {
  const [w, h] = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height', '-of', 'csv=p=0', f]).trim().split(',').map(Number);
  return { w, h };
};
const hasAudio = (f) => sh('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries',
  'stream=codec_type', '-of', 'csv=p=0', f]).trim().length > 0;

// `--only` matches a GROUP or a SINGLE ROW, by scene name or by destination. It used to match the
// group alone, which is how one film got re-encoded along with five others, twice in one day: asking
// for `--only films` when you meant one film hands you every film, and every one of them encodes from
// whatever happens to be sitting in out/. Naming the row is the fix, and it is what anyone actually
// means when they say --only.
const rows = MANIFEST.filter((r) => !only
  || r[0] === only                                   // a group: films, strip, showcase, hero
  || r[1] === only                                   // the scene name
  || r[3] === only || path.basename(r[3], '.mp4') === only);  // the destination, with or without .mp4
if (only && !rows.length) {
  console.error(`✗ --only ${only} matched no group, scene or destination.`);
  console.error(`  groups: ${[...new Set(MANIFEST.map((r) => r[0]))].join(' ')}`);
  console.error(`  or name one row, e.g. --only plinth-ad`);
  process.exit(2);
}
if (!rows.length) { console.error(`no rows for --only ${only}`); process.exit(1); }

// 1. optionally re-render each distinct scene through the engine (which runs the gates)
if (has('--render')) {
  const scenes = [...new Set(rows.map((r) => r[1]))];
  for (const s of scenes) {
    const data = path.join(root, 'films', 'scene', `${s}.json`);
    if (!fs.existsSync(data)) { console.error(`✗ missing scene ${data}`); process.exit(1); }
    const extra = MULTI_ASPECT[s] ? ['--aspect', MULTI_ASPECT[s]] : [];
    process.stdout.write(`▶ render ${s}${extra.length ? ` (${extra[1]})` : ''} … `);
    try {
      execFileSync(path.join(root, 'bin', 'vawe'), [data, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
      console.log('ok');
    } catch (e) { console.log('FAILED'); console.error(e.stderr?.toString() || e.message); process.exit(1); }
  }
}

// 2. encode each row to its web size + poster
let wrote = 0, stale = 0, stalerender = 0;
let mismatched = 0;
const missingRenders = [];
for (const [group, scene, render, dest, width, poster, ar] of rows) {
  const src = path.join(OUT, `${render}.mp4`);
  const dst = path.join(PUB, dest);
  // Report and CONTINUE, then fail at the end. Exiting here meant one stale manifest row hid every
  // row beneath it: three new entries added below the aspect trio silently never encoded, and the
  // only output was the one error about the trio. A build step that stops at the first problem
  // reports one problem per run, which is the slowest possible way to fix five.
  if (!fs.existsSync(src)) { console.error(`✗ ${dest}: no render at out/${render}.mp4, run with --render`); missingRenders.push(dest); continue; }

  const { w, h } = probe(src);

  // A scene rendered in the wrong shape must NEVER encode silently. Six scenes with no `aspect`
  // defaulted to portrait and overwrote their landscape assets; every row still printed ✓.
  const actual = w / h;
  if (Math.abs(actual - ar) / ar > 0.01) {
    console.error(`✗ ${dest}: ${render}.mp4 is ${w}x${h} (${actual.toFixed(3)}) but the layout expects ${ar.toFixed(3)}.`);
    console.error(`  → the scene is rendering the wrong shape. Check "aspect" in films/scene/${scene}.json.`);
    mismatched++;
    continue;
  }

  // A RENDER OLDER THAN ITS SCENE IS NOT A RENDER OF THAT SCENE. out/ is a scratch directory holding
  // whatever anyone last rendered, and nothing here asked whether the file in it came from the JSON on
  // disk today. So encoding took the newest bytes it could find and shipped them. Cheap to check,
  // because the scene path is already known and mtime is free.
  const sceneJson = path.join(root, 'films/scene', `${scene}.json`);
  if (fs.existsSync(sceneJson) && fs.statSync(sceneJson).mtimeMs > fs.statSync(src).mtimeMs) {
    console.error(`✗ ${dest}: out/${render}.mp4 is OLDER than films/scene/${scene}.json.`);
    console.error(`  → that render predates the scene, so it is not a render of it. Re-render first:`);
    console.error(`     ./bin/vawe films/scene/${scene}.json`);
    stalerender++;
    continue;
  }

  const outH = Math.round((width * h) / w / 2) * 2;       // even height; ratio preserved exactly
  const srcTime = fs.statSync(src).mtimeMs;
  const dstTime = fs.existsSync(dst) ? fs.statSync(dst).mtimeMs : 0;
  // Staleness is not only "the source moved". Editing THIS FILE, a width, a poster second, must
  // also invalidate the output, and mtime cannot see that: changing stings from 1920 to 1120 was
  // reported "up to date" and the 1920 encode stayed on the site, manifest and reality disagreeing
  // in silence. Ask the existing file what shape it actually is; ffprobe is already a dependency
  // here, so this needs no sidecar state that could itself go stale.
  let builtW = null;
  if (dstTime) { try { builtW = probe(dst).w; } catch { /* unreadable → treat as stale, re-encode */ } }
  const isStale = srcTime > dstTime || builtW !== width;

  if (DRY) {
    if (isStale) { stale++; console.log(`~ stale  ${dest.padEnd(28)} ${w}x${h} → ${width}x${outH}  (${scene})`); }
    continue;
  }
  if (!isStale && !has('--force')) { console.log(`· skip   ${dest}  (up to date)`); continue; }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const a = hasAudio(src)
    ? ['-c:a', 'aac', '-b:a', '128k']
    : ['-an'];
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src,
    '-vf', `scale=${width}:${outH}:flags=lanczos`,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '20', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...a, dst], { stdio: 'inherit' });

  const jpg = dst.replace(/\.mp4$/, '.jpg');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(poster), '-i', src,
    '-vframes', '1', '-vf', `scale=${width}:${outH}:flags=lanczos`, '-q:v', '4', jpg], { stdio: 'inherit' });

  const kb = (fs.statSync(dst).size / 1024) | 0;
  console.log(`✓ ${dest.padEnd(28)} ${width}x${outH}  ${String(kb).padStart(5)}KB  ← ${render}.mp4`);
  wrote++;
}

if (missingRenders.length) {
  console.error(`\n✗ ${missingRenders.length} manifest row(s) have no render in out/:`);
  for (const d of missingRenders) console.error(`    ${d}`);
  console.error('  Re-run with --render, or drop the row. Rows still in the manifest but absent from');
  console.error('  out/ mean the site is serving whatever was committed last, which nothing re-checks.');
  process.exitCode = 1;
}
if (stalerender) {
  console.error(`\n✗ ${stalerender} render(s) are OLDER than the scene they claim to come from, NOT written.`);
  console.error(`  Re-render those scenes, then re-run. out/ is a scratch directory: what is in it is`);
  console.error(`  whatever anyone rendered last, not necessarily a render of the JSON on disk today.`);
  process.exitCode = 1;
}
if (mismatched) {
  console.error(`\n✗ ${mismatched} render(s) have the wrong aspect, NOT written. Fix the scene, re-render, re-run.`);
  process.exit(1);
}
if (DRY) console.log(stale ? `\n~ ${stale} asset(s) stale, re-run without --check` : '\n✓ all site assets current');
else console.log(`\n✓ ${wrote} asset(s) written${wrote ? '' : ' (all current, use --force to rebuild)'}`);
