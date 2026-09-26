// quality/gates/design-drift.mjs: EVERY FRAME OF ONE FILM AGREES ON ITS VALUES.
//
//   node quality/gates/design-drift.mjs films/scene/<film>.json   ·   make design-drift D=<film>
//
// A film with `<film>.design.md` (harness/lib/design-spec.mjs) has declared the values its frames may
// use, on top of the stage kit's own generated ones (harness/lib/stagekit.mjs buildKit). This gate
// previews every fragment the storyboard names (reusing harness/author/preview-fragment.mjs's own
// `--boxes-out` dump, the same computed-style extraction `make preview` already trusts), and checks
// each visible box's font size, family, weight, radius, shadow, text colour and background colour
// against that legal set. A value close to a declared one is a hint to reach for the token instead of
// the literal; a value nowhere near anything declared is drift, and names the fix.
//
// A film with NO design.md is silent here on purpose: frame-check's own `scale-drift` warn stays the
// check for it, so nothing gets stricter by not opting in.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg, colorDistance, parseColor, colorAlpha } from '../../core/color/engine.js';
import { expandTheme } from '../../core/theme/roles.js';
import { buildKit } from '../../harness/lib/stagekit.mjs';
import { readDesignSpec, legalSet, nearestToken } from '../../harness/lib/design-spec.mjs';
import { parseStoryboard, blocksOf, fieldIn } from '../../harness/author/storyboard-parse.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { parseFragmentSpec } from '../../harness/lib/contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Named, with the one-line why each exists. Only size/radius/colour get a tolerance tier at all:
// family, weight and shadow are exact-or-drift, there is no "close enough" shorthand for a face name.
export const SIZE_TOL_PX = 1;    // sub-pixel layout jitter around an intended size, not a second size
export const RADIUS_TOL_PX = 1;  // same jitter, corner radii
export const COLOR_TOL = 6;      // euclidean 0-255 RGB distance; under this is imperceptible on 8-bit sRGB

/** The kit's OWN generated values for a theme, in legalSet's kitValues shape. Built from `spec: null`
 *  so a film's design.md additions never leak into the baseline legalSet unions on top of. */
export function kitValuesFromTheme(theme) {
  const { css } = buildKit(theme, resolveLook, isLightBg, null);
  const fontSize = new Set(), fontWeight = new Set(), radius = new Set(), shadow = new Set();
  for (const m of css.matchAll(/font:\s*(\d+)\s+([\d.]+)px/g)) { fontWeight.add(Number(m[1])); fontSize.add(Number(m[2])); }
  for (const m of css.matchAll(/--kit-radius-[a-z]+:([\d.]+)px/g)) radius.add(Number(m[1]));
  for (const m of css.matchAll(/--kit-elev-\d:([^;]+);/g)) shadow.add(m[1].trim());
  const fontFamily = [theme.type?.sans, theme.type?.serif, theme.type?.mono, theme.type?.num].filter(Boolean);
  const color = Object.values(theme.palette || {}).map((v) => String(v).toLowerCase());
  return { fontSize: [...fontSize], fontWeight: [...fontWeight], radius: [...radius], shadow: [...shadow], fontFamily, color };
}

function resolveTheme(scene) {
  if (typeof scene.theme === 'string') {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', scene.theme + '.json'), 'utf8'));
    return expandTheme(raw, { parseColor, colorAlpha });
  }
  return scene.theme || {};
}

/** Every fragment the film's storyboard names, in beat order, de-duplicated. */
export function fragmentsOf(sbPath) {
  const src = fs.readFileSync(sbPath, 'utf8');
  const sb = parseStoryboard(src);
  const blocks = blocksOf(src);
  const out = [];
  sb.beats.forEach((b, i) => {
    const frag = parseFragmentSpec(fieldIn(blocks[i], 'fragment')).path;
    if (frag && !out.includes(frag)) out.push(frag);
  });
  return out;
}

// alpha-aware: core/color/engine.js#colorDistance is the one distance both this gate and
// harness/lib/design-spec.mjs's nearestToken use, so a colour declared with alpha can't match one
// without it.
const colorDist = colorDistance;

function nearestNumeric(value, legalArr) {
  let best = null;
  for (const v of legalArr) { const d = Math.abs(v - value); if (best === null || d < best.delta) best = { value: v, delta: d }; }
  return best;
}

function nearestColor(value, legalArr) {
  let best = null;
  for (const v of legalArr) { const d = colorDist(value, v); if (best === null || d < best.delta) best = { value: v, delta: d }; }
  return best;
}

// checkers: each returns nothing, records onto `gf`. `ctx` is "fragment · <tag> "first words"".
function checkSizeOrRadius(kind, tol, value, legal, spec, gf, ctx, fixDoc) {
  if (legal.has(value)) return;
  const near = nearestNumeric(value, [...legal]);
  if (near && near.delta <= tol) {
    gf.warn('design-token-hint', `${ctx} · ${kind} ${value}px is ${near.delta.toFixed(1)}px from a declared ${near.value}px. Use var(--kit-...) instead of the literal.`);
    return;
  }
  const token = nearestToken(kind, value, spec);
  gf.fail('design-drift', `${ctx} · ${kind} ${value}px is not a declared value.`
    + `${token ? ` Nearest declared: ${token.name} = ${token.value}px.` : ''} Add it to ${fixDoc} or use var(--kit-x).`);
}

function checkColor(value, legal, spec, gf, ctx, fixDoc) {
  if (legal.has(value)) return;
  const near = nearestColor(value, [...legal]);
  if (near && near.delta <= COLOR_TOL) {
    gf.warn('design-token-hint', `${ctx} · colour ${value} is ${near.delta.toFixed(1)} from a declared ${near.value}. Use var(--kit-color-...) instead of the literal.`);
    return;
  }
  const token = nearestToken('color', value, spec);
  gf.fail('design-drift', `${ctx} · colour ${value} is not a declared value.`
    + `${token ? ` Nearest declared: ${token.name} = ${token.value}.` : ''} Add it to ${fixDoc} or use var(--kit-x).`);
}

function checkExact(kind, value, legal, gf, ctx, fixDoc, label) {
  if (legal.has(value)) return;
  gf.fail('design-drift', `${ctx} · ${label} "${value}" is not a declared value. Add it to ${fixDoc} or use the kit's own.`);
}

/** Check one box (from preview-fragment.mjs --boxes-out) against the legal set. */
export function checkBox(box, legal, spec, gf, fragRel, fixDoc) {
  if (box.tag === 'img' || box.tag === 'video') return; // a picture, not this film's own design values
  const ctx = `${fragRel} · <${box.tag}>${box.text ? ` "${String(box.text).slice(0, 30)}"` : ''}`;
  if (box.fontPx != null) checkSizeOrRadius('fontSize', SIZE_TOL_PX, box.fontPx, legal.fontSize, spec, gf, ctx, fixDoc);
  if (box.fontFamily) checkExact('fontFamily', box.fontFamily, legal.fontFamily, gf, ctx, fixDoc, 'font family');
  if (box.fontWeight) checkExact('fontWeight', box.fontWeight, legal.fontWeight, gf, ctx, fixDoc, 'font weight');
  if (box.borderRadius) checkSizeOrRadius('radius', RADIUS_TOL_PX, box.borderRadius, legal.radius, spec, gf, ctx, fixDoc);
  if (box.boxShadow) checkExact('shadow', box.boxShadow, legal.shadow, gf, ctx, fixDoc, 'shadow');
  if (box.color) checkColor(box.color, legal.color, spec, gf, ctx, fixDoc);
  if (box.backgroundColor) checkColor(box.backgroundColor, legal.color, spec, gf, ctx, fixDoc);
}

/** Preview one fragment (the same tool `make preview` uses) and return its boxes, or []. */
function boxesOf(fragFile, themeName, themeFile) {
  const tmp = path.join(os.tmpdir(), `design-drift-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const args = [path.join(ROOT, 'harness/author/preview-fragment.mjs'), fragFile,
    ...(themeFile ? ['--theme-file', themeFile] : ['--theme', themeName]),
    '--boxes-out', tmp, '--no-detect'];
  const r = spawnSync('node', args, { encoding: 'utf8', cwd: ROOT, timeout: 60000 });
  if (r.status !== 0 || !fs.existsSync(tmp)) return [];
  try { return JSON.parse(fs.readFileSync(tmp, 'utf8')); } finally { fs.rmSync(tmp, { force: true }); }
}

/**
 * runDesignDrift(filmJsonPath, gf) -> the same `gf` (harness/lib/findings.mjs emitter), with any
 * `design-drift`/`design-token-hint` findings appended. Silent (no browser launched) when the film has
 * no `<film>.design.md`. Shared by this file's own CLI and by frame-check.mjs, so the check has one
 * implementation and two entry points, not two implementations.
 */
export function runDesignDrift(filmJsonPath, gf) {
  const spec = readDesignSpec(filmJsonPath);
  if (!spec) return gf;
  const scene = JSON.parse(fs.readFileSync(filmJsonPath, 'utf8'));
  const theme = resolveTheme(scene);
  const themeName = typeof scene.theme === 'string' ? scene.theme : null;
  let themeFile = null;
  if (!themeName) {
    themeFile = path.join(os.tmpdir(), `design-drift-theme-${process.pid}.json`);
    fs.writeFileSync(themeFile, JSON.stringify(theme));
  }
  const legal = legalSet(spec, kitValuesFromTheme(theme));
  const fixDoc = path.relative(ROOT, spec.source);

  const sbPath = filmJsonPath.replace(/\.json$/, '.storyboard.md');
  const frags = fs.existsSync(sbPath) ? fragmentsOf(sbPath) : [];
  for (const rel of frags) {
    const fragFile = path.resolve(ROOT, rel);
    if (!fs.existsSync(fragFile)) continue; // frame-check's own job to say so
    for (const box of boxesOf(fragFile, themeName, themeFile)) checkBox(box, legal, spec, gf, rel, fixDoc);
  }
  if (themeFile) fs.rmSync(themeFile, { force: true });
  return gf;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!file || !fs.existsSync(file)) { console.error('usage: node quality/gates/design-drift.mjs <film.json>  |  make design-drift D=<file>'); process.exit(2); }
  const spec = readDesignSpec(file);
  if (!spec) { console.log(`\n  design-drift · no ${file.replace(/\.json$/, '.design.md')}, skipped (frame-check's scale-drift stays the check for this film)\n`); process.exit(0); }
  const gf = gateFindings();
  runDesignDrift(file, gf);
  const errs = gf.records.filter((r) => r.severity === 'error').length;
  if (process.argv.includes('--json')) { gf.emit(); process.exit(errs ? 1 : 0); }
  console.log(`\n  design-drift · ${file} · against ${path.relative(ROOT, spec.source)}`);
  gf.emit();
  if (!gf.records.length) console.log('  ✓ every visible box is on a declared value\n');
  console.log(errs ? `\n  ✗ ${errs} undeclared value(s): add them to the film's design.md, or use the kit.\n` : '');
  process.exit(errs ? 1 : 0);
}
