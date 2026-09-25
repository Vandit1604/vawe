// core/theme/roles.js: a token file's `roles` + `tokens`, turned into the EXACT legacy shape the ~60
// existing consumers already read (`theme.palette`, `theme.type`, `theme.gradient`). Pure data + pure
// functions, same node+browser contract as core/registry/theme-contract.js (colour parser injected).
//
// THE ADAPTER: everything downstream of a theme (applyTheme, themeErrors, every gate and harness script
// that reads `theme.palette.X`) is unchanged by this whole migration. It still reads a plain object with
// a `palette`/`type`/`gradient` shape. What changed is where that object comes from: `expandTheme` below
// builds it from `tokens`+`roles` instead of an author having written it by hand, key for key.
import { resolveTokens, resolveRoleValue } from './tokens.js';
import { mix, withAlpha } from './color-oklch.js';
import { themeErrors } from '../registry/theme-contract.js';

// THE ONLY REQUIRED PART OF A TOKEN FILE. Every other legacy palette/type key below is DERIVED from
// these five when the theme has no opinion of its own. `up`/`down` are not required: unlike ground/ink/
// accent (which a brand always has an opinion about) a status green/red is a near-universal convention,
// so a sane, brand-agnostic default exists (see DERIVED_DEFAULTS) and a theme with its own opinion just
// sets `roles.up`/`roles.down` and wins, the same override shape as every other optional key.
export const REQUIRED_ROLES = ['ground', 'ink', 'accent', 'font.sans', 'font.mono'];

// Legacy keys that come from a role of the SAME NAME (or a role-space name, `font.serif`) when the
// theme's `roles` map sets one, and are otherwise DERIVED (see deriveLegacy). Anything in `roles` that
// is not one of these, REQUIRED_ROLES, or "gradient" is copied straight onto `palette` as a passthrough
// (accent2, grid, grid2, glass, highlight, up2, card, warn, on*, ...): the legacy contract already
// treats every one of those as optional, so a token file that names one carries the exact same opinion
// forward with no derivation to get in the way.
const PALETTE_DERIVED = ['bg', 'bg2', 'surface', 'surface2', 'line', 'lineStrong', 'text', 'text2', 'dim', 'accentDim', 'accentGlow', 'up', 'down'];
const KNOWN_PALETTE_ROLE_KEYS = new Set([...PALETTE_DERIVED, ...REQUIRED_ROLES]);

const roleGet = (roles, values, errors, opts, key, { colorish = true } = {}) => {
  if (!Object.hasOwn(roles, key)) return undefined;
  return resolveRoleValue(roles[key], values, errors, opts, { colorish });
};

// roleErrors: required roles present and resolvable, checked independent of theme-contract.js's
// themeErrors (which grades the EXPANDED legacy object, not the roles map itself), so a missing
// `roles.accent` is reported as "roles.accent is required", not the more confusing "palette.accent".
export function roleErrors(tokenFile, opts = {}) {
  const errs = [];
  const roles = (tokenFile && tokenFile.roles) || {};
  const { values } = resolveTokens((tokenFile && tokenFile.tokens) || {}, opts);
  for (const key of REQUIRED_ROLES) {
    if (!Object.hasOwn(roles, key)) { errs.push(`roles.${key} is required`); continue; }
    const localErrs = [];
    resolveRoleValue(roles[key], values, localErrs, opts, { colorish: key !== 'font.sans' && key !== 'font.mono' });
    errs.push(...localErrs.map((e) => `roles.${key}: ${e}`));
  }
  return errs;
}

// DERIVED_DEFAULTS: what a legacy key becomes with NO role at all (not even a computed one), i.e. the
// floor an author never has to declare. up/down alone use these; everything else in PALETTE_DERIVED is
// computed FROM ground/ink/accent (see deriveLegacy) because no theme-agnostic literal makes sense for
// "a surface" or "a border" the way it does for "success" and "failure".
const UP_DEFAULT = '#2f7d55';
const DOWN_DEFAULT = '#a3282d';

// deriveLegacy(tokenFile, opts) -> { palette, type, gradient }. Required roles resolve first (throws
// via the caller, expandTheme, if they don't); every optional legacy key an author did not set in
// `roles` is mixed in OKLab from ground/ink/accent, so a theme with an opinion about three colours still
// produces a complete, readable 15-key palette.
function resolveRequiredRoles(roles, values, errors, opts) {
  const req = (key, colorish = true) => {
    if (!Object.hasOwn(roles, key)) { errors.push(`roles.${key} is required`); return null; }
    const v = resolveRoleValue(roles[key], values, errors, opts, { colorish });
    return v ?? null;
  };
  return {
    ground: req('ground'),
    ink: req('ink'),
    accent: req('accent'),
    fontSans: req('font.sans', false),
    fontMono: req('font.mono', false),
  };
}

// passthrough: any other roles.* entry that names a real legacy palette key (accent2, grid, grid2,
// glass, highlight, up2, card, warn, on*) carries straight through, colour-normalised.
function applyPalettePassthrough(roles, values, errors, opts, palette) {
  for (const [key, raw] of Object.entries(roles)) {
    if (KNOWN_PALETTE_ROLE_KEYS.has(key) || PALETTE_DERIVED.includes(key) || key.startsWith('font.') || key === 'gradient') continue;
    palette[key] = resolveRoleValue(raw, values, errors, opts, { colorish: true });
  }
}

function buildPalette(roles, values, errors, opts, { ground, ink, accent }) {
  const mixC = (a, b, t) => (a && b ? mix(a, b, t, opts) : null);
  const get = (key) => roleGet(roles, values, errors, opts, key);
  const palette = {
    bg: get('bg') ?? ground,
    bg2: get('bg2') ?? mixC(ground, ink, 0.05),
    surface: get('surface') ?? ground,
    surface2: get('surface2') ?? get('bg2') ?? mixC(ground, ink, 0.05),
    line: get('line') ?? mixC(ground, ink, 0.12),
    lineStrong: get('lineStrong') ?? mixC(ground, ink, 0.22),
    text: get('text') ?? ink,
    text2: get('text2') ?? mixC(ink, ground, 0.30),
    dim: get('dim') ?? mixC(ink, ground, 0.50),
    ink,
    accent,
    accentDim: get('accentDim') ?? (accent ? withAlpha(accent, 0.10, opts) : null),
    accentGlow: get('accentGlow') ?? (accent ? withAlpha(accent, 0.30, opts) : null),
    up: get('up') ?? UP_DEFAULT,
    down: get('down') ?? DOWN_DEFAULT,
  };
  applyPalettePassthrough(roles, values, errors, opts, palette);
  return palette;
}

function buildType(roles, values, errors, opts, { fontSans, fontMono }) {
  const get = (key) => roleGet(roles, values, errors, opts, key);
  const type = {
    sans: fontSans,
    serif: get('font.serif') ?? fontSans,
    mono: fontMono,
    num: get('font.num') ?? fontMono,
  };
  if (Object.hasOwn(roles, 'font.optical')) type.optical = resolveRoleValue(roles['font.optical'], values, errors, opts, { colorish: false });
  return type;
}

function buildGradient(roles, values, errors, opts, { ground, ink }) {
  if (Object.hasOwn(roles, 'gradient')) {
    const raw = roles.gradient;
    if (!Array.isArray(raw)) { errors.push('roles.gradient must be an array of colours'); return undefined; }
    return raw.map((stop) => resolveRoleValue(stop, values, errors, opts, { colorish: true }));
  }
  const mixC = (a, b, t) => (a && b ? mix(a, b, t, opts) : null);
  return [ground, mixC(ground, ink, 0.03), mixC(ground, ink, 0.06)];
}

export function deriveLegacy(tokenFile, opts = {}) {
  const errors = [];
  const roles = (tokenFile && tokenFile.roles) || {};
  const { values, errors: tokenErrors } = resolveTokens((tokenFile && tokenFile.tokens) || {}, opts);
  errors.push(...tokenErrors);

  const required = resolveRequiredRoles(roles, values, errors, opts);
  const palette = buildPalette(roles, values, errors, opts, required);
  const type = buildType(roles, values, errors, opts, required);
  const gradient = buildGradient(roles, values, errors, opts, required);

  return { palette, type, gradient, errors };
}

// FORMAT DETECTION: a token file has `tokens` + `roles`; the retired shape wrote `palette` at the top
// level directly. Anything else (missing both) is just malformed, not "the old format".
export function isTokenFile(spec) { return spec != null && typeof spec === 'object' && spec.roles != null; }
const isLegacyShape = (spec) => spec != null && typeof spec === 'object' && spec.palette != null && spec.roles == null;

// expandTheme(tokenFile, opts) -> the legacy-shaped theme object (name/note/palette/type/gradient, plus
// every passthrough section: motion/bg/vars/bgDefault/look/invented, untouched). THROWS on any
// resolution problem: this is the fail-loud entry point boot.js and the migration's round-trip proof
// call directly; a caller that wants every problem in one pass (validate.mjs) uses themeFileErrors
// instead, which never throws.
export function expandTheme(tokenFile, opts = {}) {
  if (isLegacyShape(tokenFile)) {
    throw new Error(`this theme is written in the retired palette/type/gradient shape. Run `
      + `\`node harness/author/migrate-themes.mjs\` to convert it to tokens + roles.`);
  }
  if (!isTokenFile(tokenFile)) throw new Error('theme has no `roles`: not a valid token file');
  const { palette, type, gradient, errors } = deriveLegacy(tokenFile, opts);
  if (errors.length) throw new Error(`theme "${tokenFile.name || 'inline'}" failed to resolve: ${errors.join('; ')}`);
  const { tokens: _tokens, roles: _roles, ...passthrough } = tokenFile;
  return { ...passthrough, palette, type, gradient };
}

// themeFileErrors(tokenFile, opts) -> string[] (never throws). The one bulk-check entry point: format
// detection, required roles, every token/role resolution problem, in one list, same shape as
// themeErrors/lookErrors elsewhere in core/registry/theme-contract.js.
export function themeFileErrors(tokenFile, opts = {}) {
  if (isLegacyShape(tokenFile)) {
    return ['this theme is written in the retired palette/type/gradient shape. Run '
      + '`node harness/author/migrate-themes.mjs` to convert it to tokens + roles.'];
  }
  if (!isTokenFile(tokenFile)) return ['theme has no `roles`: not a valid token file'];
  const { palette, type, gradient, errors } = deriveLegacy(tokenFile, opts);
  if (errors.length) return errors; // resolution failed: theme-contract's checks would only repeat it
  // Defense in depth: once the token file resolves cleanly, run it through the SAME contract check the
  // render path applies (applyTheme, core/engine/boot.js), so a bad `--on-*` contrast or a colour that
  // resolved to something themeErrors still rejects is caught at validate time, not only at boot.
  return themeErrors({ palette, type, gradient }, opts).map((m) => `expanded theme: ${m}`);
}
