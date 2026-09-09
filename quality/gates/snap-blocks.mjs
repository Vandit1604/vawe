#!/usr/bin/env node
// quality/gates/snap-blocks.mjs: the REGRESSION NET FOR THE BLOCK LIBRARY. snap-scenes sweeps the
// shipped films; this sweeps the 179 catalog entries in blocks/, and it exists because snap-scenes
// cannot see a block at all.
//
// WHY THE FILMS DO NOT COVER THE BLOCKS. `{"type":"block"}` is build-time sugar, expanded (core/engine/expand.js)
// at LOAD time into a factory's concrete layers, so a snap-scenes snapshot of a scene JSON hashes the
// SOURCE, sugar and all, never what a factory currently returns. So restyling the whole chart family and
// the core cards would move snap-scenes not one byte: identical source, identical hash, changed pixels.
//
// WHAT IS HASHED: the LAYER JSON each factory returns, not a rendered pixel.
//   A factory is a pure props → layer-JSON function (the contract at the top of blocks/index.mjs), and
//   every visual decision it owns, colour, size, position, weight, the html string, the timing, is a
//   literal in that JSON. Identical layer JSON + identical engine + identical theme is identical pixels,
//   and the engine half is already proved across 106 films by snap-scenes. So the JSON is exactly the
//   missing half, and it costs one Node process (~0.3s) instead of 179 browser renders.
//   THE LIMIT, stated rather than implied: a restyle that lives OUTSIDE the factory, a token in
//   themes/*.json that `var(--card)` resolves to, CSS in core/. Changes block pixels and leaves this
//   gate green. That is snap-scenes' and the theme gates' subject, not this one's. A gate that claimed
//   both would be the `make slop` mistake again: confidence over evidence it never had.
//
//   node quality/gates/snap-blocks.mjs --save   # write baselines → quality/baselines/snap/blocks/<name>.json
//   node quality/gates/snap-blocks.mjs          # diff current vs baselines
//   make snap-blocks [SAVE=1] [BLOCK=<name>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';
import { population } from '../lib/census.mjs';
import { gateFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SNAP = path.join(repoRoot, 'verify', 'snap', 'blocks');
fs.mkdirSync(SNAP, { recursive: true });
const args = process.argv.slice(2);
const f = gateFindings();
const SAVE = args.includes('--save');
const ONLY = args.find((a) => !a.startsWith('--'));

// The props are the ones blocks-scenes.mjs stages each block with, so a baseline here describes the
// same block the site's poster shows. They are FIXED, never sampled or timestamped: a wall-clock or a
// random prop would make every run a "change".
const STAGE = { x: 160, y: 160, start: 0.2, dur: 8 };
const safeName = (name) => name.replace(/[^a-z0-9.]/gi, '_');

// STATE THE POPULATION, and refuse one this checkout should not have. Two numbers, because they are
// two different subjects: the CATALOG entries are what gets swept, and the module files are what the
// entries are drawn from. Only the second is a file population, so only the second goes through the
// census, and it is honest about what that buys: blocks/ is fully git-tracked, and a module missing
// from disk throws out of the ESM import above rather than reaching here, so the census's value is the
// ANCHOR arm (a worktree seeing fewer modules than the main checkout it shares a .git with) and a
// stated N. The no-baseline refusal at the bottom is what covers the blind-run case for this gate.
const mods = population('block-snap modules', { dir: 'blocks', ext: '.mjs', quiet: true });
const entries = CATALOG.filter((e) => !ONLY || e.name === ONLY).sort((a, b) => a.name.localeCompare(b.name));
if (!entries.length) { console.error(`no catalog entry named ${ONLY}`); process.exit(1); }

// Every leaf in the layer tree as `path = value`, so a diff can NAME the field that moved rather than
// reporting that two hashes differ. 179 blocks means an unreadable diff is a diff nobody reads.
function leaves(v, prefix, out) {
  if (Array.isArray(v)) { v.forEach((x, i) => leaves(x, `${prefix}[${i}]`, out)); return out; }
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) leaves(v[k], prefix ? `${prefix}.${k}` : k, out); return out; }
  out.set(prefix, v === undefined ? 'undefined' : JSON.stringify(v));
  return out;
}
// A block's `html` leaf is routinely 4KB, and printing two of them per changed field is how a diff
// becomes unreadable. Trim what the two values SHARE at each end and show only the window that moved.
const CTX = 24, CAP = 80;
const clip = (s) => (s.length > CAP ? `${s.slice(0, CAP)}…` : s);
function narrow(a, b) {
  if (a.length + b.length <= 2 * CAP) return [a, b];
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const lead = p > CTX ? `…${a.slice(p - CTX, p)}` : a.slice(0, p);
  const tail = q > CTX ? `${a.slice(a.length - q, a.length - q + CTX)}…` : a.slice(a.length - q);
  return [`${lead}[${clip(a.slice(p, a.length - q))}]${tail}`, `${lead}[${clip(b.slice(p, b.length - q))}]${tail}`];
}
function diffLeaves(base, now) {
  const a = leaves(base, '', new Map()), b = leaves(now, '', new Map());
  const out = [];
  for (const [k, v] of a) {
    if (!b.has(k)) { out.push(`− ${k} = ${clip(v)}`); continue; }
    if (b.get(k) === v) continue;
    const [was, is] = narrow(v, b.get(k));
    out.push(`~ ${k}: ${was} → ${is}`);
  }
  for (const [k, v] of b) if (!a.has(k)) out.push(`+ ${k} = ${clip(v)}`);
  return out;
}

const identical = [], changed = [], nondeterministic = [], errored = [], saved = [], nobaseline = [];
for (const entry of entries) {
  const fam = BLOCKS[entry.family];
  if (typeof fam !== 'function') { errored.push(`${entry.name}: no factory for family "${entry.family}"`); continue; }
  const props = { ...(entry.props || {}), ...STAGE };
  let layers, again;
  try { layers = fam({ ...props }); again = fam({ ...props }); }
  catch (e) { errored.push(`${entry.name}: threw, ${(e && e.message || e).toString().slice(0, 90)}`); continue; }

  // A factory that answers differently to the same props has no baseline worth saving, and it breaks
  // the contract blocks/index.mjs states ("Deterministic: no Date/random"). Quarantine it by name
  // rather than baselining whichever answer today's run happened to get. Same shape snap-scenes uses.
  const d0 = diffLeaves(layers, again);
  if (d0.length) { nondeterministic.push({ name: entry.name, sample: d0.slice(0, 4) }); continue; }

  const file = path.join(SNAP, `${safeName(entry.name)}.json`);
  // Round-trip through JSON before comparing. A layer carrying `foo: undefined` survives in memory and
  // vanishes when the baseline is written, so an unnormalised `now` would differ from its OWN baseline
  // on the very next run. A gate inventing findings, which this repo treats as a regression.
  let now;
  try { now = JSON.parse(JSON.stringify({ family: entry.family, props, layers })); }
  catch (e) { errored.push(`${entry.name}: layers are not JSON, ${e.message.slice(0, 60)}`); continue; }
  if (SAVE) { fs.writeFileSync(file, JSON.stringify(now, null, 1) + '\n'); saved.push(entry.name); continue; }
  if (!fs.existsSync(file)) { nobaseline.push(entry.name); continue; }
  let base;
  try { base = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { errored.push(`${entry.name}: unreadable baseline, ${e.message.slice(0, 60)}`); continue; }
  const d = diffLeaves(base, now);
  if (d.length) changed.push({ name: entry.name, diffs: d }); else identical.push(entry.name);
}

// ---- report ----
// Mirror every console line into a record, so --json carries the same facts. Severity follows whether
// the item contributes to a failing exit below: non-determinism, an error and (outside SAVE) a diff are
// blocking; a bare no-baseline entry is a note, unless NOTHING was compared, which is its own failure.
for (const q of nondeterministic) f.fail('non-deterministic', `${q.name}: non-deterministic, same props answered differently on two calls: ${q.sample.join(' · ')}`, { at: q.name });
for (const e of errored) f.fail('block-error', e);
if (!SAVE) {
  for (const c of changed) f.fail('block-changed', `${c.name}: ${c.diffs.length} change(s): ${c.diffs.slice(0, 10).join(' · ')}${c.diffs.length > 10 ? ` … +${c.diffs.length - 10} more` : ''}`, { at: c.name });
  for (const n of nobaseline) f.note('no-baseline', `${n}: no baseline to diff against, run \`make snap-blocks SAVE=1\``, { at: n });
  if (!identical.length && !changed.length && nobaseline.length) f.fail('nothing-compared', `all ${nobaseline.length} block(s) lack a baseline, this gate checked NOTHING`);
}
console.log(`\n==== SNAP-BLOCKS · ${entries.length} catalog entr${entries.length === 1 ? 'y' : 'ies'} from ${mods.n} block module(s) ====`);
if (SAVE) {
  console.log(`✓ ${saved.length} baseline(s) saved → quality/baselines/snap/blocks/`);
  if (nondeterministic.length) { console.log(`\n✗ ${nondeterministic.length} NON-DETERMINISTIC (NOT baselined):`); for (const q of nondeterministic) { console.log(`  ${q.name}`); for (const s of q.sample) console.log(`      ${s}`); } }
  if (errored.length) { console.log(`\n⚠ ${errored.length} errored (skipped):`); for (const e of errored) console.log(`  ✗ ${e}`); }
  process.exit(nondeterministic.length || errored.length ? 1 : 0);
}
console.log(`✓ identical: ${identical.length}   △ changed: ${changed.length}   ✗ non-deterministic: ${nondeterministic.length}   ⚠ errored: ${errored.length}   ○ no-baseline: ${nobaseline.length}`);
if (nobaseline.length) {
  console.log(`\n○ NO BASELINE (nothing to diff against, run \`make snap-blocks SAVE=1\`):`);
  for (const n of nobaseline) console.log(`  ${n}`);
}
if (nondeterministic.length) { console.log(`\n✗ NON-DETERMINISTIC:`); for (const q of nondeterministic) { console.log(`  ${q.name}`); for (const s of q.sample) console.log(`      ${s}`); } }
for (const c of changed) { console.log(`\n△ ${c.name} (${c.diffs.length} change(s)):`); for (const d of c.diffs.slice(0, 10)) console.log(`    ${d}`); if (c.diffs.length > 10) console.log(`    … +${c.diffs.length - 10} more`); }
if (errored.length) { console.log(`\n⚠ errored:`); for (const e of errored) console.log(`  ${e}`); }
// A GATE THAT COMPARED NOTHING MUST NOT EXIT GREEN. quality/baselines/snap/ is gitignored (.gitignore:32), so a
// fresh clone has no baselines and every block lands in `nobaseline`. snap-scenes learned this the hard
// way (docs/MISTAKES.md #391, #440): a green tick over zero comparisons is the strongest-sounding
// statement the repo makes and it would be checking nothing. A FEW no-baseline entries stay soft.
// That is a newly added block waiting for SAVE=1, and failing there makes adding a block feel like
// breaking the build.
if (!identical.length && !changed.length && nobaseline.length) {
  console.error(`\n✗ nothing to compare: all ${nobaseline.length} block(s) lack a baseline, so this gate checked NOTHING.`);
  console.error('  quality/baselines/snap/ is gitignored, so a fresh clone starts here. Run `make snap-blocks SAVE=1` to record');
  console.error('  the baselines for THIS tree first, then re-run to diff against them.');
  process.exit(1);
}
process.exit(changed.length || nondeterministic.length || errored.length ? 1 : 0);
