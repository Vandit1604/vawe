#!/usr/bin/env node
// harness/live/vocabulary.mjs - a NEW named vocabulary should be a registry, and you should be told
// while you are still in the file.
//
// WHY AT THE KEYSTROKE. This engine's discovery problem was never that capabilities were hard to find.
// It was that publishing one was a separate act from defining it: adding an effect meant four edits in
// three files, and two gates refused the push until all four agreed. So the cheap thing to write was a
// bare `export const FOO = { ... }`, and 21 real capabilities ended up hand-listed in the catalogue
// with nothing but a person's memory holding them there.
//
// `defineRegistry` now carries its own catalogue entry (core/registry.js), so the correct thing costs
// ONE edit in ONE file. This hook exists to say so at the only moment the choice is still cheap.
// quality/gates/arsenal-check.mjs still refuses at push time and is the real enforcement; a push-time
// rule gets satisfied by a waiver, and a keystroke-time rule gets satisfied by writing the registry.
// That argument is harness/live/code-quality.mjs's, and this file is deliberately its twin.
//
// IT ONLY EVER COMPLAINS ABOUT WHAT YOU ADDED. 131 bare vocabularies exist across 78 files in core/, and
// most of them are correct: a props table, an interaction matrix, a constant set nobody picks from. A
// hook that fired on those would be noise, and noise is how a rule gets turned off. So it compares
// against quality/baselines/vocabulary-baseline.json and stays silent on everything already there. Regenerate that
// file deliberately, never to quiet a complaint.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const BASELINE = path.join(ROOT, 'quality/baselines/vocabulary-baseline.json');

// A vocabulary is a map or list an author PICKS A NAME FROM, so the test is for several named entries
// or several string values. Deliberately loose: this is a nudge, and the gate is the judgement.
const looksVocab = (body) => {
  const inner = body.slice(0, 4000);
  const keys = [...inner.matchAll(/(?:^|[{,\s])([a-zA-Z][\w-]*)\s*:/g)].length;
  const strs = [...inner.matchAll(/'[^']{2,}'|"[^"]{2,}"/g)].length;
  return keys >= 2 || strs >= 2;
};

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file || !/\.m?js$/.test(file)) process.exit(0);

  const rel = path.relative(ROOT, file);
  if (!rel.startsWith('core/') || rel.includes('node_modules')) process.exit(0);
  if (!fs.existsSync(file)) process.exit(0);

  let base = {};
  try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { process.exit(0); }
  const known = new Set(base[rel] || []);

  const src = fs.readFileSync(file, 'utf8');
  // A file that builds a registry from its own map is already doing the right thing, and the map is the
  // registry's `entries`. Naming it separately is the documented pattern, not a second vocabulary.
  const registered = new Set([...src.matchAll(/defineRegistry\([^,]+,\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));

  const fresh = [];
  for (const m of src.matchAll(/export const ([A-Z][A-Z0-9_]{2,})\s*=\s*([{[])/g)) {
    const name = m[1];
    if (known.has(name) || registered.has(name)) continue;
    if (!looksVocab(src.slice(m.index + m[0].length))) continue;
    fresh.push(name);
  }
  if (!fresh.length) process.exit(0);

  console.error(`${rel}: ${fresh.map((n) => `\`${n}\``).join(', ')} ${fresh.length > 1 ? 'look' : 'looks'} like a named vocabulary and ${fresh.length > 1 ? 'are' : 'is'} not a registry.

If an author writes one of those names in a scene, make it a registry instead. It costs one edit in this
file and buys all of it: a throwing pick() that names the near word instead of rendering a default, its
own catalogue section in engine-doctrine/EFFECTS.md, searchability through \`make arsenal\`, and a blurb the engine
refuses to let you leave unfindable.

  export const ${fresh[0]}_REGISTRY = defineRegistry('${fresh[0].toLowerCase().replace(/_/g, ' ')}', ${fresh[0]}, {
    slot: 'theProp',
    blurbs: { /* one line per entry, in the words a person would search with */ },
    catalog: { title: '...', tag: 'per-layer', intro: '...', usage: (n) => ({ theProp: n }),
               noPreview: 'why it cannot be shown, or preview: (n) => a scene' },
  });

If it is NOT something an author names (a props table, an interaction matrix, a constant set), it is
correct as it is: add it to quality/baselines/vocabulary-baseline.json and carry on.`);
  process.exit(2);
});
