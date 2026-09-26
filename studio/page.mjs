// studio/page.mjs: assembles the studio SHELL out of studio/ui/shell.html, studio.css and studio.js.
// Split out of studio.mjs (and, before that, out of the 1466-line studio-page.mjs template string) so
// the markup, the styling and the browser JS are each a real file with syntax highlighting and a
// linter, instead of one exported string literal with zero imports.
//
// Layout, after a reference video editor: a top bar · an icon sidebar of the four states · a property
// panel · the preview with its transport centred under it · the timeline along the bottom, with a
// draggable divider between preview and timeline whose position sticks per browser. Dark only.
//
// DEV TOOLING ONLY. It calls the engine's own renderFrame(n) from the parent frame, exactly as the Go
// capture loop does per frame. It never touches the renderer or the determinism contract.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHELL = fs.readFileSync(path.join(DIR, 'ui/shell.html'), 'utf8');

// The dynamic bits: the tab title, the iframe src that names the scene, and which of the four states
// (plan/make/ship/sound) the shell opens on. `state` is chosen by the server (paneForStage in
// server.mjs, off /api/stage's own verdict) so a film at plan opens on Plan rather than always
// on Make; studio.js reads it back off `document.body.dataset.state` at boot, never re-deriving it.
export const studioPage = ({ fmt, dataUrl, title, state = 'make' }) => SHELL
  .replace('{{TITLE}}', title)
  .replace('{{STATE}}', state)
  .replace('{{IFRAME_SRC}}', `/films/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`);
