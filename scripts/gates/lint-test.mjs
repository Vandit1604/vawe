// lint-test.mjs: regression asserts for validate.mjs lintData (make lint-test). Each rule below maps
// to a bug that shipped this session and slipped every other gate; this pins that the rule still fires,
// so a future refactor can't silently un-catch it. Pure, no browser.
//   node scripts/gates/lint-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { lintData, fxErrors, validateData } from '../../core/validate.mjs';
import { resolveEasing, easeOutCubic } from '../../core/motion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.error(`✗ ${msg}`); fail++; } else console.log(`✓ ${msg}`); };

// known-bad fixture must fire one of each rule
const bad = lintData(read('verify/fixtures/lint-bad.json'));
ok(bad.some((w) => /no "duration"/.test(w)), 'rule 1: missing-duration (the "+" that leaked 53s)');
// rule 2 was RETIRED: typing is HTML-safe since core/layers/text.js gained revealHtml (#85). Pinned the
// other way round now. A typed line carrying <b> must produce NO warning, so the stale rule cannot
// come back by reflex and go on telling authors to strip markup the engine renders correctly.
ok(!bad.some((w) => /typing.*markup/i.test(w)), 'rule 2 retired: typing + <b>/<em> is silent (HTML-safe typing, #85)');
ok(bad.some((w) => /colliding/.test(w)), 'rule 3: scene collision (Preferences↔agents overlap)');
// rule 3, the other half: the collision must be measured on the GLYPHS, not on the declared `w`. A
// centred or left-aligned line needs a `w` (pin centres a box) and mostly does not fill it, so two
// boxes can intersect over empty slack while nothing on screen touches. Pinned because the same
// read-the-representation bug has been logged four times (docs/MISTAKES.md #214/#216/#217/#242).
const slack = lintData({ module: 'scene', layers: [
  { type: 'text', text: 'Hi', x: 100, y: 400, w: 1200, size: 70, start: 0, duration: 4 },
  { type: 'text', text: 'There', x: 900, y: 400, w: 600, size: 70, start: 0, duration: 4 },
] });
ok(!slack.some((w) => /colliding/.test(w)), `rule 3: declared boxes that overlap only in empty slack are silent (got ${slack.filter((w) => /colliding/.test(w)).join('; ') || 'none'})`);

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

// --- resolveEasing: an unknown name THROWS. #83 made it fall back to easeOutCubic and this assertion
// pinned that; #367 reversed it, because a curve quietly swapped for another renders a plausible frame
// that is NOT the one asked for, which is the silent-substitution class this repo logs most. The
// decision moved and the test did not, so `lint-test` could not pass in a tree that had both. A stale
// assertion is worse than a missing one: it fails honest work and teaches the next author to distrust
// the suite. It now pins the CURRENT contract, and names the entry that set it.
ok((() => { try { resolveEasing('nope-not-real'); return false; } catch (e) { return /unknown easing/.test(e.message); } })(),
  'resolveEasing: unknown name THROWS and names itself (#367 superseded #83)');
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

// --- direction gate: the book-grounded motion tells still fire, and a clean scene stays silent (#134) ---
const direct = (rel) => { try { return execFileSync('node', [path.join(root, 'scripts/author/motion-director.mjs'), path.join(root, rel)], { encoding: 'utf8' }); } catch (e) { return `${e.stdout || ''}${e.stderr || ''}`; } };
const badDir = direct('verify/fixtures/direction-bad.json');
ok(/\[linear-motion\]/.test(badDir), 'direct: linear-motion tell fires (ease:"linear" on a move)');
ok(/\[monotone-timing\]/.test(badDir), 'direct: monotone-timing tell fires (6 identical enterDur)');
ok(/\[enter-and-retreat\]/.test(badDir), 'direct: enter-and-retreat tell fires (anim+out same side)');
const cleanDir = direct('formats/scene/sample.json');
ok(!/\[(linear-motion|monotone-timing|enter-and-retreat)\]/.test(cleanDir), 'direct: clean sample.json trips none of the new tells');

// --- direction floor: fails a plain slideshow, passes a directed (blueprint) scene (the ambition floor) ---
const floor = (rel) => { try { execFileSync('node', [path.join(root, 'scripts/gates/direction-floor.mjs'), path.join(root, rel)], { encoding: 'utf8' }); return 0; } catch (e) { return e.status ?? 1; } };
const floorOut = (rel) => { try { return execFileSync('node', [path.join(root, 'scripts/gates/direction-floor.mjs'), path.join(root, rel)], { encoding: 'utf8' }); } catch (e) { return `${e.stdout || ''}${e.stderr || ''}`; } };
ok(floor('verify/fixtures/plain-slideshow.json') === 1 && /\[plain-slideshow\]/.test(floorOut('verify/fixtures/plain-slideshow.json')), 'direction-floor: FAILS a plain slideshow (rise/fade only)');
ok(floor('verify/fixtures/directed-beat.json') === 0, 'direction-floor: PASSES a directed blueprint scene');

// --- blueprints: a beat expands into richly-animated layers (kinetic reveal present), pure ---
const { BEATS } = await import('../../blueprints/index.mjs');
const hookLayers = BEATS.kineticHook({ eyebrow: 'e', to: 94, unit: '%', sub: 'a subline', start: 0, dur: 5 });
ok(Array.isArray(hookLayers) && hookLayers.some((l) => l.split && l.preset), 'blueprints: kineticHook emits a kinetic (split+preset) reveal');
ok(hookLayers.some((l) => l.type === 'count'), 'blueprints: kineticHook emits a count-up hero number');

console.log(fail ? `\nlint-test: ${fail} failed` : '\nlint-test: all pass');
process.exit(fail ? 1 : 0);
