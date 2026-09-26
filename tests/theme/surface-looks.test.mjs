// tests/theme/surface-looks.test.mjs: resolution, the "no look" == "look: kit" identity, an unknown
// name throws with a hint, and the CSS var map round-trips through blocks/kit.mjs's own reader.
// node tests/theme/surface-looks.test.mjs
import assert from 'node:assert/strict';
import {
  SURFACE_LOOK_NAMES, SURFACE_TOKEN_KEYS, KIT_DEFAULTS,
  resolveSurfaceLook, surfaceCssVars, cssVar,
} from '../../core/theme/surface-looks.js';

// ---- no look set resolves to null: every block falls back to its own literal ----
{
  assert.equal(resolveSurfaceLook(undefined), null);
  assert.equal(resolveSurfaceLook(null), null);
}

// ---- a named preset resolves to a COMPLETE bundle, every token key present ----
{
  for (const name of SURFACE_LOOK_NAMES) {
    const bundle = resolveSurfaceLook(name);
    for (const k of SURFACE_TOKEN_KEYS) assert.ok(k in bundle, `${name} bundle is missing "${k}"`);
  }
}

// ---- glass vs brutalist disagree on most of their nine tokens, not just colour ----
{
  const glass = resolveSurfaceLook('glass'), brutalist = resolveSurfaceLook('brutalist');
  const disagreements = SURFACE_TOKEN_KEYS.filter((k) => glass[k] !== brutalist[k]);
  assert.ok(disagreements.length >= 6, `glass vs brutalist should disagree on most tokens, agreed on all but ${disagreements}`);
}

// ---- an object spec: {preset, ...overrides}, overrides win, unknown keys refused ----
{
  const bundle = resolveSurfaceLook({ preset: 'brutalist', radius: 8 });
  assert.equal(bundle.radius, 8);
  assert.equal(bundle.borderW, 3, 'the rest of the preset still applies');
  assert.throws(() => resolveSurfaceLook({ radius: 8, notAToken: 1 }), /unknown token/);
}

// ---- an unknown preset name throws with a near-word hint, never a silent kit fallback ----
{
  assert.throws(() => resolveSurfaceLook('glassy'), /did you mean "glass"/);
}

// ---- surfaceCssVars only writes keys the bundle actually carries, never `density` (author-time only) ----
{
  const vars = surfaceCssVars(resolveSurfaceLook('glass'));
  assert.ok('--v-radius' in vars);
  assert.ok(!('--v-density' in vars), 'density scales author-time padding, never a live CSS var');
}
assert.deepEqual(surfaceCssVars(null), {});

// ---- cssVar(key, fallback): the exact expression blocks/kit.mjs's RCSS/HAIR/SHADOW_CARD build on ----
{
  assert.equal(cssVar('radius', 14), 'var(--v-radius, 14px)');
  assert.equal(cssVar('borderColor', 'var(--line)'), 'var(--v-border-color, var(--line))');
}

// ---- KIT_DEFAULTS IS today's literal (blocks/kit.mjs R.card=14, HAIR=1px solid, SHADOW_CARD) ----
{
  assert.equal(KIT_DEFAULTS.radius, 14);
  assert.equal(KIT_DEFAULTS.borderW, 1);
  assert.equal(KIT_DEFAULTS.bg, 'var(--card)');
}

console.log('surface-looks.test.mjs: ok');
