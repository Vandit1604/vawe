import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePage, applyEdits } from '../../studio/page-source.mjs';
import { setCssTiming, setAnimateOption } from '../../studio/ui/page-edit.js';
import { easeNameOf, easeSource, easeOptions, easeHint, NAMED } from '../../studio/ui/page-eases.js';
import { EASE, EASE_VARS } from '../../core/motion/presets.js';

const apply = (page, edits) => applyEdits(page, edits);
const CSS = '<style>h1 { animation: rise 0.6s ease-out both; } @keyframes rise { from { opacity: 0 } to { opacity: 1 } }</style><h1>a</h1>';
const bare = (easing) => `<script type="module">el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: ${easing} });</script>`;
const withImport = (easing) => `<script type="module">import { EASE as E } from '/core/motion/presets.js';\nel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: ${easing} });</script>`;

test('the menu offers the named eases first and no CSS keyword or bezier', () => {
  const labels = easeOptions('var(--ease-land)').map((o) => o.value);
  assert.deepEqual(labels, NAMED);
  for (const banned of ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']) assert.ok(!labels.includes(banned));
  assert.equal(easeOptions('var(--ease-land)').find((o) => o.selected).value, 'land');
});

test('each named ease carries the job hint from the ease-jobs table', () => {
  assert.match(easeHint('launch'), /exit/);
  assert.match(easeHint('land'), /title/);
  assert.match(easeOptions('var(--ease-launch)').find((o) => o.value === 'launch').label, /^launch: exit/);
});

test('a value that is not a named ease stays selectable and is marked', () => {
  const [custom, ...rest] = easeOptions("'cubic-bezier(0.16, 1, 0.3, 1)'");
  assert.equal(custom.value, 'cubic-bezier(0.16, 1, 0.3, 1)');
  assert.match(custom.label, /not a named ease/);
  assert.ok(custom.selected);
  assert.deepEqual(rest.map((o) => o.value), NAMED);
});

test('easeNameOf reads every form', () => {
  assert.equal(easeNameOf('var(--ease-land-soft)'), 'land-soft');
  assert.equal(easeNameOf('EASE.landSoft'), 'land-soft');
  assert.equal(easeNameOf('E.pop', 'E'), 'pop');
  assert.equal(easeNameOf("'landSoft'"), 'land-soft');
  assert.equal(easeNameOf(`'${EASE.glide}'`), 'glide');
  assert.equal(easeNameOf(EASE_VARS.swap), 'swap');
  assert.equal(easeNameOf('ease-out'), null);
  assert.equal(easeNameOf('var(--ease-nope)'), null);
});

test('css: a shorthand easing is replaced by var(--ease-name), and read back', () => {
  const rule = parsePage(CSS).animRules[0];
  const out = apply(CSS, setCssTiming(rule, 'easing', easeSource('launch', 'css')));
  assert.match(out, /animation: rise 0\.6s var\(--ease-launch\) both;/);
  assert.equal(easeNameOf(parsePage(out).animRules[0].easing.text), 'launch');
});

test('css: a shorthand without an easing gets the var form appended', () => {
  const page = CSS.replace(' ease-out', '');
  const out = apply(page, setCssTiming(parsePage(page).animRules[0], 'easing', easeSource('land-soft', 'css')));
  assert.match(out, /animation: rise 0\.6s both var\(--ease-land-soft\);/);
});

test('css: animation-timing-function takes the var form', () => {
  const page = '<style>h1 { animation-name: rise; animation-duration: 1s; animation-timing-function: ease; } @keyframes rise { from { opacity: 0 } to { opacity: 1 } }</style>';
  const out = apply(page, setCssTiming(parsePage(page).animRules[0], 'easing', easeSource('settle', 'css')));
  assert.match(out, /animation-timing-function: var\(--ease-settle\);/);
});

test('animate with the EASE import: the parser finds the local name and the write is EASE.name unquoted', () => {
  const page = withImport("'ease-out'");
  const model = parsePage(page);
  assert.equal(model.easeImport, 'E');
  const text = easeSource('land-soft', 'animate', { easeLocal: model.easeImport });
  assert.equal(text, 'E.landSoft');
  const out = apply(page, setAnimateOption(model.animates[0], 'easing', text, true));
  assert.match(out, /easing: E\.landSoft \}/);
  assert.equal(easeNameOf(parsePage(out).animates[0].options.easing.text, 'E'), 'land-soft');
});

test('animate without the import: the write is the exact linear() curve as a string, which resolves with no dependency', () => {
  const page = bare("'ease-out'");
  const model = parsePage(page);
  assert.equal(model.easeImport, null);
  const text = easeSource('launch', 'animate', { easeLocal: model.easeImport });
  assert.equal(text, `'${EASE.launch}'`);
  const out = apply(page, setAnimateOption(model.animates[0], 'easing', text, true));
  assert.equal(easeNameOf(parsePage(out).animates[0].options.easing.text), 'launch');
});

test('animate: a missing easing option is inserted', () => {
  const page = '<script type="module">el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });</script>';
  const out = apply(page, setAnimateOption(parsePage(page).animates[0], 'easing', 'EASE.land', true));
  assert.match(out, /\{ easing: EASE\.land, duration: 600 \}/);
});

test('table: a table that holds ease names is written as the bare camelCase name in the quote style it uses', () => {
  const page = '<script>const cam = [[0, "land"], [1, "glide"], [2, "settle"]];</script>';
  const [table] = parsePage(page).tables;
  assert.ok(table.entries.every((e) => easeNameOf(e.value.str)));
  const text = easeSource('land-soft', 'name', { lit: table.entries[1].value });
  assert.equal(text, '"landSoft"');
  const e = table.entries[1].value;
  const out = apply(page, [{ start: e.start, end: e.end, expect: e.text, text }]);
  assert.match(out, /\[1, "landSoft"\]/);
});
