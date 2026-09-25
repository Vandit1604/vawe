// design-spec.mjs: `make design-spec D=<film>`: writes `<film>.design.md` when it does not exist yet,
// seeded from the theme's own resolveLook numbers (the same ones harness/lib/stagekit.mjs buildKit
// derives), so the film starts from what the kit already computed rather than a blank sheet. If the
// file already exists this PRINTS it and does nothing else: it is the film's own resolved design once
// written, never something a re-run should overwrite.
//
//   node harness/author/design-spec.mjs films/scene/launch.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit, MIN_VIDEO_TEXT_PX } from '../lib/stagekit.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!film || !fs.existsSync(film)) { console.error('usage: node harness/author/design-spec.mjs <film.json>'); process.exit(1); }

const designPath = film.replace(/\.json$/, '.design.md');
if (fs.existsSync(designPath)) { console.log(fs.readFileSync(designPath, 'utf8')); process.exit(0); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? expandThemeFile(JSON.parse(fs.readFileSync(themeFile, 'utf8'))) : scene.theme;
if (!theme) { console.error(`design-spec: ${film} names no theme`); process.exit(1); }

const { look } = buildKit(theme, resolveLook, isLightBg);
const s = look.scale;
// The same floor buildKit itself applies (harness/lib/stagekit.mjs): seeding the raw scale value here
// instead would seed a number the kit never actually renders, and `make stagekit` would immediately
// warn that design.md disagrees with a kit that, in truth, agrees with the floor.
const caption = Math.max(MIN_VIDEO_TEXT_PX, s.caption);
const family = (theme.type && theme.type.sans) || 'sans-serif';

const md = `---
type:
  hook:
    family: ${family}
    size: ${s.hook}
    weight: 700
  headline:
    family: ${family}
    size: ${s.headline}
    weight: 700
  body:
    family: ${family}
    size: ${s.body}
    weight: 400
  caption:
    family: ${family}
    size: ${caption}
    weight: 400
radius: {}
shadow: {}
space: {}
surfaces: []
---

This film's design. It starts from theme "${themeName}"'s own numbers (\`make stagekit D=${film}\`).
Add a value here, never inline: a new size, radius, shadow or colour a fragment needs goes under the
matching group above, and every fragment reaches it as \`var(--kit-<group>-<name>)\` (or, for a type
role, the \`.kit-<role>\` class). \`make stagekit D=${film}\` re-pastes the kit with these tokens folded
in, and warns if a value here now disagrees with what the theme itself computes.
`;

fs.writeFileSync(path.resolve(ROOT, designPath), md);
console.log(`✓ design-spec: wrote ${designPath}`);
console.log(md);
