// scripts/gates/snap-scenes.mjs — the WHOLE-LIBRARY determinism + regression net. scene-snap.mjs
// snapshots one format's sample.json; this sweeps EVERY shipped scene (formats/scene/*.json), and for
// each does two things the single-scene gate never did across the library:
//
//   1. NON-DETERMINISM CHECK — render the sampled frames ascending, then descending, and compare. A
//      pure renderFrame(n) gives the same signature regardless of order; a scene whose signature moves
//      when the order changes has state leaking across frames (the BorderTrail-class bug). Such a scene
//      is QUARANTINED: not baselined, listed in the report. (Date.now/Math.random are already banned by
//      lib-test; this catches the order-dependence class, complementing probe-purity's per-frame proof.)
//   2. REGRESSION BASELINE — for deterministic scenes, save/diff a DOM signature keyed by scene name,
//      so any future refactor / version bump / new effect is provably byte-identical (or shows exactly
//      what moved) across all 75 scenes, not just one.
//
//   node scripts/gates/snap-scenes.mjs --save   # write baselines → verify/snap/scenes/<name>.json
//   node scripts/gates/snap-scenes.mjs          # diff current vs baselines
//   make snap-all [SAVE=1]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap', 'scenes');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const ONLY = args.find((a) => !a.startsWith('--')); // optional: sweep just one scene by name

// Every shipped SCENE: formats/scene/*.json with module:"scene", except the schema and _-prefixed
// scratch. A file without module:"scene" (the examples registry, a *.intent storyboard partial) is not
// a renderable scene and is skipped — not errored.
const dir = path.join(repoRoot, 'formats', 'scene');
const isScene = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).module === 'scene'; } catch { return false; } };
const scenes = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'schema.json' && !f.startsWith('_'))
  .filter((f) => !ONLY || f === ONLY || f === `${ONLY}.json`)
  .filter(isScene)
  .sort();
if (!scenes.length) { console.error('no scenes found'); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => { const s = http.createServer((req, res) => { const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

// capture the DOM signature for a set of frames, rendered in the given order (pure → order-independent).
const captureSig = (page, frames) => page.evaluate((frames) => {
  const round = (v) => Math.round(v * 10) / 10;
  const snap = {};
  for (const f of frames) {
    window.__engine.renderFrame(f);
    const els = {};
    for (const el of document.querySelectorAll('[id], [data-layer="critical"]')) {
      const b = el.getBoundingClientRect(); if (b.width < 1 && b.height < 1) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity === 0) continue;
      const key = el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);
      // Record text ONLY for LEAF content. A scaffold wrapper (root/cam/stage, a group) concatenates all
      // descendant text, so a typing/decode layer mid-reveal makes the wrapper's aggregate text look
      // order-dependent even when every leaf is pure — a false non-determinism signal. Skip it for any
      // element that contains another captured element; leaf text layers keep their text.
      const isWrapper = !!el.querySelector('[id], [data-layer="critical"]');
      els[key] = { x: round(b.left), y: round(b.top), w: round(b.width), h: round(b.height),
        tf: s.transform === 'none' ? '' : s.transform, op: Math.round(+s.opacity * 1000) / 1000, fs: s.fontSize, c: s.color,
        t: isWrapper ? '' : (el.textContent || '').trim().slice(0, 24) };
    }
    snap[f] = els;
  }
  return snap;
}, frames);

const fields = { x: 'x', y: 'y', w: 'w', h: 'h', tf: 'transform', op: 'opacity', fs: 'font', c: 'color', t: 'text' };
const diffSig = (base, sig) => {
  const diffs = [];
  for (const f of Object.keys(sig)) {
    const a = base[f] || {}, b = sig[f];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!a[k]) { diffs.push(`f${f} +${k}`); continue; }
      if (!b[k]) { diffs.push(`f${f} -${k}`); continue; }
      for (const fld of Object.keys(fields)) {
        const av = a[k][fld], bv = b[k][fld];
        const tol = fld === 'op' ? 0.02 : 0.6;
        if ((typeof av === 'number' ? Math.abs(av - bv) > tol : av !== bv)) diffs.push(`f${f} ${k}.${fields[fld]}: ${JSON.stringify(av)} → ${JSON.stringify(bv)}`);
      }
    }
  }
  return diffs;
};

const identical = [], changed = [], quarantined = [], errored = [], saved = [], nobaseline = [];
for (const scene of scenes) {
  const name = scene.replace(/\.json$/, '');
  const dataPath = `/formats/scene/${scene}`;
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(dir, scene), 'utf8')); } catch {}
  const [w, h] = sceneDims(cfg);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${dataPath}&fps=30`, { waitUntil: 'load' });
    await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
    const err = await page.evaluate(() => window.__engineError || null);
    if (err) { errored.push(`${name}: ${String(err).slice(0, 80)}`); await page.close(); continue; }
    const meta = await page.evaluate(() => window.__engine.meta);
    const total = meta.totalFrames;
    // sample WHERE THE MOTION IS (mirrors scene-snap.mjs): mid-entrance/exit + cuts + stings + a spread.
    const motionFrames = await page.evaluate(() => {
      const out = new Set(); const FPS = (window.__engine.meta && window.__engine.meta.fps) || 30;
      const at = (t) => { const f = Math.round(t * FPS); if (f >= 0) out.add(f); };
      for (const el of document.querySelectorAll('[data-start]')) {
        const st = parseFloat(el.dataset.start) || 0;
        const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
        const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : null;
        const ex = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
        at(st + en * 0.3); at(st + en * 0.7);
        if (du != null && Number.isFinite(du)) { at(st + du - ex * 0.7); at(st + du - ex * 0.3); }
      }
      return [...out];
    });
    const cutFrames = (cfg.cuts || []).flatMap((c) => { const hh = (c.dur ?? 0.36) / 2; return [c.t - hh * 0.5, c.t, c.t + hh * 0.5]; }).map((t) => Math.round(t * 30));
    const frames = [...new Set([
      ...(meta.stings || []).map((t) => Math.round(t * 30)),
      ...motionFrames, ...cutFrames,
      ...Array.from({ length: 20 }, (_, i) => Math.round(((i + 0.5) / 20) * total)),
    ])].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);

    // NON-DETERMINISM: same frames ascending vs descending. A pure render is order-blind.
    const sigAsc = await captureSig(page, frames);
    const sigDesc = await captureSig(page, [...frames].reverse());
    const orderDiffs = diffSig(sigAsc, sigDesc);
    if (orderDiffs.length) { quarantined.push({ name, sample: orderDiffs.slice(0, 4) }); await page.close(); continue; }

    // deterministic → baseline
    const file = path.join(SNAP, `${name}.json`);
    if (SAVE) { fs.writeFileSync(file, JSON.stringify(sigAsc)); saved.push(name); await page.close(); continue; }
    if (!fs.existsSync(file)) { nobaseline.push(name); await page.close(); continue; }
    const base = JSON.parse(fs.readFileSync(file, 'utf8'));
    const d = diffSig(base, sigAsc);
    if (d.length) changed.push({ name, diffs: d }); else identical.push(name);
  } catch (e) { errored.push(`${name}: ${(e && e.message || e).toString().slice(0, 80)}`); }
  await page.close().catch(() => {});
}
await browser.close(); server.close();

// ---- report ----
console.log(`\n==== SNAP-ALL · ${scenes.length} scenes ====`);
if (SAVE) {
  console.log(`✓ ${saved.length} baselines saved → verify/snap/scenes/`);
  if (quarantined.length) { console.log(`\n⚠ ${quarantined.length} QUARANTINED (non-deterministic — NOT baselined):`); for (const q of quarantined) { console.log(`  ✗ ${q.name}`); for (const s of q.sample) console.log(`      order-diff: ${s}`); } }
  if (errored.length) { console.log(`\n⚠ ${errored.length} errored (skipped):`); for (const e of errored) console.log(`  ✗ ${e}`); }
  process.exit(quarantined.length || errored.length ? 1 : 0);
}
console.log(`✓ identical: ${identical.length}   △ changed: ${changed.length}   ✗ quarantined: ${quarantined.length}   ⚠ errored: ${errored.length}   ○ no-baseline: ${nobaseline.length}`);
if (nobaseline.length && !quarantined.length && !changed.length) console.log(`  (${nobaseline.length} scene(s) determinism-checked but not yet baselined — run \`make snap-all SAVE=1\` to enable regression diff)`);
if (quarantined.length) { console.log(`\n✗ NON-DETERMINISTIC (quarantined):`); for (const q of quarantined) { console.log(`  ${q.name}`); for (const s of q.sample) console.log(`      ${s}`); } }
for (const c of changed) { console.log(`\n△ ${c.name} (${c.diffs.length} change(s)):`); for (const d of c.diffs.slice(0, 12)) console.log(`    ${d}`); if (c.diffs.length > 12) console.log(`    … +${c.diffs.length - 12} more`); }
if (errored.length) { console.log(`\n⚠ errored:`); for (const e of errored) console.log(`  ${e}`); }
// changed scenes and quarantined scenes both fail the gate; a pure re-run must be all-identical.
process.exit(changed.length || quarantined.length || errored.length ? 1 : 0);
