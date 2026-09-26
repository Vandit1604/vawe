#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { parseColor, colorAlpha, contrastRatio } from '../../core/color/engine.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THEME_DIR = path.join(repoRoot, 'themes');
const COLOR_OPTS = { parseColor, colorAlpha, contrastRatio };

function indentOf(raw) {
  const m = raw.match(/^\{\r?\n(\s+)\S/);
  return m ? m[1] : '  ';
}

const FONT_KEYS = ['sans', 'serif', 'mono', 'num'];

const ROLE_NAME = { bg: 'ground', ink: 'ink', accent: 'accent' };

export function migrateOne(theme) {
  if (!theme || typeof theme !== 'object' || !theme.palette) return { next: theme, ok: true, clean: true };
  if (isTokenFile(theme)) return { next: theme, ok: true, clean: true }; // already migrated

  const { palette, type = {}, gradient = [], ...passthrough } = theme;
  delete passthrough.name; // re-added explicitly below, first, for a stable key order

  const colorTokens = {};
  const roles = {};
  for (const [key, value] of Object.entries(palette)) {
    colorTokens[key] = { $type: 'color', $value: value };
    roles[ROLE_NAME[key] || key] = `{color.${key}}`;
  }

  const fontTokens = {};
  for (const key of FONT_KEYS) {
    if (typeof type[key] !== 'string' || !type[key]) continue;
    fontTokens[key] = { $type: 'fontFamily', $value: type[key] };
    roles[`font.${key}`] = `{font.${key}}`;
  }
  if (Object.hasOwn(type, 'optical')) roles['font.optical'] = type.optical;

  const gradientTokens = {};
  Array.isArray(gradient) && gradient.forEach((stop, i) => { gradientTokens[`stop${i}`] = { $type: 'color', $value: stop }; });
  if (gradient.length) roles.gradient = gradient.map((_, i) => `{gradient.stop${i}}`);

  const next = {
    name: theme.name,
    ...passthrough,
    tokens: { color: colorTokens, ...(Object.keys(fontTokens).length ? { font: fontTokens } : {}), ...(gradient.length ? { gradient: gradientTokens } : {}) },
    roles,
  };

  let expanded, err;
  try { expanded = expandTheme(next, COLOR_OPTS); } catch (e) { err = e.message; }
  const ok = !err && sameTheme(theme, expanded);
  return { next, ok, err: ok ? undefined : (err || 'expanded theme does not match the original') };
}

function sameTheme(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a == null || b == null) return false;
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b) return true;
    const ca = parseColor(a), cb = parseColor(b);
    if (!ca || !cb) return false;
    return ca.every((v, i) => v === cb[i]) && Math.abs(colorAlpha(a) - colorAlpha(b)) < 1e-6;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => sameTheme(v, b[i]));
  if (typeof a === 'object') {
    const ak = Object.keys(a).filter((k) => a[k] !== undefined).sort();
    const bk = Object.keys(b).filter((k) => b[k] !== undefined).sort();
    return ak.length === bk.length && ak.every((k, i) => k === bk[i] && sameTheme(a[k], b[k]));
  }
  return a === b;
}

const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dirs = named.length ? null : [THEME_DIR, path.join(THEME_DIR, 'presets')].filter((d) => fs.existsSync(d));
  const targets = named.length
    ? named.map((f) => path.resolve(repoRoot, f))
    : dirs.flatMap((d) => fs.readdirSync(d).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(d, n)));

  let migrated = 0, skippedClean = 0, skippedMismatch = 0;
  const mismatches = [];

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    let theme;
    try { theme = JSON.parse(raw); } catch { continue; }
    const { next, ok, err, clean } = migrateOne(theme);
    if (clean) { skippedClean++; continue; }
    if (!ok) {
      skippedMismatch++;
      mismatches.push(`${path.relative(repoRoot, file)}${err ? ` (${err})` : ''}`);
      continue;
    }
    if (!dryRun) {
      const hadTrailingNewline = raw.endsWith('\n');
      fs.writeFileSync(file, JSON.stringify(next, null, indentOf(raw)) + (hadTrailingNewline ? '\n' : ''));
    }
    migrated++;
  }

  console.log(`migrate-themes: ${migrated} theme(s) migrated${dryRun ? ' (dry run)' : ''}, round-trip proof matched every one.`);
  console.log(`  ${skippedClean} already a token file (nothing to migrate).`);
  if (skippedMismatch) {
    console.log(`  ${skippedMismatch} SKIPPED, round trip would change the resolved theme: ${mismatches.join(', ')}`);
    process.exitCode = 1;
  }
}
