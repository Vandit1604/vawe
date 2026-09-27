// quality/gates/anim-traps.mjs: the six traps a seeked CSS/Web Animation can fall into, none of
// which throw and none of which a browser warns about. The first five are ported from the csskit
// prototype's checker (scratchpad, /private/tmp/.../csskit/render.mjs) into the engine's own gate
// shape: it boots the REAL render page (films/scene/scene.html) so it reads exactly the animations
// `seekAll(t)` will drive, never a synthetic re-parse of the JSON.
//
// A bare HTML page (harness/media/render-page.mjs's own render target, a hand-written vawe.onFrame +
// plain three.js page) hits a DIFFERENT five traps: a live clock instead of the t argument, unseeded
// Math.random, a WebGLRenderer that can't be captured, a canvas nobody redraws. `<name>.html` on the
// command line runs those instead of the six DOM traps above, off the page's own source text.
//
//   1. FILL COLLISION: two animations on one element write the same property with overlapping fill
//      windows, so the later one's `backwards` fill covers the earlier one's held end state for all
//      time, not just where they overlap.
//   2. NO END KEYFRAME: a `@keyframes` rule with no 100%/to (or a Web Animations keyframe list with no
//      offset:1). The last value is undefined once the animation ends, and it can visibly slide back.
//   3. `var()` INSIDE THE `animation` SHORTHAND: this Chromium silently invalidates the WHOLE
//      declaration the moment any part of the shorthand is a variable. No error, no animation.
//   4. A SELECTOR THAT MATCHES 0, or an `:nth-child` that resets its count at every parent and so hits
//      one position in every repeated group instead of the one letter it was written for.
//   5. A DELAY PAST THE FILM'S OWN END: authored, wired, and never plays a single frame.
//   6. ONE EASING ACROSS 3+ KEYFRAMES: `element.animate()`'s top-level `easing` stretches over the
//      WHOLE effect unless each keyframe carries its own, so a multi-stop move (settle, hold, exit)
//      times every segment off one curve and a held middle segment can read as frozen or land shifted.
//
// SEVERITY: REPORTS, not BLOCKS, the same house rule paints-nothing and every other author-side gate
// follows (engine-doctrine/TASTE.md, "One process, two severities"). `--strict` promotes a finding to a
// failing exit code. Waiver: {"authoring":{"allow":["anim-traps"],"_why":{"anim-traps":"…"}}}.
//
//   node quality/gates/anim-traps.mjs <scene.json> [--strict]
//   node quality/gates/anim-traps.mjs                 (census: every films/scene/*.json)
//   make check GATE=anim-traps [D=scene.json] [STRICT=1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneTiming } from './scene-timing.mjs';
import { fillCollisionPairs, animatedProps, reachesBack } from '../../core/timeline/clips.js';
import { population, SCENE_DIR } from '../../harness/lib/census.mjs';
import { serveRepo, waitForEngine, bootPathFor } from '../../harness/lib/render-harness.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { pageAuthoring } from '../../harness/lib/motion-stamp.mjs';
import { isWaivedBy, hasReason } from '../../harness/lib/waivers.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const strict = argv.includes('--strict');
const f = gateFindings();

// Six small checks, one per trap, run INSIDE the page against document.getAnimations() and the live
// stylesheets, the same two surfaces the csskit prototype's checkTraps read. Split by trap rather than
// kept as one function, so each stays small enough to read in one go; `checkTraps` below is the only
// orchestrator and the only thing page.evaluate calls.
function labelOf(a) { return a.animationName || a.id || (a.effect && a.effect.target && a.effect.target.tagName) || 'animation'; }

// trap 1: two animations on one element writing the same property with overlapping fill windows.
// `fillCollisionPairs` (core/timeline/clips.js) is the ONE definition of "these two collide": it also
// decides which animations `applyDefaultFills` (called once at boot) leaves alone, so the gate that
// reports a collision and the engine behaviour around it can never disagree about which pairs count.
function fillCollisions(add) {
  for (const { a, b, props } of fillCollisionPairs()) {
    const el = a.effect.target;
    const sel = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : '');
    add(`"${labelOf(a)}" and "${labelOf(b)}" both write ${props.join(',')} with overlapping fill windows`, sel,
      'give the earlier one fill:forwards (not both) so it only holds AFTER its own end, or never share a property between two fill animations on one element');
  }
}

// trap 2: a @keyframes rule (or a WAAPI keyframe list) with no defined end state
function missingEndKeyframe(add) {
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (rule.type !== CSSRule.KEYFRAMES_RULE) continue;
      const hasTo = [...rule.cssRules].some((kf) => kf.keyText === '100%' || kf.keyText === 'to');
      if (!hasTo) add(`@keyframes ${rule.name} has no 100%/to`, 'stylesheet', 'add an explicit 100% (or to) rule, or the last value before the animation ends is undefined and it can visibly slide back');
    }
  }
  for (const a of document.getAnimations()) {
    if (!a.effect || !a.effect.getKeyframes) continue;
    const kfs = a.effect.getKeyframes();
    if (kfs.length && kfs[kfs.length - 1].offset !== 1 && kfs[kfs.length - 1].offset != null)
      add(`animation on ${labelOf(a)} has no keyframe at offset 1`, a.effect.target && a.effect.target.tagName, 'add an explicit offset:1 keyframe so the end value is defined, not interpolated off the last authored one');
  }
}

// trap 3: var() inside the `animation` shorthand silently invalidates the whole declaration
function varInShorthand(add) {
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      if ((rule.style.getPropertyValue('animation') || '').includes('var('))
        add(`rule "${rule.selectorText}" uses var() inside the animation shorthand`, rule.selectorText, 'split into animation-name/animation-duration/... longhands; var() inside the animation shorthand silently invalidates the whole declaration in this Chromium');
    }
  }
  document.querySelectorAll('[style]').forEach((el) => {
    if ((el.style.getPropertyValue('animation') || '').includes('var('))
      add(`inline style on <${el.tagName.toLowerCase()}> uses var() inside the animation shorthand`, el.tagName.toLowerCase(), 'split into longhands');
  });
}

// trap 4: a selector matching 0 elements, or an :nth-child that resets its count at every parent
function badSelector(add) {
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      if (!rule.style.getPropertyValue('animation') && !rule.style.getPropertyValue('animation-name')) continue;
      let matched; try { matched = document.querySelectorAll(rule.selectorText); } catch { continue; }
      if (matched.length === 0) { add(`selector "${rule.selectorText}" matches 0 elements`, rule.selectorText, 'the rule never applies, check the markup or the selector spelling'); continue; }
      if (!/:nth-child|:nth-of-type/.test(rule.selectorText)) continue;
      const parents = new Set(Array.from(matched).map((el) => el.parentElement));
      if (parents.size > 1)
        add(`":nth-child" in "${rule.selectorText}" matches ${matched.length} elements across ${parents.size} different parents`, rule.selectorText,
          'an :nth-child index resets at every parent, so a selector meant to hit one specific letter instead hits that position in every repeated group; scope the rule to one parent, or key off a per-element --i instead');
    }
  }
}

// trap 5: a delay past the film's own end, authored and wired but never played
function delayPastEnd(add, durMs) {
  for (const a of document.getAnimations()) {
    if (!a.effect) continue;
    const t = a.effect.getComputedTiming();
    if (t.delay > durMs)
      add(`"${labelOf(a)}" starts at ${Math.round(t.delay)}ms, after the ${Math.round(durMs)}ms film`, a.effect.target && a.effect.target.tagName, 'it never plays; lower the delay or lengthen the film/layer duration');
  }
}

// trap 6: ONE easing curve stretched across 3+ keyframes. `element.animate()` applies its top-level
// `easing` across the WHOLE effect unless a keyframe carries its own, so a 3-stop move (settle, hold,
// exit) times all three segments off one curve instead of each other: a held middle segment can read
// as frozen, or land shifted from where the author placed it.
function unevenSegmentEasing(add) {
  for (const a of document.getAnimations()) {
    if (!a.effect || !a.effect.getKeyframes) continue;
    const kfs = a.effect.getKeyframes();
    if (kfs.length < 3) continue;
    const hasPerKeyframeEasing = kfs.some((kf) => kf.easing && kf.easing !== 'linear');
    if (hasPerKeyframeEasing) continue; // already segmented, each stop owns its own curve
    const easing = a.effect.getComputedTiming().easing || 'linear';
    if (easing === 'linear') continue; // one curve across many stops is only a trap when it is not linear
    add(`${labelOf(a)} applies one easing ("${easing}") across ${kfs.length} keyframes`, a.effect.target && a.effect.target.tagName,
      'set easing:"linear" on the animation and put a per-keyframe easing on each stop instead, or every segment between stops speeds/slows unevenly and a held middle segment can look frozen or land shifted');
  }
}

// traps 7-11: a hand-authored BARE page (vawe.onFrame + plain three.js, harness/media/render-page.mjs)
// hitting the same non-determinism this file's own header rules out for a scene layer, plus one wiring
// mistake (a WebGL canvas that never redraws). Source-level, not DOM-level: these read the page's own
// <script> text rather than booting it, since the thing being checked (did the author reach for a
// live clock or an unseeded RNG) is a fact about the CODE, not about one frame's rendered DOM.
function pageTraps(src, add) {
  const has = (re) => re.test(src);
  if (has(/requestAnimationFrame\s*\(/))
    add('page uses requestAnimationFrame', 'script', 'drive motion from vawe.onFrame((t) => {...}) instead: the render clock seeks CSS/WAAPI/SMIL and calls every onFrame hook with film time t; a live rAF loop never runs under headless capture and makes the frame depend on wall-clock timing');
  if (has(/new\s+THREE\.Clock\b/) || has(/\.getDelta\s*\(/))
    add('page uses THREE.Clock', 'script', 'pose every object from the t argument vawe.onFrame((t) => {...}) hands you, never from an accumulated delta: renderFrame(n) must stay a pure function of n');
  if (has(/\bperformance\.now\s*\(/))
    add('page reads performance.now()', 'script', 'use the t argument vawe.onFrame((t) => {...}) already hands you');
  if (has(/\bDate\.now\s*\(/))
    add('page reads Date.now()', 'script', 'use the t argument vawe.onFrame((t) => {...}) already hands you');
  if (has(/\bMath\.random\s*\(/))
    add('page calls unseeded Math.random()', 'script', 'seed a small PRNG (the same rng(seed) shape core/surfaces/three-fx.js uses) so the same seed rebuilds the identical scene across render orders and re-renders');
  const webgl = has(/WebGLRenderer/);
  if (webgl && !has(/preserveDrawingBuffer/))
    add('a WebGLRenderer is built without preserveDrawingBuffer', 'script', 'pass {preserveDrawingBuffer:true}, or the capture (a screenshot taken after the draw call) can read a blank/cleared buffer depending on the browser\'s own swap timing');
  if (webgl && !has(/\.onFrame\s*\(/))
    add('page draws WebGL but registers no onFrame hook', 'script', 'call vawe.onFrame((t) => { renderer.render(scene, camera); }) so the render clock actually redraws the canvas each frame; otherwise the capture reads whatever the canvas happened to hold from page load');
}

function checkTraps(durMs) {
  const findings = [];
  const add = (what, where, fix) => findings.push({ what, where, fix });
  fillCollisions(add);
  missingEndKeyframe(add);
  varInShorthand(add);
  badSelector(add);
  delayPastEnd(add, durMs);
  unevenSegmentEasing(add);
  return findings;
}

// page.evaluate(checkTraps, durMs) would send ONLY checkTraps.toString(): the six trap functions it
// calls are not in its closure, so the browser would throw ReferenceError on the first one. Bundling
// every function's own source into one string and running it through `new Function` inside the page
// keeps each Node-side function small and independently readable while still executing as one whole
// in the browser, which is where document.getAnimations() and the stylesheets actually live.
export const TRAP_BUNDLE = [animatedProps, reachesBack, fillCollisionPairs, labelOf, fillCollisions, missingEndKeyframe, varInShorthand, badSelector, delayPastEnd, unevenSegmentEasing, checkTraps]
  .map((fn) => fn.toString()).join('\n');
export async function runTrapChecker(page, durMs) {
  return page.evaluate((src, ms) => new Function('durMs', `${src}\nreturn checkTraps(durMs);`)(ms), TRAP_BUNDLE, durMs);
}

async function checkScene(browser, port, absFile) {
  const relFile = path.relative(repoRoot, absFile);
  let scene;
  try { scene = JSON.parse(fs.readFileSync(absFile, 'utf8')); }
  catch (e) { return { file: relFile, error: `not valid JSON: ${e.message}` }; }
  if (scene.module !== 'scene') return { file: relFile, skip: 'not module:scene' };

  const allow = new Set((scene.authoring && Array.isArray(scene.authoring.allow)) ? scene.authoring.allow : []);
  const why = (scene.authoring && (scene.authoring._why || scene.authoring.why)) || {};
  const waived = allow.has('anim-traps') && typeof why['anim-traps'] === 'string' && why['anim-traps'].trim().length >= 12;

  const durMs = sceneTiming(scene).duration * 1000;
  const raw = fs.readFileSync(absFile, 'utf8');
  const bootRel = bootPathFor(repoRoot, raw, loadScene(structuredClone(scene)), relFile);
  const page = await browser.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=/${bootRel}&fps=30`, { waitUntil: 'load' });
    const boot = await waitForEngine(page, { throwOnTimeout: false });
    if (boot) return { file: relFile, error: `boot: ${boot}` };
    const findings = await runTrapChecker(page, durMs);
    return { file: relFile, findings, waived };
  } finally { await page.close(); }
}

// A bare page (harness/media/render-page.mjs's own render target) instead of a scene.json: no browser
// needed, this reads the file's own text. Waivable through the SAME `authoring.allow` + `_why` mechanism
// render-page.mjs's assertFinalReady already reads out of `#authoring` in the page, never a second one.
function checkPage(absFile) {
  const relFile = path.relative(repoRoot, absFile);
  const src = fs.readFileSync(absFile, 'utf8');
  const findings = [];
  pageTraps(src, (what, where, fix) => findings.push({ what, where, fix }));
  const { allow = [], _why = {} } = pageAuthoring(absFile);
  const waived = isWaivedBy(allow, 'anim-traps') && hasReason(_why, 'anim-traps');
  return { file: relFile, findings, waived };
}

function reportFindings(r) {
  const sev = strict && !r.waived ? 'error' : 'warn';
  for (const t of r.findings) f.finding({ severity: sev, code: 'anim-traps',
    summary: `${t.what} | ${t.where} | fix: ${t.fix}`, at: `${r.file}: ${t.where}`, scene: r.file, waived: r.waived });
}

function printResult(r) {
  console.log(`\n  anim-traps · ${r.file}`);
  if (r.skip) { console.log(`  · ${r.skip}\n`); return; }
  if (r.error) { console.log(`  ✗ ${r.error}\n`); return; }
  if (!r.findings.length) { console.log('  ✓ clean, no trap matched\n'); return; }
  for (const t of r.findings) console.log(`  - ${t.what} | ${t.where} | fix: ${t.fix}`);
  reportFindings(r);
  console.log(r.waived ? '\n  (waived: authoring.allow has "anim-traps" with a stated reason)\n'
    : strict ? '\n  ✗ anim-traps (strict)\n'
    : '\n  Waive a deliberate case with {"authoring":{"allow":["anim-traps"],"_why":{"anim-traps":"…"}}}.\n');
}

async function reportCensus(browser, port) {
  const files = population('anim-traps', { filter: (fn) => !/intent|schema\.json$/.test(fn), quiet: true })
    .names.map((fn) => `${SCENE_DIR}/${fn}`);
  let scenesWithFindings = 0;
  for (const sceneFile of files) {
    const r = await checkScene(browser, port, path.join(repoRoot, sceneFile));
    if (r.skip || r.error) { if (r.error) console.log(`  ✗ ${r.file}: ${r.error}`); continue; }
    if (r.findings.length) { scenesWithFindings++; console.log(`  ${r.file}: ${r.findings.length} trap(s)${r.waived ? ' (waived)' : ''}`); reportFindings(r); }
  }
  console.log(`\n  anim-traps census · ${files.length} scenes checked · ${scenesWithFindings} with findings\n`);
}

async function runCli() {
  // A bare page needs no browser or file server: `checkPage` reads its own source. Scene JSON still
  // boots the real render page, since its traps (fill collisions, a dead selector) are facts about the
  // live DOM the CSS produces, not about the JSON text.
  if (file && file.endsWith('.html')) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.error(`✗ no such page: ${file}`); process.exit(2); }
    printResult(checkPage(abs));
    f.emit();
    process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
  }
  const { server, port } = await serveRepo();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  if (file) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); await browser.close(); server.close(); process.exit(2); }
    printResult(await checkScene(browser, port, abs));
  } else {
    await reportCensus(browser, port);
  }
  await browser.close();
  server.close();
  f.emit();
  process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
}

// Guarded so a test can `import { TRAP_BUNDLE, runTrapChecker }` from this file without launching a
// browser and a file server as a side effect of the import (the same pattern quality/gates/coverage.mjs
// uses): only the actual CLI invocation runs the driver.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await runCli();
