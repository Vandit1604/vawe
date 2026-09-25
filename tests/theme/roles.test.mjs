// core/theme/roles.test.mjs: required roles enforced, derivation deterministic, the retired
// palette/type/gradient shape refused with a pointer to the migration script.
// node core/theme/roles.test.mjs
import assert from 'node:assert/strict';
import { REQUIRED_ROLES, roleErrors, deriveLegacy, expandTheme, themeFileErrors, isTokenFile } from '../../core/theme/roles.js';
import { parseColor } from '../../core/color/engine.js';

const MIN = {
  name: 'min',
  tokens: {},
  roles: { ground: '#101010', ink: '#f0f0f0', accent: '#ff5a1f', 'font.sans': 'Inter', 'font.mono': 'Menlo' },
};

// ---- the five required roles, and only those, are mandatory ----
{
  assert.deepEqual(REQUIRED_ROLES, ['ground', 'ink', 'accent', 'font.sans', 'font.mono']);
  assert.deepEqual(roleErrors(MIN, { parseColor }), []);
}

// ---- a missing required role is refused by name ----
{
  const { ground: _g, ...rest } = MIN.roles;
  const errs = roleErrors({ ...MIN, roles: rest }, { parseColor });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /roles\.ground is required/);
}

// ---- derivation fills all 15 legacy palette keys and 4 type keys from 3 colour roles ----
{
  const { palette, type, gradient, errors } = deriveLegacy(MIN, { parseColor });
  assert.deepEqual(errors, []);
  const REQUIRED_PALETTE = ['bg', 'bg2', 'surface', 'surface2', 'line', 'lineStrong', 'text', 'text2', 'dim', 'ink', 'accent', 'accentDim', 'accentGlow', 'up', 'down'];
  for (const k of REQUIRED_PALETTE) assert.ok(palette[k] != null, `palette.${k} must be derived`);
  assert.deepEqual(type, { sans: 'Inter', serif: 'Inter', mono: 'Menlo', num: 'Menlo' });
  assert.equal(gradient.length, 3);
}

// ---- derivation is deterministic: same input, same output, every time ----
{
  const a = deriveLegacy(MIN, { parseColor });
  const b = deriveLegacy(MIN, { parseColor });
  assert.deepEqual(a.palette, b.palette);
  assert.deepEqual(a.gradient, b.gradient);
}

// ---- an explicit role wins over derivation ----
{
  const withLine = { ...MIN, roles: { ...MIN.roles, line: '#ff00ff' } };
  const { palette } = deriveLegacy(withLine, { parseColor });
  assert.equal(palette.line, '#ff00ff');
}

// ---- an unknown role alias is refused ----
{
  const bad = { ...MIN, roles: { ...MIN.roles, up: '{nowhere}' } };
  const errs = themeFileErrors(bad, { parseColor });
  assert.ok(errs.some((e) => /does not exist/.test(e)));
}

// ---- expandTheme produces the exact legacy shape, passthrough sections untouched ----
{
  const withSections = { ...MIN, motion: { bounce: 0.1 }, vars: { '--x': '1px' } };
  const legacy = expandTheme(withSections, { parseColor });
  assert.equal(legacy.name, 'min');
  assert.ok(legacy.palette && legacy.type && legacy.gradient);
  assert.deepEqual(legacy.motion, { bounce: 0.1 });
  assert.deepEqual(legacy.vars, { '--x': '1px' });
  assert.equal(legacy.tokens, undefined, 'the adapter output has no `tokens`/`roles`, only the legacy keys consumers read');
  assert.equal(legacy.roles, undefined);
}

// ---- the retired palette/type/gradient shape is refused, not silently accepted ----
{
  const old = { name: 'old', palette: { bg: '#fff' }, type: { sans: 'Inter' }, gradient: ['#fff', '#eee', '#ddd'] };
  assert.equal(isTokenFile(old), false);
  assert.throws(() => expandTheme(old, { parseColor }), /migrate-themes\.mjs/);
  const errs = themeFileErrors(old, { parseColor });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /migrate-themes\.mjs/);
}

console.log('roles.test.mjs: ok');
