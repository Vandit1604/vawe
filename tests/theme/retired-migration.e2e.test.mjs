// tests/theme/retired-migration.e2e.test.mjs: end-to-end proof for the theme schema cleanup
// (engine-doctrine/CRAFT/THEME-LOOK.md "bgDefault"/"bgPalette"). Runs the real chain a render does,
// browser-free: a theme file on disk -> core/theme/roles.js (validate + expand) ->
// core/backgrounds/theme-rotation.js (the `bg:[{use:"theme"}]` rotation) ->
// core/backgrounds/index.js bgPreset (the pixels a preset actually paints with). No puppeteer: this
// is the non-DOM half of the pipeline, the half the schema migration touched.
//   node tests/theme/retired-migration.e2e.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandTheme, themeFileErrors } from '../../core/theme/roles.js';
import { lookErrors, LOOK_KEYS } from '../../core/registry/theme-contract.js';
import { parseColor, colorAlpha, contrastRatio } from '../../core/color/engine.js';
import { expandThemeRotation } from '../../core/backgrounds/theme-rotation.js';
import { junctionTable, marksOf, shotWindows } from '../../core/timeline/junctions.js';
import { bgPreset, bgPaletteFrom, BG_NAMES } from '../../core/backgrounds/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(ROOT, 'tests/fixtures/themes');
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));

// ---- a theme still in the old shape is refused at every entry a real render goes through, naming
// the field and its replacement (not just "invalid") ----
{
  const retired = readFixture('retired-schema.json');
  assert.throws(() => expandTheme(retired, { parseColor, colorAlpha }), /theme\.vars is retired.*theme\.bg is retired.*theme\.bgDefault is retired/s,
    'expandTheme (the boot-time, fail-loud entry point) must refuse all three retired fields by name');
  const errs = themeFileErrors(retired, { parseColor, colorAlpha, contrastRatio });
  for (const field of ['vars', 'bg', 'bgDefault']) {
    assert.ok(errs.some((e) => e.includes(`theme.${field} is retired`)), `themeFileErrors must name theme.${field}`);
  }
  assert.ok(errs.some((e) => /look\.bgPalette/.test(e)), 'the bg replacement must be named');
  assert.ok(errs.some((e) => /look\.bgDefault/.test(e)), 'the bgDefault replacement must be named');
}

// ---- the new-schema fixture expands cleanly, and `look.bgDefault`/`look.bgPalette` are real look
// keys the registry knows (not a stray passthrough object nobody validates) ----
let theme;
{
  const fresh = readFixture('new-schema.json');
  assert.equal(themeFileErrors(fresh, { parseColor, colorAlpha, contrastRatio }).length, 0, 'a clean new-schema theme must have zero errors');
  theme = expandTheme(fresh, { parseColor, colorAlpha });
  assert.ok(LOOK_KEYS.includes('bgDefault') && LOOK_KEYS.includes('bgPalette'), 'both keys must be registered look vocabulary');
  assert.deepEqual(lookErrors(theme.look, { bgNames: BG_NAMES }), [], 'the fixture look block must validate against the live bg-preset registry');
}

// ---- END TO END: a scene with one `{use:"theme"}` window and two joints (three shots) expands into
// the theme's own rotation, cycling `look.bgDefault`, exactly as films/scene/scene.js's bg-resolution
// does at render ----
{
  const table = junctionTable(marksOf({ cuts: [{ t: 2 }, { t: 4 }] }));
  const bg = expandThemeRotation([{ use: 'theme' }], theme, table, 6);
  assert.equal(shotWindows(table, 6).length, 3, 'sanity: two cuts make three shots');
  assert.equal(bg.length, 3, 'one `{use:"theme"}` window becomes one window per shot');
  assert.deepEqual(bg.map((w) => w.preset), ['plain', 'paper', 'plain'], 'cycles look.bgDefault in order');

  // Each expanded window is what scene.js itself would then build a preset spec from: the theme's
  // OWN `look.bgPalette` (an authored override), not the derived floor.
  for (const w of bg) {
    const spec = bgPreset(w.preset, w.value, theme.look.bgPalette);
    assert.ok(spec && (spec.base || spec.fx), `bgPreset(${w.preset}) must produce a paintable spec from the theme's own bgPalette`);
  }
}

// ---- a theme that authors NO `look.bgPalette` at all falls back to the derived floor
// (`bgPaletteFrom`), never to another brand's colours (engine-doctrine/MISTAKES.md #352) ----
{
  const noPalette = { ...theme, look: { ...theme.look, bgPalette: undefined } };
  const derived = bgPaletteFrom(noPalette.palette);
  assert.ok(derived && derived.accent, 'bgPaletteFrom must derive a usable bg palette from the theme\'s own colours alone');
  assert.notDeepEqual(derived.paperBase, theme.look.bgPalette.paperBase, 'sanity: the derived floor is not simply echoing the authored override');
}

console.log('retired-migration.e2e.test.mjs: ok');
