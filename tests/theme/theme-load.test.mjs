// tests/theme/theme-load.test.mjs: the shared loader every theme-reading gate/script calls
// (harness/lib/theme-load.mjs) must refuse the retired palette/type/gradient shape the same way
// expandTheme itself does; it must never fall back to using the raw legacy object unexpanded
// (that fallback was the actual backward-compat bug: expandTheme already threw, 12 call sites bypassed it).
// node tests/theme/theme-load.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandThemeFile } from '../../harness/lib/theme-load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/legacy-theme.fixture.json'), 'utf8'));

// ---- a legacy-shape theme is refused, not passed through as-is ----
assert.throws(() => expandThemeFile(legacy), /retired palette\/type\/gradient shape/);

// ---- a real token-file theme still expands normally ----
const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/vawe.json'), 'utf8'));
const expanded = expandThemeFile(real);
assert.ok(expanded.palette && expanded.palette.bg, 'a token-file theme still expands to a usable palette');

console.log('theme-load.test.mjs: ok');
