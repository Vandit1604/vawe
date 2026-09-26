// tests/authoring/surface-look-e2e.test.mjs: the whole path a `look.surface` travels, fixture to CSS
// var, without a browser. node tests/authoring/surface-look-e2e.test.mjs
//
//   1. author a scene JSON (tests/fixtures/surface-look-scene.json) with `look.surface: "brutalist"`
//   2. validate it the way `make validate` does (core/registry/theme-contract.js lookErrors)
//   3. resolve the REAL theme (themes/default.json, core/theme/roles.js expandTheme) and merge the
//      scene's own `look.surface` over the theme's, exactly the precedence core/engine/boot.js's
//      resolveThemeAndBake gives it
//   4. apply it through the real, exported `applyTheme` (core/engine/boot.js) against a plain stub
//      target, and read back the `--v-*` custom properties it wrote
//   5. prove a block built with NO look (blocks/charts.mjs gauge) still bakes the ambient var
//      expression the applied bundle now backs, so the two halves (author time, render time) agree
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookErrors, resolveLook } from '../../core/registry/theme-contract.js';
import { resolveSurfaceLook } from '../../core/theme/surface-looks.js';
import { applyTheme } from '../../core/engine/boot.js';
import { expandTheme } from '../../core/theme/roles.js';
import { parseColor, colorAlpha, isLightBg } from '../../core/color/engine.js';
import { gauge } from '../../blocks/charts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);

// ---- 1: the fixture ----
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/surface-look-scene.json'), 'utf8'));
assert.equal(data.look.surface, 'brutalist');

// ---- 2: validated exactly as author-check/validate.mjs would ----
assert.deepEqual(lookErrors(data.look), []);

// ---- 3: theme resolves its own authored look (default.json now sets `soft`), the scene's own
// `look.surface` wins over it (core/engine/boot.js resolveThemeAndBake) ----
const rawTheme = JSON.parse(fs.readFileSync(path.join(ROOT, `themes/${data.theme}.json`), 'utf8'));
const theme = expandTheme(rawTheme, { parseColor, colorAlpha });
const look = resolveLook(theme, { isLightBg });
assert.equal(look.surface, 'soft', 'themes/default.json now authors its own surface look');
const surfaceSpec = (isObj(data.look) && 'surface' in data.look) ? data.look.surface : look.surface;
const bundle = resolveSurfaceLook(surfaceSpec);
assert.equal(bundle.radius, 0, 'brutalist is square');
assert.equal(bundle.borderW, 3);

// ---- 4: applyTheme writes the palette AND the surface vars onto whatever target it is given ----
const written = new Map();
const stubTarget = { style: { setProperty: (k, v) => written.set(k, v) } };
applyTheme(theme, stubTarget, bundle);
assert.equal(written.get('--v-radius'), '0px');
assert.equal(written.get('--v-border-w'), '3px');
assert.equal(written.get('--v-shadow'), '8px 8px 0 0 var(--ink)');
assert.ok(written.get('--accent'), 'the ordinary palette vars still write, surface tokens are additive');

// ---- 5: a block that authors NO look at all still emits the var applyTheme just backed ----
const html = gauge({ x: 0, y: 0, value: 72, label: 'score' })[0].html;
assert.match(html, /border-radius:var\(--v-radius, 14px\)/, 'gauge reads the AMBIENT var, not a literal');

console.log('surface-look-e2e.test.mjs: ok');
