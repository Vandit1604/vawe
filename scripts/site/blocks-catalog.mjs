// scripts/site/blocks-catalog.mjs — auto-renders EVERY registry entry from the manifest onto paged stages.
// Proof + visual regression + the browsable arsenal. No hand-placement: drop a row in blocks/catalog.mjs
// and it shows up here. Writes formats/scene/_catalog-<n>.json (one per page). Run via `make catalog`.
import fs from 'node:fs';
import { BLOCKS } from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';

const COLS = 3, ROWS = 2, PER = COLS * ROWS;         // 6 blocks / page on a 1920×1080 stage
const CELL_W = 600, CELL_H = 490, X0 = 70, Y0 = 132; // generous cells; blocks sit at cell top-left
const grid = CATALOG.filter((e) => !e.overlay);      // captions & other full-frame overlays skip the grid
const pages = Math.ceil(grid.length / PER);

for (let p = 0; p < pages; p++) {
  const L = [{ type: 'text', text: `blocks · registry`, x: 70, y: 52, font: 'mono', size: 20, color: 'var(--text-2)', start: 0, duration: 9 },
    // Deliberately just the page number: NOTHING here may depend on the size of the registry. This
    // read `page N/${pages} · ${grid.length} blocks`, so adding one block changed text on every page,
    // every frame re-encoded, and H.264 rate control redistributed quantization noise across the whole
    // image. The per-block crops sit far below this line and still came out byte-different (~9.8% of
    // pixels, max delta 13/255 — invisible), so ONE cosmetic label dirtied all 108 stills and 108 clips
    // on every regeneration and wrote 4.3MB of new blobs into git history for no visible change.
    // Now appending a block only re-renders the page it lands on.
    { type: 'text', text: `page ${p + 1}`, x: 1560, y: 52, font: 'mono', size: 18, color: 'var(--dim)', start: 0, duration: 9 }];
  grid.slice(p * PER, p * PER + PER).forEach((e, i) => {
    const col = i % COLS, row = (i / COLS) | 0;
    const x = X0 + col * CELL_W, y = Y0 + row * CELL_H;
    L.push({ type: 'text', text: e.name, x, y: y - 26, font: 'mono', size: 18, color: 'var(--ink)', weight: 600, start: 0.1, duration: 9 });
    const fam = BLOCKS[e.family];
    if (!fam) return;
    try {
      L.push(...fam({ ...(e.props || {}), x, y: y + 24, start: 0.2 + i * 0.05, dur: 8 }));
    } catch (err) {
      L.push({ type: 'text', text: `⚠ ${e.name}: ${err.message}`, x, y: y + 24, size: 18, color: '#C0362C', start: 0.2, duration: 9 });
    }
  });
  const scene = { module: 'scene', orientation: 'landscape', theme: process.env.THEME || 'vawe', duration: 9,
    audio: { silent: true }, bg: [{ preset: 'plain', from: 0, to: 9 }], layers: L };
  // Write only on CHANGE, so `make catalog` can skip re-rendering untouched pages by mtime. This
  // matters more than it looks: the renderer's frame-dedup picks a representative frame per
  // static-ish group, and WHICH frame wins varies across the 8 parallel workers when spring settles
  // leave sub-pixel motion inside the signature's rounding — so re-rendering an UNCHANGED page
  // produces a pixel-different mp4, and every clip cropped from it churns in git for no reason.
  // (Pre-existing renderer behaviour, recorded in docs/ROADMAP.md; not fixed here.)
  const out = `formats/scene/_catalog-${p + 1}.json`;
  const body = JSON.stringify(scene, null, 2);
  if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== body) fs.writeFileSync(out, body);
}
// Remove pages a SHRINKING registry left behind. `make catalog` renders formats/scene/_catalog-*.json
// by glob, so a stale page keeps getting rendered as a real one long after nothing points at it.
const stale = fs.readdirSync('formats/scene')
  .filter((f) => /^_catalog-(\d+)\.json$/.test(f) && +f.match(/^_catalog-(\d+)\.json$/)[1] > pages);
for (const f of stale) fs.rmSync(`formats/scene/${f}`);

console.log(`wrote ${pages} catalog page(s) · ${grid.length} grid blocks (${CATALOG.length} total registry entries) → formats/scene/_catalog-*.json`
  + (stale.length ? `\n  removed ${stale.length} stale page(s): ${stale.join(', ')}` : ''));
