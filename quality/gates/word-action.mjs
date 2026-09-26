// quality/gates/word-action.mjs · does every primitive have word-to-action vocabulary?
//
//   node quality/gates/word-action.mjs            ·   make check GATE=word-action
//   node quality/gates/word-action.mjs --list     ·   every entry missing words, action, or both
//   node quality/gates/word-action.mjs --stamp    ·   record today's per-registry missing counts as the new ceiling
//
// WHY THIS EXISTS. The model that authors a film was never trained on motion data, so it only knows a
// primitive through the plain words a person would say for it and a concrete statement of what those
// words make happen. HyperFrames' prompting docs carry this as a table: "snappy" means a named fast
// ease, "fast" means 0.2s, "push in" means 4 to 8 percent scale. This engine has the mechanism already
// (core/registry/registry.js `defineRegistry`: every entry gets a `blurb` and may carry `aka`), it was
// just never held to a contract strict enough to guarantee an author reaching for plain English lands
// on the right primitive with the right numbers.
//
// THE CONTRACT, as data on the EXISTING registry entries, not a new system:
//   words   the plain phrases a person would say to select this entry. Carried on `aka`, the mechanism
//           `defineRegistry` already has for exactly this ("handheld" for `driftHold`). At least 2 per
//           entry: one word is a synonym, two is evidence the entry was searched for in more than one
//           way. `aka` is never printed, so it costs nothing to the retrieval-index argument `blurb`
//           already carries.
//   action  one plain sentence saying what the entry does ON SCREEN, with its real default number where
//           one exists (distance, duration, scale, ease name). Carried on `blurb`, which is already
//           every entry's one-line description and, per core/registry/registry.js `checkBlurb`, is
//           already refused at load if it only restates the entry's own name. Most blurbs in this repo
//           already describe the visible behaviour; what they are missing is the NUMBER, so `blurb` is
//           the right field rather than a new one, held to a stricter bar than `checkBlurb` enforces.
//
// THE ACTION HEURISTIC, and it is a heuristic, not a semantic check: this gate cannot read a value and
// know whether "40px" is the real default or a guess, and it cannot judge prose quality. What it CAN
// check deterministically: a blurb that carries a digit is naming a concrete number, and a blurb long
// enough to state a mechanism (10+ words) is not a one-line label even when the entry has no natural
// number (an easing curve, a blend mode, a layer type). An entry meets `action` when its blurb does
// either. This under-catches prose that states a number in words ("a third of a second") and over-trusts
// a long vague sentence; core/registry/vocab.js DURATION_BLURBS is filled by hand as the worked example
// of what a human-graded pass looks like, and the heuristic is deliberately the narrower, checkable half
// of the real bar, the same trade checkBlurb itself makes.
//
// WHAT "PRIMITIVE" MEANS. Every entry of every `defineRegistry` registry, walked off `registries()`
// exactly as quality/gates/arsenal-check.mjs already walks core/ to build that list: import every module
// under core/, then read `registries()`. A layer TYPE is one of these registries (`layer type`, 24
// entries, core/layers/index.js), not a second walk. A SCREAMING_CASE export with no `defineRegistry`
// behind it (a lookup table like `PROPS`, `POSE`, `DIRS`) is out of scope: it is not something an author
// PICKS, the same line arsenal-check.mjs's WAIVED map already draws, and this gate inherits it for free
// by only ever looking at `registries()`.
//
// THE RATCHET, per registry, same shape as quality/gates/rung.mjs and the blurb-ratchet half of
// arsenal-check.mjs. A single global number would let one large registry's slow fill hide a small
// registry's regression; keying by `kind` means the fill agents working different registries in
// parallel cannot step on each other's ratchet. A registry not yet in the baseline is treated as
// ratcheted at 0: a brand-new registry ships with vocabulary from day one, never inheriting slack a
// registry that predates this gate was given. Once a registry's missing count reaches 0 it stays there:
// this is the general rule already (missing > 0 = missing > ratchet 0), stated explicitly because a
// registry at zero is the one case this gate must never quietly relax.
//
// Pure: imports core/ modules and reads/writes one JSON baseline. No render, no network, no browser.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registries } from '../../core/registry/registry.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RATCHET = path.join(ROOT, 'quality/baselines/word-action-ratchet.json');
const f = gateFindings({ line: (r) => r.summary });

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if ((e.name.endsWith('.js') || e.name.endsWith('.mjs')) && !/\.test\.m?js$/.test(e.name)) files.push(p);
  }
};
walk('core');
const unreadable = [];
for (const file of files) {
  try { await import(path.join(ROOT, file)); } catch { unreadable.push(file); }
}

const hasWords = (reg, name) => Array.isArray(reg.aka && reg.aka[name]) && reg.aka[name].length >= 2;
const hasAction = (reg, name) => {
  const b = (reg.blurbs && reg.blurbs[name]) || '';
  return /\d/.test(b) || b.trim().split(/\s+/).filter(Boolean).length >= 10;
};

const REGS = registries();
if (!REGS.length) {
  console.error('\n  ✗ word-action found NO registries at all. The engine cannot have none, so this gate');
  console.error('    did not see its subject. Nothing below was checked.\n');
  process.exit(3);
}

const report = [];   // { kind, total, meeting, missing, entries: [{name, wantsWords, wantsAction}] }
for (const reg of REGS) {
  const names = Object.keys(reg.entries);
  const entries = [];
  for (const name of names) {
    const w = hasWords(reg, name), a = hasAction(reg, name);
    if (!w || !a) entries.push({ name, wantsWords: !w, wantsAction: !a });
  }
  report.push({ kind: reg.kind, total: names.length, meeting: names.length - entries.length, entries });
}
report.sort((x, y) => x.kind.localeCompare(y.kind));

if (process.argv.includes('--list')) {
  for (const r of report) for (const e of r.entries) {
    const lacks = [e.wantsWords && 'words', e.wantsAction && 'action'].filter(Boolean).join('+');
    console.log(`${r.kind}\t${e.name}\t${lacks}`);
  }
  process.exit(0);
}

console.log('\n  WORD-ACTION · does every primitive resolve from plain words to a stated on-screen action?');
console.log(`  ${files.length} source file(s) walked · ${REGS.length} registr(ies) · `
  + `${report.reduce((n, r) => n + r.total, 0)} primitive(s)\n`);
for (const r of report) {
  const mark = r.entries.length ? '✗' : '✓';
  console.log(`  ${mark} ${r.kind.padEnd(28)} total=${String(r.total).padStart(3)} `
    + `meeting=${String(r.meeting).padStart(3)} missing=${String(r.entries.length).padStart(3)}`);
}
if (unreadable.length) console.log(`\n  ~ ${unreadable.length} module(s) could not be imported in node, so their exports are unchecked: ${unreadable.join(', ')}`);

const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();

if (process.argv.includes('--stamp')) {
  const next = Object.fromEntries(report.map((r) => [r.kind, r.entries.length]));
  fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
  fs.writeFileSync(RATCHET, `${JSON.stringify(next, null, 1)}\n`);
  const totalMissing = report.reduce((n, r) => n + r.entries.length, 0);
  console.log(`\n  ✓ ratchet stamped: ${totalMissing} missing across ${report.length} registr(ies)`
    + (prior ? `, from ${Object.values(prior).reduce((n, v) => n + v, 0)}` : ''));
  process.exit(0);
}

const risen = [];
for (const r of report) {
  const before = prior && Object.prototype.hasOwnProperty.call(prior, r.kind) ? prior[r.kind] : 0;
  if (r.entries.length > before) risen.push([r, before]);
}

if (!risen.length) {
  const totalMissing = report.reduce((n, r) => n + r.entries.length, 0);
  if (prior) {
    const priorTotal = Object.values(prior).reduce((n, v) => n + v, 0);
    if (totalMissing < priorTotal) {
      console.log(`\n  ~ ${priorTotal - totalMissing} fewer missing than the ratchet allows across the repo.`
        + ' Lower it: node quality/gates/word-action.mjs --stamp');
    }
  } else {
    console.log(`\n  ~ ${totalMissing} missing, no ratchet yet. Stamp it: node quality/gates/word-action.mjs --stamp`);
  }
  console.log('\n  ✓ no registry\'s missing count rose above its ratchet\n');
  f.emit();
  process.exit(0);
}

console.error(`\n  ✗ ${risen.length} registr(ies) regressed against the word-action ratchet:\n`);
for (const [r, before] of risen) {
  const sample = r.entries.slice(0, 6).map((e) => {
    const lacks = [e.wantsWords && 'words', e.wantsAction && 'action'].filter(Boolean).join('+');
    return `${e.name} (${lacks})`;
  }).join(', ');
  f.fail('word-action-ratchet',
    `${r.kind}: ${r.entries.length} missing, up from ${before}. ${sample}`
    + `${r.entries.length > 6 ? ', …' : ''}`, {
      fix: `give each entry >= 2 \`aka\` words and a \`blurb\` naming its real default number, on the `
        + `defineRegistry call that owns "${r.kind}". If the count is genuinely meant to rise (a batch `
        + 'of new primitives shipped fully vocabularied), lower the bar on purpose: '
        + 'node quality/gates/word-action.mjs --stamp',
      doc: 'core/registry/registry.js',
    });
}
f.emit();
console.error('\n  A primitive with no words is findable only by someone who already knows its exact');
console.error('  name; a primitive with no stated number is a "nice" description the model cannot act on.\n');
process.exit(1);
