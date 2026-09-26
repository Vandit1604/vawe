// generators/sim/run.mjs: bake a stateful simulation to a deterministic PNG frame sequence.
//
//   node generators/sim/run.mjs generators/sim/sims/ember-burst.mjs            (dry run: report, write nothing)
//   node generators/sim/run.mjs generators/sim/sims/ember-burst.mjs --write     (bake → assets/baked/ember-burst/)
//   make sim D=generators/sim/sims/ember-burst.mjs WRITE=1
//
// WHY THIS EXISTS. `renderFrame(n)` is a pure function of n, eight workers, arbitrary order,
// byte-identical output. A simulation is the exact opposite: frame 412 exists only because 411 ran
// first. So the simulation runs HERE, offline, in order, once, and emits frames; the scene plays
// them back through the existing `clip` layer. Non-determinism is confined to bake time.
//
// It is confined, not abolished. A bake must REPRODUCE: same source + same seed → the same bytes.
// That is what `generators/sim/sims/lib/rng.mjs` and `make check GATE=sim-audit` are for, and it is why the manifest records
// a hash of the source that produced it.
//
// Rasterising happens in headless Chromium, the same engine the renderer uses, so a sim can be
// written against exactly the Canvas 2D the rest of the repo draws with. GPU is disabled: software
// raster is the deterministic path, and a bake that depends on which machine baked it is not a bake.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sourceHash } from './provenance.mjs';
import { serveRepo } from '../../harness/lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BAKE_ROOT = path.join(repoRoot, 'assets/baked');


const pad = (n) => String(n).padStart(4, '0');

/**
 * bake(entry, {write}) → summary.
 * Steps the sim frame by frame in a headless page and writes assets/baked/<name>/f0001.png …
 * plus manifest.json (what `clip` plays) and meta.json (what `sim-audit` verifies).
 */
export async function bake(entry, { write = false, onFrame = null } = {}) {
  const abs = path.resolve(entry);
  if (!fs.existsSync(abs)) throw new Error(`no such sim: ${entry}`);
  const name = path.basename(abs).replace(/\.mjs$/, '');
  const rel = '/' + path.relative(repoRoot, abs).split(path.sep).join('/');
  const prov = sourceHash(abs);

  const { server, port } = await serveRepo();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  });
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/generators/sim/host.html`, { waitUntil: 'load' });
    const spec = await page.evaluate((src) => window.__simLoad(src), rel);
    if (spec.error) throw new Error(`sim failed to load: ${spec.error}`);

    const outDir = path.join(BAKE_ROOT, name);
    if (write) { fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true }); }

    const frames = [];
    for (let i = 0; i < spec.frames; i++) {
      const dataUrl = await page.evaluate((n) => window.__simFrame(n), i);
      if (errs.length) throw new Error(`sim threw on frame ${i}: ${errs[0]}`);
      const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      const file = `f${pad(i + 1)}.png`;
      if (write) fs.writeFileSync(path.join(outDir, file), buf);
      frames.push({ file, bytes: buf.length, sha: crypto.createHash('sha256').update(buf).digest('hex') });
      if (onFrame) onFrame(i, spec.frames);
    }

    // manifest.json is the CLIP contract (core/boot.js preloads any /…/manifest.json; clip.js reads
    // fps + frames[]). Emitting it from the baker is the ergonomics fix: an author references one
    // path and never restates the frame count, because clip derives its index from t and fps.
    const manifest = {
      fps: spec.fps, w: spec.w, h: spec.h, count: frames.length,
      frames: frames.map((f) => `/assets/baked/${name}/${f.file}`),
    };
    // meta.json is PROVENANCE, kept separate so a stale-bake check never has to parse playback data.
    const meta = {
      sim: path.relative(repoRoot, abs).split(path.sep).join('/'),
      seed: spec.seed, fps: spec.fps, count: frames.length, w: spec.w, h: spec.h,
      sourceHash: prov.hash, sources: prov.files,
      // the digest of the FRAMES themselves: two bakes of the same source are equal iff this matches
      framesHash: crypto.createHash('sha256').update(frames.map((f) => f.sha).join('')).digest('hex'),
      bakedBy: 'generators/sim/run.mjs',
    };
    if (write) {
      fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
      fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    }
    return { name, outDir, manifest, meta, frames, wrote: write };
  } finally {
    await browser.close();
    server.close();
  }
}

// ---- CLI -----------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const entry = args.find((a) => !a.startsWith('--'));
  const write = args.includes('--write');
  if (!entry) {
    console.error('usage: node generators/sim/run.mjs generators/sim/sims/<name>.mjs [--write]');
    const dir = path.join(repoRoot, 'sims');
    if (fs.existsSync(dir)) console.error('sims:', fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).join(', '));
    process.exit(1);
  }
  const extra = args.filter((a) => !a.startsWith('--') && a !== entry);
  // An ignored argument is how a gate came to answer a question it was not asked (MISTAKES #95).
  if (extra.length) { console.error(`refusing to ignore extra argument(s): ${extra.join(', ')}\nbake one sim per run.`); process.exit(1); }

  const t0 = Date.now();
  let last = -1;
  const r = await bake(entry, {
    write,
    onFrame: (i, n) => {
      const pct = Math.floor((i / n) * 10);
      if (pct !== last) { last = pct; process.stderr.write(`\r   baking ${path.basename(entry)}  ${i + 1}/${n}`); }
    },
  });
  process.stderr.write('\r' + ' '.repeat(48) + '\r');
  const mb = (r.frames.reduce((s, f) => s + f.bytes, 0) / 1048576).toFixed(1);
  console.log(`${r.name}: ${r.meta.count} frames @ ${r.meta.fps}fps  ${r.meta.w}x${r.meta.h}  seed 0x${r.meta.seed.toString(16).toUpperCase()}  ${mb}MB  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  console.log(`   source ${r.meta.sourceHash.slice(0, 16)}   frames ${r.meta.framesHash.slice(0, 16)}`);
  if (write) {
    console.log(`   → ${path.relative(repoRoot, r.outDir)}/  (manifest.json + meta.json + f0001..f${pad(r.meta.count)}.png)`);
    console.log(`   play it:  { "type": "clip", "src": "/assets/baked/${r.name}/manifest.json", "x": 90, "y": 300, "w": 900, "start": 0, "duration": ${(r.meta.count / r.meta.fps).toFixed(2)} }`);
  } else {
    console.log('   DRY RUN: nothing written. Add WRITE=1 (or --write) to bake.');
  }
}
