import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { frameTile, tileGrid } from '../../quality/gates/tile.mjs';
import { sceneDims } from '../../core/layout/safe.js';

const BRIEFS_DIR = 'quality/runs/evals/briefs';
const RUNS_DIR = 'quality/runs/evals/runs';
const BASELINE_DIR = 'quality/runs/evals/baseline';
const FRAMES_PER_SHEET = 6;
const SHEET_COLS = 3;
const SHEET_GAP = 6;
const DURATION_TOLERANCE = 0.1; // seconds

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);

function commitHead() {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return null; }
}

function briefNames() {
  return fs.readdirSync(BRIEFS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

function ffprobe(args) {
  return execFileSync('ffprobe', args, { encoding: 'utf8' }).trim();
}

function probeVideo(mp4) {
  const dims = ffprobe(['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=s=x:p=0', mp4]);
  const [w, h] = dims.split('x').map(Number);
  const duration = parseFloat(ffprobe(['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', mp4]));
  return { w, h, duration };
}

function probeImage(png) {
  const dims = ffprobe(['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=s=x:p=0', png]);
  const [w, h] = dims.split('x').map(Number);
  return { w, h };
}

function tileBoxFor(w, h) {
  return w >= h ? { tw: 600, th: 338 } : { tw: 340, th: 604 };
}

/** Render one brief (draft, 2 workers) into `runDir`, build its contact sheet, and report liveness. */
function renderBrief(name, runDir) {
  const src = path.join(BRIEFS_DIR, `${name}.json`);
  const scene = JSON.parse(fs.readFileSync(src, 'utf8'));
  const [expectW, expectH] = sceneDims(scene);

  execFileSync('./bin/vawe', [src, '--draft', '--workers', '2'],
    { stdio: 'inherit', env: { ...process.env, VAWE_SERVE_ALL: '1' } });
  const rendered = path.join('out', `${name}.mp4`);
  const mp4 = path.join(runDir, `${name}.mp4`);
  fs.copyFileSync(rendered, mp4);

  const got = probeVideo(mp4);
  const durationOk = Math.abs(got.duration - scene.duration) <= DURATION_TOLERANCE;
  const dimsOk = got.w === expectW && got.h === expectH;

  const box = tileBoxFor(expectW, expectH);
  const tmp = fs.mkdtempSync(path.join(runDir, `.tiles-${name}-`));
  const tiles = [];
  for (let i = 0; i < FRAMES_PER_SHEET; i++) {
    const wanted = (scene.duration * i) / (FRAMES_PER_SHEET - 1);
    const t = Math.min(wanted, Math.max(0, got.duration - 0.08));
    tiles.push(frameTile(mp4, t, path.join(tmp, `f${i}.png`), { ...box, label: `${t.toFixed(1)}s` }));
  }
  const sheet = path.join(runDir, `${name}.sheet.png`);
  tileGrid(tiles, { cols: SHEET_COLS, ...box, gap: SHEET_GAP, out: sheet });
  fs.rmSync(tmp, { recursive: true, force: true });

  return {
    name,
    ok: durationOk && dimsOk,
    duration: +got.duration.toFixed(2),
    expectedDuration: scene.duration,
    dims: { w: got.w, h: got.h },
    expectedDims: { w: expectW, h: expectH },
    mp4, sheet,
  };
}

/** Render every brief into a fresh timestamped run dir. Returns the manifest (also written to disk). */
function runEvals() {
  if (!fs.existsSync(BRIEFS_DIR)) { console.error(`✗ no ${BRIEFS_DIR}`); process.exit(2); }
  const names = briefNames();
  if (!names.length) { console.error(`✗ ${BRIEFS_DIR} has no *.json briefs`); process.exit(2); }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  const runDir = path.join(RUNS_DIR, stamp);
  fs.mkdirSync(runDir, { recursive: true });

  console.log(`\n  EVALS · ${names.length} brief(s) · draft · → ${runDir}\n`);
  const briefs = names.map((name) => {
    process.stdout.write(`  ${name} ... `);
    const r = renderBrief(name, runDir);
    console.log(r.ok ? 'ok' : 'LIVENESS FAILED');
    return r;
  });

  const box = { tw: 600, th: 338 };
  const midTiles = briefs.map((b) => {
    const t = Math.min(b.expectedDuration / 2, Math.max(0, b.duration - 0.08));
    return frameTile(b.mp4, t, path.join(runDir, `.mid-${b.name}.png`), { ...box, label: b.name });
  });
  const combined = path.join(runDir, 'sheet.png');
  tileGrid(midTiles, { cols: Math.min(4, midTiles.length), ...box, gap: SHEET_GAP, out: combined });
  midTiles.forEach((t) => fs.rmSync(t, { force: true }));

  const manifest = {
    when: new Date().toISOString(),
    commit: commitHead(),
    briefsDir: BRIEFS_DIR,
    runDir,
    sheet: combined,
    briefs,
  };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

  const failed = briefs.filter((b) => !b.ok);
  console.log(`\n  → ${runDir}`);
  console.log(`  combined sheet: ${combined}`);
  if (failed.length) {
    console.log(`\n  ✗ LIVENESS FAILED for ${failed.length}/${briefs.length}: ${failed.map((b) => b.name).join(', ')}`);
    for (const b of failed) {
      console.log(`    ${b.name}: duration ${b.duration}s (want ${b.expectedDuration}s), dims ${b.dims.w}x${b.dims.h} (want ${b.expectedDims.w}x${b.expectedDims.h})`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\n  ✓ all ${briefs.length} briefs live (duration + dims within tolerance).`);
  }
  return manifest;
}

/** Stack two same-aspect sheets (before over after) into one comparison image. */
function stackSheets(beforePng, afterPng, out) {
  const dims = probeImage(beforePng); // both sheets share geometry (see FRAMES_PER_SHEET/SHEET_COLS above)
  tileGrid([beforePng, afterPng], { cols: 1, tw: dims.w, th: dims.h, gap: 8, out });
  return out;
}

function loadManifest(dir) {
  const f = path.join(dir, 'manifest.json');
  if (!fs.existsSync(f)) { console.error(`✗ no manifest at ${f}. Is this an evals run dir?`); process.exit(2); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function compare() {
  const beforeDir = arg('--before', null);
  if (!beforeDir) { console.error('✗ --compare needs --before <run-dir>'); process.exit(2); }
  const before = loadManifest(beforeDir);

  const afterDir = arg('--after', null);
  const after = afterDir ? loadManifest(afterDir) : runEvals();

  const outDir = path.join(RUNS_DIR, 'compare', `${path.basename(before.runDir)}-vs-${path.basename(after.runDir)}`);
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  for (const b of before.briefs) {
    const a = after.briefs.find((x) => x.name === b.name);
    if (!a) { console.log(`  ~ ${b.name}: not in the AFTER run, skipped`); continue; }
    const cmp = path.join(outDir, `${b.name}.compare.png`);
    stackSheets(b.sheet, a.sheet, cmp);
    rows.push({ name: b.name, before: b, after: a, compare: cmp });
  }

  const abs = (p) => `file://${path.resolve(p)}`;
  const videoOrNote = (v, label) => fs.existsSync(v.mp4)
    ? `<video src="${abs(v.mp4)}" controls muted loop></video>`
    : `<p class="missing">no mp4 on disk for ${label} (a committed baseline keeps sheets + manifest only, see engine-doctrine/EVALS.md)</p>`;
  const row = (r) => `
    <section>
      <h2>${r.name} ${r.before.ok && r.after.ok ? '' : '<span class="bad">LIVENESS FAILED</span>'}</h2>
      <p class="meta">before: ${r.before.duration}s ${r.before.dims.w}x${r.before.dims.h} &middot;
         after: ${r.after.duration}s ${r.after.dims.w}x${r.after.dims.h}</p>
      <div class="videos">
        <div><div class="tag">before (${before.commit ?? '?'})</div>${videoOrNote(r.before, 'before')}</div>
        <div><div class="tag">after (${after.commit ?? '?'})</div>${videoOrNote(r.after, 'after')}</div>
      </div>
      <img class="sheet" src="${abs(r.compare)}" alt="${r.name} before/after sheet">
    </section>`;

  const html = `<!doctype html><meta charset="utf-8"><title>vawe evals compare</title>
<style>
body{font:14px/1.4 -apple-system,sans-serif;background:#111;color:#eee;margin:0;padding:24px 32px}
h1{font-size:18px}h2{font-size:16px;margin:32px 0 4px}
.meta{color:#999;margin:0 0 12px}
.bad{color:#f66}
.videos{display:flex;gap:16px}
.videos>div{flex:1}
.tag{font:12px/1 monospace;color:#999;margin-bottom:4px}
video{width:100%;background:#000}
.missing{color:#888;font-style:italic;border:1px dashed #444;padding:12px;margin:0}
.sheet{max-width:100%;margin-top:12px;border:1px solid #333}
</style>
<h1>vawe evals: ${path.basename(before.runDir)} vs ${path.basename(after.runDir)}</h1>
<p class="meta">no aesthetic score here on purpose (engine-doctrine/EVALS.md). Watch both, look at the sheets, decide.</p>
${rows.map(row).join('\n')}
`;
  const htmlPath = path.join(outDir, 'compare.html');
  fs.writeFileSync(htmlPath, html);

  console.log(`\n  compare → ${outDir}`);
  console.log(`  ${htmlPath}`);
  if (process.stdout.isTTY && !process.env.CI && !process.env.VAWE_NO_OPEN) try { execFileSync('open', [htmlPath]); } catch { /* no GUI on this machine; the path above still works */ }
  return htmlPath;
}

/** Commit sheets + manifest (never mp4s: too big) as the checked-in baseline, rewriting every path in
 *  the manifest to live under BASELINE_DIR so a later `--compare --before quality/runs/evals/baseline` reads
 *  paths that actually exist on a fresh checkout. */
function saveBaseline() {
  const runDir = arg('--run', null);
  const manifest = runDir ? loadManifest(runDir) : runEvals();

  fs.rmSync(BASELINE_DIR, { recursive: true, force: true });
  fs.mkdirSync(BASELINE_DIR, { recursive: true });

  const relocate = (p) => path.join(BASELINE_DIR, path.basename(p));
  fs.copyFileSync(manifest.sheet, relocate(manifest.sheet));
  const briefs = manifest.briefs.map((b) => {
    fs.copyFileSync(b.sheet, relocate(b.sheet));
    return { ...b, sheet: relocate(b.sheet), mp4: relocate(b.mp4) };
  });
  const baseline = { ...manifest, runDir: BASELINE_DIR, sheet: relocate(manifest.sheet), briefs };
  fs.writeFileSync(path.join(BASELINE_DIR, 'manifest.json'), JSON.stringify(baseline, null, 1) + '\n');
  console.log(`\n  baseline saved → ${BASELINE_DIR} (commit ${baseline.commit}, sheets + manifest only)`);
}

if (has('--compare')) compare();
else if (has('--save-baseline')) saveBaseline();
else runEvals();
