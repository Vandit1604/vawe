// stagekit.mjs: `make stagekit D=<film>`: THE STAGE KIT for a per-scene HTML-fragment fan-out.
// Writes <film>.kit.css (the bare rules) next to the film, prints the exact <style> block every scene
// agent must paste VERBATIM into its fragment, and `--check` verifies they did (byte-identical, no
// drift): harness/lib/stagekit.mjs explains why a shared stylesheet cannot work here (fragment <style>
// blocks are @scope-isolated per fragment, core/type/sanitize-html.js).
//
//   node harness/author/stagekit.mjs films/scene/launch.json          # write + print the kit
//   node harness/author/stagekit.mjs films/scene/launch.json --check  # verify every scene fragment
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
// The naming convention scenes.mjs briefs and assemble.mjs both read: one fragment per scene, numbered.
const fragGlob = (n) => path.join(dir, `${base}.scene${n}.html`);

if (check) {
  // ASK THE FILM WHICH FRAGMENTS IT USES, rather than enumerating a naming convention. This used to
  // walk `<base>.scene1.html` through `.scene30.html` and stop, so a film whose layers point at any
  // other fragment name had those fragments silently unchecked: the kit could drift in them and this
  // check would still print a tick. A continuous-action film is exactly that case, since its layers are
  // named for what they are (`<base>.arm.html`) rather than numbered by beat. The film's own `src`
  // values are the authoritative list; the numbered sweep stays as a fallback for a film whose JSON is
  // not readable yet, which is the case while a fan-out is still writing fragments.
  const seen = new Set();
  const fragments = [];
  const add = (p0) => {
    // Resolve before the dedup: the film's `src` values and the numbered fallback arrive in different
    // shapes (absolute against relative), so keying the set on the raw string counted one fragment twice.
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
