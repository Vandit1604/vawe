// stagekit.mjs: `make stagekit D=<film>` — THE STAGE KIT for a per-scene HTML-fragment fan-out.
// Writes <film>.kit.css (the bare rules) next to the film, prints the exact <style> block every scene
// agent must paste VERBATIM into its fragment, and `--check` verifies they did (byte-identical, no
// drift): scripts/lib/stagekit.mjs explains why a shared stylesheet cannot work here (fragment <style>
// blocks are @scope-isolated per fragment, core/type/sanitize-html.js).
//
//   node scripts/author/stagekit.mjs formats/scene/launch.json          # write + print the kit
//   node scripts/author/stagekit.mjs formats/scene/launch.json --check  # verify every scene fragment
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { buildKit, kitCheck } from '../lib/stagekit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const film = argv.find((a) => !a.startsWith('--'));
const check = argv.includes('--check');
if (!film || !fs.existsSync(film)) { console.error('usage: node scripts/author/stagekit.mjs <film.json> [--check]'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : scene.theme;
if (!theme) { console.error(`stagekit: ${film} names no theme`); process.exit(1); }

const { css, block } = buildKit(theme, resolveLook, isLightBg);
const kitPath = film.replace(/\.json$/, '') + '.kit.css';

const base = path.basename(film, '.json');
const dir = path.dirname(film);
// The naming convention scenes.mjs briefs and assemble.mjs both read: one fragment per scene, numbered.
const fragGlob = (n) => path.join(dir, `${base}.scene${n}.html`);

if (check) {
  const fragments = [];
  for (let n = 1; n <= 30; n++) {
    const p = fragGlob(n);
    if (fs.existsSync(p)) fragments.push({ path: path.relative(ROOT, p), src: fs.readFileSync(p, 'utf8') });
  }
  if (!fragments.length) { console.error(`stagekit --check: no ${base}.sceneN.html fragments found beside ${film}`); process.exit(1); }
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
console.log(`\nTokens (already global, applyTheme sets them; never redeclare): ${['--surface', '--line', '--text', '--text-2', '--dim', '--accent', '--font-sans'].join(', ')} (full list: scripts/lib/stagekit.mjs KIT_TOKENS)`);
console.log(`Classes: .kit-card .kit-radius-sm/md/lg .kit-shadow .kit-hook .kit-headline .kit-body .kit-caption .kit-accent`);
console.log(`\nVerify identity across fragments once they exist: node scripts/author/stagekit.mjs ${film} --check`);
