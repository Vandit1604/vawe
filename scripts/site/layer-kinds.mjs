// scripts/site/layer-kinds.mjs: write core/layers/kinds.js where the site can import it.
// The site cannot import core/ at build time, so the mapping is generated here and committed, and
// quality/gates/generated-check.mjs runs this and asks git what moved.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND, LANES, ICON } from '../../core/layers/kinds.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'site/lib/layer-kinds.json');
fs.writeFileSync(OUT, JSON.stringify({ kind: KIND, lanes: LANES, icon: ICON }, null, 2) + '\n');
console.log(`  ✓ layer kinds → ${path.relative(ROOT, OUT)}`);
