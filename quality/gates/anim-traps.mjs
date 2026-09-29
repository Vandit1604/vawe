// quality/gates/anim-traps.mjs: the traps a seeked CSS/Web Animation can fall into, none of which
// throw and none of which a browser warns about. It loads the page (harness/media/preview-server.mjs),
// reads the animations `seekAll(t)` will drive, and also greps the page source for live-clock, unseeded
// Math.random and WebGL capture mistakes.
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
//   7. A LATER ANIMATION OVERRIDES AN EARLIER ONE: two animations on one element share a property and
//      their ACTIVE windows genuinely overlap (both playing at once), so the later-registered one wins
//      the WHOLE overlap regardless of either side's fill. A per-letter or per-word animation added
//      after a timing-sheet row on the same property silently freezes or erases that row.
//
// SEVERITY: REPORTS, not BLOCKS. `--strict` promotes a finding to a failing exit code. Waiver: a page
// declares it through pageAuthoring (harness/lib/motion-stamp.mjs), with a stated reason.
//
//   node quality/gates/anim-traps.mjs <page.html> [--strict]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fillCollisionPairs, activeOverlapPairs, animatedProps, reachesBack } from '../../core/timeline/anim-pairs.js';
import { openPreview } from '../../harness/media/preview-server.mjs';
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
  if (has(/\bset(?:Timeout|Interval)\s*\(/))
    add('page uses setTimeout/setInterval', 'script', 'the render clock fires a timer only when a seek passes its due time, so a timer that starts motion or changes state lands on the frame after its delay, never mid-frame: put the change in a keyframe table or an element.animate() delay, or compute it from t in window.seek(t)');
  if (has(/(^|[\s;{"'])transition(-property)?\s*:\s*(?!none\b)[^;}]*/m))
    add('page uses a CSS transition for motion', 'style', 'a transition starts from a class or style change and runs on its own start time, so a seek cannot place it at t: use @keyframes or element.animate() (both are seeked), or set the value directly from t in window.seek(t)');
  const webgl = has(/WebGLRenderer/);
  if (webgl && !has(/preserveDrawingBuffer/))
    add('a WebGLRenderer is built without preserveDrawingBuffer', 'script', 'pass {preserveDrawingBuffer:true}, or the capture (a screenshot taken after the draw call) can read a blank/cleared buffer depending on the browser\'s own swap timing');
  if (webgl && !has(/\.onFrame\s*\(/))
    add('page draws WebGL but registers no onFrame hook', 'script', 'call vawe.onFrame((t) => { renderer.render(scene, camera); }) so the render clock actually redraws the canvas each frame; otherwise the capture reads whatever the canvas happened to hold from page load');
}

// trap 7: a later-created animation on the same element+property genuinely OVERLAPS an earlier one's
// ACTIVE window (both playing at once), not merely its fill. WAAPI composites later-registered
// animations on top for the whole overlap regardless of fill:forwards on either side, so a per-letter
// or per-word animation registered after a timing-sheet row on the same property silently freezes or
// erases that row for as long as both are active. `activeOverlapPairs` (core/timeline/clips.js) is the
// one definition of "these two overlap", so this trap and any future engine behaviour around it read
// the same pairs.
function activeOverlap(add) {
  for (const { a, b, props, overlapMs } of activeOverlapPairs()) {
    const el = a.effect.target;
    add(`"${labelOf(a)}" and "${labelOf(b)}" both write ${props.join(',')} while both are ACTIVELY playing (${Math.round(overlapMs)}ms overlap)`,
      el.tagName.toLowerCase(),
      'the later-registered animation wins for the whole overlap regardless of fill: merge both into one keyframe list, or order/stagger them so their active windows never overlap, or set an explicit composite');
  }
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
  activeOverlap(add);
  return findings;
}

// page.evaluate(checkTraps, durMs) would send ONLY checkTraps.toString(): the trap functions it calls
// are not in its closure, so the browser would throw ReferenceError on the first one. Bundling every
// function's own source into one string and running it through `new Function` inside the page keeps
// each Node-side function small and independently readable while still executing as one whole in the
// browser, which is where document.getAnimations() and the stylesheets actually live.
export const TRAP_BUNDLE = [animatedProps, reachesBack, fillCollisionPairs, activeOverlapPairs, labelOf, fillCollisions, missingEndKeyframe, varInShorthand, badSelector, delayPastEnd, unevenSegmentEasing, activeOverlap, checkTraps]
  .map((fn) => fn.toString()).join('\n');
export async function runTrapChecker(page, durMs) {
  return page.evaluate((src, ms) => new Function('durMs', `${src}\nreturn checkTraps(durMs);`)(ms), TRAP_BUNDLE, durMs);
}

async function checkPage(absFile) {
  const relFile = path.relative(repoRoot, absFile);
  const { page, url, close } = await openPreview(absFile, { width: 1920, height: 1080 });
  try {
    await page.goto(url, { waitUntil: 'load' });
    const durMs = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="duration"]');
      if (meta) return Number(meta.content) * 1000;
      return document.getAnimations().reduce((m, a) => {
        const t = a.effect.getComputedTiming();
        return Math.max(m, (t.delay || 0) + (t.duration || 0) * (t.iterations === Infinity ? 1 : (t.iterations || 1)));
      }, 0);
    });
    const findings = await runTrapChecker(page, durMs);
    pageTraps(fs.readFileSync(absFile, 'utf8'), (what, where, fix) => findings.push({ what, where, fix }));
    const { allow = [], _why = {} } = pageAuthoring(absFile);
    const waived = isWaivedBy(allow, 'anim-traps') && hasReason(_why, 'anim-traps');
    return { file: relFile, findings, waived };
  } finally { await close(); }
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

async function runCli() {
  if (!file || !/\.html?$/i.test(file)) { console.error('usage: node quality/gates/anim-traps.mjs <page.html> [--strict]'); process.exit(2); }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) { console.error(`✗ no such page: ${file}`); process.exit(2); }
  printResult(await checkPage(abs));
  f.emit();
  process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
}

// Guarded so a test can `import { TRAP_BUNDLE, runTrapChecker }` from this file without launching a
// browser and a file server as a side effect of the import (the same pattern quality/gates/coverage.mjs
// uses): only the actual CLI invocation runs the driver.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await runCli();
