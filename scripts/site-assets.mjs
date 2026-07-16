// site-assets.mjs — the ONE way engine renders become site assets.
//
// engine/out/<scene>.mp4  →  site/public/assets/<path>.mp4 (+ .jpg poster)
//
// This step used to be hand-run ffmpeg, so the site drifted from the scenes it claims to show.
// The manifest below is the contract: every video on the site names the scene it came from and
// the width it ships at. Re-run after re-rendering any scene.
//
//   node scripts/site-assets.mjs                 # encode from existing engine/out renders
//   node scripts/site-assets.mjs --render        # render every scene first, then encode
//   node scripts/site-assets.mjs --only films    # limit to one group
//   node scripts/site-assets.mjs --check         # report staleness, write nothing
//
// Width is the ONLY size knob: height is derived from the source so the aspect ratio is never
// altered here. Cropping a composed frame would destroy the composition the engine just laid out.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'engine', 'out');
const PUB = path.join(root, 'site', 'public', 'assets');

// scene = formats/scene/<scene>.json → engine/out/<render>.mp4 → site/public/assets/<dest>
// poster = seconds into the clip to grab the still (pick a frame that reads at a glance).
// ar     = the ratio the SITE LAYOUT expects. Asserted against the real render, because a scene
//          that renders the wrong shape otherwise encodes and ships silently (it did: a missing
//          `aspect` made six scenes default to portrait and overwrite their landscape assets).
const MANIFEST = [
  // group      scene                render                    dest                        width  poster  ar
  ['hero',   'hero-site',          'hero-site',              'hero.mp4',                   1600, 2.0, 16 / 9],

  // homepage gallery strip — same scenes as the showcase rows, smaller
  ['strip',  'showcase-stings',    'showcase-stings',        'stings.mp4',                 1100, 4.0, 16 / 9],
  ['strip',  'showcase-type',      'showcase-type',          'type.mp4',                    900, 3.0, 16 / 9],
  ['strip',  'showcase-cuts',      'showcase-cuts',          'cuts.mp4',                    900, 2.0, 16 / 9],

  // showcase capability rows
  ['showcase', 'showcase-type',    'showcase-type',          'showcase/type.mp4',          1000, 3.0, 16 / 9],
  ['showcase', 'showcase-cuts',    'showcase-cuts',          'showcase/cuts.mp4',          1000, 2.0, 16 / 9],
  ['showcase', 'showcase-stings',  'showcase-stings',        'showcase/stings.mp4',        1000, 4.0, 16 / 9],
  ['showcase', 'showcase-data',    'showcase-data',          'showcase/data.mp4',          1000, 5.0, 16 / 9],
  ['showcase', 'showcase-ui',      'showcase-ui',            'showcase/ui.mp4',            1000, 5.0, 16 / 9],

  // the aspect trio — one scene, three ratios. Each box on the page carries the TRUE ratio.
  ['aspect', 'showcase-aspect',    'showcase-aspect.16x9',   'showcase/aspect-169.mp4',     800, 2.0, 16 / 9],
  ['aspect', 'showcase-aspect',    'showcase-aspect.9x16',   'showcase/aspect-916.mp4',     360, 2.0, 9 / 16],
  ['aspect', 'showcase-aspect',    'showcase-aspect.1x1',    'showcase/aspect-11.mp4',      520, 2.0, 1],

  // premium brand films
  ['films',  'linear-launch',      'linear-launch',          'films/linear-launch.mp4',    1280, 3.0, 16 / 9],
  ['films',  'stripe',             'stripe',                 'films/stripe.mp4',           1280, 3.0, 16 / 9],
  ['films',  'argus-launch',       'argus-launch',           'films/argus-launch.mp4',     1280, 3.0, 16 / 9],
  ['films',  'creed-launch',       'creed-launch',           'films/creed-launch.mp4',     1280, 3.0, 16 / 9],
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

const rows = MANIFEST.filter((r) => !only || r[0] === only);
if (!rows.length) { console.error(`no rows for --only ${only}`); process.exit(1); }

// 1. optionally re-render each distinct scene through the engine (which runs the gates)
if (has('--render')) {
  const scenes = [...new Set(rows.map((r) => r[1]))];
  for (const s of scenes) {
    const data = path.join(root, 'formats', 'scene', `${s}.json`);
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
let wrote = 0, stale = 0;
let mismatched = 0;
for (const [group, scene, render, dest, width, poster, ar] of rows) {
  const src = path.join(OUT, `${render}.mp4`);
  const dst = path.join(PUB, dest);
  if (!fs.existsSync(src)) { console.error(`✗ ${dest}: no render at engine/out/${render}.mp4 — run with --render`); process.exit(1); }

  const { w, h } = probe(src);

  // A scene rendered in the wrong shape must NEVER encode silently. Six scenes with no `aspect`
  // defaulted to portrait and overwrote their landscape assets; every row still printed ✓.
  const actual = w / h;
  if (Math.abs(actual - ar) / ar > 0.01) {
    console.error(`✗ ${dest}: ${render}.mp4 is ${w}x${h} (${actual.toFixed(3)}) but the layout expects ${ar.toFixed(3)}.`);
    console.error(`  → the scene is rendering the wrong shape. Check "aspect" in formats/scene/${scene}.json.`);
    mismatched++;
    continue;
  }

  const outH = Math.round((width * h) / w / 2) * 2;       // even height; ratio preserved exactly
  const srcTime = fs.statSync(src).mtimeMs;
  const dstTime = fs.existsSync(dst) ? fs.statSync(dst).mtimeMs : 0;
  const isStale = srcTime > dstTime;

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
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...a, dst], { stdio: 'inherit' });

  const jpg = dst.replace(/\.mp4$/, '.jpg');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(poster), '-i', src,
    '-vframes', '1', '-vf', `scale=${width}:${outH}:flags=lanczos`, '-q:v', '4', jpg], { stdio: 'inherit' });

  const kb = (fs.statSync(dst).size / 1024) | 0;
  console.log(`✓ ${dest.padEnd(28)} ${width}x${outH}  ${String(kb).padStart(5)}KB  ← ${render}.mp4`);
  wrote++;
}

if (mismatched) {
  console.error(`\n✗ ${mismatched} render(s) have the wrong aspect — NOT written. Fix the scene, re-render, re-run.`);
  process.exit(1);
}
if (DRY) console.log(stale ? `\n~ ${stale} asset(s) stale — re-run without --check` : '\n✓ all site assets current');
else console.log(`\n✓ ${wrote} asset(s) written${wrote ? '' : ' (all current — use --force to rebuild)'}`);
