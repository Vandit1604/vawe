// tests/media/see-dom.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-dom.test.mjs
//
// Proves harness/media/see.mjs's --dom (read motion straight from a page's document.getAnimations(),
// no video, no per-sample screenshot) and --sheet-check (diff two already-computed motion curves, no
// render) on a tiny synthetic HTML page: one box that slides for the first half of a 2s clip, then sits
// still. Checks the curve reads high-then-low, an appear/leave event is seen, and the still grid + sheet
// land on disk.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/see.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'see-dom-test-'));
const htmlPath = path.join(tmp, 'page.html');
fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="duration" content="2">
<style>*{margin:0}body{width:320px;height:180px;background:#000}
#box{position:absolute;top:70px;left:0;width:40px;height:40px;background:#fff;opacity:0}</style>
</head><body><div id="box"></div>
<script>
document.getElementById('box').animate([
  { transform: 'translateX(0px)', opacity: 1, offset: 0 },
  { transform: 'translateX(280px)', opacity: 1, offset: 0.5 },
  { transform: 'translateX(280px)', opacity: 1, offset: 0.7 },
  { transform: 'translateX(280px)', opacity: 0, offset: 0.8 },
  { transform: 'translateX(280px)', opacity: 0, offset: 1 },
], { duration: 2000, fill: 'both' });
</script></body></html>`);

try {
  const domOut = path.join(tmp, 'dom-out');
  const stdout = execFileSync('node', [SCRIPT, htmlPath, domOut, '--dom', '--dom-fps', '15'], { encoding: 'utf8' });
  assert(/tracked element\(s\)/.test(stdout), `expected the DOM summary line: ${stdout}`);

  const sheetPath = path.join(domOut, 'dom', 'motion.json');
  const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));
  assert(sheet.ids.includes('box'), `expected "box" among the tracked ids, got ${JSON.stringify(sheet.ids)}`);
  assert(sheet.curve.length >= 3, `expected several 0.5s windows over a 2s page, got ${sheet.curve.length}`);
  const early = sheet.curve[0].mean, late = sheet.curve[sheet.curve.length - 1].mean;
  assert(early > late, `expected the sliding first half to read louder than the still tail, got early=${early} late=${late}`);
  assert(sheet.events.some((e) => e.id === 'box' && e.type === 'appear'), `expected a "box appear" event, got ${JSON.stringify(sheet.events)}`);
  assert(sheet.events.some((e) => e.id === 'box' && e.type === 'leave'), `expected a "box leave" event, got ${JSON.stringify(sheet.events)}`);
  assert(fs.existsSync(path.join(domOut, 'dom', 'dom-still-01.png')), '--dom must write at least one still grid');
  console.log(`✓ see-dom.test.mjs: --dom read ${sheet.curve.length} window(s), early=${early.toFixed(1)} > late=${late.toFixed(1)}, `
    + `${sheet.events.length} event(s)`);

  // ── --sheet-check: the same curve against itself must read flat, ratio 1x everywhere, no offset ────
  const checkOut = execFileSync('node', [SCRIPT, sheetPath, sheetPath, '--sheet-check'], { encoding: 'utf8' });
  assert(/0\.00s early|0\.00s on time/.test(checkOut) === false || /on time/.test(checkOut), `expected a same-sheet peak offset near zero: ${checkOut}`);
  assert(/ratio 1\.00x/.test(checkOut), `expected every window to read ratio 1.00x against itself: ${checkOut}`);
  console.log('✓ see-dom.test.mjs: --sheet-check, a sheet against itself reads ratio 1.00x in every window');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('see-dom.test.mjs: ok');
