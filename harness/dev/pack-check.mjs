#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const MAX_MB = 25; // fits the engine + fonts with headroom; the demo reel alone would blow past it

const REQUIRED = [
  ['cli/vawe.mjs', 'the bin entry point, without it `npx vawe` resolves to nothing'],
  ['films/scene/scene.html', 'the render page the Go binary serves'],
  ['films/scene/scene.js', 'scene.html loads this by URL; a missing file is a blank render'],
  ['films/scene/schema.json', 'validate.mjs reads it at boot; absent means every scene is refused'],
  ['films/scene/sample.json', 'the one scene a new user can render before writing their own'],
  ['core/engine/boot.js', 'the engine entry the page imports'],
  ['core/validate/validate.mjs', 'the loud refusals; shipping without it turns errors into silent wrong output'],
  ['harness/author/expand-blocks.mjs', 'block/beat/comp sugar is expanded here, NOT by the renderer'],
  ['blocks/index.mjs', 'expand-blocks imports it; a block scene dies without it'],
  ['NOTICE', 'Apache-2.0 section 4(d): a redistribution that drops it is a licence breach'],
];
const REQUIRED_DIRS = [['themes/', 10, 'palettes'], ['core/', 50, 'engine modules'], ['assets/fonts/', 1, 'font files']];
const FORBIDDEN = [/^site\//, /\.mp4$/, /^out\//, /^verify\//, /^engine-doctrine\/media\//, /^\.claude\//];

let listed;
try {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  listed = JSON.parse(raw);
} catch (e) {
  console.error(`✗ could not ask npm what it would publish: ${e.message}`);
  process.exit(1);
}
const pkg = Array.isArray(listed) ? listed[0] : listed;
const files = (pkg.files || []).map((f) => f.path);
const sizeMB = (pkg.unpackedSize || 0) / 1e6;

const bad = [];
for (const [p, why] of REQUIRED) if (!files.includes(p)) bad.push(`MISSING  ${p}\n           ${why}`);
for (const [prefix, n, what] of REQUIRED_DIRS) {
  const found = files.filter((f) => f.startsWith(prefix)).length;
  if (found < n) bad.push(`MISSING  ${prefix} has ${found} file(s), expected at least ${n} ${what}`);
}
for (const f of files) {
  const hit = FORBIDDEN.find((re) => re.test(f));
  if (hit) bad.push(`SHOULD NOT SHIP  ${f}  (matched ${hit})`);
}
if (sizeMB > MAX_MB) bad.push(`TOO BIG  ${sizeMB.toFixed(1)}MB unpacked, ceiling is ${MAX_MB}MB`);

const hasBin = files.some((f) => f.startsWith('bin/'));

if (bad.length) {
  console.error(`✗ the package npm would publish is wrong (${files.length} files, ${sizeMB.toFixed(1)}MB):\n`);
  for (const b of bad) console.error(`  ${b}`);
  console.error('\n  Fix the `files` allowlist in package.json. It is an allowlist on purpose: this repo');
  console.error('  tracks ~40MB of demo films, and an ignore-list publishes them the first time a line is missed.');
  process.exit(1);
}
console.log(`✓ publishable: ${files.length} files, ${sizeMB.toFixed(1)}MB unpacked (ceiling ${MAX_MB}MB)`);
if (!hasBin) console.log('  ⚠ no bin/ in the package, run `make build` first, or the release will ship without a renderer');
