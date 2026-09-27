// tests/media/see-probe-look-layout.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-probe-look-layout.test.mjs
//
// Proves harness/media/see.mjs's --probe (box/opacity/transform/filter + animation progress for one
// selector at one time), --look (stills at named times, gridded), and --layout (clipped text, off-frame
// elements, text-on-text, stacked opaque backgrounds) on two tiny synthetic pages: a clean one (nothing
// should fire) and a deliberately broken one (all four --layout fault kinds must fire, and none must be
// a false positive from `.bg`-style decorative gradients or auto-sized spans).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/see.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'see-layout-test-'));

const cleanHtml = path.join(tmp, 'clean.html');
fs.writeFileSync(cleanHtml, `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="duration" content="2">
<style>*{margin:0}body{width:640px;height:360px;background:#04201a}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#14a077 0%,#04201a 60%)}
#box{position:absolute;top:150px;left:0;width:80px;height:60px;background:#fff;opacity:0}
#label{position:absolute;top:20px;left:20px;width:200px;font-size:20px;color:#fff}</style>
</head><body><div class="bg"></div><div id="box"></div><div id="label">short label</div>
<script>
document.getElementById('box').animate([
  { transform: 'translateX(0px)', opacity: 1, offset: 0 },
  { transform: 'translateX(200px)', opacity: 1, offset: 0.5 },
  { transform: 'translateX(200px)', opacity: 1, offset: 1 },
], { duration: 2000, fill: 'both' });
</script></body></html>`);

const brokenHtml = path.join(tmp, 'broken.html');
fs.writeFileSync(brokenHtml, `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="duration" content="2">
<style>*{margin:0}body{width:640px;height:360px;background:#000}
.bgA{position:absolute;inset:0;background:#0a4a3a}
.bgB{position:absolute;inset:0;background:#1a1a1a}
.clipped{position:absolute;left:20px;top:20px;width:80px;height:24px;overflow:hidden;white-space:nowrap;font-size:20px;color:#fff}
.overlapA{position:absolute;left:100px;top:100px;width:200px;height:30px;font-size:18px;color:#fff}
.overlapB{position:absolute;left:110px;top:105px;width:200px;height:30px;font-size:18px;color:#ff0}
.offframe{position:absolute;left:3000px;top:100px;width:100px;height:30px;font-size:18px;color:#fff}</style>
</head><body>
<div class="bgA" id="bgA"></div><div class="bgB" id="bgB"></div>
<div class="clipped" id="clipped">this text is way too long for its box</div>
<div class="overlapA" id="overlapA">alpha bravo charlie</div>
<div class="overlapB" id="overlapB">delta echo foxtrot</div>
<div class="offframe" id="offframe">off the edge</div>
</body></html>`);

try {
  // ── --probe: box/opacity/transform + one animation's progress, a quarter into a 2s slide (the
  // slide itself only runs offset 0-0.5, i.e. the first 1s) ─────────────────────────────────────────
  const probeOut = path.join(tmp, 'probe-out');
  const probeStdout = execFileSync('node', [SCRIPT, cleanHtml, probeOut, '--probe', '--at', '0.5', '--sel', '#box'], { encoding: 'utf8' });
  assert(/PROBE/.test(probeStdout), `expected a PROBE header: ${probeStdout}`);
  const probe = JSON.parse(fs.readFileSync(path.join(probeOut, 'probe', 'probe.json'), 'utf8'));
  assert(probe.rows.length === 1, `expected exactly one #box match, got ${probe.rows.length}`);
  const row = probe.rows[0];
  assert(row.opacity === 1, `expected #box opacity 1 at t=0.5s, got ${row.opacity}`);
  assert(row.box.x > 0 && row.box.x < 200, `expected #box mid-slide (0<x<200), got x=${row.box.x}`);
  assert(row.animations.length === 1 && Math.abs(row.animations[0].progress - 0.25) < 0.05,
    `expected one animation at ~0.25 progress, got ${JSON.stringify(row.animations)}`);
  console.log(`✓ see-probe-look-layout.test.mjs: --probe read #box at x=${row.box.x}, progress ${row.animations[0].progress.toFixed(2)}`);

  // ── --look: one grid, no reference ──────────────────────────────────────────────────────────────
  const lookOut = path.join(tmp, 'look-out');
  const lookStdout = execFileSync('node', [SCRIPT, cleanHtml, lookOut, '--look', '--times', '0,1,2'], { encoding: 'utf8' });
  assert(/✓ look: \d+ grid/.test(lookStdout), `expected a --look summary line: ${lookStdout}`);
  assert(fs.existsSync(path.join(lookOut, 'look', 'look-01.png')), '--look must write at least one grid');
  console.log('✓ see-probe-look-layout.test.mjs: --look wrote a grid with no reference');

  // ── --layout: clean page reads clean ────────────────────────────────────────────────────────────
  const cleanLayoutOut = path.join(tmp, 'clean-layout-out');
  execFileSync('node', [SCRIPT, cleanHtml, cleanLayoutOut, '--layout', '--times', '0,1'], { encoding: 'utf8' });
  const cleanLayout = JSON.parse(fs.readFileSync(path.join(cleanLayoutOut, 'layout', 'layout.json'), 'utf8'));
  assert(cleanLayout.faultCount === 0, `expected the clean page to read 0 faults (no false positives on .bg/auto-width spans), got ${cleanLayout.faultCount}: ${JSON.stringify(cleanLayout.perTime)}`);
  console.log('✓ see-probe-look-layout.test.mjs: --layout reads 0 faults on the clean page');

  // ── --layout: broken page catches all four fault kinds ──────────────────────────────────────────
  const brokenLayoutOut = path.join(tmp, 'broken-layout-out');
  try { execFileSync('node', [SCRIPT, brokenHtml, brokenLayoutOut, '--layout', '--times', '0'], { encoding: 'utf8' }); } catch { /* CLI exit code is not asserted here, only the findings are */ }
  const brokenLayout = JSON.parse(fs.readFileSync(path.join(brokenLayoutOut, 'layout', 'layout.json'), 'utf8'));
  const kinds = new Set(brokenLayout.perTime[0].findings.map((f) => f.kind));
  for (const kind of ['clipped-text', 'off-frame', 'text-overlap', 'stacked-opaque'])
    assert(kinds.has(kind), `expected "${kind}" among the broken page's findings, got ${[...kinds].join(', ')}`);
  console.log('✓ see-probe-look-layout.test.mjs: --layout caught all 4 fault kinds on the broken page');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
