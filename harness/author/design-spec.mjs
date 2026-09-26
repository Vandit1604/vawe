import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit, MIN_VIDEO_TEXT_PX } from '../lib/stagekit.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';
import { sceneDims, safeArea } from '../../core/layout/safe.js';
import { findStoryboard } from '../../quality/gates/content-check.mjs';
import { finishAdvice } from '../lib/finish-advice.mjs';

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
const caption = Math.max(MIN_VIDEO_TEXT_PX, s.caption);
const family = (theme.type && theme.type.sans) || 'sans-serif';

const aspect = typeof scene.aspect === 'string' ? scene.aspect : '16:9';
const [W, H] = sceneDims(scene, aspect);
const box = safeArea(W, H, scene.destination);
const P = theme.palette || {};
const m = { ...(theme.motion || {}) };
const durationTier = (look.cuts && look.cuts.default) || 'normal';
const exitRatio = m.exitRatio != null ? m.exitRatio : 0.5;

const slug = path.basename(film).replace(/\.json$/, '');
const sbPath = findStoryboard(film, slug, ROOT);
const tip = finishAdvice({ stage: 'design', scene, sbText: sbPath ? fs.readFileSync(sbPath, 'utf8') : null, slug });

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

This film's design. It starts from theme "${themeName}"'s own numbers (\`make dev-tool X=stagekit D=${film}\`).
Add a value here, never inline: a new size, radius, shadow or colour a fragment needs goes under the
matching group above, and every fragment reaches it as \`var(--kit-<group>-<name>)\` (or, for a type
role, the \`.kit-<role>\` class). \`make dev-tool X=stagekit D=${film}\` re-pastes the kit with these tokens folded
in, and warns if a value here now disagrees with what the theme itself computes.

## Type scale (${aspect}, ${W}x${H})
| step | px |
|---|---|
| hook | ${s.hook} |
| headline | ${s.headline} |
| body | ${s.body} |
| caption | ${caption} |

## Colour
| role | value |
|---|---|
| bg | ${P.bg || 'n/a'} |
| accent | ${P.accent || 'n/a'} |
| text | ${P.text || 'n/a'} |

## Grid / safe area
Content stays inside x ${box.x0}-${box.x1}, y ${box.y0}-${box.y1} (margin ${box.margin}px, destination "${box.destination}").

## Motion language
Entrance: ${m.easing || 'ease'}, ${durationTier} pace (durationScale ${m.durationScale ?? 1}). Exit: faster, ${Math.round(exitRatio * 100)}% of the entrance duration.
${tip ? `\n${tip}\n` : ''}`;

fs.writeFileSync(path.resolve(ROOT, designPath), md);
console.log(`✓ design-spec: wrote ${designPath}`);
console.log(md);
