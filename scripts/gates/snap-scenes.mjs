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
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';
import { population } from '../lib/census.mjs';
import { SCENE_DIR } from './paths.mjs';
import { flattenLayers } from '../lib/layers.mjs';
// ONE shared signature definition (capture + diff), also used by scene-snap.mjs. See snap-signature.mjs
// for what each field is for, including clip-path (wipes) and the bg canvas fingerprint.
import { captureSig, diffSig, primeFrames } from './snap-signature.mjs';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap', 'scenes');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const SAVE = args.includes('--save');

// A BASELINE IS ONLY VALID WITHIN ONE FONT STATE, and nothing used to record which one.
// `assets/fonts/` is gitignored and populated by `make fonts`, so a fresh clone, a worktree, or a
// `make build` that fetches a face mid-session all silently rewrite every text width in the library.
// Measured: a worktree with 2 faces against this tree's 24 reported 57 scenes changed with not one line
// of code different, and a `make build` fetching 16 fonts moved 56 scenes the same way.
//
// That is worse than a flaky number. A refactor verified across the boundary reads as broken, and a
// real regression captured after it reads as fonts — so the net stops being evidence in both
// directions at once. The stamp is one file for the whole SET, because the font state is a property of
// the set and not of any scene, and it deliberately does not touch the per-scene signature format.
const FONT_DIRS = ['assets/fonts', 'assets/fonts/local'];
const fontState = () => {
  const names = [];
  for (const d of FONT_DIRS) {
    try { for (const f of fs.readdirSync(path.join(repoRoot, d))) {
      const st = fs.statSync(path.join(repoRoot, d, f));
      if (st.isFile()) names.push(`${d}/${f}:${st.size}`);
    } } catch { /* absent is a state too, and it hashes to a different one */ }
  }
  names.sort();
  return { n: names.length, hash: crypto.createHash('sha256').update(names.join('\n')).digest('hex').slice(0, 12) };
};
const STAMP = path.join(SNAP, '.font-state.json');
const ONLY = args.find((a) => !a.startsWith('--')); // optional: sweep just one scene by name

// Every shipped SCENE: formats/scene/*.json with module:"scene", except the schema and _-prefixed
// scratch. A file without module:"scene" (the examples registry, a *.intent storyboard partial) is not
// a renderable scene and is skipped — not errored.
const dir = path.join(repoRoot, SCENE_DIR);
const isScene = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).module === 'scene'; } catch { return false; } };
// A source carrying un-expanded build-time sugar (`block` / `beat` / `comp`) is not renderable: those
// are expanded by `make expand` into a `.expanded.json` sibling, and THAT is what ships. The renderer
// used to run such a layer through the text builder and paint nothing, so this harness was quietly
// baselining films with holes in them. Now it refuses, so snapshot the expanded sibling where one
// exists and skip the source with a printed reason, the way a non-scene file is skipped rather than
// errored. Silently snapshotting a lie was the actual bug; erroring is only the symptom.
const SUGAR = new Set(['block', 'beat', 'comp']);
const hasSugar = (f) => {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return flattenLayers(d.layers).some((l) => SUGAR.has(l.type));
  } catch { return false; }
};
const skippedSugar = [];
const scenes = population('snap-scenes', { filter: (f) => f !== 'schema.json' && !f.startsWith('_'), quiet: true }).names
  .filter((f) => !ONLY || f === ONLY || f === `${ONLY}.json`)
  .filter(isScene)
  .filter((f) => {
    if (!hasSugar(f)) return true;
    const expanded = f.replace(/\.json$/, '.expanded.json');
    skippedSugar.push(`${f} → ${fs.existsSync(path.join(dir, expanded)) ? `snapshotted as ${expanded}` : 'NO expanded sibling: run `make expand`'}`);
    return false;
  })
  .sort();
for (const s of skippedSugar) console.log(`  · skipping un-expanded source: ${s}`);
if (!scenes.length) { console.error('no scenes found'); process.exit(1); }

const { server, port } = await serveRepo();
const launch = () => puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
let browser = await launch();

// RECYCLE THE BROWSER. This sweep used to drive all ~100 scenes through ONE browser, and that made it
// report regressions that had not happened: across two back-to-back runs of the identical tree, three
// scenes moved between `identical` and `changed` (showcase-intro by 9 findings, linear-launch by 238,
// example-kinetic-type.beatsync by 17, the last of those as `cam.opacity: 1 → 0.002`). Every one of them
// is stable when snapshotted ON ITS OWN, repeatedly. The variable was never the scene: it was how much
// the browser had already done. A long-lived Chrome under accumulating memory pressure evicts decoded
// images and canvas backing stores, and a scene rendered in that state is not rendering what a fresh one
// renders. `identical: 50 / changed: 31` one run and `51 / 30` the next costs the next person an hour
// deciding which number was the truth, and neither was.
//
// So the sweep now works in batches with a fresh browser for each: the same conditions the single-scene
// gate runs under, which is the run everyone already trusts. The cost is one Chrome launch per batch,
// about a third of a second, against a sweep measured in minutes.
const BATCH = 10;
let sinceLaunch = 0;
const freshBrowser = async () => {
  if (sinceLaunch < BATCH) return;
  await browser.close().catch(() => {});
  browser = await launch();
  sinceLaunch = 0;
};

const identical = [], changed = [], quarantined = [], errored = [], saved = [], nobaseline = [];
for (const scene of scenes) {
  const name = scene.replace(/\.json$/, '');
  const dataPath = `/${SCENE_DIR}/${scene}`;
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(dir, scene), 'utf8')); } catch {}
  const [w, h] = sceneDims(cfg);
  await freshBrowser();
  sinceLaunch++;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/${SCENE_DIR}/scene.html?data=${dataPath}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page);
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
    // Prime first, so the ascending pass is not the only one that ever sees a never-yet-animated split
    // unit — see primeFrames in snap-signature.mjs for what that difference cost.
    await primeFrames(page, frames);
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
if (!SAVE) {
  const now = fontState();
  let was = null;
  try { was = JSON.parse(fs.readFileSync(STAMP, 'utf8')); } catch { /* baselines predating the stamp */ }
  // EACH ARM STANDS ALONE. These were an if/else-if chain, and inserting the checkout note between the
  // two halves left `else if (was.hash …)` reachable with `was === null` — so a tree with NO stamp
  // crashed on a null dereference AFTER the whole sweep had run, trading a computed 106-scene verdict
  // for a stack trace. That is the first-run path for every fresh clone and every new worktree, because
  // verify/snap/ is gitignored. Independent conditions, never a chain: the notes are not alternatives to
  // each other, and writing them as if they were is what made one of them able to break the others.
  if (!was) console.log(`  ~ these baselines carry no font-state stamp, so a text-width difference cannot be told from a code one. Re-save with \`make snap-all SAVE=1\` to stamp them.`);
  // WHICH CHECKOUT RECORDED THESE. A baseline saved in one tree and compared in another can differ for
  // reasons that have nothing to do with the diff under test, and a "changed" line gives the reader no
  // way to tell which. Four separate agents spent real time on ONE scene (react-demo) that renders
  // consistently in every worktree and consistently differently on main, with code, scene, theme and
  // font state proved byte-identical — three of them reported it as "pre-existing", which is true and
  // was not checkable from the output. Saying where the baseline came from turns an ambiguous signal
  // into an explained one, which is the whole job of a gate's message.
  if (was && was.root && was.root !== repoRoot)
    console.log(`  ~ these baselines were recorded in a DIFFERENT checkout:\n      saved in  ${was.root}\n      running in ${repoRoot}\n`
      + `    A scene listed below may differ for environmental reasons rather than because of your change.\n`
      + `    To get a verdict about your diff alone: re-save here first (\`make snap-all SAVE=1\`), confirm clean, then apply the change.`);
  if (was && was.hash !== now.hash)
    console.log(`  ⚠ FONT STATE CHANGED since these baselines were saved (${was.n} face(s) ${was.hash} → ${now.n} face(s) ${now.hash}).\n`
      + `    Every text width in the library moves with it, so a "changed" scene below is NOT evidence about the code.\n`
      + `    Run \`make fonts\` to restore the recorded set, or re-save the baselines once the font state is the one you mean to verify against.`);
}
if (SAVE) {
  const fsNow = fontState();
  fs.writeFileSync(STAMP, JSON.stringify({ ...fsNow, root: repoRoot }, null, 2) + '\n');
  console.log(`✓ ${saved.length} baselines saved → verify/snap/scenes/  (font state ${fsNow.hash}, ${fsNow.n} face(s))`);
  if (quarantined.length) { console.log(`\n⚠ ${quarantined.length} QUARANTINED (non-deterministic — NOT baselined):`); for (const q of quarantined) { console.log(`  ✗ ${q.name}`); for (const s of q.sample) console.log(`      order-diff: ${s}`); } }
  if (errored.length) { console.log(`\n⚠ ${errored.length} errored (skipped):`); for (const e of errored) console.log(`  ✗ ${e}`); }
  process.exit(quarantined.length || errored.length ? 1 : 0);
}
console.log(`✓ identical: ${identical.length}   △ changed: ${changed.length}   ✗ quarantined: ${quarantined.length}   ⚠ errored: ${errored.length}   ○ no-baseline: ${nobaseline.length}`);
// NAME them, always. A scene with no baseline has no regression net at all, which is worse than one that
// merely changed — and the old line both withheld the names and suppressed itself whenever anything else
// was off, so the very runs where you most need to know were the runs that said nothing.
if (nobaseline.length) {
  console.log(`\n○ NO BASELINE (determinism-checked, but nothing to diff against — run \`make snap-all SAVE=1\`):`);
  for (const n of nobaseline) console.log(`  ${n}`);
}
if (quarantined.length) { console.log(`\n✗ NON-DETERMINISTIC (quarantined):`); for (const q of quarantined) { console.log(`  ${q.name}`); for (const s of q.sample) console.log(`      ${s}`); } }
for (const c of changed) { console.log(`\n△ ${c.name} (${c.diffs.length} change(s)):`); for (const d of c.diffs.slice(0, 12)) console.log(`    ${d}`); if (c.diffs.length > 12) console.log(`    … +${c.diffs.length - 12} more`); }
if (errored.length) { console.log(`\n⚠ errored:`); for (const e of errored) console.log(`  ${e}`); }
// A GATE THAT COMPARED NOTHING MUST NOT EXIT GREEN. `verify/snap/` is gitignored (.gitignore:32),
// so a fresh clone has no baselines at all: every scene lands in `nobaseline`, the loop above prints
// them, and the exit below used to return 0. The first thing a new contributor runs would therefore
// pass while checking not one pixel — and this is the engine's flagship determinism gate, so a green
// tick from it reads as the strongest guarantee the repo makes.
//
// A FEW no-baseline scenes stay soft on purpose: that is just a newly authored film waiting for
// `SAVE=1`, and failing on it would make writing a scene feel like breaking the build. ZERO
// comparisons is a different statement, and it is the one that must be loud. Same lesson as the
// `paints-nothing` census (docs/MISTAKES.md #417): a clean result over an empty denominator is not a
// pass, it is a gate that never ran.
if (!identical.length && !changed.length && nobaseline.length) {
  console.error(`\n✗ nothing to compare: all ${nobaseline.length} scene(s) lack a baseline, so this gate checked NOTHING.`);
  console.error('  verify/snap/ is gitignored, so a fresh clone starts here. Run `make snap-all SAVE=1` to record');
  console.error('  the baselines for THIS machine first, then re-run to diff against them.');
  process.exit(1);
}
// changed scenes and quarantined scenes both fail the gate; a pure re-run must be all-identical.
process.exit(changed.length || quarantined.length || errored.length ? 1 : 0);
