// node --test tests/gates/anim-traps.test.mjs
//
// Proves the checker itself, independent of the render pipeline: one bare page carries all six traps
// (five in CSS, reachable through an authored `html` fragment; the sixth, a raw `element.animate()`
// call with one non-linear top-level easing across 3+ keyframes, needs real JS, so this loads it
// directly in a test page rather than through a sanitized fragment, which strips <script> on purpose).
import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { TRAP_BUNDLE, runTrapChecker } from '../../quality/gates/anim-traps.mjs';

const FIXTURE = `<!doctype html><html><head><style>
/* trap 1: fill collision, both writing opacity with overlapping fill:both windows */
@keyframes t1a { 0% { opacity: 0 } 100% { opacity: 1 } }
@keyframes t1b { 0% { opacity: 1 } 100% { opacity: 0 } }
.trap1 { animation: t1a 1s both, t1b 1s 2s both; }
/* trap 2: no 100%/to */
@keyframes t2 { 0% { opacity: 0 } 50% { opacity: 1 } }
.trap2 { animation: t2 1s both; }
/* trap 3: var() inside the animation shorthand */
@keyframes t3 { 0% { opacity: 0 } 100% { opacity: 1 } }
.trap3 { animation: t3 var(--dur, 1s) both; }
/* trap 4: :nth-child resets its count at every parent */
.trap4 span:nth-child(1) { animation: t3 1s both; }
/* trap 5: a delay past the (short, 3s) fixture film */
.trap5 { animation: t3 1s both 10s; }
</style></head><body>
<div class="trap1"></div>
<div class="trap2"></div>
<div class="trap3"></div>
<div class="trap4"><span>a</span></div>
<div class="trap4"><span>b</span></div>
<div class="trap5"></div>
<script>
  // trap 6: one non-linear top-level easing across 3+ keyframes, none of which carries its own
  document.querySelector('body').animate(
    [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 1, offset: 0.82 }, { opacity: 0, offset: 1 }],
    { duration: 2000, easing: 'ease-in-out', fill: 'both' });
</script>
</body></html>`;

test('anim-traps: a fixture carrying all six traps is caught by name, one line each', async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(FIXTURE);
    const findings = await runTrapChecker(page, 3000);
    const what = findings.map((f) => f.what).join('\n');

    assert.match(what, /both write opacity with overlapping fill windows/, 'trap 1: fill collision');
    assert.match(what, /@keyframes t2 has no 100%\/to/, 'trap 2: no end keyframe');
    assert.match(what, /uses var\(\) inside the animation shorthand/, 'trap 3: var() in shorthand');
    assert.match(what, /matches 2 elements across 2 different parents/, 'trap 4: :nth-child resets per parent');
    assert.match(what, /starts at 10000ms, after the 3000ms film/, 'trap 5: delay past the film\'s own end');
    assert.match(what, /applies one easing \("ease-in-out"\) across 4 keyframes/, 'trap 6: one easing stretched over several stops');
    assert.equal(findings.length, 6, `expected exactly 6 findings (one per trap), got ${findings.length}:\n${what}`);
  } finally { await browser.close(); }
});

test('anim-traps: TRAP_BUNDLE stays self-contained (every function it calls is in the bundle)', () => {
  // A trap function added to checkTraps but left out of the export array would throw ReferenceError
  // only inside the browser, at whichever gate happens to run it next; this catches that at import time.
  for (const name of ['animatedProps', 'reachesBack', 'fillCollisionPairs', 'labelOf', 'fillCollisions', 'missingEndKeyframe', 'varInShorthand', 'badSelector', 'delayPastEnd', 'unevenSegmentEasing', 'checkTraps'])
    assert.ok(TRAP_BUNDLE.includes(`function ${name}`), `TRAP_BUNDLE is missing ${name}`);
});
