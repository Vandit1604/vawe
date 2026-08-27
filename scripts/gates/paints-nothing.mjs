// scripts/gates/paints-nothing.mjs — did this layer actually paint anything, in its own box?
//
// A terminal card was hand-authored as an `html` layer: a CSS mask-image on an auto-height wrapper whose
// children were all absolutely positioned. That masks EVERYTHING to nothing — the card rendered as a
// blank white box, and it shipped past every gate that exists: `make audit` measures overlap, safe zones
// and contrast, never whether a layer painted anything at all.
//
// THE TECHNIQUE IS NOT NEW — it is copied from scripts/site/type-specimens.mjs:427-446, whose own comment
// records the reason it looks at pixels: a DOM probe was tried first and it PASSED a blank frame, because
// a `background-clip:text` layer's glyphs inherit `color: transparent` and measure as full-size, opaque
// boxes while painting nothing. Only a screenshot knows what actually landed on screen.
//
// THE COMPARISON, per LAYER (not per beat — beat-check's `dead-air` already fails a hole in the WHOLE
// frame; a blank layer sitting inside an otherwise busy frame trips nothing there). At the layer's own
// settled midpoint: screenshot its own box, hide just that element (`visibility:hidden`, which never
// reflows a sibling since every layer is `position:absolute`), screenshot the same box again, restore the
// element, diff the two PNGs byte for byte. Identical means the layer's presence made no visible
// difference inside its own box — it painted nothing.
//
// WHICH LAYERS ARE SKIPPED, and why each is not a finding:
//   - `group` containers: not themselves a paint target (their children are the content; a group's own
//     wrapper box is layout, not a picture). Nested group children are NOT walked by this gate (v1
//     limitation — see the README-style note in checkScene below).
//   - a layer whose own opacity, multiplied through every ancestor, is under 1% at the sampled moment: it
//     is DECLARED invisible right now, a timing/authoring decision this gate has no opinion on.
//   - a layer with no real box (width or height under 1px): boxless is a DIFFERENT failure
//     (motion-audit's "degenerate" WARN, xi) — this gate only asks about a layer that HAS a box.
//
// SEVERITY: REPORTS, not BLOCKS. This rule has never applied to the library before today; making it a
// wall on day one would fail scenes nobody ever asked to satisfy it (docs/TASTE.md, "One process, two
// severities"). `--strict` promotes a finding to a failing exit code, for whenever this gate earns a seat
// in the mandatory ladder.
//
// WAIVERS need a reason, the identical mechanism `dead-air` uses today (scripts/gates/author-check.mjs):
//   { "authoring": { "allow": ["paints-nothing"], "_why": { "paints-nothing": "…" } } }
// A waiver with no `_why` (or one under 12 characters) is treated as no waiver — the finding still prints
// and --strict still fails on it.
//
//   node scripts/gates/paints-nothing.mjs <scene.json> [--strict]
//   node scripts/gates/paints-nothing.mjs                 (census: every formats/scene/*.json)
//   make paints-nothing [D=scene.json] [STRICT=1]
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneTiming, spanOf } from './scene-timing.mjs';
import { population, SCENE_DIR } from '../lib/census.mjs';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const strict = argv.includes('--strict');

const FPS = 30;
const OPACITY_FLOOR = 0.01; // below this a layer is DECLARED invisible right now — not a paint failure


// Per top-level layer, the engine-corrected [start,end] — the same rewrite scene.js does for a
// sceneUnits beat wrapper (a non-last-beat layer runs to `beatEnd + cutDur`, not its authored duration).
// Sampled at the midpoint so entrance/exit ramps sit behind it, mirroring beat-check's own reasoning for
// a "settled" frame, just applied per layer instead of per beat.
function layerTimes(sceneJson) {
  const T = sceneTiming(sceneJson);
  return T.layers.map((L) => {
    const [start, rawEnd] = spanOf(L);
    const u = T.unitEnd(L);
    const end = u == null ? rawEnd : u;
    const mid = start + Math.max(0, end - start) / 2;
    return { L, t: Math.min(T.duration, Math.max(0, mid)) };
  });
}

async function checkScene(browser, port, absFile) {
  const relFile = path.relative(repoRoot, absFile);
  let scene;
  try { scene = JSON.parse(fs.readFileSync(absFile, 'utf8')); }
  catch (e) { return { file: relFile, error: `not valid JSON: ${e.message}` }; }
  if (scene.module !== 'scene') return { file: relFile, skip: 'not module:scene' };

  const allow = new Set((scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : []);
  const why = (scene.authoring && (scene.authoring._why || scene.authoring.why)) || {};
  const waived = allow.has('paints-nothing') && typeof why['paints-nothing'] === 'string' && why['paints-nothing'].trim().length >= 12;

  let times;
  try { times = layerTimes(scene); }
  catch (e) { return { file: relFile, error: `timing: ${e.message}` }; }
  if (!times.length) return { file: relFile, findings: [], waived, layerCount: 0 };

  const page = await browser.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/${relFile}&fps=${FPS}`, { waitUntil: 'load' });
    const boot = await waitForEngine(page, { throwOnTimeout: false });
    if (boot) return { file: relFile, error: `boot: ${boot}` };

    // `.hs-layer` is stamped ONLY on top-level layers (formats/scene/scene.js buildLayer); a nested
    // group child gets `hs-group` alone. So this NodeList's length and order matches `T.layers` exactly
    // for the ordinary (non-beat-wrapped) scene, and matches it for a beat-wrapped one too as long as a
    // beat's layers are declared contiguously in the JSON — true of every scene this repo authors. A
    // mismatch is reported rather than guessed at.
    const domCount = await page.evaluate(() => document.querySelectorAll('.hs-layer').length);
    if (domCount !== times.length) {
      return { file: relFile, error: `layer count mismatch: DOM has ${domCount} top-level .hs-layer, scene declares ${times.length} — cannot align, skipped` };
    }

    const findings = [];
    for (let i = 0; i < times.length; i++) {
      const { L, t } = times[i];
      if (L.type === 'group') continue;
      const frame = Math.round(t * FPS);
      const label = (L.id ? `#${L.id}` : `${L.type}[${i}]`) + (typeof L.text === 'string' ? ` "${L.text.slice(0, 28)}"` : '');

      const probe = await page.evaluate((frame, i, floor) => {
        window.__engine.renderFrame(frame);
        const el = document.querySelectorAll('.hs-layer')[i];
        if (!el) return { skip: 'missing-element' };
        let eop = 1;
        for (let n = el; n; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden') { eop = 0; break; }
          eop *= +s.opacity;
          if (n === document.body) break;
        }
        if (eop < floor) return { skip: 'invisible', eop };
        const b = el.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) return { skip: 'boxless' };
        return { box: { x: Math.max(0, Math.round(b.left)), y: Math.max(0, Math.round(b.top)), width: Math.max(1, Math.round(b.width)), height: Math.max(1, Math.round(b.height)) } };
      }, frame, i, OPACITY_FLOOR);

      if (probe.skip) continue;
      const clip = probe.box;

      const before = await page.screenshot({ clip });
      await page.evaluate((i) => {
        const el = document.querySelectorAll('.hs-layer')[i];
        el.__pnPrevVisibility = el.style.visibility;
        el.style.visibility = 'hidden';
      }, i);
      const after = await page.screenshot({ clip });
      await page.evaluate((i) => {
        const el = document.querySelectorAll('.hs-layer')[i];
        el.style.visibility = el.__pnPrevVisibility || '';
      }, i);

      if (Buffer.from(before).equals(Buffer.from(after))) {
        findings.push({ layer: label, t: +t.toFixed(2), frame });
      }
    }
    return { file: relFile, findings, waived, layerCount: times.length };
  } finally {
    await page.close();
  }
}

// ---- driver ----------------------------------------------------------------------------------------
const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

async function reportOne(absFile) {
  const r = await checkScene(browser, port, absFile);
  console.log(`\n  paints-nothing · ${r.file}`);
  if (r.skip) { console.log(`  · ${r.skip}\n`); return { fail: false }; }
  if (r.error) { console.log(`  ✗ ${r.error}\n`); return { fail: false }; }
  if (!r.findings.length) { console.log(`  ✓ ${r.layerCount} layer(s) checked, all paint something\n`); return { fail: false }; }
  for (const f of r.findings) console.log(`    ~ [paints-nothing] ${f.layer} at t=${f.t}s (frame ${f.frame}) is pixel-identical to itself hidden — it paints nothing in its own box.`);
  const blockable = !r.waived;
  console.log(r.waived
    ? '\n  (waived: authoring.allow has "paints-nothing" with a stated reason)\n'
    : strict
      ? '\n  ✗ paints-nothing (strict)\n'
      : '\n  Waive a deliberately blank layer with {"authoring":{"allow":["paints-nothing"],"_why":{"paints-nothing":"…"}}}.\n');
  return { fail: strict && blockable };
}

let exitCode = 0;
if (file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); exitCode = 2; }
  else { const { fail } = await reportOne(abs); if (fail) exitCode = 1; }
} else {
  // PREFER THE EXPANDED SIBLING, and skip the source that has sugar in it. This filter originally
  // EXCLUDED `.expanded.json`, which is backwards: an unexpanded source carrying `block`/`beat`/`comp`
  // is not renderable at all (the engine refuses it by design), so the sweep spent its time booting
  // scenes that could never paint and reported on 38 of ~160. snap-scenes solved this already
  // (scripts/gates/snap-scenes.mjs:84-88) and this mirrors its rule rather than inventing a second one.
  // WAS `git ls-files`, which sees TRACKED scenes only. Films are gitignored, so on main this sweep
  // booted 40 of the 135 scenes in the same directory and called the silence a pass.
  const all = population('paints-nothing', { filter: (f) => !/intent|schema\.json$/.test(f), quiet: true })
    .names.map((f) => `${SCENE_DIR}/${f}`);
  const hasSugar = (rel) => {
    try {
      const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      return /"type"\s*:\s*"(block|beat|comp|composition)"/.test(src);
    } catch { return false; }
  };
  const skipped = [];
  const files = all.filter((f) => {
    if (/\.expanded\.json$/.test(f)) return true;                 // the renderable artifact: always check
    if (!hasSugar(f)) return true;                                 // a plain scene: check it
    const exp = f.replace(/\.json$/, '.expanded.json');
    skipped.push(`${f} → ${all.includes(exp) ? `checked as ${path.basename(exp)}` : 'NO expanded sibling: run `make expand`'}`);
    return false;
  });
  for (const s of skipped) console.log(`  · un-expanded source: ${s}`);
  let scenesWithFindings = 0;
  for (const f of files) {
    const r = await checkScene(browser, port, path.join(repoRoot, f));
    if (r.skip || r.error) { if (r.error) console.log(`  ✗ ${r.file}: ${r.error}`); continue; }
    if (r.findings.length) {
      scenesWithFindings++;
      const unwaived = r.waived ? ' (waived)' : '';
      console.log(`  ${r.file}: ${r.findings.length} blank layer(s)${unwaived}`);
      for (const f2 of r.findings) console.log(`    ~ ${f2.layer} at t=${f2.t}s`);
      if (strict && !r.waived) exitCode = 1;
    }
  }
  console.log(`\n  paints-nothing census · ${files.length} scenes checked · ${scenesWithFindings} with findings\n`);
}

await browser.close();
server.close();
process.exit(exitCode);
