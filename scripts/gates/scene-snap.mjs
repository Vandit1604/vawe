// scripts/gates/scene-snap.mjs: check scenes WITHOUT rendering video. Captures a per-frame DOM signature
// (bbox + transform + opacity + font-size + color + text + clip-path of every id'd / critical element,
// plus a fingerprint of the background canvas) headless,
// with NO encode and NO screenshot. Save a baseline before a refactor, then diff after to prove the
// rendered frames are unchanged (or see exactly what moved).
//   node scripts/gates/scene-snap.mjs <format> --save     # write baseline → verify/snap/<format>.json
//   node scripts/gates/scene-snap.mjs <format>            # diff current vs baseline
//   make snap M=<format> [SAVE=1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/layout/safe.js';
// ONE shared signature definition (capture + diff), also used by snap-scenes.mjs. Both gates used to
// keep their own hand-copied version; that duplication is how a field gets added to one and not the
// other, and how a gate goes blind without saying so (MISTAKES #159).
import { captureSig, diffSig, primeFrames } from './snap-signature.mjs';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';
import { gateFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const m = args.find((a) => !a.startsWith('--'));
const SAVE = args.includes('--save');
if (!m) { console.error('usage: node scripts/gates/scene-snap.mjs <format> [--save]'); process.exit(1); }
// FAIL on an extra positional arg. This gate always snapshots the FORMAT's sample.json, but it used
// to accept `scene-snap.mjs scene formats/scene/paint-demo.json` and silently ignore the second
// argument, reporting "IDENTICAL" about a file it never opened. That is a gate answering a question
// it was not asked, which is worse than no gate: the answer looks authoritative.
const extra = args.filter((a) => !a.startsWith('--')).slice(1);
if (extra.length) {
  console.error(`scene-snap takes a FORMAT name, not a data file. It always snapshots formats/${m}/sample.json.`);
  console.error(`  ignored: ${extra.join(', ')}`);
  console.error('  to compare one scene, render it and use `make compare`.');
  process.exit(1);
}

const { server, port } = await serveRepo();

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// Signatures must be captured at the format's real dims, or the baseline records a cropped canvas.
const snapCfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', m, 'sample.json'), 'utf8')); } catch { return {}; } })();
const [SVW, SVH] = sceneDims(snapCfg);
await page.setViewport({ width: SVW, height: SVH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/formats/${m}/sample.json&fps=30`, { waitUntil: 'load' });
await waitForEngine(page);
const meta = await page.evaluate(() => window.__engine.meta);
const total = meta.totalFrames;
// Sample WHERE THE MOTION IS. An even spread lands almost entirely in steady state, transition
// windows are 0.3-0.6s, so this gate reported IDENTICAL after every fade curve in the engine was
// re-eased (#38). Transition frames are derived from the same data-* attributes driveClips reads, so
// the sampling follows whatever the scene actually does rather than a fixed grid.
const motionFrames = await page.evaluate(() => {
  const out = new Set();
  const FPS = (window.__engine.meta && window.__engine.meta.fps) || 30;
  const at = (t) => { const f = Math.round(t * FPS); if (f >= 0) out.add(f); };
  for (const el of document.querySelectorAll('[data-start]')) {
    const st = parseFloat(el.dataset.start) || 0;
    const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
    const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : null;
    const ex = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
    at(st + en * 0.3); at(st + en * 0.7);                       // mid-entrance, both sides of the curve
    if (du != null && Number.isFinite(du)) { at(st + du - ex * 0.7); at(st + du - ex * 0.3); } // mid-exit
  }
  return [...out];
});
const cutFrames = (() => { try {
  const j = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', m, 'sample.json'), 'utf8'));
  return (j.cuts || []).flatMap((c) => { const h = (c.dur ?? 0.36) / 2; return [c.t - h * 0.5, c.t, c.t + h * 0.5]; }).map((t) => Math.round(t * 30));
} catch { return []; } })();
const frames = [...new Set([
  ...(meta.stings || []).map((t) => Math.round(t * 30)),
  ...motionFrames, ...cutFrames,
  ...Array.from({ length: 20 }, (_, i) => Math.round(((i + 0.5) / 20) * total)),
])].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);

// Prime before measuring, exactly as snap-scenes does. Both gates must describe a page in the same
// state or the same scene gets two different signatures depending on which gate asked.
await primeFrames(page, frames);
const sig = await captureSig(page, frames);
await browser.close(); server.close();

const file = path.join(SNAP, `${m}.json`);
if (SAVE) { fs.writeFileSync(file, JSON.stringify(sig)); console.log(`✓ baseline saved → verify/snap/${m}.json  (${frames.length} frames)`); process.exit(0); }

if (!fs.existsSync(file)) { console.error(`no baseline for ${m}, run with --save first`); process.exit(2); }
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
const diffs = diffSig(base, sig);
const f = gateFindings();
console.log(`\n==== SNAP DIFF · ${m} (${frames.length} frames vs baseline) ====`);
if (!diffs.length) { console.log('✓ IDENTICAL: no DOM/layout change across sampled frames'); f.emit(); process.exit(0); }
for (const d of diffs.slice(0, 60)) console.log('  ' + d);
if (diffs.length > 60) console.log(`  … +${diffs.length - 60} more`);
// EXIT 1. A baseline diff is the gate's only finding, and printing it under a zero exit made every
// caller (a shell `&&`, a CI step, `make`) treat "the frames moved" as "the frames held". The other
// determinism gates here (snap-scenes, snap-blocks, canvas-purity, probe-purity) all exit non-zero on a
// diff; this one alone reported the change and then certified the render. An INTENDED change is
// re-baselined with --save, which is the author saying so; it is not the gate's to assume.
console.error(`\n△ ${diffs.length} change(s): the sampled frames no longer match verify/snap/${m}.json.`);
console.error('  If every change is intended, re-baseline it deliberately: '
  + `node scripts/gates/scene-snap.mjs ${m} --save`);
for (const d of diffs) f.fail('scene-snap-diff', d, { at: m, fix: `intended? re-baseline: node scripts/gates/scene-snap.mjs ${m} --save` });
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
