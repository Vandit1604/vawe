// quality/gates/unused.mjs, which registered effects has no shipped scene ever named?
//
//   node quality/gates/unused.mjs        ·        make unused
//
// THIS IS A REPORT, NOT A RULE. It always exits 0. Its output is a list of candidates for a person to
// judge, and the count is deliberately NOT a target.
//
// WHY IT EARNS ITS PLACE. Three effects that no film had ever used turned out to be BROKEN the moment
// anything exercised them: `colorWave` carried another brand's two colours (#354), TextMorph had never
// rendered at all, and `--p` was frozen at 0 in every hand-authored backdrop (#353). A capability nobody
// uses is a capability nobody has tested, so this list is really a test backlog.
//
// WHY THE COUNT IS NOT A TARGET, which matters more. docs/MISTAKES.md #373 records the trap: about a
// third of the never-used GSAP effects DUPLICATE something the engine already does well, `fadeIn` is
// `anim:"fade"`, `zoomIn` is `scale`, `revealUp` is the `riseClip` preset. Driving this number down by
// folding those into blueprints would put two ways to do one thing in front of every author, which
// `direction-floor` blocks as effect-soup. For that group the right question is whether to RETIRE them.
//
// So read a zero as one of three things, and decide which:
//   1. nobody can find it        → make it reachable
//   2. it does not work          → fix it (three of these were found that way)
//   3. something else does it better → retire it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { population } from '../lib/census.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// A report, never a rule (see header): always exits 0, so every finding here is INFO.
const f = gateFindings();

const { PRESETS } = await import('../../core/type/type.js');
const { ANIM_NAMES } = await import('../../core/timeline/clips.js');
const { PRESENTATIONS } = await import('../../core/cuts/index.js');
const { SEAM_FX } = await import('../../core/timeline/seams.js');
const { SHADER_FX } = await import('../../core/stings/index.js');
const { LOOK_NAMES } = await import('../../core/looks/index.js');
const { BG_NAMES } = await import('../../core/backgrounds/index.js');
const { GSAP_FX } = await import('../../core/engine/gsap-effects.js');
const { AMBIENT_FX } = await import('../../core/surfaces/shaders-ambient.js');
const { RAYMARCH_FX } = await import('../../core/surfaces/raymarch-fx.js');
const { THREE_FX } = await import('../../core/surfaces/three-scenes.js');
const { CAMERA_MOVE_NAMES } = await import('../../core/camera-moves/index.js');
const { FX_TYPES } = await import('../../core/fx/index.js');
const { PART_NAMES } = await import('../../core/motion/parts.js');
const { PAINT_FX_NAMES } = await import('../../core/surfaces/paint-fx.js');

const FAMILIES = [
  ['kinetic preset', Object.keys(PRESETS)], ['anim', ANIM_NAMES], ['cut', Object.keys(PRESENTATIONS)],
  ['seam', SEAM_FX], ['sting', SHADER_FX], ['look', LOOK_NAMES], ['background', BG_NAMES],
  ['gsap fx', GSAP_FX], ['ambient shader', AMBIENT_FX],
  ['raymarch', RAYMARCH_FX], ['three scene', THREE_FX], ['camera move', CAMERA_MOVE_NAMES],
  ['modifier', FX_TYPES], ['part entrance', PART_NAMES], ['paint fx', PAINT_FX_NAMES],
];

// Every SHIPPED scene. Scratch files (`_`-prefixed) and intent sidecars are not films.
let corpus = '';
let files = 0;
const dir = path.join(ROOT, 'formats/scene');
for (const f of population('unused · corpus', { filter: (f) => !f.startsWith('_') && !f.includes('.intent.'), quiet: true }).names) {
  corpus += fs.readFileSync(path.join(dir, f), 'utf8');
  files++;
}
const named = (n) => new RegExp(`"${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:[0-9.]+)?"`).test(corpus);

console.log(`unused · ${files} shipped scene(s)\n`);
let total = 0, dead = 0;
const rows = [];
for (const [family, names] of FAMILIES) {
  const missing = names.filter((n) => !named(n));
  total += names.length; dead += missing.length;
  rows.push([family, names.length - missing.length, names.length, missing]);
}
const w = Math.max(...rows.map((r) => r[0].length));
for (const [family, used, all, missing] of rows) {
  const pct = all ? Math.round((used / all) * 100) : 100;
  const bar = missing.length ? `  never named: ${missing.join(' ')}` : '';
  console.log(`  ${family.padEnd(w)}  ${String(used).padStart(3)}/${String(all).padEnd(3)} (${String(pct).padStart(3)}%)${bar}`);
  if (missing.length) f.note('unused-vocabulary', `${family}: ${missing.length}/${all.length} never named in a shipped scene: ${missing.join(' ')}`,
    { doc: 'docs/MISTAKES.md' });
}
console.log(`\n  ${total - dead}/${total} of the registered vocabulary appears in a shipped scene · ${dead} never named.`);
console.log('  Read each zero as: nobody can find it, it does not work, or something else does it better.');
console.log('  Do not drive this number down for its own sake, see docs/MISTAKES.md #373.');
