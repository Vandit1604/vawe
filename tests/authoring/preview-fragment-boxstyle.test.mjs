// preview-fragment-boxstyle.test.mjs: integration check that preview-fragment.mjs's --boxes-out dump
// carries the computed-style fields (fontFamily, fontWeight, letterSpacing, color, backgroundColor,
// borderRadius, boxShadow) for a real fragment with known inline styles. Launches the actual preview
// (same spawnSync path harness/author/screen.mjs uses), because this is the one thing a static parse
// of the fragment's source cannot answer: it is the browser's own getComputedStyle.
//   node harness/author/preview-fragment-boxstyle.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-boxstyle-'));
const frag = path.join(dir, 'card.html');
const png = path.join(dir, 'out.png');
const boxesFile = path.join(dir, 'boxes.json');

fs.writeFileSync(frag, `
<div style="width:400px;height:200px;background:#112233;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
  <p style="font-family:Arial, sans-serif;font-weight:700;letter-spacing:2px;color:#ffcc00">hello</p>
</div>`);

const pv = spawnSync('node', [
  path.join(ROOT, 'harness/author/preview-fragment.mjs'), frag,
  '--out', png, '--boxes-out', boxesFile, '--no-detect',
], { encoding: 'utf8', cwd: ROOT, timeout: 60000 });

assert.equal(pv.status, 0, `preview-fragment.mjs must exit clean: ${pv.stderr}`);
assert.ok(fs.existsSync(boxesFile), '--boxes-out must write a file');

const boxes = JSON.parse(fs.readFileSync(boxesFile, 'utf8'));
const card = boxes.find((b) => b.backgroundColor === '#112233');
assert.ok(card, `a box painting #112233 must be reported; got ${JSON.stringify(boxes.map((b) => b.backgroundColor))}`);
assert.equal(card.borderRadius, 12, 'the div\'s 12px radius is reported');
assert.equal(card.borderRadiusMixed, false, 'a uniform radius is not flagged as mixed');
assert.ok(card.boxShadow && card.boxShadow.includes('12px'), 'the box-shadow is reported raw, not dropped');

const text = boxes.find((b) => b.text === 'hello');
assert.ok(text, 'the text box must be reported');
assert.equal(text.fontFamily, 'Arial', 'the first font family, unquoted');
assert.equal(text.fontWeight, 700, 'font-weight is a number');
assert.equal(text.letterSpacing, 2, 'letter-spacing is a px number');
assert.equal(text.color, '#ffcc00', 'text color normalises to lowercase hex');
assert.equal(text.boxShadow, null, 'a box with no shadow of its own reports null, not "none"');

fs.rmSync(dir, { recursive: true, force: true });
console.log('preview-fragment-boxstyle.test.mjs: all assertions passed');
