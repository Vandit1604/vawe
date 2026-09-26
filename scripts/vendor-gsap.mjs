#!/usr/bin/env node
// scripts/vendor-gsap.mjs: copy gsap's UMD build from node_modules into assets/vendor/gsap.min.js.
//
// GSAP is a normal npm dependency (package.json), never committed as a file: GSAP's Standard license
// grants USE but not clear redistribution, so the built file cannot sit in this public, Apache-2.0
// repo (unlike the three MIT plugin files that stay vendored as-is, see assets/vendor/README.md).
// Runs as the root "postinstall" script, so `npm install` self-heals it, same pattern as `make fonts`
// for the gitignored font binaries.
//
//   node scripts/vendor-gsap.mjs           copy node_modules/gsap → assets/vendor/gsap.min.js
//   node scripts/vendor-gsap.mjs --check   report only; exit 1 and print the fix command if missing
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(ROOT, 'assets/vendor/gsap.min.js');
const FIX = 'npm install (runs the postinstall automatically) or `node scripts/vendor-gsap.mjs`';
const check = process.argv.includes('--check');

if (check) {
  if (fs.existsSync(DEST)) { console.log('gsap: vendored ✓ (assets/vendor/gsap.min.js)'); process.exit(0); }
  console.error(`gsap: assets/vendor/gsap.min.js is missing. Fix: ${FIX}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
let src;
try { src = require.resolve('gsap/dist/gsap.min.js'); }
catch (e) {
  console.error(`gsap: package not installed, so it cannot be vendored (${e.message}). Fix: ${FIX}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.copyFileSync(src, DEST);
console.log(`gsap: vendored ${src} -> ${path.relative(ROOT, DEST)}`);
