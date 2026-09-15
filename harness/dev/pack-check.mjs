#!/usr/bin/env node
// harness/dev/pack-check.mjs: refuse to publish a package that cannot render, or that carries the
// demo reel.  `npm run pack-check`, and automatically via `prepublishOnly`.
//
// TWO FAILURES THIS EXISTS TO PREVENT, and they pull in opposite directions.
//
// TOO LITTLE: `files` is an allowlist, so a forgotten entry does not error, it ships a package that
// installs cleanly and then dies at render time on a missing file. Every path in REQUIRED was proven
// necessary by rendering from an extracted tarball, not by reading imports.
//
// TOO MUCH: this repo tracks ~40MB of demo films under site/public/assets. An ignore-list config
// publishes all of it the first time someone forgets a line. That is why `files` is an allowlist in
// the first place, and why the ceiling below is enforced rather than trusted.
//
// It reads `npm pack --dry-run --json`, so it checks THE ACTUAL FILE LIST npm would publish, never a
// re-derivation of the globs. A gate that re-implements the thing it is checking tests only itself.
import { execFileSync } from 'node:child_process';

const MAX_MB = 25; // fits the engine + fonts with headroom; the demo reel alone would blow past it

// Proven by rendering from the extracted tarball. Each entry: a path that must appear, and WHY, so a
// future edit that drops one gets an error explaining the consequence rather than a bare path.
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
  ['blueprints/index.mjs', 'same, for beats'],
];
// A prefix that must appear at least N times. A directory shipped empty is the subtler version of
// shipping nothing, and an allowlist entry like `themes/` gives no error when the directory is bare.
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

// The binary is built, not tracked, so it is absent in a fresh clone and present after `make build`.
// That is a WARNING and not a failure: `npm pack` on a clean checkout is a legitimate thing to do, and
// failing it would block the check that catches everything else. The release workflow builds first.
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
