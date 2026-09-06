// scripts/site/blueprints-catalog.mjs: browse the directed-motion BEAT blueprints before authoring.
// Introspects blueprints/index.mjs (no render): each beat's name, props it accepts, and what it emits.
// Token-efficient by design: it's the "reach for a blueprint" priming step (docs/CRAFT/BLUEPRINTS.md).
//   node scripts/site/blueprints-catalog.mjs   ·   make blueprints
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { BEATS, BEAT_BLURBS, REQUESTS } from '../../blueprints/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// `make previews` renders one clip per beat into site/public/blocklib/beats/. Read here rather than
// re-derived, so the picture (or its absence) sits right beside the prose that names the beat: pick a
// finished part by SEEING it, not by reading the description and guessing what it looks like.
let PREVIEWS = new Map();
try {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/public/blocklib/beats/index.json'), 'utf8'));
  PREVIEWS = new Map((idx.beats || []).map((b) => [b.id, b]));
} catch { /* no previews rendered yet: `make previews` */ }

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

// The descriptions used to be scraped back out of blueprints/index.mjs by a regex here. They are
// `withBlurb` on the factory now, and blurbsOf refuses at LOAD for a beat that forgot one, so the
// completeness check this file used to run has nothing left to find.
const DESC = BEAT_BLURBS;
// Same completeness rule as the descriptions, for the same reason: a hand-kept second list goes stale
// the moment a beat is added, and the failure is silent.
const noReq = Object.keys(BEATS).filter((n) => !REQUESTS[n]);
if (noReq.length) { console.error(`! blueprints/index.mjs declares no REQUESTS entry for: ${noReq.join(', ')}`); process.exit(1); }


const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  console.log(`\n  BEAT BLUEPRINTS · ${Object.keys(BEATS).length} directed beats  (compose a video as a sequence of these)\n`);
  console.log(`  Place one as:  { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props }   (expands at load)\n`);
  for (const [name, fn] of Object.entries(BEATS)) {
    console.log(`  • ${name}`);
    console.log(`      ${DESC[name]}`);
    console.log(`      ask:   "${REQUESTS[name]}"`);
    console.log(`      props: ${propsOf(fn)}`);
    const p = PREVIEWS.get(name);
    console.log(p ? `      see:   site/public/blocklib/beats/${name}/sheet.png (${p.duration}s, ${p.dims.w}x${p.dims.h})\n`
      : '      see:   (no preview yet · make previews ONLY=' + name + ')\n');
  }
  console.log('  A blueprint fixes MOTION + structure, never copy/colour. Two brands using one still differ.');
  console.log(`  Previews: ${PREVIEWS.size}/${Object.keys(BEATS).length} beats rendered · make previews [ONLY=<id>]`);
  console.log('  Full doctrine + the reference reel: docs/CRAFT/BLUEPRINTS.md\n');
  
}