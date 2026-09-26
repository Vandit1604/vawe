import fs from 'node:fs'; import path from 'node:path';
import { SPACE_STEPS, TYPE_STEPS, R_STEPS } from '../../blocks/kit.mjs';
const STEPS = { radius: R_STEPS, gap: SPACE_STEPS, pad: SPACE_STEPS, size: TYPE_STEPS };
const prop = process.argv[2]; const WRITE = process.argv.includes('--write');
if (!STEPS[prop]) { console.error('prop must be one of: ' + Object.keys(STEPS).join(', ')); process.exit(1); }
const steps = STEPS[prop];
const near = (n) => {
  if (prop === 'radius' && n >= 24) return 100;
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
