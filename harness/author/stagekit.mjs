import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit, kitCheck } from '../lib/stagekit.mjs';
import { readDesignSpec } from '../lib/design-spec.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const film = argv.find((a) => !a.startsWith('--'));
const check = argv.includes('--check');
if (!film || !fs.existsSync(film)) { console.error('usage: node harness/author/stagekit.mjs <film.json> [--check]'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? expandThemeFile(JSON.parse(fs.readFileSync(themeFile, 'utf8'))) : scene.theme;
if (!theme) { console.error(`stagekit: ${film} names no theme`); process.exit(1); }

const spec = readDesignSpec(path.resolve(ROOT, film));
const { css, block, warnings } = buildKit(theme, resolveLook, isLightBg, spec);
for (const w of warnings) console.warn(w);
const kitPath = film.replace(/\.json$/, '') + '.kit.css';

const base = path.basename(film, '.json');
const dir = path.dirname(film);
const fragGlob = (n) => path.join(dir, `${base}.scene${n}.html`);

if (check) {
  const seen = new Set();
  const fragments = [];
  const add = (p0) => {
    const abs = path.resolve(ROOT, p0);
    if (!fs.existsSync(abs) || seen.has(abs)) return;
    seen.add(abs);
    fragments.push({ path: path.relative(ROOT, abs), src: fs.readFileSync(abs, 'utf8') });
  };
  const walk = (ls) => { for (const L of ls || []) {
    if (L && typeof L === 'object') {
      if (typeof L.src === 'string' && L.src.endsWith('.html')) add(L.src);
      walk(L.layers); walk(L.children);
    }
  } };
  try { walk(JSON.parse(fs.readFileSync(path.resolve(ROOT, film), 'utf8')).layers); } catch { /* fall back */ }
  for (let n = 1; n <= 30; n++) add(fragGlob(n));
  if (!fragments.length) { console.error(`stagekit --check: ${film} names no .html fragments, and no ${base}.sceneN.html sits beside it`); process.exit(1); }
  const { ok, findings } = kitCheck(block, fragments);
  console.log(`stagekit --check · ${fragments.length} fragment(s)`);
  for (const f of findings) console.log(`  ✗ [${f.code}] ${f.message}`);
  if (ok) console.log('  ✓ every fragment carries a byte-identical kit block');
  process.exit(ok ? 0 : 1);
}

fs.writeFileSync(path.resolve(ROOT, kitPath), css + '\n');
console.log(`✓ stagekit: theme "${themeName}" → ${kitPath}`);
console.log('\nPaste this block verbatim at the top of EVERY scene fragment for this film:\n');
console.log(block);
console.log(`\nTokens (already global, applyTheme sets them; never redeclare): ${['--surface', '--line', '--text', '--text-2', '--dim', '--accent', '--font-sans'].join(', ')} (full list: harness/lib/stagekit.mjs KIT_TOKENS)`);
console.log(`Vars: --kit-space-1..8 --kit-unit --kit-margin --kit-gutter (a spacing rhythm derived from this theme's own hook size, engine-doctrine/CRAFT/HTML-FRAGMENTS.md)`);
console.log(`Classes: .kit-root .kit-stage .kit-grid .kit-col-1..12 .kit-card .kit-panel .kit-radius-sm/md/lg .kit-shadow .kit-divider .kit-hook .kit-headline .kit-body .kit-caption .kit-eyebrow .kit-stat .kit-accent`);
console.log(`Four worked fragments, one per archetype: engine-doctrine/CRAFT/FRAGMENT-EXEMPLARS.md`);
console.log(`\nVerify identity across fragments once they exist: node harness/author/stagekit.mjs ${film} --check`);
