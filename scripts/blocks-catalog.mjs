// scripts/blocks-catalog.mjs — auto-renders EVERY registry entry from the manifest onto paged stages.
// Proof + visual regression + the browsable arsenal. No hand-placement: drop a row in blocks/catalog.mjs
// and it shows up here. Writes formats/scene/_catalog-<n>.json (one per page). Run via `make catalog`.
import fs from 'node:fs';
import { BLOCKS } from '../blocks/index.mjs';
import { CATALOG } from '../blocks/catalog.mjs';

const COLS = 3, ROWS = 2, PER = COLS * ROWS;         // 6 blocks / page on a 1920×1080 stage
const CELL_W = 600, CELL_H = 490, X0 = 70, Y0 = 132; // generous cells; blocks sit at cell top-left
const grid = CATALOG.filter((e) => !e.overlay);      // captions & other full-frame overlays skip the grid
const pages = Math.ceil(grid.length / PER);

for (let p = 0; p < pages; p++) {
  const L = [{ type: 'text', text: `blocks · registry`, x: 70, y: 52, font: 'mono', size: 20, color: 'var(--text-2)', start: 0, duration: 9 },
    { type: 'text', text: `page ${p + 1}/${pages} · ${grid.length} blocks`, x: 1560, y: 52, font: 'mono', size: 18, color: 'var(--dim)', start: 0, duration: 9 }];
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
  const scene = { module: 'scene', orientation: 'landscape', theme: process.env.THEME || 'vawe-creed', duration: 9,
    audio: { silent: true }, bg: [{ preset: 'plain', from: 0, to: 9 }], layers: L };
  fs.writeFileSync(`formats/scene/_catalog-${p + 1}.json`, JSON.stringify(scene, null, 2));
}
console.log(`wrote ${pages} catalog page(s) · ${grid.length} grid blocks (${CATALOG.length} total registry entries) → formats/scene/_catalog-*.json`);
