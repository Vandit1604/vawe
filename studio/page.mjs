// studio/page.mjs: assembles the studio SHELL out of studio/ui/shell.html, studio.css and studio.js.
// Split out of studio.mjs (and, before that, out of the 1466-line studio-page.mjs template string) so
// the markup, the styling and the browser JS are each a real file with syntax highlighting and a
// linter, instead of one exported string literal with zero imports.
//
// THE SURROUND IS ACHROMATIC, chroma zero, on purpose. A colourist grades in a neutral grey room because
// any hue in the surround skews the judgement of the picture, and this shell exists to judge frames. So
// every token in studio.css is a true grey; the only colour on screen is the film itself, the one
// accent the playhead needs, and the safety colours on the hazard bands (red and amber are a warning,
// not a style).
//
// Layout: a left rail of panels · the preview and its transport in the centre · the timeline full width
// along the bottom, with a draggable divider between them whose position sticks per browser.
//
// DEV TOOLING ONLY. It calls the engine's own renderFrame(n) from the parent frame, exactly as the Go
// capture loop does per frame. It never touches the renderer or the determinism contract.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHELL = fs.readFileSync(path.join(DIR, 'ui/shell.html'), 'utf8');

// The only dynamic bits: the theme attribute, the tab title, and the iframe src that names the scene.
// studio.css and studio.js are pure static files, served straight off disk by the same server.
export const studioPage = ({ fmt, dataUrl, title, theme }) => SHELL
  .replaceAll('{{THEME}}', theme)
  .replace('{{TITLE}}', title)
  .replace('{{IFRAME_SRC}}', `/formats/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`);
