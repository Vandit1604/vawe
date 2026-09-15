// scripts/brand/theme-remix.mjs: the another engine "pick a preset, remix it onto the brand" move (their
// Step 2), adapted to our theme system. A PRESET (directions/*.json) is a shippable design SYSTEM, dominance,
// type roles, motion character, bg style, colour-derivation rules, with placeholder base colours. The
// remix maps a brand's real base + accent (from `make palette`/`brandspec`, or --flags) onto the preset's
// ROLES and DERIVES the full 15-key palette (surfaces, lines, text ladder, accent tints) so good, coherent
// design is one command instead of hand-authoring every theme from pixels.
//
//   node scripts/brand/theme-remix.mjs --preset editorial --brand acme --bg "#0d0f13" --accent "#e0922f"
//   node scripts/brand/theme-remix.mjs --preset technical --brand acme   (reads assets/brands/acme tokens)
//   make theme-remix PRESET=editorial BRAND=acme BG=#0d0f13 ACCENT=#e0922f
//
// Deterministic (no model, no randomness): same inputs → identical theme. Self-validates against the theme
// contract and exits 1 on a broken mapping, exactly like build-frame.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeErrors } from '../../core/registry/theme-contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

// ── colour maths (self-contained, pure) ───────────────────────────────────────────────────────────
// The shared half lives in harness/lib/theme-bg.mjs, because invent-look.mjs writes themes too and a
// second copy of the bg mapping is how a theme gains a missing key.
import { parseHex as parse, mix, lighten, darken, rgbStr, relLum, contrast, bgBlock } from '../../harness/lib/theme-bg.mjs';
const rgbaOf = (c, a) => { const [r, g, b] = parse(c); return `rgba(${r},${g},${b},${a})`; };
const isLight = (c) => relLum(c) > 0.4;

// ── derive the full 15-key palette from a base bg + accent + optional text ─────────────────────────
// Dominance decides the direction every surface/line/text step moves. On a light ground surfaces darken
// toward the ink; on a dark ground they lighten toward the light. The text ladder is mixed toward the bg
// so text2/dim recede without leaving the ramp.
function derivePalette(brand, preset) {
  const bg = brand.bg || preset.base.bg;
  const light = preset.dominance === 'auto' ? isLight(bg) : preset.dominance === 'light';
  const accent = brand.accent || preset.base.accent;
  // pick a text colour that actually reads on the ground (fall back to near-black / near-white by dominance)
  let text = brand.text || (light ? '#141414' : '#f4f2ee');
  if (contrast(text, bg) < 4) text = light ? '#141414' : '#f5f3ef';
  const D = (t) => (light ? darken(bg, t) : lighten(bg, t));   // "recede from the ground" by dominance
  return {
    bg,
    bg2: D(light ? 0.03 : 0.05),
    surface: light ? bg : D(0.04),
    surface2: D(light ? 0.05 : 0.08),
    line: D(light ? 0.10 : 0.14),
    lineStrong: D(light ? 0.17 : 0.24),
    text,
    text2: mix(text, bg, 0.32),
    dim: mix(text, bg, 0.55),
    ink: text,
    accent,
    accentDim: rgbaOf(accent, 0.10),
    accentGlow: rgbaOf(accent, 0.30),
    up: brand.up || preset.base.up || '#2f7d55',
    down: brand.down || preset.base.down || '#a3282d',
  };
}

// ── inputs ─────────────────────────────────────────────────────────────────────────────────────────
const presetName = flag('--preset');
const brandName = flag('--brand', 'remixed');
if (!presetName) { console.error('usage: theme-remix --preset <name> --brand <name> [--bg #hex --accent #hex --text #hex]'); process.exit(2); }
const presetPath = path.join(ROOT, 'directions', `${presetName}.json`);
if (!fs.existsSync(presetPath)) { console.error(`✗ unknown preset "${presetName}". available: ${fs.readdirSync(path.join(ROOT, 'directions')).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).join(', ')}`); process.exit(2); }
const preset = JSON.parse(fs.readFileSync(presetPath, 'utf8'));

// brand tokens: explicit flags win; else read captured tokens if present.
const brand = { bg: flag('--bg'), accent: flag('--accent'), text: flag('--text') };
const tokPath = path.join(ROOT, 'assets/brands', brandName, 'palette.json');
if (fs.existsSync(tokPath) && (!brand.bg || !brand.accent)) {
  const t = JSON.parse(fs.readFileSync(tokPath, 'utf8')); brand.bg = brand.bg || t.bg || (t.colors || [])[0]; brand.accent = brand.accent || t.accent || (t.colors || [])[1]; brand.text = brand.text || t.text; brand.sans = t.sans; brand.mono = t.mono;
}

// ── assemble the theme ──────────────────────────────────────────────────────────────────────────────
const palette = derivePalette(brand, preset);
const type = {
  sans: brand.sans || preset.type.sans,
  serif: preset.type.serif || brand.sans || preset.type.sans,
  mono: brand.mono || preset.type.mono,
  num: preset.type.num || brand.mono || preset.type.mono,
};
const light = isLight(palette.bg);
const gradient = [palette.bg, mix(palette.bg, palette.accent, 0.04), light ? darken(palette.bg, 0.05) : lighten(palette.bg, 0.06)];
const theme = {
  name: brandName,
  note: `Remixed from the "${presetName}" preset onto brand base ${palette.bg} / accent ${palette.accent} by scripts/brand/theme-remix.mjs. ${preset.desc}`,
  palette,
  gradient,
  type,
  motion: preset.motion,
  bg: bgBlock(palette, light),
  bgDefault: preset.bgDefault || (light ? 'plain' : 'dark'),
};

const errs = themeErrors(theme);
if (errs.length) { console.error(`✗ remix produced an incomplete theme, missing: ${errs.join(', ')}`); process.exit(1); }
// contrast sanity: the accent must be legible on the ground for at least large text
const acc = contrast(palette.accent, palette.bg);
const txt = contrast(palette.text, palette.bg);
const dest = path.join(ROOT, 'themes', `${brandName}.json`);
fs.writeFileSync(dest, JSON.stringify(theme, null, 2) + '\n');
console.log(`✓ theme-remix: wrote themes/${brandName}.json from "${presetName}" preset`);
console.log(`  bg ${palette.bg} · accent ${palette.accent} (${acc.toFixed(1)}:1 on bg) · text (${txt.toFixed(1)}:1) · ${light ? 'light' : 'dark'}-first · fonts ${type.sans}/${type.mono}`);
if (txt < 4.5) console.warn(`  ⚠ text contrast ${txt.toFixed(1)}:1 is below AA (4.5), pass a --text that reads on ${palette.bg}`);
if (acc < 3) console.warn(`  ⚠ accent contrast ${acc.toFixed(1)}:1 is low, fine for fills, weak for accent TEXT on the ground`);
