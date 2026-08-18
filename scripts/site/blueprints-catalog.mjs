// scripts/site/blueprints-catalog.mjs — browse the directed-motion BEAT blueprints before authoring.
// Introspects blueprints/index.mjs (no render): each beat's name, props it accepts, and what it emits.
// Token-efficient by design — it's the "reach for a blueprint" priming step (docs/CRAFT/BLUEPRINTS.md).
//   node scripts/site/blueprints-catalog.mjs   ·   make blueprints
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { BEATS } from '../../blueprints/index.mjs';

const REGISTRY = new URL('../../blueprints/index.mjs', import.meta.url);

// One description per beat, read off the registry's own trailing comments. A hand-kept copy here went
// stale the moment a beat was added, so the source of truth is the line that declares the beat.
function descriptions() {
  const out = {};
  for (const line of readFileSync(REGISTRY, 'utf8').split('\n')) {
    const m = /^\s*(\w+):\s*Beats\.\w+,\s*\/\/\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// The destructured parameter list, brace-matched rather than regex-matched: a default value can be an
// array or an object, so both the end of the list and the commas inside it need a depth count. Splitting
// naively printed "1.28]" as a prop of screenDive, whose zoom defaults to [1.0, 1.28].
function propsOf(fn) {
  const src = fn.toString();
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0) return '';
  const parts = [];
  let depth = 0;
  let buf = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if ('([{'.includes(ch)) { depth++; if (depth === 1) continue; }
    else if (')]}'.includes(ch)) { depth--; if (depth === 0) break; }
    if (ch === ',' && depth === 1) { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  return parts.map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean).join(', ');
}

// Exported so the effects catalog reads the registry's own trailing comments instead of keeping a second
// hand-written copy. It had one, and it had drifted: 3 of the 12 beats were missing from it entirely.
export const BEAT_BLURBS = descriptions();
const DESC = BEAT_BLURBS;
const missing = Object.keys(BEATS).filter((n) => !DESC[n]);
if (missing.length) {
  console.error(`! blueprints/index.mjs declares no description comment for: ${missing.join(', ')}`);
  process.exit(1);
}


const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  console.log(`\n  BEAT BLUEPRINTS · ${Object.keys(BEATS).length} directed beats  (compose a video as a sequence of these)\n`);
  console.log(`  Place one as:  { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props }   → make expand\n`);
  for (const [name, fn] of Object.entries(BEATS)) {
    console.log(`  • ${name}`);
    console.log(`      ${DESC[name]}`);
    console.log(`      props: ${propsOf(fn)}\n`);
  }
  console.log('  A blueprint fixes MOTION + structure, never copy/colour — two brands using one still differ.');
  console.log('  Full doctrine + the reference reel: docs/CRAFT/BLUEPRINTS.md\n');
  
}