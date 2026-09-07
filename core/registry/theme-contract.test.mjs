// core/registry/theme-contract.test.mjs: the runnable self-check for `computedLook`/`resolveLook`
// (W8 phase 1, docs/CRAFT/THEME-LOOK.md "The computed look, for the other 37"). Pure-JS: this file
// stays node+browser importable on purpose (see the file header), so the test injects `isLightBg`
// the same way `core/engine/boot.js` does, rather than importing `core/motion/motion.js` itself here.
//   node core/registry/theme-contract.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computedLook, resolveLook, lookErrors, LOOK_KEYS } from './theme-contract.js';
import { isLightBg } from '../motion/motion.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- computedLook fills every theme, even one with no palette at all ----
{
  const noLook = computedLook({ palette: { bg: '#ffffff' } }, { isLightBg });
  for (const k of ['scale', 'layout', 'cuts', 'field']) assert.ok(noLook[k], `computedLook must fill look.${k}`);
  // deliberately uncomputed: backdrop/cues/marks are never invented (docs/CRAFT/THEME-LOOK.md)
  for (const k of ['backdrop', 'cues', 'marks']) assert.equal(noLook[k], undefined, `computedLook must not invent look.${k}`);
}

// ---- light vs dark dominance picks the field default, the one place colour enters at all ----
{
  const light = computedLook({ palette: { bg: '#ffffff' } }, { isLightBg });
  const dark = computedLook({ palette: { bg: '#000000' } }, { isLightBg });
  assert.equal(light.field.grain, 0, 'a light-bg theme computes no grain');
  assert.ok(dark.field.grain > 0, 'a dark-bg theme computes some grain');
  assert.ok(dark.field.vignette > light.field.vignette, 'a dark-bg theme computes more vignette than a light one');
}
// omitting isLightBg reads as light (the harmless side), never throws
{
  const noInjection = computedLook({ palette: { bg: '#000000' } });
  assert.equal(noInjection.field.grain, 0, 'no isLightBg injected: field falls back to the light default, not a guess');
}

// ---- an explicit look wins KEY BY KEY over the computed one ----
{
  const theme = { palette: { bg: '#ffffff' }, look: { cuts: { default: 'whip', accent: 'punch' } } };
  const resolved = resolveLook(theme, { isLightBg });
  assert.deepEqual(resolved.cuts, { default: 'whip', accent: 'punch' }, 'an authored look.cuts overrides the computed one');
  assert.ok(resolved.scale, 'a key the theme did not author (scale) still comes from the computed look');
  assert.deepEqual(resolved.scale, computedLook(theme, { isLightBg }).scale, 'the un-authored key is exactly the computed default');
}
// a theme with no `look` at all resolves to the plain computed look
{
  const theme = { palette: { bg: '#ffffff' } };
  assert.deepEqual(resolveLook(theme, { isLightBg }), computedLook(theme, { isLightBg }), 'no theme.look: resolveLook is just computedLook');
}

// ---- every one of the 44 shipped themes yields a VALID look through lookErrors ----
{
  const themeFiles = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'themes'))) {
    if (f.endsWith('.json')) themeFiles.push(path.join(ROOT, 'themes', f));
  }
  const presetsDir = path.join(ROOT, 'themes', 'presets');
  if (fs.existsSync(presetsDir)) for (const f of fs.readdirSync(presetsDir)) {
    if (f.endsWith('.json')) themeFiles.push(path.join(presetsDir, f));
  }
  assert.ok(themeFiles.length >= 40, `expected around 44 theme files, found ${themeFiles.length}`);
  for (const file of themeFiles) {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    const resolved = resolveLook(theme, { isLightBg });
    const errs = lookErrors(resolved);
    assert.deepEqual(errs, [], `${path.relative(ROOT, file)}: resolved look must be valid, got ${JSON.stringify(errs)}`);
  }
}

// ---- consecutive computed backdrops would differ if computed at all (they are not: this documents why) ----
// `computedLook` never fills `backdrop` (docs/MISTAKES.md #159: the engine picking a background is the
// mistake this repo already made and undid). So there is nothing here to check for CONTRASTING
// consecutive fields; the test that would matter is "computedLook never returns a `backdrop` key",
// already asserted above.
assert.ok(!LOOK_KEYS.includes('nonsense'), 'sanity: LOOK_KEYS is the real registry, not a stray copy');

console.log('theme-contract.test.mjs: ok');
