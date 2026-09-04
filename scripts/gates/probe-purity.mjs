// probe-purity.mjs: assert renderFrame(n) is PURE in n.
//
// The Go capture loop (internal/scene/scene.go) pulls frames off a shared channel
// across several browser tabs in arbitrary order. If a format accumulates state
// frame-to-frame, the same n renders differently depending on what came before.
// Invisible until sharded/parallel rendering corrupts the output.
//
// This catches it: for sampled frames n, render n, render a FAR-AWAY scrambler
// frame to dirty any hidden state, render n again, and require the two screenshots
// to be byte-identical.
//
//   node scripts/gates/probe-purity.mjs bracket
//   node scripts/gates/probe-purity.mjs higherlower mydata.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';
import { gateFindings } from '../lib/findings.mjs';

const f = gateFindings();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const format = process.argv[2];
const dataArg = process.argv[3];
if (!format || !fs.existsSync(path.join(repoRoot, 'formats', format, 'scene.html'))) {
  console.error('usage: node scripts/gates/probe-purity.mjs <format> [data.json]');
  console.error('formats:', fs.readdirSync(path.join(repoRoot, 'formats')).join(', '));
  process.exit(2);
}
const dataUrl = dataArg
  ? '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/')
  : `/formats/${format}/sample.json`;

const { server, port } = await serveRepo();

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const url = `http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`;
const openPage = async () => {
  const p = await browser.newPage();
  await p.goto(url, { waitUntil: 'load' });
  const e = await waitForEngine(p);
  if (e) { console.error('SCENE ERROR:', e); await browser.close(); server.close(); process.exit(1); }
  return p;
};
const page = await openPage();
// THE FORWARD-ONLY TRUTH. `page` above is deliberately dirtied by the scrambler, so comparing it with
// itself proves only that two dirty states agree, which is exactly how #370 passed this gate for as
// long as it existed. GSAP's root timeline used to unlink a tween the moment it completed, so every
// frame drawn AFTER the playhead had once reached the end kept that tween's end values; both the `a`
// and the `b` read below carried the same wrong values and the diff was empty. `ref` never seeks
// backwards, so it holds what frame n looks like on a tab that has not yet seen any later frame, the
// single-worker render, and the only reading that is right by construction.
const ref = await openPage();

const meta = await page.evaluate(() => window.__engine.meta);
const total = meta.totalFrames;

// The invariant that actually matters for seeking + shard rendering: the VISIBLE output of
// frame n is a pure function of n. So we compare a visibility-filtered signature of the DOM,
// not a screenshot and not the full outerHTML:
//   - skip display:none / visibility:hidden / opacity:0 subtrees  → ignores stale hidden-panel
//     state (output-harmless; every format carries some) so it isn't a false positive
//   - record visible text + transform + opacity + color (incl. SVG attrs via the DOM)
//     → catches real order-dependence that would change captured pixels (the flicker risk)
//   - it's a DOM signature, so GPU/AA rasterization noise (which flakes SVG formats like
//     growth on a pixel probe) can't cause a false failure
// (A format drawing to <canvas> with hidden state would escape this, none do; note it if one does.)
const domOn = async (p, n) => {
  await p.evaluate((f) => window.__engine.renderFrame(f), n);
  return p.evaluate(() => {
    const out = [];
    const walk = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const leaf = el.children.length === 0;
      // filter + clipPath are in the signature because an entrance/exit pair can write them and a
      // stuck value is invisible to text/transform/opacity/colour alone, which is how a blur that
      // survived across frames passed this gate (MISTAKES #41).
      out.push(el.tagName + '|' + (leaf ? el.textContent.trim() : '') + '|' + cs.transform + '|' + cs.opacity + '|' + cs.color + '|' + cs.filter + '|' + cs.clipPath);
      for (const c of el.children) walk(c);
    };
    walk(document.querySelector('.stage'));
    return out.join('\n');
  });
};
const dom = (n) => domOn(page, n);

// sample ~24 frames evenly + the last; segment boundaries are where impurity hides
const samples = [];
for (let i = 0; i < 24; i++) samples.push(Math.floor((i / 24) * total));
samples.push(total - 1);

samples.sort((x, y) => x - y); // `ref` may only ever move forwards

let fails = 0;
for (const n of samples) {
  const truth = await domOn(ref, n);
  const a = await dom(n);
  if (a !== truth) {
    fails++;
    const dir = '/tmp/purity_fail'; fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `f${n}_forward.html`), truth);
    fs.writeFileSync(path.join(dir, `f${n}_seeked.html`), a);
    const msg = `frame ${n} (${(n / meta.fps).toFixed(1)}s) differs from the FORWARD-ONLY render. A later frame left state behind; diff: ${dir}/f${n}_{forward,seeked}.html`;
    console.error(`✗ ${msg}`);
    f.fail('purity-forward-mismatch', msg, { at: `frame ${n}` });
  }
  // Dirty the state with frames that actually RUN something, not just far-away ones. The old
  // scrambler used frame 0 or the last frame; at both, a layer mid-timeline is off-window and
  // driveClips returns before writing any style, so nothing got dirtied and a genuinely sticky
  // property (a blur left behind by an exit) passed this gate. n+9 lands roughly one exit-window
  // later, which is where the writes that stick actually happen. (MISTAKES #41)
  for (const scram of [Math.min(total - 1, n + 9), total - 1, 0, Math.max(0, n - 9)]) await dom(scram);
  const b = await dom(n);
  if (a !== b) {
    fails++;
    const dir = '/tmp/purity_fail'; fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `f${n}_a.html`), a);
    fs.writeFileSync(path.join(dir, `f${n}_b.html`), b);
    const msg = `frame ${n} (${(n / meta.fps).toFixed(1)}s) NOT pure, render-order-dependent DOM; diff: ${dir}/f${n}_{a,b}.html`;
    console.error(`✗ ${msg}`);
    f.fail('purity-render-order', msg, { at: `frame ${n}` });
  }
}
await browser.close(); server.close();

if (fails) console.error(`\n✗ purity FAILED: ${fails}/${samples.length} frames depend on render order`);
else console.log(`✓ purity OK: ${samples.length} sampled frames produce identical DOM regardless of render order (${format}, ${meta.duration.toFixed(1)}s)`);
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
