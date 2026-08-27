// scripts/dev/scale-sweep.mjs: snap off-scale literals in blocks/*.mjs to the nearest scale step.
//   node scripts/dev/scale-sweep.mjs radius [--write]
// Prints every edit it would make. Nothing runs without --write.
import fs from 'node:fs'; import path from 'node:path';
import { SPACE_STEPS, TYPE_STEPS, R_STEPS } from '../../blocks/kit.mjs';
const STEPS = { radius: R_STEPS, gap: SPACE_STEPS, pad: SPACE_STEPS, size: TYPE_STEPS };
const prop = process.argv[2]; const WRITE = process.argv.includes('--write');
if (!STEPS[prop]) { console.error('prop must be one of: ' + Object.keys(STEPS).join(', ')); process.exit(1); }
const steps = STEPS[prop];
// RADIUS IS NOT LINEAR. Past ~20px a corner radius stops meaning "a bit rounded" and starts meaning
// "fully rounded", so a nearest-step rule snapped `radius: 50` down to 16 and squared off a pill.
// Everything at or above the `round` step goes to `pill` instead.
const near = (n) => {
  if (prop === 'radius' && n >= 24) return 100;
  // TIES ROUND DOWN, and that is a decision rather than array order. 14 is equidistant from 12 and
  // 16, and `reduce` was silently picking whichever came first in the literal. In a dense UI the
  // tighter interval is the better default: grouping reads from proximity, and a gap that is two
  // pixels too wide weakens the group while two too narrow does not.
  return steps.reduce((b, s) => (Math.abs(s - n) < Math.abs(b - n) - 1e-9 ? s : b), steps[0]);
};
const dir = 'blocks';
let edits = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mjs'))) {
  const p = path.join(dir, f); const src = fs.readFileSync(p, 'utf8');
  let out = src.replace(new RegExp(`(\\b${prop}:\\s*)(\\d+)(?![\\d.])`, 'g'), (m, head, num) => {
    const n = +num; if (steps.includes(n)) return m;
    const t = near(n);
    console.log(`  ${f.padEnd(16)} ${prop}: ${n} -> ${t}`); edits++;
    return head + t;
  });
  // A CSS SHORTHAND STRING IS STILL PADDING. `pad: '16px 22px'` was invisible to the numeric pattern
  // above, so a sweep that reported success left most of the library's padding untouched while the
  // gate went on counting it. That gap between what a tool claims and what it did is the shape this
  // repo logs most, so it is closed here rather than noted.
  if (prop === 'pad') {
    out = out.replace(/(\bpad:\s*')([^']+)(')/g, (m, a, body, b) => {
      const snapped = body.replace(/(\d+)px/g, (mm, num) => {
        const n = +num; if (steps.includes(n)) return mm;
        const t = near(n);
        console.log(`  ${f.padEnd(16)} pad string: ${n}px -> ${t}px`); edits++;
        return `${t}px`;
      });
      return a + snapped + b;
    });
  }
  if (WRITE && out !== src) fs.writeFileSync(p, out);
}
console.log(`\n${edits} literal(s) ${WRITE ? 'rewritten' : 'would change'}.`);
