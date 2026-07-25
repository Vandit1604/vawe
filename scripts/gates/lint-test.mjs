// lint-test.mjs — regression asserts for validate.mjs lintData (make lint-test). Each rule below maps
// to a bug that shipped this session and slipped every other gate; this pins that the rule still fires,
// so a future refactor can't silently un-catch it. Pure, no browser.
//   node scripts/lint-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintData, fxErrors, validateData } from '../../core/validate.mjs';
import { resolveEasing, easeOutCubic } from '../../core/motion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.error(`✗ ${msg}`); fail++; } else console.log(`✓ ${msg}`); };

// known-bad fixture must fire one of each rule
const bad = lintData(read('verify/fixtures/lint-bad.json'));
ok(bad.some((w) => /no "duration"/.test(w)), 'rule 1: missing-duration (the "+" that leaked 53s)');
ok(bad.some((w) => /typing.*markup/i.test(w)), 'rule 2: typing + <b>/<em> markup (shot-7 raw tags)');
ok(bad.some((w) => /colliding/.test(w)), 'rule 3: scene collision (Preferences↔agents overlap)');

// committed clean scene must stay silent (no false positives)
const clean = lintData(read('formats/scene/sample.json'));
ok(clean.length === 0, `clean sample.json is silent (got ${clean.length}: ${clean.join('; ') || 'none'})`);

// --- fxErrors: named GSAP effect/exit names must be real, and exit/split ownership must not clash (#82) ---
const fxBad = fxErrors({ layers: [
  { type: 'text', text: 'a', fx: 'poprIn', duration: 2 },                    // typo entrance
  { type: 'text', text: 'b', fxOut: 'blurout', out: 'rush', duration: 2 },   // typo exit + out clash
  { type: 'text', text: 'c', split: 'char', splitText: { mask: true }, duration: 2 }, // two splitters
] });
ok(fxBad.some((e) => /fx "poprIn" is not a known effect/.test(e)), 'fxErrors: unknown fx name (with did-you-mean)');
ok(fxBad.some((e) => /fxOut "blurout" is not a known exit/.test(e)), 'fxErrors: unknown fxOut name');
ok(fxBad.some((e) => /both "out" and "fxOut"/.test(e)), 'fxErrors: out + fxOut clash');
ok(fxBad.some((e) => /both "split" and "splitText"/.test(e)), 'fxErrors: split + splitText clash');
const fxClean = fxErrors({ layers: [{ type: 'text', text: 'a', anim: 'none', fx: ['blurIn', 'float'], fxOut: 'flyOutLeft', duration: 2 }] });
ok(fxClean.length === 0, `fxErrors: valid fx/fxOut is silent (got ${fxClean.join('; ') || 'none'})`);

// --- resolveEasing: unknown name FALLS BACK to easeOutCubic (was silent; now warns) — never throws (#83) ---
ok(resolveEasing('nope-not-real') === easeOutCubic, 'resolveEasing: unknown name → easeOutCubic fallback');
ok(resolveEasing('spring') !== easeOutCubic && typeof resolveEasing('spring') === 'function', 'resolveEasing: known name resolves to its own curve');
ok(resolveEasing('easeOutQuart')(1) === 1 && resolveEasing('easeOutQuart')(0) === 0, 'resolveEasing: resolved curve holds endpoints');

// --- block/comp layers are EXEMPT from base-layer field validation (#84: showcase-spot could not boot) ---
const sceneSchema = read('formats/scene/schema.json');
const blockScene = { module: 'scene', theme: 'default', duration: 3, layers: [
  { type: 'block', block: 'pointer', x: 100, y: 100, to: { x: 640, y: 542 }, start: 0, dur: 2 },   // to is object, not number
  { type: 'block', block: 'kpiRow', x: 100, y: 300, items: [{ value: '1', label: 'a' }], start: 0, dur: 2 }, // items is array, not string
] };
const blockErrs = validateData(sceneSchema, blockScene).filter((e) => /\.to must be|\.items must be/.test(e));
ok(blockErrs.length === 0, `block props exempt from base-layer type checks (got ${blockErrs.join('; ') || 'none'})`);

console.log(fail ? `\nlint-test: ${fail} failed` : '\nlint-test: all pass');
process.exit(fail ? 1 : 0);
