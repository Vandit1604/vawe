// arsenal.mjs: ask the arsenal for the thing you mean, in plain English.
//
//   node scripts/author/arsenal.mjs "a page scrolling under a static tilt"
//   node scripts/author/arsenal.mjs "leave the frame" --kind "gsap exit"
//   node scripts/author/arsenal.mjs --census            # what is built and never used
//
// WHY. The census that prompted this is not close: the `{type:"beat"}` blueprint mechanism, which
// CLAUDE.md names as the #1 defence against a plain slideshow, is used by 2 of 153 scenes, and 11 of
// its 19 beats have zero users. `EXIT_FX`, eleven named exits, is used by NONE, while every film still
// needs its layers to leave. That instruction has been given for months and obeyed twice, so the
// problem is not persuasion: 566 effects reachable only by reading an 849-line generated file are not
// reachable. An author who cannot find the thing re-derives a worse version of it, which is exactly
// how sixteen layers ended up saying `preset: "up"`.
//
// THIS OWNS NO LIST, and that is the whole design. `defineRegistry` (core/registry.js) already carries
// `kind`, `slot`, `names` and `blurbs` for every vocabulary, and `blueprints/index.mjs` already carries
// a description and a prose REQUEST per beat. A fourth copy of those names would drift from the three
// that exist, which is the failure this repo logs more than any other. Everything below is read at
// runtime; adding an effect to a registry makes it searchable here with no edit.
//
// The ranking is deliberately boring: token overlap against name + blurb + kind, no model, no network,
// no index to rebuild. It has to be right about "this word appears", not clever.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Every module that defines a vocabulary. Listed because an import cannot be discovered without one,
// but the CONTENTS of each are read, never restated.
const MODULES = ['backgrounds', 'camera-moves', 'canvas-fx', 'clips', 'cuts', 'gsap-effects', 'icons',
  'idle', 'paint-fx', 'parts', 'raymarch-fx', 'seams', 'shaders-ambient', 'stings', 'three-scenes',
  'type', 'vocab'];

/** Every entry the engine can name: {name, kind, slot, blurb}. */
async function collect() {
  const out = [];
  for (const m of MODULES) {
    let mod; try { mod = await import(`../../core/${m}.js`); } catch { continue; }
    for (const [expName, reg] of Object.entries(mod)) {
      if (!expName.endsWith('_REGISTRY') || !reg || !Array.isArray(reg.names)) continue;
      for (const name of reg.names) {
        out.push({ name, kind: reg.kind, slot: reg.slot || null, blurb: (reg.blurbs && reg.blurbs[name]) || '' });
      }
    }
  }
  // Blueprints are not a registry (they are factories), but they are the highest-value thing to find
  // and they carry the best description in the repo: a prose sentence saying how to ASK for the beat.
  try {
    const bp = await import('../../blueprints/index.mjs');
    const src = fs.readFileSync(path.join(repoRoot, 'blueprints/index.mjs'), 'utf8');
    const notes = new Map();
    for (const m of src.matchAll(/^\s*(\w+):\s*\w+\.\w+,\s*\/\/\s*(.+)$/gm)) notes.set(m[1], m[2].trim());
    for (const name of Object.keys(bp.BEATS || {})) {
      out.push({ name, kind: 'blueprint beat', slot: 'layers[].beat',
        blurb: (bp.REQUESTS && bp.REQUESTS[name]) || notes.get(name) || '' });
    }
  } catch { /* blueprints are optional to search */ }
  return out;
}

// ---- usage, so "built and never used" is a measured fact rather than an impression ----------------
const CACHE = { counts: null };
function usage() {
  if (CACHE.counts) return CACHE.counts;
  const counts = new Map();
  const dir = path.join(repoRoot, 'formats/scene');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json') : [];
  const texts = [];
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (d.module !== 'scene') continue;
    texts.push(JSON.stringify(d));
  }
  CACHE.counts = { texts, count: (name) => texts.reduce((n, t) => n + (t.includes(`"${name}"`) ? 1 : 0), 0) };
  return CACHE.counts;
}

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'and', 'or', 'is', 'it', 'that', 'with', 'for', 'as']);
const toks = (s) => String(s).toLowerCase().match(/[a-z][a-z0-9]+/g)?.filter((w) => !STOP.has(w)) || [];

function score(entry, qt) {
  const name = entry.name.toLowerCase();
  const hay = toks(`${entry.name} ${entry.kind} ${entry.blurb}`);
  let s = 0;
  for (const q of qt) {
    if (name === q) s += 12;
    else if (name.includes(q)) s += 6;
    if (hay.includes(q)) s += 3;
    else if (hay.some((w) => w.startsWith(q) || q.startsWith(w))) s += 1;
  }
  return s;
}

const argv = process.argv.slice(2);
const VALUE_FLAGS = new Set(['kind', 'n']);
const flag = (n) => { const i = argv.indexOf('--' + n); return i < 0 ? null : argv[i + 1]; };
const census = argv.includes('--census');
// Consume `--flag value` pairs by POSITION. Filtering on `argv.indexOf(a)` looked equivalent and is
// not: indexOf finds the FIRST occurrence, so a repeated word is tested against the wrong neighbour,
// and any flag but --kind leaked its value into the query ("…static tilt 3").
const query = argv.reduce((acc, a, i) => {
  if (a.startsWith('--')) return acc;
  const prev = argv[i - 1];
  if (prev && prev.startsWith('--') && VALUE_FLAGS.has(prev.slice(2))) return acc;
  return acc.concat(a);
}, []).join(' ').trim();

const all = await collect();

if (census) {
  const u = usage();
  const dead = new Map();
  for (const e of all) if (u.count(e.name) === 0) {
    if (!dead.has(e.kind)) dead.set(e.kind, []);
    dead.get(e.kind).push(e.name);
  }
  console.log(`\n  ARSENAL CENSUS · ${all.length} named things · ${u.texts.length} scenes read\n`);
  console.log(`  Zero-user entries. This does not say they are BAD: it says nothing distinguishes`);
  console.log(`  "undiscoverable" from "genuinely unwanted", and until something does, both look the same.\n`);
  for (const [kind, names] of [...dead].sort((a, b) => b[1].length - a[1].length)) {
    const total = all.filter((e) => e.kind === kind).length;
    console.log(`  ${(kind + ':').padEnd(22)} ${String(names.length).padStart(3)}/${String(total).padEnd(3)} unused   ${names.slice(0, 7).join(' ')}${names.length > 7 ? ' …' : ''}`);
  }
  console.log('');
  process.exit(0);
}

if (!query) {
  const kinds = [...new Set(all.map((e) => e.kind))].sort();
  console.error(`usage: node scripts/author/arsenal.mjs "<what you want, in plain english>" [--kind <kind>] [--n 8]
       node scripts/author/arsenal.mjs --census

  ${all.length} named things across ${kinds.length} vocabularies, read live from the registries:
  ${kinds.join(' · ')}`);
  process.exit(2);
}

const kind = flag('kind');
const n = Number(flag('n') || 8);
const qt = toks(query);
const u = usage();
const ranked = all
  .filter((e) => !kind || e.kind === kind)
  .map((e) => ({ ...e, s: score(e, qt) }))
  .filter((e) => e.s > 0)
  .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name))
  .slice(0, n);

if (!ranked.length) {
  console.log(`\n  nothing matched "${query}".`);
  console.log(`  Try one word instead of a sentence, or --kind to list one vocabulary.\n`);
  process.exit(0);
}

console.log(`\n  ARSENAL · "${query}"\n`);
for (const e of ranked) {
  const used = u.count(e.name);
  console.log(`  ${e.name}`);
  console.log(`      ${e.kind}${e.slot ? ` · goes in \`${e.slot}\`` : ''} · ${used === 0 ? 'NEVER used in this library' : `${used} scene(s)`}`);
  if (e.blurb) console.log(`      ${e.blurb}`);
  if (e.kind === 'blueprint beat') console.log(`      {"type":"beat","beat":"${e.name}", …}   then: make expand D=<file>`);
  else if (e.slot && !e.slot.includes('(')) console.log(`      "${e.slot.replace(/\[\]\./, '": [{ "')}": "${e.name}"${e.slot.includes('[]') ? ' }]' : ''}`);
  console.log('');
}
